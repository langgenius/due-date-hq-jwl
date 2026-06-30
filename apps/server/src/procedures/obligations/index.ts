import { ORPCError } from '@orpc/server'
import { ObligationRuleSchema, type ObligationInstancePublic } from '@duedatehq/contracts'
import { internalDeadlineFromBaseDueDate } from '@duedatehq/core/deadlines'
import {
  canEditTaxYearProfileForObligation,
  findRuleById,
  listRuleSources,
  previewObligationsFromRules,
  STATE_RULE_JURISDICTIONS,
  type ObligationRule as CoreObligationRule,
  type RuleGenerationClientFacts,
  type RuleGenerationEntity,
  type RuleGenerationState,
} from '@duedatehq/core/rules'
import { requireTenant } from '../_context'
import {
  MIGRATION_RUN_ROLES,
  OBLIGATION_STATUS_WRITE_ROLES,
  requireCurrentFirmOwner,
  requireCurrentFirmRole,
} from '../_permissions'
import { requirePracticeAiWorkflow } from '../_plan-gates'
import { os } from '../_root'
import { dateInTimezone, toAiInsightPublic } from '../_ai-insights'
import { enqueueAiInsightRefresh } from '../../jobs/ai-insights/enqueue'
import { enqueueDashboardBriefRefresh } from '../../jobs/dashboard-brief/enqueue'
import {
  bulkDecideObligationExtension,
  bulkPreviewObligationExtensionDecision,
  bulkPreviewObligationSignatureReminder,
  backfillObligationSignatureLoop,
  bulkRemindObligationSignature,
  bulkUpdateObligationStatus,
  assignObligation,
  decideObligationExtension,
  markObligationFiledRejected,
  snoozeObligation,
  previewObligationSignatureReminder,
  remindObligationSignature,
  toObligationPublic,
  updateObligationBlockedBy,
  updateObligationEfileState,
  updateObligationPrepStage,
  updateObligationReviewStage,
  updateObligationStatus,
} from './_service'
import { runAnnualRollover } from './_annual-rollover'
import { runReprojection } from './_reprojection'
import { resolveUpdatedTaxYearProfilePlan } from './_tax-year-profile'
import { toCoreRule } from '../rules/runtime'
import {
  buildRuleBackedCreateInput,
  keyForGenerated,
  reconcileReadinessChecklistsForCreatedRuleObligations,
  sourceUrlForPreview,
} from '../rules/_obligation-generation'

/**
 * obligations.* — Demo Sprint subset of the Obligation Domain Contract.
 *
 * Authority:
 *   - packages/contracts/src/obligations.ts (frozen contract)
 *   - docs/dev-file/06 §4.1 (procedures call scoped repo only)
 *
 * Scope (Day 3): unblock Migration Step 4 commit. We expose createBatch,
 * listByClient, and updateStatus (LYZ Obligations). `updateDueDate` belongs
 * to the pulse-apply path (Day 5+) and stays a stub.
 */

