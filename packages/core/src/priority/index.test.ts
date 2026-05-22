import { describe, expect, it } from 'vitest'
import {
  SMART_PRIORITY_DEFAULT_PROFILE,
  rankSmartPriorities,
  scoreSmartPriority,
  smartPriorityDaysUntilDue,
} from './index'

const baseInput = {
  obligationId: 'obligation_1',
  currentDueDate: '2026-05-10',
  asOfDate: '2026-05-01',
  status: 'pending' as const,
  importanceWeight: 2,
  lateFilingCountLast12mo: 0,
  evidenceCount: 1,
}

describe('smart priority', () => {
  it('scores the documented factors with stable weights', () => {
    const result = scoreSmartPriority(baseInput)

    expect(result.version).toBe('smart-priority-v1')
    expect(result.rank).toBeNull()
    expect(result.score).toBe(56.5)
    expect(result.factors.map((factor) => [factor.key, factor.weight])).toEqual([
      ['urgency', 0.7],
      ['importance', 0.15],
      ['history', 0.1],
      ['readiness', 0.05],
    ])
  })

  it('accepts a custom deterministic profile without changing the output shape', () => {
    const result = scoreSmartPriority(baseInput, {
      version: 'smart-priority-profile-v2',
      weights: {
        urgency: 50,
        importance: 20,
        history: 20,
        readiness: 10,
      },
      urgencyWindowDays: 15,
      historyCapCount: 5,
    })

    expect(result.score).toBe(30)
    expect(result.factors.map((factor) => [factor.key, factor.weight])).toEqual([
      ['urgency', 0.5],
      ['importance', 0.2],
      ['history', 0.2],
      ['readiness', 0.1],
    ])
  })

  it('migrates legacy v1 profiles by moving exposure weight to urgency', () => {
    const result = scoreSmartPriority(baseInput, {
      version: 'smart-priority-profile-v1',
      weights: {
        exposure: 20,
        urgency: 50,
        importance: 10,
        history: 10,
        readiness: 10,
      },
      exposureCapCents: 500_000,
      urgencyWindowDays: 15,
      historyCapCount: 5,
    })

    expect(result.factors.map((factor) => [factor.key, factor.weight])).toEqual([
      ['urgency', 0.7],
      ['importance', 0.1],
      ['history', 0.1],
      ['readiness', 0.1],
    ])
  })

  it('uses custom caps for urgency and history normalization', () => {
    const result = scoreSmartPriority(
      {
        ...baseInput,
        currentDueDate: '2026-05-06',
        lateFilingCountLast12mo: 3,
      },
      {
        ...SMART_PRIORITY_DEFAULT_PROFILE,
        urgencyWindowDays: 10,
        historyCapCount: 3,
      },
    )

    expect(result.factors.map((factor) => [factor.key, factor.normalized])).toEqual([
      ['urgency', 0.5],
      ['importance', 0.5],
      ['history', 1],
      ['readiness', 0],
    ])
  })

  it('raises blocked work through the readiness pressure factor', () => {
    const ready = scoreSmartPriority(baseInput)
    const waiting = scoreSmartPriority({ ...baseInput, status: 'waiting_on_client' })

    expect(waiting.score).toBeGreaterThan(ready.score)
    expect(waiting.factors.find((factor) => factor.key === 'readiness')?.rawValue).toBe(
      'waiting on client',
    )
  })

  it('ranks by score, then due date, then id', () => {
    const rows = rankSmartPriorities([
      { ...baseInput, obligationId: 'c' },
      {
        ...baseInput,
        obligationId: 'b',
        currentDueDate: '2026-05-05',
      },
      {
        ...baseInput,
        obligationId: 'a',
        importanceWeight: 3,
        lateFilingCountLast12mo: 5,
      },
    ])

    expect(rows.map((item) => [item.row.obligationId, item.smartPriority.rank])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ])
  })

  it('ranks with custom weights while preserving tie breaks', () => {
    const rows = rankSmartPriorities(
      [
        { ...baseInput, obligationId: 'c', currentDueDate: '2026-05-08' },
        { ...baseInput, obligationId: 'b', currentDueDate: '2026-05-05' },
        {
          ...baseInput,
          obligationId: 'a',
          currentDueDate: '2026-05-20',
        },
      ],
      {
        ...SMART_PRIORITY_DEFAULT_PROFILE,
        weights: {
          urgency: 100,
          importance: 0,
          history: 0,
          readiness: 0,
        },
      },
    )

    expect(rows.map((item) => [item.row.obligationId, item.smartPriority.rank])).toEqual([
      ['b', 1],
      ['c', 2],
      ['a', 3],
    ])
  })

  it('computes date-only urgency without timezone drift', () => {
    expect(
      smartPriorityDaysUntilDue({
        currentDueDate: new Date('2026-05-02T23:30:00.000Z'),
        asOfDate: '2026-05-01',
      }),
    ).toBe(1)
  })
})
