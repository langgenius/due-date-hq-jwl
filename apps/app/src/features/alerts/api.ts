import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'

import type { PulseAffectedClient } from '@duedatehq/contracts'

import { orpc } from '@/lib/rpc'

const EMPTY_AFFECTED_CLIENTS: PulseAffectedClient[] = []

const ALERT_ACTIVE_ALERTS_REFETCH_INTERVAL_MS = 60_000
const ALERT_SOURCE_HEALTH_REFETCH_INTERVAL_MS = 60_000
const ALERT_LIST_ALERTS_MAX_LIMIT = 50
// `getDetailsBatch` caps its input at 100 ids (contract). With "Load more"
// the loaded alert set can grow past that, so we batch only the first 100.
const GET_DETAILS_BATCH_MAX_IDS = 100
// Keep a batch-seeded alert detail fresh for one list-poll cycle so opening
// the drawer stays a cache hit instead of a background refetch (see
// useAlertDetailQueryOptions).
const ALERT_DETAIL_STALE_TIME_MS = 60_000

function normalizeAlertsListLimit(limit: number | undefined): number | undefined {
  if (limit === undefined || !Number.isFinite(limit)) return undefined
  return Math.min(Math.max(Math.trunc(limit), 1), ALERT_LIST_ALERTS_MAX_LIMIT)
}

