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
 * 2026-06-05: replaces the old confidence-derived "severity" badge,
 * which mislabeled INVERTED AI confidence as IMPACT (low confidence →
 * "HIGH IMPACT"). Confidence still drives its own surfaces (the
 * pulsing-dot tone, the drawer confidence pill, the low-confidence
 * banner) — it just no longer masquerades as client impact.
 *
 * Thresholds live here, in one place — tune freely:
 *   • high   — 5+ impacted obligations
 *   • medium — 2–4
 *   • low    — 0–1  (includes review-only / no-current-match advisories)
 */
export type ImpactLevel = 'low' | 'medium' | 'high'

export function alertImpactLevel(
  alert: Pick<PulseAlertPublic, 'matchedCount' | 'needsReviewCount'>,
): ImpactLevel {
  const impacted = alert.matchedCount + alert.needsReviewCount
  if (impacted >= 5) return 'high'
  if (impacted >= 2) return 'medium'
  return 'low'
}
