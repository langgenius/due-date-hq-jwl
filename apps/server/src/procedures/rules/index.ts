import { ORPCError } from '@orpc/server'
import {
  ObligationRuleSchema,
  type ObligationGenerationPreview,
  type ObligationRule,
  type RuleBulkAcceptSkip,
  type RuleBulkImpactPreview,
  RuleConcreteDraftSchema,
  type RuleGenerationState,
  RuleGenerationStateValues,
  type RuleCoverageRow,
  type RuleBulkVerifyCandidateSkip,
  type RuleJurisdiction,
  type RuleOnboardingActivationOutput,
  type RuleReviewDecision,
  type RuleReviewTask,
  type RuleSource,
  type RuleStatus,
  type TemporaryRule,
} from '@duedatehq/contracts'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import {
  findRuleById,
  listRequiredSourceCoverage,
  listObligationRules,
  listRuleSources,
  previewObligationsFromRules,
  sourceCoversRuleDomain,
  type ObligationRule as CoreObligationRule,
  type RequiredSourceCoverageCell,
  type RuleGenerationEntity,
} from '@duedatehq/core/rules'
import type { AiOutputRow } from '@duedatehq/ports/ai'
import type {
  PracticeRuleRow,
  PracticeRuleReviewTaskRow,
  RuleReviewDecisionRow,
  TemporaryRuleRow,
} from '@duedatehq/ports/rules'
import { requireTenant, type RpcContext } from '../_context'
import { requireCurrentFirmRole } from '../_permissions'
import { os } from '../_root'
import { isOnOrAfterDateOnly } from '../../lib/date-only'
import { generateObligationsForAcceptedRules } from './_obligation-generation'
import {
  cachedConcreteDraftKey,
  concreteDraftBulkTrustIssue,
  concreteDraftSourceIsStale,
  generateConcreteDraft,
  parseCachedConcreteDraft,
  RETIRED_DETERMINISTIC_CONCRETE_DRAFT_MODEL,
  RULE_CONCRETE_DRAFT_PROMPT,
  type RuleConcreteDraftPayload,
} from './concrete-draft'
import { toContractRule, toCoreRule, toPracticeContractRule } from './runtime'

const MAX_BULK_ACCEPT = 100
const RULE_REVIEW_ROLES = ['owner', 'partner', 'manager'] as const
const ONBOARDING_RULE_REVIEW_NOTE = 'Activated from onboarding jurisdiction selection.'
const COVERAGE_ENTITY_COLUMNS = [
  'llc',
  'partnership',
  's_corp',
  'c_corp',
  'sole_prop',
  'individual',
  'trust',
] as const satisfies readonly (keyof RuleCoverageRow['entityCoverage'])[]
const BUSINESS_COVERAGE_ENTITIES = new Set<keyof RuleCoverageRow['entityCoverage']>([
  'llc',
  'partnership',
  's_corp',
  'c_corp',
  'sole_prop',
])
const RULE_GENERATION_STATES = new Set<string>(RuleGenerationStateValues)

function isRuleGenerationState(value: string | null | undefined): value is RuleGenerationState {
  return typeof value === 'string' && RULE_GENERATION_STATES.has(value)
}

function toSource(source: ReturnType<typeof listRuleSources>[number]): RuleSource {
  const { inboundEmail: _inboundEmail, localFactRequirements, ...sourceRest } = source
  return {
    ...sourceRest,
    ...(localFactRequirements !== undefined
      ? { localFactRequirements: [...localFactRequirements] }
      : {}),
    domains: [...source.domains],
    entityApplicability: [...source.entityApplicability],
    notificationChannels: [...source.notificationChannels],
  }
}

function toPreview(
  preview: ReturnType<typeof previewObligationsFromRules>[number],
): ObligationGenerationPreview {
  const { localFactRequirements, ...previewRest } = preview
  return {
    ...previewRest,
    ...(localFactRequirements !== undefined
      ? { localFactRequirements: [...localFactRequirements] }
      : {}),
    sourceIds: [...preview.sourceIds],
    evidence: preview.evidence.map((item) => ({ ...item })),
    reviewReasons: [...preview.reviewReasons],
    missingClientFacts: [...preview.missingClientFacts],
  }
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toDateOnlyOrNull(date: Date | null): string | null {
  return date ? toDateOnly(date) : null
}

function toIsoOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null
}

function practiceReviewMetadata(
  row: PracticeRuleRow,
  reviewerNames: ReadonlyMap<string, string>,
): {
  verifiedBy?: string
  verifiedAt?: string
  reviewedByName?: string
  reviewedAt?: string
  version: number
} {
  const reviewerName = row.reviewedBy
    ? (reviewerNames.get(row.reviewedBy) ?? 'Unknown reviewer')
    : null
  return {
    ...(reviewerName ? { verifiedBy: reviewerName, reviewedByName: reviewerName } : {}),
    ...(row.reviewedAt ? { verifiedAt: toDateOnly(row.reviewedAt) } : {}),
    ...(row.reviewedAt ? { reviewedAt: row.reviewedAt.toISOString() } : {}),
    version: row.templateVersion,
  }
}

async function reviewerNamesByUserId(context: RpcContext): Promise<ReadonlyMap<string, string>> {
  const { tenant } = requireTenant(context)
  const members = context.vars.members
  if (!members) return new Map()
  const rows = await members.listMembers(tenant.firmId)
  return new Map(rows.map((member) => [member.userId, member.name || member.email]))
}

async function currentReviewerName(context: RpcContext, userId: string): Promise<string> {
  const { tenant } = requireTenant(context)
  const member = await context.vars.members?.findMembership(tenant.firmId, userId)
  return member?.name || member?.email || 'Unknown reviewer'
}

function templateRules(): readonly CoreObligationRule[] {
  return listObligationRules({ includeCandidates: true })
}

function templateRuleById(ruleId: string): CoreObligationRule | null {
  return findRuleById(ruleId) ?? null
}

function isSourceDefinedRule(rule: Pick<CoreObligationRule, 'dueDateLogic'>): boolean {
  return rule.dueDateLogic.kind === 'source_defined_calendar'
}

function sourceDefinedAcceptError() {
  return new ORPCError('BAD_REQUEST', {
    message:
      'Source-defined rule templates require an AI concrete draft and practice review before activation.',
  })
}

function ruleCoversCoverageEntity(
  rule: Pick<CoreObligationRule, 'entityApplicability'>,
  entity: keyof RuleCoverageRow['entityCoverage'],
): boolean {
  if (rule.entityApplicability.includes(entity)) return true
  if (!rule.entityApplicability.includes('any_business')) return false
  return BUSINESS_COVERAGE_ENTITIES.has(entity)
}

function emptyEntityCoverage(): RuleCoverageRow['entityCoverage'] {
  return {
    llc: 'none',
    partnership: 'none',
    s_corp: 'none',
    c_corp: 'none',
    sole_prop: 'none',
    individual: 'none',
    trust: 'none',
  }
}

function emptyEntitySourceCoverage(): RuleCoverageRow['entitySourceCoverage'] {
  return {
    llc: 'not_applicable',
    partnership: 'not_applicable',
    s_corp: 'not_applicable',
    c_corp: 'not_applicable',
    sole_prop: 'not_applicable',
    individual: 'not_applicable',
    trust: 'not_applicable',
  }
}

function mergeCoverageState(
  current: RuleCoverageRow['entityCoverage'][keyof RuleCoverageRow['entityCoverage']],
  next: RuleCoverageRow['entityCoverage'][keyof RuleCoverageRow['entityCoverage']],
): RuleCoverageRow['entityCoverage'][keyof RuleCoverageRow['entityCoverage']] {
  if (current === 'active' || next === 'active') return 'active'
  if (current === 'review' || next === 'review') return 'review'
  return 'none'
}

function mergeSourceCoverageState(
  current: RuleCoverageRow['entitySourceCoverage'][keyof RuleCoverageRow['entitySourceCoverage']],
  next: RuleCoverageRow['entitySourceCoverage'][keyof RuleCoverageRow['entitySourceCoverage']],
): RuleCoverageRow['entitySourceCoverage'][keyof RuleCoverageRow['entitySourceCoverage']] {
  const rank: Record<
    RuleCoverageRow['entitySourceCoverage'][keyof RuleCoverageRow['entitySourceCoverage']],
    number
  > = {
    not_applicable: 0,
    missing_source: 1,
    source_registered: 2,
    source_verified: 3,
    rule_pending_review: 4,
    rule_active: 5,
  }
  return rank[next] > rank[current] ? next : current
}

function coverageStateForRule(
  rule: ObligationRule,
): RuleCoverageRow['entityCoverage'][keyof RuleCoverageRow['entityCoverage']] | null {
  if (rule.status === 'active') {
    return rule.dueDateLogic.kind === 'source_defined_calendar' ? 'review' : 'active'
  }
  if (rule.status === 'candidate' || rule.status === 'pending_review') return 'review'
  return null
}

function sourceCoverageStateForRule(
  rule: ObligationRule,
): RuleCoverageRow['entitySourceCoverage'][keyof RuleCoverageRow['entitySourceCoverage']] | null {
  if (rule.status === 'active') {
    return rule.dueDateLogic.kind === 'source_defined_calendar'
      ? 'rule_pending_review'
      : 'rule_active'
  }
  if (rule.status === 'candidate' || rule.status === 'pending_review') return 'rule_pending_review'
  return null
}

