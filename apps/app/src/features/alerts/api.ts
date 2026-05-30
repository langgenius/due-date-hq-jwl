import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { orpc } from '@/lib/rpc'

const ALERT_ACTIVE_ALERTS_REFETCH_INTERVAL_MS = 60_000
const ALERT_SOURCE_HEALTH_REFETCH_INTERVAL_MS = 60_000
const ALERT_LIST_ALERTS_MAX_LIMIT = 50

function normalizeAlertsListLimit(limit: number | undefined): number | undefined {
  if (limit === undefined || !Number.isFinite(limit)) return undefined
  return Math.min(Math.max(Math.trunc(limit), 1), ALERT_LIST_ALERTS_MAX_LIMIT)
}

// All Pulse-related cache invalidation flows through this hook so every
// mutation (apply, dismiss, revert) refreshes the same surfaces:
//   - pulse.* queries (banner / detail / history)
//   - dashboard.load (open obligations + risk summary)
//   - obligations.list (the underlying obligations may have moved due dates)
//   - audit.* (newly written audit events)
export function useAlertsInvalidation(): () => void {
  const queryClient = useQueryClient()
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orpc.pulse.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
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
  return orpc.pulse.getDetail.queryOptions({
    input: { alertId: alertId ?? '' },
    enabled: alertId !== null,
  })
}