interface ObligationRow {
  id: string
  firmId: string
  clientId: string
  clientFilingProfileId: string | null
  taxType: string
  taxYear: number | null
  taxYearType: ObligationInstancePublic['taxYearType']
  fiscalYearEndMonth: number | null
  fiscalYearEndDay: number | null
  taxPeriodStart: Date | null
  taxPeriodEnd: Date | null
  taxPeriodKind: ObligationInstancePublic['taxPeriodKind']
  taxPeriodSource: ObligationInstancePublic['taxPeriodSource']
  taxPeriodReviewReason: string | null
  ruleId: string | null
  ruleVersion: number | null
  rulePeriod: string | null
  generationSource: ObligationInstancePublic['generationSource']
  jurisdiction: string | null
  obligationType: ObligationInstancePublic['obligationType']
  formName: string | null
  authority: string | null
  filingDueDate: Date | null
  paymentDueDate: Date | null
  sourceEvidenceJson: unknown
  recurrence: ObligationInstancePublic['recurrence']
  riskLevel: ObligationInstancePublic['riskLevel']
  baseDueDate: Date
  currentDueDate: Date
  status: ObligationInstancePublic['status']
  readiness: ObligationInstancePublic['readiness']
  extensionDecision: ObligationInstancePublic['extensionDecision']
  extensionMemo: string | null
  extensionSource: string | null
  extensionExpectedDueDate: Date | null
  extensionDecidedAt: Date | null
  extensionDecidedByUserId: string | null
  extensionState: ObligationInstancePublic['extensionState']
  extensionFormName: string | null
  extensionFiledAt: Date | null
  extensionAcceptedAt: Date | null
  prepStage: ObligationInstancePublic['prepStage']
  reviewStage: ObligationInstancePublic['reviewStage']
  reviewerUserId: string | null
  reviewCompletedAt: Date | null
  paymentState: ObligationInstancePublic['paymentState']
  paymentConfirmedAt: Date | null
  efileState: ObligationInstancePublic['efileState']
  efileAuthorizationForm: string | null
  efileSubmittedAt: Date | null
  efileAcceptedAt: Date | null
  efileRejectedAt: Date | null
  migrationBatchId: string | null
  estimatedTaxDueCents: number | null
  estimatedExposureCents: number | null
  exposureStatus: ObligationInstancePublic['exposureStatus']
  penaltyFactsJson: unknown
  penaltyFactsVersion: string | null
  penaltyBreakdownJson: unknown
  penaltyFormulaVersion: string | null
  missingPenaltyFactsJson: unknown
  penaltySourceRefsJson: unknown
  penaltyFormulaLabel: string | null
  exposureCalculatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const RULE_GENERATION_STATES = new Set<string>(STATE_RULE_JURISDICTIONS)

function isRuleGenerationState(value: string | null | undefined): value is RuleGenerationState {
  return typeof value === 'string' && RULE_GENERATION_STATES.has(value)
}

function deadlineDetailHrefForObligation(obligationId: string): string {
  const ref = obligationId.replace(/-/g, '').toLowerCase().slice(-12)
  return `/deadlines/${encodeURIComponent(ref)}/summary`
}

function obligationNotificationSubject(row: ObligationRow, clientName: string | null): string {
  const form = row.formName ?? row.taxType
  return clientName ? `${clientName} - ${form}` : form
}

function isDefaultActiveTemplateRule(rule: Pick<CoreObligationRule, 'jurisdiction' | 'status'>) {
  return rule.jurisdiction === 'FED' && rule.status === 'verified'
}

function canRetargetRuleTaxYear(rule: Pick<CoreObligationRule, 'dueDateLogic'>): boolean {
  return (
    rule.dueDateLogic.kind === 'nth_day_after_tax_year_end' ||
    rule.dueDateLogic.kind === 'nth_day_after_tax_year_begin'
  )
}

async function activeRuleForManualCreate(
  scoped: ReturnType<typeof requireTenant>['scoped'],
  ruleId: string,
): Promise<CoreObligationRule | null> {
  const [practice, template] = await Promise.all([
    scoped.rules.getPracticeRule(ruleId),
    Promise.resolve(findRuleById(ruleId)),
  ])

  if (practice?.status === 'active' && practice.ruleJson) {
    const parsed = ObligationRuleSchema.safeParse(practice.ruleJson)
    if (parsed.success) return toCoreRule(parsed.data)
  }

  if (
    template &&
    isDefaultActiveTemplateRule(template) &&
    practice?.status !== 'rejected' &&
    practice?.status !== 'archived'
  ) {
    return template
  }

  return null
}

type ManualRuleSelectionInput = {
  ruleId: string
  taxYear?: number | undefined
}

type ManualGenerationEntityOverride = {
  entityType: RuleGenerationEntity
  taxClassification?: NonNullable<RuleGenerationClientFacts['taxClassification']>
}

function manualGenerationEntityForRule(
  rule: Pick<CoreObligationRule, 'entityApplicability'>,
): ManualGenerationEntityOverride {
  const entities = rule.entityApplicability
  if (entities.includes('individual')) {
    return { entityType: 'individual', taxClassification: 'individual' }
  }
  if (entities.includes('sole_prop')) {
    return { entityType: 'sole_prop', taxClassification: 'disregarded_entity' }
  }
  if (entities.includes('c_corp')) {
    return { entityType: 'c_corp', taxClassification: 'c_corp' }
  }
  if (entities.includes('s_corp')) {
    return { entityType: 's_corp', taxClassification: 's_corp' }
  }
  if (entities.includes('partnership')) {
    return { entityType: 'partnership', taxClassification: 'partnership' }
  }
  if (entities.includes('trust')) {
    return { entityType: 'trust', taxClassification: 'trust' }
  }
  if (entities.includes('llc')) {
    return { entityType: 'llc' }
  }
  if (entities.includes('any_business')) {
    return { entityType: 'c_corp', taxClassification: 'c_corp' }
  }
  return { entityType: 'other' }
}

const createBatch = os.obligations.createBatch.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, MIGRATION_RUN_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)

  const repoInputs = input.obligations.map((o) => {
    const baseDueDate = new Date(o.baseDueDate)
    const repoInput: {
      clientId: string
      clientFilingProfileId?: string | null
      taxType: string
      taxYear: number | null
      taxYearType?: ObligationInstancePublic['taxYearType']
      fiscalYearEndMonth?: number | null
      fiscalYearEndDay?: number | null
      taxPeriodStart?: Date | null
      taxPeriodEnd?: Date | null
      taxPeriodKind?: ObligationInstancePublic['taxPeriodKind']
      taxPeriodSource?: ObligationInstancePublic['taxPeriodSource']
      taxPeriodReviewReason?: string | null
      ruleId?: string | null
      ruleVersion?: number | null
      rulePeriod?: string | null
      generationSource?: ObligationInstancePublic['generationSource']
      jurisdiction?: string | null
      obligationType?: ObligationInstancePublic['obligationType']
      formName?: string | null
      authority?: string | null
      filingDueDate?: Date | null
      paymentDueDate?: Date | null
      sourceEvidenceJson?: unknown
      recurrence?: ObligationInstancePublic['recurrence']
      riskLevel?: ObligationInstancePublic['riskLevel']
      baseDueDate: Date
      currentDueDate: Date
      status?: ObligationInstancePublic['status']
      prepStage?: ObligationInstancePublic['prepStage']
      reviewStage?: ObligationInstancePublic['reviewStage']
      extensionState?: ObligationInstancePublic['extensionState']
      extensionFormName?: string | null
      paymentState?: ObligationInstancePublic['paymentState']
      efileState?: ObligationInstancePublic['efileState']
      efileAuthorizationForm?: string | null
      migrationBatchId: string | null
      estimatedTaxDueCents?: number | null
      estimatedExposureCents?: number | null
      exposureStatus?: ObligationInstancePublic['exposureStatus']
      penaltyFactsJson?: unknown
      penaltyFactsVersion?: string | null
      penaltyBreakdownJson?: unknown
      penaltyFormulaVersion?: string | null
      missingPenaltyFactsJson?: unknown
      penaltySourceRefsJson?: unknown
      penaltyFormulaLabel?: string | null
      exposureCalculatedAt?: Date | null
    } = {
      clientId: o.clientId,
      clientFilingProfileId: o.clientFilingProfileId ?? null,
      taxType: o.taxType,
      taxYear: o.taxYear ?? null,
      taxPeriodStart: o.taxPeriodStart ? new Date(o.taxPeriodStart) : null,
      taxPeriodEnd: o.taxPeriodEnd ? new Date(o.taxPeriodEnd) : null,
      taxPeriodKind: o.taxPeriodKind ?? 'unknown',
      taxPeriodSource: o.taxPeriodSource ?? 'unknown',
      taxPeriodReviewReason: o.taxPeriodReviewReason ?? null,
      ruleId: o.ruleId ?? null,
      ruleVersion: o.ruleVersion ?? null,
      rulePeriod: o.rulePeriod ?? null,
      generationSource: o.generationSource ?? null,
      jurisdiction: o.jurisdiction ?? null,
      obligationType: o.obligationType ?? 'filing',
      formName: o.formName ?? null,
      authority: o.authority ?? null,
      filingDueDate: o.filingDueDate ? new Date(o.filingDueDate) : null,
      paymentDueDate: o.paymentDueDate ? new Date(o.paymentDueDate) : null,
      sourceEvidenceJson: o.sourceEvidence ?? null,
      recurrence: o.recurrence ?? 'once',
      riskLevel: o.riskLevel ?? 'low',
      baseDueDate,
      currentDueDate: o.currentDueDate
        ? new Date(o.currentDueDate)
        : internalDeadlineFromBaseDueDate(baseDueDate, tenant.internalDeadlineOffsetDays),
      prepStage: o.prepStage ?? 'not_started',
      reviewStage: o.reviewStage ?? 'not_required',
      extensionState: o.extensionState ?? 'not_started',
      extensionFormName: o.extensionFormName ?? null,
      paymentState: o.paymentState ?? 'not_applicable',
      efileState: o.efileState ?? 'not_applicable',
      efileAuthorizationForm: o.efileAuthorizationForm ?? null,
      migrationBatchId: o.migrationBatchId ?? null,
      estimatedTaxDueCents: o.estimatedTaxDueCents ?? null,
      estimatedExposureCents: o.estimatedExposureCents ?? null,
      exposureStatus: o.exposureStatus ?? 'needs_input',
      penaltyFactsJson: o.penaltyFacts ?? null,
      penaltyFactsVersion: o.penaltyFactsVersion ?? null,
      penaltyBreakdownJson: o.penaltyBreakdown ?? [],
      penaltyFormulaVersion: o.penaltyFormulaVersion ?? null,
      missingPenaltyFactsJson: o.missingPenaltyFacts ?? [],
      penaltySourceRefsJson: o.penaltySourceRefs ?? [],
      penaltyFormulaLabel: o.penaltyFormulaLabel ?? null,
      exposureCalculatedAt: o.exposureCalculatedAt ? new Date(o.exposureCalculatedAt) : null,
    }
    if (o.taxYearType !== undefined) {
      repoInput.taxYearType = o.taxYearType
      repoInput.fiscalYearEndMonth =
        o.taxYearType === 'fiscal' ? (o.fiscalYearEndMonth ?? null) : null
      repoInput.fiscalYearEndDay = o.taxYearType === 'fiscal' ? (o.fiscalYearEndDay ?? null) : null
    }
    if (o.status !== undefined) repoInput.status = o.status
    return repoInput
  })

  const { ids } = await scoped.obligations.createBatch(repoInputs)

  await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_batch',
    entityId: ids[0] ?? 'empty',
    action: 'obligation.batch_created',
    after: { count: ids.length },
  })

  // Re-read so the response carries DB-persisted timestamps + canonical
  // status. Per-client readback is cheap because Step 4 commit always
  // groups input by client; fan out per unique clientId in parallel.
  const uniqueClients = Array.from(new Set(input.obligations.map((o) => o.clientId)))
  const idSet = new Set(ids)
  const [clients, rowSets] = await Promise.all([
    scoped.clients.findManyByIds(uniqueClients),
    Promise.all(uniqueClients.map((cid) => scoped.obligations.listByClient(cid))),
  ])
  const clientById = new Map(clients.map((client) => [client.id, client]))
  const allRows: ObligationRow[] = rowSets.flat().filter((row) => idSet.has(row.id))

  if (allRows.length !== ids.length) {
    // Defensive: re-read drift would mask a partial batch failure.
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Created deadlines could not be re-read in full.',
    })
  }

  const asOfDate = dateInTimezone(tenant.timezone)
  return {
    obligations: allRows.map((row) =>
      toObligationPublic(row, { client: clientById.get(row.clientId), asOfDate }),
    ),
  }
})

