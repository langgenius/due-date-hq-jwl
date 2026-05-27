import { parseAsStringLiteral, type inferParserType } from 'nuqs'
import type { FirmPublic } from '@duedatehq/contracts'
import { activePracticeLimitForPlan, planHasFeature } from '@duedatehq/core/plan-entitlements'

const BILLING_PLANS = ['solo', 'pro', 'team', 'firm'] as const
const SELF_SERVE_BILLING_PLANS = ['solo', 'pro', 'team'] as const
const BILLING_INTERVALS = ['monthly', 'yearly'] as const
const SELF_SERVE_BILLING_PLAN = 'pro' as const

export type BillingPlan = (typeof BILLING_PLANS)[number]
export type SelfServeBillingPlan = (typeof SELF_SERVE_BILLING_PLANS)[number]
export type BillingInterval = (typeof BILLING_INTERVALS)[number]

interface BillingPlanPricing {
  monthlyPriceUsd: number
  yearlyMonthlyPriceUsd: number
  yearlyAnnualPriceUsd: number
  yearlySavingsUsd: number
}

const BILLING_PLAN_PRICING = {
  solo: {
    monthlyPriceUsd: 39,
    yearlyMonthlyPriceUsd: 31,
    yearlyAnnualPriceUsd: 372,
    yearlySavingsUsd: 96,
  },
  pro: {
    monthlyPriceUsd: 79,
    yearlyMonthlyPriceUsd: 63,
    yearlyAnnualPriceUsd: 756,
    yearlySavingsUsd: 192,
  },
  team: {
    monthlyPriceUsd: 149,
    yearlyMonthlyPriceUsd: 119,
    yearlyAnnualPriceUsd: 1428,
    yearlySavingsUsd: 360,
  },
  firm: {
    monthlyPriceUsd: 399,
    yearlyMonthlyPriceUsd: 319,
    yearlyAnnualPriceUsd: 3828,
    yearlySavingsUsd: 960,
  },
} as const satisfies Record<BillingPlan, BillingPlanPricing>

export const billingSearchParamsParsers = {
  plan: parseAsStringLiteral(BILLING_PLANS).withDefault(SELF_SERVE_BILLING_PLAN),
  interval: parseAsStringLiteral(BILLING_INTERVALS).withDefault('monthly'),
} as const

type BillingSearchParams = inferParserType<typeof billingSearchParamsParsers>

export function isBillingPlan(value: string | null): value is BillingPlan {
  return value === 'solo' || value === 'pro' || value === 'team' || value === 'firm'
}

export function isBillingInterval(value: string | null): value is BillingInterval {
  return value === 'monthly' || value === 'yearly'
}

export function billingPlanMonthlyEquivalent(plan: BillingPlan, interval: BillingInterval): number {
  const pricing = BILLING_PLAN_PRICING[plan]
  return interval === 'yearly' ? pricing.yearlyMonthlyPriceUsd : pricing.monthlyPriceUsd
}

export function billingPlanYearlyAnnualPrice(plan: BillingPlan): number {
  return BILLING_PLAN_PRICING[plan].yearlyAnnualPriceUsd
}

export function billingPlanYearlySavings(plan: BillingPlan): number {
  return BILLING_PLAN_PRICING[plan].yearlySavingsUsd
}

export function subscriptionBillingIntervalToUi(value: string | null | undefined): BillingInterval {
  return value === 'year' ? 'yearly' : 'monthly'
}

export function serializeBillingQuery(
  path: string,
  params: Pick<BillingSearchParams, 'plan' | 'interval'>,
): string {
  const url = new URL(path, 'https://duedatehq.local')
  url.searchParams.set('plan', params.plan)
  url.searchParams.set('interval', params.interval)
  return `${url.pathname}${url.search}${url.hash}`
}

export function billingPlanHref(plan: BillingPlan, interval: BillingInterval): string {
  return serializeBillingQuery('/billing/checkout', { plan, interval })
}

export function isSelfServeBillingPlan(plan: BillingPlan): plan is SelfServeBillingPlan {
  return (SELF_SERVE_BILLING_PLANS as readonly BillingPlan[]).includes(plan)
}

export function paidPlanActive(firm: FirmPublic | null | undefined): boolean {
  return firm ? planHasFeature(firm.plan, 'sharedDeadlineOperations') : false
}

export function ownedActiveFirms(firms: ReadonlyArray<FirmPublic>): FirmPublic[] {
  return firms.filter(
    (firm) => firm.role === 'owner' && firm.status === 'active' && firm.deletedAt === null,
  )
}

export function activeFirmEntitlementLimit(firms: ReadonlyArray<FirmPublic>): number | null {
  const owned = ownedActiveFirms(firms)
  if (owned.some((firm) => activePracticeLimitForPlan(firm.plan) === null)) {
    return null
  }
  return owned.reduce(
    (limit, firm) => Math.max(limit, activePracticeLimitForPlan(firm.plan) ?? 1),
    1,
  )
}

export function canCreateAdditionalFirm(firms: ReadonlyArray<FirmPublic>): boolean {
  const owned = ownedActiveFirms(firms)
  const limit = activeFirmEntitlementLimit(firms)
  return limit === null || owned.length < limit
}