async function ensureGlobalTemplateCatalog(context: RpcContext): Promise<void> {
  const { scoped } = requireTenant(context)
  await scoped.rules.upsertGlobalTemplates({
    sources: listRuleSources().map((source) => ({
      id: source.id,
      jurisdiction: source.jurisdiction,
      title: source.title,
      url: source.url,
      sourceType: source.sourceType,
      acquisitionMethod: source.acquisitionMethod,
      cadence: source.cadence,
      priority: source.priority,
      healthStatus: source.healthStatus,
      isEarlyWarning: source.isEarlyWarning,
      notificationChannels: [...source.notificationChannels],
      lastReviewedOn: source.lastReviewedOn,
      status: 'available',
    })),
    rules: templateRules().map((rule) => ({
      id: rule.id,
      jurisdiction: rule.jurisdiction,
      title: rule.title,
      version: rule.version,
      status: rule.status === 'deprecated' ? 'deprecated' : 'available',
      ruleJson: rule,
      sourceIds: [...rule.sourceIds],
    })),
  })
}

function mapStatusFilter(status: RuleStatus | undefined): ObligationRule['status'] | undefined {
  if (!status) return undefined
  if (status === 'verified') return 'active'
  if (status === 'candidate') return 'pending_review'
  return status as ObligationRule['status']
}

function pendingContractRule(rule: CoreObligationRule): ObligationRule {
  return toPracticeContractRule(rule, 'pending_review', {
    verifiedBy: 'practice.owner_or_manager_required',
  })
}

export function isDefaultActiveTemplateRule(
  rule: Pick<CoreObligationRule, 'jurisdiction' | 'status'>,
): boolean {
  return rule.jurisdiction === 'FED' && rule.status === 'verified'
}

export function defaultContractRuleForTemplate(rule: CoreObligationRule): ObligationRule {
  return isDefaultActiveTemplateRule(rule)
    ? toPracticeContractRule(rule, 'active')
    : pendingContractRule(rule)
}

function reviewTaskKey(ruleId: string, templateVersion: number): string {
  return `${ruleId}:${templateVersion}`
}

function reviewOnlyCoreRule(rule: CoreObligationRule): CoreObligationRule {
  return {
    ...rule,
    status: 'verified',
    ruleTier: rule.ruleTier === 'exception' ? 'exception' : 'applicability_review',
    coverageStatus: 'manual',
    requiresApplicabilityReview: true,
  }
}

function parsePracticeRule(row: PracticeRuleRow): CoreObligationRule | null {
  if (row.status !== 'active' || !row.ruleJson) return null
  const parsed = ObligationRuleSchema.safeParse(row.ruleJson)
  if (!parsed.success) return null
  if (isSourceDefinedRule(parsed.data)) return null
  return toCoreRule(parsed.data)
}

function parseDecisionRule(row: RuleReviewDecisionRow): CoreObligationRule | null {
  if (row.status !== 'verified' || !row.ruleJson) return null
  const parsed = ObligationRuleSchema.safeParse(row.ruleJson)
  return parsed.success ? toCoreRule(parsed.data) : null
}

async function loadCandidateSourceContext(input: {
  context: RpcContext
  base: CoreObligationRule
  sourceId: string
}): Promise<{
  source: ReturnType<typeof listRuleSources>[number]
}> {
  const source = listRuleSources().find((item) => item.id === input.sourceId)
  if (!source) throw new ORPCError('BAD_REQUEST', { message: 'Official source was not found.' })
  if (source.jurisdiction !== input.base.jurisdiction && source.jurisdiction !== 'FED') {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Official source jurisdiction does not match the rule template.',
    })
  }
  if (!input.base.sourceIds.includes(source.id) && !sourceCoversRuleDomain(source, input.base)) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Official source does not cover the selected rule template.',
    })
  }

  return { source }
}

function toReviewDecision(row: RuleReviewDecisionRow): RuleReviewDecision {
  const rule = parseDecisionRule(row)
  return {
    id: row.id,
    ruleId: row.ruleId,
    baseVersion: row.baseVersion,
    status: row.status,
    rule: rule ? toContractRule(rule) : null,
    reviewNote: row.reviewNote,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt.toISOString(),
  }
}

function toTemporaryRule(row: TemporaryRuleRow): TemporaryRule {
  return {
    id: row.id,
    alertId: row.alertId,
    sourcePulseId: row.sourcePulseId,
    title: row.title,
    sourceUrl: row.sourceUrl,
    sourceExcerpt: row.sourceExcerpt,
    jurisdiction: row.jurisdiction,
    counties: row.counties,
    affectedForms: row.affectedForms,
    affectedEntityTypes: row.affectedEntityTypes,
    overrideType: row.overrideType,
    overrideDueDate: toDateOnlyOrNull(row.overrideDueDate),
    effectiveFrom: toDateOnlyOrNull(row.effectiveFrom),
    effectiveUntil: toDateOnlyOrNull(row.effectiveUntil),
    status: row.status,
    appliedObligationCount: row.appliedObligationCount,
    activeObligationCount: row.activeObligationCount,
    revertedObligationCount: row.revertedObligationCount,
    firstAppliedAt: row.firstAppliedAt ? row.firstAppliedAt.toISOString() : null,
    lastActivityAt: row.lastActivityAt.toISOString(),
  }
}

export function isPracticeRuleBehindTemplate(input: {
  practiceVersion: number
  templateVersion: number
}): boolean {
  return input.practiceVersion < input.templateVersion
}

async function ensureTemplateReviewTasks(context: RpcContext): Promise<void> {
  await ensureGlobalTemplateCatalog(context)
  const { scoped } = requireTenant(context)
  const reviewedRows = await scoped.rules.listPracticeRules()
  const reviewedByRuleId = new Map(reviewedRows.map((row) => [row.ruleId, row]))
  const reviewTasks: Parameters<typeof scoped.rules.ensureReviewTasks>[0] = []

  for (const rule of templateRules()) {
    if (rule.status === 'deprecated') continue
    const reviewed = reviewedByRuleId.get(rule.id)
    if (!reviewed) {
      if (isDefaultActiveTemplateRule(rule)) continue
      reviewTasks.push({
        ruleId: rule.id,
        templateVersion: rule.version,
        reason: 'new_template',
      })
      continue
    }
    if (
      reviewed.status !== 'pending_review' &&
      isPracticeRuleBehindTemplate({
        practiceVersion: reviewed.templateVersion,
        templateVersion: rule.version,
      })
    ) {
      reviewTasks.push({
        ruleId: rule.id,
        templateVersion: rule.version,
        reason: 'source_changed',
      })
    }
  }

  await scoped.rules.ensureReviewTasks(reviewTasks)
}