// All alert-related cache invalidation flows through this hook so every
// mutation (apply, dismiss, revert) refreshes the same surfaces:
//   - pulse.*: everything is stale-marked, but only the mounted list, the
//     activeCount badges, the priority queue, and the open drawer's detail
//     refetch immediately (see the refetchType split below)
//   - dashboard.load (open obligations + risk summary)
//   - obligations.* — applying/reverting a due-date overlay moves an
//     obligation's EFFECTIVE due date, so every obligation surface must
//     refetch, not just the queue list: the deadline detail
//     (obligations.getDetail) and the client view (obligations.listByClient)
//     live under this namespace and previously kept showing the pre-apply
//     date. Invalidating the whole namespace keeps them in sync.
//   - calendar.* / workload.* / reminders.* — these schedule off the same due
//     dates, so a moved deadline must refresh them too.
//   - audit.* (newly written audit events)
export function useAlertsInvalidation(): () => void {
  const queryClient = useQueryClient()
  return useCallback(() => {
    // Don't blanket-refetch the pulse namespace — with /alerts mounted that
    // re-fired EVERY pulse query per mutation (list + source health +
    // priority queue + activeCount + the N-detail getDetailsBatch + every
    // seeded getDetail). Instead: mark everything pulse stale WITHOUT
    // refetching, so any later mount / drawer open still pulls fresh data…
    void queryClient.invalidateQueries({ queryKey: orpc.pulse.key(), refetchType: 'none' })
    // …then actively refetch only the surfaces a mutation must update NOW:
    // the visible list (active or history — only the mounted one refires),
    // the activeCount badges (sidebar / header / rail), the priority queue
    // (level pills), and the open drawer's detail. `getDetail.key()` spans
    // every alert id, but refetchType defaults to 'active' and list rows
    // subscribe with `enabled: false` (useAlertDetailFromCacheQueryOptions),
    // so the only live observer is the open drawer — exactly one refetch.
    void queryClient.invalidateQueries({ queryKey: orpc.pulse.listAlerts.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.pulse.listHistory.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.pulse.activeCount.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.pulse.listPriorityQueue.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.pulse.getDetail.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.calendar.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.workload.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.reminders.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
  }, [queryClient])
}

/**
 * Morning sweep AI summary endpoint. Queries the server-side LLM
 * briefing. Cache-friendly: server caches per (firmId, day-bucket) so
 * the same firm gets one LLM call per UTC day; the React Query cache
 * here keeps the dialog snappy on repeat opens.
 */
export function useAlertsMorningSweepQueryOptions() {
  return {
    ...orpc.pulse.morningSweepSummary.queryOptions({ input: undefined }),
    // Stale time matches the server's day-bucket cache so the
    // client doesn't refetch within the same morning unless the
    // user clicks "Regenerate".
    staleTime: 60 * 60 * 1000,
  }
}

/**
 * The single authoritative "alerts needing action" count — `matched` +
 * `partially_applied`, approved, not expired (see
 * `packages/db/src/repo/pulse/scoped.ts` `countActiveAlerts`). This is the
 * number every "N active" surface must show: the sidebar nav badge, the
 * /alerts page-header pill, and the detail rail head. They previously
 * disagreed (sidebar read this endpoint = 8; the header/rail filtered
 * `status === 'matched'` on `listAlerts(50)` = 7, missing `partially_applied`
 * and the expiry/approval scoping). One hook, one number, no truncation.
 */
export function useActiveAlertCount(): number {
  const query = useQuery(orpc.pulse.activeCount.queryOptions({ input: undefined }))
  return query.data?.count ?? 0
}

export function useAlertsListQueryOptions(limit?: number, origin?: 'live' | 'catchup') {
  const normalizedLimit = normalizeAlertsListLimit(limit)
  // Origin splits the active surface into the news stream ('live') and the
  // pinned "Already in effect" band ('catchup'). Separate queries: catchup
  // rows carry months-old published dates that the stream's keyset paging
  // would otherwise push past the first page.
  const input =
    normalizedLimit === undefined && origin === undefined
      ? undefined
      : {
          ...(normalizedLimit === undefined ? {} : { limit: normalizedLimit }),
          ...(origin === undefined ? {} : { origin }),
        }
  return {
    ...orpc.pulse.listAlerts.queryOptions({ input }),
    refetchInterval: ALERT_ACTIVE_ALERTS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  }
}

export function useAlertsHistoryQueryOptions(limit?: number) {
  return orpc.pulse.listHistory.queryOptions({
    input: limit === undefined ? undefined : { limit },
  })
}

// "Load more" page sizes. Active stays at the contract max (50) so the first
// page matches the pre-pagination view — no regression for firms with ≤50
// active alerts; history uses the same chunk.
export const ALERTS_LIST_PAGE_SIZE = ALERT_LIST_ALERTS_MAX_LIMIT
export const ALERTS_HISTORY_PAGE_SIZE = 50

// `cursor === null` fetches the first page; a string cursor fetches the page
// after it. Exported so the demo mock can seed the EXACT query key the hook
// builds (oRPC keys the infinite query off `input(initialPageParam)`).
export function buildAlertsListInfiniteInput(cursor: string | null) {
  return cursor === null
    ? { limit: ALERTS_LIST_PAGE_SIZE }
    : { limit: ALERTS_LIST_PAGE_SIZE, cursor }
}

export function buildAlertsHistoryInfiniteInput(cursor: string | null) {
  return cursor === null
    ? { limit: ALERTS_HISTORY_PAGE_SIZE }
    : { limit: ALERTS_HISTORY_PAGE_SIZE, cursor }
}

// Typed so oRPC infers `string | null` as the page-param across initial /
// next pages (mirrors the audit log's infinite query).
const INITIAL_ALERTS_CURSOR: string | null = null

export function useAlertsListInfiniteQueryOptions() {
  return {
    ...orpc.pulse.listAlerts.infiniteOptions({
      input: buildAlertsListInfiniteInput,
      initialPageParam: INITIAL_ALERTS_CURSOR,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
    refetchInterval: ALERT_ACTIVE_ALERTS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  }
}

export function useAlertsHistoryInfiniteQueryOptions() {
  return orpc.pulse.listHistory.infiniteOptions({
    input: buildAlertsHistoryInfiniteInput,
    initialPageParam: INITIAL_ALERTS_CURSOR,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

export function useAlertsPriorityQueueQueryOptions(limit?: number, enabled = true) {
  return {
    ...orpc.pulse.listPriorityQueue.queryOptions({
      input: limit === undefined ? undefined : { limit },
    }),
    enabled,
  }
}

export function useAlertSourceHealthQueryOptions() {
  return {
    ...orpc.pulse.listSourceHealth.queryOptions({
      input: undefined,
    }),
    refetchInterval: ALERT_SOURCE_HEALTH_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  }
}

// Team notes (Pencil Aogxu §7) — internal discussion threaded on an alert.
// Query is gated on a non-null alertId so a closed drawer never round-trips;
// the empty-string input is the same enabled-false pattern useAlertDetail uses.
export function useAlertNotesQueryOptions(alertId: string | null) {
  return {
    ...orpc.pulse.listAlertNotes.queryOptions({
      input: { alertId: alertId ?? '' },
      enabled: alertId !== null,
    }),
  }
}

// Refresh the notes list for one alert after a successful add. Scoped to the
// single alert's query key so adding a note doesn't refetch unrelated surfaces.
export function useAlertNotesInvalidation(alertId: string | null): () => void {
  const queryClient = useQueryClient()
  return useCallback(() => {
    if (alertId === null) return
    void queryClient.invalidateQueries({
      queryKey: orpc.pulse.listAlertNotes.queryKey({ input: { alertId } }),
    })
  }, [queryClient, alertId])
}

export function useAlertDetailQueryOptions(alertId: string | null) {
  return {
    ...orpc.pulse.getDetail.queryOptions({
      input: { alertId: alertId ?? '' },
      enabled: alertId !== null,
    }),
    // The list seeds this query's cache via `getDetailsBatch` (see
    // useAlertsAffectedClients), so opening the drawer is already a cache hit.
    // Without a staleTime the default (0) marks that seed instantly stale and
    // `refetchOnMount` fires a redundant background `getDetail` on every open.
    // Hold the seed fresh for one list-poll cycle so rapid open/switch/reopen
    // stays network-free; mutations still `invalidate()` (which overrides
    // staleTime) and the drawer's explicit `refetch()` paths are unaffected.
    staleTime: ALERT_DETAIL_STALE_TIME_MS,
  }
}

// List rows render a few detail-only fields (old→new due dates, first form)
// but must NEVER fetch detail themselves — the page already pulls every
// visible alert's full PulseDetail in ONE `getDetailsBatch` round-trip and
// seeds each per-alert `getDetail` cache (see useAlertsAffectedClients).
// `enabled: false` keeps the row a passive cache subscriber: it re-renders
// when the seed (or an open drawer's refetch) lands, so a cold /alerts load
// is exactly 1 list + 1 batch instead of ~N parallel `pulse.getDetail` calls
// beside the identical batch. Rows past the 100-id batch cap render without
// the date row until their drawer opens (which fills this same cache entry).
export function useAlertDetailFromCacheQueryOptions(alertId: string) {
  return {
    ...useAlertDetailQueryOptions(alertId),
    enabled: false,
  }
}

// Batch-load affected clients for a set of alerts in ONE `getDetailsBatch`
// round-trip instead of one `getDetail` per card. Returns a Map keyed by
// alertId; callers look up `map.get(alert.id) ?? []` per card. The alerts list
// and the dashboard "needs attention" cards used to mount a card per alert,
// each firing its own `pulse.getDetail` — N parallel detail requests on every
// render just to show the affected-client name chips. This collapses that to a
// single request. `enabled` is gated on a non-empty id set so an empty list
// never round-trips.
export function useAlertsAffectedClients(alertIds: string[]): Map<string, PulseAffectedClient[]> {
  const queryClient = useQueryClient()
  // Cap at the contract's 100-id batch limit. Once "Load more" pushes the
  // loaded set past 100, cards beyond the cap render without pre-seeded
  // affected-client chips and their drawer fetches detail on open.
  const batchIds =
    alertIds.length > GET_DETAILS_BATCH_MAX_IDS
      ? alertIds.slice(0, GET_DETAILS_BATCH_MAX_IDS)
      : alertIds
  const batchQuery = useQuery({
    ...orpc.pulse.getDetailsBatch.queryOptions({ input: { alertIds: batchIds } }),
    enabled: batchIds.length > 0,
  })

  // The batch already pulled the FULL PulseDetail for every visible alert, so
  // seed each alert's `getDetail` cache from it. Opening the drawer then reads a
  // cache hit (instant) instead of re-fetching — this restores the pre-batch
  // "the card's own fetch warmed the drawer" behaviour without the per-card
  // fan-out. The shape is identical (`getDetailsBatch` returns the same
  // PulseDetail rows `getDetail` does), so the drawer's query is satisfied.
  useEffect(() => {
    for (const detail of batchQuery.data?.details ?? []) {
      queryClient.setQueryData(
        orpc.pulse.getDetail.queryKey({ input: { alertId: detail.alert.id } }),
        detail,
      )
    }
  }, [batchQuery.data, queryClient])

  return useMemo(() => {
    const byAlert = new Map<string, PulseAffectedClient[]>()
    for (const detail of batchQuery.data?.details ?? []) {
      byAlert.set(detail.alert.id, detail.affectedClients ?? EMPTY_AFFECTED_CLIENTS)
    }
    return byAlert
  }, [batchQuery.data])
}
