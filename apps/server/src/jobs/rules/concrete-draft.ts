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

// A source-defined-rule draft that has failed this many times within the window
// is abandoned (not re-enqueued) until those failures age out — this breaks the
// every-catalog-sync re-enqueue loop when the AI provider is down or the system
// budget is exhausted, while still auto-recovering once it succeeds again.
export const CONCRETE_DRAFT_ABANDON_FAILURES = 3
export const CONCRETE_DRAFT_ABANDON_WINDOW_MS = 6 * 60 * 60 * 1000
// The abandon window alone still duty-cycles under a PERSISTENT outage (failures
// age out every 6h → every rule re-fails ~10x/day forever). Two more layers:
// a health gate over recent rule_concrete_draft outcomes (mirrors the pulse
// extract-retry sweep) that shrinks the sweep to a single canary while the
// provider is down, and a longer "park" for rules that keep failing on their
// own (bad source text) even when the provider is healthy.
export const CONCRETE_DRAFT_HEALTH_WINDOW_MS = 6 * 60 * 60 * 1000
const CONCRETE_DRAFT_HEALTH_MIN_FAILURES = 3
export const CONCRETE_DRAFT_PARK_FAILURES = 12
export const CONCRETE_DRAFT_PARK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Healthy by default when there's no recent data, so a quiet/new system still
 * backfills promptly; any recent success reopens the sweep; only "several
 * recent failures and zero successes" closes it.
 */
export function isConcreteDraftAiHealthy(health: { ok: number; failed: number }): boolean {
  return health.ok > 0 || health.failed < CONCRETE_DRAFT_HEALTH_MIN_FAILURES
}

// Structural slice of makeAiRepo so tests can pass plain vi.fn() doubles.
interface ConcreteDraftSweepAiRepo {
  findSuccessfulGlobalRunsByContextRefs(input: {
    kind: 'rule_concrete_draft'
    inputContextRefs: readonly string[]
    promptVersion: string
  }): Promise<Array<{ inputContextRef: string | null }>>
  findGlobalContextRefsWithRecentFailures(input: {
    kind: 'rule_concrete_draft'
    inputContextRefs: readonly string[]
    promptVersion: string
    minFailures: number
    since: Date
  }): Promise<Set<string>>
  countGlobalRunOutcomes(input: {
    kind: 'rule_concrete_draft'
    promptVersion: string
    since: Date
  }): Promise<{ ok: number; failed: number }>
}

/**
 * Shared target selection for both concrete-draft sweeps (catalog sync and the
 * prewarm helper): drop cached/abandoned/parked refs, then health-gate the rest.
 * `alwaysRetry` items (changed/new rules — their source moved) bypass every
 * filter including the gate. When gated, exactly ONE non-alwaysRetry candidate
 * goes out as the canary that re-detects provider recovery; abandon/park
 * naturally rotate which rule serves as canary.
 */
export async function selectConcreteDraftSweepTargets<T>(input: {
  aiRepo: ConcreteDraftSweepAiRepo
  items: ReadonlyArray<{ item: T; contextRef: string; alwaysRetry: boolean }>
  now: Date
}): Promise<{
  targets: T[]
  cached: number
  gated: boolean
  health: { ok: number; failed: number }
}> {
  if (input.items.length === 0) {
    return { targets: [], cached: 0, gated: false, health: { ok: 0, failed: 0 } }
  }
  const inputContextRefs = input.items.map((entry) => entry.contextRef)
  const [cachedRuns, abandoned, parked, health] = await Promise.all([
    input.aiRepo.findSuccessfulGlobalRunsByContextRefs({
      kind: 'rule_concrete_draft',
      inputContextRefs,
      promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
    }),
    input.aiRepo.findGlobalContextRefsWithRecentFailures({
      kind: 'rule_concrete_draft',
      inputContextRefs,
      promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
      minFailures: CONCRETE_DRAFT_ABANDON_FAILURES,
      since: new Date(input.now.getTime() - CONCRETE_DRAFT_ABANDON_WINDOW_MS),
    }),
    input.aiRepo.findGlobalContextRefsWithRecentFailures({
      kind: 'rule_concrete_draft',
      inputContextRefs,
      promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
      minFailures: CONCRETE_DRAFT_PARK_FAILURES,
      since: new Date(input.now.getTime() - CONCRETE_DRAFT_PARK_WINDOW_MS),
    }),
    input.aiRepo.countGlobalRunOutcomes({
      kind: 'rule_concrete_draft',
      promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
      since: new Date(input.now.getTime() - CONCRETE_DRAFT_HEALTH_WINDOW_MS),
    }),
  ])
  const cachedContextRefs = new Set(
    cachedRuns.map((run) => run.inputContextRef).filter((ref): ref is string => ref !== null),
  )
  const eligible = input.items.filter(
    (entry) =>
      entry.alwaysRetry ||
      (!cachedContextRefs.has(entry.contextRef) &&
        !abandoned.has(entry.contextRef) &&
        !parked.has(entry.contextRef)),
  )
  if (isConcreteDraftAiHealthy(health)) {
    return {
      targets: eligible.map((entry) => entry.item),
      cached: cachedContextRefs.size,
      gated: false,
      health,
    }
  }
  const canary = eligible.find((entry) => !entry.alwaysRetry)
  return {
    targets: [...eligible.filter((entry) => entry.alwaysRetry), ...(canary ? [canary] : [])].map(
      (entry) => entry.item,
    ),
    cached: cachedContextRefs.size,
    gated: true,
    health,
  }
}

export type RuleConcreteDraftGenerateReason = 'prewarm' | 'source_changed' | 'manual'

export interface RuleConcreteDraftGenerateMessage {
  type: typeof RULE_CONCRETE_DRAFT_GENERATE_MESSAGE_TYPE
  ruleId: string
  sourceId: string
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
      return message
    })
}

export async function enqueueMissingRuleConcreteDrafts(
  env: Pick<Env, 'DB' | 'PULSE_QUEUE'>,
  opts: { limit?: number; now?: Date } = {},
): Promise<{ inspected: number; cached: number; enqueued: number; gated: boolean }> {
  const targets = listConcreteDraftTargets()
  if (targets.length === 0) return { inspected: 0, cached: 0, enqueued: 0, gated: false }

  const aiRepo = makeAiRepo(createDb(env.DB), 'global')
  const selection = await selectConcreteDraftSweepTargets({
    aiRepo,
    items: targets.map((target) => ({
      item: target,
      contextRef: cachedConcreteDraftKey({
        ruleId: target.rule.id,
        ruleVersion: target.rule.version,
        sourceId: target.source.id,
      }),
      alwaysRetry: false,
    })),
    now: opts.now ?? new Date(),
  })
  const missingTargets = selection.targets.slice(0, opts.limit ?? DEFAULT_PREWARM_LIMIT)

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
    cached: selection.cached,
    enqueued: missingTargets.length,
    gated: selection.gated,
  }
}

export async function enqueueRuleConcreteDraftsForSource(
  queue: Pick<Queue, 'send'>,
  input: {
    sourceId: string
    reason: RuleConcreteDraftGenerateReason
  },
): Promise<number> {
  const messages = ruleConcreteDraftMessagesForSource(input.sourceId, input.reason)
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
