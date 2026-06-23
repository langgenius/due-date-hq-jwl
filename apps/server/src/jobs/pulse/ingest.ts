import { createDb, makePulseOpsRepo } from '@duedatehq/db'
import {
  announcementPublishedAtFromText,
  createSourceFetcherRegistry,
  stripHtml,
} from '@duedatehq/ingest'
import {
  DEFAULT_HEADERS,
  hashText,
  ITEM_DEDUPE_HASH_PREFIX,
  normalizeSourceText,
  textExcerpt,
  withFetchTimeout,
} from '@duedatehq/ingest/http'
import { RATE_LIMIT } from '@duedatehq/ingest/http'
import type { IngestCtx, ParsedItem, SourceAdapter } from '@duedatehq/ingest/types'
import type { Env } from '../../env'
import { dispatchOpsAlert, type OpsAlertEnv } from '../ops-alerts'
import { createBrowserlessFetch } from './browserless'
import { emitSourceIdleAlerts, recordPulseMetric } from './metrics'
import { liveRegulatorySourceAdapters, politeHostForAdapterId } from './rule-source-adapters'

export interface PulseExtractQueueMessage {
  type: 'pulse.extract'
  snapshotId: string
}

export const PULSE_INGEST_SOURCE_MESSAGE_TYPE = 'pulse.ingest.source'

// Failed sources retry on this cap instead of their full cadence — without it
// one transient failure parks a slow-cadence source for its whole interval
// (up to 90 days for quarterly rule sources).
export const PULSE_SOURCE_FAILURE_RETRY_MS = 15 * 60 * 1000
// Deterministic robots.txt refusals retry weekly instead — see the failure
// handler in runIngestForAdapter.
export const ROBOTS_DISALLOW_BACKOFF_MS = 7 * 24 * 60 * 60 * 1000

// One message per HOST GROUP of due sources, enqueued by the cron path
// (`enqueuePulseIngestScans`) and consumed group-sequentially
// (`consumePulseIngestSource`). The scheduled tick stays O(1) — it only decides
// which sources are due and fans them out. Sources sharing a host ride ONE
// message (and so fetch sequentially through one polite clock) because the
// per-host politeness limiter cannot span the up-to-5 concurrent consumer
// invocations — grouping is the cross-invocation guard. `sourceId` stays the
// group's first id for back/forward compatibility and DLQ logging; old
// single-source messages (no `sourceIds`) remain consumable.
export interface PulseIngestSourceMessage {
  type: typeof PULSE_INGEST_SOURCE_MESSAGE_TYPE
  sourceId: string
  sourceIds?: readonly string[]
  reason: 'cadence_due'
}

// Wall-clock budget per message: worst case per source ≈ 30s politeness slot +
// 30s watchdog fetch, ×2 for fetchWithRetry's 5xx re-fetch ≈ 2 min ⇒ 4 sources
// ≈ 8 min, safely inside the 15-min queue-consumer limit even though a batch's
// messages run under one invocation (they run concurrently across hosts).
// Do not raise without redoing that math.
export const MAX_SOURCES_PER_INGEST_MESSAGE = 4

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isPulseIngestSourceMessage(value: unknown): value is PulseIngestSourceMessage {
  return (
    isRecord(value) &&
    value.type === PULSE_INGEST_SOURCE_MESSAGE_TYPE &&
    typeof value.sourceId === 'string' &&
    (value.sourceIds === undefined ||
      (Array.isArray(value.sourceIds) &&
        value.sourceIds.every((entry) => typeof entry === 'string'))) &&
    value.reason === 'cadence_due'
  )
}

interface IngestCounts {
  snapshots: number
  queued: number
  duplicates: number
  failures: number
}

type PulseIngestRepo = Pick<
  ReturnType<typeof makePulseOpsRepo>,
  | 'ensureSourceState'
  | 'ensureSourceStates'
  | 'getSourceState'
  | 'establishSourceBaseline'
  | 'createSourceSnapshot'
  | 'updateSourceSnapshotStatus'
  | 'recordSourceSuccess'
  | 'recordSourceFailure'
  | 'listSourceStates'
  | 'listItemSnapshotContentHashes'
  | 'sourceSnapshotPresence'
