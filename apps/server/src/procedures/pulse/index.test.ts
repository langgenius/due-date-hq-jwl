/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused procedure-context test doubles only implement fields the Pulse
 * request-review helper reads.
 */
import { describe, expect, it, vi } from 'vitest'
import type { MemberRow } from '@duedatehq/ports/tenants'
import type { ContextVars, Env } from '../../env'
import type { RpcContext } from '../_context'
import { requestPulseReview } from './index'

type Role = 'owner' | 'partner' | 'manager' | 'preparer' | 'coordinator'
type Status = 'matched' | 'dismissed' | 'reverted'
type SourceStatus = 'approved' | 'source_revoked'
type EnqueueEmailInput = {
  externalId: string
  type: 'pulse_review_request'
  payloadJson: {
    recipients: string[]
    subject: string
    text: string
  }
}

function member(role: Role, overrides: Partial<MemberRow> = {}): MemberRow {
  return {
    id: `member_${role}`,
    organizationId: 'firm_1',
    userId: `user_${role}`,
    name:
      role === 'preparer'
        ? 'Avery Patel'
        : role === 'partner'
          ? 'Priya Shah'
          : role === 'manager'
            ? 'Miguel Chen'
            : 'Sarah',
    email: `${role}@example.com`,
    image: null,
    role,
    status: 'active' as const,
    createdAt: new Date('2026-05-03T00:00:00.000Z'),
    ...overrides,
  }
}

function pulseDetail(status: Status = 'matched', sourceStatus: SourceStatus = 'approved') {
  return {
    alert: {
      id: 'alert_1',
      pulseId: 'pulse_1',
      status,
      sourceStatus,
      changeKind: 'deadline_shift',
      actionMode: 'due_date_overlay',
      firmImpact: 'matched',
      title: 'IRS CA storm relief',
      source: 'IRS Disaster Relief',
      sourceUrl: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
      summary: 'IRS extends selected filing deadlines for Los Angeles County.',
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      matchedCount: 1,
      needsReviewCount: 0,
      applyReadiness: { status: 'ready', missing: [] },
      duplicateSourceSnapshotCount: 0,
      confidence: 0.94,
      isSample: true,
      jurisdiction: 'CA',
    },
    jurisdiction: 'CA',
    counties: ['Los Angeles'],
    forms: ['1065'],
    entityTypes: ['llc'],
    originalDueDate: new Date('2026-03-15T00:00:00.000Z'),
    newDueDate: new Date('2026-10-15T00:00:00.000Z'),
    effectiveFrom: null,
    sourceExcerpt: 'Tax relief applies.',
    reviewedAt: null,
    applyReadiness: { status: 'ready', missing: [] },
    affectedClients: [],
  }
}

function contextFor(
  role: Role,
  detail = pulseDetail(),
  plan: 'solo' | 'pro' | 'team' | 'firm' = 'team',
) {
  const actor = member(role)
  const notificationsCreate = vi.fn(async () => ({ id: crypto.randomUUID() }))
  const notificationsEnqueueEmail = vi.fn(async (_input: EnqueueEmailInput) => ({
    id: 'email_1',
    created: true,
  }))
  const emailQueueSend = vi.fn(async () => undefined)
  const auditWrite = vi.fn(async () => ({ id: 'audit_1' }))
  const getDetail = vi.fn(async () => detail)
  const requestPriorityReview = vi.fn(async () => ({
    id: 'priority_1',
    alertId: 'alert_1',
    pulseId: 'pulse_1',
    status: 'open',
    priorityScore: 30,
    priorityReasons: [],
    selectedObligationIds: [],
    confirmedObligationIds: [],
    excludedObligationIds: [],
    note: null,
    requestedBy: actor.userId,
    reviewedBy: null,
    reviewedAt: null,
  }))
  const listMembers = vi.fn(async () => [
    member('owner'),
    member('partner'),
    member('manager'),
    member('preparer'),
    member('coordinator'),
  ])
  const findMembership = vi.fn(async () => actor)

  const context: RpcContext = {
    env: {
      ENV: 'production',
      APP_URL: 'https://app.test',
      EMAIL_QUEUE: { send: emailQueueSend },
    } as unknown as Env,
    request: new Request('https://app.test/rpc/pulse/requestReview'),
    vars: {
      requestId: 'req_1',
      tenantContext: {
        firmId: 'firm_1',
        timezone: 'America/New_York',
        plan,
        seatLimit: 5,
        status: 'active',
        internalDeadlineOffsetDays: 14,
        monitoringStartDate: '2026-05-29',
        ownerUserId: 'user_owner',
        coordinatorCanSeeDollars: false,
      },
      userId: actor.userId,
      scoped: {
        firmId: 'firm_1',
        pulse: { getDetail, requestPriorityReview },
        notifications: { create: notificationsCreate, enqueueEmail: notificationsEnqueueEmail },
        audit: { write: auditWrite },
      } as unknown as NonNullable<ContextVars['scoped']>,
      members: {
        findMembership,
        listMembers,
      } as unknown as NonNullable<ContextVars['members']>,
    },
  }

  return {
    context,
    notificationsCreate,
    notificationsEnqueueEmail,
    emailQueueSend,
    auditWrite,
    getDetail,
    requestPriorityReview,
    listMembers,
  }
}

