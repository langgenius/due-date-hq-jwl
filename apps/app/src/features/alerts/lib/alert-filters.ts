// Pure alert-list filter logic extracted from AlertsListPage.tsx: the status /
// change-kind filter option sets, their derived union types, the type-guard
// predicates, and the status matcher + source-label summary. No JSX — the
// ReactNode-returning label helpers stay in the page with the component.
import type { PulseChangeKind, PulseFirmAlertStatus, PulseSourceHealth } from '@duedatehq/contracts'
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
// Change-kind filter groups. The AI/DB classify each alert into one of nine
// granular `PulseChangeKind` values, but surfacing all nine in the filter
// dropdown is more than a CPA wants to scan. The dropdown collapses them into
// four buckets — timing / substance / source / misc — and each bucket maps to
// the underlying kinds below. Granularity is preserved on the cards themselves
// (`PulseChangeKindChip` / `PulseToneIcon`); this collapse is filter-only, so
// no DB enum or AI classification changes.
export const CHANGE_KIND_FILTER_GROUP_MEMBERS = {
  // Timing — an existing due date moved, or a brand-new obligation appeared.
  deadlines: ['deadline_shift', 'new_obligation'],
  // Substance — what you must file, who it applies to, and the forms.
  rules: ['filing_requirement', 'applicability_scope', 'form_instruction'],
  // Provenance — the source moved or its health changed; may need re-verify.
  source: ['source_status', 'rule_source_drift'],
  // Advisory threshold pointers + catch-all.
  other: ['threshold_advisory', 'other'],
} as const satisfies Record<string, readonly PulseChangeKind[]>

export type AlertChangeKindFilterGroup = keyof typeof CHANGE_KIND_FILTER_GROUP_MEMBERS

export const CHANGE_KIND_FILTER_OPTIONS = [
  'all',
  'deadlines',
  'rules',
  'source',
  'other',
] as const satisfies readonly ('all' | AlertChangeKindFilterGroup)[]
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

export function matchesChangeKindFilter(
  changeKind: PulseChangeKind,
  filter: AlertChangeKindFilter,
): boolean {
  if (filter === 'all') return true
  return CHANGE_KIND_FILTER_GROUP_MEMBERS[filter].some((kind) => kind === changeKind)
}
