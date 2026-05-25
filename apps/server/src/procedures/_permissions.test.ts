/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused procedure-context test doubles only implement fields the permission
 * helper reads.
 */
import { describe, expect, it, vi } from 'vitest'
import type { ContextVars, Env } from '../env'
import type { RpcContext } from './_context'
import {
  CLIENT_WRITE_ROLES,
  MIGRATION_REVERT_ROLES,
  MIGRATION_RUN_ROLES,
  OBLIGATION_STATUS_WRITE_ROLES,
  requireCurrentFirmOwner,
  requireCurrentFirmRole,
} from './_permissions'

function contextFor(role: string, status = 'active'): RpcContext {
  return {
    env: { ENV: 'production' } as Env,
    request: new Request('https://app.test/rpc/audit/list'),
    vars: {
      requestId: 'req_1',
      tenantContext: {
        firmId: 'firm_1',
        timezone: 'America/New_York',
        plan: 'solo',
        seatLimit: 1,
        status: 'active',
        internalDeadlineOffsetDays: 14,
        ownerUserId: 'user_1',
        coordinatorCanSeeDollars: false,
      },
      userId: 'user_1',
      scoped: { firmId: 'firm_1' } as NonNullable<ContextVars['scoped']>,
      members: {
        findMembership: vi.fn(async () => ({
          id: 'member_1',
          organizationId: 'firm_1',
          userId: 'user_1',
          name: 'Alex Chen',
          email: 'alex@example.com',
          image: null,
          role,
          status,
          createdAt: new Date('2026-04-29T00:00:00.000Z'),
        })),
      } as unknown as NonNullable<ContextVars['members']>,
    },
  }
}

describe('requireCurrentFirmRole', () => {
  it('allows active actors with an allowed role', async () => {
    await expect(
      requireCurrentFirmRole(contextFor('manager'), ['owner', 'manager']),
    ).resolves.toMatchObject({
      tenant: { firmId: 'firm_1' },
      userId: 'user_1',
    })
  })

  it('rejects active actors outside the allowed role set', async () => {
    await expect(
      requireCurrentFirmRole(contextFor('coordinator'), ['owner', 'manager']),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('rejects inactive actors even when the role matches', async () => {
    await expect(
      requireCurrentFirmRole(contextFor('owner', 'suspended'), ['owner']),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('allows owner-only gates by role without coupling project access to optional MFA', async () => {
    await expect(requireCurrentFirmOwner(contextFor('owner'))).resolves.toMatchObject({
      tenant: { firmId: 'firm_1' },
      userId: 'user_1',
    })
  })

  it('keeps write-role gates aligned with the current RBAC surface', () => {
    expect(CLIENT_WRITE_ROLES).toEqual(['owner', 'partner', 'manager', 'preparer'])
    expect(MIGRATION_RUN_ROLES).toEqual(['owner', 'partner', 'manager', 'preparer'])
    expect(MIGRATION_REVERT_ROLES).toEqual(['owner', 'partner', 'manager'])
    expect(OBLIGATION_STATUS_WRITE_ROLES).toEqual(['owner', 'partner', 'manager', 'preparer'])
  })
})
