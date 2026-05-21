import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { orpc } from '@/lib/rpc'

const PULSE_ACTIVE_ALERTS_REFETCH_INTERVAL_MS = 60_000
const PULSE_SOURCE_HEALTH_REFETCH_INTERVAL_MS = 60_000
const PULSE_LIST_ALERTS_MAX_LIMIT = 50

function normalizePulseListAlertsLimit(limit: number | undefined): number | undefined {
  if (limit === undefined || !Number.isFinite(limit)) return undefined
  return Math.min(Math.max(Math.trunc(limit), 1), PULSE_LIST_ALERTS_MAX_LIMIT)
}

// All Pulse-related cache invalidation flows through this hook so every
// mutation (apply, dismiss, revert) refreshes the same surfaces:
//   - pulse.* queries (banner / detail / history)
//   - dashboard.load (open obligations + risk summary)
//   - obligations.list (the underlying obligations may have moved due dates)
//   - audit.* (newly written audit events)
export function usePulseInvalidation(): () => void {
  const queryClient = useQueryClient()
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orpc.pulse.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
  }, [queryClient])
}

export function usePulseListAlertsQueryOptions(limit?: number) {
  const normalizedLimit = normalizePulseListAlertsLimit(limit)
  return {
    ...orpc.pulse.listAlerts.queryOptions({
      input: normalizedLimit === undefined ? undefined : { limit: normalizedLimit },
    }),
    refetchInterval: PULSE_ACTIVE_ALERTS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  }
}

export function usePulseListHistoryQueryOptions(limit?: number) {
  return orpc.pulse.listHistory.queryOptions({
    input: limit === undefined ? undefined : { limit },
  })
}

export function usePulsePriorityQueueQueryOptions(limit?: number, enabled = true) {
  return {
    ...orpc.pulse.listPriorityQueue.queryOptions({
      input: limit === undefined ? undefined : { limit },
    }),
    enabled,
  }
}

export function usePulseSourceHealthQueryOptions() {
  return {
    ...orpc.pulse.listSourceHealth.queryOptions({
      input: undefined,
    }),
    refetchInterval: PULSE_SOURCE_HEALTH_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  }
}

export function usePulseDetailQueryOptions(alertId: string | null) {
  return orpc.pulse.getDetail.queryOptions({
    input: { alertId: alertId ?? '' },
    enabled: alertId !== null,
  })
}
