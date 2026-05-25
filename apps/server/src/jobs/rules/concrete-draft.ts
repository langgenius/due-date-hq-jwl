import { createDb, makeAiRepo, makePulseOpsRepo, makeRuleConcreteDraftRepo } from '@duedatehq/db'
import {
  findRuleById,
  listObligationRules,
  listRuleSources,
  type ObligationRule,
  type RuleSource,
} from '@duedatehq/core/rules'
import type { Env } from '../../env'
import {
  cachedConcreteDraftKey,
  generateConcreteDraft,
  RULE_CONCRETE_DRAFT_PROMPT,
} from '../../procedures/rules/concrete-draft'
import { recordPulseMetric } from '../pulse/metrics'

export const RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE = 'rule.concreteDraft.generate'
const DEFAULT_PREWARM_LIMIT = 25

export type RuleConcreteDraftGenerateReason = 'prewarm' | 'source_changed' | 'manual'

export interface RuleConcreteDraftGenerateMessage {
  type: typeof RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE
  ruleId: string
  sourceId: string
  sourceSignalId?: string
  reason: RuleConcreteDraftGenerateReason
}

interface ConcreteDraftTarget {
  rule: ObligationRule
  source: RuleSource
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isRuleConcreteDraftGenerateMessage(
  value: unknown,
): value is RuleConcreteDraftGenerateMessage {
  if (!isRecord(value)) return false
  if (value.type !== RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE) return false
  if (typeof value.ruleId !== 'string') return false
  if (typeof value.sourceId !== 'string') return false
  if (value.sourceSignalId !== undefined && typeof value.sourceSignalId !== 'string') return false
  return (
    value.reason === 'prewarm' || value.reason === 'source_changed' || value.reason === 'manual'
  )
}

function isSourceDefinedRule(rule: Pick<ObligationRule, 'dueDateLogic'>): boolean {
  return rule.dueDateLogic.kind === 'source_defined_calendar'
}

function primarySourceIdForRule(rule: Pick<ObligationRule, 'sourceIds' | 'evidence'>) {
  return rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? null
}

function listConcreteDraftTargets(): ConcreteDraftTarget[] {
  const sourcesById = new Map(listRuleSources().map((source) => [source.id, source]))
  return listObligationRules({ includeCandidates: true }).flatMap((rule) => {
    if (!isSourceDefinedRule(rule)) return []
    const sourceId = primarySourceIdForRule(rule)
    const source = sourceId ? sourcesById.get(sourceId) : null
    return source ? [{ rule, source }] : []
  })
}

export function ruleConcreteDraftMessagesForSource(
  sourceId: string,
  reason: RuleConcreteDraftGenerateReason,
  opts?: { sourceSignalId?: string },
): RuleConcreteDraftGenerateMessage[] {
  return listConcreteDraftTargets()
    .filter((target) => target.source.id === sourceId)
    .map((target) => {
      const message: RuleConcreteDraftGenerateMessage = {
        type: RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE,
        ruleId: target.rule.id,
        sourceId: target.source.id,
        reason,
      }
      if (opts?.sourceSignalId) message.sourceSignalId = opts.sourceSignalId
      return message
    })
}

export async function enqueueMissingRuleConcreteDrafts(
  env: Pick<Env, 'DB' | 'PULSE_QUEUE'>,
  opts: { limit?: number } = {},
): Promise<{ inspected: number; cached: number; enqueued: number }> {
  const targets = listConcreteDraftTargets()
  if (targets.length === 0) return { inspected: 0, cached: 0, enqueued: 0 }

  const aiRepo = makeAiRepo(createDb(env.DB), 'global')
  const contextRefs = targets.map((target) =>
    cachedConcreteDraftKey({
      ruleId: target.rule.id,
      ruleVersion: target.rule.version,
      sourceId: target.source.id,
    }),
  )
  const cachedRuns = await aiRepo.findSuccessfulGlobalRunsByContextRefs({
    kind: 'rule_concrete_draft',
    inputContextRefs: contextRefs,
    promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
  })
  const cachedContextRefs = new Set(cachedRuns.map((run) => run.inputContextRef).filter(Boolean))
  const missingTargets = targets
    .filter(
      (target) =>
        !cachedContextRefs.has(
          cachedConcreteDraftKey({
            ruleId: target.rule.id,
            ruleVersion: target.rule.version,
            sourceId: target.source.id,
          }),
        ),
    )
    .slice(0, opts.limit ?? DEFAULT_PREWARM_LIMIT)

  await Promise.all(
    missingTargets.map((target) =>
      env.PULSE_QUEUE.send({
        type: RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE,
        ruleId: target.rule.id,
        sourceId: target.source.id,
        reason: 'prewarm',
      } satisfies RuleConcreteDraftGenerateMessage),
    ),
  )

  return {
    inspected: targets.length,
    cached: cachedContextRefs.size,
    enqueued: missingTargets.length,
  }
}

export async function enqueueRuleConcreteDraftsForSource(
  queue: Pick<Queue, 'send'>,
  input: {
    sourceId: string
    sourceSignalId?: string
    reason: RuleConcreteDraftGenerateReason
  },
): Promise<number> {
  const messages = ruleConcreteDraftMessagesForSource(
    input.sourceId,
    input.reason,
    input.sourceSignalId ? { sourceSignalId: input.sourceSignalId } : undefined,
  )
  await Promise.all(messages.map((message) => queue.send(message)))
  return messages.length
}

export async function consumeRuleConcreteDraftGenerate(
  message: RuleConcreteDraftGenerateMessage,
  env: Env,
): Promise<void> {
  const startedAt = Date.now()
  const rule = findRuleById(message.ruleId)
  const source = listRuleSources().find((item) => item.id === message.sourceId) ?? null
  if (!rule || !source || !isSourceDefinedRule(rule)) {
    recordPulseMetric('rule.concrete_draft.generate_skipped', {
      ruleId: message.ruleId,
      sourceId: message.sourceId,
      reason: message.reason,
      skipped: !rule ? 'rule_not_found' : !source ? 'source_not_found' : 'not_source_defined',
    })
    return
  }

  const db = createDb(env.DB)
  const pulseRepo = makePulseOpsRepo(db)
  const sourceSignal = message.sourceSignalId
    ? await pulseRepo.getSourceSignal(message.sourceSignalId)
    : null
  const latestSourceSnapshot = await pulseRepo.getLatestSourceSnapshotBySourceId(source.id)

  try {
    await generateConcreteDraft({
      env,
      aiRepo: makeAiRepo(db, 'global'),
      concreteDraftRepo: makeRuleConcreteDraftRepo(db),
      scope: 'global',
      userId: null,
      base: rule,
      source,
      sourceSignal,
      latestSourceSnapshot,
    })
    recordPulseMetric('rule.concrete_draft.generate_success', {
      ruleId: rule.id,
      sourceId: source.id,
      reason: message.reason,
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    recordPulseMetric('rule.concrete_draft.generate_failure', {
      ruleId: rule.id,
      sourceId: source.id,
      reason: message.reason,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'AI concrete draft generation failed.',
    })
  }
}
