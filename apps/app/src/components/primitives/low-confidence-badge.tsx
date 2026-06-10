import { Trans, useLingui } from '@lingui/react/macro'
import { Astroid } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * LowConfidenceBadge — canonical "AI extracted this with low confidence,
 * review before applying" badge.
 *
 * The canonical shape for *all* low-confidence signals across the
 * product (a `bg-state-warning-hover` pill + Astroid icon + uppercase
 * tracked text) so consumers reference one component instead of
 * hand-rolling the same visual.
 *
 * ## When to use this
 * The badge says "the AI is unsure — don't trust this fact without a
 * human look." That's distinct from:
 *  - **"Needs review"** (Step3Normalize, Step4Preview row marker) —
 *    that's the downstream consequence; the row in the table needs
 *    a human to confirm. Use the existing `AlertTriangleIcon + Needs
 *    review` inline badge there. Different label, different icon,
 *    same tone family.
 *  - Alert confidence pills (in `AlertCard` / drawer) — those
 *    are the 3-tier (Low/Medium/High) per-alert qualitative pill,
 *    keyed off the canonical `aiConfidenceTier` helper. Both surfaces
 *    use the Astroid icon as the "AI signal" mark — confidence is
 *    communicated by the pill TONE (warning amber / neutral gray /
 *    info blue), not by the icon. This badge primitive is the same
 *    family for surfaces that only need the binary "AI is unsure"
 *    flag (without rendering the full 3-tier ladder).
 *  - **`InsightStatusBadge.failed`** — that's a hard failure of the
 *    AI run, not a low-confidence inference.
 *
 * Use `LowConfidenceBadge` only when you have a confidence score
 * below threshold and want to flag the *entity* (an alert, a
 * mapping, a row) as "AI-inferred but not certain."
 *
 * ## Tone notes
 *  - bg + text use the `warning` tone (amber) — per the status-pill
 *    audit's §3.1 ladder, amber means "external pause / not urgent
 *    error". Low confidence isn't a failure; it's a "human, please
 *    double-check this before it lands."
 *  - Astroid icon (over AlertTriangle) per the rationale at the
 *    original site: triangle reads as "warning, something's wrong";
 *    Astroid reads as "AI / cosmic uncertainty", which is the
 *    accurate framing.
 *
 * ## Current consumers
 *  - `features/dashboard/needs-attention-card.tsx` — Alert
 *    card on Today when alert.confidence < 0.5
 */
export function LowConfidenceBadge({ className }: { className?: string }) {
  const { t } = useLingui()
  // Wrapped in `<Tooltip>` so the badge explains itself on hover — a CPA
  // scanning the row needs to know WHY THIS alert was flagged (vs. its
  // siblings without the badge): the AI's extraction confidence on this
  // alert fell below the canonical 0.5 threshold.
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Badge
            variant="warning"
            className={cn('cursor-help uppercase tracking-wide', className)}
            {...props}
          >
            <Astroid aria-hidden />
            <Trans>Low confidence</Trans>
          </Badge>
        )}
      />
      {/* The tooltip states the honest current behavior. The badge is
          informational only — it doesn't block Apply today. Its job is to
          prompt the CPA to manually verify the extracted facts against the
          source. Blocking logic (require sign-off before Apply, route to a
          review queue) is roadmapped but not built. */}
      <TooltipContent>{t`AI extraction confidence below 50%. Verify the extracted details against the source before trusting them. This is a visual warning only — it does not currently block Apply, but you should double-check before applying.`}</TooltipContent>
    </Tooltip>
  )
}
