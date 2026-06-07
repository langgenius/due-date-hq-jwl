import { describe, expect, it, vi } from 'vitest'
import type { ObligationStatus, ReadinessResponseStatus } from '@duedatehq/core/obligation-workflow'
import type { Db } from '../client'
import { makeObligationQueueRepo, normalizeObligationQueueSearch } from './obligation-queue'

interface FakeRow {
  id: string
  firmId: string
  clientId: string
  taxType: string
  taxYear: number | null
  taxYearType: 'calendar' | 'fiscal'
  fiscalYearEndMonth: number | null
  fiscalYearEndDay: number | null
  taxPeriodStart: Date | null
  taxPeriodEnd: Date | null
  taxPeriodKind: 'calendar' | 'fiscal' | 'short' | '52_53_week' | 'unknown'
  taxPeriodSource:
    | 'client_default'
    | 'prior_obligation'
    | 'migration'
    | 'manual_cpa_confirmed'
    | 'unknown'
  taxPeriodReviewReason: string | null
  filingDueDate: Date | null
  paymentDueDate: Date | null
  baseDueDate: Date
  currentDueDate: Date
  status: ObligationStatus
  migrationBatchId: string | null
  estimatedTaxDueCents: number | null
  estimatedExposureCents: number | null
  exposureStatus: 'ready' | 'needs_input' | 'unsupported'
  penaltyBreakdownJson: unknown
  penaltyFormulaVersion: string | null
  exposureCalculatedAt: Date | null
  createdAt: Date
  updatedAt: Date
  clientName: string
  clientState: string | null
  clientCounty: string | null
  assigneeName: string | null
}

interface FakeReadinessRequest {
  id: string
  obligationInstanceId: string
  status: 'sent' | 'opened' | 'responded' | 'revoked' | 'expired'
  updatedAt: Date
  createdAt: Date
}

interface FakeReadinessResponse {
  requestId: string
  status: ReadinessResponseStatus
}

interface FakeReadinessChecklistItem {
  obligationInstanceId: string
  status: 'missing' | 'received' | 'needs_review' | 'waived'
}

/**
 * Fake Drizzle chain — only what makeObligationQueueRepo.list calls actually walks.
 * Order: select().from().innerJoin().leftJoin().where().orderBy().limit() => Promise<rows>.
 */
