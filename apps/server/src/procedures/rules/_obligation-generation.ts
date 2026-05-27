import {
  listRuleSources,
  previewObligationsFromRules,
  STATE_RULE_JURISDICTIONS,
  type ObligationGenerationPreview,
  type ObligationRule,
  type RuleGenerationState,
} from '@duedatehq/core/rules'
import { generateReadinessDocumentChecklist } from '@duedatehq/core/readiness-documents'
import { buildPenaltyFactsFromLegacy, PENALTY_FACTS_VERSION } from '@duedatehq/core/penalty'
import { internalDeadlineFromBaseDueDate } from '@duedatehq/core/deadlines'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ClientFilingProfileRow } from '@duedatehq/ports/client-filing-profiles'
import type { ObligationCreateInput } from '@duedatehq/ports/obligations'
import type { ScopedRepo } from '@duedatehq/ports/scoped'

interface GenerateForAcceptedRulesInput {
  scoped: ScopedRepo
  userId: string
  rules: readonly ObligationRule[]
  internalDeadlineOffsetDays: number
  now?: Date
  reason?: string | null
}

interface GenerateForAcceptedRulesSummary {
  candidateCount: number
  createdCount: number
  duplicateCount: number
  clientCount: number
}

interface CreatedRuleObligationReadinessInput {
  id: string
  obligation: Pick<
    ObligationCreateInput,
    'taxType' | 'formName' | 'obligationType' | 'jurisdiction'
  >
  client: Pick<ClientRow, 'entityType' | 'taxClassification' | 'state'>
}

const RULE_GENERATION_STATES = new Set<string>(STATE_RULE_JURISDICTIONS)

function isRuleGenerationState(value: string | null | undefined): value is RuleGenerationState {
  return typeof value === 'string' && RULE_GENERATION_STATES.has(value)
}

function toDateOrNull(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null
}

