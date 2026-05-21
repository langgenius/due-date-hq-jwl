import { ORPCError } from '@orpc/server'
import {
  ObligationRuleSchema,
  type ObligationGenerationPreview,
  type ObligationRule,
  type RuleConcreteDraft,
  type RuleBulkAcceptSkip,
  type RuleBulkImpactPreview,
  RuleConcreteDraftSchema,
  type RuleGenerationState,
  type RuleCoverageRow,
  type RuleJurisdiction,
  type RuleOnboardingActivationOutput,
  type RuleReviewDecision,
  type RuleReviewTask,
  type RuleSource,
  type RuleStatus,
  type TemporaryRule,
} from '@duedatehq/contracts'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { createAI } from '@duedatehq/ai'
import {
  findRuleById,
  listRequiredSourceCoverage,
  listObligationRules,
  listRuleSources,
  previewObligationsFromRules,
  type ObligationRule as CoreObligationRule,
  type RequiredSourceCoverageCell,
  type RuleGenerationEntity,
} from '@duedatehq/core/rules'
import { expandDueDateLogic } from '@duedatehq/core/date-logic'
import type { PulseSourceSignalRow } from '@duedatehq/ports/pulse'
import type {
  PracticeRuleRow,
  PracticeRuleReviewTaskRow,
  RuleReviewDecisionRow,
  TemporaryRuleRow,
} from '@duedatehq/ports/rules'
import { requireTenant, type RpcContext } from '../_context'
import { requireCurrentFirmRole } from '../_permissions'
import { os } from '../_root'
import { generateObligationsForAcceptedRules } from './_obligation-generation'
import { toContractRule, toCoreRule, toPracticeContractRule } from './runtime'
import { extractOfficialSourceText, SOURCE_WATCH_PLACEHOLDER_RE } from './source-text'

const MAX_BULK_ACCEPT = 100
const MAX_CONCRETE_DRAFT_SOURCE_TEXT_CHARS = 24_000
const RULE_REVIEW_ROLES = ['owner', 'partner', 'manager'] as const
const ONBOARDING_RULE_REVIEW_NOTE = 'Activated from onboarding jurisdiction selection.'
const RULE_CONCRETE_DRAFT_PROMPT = 'rule-concrete-draft@v1'
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
const RULE_CONCRETE_DRAFT_AI_SCHEMA = RuleConcreteDraftSchema.omit({ aiOutputId: true })
type RuleConcreteDraftPayload = Omit<RuleConcreteDraft, 'aiOutputId'>
type CandidateSourceSignal = PulseSourceSignalRow | null

function toSource(source: ReturnType<typeof listRuleSources>[number]): RuleSource {
  return {
    ...source,
    domains: [...source.domains],
    entityApplicability: [...source.entityApplicability],
    notificationChannels: [...source.notificationChannels],
  }
}

