import type { PulseAlertPublic, PulseFirmAlertStatus } from '@duedatehq/contracts'

import type { PulsingDotTone } from './components/PulsingDot'

/**
 * Canonical tone selector for a Alert — single source of truth
 * for every PulsingDot that renders an alert across the app.
 *
 * The formula matches the documented severity scale in
 * `docs/Design/pulse-vocabulary.md`:
 *
 *   • `success`  → resolved (applied / partially applied / dismissed
 *                  / reviewed / reverted)
 *   • `warning`  → urgent: open && impact > 0 && confidence ≥ LOW
 *   • `normal`   → informational: open && (no impact OR
 *                  confidence < LOW) — "FYI, no alarm yet"
 *   • `error`    → reserved for malformed / parse-failure cases the
 *                  caller passes in explicitly; this helper never
 *                  emits it.
 *
 * Why low confidence is INFORMATIONAL (not error/red):
 *   When the AI isn't sure, sounding the urgent alarm trains alarm
 *   fatigue. The accompanying confidence badge already screams
 *   "AI 46% — review before applying" — the dot's job is alert
 *   urgency, not AI quality. See pulse-vocabulary.md §"severity
 *   scale" for the original argument.
 *
 */

// Per pulse-vocabulary.md: confidence < LOW_THRESHOLD demotes urgent
// to informational. Aligned with `LOW_CONFIDENCE_THRESHOLD = 0.7`
// used by the dashboard's confidence pill.
const LOW_CONFIDENCE_THRESHOLD = 0.7

const RESOLVED_FIRM_STATUSES: ReadonlySet<PulseFirmAlertStatus> = new Set([
  'applied',
  'partially_applied',
  'dismissed',
  'reverted',
  'reviewed',
])

export function alertTone(
  alert: Pick<PulseAlertPublic, 'confidence' | 'matchedCount' | 'needsReviewCount'> & {
    firmStatus?: PulseFirmAlertStatus | null
  },
): PulsingDotTone {
  if (alert.firmStatus && RESOLVED_FIRM_STATUSES.has(alert.firmStatus)) {
    return 'success'
  }
  const impacted = alert.matchedCount + alert.needsReviewCount
  const lowConfidence = alert.confidence < LOW_CONFIDENCE_THRESHOLD
  if (impacted > 0 && !lowConfidence) return 'warning'
  return 'normal'
}

/**
 * Human-readable explanation of the dot's tone, rendered as both
 * the dot's `title` (hover tooltip) and `aria-label` so neither
 * sighted users hovering nor screen readers are left guessing.
 *
 * Pair with `alertTone()` so the colour and the sentence
 * always agree.
 */
export function alertToneLabel(tone: PulsingDotTone): string {
  switch (tone) {
    case 'warning':
      return 'Active alert — clients may be affected'
    case 'normal':
      return 'Informational alert — FYI, low confidence or no client impact'
    case 'success':
      return 'Alert resolved — no action needed'
    case 'error':
      return 'Alert parse failure — investigate'
    case 'disabled':
      return 'Source paused'
    default:
      return 'Alert status'
  }
}
