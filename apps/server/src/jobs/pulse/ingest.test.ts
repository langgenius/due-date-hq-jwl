/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Worker doubles only implement the Pulse ingest repo/R2/Queue surface.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SourceAdapter } from '@duedatehq/ingest/types'
import type { Env } from '../../env'
import { createBrowserlessFetch } from './browserless'
import { createPoliteFetch, runPulseIngest } from './ingest'

const { dbMocks, metricsMocks, repoMocks } = vi.hoisted(() => {
  const repo = {
    ensureSourceState: vi.fn(),
    getSourceState: vi.fn(),
    createSourceSignal: vi.fn(),
    createSourceSnapshot: vi.fn(),
    recordSourceSuccess: vi.fn(),
    recordSourceFailure: vi.fn(),
    listSourceStates: vi.fn(),
  }
  return {
    repoMocks: repo,
    metricsMocks: {
      emitSourceIdleAlerts: vi.fn(),
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
    canCreatePulse: false,
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
    repoMocks.createSourceSignal.mockResolvedValue({ inserted: true, signal: { id: 'signal-1' } })
    repoMocks.createSourceSnapshot.mockResolvedValue({
      inserted: true,
      snapshot: { id: 'snapshot-1' },
    })
    repoMocks.listSourceStates.mockResolvedValue([])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps T2 adapters as source signals instead of queueing extract', async () => {
    const queueSend = vi.fn()

    const result = await runPulseIngest(env(queueSend), [adapter()])

    expect(result).toMatchObject({ signals: 1, queued: 0, failures: 0 })
    expect(repoMocks.createSourceSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'fema.declarations',
        jurisdiction: 'CA',
        signalType: 'anticipated_pulse',
      }),
    )
    expect(repoMocks.recordSourceSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'fema.declarations' }),
    )
    expect(repoMocks.createSourceSnapshot).not.toHaveBeenCalled()
    expect(queueSend).not.toHaveBeenCalled()
  })

  it('classifies changed snapshots with no parsed items as selector drift', async () => {
    const result = await runPulseIngest(env(), [
      adapter({
        canCreatePulse: true,
        async parse() {
          return []
        },
      }),
    ])

    expect(result).toMatchObject({ failures: 1, queued: 0, signals: 0 })
    expect(repoMocks.recordSourceFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'fema.declarations',
        error: expect.stringContaining('selector_drift'),
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

    expect(result).toMatchObject({ failures: 0, signals: 1 })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://browserless.test/content?token=browserless-token',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"url":"https://www.tax.ny.gov/press/"'),
      }),
    )
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