function taskToContract(row: PracticeRuleReviewTaskRow, rule: ObligationRule): RuleReviewTask {
  return {
    id: row.id,
    ruleId: row.ruleId,
    templateVersion: row.templateVersion,
    status: row.status,
    reason: row.reason,
    rule,
    reviewNote: row.reviewNote,
    reviewedBy: row.reviewedBy,
    reviewedAt: toIsoOrNull(row.reviewedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function acceptedTaskForRule(input: {
  context: RpcContext
  rule: ObligationRule
  status: Exclude<PracticeRuleReviewTaskRow['status'], 'open'>
  reviewNote: string | null
  reviewedBy: string
  reviewedByName?: string
  reviewedAt: Date
}): Promise<RuleReviewTask> {
  const { scoped } = requireTenant(input.context)
  const task = await scoped.rules.decideReviewTask({
    ruleId: input.rule.id,
    templateVersion: input.rule.version,
    status: input.status,
    reviewNote: input.reviewNote,
    reviewedBy: input.reviewedBy,
    reviewedAt: input.reviewedAt,
  })
  return taskToContract(task, input.rule)
}

async function listPracticeRules(input: {
  context: RpcContext
  jurisdiction?: RuleJurisdiction
  status?: RuleStatus
  includeCandidates?: boolean
}): Promise<ObligationRule[]> {
  await ensureTemplateReviewTasks(input.context)
  const { scoped } = requireTenant(input.context)
  const practiceRows = await scoped.rules.listPracticeRules()
  const reviewerNames = await reviewerNamesByUserId(input.context)
  const practiceByRuleId = new Map(practiceRows.map((row) => [row.ruleId, row]))
  const openReviewTaskKeys = new Set(
    (await scoped.rules.listReviewTasks({ status: 'open' })).map((task) =>
      reviewTaskKey(task.ruleId, task.templateVersion),
    ),
  )
  const rows: ObligationRule[] = []

  for (const template of templateRules()) {
    if (input.jurisdiction && template.jurisdiction !== input.jurisdiction) continue
    const practice = practiceByRuleId.get(template.id)
    const hasOpenTemplateReviewTask = openReviewTaskKeys.has(
      reviewTaskKey(template.id, template.version),
    )
    if (!practice) {
      rows.push(defaultContractRuleForTemplate(template))
      continue
    }
    if (isDefaultActiveTemplateRule(template) && practice.status === 'pending_review') {
      rows.push(toPracticeContractRule(template, 'active'))
      continue
    }

    const parsed = practice.ruleJson
      ? ObligationRuleSchema.safeParse(practice.ruleJson)
      : { success: false as const }
    if (practice.status === 'active' && parsed.success) {
      if (isSourceDefinedRule(parsed.data) && !isDefaultActiveTemplateRule(template)) {
        rows.push({
          ...parsed.data,
          status: 'pending_review',
          version: practice.templateVersion,
        })
        continue
      }
      const metadata = practiceReviewMetadata(practice, reviewerNames)
      const activeRule: ObligationRule = {
        ...parsed.data,
        status: 'active',
        verifiedBy: metadata.verifiedBy ?? parsed.data.verifiedBy,
        verifiedAt: metadata.verifiedAt ?? parsed.data.verifiedAt,
        ...(metadata.reviewedByName ? { reviewedByName: metadata.reviewedByName } : {}),
        ...(metadata.reviewedAt ? { reviewedAt: metadata.reviewedAt } : {}),
        version: practice.templateVersion,
      }
      rows.push(activeRule)
      if (
        isPracticeRuleBehindTemplate({
          practiceVersion: practice.templateVersion,
          templateVersion: template.version,
        }) &&
        hasOpenTemplateReviewTask
      ) {
        rows.push(pendingContractRule(template))
      }
      continue
    }

    rows.push(
      toPracticeContractRule(
        template,
        practice.status,
        practiceReviewMetadata(practice, reviewerNames),
      ),
    )
    if (
      practice.status !== 'pending_review' &&
      isPracticeRuleBehindTemplate({
        practiceVersion: practice.templateVersion,
        templateVersion: template.version,
      }) &&
      hasOpenTemplateReviewTask
    ) {
      rows.push(pendingContractRule(template))
    }
  }

  const templateIds = new Set(templateRules().map((rule) => rule.id))
  for (const practice of practiceRows) {
    if (templateIds.has(practice.ruleId)) continue
    if (input.jurisdiction) {
      const parsed = practice.ruleJson ? ObligationRuleSchema.safeParse(practice.ruleJson) : null
      if (!parsed?.success || parsed.data.jurisdiction !== input.jurisdiction) continue
    }
    if (!practice.ruleJson) continue
    const parsed = ObligationRuleSchema.safeParse(practice.ruleJson)
    if (!parsed.success) continue
    const metadata = practiceReviewMetadata(practice, reviewerNames)
    rows.push({
      ...parsed.data,
      status: practice.status,
      verifiedBy: metadata.verifiedBy ?? parsed.data.verifiedBy,
      verifiedAt: metadata.verifiedAt ?? parsed.data.verifiedAt,
      ...(metadata.reviewedByName ? { reviewedByName: metadata.reviewedByName } : {}),
      ...(metadata.reviewedAt ? { reviewedAt: metadata.reviewedAt } : {}),
      version: practice.templateVersion,
    })
  }

  const mappedStatus = mapStatusFilter(input.status)
  const includeCandidates = input.includeCandidates ?? false
  return rows.filter((rule) => {
    if (mappedStatus && rule.status !== mappedStatus) return false
    if (!includeCandidates && rule.status !== 'active') return false
    return true
  })
}

async function listActiveCoreRules(scoped: ReturnType<typeof requireTenant>['scoped']) {
  const rows = await scoped.rules.listActivePracticeRules()
  const activeRows = rows.flatMap((row) => {
    const rule = parsePracticeRule(row)
    return rule ? [rule] : []
  })
  const practiceRowsByRuleId = new Map(
    (await scoped.rules.listPracticeRules()).map((row) => [row.ruleId, row]),
  )
  const activeRowIds = new Set(activeRows.map((rule) => rule.id))
  const defaultActiveRules = templateRules().filter((rule) => {
    if (!isDefaultActiveTemplateRule(rule)) return false
    if (activeRowIds.has(rule.id)) return false
    const practice = practiceRowsByRuleId.get(rule.id)
    return practice?.status !== 'rejected' && practice?.status !== 'archived'
  })
  return [...activeRows, ...defaultActiveRules]
}

function ruleMatchesEntity(rule: CoreObligationRule, entityType: RuleGenerationEntity): boolean {
  if (entityType !== 'other' && rule.entityApplicability.includes(entityType)) return true
  if (!rule.entityApplicability.includes('any_business')) return false
  return entityType !== 'individual' && entityType !== 'trust'
}

function countKey<T extends string>(map: Map<T, number>, key: T): void {
  map.set(key, (map.get(key) ?? 0) + 1)
}

function distribution(map: ReadonlyMap<string, number>) {
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .toSorted((left, right) => left.key.localeCompare(right.key))
}

function uniqueRuleGenerationStates(states: readonly RuleGenerationState[]): RuleGenerationState[] {
  return Array.from(new Set(states))
}

export function isOnboardingActivatableRule(rule: Pick<CoreObligationRule, 'status'>): boolean {
  return rule.status !== 'deprecated'
}

export function onboardingActivationJurisdictions(
  states: readonly RuleGenerationState[],
): RuleJurisdiction[] {
  const selectedStates = uniqueRuleGenerationStates(states)
  return selectedStates.length === 0 ? [] : ['FED', ...selectedStates]
}

export async function activateOnboardingJurisdictionRules(input: {
  scoped: ScopedRepo
  userId: string
  internalDeadlineOffsetDays: number
  monitoringStartDate?: string
  states: readonly RuleGenerationState[]
  now?: Date
  ensureCatalog?: () => Promise<void>
  generateObligations?: typeof generateObligationsForAcceptedRules
}): Promise<RuleOnboardingActivationOutput> {
  const selectedStates = uniqueRuleGenerationStates(input.states)
  const jurisdictions = onboardingActivationJurisdictions(selectedStates)
  if (jurisdictions.length === 0) {
    return {
      selectedStates,
      jurisdictions,
      activatedCount: 0,
      skippedCount: 0,
      reviewRequiredCount: 0,
      reviewRequiredJurisdictions: [],
      generatedObligationCount: 0,
    }
  }

  await input.ensureCatalog?.()
  const reviewedAt = input.now ?? new Date()
  const jurisdictionSet = new Set<RuleJurisdiction>(jurisdictions)
  const matchingRules = templateRules().filter((rule) => jurisdictionSet.has(rule.jurisdiction))
  const activatableRules = matchingRules.filter(isOnboardingActivatableRule)
  const reviewRequiredRules = activatableRules.filter(isSourceDefinedRule)
  const activationReadyRules = activatableRules.filter((rule) => !isSourceDefinedRule(rule))
  const reviewRequiredJurisdictionSet = new Set(
    reviewRequiredRules.map((rule) => rule.jurisdiction),
  )
  const reviewRequiredJurisdictions = jurisdictions.filter((jurisdiction) =>
    reviewRequiredJurisdictionSet.has(jurisdiction),
  )
  const activeCoreRules: CoreObligationRule[] = []

  await Promise.all(
    activationReadyRules.map(async (rule) => {
      const activeRule: ObligationRule = {
        ...toPracticeContractRule(rule, 'active', {
          verifiedBy: input.userId,
          verifiedAt: toDateOnly(reviewedAt),
        }),
        status: 'active',
      }
      activeCoreRules.push(toCoreRule(activeRule))
      await input.scoped.rules.upsertPracticeRule({
        ruleId: rule.id,
        templateId: rule.id,
        templateVersion: activeRule.version,
        status: 'active',
        ruleJson: activeRule,
        reviewNote: ONBOARDING_RULE_REVIEW_NOTE,
        reviewedBy: input.userId,
        reviewedAt,
      })
      await input.scoped.rules.decideReviewTask({
        ruleId: rule.id,
        templateVersion: activeRule.version,
        status: 'accepted',
        reviewNote: ONBOARDING_RULE_REVIEW_NOTE,
        reviewedBy: input.userId,
        reviewedAt,
      })
    }),
  )

  await Promise.all(
    reviewRequiredRules.map(async (rule) => {
      const pendingRule = pendingContractRule(rule)
      await input.scoped.rules.upsertPracticeRule({
        ruleId: rule.id,
        templateId: rule.id,
        templateVersion: pendingRule.version,
        status: 'pending_review',
        ruleJson: pendingRule,
        reviewNote: null,
        reviewedBy: null,
        reviewedAt: null,
      })
    }),
  )
  await input.scoped.rules.ensureReviewTasks(
    reviewRequiredRules.map((rule) => ({
      ruleId: rule.id,
      templateVersion: rule.version,
      reason: 'new_template',
    })),
  )

  const generate = input.generateObligations ?? generateObligationsForAcceptedRules
  const generation = await generate({
    scoped: input.scoped,
    userId: input.userId,
    rules: activeCoreRules,
    internalDeadlineOffsetDays: input.internalDeadlineOffsetDays,
    ...(input.monitoringStartDate ? { monitoringStartDate: input.monitoringStartDate } : {}),
    now: reviewedAt,
    reason: ONBOARDING_RULE_REVIEW_NOTE,
  })

  await input.scoped.audit.write({
    actorId: input.userId,
    entityType: 'rule_batch',
    entityId: activatableRules[0]?.id ?? 'empty',
    action: 'rules.onboarding_activated',
    after: {
      selectedStates,
      jurisdictions,
      activatedCount: activationReadyRules.length,
      skippedCount: matchingRules.length - activatableRules.length,
      reviewRequiredCount: reviewRequiredRules.length,
      reviewRequiredJurisdictions,
      generatedObligationCount: generation.createdCount,
    },
    reason: ONBOARDING_RULE_REVIEW_NOTE,
  })

  return {
    selectedStates,
    jurisdictions,
    activatedCount: activationReadyRules.length,
    skippedCount: matchingRules.length - activatableRules.length,
    reviewRequiredCount: reviewRequiredRules.length,
    reviewRequiredJurisdictions,
    generatedObligationCount: generation.createdCount,
  }
}

async function previewBulkImpactForSelections(
  context: RpcContext,
  selections: readonly { ruleId: string; expectedVersion: number }[],
): Promise<RuleBulkImpactPreview> {
  const { scoped, tenant } = requireTenant(context)
  const templateById = new Map(templateRules().map((rule) => [rule.id, rule]))
  const practiceById = new Map(
    (await scoped.rules.listPracticeRules()).map((rule) => [rule.ruleId, rule]),
  )
  const taskBySelection = new Map(
    (await scoped.rules.listReviewTasks()).map((task) => [
      `${task.ruleId}:${task.templateVersion}`,
      task,
    ]),
  )
  const driftRuleIds = new Set(
    await scoped.rules.listUnclearedDriftRuleIds(selections.map((selection) => selection.ruleId)),
  )
  const ready: CoreObligationRule[] = []
  const skipped: RuleBulkAcceptSkip[] = []

  for (const selection of selections.slice(0, MAX_BULK_ACCEPT)) {
    const template = templateById.get(selection.ruleId)
    if (!template) {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: 'template_not_found',
      })
      continue
    }
    if (template.version !== selection.expectedVersion) {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: 'version_conflict',
      })
      continue
    }
    if (isSourceDefinedRule(template)) {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: 'source_defined_requires_ai_review',
      })
      continue
    }
    const task = taskBySelection.get(`${selection.ruleId}:${selection.expectedVersion}`)
    if (task?.reason === 'source_changed') {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: 'source_changed_requires_review',
      })
      continue
    }
    if (driftRuleIds.has(selection.ruleId)) {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: 'source_drifted_requires_review',
      })
      continue
    }
    const existing = practiceById.get(selection.ruleId)
    if (existing?.status === 'active') {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: 'already_active',
      })
      continue
    }
    if (existing?.status === 'rejected' || existing?.status === 'archived') {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: existing.status,
      })
      continue
    }
    ready.push(template)
  }

  const jurisdictionCounts = new Map<string, number>()
  const entityCounts = new Map<string, number>()
  const formCounts = new Map<string, number>()
  const reviewReasonCounts = new Map<string, number>()
  const sourceIds = new Set<string>()
  for (const rule of ready) {
    countKey(jurisdictionCounts, rule.jurisdiction)
    countKey(formCounts, rule.formName)
    for (const entity of rule.entityApplicability) countKey(entityCounts, entity)
    for (const sourceId of rule.sourceIds) sourceIds.add(sourceId)
    const task = taskBySelection.get(`${rule.id}:${rule.version}`)
    if (task) countKey(reviewReasonCounts, task.reason)
  }

  const clients = await scoped.clients.listByFirm({ limit: 500 })
  let estimatedObligationCount = 0
  for (const client of clients) {
    for (const rule of ready) {
      const jurisdictionMatches = rule.jurisdiction === 'FED' || rule.jurisdiction === client.state
      if (!jurisdictionMatches) continue
      if (!ruleMatchesEntity(rule, client.entityType)) continue
      const generationState = rule.jurisdiction === 'FED' ? client.state : rule.jurisdiction
      if (!isRuleGenerationState(generationState)) continue
      const previews = previewObligationsFromRules({
        client: {
          id: client.id,
          entityType: client.entityType,
          state: generationState,
          taxTypes: [rule.taxType],
          taxYearType: client.taxYearType,
          fiscalYearEndMonth: client.fiscalYearEndMonth,
          fiscalYearEndDay: client.fiscalYearEndDay,
          ...(client.taxClassification ? { taxClassification: client.taxClassification } : {}),
        },
        rules: [rule],
      })
      estimatedObligationCount += previews.filter(
        (preview) =>
          preview.dueDate && isOnOrAfterDateOnly(preview.dueDate, tenant.monitoringStartDate),
      ).length
    }
  }

  return {
    selectedCount: selections.length,
    acceptReadyCount: ready.length,
    skipped,
    jurisdictionCounts: distribution(jurisdictionCounts),
    entityCounts: distribution(entityCounts),
    formCounts: distribution(formCounts),
    reviewReasonCounts: distribution(reviewReasonCounts),
    sourceCount: sourceIds.size,
    estimatedObligationCount,
  }
}

