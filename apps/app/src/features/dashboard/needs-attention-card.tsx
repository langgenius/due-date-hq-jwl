import { plural } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { Building2, ExternalLinkIcon, Plus } from 'lucide-react'

import type { PulseAffectedClient, PulseAlertPublic } from '@duedatehq/contracts'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { aiConfidenceTier } from '@/features/_surface-vocabulary/ai-confidence'
import { alertTone } from '@/features/alerts/alert-tone'
// 2026-06-05 (merge with origin/main): origin/main re-added the
// PulseSourceMeta import here because main's needs-attention-card
// still rendered the canonical source row. Our round 81 retired
// `<PulseSourceMeta>` in favor of an inline source treatment in
// the subject block (`<ExternalLinkIcon>` + truncated label with
// the URL on tooltip hover). We keep the inline treatment — the
// JSX below does not call `<PulseSourceMeta>`, so the import is
// intentionally omitted to keep `pnpm typecheck` from flagging it
// as unused. If a future revision re-enables the canonical source
// row, restore the `PulseSourceMeta` import along with it.
import { impactBadgeFromAlert } from '@/features/alerts/components/pulse-alert-chrome'
import { StateBadge } from '@/components/primitives/state-badge'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { formatRelativeTime } from '@/lib/utils'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'

// Dashboard variant of the Alert card. Tuned for the dashboard's
// "scan-and-act" mode and built to Pencil node VVMj9 specs:
//
//   • Card chrome: `bg-background-default` (white), `rounded-2xl`
//     (16px), NO border (Pencil shows the stroke disabled). Hover
//     drops to `bg-background-subtle` (gray-100). This is the same
//     pattern the /alerts AlertCard uses — both surfaces serve
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
//   • `<PulseSourceMeta>` — "source · timestamp" row
//   • `<StateBadge>` — jurisdiction chip in the top meta row
// Title text hangs from the card's left padding directly. Source
// meta sits flush left under the title (round 42 dropped the
// leading tone icon, so no title inset is needed any more).
// Minimum card height per Pencil VVMj9 — enforces vertical alignment
// across the 3-card row. Title can line-clamp to 2 lines; if the
// resulting card is shorter than this floor, the empty-state /
// chip row pushes to the bottom edge via the parent's `justify-between`.
const CARD_MIN_HEIGHT_CLASS = 'min-h-[160px]'

// 2026-06-04 round 19 (Yuqi Pencil vMnz5 — "for the clients
// — and hover will show the exact client in tooltip"): this now
// returns the FULL deduplicated list of affected client names so
// the new Meta row's tooltip can render every name on hover. The
// previous Top-N + overflow-tail shape (for the chip-row design)
// is no longer needed because the card now shows a single
// "{N} clients" label with a tooltip-revealed roster, not a chip
// cluster.
//
// Affected rows are batch-loaded by the parent section (one
// `getDetailsBatch` for all visible cards via
// `useAlertsAffectedClients`) and passed in, instead of each card
// fetching its own `pulse.getDetail`. This keeps the dashboard at a
// single batched request regardless of how many cards render.
function uniqueAffectedClientNames(affected: PulseAffectedClient[]): {
  allNames: string[]
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
    allNames: ordered,
  }
}

// 2026-06-04 round 19 (Pencil vMnz5): confidence text tone
// follows the canonical 3-tier ladder — same `aiConfidenceTier`
// helper every other surface uses, so "conf 84%" on the card
// reads the same green a CPA learns to associate with HIGH on
// the AlertConfidencePill. Low confidence steps to destructive
// so the eye still catches it.
function confidenceToneClass(confidence: number): string {
  const tier = aiConfidenceTier(confidence)
  if (tier === 'high') return 'text-text-success'
  if (tier === 'medium') return 'text-text-tertiary'
  return 'text-text-destructive'
}

