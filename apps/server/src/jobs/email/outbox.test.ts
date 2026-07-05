/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused D1/Resend doubles only implement the chain methods used by this worker slice.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../env'
import { flushEmailOutbox } from './outbox'

const { sendMock, dbMocks } = vi.hoisted(() => {
  type TestOutboxRow = {
    id: string
    firmId: string
    externalId: string
    type: string
    status: string
    payloadJson: unknown
    createdAt: Date
    sentAt: Date | null
    failedAt: Date | null
    failureReason: string | null
  }
  const where = vi.fn(async () => undefined)
  const set = vi.fn(() => ({ where }))
  const update = vi.fn(() => ({ set }))
  let rows: TestOutboxRow[] = [
    {
      id: 'outbox_1',
      firmId: 'firm_1',
      externalId: 'pulse:firm_1:pulse_1:1',
      type: 'pulse_digest',
      status: 'pending',
      payloadJson: {
        event: 'pulse_applied',
        recipients: ['owner@example.com'],
        summary: 'Pulse deadline update applied.',
        obligations: [
          {
            clientName: 'Arbor & Vale LLC',
            beforeDueDate: '2026-03-15',
            afterDueDate: '2026-10-15',
          },
        ],
      },
      createdAt: new Date('2026-04-29T00:00:00.000Z'),
      sentAt: null,
      failedAt: null,
      failureReason: null,
    },
  ]
  const limit = vi.fn(async () => rows)
  const orderBy = vi.fn(() => ({ limit }))
  // `.where(...)` is used by two queries: the outbox poll (chains to
  // .orderBy().limit()) and reminderLinkageByOutboxId (awaited directly). The
  // digest/pulse rows here have no linked client reminder, so the linkage
  // query resolves to []. Return a thenable-with-.orderBy to satisfy both.
  const whereSelect = vi.fn(() => Object.assign(Promise.resolve([] as unknown[]), { orderBy }))
  const from = vi.fn(() => ({ where: whereSelect }))
  const select = vi.fn(() => ({ from }))
  const insertValues = vi.fn(async () => undefined)
  const insert = vi.fn(() => ({ values: insertValues }))
  const createDb = vi.fn(() => ({ select, update, insert }))
  return {
    sendMock: vi.fn(async () => ({ data: { id: 'email_1' }, error: null })),
    dbMocks: {
      createDb,
      update,
      set,
      where,
      select,
      from,
      whereSelect,
      orderBy,
      limit,
      setRows: (nextRows: typeof rows) => {
        rows = nextRows
      },
    },
  }
})

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: sendMock,
    }
  },
}))

vi.mock('@duedatehq/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duedatehq/db')>()
  return {
    ...actual,
    createDb: dbMocks.createDb,
  }
})