export async function acceptTemplateRule(input: {
  context: RpcContext
  rule: CoreObligationRule
  reviewNote: string
  reviewedBy: string
  reviewedByName?: string
  reviewedAt: Date
  editedRule?: ObligationRule
  catalogSeeded?: boolean
  generateObligations?: boolean
  // When the accepted rule was drafted by AI (the verify-candidate flow), the
  // human pressed accept but the value came from the model → ai_assisted.
  aiAssisted?: boolean
}): Promise<RuleReviewTask> {
  const { scoped, tenant } = requireTenant(input.context)
  if (!input.editedRule && isSourceDefinedRule(input.rule)) throw sourceDefinedAcceptError()
  if (!input.catalogSeeded) await ensureGlobalTemplateCatalog(input.context)
  const contractRule =
    input.editedRule ??
    toPracticeContractRule(input.rule, 'active', {
      verifiedBy: input.reviewedByName ?? input.reviewedBy,
      verifiedAt: toDateOnly(input.reviewedAt),
      ...(input.reviewedByName ? { reviewedByName: input.reviewedByName } : {}),
      reviewedAt: input.reviewedAt.toISOString(),
    })
  const activeRule: ObligationRule = {
    ...contractRule,
    status: 'active',
    verifiedBy: input.reviewedByName ?? input.reviewedBy,
    verifiedAt: toDateOnly(input.reviewedAt),
    ...(input.reviewedByName ? { reviewedByName: input.reviewedByName } : {}),
    reviewedAt: input.reviewedAt.toISOString(),
  }
  await scoped.rules.upsertPracticeRule({
    ruleId: input.rule.id,
    templateId: input.rule.id,
    templateVersion: activeRule.version,
    status: 'active',
    ruleJson: activeRule,
    reviewNote: input.reviewNote,
    reviewedBy: input.reviewedBy,
    reviewedAt: input.reviewedAt,
  })
  await scoped.audit.write({
    actorId: input.reviewedBy,
    ...(input.aiAssisted
      ? { actorType: 'ai_assisted' as const, previousActorType: 'ai' as const }
      : {}),
    entityType: 'rule',
    entityId: input.rule.id,
    action: 'rules.accepted',
    before: {
      status: 'pending_review',
      version: input.rule.version,
      rule: ruleBodyForAudit(input.rule),
    },
    after: { status: 'active', version: activeRule.version, rule: ruleBodyForAudit(activeRule) },
    reason: input.reviewNote,
  })
  const task = await acceptedTaskForRule({
    context: input.context,
    rule: activeRule,
    status: 'accepted',
    reviewNote: input.reviewNote,
    reviewedBy: input.reviewedBy,
    reviewedAt: input.reviewedAt,
  })
  if (input.generateObligations ?? true) {
    await generateObligationsForAcceptedRules({
      scoped,
      userId: input.reviewedBy,
      rules: [toCoreRule(activeRule)],
      internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
      monitoringStartDate: tenant.monitoringStartDate,
      now: input.reviewedAt,
      reason: input.reviewNote,
    })
  }
  return task
}

export async function rejectTemplateRule(input: {
  context: RpcContext
  rule: CoreObligationRule
  reason: string
  reviewedBy: string
  reviewedByName?: string
  reviewedAt: Date
}): Promise<RuleReviewTask> {
  const { scoped } = requireTenant(input.context)
  await ensureGlobalTemplateCatalog(input.context)
  await scoped.rules.upsertPracticeRule({
    ruleId: input.rule.id,
    templateId: input.rule.id,
    templateVersion: input.rule.version,
    status: 'rejected',
    ruleJson: null,
    reviewNote: input.reason,
    reviewedBy: input.reviewedBy,
    reviewedAt: input.reviewedAt,
  })
  const task = await acceptedTaskForRule({
    context: input.context,
    rule: toPracticeContractRule(input.rule, 'rejected', {
      verifiedBy: input.reviewedByName ?? input.reviewedBy,
      verifiedAt: toDateOnly(input.reviewedAt),
      ...(input.reviewedByName ? { reviewedByName: input.reviewedByName } : {}),
      reviewedAt: input.reviewedAt.toISOString(),
    }),
    status: 'rejected',
    reviewNote: input.reason,
    reviewedBy: input.reviewedBy,
    ...(input.reviewedByName ? { reviewedByName: input.reviewedByName } : {}),
    reviewedAt: input.reviewedAt,
  })
  await scoped.audit.write({
    actorId: input.reviewedBy,
    entityType: 'rule',
    entityId: input.rule.id,
    action: 'rules.rejected',
    before: { status: 'pending_review', version: input.rule.version },
    after: { status: 'rejected' },
    reason: input.reason,
  })
  return task
}

const listSources = os.rules.listSources.handler(async ({ input }) => {
  return listRuleSources(input?.jurisdiction).map(toSource)
})

const listRules = os.rules.listRules.handler(async ({ input, context }) => {
  return listPracticeRules({
    context,
    ...(input?.jurisdiction !== undefined ? { jurisdiction: input.jurisdiction } : {}),
    ...(input?.status !== undefined ? { status: input.status } : {}),
    ...(input?.includeCandidates !== undefined
      ? { includeCandidates: input.includeCandidates }
      : {}),
  })
})