function createFakeDb(
  rows: FakeRow[],
  options: {
    readinessRequests?: FakeReadinessRequest[]
    readinessResponses?: FakeReadinessResponse[]
    readinessChecklistItems?: FakeReadinessChecklistItem[]
    overlay?: Array<{ obligationId: string; overrideDueDate: Date; appliedAt: Date }>
    internalDeadlineOffsetDays?: number
  } = {},
) {
  const limit = vi.fn(async (_n: number) => rows)
  const orderBy = vi.fn(() => ({ limit }))
  const where = vi.fn(() => ({ orderBy }))
  const leftJoin = vi.fn(() => ({ where }))
  const innerJoin = vi.fn(() => ({ leftJoin, where }))
  const from = vi.fn(() => ({ innerJoin, leftJoin }))
  const overlayOrderBy = vi.fn(async () => options.overlay ?? [])
  const overlayWhere = vi.fn(() => ({ orderBy: overlayOrderBy }))
  const overlayInnerJoin = vi.fn(() => ({ where: overlayWhere }))
  const overlayFrom = vi.fn(() => ({ innerJoin: overlayInnerJoin }))
  // Firm internal-deadline-offset lookup — only reached when the overlay set is
  // non-empty (otherwise listActiveOverlayDueDateSet short-circuits).
  const offsetLimit = vi.fn(async () =>
    options.internalDeadlineOffsetDays === undefined
      ? []
      : [{ internalDeadlineOffsetDays: options.internalDeadlineOffsetDays }],
  )
  const offsetWhere = vi.fn(() => ({ limit: offsetLimit }))
  const offsetFrom = vi.fn(() => ({ where: offsetWhere }))
  const evidenceWhere = vi.fn(async () => [])
  const evidenceFrom = vi.fn(() => ({ where: evidenceWhere }))
  const profileLimit = vi.fn(async () => [])
  const profileWhere = vi.fn(() => ({ limit: profileLimit }))
  const profileFrom = vi.fn(() => ({ where: profileWhere }))
  const readinessRequestOrderBy = vi.fn(async () => options.readinessRequests ?? [])
  const readinessRequestWhere = vi.fn(() => ({ orderBy: readinessRequestOrderBy }))
  const readinessRequestFrom = vi.fn(() => ({ where: readinessRequestWhere }))
  const readinessResponseWhere = vi.fn(async () => options.readinessResponses ?? [])
  const readinessResponseFrom = vi.fn(() => ({ where: readinessResponseWhere }))
  const readinessChecklistWhere = vi.fn(async () => options.readinessChecklistItems ?? [])
  const readinessChecklistFrom = vi.fn(() => ({ where: readinessChecklistWhere }))
  const select = vi.fn((shape?: Record<string, unknown>) => {
    const keys = Object.keys(shape ?? {})
    if (
      keys.length === 5 &&
      keys.includes('id') &&
      keys.includes('obligationInstanceId') &&
      keys.includes('status') &&
      keys.includes('updatedAt') &&
      keys.includes('createdAt')
    ) {
      return { from: readinessRequestFrom }
    }
    if (keys.length === 2 && keys.includes('requestId') && keys.includes('status')) {
      return { from: readinessResponseFrom }
    }
    if (keys.length === 2 && keys.includes('obligationInstanceId') && keys.includes('status')) {
      return { from: readinessChecklistFrom }
    }
    if (shape && 'overrideDueDate' in shape) return { from: overlayFrom }
    if (keys.length === 1 && keys.includes('obligationInstanceId')) {
      return { from: evidenceFrom }
    }
    if (keys.length === 1 && keys.includes('smartPriorityProfileJson')) {
      return { from: profileFrom }
    }
    if (keys.length === 1 && keys.includes('internalDeadlineOffsetDays')) {
      return { from: offsetFrom }
    }
    return { from }
  })

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- focused Drizzle test double.
    db: { select } as unknown as Db,
    select,
    where,
    orderBy,
    limit,
    overlayOrderBy,
    leftJoin,
  }
}

function makeRow(over: Partial<FakeRow> = {}): FakeRow {
  const id = over.id ?? '11111111-1111-4111-8111-111111111111'
  const due = over.currentDueDate ?? new Date('2026-04-15T00:00:00.000Z')
  return {
    id,
    firmId: over.firmId ?? 'firm_a',
    clientId: over.clientId ?? '22222222-2222-4222-8222-222222222222',
    taxType: over.taxType ?? '1040',
    taxYear: over.taxYear ?? 2026,
    taxYearType: over.taxYearType ?? 'calendar',
    fiscalYearEndMonth: over.fiscalYearEndMonth ?? null,
    fiscalYearEndDay: over.fiscalYearEndDay ?? null,
    taxPeriodStart: over.taxPeriodStart ?? null,
    taxPeriodEnd: over.taxPeriodEnd ?? null,
    taxPeriodKind: over.taxPeriodKind ?? 'unknown',
    taxPeriodSource: over.taxPeriodSource ?? 'unknown',
    taxPeriodReviewReason: over.taxPeriodReviewReason ?? null,
    baseDueDate: over.baseDueDate ?? due,
    filingDueDate: over.filingDueDate ?? null,
    paymentDueDate: over.paymentDueDate ?? null,
    currentDueDate: due,
    status: over.status ?? 'pending',
    migrationBatchId: over.migrationBatchId ?? null,
    estimatedTaxDueCents: over.estimatedTaxDueCents ?? null,
    estimatedExposureCents: over.estimatedExposureCents ?? null,
    exposureStatus: over.exposureStatus ?? 'needs_input',
    penaltyBreakdownJson: over.penaltyBreakdownJson ?? null,
    penaltyFormulaVersion: over.penaltyFormulaVersion ?? null,
    exposureCalculatedAt: over.exposureCalculatedAt ?? null,
    createdAt: over.createdAt ?? due,
    updatedAt: over.updatedAt ?? due,
    clientName: over.clientName ?? 'Acme Holdings LLC',
    clientState: over.clientState ?? 'CA',
    clientCounty: over.clientCounty ?? 'Orange',
    assigneeName: over.assigneeName ?? null,
  }
}

