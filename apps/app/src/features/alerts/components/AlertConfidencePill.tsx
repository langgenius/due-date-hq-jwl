import { Trans } from '@lingui/react/macro'
import { Astroid } from 'lucide-react'

/**
 * Shared confidence-level pill rendered next to Alerts to qualify
 * the AI's confidence in the surfaced suggestion. Three tones, three
 * sizes-fixed-at-h-6:
 *
 *   low    — amber tint (warning-hover bg, warning text), "don't trust this"
 *   medium — neutral gray tint (section bg, secondary text)
 *   high   — info blue (info-hover bg, accent text)
 *
 * 2026-05-26 (Layer C — interactive primitive coverage): extracted from
 * two byte-identical inline JSX blocks across `AlertDetailDrawer` and
 * `AlertCard` so the three variants live in exactly one file. The
 * drawer historically only renders Medium and High (callers gate Low
 * out), so this component is *purely* a presentation primitive — every
 * caller still makes its own decision about when to render Low.
 */
export function AlertConfidencePill({ confidence }: { confidence: 'low' | 'medium' | 'high' }) {
  if (confidence === 'low') {
    return (
      <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-state-warning-hover px-2 text-xs font-medium uppercase tracking-wide text-text-warning">
        <Astroid className="size-3" aria-hidden />
        <Trans>Low</Trans>
      </span>
    )
  }
  if (confidence === 'medium') {
    return (
      <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-divider-subtle bg-background-section px-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
        <Astroid className="size-3" aria-hidden />
        <Trans>Medium</Trans>
      </span>
    )
  }
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-state-info-hover px-2 text-xs font-medium uppercase tracking-wide text-text-accent">
      <Astroid className="size-3" aria-hidden />
      <Trans>High</Trans>
    </span>
  )
}
