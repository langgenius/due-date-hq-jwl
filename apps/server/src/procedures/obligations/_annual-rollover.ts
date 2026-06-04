import { ObligationRuleSchema, type AnnualRolloverOutput } from '@duedatehq/contracts'
import {
  listObligationRules,
  listRuleSources,
  previewObligationsFromRules,
  STATE_RULE_JURISDICTIONS,
  type ObligationGenerationPreview,
  type ObligationRule,
  type RuleGenerationState,
} from '@duedatehq/core/rules'
import { buildPenaltyFactsFromLegacy, PENALTY_FACTS_VERSION } from '@duedatehq/core/penalty'
import {
  DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
  internalDeadlineFromBaseDueDate,
} from '@duedatehq/core/deadlines'
import { rollTaxPeriodForward } from '@duedatehq/core/tax-periods'
import { federalHolidaysForYears } from '@duedatehq/core/federal-holidays'
import type { ObligationCreateInput } from '@duedatehq/ports/obligations'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { isOnOrAfterDateOnly } from '../../lib/date-only'
import { toCoreRule } from '../rules/runtime'

type AnnualRolloverInput = {
  sourceFilingYear: number
  targetFilingYear: number
  clientIds?: string[] | undefined
}

type AnnualRolloverMode = 'preview' | 'create'

type SourceBucket = {
  clientId: string
  jurisdiction: string | null
  clientFilingProfileId: string | null
  taxType: string
  taxPeriodStart: string | null
  taxPeriodEnd: string | null
  sourceObligationIds: string[]
}

const RULE_GENERATION_STATES = new Set<string>(STATE_RULE_JURISDICTIONS)

function isRuleGenerationState(value: string | null | undefined): value is RuleGenerationState {
  return typeof value === 'string' && RULE_GENERATION_STATES.has(value)
}

function keyForDuplicate(input: {
  clientId: string
  jurisdiction: string | null
  ruleId: string
  taxYear: number | null
  rulePeriod: string
}): string {
  return [
    input.clientId,
    input.jurisdiction ?? '',
    input.ruleId,
    input.taxYear ?? '',
    input.rulePeriod,
  ].join('::')
}

async function listRuntimeRules(
  scoped: ScopedRepo,
  rules?: readonly ObligationRule[],
): Promise<ObligationRule[]> {
  if (rules) return [...rules]

  await ensureRuleReviewTasks(scoped)
  return (await scoped.rules.listActivePracticeRules()).flatMap((row) => {
    const parsed = ObligationRuleSchema.safeParse(row.ruleJson)
    return parsed.success ? [toCoreRule(parsed.data)] : []
  })
}

async function ensureRuleReviewTasks(scoped: ScopedRepo): Promise<void> {
  const reviewedRows = await scoped.rules.listPracticeRules()
  const reviewedByRuleId = new Map(reviewedRows.map((row) => [row.ruleId, row]))
  const reviewTasks: Parameters<ScopedRepo['rules']['ensureReviewTasks']>[0] = []

  for (const rule of listObligationRules({ includeCandidates: true })) {
    if (rule.status === 'deprecated') continue
    const reviewed = reviewedByRuleId.get(rule.id)
    if (!reviewed) {
      reviewTasks.push({
        ruleId: rule.id,
        templateVersion: rule.version,
        reason: 'new_template',
      })
      continue
    }
    if (reviewed.status !== 'pending_review' && reviewed.templateVersion !== rule.version) {
      reviewTasks.push({
        ruleId: rule.id,
        templateVersion: rule.version,
        reason: 'source_changed',
      })
    }
  }

  await scoped.rules.ensureReviewTasks(reviewTasks)
}

function groupSeedBuckets(
  seeds: Awaited<ReturnType<ScopedRepo['obligations']['listAnnualRolloverSeeds']>>,
): SourceBucket[] {
  const buckets = new Map<string, SourceBucket>()
  for (const seed of seeds) {
    const key = `${seed.clientId}::${seed.jurisdiction ?? ''}::${seed.taxType}`
    const current =
      buckets.get(key) ??
      ({
        clientId: seed.clientId,
        jurisdiction: seed.jurisdiction,
        clientFilingProfileId: seed.clientFilingProfileId,
        taxType: seed.taxType,
        taxPeriodStart: seed.taxPeriodStart?.toISOString().slice(0, 10) ?? null,
        taxPeriodEnd: seed.taxPeriodEnd?.toISOString().slice(0, 10) ?? null,
        sourceObligationIds: [],
      } satisfies SourceBucket)
    current.sourceObligationIds.push(seed.id)
    buckets.set(key, current)
  }
  return [...buckets.values()]
}