function toPreview(
  preview: ReturnType<typeof previewObligationsFromRules>[number],
): ObligationGenerationPreview {
  return {
    ...preview,
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

async function hashAiInput(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function ruleConcreteDraftContextRef(input: {
  ruleId: string
  sourceId: string
  sourceSignalId?: string | null
}): string {
  return ['rule', input.ruleId, input.sourceId, input.sourceSignalId ?? null]
    .filter((value): value is string => Boolean(value))
    .join(':')
}

function practiceReviewMetadata(row: PracticeRuleRow): {
  verifiedBy?: string
  verifiedAt?: string
  version: number
} {
  return {
    ...(row.reviewedBy ? { verifiedBy: row.reviewedBy } : {}),
    ...(row.reviewedAt ? { verifiedAt: toDateOnly(row.reviewedAt) } : {}),
    version: row.templateVersion,
  }
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

function normalizeExcerptText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function sourceTextContainsExcerpt(sourceText: string, excerpt: string): boolean {
  const normalizedSource = normalizeExcerptText(sourceText)
  const normalizedExcerpt = normalizeExcerptText(excerpt)
  if (normalizedSource.includes(normalizedExcerpt)) return true

  const sourceTokens = new Set(normalizedSource.match(/[a-z0-9]+/g) ?? [])
  const excerptTokens = Array.from(new Set(normalizedExcerpt.match(/[a-z0-9]+/g) ?? [])).filter(
    (token) => token.length > 2,
  )
  if (excerptTokens.length < 4) return false

  const hitCount = excerptTokens.filter((token) => sourceTokens.has(token)).length
  return hitCount / excerptTokens.length >= 0.85
}

function validateConcreteDueDateLogic(input: {
  rule: Pick<CoreObligationRule, 'taxYear'>
  dueDateLogic: ObligationRule['dueDateLogic']
}): string | null {
  if (input.dueDateLogic.kind === 'source_defined_calendar') {
    return 'Concrete rule drafts must not use source_defined_calendar due-date logic.'
  }

  try {
    const expanded = expandDueDateLogic(input.dueDateLogic, {
      taxYearStart: `${input.rule.taxYear}-01-01`,
      taxYearEnd: `${input.rule.taxYear}-12-31`,
    })
    if (expanded.some((item) => item.dueDate !== null)) return null
    return 'Concrete due-date logic did not expand to any concrete due date.'
  } catch (error) {
    return error instanceof Error ? error.message : 'Concrete due-date logic could not be expanded.'
  }
}

function validateConcreteRuleDraft(input: {
  rule: Pick<CoreObligationRule, 'taxYear'>
  dueDateLogic: ObligationRule['dueDateLogic']
  sourceText: string
  sourceExcerpt: string
  coverageStatus: ObligationRule['coverageStatus']
  requiresApplicabilityReview: boolean
}): string | null {
  const dueDateError = validateConcreteDueDateLogic(input)
  if (dueDateError) return dueDateError

  if (SOURCE_WATCH_PLACEHOLDER_RE.test(input.sourceExcerpt)) {
    return 'AI source excerpt used source-watch metadata instead of official source text.'
  }

  if (!sourceTextContainsExcerpt(input.sourceText, input.sourceExcerpt)) {
    return 'AI source excerpt was not found in the selected official source text.'
  }

  if (
    input.coverageStatus === 'full' &&
    !input.requiresApplicabilityReview &&
    input.dueDateLogic.kind === 'source_defined_calendar'
  ) {
    return 'Full coverage without applicability review requires concrete due-date logic.'
  }

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
  return parsed.success ? toCoreRule(parsed.data) : null
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
  sourceSignalId?: string
}): Promise<{
  source: ReturnType<typeof listRuleSources>[number]
  sourceSignal: CandidateSourceSignal
}> {
  const { scoped } = requireTenant(input.context)
  const source = listRuleSources().find((item) => item.id === input.sourceId)
  if (!source) throw new ORPCError('BAD_REQUEST', { message: 'Official source was not found.' })
  if (source.jurisdiction !== input.base.jurisdiction && source.jurisdiction !== 'FED') {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Official source jurisdiction does not match the rule template.',
    })
  }

  const sourceSignal = input.sourceSignalId
    ? await scoped.pulse.getSourceSignal(input.sourceSignalId)
    : null
  if (input.sourceSignalId && !sourceSignal) {
    throw new ORPCError('NOT_FOUND', { message: 'Source signal was not found.' })
  }
  if (sourceSignal) {
    if (sourceSignal.status !== 'open') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Only open source signals can be attached to rule review.',
      })
    }
    if (sourceSignal.sourceId !== input.sourceId) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Source signal does not match the selected official source.',
      })
    }
    if (
      sourceSignal.jurisdiction !== input.base.jurisdiction &&
      sourceSignal.jurisdiction !== 'FED'
    ) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Source signal jurisdiction does not match the rule template.',
      })
    }
  }

  return { source, sourceSignal }
}

