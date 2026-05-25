import { describe, expect, it, vi } from 'vitest'
import { SMART_PRIORITY_DEFAULT_PROFILE, type FirmPublic } from '@duedatehq/contracts'
import {
  ONBOARDING_MIGRATION_TARGET,
  activateOrCreateOnboardingFirm,
  postOnboardingTarget,
  type OnboardingFirmGateway,
} from './onboarding-firm-flow'

function firm(overrides: Partial<FirmPublic> = {}): FirmPublic {
  return {
    id: 'firm_1',
    name: 'Bright CPA',
    slug: 'bright-cpa',
    plan: 'solo',
    seatLimit: 1,
    timezone: 'America/New_York',
    internalDeadlineOffsetDays: 14,
    status: 'active',
    role: 'owner',
    ownerUserId: 'user_1',
    coordinatorCanSeeDollars: false,
    smartPriorityProfile: SMART_PRIORITY_DEFAULT_PROFILE,
    openObligationCount: 0,
    isCurrent: false,
    createdAt: '2026-04-29T00:00:00.000Z',
    updatedAt: '2026-04-29T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }
}

function gateway(overrides: Partial<OnboardingFirmGateway> = {}): OnboardingFirmGateway {
  return {
    listMine: vi.fn(async () => []),
    switchActive: vi.fn(async ({ firmId }) => firm({ id: firmId, isCurrent: true })),
    create: vi.fn(async ({ name, timezone, internalDeadlineOffsetDays }) =>
      firm({ id: 'firm_new', name, timezone, internalDeadlineOffsetDays }),
    ),
    activateOnboardingJurisdictions: vi.fn(async ({ states }) => ({
      selectedStates: states,
      jurisdictions: states.length > 0 ? ['FED', ...states] : [],
      activatedCount: states.length > 0 ? 10 : 0,
      skippedCount: 0,
      reviewRequiredCount: states.length > 0 ? 3 : 0,
      reviewRequiredJurisdictions: states.length > 0 ? states : [],
      generatedObligationCount: 0,
    })),
    ...overrides,
  }
}

describe('activateOrCreateOnboardingFirm', () => {
  it('switches through the firms gateway when an active business firm exists', async () => {
    const existing = firm({ id: 'firm_existing' })
    const api = gateway({
      listMine: vi.fn(async () => [existing]),
    })

    const result = await activateOrCreateOnboardingFirm({ gateway: api, name: 'New Name' })

    expect(result).toEqual({
      kind: 'reused',
      firm: firm({ id: 'firm_existing', isCurrent: true }),
    })
    expect(api.switchActive).toHaveBeenCalledWith({ firmId: 'firm_existing' })
    expect(api.create).not.toHaveBeenCalled()
    expect(api.activateOnboardingJurisdictions).not.toHaveBeenCalled()
  })

  it('creates through the firms gateway when no active business firm exists', async () => {
    const api = gateway()

    const result = await activateOrCreateOnboardingFirm({ gateway: api, name: 'New Practice' })

    expect(result).toEqual({
      kind: 'created',
      firm: firm({ id: 'firm_new', name: 'New Practice' }),
      ruleActivation: null,
    })
    expect(api.create).toHaveBeenCalledWith({
      name: 'New Practice',
      timezone: 'America/New_York',
      internalDeadlineOffsetDays: 14,
    })
    expect(api.switchActive).not.toHaveBeenCalled()
    expect(api.activateOnboardingJurisdictions).not.toHaveBeenCalled()
  })

  it('activates selected state and federal rules after creating a new firm', async () => {
    const api = gateway()

    const result = await activateOrCreateOnboardingFirm({
      gateway: api,
      name: 'New Practice',
      selectedRuleStates: ['CA', 'TX'],
    })

    expect(result).toEqual({
      kind: 'created',
      firm: firm({ id: 'firm_new', name: 'New Practice' }),
      ruleActivation: {
        selectedStates: ['CA', 'TX'],
        jurisdictions: ['FED', 'CA', 'TX'],
        activatedCount: 10,
        skippedCount: 0,
        reviewRequiredCount: 3,
        reviewRequiredJurisdictions: ['CA', 'TX'],
        generatedObligationCount: 0,
      },
    })
    expect(api.activateOnboardingJurisdictions).toHaveBeenCalledWith({
      states: ['CA', 'TX'],
    })
  })

  it('does not activate onboarding rules when an existing firm is reused', async () => {
    const existing = firm({ id: 'firm_existing' })
    const api = gateway({
      listMine: vi.fn(async () => [existing]),
    })

    await activateOrCreateOnboardingFirm({
      gateway: api,
      name: 'New Name',
      selectedRuleStates: ['CA'],
    })

    expect(api.activateOnboardingJurisdictions).not.toHaveBeenCalled()
  })

  it('does not create a duplicate firm when listing existing firms fails', async () => {
    const api = gateway({
      listMine: vi.fn(async () => {
        throw new Error('list failed')
      }),
    })

    await expect(
      activateOrCreateOnboardingFirm({ gateway: api, name: 'New Practice' }),
    ).rejects.toThrow('list failed')
    expect(api.create).not.toHaveBeenCalled()
    expect(api.switchActive).not.toHaveBeenCalled()
  })

  it('routes newly created practices into the migration activation route', () => {
    expect(postOnboardingTarget({ kind: 'created', firm: firm(), ruleActivation: null }, '/')).toBe(
      ONBOARDING_MIGRATION_TARGET,
    )
  })

  it('carries source-defined rule review needs into the activation route', () => {
    expect(
      postOnboardingTarget(
        {
          kind: 'created',
          firm: firm(),
          ruleActivation: {
            selectedStates: ['AK'],
            jurisdictions: ['FED', 'AK'],
            activatedCount: 13,
            skippedCount: 0,
            reviewRequiredCount: 5,
            reviewRequiredJurisdictions: ['FED', 'AK'],
            generatedObligationCount: 0,
          },
        },
        '/',
      ),
    ).toBe('/migration/new?source=onboarding&ruleReview=5&ruleReviewJur=FED%2CAK')
  })

  it('preserves the original redirect when onboarding reused an existing practice', () => {
    expect(postOnboardingTarget({ kind: 'reused', firm: firm() }, '/deadlines')).toBe('/deadlines')
  })
})
