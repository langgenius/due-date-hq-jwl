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
 * 2026-05-26 (Layer C — interactive primitive coverage): extracted from
 * two byte-identical inline JSX blocks across `AlertDetailDrawer` and
 * `AlertCard` so the three variants live in exactly one file. The
 * drawer historically only renders Medium and High (callers gate Low
 * out), so this component is *purely* a presentation primitive — every
 * caller still makes its own decision about when to render Low.
 *
 * 2026-06-01: collapsed three hand-rolled `<span>` rounded-full chips
 * into the canonical Badge primitive (warning / outline / info
 * variants on the default pill shape). Dropped the bespoke
 * uppercase/tracking-wide chrome — Badge's default register matches
 * the rest of the surface chip vocabulary now (info / warning chips
 * across PageHeader use the same default treatment).
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
