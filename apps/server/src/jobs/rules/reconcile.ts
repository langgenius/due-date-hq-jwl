import { createAI, type AiRunResult } from '@duedatehq/ai'
import {
  createDb,
  makeAiRepo,
  makePulseOpsRepo,
  makeRulesOpsRepo,
  makeRulesRepo,
} from '@duedatehq/db'
import {
  listObligationRules,
  listRuleSources,
  type ObligationRule,
  type RuleSource,
} from '@duedatehq/core/rules'
import { fetchTextSnapshot } from '@duedatehq/ingest/http'
import { z } from 'zod'
import type { Env } from '../../env'
import {
  cachedConcreteDraftKey,
  RULE_CONCRETE_DRAFT_PROMPT,
} from '../../procedures/rules/concrete-draft'
import { archivePulseRaw } from '../pulse/ingest'
import { recordPulseMetric } from '../pulse/metrics'
import {
  RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE,
  type RuleConcreteDraftGenerateMessage,
} from './concrete-draft'

export const RULE_REGISTRY_SOURCE_RECONCILE_MESSAGE_TYPE = 'rule.registry.source.reconcile'
export const RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE = 'rule.registry.catalog.sync'
export const RULE_REGISTRY_RECONCILE_PROMPT = 'rule-registry-reconcile@v1'

const WEEKLY_RECONCILE_DAY_UTC = 1
const WEEKLY_RECONCILE_HOUR_UTC = 9
const RECONCILE_RUN_KEY_PREFIX = 'cadence'
const AUTOMATED_RECONCILE_METHODS = new Set<RuleSource['acquisitionMethod']>([
  'html_watch',
  'pdf_watch',
])

const RuleRegistryReconcileOutputSchema = z.object({
  classification: z.enum(['no_rule_change', 'existing_rule_update', 'new_rule']),
  affectedRuleIds: z.array(z.string()).default([]),
  proposedRuleIds: z.array(z.string()).default([]),
  diffSummary: z.string().min(1),
  normalizedRuleJson: z.unknown().optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
})

type RuleRegistryReconcileOutput = z.infer<typeof RuleRegistryReconcileOutputSchema>

export interface RuleRegistrySourceReconcileMessage {
  type: typeof RULE_REGISTRY_SOURCE_RECONCILE_MESSAGE_TYPE
  runId: string
  sourceId: string
  reason: 'cadence_due' | 'weekly_governance'
}

