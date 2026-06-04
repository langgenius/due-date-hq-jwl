// Pure alert-list filter logic extracted from AlertsListPage.tsx: the status /
// change-kind filter option sets, their derived union types, the type-guard
// predicates, and the status matcher + source-label summary. No JSX — the
// ReactNode-returning label helpers stay in the page with the component.
import type { PulseFirmAlertStatus, PulseSourceHealth } from '@duedatehq/contracts'
import { summarizeAlertSources } from './source-health-labels'

export const ACTIVE_STATUS_FILTER_OPTIONS = ['all', 'active', 'partially_applied'] as const
export const HISTORY_STATUS_FILTER_OPTIONS = [
  'all',
  'snoozed',
  'partially_applied',
  'applied',
  'reviewed',
  'reverted',
  'dismissed',
] as const
export type AlertStatusFilter =
  | (typeof ACTIVE_STATUS_FILTER_OPTIONS)[number]
  | (typeof HISTORY_STATUS_FILTER_OPTIONS)[number]
export const CHANGE_KIND_FILTER_OPTIONS = [
  'all',
  'deadline_shift',
  'filing_requirement',
  'applicability_scope',
  'form_instruction',
  'source_status',
  'rule_source_drift',
  'new_obligation',
  'threshold_advisory',
  'other',
] as const
export type AlertChangeKindFilter = (typeof CHANGE_KIND_FILTER_OPTIONS)[number]

export function sourceLabel(sources: readonly PulseSourceHealth[]): string {
  return summarizeAlertSources(sources, { emptyLabel: 'configured alert sources' })
}

export function isStatusFilter(
  value: string,
  options: readonly AlertStatusFilter[],
): value is AlertStatusFilter {
  return options.some((option) => option === value)
}

export function isChangeKindFilter(value: string): value is AlertChangeKindFilter {
  return CHANGE_KIND_FILTER_OPTIONS.some((option) => option === value)
}

export function matchesStatusFilter(
  status: PulseFirmAlertStatus,
  filter: AlertStatusFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === 'active') return status === 'matched'
  return status === filter
}
