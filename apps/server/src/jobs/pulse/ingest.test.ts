/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Worker doubles only implement the Pulse ingest repo/R2/Queue surface.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SourceAdapter } from '@duedatehq/ingest/types'
import type { Env } from '../../env'
import { createBrowserlessFetch } from './browserless'
import {
  archivePulseRaw,
  consumePulseIngestSource,
  createPoliteFetch,
  createPoliteHostState,
  enqueuePulseIngestScans,
  pulseFullTextR2Key,
  runPulseIngest,
} from './ingest'

const { dbMocks, metricsMocks, repoMocks } = vi.hoisted(() => {
  const repo = {
    ensureSourceState: vi.fn(),
    ensureSourceStates: vi.fn(),
    getSourceState: vi.fn(),
    establishSourceBaseline: vi.fn(),
    createSourceSnapshot: vi.fn(),
    updateSourceSnapshotStatus: vi.fn(),
    recordSourceSuccess: vi.fn(),
    recordSourceFailure: vi.fn(),
    listSourceStates: vi.fn(),
    listItemSnapshotContentHashes: vi.fn(),
    sourceSnapshotPresence: vi.fn(),
    apply: vi.fn(),
    applyReviewed: vi.fn(),
  }
  return {
    repoMocks: repo,
    metricsMocks: {
      // Returns the stale-source list (used for the aggregated ops alert).
      emitSourceIdleAlerts: vi.fn(() => []),
      recordPulseMetric: vi.fn(),
    },
    dbMocks: {
      createDb: vi.fn(() => ({})),
      makeAiRepo: vi.fn(),
      makePulseOpsRepo: vi.fn(() => repo),
    },
  }
})

vi.mock('@duedatehq/db', () => ({
  createDb: dbMocks.createDb,
  makeAiRepo: dbMocks.makeAiRepo,
  makePulseOpsRepo: dbMocks.makePulseOpsRepo,
}))

vi.mock('./metrics', () => ({
  emitSourceIdleAlerts: metricsMocks.emitSourceIdleAlerts,
  recordPulseMetric: metricsMocks.recordPulseMetric,
}))

function env(queueSend = vi.fn()): Pick<Env, 'DB' | 'R2_PULSE' | 'PULSE_QUEUE'> {
  return {
    DB: {} as D1Database,
    R2_PULSE: {
      put: vi.fn(async () => undefined),
      head: vi.fn(async () => null),
    } as unknown as R2Bucket,
    PULSE_QUEUE: {
      send: queueSend,
    } as unknown as Queue,
  }
}

function adapter(overrides: Partial<SourceAdapter> = {}): SourceAdapter {
  return {
    id: 'fema.declarations',
    tier: 'T2',
    jurisdiction: 'US',
    cronIntervalMs: 60_000,
    async fetch() {
      return [
        {
          sourceId: 'fema.declarations',
          fetchedAt: new Date('2026-04-30T00:00:00.000Z'),
          contentHash: 'raw-hash',
          r2Key: 'raw.html',
          body: 'raw body',
          contentType: 'text/html',
          etag: 'etag-1',
          lastModified: null,
        },
      ]
    },
    async parse() {
      return [
        {
          sourceId: 'fema.declarations',
          externalId: 'DR-123',
          title: 'FEMA declaration',
          publishedAt: new Date('2026-04-29T00:00:00.000Z'),
          officialSourceUrl: 'https://www.fema.gov/disaster/123',
          jurisdiction: 'CA',
          rawText: 'FEMA declaration raw text',
        },
      ]
    },
    ...overrides,
  }
}

