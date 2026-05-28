import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import { createSourceFetcherRegistry } from '@duedatehq/ingest'
import { hashText } from '@duedatehq/ingest/http'
import { RATE_LIMIT } from '@duedatehq/ingest/http'
import type { IngestCtx, SourceAdapter } from '@duedatehq/ingest/types'
import type { Env } from '../../env'
import { createBrowserlessFetch } from './browserless'
import { emitSourceIdleAlerts, recordPulseMetric } from './metrics'
import { liveRegulatorySourceAdapters } from './rule-source-adapters'

export interface PulseExtractQueueMessage {
  type: 'pulse.extract'
  snapshotId: string
}

interface IngestCounts {
  snapshots: number
  queued: number
  duplicates: number
  failures: number
}

function parseSourceIdList(value: string | undefined): ReadonlySet<string> {
  if (!value) return new Set()
  return new Set(
    value
      .split(',')
      .map((sourceId) => sourceId.trim())
      .filter(Boolean),
  )
}

function safePathPart(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'snapshot'
  )
}

export async function archivePulseRaw(
  env: Pick<Env, 'R2_PULSE'>,
  input: {
    sourceId: string
    externalId: string
    fetchedAt: Date
    body: string
    contentType?: string | null
  },
): Promise<{ r2Key: string; contentHash: string }> {
  const contentHash = await hashText(input.body)
  const r2Key = [
    'pulse',
    safePathPart(input.sourceId),
    input.fetchedAt.toISOString().slice(0, 10),
    `${safePathPart(input.externalId).slice(0, 80)}-${contentHash.slice(0, 16)}.txt`,
  ].join('/')

  await env.R2_PULSE.put(r2Key, input.body, {
    httpMetadata: { contentType: input.contentType ?? 'text/plain; charset=utf-8' },
    customMetadata: {
      sourceId: input.sourceId,
      externalId: input.externalId,
      fetchedAt: input.fetchedAt.toISOString(),
      contentHash,
    },
  })

  return { r2Key, contentHash }
}

function sumCounts(rows: readonly IngestCounts[]): IngestCounts {
  return rows.reduce(
    (acc, row) => ({
      snapshots: acc.snapshots + row.snapshots,
      queued: acc.queued + row.queued,
      duplicates: acc.duplicates + row.duplicates,
      failures: acc.failures + row.failures,
    }),
    { snapshots: 0, queued: 0, duplicates: 0, failures: 0 },
  )
}

function nextCheckAt(from: Date, intervalMs: number): Date {
  return new Date(from.getTime() + intervalMs)
}

function resolveFetcherForAdapter(
  adapter: SourceAdapter,
  ctx: Pick<IngestCtx, 'browserlessFetch' | 'govdeliveryFetch'>,
  browserlessSourceIds: ReadonlySet<string> | undefined,
): NonNullable<SourceAdapter['fetcher']> {
  if (browserlessSourceIds?.has(adapter.id) && ctx.browserlessFetch) return 'browserless'
  if (adapter.fetcher === 'browserless') return ctx.browserlessFetch ? 'browserless' : 'cloudflare'
  if (adapter.fetcher === 'govdelivery') return ctx.govdeliveryFetch ? 'govdelivery' : 'cloudflare'
  return adapter.fetcher ?? 'cloudflare'
}

export function createPoliteFetch(fetchImpl: typeof fetch): typeof fetch {
  const locks = new Map<string, Promise<void>>()
  const lastFetchAt = new Map<string, number>()

  return (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url =
      input instanceof Request ? new URL(input.url) : input instanceof URL ? input : new URL(input)
    const host = url.host
    const previous = locks.get(host) ?? Promise.resolve()
    if (url.pathname === '/robots.txt') {
      locks.set(
        host,
        previous.catch(() => undefined).then(() => undefined),
      )
      await previous
      return fetchImpl(input, init)
    }

    const run = previous.then(async () => {
      const last = lastFetchAt.get(host) ?? 0
      const waitMs = Math.max(0, RATE_LIMIT.minIntervalMs - (Date.now() - last))
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs))
      lastFetchAt.set(host, Date.now())
    })
    locks.set(
      host,
      run.catch(() => undefined).then(() => undefined),
    )
    await run
    return fetchImpl(input, init)
  }) as typeof fetch
}