async function createManualObligationsFromRuleSelections(input: {
  context: Parameters<typeof requireTenant>[0]
  clientId: string
  selections: readonly ManualRuleSelectionInput[]
}) {
  const { scoped, tenant, userId } = requireTenant(input.context)

  const [client, selectedRules] = await Promise.all([
    scoped.clients.findById(input.clientId),
    Promise.all(
      input.selections.map(async (selection) => {
        const rule = await activeRuleForManualCreate(scoped, selection.ruleId)
        if (!rule) {
          throw new ORPCError('NOT_FOUND', {
            message: `Active rule ${selection.ruleId} was not found in current firm.`,
          })
        }
        if (rule.dueDateLogic.kind === 'source_defined_calendar') {
          throw new ORPCError('BAD_REQUEST', {
            message: 'This rule needs review before it can create a deadline.',
          })
        }
        const selectedRule =
          selection.taxYear !== undefined && selection.taxYear !== rule.taxYear
            ? (() => {
                if (!canRetargetRuleTaxYear(rule)) {
                  throw new ORPCError('BAD_REQUEST', {
                    message: 'This rule cannot be reused for a different tax year yet.',
                  })
                }
                return {
                  ...rule,
                  taxYear: selection.taxYear,
                  applicableYear: selection.taxYear + (rule.applicableYear - rule.taxYear),
                }
              })()
            : rule

        return selectedRule
      }),
    ),
  ])
  if (!client) {
    throw new ORPCError('NOT_FOUND', {
      message: `Client ${input.clientId} not found in current firm.`,
    })
  }

  const profilesByClient = await scoped.filingProfiles.listByClients([client.id])
  const profiles = profilesByClient.get(client.id) ?? []
  const taxYears = [...new Set(selectedRules.map((rule) => rule.taxYear))]
  const duplicateRows = await scoped.obligations.listGeneratedByClientAndTaxYears({
    clientIds: [client.id],
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

  let duplicateCount = 0
  const createInputs = selectedRules.flatMap((selectedRule) => {
    const matchingProfile =
      selectedRule.jurisdiction === 'FED'
        ? null
        : (profiles.find((profile) => profile.state === selectedRule.jurisdiction) ?? null)

    const generationState =
      selectedRule.jurisdiction !== 'FED'
        ? selectedRule.jurisdiction
        : (profiles.find((profile) => isRuleGenerationState(profile.state))?.state ??
          (isRuleGenerationState(client.state) ? client.state : null))
    if (!isRuleGenerationState(generationState)) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Client needs a filing jurisdiction before a rule can create a deadline.',
      })
    }

    const manualEntity = manualGenerationEntityForRule(selectedRule)
    const previews = previewObligationsFromRules({
      client: {
        id: client.id,
        entityType: manualEntity.entityType,
        state: generationState,
        taxTypes: [selectedRule.taxType],
        taxPeriodSource: 'manual_cpa_confirmed',
        ...(manualEntity.taxClassification
          ? { taxClassification: manualEntity.taxClassification }
          : {}),
      },
      rules: [selectedRule],
    }).filter((preview) => preview.ruleId === selectedRule.id)

    if (previews.every((preview) => !preview.dueDate)) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'This rule did not produce a concrete due date for this client.',
      })
    }

    return previews.flatMap((preview) => {
      if (!preview.dueDate) return []
      const key = keyForGenerated({
        clientId: client.id,
        jurisdiction: preview.jurisdiction,
        ruleId: selectedRule.id,
        taxYear: selectedRule.taxYear,
        rulePeriod: preview.period,
      })
      if (seenGeneratedKeys.has(key)) {
        duplicateCount += 1
        return []
      }
      seenGeneratedKeys.add(key)
      return [
        buildRuleBackedCreateInput({
          client,
          profile: matchingProfile,
          rule: selectedRule,
          preview,
          internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
          now: new Date(),
          generationSource: 'manual',
          initialWorkflowState: 'pending',
        }),
      ]
    })
  })

  if (createInputs.length === 0) {
    return { obligations: [], duplicateCount }
  }

  const now = new Date()
  const sourceById = new Map(listRuleSources().map((source) => [source.id, source]))
  const { ids } = await scoped.obligations.createBatch(createInputs)
  await reconcileReadinessChecklistsForCreatedRuleObligations({
    scoped,
    userId,
    obligations: ids.flatMap((id, index) => {
      const obligation = createInputs[index]
      return obligation ? [{ id, obligation, client }] : []
    }),
    now,
  })
  await scoped.evidence.writeBatch(
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
      appliedBy: userId,
    })),
  )
  await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_batch',
    entityId: ids[0] ?? 'empty',
    action: 'obligation.batch_created',
    after: {
      reason: 'rules.manual_create',
      ruleIds: [...new Set(selectedRules.map((rule) => rule.id))],
      createdCount: ids.length,
      duplicateCount,
      clientCount: 1,
      createdObligationIds: ids,
    },
    reason: 'Created from the client rule catalog.',
  })

  // Day-one landscape: if these are the firm's FIRST obligations (manual
  // client + rule-catalog onboarding), catch the firm up to the still-open
  // regulatory windows now (origin='catchup') instead of waiting for
  // tomorrow's sweep. Best-effort — never fail the create.
  try {
    await scoped.pulse.catchUpStillOpenWindowsOnFirstObligations(ids.length, now)
  } catch (err) {
    console.error('[obligations.createFromCatalog] still-open catch-up failed', {
      firmId: scoped.firmId,
      clientId: client.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  const idSet = new Set(ids)
  const rows = (await scoped.obligations.listByClient(client.id)).filter((row) => idSet.has(row.id))
  if (rows.length !== ids.length) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Created deadlines could not be re-read in full.',
    })
  }

  const asOfDate = dateInTimezone(tenant.timezone)
  return {
    obligations: rows.map((row) => toObligationPublic(row, { client, asOfDate })),
    duplicateCount,
  }
}

