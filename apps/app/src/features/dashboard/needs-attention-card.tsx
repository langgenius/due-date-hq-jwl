import { useQuery } from '@tanstack/react-query'
import { plural } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CheckCircle2Icon, EyeIcon, Plus, UsersIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { aiConfidenceTier } from '@/features/_surface-vocabulary/ai-confidence'
import { usePulseDetailQueryOptions } from '@/features/pulse/api'
import { pulseAlertTone } from '@/features/pulse/pulse-alert-tone'
import { PulseSourceMeta } from '@/features/pulse/components/PulseSourceMeta'
import { severityFromConfidence } from '@/features/pulse/components/pulse-alert-chrome'
import { StateBadge } from '@/components/primitives/state-badge'

// Dashboard variant of the Pulse alert card. Tuned for the dashboard's
// "scan-and-act" mode and built to Pencil node VVMj9 specs:
//
//   • Card chrome: `bg-background-default` (white), `rounded-2xl`
//     (16px), NO border (Pencil shows the stroke disabled). Hover
//     drops to `bg-background-subtle` (gray-100). This is the same
//     pattern the /alerts PulseAlertCard uses — both surfaces serve
//     the same alert data and the same gray SidebarInset wash, so
//     the chrome should match. Pencil VVMj9 originally drew a
//     gray-tinted card (designed on a white canvas); inverting to
//     white-on-gray-wash is the equivalent in the live app.
//   • Fixed min-height (160px) so 3 cards in a row stay vertically
//     aligned even when one title is short. Content column uses
//     `justify-between` to push the affected-clients row to the
//     bottom edge regardless of how tall the title block grows.
//   • Empty client list rendered as a quiet caption, NOT an empty
//     chip row — preserves the bottom-anchor without rendering an
//     awkward empty container.
//   • Responsive: caller (`NeedsAttentionSection`) drives the grid
//     `grid-cols-{1,2,3}` based on alert count + viewport.
//
// Every internal element ships from a DS primitive:
//   • `<PulseToneIcon>` — leading 18×18 tone-coded icon
//   • `<PulseSourceMeta>` — "source · timestamp" row
//   • `<PulseAffectedClientChips>` — chip list with overflow tail
//   • `<LowConfidenceBadge>` — AI quality flag (top-right)
// Title text starts at: card padding (16) + tone-icon width (18) +
// gap (12) = 46px. Use the same inset on the source meta row and
// affected-clients row so all 3 lines hang from the title's start.
const META_INSET_CLASS = 'pl-[30px]'
// Minimum card height per Pencil VVMj9 — enforces vertical alignment
// across the 3-card row. Title can line-clamp to 2 lines; if the
// resulting card is shorter than this floor, the empty-state /
// chip row pushes to the bottom edge via the parent's `justify-between`.
const CARD_MIN_HEIGHT_CLASS = 'min-h-[160px]'

// 2026-06-04 round 19 (Yuqi Pencil vMnz5 — "for the clients
// — and hover will show the exact client in tooltip"): hook
// now returns the FULL deduplicated list of affected client
// names so the new Meta row's tooltip can render every name
// on hover. The previous Top-N + overflow-tail shape (for the
// chip-row design) is no longer needed because the card now
// shows a single "{N} clients" label with a tooltip-revealed
// roster, not a chip cluster.
function useUniqueAffectedClientNames(alertId: string): {
  allNames: string[]
  isLoading: boolean
  hasData: boolean
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
    allNames: ordered,
    isLoading: detailQuery.isLoading,
    hasData: detailQuery.isSuccess,
  }
}