describe('runPulseIngest', () => {
  beforeEach(() => {
    Object.values(dbMocks).forEach((mock) => mock.mockClear())
    Object.values(metricsMocks).forEach((mock) => mock.mockClear())
    Object.values(repoMocks).forEach((mock) => mock.mockReset())
    repoMocks.ensureSourceState.mockResolvedValue({
      enabled: true,
      nextCheckAt: null,
    })
    repoMocks.getSourceState.mockResolvedValue(null)
    repoMocks.createSourceSnapshot.mockResolvedValue({
      inserted: true,
      snapshot: { id: 'snapshot-1' },
    })
    repoMocks.updateSourceSnapshotStatus.mockResolvedValue(undefined)
    repoMocks.establishSourceBaseline.mockResolvedValue({
      sourceId: 'fema.declarations',
      monitoringBaselineAt: new Date('2026-04-30T00:00:00.000Z'),
      baselineMode: 'active',
    })
    repoMocks.listSourceStates.mockResolvedValue([])
    repoMocks.listItemSnapshotContentHashes.mockResolvedValue([])
    repoMocks.sourceSnapshotPresence.mockResolvedValue('absent')
    repoMocks.apply.mockRejectedValue(new Error('ingest must not apply deadline changes'))
    repoMocks.applyReviewed.mockRejectedValue(
      new Error('ingest must not apply reviewed deadline changes'),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('queues parsed items from T2 adapters for CPA-facing extract', async () => {
    const queueSend = vi.fn()

    const result = await runPulseIngest(env(queueSend), [adapter()])

    expect(result).toMatchObject({ snapshots: 1, queued: 1, failures: 0 })
    expect(repoMocks.createSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'fema.declarations',
      }),
    )
    expect(repoMocks.recordSourceSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'fema.declarations' }),
    )
    expect(queueSend).toHaveBeenCalledWith({ type: 'pulse.extract', snapshotId: 'snapshot-1' })
    expect(repoMocks.apply).not.toHaveBeenCalled()
    expect(repoMocks.applyReviewed).not.toHaveBeenCalled()
  })

  it('reuses an existing source state without a steady-state D1 upsert', async () => {
    repoMocks.getSourceState.mockResolvedValue({
      sourceId: 'fema.declarations',
      enabled: true,
      nextCheckAt: null,
      etag: 'etag-existing',
      lastModified: null,
    })

    await runPulseIngest(env(), [adapter()])

    expect(repoMocks.getSourceState).toHaveBeenCalledWith('fema.declarations')
    expect(repoMocks.ensureSourceState).not.toHaveBeenCalled()
  })

  it('surfaces the source and D1 stage when source-state loading fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    repoMocks.getSourceState.mockRejectedValue(new Error('D1_ERROR: read unavailable'))

    await expect(runPulseIngest(env(), [adapter()])).rejects.toThrow(
      'pulse.ingest.source_state_load_failed for fema.declarations: D1_ERROR: read unavailable',
    )
    expect(repoMocks.ensureSourceState).not.toHaveBeenCalled()
    expect(metricsMocks.recordPulseMetric).toHaveBeenCalledWith(
      'pulse.ingest.source_state_load_failed',
      {
        sourceId: 'fema.declarations',
        error: 'D1_ERROR: read unavailable',
      },
    )
    error.mockRestore()
  })

  it('preserves both the source failure and D1 failure-state write error', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    repoMocks.recordSourceFailure.mockRejectedValue(new Error('D1_ERROR: write unavailable'))

    await expect(
      runPulseIngest(env(), [
        adapter({
          async fetch() {
            throw new Error('403 — Just a moment')
          },
        }),
      ]),
    ).rejects.toThrow(
      'pulse.ingest.source_failure_state_write_failed for fema.declarations: D1_ERROR: write unavailable; source_error: 403 — Just a moment',
    )
    expect(metricsMocks.recordPulseMetric).toHaveBeenCalledWith(
      'pulse.ingest.source_failure_state_write_failed',
      {
        sourceId: 'fema.declarations',
        sourceError: '403 — Just a moment',
        stateError: 'D1_ERROR: write unavailable',
      },
    )
    error.mockRestore()
  })

  // Detail enrichment: announcement link items (enrichFromUrl + dedupeText)
  // swap their index excerpt for the detail page when genuinely NEW, so the
  // extractor sees the real announcement (dates included) instead of the
  // listing-page headline that produced the date-less GA Kemp alert.
  // Each test gets its own host: the polite fetch's per-host slot state is
  // module-global, so reusing a host would make a later test inherit a 30s
  // politeness wait from an earlier one.
  function enrichAdapter(host: string): SourceAdapter {
    const detailUrl = `https://${host}/press-releases/2026-05-11/governor-kemp-announces-relief`
    return adapter({
      id: 'ga.temporary_announcements',
      async parse() {
        return [
          {
            sourceId: 'ga.temporary_announcements',
            externalId: 'kemp-wildfire-relief',
            title: 'Governor Kemp Announces Relief for Taxpayers Impacted by Wildfires',
            publishedAt: new Date('2026-06-04T00:00:00.000Z'),
            officialSourceUrl: detailUrl,
            jurisdiction: 'GA',
            rawText: 'index excerpt only — no dates here',
            dedupeText: `governor kemp announces relief\n${detailUrl}`,
            enrichFromUrl: detailUrl,
          },
        ]
      },
    })
  }

  it('enriches a NEW link item with its detail page text and recovered publish date', async () => {
    const queueSend = vi.fn()
    const detailHtml =
      '<html><body><h1>Relief for Wildfire Victims</h1><p>May 11, 2026</p><p>Affected taxpayers have until August 20, 2026 to file.</p></body></html>'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(detailHtml, { headers: { 'content-type': 'text/html' } })),
    )
    const testEnv = env(queueSend)

    const result = await runPulseIngest(testEnv, [enrichAdapter('dor.enrich-a.example')])

    expect(result).toMatchObject({ snapshots: 1, queued: 1 })
    const put = (testEnv.R2_PULSE.put as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(put?.[1])).toContain('until August 20, 2026')
    expect(String(put?.[1])).not.toContain('index excerpt only')
    expect(repoMocks.createSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ publishedAt: new Date('2026-05-11T00:00:00.000Z') }),
    )
  })

  it('skips fetch, archive, and insert entirely for a same-hash duplicate', async () => {
    const queueSend = vi.fn()
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    repoMocks.sourceSnapshotPresence.mockResolvedValue('same_hash')
    const testEnv = env(queueSend)

    const result = await runPulseIngest(testEnv, [enrichAdapter('dor.enrich-a.example')])

    expect(result).toMatchObject({ duplicates: 1, queued: 0 })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect((testEnv.R2_PULSE.put as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0)
    expect(repoMocks.createSourceSnapshot).not.toHaveBeenCalled()
  })

  it('falls back to the index excerpt when the detail fetch fails, and never enriches other_hash items', async () => {
    const queueSend = vi.fn()
    // 404, not 5xx — the polite fetcher retries server errors with backoff,
    // which would stall the test; a 404 detail page is a clean fallback case.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 404 })),
    )
    let testEnv = env(queueSend)
    await runPulseIngest(testEnv, [enrichAdapter('dor.enrich-c.example')])
    let put = (testEnv.R2_PULSE.put as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(put?.[1])).toContain('index excerpt only')

    // other_hash (rehash migration / content update): no detail fetch at all.
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    repoMocks.sourceSnapshotPresence.mockResolvedValue('other_hash')
    repoMocks.createSourceSnapshot.mockResolvedValue({
      inserted: true,
      snapshot: { id: 'snapshot-2' },
    })
    testEnv = env(queueSend)
    await runPulseIngest(testEnv, [enrichAdapter('dor.enrich-d.example')])
    expect(fetchSpy).not.toHaveBeenCalled()
    put = (testEnv.R2_PULSE.put as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(put?.[1])).toContain('index excerpt only')
  })

  it('suppresses the one-time dedupe-rehash of a known item instead of re-extracting it', async () => {
    const queueSend = vi.fn()
    const dedupeAdapter = adapter({
      async parse() {
        return [
          {
            sourceId: 'fema.declarations',
            externalId: 'DR-123',
            title: 'FEMA declaration',
            publishedAt: new Date('2026-04-29T00:00:00.000Z'),
            officialSourceUrl: 'https://www.fema.gov/disaster/123',
            jurisdiction: 'CA',
            rawText: 'FEMA declaration raw text',
            dedupeText: 'FEMA declaration\nhttps://www.fema.gov/disaster/123',
          },
        ]
      },
    })
    // The item has prior rows, all legacy whole-page hashes — this insert is the
    // hash-basis migration, not news.
    repoMocks.listItemSnapshotContentHashes.mockResolvedValue(['a'.repeat(64)])

    const result = await runPulseIngest(env(queueSend), [dedupeAdapter])

    expect(result).toMatchObject({ snapshots: 1, queued: 0, duplicates: 1 })
    expect(repoMocks.updateSourceSnapshotStatus).toHaveBeenCalledWith('snapshot-1', {
      parseStatus: 'ignored',
      failureReason: 'dedupe_rehash_migration',
    })
    expect(queueSend).not.toHaveBeenCalled()
    expect(repoMocks.listItemSnapshotContentHashes).toHaveBeenCalledWith({
      sourceId: 'fema.declarations',
      externalId: 'DR-123',
      excludeId: 'snapshot-1',
    })
  })

  it('extracts normally once an item already has a v2 hash row (real content change)', async () => {
    const queueSend = vi.fn()
    const dedupeAdapter = adapter({
      async parse() {
        return [
          {
            sourceId: 'fema.declarations',
            externalId: 'DR-123',
            title: 'FEMA declaration (amended)',
            publishedAt: new Date('2026-04-29T00:00:00.000Z'),
            officialSourceUrl: 'https://www.fema.gov/disaster/123',
            jurisdiction: 'CA',
            rawText: 'FEMA declaration amended raw text',
            dedupeText: 'FEMA declaration (amended)\nhttps://www.fema.gov/disaster/123',
          },
        ]
      },
    })
    repoMocks.listItemSnapshotContentHashes.mockResolvedValue(['a'.repeat(64), 'item-v2:abcd'])

    const result = await runPulseIngest(env(queueSend), [dedupeAdapter])

    expect(result).toMatchObject({ snapshots: 1, queued: 1, duplicates: 0 })
    expect(queueSend).toHaveBeenCalledWith({ type: 'pulse.extract', snapshotId: 'snapshot-1' })
    expect(repoMocks.updateSourceSnapshotStatus).not.toHaveBeenCalled()
  })

  it('establishes a new source baseline without queueing historical parsed items', async () => {
    const queueSend = vi.fn()
    repoMocks.ensureSourceState.mockResolvedValue({
      enabled: true,
      nextCheckAt: null,
      monitoringBaselineAt: null,
      baselineMode: 'establish_on_first_seen',
    })

    const result = await runPulseIngest(env(queueSend), [adapter()])

    expect(result).toMatchObject({ snapshots: 1, queued: 0, failures: 0 })
    expect(repoMocks.updateSourceSnapshotStatus).toHaveBeenCalledWith('snapshot-1', {
      parseStatus: 'ignored',
      failureReason: 'monitoring_baseline_established',
    })
    expect(repoMocks.establishSourceBaseline).toHaveBeenCalledWith({
      sourceId: 'fema.declarations',
      baselineAt: expect.any(Date),
    })
    expect(repoMocks.recordSourceSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'fema.declarations',
        changed: false,
      }),
    )
    expect(queueSend).not.toHaveBeenCalled()
  })

  it('classifies changed snapshots with no parsed items as selector drift', async () => {
    const result = await runPulseIngest(env(), [
      adapter({
        async parse() {
          return []
        },
      }),
    ])

    expect(result).toMatchObject({ failures: 1, queued: 0 })
    expect(repoMocks.recordSourceFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'fema.declarations',
        error: expect.stringContaining('selector_drift'),
      }),
    )
  })

  it('allows sparse announcement-list adapters to report no relevant items', async () => {
    const result = await runPulseIngest(env(), [
      adapter({
        id: 'policy-watch.az.announcements',
        tier: 'T1',
        jurisdiction: 'AZ',
        allowEmptyParse: true,
        async parse() {
          return []
        },
      }),
    ])

    expect(result).toMatchObject({ failures: 0, queued: 0 })
    expect(repoMocks.createSourceSnapshot).not.toHaveBeenCalled()
    expect(repoMocks.recordSourceSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'policy-watch.az.announcements',
        changed: false,
      }),
    )
  })

  it('emits idle alerts only for sources still present in the active adapter set', async () => {
    repoMocks.listSourceStates.mockResolvedValue([
      {
        sourceId: 'fema.declarations',
        tier: 'T2',
        jurisdiction: 'US',
        enabled: true,
        healthStatus: 'healthy',
        lastSuccessAt: new Date('2026-04-30T00:00:00.000Z'),
      },
      {
        sourceId: 'ca.income_tax',
        tier: 'T1',
        jurisdiction: 'CA',
        enabled: true,
        healthStatus: 'failing',
        lastSuccessAt: null,
      },
    ])

    await runPulseIngest(env(), [adapter()])

    expect(metricsMocks.emitSourceIdleAlerts).toHaveBeenCalledWith([
      expect.objectContaining({ sourceId: 'fema.declarations' }),
    ])
  })

  it('routes the RI disaster advisory source through Browser Rendering', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response('<main>Browserless body</main>', {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'x-response-code': '200',
        },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await runPulseIngest(
      {
        ...env(),
        PULSE_BROWSERLESS_URL: 'https://browserless.test/content',
        PULSE_BROWSERLESS_TOKEN: 'browserless-token',
        PULSE_BROWSERLESS_SOURCE_IDS: 'ri.tax_disaster_advisories',
      },
      [
        adapter({
          id: 'ri.tax_disaster_advisories',
          jurisdiction: 'RI',
          async fetch(ctx) {
            const response = await ctx.fetch('https://tax.ri.gov/guidance/advisories')
            return [
              {
                sourceId: 'ri.tax_disaster_advisories',
                fetchedAt: new Date('2026-04-30T00:00:00.000Z'),
                contentHash: 'raw-hash',
                r2Key: 'raw.html',
                body: await response.text(),
                contentType: response.headers.get('content-type'),
                etag: null,
                lastModified: null,
              },
            ]
          },
        }),
      ],
    )

    expect(result).toMatchObject({ failures: 0, snapshots: 1, queued: 1 })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://browserless.test/content?token=browserless-token',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"url":"https://tax.ri.gov/guidance/advisories"'),
      }),
    )
  })
})