const createFromRule = os.obligations.createFromRule.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, MIGRATION_RUN_ROLES)
  return createManualObligationsFromRuleSelections({
    context,
    clientId: input.clientId,
    selections: [
      input.taxYear === undefined
        ? { ruleId: input.ruleId }
        : { ruleId: input.ruleId, taxYear: input.taxYear },
    ],
  })
})

const createFromRules = os.obligations.createFromRules.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, MIGRATION_RUN_ROLES)
  return createManualObligationsFromRuleSelections({
    context,
    clientId: input.clientId,
    selections: input.selections,
  })
})

const listByClient = os.obligations.listByClient.handler(async ({ input, context }) => {
  const { scoped, tenant } = requireTenant(context)
  const [client, rows] = await Promise.all([
    scoped.clients.findById(input.clientId),
    scoped.obligations.listByClient(input.clientId),
  ])
  const asOfDate = dateInTimezone(tenant.timezone)
  return rows.map((row) => toObligationPublic(row, { client, asOfDate }))
})

const previewAnnualRollover = os.obligations.previewAnnualRollover.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, MIGRATION_RUN_ROLES)
    const { scoped, tenant, userId } = requireTenant(context)
    return runAnnualRollover({
      scoped,
      userId,
      params: input,
      mode: 'preview',
      internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
      monitoringStartDate: tenant.monitoringStartDate,
    })
  },
)

