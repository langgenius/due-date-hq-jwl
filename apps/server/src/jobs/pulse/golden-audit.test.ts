/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused doubles only implement the audit's repo/adapter surface.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SourceAdapter } from '@duedatehq/ingest/types'
import type { Env } from '../../env'
import { GOLDEN_AUDIT_SOURCE_IDS, runPulseGoldenAudit, shouldRunGoldenAudit } from './golden-audit'

const { dbMocks, metricsMocks, opsMocks, repoMocks } = vi.hoisted(() => {
  const repo = { listItemSnapshotContentHashes: vi.fn() }
  return {
    repoMocks: repo,
    dbMocks: {
      createDb: vi.fn(() => ({})),
      makePulseOpsRepo: vi.fn(() => repo),
    },
    metricsMocks: {
      recordPulseAlert: vi.fn(),
      recordPulseMetric: vi.fn(),
    },
    opsMocks: { dispatchOpsAlert: vi.fn(async () => undefined) },
  }
})

vi.mock('@duedatehq/db', () => ({
  createDb: dbMocks.createDb,
  makePulseOpsRepo: dbMocks.makePulseOpsRepo,
}))
vi.mock('./metrics', () => ({
  recordPulseAlert: metricsMocks.recordPulseAlert,
  recordPulseMetric: metricsMocks.recordPulseMetric,
}))
vi.mock('../ops-alerts', () => ({
  dispatchOpsAlert: opsMocks.dispatchOpsAlert,
}))

function goldenAdapter(overrides: Partial<SourceAdapter> = {}): SourceAdapter {
  const id = overrides.id ?? 'irs.disaster'
  return {
    id,
    tier: 'T1',
    jurisdiction: 'FED',
    cronIntervalMs: 60 * 60 * 1000,
    async fetch() {
      return [
        {
          sourceId: id,
          fetchedAt: new Date('2026-06-11T00:00:00.000Z'),
          contentHash: 'raw',
          r2Key: 'raw.html',
          body: '<html>index</html>',
          contentType: 'text/html',
          etag: null,
          lastModified: null,
        },
      ]
    },
    async parse() {
      return [
        {
          sourceId: id,
          externalId: `${id}-item-a`,
          title: 'GA wildfire relief postponed to Aug 20',
          publishedAt: new Date('2026-05-08T00:00:00.000Z'),
          officialSourceUrl: 'https://example.gov/a',
          rawText: 'relief text',
        },
        {
          sourceId: id,
          externalId: `${id}-item-b`,
          title: 'CNMI typhoon relief postponed to Nov 2',
          publishedAt: new Date('2026-05-04T00:00:00.000Z'),
          officialSourceUrl: 'https://example.gov/b',
          rawText: 'relief text',
        },
      ]
    },
    ...overrides,
  }
}

function fullGoldenSet(): SourceAdapter[] {
  return GOLDEN_AUDIT_SOURCE_IDS.map((id) => goldenAdapter({ id }))
}

const env = { DB: {} as D1Database } as Pick<Env, 'DB'> & {
  OPS_ALERT_EMAIL?: string
}

describe('GOLDEN_AUDIT_SOURCE_IDS', () => {
  it('every golden id exists in the live adapter registry', async () => {
    // A renamed/removed adapter would otherwise turn the weekly audit into a
    // permanent false alarm (missingAdapterIds) — catch it at commit time.
    const { liveRegulatorySourceAdapters } = await import('./rule-source-adapters')
    const live = new Set(liveRegulatorySourceAdapters.map((adapter) => adapter.id))
    expect(GOLDEN_AUDIT_SOURCE_IDS.filter((id) => !live.has(id))).toEqual([])
  })
})

describe('shouldRunGoldenAudit', () => {
  it('fires only in the Monday 10:00-10:29 UTC slot', () => {
    expect(shouldRunGoldenAudit(new Date('2026-06-15T10:05:00.000Z'))).toBe(true) // Monday
    expect(shouldRunGoldenAudit(new Date('2026-06-15T10:30:00.000Z'))).toBe(false)
    expect(shouldRunGoldenAudit(new Date('2026-06-15T09:55:00.000Z'))).toBe(false)
    expect(shouldRunGoldenAudit(new Date('2026-06-16T10:05:00.000Z'))).toBe(false) // Tuesday
  })
})

describe('runPulseGoldenAudit', () => {
  beforeEach(() => {
    Object.values(dbMocks).forEach((mock) => mock.mockClear())
    Object.values(metricsMocks).forEach((mock) => mock.mockReset())
    opsMocks.dispatchOpsAlert.mockClear()
    repoMocks.listItemSnapshotContentHashes.mockReset()
  })

  it('reports items the pipeline never ingested and alerts ops', async () => {
    // First item is known (one prior hash), second was never snapshotted.
    repoMocks.listItemSnapshotContentHashes
      .mockResolvedValueOnce(['item-v2:abc'])
      .mockResolvedValueOnce([])

    const result = await runPulseGoldenAudit(env, [goldenAdapter()])

    expect(result.auditedSources).toBe(1)
    expect(result.parsedItems).toBe(2)
    expect(result.misses).toEqual([
      {
        sourceId: 'irs.disaster',
        externalId: 'irs.disaster-item-b',
        title: 'CNMI typhoon relief postponed to Nov 2',
      },
    ])
    expect(opsMocks.dispatchOpsAlert).toHaveBeenCalledWith(
      env,
      'pulse.golden_audit.misses',
      expect.objectContaining({ misses: 1 }),
    )
  })

  it('stays quiet when every listed item is already ingested across the full set', async () => {
    repoMocks.listItemSnapshotContentHashes.mockResolvedValue(['item-v2:abc'])

    const result = await runPulseGoldenAudit(env, fullGoldenSet())

    expect(result.misses).toEqual([])
    expect(result.missingAdapterIds).toEqual([])
    expect(opsMocks.dispatchOpsAlert).not.toHaveBeenCalled()
    expect(metricsMocks.recordPulseMetric).toHaveBeenCalledWith(
      'pulse.golden_audit.result',
      expect.objectContaining({ parsedItems: GOLDEN_AUDIT_SOURCE_IDS.length * 2, misses: 0 }),
    )
  })

  it('flags golden ids missing from the adapter registry instead of silently shrinking', async () => {
    repoMocks.listItemSnapshotContentHashes.mockResolvedValue(['item-v2:abc'])

    const result = await runPulseGoldenAudit(env, [goldenAdapter()])

    // Only irs.disaster was supplied; every other golden id must be reported.
    expect(result.missingAdapterIds).toEqual(
      GOLDEN_AUDIT_SOURCE_IDS.filter((id) => id !== 'irs.disaster'),
    )
    expect(opsMocks.dispatchOpsAlert).toHaveBeenCalledWith(
      env,
      'pulse.golden_audit.misses',
      expect.objectContaining({ misses: 0 }),
    )
  })

  it('one dead source cannot abort the rest of the audit', async () => {
    repoMocks.listItemSnapshotContentHashes.mockResolvedValue([])
    const dead = goldenAdapter({
      id: 'irs.newsroom',
      async fetch() {
        throw new Error('site unreachable')
      },
    })

    const result = await runPulseGoldenAudit(env, [dead, goldenAdapter()])

    expect(result.auditedSources).toBe(1)
    expect(result.misses).toHaveLength(2)
  })
})