async function buildConcreteDraftSourceText(input: {
  context: RpcContext
  base: CoreObligationRule
  source: ReturnType<typeof listRuleSources>[number]
  sourceSignal: CandidateSourceSignal
}): Promise<string> {
  const chunks: string[] = []

  if (input.sourceSignal) {
    const raw = await input.context.env.R2_PULSE.get(input.sourceSignal.rawR2Key).catch(() => null)
    const rawText = raw ? await raw.text() : null
    chunks.push(
      [
        input.sourceSignal.title,
        input.sourceSignal.officialSourceUrl,
        input.sourceSignal.publishedAt.toISOString().slice(0, 10),
        rawText,
      ]
        .filter((value): value is string => Boolean(value))
        .join('\n'),
    )
  }

  const evidenceChunks = input.base.evidence
    .filter(
      (evidence) =>
        evidence.sourceId === input.source.id &&
        !SOURCE_WATCH_PLACEHOLDER_RE.test(evidence.sourceExcerpt),
    )
    .map((evidence) =>
      [
        evidence.locator.heading ?? input.source.title,
        evidence.sourceUpdatedOn ? `Updated ${evidence.sourceUpdatedOn}` : null,
        evidence.sourceExcerpt,
      ]
        .filter((value): value is string => Boolean(value))
        .join('\n'),
    )
  const officialSourceText = await fetchOfficialSourceText(input.source.url)

  chunks.push(
    [
      input.source.title,
      input.source.url,
      input.source.lastReviewedOn ? `Reviewed ${input.source.lastReviewedOn}` : null,
      ...evidenceChunks,
      officialSourceText ? `Official source text\n${officialSourceText}` : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join('\n'),
  )

  return chunks.filter(Boolean).join('\n\n')
}

async function fetchOfficialSourceText(url: string): Promise<string | null> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
        'user-agent': 'DueDateHQ rule review source fetcher',
      },
    })
  } catch {
    return null
  }

  if (!response.ok) return null
  const contentType = response.headers.get('content-type') ?? ''
  if (
    !contentType.includes('text/html') &&
    !contentType.includes('application/xhtml+xml') &&
    !contentType.includes('text/plain')
  ) {
    return null
  }

  const raw = await response.text().catch(() => null)
  if (!raw) return null
  const text = extractOfficialSourceText(raw)
  return text ? text.slice(0, MAX_CONCRETE_DRAFT_SOURCE_TEXT_CHARS) : null
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
      rows.push(pendingContractRule(template))
      continue
    }

    const parsed = practice.ruleJson
      ? ObligationRuleSchema.safeParse(practice.ruleJson)
      : { success: false as const }
    if (practice.status === 'active' && parsed.success) {
      const activeRule: ObligationRule = {
        ...parsed.data,
        status: 'active',
        verifiedBy: practice.reviewedBy ?? parsed.data.verifiedBy,
        verifiedAt: practice.reviewedAt ? toDateOnly(practice.reviewedAt) : parsed.data.verifiedAt,
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

    rows.push(toPracticeContractRule(template, practice.status, practiceReviewMetadata(practice)))
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
    rows.push({
      ...parsed.data,
      status: practice.status,
      verifiedBy: practice.reviewedBy ?? parsed.data.verifiedBy,
      verifiedAt: practice.reviewedAt ? toDateOnly(practice.reviewedAt) : parsed.data.verifiedAt,
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
  return rows.flatMap((row) => {
    const rule = parsePracticeRule(row)
    return rule ? [rule] : []
  })
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
  const reviewRequiredJurisdictionSet = new Set(
    reviewRequiredRules.map((rule) => rule.jurisdiction),
  )
  const reviewRequiredJurisdictions = jurisdictions.filter((jurisdiction) =>
    reviewRequiredJurisdictionSet.has(jurisdiction),
  )
  const activeCoreRules: CoreObligationRule[] = []

  await Promise.all(
    activatableRules.map(async (rule) => {
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

  const generate = input.generateObligations ?? generateObligationsForAcceptedRules
  const generation = await generate({
    scoped: input.scoped,
    userId: input.userId,
    rules: activeCoreRules,
    internalDeadlineOffsetDays: input.internalDeadlineOffsetDays,
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
      activatedCount: activatableRules.length,
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
    activatedCount: activatableRules.length,
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
  const { scoped } = requireTenant(context)
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
      estimatedObligationCount += 1
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

async function acceptTemplateRule(input: {
  context: RpcContext
  rule: CoreObligationRule
  reviewNote: string
  reviewedBy: string
  reviewedAt: Date
  editedRule?: ObligationRule
  catalogSeeded?: boolean
  generateObligations?: boolean
}): Promise<RuleReviewTask> {
  const { scoped, tenant } = requireTenant(input.context)
  if (!input.editedRule && isSourceDefinedRule(input.rule)) throw sourceDefinedAcceptError()
  if (!input.catalogSeeded) await ensureGlobalTemplateCatalog(input.context)
  const contractRule =
    input.editedRule ??
    toPracticeContractRule(input.rule, 'active', {
      verifiedBy: input.reviewedBy,
      verifiedAt: toDateOnly(input.reviewedAt),
    })
  const activeRule: ObligationRule = {
    ...contractRule,
    status: 'active',
    verifiedBy: input.reviewedBy,
    verifiedAt: toDateOnly(input.reviewedAt),
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
    entityType: 'rule',
    entityId: input.rule.id,
    action: 'rules.accepted',
    before: { status: 'pending_review', version: input.rule.version },
    after: { status: 'active', version: activeRule.version },
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
      now: input.reviewedAt,
      reason: input.reviewNote,
    })
  }
  return task
}

async function rejectTemplateRule(input: {
  context: RpcContext
  rule: CoreObligationRule
  reason: string
  reviewedBy: string
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
      verifiedBy: input.reviewedBy,
      verifiedAt: toDateOnly(input.reviewedAt),
    }),
    status: 'rejected',
    reviewNote: input.reason,
    reviewedBy: input.reviewedBy,
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
  const { userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)
  const rule = templateRuleById(input.ruleId)
  if (!rule) throw new ORPCError('NOT_FOUND', { message: 'Rule template was not found.' })
  if (rule.version !== input.expectedVersion) {
    throw new ORPCError('CONFLICT', { message: 'Rule template version has changed.' })
  }
  return acceptTemplateRule({
    context,
    rule,
    reviewNote: input.reviewNote,
    reviewedBy: userId,
    reviewedAt: new Date(),
  })
})

const bulkAcceptTemplates = os.rules.bulkAcceptTemplates.handler(async ({ input, context }) => {
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
      states: input.states,
      ensureCatalog: () => ensureGlobalTemplateCatalog(context),
    })
  },
)

const rejectTemplate = os.rules.rejectTemplate.handler(async ({ input, context }) => {
  const { userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)
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
    reviewedAt,
  })
})

const createCustomRule = os.rules.createCustomRule.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)
  const reviewedAt = new Date()
  const rule = {
    ...input.rule,
    status: 'active' as const,
    verifiedBy: userId,
    verifiedAt: toDateOnly(reviewedAt),
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
    after: { status: 'active', version: rule.version, custom: true },
    reason: input.reviewNote,
  })
  return acceptedTaskForRule({
    context,
    rule,
    status: 'accepted',
    reviewNote: input.reviewNote,
    reviewedBy: userId,
    reviewedAt,
  })
})

