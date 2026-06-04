import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'

import type { PulseAffectedClient } from '@duedatehq/contracts'

import { orpc } from '@/lib/rpc'

const EMPTY_AFFECTED_CLIENTS: PulseAffectedClient[] = []

const ALERT_ACTIVE_ALERTS_REFETCH_INTERVAL_MS = 60_000
const ALERT_SOURCE_HEALTH_REFETCH_INTERVAL_MS = 60_000
const ALERT_LIST_ALERTS_MAX_LIMIT = 50
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
//   - pulse.* engine queries (banner / detail / history)
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
    void queryClient.invalidateQueries({ queryKey: orpc.pulse.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.calendar.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.workload.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.reminders.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
  }, [queryClient])
}

export function useAlertsListQueryOptions(limit?: number) {
  const normalizedLimit = normalizeAlertsListLimit(limit)
  return {
    ...orpc.pulse.listAlerts.queryOptions({
      input: normalizedLimit === undefined ? undefined : { limit: normalizedLimit },
    }),
    refetchInterval: ALERT_ACTIVE_ALERTS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  }
}

export function useAlertsHistoryQueryOptions(limit?: number) {
  return orpc.pulse.listHistory.queryOptions({
    input: limit === undefined ? undefined : { limit },
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
  const batchQuery = useQuery({
    ...orpc.pulse.getDetailsBatch.queryOptions({ input: { alertIds } }),
    enabled: alertIds.length > 0,
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
