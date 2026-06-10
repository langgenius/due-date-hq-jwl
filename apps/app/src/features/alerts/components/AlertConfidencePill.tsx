import { Trans } from '@lingui/react/macro'
import { Astroid } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'

/**
 * Shared confidence-level pill rendered next to Alerts to qualify
 * the AI's confidence in the surfaced suggestion. Three tones, three
 * sizes-fixed-at-h-6:
 *
 *   low    — amber warning chip ("don't trust this")
 *   medium — neutral outline chip
 *   high   — info-blue accent chip
 *
 * This is *purely* a presentation primitive — every caller makes its
 * own decision about when to render Low (the drawer, for instance, only
 * renders Medium and High).
 *
 * The three tones use the canonical Badge primitive (warning / outline /
 * info variants on the default pill shape) so the chrome matches the
 * rest of the surface chip vocabulary.
 */
export function AlertConfidencePill({ confidence }: { confidence: 'low' | 'medium' | 'high' }) {
  if (confidence === 'low') {
    return (
      <Badge variant="warning">
        <Astroid aria-hidden />
        <Trans>Low</Trans>
      </Badge>
    )
  }
  if (confidence === 'medium') {
    return (
      <Badge variant="outline">
        <Astroid aria-hidden />
        <Trans>Medium</Trans>
      </Badge>
    )
  }
  return (
    <Badge variant="info">
      <Astroid aria-hidden />
      <Trans>High</Trans>
    </Badge>
  )
}
