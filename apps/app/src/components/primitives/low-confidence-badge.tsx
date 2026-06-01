import { Trans } from '@lingui/react/macro'
import { Astroid } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * LowConfidenceBadge — canonical "AI extracted this with low confidence,
 * review before applying" badge.
 *
 * 2026-05-25 (Yuqi Today #2): originally inlined inside the
 * NeedsAttentionCard on the dashboard with a `bg-state-warning-hover`
 * pill + Astroid icon + uppercase tracked text. Yuqi flagged it as
 * the canonical shape we want for *all* low-confidence signals across
 * the product. Promoted to a primitive so future consumers reference
 * one component instead of hand-rolling the same visual.
 *
 * ## When to use this
 * The badge says "the AI is unsure — don't trust this fact without a
 * human look." That's distinct from:
 *  - **"Needs review"** (Step3Normalize, Step4Preview row marker) —
 *    that's the downstream consequence; the row in the table needs
 *    a human to confirm. Use the existing `AlertTriangleIcon + Needs
 *    review` inline badge there. Different label, different icon,
 *    same tone family.
 *  - Pulse confidence pills (in `PulseAlertCard` / drawer) — those
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
 *  - `features/dashboard/needs-attention-card.tsx` — Pulse alert
 *    card on Today when alert.confidence < 0.5
 */
export function LowConfidenceBadge({ className }: { className?: string }) {
  // 2026-05-31 (Yuqi DS-first revision): now wraps the canonical
  // `<Badge variant="warning" />` primitive instead of a hand-rolled
  // `<span>`. The amber tone, padding, and base classes live in
  // `badge.tsx`; only the uppercase tracking treatment is added
  // here as the "this is a low-confidence flag, not a generic
  // warning chip" specialization.
  return (
    <Badge variant="warning" className={cn('uppercase tracking-wide', className)}>
      <Astroid aria-hidden />
      <Trans>Low confidence</Trans>
    </Badge>
  )
}
