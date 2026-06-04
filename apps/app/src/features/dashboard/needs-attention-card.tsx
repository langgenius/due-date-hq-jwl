import { plural } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ChevronRightIcon, Plus, SquareArrowOutUpRightIcon } from 'lucide-react'

import type { PulseAffectedClient, PulseAlertPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Card, CardContent, CardHeader } from '@duedatehq/ui/components/ui/card'

import { LowConfidenceBadge } from '@/components/primitives/low-confidence-badge'
import { RelativeTime } from '@/components/primitives/relative-time'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { isLowAiConfidence } from '@/features/_surface-vocabulary/ai-confidence'
import { alertTone, alertToneLabel } from '@/features/alerts/alert-tone'

// Dashboard variant of the Alert card. Tuned for the dashboard's
// "scan-and-act" mode:
// - The whole card is the action target — no separate Review button.
// - AI confidence hidden unless low enough to need review.
// - Affected client names listed inline; tail collapses to "+N more".
//
// Per 2026-05-20 redesign: bigger title (text-base font-medium beats
// text-sm font-semibold for readability), sans-serif numerals
// throughout, source eyebrow demoted to small tertiary label.

// 2026-05-26 (Step 9 AI Visibility Audit F-019): threshold migrated
// to the canonical `isLowAiConfidence(0.5)`. Previously this card
// fired the LowConfidenceBadge for confidence in [0.5, 0.7) while
// the alert drawer for the same alert showed nothing — same alert,
// two different confidence stories. Now: card + drawer both
// pick up the same 0.5 floor.
const VISIBLE_CLIENT_NAMES = 2

// Pure derivation of the deduped, capped affected-client name preview.
// Affected rows are batch-loaded by the parent section (one `getDetailsBatch`
// for all visible cards) and passed in, instead of each card fetching its own
// `pulse.getDetail`.
function uniqueAffectedClientNames(affected: PulseAffectedClient[]): {
  names: string[]
  hasMore: number
} {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const row of affected) {
    if (!seen.has(row.clientName)) {
      seen.add(row.clientName)
      ordered.push(row.clientName)
    }
  }
  return {
    names: ordered.slice(0, VISIBLE_CLIENT_NAMES),
    hasMore: Math.max(ordered.length - VISIBLE_CLIENT_NAMES, 0),
  }
}