describe('enqueuePulseIngestScans', () => {
  beforeEach(() => {
    Object.values(dbMocks).forEach((mock) => mock.mockClear())
    Object.values(metricsMocks).forEach((mock) => mock.mockClear())
    Object.values(repoMocks).forEach((mock) => mock.mockReset())
    repoMocks.listSourceStates.mockResolvedValue([])
    // Batched ensureSourceStates delegates to the per-source ensureSourceState
    // mock so each test's ensureSourceState setup keeps driving behavior.
    repoMocks.ensureSourceStates.mockImplementation(
      async (inputs: ReadonlyArray<{ sourceId: string }>, now?: Date) => {
        const entries = await Promise.all(
          inputs.map(async (input) => {
            const state = await repoMocks.ensureSourceState({ ...input, now })
            return [input.sourceId, state] as const
          }),
        )
        return new Map(entries)
      },
    )
  })

  it('enqueues one message per due source and never fetches', async () => {
    const now = new Date('2026-05-01T00:00:00.000Z')
    repoMocks.ensureSourceState.mockImplementation(async (input: { sourceId: string }) =>
      input.sourceId === 'due.source'
        ? { enabled: true, nextCheckAt: null }
        : { enabled: true, nextCheckAt: new Date('2026-05-01T01:00:00.000Z') },
    )
    const queueSend = vi.fn()

    const result = await enqueuePulseIngestScans(
      env(queueSend),
      [adapter({ id: 'due.source' }), adapter({ id: 'not-due.source' })],
      now,
    )

    expect(result).toEqual({ queued: 1 })
    expect(queueSend).toHaveBeenCalledTimes(1)
    expect(queueSend).toHaveBeenCalledWith({
      type: 'pulse.ingest.source',
      sourceId: 'due.source',
      sourceIds: ['due.source'],
      reason: 'cadence_due',
    })
    expect(repoMocks.createSourceSnapshot).not.toHaveBeenCalled()
    expect(repoMocks.recordSourceSuccess).not.toHaveBeenCalled()
  })

  it('groups due sources sharing a polite host into one message', async () => {
    const now = new Date('2026-05-01T00:00:00.000Z')
    repoMocks.ensureSourceState.mockResolvedValue({ enabled: true, nextCheckAt: null })
    const queueSend = vi.fn()

    const result = await enqueuePulseIngestScans(
      env(queueSend),
      [adapter({ id: 'ny.due.one' }), adapter({ id: 'ny.due.two' }), adapter({ id: 'ca.due' })],
      now,
      (sourceId) => (sourceId.startsWith('ny.') ? 'tax.ny.gov' : 'www.ftb.ca.gov'),
    )

    expect(result).toEqual({ queued: 3 })
    expect(queueSend).toHaveBeenCalledTimes(2)
    expect(queueSend).toHaveBeenCalledWith({
      type: 'pulse.ingest.source',
      sourceId: 'ny.due.one',
      sourceIds: ['ny.due.one', 'ny.due.two'],
      reason: 'cadence_due',
    })
    expect(queueSend).toHaveBeenCalledWith({
      type: 'pulse.ingest.source',
      sourceId: 'ca.due',
      sourceIds: ['ca.due'],
      reason: 'cadence_due',
    })
    expect(metricsMocks.recordPulseMetric).toHaveBeenCalledWith('pulse.ingest.enqueued', {
      queued: 3,
      messages: 2,
    })
  })

  it('chunks oversized host groups and keeps unresolvable hosts as singletons', async () => {
    const now = new Date('2026-05-01T00:00:00.000Z')
    repoMocks.ensureSourceState.mockResolvedValue({ enabled: true, nextCheckAt: null })
    const queueSend = vi.fn()
    const hosted = ['h.1', 'h.2', 'h.3', 'h.4', 'h.5']

    await enqueuePulseIngestScans(
      env(queueSend),
      [...hosted, 'solo.a', 'solo.b'].map((id) => adapter({ id })),
      now,
      (sourceId) => (sourceId.startsWith('h.') ? 'shared.example.gov' : null),
    )

    const sent = queueSend.mock.calls.map((call) => call[0] as { sourceIds: string[] })
    const groupSizes = sent
      .filter((message) => message.sourceIds[0]?.startsWith('h.'))
      .map((message) => message.sourceIds.length)
      .toSorted((a, b) => a - b)
    expect(groupSizes).toEqual([1, 4])
    const soloMessages = sent.filter((message) => message.sourceIds[0]?.startsWith('solo.'))
    expect(soloMessages.map((message) => message.sourceIds)).toEqual([['solo.a'], ['solo.b']])
  })

  it('emits idle alerts over the active set and records an enqueued metric', async () => {
    const now = new Date('2026-05-01T00:00:00.000Z')
    repoMocks.ensureSourceState.mockResolvedValue({ enabled: true, nextCheckAt: null })
    repoMocks.listSourceStates.mockResolvedValue([
      {
        sourceId: 'fema.declarations',
        tier: 'T2',
        jurisdiction: 'US',
        enabled: true,
        healthStatus: 'healthy',
        lastSuccessAt: null,
      },
      {
        sourceId: 'gone.source',
        tier: 'T1',
        jurisdiction: 'CA',
        enabled: true,
        healthStatus: 'healthy',
        lastSuccessAt: null,
      },
    ])

    await enqueuePulseIngestScans(env(), [adapter()], now)

    expect(metricsMocks.emitSourceIdleAlerts).toHaveBeenCalledWith(
      [expect.objectContaining({ sourceId: 'fema.declarations' })],
      now,
    )
    expect(metricsMocks.recordPulseMetric).toHaveBeenCalledWith('pulse.ingest.enqueued', {
      queued: 1,
      messages: 1,
    })
  })
})

