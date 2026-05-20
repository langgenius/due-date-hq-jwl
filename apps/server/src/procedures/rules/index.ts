import { ORPCError } from '@orpc/server'
import {
  ObligationRuleSchema,
  type ObligationGenerationPreview,
  type ObligationRule,
  type RuleBulkAcceptSkip,
  type RuleBulkImpactPreview,
  type RuleReviewDecision,
  type RuleReviewTask,
  type RuleSource,
  type RuleStatus,
  type TemporaryRule,
} from '@duedatehq/contracts'
import {
  findRuleById,
  listObligationRules,
  listRuleSources,
  previewObligationsFromRules,
  type ObligationRule as CoreObligationRule,
  type RuleGenerationEntity,
  type RuleJurisdiction,
} from '@duedatehq/core/rules'
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

const MAX_BULK_ACCEPT = 100
const RULE_REVIEW_ROLES = ['owner', 'partner', 'manager'] as const

function toSource(source: ReturnType<typeof listRuleSources>[number]): RuleSource {
  return {
    ...source,
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
      if (practice.templateVersion !== template.version && hasOpenTemplateReviewTask) {
        rows.push(pendingContractRule(template))
      }
      continue
    }

    rows.push(toPracticeContractRule(template, practice.status, practiceReviewMetadata(practice)))
    if (
      practice.status !== 'pending_review' &&
      practice.templateVersion !== template.version &&
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

const verifyCandidate = os.rules.verifyCandidate.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  await requireCurrentFirmRole(context, RULE_REVIEW_ROLES)

  const base = templateRuleById(input.ruleId)
  if (!base) throw new ORPCError('NOT_FOUND', { message: 'Rule template was not found.' })

  const source = listRuleSources().find((item) => item.id === input.sourceId)
  if (!source) throw new ORPCError('BAD_REQUEST', { message: 'Official source was not found.' })
  if (source.jurisdiction !== base.jurisdiction && source.jurisdiction !== 'FED') {
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
    if (sourceSignal.jurisdiction !== base.jurisdiction && sourceSignal.jurisdiction !== 'FED') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Source signal jurisdiction does not match the rule template.',
      })
    }
  }
  if (
    input.coverageStatus === 'full' &&
    !input.requiresApplicabilityReview &&
    input.dueDateLogic.kind === 'source_defined_calendar'
  ) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Active reminder-ready rules must use concrete due-date logic.',
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
  const sourceCoverage = listRuleSources().reduce<RuleCoverageRowAccumulator>((acc, source) => {
    const current = acc.get(source.jurisdiction) ?? {
      jurisdiction: source.jurisdiction,
      sourceCount: 0,
      highPrioritySourceCount: 0,
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
    return {
      jurisdiction: row.jurisdiction,
      sourceCount: row.sourceCount,
      verifiedRuleCount: activeRuleCount,
      candidateCount: pendingReviewCount,
      highPrioritySourceCount: row.highPrioritySourceCount,
      activeRuleCount,
      pendingReviewCount,
      rejectedRuleCount,
      archivedRuleCount,
      customRuleCount: 0,
    }
  })
})

type RuleCoverageRowAccumulator = Map<
  RuleJurisdiction,
  {
    jurisdiction: RuleJurisdiction
    sourceCount: number
    highPrioritySourceCount: number
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
  rejectTemplate,
  createCustomRule,
  updatePracticeRule,
  archivePracticeRule,
  previewRuleImpact,
  previewBulkRuleImpact,
  verifyCandidate,
  rejectCandidate,
  coverage,
  previewObligations,
}