// 2026-06-04 round 19 (Pencil vMnz5): confidence text tone
// follows the canonical 3-tier ladder — same `aiConfidenceTier`
// helper every other surface uses, so "conf 84%" on the card
// reads the same green a CPA learns to associate with HIGH on
// the PulseConfidencePill. Low confidence steps to destructive
// so the eye still catches it.
function confidenceToneClass(confidence: number): string {
  const tier = aiConfidenceTier(confidence)
  if (tier === 'high') return 'text-text-success'
  if (tier === 'medium') return 'text-text-tertiary'
  return 'text-text-destructive'
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
  const tone = pulseAlertTone(alert)
  const { allNames, isLoading: clientsLoading, hasData } = useUniqueAffectedClientNames(alert.id)
  const confidencePct = Math.round(alert.confidence * 100)
  const confidenceToneCls = confidenceToneClass(alert.confidence)
  // 2026-06-04 round 42 (Yuqi /today ↔ /alerts consistency #1 —
  // "has severity pill and state badge please"): mirror the
  // PulseAlertCard severity-pill + StateBadge vocabulary so the
  // dashboard summary and the alerts list speak the same visual
  // language. `severityFromConfidence` is the shared helper from
  // pulse-alert-chrome so the tier mapping stays canonical.
  const severity = severityFromConfidence(alert.confidence)
  const severityLabel =
    severity.id === 'high'
      ? t`HIGH IMPACT`
      : severity.id === 'medium'
        ? t`MEDIUM IMPACT`
        : t`LOW IMPACT`

  return (
    <button
      type="button"
      onClick={onReview}
      aria-label={t`Open Pulse alert details: ${alert.title}`}
      className={cn(
        // 2026-06-04 (Yuqi feedback #1+#6): two adjustments off the
        // 2026-06-04 first pass —
        //   • Dropped `justify-between` so the affected-clients
        //     row sits CLOSE to the title block (item #6 "client
        //     list can be close to top"). Previously the
        //     justify-between pushed the clients to the bottom
        //     edge for fixed-height parity, but Yuqi found that
        //     made the bottom feel empty.
        //   • Reduced internal gap-3 → gap-2 (12px → 8px) so
        //     title + source + clients sit tighter together.
        //   • Dropped CARD_MIN_HEIGHT — with the content packed
        //     to the top, cards size to their content, and a
        //     short card no longer floats below taller siblings.
        //     Grid `items-stretch` (parent) still equalizes
        //     visible heights when sibling cards are visible.
        // 2026-06-04 round 3 (Yuqi feedback #2 "closer"):
        // outer gap-2 (8px) → gap-1.5 (6px) so title / source meta
        // / clients pack even tighter. The card was reading as
        // 3 separated rows; now reads as a single block.
        // 2026-06-04 round 11 (Yuqi "remove shadow. hate them"):
        // dropped `shadow-xs` resting + `hover:shadow-sm`. The
        // bg tint + rounded radius carry the card identity at
        // rest; hover bg shift carries the interactivity cue.
        // No drop shadow chrome.
        //
        // 2026-06-04 round 38 (Yuqi consistency audit /today vs
        // /alerts): chrome tone unified with PulseAlertCard.
        // Resting was `bg-background-section` (#f9fafb gray-50)
        // which sits on the `bg-background-inset` page wash
        // (#f4f4f4) — only 1–2 RGB units of differential, so the
        // card chrome was nearly INVISIBLE against the wash. The
        // /alerts card flipped to white-on-gray for exactly this
        // reason (see PulseAlertCard line 268+ "Pencil's mock has
        // a WHITE Main bg + gray cards … our SidebarInset is gray,
        // so the analog has to invert: white cards on the gray
        // page wash"). Same reasoning applies here — this card
        // surfaces the SAME alert data type as the /alerts list,
        // and the surrounding chrome (SidebarInset gray wash) is
        // the same. So:
        //   • Resting → `bg-background-default` (white) — high
        //     contrast against the wash, clear card edge without
        //     a border.
        //   • Hover  → `bg-background-subtle` (#f2f4f7) — same
        //     "lift toward gray" affordance /alerts uses.
        // The dashboard's other sections (Actions list, Changes
        // since) already use white card chrome; this brings the
        // alerts tile into the same family.
        'group flex h-full w-full min-w-0 flex-col gap-1.5 rounded-2xl bg-background-default p-4 text-left',
        'transition-colors duration-200 hover:bg-background-subtle',
        'outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
      )}
      data-tone={tone}
    >
      {/* TOP BLOCK — meta row (severity + state) + title + source.
          2026-06-04 round 42 (consistency #1): structure mirrors
          PulseAlertCard — HIGH IMPACT pill + combined StateBadge
          pill on a top meta row, then title below. PulseToneIcon
          was retired here because the severity pill carries the
          same tier signal in the same visual language as /alerts. */}
      <div className="flex flex-col gap-1">
        {/* Top meta row — severity + state pill + view icon.
            2026-06-04 round 43:
              • Item 1 ("severity and state badge should be the same
                height"): both pills pinned to `h-6` (24px) with
                `items-center` so the StateBadge xs (20px) and the
                severity label sit centered to the same midline.
                The wrapper height is the shared spec; internal
                padding is x-only.
              • Item 3 ("change icon to eye icon"): trailing
                ChevronRightIcon → EyeIcon. The card's affordance
                isn't "navigate forward" (the chevron implication)
                — it's "view this alert's details in the drawer".
                Eye reads as the canonical "view / preview" verb. */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-6 shrink-0 items-center rounded-[4px] px-1.5 text-[11px] font-semibold tracking-[0.8px]"
            style={{ backgroundColor: severity.bg, color: severity.text }}
          >
            {severityLabel}
          </span>
          {/* 2026-06-04 round 44 (Yuqi /today #1 — "are they having
              the same rounded corners? also because state badge has
              a border - it looks like it is smaller"):
                • Corner radius matched: `rounded-[6px]` → `rounded-[4px]`
                  (same as severity pill).
                • Border removed, swapped to `bg-background-section`
                  gray fill. The border was claiming 1px from the
                  interior on each side, making the state pill read
                  ~2px shorter than the borderless severity pill at
                  the same h-6. Soft gray fill gives the pill
                  presence without eating internal space — both
                  pills now read as equal-weight colored chips. */}
          <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-[4px] bg-background-section px-1.5">
            <StateBadge code={alert.jurisdiction} size="xs" />
            <span className="text-[10px] font-semibold tracking-[0.4px] text-text-secondary uppercase">
              {alert.jurisdiction}
            </span>
          </span>
          <span className="flex-1" aria-hidden />
          <EyeIcon
            className="size-4 shrink-0 text-text-tertiary transition-colors duration-200 group-hover:text-text-primary"
            aria-hidden
          />
        </div>
        {/* Title — full-width below the meta row */}
        <h3
          className="line-clamp-2 min-w-0 text-base font-semibold leading-snug text-text-primary"
          title={alert.title}
        >
          {alert.title}
        </h3>

        {/* Source meta row — "source · 2h ago".
            Round 42: META_INSET_CLASS dropped — without the leading
            PulseToneIcon, the title hangs from the card's left
            padding directly. Source meta sits flush left under
            the title. */}
        <PulseSourceMeta source={alert.source} publishedAt={alert.publishedAt} />
      </div>

      {/* META BLOCK — Pencil node vMnz5: compact "👥 N clients · conf X%"
          row sits directly under the source-meta row. The chip-cluster
          design from earlier rounds (top-N names + overflow tail) is
          replaced by a single count text whose tooltip reveals the
          exact roster on hover. Lighter visually, denser semantically.
          Three states:
            • impacted > 0 + loaded  → "👥 N clients · conf X%"
                                       (tooltip on the "N clients" label
                                       lists the actual names)
            • impacted > 0 + loading → meta row hidden; row fills in
                                       once names land (no half-empty
                                       flash)
            • impacted === 0 + loaded → quiet "monitoring" caption */}
      <div>
        {impacted > 0 ? (
          clientsLoading || !hasData ? null : (
            // 2026-06-04 round 19 (Pencil vMnz5): inline meta row —
            // small UsersIcon + count-with-tooltip + middot + confidence.
            // The count is the click-blocking <span> wrapped in
            // Tooltip; cursor-help signals the hover affordance. Names
            // are rendered as one per line in the tooltip so 10+ roster
            // entries stay readable.
            <div className="inline-flex items-center gap-2 text-sm">
              <UsersIcon className="size-3 shrink-0 text-text-tertiary" aria-hidden />
              <Tooltip>
                <TooltipTrigger
                  render={(props) => (
                    <span
                      className="cursor-help font-medium text-text-tertiary outline-none transition-colors hover:text-text-secondary"
                      onClick={(event) => event.stopPropagation()}
                      {...props}
                    >
                      <Plural value={impacted} one="# client" other="# clients" />
                    </span>
                  )}
                />
                <TooltipContent>
                  <div className="flex max-w-[260px] flex-col gap-0.5 text-left">
                    <span className="font-semibold">
                      <Trans>Affected clients</Trans>
                    </span>
                    {allNames.length > 0 ? (
                      allNames.map((name) => (
                        <span key={name} className="text-text-secondary">
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-text-tertiary">
                        <Trans>Resolving roster…</Trans>
                      </span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
              <span aria-hidden className="text-xs text-text-tertiary">
                ·
              </span>
              <span className={cn('text-xs font-semibold tabular-nums', confidenceToneCls)}>
                <Trans>conf {confidencePct}%</Trans>
              </span>
            </div>
          )
        ) : hasData ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
            <CheckCircle2Icon className="size-3 shrink-0" aria-hidden />
            <Trans>No clients matched — monitoring continues</Trans>
          </div>
        ) : null}
      </div>
    </button>
  )
}

// Overflow tile rendered next to the alert cards when there are more
// alerts than the dashboard's `VISIBLE_ALERTS` cap allows.
function NeedsAttentionOverflowCard({ count, onOpen }: { count: number; onOpen: () => void }) {
  const { i18n } = useLingui()
  const ariaLabel = i18n._(
    plural(count, {
      one: 'View # more Pulse alert',
      other: 'View # more Pulse alerts',
    }),
  )
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className={cn(
        'group/overflow flex shrink-0 flex-col items-center justify-center gap-1 self-stretch rounded-2xl px-4 text-text-secondary',
        'transition-colors hover:text-text-primary',
        'outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        CARD_MIN_HEIGHT_CLASS,
      )}
    >
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
