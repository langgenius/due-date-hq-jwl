import { beforeEach, describe, expect, it, vi } from 'vitest'

import { emitSourceIdleAlerts, type PulseSourceStateForMetrics } from './metrics'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function source(overrides: Partial<PulseSourceStateForMetrics> = {}): PulseSourceStateForMetrics {
  return {
    sourceId: 'ak.income_tax',
    tier: 'T1',
    jurisdiction: 'AK',
    enabled: true,
    cadenceMs: 14 * DAY,
    healthStatus: 'healthy',
    lastSuccessAt: null,
    ...overrides,
  }
}

describe('emitSourceIdleAlerts', () => {
  const now = new Date('2026-06-18T00:00:00.000Z')

  beforeEach(() => {
    // The function logs every stale source via console.warn; keep test output clean.
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('does not flag a long-cadence source that is on schedule', () => {
    // 14-day cadence, last success 9 days ago — comfortably inside its own cycle.
    const stale = emitSourceIdleAlerts(
      [source({ lastSuccessAt: new Date(now.getTime() - 9 * DAY) })],
      now,
    )
    expect(stale).toEqual([])
  })

  it('flags a long-cadence source only after it misses ~2 of its own cycles', () => {
    // Threshold is cadence * 2 = 28 days.
    const onSchedule = emitSourceIdleAlerts(
      [source({ lastSuccessAt: new Date(now.getTime() - 27 * DAY) })],
      now,
    )
    expect(onSchedule).toEqual([])

    const overdue = emitSourceIdleAlerts(
      [source({ lastSuccessAt: new Date(now.getTime() - 30 * DAY) })],
      now,
    )
    expect(overdue.map((s) => s.sourceId)).toEqual(['ak.income_tax'])
  })

  it('keeps a tight floor so a high-frequency source trips within hours', () => {
    // 1h cadence: cadence * 2 = 2h, but the 4h floor wins.
    const fast = source({ sourceId: 'irs.newsroom', jurisdiction: 'FED', cadenceMs: HOUR })

    expect(
      emitSourceIdleAlerts([{ ...fast, lastSuccessAt: new Date(now.getTime() - 3 * HOUR) }], now),
    ).toEqual([])

    expect(
      emitSourceIdleAlerts(
        [{ ...fast, lastSuccessAt: new Date(now.getTime() - 5 * HOUR) }],
        now,
      ).map((s) => s.sourceId),
    ).toEqual(['irs.newsroom'])
  })

  it('skips disabled and paused sources', () => {
    const stale = emitSourceIdleAlerts(
      [
        source({ sourceId: 'a', enabled: false }),
        source({ sourceId: 'b', healthStatus: 'paused' }),
      ],
      now,
    )
    expect(stale).toEqual([])
  })

  it('flags an enabled source that has never succeeded', () => {
    const stale = emitSourceIdleAlerts([source({ sourceId: 'c', lastSuccessAt: null })], now)
    expect(stale.map((s) => s.sourceId)).toEqual(['c'])
  })
})