const createAnnualRollover = os.obligations.createAnnualRollover.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, MIGRATION_RUN_ROLES)
    const { scoped, tenant, userId } = requireTenant(context)
    const result = await runAnnualRollover({
      scoped,
      userId,
      params: input,
      mode: 'create',
      internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
      monitoringStartDate: tenant.monitoringStartDate,
    })
    if (result.summary.createdCount > 0) {
      await enqueueDashboardBriefRefresh(context.env, {
        firmId: tenant.firmId,
        reason: 'annual_rollover',
      }).catch(() => false)
    }
    return result
  },
)

const confirmObligations = os.obligations.confirmObligations.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  const { confirmedIds } = await scoped.obligations.confirmByIds(input.obligationIds)
  let auditId: string | null = null
  if (confirmedIds.length > 0) {
    const audit = await scoped.audit.write({
      actorId: userId,
      entityType: 'obligation_batch',
      entityId: confirmedIds[0] ?? 'empty',
      action: 'obligation.confirmed',
      after: { confirmedCount: confirmedIds.length, confirmedObligationIds: confirmedIds },
    })
    auditId = audit.id
  }
  return { confirmedCount: confirmedIds.length, confirmedObligationIds: confirmedIds, auditId }
})

const previewReprojection = os.obligations.previewReprojection.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
    const { scoped, tenant, userId } = requireTenant(context)
    return runReprojection({
      scoped,
      userId,
      mode: 'preview',
      params: input,
      internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
    })
  },
)

const applyReprojection = os.obligations.applyReprojection.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await runReprojection({
    scoped,
    userId,
    mode: 'apply',
    params: input,
    internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
  })
  if (result.summary.updatedCount > 0) {
    await enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'due_date_update',
    }).catch(() => false)
  }
  return result
})

const listProjectedDeadlines = os.obligations.listProjectedDeadlines.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
    const { scoped } = requireTenant(context)
    const rows = await scoped.obligations.listProjected(
      input.targetFilingYear !== undefined ? { taxYears: [input.targetFilingYear] } : {},
    )
    const clients = await scoped.clients.findManyByIds([
      ...new Set(rows.map((row) => row.clientId)),
    ])
    const nameById = new Map(clients.map((client) => [client.id, client.name]))
    const deadlines = rows.map((row) => ({
      obligationId: row.id,
      clientId: row.clientId,
      clientName: nameById.get(row.clientId) ?? row.clientId,
      taxType: row.taxType,
      taxYear: row.taxYear,
      jurisdiction: row.jurisdiction,
      baseDueDate: row.baseDueDate.toISOString().slice(0, 10),
      currentDueDate: row.currentDueDate.toISOString().slice(0, 10),
      generationSource: row.generationSource,
    }))
    return { deadlines, count: deadlines.length }
  },
)

const updateDueDate = os.obligations.updateDueDate.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const before = await scoped.obligations.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.id} not found in current firm.`,
    })
  }

  await scoped.obligations.updateDueDate(
    input.id,
    new Date(`${input.currentDueDate}T00:00:00.000Z`),
  )
  const after = await scoped.obligations.findById(input.id)
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated deadline could not be re-read.',
    })
  }

  await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.id,
    action: 'obligation.due_date.updated',
    before: { currentDueDate: before.currentDueDate.toISOString().slice(0, 10) },
    after: { currentDueDate: input.currentDueDate },
  })

  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'due_date_update',
  }).catch(() => false)
  await enqueueAiInsightRefresh(context.env, {
    firmId: tenant.firmId,
    kind: 'deadline_tip',
    subjectId: input.id,
    reason: 'due_date_update',
  }).catch(() => false)

  const client = await scoped.clients.findById(after.clientId)
  return toObligationPublic(after, { client, asOfDate: dateInTimezone(tenant.timezone) })
})

// Re-bind / unbind the rule a deadline cites as its authority — corrects a
// wrong auto-match. Pure attribution change (no date recompute); audit-logged.
const rebindRule = os.obligations.rebindRule.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const before = await scoped.obligations.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.id} not found in current firm.`,
    })
  }
  await scoped.obligations.updateRuleId(input.id, input.ruleId)
  const after = await scoped.obligations.findById(input.id)
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated deadline could not be re-read.',
    })
  }
  await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.id,
    action: 'obligation.rule.rebound',
    before: { ruleId: before.ruleId ?? null },
    after: { ruleId: input.ruleId },
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  })
  const client = await scoped.clients.findById(after.clientId)
  return toObligationPublic(after, { client, asOfDate: dateInTimezone(tenant.timezone) })
})

const updateStatus = os.obligations.updateStatus.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await updateObligationStatus(scoped, userId, input)
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'status_change',
  }).catch(() => false)
  await enqueueAiInsightRefresh(context.env, {
    firmId: tenant.firmId,
    kind: 'deadline_tip',
    subjectId: input.id,
    reason: 'status_change',
  }).catch(() => false)
  return result
})