const listReviewTasks = os.rules.listReviewTasks.handler(async ({ input, context }) => {
  await ensureTemplateReviewTasks(context)
  const { scoped } = requireTenant(context)
  const templateById = new Map(templateRules().map((rule) => [rule.id, rule]))
  const rows = await scoped.rules.listReviewTasks(input?.status ? { status: input.status } : {})
  return rows.flatMap((row) => {
    const template = templateById.get(row.ruleId)
    if (!template) return []
    if (
      row.status === 'open' &&
      row.reason === 'new_template' &&
      isDefaultActiveTemplateRule(template)
    ) {
      return []
    }
    if (input?.jurisdiction && template.jurisdiction !== input.jurisdiction) return []
    const status: ObligationRule['status'] =
      row.status === 'accepted'
        ? 'active'
        : row.status === 'rejected'
          ? 'rejected'
          : 'pending_review'
    return [taskToContract(row, toPracticeContractRule(template, status))]
  })
})

const listReviewDecisions = os.rules.listReviewDecisions.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  const rows = await scoped.rules.listDecisions(input?.status)
  return rows.map(toReviewDecision)
})

const listTemporaryRules = os.rules.listTemporaryRules.handler(async ({ context }) => {
  const { scoped } = requireTenant(context)
  return (await scoped.rules.listTemporaryRules()).map(toTemporaryRule)
})

const acceptTemplate = os.rules.acceptTemplate.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)
  const reviewerName = await currentReviewerName(context, userId)
  const rule = templateRuleById(input.ruleId)
  if (!rule) throw new ORPCError('NOT_FOUND', { message: 'Rule template was not found.' })
  if (rule.version !== input.expectedVersion) {
    throw new ORPCError('CONFLICT', { message: 'Rule template version has changed.' })
  }
  const accepted = await acceptTemplateRule({
    context,
    rule,
    reviewNote: input.reviewNote,
    reviewedBy: userId,
    reviewedByName: reviewerName,
    reviewedAt: new Date(),
  })
  // Accepting a single rule (the alert's rule modal flow) is the "I reviewed the
  // changed source" action — clear its drift so the adoption gate reopens.
  await scoped.rules.clearRuleSourceDrift({ ruleId: rule.id, clearedBy: userId })
  return accepted
})

const bulkAcceptTemplates = os.rules.bulkAcceptTemplates.handler(async ({ input, context }) => {
  const { scoped, tenant, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)
  const reviewerName = await currentReviewerName(context, userId)
  const templateById = new Map(templateRules().map((rule) => [rule.id, rule]))
  const practiceById = new Map(
    (await scoped.rules.listPracticeRules()).map((rule) => [rule.ruleId, rule]),
  )
  const taskBySelection = new Map(
    (await scoped.rules.listReviewTasks({ status: 'open' })).map((task) => [
      `${task.ruleId}:${task.templateVersion}`,
      task,
    ]),
  )
  const driftRuleIds = new Set(
    await scoped.rules.listUnclearedDriftRuleIds(input.rules.map((selection) => selection.ruleId)),
  )
  const acceptInputs: CoreObligationRule[] = []
  const skipped: RuleBulkAcceptSkip[] = []
  const reviewedAt = new Date()

  for (const selection of input.rules.slice(0, MAX_BULK_ACCEPT)) {
    const rule = templateById.get(selection.ruleId)
    if (!rule) {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: 'template_not_found',
      })
      continue
    }
    if (rule.version !== selection.expectedVersion) {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: 'version_conflict',
      })
      continue
    }
    if (isSourceDefinedRule(rule)) {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: 'source_defined_requires_ai_review',
      })
      continue
    }
    const task = taskBySelection.get(`${selection.ruleId}:${selection.expectedVersion}`)
    if (task?.reason === 'source_changed') {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: 'source_changed_requires_review',
      })
      continue
    }
    if (driftRuleIds.has(selection.ruleId)) {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: 'source_drifted_requires_review',
      })
      continue
    }
    const existing = practiceById.get(selection.ruleId)
    if (existing?.status === 'active') {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: 'already_active',
      })
      continue
    }
    if (existing?.status === 'rejected' || existing?.status === 'archived') {
      skipped.push({
        ruleId: selection.ruleId,
        expectedVersion: selection.expectedVersion,
        reason: existing.status,
      })
      continue
    }
    acceptInputs.push(rule)
  }

  if (acceptInputs.length > 0) await ensureGlobalTemplateCatalog(context)

  const accepted = await Promise.all(
    acceptInputs.map((rule) =>
      acceptTemplateRule({
        context,
        rule,
        reviewNote: input.reviewNote,
        reviewedBy: userId,
        reviewedByName: reviewerName,
        reviewedAt,
        catalogSeeded: true,
        generateObligations: false,
      }),
    ),
  )

  const generation = await generateObligationsForAcceptedRules({
    scoped,
    userId,
    rules: acceptInputs,
    internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
    monitoringStartDate: tenant.monitoringStartDate,
    now: reviewedAt,
    reason: input.reviewNote,
  })

  await scoped.audit.write({
    actorId: userId,
    entityType: 'rule_batch',
    entityId: accepted[0]?.id ?? 'empty',
    action: 'rules.bulk_accepted',
    after: {
      acceptedCount: accepted.length,
      skippedCount: skipped.length,
      ruleIds: accepted.map((task) => task.ruleId),
      generatedObligationCount: generation.createdCount,
    },
    reason: input.reviewNote,
  })

  return { accepted, skipped }
})

const activateOnboardingJurisdictions = os.rules.activateOnboardingJurisdictions.handler(
  async ({ input, context }) => {
    const { scoped, tenant, userId } = requireTenant(context)
    await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)
    return activateOnboardingJurisdictionRules({
      scoped,
      userId,
      internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
      monitoringStartDate: tenant.monitoringStartDate,
      states: input.states,
      ensureCatalog: () => ensureGlobalTemplateCatalog(context),
    })
  },
)

const rejectTemplate = os.rules.rejectTemplate.handler(async ({ input, context }) => {
  const { userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)
  const reviewerName = await currentReviewerName(context, userId)
  const rule = templateRuleById(input.ruleId)
  if (!rule) throw new ORPCError('NOT_FOUND', { message: 'Rule template was not found.' })
  if (rule.version !== input.expectedVersion) {
    throw new ORPCError('CONFLICT', { message: 'Rule template version has changed.' })
  }
  const reviewedAt = new Date()
  return rejectTemplateRule({
    context,
    rule,
    reason: input.reason,
    reviewedBy: userId,
    reviewedByName: reviewerName,
    reviewedAt,
  })
})

// Strip volatile review metadata so a rule audit diff surfaces the parts a
// reviewer cares about — due-date logic, extension/payment rules, evidence
// requirements, jurisdiction, effective date — instead of only {status,
// version} (which never told you WHAT changed in the rule). See gap P0-4.
function ruleBodyForAudit(ruleJson: unknown): Record<string, unknown> | null {
  if (!ruleJson || typeof ruleJson !== 'object') return null
  const {
    status: _status,
    verifiedBy: _verifiedBy,
    verifiedAt: _verifiedAt,
    reviewedByName: _reviewedByName,
    reviewedAt: _reviewedAt,
    ...body
  } = ruleJson as Record<string, unknown>
  return body
}

const createCustomRule = os.rules.createCustomRule.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)
  const reviewedAt = new Date()
  const reviewerName = await currentReviewerName(context, userId)
  const rule = {
    ...input.rule,
    status: 'active' as const,
    verifiedBy: reviewerName,
    verifiedAt: toDateOnly(reviewedAt),
    reviewedByName: reviewerName,
    reviewedAt: reviewedAt.toISOString(),
  }
  await scoped.rules.upsertPracticeRule({
    ruleId: rule.id,
    templateId: null,
    templateVersion: rule.version,
    status: 'active',
    ruleJson: rule,
    reviewNote: input.reviewNote,
    reviewedBy: userId,
    reviewedAt,
  })
  await scoped.audit.write({
    actorId: userId,
    entityType: 'rule',
    entityId: rule.id,
    action: 'rules.created',
    after: { status: 'active', version: rule.version, custom: true, rule: ruleBodyForAudit(rule) },
    reason: input.reviewNote,
  })
  return acceptedTaskForRule({
    context,
    rule,
    status: 'accepted',
    reviewNote: input.reviewNote,
    reviewedBy: userId,
    reviewedByName: reviewerName,
    reviewedAt,
  })
})

const updatePracticeRule = os.rules.updatePracticeRule.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)
  const reviewedAt = new Date()
  const reviewerName = await currentReviewerName(context, userId)
  const existing = await scoped.rules.getPracticeRule(input.rule.id)
  if (!existing) throw new ORPCError('NOT_FOUND', { message: 'Practice rule was not found.' })
  const rule = {
    ...input.rule,
    status: 'active' as const,
    verifiedBy: reviewerName,
    verifiedAt: toDateOnly(reviewedAt),
    reviewedByName: reviewerName,
    reviewedAt: reviewedAt.toISOString(),
  }
  await scoped.rules.upsertPracticeRule({
    ruleId: rule.id,
    templateId: existing.templateId,
    templateVersion: rule.version,
    status: 'active',
    ruleJson: rule,
    reviewNote: input.reviewNote,
    reviewedBy: userId,
    reviewedAt,
  })
  await scoped.audit.write({
    actorId: userId,
    entityType: 'rule',
    entityId: rule.id,
    action: 'rules.updated',
    before: {
      status: existing.status,
      version: existing.templateVersion,
      rule: ruleBodyForAudit(existing.ruleJson),
    },
    after: { status: 'active', version: rule.version, rule: ruleBodyForAudit(rule) },
    reason: input.reviewNote,
  })
  return acceptedTaskForRule({
    context,
    rule,
    status: 'accepted',
    reviewNote: input.reviewNote,
    reviewedBy: userId,
    reviewedByName: reviewerName,
    reviewedAt,
  })
})

