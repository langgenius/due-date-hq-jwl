import type { PulseAlertPublic, PulseFirmAlertStatus } from '@duedatehq/contracts'

import { isVeryLowPulseConfidence } from './components/PulseConfidenceBadge'
import type { PulsingDotTone } from './components/PulsingDot'

/**
 * Canonical semantic ladder for the `<PulsingDot>` across the app.
 *
 * Yuqi's 2026-05-25 critique flagged that the same FL DOR alert showed
 * a green dot on the dashboard's NeedsAttentionCard but a red dot
 * inside the PulseDetailDrawer for the SAME alert. Root cause: each
 * site computed its own tone with slightly different signals. This
 * helper is the single source of truth — call it from every site
 * that renders a PulsingDot for a Pulse alert.
 *
 * The ladder, in priority order (first match wins):
 *
 *   1. `critical` (red) — very low AI confidence. Need a human to
 *      look before anything else can happen. Trumps everything else.
 *   2. `success` (green) — alert is applied / partially applied OR
 *      no clients are impacted. Nothing the CPA must do.
 *   3. `warning` (amber) — alert is matched and clients are impacted.
 *      Needs attention but isn't a confidence emergency.
 *
 * Note: `firmStatus === 'dismissed' | 'reverted' | 'reviewed'` are
 * treated as `success` — the alert is closed out from the firm's
 * perspective. If you need to render dismissed differently (e.g. in
 * an audit-history view), pass a custom override or render a static
 * dot directly.
 */
export function pulseAlertTone(
  alert: Pick<PulseAlertPublic, 'confidence' | 'matchedCount' | 'needsReviewCount'> & {
    firmStatus?: PulseFirmAlertStatus | null
  },
): PulsingDotTone {
  if (isVeryLowPulseConfidence(alert.confidence)) return 'error'
  if (alert.firmStatus === 'applied' || alert.firmStatus === 'partially_applied') {
    return 'success'
  }
  const impacted = alert.matchedCount + alert.needsReviewCount
  if (impacted === 0) return 'success'
  return 'warning'
}

/**
 * Human-readable explanation of why the dot is the colour it is.
 * Renders as the dot's `title` attribute + `aria-label` so users
 * hovering or screen readers landing on it get one consistent
 * sentence instead of a mystery color.
 *
 * Pair with `pulseAlertTone` so the label and the colour always
 * agree (computing them from the same input).
 */
export function pulseAlertToneLabel(tone: PulsingDotTone): string {
  switch (tone) {
    case 'error':
      return 'Low AI confidence — needs human review before action'
    case 'warning':
      return 'Active alert — clients may be affected'
    case 'success':
      return 'No action required'
    case 'disabled':
      return 'Source paused or alert closed'
    default:
      return 'Alert status'
  }
}