export function keyForGenerated(input: {
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

export function sourceUrlForPreview(
  preview: ObligationGenerationPreview,
  sourceById: ReadonlyMap<string, ReturnType<typeof listRuleSources>[number]>,
): string | null {
  const sourceId = preview.evidence[0]?.sourceId ?? preview.sourceIds[0]
  return sourceId ? (sourceById.get(sourceId)?.url ?? null) : null
}

function obligationTypeForPreview(
  preview: ObligationGenerationPreview,
): NonNullable<ObligationCreateInput['obligationType']> {
  if (preview.eventType === 'payment') return 'payment'
  if (preview.eventType === 'deposit') return 'deposit'
  if (preview.eventType === 'information_report') return 'information'
  if (preview.eventType === 'client_action' || preview.eventType === 'extension') {
    return 'client_action'
  }
  if (preview.eventType === 'internal_review' || preview.eventType === 'election') {
    return 'internal_review'
  }
  return 'filing'
}

function recurrenceForPreview(
  preview: ObligationGenerationPreview,
  rule: ObligationRule,
): NonNullable<ObligationCreateInput['recurrence']> {
  if (rule.dueDateLogic.kind === 'period_table') return rule.dueDateLogic.frequency
  if (preview.eventType === 'deposit') return 'event_triggered'
  return 'annual'
}

function paymentDueDateForPreview(
  preview: ObligationGenerationPreview,
  rule: ObligationRule,
  dueDate: Date,
): Date | null {
  if (preview.isPayment) return dueDate
  if (rule.extensionPolicy.paymentExtended) return null
  if (
    rule.taxType === 'federal_1040' ||
    rule.taxType === 'federal_1040_extension' ||
    rule.taxType === 'federal_1041' ||
    rule.taxType === 'federal_1120' ||
    rule.taxType === 'federal_1120s'
  ) {
    return dueDate
  }
  return null
}

export function buildRuleBackedCreateInput(input: {
  client: ClientRow
  profile: Pick<ClientFilingProfileRow, 'id'> | null
  rule: ObligationRule
  preview: ObligationGenerationPreview
  internalDeadlineOffsetDays: number
  now: Date
  generationSource?: ObligationCreateInput['generationSource']
  initialWorkflowState?: 'pending' | 'review_when_required'
}): ObligationCreateInput & { preview: ObligationGenerationPreview } {
  const dueDate = new Date(`${input.preview.dueDate}T00:00:00.000Z`)
  const internalDueDate = internalDeadlineFromBaseDueDate(dueDate, input.internalDeadlineOffsetDays)
  const paymentDueDate = paymentDueDateForPreview(input.preview, input.rule, dueDate)
  const penaltyFacts = buildPenaltyFactsFromLegacy({
    taxType: input.preview.taxType,
    estimatedTaxLiabilityCents: input.client.estimatedTaxLiabilityCents,
    equityOwnerCount: input.client.equityOwnerCount,
  })
  const startInWorkflowReview =
    input.initialWorkflowState !== 'pending' && input.preview.requiresReview

  return {
    clientId: input.client.id,
    clientFilingProfileId:
      input.preview.jurisdiction === 'FED' ? null : (input.profile?.id ?? null),
    taxType: input.preview.taxType,
    taxYear: input.rule.taxYear,
    ruleId: input.rule.id,
    ruleVersion: input.preview.ruleVersion,
    rulePeriod: input.preview.period,
    taxPeriodStart: toDateOrNull(input.preview.taxPeriodStart),
    taxPeriodEnd: toDateOrNull(input.preview.taxPeriodEnd),
    taxPeriodKind: input.preview.taxPeriodKind,
    taxPeriodSource: input.preview.taxPeriodSource,
    taxPeriodReviewReason: input.preview.taxPeriodReviewReason,
    generationSource:
      input.generationSource ?? (input.client.migrationBatchId ? 'migration' : 'manual'),
    jurisdiction: input.preview.jurisdiction,
    obligationType: obligationTypeForPreview(input.preview),
    formName: input.preview.formName,
    authority:
      input.preview.localJurisdiction?.sourceAuthority ??
      (input.preview.jurisdiction === 'FED' ? 'IRS' : input.preview.jurisdiction),
    filingDueDate: input.preview.isFiling ? dueDate : null,
    paymentDueDate,
    sourceEvidenceJson: input.preview.evidence,
    recurrence: recurrenceForPreview(input.preview, input.rule),
    riskLevel: input.rule.riskLevel,
    baseDueDate: dueDate,
    currentDueDate: internalDueDate,
    status: startInWorkflowReview ? 'review' : 'pending',
    prepStage: startInWorkflowReview ? 'prepared' : 'not_started',
    reviewStage: startInWorkflowReview ? 'in_review' : 'not_required',
    extensionState:
      input.preview.eventType === 'extension'
        ? 'ready_to_file'
        : input.rule.extensionPolicy.available
          ? 'not_started'
          : 'not_applicable',
    extensionFormName: input.rule.extensionPolicy.formName ?? null,
    paymentState: paymentDueDate ? 'estimate_needed' : 'not_applicable',
    efileState: input.preview.isFiling ? 'authorization_requested' : 'not_applicable',
    migrationBatchId: input.client.migrationBatchId,
    estimatedTaxDueCents: input.client.estimatedTaxLiabilityCents,
    penaltyFactsJson: penaltyFacts,
    penaltyFactsVersion: PENALTY_FACTS_VERSION,
    preview: input.preview,
  }
}

export async function reconcileReadinessChecklistsForCreatedRuleObligations(input: {
  scoped: Pick<ScopedRepo, 'readiness'>
  userId: string
  obligations: readonly CreatedRuleObligationReadinessInput[]
  now: Date
}) {
  await Promise.all(
    input.obligations.map((entry) =>
      input.scoped.readiness.reconcileDocumentChecklistItems({
        obligationInstanceId: entry.id,
        createdByUserId: input.userId,
        template: generateReadinessDocumentChecklist({
          taxType: entry.obligation.taxType,
          formName: entry.obligation.formName ?? null,
          obligationType: entry.obligation.obligationType ?? null,
          entityType: entry.client.entityType,
          taxClassification: entry.client.taxClassification,
          jurisdiction: entry.obligation.jurisdiction ?? entry.client.state,
        }),
        now: input.now,
      }),
    ),
  )
}

export async function generateObligationsForAcceptedRules(
  input: GenerateForAcceptedRulesInput,
): Promise<GenerateForAcceptedRulesSummary> {
  const now = input.now ?? new Date()
  const rules = input.rules.filter((rule) => rule.status === 'verified')
  if (rules.length === 0) {
    return { candidateCount: 0, createdCount: 0, duplicateCount: 0, clientCount: 0 }
  }

  const clients = await input.scoped.clients.listByFirm()
  if (clients.length === 0) {
    return { candidateCount: 0, createdCount: 0, duplicateCount: 0, clientCount: 0 }
  }

  const profilesByClient = await input.scoped.filingProfiles.listByClients(
    clients.map((client) => client.id),
  )
  const taxYears = [...new Set(rules.map((rule) => rule.taxYear))]
  const duplicateRows = await input.scoped.obligations.listGeneratedByClientAndTaxYears({
    clientIds: clients.map((client) => client.id),
    taxYears,
  })
  const seenGeneratedKeys = new Set(
    duplicateRows
      .filter((row) => row.ruleId && row.taxYear !== null && row.rulePeriod)
      .map((row) =>
        keyForGenerated({
          clientId: row.clientId,
          jurisdiction: row.jurisdiction,
          ruleId: row.ruleId!,
          taxYear: row.taxYear,
          rulePeriod: row.rulePeriod!,
        }),
      ),
  )
  const ruleById = new Map(rules.map((rule) => [rule.id, rule]))
  const sourceById = new Map(listRuleSources().map((source) => [source.id, source]))
  const createInputs: Array<ObligationCreateInput & { preview: ObligationGenerationPreview }> = []
  const readinessInputs: Array<{
    obligation: ObligationCreateInput & { preview: ObligationGenerationPreview }
    client: ClientRow
  }> = []
  const clientIdsWithCandidates = new Set<string>()
  let candidateCount = 0
  let duplicateCount = 0

  for (const client of clients) {
    const profiles = profilesByClient.get(client.id) ?? []
    for (const profile of profiles) {
      if (!isRuleGenerationState(profile.state) || profile.taxTypes.length === 0) continue

      const clientFacts = {
        id: client.id,
        entityType: client.entityType,
        state: profile.state,
        taxTypes: profile.taxTypes,
        taxPeriodSource: 'client_default' as const,
        ...(client.taxClassification ? { taxClassification: client.taxClassification } : {}),
      } as const
      const previews = previewObligationsFromRules({
        client: clientFacts,
        rules,
      })

      for (const preview of previews) {
        const rule = ruleById.get(preview.ruleId)
        if (!rule || !preview.dueDate) continue
        candidateCount += 1
        clientIdsWithCandidates.add(client.id)

        const key = keyForGenerated({
          clientId: client.id,
          jurisdiction: preview.jurisdiction,
          ruleId: rule.id,
          taxYear: rule.taxYear,
          rulePeriod: preview.period,
        })
        if (seenGeneratedKeys.has(key)) {
          duplicateCount += 1
          continue
        }

        seenGeneratedKeys.add(key)
        const createInput = buildRuleBackedCreateInput({
          client,
          profile,
          rule,
          preview,
          internalDeadlineOffsetDays: input.internalDeadlineOffsetDays,
          now,
        })
        createInputs.push(createInput)
        readinessInputs.push({ obligation: createInput, client })
      }
    }
  }

  if (createInputs.length === 0) {
    return {
      candidateCount,
      createdCount: 0,
      duplicateCount,
      clientCount: clientIdsWithCandidates.size,
    }
  }

  const { ids } = await input.scoped.obligations.createBatch(createInputs)
  await reconcileReadinessChecklistsForCreatedRuleObligations({
    scoped: input.scoped,
    userId: input.userId,
    obligations: ids.flatMap((id, index) => {
      const entry = readinessInputs[index]
      return entry ? [{ id, obligation: entry.obligation, client: entry.client }] : []
    }),
    now,
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
  await input.scoped.audit.write({
    actorId: input.userId,
    entityType: 'obligation_batch',
    entityId: ids[0] ?? 'empty',
    action: 'obligation.batch_created',
    after: {
      reason: 'rules.accepted',
      ruleIds: rules.map((rule) => rule.id),
      createdCount: ids.length,
      duplicateCount,
      clientCount: clientIdsWithCandidates.size,
      createdObligationIds: ids,
    },
    reason: input.reason ?? 'Generated from newly accepted practice rules.',
  })

  return {
    candidateCount,
    createdCount: ids.length,
    duplicateCount,
    clientCount: clientIdsWithCandidates.size,
  }
}
