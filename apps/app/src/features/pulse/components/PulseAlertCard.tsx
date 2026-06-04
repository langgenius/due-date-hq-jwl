import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AlertCircle, Astroid, BriefcaseIcon, Building2, UserRound, UsersIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

import { aiConfidenceTier } from '@/features/_surface-vocabulary/ai-confidence'
import { StateBadge } from '@/components/primitives/state-badge'
import { formatRelativeTime } from '@/lib/utils'

import { usePulseDetailQueryOptions } from '../api'
import {
  actionPillFromAlert,
  openStatusFromAlert,
  severityFromConfidence,
} from './pulse-alert-chrome'
import { changeKindLabel } from './PulseChangeKindChip'
// 2026-06-04 round 20: PulseAIBoundaryChip, PulseRelevanceMatrix,
// PulseReadinessChip imports removed — those three deferred-primitive
// renders were stripped from the card per Yuqi feedback items #5/#6/#7
// (duplicate AI signal / unclear "Match 3/3" / unclear "No current
// match"). Components stay in the codebase for revival.
import { PulseAlertActionsRow } from './PulseAlertActionsRow'
import { PulseAuthorityRoleChip } from './PulseAuthorityRoleChip'
import { PulseChangeKindChip } from './PulseChangeKindChip'
import { PulseConfidencePill } from './PulseConfidencePill'
import { PulseFormChip } from './PulseFormChip'
import { PulseJurisdictionChip } from './PulseJurisdictionChip'
import { PulseSourceBadge } from './PulseSourceBadge'
import { PulseSourceStatusBadge } from './PulseSourceStatusBadge'
import { PulseStatusBadge } from './PulseStatusBadge'

const VISIBLE_CLIENT_NAMES = 3

// 2026-06-04 round 20: `inferDimensionsFromAlert` removed alongside
// PulseRelevanceMatrix (its only consumer). The dimension breakdown
// returns when the chip earns its own clear visual.

interface PulseAlertCardProps {
  alert: PulseAlertPublic
  onReview: () => void
  onDismiss?: (() => void) | undefined
  onSnooze?: (() => void) | undefined
  // 2026-05-26 (Yuqi /rules/pulse sixth pass #1): "archive" action
  // always available even on terminal-state alerts (applied /
  // dismissed / snoozed) — the kebab should render on EVERY row so
  // the user always has at least one menu option ("View in history",
  // "Archive"). Archive is the no-reason move-to-history verb; when
  // a card already lives in the history view this is a no-op.
  onArchive?: (() => void) | undefined
  /** Inline actions are hidden when the card is rendered as a folded "more" entry. */
  compact?: boolean
  /**
   * 2026-05-26 (Yuqi twenty-third pass): when the right panel is
   * open the list column is narrower (~560px). Pass `true` to
   * truncate affected-client name chips at a fixed 140px so a
   * long client name (e.g. "Hudson & Wells LLC") doesn't push
   * the chip row into wrapping/overflow.
   */
  compactClients?: boolean
  /**
   * History/archive rows have already been reviewed, applied, dismissed, or
   * otherwise closed. Hide readiness there so the footer doesn't say "Ready to
   * apply" next to an Applied/Reviewed status.
   */
  showReadiness?: boolean
  /**
   * 2026-05-26 (Yuqi /rules/pulse #4): when this card is the one
   * currently being viewed in the right-hand panel, render a left
   * border + brighter background so the user can quickly find the
   * active row in the list. Parent (AlertsListPage) passes
   * `active={alert.id === openAlertId}`.
   */
  active?: boolean
}