>

function makePulseIngestRepo(db: ReturnType<typeof createDb>): PulseIngestRepo {
  const repo = makePulseOpsRepo(db)
  return {
    ensureSourceState: (input) => repo.ensureSourceState(input),
    ensureSourceStates: (inputs, now) => repo.ensureSourceStates(inputs, now),
    getSourceState: (sourceId) => repo.getSourceState(sourceId),
    establishSourceBaseline: (input) => repo.establishSourceBaseline(input),
    createSourceSnapshot: (input) => repo.createSourceSnapshot(input),
    updateSourceSnapshotStatus: (snapshotId, patch) =>
      repo.updateSourceSnapshotStatus(snapshotId, patch),
    recordSourceSuccess: (input) => repo.recordSourceSuccess(input),
    recordSourceFailure: (input) => repo.recordSourceFailure(input),
    listSourceStates: () => repo.listSourceStates(),
    listItemSnapshotContentHashes: (input) => repo.listItemSnapshotContentHashes(input),
    sourceSnapshotPresence: (input) => repo.sourceSnapshotPresence(input),
  }
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

// Sibling R2 key holding the FULL stripped page text for the drift check.
// Derivable from rawR2Key alone so the reader needs no new DB column; old
// snapshots simply have no sibling and fall back to the excerpt.
export function pulseFullTextR2Key(rawR2Key: string): string {
  return `${rawR2Key}.full`
}

export async function archivePulseRaw(
  env: Pick<Env, 'R2_PULSE'>,
  input: {
    sourceId: string
    externalId: string
    fetchedAt: Date
    body: string
    contentType?: string | null
    fullText?: string
    // Item-local dedupe basis (see ParsedItem.dedupeText): when set, contentHash
    // covers THIS text instead of body, so unrelated listing-page churn no longer
    // re-hashes every item. body remains what is archived and fed to AI.
    dedupeText?: string
  },
): Promise<{ r2Key: string; contentHash: string }> {
  const contentHash = input.dedupeText
    ? `${ITEM_DEDUPE_HASH_PREFIX}${await hashText(input.dedupeText)}`
    : await hashText(input.body)
  const r2Key = [
    'pulse',
    safePathPart(input.sourceId),
    input.fetchedAt.toISOString().slice(0, 10),
    `${safePathPart(input.externalId).slice(0, 80)}-${contentHash.slice(0, 16)}.txt`,
  ].join('/')

  // The key embeds the contentHash, so an existing object already IS these
  // exact bytes — re-putting is pure waste and trips R2's same-object rate
  // limit ("Reduce your concurrent request rate for the same object", which
  // had fl.dor.tips' 2h scans re-putting unchanged items until R2 429'd the
  // source). For dedupeText items this also keeps the FIRST archived body as
  // the item's evidence copy instead of today's listing-page rendering.
  if (await env.R2_PULSE.head(r2Key)) {
    return { r2Key, contentHash }
  }

  await env.R2_PULSE.put(r2Key, input.body, {
    httpMetadata: { contentType: input.contentType ?? 'text/plain; charset=utf-8' },
    customMetadata: {
      sourceId: input.sourceId,
      externalId: input.externalId,
      fetchedAt: input.fetchedAt.toISOString(),
      contentHash,
    },
  })

  if (input.fullText && input.fullText !== input.body) {
    await env.R2_PULSE.put(pulseFullTextR2Key(r2Key), input.fullText, {
      httpMetadata: { contentType: 'text/plain; charset=utf-8' },
      customMetadata: {
        sourceId: input.sourceId,
        externalId: input.externalId,
        fetchedAt: input.fetchedAt.toISOString(),
        contentHash,
      },
    })
  }

  return { r2Key, contentHash }
}

// Fetch + normalize an announcement's detail page for ingest enrichment.
// Best-effort: any failure returns null and the caller keeps the index
// excerpt — an unreachable detail page must never fail the scan. Uses the
// adapter-scoped fetch, so per-host politeness and timeouts apply.
async function fetchAnnouncementDetailText(
  ctx: Pick<IngestCtx, 'fetch'>,
  url: string,
): Promise<string | null> {
  try {
    const response = await ctx.fetch(url, { headers: DEFAULT_HEADERS })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType && !/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
      return null
    }
    const text = normalizeSourceText(stripHtml(await response.text()))
    return text.length > 0 ? text : null
  } catch {
    return null
  }
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

// Shared due-check used by both the synchronous `ingestAdapter` guard and the
// `enqueuePulseIngestScans` cron fan-out, so the enqueue side never queues a source
// the consumer would just skip.
function sourceIsDue(state: { enabled?: boolean; nextCheckAt?: Date | null }, now: Date): boolean {
  return (
    state.enabled !== false && (!state.nextCheckAt || state.nextCheckAt.getTime() <= now.getTime())
  )
}

function sourceNeedsMonitoringBaseline(state: {
  monitoringBaselineAt?: Date | null
  baselineMode?: string
}): boolean {
  return state.monitoringBaselineAt === null && state.baselineMode !== 'backfill'
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

// Per-host politeness state: the next instant a fetch may START for each host.
// Numbers-only (no chained lock promises) so it is safe to share at module
// scope across queue invocations — a hard-killed invocation can at worst waste
// one 30s slot, never wedge a host behind a permanently-pending lock.
export interface PoliteHostState {
  nextSlotAt: Map<string, number>
}

export function createPoliteHostState(): PoliteHostState {
  return { nextSlotAt: new Map() }
}

// Isolate-wide politeness clock. Module scope persists per-isolate but NOT
// across isolates, and Cloudflare gives no isolate-affinity guarantee for
// concurrent queue invocations — host-grouped ingest messages
// (enqueuePulseIngestScans) are the cross-isolate guard; this clock is the
// in-isolate backstop covering chunk-split groups, retries, the rules-scan
// path and manual runs.
export const isolatePoliteHostState = createPoliteHostState()

export function createPoliteFetch(
  fetchImpl: typeof fetch,
  state: PoliteHostState = createPoliteHostState(),
): typeof fetch {
  // The watchdog starts after the politeness wait releases, so 30s/host slot
  // waits never count against the request's own budget.
  const timedFetch = withFetchTimeout(fetchImpl)

  return (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url =
      input instanceof Request ? new URL(input.url) : input instanceof URL ? input : new URL(input)
    // robots.txt probes are tiny and 24h-cached per host — never spend a slot.
    if (url.pathname === '/robots.txt') return timedFetch(input, init)
    // Synchronous read→reserve (no await in between): concurrent callers
    // sharing `state` get strictly increasing 30s-spaced start slots per host.
    const now = Date.now()
    const slot = Math.max(now, state.nextSlotAt.get(url.host) ?? 0)
    state.nextSlotAt.set(url.host, slot + RATE_LIMIT.minIntervalMs)
    if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now))
    return timedFetch(input, init)
  }) as typeof fetch
}