const markFiledRejected = os.obligations.markFiledRejected.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await markObligationFiledRejected(scoped, userId, input)
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'status_change',
  }).catch(() => false)
  return result
})

const assign = os.obligations.assign.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await assignObligation(scoped, userId, input)
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'status_change',
  }).catch(() => false)
  return result
})

const snooze = os.obligations.snooze.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await snoozeObligation(scoped, userId, input)
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'status_change',
  }).catch(() => false)
  return result
})

const updateBlockedBy = os.obligations.updateBlockedBy.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await updateObligationBlockedBy(scoped, userId, input)
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'status_change',
  }).catch(() => false)
  return result
})

// In Review sub-status mutations — fire when the CPA clicks a step in
// the obligation drawer's prep ↔ review pipeline strip. Reuses
// `OBLIGATION_STATUS_WRITE_ROLES`: anyone who can flip status can
// also flip the sub-stage (same workflow authority). Sub-status
// changes don't affect the dashboard summary tiles or deadline tip,
// so we skip the dashboard / AI refresh enqueues — the row's status
// is unchanged.
const updatePrepStage = os.obligations.updatePrepStage.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  return updateObligationPrepStage(scoped, userId, input)
})

const updateReviewStage = os.obligations.updateReviewStage.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  return updateObligationReviewStage(scoped, userId, input)
})

const bulkUpdateStatus = os.obligations.bulkUpdateStatus.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await bulkUpdateObligationStatus(scoped, userId, input)
  if (result.updatedCount > 0) {
    await enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'status_change',
    }).catch(() => false)
  }
  return result
})

const decideExtension = os.obligations.decideExtension.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await decideObligationExtension(
    scoped,
    userId,
    input,
    tenant.internalDeadlineOffsetDays,
  )
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'status_change',
  }).catch(() => false)
  await enqueueAiInsightRefresh(context.env, {
    firmId: tenant.firmId,
    kind: 'deadline_tip',
    subjectId: input.id,
    reason: 'status_change',
  }).catch(() => false)
  return result
})

// Bulk "Decide extension" from the queue floating action bar. Same write
// permission as the single decideExtension; one dashboard-brief refresh when
// anything changed (no per-subject AI refresh — that's per-row and would fan
// out to up to 100 enqueues, matching how bulkUpdateStatus omits it).
const bulkDecideExtension = os.obligations.bulkDecideExtension.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
    const { scoped, tenant, userId } = requireTenant(context)
    const result = await bulkDecideObligationExtension(
      scoped,
      userId,
      input,
      tenant.internalDeadlineOffsetDays,
    )
    if (result.decidedCount > 0) {
      await enqueueDashboardBriefRefresh(context.env, {
        firmId: tenant.firmId,
        reason: 'status_change',
      }).catch(() => false)
    }
    return result
  },
)

// Read-only eligibility breakdown for the bulk "Decide extension" dialog.
const bulkExtensionDecisionPreview = os.obligations.bulkExtensionDecisionPreview.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
    const { scoped } = requireTenant(context)
    return bulkPreviewObligationExtensionDecision(scoped, input)
  },
)

// E-file sub-state advance (P0: "Mark 8879 signed"). Sibling of the
// prep/review sub-status mutations — same write permission, no dashboard
// brief refresh (status is unchanged; only the e-file column moves).
const updateEfileState = os.obligations.updateEfileState.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  return updateObligationEfileState(scoped, userId, input)
})

// Email a single client a Form 8879 signature reminder. The service
// enqueues the email; we trigger the EMAIL_QUEUE flush here (where
// context.env is available), mirroring readiness.sendRequest.
const remindSignature = os.obligations.remindSignature.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  const result = await remindObligationSignature(scoped, userId, input)
  if (result.emailQueued) {
    await context.env.EMAIL_QUEUE.send({ type: 'email.flush' }).catch(() => undefined)
  }
  return result
})

// Read-only preview that pre-fills the drawer's "Remind to sign" editor.
const signatureReminderPreview = os.obligations.signatureReminderPreview.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
    const { scoped } = requireTenant(context)
    return previewObligationSignatureReminder(scoped, input)
  },
)

// Read-only eligibility + default-template source for the bulk "Remind to
// sign" editor (counts who will actually be emailed across the selection).
const bulkSignatureReminderPreview = os.obligations.bulkSignatureReminderPreview.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
    const { scoped } = requireTenant(context)
    return bulkPreviewObligationSignatureReminder(scoped, input)
  },
)

// Bulk signature reminders from the queue floating action bar. One flush
// for the whole batch if anything was actually queued.
const bulkRemindSignature = os.obligations.bulkRemindSignature.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
    const { scoped, userId } = requireTenant(context)
    const result = await bulkRemindObligationSignature(scoped, userId, input)
    if (result.remindedCount > 0) {
      await context.env.EMAIL_QUEUE.send({ type: 'email.flush' }).catch(() => undefined)
    }
    return result
  },
)

// One-time, owner-only backfill of legacy filed returns into the 8879 loop.
// Firm-wide data correction → owner role (broader write roles are too loose).
const backfillSignatureLoop = os.obligations.backfillSignatureLoop.handler(async ({ context }) => {
  await requireCurrentFirmOwner(context)
  const { scoped, userId } = requireTenant(context)
  return backfillObligationSignatureLoop(scoped, userId)
})