describe('flushEmailOutbox', () => {
  beforeEach(() => {
    sendMock.mockClear()
    Object.values(dbMocks).forEach((mock) => {
      if (typeof mock === 'function' && 'mockClear' in mock) mock.mockClear()
    })
  })

  it('sends pending Pulse digests when recipients are present', async () => {
    const result = await flushEmailOutbox({
      DB: {} as D1Database,
      EMAIL_FROM: 'noreply@example.com',
      RESEND_API_KEY: 're_test',
    } satisfies Pick<Env, 'DB' | 'EMAIL_FROM' | 'RESEND_API_KEY'>)

    expect(result).toEqual({ sent: 1, failed: 0, skipped: 0 })
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: ['owner@example.com'],
        subject: 'Pulse deadline update applied',
      }),
      { idempotencyKey: 'email-outbox/outbox_1' },
    )
    expect(dbMocks.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'sending' }))
    expect(dbMocks.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent' }))
  })

  it('renders approved Pulse digests with current/new due dates and review flags', async () => {
    dbMocks.setRows([
      {
        id: 'outbox_2',
        firmId: 'firm_1',
        externalId: 'pulse-approved:firm_1:pulse_1:1',
        type: 'pulse_digest',
        status: 'pending',
        payloadJson: {
          event: 'pulse_approved',
          recipients: ['manager@example.com'],
          summary: 'Pulse deadline update available.',
          obligations: [
            {
              clientName: 'Bright Studio S-Corp',
              currentDueDate: '2026-03-15',
              newDueDate: '2026-10-15',
              matchStatus: 'needs_review',
            },
          ],
        },
        createdAt: new Date('2026-04-29T00:00:00.000Z'),
        sentAt: null,
        failedAt: null,
        failureReason: null,
      },
    ])

    await flushEmailOutbox({
      DB: {} as D1Database,
      EMAIL_FROM: 'noreply@example.com',
      RESEND_API_KEY: 're_test',
    } satisfies Pick<Env, 'DB' | 'EMAIL_FROM' | 'RESEND_API_KEY'>)

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['manager@example.com'],
        subject: 'Pulse deadline update available',
        text: expect.stringContaining(
          'Bright Studio S-Corp: 2026-03-15 -> 2026-10-15 (needs review)',
        ),
      }),
      { idempotencyKey: 'email-outbox/outbox_2' },
    )
  })

  it('sends Pulse review request emails with the queued subject and text', async () => {
    dbMocks.setRows([
      {
        id: 'outbox_3',
        firmId: 'firm_1',
        externalId: 'pulse-review:firm_1:alert_1:req_1',
        type: 'pulse_review_request',
        status: 'pending',
        payloadJson: {
          recipients: ['owner@example.com', 'manager@example.com'],
          subject: 'Review requested: IRS CA storm relief',
          text: 'Avery Patel requested Owner/Manager review for this Pulse.',
        },
        createdAt: new Date('2026-05-03T00:00:00.000Z'),
        sentAt: null,
        failedAt: null,
        failureReason: null,
      },
    ])

    await flushEmailOutbox({
      DB: {} as D1Database,
      EMAIL_FROM: 'noreply@example.com',
      RESEND_API_KEY: 're_test',
    } satisfies Pick<Env, 'DB' | 'EMAIL_FROM' | 'RESEND_API_KEY'>)

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['owner@example.com', 'manager@example.com'],
        subject: 'Review requested: IRS CA storm relief',
        text: 'Avery Patel requested Owner/Manager review for this Pulse.',
      }),
      { idempotencyKey: 'email-outbox/outbox_3' },
    )
  })

  it('sanitizes tag values to Resend-safe characters', async () => {
    dbMocks.setRows([
      {
        id: 'outbox_4',
        firmId: 'firm_1',
        externalId: 'morning-digest:firm.1:user_1:2026-07-03',
        type: 'morning_digest',
        status: 'pending',
        payloadJson: { recipients: ['owner@example.com'] },
        createdAt: new Date('2026-07-03T11:00:00.000Z'),
        sentAt: null,
        failedAt: null,
        failureReason: null,
      },
    ])

    const result = await flushEmailOutbox({
      DB: {} as D1Database,
      EMAIL_FROM: 'noreply@example.com',
      RESEND_API_KEY: 're_test',
    } satisfies Pick<Env, 'DB' | 'EMAIL_FROM' | 'RESEND_API_KEY'>)

    expect(result).toEqual({ sent: 1, failed: 0, skipped: 0 })
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: [
          { name: 'outbox_id', value: 'outbox_4' },
          { name: 'external_id', value: 'morning-digest_firm_1_user_1_2026-07-03' },
        ],
      }),
      { idempotencyKey: 'email-outbox/outbox_4' },
    )
  })

  it('defers rate-limited sends back to pending instead of failing them', async () => {
    dbMocks.setRows([
      {
        id: 'outbox_5',
        firmId: 'firm_1',
        externalId: 'morning-digest:firm_1:user_1:2026-07-03',
        type: 'morning_digest',
        status: 'pending',
        payloadJson: { recipients: ['owner@example.com'] },
        createdAt: new Date('2026-07-03T11:00:00.000Z'),
        sentAt: null,
        failedAt: null,
        failureReason: null,
      },
    ])
    sendMock.mockResolvedValueOnce({
      data: null,
      error: {
        name: 'rate_limit_exceeded',
        message: 'Too many requests. You can only make 10 requests per second.',
      },
    } as never)

    const result = await flushEmailOutbox({
      DB: {} as D1Database,
      EMAIL_FROM: 'noreply@example.com',
      RESEND_API_KEY: 're_test',
    } satisfies Pick<Env, 'DB' | 'EMAIL_FROM' | 'RESEND_API_KEY'>)

    expect(result).toEqual({ sent: 0, failed: 0, skipped: 1 })
    expect(dbMocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        failureReason: expect.stringContaining('Will retry'),
      }),
    )
    expect(dbMocks.set).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
  })

  it('permanently fails sends Resend rejects as invalid', async () => {
    dbMocks.setRows([
      {
        id: 'outbox_6',
        firmId: 'firm_1',
        externalId: 'morning-digest:firm_1:user_1:2026-07-04',
        type: 'morning_digest',
        status: 'pending',
        payloadJson: { recipients: ['owner@example.com'] },
        createdAt: new Date('2026-07-04T11:00:00.000Z'),
        sentAt: null,
        failedAt: null,
        failureReason: null,
      },
    ])
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { name: 'validation_error', message: 'Invalid `from` field.' },
    } as never)

    const result = await flushEmailOutbox({
      DB: {} as D1Database,
      EMAIL_FROM: 'noreply@example.com',
      RESEND_API_KEY: 're_test',
    } satisfies Pick<Env, 'DB' | 'EMAIL_FROM' | 'RESEND_API_KEY'>)

    expect(result).toEqual({ sent: 0, failed: 1, skipped: 0 })
    expect(dbMocks.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', failureReason: 'Invalid `from` field.' }),
    )
  })
})