async function ingestAdapter(
  adapter: SourceAdapter,
  ctx: IngestCtx,
  repo: ReturnType<typeof makePulseOpsRepo>,
  queue: Pick<Queue, 'send'>,
  opts: { force?: boolean; browserlessSourceIds?: ReadonlySet<string> } = {},
): Promise<IngestCounts> {
  const checkedAt = new Date()
  const state = await repo.ensureSourceState({
    sourceId: adapter.id,
    tier: adapter.tier,
    jurisdiction: adapter.jurisdiction,
    cadenceMs: adapter.cronIntervalMs,
    now: checkedAt,
  })
  if (
    !state.enabled ||
    (!opts.force && state.nextCheckAt && state.nextCheckAt.getTime() > checkedAt.getTime())
  ) {
    return { snapshots: 0, queued: 0, duplicates: 0, failures: 0 }
  }

  try {
    const startedAt = Date.now()
    const cloudflareFetch: IngestCtx['fetch'] = (input, init) => ctx.fetch(input, init)
    const browserlessFetch = ctx.browserlessFetch
    const govdeliveryFetch = ctx.govdeliveryFetch
    const effectiveFetcher = resolveFetcherForAdapter(adapter, ctx, opts.browserlessSourceIds)
    const sourceFetch = createSourceFetcherRegistry(cloudflareFetch, {
      ...(browserlessFetch
        ? { browserlessFetch: (input, init) => browserlessFetch(input, init) }
        : {}),
      ...(govdeliveryFetch
        ? { govdeliveryFetch: (input, init) => govdeliveryFetch(input, init) }
        : {}),
    })({ ...adapter, fetcher: effectiveFetcher })
    const adapterCtx: IngestCtx = { ...ctx, fetch: sourceFetch }
    const rawSnapshots = await adapter.fetch(adapterCtx)
    const parsedGroups = await Promise.all(
      rawSnapshots.map(async (rawSnapshot) => ({
        rawSnapshot,
        items: rawSnapshot.notModified ? [] : await adapter.parse(rawSnapshot, adapterCtx),
      })),
    )
    const changedSnapshots = rawSnapshots.filter((snapshot) => !snapshot.notModified).length
    const parsedItemCount = parsedGroups.reduce((count, group) => count + group.items.length, 0)
    if (changedSnapshots > 0 && parsedItemCount === 0 && !adapter.allowEmptyParse) {
      throw new Error(`selector_drift: ${adapter.id} produced no parsed items`)
    }

    const writes = parsedGroups.flatMap(({ rawSnapshot, items }) =>
      items.map(async (item): Promise<IngestCounts> => {
        const archived = await ctx.archiveRaw({
          sourceId: item.sourceId,
          externalId: item.externalId,
          fetchedAt: rawSnapshot.fetchedAt,
          body: item.rawText,
          contentType: 'text/plain; charset=utf-8',
        })
        const result = await repo.createSourceSnapshot({
          sourceId: item.sourceId,
          externalId: item.externalId,
          title: item.title,
          officialSourceUrl: item.officialSourceUrl,
          publishedAt: item.publishedAt,
          fetchedAt: rawSnapshot.fetchedAt,
          contentHash: archived.contentHash,
          rawR2Key: archived.r2Key,
        })
        if (!result.inserted) {
          return { snapshots: 1, queued: 0, duplicates: 1, failures: 0 }
        }
        await queue.send({
          type: 'pulse.extract',
          snapshotId: result.snapshot.id,
        } satisfies PulseExtractQueueMessage)
        return {
          snapshots: 1,
          queued: 1,
          duplicates: 0,
          failures: 0,
        }
      }),
    )

    const counts = sumCounts(await Promise.all(writes))
    const freshest = rawSnapshots.find((snapshot) => snapshot.etag || snapshot.lastModified)
    await repo.recordSourceSuccess({
      sourceId: adapter.id,
      checkedAt,
      nextCheckAt: nextCheckAt(checkedAt, adapter.cronIntervalMs),
      changed: counts.queued > 0,
      ...(freshest?.etag !== undefined ? { etag: freshest.etag } : {}),
      ...(freshest?.lastModified !== undefined ? { lastModified: freshest.lastModified } : {}),
    })
    recordPulseMetric('pulse.ingest.fetch_result', {
      sourceId: adapter.id,
      result: 'success',
      fetcher: effectiveFetcher,
      durationMs: Date.now() - startedAt,
      snapshots: counts.snapshots,
      queued: counts.queued,
      duplicates: counts.duplicates,
    })
    return counts
  } catch (error) {
    await repo.recordSourceFailure({
      sourceId: adapter.id,
      checkedAt,
      nextCheckAt: nextCheckAt(checkedAt, Math.min(adapter.cronIntervalMs, 15 * 60 * 1000)),
      error: error instanceof Error ? error.message : 'Pulse ingest failed.',
    })
    recordPulseMetric('pulse.ingest.fetch_result', {
      sourceId: adapter.id,
      result: 'failure',
      fetcher: resolveFetcherForAdapter(adapter, ctx, opts.browserlessSourceIds),
      durationMs: Date.now() - checkedAt.getTime(),
      error: error instanceof Error ? error.message : 'Pulse ingest failed.',
    })
    return { snapshots: 0, queued: 0, duplicates: 0, failures: 1 }
  }
}

