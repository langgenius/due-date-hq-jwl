import { useQuery } from '@tanstack/react-query'
import { plural } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { Astroid, ChevronRightIcon, Plus } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { LowConfidenceBadge } from '@/components/primitives/low-confidence-badge'
import { isLowAiConfidence } from '@/features/_surface-vocabulary/ai-confidence'
import { usePulseDetailQueryOptions } from '@/features/pulse/api'
import { pulseAlertTone, pulseAlertToneLabel } from '@/features/pulse/pulse-alert-tone'

// Dashboard variant of the Pulse alert card. Tuned for the dashboard's
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
// the Pulse drawer for the same alert showed nothing — same alert,
// two different confidence stories. Now: card + drawer both
// pick up the same 0.5 floor.
const VISIBLE_CLIENT_NAMES = 2

function useUniqueAffectedClientNames(alertId: string): {
  names: string[]
  hasMore: number
  isLoading: boolean
} {
  const detailQuery = useQuery(usePulseDetailQueryOptions(alertId))
  const affected = detailQuery.data?.affectedClients ?? []
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
    isLoading: detailQuery.isLoading,
  }
}

function NeedsAttentionCard({
  alert,
  onReview,
}: {
  alert: PulseAlertPublic
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
  const tone = pulseAlertTone(alert)
  const lowConfidence = isLowAiConfidence(alert.confidence)
  const { names, hasMore, isLoading: clientsLoading } = useUniqueAffectedClientNames(alert.id)

  // 2026-05-25 (Yuqi #47): clicking this card opens the Pulse drawer
  // in-place on the dashboard (via `usePulseDrawer().openDrawer`) —
  // not a navigation to /rules/pulse. This is intentional:
  //   • Pulse review is list-driven and quick (1-3 min per alert).
  //     Keeping the user on Today lets them sweep through the 2-3
  //     cards without losing place.
  //   • Same pattern the obligation drawer + client drawer use —
  //     consistency across surfaces beats per-page novelty.
  //   • The overflow tile ("View N more") DOES navigate to
  //     /rules/pulse — that's the right behaviour when the user is
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
    <button
      type="button"
      onClick={onReview}
      aria-label={t`Open Pulse alert details: ${alert.title}`}
      // 2026-05-25 (GitHub-density pass): card padding p-3.5 → p-3,
      // inner gap-2.5 → gap-2. Card content stays scannable but the
      // tile collapses to a more efficient footprint, matching the
      // section's tighter outer padding.
      className="group flex h-full min-w-0 cursor-pointer flex-col gap-2 rounded-md border border-divider-subtle bg-background-default p-3 text-left transition-colors hover:border-divider-regular hover:bg-background-default-hover focus-visible:border-state-accent-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      data-tone={tone}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {/* 2026-05-25 (Yuqi Today follow-up): the Pulse identity
              mark on the dashboard card was an Atom icon in
              accent-blue. The Atom read as "Pulse / AI signal" but
              was the ONLY surface using it — every other AI surface
              uses Astroid.
              2026-05-26 (Step 9 AI Visibility Audit F-001):
              swapped Atom → Astroid so the dashboard's Pulse
              identity mark matches the canonical AI provenance icon
              used by `PulseAlertCard`, `PulseDetailDrawer`, and
              `LowConfidenceBadge`. Three icons for "AI" → one. */}
          {/* 2026-05-25 (Yuqi Today #3 — second pass): source label
              text-base → text-sm. The source eyebrow is meta info,
              not body — at 16px it competed with the title below
              for first-read attention. */}
          <Astroid
            className="size-4 text-state-accent-solid"
            aria-label={pulseAlertToneLabel(tone)}
          />
          <span className="text-sm text-text-tertiary">{alert.source}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* 2026-05-25 (Yuqi Today #2): promoted to a shared
              <LowConfidenceBadge> primitive in
              components/primitives/low-confidence-badge.tsx so the
              same visual can replace other ad-hoc low-confidence
              treatments across the product (Pulse drawer,
              wizard normalisation rows, etc). Same shape, same
              tone — single source of truth. */}
          {lowConfidence ? <LowConfidenceBadge /> : null}
          {/* Chevron telegraphs "click opens" — translates further on
              hover (1px → 4px) so the click affordance feels real
              instead of static chrome. */}
          <ChevronRightIcon
            className="size-4 text-text-tertiary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-text-primary"
            aria-hidden
          />
        </div>
      </header>

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
      <p className="line-clamp-2 min-h-8 text-sm font-normal leading-snug text-text-primary">
        {alert.title}
      </p>

      {/* 2026-05-25 (Yuqi Today #3 — second pass): body text scale
          dropped across the card body — "client may be affected"
          stays text-xs, client-name chips text-base → text-xs,
          overflow +N text-base → text-xs, empty-state line
          text-base → text-sm. The whole card collapses to a
          tighter "title + meta + chips" rhythm matching the cards
          on /clients and /rules/library. */}
      {impacted > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs text-text-tertiary">
            <Plural
              value={impacted}
              one="# client may be affected"
              other="# clients may be affected"
            />
          </p>
          {!clientsLoading && names.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-1.5">
              {names.map((name) => (
                <li
                  key={name}
                  className={cn(
                    'inline-flex rounded-sm border border-divider-subtle bg-background-subtle px-2 py-0.5 text-xs text-text-secondary',
                  )}
                  title={name}
                >
                  {name}
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
          <Trans>No matching clients in this practice.</Trans>
        </p>
      )}
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
      one: 'View # more Pulse alert',
      other: 'View # more Pulse alerts',
    }),
  )
  // 2026-05-27 (Yuqi follow-up — "alert card is not occupying the
  // full width"): when the parent section stacks alert cards as
  // full-width rows, the overflow tile sits as a final row at the
  // same width. The old centred column-shaped tile (h-full + items-
  // center justify-center) read as a giant empty button. Now it's
  // a short flat row — left-aligned with the section, quiet text
  // tone, mirrors the "+ N more" affordance pattern used by the
  // workload + queue empty states.
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className="group/overflow inline-flex items-center justify-center gap-1.5 self-start rounded-md px-2 py-1 text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
    >
      {/* 2026-05-25 (Yuqi typography rebalance): "+ N more" drops
          from font-medium to regular — it's a navigation hint, not
          a labeled affordance, so it should read at body weight. */}
      <Plus
        className="size-3.5 transition-transform duration-200 group-hover/overflow:rotate-90"
        aria-hidden
      />
      <Trans>{count} more</Trans>
    </button>
  )
}

export { NeedsAttentionCard, NeedsAttentionOverflowCard }
