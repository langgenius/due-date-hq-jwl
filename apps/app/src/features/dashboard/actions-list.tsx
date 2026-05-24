import { useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, ArrowUpRightIcon, FileSearchIcon, Info } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardTopRow, ObligationStatus } from '@duedatehq/contracts'
import { BadgeStatusDot, badgeVariants } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { formatDatePretty } from '@/lib/utils'
import {
  STATUS_DOT,
  STATUS_VARIANT,
  useLifecycleV2StatusLabels,
} from '@/features/obligations/status-control'

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
const DASHBOARD_TERMINAL_STATUSES: ReadonlySet<ObligationStatus> = new Set([
  'done',
  'paid',
  'completed',
])

function RowMeta({ days, status }: { days: number; status: ObligationStatus }) {
  if (DASHBOARD_TERMINAL_STATUSES.has(status)) {
    if (days === 0) return null
    return (
      <span className="flex shrink-0 items-baseline whitespace-nowrap text-base tabular-nums">
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
    <span className="flex shrink-0 items-baseline whitespace-nowrap text-base tabular-nums">
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
  const statusLabels = useLifecycleV2StatusLabels()
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
      className="flex flex-col"
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
          'group flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
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
          whole row container handles expansion via hover/focus). */}
        <ArrowRightIcon
          className={cn(
            'size-3.5 shrink-0 text-text-tertiary transition-transform',
            expanded && 'rotate-90 text-text-primary',
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
        <span className="shrink-0 truncate text-base font-semibold text-text-primary">
          {row.clientName}
        </span>
        <span aria-hidden className="text-text-tertiary">
          ·
        </span>
        <span className="min-w-0 flex-1 truncate text-base text-text-secondary">{prompt}</span>
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
        <RowMeta days={days} status={row.status} />
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
            className="grid w-full cursor-pointer gap-3 rounded-b-md bg-background-subtle px-4 pt-3 pb-4 text-left text-base transition-colors hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-2">
              {/* 2026-05-25 (Yuqi follow-up): "Action" row added as the
                  FIRST item in the expansion panel. The action prompt
                  also sits inline on the collapsed row's heading line,
                  but Yuqi flagged that when a row is expanded the
                  prompt feels missing — the eye lands on the dl items
                  (Status / Form / Sources / Why now) and the
                  "what should I do" line gets lost in the cluster
                  above. Repeating it here, prominently, as the first
                  item with a distinct accent treatment, makes the
                  CTA unmissable when the user has opened the row. */}
              <dt className="text-text-tertiary">
                <Trans>Action</Trans>
              </dt>
              <dd className="font-medium text-text-primary">{prompt}</dd>

              {/* 2026-05-25 (Yuqi Today #33): show INTERNAL and
                  OFFICIAL deadlines on one line in the expansion
                  panel. The collapsed row's RowMeta shows "in 3d"
                  / "5d late" which answers "how soon" — but the
                  CPA opening this panel wants the absolute dates to
                  plan the week. Internal first (it's the date the
                  CPA actually works against); official second as
                  the statutory reality. Both shown as prose
                  ("May 6, 2026") via formatDatePretty. */}
              <dt className="text-text-tertiary">
                <Trans>Deadlines</Trans>
              </dt>
              <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-text-primary tabular-nums">
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
              </dd>

              <dt className="text-text-tertiary">
                <Trans>Status</Trans>
              </dt>
              <dd>
                {/* Mirror the obligation queue's status pill — same
                  badge variant + dot tone via the canonical maps. The
                  expanded panel is itself a click target, so this
                  renders as a non-interactive span (a nested button
                  would break the parent click semantics). */}
                <span
                  className={cn(
                    badgeVariants({ variant: STATUS_VARIANT[row.status] }),
                    'h-6 text-xs',
                  )}
                >
                  <BadgeStatusDot tone={STATUS_DOT[row.status]} />
                  {statusLabels[row.status]}
                </span>
              </dd>

              <dt className="text-text-tertiary">
                <Trans>Form</Trans>
              </dt>
              <dd className="text-text-primary">
                <TaxCodeLabel code={row.taxType} asChild />
              </dd>

              <dt className="text-text-tertiary">
                <Trans>Sources</Trans>
              </dt>
              <dd className="text-text-primary tabular-nums">
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

// Compact summary tile that sits inside the Actions this week header.
// Moved here from the standalone ExposureStrip (Yuqi #5) — same
// week scope, same data set, so the three counts now read as the
// section's summary header rather than a sibling row above it.
function ActionsSummaryTile({
  value,
  label,
  href,
  tone,
}: {
  value: string
  label: string
  href: string
  tone: 'neutral' | 'critical'
}) {
  return (
    <Link
      to={href}
      className={cn(
        'group flex min-w-[160px] flex-col gap-1 rounded-md border border-divider-subtle bg-background-default px-4 py-3 transition-colors hover:border-divider-regular hover:bg-background-default-hover',
      )}
    >
      <span
        className={cn(
          'text-xl font-semibold leading-tight tabular-nums tracking-tight',
          tone === 'critical' ? 'text-text-destructive' : 'text-text-primary',
        )}
      >
        {value}
      </span>
      <span className="text-base text-text-secondary">{label}</span>
    </Link>
  )
}

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
  onOpenWizard: () => void
  onOpenObligation: (row: DashboardTopRow) => void
  onOpenAllObligations: () => void
  needDecisionCount: number
  blockedCount: number
  waitingOnClientCount: number
}) {
  const { t } = useLingui()
  const VISIBLE_CAP = 10
  const visible = rows.slice(0, VISIBLE_CAP)
  const overflow = Math.max(totalThisWeek - visible.length, 0)
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
  const summaryTiles: Array<{
    value: string
    label: string
    href: string
    tone: 'neutral' | 'critical'
  }> = []
  if (needDecisionCount > 0) {
    summaryTiles.push({
      value: String(needDecisionCount),
      label: t`In review`,
      href: '/deadlines?status=review',
      tone: 'neutral',
    })
  }
  if (blockedCount > 0) {
    summaryTiles.push({
      value: String(blockedCount),
      label: t`Blocked`,
      href: '/deadlines?status=blocked',
      tone: 'critical',
    })
  }
  if (waitingOnClientCount > 0) {
    summaryTiles.push({
      value: String(waitingOnClientCount),
      label: t`Waiting on client`,
      href: '/deadlines?status=waiting_on_client',
      tone: 'neutral',
    })
  }
  const summaryStrip =
    summaryTiles.length > 0 ? (
      <div className="flex flex-wrap gap-3">
        {summaryTiles.map((tile) => (
          <ActionsSummaryTile key={tile.href} {...tile} />
        ))}
      </div>
    ) : null

  if (isLoading) {
    return (
      <section aria-label={t`Actions this week`} className="flex flex-col gap-4">
        <SectionHeader count={null} onOpenAll={onOpenAllObligations} />
        <div className="flex flex-wrap gap-3">
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
      <section aria-label={t`Actions this week`} className="flex flex-col gap-4">
        <SectionHeader count={0} onOpenAll={onOpenAllObligations} />
        <p className="rounded-md border border-divider-subtle px-4 py-6 text-center text-base text-text-secondary">
          {totalOpen > 0 ? (
            <>
              <Trans>Nothing due this week.</Trans>{' '}
              <Button
                variant="link"
                size="sm"
                className="px-0 align-baseline"
                onClick={onOpenAllObligations}
              >
                <Plural
                  value={totalOpen}
                  one="View # open obligation"
                  other="View # open obligations"
                />
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
            </>
          ) : canRunMigration ? (
            <>
              <Trans>No deadlines yet. Import clients to get started.</Trans>{' '}
              <Button
                variant="link"
                size="sm"
                className="px-0 align-baseline"
                onClick={onOpenWizard}
              >
                <FileSearchIcon data-icon="inline-start" />
                <Trans>Import clients</Trans>
              </Button>
            </>
          ) : (
            <Trans>You're caught up. Next deadline appears here when one's within a week.</Trans>
          )}
        </p>
      </section>
    )
  }

  return (
    <section aria-label={t`Actions this week`} className="flex flex-col gap-4">
      <SectionHeader count={totalThisWeek} onOpenAll={onOpenAllObligations} />
      {summaryStrip}
      <ul className="flex flex-col gap-0.5">
        {visible.map((row) => (
          <li key={row.obligationId} className="border-b border-divider-subtle last:border-b-0">
            <ActionRow
              row={row}
              asOfDate={asOfDate}
              internalDeadlineOffsetDays={internalDeadlineOffsetDays}
              expanded={hoveredId === row.obligationId}
              onHoverChange={(hovered) => {
                if (hovered) setHoveredId(row.obligationId)
                else setHoveredId((current) => (current === row.obligationId ? null : current))
              }}
              onOpenObligation={() => onOpenObligation(row)}
            />
          </li>
        ))}
      </ul>
      {overflow > 0 ? (
        <p className="text-base text-text-tertiary">
          <Plural value={overflow} one="… # more in the queue" other="… # more in the queue" />
        </p>
      ) : null}
    </section>
  )
}

function SectionHeader({ count, onOpenAll }: { count: number | null; onOpenAll: () => void }) {
  const { t } = useLingui()
  return (
    // 2026-05-25 (Yuqi Today follow-up — clarification): h2 is
    // LEFT-aligned with the "All deadlines" link justify-between on
    // the right. Earlier centring attempt (grid 1fr/auto/1fr) was
    // misreading Yuqi's note — she meant the row should sit on the
    // left, with the title/count/caption sharing one visual midline
    // (`items-center`, not `items-baseline`).
    <div className="flex items-center justify-between gap-3">
      {/* 2026-05-25 (Yuqi #27 + Today follow-up): sort order was
          implicit ("list is ordered by Smart Priority desc"). Surfaced
          inline as "Sorted by priority" so the CPA knows why row 3 is
          below row 2. The Info icon next to the sort caption tells the
          reader the sort isn't arbitrary — there's documented logic
          behind it (the title attribute carries the short
          explanation; the full breakdown lives in the obligation's
          Smart Priority panel). Quiet caption so it doesn't compete
          with the h2. */}
      <h2 className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xl font-semibold tracking-tight text-text-primary">
        <span className="inline-flex items-center gap-2">
          <Trans>Actions this week</Trans>
          {count !== null && count > 0 ? (
            <span className="text-base font-normal tabular-nums text-text-tertiary">{count}</span>
          ) : null}
        </span>
        <span
          className="inline-flex items-center gap-1 text-caption font-normal text-text-tertiary"
          title={t`Sorted by Smart Priority — urgency × penalty × dependency. Open a row to see its factors.`}
        >
          <Trans>· sorted by priority</Trans>
          <Info className="size-3" aria-hidden />
        </span>
      </h2>
      {/* 2026-05-25 (Yuqi #7): icon rotates 45° on hover so the
          up-right arrow points straight right — a tactile "follow
          this link" cue. Same pattern as the Alerts "View all"
          link on Today. */}
      <Link
        to="/deadlines"
        onClick={(event) => {
          event.preventDefault()
          onOpenAll()
        }}
        className="group/all-deadlines inline-flex items-center gap-1 text-base text-text-secondary hover:text-text-primary"
      >
        <Trans>All deadlines</Trans>
        <ArrowUpRightIcon
          className="size-3.5 transition-transform duration-200 group-hover/all-deadlines:rotate-45"
          aria-hidden
        />
      </Link>
    </div>
  )
}

export { DashboardActionsList, daysUntilDueFromAsOf }