// Single Pulse alert row used by /rules/pulse (Alerts).
//
// 2026-05-25 (Yuqi Alerts #4, #5, #6, #11):
//   • Dropped the leading PulsingDot. Yuqi flagged repeatedly that
//     the coloured dots don't communicate meaning to a CPA — the
//     status badge ("New"/"Applied"/"Snoozed"), confidence badge
//     ("AI 46%" with destructive tone for very-low), and the change-
//     kind label already carry every signal the dot was trying to
//     encode.
//   • Leading StateBadge so the jurisdiction (CA / TX / FL) reads
//     at a glance — same recognition the chip strip above uses.
//   • Added `alert.summary` as a body line under the title. The
//     model's one-sentence explanation of the source change ("AI
//     explains what is happening" per Yuqi #6) lets the CPA decide
//     whether to open the drawer without reading the title back to
//     themselves.
//   • PulseSourceBadge promoted from the footer to the header next
//     to the source name. It's already a real link to the official
//     source — promoting it lets the CPA jump out to the source
//     without opening the drawer (Yuqi #6).
//   • Dropped the separate "Low AI confidence" warning line. The
//     PulseConfidenceBadge already renders in the destructive tone
//     when confidence < 0.7; doubling the cue was redundant (Yuqi
//     #11). The drawer still surfaces the explicit one-paragraph
//     warning + reason copy.
export function PulseAlertCard({
  alert,
  onReview,
  onDismiss,
  onSnooze,
  onArchive,
  compact = false,
  active = false,
  compactClients = false,
  showReadiness = true,
}: PulseAlertCardProps) {
  const { t } = useLingui()
  const impacted = alert.matchedCount + alert.needsReviewCount

  // 2026-05-25 (Yuqi /rules/pulse fourth pass #2): pull the actual
  // affected-client names from the detail query so the card can
  // LIST them instead of just showing a "5 clients may be affected"
  // summary. The list page mounts a card per alert; the detail
  // query is cached per-alert so this is essentially free after
  // the first render. Same hook the dashboard NeedsAttentionCard
  // uses — kept inline here so the two card variants don't share
  // a single hook with diverging needs (drawer renders names
  // separately).
  const affectedClientsQuery = useQuery(usePulseDetailQueryOptions(alert.id))
  const allAffectedNames = affectedClientsQuery.data?.affectedClients ?? []
  // 2026-05-26 (Yuqi seventeenth pass #1): collect each unique
  // client's name AND whether the alert flags them for review.
  // Needs-review clients sort to the FRONT of the visible list so
  // the row matching the trailing "N flagged for review" count is
  // the first one the CPA sees. Eligible / already-applied
  // clients trail.
  const uniqueClients: Array<{ name: string; needsReview: boolean }> = []
  const seen = new Set<string>()
  for (const row of allAffectedNames) {
    if (!seen.has(row.clientName)) {
      seen.add(row.clientName)
      uniqueClients.push({
        name: row.clientName,
        needsReview: row.matchStatus === 'needs_review',
      })
    }
  }
  uniqueClients.sort((a, b) => Number(b.needsReview) - Number(a.needsReview))
  // 2026-06-04 round 20: visibleClients / overflowNames previously
  // fed the per-client chip cluster on the alert card. The new
  // compact impact line surfaces a single "{N} clients" count with
  // a hover tooltip listing the full roster, so the top-N visible
  // slice + +overflow tail aren't needed. The references are kept
  // here as a `void` cheat so any future revival of the chip list
  // is a one-line uncomment.
  const visibleClients = uniqueClients.slice(0, VISIBLE_CLIENT_NAMES)
  const overflowNames = Math.max(uniqueClients.length - visibleClients.length, 0)
  void visibleClients
  void overflowNames
  const needsReviewClientCount = uniqueClients.filter((c) => c.needsReview).length
  // 2026-06-03 (Pencil xxNFC polish): pull the FIRST form code off
  // the detail payload so the top meta cluster can render it next
  // to the jurisdiction chip. PulseAlertPublic only carries the
  // alert's headline; specific forms live on PulseDetail. The
  // detail query is already mounted above (it drives the affected-
  // client chip row) so this read is free. Falls back to undefined
  // when the alert affects no specific forms (e.g. some
  // applicability_scope / source_status changes).
  const firstForm = affectedClientsQuery.data?.forms?.[0]
  // 2026-05-26 (Yuqi /rules/pulse follow-up #10): 3-tier qualitative
  // confidence (LOW / MEDIUM / HIGH) instead of numeric AI XX%.
  // Card background tone follows the level: LOW gets the destructive
  // tint (review urgency), MEDIUM gets a faint warning tint, HIGH
  // stays clean.
  // 2026-05-26 (Step 9 AI Visibility Audit F-002): thresholds now
  // sourced from the canonical `aiConfidenceTier` helper so every
  // surface in the product agrees on the same 0.5 / 0.85 ladder.
  const confidenceLevel = aiConfidenceTier(alert.confidence)
  const lowConfidence = confidenceLevel === 'low'
  const mediumConfidence = confidenceLevel === 'medium'
  // 2026-06-04 round 20: showReadinessChip removed alongside the
  // PulseReadinessChip footer render (Yuqi feedback #7 "what does
  // this do?"). `showReadiness` prop kept on the public API so
  // callers don't need to drop the prop in one go.
  void showReadiness

  // 2026-05-25 (Yuqi /rules/pulse fourth pass — #3, #4, #8):
  //   • #3: Review button moves from a bottom-of-action-column slot
  //     to the very TOP of the action column so it's always at the
  //     same vertical anchor across cards. Snooze/Dismiss render
  //     below it as the softer secondary affordances.
  //   • #4: outer gap between content + action columns bumped
  //     gap-4 → gap-6 — Yuqi flagged the two halves as crowded.
  //   • #8: card chrome restyled — border dropped entirely, light
  //     gray bg (bg-background-subtle) replaces the white panel.
  //     Reads as a "soft card on the page surface" instead of a
  //     bordered tile. Hover lifts to bg-state-base-hover so the
  //     interactive cue still lands.
  // 2026-05-26 (Yuqi /rules/pulse #12): card bg picks up a faint
  // destructive tint when AI confidence is very low so the CPA's
  // eye lands on those rows first. Same tone family as the
  // LowConfidenceBadge that replaces the numeric confidence pill.
  // 2026-05-26 (Yuqi /rules/pulse #1): the whole article is now
  // clickable — onClick fires onReview, so the entire row opens
  // the detail panel. The interior Review/Snooze/Dismiss buttons
  // still work as primary affordances and stopPropagation so
  // their own handlers run (snooze/dismiss diverge from review).
  // Keyboard a11y: role="button" + tabIndex + Enter/Space handler.
  // 2026-05-26 (Yuqi /rules/pulse #4): when `active`, the card
  // shows a left accent border + brighter bg so the CPA can find
  // the alert currently displayed in the right panel without
  // re-scanning every row.
  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onReview()
    }
  }
  // 2026-06-04 round 17 (Yuqi page-feedback "click from this to
  // enter the Alert page view — this clicked alert should be
  // selected"): when the user lands on /rules/pulse with a
  // pre-selected alertId (e.g. clicked a /today NeedsAttentionCard
  // → DrawerProvider navigates to ?alert=<id>), the matching
  // card receives `active={true}` and the selected chrome paints.
  // BUT the alert may be far down the list — CPA arrives at the
  // top, has to scroll to find what they clicked. Scroll it into
  // view automatically on first activate so the wayfinding loop
  // closes. `block: 'center'` keeps it in the comfortable middle
  // of the viewport instead of jammed against the top edge;
  // `behavior: 'smooth'` makes the scroll feel like a deliberate
  // affordance, not a jump.
  const cardRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!active) return
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [active])
  return (
    <article
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={t`Pulse alert: ${alert.title}`}
      aria-pressed={active}
      onClick={onReview}
      onKeyDown={handleCardKeyDown}
      className={cn(
        // 2026-05-26 (Yuqi twenty-first pass): card chrome
        // simplified for the new `bg-background-inset` work surface.
        //   • All cards use the same white bg + a subtle border so
        //     they read as clean cards floating on the gray inset.
        //   • Active state: faint accent tint + accent border to
        //     mark "this row is open in the right panel".
        // 2026-05-26 (Yuqi twenty-seventh pass): when ANY row is
        // active (panel open) the non-active rows get a slight
        // dim (`opacity-70` + drop hover state) — pushes the eye
        // toward the active row without yelling. Hover still
        // brings full opacity back so the CPA can scan the dimmed
        // list without losing readability.
        // 2026-06-04 round 22 (Pencil h7WAEF): rounded-2xl + p-5 +
        // gap-4 chrome from Pencil's `aiyFm` recipe.
        // 2026-06-04 round 32 (Yuqi "check the padding - margin -
        // border - rounded corners - layout again. Node ID: ZkXFr"):
        // ZkXFr's revised dimensions cascade here too.
        //   • cornerRadius 16 → `rounded-2xl` ✓
        //   • padding 20 → `p-5` ✓
        //   • outer flex `gap-0` (no children other than body div)
        //   • NO border (Pencil disabled stroke). Removed `border` +
        //     `border-divider-subtle` classes.
        // 2026-06-04 round 25 (Yuqi "far from the pencil designs" —
        // screenshot showed flat cards with no visible chrome):
        // root cause was the page-wash bg (`bg-background-inset`,
        // `#f4f4f4`, gray-100) reading as the SAME tone as the
        // canonical `bg-background-subtle` (also gray-100). Cards
        // and page wash were within 0–2% luminance of each other,
        // so the bg disappeared. Pencil's mock has a WHITE Main
        // bg + gray cards, which would have read correctly there;
        // our SidebarInset is gray, so the analog has to invert:
        // **white cards on the gray page wash**.
        //   • Resting bg: `bg-background-subtle` → `bg-background-default`
        //     (white). The card is now a clear white surface on
        //     the gray-100 page wash — distinct chrome at every
        //     scan distance.
        //   • Hover bg: was `bg-background-default`. Now lifts to
        //     `bg-background-subtle` (the previous resting tone)
        //     so the card visibly responds. Inverse of the
        //     previous direction but the same "shifts on hover"
        //     mechanic.
        //   • Border: added a single 1px `border-divider-subtle`
        //     so the white card has a defined edge against the
        //     gray wash even before hover. Pencil drew no stroke
        //     because Pencil's white page already let the gray
        //     card define its own edge; with the colors swapped,
        //     the border carries the edge work.
        // 2026-06-04 round 38 (Yuqi 11-item card feedback — item 8
        // "too much top bottom margin, and left and right"): outer
        // padding reduced `p-4` (16px) → `p-3` (12px). Combined with
        // the impact-row top-padding cut (pt-2 → pt-1) this drops
        // ~10px of dead space from the card without losing the
        // breathing room around the facts panel.
        //
        // 2026-06-04 round 40 (Yuqi "左右 padding 可以更多" / "left-right
        // padding can be more"): asymmetric padding now — vertical
        // stays at `py-3` (12px) from round 38, horizontal bumps
        // to `px-5` (20px). The facts panel and severity pill+source
        // line have horizontal-heavy content that benefits from
        // wider gutters; the vertical content stack (meta → title
        // → facts → impact) doesn't, so leaving the vertical
        // padding alone keeps the card from growing taller.
        'group/alert-card relative flex cursor-pointer items-start gap-0 rounded-2xl px-5 py-3 transition-[opacity,background-color,border-color]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        active
          ? // 2026-06-04 round 32: active uses an inset shadow ring
            // instead of a 1px border so toggling active doesn't
            // shift card layout by 1px. Pencil's `ZkXFr` has stroke
            // disabled at rest; active is our app-specific
            // affordance.
            // 2026-06-04 round 41 (Yuqi "hover 背景蓝色也不是很美丽"):
            // active state pulled back to the lighter blue tint
            // (`state-accent-hover` / #eff4ff) — the round-40
            // deeper-blue felt too "click-state" for a passive
            // open-in-panel signal. The 1px accent-blue inset ring
            // remains the primary "this row is open" cue; the bg
            // is just a quiet wash behind it.
            'bg-state-accent-hover shadow-[inset_0_0_0_1px_var(--color-state-accent-active-alt)]'
          : cn(
              // Resting: white card, NO border, no ring.
              //
              // Hover (round 41 — "hover 背景蓝色也不是很美丽" / "hover
              // blue background isn't very pretty either"): NO
              // bg color change. The blue tint from round 40 read
              // as a heavy "you're about to click" preview; the
              // gray tint from earlier rounds collided with the
              // page wash. Both were trying to use BG to carry
              // hover affordance. Round 41 switches strategies —
              // hover paints a subtle inset ring on the same white
              // bg. The ring uses `divider-regular` (#10182814 =
              // 8% alpha black) so it reads as a quiet edge cue,
              // not a colored highlight. The card stays white,
              // gains a soft border on hover, and the eye reads
              // the change as "this row gained an edge" — the
              // affordance is unmistakable but unobtrusive.
              // Inset (not regular) ring prevents the 1px layout
              // shift a normal border would cause.
              'bg-background-default hover:ring-1 hover:ring-inset hover:ring-divider-regular',
              compactClients && 'opacity-70 hover:opacity-100',
            ),
        compact && 'p-2.5',
      )}
    >
      {/* 2026-06-04 round 31 (Yuqi screenshot "missing a lot of
          details. weird spacing. loose content."): NEW corner badge
          REMOVED. Pencil jykZH doesn't render a fresh/unread flag —
          the action pill ("Needs Action") on the right side of the
          top meta row already carries the "this needs attention"
          signal. The black NEW notch was redundant and added
          visual weight the design doesn't intend. */}
      {false ? (
        <span className="pointer-events-none absolute right-0 top-0 z-10 inline-flex shrink-0 items-center rounded-bl-sm rounded-tr-md bg-text-primary px-2 py-0.5 text-xs font-semibold tracking-wide text-text-inverted uppercase">
          <Trans>New</Trans>
        </span>
      ) : null}
      {/* 2026-06-03 (Pencil xxNFC polish): card body restructured.
          Previously the state pill was a LEFT-RAIL anchor next to a
          content column; the change-kind chip lived in the title's
          header row. Pencil's design treats the top of the card as a
          single META CLUSTER (change-kind + state + form + confidence
          on the left, action buttons on the right), with the title +
          summary stacked BELOW the cluster.

          The new structure:
            • Meta cluster (top): ChangeKindChip + JurisdictionChip +
              FormChip + ConfidenceChip — all DS primitives, every
              chip's chrome ships from `<Badge>`.
            • Title (text-base font-semibold) on its own row.
            • Summary line (line-clamp-2).
            • Footer row (source + source status + workflow status +
              readiness) — unchanged, retained from previous design.
            • Actions row (right edge of meta cluster):
              <PulseAlertActionsRow> renders Snooze/Archive/Dismiss
              as three discoverable icon buttons instead of a kebab.

          State pill no longer occupies a left rail — it sits inline
          with the other meta chips. Content column no longer needs
          an inner flex separating "rail" from "body". */}
      {/* 2026-06-04 round 23 (Yuqi Pencil h7WAEF u07Dw0 — "you
          didn't follow everything"): card body restructured to
          Pencil's three-block layout exactly:
            1. Frame 123 (header): title-cluster on the left,
               hover-revealed action buttons on the right —
               justify-between row.
            2. Frame 54 (body): summary + clients impact info
               stacked, gap-1 (Pencil's gap 4 ≈ 4-6px).
            3. Meta: horizontal chip row at the BOTTOM (change
               kind, jurisdiction, authority, confidence, then
               source / status / dup count).
          Previous structure had the meta chips at the TOP —
          Pencil inverts that order. Title-first reads as the
          alert's anchor; the meta tags settle at the bottom as
          a quiet provenance row. */}
      {/* 2026-06-04 round 31 (Yuqi screenshot — "did you do any
          changes and updates? dumb"): card body rebuilt to the
          jykZH layout used for every alert card across /alerts:
            (1) Top meta row — severity pill + source caption +
                change-kind text-badge | timestamp + action pill
                (replaced by hover action buttons).
            (2) Inline title row — jurisdiction pill + title +
                muted "Open"/status text.
            (3) Optional summary line.
            (4) Impact row — clients-affected count + Review →.
          All values come from real `alert` data via the shared
          `pulse-alert-chrome` helpers — no hardcoded copy.

          2026-06-04 round 32: Pencil ZkXFr was REVISED — outer gap
          is now 8 (gap-2), not 20 (gap-5). Match exactly: gap-2
          between top meta / title / impact. Pencil's tightest
          packing yet. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {(() => {
          const severity = severityFromConfidence(alert.confidence)
          const actionPill = actionPillFromAlert(alert)
          const openId = openStatusFromAlert(alert.status)
          const severityLabel =
            severity.id === 'high'
              ? t`HIGH IMPACT`
              : severity.id === 'medium'
                ? t`MEDIUM IMPACT`
                : t`LOW IMPACT`
          const actionLabel = actionPill
            ? actionPill.id === 'needs-action'
              ? t`Needs Action`
              : actionPill.id === 'needs-review'
                ? t`Needs Review`
                : actionPill.id === 'snoozed'
                  ? t`Snoozed`
                  : t`Closed`
            : null
          const openLabel =
            openId === 'open'
              ? t`Open`
              : openId === 'snoozed'
                ? t`Snoozed`
                : openId === 'applied'
                  ? t`Applied`
                  : openId === 'dismissed'
                    ? t`Dismissed`
                    : openId === 'partial'
                      ? t`Partially applied`
                      : t`Reverted`
          return (
            <>
              {/* Top meta row — 2026-06-04 round 38 (Yuqi 11-item
                  card feedback).
                    • Item 1 — PulseAlertActionsRow moves UP here
                      (hover-revealed, right cluster). Frees the
                      impact row of action chrome so the clients
                      line + Review can sit on a single uncluttered
                      strip.
                    • Item 2 — HIGH IMPACT pill more condensed:
                      `px-1.5 py-[1px]` → `px-1 py-0` with explicit
                      `leading-[1.3]`. Reads as a tight inline tag,
                      not a button.
                    • Item 3 — source bumped `text-sm` (14) →
                      `text-base` (16) so the publisher reads as the
                      anchor of this row, not a quiet caption.
                    • Closing-b ("since deadline shifted is in the
                      content, don't need it on first row"):
                      change-kind chip REMOVED from this row. The
                      facts panel R2kul below shows "WHAT CHANGED →
                      Deadline shifted" — duplicating it as a top-row
                      badge was repetition without information. The
                      middot separator was kept on the source field
                      against the timestamp instead. */}
              {/* Top meta row — 2026-06-04 round 39. Item 4 +
                  item 5 + item 8 + item 1 (carryover):
                    • Item 5 ("太拥挤了，稍微大一点点" / "too crowded,
                      slightly bigger"): severity pill padding loosened
                      `px-1 py-0` → `px-1.5 py-[1px]` so the label has
                      a touch of breathing room without going back to
                      the round-37 chunkiness.
                    • Item 8 ("更小，更精致" / "smaller, more refined"):
                      source `text-[15px]` → `text-sm` (14px). Reads
                      as a quiet caption next to the severity pill
                      instead of competing with it.
                    • Item 4 ("the action group can be at a better
                      place"): PulseAlertActionsRow REMOVED from this
                      cluster (was crowding the action pill on hover).
                      Relocated to the impact row right edge — see
                      below.
                    • Item 1 (carryover Sort-by/Search restructure):
                      the right cluster is now timestamp + action pill
                      only. Clean. */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-flex h-6 shrink-0 items-center rounded-[4px] px-1.5 text-[11px] font-semibold tracking-[0.8px]"
                    style={{ backgroundColor: severity.bg, color: severity.text }}
                  >
                    {severityLabel}
                  </span>
                  {/* Source size pinned to `text-[13px]` because the
                      project's Tailwind has a custom scale where
                      `text-sm` = 12px (matches the facts panel
                      cells, no hierarchy) and `text-[15px]` from
                      round 38 was too loud. 13px sits refined
                      between the 11px timestamp/facts and the 18px
                      title. */}
                  <span className="truncate text-[13px] font-medium text-text-secondary">
                    {alert.source}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium text-text-tertiary">
                    {formatRelativeTime(alert.publishedAt)}
                  </span>
                  {actionPill && actionLabel ? (
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium"
                      style={{ backgroundColor: actionPill.bg, color: actionPill.text }}
                    >
                      {actionLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Title row — 2026-06-04 round 39.
                    • Item 6 ("还是太大" / "still too big"): StateBadge
                      size `sm` (28px) → `xs` (20px).
                    • Item 7 ("state badge 和 State abbreviation 是
                      encapsulated 在一个 badge 里满的" / "state badge and
                      state abbreviation are encapsulated in one badge
                      together"): wrap the SVG flag motif and the
                      two-letter code in ONE bordered pill — single
                      `rounded-[6px]` container with the flag + label
                      sitting flush together, gap-1. The pill border
                      reads as a unit; the flag becomes the icon and
                      the code becomes the label.
                    • Title 18/600 unchanged; "Open" still follows
                      title via flex-1 spacer. */}
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-[4px] bg-background-section px-1.5">
                  <StateBadge code={alert.jurisdiction} size="xs" />
                  <span className="text-[10px] font-semibold tracking-[0.4px] text-text-secondary uppercase">
                    {alert.jurisdiction}
                  </span>
                </span>
                <h3
                  className="line-clamp-1 min-w-0 text-[18px] leading-[1.25] font-semibold tracking-[-0.2px] text-text-primary"
                  title={alert.title}
                >
                  {alert.title}
                </h3>
                <span className="shrink-0 text-base leading-[1.25] font-medium text-text-muted">
                  {openLabel}
                </span>
                <span className="flex-1" aria-hidden />
              </div>

              {/* AI summary kept */}
              {alert.summary && alert.summary.trim() !== alert.title.trim() ? (
                <p className="line-clamp-1 max-w-[700px] text-sm text-text-secondary">
                  <Astroid
                    className="mr-1 inline size-3 shrink-0 align-[-1px] text-text-tertiary"
                    aria-label={t`AI-generated summary`}
                  />
                  {alert.summary}
                </p>
              ) : null}

              {/* Facts panel R2kul — 2026-06-04 round 36, item 6.
                  4 columns: WHAT CHANGED / AFFECTING / FIRST
                  APPLICATION / TRANSITION.

                  Data wiring (round 37 — Yuqi "ensure all of the
                  displayed info are correctly wired up, synced
                  across"):

                  • WHAT CHANGED  → changeKindLabel(alert.changeKind)
                  • AFFECTING     → forms list from the affected-clients
                    query when present; `—` otherwise. Do NOT fall
                    back to alert.jurisdiction — the StateBadge in the
                    title row already shows it, and duplicating it
                    here makes the panel feel like padding rather
                    than information.
                  • FIRST APPLICATION → `—` (PulseAlertPublic doesn't
                    carry a structured effective-date today; lights
                    up when the contract grows the field).
                  • TRANSITION       → `—` (same — only form-revision
                    alerts have a transition window; surface via
                    PulseFormRevisedCard's typed `facts` prop). */}
              <div className="grid grid-cols-[5fr_5fr_2fr_2fr] overflow-hidden rounded-[8px] bg-background-section">
                <div className="flex flex-col gap-1 px-3 py-2">
                  <span className="text-[10px] font-semibold tracking-[0.6px] text-text-muted uppercase">
                    <Trans>What changed</Trans>
                  </span>
                  <span className="truncate text-xs font-medium text-text-secondary">
                    {changeKindLabel(alert.changeKind)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 px-3 py-2">
                  <span className="text-[10px] font-semibold tracking-[0.6px] text-text-muted uppercase">
                    <Trans>Affecting</Trans>
                  </span>
                  <span className="truncate text-xs font-medium text-text-secondary">
                    {firstForm ?? '—'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 px-3 py-2">
                  <span className="text-[10px] font-semibold tracking-[0.6px] text-text-muted uppercase">
                    <Trans>First application</Trans>
                  </span>
                  <span className="truncate text-xs font-medium text-text-secondary">—</span>
                </div>
                <div className="flex flex-col gap-1 px-3 py-2">
                  <span className="text-[10px] font-semibold tracking-[0.6px] text-text-muted uppercase">
                    <Trans>Transition</Trans>
                  </span>
                  <span className="truncate text-xs font-medium text-text-secondary">—</span>
                </div>
              </div>
            </>
          )
        })()}


        {/* Impact row — 2026-06-04 round 39 (Yuqi item 4: "the
            action group can be at a better place").
              • PulseAlertActionsRow is RELOCATED here from the top
                meta cluster. The top-right was crowding the action
                pill ("Needs Action") and timestamp; the impact row
                has a natural right-edge slot once a `flex-1` spacer
                pushes it past the clients + Review cluster on the
                left. Hover-revealed so the action chrome doesn't
                claim resting-state weight.
              • Layout at rest: `[👥 N clients · Form] [spacer] [—]`
                Layout on hover: `[👥 N clients · Form] [Review→] [spacer] [snooze][archive][dismiss]`
              • Top padding kept `pt-1` from round 38 closing-c. */}
        <div className="flex items-center gap-2 pt-1 pb-0.5">
          <div className="flex items-center gap-1.5">
            <UsersIcon className="size-[13px] shrink-0 text-text-tertiary" aria-hidden />
            <span className="text-xs font-medium text-text-tertiary">
              {impacted > 0 ? (
                firstForm ? (
                  <Plural
                    value={impacted}
                    one={`# client · 1 ${firstForm} return affected`}
                    other={`# clients · # ${firstForm} returns affected`}
                  />
                ) : (
                  <Plural
                    value={impacted}
                    one="# client may be affected"
                    other="# clients may be affected"
                  />
                )
              ) : (
                <Trans>No matching clients in this practice.</Trans>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onReview()
            }}
            className={cn(
              'text-xs font-semibold text-text-accent outline-none transition-opacity duration-150 hover:underline focus-visible:underline',
              active
                ? 'opacity-100'
                : 'pointer-events-none opacity-0 group-hover/alert-card:pointer-events-auto group-hover/alert-card:opacity-100 group-focus-within/alert-card:pointer-events-auto group-focus-within/alert-card:opacity-100',
            )}
          >
            <Trans>Review →</Trans>
          </button>
          <span className="flex-1" aria-hidden />
          {!compact ? (
            <div
              className={cn(
                'shrink-0 transition-opacity duration-150',
                active
                  ? 'opacity-100'
                  : 'pointer-events-none opacity-0 group-hover/alert-card:pointer-events-auto group-hover/alert-card:opacity-100 group-focus-within/alert-card:pointer-events-auto group-focus-within/alert-card:opacity-100',
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <PulseAlertActionsRow
                alertTitle={alert.title}
                onSnooze={onSnooze}
                onArchive={onArchive}
                onDismiss={onDismiss}
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

// 2026-05-25 (Yuqi Alerts #8): the chip labels were single nouns
// ("Scope", "Form", "Deadline") that don't tell the CPA what
// ACTUALLY changed. Renamed to verb-phrase or noun-phrase forms
// that name the thing AND say it shifted: "Deadline shifted",
// "Scope narrowed", "Form updated", etc. Reads as a sentence
// fragment from a hover sweep.
//
// 2026-05-26 (Yuqi /rules/pulse fourth pass #1): copy switched
// from sentence-case ("Deadline shifted") to Title Case
// ("Deadline Shifted") so the chip reads as a label not a
// sentence fragment. Pairs with the pill chrome dropping its
// `uppercase` class — the previous combination forced UPPERCASE
// rendering at CSS time even though the source string was
// sentence-case, which made the chip louder than the title
// next to it.
// 2026-05-26 (Yuqi /rules/pulse sixth pass #2): until the server
// adds `entityKind` to PulseAffectedClient, classify business vs.
// individual by the canonical legal-suffix patterns in the name.
// Word-boundaried matching + case-insensitive — "Hudson & Wells LLC"
// → enterprise; "John Smith" → individual; "Acme Corp" → enterprise.
// Punctuation tolerated for `Co.` and `P.C.`. False negatives
// (e.g. "Beta Holdings" without a legal suffix) still read as
// individual; that's the safer wrong answer than the inverse.
const ENTERPRISE_NAME_RE =
  /\b(llc|inc|corp(?:oration)?|co|ltd|llp|plc|gmbh|p\.?c|s\.?a|holdings?|industries|associates|partners|group)\b\.?/i
function isEnterpriseClientName(name: string): boolean {
  return ENTERPRISE_NAME_RE.test(name)
}

// 2026-06-04 round 31: local `changeKindLabel` duplicate retired
// in favor of the export from `PulseChangeKindChip.tsx` (the
// canonical mapping all alert-card variants now share).
function _unusedChangeKindLabel(kind: PulseAlertPublic['changeKind']) {
  void kind
  return null
  /* eslint-disable no-unreachable */
  switch (kind) {
    case 'deadline_shift':
      return <Trans>Deadline Shifted</Trans>
    case 'filing_requirement':
      return <Trans>Filing Rule Changed</Trans>
    case 'applicability_scope':
      return <Trans>Scope Changed</Trans>
    case 'form_instruction':
      return <Trans>Form Updated</Trans>
    case 'source_status':
      return <Trans>Source Status</Trans>
    case 'new_obligation':
      return <Trans>New Rule Added</Trans>
    case 'other':
      return <Trans>Other Change</Trans>
  }
  return kind
  /* eslint-enable no-unreachable */
}