describe('requestPulseReview', () => {
  it.each([
    ['owner', 2],
    ['partner', 2],
    ['manager', 2],
    ['preparer', 3],
  ] as const)(
    'lets an active %s request review and notifies Partner/Manager',
    async (role, count) => {
      const {
        context,
        notificationsCreate,
        notificationsEnqueueEmail,
        emailQueueSend,
        auditWrite,
      } = contextFor(role)

      const result = await requestPulseReview({
        context,
        alertId: 'alert_1',
        note: '  Please confirm LA County applicability.  ',
      })

      expect(result).toEqual({ notificationCount: count, emailCount: count, auditId: 'audit_1' })
      expect(notificationsCreate).toHaveBeenCalledTimes(count)
      expect(notificationsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'pulse_alert',
          entityType: 'pulse_firm_alert',
          entityId: 'alert_1',
          href: '/rules?tab=pulse&alert=alert_1',
          title: 'Review requested: IRS CA storm relief',
          body: expect.stringContaining('Note: Please confirm LA County applicability.'),
        }),
      )
      expect(notificationsEnqueueEmail).toHaveBeenCalledTimes(1)
      const emailInput = notificationsEnqueueEmail.mock.calls[0]?.[0]
      expect(emailInput).toBeDefined()
      if (!emailInput) throw new Error('Expected Pulse review email to be queued.')
      expect(emailInput).toEqual(
        expect.objectContaining({
          externalId: expect.stringMatching(/^pulse-review:firm_1:alert_1:/),
          type: 'pulse_review_request',
        }),
      )
      expect(emailInput.payloadJson.recipients).toHaveLength(count)
      expect(emailInput.payloadJson.subject).toBe('Review requested: IRS CA storm relief')
      expect(emailInput.payloadJson.text).toContain(
        'requested Partner/Manager review for this Pulse',
      )
      expect(emailInput.payloadJson.text).toContain(
        'https://app.test/rules?tab=pulse&alert=alert_1',
      )
      expect(emailInput.payloadJson.text).toContain('Note: Please confirm LA County applicability.')
      expect(emailQueueSend).toHaveBeenCalledWith({ type: 'email.flush' })
      expect(auditWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: `user_${role}`,
          entityType: 'pulse_firm_alert',
          entityId: 'alert_1',
          action: 'pulse.review_requested',
          after: expect.objectContaining({
            recipientCount: count,
            emailCount: count,
            note: 'Please confirm LA County applicability.',
          }),
        }),
      )
    },
  )

  it('rejects coordinators', async () => {
    const { context, notificationsCreate, notificationsEnqueueEmail, auditWrite } =
      contextFor('coordinator')

    await expect(requestPulseReview({ context, alertId: 'alert_1' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
    expect(notificationsCreate).not.toHaveBeenCalled()
    expect(notificationsEnqueueEmail).not.toHaveBeenCalled()
    expect(auditWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.denied',
        reason: 'role',
      }),
    )
    expect(auditWrite).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'pulse.review_requested' }),
    )
  })

  it('allows Pro users to request Pulse review', async () => {
    const {
      context,
      notificationsCreate,
      notificationsEnqueueEmail,
      auditWrite,
      requestPriorityReview,
    } = contextFor('preparer', pulseDetail(), 'pro')

    await expect(requestPulseReview({ context, alertId: 'alert_1' })).resolves.toEqual(
      expect.objectContaining({ notificationCount: 3, emailCount: 3 }),
    )
    expect(notificationsCreate).toHaveBeenCalledTimes(3)
    expect(notificationsEnqueueEmail).toHaveBeenCalledTimes(1)
    expect(requestPriorityReview).not.toHaveBeenCalled()
    expect(auditWrite).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'pulse.review_requested' }),
    )
  })

  it('creates a Team priority review task when review is requested', async () => {
    const { context, requestPriorityReview } = contextFor('preparer', pulseDetail(), 'team')

    await requestPulseReview({ context, alertId: 'alert_1' })

    expect(requestPriorityReview).toHaveBeenCalledWith({
      alertId: 'alert_1',
      userId: 'user_preparer',
    })
  })

  it.each([
    ['dismissed', 'approved'],
    ['reverted', 'approved'],
    ['matched', 'source_revoked'],
  ] as const)('rejects unavailable alert state %s/%s', async (status, sourceStatus) => {
    const { context, notificationsCreate, notificationsEnqueueEmail, auditWrite } = contextFor(
      'preparer',
      pulseDetail(status, sourceStatus),
    )

    await expect(requestPulseReview({ context, alertId: 'alert_1' })).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    expect(notificationsCreate).not.toHaveBeenCalled()
    expect(notificationsEnqueueEmail).not.toHaveBeenCalled()
    expect(auditWrite).not.toHaveBeenCalled()
  })
})
