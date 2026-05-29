/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Test stubs deliberately cast minimal-shape fixtures into the rich
 * better-auth payload types. Building real values would mean reproducing
 * the entire User / Member / Organization shapes for every test, which
 * adds noise without catching anything the typed factory doesn't already
 * enforce.
 */
import { describe, expect, it, vi } from 'vitest'
import { APIError } from 'better-auth/api'
import type { Db } from '@duedatehq/db'
import { buildAllowUserToCreateOrganization, buildOrganizationHooks } from './organization-hooks'

/**
 * Pure-function tests for the organization-plugin hook factory.
 *
 * Plan deviation note (recorded in dev-log 2026-04-24): the plan's
 * `test-auth-hook` todo named `packages/auth/src/auth.test.ts` as the home
 * for these assertions, but the factory itself lives in apps/server because
 * it imports the firm_profile schema (packages/auth must NOT depend on
 * @duedatehq/db — see scripts/check-dep-direction.mjs). Putting the test
 * next to its subject keeps both sides on the same side of the dep DAG.
 */

function makeFakeDb(opts: { insertImpl?: () => Promise<void> } = {}): {
  db: Db
  insertSpy: ReturnType<typeof vi.fn>
  valuesSpy: ReturnType<typeof vi.fn>
} {
  const valuesSpy = vi.fn(opts.insertImpl ?? (async () => undefined))
  const insertSpy = vi.fn(() => ({ values: valuesSpy }))
  // Cast through unknown — the real Db has many more methods than each
  // focused hook test needs.
  const db = { insert: insertSpy } as unknown as Db
  return { db, insertSpy, valuesSpy }
}

function makeOwnerBootstrapDb(memberCount: number): Db {
  const limit = vi.fn(async () => [{ value: memberCount }])
  const where = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ where }))
  const select = vi.fn(() => ({ from }))
  return { select } as unknown as Db
}

function makeOrganizationCreationGateDb(
  rows: Array<{ plan: 'solo' | 'pro' | 'team' | 'firm' }>,
): Db {
  const where = vi.fn(async () => rows)
  const innerJoin = vi.fn(() => ({ where }))
  const from = vi.fn(() => ({ innerJoin }))
  const select = vi.fn(() => ({ from }))
  return { select } as unknown as Db
}

