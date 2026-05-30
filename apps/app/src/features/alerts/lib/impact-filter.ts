import type { PulseAlertPublic } from '@duedatehq/contracts'

export const ALERT_IMPACT_FILTER_OPTIONS = [
  'all',
  'needs_action',
  'needs_review',
  'no_matches',
  'closed',
] as const

export type AlertImpactFilter = (typeof ALERT_IMPACT_FILTER_OPTIONS)[number]

export function isAlertImpactFilter(value: string): value is AlertImpactFilter {
  return ALERT_IMPACT_FILTER_OPTIONS.some((option) => option === value)
}

export function matchesAlertImpactFilter(
  alert: PulseAlertPublic,
  filter: AlertImpactFilter,
): boolean {
  if (filter === 'all') return true
  const impacted = alert.matchedCount + alert.needsReviewCount
  if (filter === 'needs_action') {
    return impacted > 0 && (alert.status === 'matched' || alert.status === 'partially_applied')
  }
  if (filter === 'needs_review') return alert.firmImpact === 'needs_review'
  if (filter === 'no_matches') return alert.firmImpact === 'no_current_match'
  return (
    alert.status === 'applied' ||
    alert.status === 'dismissed' ||
    alert.status === 'reverted' ||
    alert.status === 'reviewed'
  )
}