export async function runPulseIngest(
  env: Pick<
    Env,
    | 'DB'
    | 'R2_PULSE'
    | 'PULSE_QUEUE'
    | 'PULSE_BROWSERLESS_URL'
    | 'PULSE_BROWSERLESS_TOKEN'
    | 'PULSE_BROWSERLESS_SOURCE_IDS'
  >,
  adapters: readonly SourceAdapter[] = liveRegulatorySourceAdapters,
  opts: { force?: boolean } = {},
): Promise<{
  snapshots: number
  queued: number
  duplicates: number
  failures: number
}> {
  const db = createDb(env.DB)
  const repo = makePulseOpsRepo(db)
  const browserlessFetch = createBrowserlessFetch({
    ...(env.PULSE_BROWSERLESS_URL ? { endpoint: env.PULSE_BROWSERLESS_URL } : {}),
    ...(env.PULSE_BROWSERLESS_TOKEN ? { token: env.PULSE_BROWSERLESS_TOKEN } : {}),
  })
  const browserlessSourceIds = parseSourceIdList(env.PULSE_BROWSERLESS_SOURCE_IDS)
  const ctx: IngestCtx = {
    fetch: createPoliteFetch(fetch),
    ...(browserlessFetch ? { browserlessFetch } : {}),
    getSourceState: async (sourceId) => {
      const state = await repo.getSourceState(sourceId)
      return state ? { etag: state.etag, lastModified: state.lastModified } : null
    },
    archiveRaw: (input: Parameters<IngestCtx['archiveRaw']>[0]) => archivePulseRaw(env, input),
  }

  const results = await Promise.all(
    adapters.map((adapter) =>
      ingestAdapter(adapter, ctx, repo, env.PULSE_QUEUE, { ...opts, browserlessSourceIds }),
    ),
  )
  const counts = sumCounts(results)
  const activeSourceIds = new Set(adapters.map((adapter) => adapter.id))
  emitSourceIdleAlerts(
    (await repo.listSourceStates()).filter((row) => activeSourceIds.has(row.sourceId)),
  )
  recordPulseMetric('pulse.ingest.run_result', { ...counts })
  return counts
}