const updatePracticeRule = os.rules.updatePracticeRule.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)
  const reviewedAt = new Date()
  const existing = await scoped.rules.getPracticeRule(input.rule.id)
  if (!existing) throw new ORPCError('NOT_FOUND', { message: 'Practice rule was not found.' })
  const rule = {
    ...input.rule,
    status: 'active' as const,
    verifiedBy: userId,
    verifiedAt: toDateOnly(reviewedAt),
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
    before: { status: existing.status, version: existing.templateVersion },
    after: { status: 'active', version: rule.version },
    reason: input.reviewNote,
  })
  return acceptedTaskForRule({
    context,
    rule,
    status: 'accepted',
    reviewNote: input.reviewNote,
    reviewedBy: userId,
    reviewedAt,
  })
})

const archivePracticeRule = os.rules.archivePracticeRule.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)
  const existing = await scoped.rules.getPracticeRule(input.ruleId)
  if (!existing) throw new ORPCError('NOT_FOUND', { message: 'Practice rule was not found.' })
  const reviewedAt = new Date()
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
        verifiedBy: userId,
        verifiedAt: toDateOnly(reviewedAt),
      }
    : toPracticeContractRule(template!, 'archived')
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
    reviewedAt,
  })
})

const previewRuleImpact = os.rules.previewRuleImpact.handler(async ({ input, context }) => {
  return previewBulkImpactForSelections(context, [input])
})

const previewBulkRuleImpact = os.rules.previewBulkRuleImpact.handler(async ({ input, context }) => {
  return previewBulkImpactForSelections(context, input.rules)
})

