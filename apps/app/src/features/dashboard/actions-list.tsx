import { useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, ArrowUpRightIcon, CalendarIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardTopRow, ObligationStatus } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { TaxCodeBadge, TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { EmptyState as SharedEmptyState } from '@/components/patterns/empty-state'
import { StatTile } from '@/components/patterns/stat-tile'
import { ConceptHelp } from '@/features/concepts/concept-help'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { formatDatePretty } from '@/lib/utils'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'
import { isPaymentOverdue, paymentOverdueDays } from '@/features/obligations/payment-overdue'
// 2026-05-31 (Yuqi Pencil FpHtM — owner-avatar slot): Pencil also
// shows a per-row owner-initials avatar on the right cluster.
// `DashboardTopRow` (packages/contracts/src/dashboard.ts) does not
// expose an `assigneeName` field today — the obligation queue
// schema does (`obligation-queue.ts`), but the dashboard top-rows
// projection drops it. To render the avatar without a stale
// placeholder, the contract + server projection need a small
// extension (one field + one SELECT). Imports kept commented so
// the wire-up is one uncomment away once the contract change
// lands.
// import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
// import { useCurrentUserName } from '@/lib/use-current-user-name'

// 2026-06-03 (Yuqi — surface severity tiers on Today): the flat
// priority-sorted "Actions this week" list buried the critical / high /
// upcoming distinction behind a 3.5px leading-chevron tint + the
// right-edge time text. A CPA doing a Monday-morning triage had to read
// every row to learn the *shape* of the week. We now group the rows
// into explicit severity bands with colored headers + counts, and give
// each row a left urgency rail, so "2 on fire, 3 warm, the rest fine"
// reads at a glance. Severity comes straight from the server's
// DashboardTopRow.severity (critical / high / medium / neutral); medium
// and neutral fold into one "Upcoming" band.
type SeverityBandKey = 'critical' | 'high' | 'upcoming'

// The hierarchy is carried entirely by the band header — a colored dot
// + tinted label + plain-language caption. No boxes, washes, or row
// rails, which fought the page's clean, borderless aesthetic.
const SEVERITY_BAND_STYLE: Record<SeverityBandKey, { dot: string; label: string }> = {
  critical: { dot: 'bg-text-destructive', label: 'text-text-destructive' },
  high: { dot: 'bg-text-warning', label: 'text-text-warning' },
  upcoming: { dot: 'bg-text-tertiary', label: 'text-text-tertiary' },
}

function severityBandKey(severity: DashboardTopRow['severity']): SeverityBandKey {
  if (severity === 'critical') return 'critical'
  if (severity === 'high') return 'high'
  return 'upcoming'
}

function topPriorityFactors(row: DashboardTopRow): string[] {
  const factors = [...(row.smartPriority.factors ?? [])]
    .filter((f) => f.contribution > 0)
    .toSorted((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
  return factors.map((f) => f.label)
}

// Dashboard v2 "Actions this week" — verb-led action queue.
//
// Behavior:
//   - Each row has a chevron at the start (`>` collapsed → `v` expanded)
//   - Hovering the row expands it INLINE (the row's container grows
//     downward to reveal a details panel). Hover-out collapses it.
//   - Keyboard focus on the row also expands it (focus parity).
//   - The Review button opens the obligation drawer
//     in place via the parent's onOpenObligation handler.
//   - Row meta is the right-aligned time signal ("3d late" /
//     "today" / "in 2d"). No dollar amounts.

function daysUntilDueFromAsOf(currentDueDate: string, asOfDate: string | null): number {
  if (!asOfDate) return 0
  const due = new Date(currentDueDate).getTime()
  const as = new Date(asOfDate).getTime()
  return Math.round((due - as) / (1000 * 60 * 60 * 24))
}

// 2026-05-25 (Yuqi Today #33): Yuqi asked to see both the firm's
// INTERNAL deadline ("when you actually need to file by") and the
// OFFICIAL statutory deadline on the dashboard's expanded row.
// `currentDueDate` on DashboardTopRow is the official date; the
// internal date is computed by subtracting the firm's configured
// `internalDeadlineOffsetDays` (default 14). The contract doesn't
// surface the internal date as a separate field today — it's a
// view-time derivation everywhere it appears. Computing it here
// avoids a contract migration just for this UI tweak.
function internalDueDateFromOfficial(
  officialDueDate: string,
  internalDeadlineOffsetDays: number,
): string {
  const date = new Date(`${officialDueDate}T00:00:00`)
  date.setDate(date.getDate() - internalDeadlineOffsetDays)
  return date.toISOString().slice(0, 10)
}

// 2026-05-25 (Yuqi #26): the previous prompts read like developer
// prose — "close the row" is engineering-speak the CPA never uses,
// "Complete CPA review and close the row" stacked two verbs from
// different frames. Rewritten as imperative tasks a CPA would put
// in their own to-do list.
//
// 2026-05-25 (Yuqi follow-up — "still missing the title"): this
// function used to take `t` as a parameter. That broke Lingui 5's
// macro transform — the `t` macro only fires when `t` is referenced
// directly in the source position (imported from `@lingui/react/
// macro` or destructured from `useLingui()` at the call site). When
// `t` is passed as a function arg, every `t\`source\`` in the body
// becomes a raw tagged-template call on a function that doesn't
// know how to handle one, and returns `undefined` — the empty
// "Action" row + bare `·` separator next to the client name Yuqi
// screenshotted. Refactored as a hook so `useLingui()` lives in
// scope right next to every `t\`…\`` macro use.
function useActionPrompt(row: DashboardTopRow, asOfDate: string | null): string {
  const { t } = useLingui()
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  if (row.status === 'waiting_on_client') return t`Follow up with the client for documents`
  if (row.evidenceCount === 0) return t`Attach the source document`
  if (row.status === 'review') return t`Review the prepared return and sign off`
  if (days <= 0) return t`Confirm filing or payment status — due today`
  if (days <= 2) return t`Final-check owner, source, and cutoff date`
  return t`Re-verify the source still applies to this return`
}

// 2026-05-24 (critique P0): terminal-state rows render lateness as a
// muted quality stat ("filed #d late"), not red live urgency. The
// dashboard top-rows query typically filters terminal states out, so
// this branch is defensive — guards against an optimistic update or
// a future server expansion landing a completed row in the list.
//
// 2026-05-27 (D12 — Agent ω, journey-audit drain): `'done'` removed
// from the terminal set. Filing being done does NOT imply the
// payment side cleared (anti-pattern #1: extension/filing ≠ payment).
// A row marked `'done'` but with `paymentDueDate < asOfDate` is still
// payment-overdue and should surface in "Needs attention" with a
// "Payment N days late" chip. `'paid'` and `'completed'` remain
// terminal — `'paid'` explicitly means the payment side closed too,
// and `'completed'` is the canonical end state covering both sides.
const DASHBOARD_TERMINAL_STATUSES: ReadonlySet<ObligationStatus> = new Set(['paid', 'completed'])

function RowMeta({
  days,
  status,
  paymentDueDate,
  asOfDate,
}: {
  days: number
  status: ObligationStatus
  paymentDueDate: string | null
  asOfDate: string | null
}) {
  // 2026-05-27 (D12 — Agent ω): payment-overdue takes precedence on
  // the row meta. A filed-but-payment-overdue row's "filing days
  // late" reading is misleading (the filing is done); the urgent
  // signal is the unpaid payment. When both apply, the payment chip
  // wins because that's the action the CPA still needs to take.
  const paymentLate = isPaymentOverdue(paymentDueDate, asOfDate)
  const paymentLateDays = paymentOverdueDays(paymentDueDate, asOfDate)

  if (paymentLate) {
    return (
      <span className="flex shrink-0 items-baseline whitespace-nowrap text-sm tabular-nums">
        <span className="text-text-destructive">
          <Plural value={paymentLateDays} one="Payment # day late" other="Payment # days late" />
        </span>
      </span>
    )
  }

  if (DASHBOARD_TERMINAL_STATUSES.has(status)) {
    if (days === 0) return null
    return (
      <span className="flex shrink-0 items-baseline whitespace-nowrap text-sm tabular-nums">
        <span className="text-text-tertiary">
          {days < 0 ? (
            <Plural value={-days} one="filed #d late" other="filed #d late" />
          ) : (
            <Plural value={days} one="filed #d early" other="filed #d early" />
          )}
        </span>
      </span>
    )
  }
  const past = days < 0
  return (
    <span className="flex shrink-0 items-baseline whitespace-nowrap text-sm tabular-nums">
      <span className={cn(past ? 'text-text-destructive' : 'text-text-secondary')}>
        {past ? (
          <Plural value={-days} one="#d late" other="#d late" />
        ) : days === 0 ? (
          <Trans>today</Trans>
        ) : (
          <Plural value={days} one="in #d" other="in #d" />
        )}
      </span>
    </span>
  )
}

function ActionRow({
  row,
  asOfDate,
  internalDeadlineOffsetDays,
  expanded,
  onHoverChange,
  onOpenObligation,
}: {
  row: DashboardTopRow
  asOfDate: string | null
  internalDeadlineOffsetDays: number
  expanded: boolean
  onHoverChange: (hovered: boolean) => void
  onOpenObligation: () => void
}) {
  const { t } = useLingui()
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  const prompt = useActionPrompt(row, asOfDate)
  const factors = topPriorityFactors(row)
  const detailId = `action-detail-${row.obligationId}`
  // Internal date = official deadline − firm offset. Derived in JS so
  // no contract change is needed for this surface (see comment on
  // `internalDueDateFromOfficial`).
  const internalDueDate = internalDueDateFromOfficial(
    row.currentDueDate,
    internalDeadlineOffsetDays,
  )

  return (
    <div
      // Hover the whole container expands it inline. onMouseLeave on
      // the outer wrapper fires when the cursor exits this row's
      // bounding box (including the expanded panel below, which
      // lives inside the same wrapper). onFocus / onBlur give
      // keyboard users the same expansion path.
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={(event) => {
        // Only collapse if focus is leaving the entire row, not just
        // moving between children (the Review button gets focus
        // before the chevron, etc.). `relatedTarget` is the element
        // receiving focus next.
        const nextTarget = event.relatedTarget
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          onHoverChange(false)
        }
      }}
      // 2026-05-31 (Yuqi Pencil FpHtM — expanded row card lift):
      // when expanded, the row + dl panel together read as a
      // lifted card with a soft outer shadow and a slightly larger
      // corner radius, distinguishing the active row from the
      // quieter collapsed rows above and below it. Collapsed rows
      // stay flat (no shadow, no card chrome) so the surface only
      // gains visual weight at the moment the user is interacting
      // with it. Uses canonical Tailwind `shadow-sm` + design-system
      // border tokens so the lift can be tuned globally.
      className={cn(
        'flex flex-col transition-all duration-200 ease-out motion-reduce:transition-none',
        expanded
          ? 'rounded-xl border border-divider-subtle bg-background-default shadow-sm'
          : 'rounded-md',
      )}
    >
      <div
        // The whole row is clickable: opens the obligation panel via
        // the parent's openObligationDrawer handler, same shape as
        // queue and client-filing-plan rows. Hover still expands
        // inline detail; the click is a separate, primary affordance.
        // The Review button below stops propagation so it doesn't
        // double-fire.
        role="button"
        tabIndex={0}
        aria-label={t`Open ${prompt} for ${row.clientName}`}
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={onOpenObligation}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpenObligation()
          }
        }}
        className={cn(
          // 2026-05-26 (Yuqi forty-third pass — spacing unification):
          // py-2.5 (10px) → py-2 (8px). Canonical row padding is
          // `px-3 py-2`; the 2.5 was a half-step that doesn't exist
          // in the canonical scale. Affects Today's action rows so
          // they match the row density used on Deadlines.
          // 2026-05-26 (Yuqi /today feedback): hover transition gets
          // a deliberate ease-in-out timing (200ms) instead of the
          // default `transition-colors` (150ms ease). The slightly
          // longer + symmetric easing makes the hover feel
          // intentional, not snappy — important on a dashboard
          // surface where the row IS the affordance.
          // 2026-05-27 (Yuqi feedback): tighten action row vertical
          // padding py-2 (8px) → py-1 (4px). Yuqi: "changes to .py-2
          // { padding-block: calc(var(--spacing) * 1); }" — devtools
          // experiment confirmed the row reads better at half height.
          'group flex w-full cursor-pointer items-center gap-3 px-3 py-1 text-left outline-none transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
          // Background drives off the expanded state, not hover, so
          // the row and the panel below read as a single block. When
          // collapsed, the row stays transparent (chrome quiet at
          // rest); when expanded, the row picks up the same bg as
          // the panel for visual continuity.
          expanded ? 'rounded-t-md bg-background-subtle' : 'rounded-md hover:bg-state-base-hover',
        )}
      >
        {/* Leading chevron — rotates 90° when expanded so the row
          reads as "this opens." Pure visual cue; not a button (the
          whole row container handles expansion via hover/focus).
          2026-06-03 (Yuqi): arrow tone reverted to a quiet neutral
          gray. It previously tracked status color (red/amber/accent),
          but once the severity bands carry the urgency signal at the
          band-header level, a per-row colored arrow read as arbitrary
          noise at the row's leading edge. Neutral keeps the chevron a
          pure "this opens" affordance; severity now lives in the band
          header dot + label. Expanded state still steps to text-primary
          so the rotate-down cue stays legible. */}
        <ArrowRightIcon
          className={cn(
            'size-3.5 shrink-0 transition-transform',
            expanded ? 'rotate-90 text-text-primary' : 'text-text-tertiary',
          )}
          aria-hidden
        />
        {/* 2026-05-25 (Yuqi #25): client name was wrapped in a
            badge-styled span (bordered + bg-subtle) that read like
            a status label, not a client. Promoted to plain
            font-semibold body text — same scale as the prompt next
            to it but heavier weight. Reads as "subject" with the
            prompt as the supporting detail, like an email
            list-item. */}
        {/* 2026-05-25 (Yuqi typography rebalance): client name
            stepped down from font-semibold to font-medium.
            Semibold made the row's leading word compete with the
            section h2 above; medium keeps it as the row's anchor
            without shouting next to a softer prompt. */}
        {/* 2026-05-25 (Yuqi Today #1 — second pass): client name
            stepped down further — was `text-base font-medium`,
            still reading as the page's heaviest body text. Now
            `text-sm font-medium` so it stays the row's anchor
            without competing with the section h2. Prompt drops
            text-base → text-sm in lockstep so the heading row
            balances.
            2026-05-25 (Yuqi Today #7 + #8): swapped the weight
            assignment. The prompt ("Review the prepared return
            and sign off") is the action the CPA needs to take —
            it deserves the row's emphasis. The client name is
            context, not the action; demoted to regular weight.
            So: prompt becomes font-medium, client name becomes
            font-normal. */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 truncate text-sm font-normal text-text-primary">
              {row.clientName}
            </span>
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
              {prompt}
            </span>
          </span>
          {/* 2026-06-03 (Yuqi A): surface the "why now" reasoning at rest
              on Critical rows. The Smart Priority factors (penalty,
              passed cutoff, client readiness) are the single most
              differentiating signal — "why is this the one to do" — and
              were previously hover-only. Shown at rest for Critical only;
              the expanded panel already carries the full Why-now row, so
              gating on !expanded avoids duplication when the row opens. */}
          {!expanded && row.severity === 'critical' && factors.length > 0 ? (
            <span className="truncate text-xs text-text-tertiary">{factors.join(' · ')}</span>
          ) : null}
        </div>
        {/* 2026-05-31 (Yuqi DS-first revision): use the chip-shaped
            `<TaxCodeBadge>` primitive on the row right edge, not
            the plain-text `<TaxCodeLabel asChild>` which renders
            inline text. TaxCodeBadge is the canonical chip
            (border + bg-subtle + caption text) and shares its
            tooltip body with TaxCodeLabel, so the form-code
            vocabulary stays consistent across surfaces. */}
        <TaxCodeBadge code={row.taxType} className="shrink-0" />
        {/* 2026-05-31 (Yuqi DS-first revision): "Open in queue"
            now uses the canonical `<Badge variant="default" />`
            rendered as a `<Link>` via the Badge's `render` prop.
            Same accent-tinted soft fill the design system uses
            for "this is a tappable inline navigation chip" —
            tokens come from `bg-state-accent-active-alt` +
            `text-text-accent` in the Badge variant. The hover-on-
            anchor rule is baked into the variant so we don't have
            to hand-roll one. */}
        {expanded ? (
          <Badge
            variant="default"
            render={
              <Link
                to={`/deadlines#row-${row.obligationId}`}
                onClick={(event) => event.stopPropagation()}
              />
            }
          >
            <Trans>Open in queue</Trans>
            <ArrowUpRightIcon data-icon="inline-end" />
          </Badge>
        ) : null}
        {/* 2026-05-25 (Yuqi Today follow-up): the Review button used
          to render unconditionally with `opacity-0` when collapsed —
          which kept the button taking ~100px of flex space, squeezing
          the prompt `<span>` (`flex-1 truncate`) down to nothing on
          longer client names. Yuqi reported "actions row only shows
          the client name" — root cause was this invisible-but-still-
          claimed layout space. Now we conditionally render: button
          only mounts when expanded. The minor reflow on hover (button
          appears) is a cleaner UX than the prompt being permanently
          truncated. RowMeta stays always-visible because the
          time-to-due signal is needed at rest, not just on hover. */}
        {expanded ? (
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              onOpenObligation()
            }}
          >
            <Trans>Review</Trans>
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        ) : null}
        <RowMeta
          days={days}
          status={row.status}
          paymentDueDate={row.paymentDueDate}
          asOfDate={asOfDate}
        />
      </div>

      {/* Inline expansion — sits inside the same wrapper as the row,
        so onMouseLeave doesn't trigger when the cursor crosses from
        the row into the expansion panel. The whole panel is a click
        target that opens the obligation drawer — same action as the
        Review button on the right, but with a much bigger hit area
        once the row is already open. Use a role-backed div rather
        than a real button so tooltip triggers inside the panel cannot
        create invalid button-in-button markup.

        2026-05-25 (Yuqi #46): the expansion was a hard mount/unmount,
        which read as a jarring jump on hover. Wrapped in a
        grid-template-rows animation: collapsed = 0fr, expanded = 1fr.
        The inner content stays mounted so the transition has a target
        to animate to, and `overflow-hidden` on the rows track clips
        the content while it's collapsing. 200ms ease-out feels
        deliberate but not slow. `motion-reduce` falls back to no
        animation (instant) so users with reduced-motion preferences
        aren't forced into transitions. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">
          <div
            role="button"
            tabIndex={expanded ? 0 : -1}
            id={detailId}
            onClick={expanded ? onOpenObligation : undefined}
            onKeyDown={(event) => {
              if (!expanded) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpenObligation()
              }
            }}
            aria-label={t`Review ${row.clientName} in deadline drawer`}
            // Panel sits flush against the row above — top corners
            // squared, bottom rounded. Same bg as the row when
            // expanded so the two read as a single block. Hover state
            // darkens slightly to signal "this is the click target."
            //
            // 2026-05-25 (Yuqi Today #32): top padding tightened from
            // `py-4` to `pt-3 pb-4`. The previous 16px top padding
            // pushed the dl content visibly down from the row above,
            // and the bg-continuity trick stopped working — they read
            // as two stacked blocks with a gap. 12px top + 16px
            // bottom keeps the dl breathing room while the top
            // sits flush against the row's baseline.
            // 2026-05-25 (Yuqi Today #3 — second pass): expansion
            // panel text scale dropped text-base → text-sm. Yuqi
            // flagged the descriptions/details as "too big" — at
            // 16px the dt/dd pairs read at body weight, the same
            // tier as the row header above. text-sm (14px) keeps
            // the panel readable while making it visually
            // subordinate to the row that opened it.
            // 2026-05-29 (Yuqi /today round 3 — "top bottom margin of
            // the collapsed and expanded row should be the same"):
            // panel padding swapped pt-3 pb-4 → py-3. The 16px bottom
            // made the expanded block read taller below its content
            // than above; symmetric 12px frames the dl cleanly so the
            // row+panel together feel like one balanced block.
            className="grid w-full cursor-pointer gap-3 rounded-b-md bg-background-subtle px-4 py-3 text-left text-sm transition-colors hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            {/* 2026-05-25 (Yuqi Today intro): each row of the dl
                pinned to the same min-height so the dt/dd gaps
                read as a consistent rhythm. Previously the Status
                row was taller (chip h-6 + Status text) than the
                bare-text rows, so the gap between labels varied —
                "Action", "Deadlines", "Status" sat at three
                different vertical pitches. `[&>dt]` / `[&>dd]`
                selectors apply a flex+min-h-7+items-center to
                every direct child so each pair becomes a stable
                28px row. */}
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-1 [&>dd]:flex [&>dd]:min-h-7 [&>dd]:items-center [&>dt]:flex [&>dt]:min-h-7 [&>dt]:items-center">
              {/* 2026-05-26 (Yuqi Today #1 follow-up): the "Action" row
                  was previously rendered FIRST here to repeat the
                  prompt prominently. That was redundant once the
                  collapsed row swapped weights so the prompt itself
                  renders at font-medium (anchor of the row), so the
                  expansion now jumps straight to deadlines + status
                  + form + sources + why-now. The prompt continues
                  to live on the collapsed row's heading line. */}

              {/* 2026-05-25 (Yuqi Today #33): show INTERNAL and
                  OFFICIAL deadlines on one line in the expansion
                  panel. The collapsed row's RowMeta shows "in 3d"
                  / "5d late" which answers "how soon" — but the
                  CPA opening this panel wants the absolute dates to
                  plan the week. Internal first (it's the date the
                  CPA actually works against); official second as
                  the statutory reality. Both shown as prose
                  ("May 6, 2026") via formatDatePretty.
                  2026-05-25 (Yuqi Today #10): Deadlines dd is the
                  panel's anchor — once the user has expanded a
                  row, they're planning around the dates. Framed
                  the date cluster in a soft inset chip
                  (`bg-background-default rounded-md px-2`) so the
                  eye lands on it ahead of the other meta rows. */}
              {/* 2026-05-29 (Yuqi /today round 3 — #8): each dl item is
                  a real link to the surface that holds the full
                  detail. stopPropagation on each so clicking a sub-link
                  doesn't ALSO fire the parent row's "open obligation
                  drawer" click. Sources is the lone exception — it
                  still calls onOpenObligation (the obligation drawer
                  carries the evidence list) rather than navigating
                  away.

                  2026-05-29 (Yuqi /today round 4 — "the hover state for
                  each of the link should try to be same"): unified the
                  hover treatment across all 4 sub-affordances. All
                  four share the canonical
                    `rounded-sm outline-none underline-offset-2
                     hover:underline
                     focus-visible:ring-2 ring-state-accent-active-alt`
                  pattern. The Deadlines chip drops its earlier
                  chip-style `hover:bg-state-base-hover` so it matches
                  the inline-text affordances — its bordered surface
                  comes from the static chip frame, hover signals
                  clickability via the underline alone. */}
              <dt className="text-text-tertiary">
                <Trans>Deadlines</Trans>
              </dt>
              <dd className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-text-primary tabular-nums">
                <Link
                  to="/deadlines/calendar"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-2 rounded-sm border border-divider-subtle bg-background-default px-2 py-0.5 outline-none underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                >
                  <span>
                    <Trans>
                      Internal{' '}
                      <span className="font-medium">{formatDatePretty(internalDueDate)}</span>
                    </Trans>
                  </span>
                  <span aria-hidden className="text-text-tertiary">
                    ·
                  </span>
                  <span>
                    <Trans>
                      Official{' '}
                      <span className="font-medium">{formatDatePretty(row.currentDueDate)}</span>
                    </Trans>
                  </span>
                </Link>
              </dd>

              <dt className="text-text-tertiary">
                <Trans>Status</Trans>
              </dt>
              <dd>
                {/* 2026-05-25 (status-pill audit #1): point at the
                    canonical `ObligationStatusReadBadge` instead of
                    inlining `badgeVariants` + `BadgeStatusDot`. */}
                <Link
                  to={`/deadlines?status=${encodeURIComponent(row.status)}`}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex rounded-sm outline-none underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  aria-label={t`See all ${row.status} deadlines`}
                >
                  <ObligationStatusReadBadge status={row.status} className="h-6 text-xs" />
                </Link>
              </dd>

              <dt className="text-text-tertiary">
                <Trans>Form</Trans>
              </dt>
              <dd className="text-text-primary">
                <Link
                  to={`/rules/library?q=${encodeURIComponent(row.taxType)}`}
                  onClick={(event) => event.stopPropagation()}
                  className="rounded-sm outline-none underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  aria-label={t`Search Rule Library for ${row.taxType}`}
                >
                  <TaxCodeLabel code={row.taxType} asChild />
                </Link>
              </dd>

              <dt className="text-text-tertiary">
                <Trans>Sources</Trans>
              </dt>
              <dd className="text-text-primary tabular-nums">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onOpenObligation()
                  }}
                  className="rounded-sm text-left outline-none underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  aria-label={t`Open evidence for ${row.clientName}`}
                >
                  {row.evidenceCount > 0 ? (
                    <Plural
                      value={row.evidenceCount}
                      one="# source attached"
                      other="# sources attached"
                    />
                  ) : (
                    <span className="text-text-warning">
                      <Trans>None attached</Trans>
                    </span>
                  )}
                </button>
              </dd>

              {row.penaltyFormulaLabel ? (
                <>
                  <dt className="text-text-tertiary">
                    <Trans>Penalty</Trans>
                  </dt>
                  <dd className="text-text-primary">{row.penaltyFormulaLabel}</dd>
                </>
              ) : null}

              {factors.length > 0 ? (
                <>
                  <dt className="text-text-tertiary">
                    <Trans>Why now</Trans>
                  </dt>
                  <dd className="text-text-primary">{factors.join(' · ')}</dd>
                </>
              ) : null}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