describe('consumePulseIngestSource', () => {
  beforeEach(() => {
    Object.values(dbMocks).forEach((mock) => mock.mockClear())
    Object.values(metricsMocks).forEach((mock) => mock.mockClear())
    Object.values(repoMocks).forEach((mock) => mock.mockReset())
    repoMocks.ensureSourceState.mockResolvedValue({ enabled: true, nextCheckAt: null })
    repoMocks.getSourceState.mockResolvedValue(null)
    repoMocks.createSourceSnapshot.mockResolvedValue({
      inserted: true,
      snapshot: { id: 'snapshot-1' },
    })
    repoMocks.listSourceStates.mockResolvedValue([])
    repoMocks.listItemSnapshotContentHashes.mockResolvedValue([])
    repoMocks.sourceSnapshotPresence.mockResolvedValue('absent')
  })

  it('fetches the single named source and queues its extract', async () => {
    const queueSend = vi.fn()

    const result = await consumePulseIngestSource(
      env(queueSend),
      { type: 'pulse.ingest.source', sourceId: 'fema.declarations', reason: 'cadence_due' },
      [adapter()],
    )

    expect(result).toMatchObject({ snapshots: 1, queued: 1, failures: 0 })
    expect(queueSend).toHaveBeenCalledWith({ type: 'pulse.extract', snapshotId: 'snapshot-1' })
  })

  it('processes a host group sequentially through one shared ingest context', async () => {
    const queueSend = vi.fn()
    const order: string[] = []
    const groupAdapter = (id: string) =>
      adapter({
        id,
        async fetch() {
          order.push(`fetch:${id}`)
          return [
            {
              sourceId: id,
              fetchedAt: new Date('2026-04-30T00:00:00.000Z'),
              contentHash: `raw-${id}`,
              r2Key: `raw-${id}.html`,
              body: 'raw body',
              contentType: 'text/html',
              etag: null,
              lastModified: null,
            },
          ]
        },
        async parse() {
          order.push(`parse:${id}`)
          return [
            {
              sourceId: id,
              externalId: `${id}-item`,
              title: `${id} item`,
              publishedAt: new Date('2026-04-29T00:00:00.000Z'),
              officialSourceUrl: `https://shared.example.gov/${id}`,
              rawText: `${id} raw text`,
            },
          ]
        },
      })

    const result = await consumePulseIngestSource(
      env(queueSend),
      {
        type: 'pulse.ingest.source',
        sourceId: 'shared.one',
        sourceIds: ['shared.one', 'shared.two'],
        reason: 'cadence_due',
      },
      [groupAdapter('shared.one'), groupAdapter('shared.two')],
    )

    expect(result).toMatchObject({ snapshots: 2, queued: 2, failures: 0 })
    // Strict sequence: the second source starts only after the first finished.
    expect(order).toEqual([
      'fetch:shared.one',
      'parse:shared.one',
      'fetch:shared.two',
      'parse:shared.two',
    ])
    expect(dbMocks.createDb).toHaveBeenCalledTimes(1)
  })

  it('skips unknown ids inside a group without dropping the rest', async () => {
    const queueSend = vi.fn()

    const result = await consumePulseIngestSource(
      env(queueSend),
      {
        type: 'pulse.ingest.source',
        sourceId: 'fema.declarations',
        sourceIds: ['fema.declarations', 'does.not.exist'],
        reason: 'cadence_due',
      },
      [adapter()],
    )

    expect(result).toMatchObject({ snapshots: 1, queued: 1, failures: 0 })
    expect(metricsMocks.recordPulseMetric).toHaveBeenCalledWith('pulse.ingest.source_missing', {
      sourceId: 'does.not.exist',
    })
  })

  it('runs with force even when nextCheckAt is in the future', async () => {
    repoMocks.ensureSourceState.mockResolvedValue({
      enabled: true,
      nextCheckAt: new Date('2999-01-01T00:00:00.000Z'),
    })
    const queueSend = vi.fn()

    const result = await consumePulseIngestSource(
      env(queueSend),
      { type: 'pulse.ingest.source', sourceId: 'fema.declarations', reason: 'cadence_due' },
      [adapter()],
    )

    expect(result).toMatchObject({ snapshots: 1, queued: 1 })
    expect(queueSend).toHaveBeenCalledWith({ type: 'pulse.extract', snapshotId: 'snapshot-1' })
  })

  it('returns zero counts and records a metric for an unknown source', async () => {
    const queueSend = vi.fn()

    const result = await consumePulseIngestSource(
      env(queueSend),
      { type: 'pulse.ingest.source', sourceId: 'does.not.exist', reason: 'cadence_due' },
      [adapter()],
    )

    expect(result).toEqual({ snapshots: 0, queued: 0, duplicates: 0, failures: 0 })
    expect(metricsMocks.recordPulseMetric).toHaveBeenCalledWith('pulse.ingest.source_missing', {
      sourceId: 'does.not.exist',
    })
    expect(queueSend).not.toHaveBeenCalled()
    expect(repoMocks.createSourceSnapshot).not.toHaveBeenCalled()
  })
})

