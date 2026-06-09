import { ORPCError } from '@orpc/server'
import {
  planHasFeature,
  type BillingPlan,
  type PlanFeatureKey,
} from '@duedatehq/core/plan-entitlements'

export const PLAN_GATE_MESSAGES = {
  practiceAi: 'Practice AI workflows require Pro or above.',
  productionPulse: 'Production Pulse actions require Pro or above.',
  bulkAlertActions: 'Bulk alert actions require Pro or above.',
  priorityPulseMatching: 'Priority Pulse matching and review confirmation require Team or above.',
  guidedMigrationReview: 'Guided migration review requires Team or Enterprise.',
  productionMigrationAi: 'Production migration AI requires Pro or above.',
} as const

export function requirePlanFeature(
  plan: BillingPlan,
  feature: PlanFeatureKey,
  message: string,
): void {
  if (!planHasFeature(plan, feature)) {
    throw new ORPCError('FORBIDDEN', { message })
  }
}

export function requirePracticeAiWorkflow(plan: BillingPlan): void {
  requirePlanFeature(plan, 'sharedDeadlineOperations', PLAN_GATE_MESSAGES.practiceAi)
}

export function requireProductionPulse(plan: BillingPlan): void {
  requirePlanFeature(plan, 'productionPulse', PLAN_GATE_MESSAGES.productionPulse)
}

/**
 * Bulk alert actions (e.g. bulk dismiss) are a paid time-saver. Single
 * apply/dismiss stay open to all tiers via requireProductionPulse — only the
 * across-many-alerts shortcut is gated. Reuses `sharedDeadlineOperations`
 * (Pro+, "practice operations on deadlines").
 */
export function requireBulkAlertActions(plan: BillingPlan): void {
  requirePlanFeature(plan, 'sharedDeadlineOperations', PLAN_GATE_MESSAGES.bulkAlertActions)
}

export function requirePriorityPulseMatching(plan: BillingPlan): void {
  requirePlanFeature(plan, 'priorityPulseMatching', PLAN_GATE_MESSAGES.priorityPulseMatching)
}

export function requireGuidedMigrationReview(plan: BillingPlan): void {
  requirePlanFeature(plan, 'guidedMigrationReview', PLAN_GATE_MESSAGES.guidedMigrationReview)
}

export function requireProductionMigrationAi(plan: BillingPlan): void {
  requirePlanFeature(plan, 'productionMigrationAi', PLAN_GATE_MESSAGES.productionMigrationAi)
}