export interface RuleRegistryCatalogSyncMessage {
  type: typeof RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE
  reason: 'scheduled' | 'manual'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isRuleRegistrySourceReconcileMessage(
  value: unknown,
): value is RuleRegistrySourceReconcileMessage {
  return (
    isRecord(value) &&
    value.type === RULE_REGISTRY_SOURCE_RECONCILE_MESSAGE_TYPE &&
    typeof value.runId === 'string' &&
    typeof value.sourceId === 'string' &&
    (value.reason === 'cadence_due' || value.reason === 'weekly_governance')
  )
}

export function isRuleRegistryCatalogSyncMessage(
  value: unknown,
): value is RuleRegistryCatalogSyncMessage {
  return (
    isRecord(value) &&
    value.type === RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE &&
    (value.reason === 'scheduled' || value.reason === 'manual')
  )
}

function sourceCadenceMs(source: Pick<RuleSource, 'cadence'>): number {
  const day = 24 * 60 * 60 * 1000
  if (source.cadence === 'daily') return day
  if (source.cadence === 'weekly') return 7 * day
  if (source.cadence === 'monthly') return 30 * day
  if (source.cadence === 'quarterly') return 90 * day
  return 14 * day
}

function sourceTier(source: Pick<RuleSource, 'priority'>): string {
  if (source.priority === 'critical' || source.priority === 'high') return 'T1'
  if (source.priority === 'medium') return 'T2'
  return 'T3'
}

function nextCheckAt(from: Date, source: RuleSource): Date {
  return new Date(from.getTime() + sourceCadenceMs(source))
}

export function shouldRunWeeklyRuleRegistryGovernance(now: Date): boolean {
  return (
    now.getUTCDay() === WEEKLY_RECONCILE_DAY_UTC &&
    now.getUTCHours() === WEEKLY_RECONCILE_HOUR_UTC &&
    now.getUTCMinutes() < 30
  )
}

export const shouldRunWeeklyRuleRegistryReconcile = shouldRunWeeklyRuleRegistryGovernance

function reconcileRunKey(now: Date): string {
  return `${RECONCILE_RUN_KEY_PREFIX}:${now.toISOString().slice(0, 16)}Z`
}

function sourceIsDue(state: { enabled?: boolean; nextCheckAt?: Date | null }, now: Date): boolean {
  return (
    state.enabled !== false && (!state.nextCheckAt || state.nextCheckAt.getTime() <= now.getTime())
  )
}

function sourceCanAutoReconcile(source: RuleSource): boolean {
  return (
    source.healthStatus !== 'paused' && AUTOMATED_RECONCILE_METHODS.has(source.acquisitionMethod)
  )
}

function rulesForSource(sourceId: string): ObligationRule[] {
  return listObligationRules({ includeCandidates: true }).filter((rule) =>
    rule.sourceIds.includes(sourceId),
  )
}

function ruleSummary(rule: ObligationRule) {
  return {
    id: rule.id,
    title: rule.title,
    jurisdiction: rule.jurisdiction,
    version: rule.version,
    status: rule.status,
    entityApplicability: rule.entityApplicability,
    taxType: rule.taxType,
    formName: rule.formName,
    eventType: rule.eventType,
    dueDateLogic: rule.dueDateLogic,
    extensionPolicy: rule.extensionPolicy,
    coverageStatus: rule.coverageStatus,
    requiresApplicabilityReview: rule.requiresApplicabilityReview,
  }
}

function sourceTemplateInput(source: RuleSource) {
  return {
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
    status: 'available' as const,
  }
}

function ruleTemplateInput(rule: ObligationRule) {
  return {
    id: rule.id,
    jurisdiction: rule.jurisdiction,
    title: rule.title,
    version: rule.version,
    status: rule.status === 'deprecated' ? ('deprecated' as const) : ('available' as const),
    ruleJson: rule,
    sourceIds: [...rule.sourceIds],
  }
}

function primarySourceIdForRule(rule: Pick<ObligationRule, 'sourceIds' | 'evidence'>) {
  return rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? null
}

function isSourceDefinedRule(rule: Pick<ObligationRule, 'dueDateLogic'>): boolean {
  return rule.dueDateLogic.kind === 'source_defined_calendar'
}

function proposalTypeForOutput(
  output: RuleRegistryReconcileOutput,
): 'no_rule_change' | 'existing_rule_update' | 'new_rule' {
  return output.classification
}

function outputStatus(output: RuleRegistryReconcileOutput): 'open' | 'dismissed' {
  return output.classification === 'no_rule_change' ? 'dismissed' : 'open'
}

async function recordAnalyzerRun(input: {
  env: Env
  source: RuleSource
  snapshotId: string
  contentHash: string
  result: AiRunResult<RuleRegistryReconcileOutput>
}) {
  const aiRepo = makeAiRepo(createDb(input.env.DB), 'global')
  return aiRepo.recordGlobalRun({
    userId: null,
    kind: 'rule_registry_reconcile',
    inputContextRef: `rule-registry-reconcile:${input.source.id}:${input.contentHash}`,
    trace: {
      ...input.result.trace,
      model: input.result.model ?? input.result.trace.model,
    },
    outputText: JSON.stringify(input.result.result ?? input.result.refusal),
    citations: {
      sourceId: input.source.id,
      sourceUrl: input.source.url,
      sourceSnapshotId: input.snapshotId,
      contentHash: input.contentHash,
    },
    errorMsg: input.result.refusal?.message ?? null,
  })
}

async function recordManualProposal(input: {
  env: Env
  runId: string
  source: RuleSource
  reason: string
}): Promise<void> {
  const db = createDb(input.env.DB)
  const ops = makeRulesOpsRepo(db)
  await ops.recordChangeProposal({
    runId: input.runId,
    sourceId: input.source.id,
    proposalType: 'manual_check_due',
    status: 'open',
    affectedRuleIds: rulesForSource(input.source.id).map((rule) => rule.id),
    diffSummary: input.reason,
    failureReason: input.reason,
  })
  await ops.recordReconcileSourceOutcome({
    runId: input.runId,
    changed: false,
    proposalCreated: true,
  })
}

export async function enqueueRuleRegistryCatalogSync(
  env: Pick<Env, 'PULSE_QUEUE'>,
  reason: RuleRegistryCatalogSyncMessage['reason'] = 'scheduled',
): Promise<void> {
  await env.PULSE_QUEUE.send({
    type: RULE_REGISTRY_CATALOG_SYNC_MESSAGE_TYPE,
    reason,
  } satisfies RuleRegistryCatalogSyncMessage)
}

export async function enqueueDueRuleRegistryReconcile(
  env: Pick<Env, 'DB' | 'PULSE_QUEUE'>,
  now: Date,
): Promise<{ queued: number; runId: string | null }> {
  const sources = listRuleSources()
  const weeklyGovernance = shouldRunWeeklyRuleRegistryGovernance(now)
  const pulseOps = makePulseOpsRepo(createDb(env.DB))
  const queueItems = (
    await Promise.all(
      sources.map(async (source) => {
        const state = await pulseOps.ensureSourceState({
          sourceId: source.id,
          tier: sourceTier(source),
          jurisdiction: source.jurisdiction,
          cadenceMs: sourceCadenceMs(source),
          now,
          enabled: source.healthStatus !== 'paused',
        })
        if (!state.enabled) return null
        if (sourceCanAutoReconcile(source)) {
          return sourceIsDue(state, now) ? { source, reason: 'cadence_due' as const } : null
        }
        return weeklyGovernance ? { source, reason: 'weekly_governance' as const } : null
      }),
    )
  ).filter((item): item is NonNullable<typeof item> => item !== null)

  if (queueItems.length === 0) return { queued: 0, runId: null }

  const ops = makeRulesOpsRepo(createDb(env.DB))
  const { run, inserted } = await ops.startReconcileRun({
    runKey: reconcileRunKey(now),
    sourceCount: queueItems.length,
    startedAt: now,
    triggeredBy: 'scheduled_cron',
  })
  if (!inserted || run.status !== 'running') return { queued: 0, runId: run.id }

  await Promise.all(
    queueItems.map(({ source, reason }) =>
      env.PULSE_QUEUE.send({
        type: RULE_REGISTRY_SOURCE_RECONCILE_MESSAGE_TYPE,
        runId: run.id,
        sourceId: source.id,
        reason,
      } satisfies RuleRegistrySourceReconcileMessage),
    ),
  )
  return { queued: queueItems.length, runId: run.id }
}

export const enqueueWeeklyRuleRegistryReconcile = enqueueDueRuleRegistryReconcile

export async function consumeRuleRegistrySourceReconcile(
  message: RuleRegistrySourceReconcileMessage,
  env: Env,
): Promise<void> {
  const source = listRuleSources().find((item) => item.id === message.sourceId)
  const db = createDb(env.DB)
  const ops = makeRulesOpsRepo(db)
  const pulseOps = makePulseOpsRepo(db)
  if (!source) {
    await ops.recordReconcileSourceOutcome({
      runId: message.runId,
      failed: true,
      errorText: `Rule source not found: ${message.sourceId}`,
    })
    return
  }

  await pulseOps.ensureSourceState({
    sourceId: source.id,
    tier: sourceTier(source),
    jurisdiction: source.jurisdiction,
    cadenceMs: sourceCadenceMs(source),
    now: new Date(),
  })

  if (!AUTOMATED_RECONCILE_METHODS.has(source.acquisitionMethod)) {
    await recordManualProposal({
      env,
      runId: message.runId,
      source,
      reason: `${source.acquisitionMethod} source requires product developer review.`,
    })
    return
  }

  try {
    const fetched = await fetchTextSnapshot(
      {
        fetch,
        getSourceState: async (sourceId) => {
          const state = await pulseOps.getSourceState(sourceId)
          return state ? { etag: state.etag, lastModified: state.lastModified } : null
        },
        archiveRaw: (input) => archivePulseRaw(env, input),
      },
      { sourceId: source.id, url: source.url },
    )
    const checkedAt = fetched.fetchedAt

    if (fetched.notModified) {
      await pulseOps.recordSourceSuccess({
        sourceId: source.id,
        checkedAt,
        nextCheckAt: nextCheckAt(checkedAt, source),
        changed: false,
        ...(fetched.etag !== undefined ? { etag: fetched.etag } : {}),
        ...(fetched.lastModified !== undefined ? { lastModified: fetched.lastModified } : {}),
      })
      await ops.recordReconcileSourceOutcome({ runId: message.runId, changed: false })
      return
    }

    const snapshot = await pulseOps.createSourceSnapshot({
      sourceId: source.id,
      externalId: source.url,
      title: `${source.title} weekly source snapshot`,
      officialSourceUrl: source.url,
      publishedAt: checkedAt,
      fetchedAt: checkedAt,
      contentHash: fetched.contentHash,
      rawR2Key: fetched.r2Key,
    })
    await pulseOps.recordSourceSuccess({
      sourceId: source.id,
      checkedAt,
      nextCheckAt: nextCheckAt(checkedAt, source),
      changed: snapshot.inserted,
      ...(fetched.etag !== undefined ? { etag: fetched.etag } : {}),
      ...(fetched.lastModified !== undefined ? { lastModified: fetched.lastModified } : {}),
    })

    if (!snapshot.inserted) {
      await ops.recordReconcileSourceOutcome({ runId: message.runId, changed: false })
      return
    }

    const relatedRules = rulesForSource(source.id)
    const ai = createAI(env)
    const aiResult = await ai.runPrompt(
      RULE_REGISTRY_RECONCILE_PROMPT,
      {
        source: {
          id: source.id,
          title: source.title,
          url: source.url,
          jurisdiction: source.jurisdiction,
          sourceType: source.sourceType,
          acquisitionMethod: source.acquisitionMethod,
          domains: source.domains,
          entityApplicability: source.entityApplicability,
        },
        existingRules: relatedRules.map(ruleSummary),
        sourceText: fetched.body.slice(0, 24_000),
      },
      RuleRegistryReconcileOutputSchema,
      { taskKind: 'pulse' },
    )
    const recorded = await recordAnalyzerRun({
      env,
      source,
      snapshotId: snapshot.snapshot.id,
      contentHash: fetched.contentHash,
      result: aiResult,
    })

    if (!aiResult.result) {
      await ops.recordChangeProposal({
        runId: message.runId,
        sourceId: source.id,
        sourceSnapshotId: snapshot.snapshot.id,
        contentHash: fetched.contentHash,
        rawR2Key: fetched.r2Key,
        proposalType: 'analyzer_failed',
        status: 'open',
        affectedRuleIds: relatedRules.map((rule) => rule.id),
        aiOutputId: recorded.aiOutputId,
        failureReason: aiResult.refusal?.message ?? 'Rule registry reconcile analyzer failed.',
      })
      await ops.recordReconcileSourceOutcome({
        runId: message.runId,
        changed: true,
        proposalCreated: true,
      })
      return
    }

    await ops.recordChangeProposal({
      runId: message.runId,
      sourceId: source.id,
      sourceSnapshotId: snapshot.snapshot.id,
      contentHash: fetched.contentHash,
      rawR2Key: fetched.r2Key,
      proposalType: proposalTypeForOutput(aiResult.result),
      status: outputStatus(aiResult.result),
      affectedRuleIds: aiResult.result.affectedRuleIds,
      proposedRuleIds: aiResult.result.proposedRuleIds,
      normalizedRuleJson: aiResult.result.normalizedRuleJson ?? null,
      diffSummary: aiResult.result.diffSummary,
      aiOutputId: recorded.aiOutputId,
    })
    await ops.recordReconcileSourceOutcome({
      runId: message.runId,
      changed: true,
      proposalCreated: aiResult.result.classification !== 'no_rule_change',
    })
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Rule source reconcile failed.'
    await pulseOps.recordSourceFailure({
      sourceId: source.id,
      nextCheckAt: nextCheckAt(new Date(), source),
      error: messageText,
    })
    await ops.recordReconcileSourceOutcome({
      runId: message.runId,
      failed: true,
      errorText: messageText,
    })
    recordPulseMetric('rule.registry.reconcile.source_failed', {
      sourceId: source.id,
      error: messageText,
    })
  }
}

export async function consumeRuleRegistryCatalogSync(
  _message: RuleRegistryCatalogSyncMessage,
  env: Env,
): Promise<{ newRules: number; changedRules: number; draftMessages: number }> {
  const db = createDb(env.DB)
  const rulesRepo = makeRulesRepo(db, 'global')
  const ops = makeRulesOpsRepo(db)
  const oldTemplates = new Map((await ops.listGlobalRuleTemplates()).map((row) => [row.id, row]))
  const sources = listRuleSources()
  const rules = listObligationRules({ includeCandidates: true })

  const newRules: Array<{ ruleId: string; templateVersion: number }> = []
  const changedRules: Array<{ ruleId: string; templateVersion: number }> = []
  for (const rule of rules) {
    if (rule.status === 'deprecated') continue
    const old = oldTemplates.get(rule.id)
    if (!old) {
      newRules.push({ ruleId: rule.id, templateVersion: rule.version })
      continue
    }
    if (old.version < rule.version) {
      changedRules.push({ ruleId: rule.id, templateVersion: rule.version })
    }
  }

  await rulesRepo.upsertGlobalTemplates({
    sources: sources.map(sourceTemplateInput),
    rules: rules.map(ruleTemplateInput),
  })

  await ops.fanoutReviewTasks({ newRules, changedRules })

  const changedOrNewIds = new Set([...newRules, ...changedRules].map((rule) => rule.ruleId))
  const sourceDefinedRules = rules.filter(isSourceDefinedRule)
  const contextRefByRuleId = new Map(
    sourceDefinedRules.flatMap((rule) => {
      const sourceId = primarySourceIdForRule(rule)
      return sourceId
        ? [
            [
              rule.id,
              cachedConcreteDraftKey({
                ruleId: rule.id,
                ruleVersion: rule.version,
                sourceId,
              }),
            ] as const,
          ]
        : []
    }),
  )
  const cachedRuns = await makeAiRepo(db, 'global').findSuccessfulGlobalRunsByContextRefs({
    kind: 'rule_concrete_draft',
    inputContextRefs: Array.from(contextRefByRuleId.values()),
    promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
  })
  const cachedContextRefs = new Set(cachedRuns.map((run) => run.inputContextRef).filter(Boolean))
  const draftTargets = sourceDefinedRules.filter((rule) => {
    const contextRef = contextRefByRuleId.get(rule.id)
    if (!contextRef) return false
    return changedOrNewIds.has(rule.id) || !cachedContextRefs.has(contextRef)
  })
  await Promise.all(
    draftTargets.flatMap((rule) => {
      const sourceId = primarySourceIdForRule(rule)
      return sourceId
        ? [
            env.PULSE_QUEUE.send({
              type: RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE,
              ruleId: rule.id,
              sourceId,
              reason: 'prewarm',
            } satisfies RuleConcreteDraftGenerateMessage),
          ]
        : []
    }),
  )

  recordPulseMetric('rule.registry.catalog_sync', {
    newRules: newRules.length,
    changedRules: changedRules.length,
    draftMessages: draftTargets.length,
  })
  return {
    newRules: newRules.length,
    changedRules: changedRules.length,
    draftMessages: draftTargets.length,
  }
}
