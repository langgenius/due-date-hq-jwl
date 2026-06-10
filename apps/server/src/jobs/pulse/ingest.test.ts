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

  it('routes configured source ids through Browserless without changing adapter code', async () => {
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
        PULSE_BROWSERLESS_SOURCE_IDS: 'ny.dtf.press',
      },
      [
        adapter({
          id: 'ny.dtf.press',
          jurisdiction: 'NY',
          async fetch(ctx) {
            const response = await ctx.fetch('https://www.tax.ny.gov/press/')
            return [
              {
                sourceId: 'ny.dtf.press',
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
        body: expect.stringContaining('"url":"https://www.tax.ny.gov/press/"'),
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
      reason: 'cadence_due',
    })
    expect(repoMocks.createSourceSnapshot).not.toHaveBeenCalled()
    expect(repoMocks.recordSourceSuccess).not.toHaveBeenCalled()
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
    // only url / userAgent / setExtraHTTPHeaders — never method/headers/body,
    // which previously triggered HTTP 400.
    expect(Object.keys(body).toSorted()).toEqual(['setExtraHTTPHeaders', 'url', 'userAgent'])
    expect(body).not.toHaveProperty('method')
    expect(body).not.toHaveProperty('headers')
    expect(body).not.toHaveProperty('body')
    // Caller-provided User-Agent is hoisted to the top-level `userAgent` field.
    expect(body.userAgent).toBe('DueDateHQ-PulseBot/1.0')
    const extraHeaders = body.setExtraHTTPHeaders as Record<string, string>
    // Cache-Control and User-Agent are stripped from extra headers; Accept is kept.
    expect(extraHeaders['cache-control']).toBeUndefined()
    expect(extraHeaders['user-agent']).toBeUndefined()
    expect(extraHeaders.accept).toContain('text/html')
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
    const politeFetch = createPoliteFetch(fetchImpl as unknown as typeof fetch)

    await politeFetch('https://comptroller.texas.gov/robots.txt')
    await politeFetch('https://comptroller.texas.gov/about/media-center/news/')

    expect(fetchImpl).toHaveBeenCalledTimes(2)
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
    const envA = { R2_PULSE: { put: putA } as unknown as R2Bucket }
    const envB = { R2_PULSE: { put: putB } as unknown as R2Bucket }

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
      { R2_PULSE: { put } as unknown as R2Bucket },
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
