import { SMART_PRIORITY_DEFAULT_PROFILE, type FirmPublic } from '@duedatehq/contracts'
import { describe, expect, it } from 'vitest'
import {
  activeFirmEntitlementLimit,
  billingPlanMonthlyEquivalent,
  billingPlanYearlyAnnualPrice,
  billingPlanYearlySavings,
  canCreateAdditionalFirm,
  isSelfServeBillingPlan,
  ownedActiveFirms,
  paidPlanActive,
  serializeBillingQuery,
  subscriptionBillingIntervalToUi,
} from './model'

function firm(overrides: Partial<FirmPublic> = {}): FirmPublic {
  return {
    id: 'firm_1',
    name: 'Test Firm',
    slug: 'test-firm',
    plan: 'solo',
    seatLimit: 1,
    timezone: 'America/New_York',
    internalDeadlineOffsetDays: 14,
    monitoringStartDate: '2026-05-02',
    status: 'active',
    role: 'owner',
    ownerUserId: 'user_1',
    coordinatorCanSeeDollars: false,
    smartPriorityProfile: SMART_PRIORITY_DEFAULT_PROFILE,
    openObligationCount: 0,
    isCurrent: true,
    createdAt: '2026-05-02T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }
}

describe('billing firm entitlement model', () => {
  it('counts only owned active firms', () => {
    expect(
      ownedActiveFirms([
        firm({ id: 'owned_active' }),
        firm({ id: 'member_active', role: 'manager' }),
        firm({ id: 'owned_deleted', deletedAt: '2026-05-02T00:00:00.000Z' }),
        firm({ id: 'owned_suspended', status: 'suspended' }),
      ]).map((item) => item.id),
    ).toEqual(['owned_active'])
  })

  it('allows first owned firm and blocks extra self-serve firms', () => {
    expect(canCreateAdditionalFirm([])).toBe(true)
    expect(activeFirmEntitlementLimit([firm({ plan: 'solo' })])).toBe(1)
    expect(canCreateAdditionalFirm([firm({ plan: 'solo' })])).toBe(false)
    expect(canCreateAdditionalFirm([firm({ plan: 'pro' })])).toBe(false)
    expect(canCreateAdditionalFirm([firm({ plan: 'team' })])).toBe(false)
  })

  it('treats the Enterprise tier as contract-limited for additional firms', () => {
    expect(activeFirmEntitlementLimit([firm({ plan: 'firm' })])).toBeNull()
    expect(canCreateAdditionalFirm([firm({ plan: 'firm' })])).toBe(true)
  })

  it('treats Solo, Pro, and Team as self-serve checkout plans', () => {
    expect(isSelfServeBillingPlan('solo')).toBe(true)
    expect(isSelfServeBillingPlan('pro')).toBe(true)
    expect(isSelfServeBillingPlan('team')).toBe(true)
    expect(isSelfServeBillingPlan('firm')).toBe(false)
  })

  it('recognizes Team as a paid operations plan', () => {
    expect(paidPlanActive(firm({ plan: 'solo' }))).toBe(false)
    expect(paidPlanActive(firm({ plan: 'pro' }))).toBe(true)
    expect(paidPlanActive(firm({ plan: 'team' }))).toBe(true)
    expect(paidPlanActive(firm({ plan: 'firm' }))).toBe(true)
  })

  it('serializes checkout links with the selected billing interval', () => {
    expect(serializeBillingQuery('/billing/checkout', { plan: 'pro', interval: 'yearly' })).toBe(
      '/billing/checkout?plan=pro&interval=yearly',
    )
  })

  it('keeps annual plan math aligned with public pricing', () => {
    expect(billingPlanMonthlyEquivalent('solo', 'monthly')).toBe(39)
    expect(billingPlanMonthlyEquivalent('solo', 'yearly')).toBe(31)
    expect(billingPlanMonthlyEquivalent('pro', 'yearly')).toBe(63)
    expect(billingPlanYearlyAnnualPrice('team')).toBe(1428)
    expect(billingPlanYearlySavings('pro')).toBe(192)
  })

  it('maps provider billing intervals to billing UI intervals', () => {
    expect(subscriptionBillingIntervalToUi('month')).toBe('monthly')
    expect(subscriptionBillingIntervalToUi('year')).toBe('yearly')
    expect(subscriptionBillingIntervalToUi(null)).toBe('monthly')
  })
})