/**
 * One-time migration damper for the dedupeText hash basis switch: an inserted
 * snapshot whose (sourceId, externalId) already has rows but NONE in the
 * item-v2 format is just the old whole-page hash being re-expressed — mark it
 * ignored instead of burning an AI extract on an announcement we already
 * processed. Once an item has any v2 row, a later new hash means its link text
 * genuinely changed and flows through normally. No time window needed: an
 * ETag-shielded source that only re-parses months from now still suppresses
 * correctly. Shared with the rules-scan announcement path (reconcile.ts).
 */
export async function suppressDedupeRehashMigration(
  repo: Pick<PulseIngestRepo, 'listItemSnapshotContentHashes' | 'updateSourceSnapshotStatus'>,
  item: Pick<ParsedItem, 'sourceId' | 'externalId'>,
  snapshotId: string,
): Promise<boolean> {
  const priorHashes = await repo.listItemSnapshotContentHashes({
    sourceId: item.sourceId,
    externalId: item.externalId,
    excludeId: snapshotId,
  })
  if (priorHashes.length === 0) return false
  if (priorHashes.some((hash) => hash.startsWith(ITEM_DEDUPE_HASH_PREFIX))) return false
  await repo.updateSourceSnapshotStatus(snapshotId, {
    parseStatus: 'ignored',
    failureReason: 'dedupe_rehash_migration',
  })
  return true
}

