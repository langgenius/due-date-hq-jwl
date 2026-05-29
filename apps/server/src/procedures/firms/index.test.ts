/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused procedure tests use a narrow session/firms context double.
 */
import { call } from '@orpc/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SMART_PRIORITY_DEFAULT_PROFILE, type FirmCreateInput } from '@duedatehq/contracts'
import type { RpcContext } from '../_context'
import { canCreateAdditionalFirm, canReadSmartPriorityProfile, firmsHandlers } from './index'

const authMocks = vi.hoisted(() => ({
  createOrganization: vi.fn(),
}))

vi.mock('../../auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth')>()
  return {
    ...actual,
    createWorkerAuth: vi.fn(() => ({
      api: {
        createOrganization: authMocks.createOrganization,
      },
    })),
  }
})

type FirmRow = {
  id: string
  name: string
  slug: string
  plan: 'solo' | 'pro' | 'team' | 'firm'
  seatLimit: number
  timezone: string
  internalDeadlineOffsetDays: number
  monitoringStartDate: string
  status: 'active' | 'suspended' | 'deleted'
  role: 'owner' | 'partner' | 'manager' | 'preparer' | 'coordinator'
  ownerUserId: string
  coordinatorCanSeeDollars: boolean
  smartPriorityProfile: typeof SMART_PRIORITY_DEFAULT_PROFILE
  openObligationCount: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

function firmRow(overrides: Partial<FirmRow> = {}): FirmRow {
  const now = new Date('2026-05-29T00:00:00.000Z')
  return {
    id: 'firm_new',
    name: 'Bright CPA',
    slug: 'bright-cpa',
    plan: 'solo',
    seatLimit: 1,
    timezone: 'America/New_York',
    internalDeadlineOffsetDays: 14,
    monitoringStartDate: '2026-05-29',
    status: 'active',
    role: 'owner',
    ownerUserId: 'user_1',
    coordinatorCanSeeDollars: false,
    smartPriorityProfile: SMART_PRIORITY_DEFAULT_PROFILE,
    openObligationCount: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

function createContext(row = firmRow()) {
  const firms = {
    listOwnedActive: vi.fn(async () => []),
    updateProfile: vi.fn(async () => undefined),
    setActiveSession: vi.fn(async () => undefined),
    findActiveForUser: vi.fn(async () => row),
    writeAudit: vi.fn(async () => ({ id: 'audit_1' })),
  }
  const context = {
    env: {},
    request: new Request('https://app.test/rpc/firms/create'),
    vars: {
      requestId: 'req_1',
      userId: 'user_1',
      user: { id: 'user_1', email: 'owner@example.com', name: 'Owner' },
      session: { id: 'session_1', activeOrganizationId: null },
      firms,
      members: {},
    },
  } as unknown as RpcContext

  return { context, firms }
}

async function createFirm(input: Partial<FirmCreateInput>, row = firmRow()) {
  authMocks.createOrganization.mockResolvedValue({ id: row.id })
  const { context, firms } = createContext(row)
  const result = await call(
    firmsHandlers.create,
    {
      name: 'Bright CPA',
      timezone: 'America/New_York',
      internalDeadlineOffsetDays: 14,
      ...input,
    },
    { context },
  )
  return { result, firms }
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('firm creation entitlement', () => {
  it('allows the first owned active firm', () => {
    expect(canCreateAdditionalFirm([])).toBe(true)
  })

  it('blocks extra self-serve firms for Solo, Pro, and Team owners', () => {
    expect(canCreateAdditionalFirm([{ plan: 'solo' }])).toBe(false)
    expect(canCreateAdditionalFirm([{ plan: 'pro' }])).toBe(false)
    expect(canCreateAdditionalFirm([{ plan: 'team' }])).toBe(false)
  })

  it('allows additional firms for Firm-plan owners', () => {
    expect(canCreateAdditionalFirm([{ plan: 'firm' }])).toBe(true)
  })
})

describe('firm public smart priority visibility', () => {
  it('only exposes the profile to owners', () => {
    expect(
      canReadSmartPriorityProfile({ role: 'owner', ownerUserId: 'user_owner' }, 'user_owner'),
    ).toBe(true)
    expect(
      canReadSmartPriorityProfile({ role: 'manager', ownerUserId: 'user_owner' }, 'user_manager'),
    ).toBe(false)
    expect(
      canReadSmartPriorityProfile({ role: 'preparer', ownerUserId: 'user_owner' }, 'user_preparer'),
    ).toBe(false)
    expect(
      canReadSmartPriorityProfile(
        { role: 'coordinator', ownerUserId: 'user_owner' },
        'user_coordinator',
      ),
    ).toBe(false)
  })
})

describe('firm create monitoring start date', () => {
  it('writes the selected monitoring start date and returns it publicly', async () => {
    const { result, firms } = await createFirm(
      { monitoringStartDate: '2026-05-15' },
      firmRow({
        monitoringStartDate: '2026-05-15',
      }),
    )

    expect(firms.updateProfile).toHaveBeenCalledWith(
      'firm_new',
      expect.objectContaining({
        monitoringStartDate: '2026-05-15',
      }),
    )
    expect(result.monitoringStartDate).toBe('2026-05-15')
    expect(firms.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        after: expect.objectContaining({ monitoringStartDate: '2026-05-15' }),
      }),
    )
  })

  it('defaults the monitoring start date to today in the firm timezone', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T16:00:00.000Z'))

    const { firms } = await createFirm({}, firmRow())

    expect(firms.updateProfile).toHaveBeenCalledWith(
      'firm_new',
      expect.objectContaining({
        monitoringStartDate: '2026-05-29',
      }),
    )
  })

  it('rejects future monitoring start dates before creating the organization', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T16:00:00.000Z'))
    const { context, firms } = createContext()

    await expect(
      call(
        firmsHandlers.create,
        {
          name: 'Bright CPA',
          timezone: 'America/New_York',
          internalDeadlineOffsetDays: 14,
          monitoringStartDate: '2026-05-30',
        },
        { context },
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(authMocks.createOrganization).not.toHaveBeenCalled()
    expect(firms.updateProfile).not.toHaveBeenCalled()
  })
})