// 2026-05-26 (PR #28 audit cross-surface P0 #1) + 2026-05-27 (drain
// pass ν #37/#38): `ActionsSummaryTile` was extracted to the shared
// `StatTile` primitive at `@/components/patterns/stat-tile.tsx`. The
// ν #38 weight-bump for critical tone (font-medium → font-semibold)
// is now subsumed into StatTile's canonical "always semibold" rule —
// critical tone differentiates by color only. The "All caught up"
// empty-state slot from ν #37 was migrated to StatTile alongside the
// regular tile callers.

function DashboardActionsList({
  rows,
  asOfDate,
  isLoading,
  totalThisWeek,
  totalOpen,
  canRunMigration,
  onOpenWizard,
  onOpenObligation,
  onOpenAllObligations,
  // 2026-05-25 (Yuqi #5): the standalone ExposureStrip ("Need
  // your decision / Blocked / Waiting on client") merged into
  // this section. Both shared the "this week" scope so they're
  // now one section with the tile strip as its summary header.
  needDecisionCount,
  blockedCount,
  waitingOnClientCount,
  needDecisionDelta,
  blockedDelta,
  waitingOnClientDelta,
  hasClients,
}: {
  rows: DashboardTopRow[]
  asOfDate: string | null
  isLoading: boolean
  totalThisWeek: number
  // Total open obligations across the whole practice — used to split
  // the empty state: zero rows in the queue means "import data";
  // zero this week but rows elsewhere means "you're caught up,
  // here's the rest."
  totalOpen: number
  canRunMigration: boolean
  // 2026-05-29 (Yuqi /today follow-up — "no clients vs no deadlines"):
  // when there are 0 open obligations we need to distinguish a
  // fresh practice (no clients yet, encourage import) from a
  // practice that already imported and just doesn't have deadlines
  // generated yet (don't ask them to import again). Probed once at
  // the route level via `clients.listByFirm({ limit: 1 })`.
  hasClients: boolean
  onOpenWizard: () => void
  onOpenObligation: (row: DashboardTopRow) => void
  onOpenAllObligations: () => void
  needDecisionCount: number
  blockedCount: number
  waitingOnClientCount: number
  // 2026-05-31 (Yuqi Pencil /today AvFsh round): optional
  // week-over-week deltas for the summary tiles. Pass `undefined`
  // (the current default) to suppress the trend pill; pass a real
  // number once the route loader has prior-period counts wired in.
  needDecisionDelta?: number | undefined
  blockedDelta?: number | undefined
  waitingOnClientDelta?: number | undefined
}) {
  const { t } = useLingui()
  const VISIBLE_CAP = 10
  const visible = rows.slice(0, VISIBLE_CAP)
  // Single-row hover state. Only one row expanded at a time — mouse
  // can only physically be over one row.
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  // Firm's configured offset between internal and official deadlines.
  // Used by the expansion panel to compute the internal-deadline date
  // for display (#33). Default of 14 matches the DB default so we
  // render a reasonable date during the first paint before the firms
  // cache hydrates.
  const { currentFirm } = useCurrentFirm()
  const internalDeadlineOffsetDays = currentFirm?.internalDeadlineOffsetDays ?? 14

  // Build summary segments — drop zero-count entries. Only `blocked`
  // uses destructive — it's the one genuinely-stuck signal.
  //
  // 2026-05-31 (Yuqi Pencil /today AvFsh round): each tile now also
  // carries an optional week-over-week trend (`trend.delta`). Until
  // the backend ships prior-period counts, the deltas come in as
  // `undefined` from the caller — StatTile renders no pill in that
  // case, so this stays visually backwards-compatible.
  const summaryTiles: Array<{
    value: string
    label: string
    href: string
    tone: 'neutral' | 'critical'
    delta?: number | undefined
    // For "In review", "down" is good (items moved out). For
    // "Blocked", "up" is bad. For "Waiting", the direction is
    // neutral — defer to the sign-default tone unless overridden.
    trendToneOverride?: 'success' | 'warning' | 'muted' | undefined
  }> = []
  if (needDecisionCount > 0) {
    summaryTiles.push({
      value: String(needDecisionCount),
      label: t`In review`,
      href: '/deadlines?status=review',
      tone: 'neutral',
      delta: needDecisionDelta,
    })
  }
  if (blockedCount > 0) {
    summaryTiles.push({
      value: String(blockedCount),
      label: t`Blocked`,
      href: '/deadlines?status=blocked',
      tone: 'critical',
      delta: blockedDelta,
    })
  }
  if (waitingOnClientCount > 0) {
    summaryTiles.push({
      value: String(waitingOnClientCount),
      label: t`Waiting on client`,
      href: '/deadlines?status=waiting_on_client',
      tone: 'neutral',
      delta: waitingOnClientDelta,
    })
  }
  // 2026-05-27 (Step 6 UX audit #37): when every exposure count is
  // zero the strip used to vanish, which read as "the data hasn't
  // loaded" — same shape as the isLoading skeleton above. Render an
  // explicit "all caught up" tile so the slot is claimed and the
  // CPA sees an affirmative signal. The tile routes to the deadlines
  // queue so the user can still drill in if they want to verify.
  const summaryStrip =
    summaryTiles.length > 0 ? (
      <div className="flex flex-wrap gap-3 px-3">
        {summaryTiles.map((tile) => (
          <StatTile
            key={tile.href}
            value={tile.value}
            label={tile.label}
            href={tile.href}
            tone={tile.tone}
            trend={
              tile.delta !== undefined
                ? tile.trendToneOverride !== undefined
                  ? { delta: tile.delta, toneOverride: tile.trendToneOverride }
                  : { delta: tile.delta }
                : undefined
            }
          />
        ))}
      </div>
    ) : (
      <div className="flex flex-wrap gap-3 px-3">
        <StatTile value="0" label={t`All caught up`} href="/deadlines" tone="neutral" />
      </div>
    )

  if (isLoading) {
    return (
      <section aria-label={t`Actions this week`} className="flex flex-col gap-3">
        <ActionsListHeader count={null} onOpenAll={onOpenAllObligations} />
        <div className="flex flex-wrap gap-3 px-3">
          <Skeleton className="h-16 w-40" />
          <Skeleton className="h-16 w-40" />
          <Skeleton className="h-16 w-40" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </section>
    )
  }

  if (visible.length === 0) {
    // Three empty states, in order of how they should be tested:
    //   1. The practice has obligations beyond this week — show the
    //      count and route to /deadlines. Avoids the "import again"
    //      misread when the user already has data.
    //   2. The practice has zero obligations AND no clients yet — keep
    //      the import CTA.
    //   3. Caught-up state (rows exist somewhere but Smart Priority
    //      filtered them all out).
    return (
      <section aria-label={t`Actions this week`} className="flex flex-col gap-3">
        <ActionsListHeader count={0} onOpenAll={onOpenAllObligations} />
        {totalOpen > 0 ? (
          <p className="rounded-md border border-divider-subtle p-4 text-center text-sm text-text-secondary">
            <Trans>Nothing due this week.</Trans>{' '}
            <Button
              variant="link"
              size="sm"
              className="px-0 align-baseline"
              onClick={onOpenAllObligations}
            >
              <Plural value={totalOpen} one="View # open deadline" other="View # open deadlines" />
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          </p>
        ) : canRunMigration ? (
          // 2026-05-28 (Yuqi /today polish): empty state refined to
          // follow the design system —
          //   • title + description split (was crammed into title)
          //   • CalendarIcon at the top echoes the page's Today icon
          //   • CTA dropped from primary → outline so Dify Blue stays
          //     reserved for the ONE next action per surface (synthesis
          //     §2 taste principle #2: "one accent, one viewport, one
          //     action"). Empty-state CTA is helpful but not the
          //     primary path on Today.
          //
          // 2026-05-29 (Yuqi /today follow-up — "the empty state - there
          // is a difference between no clients and no deadline"): split
          // the zero-obligations message into two distinct states.
          //   • No clients: "No clients yet" + Import CTA — the fresh-
          //     practice path. The user needs data; importing is the
          //     correct next action.
          //   • Has clients, no deadlines: "No active deadlines yet" +
          //     guidance toward Rule Library — the post-import path
          //     where the user already imported but their rules
          //     haven't generated future deadlines (could be
          //     monitoring start date is in the past, or all rules
          //     are still pending review). Pointing them at /clients
          //     to verify state is the right move; importing again
          //     would create dupes.
          hasClients ? (
            <SharedEmptyState
              icon={CalendarIcon}
              title={<Trans>No active deadlines yet</Trans>}
              description={
                <Trans>
                  Your clients are imported, but no future deadlines have been generated. Check
                  client filing profiles or Rule Library for what's pending.
                </Trans>
              }
              cta={
                <Button size="sm" variant="outline" onClick={onOpenAllObligations}>
                  <Trans>View deadlines</Trans>
                </Button>
              }
            />
          ) : (
            <SharedEmptyState
              icon={CalendarIcon}
              title={<Trans>No clients yet</Trans>}
              description={
                <Trans>Import your client list to start tracking filing deadlines.</Trans>
              }
              cta={
                <Button size="sm" variant="outline" onClick={onOpenWizard}>
                  <Trans>Import clients</Trans>
                </Button>
              }
            />
          )
        ) : (
          <p className="rounded-md border border-divider-subtle p-4 text-center text-sm text-text-secondary">
            {/* 2026-05-26 (Step 7 onboarding audit F9-08):
                "Next deadline appears here when one's within a
                week" used an awkward "one's" contraction.
                Rewrote with "it's" for natural read. */}
            <Trans>You're caught up. The next deadline appears here when it's within a week.</Trans>
          </p>
        )}
      </section>
    )
  }

  // Partition the (already priority-sorted) rows into severity bands.
  // Order is fixed critical → high → upcoming so the most urgent band
  // always sits at the top of the eye line; empty bands are dropped so
  // a calm week doesn't render three empty headers.
  // Caption spells out, in plain CPA language, what each tier *means* to
  // do — so the page tells the user what's most important vs. secondary,
  // not just which color it is.
  const severityBands = (
    [
      { key: 'critical', label: t`Critical`, caption: t`Needs action now` },
      { key: 'high', label: t`High priority`, caption: t`On deck this week` },
      { key: 'upcoming', label: t`Upcoming`, caption: t`Plan ahead` },
    ] satisfies ReadonlyArray<{ key: SeverityBandKey; label: string; caption: string }>
  )
    .map((band) => ({
      ...band,
      rows: visible.filter((row) => severityBandKey(row.severity) === band.key),
    }))
    .filter((band) => band.rows.length > 0)

  return (
    <section aria-label={t`Actions this week`} className="flex flex-col gap-3">
      <ActionsListHeader count={totalThisWeek} onOpenAll={onOpenAllObligations} />
      {summaryStrip}
      {/* 2026-06-03 (Yuqi — severity bands): rows are grouped under
          Critical / High priority / Upcoming headers (colored dot +
          tinted label + count) so the shape of the week reads at a
          glance. Within a band, action rows keep the borderless rhythm
          (`gap-0.5` + hover-bg) — the band header and the per-row left
          rail carry the urgency cue instead of a table frame. */}
      <div className="flex flex-col gap-4">
        {severityBands.map((band) => {
          const style = SEVERITY_BAND_STYLE[band.key]
          return (
            <div key={band.key} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-3">
                <span className={cn('size-2 shrink-0 rounded-full', style.dot)} aria-hidden />
                <h3
                  className={cn('text-xs font-semibold uppercase tracking-[0.08em]', style.label)}
                >
                  {band.label}
                </h3>
                <span aria-hidden className="text-text-tertiary/60">
                  ·
                </span>
                {/* Plain-language tier meaning — the line that actually
                    tells the CPA how urgent this band is. */}
                <span className="text-xs text-text-secondary">{band.caption}</span>
                <span className="ml-auto text-xs font-medium tabular-nums text-text-tertiary">
                  {band.rows.length}
                </span>
              </div>
              <ul className="flex flex-col gap-0.5">
                {band.rows.map((row) => (
                  <li key={row.obligationId}>
                    <ActionRow
                      row={row}
                      asOfDate={asOfDate}
                      internalDeadlineOffsetDays={internalDeadlineOffsetDays}
                      expanded={hoveredId === row.obligationId}
                      onHoverChange={(hovered) => {
                        if (hovered) setHoveredId(row.obligationId)
                        else
                          setHoveredId((current) => (current === row.obligationId ? null : current))
                      }}
                      onOpenObligation={() => onOpenObligation(row)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      {/* 2026-05-26 (Yuqi /today feedback): "… N more in the queue"
          caption removed. The section already has a "View all
          deadlines" link in its header (see ActionsListHeader); the
          footer caption was duplicate-pointing to the same
          destination. The truncation itself is communicated
          implicitly — the count in the header tells the user how
          many TOTAL deadlines exist this week. */}
    </section>
  )
}

function ActionsListHeader({ count, onOpenAll }: { count: number | null; onOpenAll: () => void }) {
  return (
    // 2026-05-25 (Yuqi Today follow-up — clarification): h2 is
    // LEFT-aligned with the "All deadlines" link justify-between on
    // the right. Earlier centring attempt (grid 1fr/auto/1fr) was
    // misreading Yuqi's note — she meant the row should sit on the
    // left, with the title/count/caption sharing one visual midline
    // (`items-center`, not `items-baseline`).
    // 2026-05-27 (Yuqi feedback "px-3 is to the actions this week title,
    // and the three card columns row"): px-3 lives on the heading row +
    // tile row only, NOT on the section as a whole. Action rows below
    // stay flush so the arrow column reads as a visual anchor.
    <div className="flex items-center justify-between gap-3 px-3">
      {/* 2026-05-25 (Yuqi #27 + Today follow-up): sort order was
          implicit ("list is ordered by Smart Priority desc"). Surfaced
          inline as "Sorted by priority" so the CPA knows why row 3 is
          below row 2. The Info icon next to the sort caption tells the
          reader the sort isn't arbitrary — there's documented logic
          behind it (the title attribute carries the short
          explanation; the full breakdown lives in the obligation's
          Smart Priority panel). Quiet caption so it doesn't compete
          with the h2. */}
      {/* 2026-05-25 (Yuqi Today #1 — second pass): h2 dropped from
          text-xl → text-lg. Yuqi flagged the page as "too much bold
          and medium text" again — keeping `font-semibold` for the
          single anchor per section, but stepping down a scale
          tier so the heading doesn't shout next to a quieter
          body. Same change made to the "Alerts" h2 in
          needs-attention-section.tsx. */}
      <h2 className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-lg font-semibold tracking-tight text-text-primary">
        {/* 2026-05-27 (Yuqi feedback "write 10 Actions this week, the
            numbers are part of the title"): count prefix is now part
            of the heading string itself (same type-style as "Actions
            this week"). Matches the "4 Alerts" pattern on the section
            above. When count is 0/null, the bare phrase shows. */}
        <span className="inline-flex items-center gap-2 tabular-nums">
          {count !== null && count > 0 ? (
            <Trans>{count} Actions this week</Trans>
          ) : (
            <Trans>Actions this week</Trans>
          )}
        </span>
        {/* 2026-05-25 (info-icon audit): the bare `<span title=…>
            <Info /></span>` non-focusable affordance becomes a
            real ConceptHelp popover. Standardizes on the
            canonical CircleHelpIcon + Popover treatment used
            everywhere else in the app, and routes through the
            typed `smartPriority` concept entry so the copy
            lives in one place. */}
        <span className="inline-flex items-center gap-1 text-caption font-normal text-text-tertiary">
          <Trans>· sorted by priority</Trans>
          <ConceptHelp concept="smartPriority" />
        </span>
      </h2>
      {/* 2026-05-25 (Yuqi typography rebalance): link demoted to
          text-sm tertiary, same treatment as the Alerts "View all"
          link. "All deadlines" is a navigation hint, not a primary
          action.
          2026-05-25 (Yuqi Today #4 + #5): ArrowUpRight icon dropped
          (same change as the "View all alerts" link above) and
          text scale stepped down to text-xs text-text-muted so
          both nav-hint links read at exactly the same weight. */}
      {/* 2026-05-31 (Yuqi DS-first revision): now uses the
          canonical `<TextLink>` primitive instead of a hand-rolled
          Link with text-muted/hover/focus classes. Rendered as a
          React Router Link via the render prop. */}
      <TextLink
        render={
          <Link
            to="/deadlines"
            onClick={(event) => {
              event.preventDefault()
              onOpenAll()
            }}
          />
        }
      >
        <Trans>All deadlines</Trans>
      </TextLink>
    </div>
  )
}

export { DashboardActionsList, daysUntilDueFromAsOf }