describe('makeObligationQueueRepo overlay (pulse postponement)', () => {
  it('moves filing + payment to the statutory override and current to the internal target', async () => {
    const fake = createFakeDb(
      [
        makeRow({
          id: 'oi1',
          currentDueDate: new Date('2026-09-01T00:00:00.000Z'),
          baseDueDate: new Date('2026-09-15T00:00:00.000Z'),
          filingDueDate: new Date('2026-09-15T00:00:00.000Z'),
          paymentDueDate: null,
        }),
      ],
      {
        overlay: [
          {
            obligationId: 'oi1',
            overrideDueDate: new Date('2026-11-16T00:00:00.000Z'),
            appliedAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ],
        internalDeadlineOffsetDays: 14,
      },
    )
    const repo = makeObligationQueueRepo(fake.db, 'firm_a')

    const result = await repo.list({ limit: 50 })
    const [row] = result.rows

    // Filing + payment move to the postponed statutory date. Payment was null
    // and now reflects the override (not the baseDueDate fallback).
    expect(row?.filingDueDate?.getTime()).toBe(new Date('2026-11-16T00:00:00.000Z').getTime())
    expect(row?.paymentDueDate?.getTime()).toBe(new Date('2026-11-16T00:00:00.000Z').getTime())
    // Internal target = statutory − firm offset (14 days) = 2026-11-02.
    expect(row?.currentDueDate.getTime()).toBe(new Date('2026-11-02T00:00:00.000Z').getTime())
  })

  it('leaves dates unchanged when no overlay is active', async () => {
    const fake = createFakeDb([
      makeRow({
        id: 'oi1',
        currentDueDate: new Date('2026-09-01T00:00:00.000Z'),
        baseDueDate: new Date('2026-09-15T00:00:00.000Z'),
        filingDueDate: new Date('2026-09-15T00:00:00.000Z'),
        paymentDueDate: null,
      }),
    ])
    const repo = makeObligationQueueRepo(fake.db, 'firm_a')

    const result = await repo.list({ limit: 50 })
    const [row] = result.rows

    expect(row?.currentDueDate.getTime()).toBe(new Date('2026-09-01T00:00:00.000Z').getTime())
    expect(row?.filingDueDate?.getTime()).toBe(new Date('2026-09-15T00:00:00.000Z').getTime())
    // Queue coalesces a null payment date to baseDueDate (existing behavior).
    expect(row?.paymentDueDate?.getTime()).toBe(new Date('2026-09-15T00:00:00.000Z').getTime())
  })
})

describe('makeObligationQueueRepo.list', () => {
  it('normalizes client search before building a LIKE query', () => {
    expect(normalizeObligationQueueSearch('  dddjkfjjjkfjksalj;flaslfkafsadfj;laksjf  ')).toBe(
      'dddjkfjjjkfjksalj flaslfkafsadfj laksjf',
    )
    expect(normalizeObligationQueueSearch('%_Acme\\LLC_'.repeat(8))?.length).toBeLessThanOrEqual(64)
    expect(normalizeObligationQueueSearch(';;;')).toBeNull()
  })

  it('returns rows with no nextCursor when limit is not exceeded', async () => {
    const fake = createFakeDb([makeRow({ id: 'a' }), makeRow({ id: 'b' })])
    const repo = makeObligationQueueRepo(fake.db, 'firm_a')

    const result = await repo.list({ limit: 50 })

    expect(result.rows).toHaveLength(2)
    expect(result.nextCursor).toBeNull()
    expect(fake.limit).toHaveBeenCalledWith(1000)
  })

  it('filters the queue to explicit obligation ids', async () => {
    const fake = createFakeDb([
      makeRow({ id: 'target-obligation' }),
      makeRow({ id: 'other-obligation' }),
    ])
    const repo = makeObligationQueueRepo(fake.db, 'firm_a')

    const result = await repo.list({ obligationIds: ['target-obligation'] })

    expect(result.rows.map((row) => row.id)).toEqual(['target-obligation'])
  })

  it('falls back statutory split dates to the tax authority source-backed date', async () => {
    const baseDueDate = new Date('2026-04-15T00:00:00.000Z')
    const fake = createFakeDb([
      makeRow({
        id: 'legacy-without-split-dates',
        baseDueDate,
        filingDueDate: null,
        paymentDueDate: null,
      }),
    ])
    const repo = makeObligationQueueRepo(fake.db, 'firm_a')

    const result = await repo.list({ limit: 50 })

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.filingDueDate).toBe(baseDueDate)
    expect(result.rows[0]?.paymentDueDate).toBe(baseDueDate)
  })

  it('emits nextCursor when more rows exist (sentinel detection)', async () => {
    const rows: FakeRow[] = []
    for (let i = 0; i < 6; i += 1) {
      rows.push(
        makeRow({
          id: `0000000${i}-0000-4000-8000-000000000000`,
          currentDueDate: new Date(`2026-04-${10 + i}T00:00:00.000Z`),
        }),
      )
    }
    const fake = createFakeDb(rows)
    const repo = makeObligationQueueRepo(fake.db, 'firm_a')

    const result = await repo.list({ limit: 5, sort: 'due_asc' })

    expect(result.rows).toHaveLength(5)
    expect(result.nextCursor).not.toBeNull()
    expect(typeof result.nextCursor).toBe('string')
  })

  it('does not emit nextCursor for updated_desc sort (no keyset on updatedAt)', async () => {
    const rows: FakeRow[] = []
    for (let i = 0; i < 6; i += 1) {
      rows.push(makeRow({ id: `id_${i}`, updatedAt: new Date(2026, 3, 10 + i) }))
    }
    const fake = createFakeDb(rows)
    const repo = makeObligationQueueRepo(fake.db, 'firm_a')

    const result = await repo.list({ limit: 5, sort: 'updated_desc' })

    expect(result.rows).toHaveLength(5)
    expect(result.nextCursor).toBeNull()
  })

  it('clamps limit between 1 and 100', async () => {
    const fake = createFakeDb([])
    const repo = makeObligationQueueRepo(fake.db, 'firm_a')

    await repo.list({ limit: 9999 })
    expect(fake.limit).toHaveBeenLastCalledWith(1000)

    await repo.list({ limit: 0 })
    expect(fake.limit).toHaveBeenLastCalledWith(1000)
  })

  it('decodes invalid cursor gracefully (treats as no cursor)', async () => {
    const fake = createFakeDb([])
    const repo = makeObligationQueueRepo(fake.db, 'firm_a')

    await expect(repo.list({ cursor: '!!!not-base64!!!' })).resolves.toEqual({
      rows: [],
      nextCursor: null,
    })
  })

  it('uses derived readiness and filters by days until due after overlay-safe row shaping', async () => {
    const fake = createFakeDb(
      [
        makeRow({
          id: 'ready',
          currentDueDate: new Date('2026-04-20T00:00:00.000Z'),
          exposureStatus: 'ready',
        }),
        makeRow({
          id: 'waiting',
          currentDueDate: new Date('2026-04-22T00:00:00.000Z'),
          status: 'waiting_on_client',
          exposureStatus: 'ready',
        }),
        makeRow({
          id: 'review',
          currentDueDate: new Date('2026-05-01T00:00:00.000Z'),
          status: 'review',
          exposureStatus: 'ready',
        }),
        makeRow({
          id: 'needs-input',
          currentDueDate: new Date('2026-04-18T00:00:00.000Z'),
          exposureStatus: 'needs_input',
        }),
      ],
      {
        readinessRequests: [
          {
            id: 'request-needs-input',
            obligationInstanceId: 'needs-input',
            status: 'responded',
            updatedAt: new Date('2026-04-16T00:00:00.000Z'),
            createdAt: new Date('2026-04-16T00:00:00.000Z'),
          },
        ],
        readinessResponses: [{ requestId: 'request-needs-input', status: 'need_help' }],
      },
    )
    const repo = makeObligationQueueRepo(fake.db, 'firm_a')

    const result = await repo.list({
      asOfDate: '2026-04-15',
      minDaysUntilDue: 1,
      maxDaysUntilDue: 7,
      readiness: ['ready', 'needs_review'],
    })

    expect(result.rows.map((row) => row.id)).toEqual(['needs-input', 'ready'])
    expect(result.rows.map((row) => row.daysUntilDue)).toEqual([3, 5])
    expect(result.rows.map((row) => row.readiness)).toEqual(['needs_review', 'ready'])
  })

  it('uses internal document checklist readiness before legacy portal responses', async () => {
    const fake = createFakeDb(
      [
        makeRow({
          id: 'document-missing',
          currentDueDate: new Date('2026-04-20T00:00:00.000Z'),
          exposureStatus: 'ready',
        }),
        makeRow({
          id: 'document-received',
          currentDueDate: new Date('2026-04-21T00:00:00.000Z'),
          exposureStatus: 'ready',
        }),
      ],
      {
        readinessRequests: [
          {
            id: 'request-legacy-ready',
            obligationInstanceId: 'document-missing',
            status: 'responded',
            updatedAt: new Date('2026-04-16T00:00:00.000Z'),
            createdAt: new Date('2026-04-16T00:00:00.000Z'),
          },
        ],
        readinessResponses: [{ requestId: 'request-legacy-ready', status: 'ready' }],
        readinessChecklistItems: [
          { obligationInstanceId: 'document-missing', status: 'missing' },
          { obligationInstanceId: 'document-received', status: 'received' },
        ],
      },
    )
    const repo = makeObligationQueueRepo(fake.db, 'firm_a')

    const result = await repo.list({ asOfDate: '2026-04-15', limit: 10 })

    expect(result.rows.map((row) => [row.id, row.readiness])).toEqual([
      ['document-missing', 'waiting'],
      ['document-received', 'ready'],
    ])
  })

  it('aggregates obligation facet options for client, geography, form, and assignee filters', async () => {
    const fake = createFakeDb([
      makeRow({
        id: 'a',
        clientId: '11111111-1111-4111-8111-111111111111',
        clientName: 'Acme Holdings LLC',
        clientState: 'ca',
        clientCounty: ' Orange ',
        taxType: '1040',
        assigneeName: 'Sarah Kim',
      }),
      makeRow({
        id: 'b',
        clientId: '11111111-1111-4111-8111-111111111111',
        clientName: 'Acme Holdings LLC',
        clientState: 'CA',
        clientCounty: 'Orange',
        taxType: '1120-S',
        assigneeName: 'Sarah Kim',
      }),
      makeRow({
        id: 'c',
        clientId: '22222222-2222-4222-8222-222222222222',
        clientName: 'Bright Dental',
        clientState: 'NY',
        clientCounty: 'Queens',
        taxType: '1040',
        assigneeName: 'Mina Patel',
      }),
    ])
    const repo = makeObligationQueueRepo(fake.db, 'firm_a')

    const result = await repo.facets()

    expect(result.clients).toEqual([
      {
        value: '11111111-1111-4111-8111-111111111111',
        label: 'Acme Holdings LLC',
        count: 2,
        state: 'CA',
        county: 'Orange',
      },
      {
        value: '22222222-2222-4222-8222-222222222222',
        label: 'Bright Dental',
        count: 1,
        state: 'NY',
        county: 'Queens',
      },
    ])
    expect(result.states).toEqual([
      { value: 'CA', label: 'CA', count: 2 },
      { value: 'NY', label: 'NY', count: 1 },
    ])
    expect(result.counties).toEqual([
      { value: 'Orange', label: 'Orange, CA', count: 2, state: 'CA' },
      { value: 'Queens', label: 'Queens, NY', count: 1, state: 'NY' },
    ])
    expect(result.taxTypes).toEqual([
      { value: '1040', label: '1040', count: 2 },
      { value: '1120-S', label: '1120-S', count: 1 },
    ])
    expect(result.assigneeNames).toEqual([
      { value: 'Mina Patel', label: 'Mina Patel', count: 1 },
      { value: 'Sarah Kim', label: 'Sarah Kim', count: 2 },
    ])
  })
})