describe('createBrowserlessFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the Browserless content token query parameter', async () => {
    const fetchMock = vi.fn(async () => new Response('<main>ok</main>'))
    vi.stubGlobal('fetch', fetchMock)

    const browserlessFetch = createBrowserlessFetch({
      endpoint: 'https://browserless.test/content',
      token: 'secret-token',
    })

    await browserlessFetch?.('https://example.test/source')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://browserless.test/content?token=secret-token',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses browser-compatible target headers for Browserless page requests', async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => {
      return new Response('<main>ok</main>')
    })
    vi.stubGlobal('fetch', fetchMock)

    const browserlessFetch = createBrowserlessFetch({
      endpoint: 'https://browserless.test/content',
      token: 'secret-token',
    })

    await browserlessFetch?.('https://state-tax.example/news', {
      headers: {
        'User-Agent': 'DueDateHQ-PulseBot/1.0',
        'Cache-Control': 'no-cache',
      },
    })

    const [, init] = fetchMock.mock.calls[0]!
    expect(typeof init?.body).toBe('string')
    const requestBody = init?.body
    if (typeof requestBody !== 'string') throw new Error('Browserless request body must be JSON')
    const body = JSON.parse(requestBody) as Record<string, unknown>
    // Must match the browserless /content schema (additionalProperties:false):
    // url / userAgent / setExtraHTTPHeaders plus the networkidle render wait
    // (gotoOptions + bestAttempt) — never method/headers/body, which previously
    // triggered HTTP 400.
    expect(Object.keys(body).toSorted()).toEqual([
      'bestAttempt',
      'gotoOptions',
      'setExtraHTTPHeaders',
      'url',
      'userAgent',
    ])
    expect(body).not.toHaveProperty('method')
    expect(body).not.toHaveProperty('headers')
    expect(body).not.toHaveProperty('body')
    // Render after the network settles so client-rendered news lands in the HTML;
    // bestAttempt returns what rendered if the idle wait times out.
    expect(body.gotoOptions).toEqual({ waitUntil: 'networkidle2', timeout: 20_000 })
    expect(body.bestAttempt).toBe(true)
    // Caller-provided User-Agent is hoisted to the top-level `userAgent` field —
    // a CDP setUserAgentOverride-shaped OBJECT (cloud schema as of 2026-06-10).
    expect(body.userAgent).toEqual({ userAgent: 'DueDateHQ-PulseBot/1.0' })
    const extraHeaders = body.setExtraHTTPHeaders as Record<string, string>
    // Cache-Control is stripped from extra headers; Accept is kept. The UA also
    // rides as a header so a userAgent-field schema drift degrades gracefully.
    expect(extraHeaders['cache-control']).toBeUndefined()
    expect(extraHeaders['user-agent']).toBe('DueDateHQ-PulseBot/1.0')
    expect(extraHeaders.accept).toContain('text/html')
  })

  it('renders through Cloudflare Browser Rendering when the endpoint is a CF host', async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => {
      // CF /content wraps the rendered HTML in the standard API envelope.
      return new Response(
        JSON.stringify({ success: true, errors: null, result: '<main>cf body</main>' }),
        {
          headers: { 'content-type': 'application/json' },
        },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const endpoint = 'https://api.cloudflare.com/client/v4/accounts/acct/browser-rendering/content'
    const browserlessFetch = createBrowserlessFetch({ endpoint, token: 'cf-token' })

    const response = await browserlessFetch?.('https://state-tax.example/news', {
      headers: { 'User-Agent': 'DueDateHQ-PulseBot/1.0' },
    })

    // Body is the unwrapped `result`, served as HTML.
    expect(await response?.text()).toBe('<main>cf body</main>')
    expect(response?.headers.get('content-type')).toContain('text/html')

    const [calledUrl, init] = fetchMock.mock.calls[0]!
    // CF carries the token in an Authorization header — never as a ?token= query param.
    expect(calledUrl).toBe(endpoint)
    const headers = init?.headers as Record<string, string> | undefined
    expect(headers?.Authorization).toBe('Bearer cf-token')

    const body = JSON.parse(init?.body as string) as Record<string, unknown>
    expect(Object.keys(body).toSorted()).toEqual([
      'gotoOptions',
      'rejectResourceTypes',
      'setExtraHTTPHeaders',
      'url',
      'userAgent',
    ])
    // CF's schema takes a plain-string userAgent (browserless.io flipped it to an object).
    expect(body.userAgent).toBe('DueDateHQ-PulseBot/1.0')
    // Wait for the network to settle so client-rendered news lists land in the HTML.
    expect(body.gotoOptions).toEqual({ waitUntil: 'networkidle0', timeout: 25_000 })
    expect(body.rejectResourceTypes).toEqual(['image', 'media', 'font'])
  })

  it('retries without the userAgent field when the cloud schema rejects it', async () => {
    const fetchMock = vi
      .fn(
        async (_input: string | URL | Request, _init?: RequestInit) =>
          new Response('<main>ok</main>'),
      )
      .mockImplementationOnce(
        async () =>
          new Response('POST Body validation failed: "userAgent" must be object', {
            status: 400,
          }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const browserlessFetch = createBrowserlessFetch({
      endpoint: 'https://browserless.test/content',
      token: 'secret-token',
    })

    const response = await browserlessFetch?.('https://state-tax.example/news', {
      headers: { 'User-Agent': 'DueDateHQ-PulseBot/1.0' },
    })

    expect(response?.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const retryBody = JSON.parse(fetchMock.mock.calls[1]![1]?.body as string) as Record<
      string,
      unknown
    >
    // The schema-rejected field is dropped; the UA survives as a target header.
    expect(retryBody).not.toHaveProperty('userAgent')
    expect((retryBody.setExtraHTTPHeaders as Record<string, string>)['user-agent']).toBe(
      'DueDateHQ-PulseBot/1.0',
    )
  })

  it('paces and retries once when browserless itself returns 429', async () => {
    const fetchMock = vi
      .fn(
        async (_input: string | URL | Request, _init?: RequestInit) =>
          new Response('<main>ok</main>'),
      )
      .mockImplementationOnce(async () => new Response('429 Too Many Requests', { status: 429 }))
    vi.stubGlobal('fetch', fetchMock)

    const browserlessFetch = createBrowserlessFetch({
      endpoint: 'https://browserless.test/content',
      token: 'secret-token',
      retry429DelayMs: 1,
    })

    const response = await browserlessFetch?.('https://state-tax.example/news')
    expect(response?.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 429 reported FROM the target site', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('<html>slow down</html>', {
          status: 200,
          headers: { 'x-response-code': '429' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const browserlessFetch = createBrowserlessFetch({
      endpoint: 'https://browserless.test/content',
      retry429DelayMs: 1,
    })

    const response = await browserlessFetch?.('https://state-tax.example/news')
    expect(response?.status).toBe(429)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('serializes concurrent renders through one isolate-wide slot', async () => {
    let releaseFirst!: (response: Response) => void
    const fetchMock = vi
      .fn(
        async (_input: string | URL | Request, _init?: RequestInit) =>
          new Response('<main>ok</main>'),
      )
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (releaseFirst = resolve)))
    vi.stubGlobal('fetch', fetchMock)

    const browserlessFetch = createBrowserlessFetch({
      endpoint: 'https://browserless.test/content',
    })

    const first = browserlessFetch?.('https://a-state.example/news')
    const second = browserlessFetch?.('https://b-state.example/news')
    await new Promise((resolve) => setTimeout(resolve, 20))
    // The second render must wait for the first to settle.
    expect(fetchMock).toHaveBeenCalledTimes(1)

    releaseFirst(new Response('<main>first</main>'))
    await Promise.all([first, second])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry 400s unrelated to the userAgent field', async () => {
    const fetchMock = vi.fn(
      async () => new Response('POST Body validation failed: "url" must be uri', { status: 400 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const browserlessFetch = createBrowserlessFetch({
      endpoint: 'https://browserless.test/content',
      token: 'secret-token',
    })

    const response = await browserlessFetch?.('https://state-tax.example/news')
    expect(response?.status).toBe(400)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('maps target response codes reported by Browserless', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response('<html>blocked</html>', {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'x-response-code': '403',
          },
        })
      }),
    )

    const browserlessFetch = createBrowserlessFetch({
      endpoint: 'https://browserless.test/content?token=existing-token',
    })

    const response = await browserlessFetch?.('https://blocked-state.test/')

    expect(response?.status).toBe(403)
    await expect(response?.text()).resolves.toContain('blocked')
  })
})

describe('createPoliteFetch', () => {
  it('does not spend the per-host crawl delay on robots.txt checks', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok'))
    const politeFetch = createPoliteFetch(fetchImpl)

    await politeFetch('https://comptroller.texas.gov/robots.txt')
    await politeFetch('https://comptroller.texas.gov/about/media-center/news/')

    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('spaces same-host fetch starts by the politeness interval', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn(async () => new Response('ok'))
      const politeFetch = createPoliteFetch(fetchImpl)

      const first = politeFetch('https://tax.example.gov/a')
      const second = politeFetch('https://tax.example.gov/b')
      await vi.advanceTimersByTimeAsync(0)
      expect(fetchImpl).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(30_000)
      expect(fetchImpl).toHaveBeenCalledTimes(2)
      await Promise.all([first, second])
    } finally {
      vi.useRealTimers()
    }
  })

  it('coordinates separate instances that share one host state', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn(async () => new Response('ok'))
      const shared = createPoliteHostState()
      const politeA = createPoliteFetch(fetchImpl, shared)
      const politeB = createPoliteFetch(fetchImpl, shared)

      const first = politeA('https://tax.example.gov/a')
      const second = politeB('https://tax.example.gov/b')
      await vi.advanceTimersByTimeAsync(0)
      // Two queue invocations in one isolate no longer hit the host together.
      expect(fetchImpl).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(30_000)
      expect(fetchImpl).toHaveBeenCalledTimes(2)
      await Promise.all([first, second])
    } finally {
      vi.useRealTimers()
    }
  })

  it('never makes distinct hosts wait on each other', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn(async () => new Response('ok'))
      const politeFetch = createPoliteFetch(fetchImpl, createPoliteHostState())

      const first = politeFetch('https://tax.ny.gov/a')
      const second = politeFetch('https://www.ftb.ca.gov/b')
      await vi.advanceTimersByTimeAsync(0)
      expect(fetchImpl).toHaveBeenCalledTimes(2)
      await Promise.all([first, second])
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps instances without shared state independent (test-isolation default)', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn(async () => new Response('ok'))
      const politeA = createPoliteFetch(fetchImpl)
      const politeB = createPoliteFetch(fetchImpl)

      const first = politeA('https://tax.example.gov/a')
      const second = politeB('https://tax.example.gov/b')
      await vi.advanceTimersByTimeAsync(0)
      expect(fetchImpl).toHaveBeenCalledTimes(2)
      await Promise.all([first, second])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('archivePulseRaw', () => {
  const input = {
    sourceId: 'fed.irs_pub_15_2026',
    externalId: 'https://www.irs.gov/pub/irs-pdf/p15.pdf',
    fetchedAt: new Date('2026-06-10T00:00:00.000Z'),
    body: 'excerpt text',
  }

  it('archives the full-text sibling without changing the main key or hash', async () => {
    const putA = vi.fn(async (_key: string, _value: unknown) => undefined)
    const putB = vi.fn(async (_key: string, _value: unknown) => undefined)
    const head = vi.fn(async () => null)
    const envA = { R2_PULSE: { put: putA, head } as unknown as R2Bucket }
    const envB = { R2_PULSE: { put: putB, head } as unknown as R2Bucket }

    const withoutFull = await archivePulseRaw(envA, input)
    const withFull = await archivePulseRaw(envB, {
      ...input,
      fullText: 'excerpt text plus the rest of the page',
    })

    // contentHash and r2Key derive from body only — the sibling never
    // re-snapshots existing sources.
    expect(withFull).toEqual(withoutFull)
    expect(putA).toHaveBeenCalledTimes(1)
    expect(putB).toHaveBeenCalledTimes(2)
    expect(putB.mock.calls[1]?.[0]).toBe(pulseFullTextR2Key(withFull.r2Key))
    expect(putB.mock.calls[1]?.[1]).toBe('excerpt text plus the rest of the page')
  })

  it('skips the sibling when the full text adds nothing', async () => {
    const put = vi.fn(async () => undefined)
    await archivePulseRaw(
      { R2_PULSE: { put, head: vi.fn(async () => null) } as unknown as R2Bucket },
      {
        ...input,
        fullText: input.body,
      },
    )
    expect(put).toHaveBeenCalledTimes(1)
  })

  it('hashes dedupeText with the item-v2 prefix, independent of body churn', async () => {
    const put = vi.fn(async (_key: string, _value: unknown) => undefined)
    const head = vi.fn(async () => null)
    const r2env = { R2_PULSE: { put, head } as unknown as R2Bucket }

    const first = await archivePulseRaw(r2env, { ...input, dedupeText: 'stable item identity' })
    const second = await archivePulseRaw(r2env, {
      ...input,
      body: 'completely different listing page text',
      dedupeText: 'stable item identity',
    })

    expect(first.contentHash.startsWith('item-v2:')).toBe(true)
    expect(second.contentHash).toBe(first.contentHash)
    expect(second.r2Key).toBe(first.r2Key)
  })

  it('keeps the first archived body when the stable key already exists', async () => {
    const put = vi.fn(async (_key: string, _value: unknown) => undefined)
    const head = vi.fn(async () => ({ key: 'exists' }))

    const result = await archivePulseRaw(
      { R2_PULSE: { put, head } as unknown as R2Bucket },
      { ...input, dedupeText: 'stable item identity' },
    )

    expect(result.contentHash.startsWith('item-v2:')).toBe(true)
    expect(put).not.toHaveBeenCalled()
  })
})
