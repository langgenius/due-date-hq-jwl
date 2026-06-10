import type { PulseAlertPublic } from '@duedatehq/contracts'

/**
 * Real client-impact level for an alert — the MAGNITUDE of how many
 * obligations the firm actually has riding on this Pulse, i.e.
 * `matchedCount + needsReviewCount`. (Same "impacted" definition the
 * priority scorer uses for its `high_impact` reason, see
 * `scorePulsePriority` in @duedatehq/db.)
 *
 * Single source of truth for impact across the card badge
 * (`impactBadgeFromAlert` in pulse-alert-chrome.ts) and the
 * "highest impact" sort (AlertsListPage), so the two always agree.
 *
 * Impact is distinct from AI confidence: confidence drives its own
 * surfaces (the pulsing-dot tone, the drawer confidence pill, the
 * low-confidence banner) and must not masquerade as client impact.
 *
 * Thresholds live here, in one place — tune freely:
 *   • high   — 5+ impacted obligations
 *   • medium — 2–4
 *   • low    — 0–1  (includes review-only / no-current-match advisories)
 */
export type ImpactLevel = 'low' | 'medium' | 'high'

/**
 * Raw client-impact magnitude — `matchedCount + needsReviewCount`. The number
 * the "Affects N clients" row line shows, the "highest impact" sort orders by,
 * and the top-3 "High impact" badge ranks on. One definition so they agree.
 */
export function alertImpactCount(
  alert: Pick<PulseAlertPublic, 'matchedCount' | 'needsReviewCount'>,
): number {
  return alert.matchedCount + alert.needsReviewCount
}

export function alertImpactLevel(
  alert: Pick<PulseAlertPublic, 'matchedCount' | 'needsReviewCount'>,
): ImpactLevel {
  const impacted = alertImpactCount(alert)
  if (impacted >= 5) return 'high'
  if (impacted >= 2) return 'medium'
  return 'low'
}
