/* eslint-disable @typescript-eslint/no-unsafe-type-assertion --
 * Focused Drizzle chain doubles only implement the query-builder methods that
 * makeObligationsRepo.findById walks (full-row read + overlay + firm-offset +
 * derived-readiness reads). Shape-matched, so call order is irrelevant.
 */
import { describe, expect, it, vi } from 'vitest'
import type { Db } from '../client'
import { makeObligationsRepo } from './obligations'

function makeOi(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'oi1',
    firmId: 'firm_a',
    clientId: 'c1',
    status: 'pending',
    baseDueDate: new Date('2026-09-15T00:00:00.000Z'),
    currentDueDate: new Date('2026-09-01T00:00:00.000Z'),
    filingDueDate: new Date('2026-09-15T00:00:00.000Z'),
    paymentDueDate: null,
    ...over,
  }
}

function createFakeDb(opts: {
  row: Record<string, unknown>
  overlay?: Array<{ obligationId: string; overrideDueDate: Date; appliedAt: Date }>
  internalDeadlineOffsetDays?: number
}) {
  // findById main read: select().from(obligationInstance).where().limit()
  const mainLimit = vi.fn(async () => [opts.row])
  const mainWhere = vi.fn(() => ({ limit: mainLimit }))
  // overlay read: select({obligationId, overrideDueDate, appliedAt}).from().innerJoin().where().orderBy()
  const overlayOrderBy = vi.fn(async () => opts.overlay ?? [])
  const overlayWhere = vi.fn(() => ({ orderBy: overlayOrderBy }))
  // firm-offset read (only when overlay set is non-empty):
  // select({internalDeadlineOffsetDays}).from().where().limit()
  const offsetLimit = vi.fn(async () =>
    opts.internalDeadlineOffsetDays === undefined
      ? []
      : [{ internalDeadlineOffsetDays: opts.internalDeadlineOffsetDays }],
  )
  const offsetWhere = vi.fn(() => ({ limit: offsetLimit }))
  // derived-readiness reads (checklist / request / response) — all empty;
  // readiness is derived from status. `where()` is both awaitable and chainable
  // with `.orderBy()` so it serves both terminal and ordered reads.
  const readinessWhere = vi.fn(() =>
    Object.assign(Promise.resolve([]), { orderBy: vi.fn(async () => []) }),
  )
  const select = vi.fn((shape?: Record<string, unknown>) => {
    if (shape && 'overrideDueDate' in shape) {
      return { from: () => ({ innerJoin: () => ({ where: overlayWhere }) }) }
    }
    if (shape && 'internalDeadlineOffsetDays' in shape) {
      return { from: () => ({ where: offsetWhere }) }
    }
    if (shape) {
      return { from: () => ({ where: readinessWhere }) }
    }
    return { from: () => ({ where: mainWhere }) }
  })

  return { db: { select } as unknown as Db }
}

describe('makeObligationsRepo.findById overlay (pulse postponement)', () => {
  it('moves filing + payment to the statutory override and current to the internal target', async () => {
    const fake = createFakeDb({
      row: makeOi(),
      overlay: [
        {
          obligationId: 'oi1',
          overrideDueDate: new Date('2026-11-16T00:00:00.000Z'),
          appliedAt: new Date('2026-06-01T00:00:00.000Z'),
        },
      ],
      internalDeadlineOffsetDays: 14,
    })
    const repo = makeObligationsRepo(fake.db, 'firm_a')

    const row = await repo.findById('oi1')

    expect(row?.filingDueDate?.getTime()).toBe(new Date('2026-11-16T00:00:00.000Z').getTime())
    // Payment was null → now reflects the override (the full-row path does NOT
    // coalesce to baseDueDate; the public serializer does that downstream).
    expect(row?.paymentDueDate?.getTime()).toBe(new Date('2026-11-16T00:00:00.000Z').getTime())
    expect(row?.currentDueDate.getTime()).toBe(new Date('2026-11-02T00:00:00.000Z').getTime())
  })

  it('leaves dates unchanged and preserves a null payment date when no overlay is active', async () => {
    const fake = createFakeDb({ row: makeOi() })
    const repo = makeObligationsRepo(fake.db, 'firm_a')

    const row = await repo.findById('oi1')

    expect(row?.currentDueDate.getTime()).toBe(new Date('2026-09-01T00:00:00.000Z').getTime())
    expect(row?.filingDueDate?.getTime()).toBe(new Date('2026-09-15T00:00:00.000Z').getTime())
    // No overlay → null payment is preserved (unlike the queue's base fallback).
    expect(row?.paymentDueDate).toBeNull()
  })
})