const requestInput = os.obligations.requestInput.handler(async ({ input, context }) => {
  const { members, tenant, userId } = await requireCurrentFirmRole(context, ['preparer'])
  const { scoped } = requireTenant(context)
  const obligation = await scoped.obligations.findById(input.obligationId)
  if (!obligation) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.obligationId} not found in current firm.`,
    })
  }

  const [actor, recipient, client] = await Promise.all([
    members.findMembership(tenant.firmId, userId),
    members.findMembership(tenant.firmId, input.recipientUserId),
    scoped.clients.findById(obligation.clientId),
  ])
  if (!actor || actor.status !== 'active' || actor.role !== 'preparer') {
    throw new ORPCError('FORBIDDEN', { message: 'Only active preparers can request input.' })
  }
  if (!recipient || recipient.status !== 'active') {
    throw new ORPCError('BAD_REQUEST', { message: 'Recipient must be an active firm member.' })
  }
  if (recipient.userId === userId) {
    throw new ORPCError('BAD_REQUEST', { message: 'Recipient must be another firm member.' })
  }
  // Reviewer roles only — mirrors the Pulse review-request recipient set
  // (owner/partner/manager). Managers review and sign off on prepared work,
  // so they must be reachable here too.
  if (recipient.role !== 'owner' && recipient.role !== 'partner' && recipient.role !== 'manager') {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Recipient must be an owner, partner, or manager.',
    })
  }
  if (!scoped.notifications) {
    throw new Error('Notifications repo methods are not available.')
  }

  const message = input.message.trim()
  const href = deadlineDetailHrefForObligation(input.obligationId)
  const subject = obligationNotificationSubject(obligation, client?.name ?? null)
  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.obligationId,
    action: 'obligation.input_requested',
    after: {
      recipientUserId: recipient.userId,
      recipientName: recipient.name,
      recipientRole: recipient.role,
      message,
      href,
    },
  })
  const { id: notificationId } = await scoped.notifications.create({
    userId: recipient.userId,
    type: 'internal_request',
    entityType: 'obligation_instance',
    entityId: input.obligationId,
    title: `${actor.name} requested input`,
    body: `${subject}: ${message}`,
    href,
    metadataJson: {
      auditId,
      requestedByUserId: userId,
      requestedByName: actor.name,
      recipientRole: recipient.role,
    },
  })

  return { auditId, notificationId }
})

function deadlineTipFallback(obligationId: string) {
  return [
    {
      key: 'what',
      label: 'What',
      text: 'Cached deadline tip is pending for this deadline.',
      citationRefs: [],
    },
    {
      key: 'why',
      label: 'Why',
      text: 'Smart Priority explains urgency with deterministic deadline, client risk, and readiness inputs.',
      citationRefs: [],
    },
    {
      key: 'prepare',
      label: 'Prepare',
      text: `Request a refresh after evidence or status changes for deadline ${obligationId}.`,
      citationRefs: [],
    },
  ]
}

const updateTaxYearProfile = os.obligations.updateTaxYearProfile.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
    const { scoped, tenant, userId } = requireTenant(context)
    const before = await scoped.obligations.findById(input.id)
    if (!before) {
      throw new ORPCError('NOT_FOUND', {
        message: `Deadline ${input.id} not found in current firm.`,
      })
    }
    if (before.taxYear === null) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Only tax-year-specific deadlines can update tax year profile.',
      })
    }
    const beforeRule = before.ruleId ? findRuleById(before.ruleId) : null
    if (
      !canEditTaxYearProfileForObligation({
        rule: beforeRule,
        taxType: before.taxType,
        taxYearType: before.taxYearType,
        taxPeriodKind: before.taxPeriodKind,
      })
    ) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'This deadline is not driven by a fiscal tax year.',
      })
    }

    const nextFiscalYearEndMonth = input.taxYearType === 'fiscal' ? input.fiscalYearEndMonth : null
    const nextFiscalYearEndDay = input.taxYearType === 'fiscal' ? input.fiscalYearEndDay : null
    const client = await scoped.clients.findById(before.clientId)
    if (!client) {
      throw new ORPCError('NOT_FOUND', {
        message: `Client ${before.clientId} for deadline ${input.id} was not found.`,
      })
    }
    const plan = resolveUpdatedTaxYearProfilePlan({
      row: before,
      client,
      taxYearType: input.taxYearType,
      fiscalYearEndMonth: nextFiscalYearEndMonth,
      fiscalYearEndDay: nextFiscalYearEndDay,
      internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
    })
    if (!plan) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Could not determine the statutory due date for this tax year profile.',
      })
    }
    if (plan.currentDueDate.getTime() > plan.baseDueDate.getTime()) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Internal deadline must be on or before the statutory deadline.',
      })
    }
    if (
      plan.filingDueDate &&
      plan.taxPeriodEnd &&
      plan.filingDueDate.getTime() < plan.taxPeriodEnd.getTime()
    ) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Statutory filing deadline must be on or after the tax period end.',
      })
    }

    await scoped.obligations.updateTaxYearProfile(input.id, {
      taxYearType: input.taxYearType,
      fiscalYearEndMonth: nextFiscalYearEndMonth,
      fiscalYearEndDay: nextFiscalYearEndDay,
      taxPeriodStart: plan.taxPeriodStart,
      taxPeriodEnd: plan.taxPeriodEnd,
      taxPeriodKind: plan.taxPeriodKind,
      taxPeriodSource: plan.taxPeriodSource,
      taxPeriodReviewReason: plan.taxPeriodReviewReason,
      baseDueDate: plan.baseDueDate,
      currentDueDate: plan.currentDueDate,
      filingDueDate: plan.filingDueDate,
      paymentDueDate: plan.paymentDueDate,
    })
    const after = await scoped.obligations.findById(input.id)
    if (!after) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Updated deadline could not be re-read.',
      })
    }

    const { id: auditId } = await scoped.audit.write({
      actorId: userId,
      entityType: 'obligation_instance',
      entityId: input.id,
      action: 'obligation.tax_year_profile.updated',
      before: {
        taxYearType: before.taxYearType,
        fiscalYearEndMonth: before.fiscalYearEndMonth,
        fiscalYearEndDay: before.fiscalYearEndDay,
        taxPeriodStart: before.taxPeriodStart?.toISOString().slice(0, 10) ?? null,
        taxPeriodEnd: before.taxPeriodEnd?.toISOString().slice(0, 10) ?? null,
        baseDueDate: before.baseDueDate.toISOString().slice(0, 10),
        currentDueDate: before.currentDueDate.toISOString().slice(0, 10),
        filingDueDate: before.filingDueDate?.toISOString().slice(0, 10) ?? null,
        paymentDueDate: before.paymentDueDate?.toISOString().slice(0, 10) ?? null,
      },
      after: {
        taxYearType: after.taxYearType,
        fiscalYearEndMonth: after.fiscalYearEndMonth,
        fiscalYearEndDay: after.fiscalYearEndDay,
        taxPeriodStart: after.taxPeriodStart?.toISOString().slice(0, 10) ?? null,
        taxPeriodEnd: after.taxPeriodEnd?.toISOString().slice(0, 10) ?? null,
        baseDueDate: after.baseDueDate.toISOString().slice(0, 10),
        currentDueDate: after.currentDueDate.toISOString().slice(0, 10),
        filingDueDate: after.filingDueDate?.toISOString().slice(0, 10) ?? null,
        paymentDueDate: after.paymentDueDate?.toISOString().slice(0, 10) ?? null,
      },
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
    })

    await Promise.all([
      enqueueDashboardBriefRefresh(context.env, {
        firmId: tenant.firmId,
        reason: 'due_date_update',
      }).catch(() => false),
      enqueueAiInsightRefresh(context.env, {
        firmId: tenant.firmId,
        kind: 'deadline_tip',
        subjectId: input.id,
        reason: 'due_date_update',
      }).catch(() => false),
    ])

    const afterClient = client ?? (await scoped.clients.findById(after.clientId))
    return {
      obligation: toObligationPublic(after, {
        client: afterClient,
        asOfDate: dateInTimezone(tenant.timezone),
      }),
      auditId,
    }
  },
)

const getDeadlineTip = os.obligations.getDeadlineTip.handler(async ({ input, context }) => {
  const { scoped, tenant } = requireTenant(context)
  const obligation = await scoped.obligations.findById(input.obligationId)
  if (!obligation) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.obligationId} not found in current firm.`,
    })
  }
  const asOfDate = dateInTimezone(tenant.timezone)
  const insight = await scoped.aiInsights.findLatest({
    kind: 'deadline_tip',
    subjectType: 'obligation',
    subjectId: input.obligationId,
    asOfDate,
  })
  return toAiInsightPublic(insight, {
    kind: 'deadline_tip',
    subjectId: input.obligationId,
    sections: deadlineTipFallback(input.obligationId),
  })
})