const archivePracticeRule = os.rules.archivePracticeRule.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)
  const existing = await scoped.rules.getPracticeRule(input.ruleId)
  if (!existing) throw new ORPCError('NOT_FOUND', { message: 'Practice rule was not found.' })
  const reviewedAt = new Date()
  const reviewerName = await currentReviewerName(context, userId)
  await scoped.rules.upsertPracticeRule({
    ruleId: existing.ruleId,
    templateId: existing.templateId,
    templateVersion: existing.templateVersion,
    status: 'archived',
    ruleJson: existing.ruleJson,
    reviewNote: input.reason,
    reviewedBy: userId,
    reviewedAt,
  })
  const parsed = existing.ruleJson ? ObligationRuleSchema.safeParse(existing.ruleJson) : null
  const template = templateRuleById(existing.ruleId)
  if (!parsed?.success && !template) {
    throw new ORPCError('BAD_REQUEST', { message: 'Archived rule JSON is invalid.' })
  }
  const rule = parsed?.success
    ? {
        ...parsed.data,
        status: 'archived' as const,
        verifiedBy: reviewerName,
        verifiedAt: toDateOnly(reviewedAt),
        reviewedByName: reviewerName,
        reviewedAt: reviewedAt.toISOString(),
      }
    : toPracticeContractRule(template!, 'archived', {
        verifiedBy: reviewerName,
        verifiedAt: toDateOnly(reviewedAt),
        reviewedByName: reviewerName,
        reviewedAt: reviewedAt.toISOString(),
      })
  await scoped.audit.write({
    actorId: userId,
    entityType: 'rule',
    entityId: existing.ruleId,
    action: 'rules.archived',
    before: { status: existing.status, version: existing.templateVersion },
    after: { status: 'archived' },
    reason: input.reason,
  })
  return acceptedTaskForRule({
    context,
    rule,
    status: 'superseded',
    reviewNote: input.reason,
    reviewedBy: userId,
    reviewedByName: reviewerName,
    reviewedAt,
  })
})

const previewRuleImpact = os.rules.previewRuleImpact.handler(async ({ input, context }) => {
  return previewBulkImpactForSelections(context, [input])
})

const previewBulkRuleImpact = os.rules.previewBulkRuleImpact.handler(async ({ input, context }) => {
  return previewBulkImpactForSelections(context, input.rules)
})

async function findConcreteDraftRuns(input: {
  scoped: ScopedRepo
  inputContextRefs: readonly string[]
}): Promise<{ preferredRuns: AiOutputRow[]; allRuns: AiOutputRow[] }> {
  const request = {
    kind: 'rule_concrete_draft' as const,
    inputContextRefs: input.inputContextRefs,
    promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
  }
  const [globalRuns, firmRuns] = await Promise.all([
    input.scoped.ai.findSuccessfulGlobalRunsByContextRefs(request),
    input.scoped.ai.findSuccessfulRunsByContextRefs(request),
  ])
  const realGlobalRuns = globalRuns.filter(
    (run) => run.model !== RETIRED_DETERMINISTIC_CONCRETE_DRAFT_MODEL,
  )
  const realFirmRuns = firmRuns.filter(
    (run) => run.model !== RETIRED_DETERMINISTIC_CONCRETE_DRAFT_MODEL,
  )
  const preferredByContext = new Map<string, AiOutputRow>()
  for (const run of realGlobalRuns) {
    if (run.inputContextRef && !preferredByContext.has(run.inputContextRef)) {
      preferredByContext.set(run.inputContextRef, run)
    }
  }
  for (const run of realFirmRuns) {
    if (run.inputContextRef && !preferredByContext.has(run.inputContextRef)) {
      preferredByContext.set(run.inputContextRef, run)
    }
  }
  return {
    preferredRuns: Array.from(preferredByContext.values()),
    allRuns: [...realGlobalRuns, ...realFirmRuns],
  }
}

const listConcreteDrafts = os.rules.listConcreteDrafts.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)

  const lookup = new Map<string, { ruleId: string; sourceId: string }>()
  for (const ruleInput of input.rules) {
    const base = templateRuleById(ruleInput.ruleId)
    if (!base || !isSourceDefinedRule(base)) continue
    if (!canReadConcreteDraftForSource({ rule: base, sourceId: ruleInput.sourceId })) continue
    const contextRef = cachedConcreteDraftKey({
      ruleId: ruleInput.ruleId,
      ruleVersion: base.version,
      sourceId: ruleInput.sourceId,
    })
    lookup.set(contextRef, {
      ruleId: ruleInput.ruleId,
      sourceId: ruleInput.sourceId,
    })
  }
  if (lookup.size === 0) return []

  const { preferredRuns } = await findConcreteDraftRuns({
    scoped,
    inputContextRefs: Array.from(lookup.keys()),
  })

  return preferredRuns.flatMap((run) => {
    const contextRef = run.inputContextRef ?? ''
    const target = lookup.get(contextRef)
    const draft = parseCachedConcreteDraft(run.outputText)
    if (!target || !draft) return []
    return [
      {
        ...target,
        draft: RuleConcreteDraftSchema.parse({
          aiOutputId: run.id,
          ...draft,
        }),
      },
    ]
  })
})

function canReadConcreteDraftForSource(input: {
  rule: CoreObligationRule
  sourceId: string
}): boolean {
  const source = listRuleSources().find((item) => item.id === input.sourceId)
  if (!source) return false
  if (source.jurisdiction !== input.rule.jurisdiction && source.jurisdiction !== 'FED') {
    return false
  }
  return input.rule.sourceIds.includes(source.id) || sourceCoversRuleDomain(source, input.rule)
}

function skipConcreteDraftSelection(
  selection: { ruleId: string; sourceId: string },
  reason: RuleBulkVerifyCandidateSkip['reason'],
) {
  return {
    skipped: {
      ruleId: selection.ruleId,
      sourceId: selection.sourceId,
      reason,
    },
  }
}

function missingAcceptedConcreteDraftError(): never {
  throw new ORPCError('BAD_REQUEST', {
    message: 'AI concrete draft is not ready. Regenerate or wait for backfill.',
  })
}

function staleConcreteDraftError(): never {
  throw new ORPCError('BAD_REQUEST', {
    message:
      'The official source has changed since this AI draft was generated. Regenerate the draft, then verify the fresh version.',
  })
}

function toConcreteDraftRule(input: {
  base: CoreObligationRule
  source: ReturnType<typeof listRuleSources>[number]
  reviewedBy: string
  reviewedByName?: string
  reviewedAt: Date
  draft: RuleConcreteDraftPayload
  aiOutputId?: string
  sourceUpdatedOn?: string
  ruleTier?: ObligationRule['ruleTier']
  nextReviewOn?: string
}): ObligationRule {
  const activeRule = toPracticeContractRule(input.base, 'active', {
    verifiedBy: input.reviewedByName ?? input.reviewedBy,
    verifiedAt: toDateOnly(input.reviewedAt),
    ...(input.reviewedByName ? { reviewedByName: input.reviewedByName } : {}),
    reviewedAt: input.reviewedAt.toISOString(),
    version: input.base.version + 1,
  })
  return {
    ...activeRule,
    ruleTier: input.ruleTier ?? input.base.ruleTier,
    coverageStatus: input.draft.coverageStatus,
    requiresApplicabilityReview: input.draft.requiresApplicabilityReview,
    dueDateLogic: input.draft.dueDateLogic,
    extensionPolicy: input.draft.extensionPolicy,
    sourceIds: Array.from(new Set([input.source.id, ...input.base.sourceIds])),
    evidence: [
      {
        sourceId: input.source.id,
        ...(input.aiOutputId ? { aiOutputId: input.aiOutputId } : {}),
        authorityRole: 'basis',
        locator: {
          kind:
            input.source.sourceType === 'form' || input.source.acquisitionMethod === 'pdf_watch'
              ? 'pdf'
              : 'html',
          heading: input.draft.sourceHeading,
        },
        summary: `Practice accepted ${input.base.title} against ${input.source.title}.`,
        sourceExcerpt: input.draft.sourceExcerpt,
        retrievedAt: toDateOnly(input.reviewedAt),
        ...(input.sourceUpdatedOn ? { sourceUpdatedOn: input.sourceUpdatedOn } : {}),
      },
    ],
    quality: input.draft.quality,
    nextReviewOn: input.nextReviewOn ?? input.base.nextReviewOn,
  }
}

export async function loadAcceptedConcreteDraft(input: {
  scoped: ScopedRepo
  contextRef: string
  aiOutputId: string
}): Promise<{ cachedRun: AiOutputRow; draft: RuleConcreteDraftPayload }> {
  const { allRuns } = await findConcreteDraftRuns({
    scoped: input.scoped,
    inputContextRefs: [input.contextRef],
  })
  const cachedRun = allRuns.find(
    (run) => run.id === input.aiOutputId && run.inputContextRef === input.contextRef,
  )
  if (!cachedRun || cachedRun.guardResult !== 'ok') return missingAcceptedConcreteDraftError()

  const draft = parseCachedConcreteDraft(cachedRun.outputText)
  if (!draft) return missingAcceptedConcreteDraftError()
  return { cachedRun, draft }
}