function summarize(
  output: Omit<AnnualRolloverOutput, 'summary'>,
  input: {
    sourceFilingYear: number
    targetFilingYear: number
    seedObligationCount: number
  },
): AnnualRolloverOutput['summary'] {
  return {
    sourceFilingYear: input.sourceFilingYear,
    targetFilingYear: input.targetFilingYear,
    seedObligationCount: input.seedObligationCount,
    clientCount: new Set(output.rows.map((row) => row.clientId)).size,
    willCreateCount: output.rows.filter((row) => row.disposition === 'will_create').length,
    reviewCount: output.rows.filter((row) => row.disposition === 'review').length,
    duplicateCount: output.rows.filter((row) => row.disposition === 'duplicate').length,
    skippedCount: output.rows.filter(
      (row) =>
        row.disposition === 'before_monitoring_start' ||
        row.disposition === 'missing_verified_rule' ||
        row.disposition === 'missing_due_date',
    ).length,
    createdCount: output.rows.filter((row) => row.createdObligationId).length,
  }
}

function sourceUrlForPreview(
  preview: ObligationGenerationPreview,
  sourceById: ReadonlyMap<string, ReturnType<typeof listRuleSources>[number]>,
): string | null {
  const sourceId = preview.evidence[0]?.sourceId ?? preview.sourceIds[0]
  return sourceId ? (sourceById.get(sourceId)?.url ?? null) : null
}

function previewForOutput(
  preview: ObligationGenerationPreview,
): NonNullable<AnnualRolloverOutput['rows'][number]['preview']> {
  const { localFactRequirements, ...previewRest } = preview
  return {
    ...previewRest,
    ...(localFactRequirements !== undefined
      ? { localFactRequirements: [...localFactRequirements] }
      : {}),
    sourceIds: [...preview.sourceIds],
    evidence: preview.evidence.map((evidence) => ({
      ...evidence,
      locator: { ...evidence.locator },
    })),
    reviewReasons: [...preview.reviewReasons],
    missingClientFacts: [...preview.missingClientFacts],
  }
}