describe('buildOrganizationHooks', () => {
  describe('afterCreateOrganization', () => {
    it('inserts a P0-shaped firm_profile row keyed by organization.id', async () => {
      const { db, insertSpy, valuesSpy } = makeFakeDb()
      const hooks = buildOrganizationHooks(db)

      await hooks.afterCreateOrganization!({
        organization: {
          id: 'org_abc',
          name: 'Bright CPA Practice',
          slug: 'bright-cpa-x1y2z3',
          createdAt: new Date(),
          metadata: null,
        } as never,
        member: { id: 'mem_1', userId: 'user_1', organizationId: 'org_abc' } as never,
        user: {
          id: 'user_1',
          name: 'Alex Chen',
          email: 'alex@bright-cpa.com',
        } as never,
      })

      expect(insertSpy).toHaveBeenCalledTimes(1)
      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'org_abc',
          name: 'Bright CPA Practice',
          plan: 'solo',
          seatLimit: 1,
          timezone: 'America/New_York',
          internalDeadlineOffsetDays: 14,
          monitoringStartDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          ownerUserId: 'user_1',
          status: 'active',
        }),
      )
      // createdAt / updatedAt must be Dates (not undefined / strings) so the
      // drizzle integer-timestamp serialization picks the same path as the
      // explicit defaults in the schema.
      const args = valuesSpy.mock.calls[0]?.[0] as { createdAt: Date; updatedAt: Date }
      expect(args.createdAt).toBeInstanceOf(Date)
      expect(args.updatedAt).toBeInstanceOf(Date)
    })

    it('swallows insert errors and logs them so onboarding submit still resolves', async () => {
      const error = new Error('boom: simulated D1 failure')
      const { db } = makeFakeDb({
        insertImpl: () => {
          throw error
        },
      })
      const hooks = buildOrganizationHooks(db)
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        await expect(
          hooks.afterCreateOrganization!({
            organization: { id: 'org_x', name: 'Other Practice' } as never,
            member: {} as never,
            user: { id: 'user_2' } as never,
          }),
        ).resolves.toBeUndefined()

        expect(errorSpy).toHaveBeenCalledWith(
          '[firm_profile.afterCreateOrganization] insert failed',
          expect.objectContaining({
            orgId: 'org_x',
            userId: 'user_2',
            message: 'boom: simulated D1 failure',
          }),
        )
      } finally {
        errorSpy.mockRestore()
      }
    })
  })

  describe('member guards', () => {
    it('rejects unknown roles with APIError(FORBIDDEN)', async () => {
      const { db } = makeFakeDb()
      const hooks = buildOrganizationHooks(db)

      const promise = hooks.beforeAddMember!({
        member: { userId: 'user_3', organizationId: 'org_x', role: 'member' },
        organization: { id: 'org_x', name: 'X' } as never,
        user: { id: 'user_3' } as never,
      })

      await expect(promise).rejects.toBeInstanceOf(APIError)
      await expect(promise).rejects.toMatchObject({
        // better-auth's APIError exposes the status string we passed in.
        message: expect.stringContaining('Unsupported member role'),
      })
    })

    it('allows the creator owner bootstrap role to pass through', async () => {
      const db = makeOwnerBootstrapDb(0)
      const hooks = buildOrganizationHooks(db)

      await expect(
        hooks.beforeAddMember!({
          member: { userId: 'user_4', organizationId: 'org_y', role: 'owner' },
          organization: { id: 'org_y', name: 'Y' } as never,
          user: { id: 'user_4' } as never,
        }),
      ).resolves.toBeUndefined()
    })

    it('rejects adding another owner after bootstrap', async () => {
      const db = makeOwnerBootstrapDb(1)
      const hooks = buildOrganizationHooks(db)

      await expect(
        hooks.beforeAddMember!({
          member: { userId: 'user_5', organizationId: 'org_y', role: 'owner' },
          organization: { id: 'org_y', name: 'Y' } as never,
          user: { id: 'user_5' } as never,
        }),
      ).rejects.toBeInstanceOf(APIError)
    })

    it('rejects owner role updates and removals until owner transfer lands', async () => {
      const { db } = makeFakeDb()
      const hooks = buildOrganizationHooks(db)

      await expect(
        hooks.beforeUpdateMemberRole!({
          member: { id: 'member_1', role: 'owner' } as never,
          newRole: 'manager',
          organization: { id: 'org_y', name: 'Y' } as never,
          user: { id: 'user_1' } as never,
        }),
      ).rejects.toBeInstanceOf(APIError)

      await expect(
        hooks.beforeRemoveMember!({
          member: { id: 'member_1', role: 'owner' } as never,
          organization: { id: 'org_y', name: 'Y' } as never,
          user: { id: 'user_1' } as never,
        }),
      ).rejects.toBeInstanceOf(APIError)
    })

    it('audits direct Better Auth invitation lifecycle hooks', async () => {
      const { db, valuesSpy } = makeFakeDb()
      const hooks = buildOrganizationHooks(db)

      await hooks.afterCreateInvitation!({
        invitation: {
          id: 'invitation_1',
          organizationId: 'org_y',
          email: 'maya@example.com',
          role: 'preparer',
        } as never,
        inviter: { id: 'user_owner' } as never,
        organization: { id: 'org_y', name: 'Y' } as never,
      })

      await hooks.afterCancelInvitation!({
        invitation: {
          id: 'invitation_1',
          organizationId: 'org_y',
          email: 'maya@example.com',
          role: 'preparer',
        } as never,
        cancelledBy: { id: 'user_owner' } as never,
        organization: { id: 'org_y', name: 'Y' } as never,
      })

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          firmId: 'org_y',
          actorId: 'user_owner',
          entityType: 'member_invitation',
          action: 'member.invited',
        }),
      )
      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          firmId: 'org_y',
          actorId: 'user_owner',
          entityType: 'member_invitation',
          action: 'member.invitation.canceled',
        }),
      )
    })
  })
})

describe('buildAllowUserToCreateOrganization', () => {
  it('allows first firm creation through Better Auth native endpoints', async () => {
    const gate = buildAllowUserToCreateOrganization(makeOrganizationCreationGateDb([]))

    await expect(gate({ id: 'user_1' })).resolves.toBe(true)
  })

  it('blocks extra Solo, Pro, and Team firm creation through Better Auth native endpoints', async () => {
    await expect(
      buildAllowUserToCreateOrganization(makeOrganizationCreationGateDb([{ plan: 'solo' }]))({
        id: 'user_1',
      }),
    ).resolves.toBe(false)
    await expect(
      buildAllowUserToCreateOrganization(makeOrganizationCreationGateDb([{ plan: 'pro' }]))({
        id: 'user_1',
      }),
    ).resolves.toBe(false)
    await expect(
      buildAllowUserToCreateOrganization(makeOrganizationCreationGateDb([{ plan: 'team' }]))({
        id: 'user_1',
      }),
    ).resolves.toBe(false)
  })

  it('allows Firm-plan owners to create additional firms by contract', async () => {
    const gate = buildAllowUserToCreateOrganization(
      makeOrganizationCreationGateDb([{ plan: 'firm' }]),
    )

    await expect(gate({ id: 'user_1' })).resolves.toBe(true)
  })
})