async function loadLatestSourceSnapshot(input: { context: RpcContext; sourceId: string }) {
  const { scoped } = requireTenant(input.context)
  return scoped.pulse.getLatestSourceSnapshotBySourceId(input.sourceId)
}

function toBadRequest(error: unknown) {
  return new ORPCError('BAD_REQUEST', {
    message: error instanceof Error ? error.message : 'AI concrete draft was unavailable.',
  })
}

function requireRuleConcreteDraftRepo(scoped: ScopedRepo) {
  if (!scoped.ruleConcreteDrafts) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Rule concrete draft cache repo is not configured.',
    })
  }
  return scoped.ruleConcreteDrafts
}

const draftConcreteRule = os.rules.draftConcreteRule.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)

  const base = templateRuleById(input.ruleId)
  if (!base) throw new ORPCError('NOT_FOUND', { message: 'Rule template was not found.' })
  const { source } = await loadCandidateSourceContext({
    context,
    base,
    sourceId: input.sourceId,
  })
  const latestSourceSnapshot = await loadLatestSourceSnapshot({ context, sourceId: source.id })
  try {
    return await generateConcreteDraft({
      env: context.env,
      aiRepo: scoped.ai,
      concreteDraftRepo: requireRuleConcreteDraftRepo(scoped),
      scope: 'global',
      userId: null,
      base,
      source,
      latestSourceSnapshot,
    })
  } catch (error) {
    throw toBadRequest(error)
  }
})

const verifyCandidate = os.rules.verifyCandidate.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)

  const base = templateRuleById(input.ruleId)
  if (!base) throw new ORPCError('NOT_FOUND', { message: 'Rule template was not found.' })

  const { source } = await loadCandidateSourceContext({
    context,
    base,
    sourceId: input.sourceId,
  })
  const contextRef = cachedConcreteDraftKey({
    ruleId: base.id,
    ruleVersion: base.version,
    sourceId: source.id,
  })
  const { draft, cachedRun } = await loadAcceptedConcreteDraft({
    scoped,
    contextRef,
    aiOutputId: input.aiOutputId,
  })

  // Gap #4: refuse a draft built against an outdated source snapshot — its dueDateLogic may no
  // longer reflect the live source. The reviewer must regenerate before verifying.
  const latestSourceSnapshot = await loadLatestSourceSnapshot({ context, sourceId: source.id })
  if (
    concreteDraftSourceIsStale({
      citations: cachedRun.citations,
      latestSnapshotId: latestSourceSnapshot?.id ?? null,
    })
  ) {
    staleConcreteDraftError()
  }

  const reviewedAt = new Date()
  const reviewerName = await currentReviewerName(context, userId)
  const editedRule = toConcreteDraftRule({
    base,
    source,
    reviewedBy: userId,
    reviewedByName: reviewerName,
    reviewedAt,
    draft,
    aiOutputId: cachedRun.id,
  })

  const task = await acceptTemplateRule({
    context,
    rule: base,
    reviewNote: input.reviewNote ?? 'Accepted from rule review.',
    reviewedBy: userId,
    reviewedByName: reviewerName,
    reviewedAt,
    editedRule,
    aiAssisted: true,
  })
  const row = await scoped.rules.upsertDecision({
    ruleId: base.id,
    baseVersion: base.version,
    status: 'verified',
    ruleJson: editedRule,
    reviewNote: input.reviewNote ?? null,
    reviewedBy: userId,
    reviewedAt,
  })
  // Verifying a candidate from the alert's rule modal is the review action —
  // clear its source drift so the adoption gate reopens for every firm.
  await scoped.rules.clearRuleSourceDrift({ ruleId: base.id, clearedBy: userId })
  void task
  return toReviewDecision(row)
})

const bulkVerifyCandidates = os.rules.bulkVerifyCandidates.handler(async ({ input, context }) => {
  const { scoped, tenant, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)

  const templateById = new Map(templateRules().map((rule) => [rule.id, rule]))
  const practiceById = new Map(
    (await scoped.rules.listPracticeRules()).map((rule) => [rule.ruleId, rule]),
  )
  const taskBySelection = new Map(
    (await scoped.rules.listReviewTasks({ status: 'open' })).map((task) => [
      `${task.ruleId}:${task.templateVersion}`,
      task,
    ]),
  )
  const requestedContextRefs = input.rules.flatMap((selection) => {
    const base = templateById.get(selection.ruleId)
    if (!base || !isSourceDefinedRule(base)) return []
    return cachedConcreteDraftKey({
      ruleId: selection.ruleId,
      ruleVersion: base.version,
      sourceId: selection.sourceId,
    })
  })
  const { allRuns } = await findConcreteDraftRuns({
    scoped,
    inputContextRefs: requestedContextRefs,
  })
  const cachedRunByContextAndId = new Map(
    allRuns.map((run) => [`${run.inputContextRef ?? ''}:${run.id}`, run]),
  )
  // Gap #4: latest snapshot id per source, to reject drafts built against stale source content.
  const latestSnapshotIdBySource = new Map<string, string | null>()
  await Promise.all(
    [...new Set(input.rules.map((selection) => selection.sourceId))].map(async (sourceId) => {
      const snapshot = await scoped.pulse.getLatestSourceSnapshotBySourceId(sourceId)
      latestSnapshotIdBySource.set(sourceId, snapshot?.id ?? null)
    }),
  )
  const reviewedAt = new Date()
  const reviewerName = await currentReviewerName(context, userId)
  const driftRuleIds = new Set(
    await scoped.rules.listUnclearedDriftRuleIds(input.rules.map((selection) => selection.ruleId)),
  )
  const verified: RuleReviewDecision[] = []
  const skipped: RuleBulkVerifyCandidateSkip[] = []
  const acceptedRules: CoreObligationRule[] = []

  if (input.rules.length > 0) await ensureGlobalTemplateCatalog(context)

  const results = await Promise.all(
    input.rules.slice(0, MAX_BULK_ACCEPT).map(async (selection) => {
      const base = templateById.get(selection.ruleId)
      if (!base) return skipConcreteDraftSelection(selection, 'rule_not_found')
      if (!isSourceDefinedRule(base)) {
        return skipConcreteDraftSelection(selection, 'not_source_defined')
      }

      const existing = practiceById.get(selection.ruleId)
      if (existing?.status === 'active') {
        return skipConcreteDraftSelection(selection, 'already_active')
      }
      if (existing?.status === 'rejected' || existing?.status === 'archived') {
        return skipConcreteDraftSelection(selection, existing.status)
      }

      const task = taskBySelection.get(`${selection.ruleId}:${base.version}`)
      if (!task) return skipConcreteDraftSelection(selection, 'no_open_task')
      if (task.reason === 'source_changed') {
        return skipConcreteDraftSelection(selection, 'source_changed_requires_review')
      }
      if (driftRuleIds.has(selection.ruleId)) {
        return skipConcreteDraftSelection(selection, 'source_drifted_requires_review')
      }

      const contextRef = cachedConcreteDraftKey({
        ruleId: selection.ruleId,
        ruleVersion: base.version,
        sourceId: selection.sourceId,
      })
      const cachedRun = cachedRunByContextAndId.get(`${contextRef}:${selection.aiOutputId}`)
      const draft = parseCachedConcreteDraft(cachedRun?.outputText ?? null)
      if (!cachedRun || cachedRun.guardResult !== 'ok' || !draft) {
        return skipConcreteDraftSelection(selection, 'draft_not_found')
      }
      if (cachedRun.id !== selection.aiOutputId) {
        return skipConcreteDraftSelection(selection, 'draft_mismatch')
      }

      // Gap #2/#3 trust gate: a low-confidence draft, or one whose cited excerpt is not a verbatim
      // match in its source, is not eligible for one-click bulk verify. Route it to single human
      // review instead — never auto-stamp it. (Single verify stays open as the review escape valve.)
      if (
        concreteDraftBulkTrustIssue({
          confidence: draft.confidence,
          sourceExcerpt: draft.sourceExcerpt,
          citations: cachedRun.citations,
        })
      ) {
        return skipConcreteDraftSelection(selection, 'low_trust_requires_review')
      }

      // Gap #4: reject a draft built against an outdated source snapshot — regenerate first.
      if (
        concreteDraftSourceIsStale({
          citations: cachedRun.citations,
          latestSnapshotId: latestSnapshotIdBySource.get(selection.sourceId) ?? null,
        })
      ) {
        return skipConcreteDraftSelection(selection, 'draft_stale_source')
      }

      let sourceContext: Awaited<ReturnType<typeof loadCandidateSourceContext>>
      try {
        sourceContext = await loadCandidateSourceContext({
          context,
          base,
          sourceId: selection.sourceId,
        })
      } catch {
        return skipConcreteDraftSelection(selection, 'validation_failed')
      }

      const editedRule = toConcreteDraftRule({
        base,
        source: sourceContext.source,
        reviewedBy: userId,
        reviewedByName: reviewerName,
        reviewedAt,
        draft,
        aiOutputId: cachedRun.id,
      })
      await acceptTemplateRule({
        context,
        rule: base,
        reviewNote: input.reviewNote,
        reviewedBy: userId,
        reviewedByName: reviewerName,
        reviewedAt,
        editedRule,
        catalogSeeded: true,
        generateObligations: false,
        aiAssisted: true,
      })
      const row = await scoped.rules.upsertDecision({
        ruleId: base.id,
        baseVersion: base.version,
        status: 'verified',
        ruleJson: editedRule,
        reviewNote: input.reviewNote,
        reviewedBy: userId,
        reviewedAt,
      })
      return {
        verified: toReviewDecision(row),
        acceptedRule: toCoreRule(editedRule),
      }
    }),
  )

  for (const result of results) {
    if ('skipped' in result) {
      skipped.push(result.skipped)
      continue
    }
    verified.push(result.verified)
    acceptedRules.push(result.acceptedRule)
  }

  const generation =
    acceptedRules.length > 0
      ? await generateObligationsForAcceptedRules({
          scoped,
          userId,
          rules: acceptedRules,
          internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
          monitoringStartDate: tenant.monitoringStartDate,
          now: reviewedAt,
          reason: input.reviewNote,
        })
      : { createdCount: 0 }

  await scoped.audit.write({
    actorId: userId,
    entityType: 'rule_batch',
    entityId: verified[0]?.id ?? 'empty',
    action: 'rules.bulk_accepted',
    after: {
      verifiedCount: verified.length,
      skippedCount: skipped.length,
      ruleIds: verified.map((decision) => decision.ruleId),
      generatedObligationCount: generation.createdCount,
    },
    reason: input.reviewNote,
  })

  return { verified, skipped }
})

