import type { DashboardBriefScope } from '@duedatehq/ports/shared'

export const DASHBOARD_BRIEF_MESSAGE_TYPE = 'dashboard.brief.refresh'

export type DashboardBriefRefreshReason =
  | 'scheduled'
  | 'migration_apply'
  | 'migration_revert'
  | 'pulse_apply'
  | 'pulse_revert'
  | 'pulse_reactivate'
  | 'pulse_dismiss'
  | 'status_change'
  | 'readiness_change'
  | 'evidence_change'
  | 'client_facts_change'
  | 'penalty_override'
  | 'due_date_update'
  | 'annual_rollover'
  // Self-heal for personal ('me') briefs, which have no daily cron: the
  // dashboard load enqueues this when the viewer's brief is missing/stale.
  | 'scope_view'

export interface DashboardBriefRefreshMessage {
  type: typeof DASHBOARD_BRIEF_MESSAGE_TYPE
  firmId: string
  scope: DashboardBriefScope
  userId?: string | null
  asOfDate?: string
  reason: DashboardBriefRefreshReason
  idempotencyKey: string
  requestedAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isDashboardBriefRefreshMessage(
  value: unknown,
): value is DashboardBriefRefreshMessage {
  if (!isRecord(value)) return false
  return (
    value.type === DASHBOARD_BRIEF_MESSAGE_TYPE &&
    typeof value.firmId === 'string' &&
    (value.scope === 'firm' || value.scope === 'me') &&
    typeof value.reason === 'string' &&
    typeof value.idempotencyKey === 'string' &&
    typeof value.requestedAt === 'string'
  )
}

export function dashboardBriefIdempotencyKey(input: {
  firmId: string
  scope: DashboardBriefScope
  userId?: string | null
  reason: DashboardBriefRefreshReason
  asOfDate?: string
}): string {
  return [
    'dashboard-brief',
    input.firmId,
    input.scope,
    input.userId ?? 'firm',
    input.asOfDate ?? 'auto-date',
    input.reason,
  ].join(':')
}
