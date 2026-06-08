import { plural } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRight, Building2, MapPin, Plus } from 'lucide-react'

import type { PulseAffectedClient, PulseAlertPublic } from '@duedatehq/contracts'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

// 2026-06-05 (pre-CI green-up): `aiConfidenceTier` import retired
// after the round 81 inline source treatment dropped the confidence
// pill. Re-import if the pill is ever restored.
import { alertTone } from '@/features/alerts/alert-tone'
// PulseSourceMeta was retired from this card in round 81 — source
// now renders inline in the subject block via `<ExternalLinkIcon>` +
// truncated label with the URL on tooltip hover.
import { impactBadgeFromAlert } from '@/features/alerts/components/pulse-alert-chrome'
import { changeKindLabel } from '@/features/alerts/components/PulseChangeKindChip'
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

// 2026-06-05 (pre-CI green-up): `confidenceToneClass` helper
// removed — its only call site (the confidence pill) was retired in
// round 81's inline source treatment. The 3-tier ladder it encoded
// (high → success, medium → tertiary, low → destructive) is still
// canonical via `aiConfidenceTier`; rebuild this 4-line helper at
// the call site if the confidence pill is ever restored.

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
    const rest = t
      .slice(s.length)
      .trim()
      .replace(/^[-—:·]+\s*/u, '')
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
  // VxRyF bottom-meta data: confidence %, the alert's own form code, and
  // overlapping initial-avatars of the matched clients.
  const confidencePct = Math.round(alert.confidence * 100)
  const alertForm = alert.forms[0] ?? firstForm
  const avatars = allNames.slice(0, 3).map((name) => ({
    name,
    initials: name
      .split(/\s+/)
      .map((word) => word[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  }))
  // 2026-06-05 (pre-CI green-up): `confidencePct` + `confidenceToneCls`
  // went unused after the round 81 inline source treatment.
  // Deleted (rather than prefixed with `_`) because this project's
  // eslint config forbids dangling underscores. If the round 19
  // confidence pill is ever restored, re-derive both from
  // `alert.confidence` at the call site.
  // 2026-06-04 round 42 (Yuqi /today ↔ /alerts consistency #1 —
  // "has severity pill and state badge please"): mirror the
  // AlertCard severity-pill + StateBadge vocabulary so the
  // dashboard summary and the alerts list speak the same visual
  // language. `impactBadgeFromAlert` is the shared helper from
  // pulse-alert-chrome so the tier mapping stays canonical.
  // 2026-06-06: tier now reflects REAL client impact
  // (matchedCount + needsReviewCount) instead of inverted AI
  // confidence — same swap applied across every alert badge.
  // Only the high-impact tier renders a (red) severity pill, per VxRyF.
  const severity = impactBadgeFromAlert(alert)

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
        // 2026-06-08 (Yuqi "还是很粗糙，没有重点"): the card is now a
        // single, uniform surface that LIFTS off the page. Pencil VxRyF
        // geometry exactly — radius 14, padding 18, gap 16. In the app's
        // tinted-page / white-card model a clean white fill + one 8%
        // hairline (border-divider-subtle, the design's #10182814) gives
        // the crisp edge the low page-to-card contrast can't. The earlier
        // `impacted ? gray : white` split made the *important* cards
        // recede into the wash — removed; impact is carried by the High-
        // impact pill + "Affects N clients", not by a receding fill.
        // 2026-06-08 (Yuqi "alert card needs a different colour to the
        // action table"): alert cards take the source VxRyF gray fill
        // (#f9fafb = bg-background-section) while the Actions table stays
        // white. Different surface colors split the two regions and let
        // the white table — your work — read as the focal point.
        'group flex h-full w-full min-w-0 flex-col gap-4 rounded-[14px] border border-divider-subtle bg-background-section p-[18px] text-left',
        'transition-colors duration-200 hover:border-divider-regular hover:bg-background-subtle',
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
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {/* HIGH IMPACT — Pencil VxRyF red pill (#FEE4E2 bg / #B42318
                text → destructive tokens). Full words "High impact", not
                the abbreviated "HIGH". Only renders for high-impact alerts. */}
            {severity.id === 'high' ? (
              <span className="inline-flex shrink-0 items-center rounded-[4px] bg-state-destructive-hover px-2 py-[3px] text-[11px] font-semibold tracking-[0.4px] text-text-destructive uppercase">
                <Trans>High impact</Trans>
              </span>
            ) : null}

            {/* STATE — jurisdiction pill. Yuqi: add a tiny state/location
                graphic (#9) and use the card's one font family (#11, no
                mono). Tooltip preserves the full jurisdiction on hover. */}
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <span
                    className="inline-flex shrink-0 cursor-help items-center gap-1 rounded-md border border-divider-subtle px-2 py-[2px] text-[11px] font-semibold text-text-secondary outline-none"
                    {...props}
                  >
                    <MapPin className="size-2.5 shrink-0 text-text-muted" aria-hidden />
                    {alert.jurisdiction}
                  </span>
                )}
              />
              <TooltipContent>{alert.jurisdiction}</TooltipContent>
            </Tooltip>

            {/* FORM badge — same pill as the jurisdiction one; only adds a
                gray fill. Override the shared TaxCodeBadge to the card's
                font (#11, sans) + scale so the two badges read as one. */}
            {alertForm ? (
              <TaxCodeBadge
                code={alertForm}
                className="rounded-md border-divider-subtle px-2 py-[2px] font-sans text-[11px] font-semibold tracking-normal"
              />
            ) : null}

            {/* CHANGE KIND — e.g. "DEADLINE SHIFTED", plain label. Neutral
                (two-color rule) + card font (#11). */}
            <span className="shrink-0 text-[11px] font-semibold tracking-[0.4px] text-text-tertiary uppercase">
              {changeKindLabel(alert.changeKind)}
            </span>
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
                  className="shrink-0 cursor-help whitespace-nowrap text-xs font-medium text-text-muted tabular-nums outline-none"
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
          {/* Title — Pencil VxRyF 16/600 (kept at 15px for small-screen
              density). `dedupeTitleSource` still strips a leading source
              prefix so the bottom source link doesn't echo it. */}
          {/* 2026-06-08 (Yuqi audit #3 "do not show details on the outside
              card"): the summary body line was removed — the title is the
              card's signal; the full summary lives in the alert drawer. */}
          <h3
            className="line-clamp-2 min-w-0 text-sm font-semibold leading-[1.3] text-text-primary"
            title={alert.title}
          >
            {dedupeTitleSource(alert.title, alert.source)}
          </h3>
        </div>
      </div>

      {/* Bottom meta — Pencil VxRyF `skQVb`: top hairline divider, then
          "Affects N client" + overlapping client-initial avatars · conf%
          — spacer — source link. Wraps on narrow screens (no overflow). */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-divider-subtle pt-3 text-xs">
        {/* Affects-clients line. Yuqi #5: icon + label share ONE color.
            #6: when nothing matched, both step to the lighter muted tone so
            noise alerts recede. */}
        <span
          className={cn(
            'inline-flex items-center gap-1',
            impacted > 0 ? 'text-text-secondary' : 'text-text-muted',
          )}
        >
          <Building2 className="size-3 shrink-0" aria-hidden />
          {impacted > 0 ? (
            <Plural value={impacted} one="Affects # client" other="Affects # clients" />
          ) : (
            <Trans>No clients matched</Trans>
          )}
        </span>

        {avatars.length > 0 ? (
          <span className="flex items-center pl-0.5">
            {avatars.map((avatar, index) => (
              <Tooltip key={avatar.name}>
                <TooltipTrigger
                  render={(props) => (
                    <span
                      className={cn(
                        // One neutral tone + the card's font (#11). Initials
                        // carry identity; the full name is on hover (#10).
                        'inline-flex size-5 cursor-help items-center justify-center rounded-full bg-background-subtle text-[10px] font-semibold text-text-secondary ring-[1.5px] ring-background-section outline-none',
                        index > 0 && '-ml-1.5',
                      )}
                      {...props}
                    >
                      {avatar.initials}
                    </span>
                  )}
                />
                <TooltipContent>{avatar.name}</TooltipContent>
              </Tooltip>
            ))}
            {/* Overflow counter — Yuqi #10: "Affects 2 clients" but only one
                avatar showed. The named avatars are capped at 3 (and the
                batched load may carry fewer names than the count), so any
                remainder renders as a "+N" chip to reconcile with the count. */}
            {impacted > avatars.length ? (
              <span className="-ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background-subtle px-1 text-[10px] font-semibold text-text-tertiary ring-[1.5px] ring-background-section">
                +{impacted - avatars.length}
              </span>
            ) : null}
          </span>
        ) : null}

        <span aria-hidden className="text-text-muted">
          ·
        </span>
        <span className="text-xs font-medium tabular-nums text-text-secondary">
          <Trans>conf {confidencePct}%</Trans>
        </span>

        <span className="flex-1" />

        {/* Source link — opens the authority page; URL on tooltip hover.
            Yuqi #8: a simple arrow (ArrowUpRight) instead of the external-
            link glyph. */}
        <Tooltip>
          <TooltipTrigger
            render={(props) => (
              <span
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-medium text-text-secondary outline-none transition-colors hover:text-text-primary hover:underline"
                onClick={(event) => {
                  event.stopPropagation()
                  window.open(alert.sourceUrl, '_blank', 'noopener,noreferrer')
                }}
                {...props}
              >
                <span className="max-w-[160px] truncate">{alert.source}</span>
                <ArrowUpRight className="size-3 shrink-0" aria-hidden />
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