const rejectCandidate = os.rules.rejectCandidate.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)

  const base = templateRuleById(input.ruleId)
  if (!base) throw new ORPCError('NOT_FOUND', { message: 'Rule template was not found.' })
  const reviewedAt = new Date()
  const reviewerName = await currentReviewerName(context, userId)

  await rejectTemplateRule({
    context,
    rule: base,
    reason: input.reason,
    reviewedBy: userId,
    reviewedByName: reviewerName,
    reviewedAt,
  })
  const row = await scoped.rules.upsertDecision({
    ruleId: base.id,
    baseVersion: base.version,
    status: 'rejected',
    ruleJson: null,
    reviewNote: input.reason,
    reviewedBy: userId,
    reviewedAt,
  })
  return toReviewDecision(row)
})

const coverage = os.rules.coverage.handler(async ({ context }) => {
  const rows = await listPracticeRules({ context, includeCandidates: true })
  const sourceCellsByJurisdiction = listRequiredSourceCoverage().reduce((map, cell) => {
    const list = map.get(cell.jurisdiction) ?? []
    list.push(cell)
    map.set(cell.jurisdiction, list)
    return map
  }, new Map<RuleJurisdiction, RequiredSourceCoverageCell[]>())
  const sourceCoverage = listRuleSources().reduce<RuleCoverageRowAccumulator>((acc, source) => {
    const current = acc.get(source.jurisdiction) ?? {
      jurisdiction: source.jurisdiction,
      sourceCount: 0,
      highPrioritySourceCount: 0,
      entityCoverage: emptyEntityCoverage(),
      entitySourceCoverage: emptyEntitySourceCoverage(),
    }
    current.sourceCount += 1
    if (source.priority === 'critical' || source.priority === 'high') {
      current.highPrioritySourceCount += 1
    }
    acc.set(source.jurisdiction, current)
    return acc
  }, new Map())

  return Array.from(sourceCoverage.values()).map((row) => {
    const jurisdictionRules = rows.filter((rule) => rule.jurisdiction === row.jurisdiction)
    const activeRuleCount = jurisdictionRules.filter((rule) => rule.status === 'active').length
    const pendingReviewCount = jurisdictionRules.filter(
      (rule) => rule.status === 'pending_review',
    ).length
    const rejectedRuleCount = jurisdictionRules.filter((rule) => rule.status === 'rejected').length
    const archivedRuleCount = jurisdictionRules.filter((rule) => rule.status === 'archived').length
    const entityCoverage = emptyEntityCoverage()
    const entitySourceCoverage = emptyEntitySourceCoverage()
    const sourceCells = sourceCellsByJurisdiction.get(row.jurisdiction) ?? []
    const requiredSourceCount = sourceCells.filter(
      (cell) => cell.status !== 'not_applicable',
    ).length
    const missingSourceCells = sourceCells.filter((cell) => cell.status === 'missing_source')
    const missingSourceCount = missingSourceCells.length
    const missingSourceDomains = Array.from(new Set(missingSourceCells.map((cell) => cell.domain)))

    for (const cell of sourceCells) {
      entitySourceCoverage[cell.entity] = mergeSourceCoverageState(
        entitySourceCoverage[cell.entity],
        cell.status,
      )
    }

    for (const rule of jurisdictionRules) {
      const state = coverageStateForRule(rule)
      const sourceState = sourceCoverageStateForRule(rule)
      for (const entity of COVERAGE_ENTITY_COLUMNS) {
        if (!ruleCoversCoverageEntity(rule, entity)) continue
        if (state) {
          entityCoverage[entity] = mergeCoverageState(entityCoverage[entity], state)
        }
        if (sourceState) {
          entitySourceCoverage[entity] = mergeSourceCoverageState(
            entitySourceCoverage[entity],
            sourceState,
          )
        }
      }
    }
    const applicableSourceStates = new Set(
      Object.values(entitySourceCoverage).filter((state) => state !== 'not_applicable'),
    )
    const sourceCoverageStatus =
      requiredSourceCount === 0
        ? 'not_applicable'
        : missingSourceCount > 0
          ? 'missing_source'
          : applicableSourceStates.has('rule_pending_review')
            ? 'rule_pending_review'
            : applicableSourceStates.has('rule_active')
              ? 'rule_active'
              : applicableSourceStates.has('source_registered')
                ? 'source_registered'
                : 'source_verified'
    return {
      jurisdiction: row.jurisdiction,
      sourceCount: row.sourceCount,
      verifiedRuleCount: activeRuleCount,
      candidateCount: pendingReviewCount,
      highPrioritySourceCount: row.highPrioritySourceCount,
      missingSourceCount,
      requiredSourceCount,
      missingSourceDomains,
      sourceCoverageStatus,
      activeRuleCount,
      pendingReviewCount,
      rejectedRuleCount,
      archivedRuleCount,
      customRuleCount: 0,
      entityCoverage,
      entitySourceCoverage,
    }
  })
})

type RuleCoverageRowAccumulator = Map<
  RuleJurisdiction,
  {
    jurisdiction: RuleJurisdiction
    sourceCount: number
    highPrioritySourceCount: number
    entityCoverage: RuleCoverageRow['entityCoverage']
    entitySourceCoverage: RuleCoverageRow['entitySourceCoverage']
  }
>

const previewObligations = os.rules.previewObligations.handler(async ({ input, context }) => {
  const { scoped, tenant } = requireTenant(context)
  await ensureTemplateReviewTasks(context)
  const activeRules = await listActiveCoreRules(scoped)
  const activeIds = new Set(activeRules.map((rule) => rule.id))
  const reviewed = new Set((await scoped.rules.listPracticeRules()).map((row) => row.ruleId))
  const pendingReviewRules = templateRules()
    .filter((rule) => !reviewed.has(rule.id) && !activeIds.has(rule.id))
    .map(reviewOnlyCoreRule)
  const generationClient: Parameters<typeof previewObligationsFromRules>[0]['client'] = {
    id: input.client.id,
    entityType: input.client.entityType,
    state: input.client.state,
    taxTypes: input.client.taxTypes,
  }
  if (input.client.taxClassification !== undefined) {
    generationClient.taxClassification = input.client.taxClassification
  }
  if (input.client.taxYearType !== undefined) {
    generationClient.taxYearType = input.client.taxYearType
  }
  if (input.client.fiscalYearEndMonth !== undefined) {
    generationClient.fiscalYearEndMonth = input.client.fiscalYearEndMonth
  }
  if (input.client.fiscalYearEndDay !== undefined) {
    generationClient.fiscalYearEndDay = input.client.fiscalYearEndDay
  }
  if (input.client.taxPeriodSource !== undefined) {
    generationClient.taxPeriodSource = input.client.taxPeriodSource
  }
  if (input.client.localFacts !== undefined) {
    generationClient.localFacts = input.client.localFacts
  }
  const generationInput: Parameters<typeof previewObligationsFromRules>[0] = {
    client: generationClient,
    rules: [...activeRules, ...pendingReviewRules],
  }

  if (input.client.taxYearStart !== undefined) {
    generationInput.client.taxYearStart = input.client.taxYearStart
  }
  if (input.client.taxYearEnd !== undefined) {
    generationInput.client.taxYearEnd = input.client.taxYearEnd
  }
  if (input.holidays !== undefined) {
    generationInput.holidays = input.holidays
  }

  return previewObligationsFromRules(generationInput)
    .filter(
      (preview) =>
        !preview.dueDate || isOnOrAfterDateOnly(preview.dueDate, tenant.monitoringStartDate),
    )
    .map(toPreview)
})

export const rulesHandlers = {
  listSources,
  listRules,
  listTemporaryRules,
  listReviewTasks,
  listReviewDecisions,
  acceptTemplate,
  bulkAcceptTemplates,
  activateOnboardingJurisdictions,
  rejectTemplate,
  createCustomRule,
  updatePracticeRule,
  archivePracticeRule,
  previewRuleImpact,
  previewBulkRuleImpact,
  draftConcreteRule,
  listConcreteDrafts,
  verifyCandidate,
  bulkVerifyCandidates,
  rejectCandidate,
  coverage,
  previewObligations,
}
