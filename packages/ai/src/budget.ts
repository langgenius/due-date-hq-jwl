import {
  planAiDailyRunLimit,
  planClientLimit,
  type AiTaskKind,
  type BillingPlan,
} from '@duedatehq/core/plan-entitlements'

export interface AiBudgetKv {
  get(key: string): Promise<string | null>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
}

export interface AiBudgetInput {
  kv?: AiBudgetKv
  firmId?: string
  plan?: BillingPlan
  taskKind: AiTaskKind
  // Accepted for backwards-compat with the routing plumbing (migration service ->
  // router -> index). No longer used by the budget calc — the solo onboarding
  // boost was replaced by the per-client `migration` bucket below.
  firmCreatedAt?: Date | string
  migrationOnboardingCompleted?: boolean
  now?: Date
}

export type AiBudgetResult =
  | { allowed: true; used: number; limit: number; key: string | null }
  | { allowed: false; used: number; limit: number; key: string }

const DAY_TTL_SECONDS = 36 * 60 * 60
const MONTH_TTL_SECONDS = 32 * 24 * 60 * 60

/** Onboarding/import AI scales with the firm's client allotment (~1-2 parses per entity). */
const MIGRATION_BUDGET_PER_CLIENT = 2

/**
 * Two invisible fair-use buckets (never a marketed tier lever):
 *  - `migration` (onboarding/import parsing): ~2x the plan's clientLimit over a
 *    rolling month. `null` clientLimit (custom `firm` plan) = unlimited.
 *  - everything else (interactive brief/insight/readiness/pulse): a flat,
 *    generous daily ceiling that normal use never reaches.
 */
export function aiBudgetLimit(input: Pick<AiBudgetInput, 'plan' | 'taskKind'>): number {
  const plan = input.plan ?? 'pro'
  if (input.taskKind === 'migration') {
    const clientLimit = planClientLimit(plan)
    return clientLimit === null
      ? Number.POSITIVE_INFINITY
      : clientLimit * MIGRATION_BUDGET_PER_CLIENT
  }
  return planAiDailyRunLimit(plan)
}

function budgetPeriodKey(taskKind: AiTaskKind, now: Date): string {
  // migration accumulates over a rolling ~month (YYYY-MM); interactive resets
  // daily (YYYY-MM-DD).
  return taskKind === 'migration' ? now.toISOString().slice(0, 7) : now.toISOString().slice(0, 10)
}

function budgetTtlSeconds(taskKind: AiTaskKind): number {
  return taskKind === 'migration' ? MONTH_TTL_SECONDS : DAY_TTL_SECONDS
}

export async function consumeAiBudget(input: AiBudgetInput): Promise<AiBudgetResult> {
  const limit = aiBudgetLimit(input)
  if (!input.kv || !input.firmId || limit === Number.POSITIVE_INFINITY) {
    return { allowed: true, used: 0, limit, key: null }
  }

  const now = input.now ?? new Date()
  const key = `ai-budget:${input.firmId}:${budgetPeriodKey(input.taskKind, now)}:${input.taskKind}`
  const used = Number.parseInt((await input.kv.get(key)) ?? '0', 10)
  const current = Number.isFinite(used) ? used : 0
  if (current >= limit) {
    return { allowed: false, used: current, limit, key }
  }

  const next = current + 1
  await input.kv.put(key, String(next), { expirationTtl: budgetTtlSeconds(input.taskKind) })
  return { allowed: true, used: next, limit, key }
}