/**
 * 2026-06-04 round 81 (Yuqi #4 "avoid writing the source e.g. FL
 * DOR again"): when an alert title starts with the source name
 * (e.g. title "FL DOR Bulletin has very-low-confidence…" alongside
 * source "FL DOR Bulletin"), the two read as a duplicate. Strip
 * the source prefix from the title when it matches, then clean up
 * a trailing separator (":", "·", "—", "-") if present.
 *
 * Round 85 follow-up — edge cases tightened:
 *   • If `title === source` exactly (or trimmed-equal), there's
 *     nothing meaningful to surface as a stripped title. Return
 *     the raw title so the card still shows SOMETHING in the
 *     subject slot; the source line below renders the same text
 *     once, which is the round-81 problem in miniature but is
 *     less bad than rendering an empty `<h3>`.
 *   • If the trimmed-rest is purely punctuation/whitespace, treat
 *     as "no meaningful content" and fall back to raw title.
 *   • Otherwise strip the prefix and the trailing separator
 *     (same shape as the original).
 * Defensive — falls back to the raw title for any non-matching
 * shape so unrelated titles render unchanged.
 *
 * @internal Exported for unit tests.
 */
export function dedupeTitleSource(title: string, source: string): string {
  const t = title.trim()
  const s = source.trim()
  if (!s) return t
  // Edge case: source IS the entire title. Nothing meaningful
  // after stripping; fall back to the raw title.
  if (t.toLowerCase() === s.toLowerCase()) return t
  if (t.toLowerCase().startsWith(s.toLowerCase())) {
    const rest = t.slice(s.length).trim().replace(/^[-—:·]+\s*/u, '')
    // Also guard against rest being non-empty but pure
    // punctuation/whitespace — render the raw title instead.
    if (rest.length > 0 && /[\p{L}\p{N}]/u.test(rest)) {
      // Capitalize first letter so the stripped title still reads
      // like a proper sentence.
      return rest.charAt(0).toUpperCase() + rest.slice(1)
    }
  }
  return t
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
  // all agree on the same alert's tone.
  const tone = alertTone(alert)
  // Affected client names come from the parent's batched load (one
  // request for all visible cards), not a per-card query.
  const { allNames } = uniqueAffectedClientNames(affectedClients)
  // Round 71/85 (post-merge adaptation): origin/main's section now
  // batch-loads detail; we don't per-card fetch any more. Derive the
  // form code from the first affected client's `taxType` so the
  // TaxCodeBadge in the bottom row still renders without an extra
  // round-trip. Drops to null when no clients are matched.
  const firstForm = affectedClients[0]?.taxType ?? null
  // Round 85 (post-merge): origin/main passes batched clients via
  // prop, no loading state per-card. `clientsLoading` and `hasData`
  // collapse to constants the render uses below.
  const clientsLoading = false
  const hasData = true
  const confidencePct = Math.round(alert.confidence * 100)
  const confidenceToneCls = confidenceToneClass(alert.confidence)
  // 2026-06-04 round 42 (Yuqi /today ↔ /alerts consistency #1 —
  // "has severity pill and state badge please"): mirror the
  // AlertCard severity-pill + StateBadge vocabulary so the
  // dashboard summary and the alerts list speak the same visual
  // language. `impactBadgeFromAlert` is the shared helper from
  // pulse-alert-chrome so the tier mapping stays canonical.
  // 2026-06-05 (merge with origin/main): main switched the impact
  // tier from confidence-based (`severityFromConfidence`) to
  // count-based (`impactBadgeFromAlert(alert)`). New canonical
  // direction — impact reflects actual matched + needs-review
  // client counts, not how confident the model is. The colors
  // round 58 specified for the HIGH tier (X3j4nt amber) were
  // dropped in main's version too; keeping main's palette
  // (`#FEE4E2` / `#9F1239`) so /today and /alerts agree.
  const severity = impactBadgeFromAlert(alert)
  // Pencil X3j4nt SeverityPill uses the BARE tier word ("HIGH"),
  // not the full "HIGH IMPACT" phrase. Drops 6 characters from a
  // 22px-tall pill, which makes a real visual difference at the
  // mono 10/700 type scale used here.
  const severityLabel =
    severity.id === 'high'
      ? t`HIGH`
      : severity.id === 'medium'
        ? t`MED`
        : t`LOW`

  // Pencil X3j4nt TimeColumn shows "2h ago" + an absolute "14:32"
  // in mono. Resolve the firm's timezone so the absolute time
  // matches the CPA's working clock, not UTC.
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)
  const absoluteTime = alert.publishedAt
    ? new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: firmTimezone,
      }).format(new Date(alert.publishedAt))
    : ''

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
        // /alerts): chrome tone unified with AlertCard.
        // Resting was `bg-background-section` (#f9fafb gray-50)
        // which sits on the `bg-background-inset` page wash
        // (#f4f4f4) — only 1–2 RGB units of differential, so the
        // card chrome was nearly INVISIBLE against the wash. The
        // /alerts card flipped to white-on-gray for exactly this
        // reason (see AlertCard "Pencil's mock has a WHITE Main
        // bg + gray cards … our SidebarInset is gray, so the
        // analog has to invert: white cards on the gray page
        // wash"). Same reasoning applies here — this card surfaces
        // the SAME alert data type as the /alerts list, and the
        // surrounding chrome (SidebarInset gray wash) is the same.
        // So:
        //   • Resting → `bg-background-default` (white) — high
        //     contrast against the wash, clear card edge without
        //     a border.
        //   • Hover  → `bg-background-subtle` (#f2f4f7) — same
        //     "lift toward gray" affordance /alerts uses.
        // The dashboard's other sections (Actions list, Changes
        // since) already use white card chrome; this brings the
        // alerts tile into the same family.
        // 2026-06-04 round 45 (Yuqi /today feedback #1+#3): outer
        // column gap `gap-1.5` (6px) → `gap-2` (8px) and corner
        // `rounded-2xl` (16px) → `rounded-3xl` (24px). Both nudges
        // are small but read as a softer, more deliberate card.
        // Round 60 (X3j4nt sizing) + round 62 (Yuqi 7-item card
        // feedback): outer gap bumped `gap-4` (16) → `gap-5` (20)
        // per Item 1 — the time row was sitting too close to the
        // head/title block beneath it.
        // 2026-06-04 round 63 (Yuqi correction: "sorry, this should
        // be the Today's alert card design. Node ID: vi3aw"): card
        // rebuilt to Pencil `vi3aw` (496×161) spec — NOT X3j4nt.
        // vi3aw is a simpler card with no CLIENT EFFECT inset panel
        // and no separate time row above the head — instead the
        // head row reads `[severity][form pill][state pill]` on the
        // LEFT and `[relative time][absolute time]` justified to the
        // RIGHT. Beneath that: title 16/600 + source caption
        // 14/500. At the very bottom: building icon + "N Clients".
        //   - container: rounded-[12px] bg-#f9fafb, padding [16,20]
        //   - outer gap 16 (gap-4) between J4INTw (head + subject)
        //     and QzvZa (clients line)
        //   - J4INTw inner gap 8 between top row and subject
        // 2026-06-04 round 69 (Yuqi "white background default"):
        // reverted round 68's transparent-at-rest experiment.
        // Card at rest is `bg-background-default` (white) — the
        // canonical card chrome that reads as "this is its own
        // surface, click me." Hover steps to `bg-background-section`
        // (the same direction round 67 had). The transparent
        // experiment made cards disappear into the page wash;
        // user wanted them to feel like distinct cards again.
        // 2026-06-04 round 72 (Yuqi #4 "bigger gap in between row"):
        // outer card gap-3 (12px) → gap-4 (16px). With the bottom
        // row's TaxCodeBadge added in round 71 the card has 3
        // distinct content blocks (meta strip / subject / clients
        // + form pill); 16px gives each block clear breathing room.
        // 2026-06-04 round 80 (Yuqi #1 "if there is client
        // effect, it is in a slightly darker gray"): card bg is
        // now conditional on whether the alert has matched
        // clients:
        //   • impacted > 0  → `bg-background-section` (slightly
        //                      darker gray) — flags rows the
        //                      CPA actually needs to act on
        //   • impacted === 0 → `bg-background-default` (white)
        //                      — quieter rest for noise that
        //                      doesn't match any client
        // Hover unifies to `bg-background-subtle` either way so
        // the affordance still reads in both cases.
        'group flex h-full w-full min-w-0 flex-col gap-4 rounded-xl px-5 py-4 text-left',
        impacted > 0 ? 'bg-background-section' : 'bg-background-default',
        'transition-colors duration-200 hover:bg-background-subtle',
        'outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
      )}
      data-tone={tone}
    >
      {/* J4INTw — Pencil's outer block holding the head row + the
          subject stack.
          2026-06-04 round 67 (Yuqi audit "ensure only a selected
          number of text styles are used. colours are unified"):
          inner gap dropped 12 → 8 (gap-3 → gap-2) to tighten the
          relationship between the meta row and the subject block.
          Outer card gap also dropped 16 → 12 (above). Card now
          reads as 2 tight content blocks (meta+subject / clients)
          instead of 3 separated rows. */}
      <div className="flex min-w-0 flex-col gap-2">
        {/* Top row — meta strip. LEFT (severity + state pill) +
            RIGHT (relative + absolute time).
            2026-06-04 round 67 (Yuqi #3 "tighter"): head row gap
            dropped 12 → 8 (gap-3 → gap-2) so the LEFT/RIGHT
            clusters sit closer.
            2026-06-04 round 67 (Yuqi #4 form-pill move): FORM PILL
            removed from this row. It now lives in the bottom row
            next to "N Clients" as a `<TaxCodeBadge>` so it shares
            the chrome + label format the Actions this week table
            uses. */}
        <div className="flex min-w-0 items-center justify-between gap-2">
          {/* LEFT cluster — pill row.
              2026-06-04 round 71 (Yuqi #3 batch2 "bigger gap"):
              gap-2 (8px) → gap-3 (12px) between severity / state
              / form pills. After removing the state pill's bg +
              padding, the badges no longer have their own
              breathing room — the inter-pill gap has to carry
              it. */}
          <div className="flex min-w-0 items-center gap-3">
            {/* SEVERITY PILL — HIGH only. Padding [5, 8], mono 10/700
                uppercase, amber colors from severityFromConfidence. */}
            {severity.id === 'high' ? (
              // 2026-06-04 round 68 (Yuqi #2 "those two badges
              // should be the same height. fix"): severity pill
              // dropped `py-[5px]` and adopted `h-[22px]` so it
              // matches the State pill's fixed height pixel-for-
              // pixel. Both pills now sit on the same baseline
              // and align without the optical wobble.
              <span
                className="inline-flex h-[22px] shrink-0 items-center rounded-[4px] px-2 text-[11px] font-bold tracking-[0.7px] uppercase"
                style={{ backgroundColor: severity.bg, color: severity.text }}
              >
                {severityLabel}
              </span>
            ) : null}

            {/* STATE — round 73 (Yuqi "nope, with state name"):
                restored the state code alongside the circular
                badge. Round 72's interpretation of "small circular
                badge" as motif-only dropped the textual identifier;
                user wants BOTH the circle and the code visible.
                Tooltip preserves the full state name on hover. */}
            {/* State — round 80 (Yuqi #2 "bigger gap"): gap
                between the circular motif and the code text
                bumped 1 → 1.5 (4 → 6px). Adds visual separation
                so the badge and the code don't visually merge.
                Also bumped the StateBadge motif from 16 → 18px
                to fix the optical imbalance between the motif
                width and the 12px code text width. */}
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <span
                    className="inline-flex h-[22px] shrink-0 cursor-help items-center gap-1.5 outline-none"
                    {...props}
                  >
                    {/* Round 81 (Yuqi #5 "1px or 2px bigger text
                        size"): state code 12 → 14px. The eyebrow
                        scale was reading too quiet at 12px next
                        to the 18px state-badge circle. 14px aligns
                        the code's optical weight with the motif. */}
                    <StateBadge code={alert.jurisdiction} size="xs" />
                    <span className="font-mono text-[14px] font-bold tracking-[0.7px] text-text-secondary uppercase">
                      {alert.jurisdiction}
                    </span>
                  </span>
                )}
              />
              <TooltipContent>{alert.jurisdiction}</TooltipContent>
            </Tooltip>
          </div>

          {/* RIGHT cluster — round 81 (Yuqi #1 "remove time here"):
              absolute time (`09:00`) dropped. Only relative time
              ("2h ago" / "Jun 4") renders inline. Exact time is
              still surfaced via tooltip if the user needs it
              (mirrors the /alerts row pattern). */}
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <span
                  className="shrink-0 cursor-help whitespace-nowrap text-[12px] font-medium text-text-tertiary tabular-nums outline-none"
                  {...props}
                >
                  {formatRelativeTime(alert.publishedAt)}
                </span>
              )}
            />
            <TooltipContent>{absoluteTime}</TooltipContent>
          </Tooltip>
        </div>

        {/* Subject `PMVb6` — title + source caption.
            2026-06-04 round 64 (Yuqi #6 "h3 slightly smaller"):
            title nudged 16 → 15px. Still the loudest line on the
            card but no longer crowding the subject block.
            2026-06-04 round 64 (Yuqi #3 "smaller, and hover to
            have a link to the source"): source text dropped from
            14 → 12.5px and wrapped in a Tooltip that surfaces the
            full source URL on hover. The span gets cursor-pointer
            + onClick→window.open(sourceUrl) so clicking the source
            opens the official authority page in a new tab. We
            stopPropagation so the card's onReview doesn't also
            fire. */}
        <div className="flex min-w-0 flex-col gap-1">
          {/* 2026-06-04 round 67 (Yuqi #1 title "medium"): weight
              dropped semibold (600) → medium (500). The card body
              now has fewer competing weights — only the action
              CTAs (if any) carry 600 elsewhere; the title at 500
              reads as a calm scan target rather than a shout.
              2026-06-04 round 72 (Yuqi #5 "tighter letter spacing.
              tighter line height"): added `tracking-[-0.25px]` +
              dropped leading from 1.35 → 1.25. At 15px medium
              weight the looser leading + neutral tracking read as
              loose ad-copy; tightened both so the title looks
              like a deliberate UI label, not body prose. */}
          {/* Title — round 81 (Yuqi #4 "avoid writing the source
              e.g. FL DOR again"): strip a leading source-name
              prefix from the title so the source line below
              doesn't echo the same text. Defensive: only strips
              when the title actually starts with the source
              string (case-insensitive), followed by an optional
              separator. Falls back to the raw title for any
              non-matching shape. */}
          <h3
            className="line-clamp-2 min-w-0 text-[15px] font-medium leading-[1.25] tracking-[-0.25px] text-text-primary"
            title={alert.title}
          >
            {dedupeTitleSource(alert.title, alert.source)}
          </h3>
          {alert.sourceUrl ? (
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <span
                    // Round 81 (Yuqi #2 "add a link infront of
                    // the text. align with the client"): leading
                    // `<ExternalLinkIcon>` so the affordance is
                    // visible even at rest. The whole span sits
                    // at the same left edge as the head row + the
                    // bottom Building2 row (all share the card's
                    // px-5 padding), so it aligns with the client
                    // line directly below in the flex column.
                    className="inline-flex min-w-0 cursor-pointer items-center gap-1 text-[12px] font-medium tracking-[-0.1px] text-text-tertiary outline-none transition-colors hover:text-text-secondary hover:underline"
                    onClick={(event) => {
                      event.stopPropagation()
                      window.open(alert.sourceUrl, '_blank', 'noopener,noreferrer')
                    }}
                    {...props}
                  >
                    <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{alert.source}</span>
                  </span>
                )}
              />
              <TooltipContent>
                <div className="flex max-w-[320px] flex-col gap-0.5 text-left">
                  <span className="font-semibold">
                    <Trans>Open source</Trans>
                  </span>
                  <span className="break-all text-text-secondary">{alert.sourceUrl}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="inline-flex min-w-0 items-center gap-1 text-[12px] font-medium tracking-[-0.1px] text-text-tertiary">
              <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{alert.source}</span>
            </span>
          )}
        </div>
      </div>

      {/* `QzvZa` — bottom clients line. Building icon + N Clients
          (or "No clients matched") in Geist 13/normal. No CLIENT
          EFFECT inset card on vi3aw — just this single quiet row.
          2026-06-04 round 65 (Yuqi #2 — STILL mismatched after
          round 64): the previous attempt set icon explicitly to
          `text-text-secondary` + `strokeWidth={1.75}`, but the
          stroke override made the icon visually LIGHTER than the
          filled glyphs of the label at 13/500 — and worse, the
          loading / no-clients branches forced the inner span to
          `text-text-tertiary` while the icon stayed
          `text-text-secondary`, so in those states the two were
          genuinely different shades. Fix:
            • Drop the strokeWidth override — default stroke (2)
              gives the icon visual weight that matches the
              13/500 sans-serif glyphs alongside it.
            • Strip every `text-text-tertiary` override on the
              inner spans so they all inherit the parent's
              `text-text-secondary`. Icon + label now share ONE
              color class via parent inheritance in every state. */}
      {/* 2026-06-04 round 67 (Yuqi #4 "should be the same as the
          below form name in the Actions this week table. move it
          besides the client affected"): form pill moved from the
          head row down here, rendered via `<TaxCodeBadge>` so it
          shares the exact chrome + label format the
          ActionsTable FORM column uses
          (`bg-background-subtle`, `font-mono font-medium
          rounded-[5px]`, `describeTaxCode` for the label). One
          canonical form-code primitive on /today now, used in
          BOTH the alerts card and the actions table — no more
          two-shapes-for-the-same-thing inconsistency. */}
      {/* 2026-06-04 round 72 (Yuqi "why you can't change the colour
          to the same colour as No clients Matched, the light gray"):
          bottom row text + icon both step to `text-text-muted`
          (the same light gray No-clients-matched uses). The row
          is now uniformly the quietest signal on the card —
          neither icon nor count out-shouts the other. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-text-muted">
        <span className="inline-flex items-center gap-1">
          <Building2 className="size-3.5 shrink-0 text-text-muted" aria-hidden />
          {impacted > 0 ? (
            clientsLoading || !hasData ? (
              <span>
                <Plural value={impacted} one="# Client" other="# Clients" />
              </span>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={(props) => (
                    <span
                      className="cursor-help outline-none transition-colors hover:text-text-primary"
                      onClick={(event) => event.stopPropagation()}
                      {...props}
                    >
                      <Plural value={impacted} one="# Client" other="# Clients" />
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
            )
          ) : hasData ? (
            // 2026-06-04 round 72: the parent now sits at 12px
            // text-text-muted already (Building2 unification), so
            // this span just inherits.
            <span>
              <Trans>No clients matched</Trans>
            </span>
          ) : null}
        </span>

        {/* Form pill — same primitive Actions this week uses,
            but tinted softer when it appears INSIDE an alert
            card (round 73 Yuqi "when the form appears in alert
            card, make it more subtle, change the text to a light
            gray"). Chrome stays canonical (bg-subtle / divider
            border / rounded-5 / font-mono medium) so the chip
            footprint matches the table; only the foreground color
            steps down `text-text-secondary` → `text-text-muted` to
            mute the form code so the card's title and clients
            line lead the eye instead. */}
        {firstForm ? (
          <TaxCodeBadge code={firstForm} className="text-text-muted" />
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
      one: 'View # more Alert',
      other: 'View # more Alerts',
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
