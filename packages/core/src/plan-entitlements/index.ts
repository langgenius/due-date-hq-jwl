export const PLAN_IDS = ['free', 'solo', 'pro', 'team', 'firm'] as const
export const AI_TASK_KINDS = ['migration', 'brief', 'pulse', 'insight', 'readiness'] as const

export type BillingPlan = (typeof PLAN_IDS)[number]
export type AiTaskKind = (typeof AI_TASK_KINDS)[number]

export type PlanFeatureKey =
  | 'sharedDeadlineOperations'
  | 'teamManagerOperations'
  | 'productionPulse'
  | 'priorityPulseMatching'
  | 'fullAlertHistory'
  | 'auditExport'
  | 'productionMigrationAi'
  | 'guidedMigrationReview'
  | 'multiplePractices'
  | 'apiAccess'
  | 'sso'
  | 'customCoverage'
  | 'customAi'

export interface PlanEntitlements {
  plan: BillingPlan
  label: 'Free' | 'Solo' | 'Pro' | 'Team' | 'Enterprise'
  seatLimit: number
  /**
   * Max active (non-deleted) clients a firm may create. `null` = unlimited
   * (the internal/custom `firm` plan). Enforced forward-only at client
   * creation — never retroactively against existing clients. See
   * apps/server/src/procedures/clients/index.ts.
   */
  clientLimit: number | null
  activePracticeLimit: number | null
  /**
   * Interactive AI fair-use ceiling (brief/insight/readiness/pulse), per day.
   * NOT a marketed tier lever — an invisible backstop. The `migration` task
   * kind uses a separate per-client budget; see packages/ai/src/budget.ts.
   */
  aiDailyRunLimit: number
  features: Record<PlanFeatureKey, boolean>
}

function features(enabled: readonly PlanFeatureKey[]): Record<PlanFeatureKey, boolean> {
  const enabledSet = new Set(enabled)
  return {
    sharedDeadlineOperations: enabledSet.has('sharedDeadlineOperations'),
    teamManagerOperations: enabledSet.has('teamManagerOperations'),
    productionPulse: enabledSet.has('productionPulse'),
    priorityPulseMatching: enabledSet.has('priorityPulseMatching'),
    fullAlertHistory: enabledSet.has('fullAlertHistory'),
    auditExport: enabledSet.has('auditExport'),
    productionMigrationAi: enabledSet.has('productionMigrationAi'),
    guidedMigrationReview: enabledSet.has('guidedMigrationReview'),
    multiplePractices: enabledSet.has('multiplePractices'),
    apiAccess: enabledSet.has('apiAccess'),
    sso: enabledSet.has('sso'),
    customCoverage: enabledSet.has('customCoverage'),
    customAi: enabledSet.has('customAi'),
  }
}

export const PLAN_ENTITLEMENTS = {
  // Free funnel tier: full Pulse + matching on a small real book, so the
  // "aha" lands on the user's own data. Limited only by client count,
  // alert-history window, and advanced (bulk/export/delegation) actions —
  // never by hiding a currently-active alert.
  free: {
    plan: 'free',
    label: 'Free',
    seatLimit: 1,
    clientLimit: 10,
    activePracticeLimit: 1,
    aiDailyRunLimit: 30,
    // Pulse + (uniform) matching are core. priorityPulseMatching is NOT here:
    // it gates the Team priority-review *workflow*, not match quality.
    features: features(['productionPulse']),
  },
  solo: {
    plan: 'solo',
    label: 'Solo',
    seatLimit: 1,
    clientLimit: 100,
    activePracticeLimit: 1,
    aiDailyRunLimit: 100,
    features: features(['productionPulse', 'fullAlertHistory']),
  },
  pro: {
    plan: 'pro',
    label: 'Pro',
    seatLimit: 3,
    clientLimit: 300,
    activePracticeLimit: 1,
    aiDailyRunLimit: 100,
    features: features([
      'sharedDeadlineOperations',
      'productionPulse',
      'fullAlertHistory',
      'productionMigrationAi',
    ]),
  },
  team: {
    plan: 'team',
    label: 'Team',
    seatLimit: 10,
    clientLimit: 1000,
    activePracticeLimit: 1,
    aiDailyRunLimit: 100,
    features: features([
      'sharedDeadlineOperations',
      'teamManagerOperations',
      'productionPulse',
      'priorityPulseMatching',
      'fullAlertHistory',
      'auditExport',
      'productionMigrationAi',
      'guidedMigrationReview',
    ]),
  },
  // Internal / custom / unlimited plan — not shown on the pricing cards
  // ("Need more? Contact us"). Kept so negotiated deals have a plan to sit on.
  firm: {
    plan: 'firm',
    label: 'Enterprise',
    seatLimit: 10,
    clientLimit: null,
    activePracticeLimit: null,
    aiDailyRunLimit: 500,
    features: features([
      'sharedDeadlineOperations',
      'teamManagerOperations',
      'productionPulse',
      'priorityPulseMatching',
      'fullAlertHistory',
      'auditExport',
      'productionMigrationAi',
      'guidedMigrationReview',
      'multiplePractices',
      'apiAccess',
      'sso',
      'customCoverage',
      'customAi',
    ]),
  },
} as const satisfies Record<BillingPlan, PlanEntitlements>

export function isBillingPlan(value: string | null | undefined): value is BillingPlan {
  return (
    value === 'free' || value === 'solo' || value === 'pro' || value === 'team' || value === 'firm'
  )
}

export function getPlanEntitlements(plan: BillingPlan): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan]
}

export function planSeatLimit(plan: BillingPlan): number {
  return getPlanEntitlements(plan).seatLimit
}

export function planClientLimit(plan: BillingPlan): number | null {
  return getPlanEntitlements(plan).clientLimit
}

export function planAiDailyRunLimit(plan: BillingPlan): number {
  return getPlanEntitlements(plan).aiDailyRunLimit
}

export function activePracticeLimitForPlan(plan: BillingPlan): number | null {
  return getPlanEntitlements(plan).activePracticeLimit
}

export function planHasFeature(plan: BillingPlan, feature: PlanFeatureKey): boolean {
  return getPlanEntitlements(plan).features[feature]
}