async function ingestAdapter(
  adapter: SourceAdapter,
  ctx: IngestCtx,
  repo: PulseIngestRepo,
  queue: Pick<Queue, 'send'>,
  opts: { force?: boolean; browserlessSourceIds?: ReadonlySet<string> } = {},
): Promise<IngestCounts> {
  const checkedAt = new Date()
  const state = await repo.ensureSourceState({
    sourceId: adapter.id,
    tier: adapter.tier,
    jurisdiction: adapter.jurisdiction,
    cadenceMs: adapter.cronIntervalMs,
    ...(adapter.initialBaselineMode ? { baselineMode: adapter.initialBaselineMode } : {}),
    now: checkedAt,
  })
  if (!state.enabled || (!opts.force && !sourceIsDue(state, checkedAt))) {
    return { snapshots: 0, queued: 0, duplicates: 0, failures: 0 }
  }
  const establishingBaseline = sourceNeedsMonitoringBaseline(state)

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
    // Skip selector-drift detection while establishing a source's monitoring
    // baseline. A brand-new source's first scan legitimately yields zero parsed
    // items (cold start), and — more importantly — throwing here happens before
    // the `establishSourceBaseline` call below, so a drift throw would strand the
    // source in `establish_on_first_seen` forever: every queue retry re-fetches,
    // re-parses zero, and re-throws, never recording a baseline. Real drift on an
    // established source is still caught on the next (active) scan.
    if (
      changedSnapshots > 0 &&
      parsedItemCount === 0 &&
      !adapter.allowEmptyParse &&
      !establishingBaseline
    ) {
      throw new Error(`selector_drift: ${adapter.id} produced no parsed items`)
    }

    // Detail-enrichment budget per scan: only genuinely NEW link items fetch
    // their detail page (steady state ≈ a handful/day across all sources), and
    // a pathological listing can never trigger more than this many fetches.
    let enrichBudget = 10
    const writes = parsedGroups.flatMap(({ rawSnapshot, items }) =>
      items.map(async (item): Promise<IngestCounts> => {
        let body = item.rawText
        let fullText = item.fullText
        let publishedAt = item.publishedAt
        // Listing-page link items (enrichFromUrl) carry a link-local dedupe
        // identity, so new-vs-known is decidable BEFORE any fetch or archive:
        //   same_hash  → exact duplicate; skip the detail fetch AND the
        //                per-scan R2 re-archive the old flow paid every time.
        //   other_hash → known item id under a different hash (dedupeText
        //                rollout or a content update) — proceed unenriched so
        //                a one-time rehash never causes a detail-fetch burst.
        //   absent     → genuinely new: swap the index excerpt for the detail
        //                page so the extractor sees the real announcement
        //                (dates included) and the alert links to the item, not
        //                the hub. The GA "Governor Kemp wildfire relief" alert
        //                shipped date-less with a hub-page source for lack of
        //                exactly this.
        if (item.enrichFromUrl && item.dedupeText && !establishingBaseline) {
          const contentHash = `${ITEM_DEDUPE_HASH_PREFIX}${await hashText(item.dedupeText)}`
          const presence = await repo.sourceSnapshotPresence({
            sourceId: item.sourceId,
            externalId: item.externalId,
            contentHash,
          })
          if (presence === 'same_hash') {
            return { snapshots: 1, queued: 0, duplicates: 1, failures: 0 }
          }
          if (presence === 'absent' && enrichBudget > 0) {
            enrichBudget -= 1
            const detailText = await fetchAnnouncementDetailText(adapterCtx, item.enrichFromUrl)
            if (detailText) {
              const combined = [item.title, detailText].join(`

`)
              body = textExcerpt(combined)
              if (combined.length > body.length) fullText = combined
              publishedAt = announcementPublishedAtFromText(detailText) ?? item.publishedAt
              recordPulseMetric('pulse.ingest.detail_enriched', {
                sourceId: item.sourceId,
                url: item.enrichFromUrl,
              })
            }
          }
        }
        const archived = await ctx.archiveRaw({
          sourceId: item.sourceId,
          externalId: item.externalId,
          fetchedAt: rawSnapshot.fetchedAt,
          body,
          contentType: 'text/plain; charset=utf-8',
          ...(fullText ? { fullText } : {}),
          ...(item.dedupeText ? { dedupeText: item.dedupeText } : {}),
        })
        const result = await repo.createSourceSnapshot({
          sourceId: item.sourceId,
          externalId: item.externalId,
          title: item.title,
          officialSourceUrl: item.officialSourceUrl,
          publishedAt,
          fetchedAt: rawSnapshot.fetchedAt,
          contentHash: archived.contentHash,
          rawR2Key: archived.r2Key,
        })
        if (!result.inserted) {
          return { snapshots: 1, queued: 0, duplicates: 1, failures: 0 }
        }
        if (establishingBaseline) {
          await repo.updateSourceSnapshotStatus(result.snapshot.id, {
            parseStatus: 'ignored',
            failureReason: 'monitoring_baseline_established',
          })
          return {
            snapshots: 1,
            queued: 0,
            duplicates: 0,
            failures: 0,
          }
        }
        if (
          item.dedupeText &&
          (await suppressDedupeRehashMigration(repo, item, result.snapshot.id))
        ) {
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
    if (establishingBaseline) {
      await repo.establishSourceBaseline({ sourceId: adapter.id, baselineAt: checkedAt })
    }
    const freshest = rawSnapshots.find((snapshot) => snapshot.etag || snapshot.lastModified)
    await repo.recordSourceSuccess({
      sourceId: adapter.id,
      checkedAt,
      nextCheckAt: nextCheckAt(checkedAt, adapter.cronIntervalMs),
      changed: !establishingBaseline && counts.queued > 0,
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
    // Source failures are caught here and only the message reaches `last_error`
    // in D1, which hides the call site of runtime faults (e.g. workerd "Illegal
    // invocation"). Log the full stack + resolved fetcher to observability so a
    // failing source can be traced to an exact line via `wrangler tail`.
    console.error('pulse.ingest.source_failed', {
      sourceId: adapter.id,
      fetcher: resolveFetcherForAdapter(adapter, ctx, opts.browserlessSourceIds),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    // robots.txt disallow is deterministic, not transient: hot-retrying every
    // 15 minutes burned 86 consecutive failures on ak.temporary_announcements
    // (tax.alaska.gov disallows all crawlers site-wide). Back off a week —
    // long enough to stop the churn, short enough to notice if the policy
    // ever changes. Everything else keeps the fast retry.
    const isRobotsDisallow = error instanceof Error && /robots\.txt disallows/i.test(error.message)
    await repo.recordSourceFailure({
      sourceId: adapter.id,
      checkedAt,
      nextCheckAt: nextCheckAt(
        checkedAt,
        isRobotsDisallow
          ? ROBOTS_DISALLOW_BACKOFF_MS
          : Math.min(adapter.cronIntervalMs, PULSE_SOURCE_FAILURE_RETRY_MS),
      ),
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

type PulseIngestEnv = Pick<
  Env,
  | 'DB'
  | 'R2_PULSE'
  | 'PULSE_QUEUE'
  | 'PULSE_BROWSERLESS_URL'
  | 'PULSE_BROWSERLESS_TOKEN'
  | 'PULSE_BROWSERLESS_SOURCE_IDS'
>

// Builds the per-run ingest context (polite fetch, browserless wiring, R2 archive,
// source-state lookup). Shared by the synchronous `runPulseIngest` (retry button +
// tests) and the queued single-source `consumePulseIngestSource` so both fetch
// identically.
function createPulseIngestCtx(
  env: PulseIngestEnv,
  repo: PulseIngestRepo,
): { ctx: IngestCtx; browserlessSourceIds: ReadonlySet<string> } {
  // DIAG 2026-06-23: trace the browserless endpoint the queue consumer reads at
  // runtime — prod sources fail with a browserless.io error while the deployed var
  // is the CF endpoint. Remove once the env/runtime mismatch is found.
  console.log(
    JSON.stringify({
      tag: 'DIAG_BROWSERLESS',
      url: env.PULSE_BROWSERLESS_URL ?? null,
      hasToken: Boolean(env.PULSE_BROWSERLESS_TOKEN),
      sourceIds: env.PULSE_BROWSERLESS_SOURCE_IDS ?? null,
    }),
  )
  const browserlessFetch = createBrowserlessFetch({
    ...(env.PULSE_BROWSERLESS_URL ? { endpoint: env.PULSE_BROWSERLESS_URL } : {}),
    ...(env.PULSE_BROWSERLESS_TOKEN ? { token: env.PULSE_BROWSERLESS_TOKEN } : {}),
  })
  const browserlessSourceIds = parseSourceIdList(env.PULSE_BROWSERLESS_SOURCE_IDS)
  // ONE polite fetch on the isolate-shared clock for both roles — separate
  // instances would let a text and a binary (PDF) fetch hit the same host
  // back-to-back with no spacing.
  const politeFetch = createPoliteFetch(fetch, isolatePoliteHostState)
  const ctx: IngestCtx = {
    fetch: politeFetch,
    binaryFetch: politeFetch,
    ...(browserlessFetch ? { browserlessFetch } : {}),
    getSourceState: async (sourceId) => {
      const state = await repo.getSourceState(sourceId)
      return state ? { etag: state.etag, lastModified: state.lastModified } : null
    },
    archiveRaw: (input: Parameters<IngestCtx['archiveRaw']>[0]) => archivePulseRaw(env, input),
  }
  return { ctx, browserlessSourceIds }
}

export async function runPulseIngest(
  env: PulseIngestEnv,
  adapters: readonly SourceAdapter[] = liveRegulatorySourceAdapters,
  opts: { force?: boolean } = {},
): Promise<{
  snapshots: number
  queued: number
  duplicates: number
  failures: number
}> {
  const db = createDb(env.DB)
  const repo = makePulseIngestRepo(db)
  const { ctx, browserlessSourceIds } = createPulseIngestCtx(env, repo)

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

// Cron entry point. Decides which sources are due and fans out one queue message per
// due source — it does NOT fetch. This bounds the scheduled tick's work regardless of
// how many sources exist (the P0 scaling fix). `emitSourceIdleAlerts` runs here over the
// full source set; it reflects prior runs' success times (independent of this tick's
// not-yet-run fetches), so computing it pre-fetch is correct and not masked by the tick.
export async function enqueuePulseIngestScans(
  env: Pick<Env, 'DB' | 'PULSE_QUEUE'> & OpsAlertEnv,
  adapters: readonly SourceAdapter[] = liveRegulatorySourceAdapters,
  now: Date = new Date(),
  hostForSourceId: (sourceId: string) => string | null = politeHostForAdapterId,
): Promise<{ queued: number }> {
  const db = createDb(env.DB)
  const repo = makePulseIngestRepo(db)
  // One batched read+upsert for all sources instead of N serial round-trips —
  // the per-source loop was blowing the cron's wall-clock budget (exceededCpu).
  const states = await repo.ensureSourceStates(
    adapters.map((adapter) => ({
      sourceId: adapter.id,
      tier: adapter.tier,
      jurisdiction: adapter.jurisdiction,
      cadenceMs: adapter.cronIntervalMs,
      ...(adapter.initialBaselineMode ? { baselineMode: adapter.initialBaselineMode } : {}),
      now,
    })),
    now,
  )
  const dueSourceIds = adapters
    .filter((adapter) => {
      const state = states.get(adapter.id)
      return state ? sourceIsDue(state, now) : false
    })
    .map((adapter) => adapter.id)

  // Group due sources by polite host so one host's fetches ride one message
  // (sequential through one polite clock) instead of colliding across the
  // queue's concurrent invocations. Unresolvable hosts enqueue as singletons.
  const hostGroups = new Map<string, string[]>()
  for (const sourceId of dueSourceIds) {
    const key = hostForSourceId(sourceId) ?? `solo:${sourceId}`
    const group = hostGroups.get(key)
    if (group) group.push(sourceId)
    else hostGroups.set(key, [sourceId])
  }
  const messages: PulseIngestSourceMessage[] = []
  for (const group of hostGroups.values()) {
    for (let start = 0; start < group.length; start += MAX_SOURCES_PER_INGEST_MESSAGE) {
      const chunk = group.slice(start, start + MAX_SOURCES_PER_INGEST_MESSAGE)
      const first = chunk[0]
      if (!first) continue
      messages.push({
        type: PULSE_INGEST_SOURCE_MESSAGE_TYPE,
        sourceId: first,
        sourceIds: chunk,
        reason: 'cadence_due',
      })
    }
  }
  await Promise.all(messages.map((message) => env.PULSE_QUEUE.send(message)))

  const activeSourceIds = new Set(adapters.map((adapter) => adapter.id))
  const staleSources = emitSourceIdleAlerts(
    (await repo.listSourceStates()).filter((row) => activeSourceIds.has(row.sourceId)),
    now,
  )
  if (staleSources.length > 0) {
    // One aggregated operator email per dedupe window — the per-source
    // pulse.alert log lines above stay for diagnosis.
    await dispatchOpsAlert(env, 'pulse.ingest.sources_stale', {
      staleCount: staleSources.length,
      sample: staleSources
        .slice(0, 10)
        .map((source) => source.sourceId)
        .join(', '),
    })
  }
  // `queued` keeps meaning "due sources" for existing dashboards; `messages`
  // is the post-grouping send count.
  recordPulseMetric('pulse.ingest.enqueued', {
    queued: dueSourceIds.length,
    messages: messages.length,
  })
  return { queued: dueSourceIds.length }
}

// Queue consumer for a host group enqueued by `enqueuePulseIngestScans` (legacy
// in-flight messages carry a single sourceId). Sources run SEQUENTIALLY through
// one shared ctx — one polite clock — which is the whole point of grouping;
// per-source failures stay isolated because `ingestAdapter` catches and records
// them without throwing. Runs with `force: true` because the due-check already
// happened at enqueue time, and so a queue retry re-fetches rather than
// short-circuiting on a stale `nextCheckAt`. Idempotency is still guaranteed
// downstream by the snapshot unique index + the extract status guard.
export async function consumePulseIngestSource(
  env: PulseIngestEnv,
  message: PulseIngestSourceMessage,
  adapters: readonly SourceAdapter[] = liveRegulatorySourceAdapters,
): Promise<IngestCounts> {
  const sourceIds = message.sourceIds?.length ? message.sourceIds : [message.sourceId]
  const db = createDb(env.DB)
  const repo = makePulseIngestRepo(db)
  const { ctx, browserlessSourceIds } = createPulseIngestCtx(env, repo)
  const results: IngestCounts[] = []
  for (const sourceId of sourceIds) {
    const adapter = adapters.find((candidate) => candidate.id === sourceId)
    if (!adapter) {
      recordPulseMetric('pulse.ingest.source_missing', { sourceId })
      continue
    }
    results.push(
      await ingestAdapter(adapter, ctx, repo, env.PULSE_QUEUE, {
        force: true,
        browserlessSourceIds,
      }),
    )
  }
  return sumCounts(results)
}