function NeedsAttentionCard({
  alert,
  affectedClients = [],
  onReview,
}: {
  alert: PulseAlertPublic
  affectedClients?: PulseAffectedClient[]
  onReview: () => void
}) {
  const { t } = useLingui()
  const impacted = alert.matchedCount + alert.needsReviewCount
  // 2026-05-25 (Yuqi critique B): dot tone now comes from the
  // canonical helper so the dashboard card + drawer + alerts list
  // all agree on the same alert's tone. Previously the dashboard
  // showed green/yellow based on impacted-count alone, while the
  // drawer used confidence-first logic — so the SAME alert read
  // green outside and red inside.
  const tone = alertTone(alert)
  const lowConfidence = isLowAiConfidence(alert.confidence)
  // 2026-06-01 (DS primitives sweep): source eyebrow timestamp now
  // routes through `<RelativeTime>` so the rendered "Xm ago" gets a
  // `<time dateTime title>` wrapper — same a11y + tooltip-precision
  // contract every other recency surface uses (member roster,
  // reminders, notifications). Firm timezone is resolved locally
  // via `useCurrentFirm()` so callers don't have to plumb it.
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)
  const { names, hasMore } = uniqueAffectedClientNames(affectedClients)

  // 2026-05-25 (Yuqi #47): clicking this card opens the alert drawer
  // in-place on the dashboard (via `useAlertDrawer().openDrawer`) —
  // not a navigation to /alerts. This is intentional:
  //   • Alert review is list-driven and quick (1-3 min per alert).
  //     Keeping the user on Today lets them sweep through the 2-3
  //     cards without losing place.
  //   • Same pattern the obligation drawer + client drawer use —
  //     consistency across surfaces beats per-page novelty.
  //   • The overflow tile ("View N more") DOES navigate to
  //     /alerts — that's the right behaviour when the user is
  //     asking for the full list, not one specific alert.
  // If alerts grow into long-form investigation work later we'll
  // revisit and promote to a route.
  return (
    // 2026-05-25 (Yuqi Today #5): added `hover:bg-background-default-hover`.
    // The previous hover only changed `border-color`, which on a card
    // surrounded by a tinted section bg was nearly invisible — Yuqi
    // flagged that hovering the card "didn't feel like anything was
    // happening." The fill change makes the click affordance read
    // immediately. Border still escalates as a secondary cue.
    // 2026-05-31 (Yuqi DS-first revision): card chrome now goes
    // through the shared `<Card size="xs">` primitive — a new size
    // variant added to packages/ui/src/components/ui/card.tsx for
    // dense dashboard surfaces (gap-2, py-3, px-3, text-sm). The
    // outer `<button>` claims the click target + keyboard semantics;
    // the inner `<Card>` provides the design-system chrome. Only
    // overrides applied are the surface bg (subtle vs the card's
    // default white) and the hover bg, which propagate via the
    // outer group's hover state.
    <button
      type="button"
      onClick={onReview}
      aria-label={t`Open Pulse alert details: ${alert.title}`}
      className="group block h-full w-full min-w-0 cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      data-tone={tone}
    >
      <Card
        size="xs"
        className="bg-background-subtle transition-colors group-hover:bg-background-default"
      >
        <CardHeader className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {/* Icon tone is `text-text-tertiary` — meta indicator
                ("this card is anchored on an external source"), not
                an urgency signal. The card's outer alerts-panel
                wash and the LowConfidenceBadge (when applicable)
                carry the urgency. */}
            <SquareArrowOutUpRightIcon
              className="size-3.5 shrink-0 text-text-tertiary"
              aria-label={alertToneLabel(tone)}
            />
            <span className="truncate text-sm font-medium text-text-secondary">{alert.source}</span>
            {alert.publishedAt ? (
              <>
                <span aria-hidden className="text-text-tertiary">
                  ·
                </span>
                {/* 2026-06-01 (DS primitives sweep): canonical
                    `<RelativeTime>` — renders `<time dateTime title>`
                    with the relative label and full `YYYY-MM-DD
                    HH:MM:SS TZ` tooltip. */}
                <RelativeTime
                  value={alert.publishedAt}
                  timeZone={firmTimezone}
                  className="shrink-0 text-xs text-text-tertiary tabular-nums"
                />
              </>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {lowConfidence ? <LowConfidenceBadge /> : null}
            <ChevronRightIcon
              className="size-4 text-text-tertiary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-text-primary"
              aria-hidden
            />
          </div>
        </CardHeader>

        {/* Title block has a fixed 2-line min-height so card heights
          stay uniform across the row even when one title is short.
          line-clamp-2 caps the upper bound.
          2026-05-25 (Yuqi Today #3 — second pass): title size
          stepped down text-md → text-sm and weight dropped
          font-medium → font-normal. Yuqi flagged "smaller" — the
          card was reading as a hero title at text-md. Body weight
          + sm size keeps it scannable but ranks it below the
          section h2 above. min-height bumped from min-h-10 →
          min-h-8 so two short lines still anchor the cards at
          equal heights. */}
        {/* 2026-05-25 (Yuqi Today #1): explicit font-normal — the
          title was reading as font-medium on hover. No CSS rule
          actually changes the weight, but the subpixel-anti-
          aliasing shift on the bg change made the text look
          slightly heavier. Locking the weight explicitly so it
          stays at 400 in both rest and hover states. */}
        <CardContent>
          <p className="line-clamp-2 min-h-8 text-sm font-medium leading-snug text-text-primary">
            {alert.title}
          </p>
        </CardContent>

        <CardContent>
          {impacted > 0 ? (
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-xs text-text-tertiary">
                <Plural
                  value={impacted}
                  one="# client may be affected"
                  other="# clients may be affected"
                />
              </p>
              {names.length > 0 ? (
                // Per-name pills use the canonical Badge primitive
                // so shape + border + hover come from the shared
                // chip vocabulary, not a one-off <li> with
                // hand-rolled rounded-sm + border classes.
                <ul className="flex flex-wrap items-center gap-1.5">
                  {names.map((name) => (
                    <li key={name}>
                      <Badge variant="outline" title={name}>
                        {name}
                      </Badge>
                    </li>
                  ))}
                  {hasMore > 0 ? (
                    <li className="inline-flex text-xs text-text-tertiary">+{hasMore}</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">
              {/* Empty-state copy reframes the absence of matches as
                  ongoing monitoring ("we'll flag any new matches")
                  instead of a flat "nothing to see here." */}
              <Trans>No matching clients in this practice — we'll flag any new matches.</Trans>
            </p>
          )}
        </CardContent>
      </Card>
    </button>
  )
}

// 2026-05-24 (critique P2 — clarify): this used to read as a third
// "tile" sized identically to the alert cards next to it — same
// border, same fill area — even though it's just an expand
// affordance. CPAs were trying to click into it as if it were
// another alert card. Compress to a quieter "View N more"
// link-tile: smaller width, no big "+N" headline, single line of
// copy with an arrow. Still tappable, still keyboard-focusable,
// but visually signals "navigation" not "content."
//
// 2026-05-25 (Yuqi Today #6): stripped the card chrome (border,
// fill) entirely. Yuqi flagged that even after the 2026-05-24
// compression, the "+ N more" still read as a card sibling to the
// alert tiles. Now it's a plain text-link tile — no border, no
// background, just the action label with a chevron. Hover lifts
// it to text-primary so the affordance is still discoverable. The
// flex sibling still claims its column so the grid keeps three
// columns of equal width (alert / alert / link).
function NeedsAttentionOverflowCard({ count, onOpen }: { count: number; onOpen: () => void }) {
  const { i18n } = useLingui()
  // 2026-05-24 (re-critique): the aria-label used to concat
  // `${count === 1 ? '' : 's'}` inline, which doesn't survive non-
  // English plurals (many locales need wholly different forms,
  // not just an `s` suffix). Route through `i18n._(plural(...))` so
  // Lingui's extractor catches every plural variant.
  const ariaLabel = i18n._(
    plural(count, {
      one: 'View # more Alert',
      other: 'View # more Alerts',
    }),
  )
  // 2026-05-27 (Yuqi revert — "怎么会变成这样vertical"): restored the
  // column-shaped overflow tile so it claims its 160px grid column
  // alongside the two alert cards. The flat inline button paired
  // with the vertical stack; with the grid back, this tile reads as
  // a parallel sibling to the alert cards again.
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className="group/overflow flex h-full shrink-0 flex-col items-center justify-center gap-1 self-stretch rounded-md px-4 text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
    >
      {/* 2026-05-25 (Yuqi typography rebalance): "+ N more" drops
          from font-medium to regular — it's a navigation hint, not
          a labeled affordance, so it should read at body weight. */}
      <span className="inline-flex items-center gap-1 text-sm">
        <Plus
          className="size-3.5 transition-transform duration-200 group-hover/overflow:rotate-90"
          aria-hidden
        />
        <Trans>{count} more</Trans>
      </span>
    </button>
  )
}

export { NeedsAttentionCard, NeedsAttentionOverflowCard }