const requestDeadlineTipRefresh = os.obligations.requestDeadlineTipRefresh.handler(
  async ({ input, context }) => {
    const { scoped, tenant } = requireTenant(context)
    requirePracticeAiWorkflow(tenant.plan)
    const obligation = await scoped.obligations.findById(input.obligationId)
    if (!obligation) {
      throw new ORPCError('NOT_FOUND', {
        message: `Deadline ${input.obligationId} not found in current firm.`,
      })
    }
    const asOfDate = dateInTimezone(tenant.timezone)
    const latest = await scoped.aiInsights.findLatest({
      kind: 'deadline_tip',
      subjectType: 'obligation',
      subjectId: input.obligationId,
      asOfDate,
    })
    const pending =
      latest?.status === 'pending'
        ? latest
        : await scoped.aiInsights.createPending({
            kind: 'deadline_tip',
            subjectType: 'obligation',
            subjectId: input.obligationId,
            asOfDate,
            inputHash: `manual-refresh:${crypto.randomUUID()}`,
            reason: 'manual_refresh',
            output: latest?.output ?? undefined,
            citations: latest?.citations ?? undefined,
            generatedAt: latest?.generatedAt ?? null,
            expiresAt: latest?.expiresAt ?? null,
          })
    const queued = await enqueueAiInsightRefresh(context.env, {
      firmId: tenant.firmId,
      kind: 'deadline_tip',
      subjectId: input.obligationId,
      asOfDate,
      reason: 'manual_refresh',
    })
    return {
      queued,
      insight: toAiInsightPublic(pending, {
        kind: 'deadline_tip',
        subjectId: input.obligationId,
        sections: deadlineTipFallback(input.obligationId),
      }),
    }
  },
)

export const obligationsHandlers = {
  createBatch,
  createFromRule,
  createFromRules,
  previewAnnualRollover,
  createAnnualRollover,
  confirmObligations,
  previewReprojection,
  applyReprojection,
  listProjectedDeadlines,
  updateDueDate,
  rebindRule,
  updateTaxYearProfile,
  listByClient,
  updateStatus,
  markFiledRejected,
  assign,
  snooze,
  updateBlockedBy,
  updatePrepStage,
  updateReviewStage,
  bulkUpdateStatus,
  decideExtension,
  bulkDecideExtension,
  bulkExtensionDecisionPreview,
  updateEfileState,
  remindSignature,
  signatureReminderPreview,
  bulkRemindSignature,
  bulkSignatureReminderPreview,
  backfillSignatureLoop,
  requestInput,
  getDeadlineTip,
  requestDeadlineTipRefresh,
}