export async function runAnnualRollover(input: {
  scoped: ScopedRepo
  userId: string
  params: AnnualRolloverInput
  mode: AnnualRolloverMode
  internalDeadlineOffsetDays?: number
  monitoringStartDate?: string
  rules?: readonly ObligationRule[]
  now?: Date
}): Promise<AnnualRolloverOutput> {
  const now = input.now ?? new Date()
  // Statutory dates roll off weekends and federal holidays (incl. DC Emancipation
  // Day, which shifts the April 15 deadline). Provide a holiday window around the
  // target filing year so rolled-forward due dates are weekend/holiday-adjusted.
  const rolloverHolidays = federalHolidaysForYears([
    input.params.targetFilingYear - 1,
    input.params.targetFilingYear,
    input.params.targetFilingYear + 1,
  ])
  const seedInput: { sourceFilingYear: number; clientIds?: string[] } = {
    sourceFilingYear: input.params.sourceFilingYear,
  }
  if (input.params.clientIds !== undefined) seedInput.clientIds = input.params.clientIds
  const seeds = await input.scoped.obligations.listAnnualRolloverSeeds(seedInput)
  const buckets = groupSeedBuckets(seeds)
  const clients = await input.scoped.clients.findManyByIds([
    ...new Set(buckets.map((b) => b.clientId)),
  ])
  const clientById = new Map(clients.map((client) => [client.id, client]))
  const runtimeRules = (await listRuntimeRules(input.scoped, input.rules)).filter(
    (rule) => rule.status === 'verified' && rule.applicableYear === input.params.targetFilingYear,
  )
  const ruleById = new Map(runtimeRules.map((rule) => [rule.id, rule]))
  const duplicateRows = await input.scoped.obligations.listGeneratedByClientAndTaxYears({
    clientIds: clients.map((client) => client.id),
    taxYears: [...new Set(runtimeRules.map((rule) => rule.taxYear))],
  })
  const duplicates = new Map(
    duplicateRows
      .filter((row) => row.ruleId && row.taxYear !== null && row.rulePeriod)
      .map((row) => [
        keyForDuplicate({
          clientId: row.clientId,
          jurisdiction: row.jurisdiction,
          ruleId: row.ruleId!,
          taxYear: row.taxYear,
          rulePeriod: row.rulePeriod!,
        }),
        row.id,
      ]),
  )
  const sourceById = new Map(listRuleSources().map((source) => [source.id, source]))
  const rows: AnnualRolloverOutput['rows'] = []
  const createInputs: Array<ObligationCreateInput & { preview: ObligationGenerationPreview }> = []

  for (const clientId of new Set(buckets.map((bucket) => bucket.clientId))) {
    const client = clientById.get(clientId)
    const clientBuckets = buckets.filter((bucket) => bucket.clientId === clientId)
    if (!client) {
      for (const bucket of clientBuckets) {
        rows.push({
          clientId,
          clientName: clientId,
          taxType: bucket.taxType,
          sourceObligationIds: bucket.sourceObligationIds,
          preview: null,
          disposition: 'missing_verified_rule',
          targetStatus: null,
          duplicateObligationId: null,
          createdObligationId: null,
          skippedReason: 'client_not_found',
        })
      }
      continue
    }

    for (const bucket of clientBuckets) {
      const generationState =
        isRuleGenerationState(bucket.jurisdiction) || bucket.jurisdiction === 'FED'
          ? bucket.jurisdiction === 'FED'
            ? client.state
            : bucket.jurisdiction
          : client.state
      if (!isRuleGenerationState(generationState)) {
        rows.push({
          clientId: client.id,
          clientName: client.name,
          taxType: bucket.taxType,
          sourceObligationIds: bucket.sourceObligationIds,
          preview: null,
          disposition: 'missing_verified_rule',
          targetStatus: null,
          duplicateObligationId: null,
          createdObligationId: null,
          skippedReason: 'client_state_missing',
        })
        continue
      }

      const rolledTaxPeriod = rollTaxPeriodForward({
        taxPeriodStart: bucket.taxPeriodStart,
        taxPeriodEnd: bucket.taxPeriodEnd,
      })
      const matchedPreviews = previewObligationsFromRules({
        client: {
          id: client.id,
          entityType: client.entityType,
          state: generationState,
          taxTypes: [bucket.taxType],
          ...(rolledTaxPeriod
            ? {
                taxYearStart: rolledTaxPeriod.taxPeriodStart,
                taxYearEnd: rolledTaxPeriod.taxPeriodEnd,
                taxPeriodSource: 'prior_obligation' as const,
              }
            : {
                taxPeriodSource: 'client_default' as const,
              }),
        },
        rules: runtimeRules,
        holidays: rolloverHolidays,
      }).filter((preview) => preview.matchedTaxType === bucket.taxType)

      if (matchedPreviews.length === 0) {
        rows.push({
          clientId: client.id,
          clientName: client.name,
          taxType: bucket.taxType,
          sourceObligationIds: bucket.sourceObligationIds,
          preview: null,
          disposition: 'missing_verified_rule',
          targetStatus: null,
          duplicateObligationId: null,
          createdObligationId: null,
          skippedReason: 'no_verified_rule_for_target_year',
        })
        continue
      }

      for (const preview of matchedPreviews) {
        const rule = ruleById.get(preview.ruleId)
        const duplicateId = rule
          ? duplicates.get(
              keyForDuplicate({
                clientId: client.id,
                jurisdiction: preview.jurisdiction,
                ruleId: rule.id,
                taxYear: rule.taxYear,
                rulePeriod: preview.period,
              }),
            )
          : undefined
        const targetStatus = preview.reminderReady ? 'pending' : 'review'
        const beforeMonitoringStart = Boolean(
          preview.dueDate &&
          input.monitoringStartDate &&
          !isOnOrAfterDateOnly(preview.dueDate, input.monitoringStartDate),
        )
        const disposition = duplicateId
          ? 'duplicate'
          : beforeMonitoringStart
            ? 'before_monitoring_start'
            : preview.dueDate
              ? targetStatus === 'pending'
                ? 'will_create'
                : 'review'
              : 'missing_due_date'
        const row: AnnualRolloverOutput['rows'][number] = {
          clientId: client.id,
          clientName: client.name,
          taxType: preview.taxType,
          sourceObligationIds: bucket.sourceObligationIds,
          preview: previewForOutput(preview),
          disposition,
          targetStatus:
            disposition === 'will_create' || disposition === 'review' ? targetStatus : null,
          duplicateObligationId: duplicateId ?? null,
          createdObligationId: null,
          skippedReason:
            disposition === 'duplicate'
              ? 'target_obligation_already_exists'
              : disposition === 'before_monitoring_start'
                ? 'before_monitoring_start_date'
                : disposition === 'missing_due_date'
                  ? 'verified_rule_has_no_concrete_due_date'
                  : null,
        }
        rows.push(row)

        if (
          input.mode !== 'create' ||
          !rule ||
          !preview.dueDate ||
          duplicateId ||
          beforeMonitoringStart
        ) {
          continue
        }

        const dueDate = new Date(`${preview.dueDate}T00:00:00.000Z`)
        const internalDueDate = internalDeadlineFromBaseDueDate(
          dueDate,
          input.internalDeadlineOffsetDays ?? DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
        )
        const penaltyFacts = buildPenaltyFactsFromLegacy({
          taxType: preview.taxType,
          estimatedTaxLiabilityCents: client.estimatedTaxLiabilityCents,
          equityOwnerCount: client.equityOwnerCount,
        })
        createInputs.push({
          clientId: client.id,
          clientFilingProfileId:
            preview.jurisdiction === 'FED' ? null : bucket.clientFilingProfileId,
          taxType: preview.taxType,
          taxYear: rule.taxYear,
          taxPeriodStart: preview.taxPeriodStart
            ? new Date(`${preview.taxPeriodStart}T00:00:00.000Z`)
            : null,
          taxPeriodEnd: preview.taxPeriodEnd
            ? new Date(`${preview.taxPeriodEnd}T00:00:00.000Z`)
            : null,
          taxPeriodKind: preview.taxPeriodKind,
          taxPeriodSource: preview.taxPeriodSource,
          taxPeriodReviewReason: preview.taxPeriodReviewReason,
          ruleId: rule.id,
          ruleVersion: preview.ruleVersion,
          rulePeriod: preview.period,
          generationSource: 'annual_rollover',
          // Rolled-forward deadlines are projected until a CPA confirms them:
          // visible in dashboards/calendar, withheld from the reminder pipeline.
          confirmed: false,
          jurisdiction: preview.jurisdiction,
          baseDueDate: dueDate,
          currentDueDate: internalDueDate,
          status: targetStatus,
          estimatedTaxDueCents: client.estimatedTaxLiabilityCents,
          penaltyFactsJson: penaltyFacts,
          penaltyFactsVersion: PENALTY_FACTS_VERSION,
          preview,
        })
      }
    }
  }

  let auditId: string | null = null
  if (input.mode === 'create' && createInputs.length > 0) {
    const { ids } = await input.scoped.obligations.createBatch(createInputs)
    ids.forEach((id, index) => {
      const created = createInputs[index]
      if (!created) return
      const row = rows.find(
        (candidate) =>
          candidate.preview?.ruleId === created.preview.ruleId &&
          candidate.preview.period === created.preview.period &&
          candidate.clientId === created.clientId,
      )
      if (row) row.createdObligationId = id
    })
    await input.scoped.evidence.writeBatch(
      createInputs.map((created, index) => ({
        obligationInstanceId: ids[index] ?? null,
        aiOutputId: null,
        sourceType: 'verified_rule',
        sourceId: created.preview.ruleId,
        sourceUrl: sourceUrlForPreview(created.preview, sourceById),
        verbatimQuote: created.preview.evidence[0]?.sourceExcerpt ?? null,
        rawValue: created.preview.matchedTaxType,
        normalizedValue: created.preview.taxType,
        confidence: created.preview.reminderReady ? 1 : 0.7,
        model: null,
        matrixVersion: null,
        verifiedAt: null,
        verifiedBy: null,
        appliedAt: now,
        appliedBy: input.userId,
      })),
    )
    const audit = await input.scoped.audit.write({
      actorId: input.userId,
      entityType: 'obligation_batch',
      entityId: ids[0] ?? 'empty',
      action: 'obligation.annual_rollover.created',
      after: {
        sourceFilingYear: input.params.sourceFilingYear,
        targetFilingYear: input.params.targetFilingYear,
        createdCount: ids.length,
        createdObligationIds: ids,
      },
    })
    auditId = audit.id
  }

  const output = { rows, auditId }
  return {
    summary: summarize(output, {
      sourceFilingYear: input.params.sourceFilingYear,
      targetFilingYear: input.params.targetFilingYear,
      seedObligationCount: seeds.length,
    }),
    rows,
    auditId,
  }
}