function parseCachedConcreteDraft(outputText: string | null): RuleConcreteDraftPayload | null {
  if (!outputText) return null
  try {
    const parsed = RULE_CONCRETE_DRAFT_AI_SCHEMA.safeParse(JSON.parse(outputText))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

const draftConcreteRule = os.rules.draftConcreteRule.handler(async ({ input, context }) => {
  const { scoped, tenant, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)

  const base = templateRuleById(input.ruleId)
  if (!base) throw new ORPCError('NOT_FOUND', { message: 'Rule template was not found.' })
  const { source, sourceSignal } = await loadCandidateSourceContext({
    context,
    base,
    sourceId: input.sourceId,
    ...(input.sourceSignalId ? { sourceSignalId: input.sourceSignalId } : {}),
  })
  const sourceText = await buildConcreteDraftSourceText({ context, base, source, sourceSignal })
  const aiInput = {
    rule: {
      id: base.id,
      title: base.title,
      jurisdiction: base.jurisdiction,
      entityApplicability: base.entityApplicability,
      taxType: base.taxType,
      formName: base.formName,
      eventType: base.eventType,
      isFiling: base.isFiling,
      isPayment: base.isPayment,
      taxYear: base.taxYear,
      applicableYear: base.applicableYear,
      dueDateLogic: base.dueDateLogic,
      extensionPolicy: base.extensionPolicy,
      coverageStatus: base.coverageStatus,
      requiresApplicabilityReview: base.requiresApplicabilityReview,
      quality: base.quality,
      defaultTip: base.defaultTip,
    },
    source: {
      id: source.id,
      title: source.title,
      url: source.url,
      jurisdiction: source.jurisdiction,
      sourceType: source.sourceType,
      acquisitionMethod: source.acquisitionMethod,
      lastReviewedOn: source.lastReviewedOn,
    },
    ...(sourceSignal
      ? {
          sourceSignal: {
            id: sourceSignal.id,
            title: sourceSignal.title,
            officialSourceUrl: sourceSignal.officialSourceUrl,
            publishedAt: sourceSignal.publishedAt.toISOString(),
            fetchedAt: sourceSignal.fetchedAt.toISOString(),
            signalType: sourceSignal.signalType,
          },
        }
      : {}),
    sourceText,
  }

  const inputContextRef = ruleConcreteDraftContextRef({
    ruleId: base.id,
    sourceId: source.id,
    sourceSignalId: sourceSignal?.id ?? null,
  })
  const inputHash = await hashAiInput(aiInput)
  const cached = await scoped.ai.findSuccessfulRun({
    kind: 'rule_concrete_draft',
    inputContextRef,
    inputHash,
    promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
  })
  const cachedDraft = parseCachedConcreteDraft(cached?.outputText ?? null)
  if (cached && cachedDraft) {
    const cachedGuardError = validateConcreteRuleDraft({
      rule: base,
      dueDateLogic: cachedDraft.dueDateLogic,
      sourceText,
      sourceExcerpt: cachedDraft.sourceExcerpt,
      coverageStatus: cachedDraft.coverageStatus,
      requiresApplicabilityReview: cachedDraft.requiresApplicabilityReview,
    })
    if (!cachedGuardError) {
      return RuleConcreteDraftSchema.parse({
        aiOutputId: cached.id,
        ...cachedDraft,
      })
    }
  }

  const ai = createAI(context.env)
  const aiResult = await ai.runPrompt(
    RULE_CONCRETE_DRAFT_PROMPT,
    aiInput,
    RULE_CONCRETE_DRAFT_AI_SCHEMA,
    {
      plan: tenant.plan,
      firmId: tenant.firmId,
      taskKind: 'insight',
    },
  )

  const draft = aiResult.result as RuleConcreteDraftPayload | null
  const guardError = draft
    ? validateConcreteRuleDraft({
        rule: base,
        dueDateLogic: draft.dueDateLogic,
        sourceText,
        sourceExcerpt: draft.sourceExcerpt,
        coverageStatus: draft.coverageStatus,
        requiresApplicabilityReview: draft.requiresApplicabilityReview,
      })
    : null
  const recorded = await scoped.ai.recordRun({
    userId,
    kind: 'rule_concrete_draft',
    inputContextRef,
    trace: {
      ...aiResult.trace,
      model: aiResult.model ?? aiResult.trace.model,
      ...(guardError ? { guardResult: 'guard_rejected', refusalCode: 'GUARD_REJECTED' } : {}),
    },
    outputText: draft ? JSON.stringify(draft) : null,
    citations: {
      sourceId: source.id,
      sourceUrl: source.url,
      sourceSignalId: sourceSignal?.id ?? null,
      sourceExcerpt: draft?.sourceExcerpt ?? null,
    },
    errorMsg: aiResult.refusal?.message ?? guardError,
  })

  if (aiResult.refusal || !draft) {
    throw new ORPCError('BAD_REQUEST', {
      message: aiResult.refusal?.message ?? 'AI concrete draft was unavailable.',
    })
  }
  if (guardError) {
    throw new ORPCError('BAD_REQUEST', { message: guardError })
  }

  return RuleConcreteDraftSchema.parse({
    aiOutputId: recorded.aiOutputId,
    ...draft,
  })
})

const verifyCandidate = os.rules.verifyCandidate.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)

  const base = templateRuleById(input.ruleId)
  if (!base) throw new ORPCError('NOT_FOUND', { message: 'Rule template was not found.' })

  const { source, sourceSignal } = await loadCandidateSourceContext({
    context,
    base,
    sourceId: input.sourceId,
    ...(input.sourceSignalId ? { sourceSignalId: input.sourceSignalId } : {}),
  })
  const sourceText = await buildConcreteDraftSourceText({ context, base, source, sourceSignal })
  const validationError = validateConcreteRuleDraft({
    rule: base,
    dueDateLogic: input.dueDateLogic,
    sourceText,
    sourceExcerpt: input.sourceExcerpt,
    coverageStatus: input.coverageStatus,
    requiresApplicabilityReview: input.requiresApplicabilityReview,
  })
  if (validationError) {
    throw new ORPCError('BAD_REQUEST', {
      message: validationError,
    })
  }

  const reviewedAt = new Date()
  const activeRule = toPracticeContractRule(base, 'active', {
    verifiedBy: userId,
    verifiedAt: toDateOnly(reviewedAt),
    version: base.version + 1,
  })
  const editedRule: ObligationRule = {
    ...activeRule,
    ruleTier: input.ruleTier,
    coverageStatus: input.coverageStatus,
    requiresApplicabilityReview: input.requiresApplicabilityReview,
    dueDateLogic: input.dueDateLogic,
    extensionPolicy: input.extensionPolicy,
    sourceIds: Array.from(new Set([input.sourceId, ...base.sourceIds])),
    evidence: [
      {
        sourceId: input.sourceId,
        ...(input.aiOutputId ? { aiOutputId: input.aiOutputId } : {}),
        authorityRole: 'basis',
        locator: {
          kind:
            source.sourceType === 'form' || source.acquisitionMethod === 'pdf_watch'
              ? 'pdf'
              : 'html',
          heading: input.sourceHeading,
        },
        summary: `Practice accepted ${base.title} against ${source.title}.`,
        sourceExcerpt: input.sourceExcerpt,
        retrievedAt: toDateOnly(reviewedAt),
        ...(input.sourceUpdatedOn ? { sourceUpdatedOn: input.sourceUpdatedOn } : {}),
      },
    ],
    quality: input.quality,
    nextReviewOn: input.nextReviewOn,
  }

  const task = await acceptTemplateRule({
    context,
    rule: base,
    reviewNote: input.reviewNote ?? 'Accepted from rule review.',
    reviewedBy: userId,
    reviewedAt,
    editedRule,
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
  if (sourceSignal) {
    await scoped.pulse.reviewSourceSignalForRule({
      signalId: sourceSignal.id,
      ruleId: base.id,
      reviewDecisionId: row.id,
    })
  }
  void task
  return toReviewDecision(row)
})

const rejectCandidate = os.rules.rejectCandidate.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)

  const base = templateRuleById(input.ruleId)
  if (!base) throw new ORPCError('NOT_FOUND', { message: 'Rule template was not found.' })

  await rejectTemplateRule({
    context,
    rule: base,
    reason: input.reason,
    reviewedBy: userId,
    reviewedAt: new Date(),
  })
  const row = await scoped.rules.upsertDecision({
    ruleId: base.id,
    baseVersion: base.version,
    status: 'rejected',
    ruleJson: null,
    reviewNote: input.reason,
    reviewedBy: userId,
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
  const { scoped } = requireTenant(context)
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

  return previewObligationsFromRules(generationInput).map(toPreview)
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
  verifyCandidate,
  rejectCandidate,
  coverage,
  previewObligations,
}
