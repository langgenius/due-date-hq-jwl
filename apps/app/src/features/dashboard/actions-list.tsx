import { useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, ArrowUpRightIcon, FileSearchIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardTopRow } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { TaxCodeLabel } from '@/components/primitives/tax-code-label'

function statusLabel(status: DashboardTopRow['status']): string {
  switch (status) {
    case 'pending':
      return 'Not started'
    case 'in_progress':
      return 'In progress'
    case 'waiting_on_client':
      return 'Waiting on client'
    case 'blocked':
      return 'Blocked'
    case 'review':
      return 'In review'
    case 'completed':
      return 'Completed'
    default:
      return status
  }
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
//   - The Review button on the right opens the obligation drawer
//     in place via the parent's onOpenObligation handler.
//   - Row meta is just the time signal ("3d late" / "today" /
//     "in 2d"). No dollar amounts.

function daysUntilDueFromAsOf(currentDueDate: string, asOfDate: string | null): number {
  if (!asOfDate) return 0
  const due = new Date(currentDueDate).getTime()
  const as = new Date(asOfDate).getTime()
  return Math.round((due - as) / (1000 * 60 * 60 * 24))
}

function actionPromptFor(row: DashboardTopRow, asOfDate: string | null): string {
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  if (row.status === 'waiting_on_client') return 'Follow up for client materials'
  if (row.evidenceCount === 0) return 'Attach a source before review'
  if (row.exposureStatus === 'needs_input') return 'Add penalty inputs before ranking by risk'
  if (row.status === 'review') return 'Complete CPA review and close the row'
  if (days <= 0) return 'Confirm filing or payment status today'
  if (days <= 2) return 'Verify owner, source, and filing cutoff'
  return 'Open evidence and confirm the source still matches'
}

function RowMeta({ days }: { days: number }) {
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
  expanded,
  onHoverChange,
  onOpenObligation,
}: {
  row: DashboardTopRow
  asOfDate: string | null
  expanded: boolean
  onHoverChange: (hovered: boolean) => void
  onOpenObligation: () => void
}) {
  const { t } = useLingui()
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  const prompt = actionPromptFor(row, asOfDate)
  const factors = topPriorityFactors(row)
  const detailId = `action-detail-${row.obligationId}`

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
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          onHoverChange(false)
        }
      }}
      className="flex flex-col"
    >
      <div
        role="group"
        aria-label={t`${prompt} for ${row.clientName}`}
        aria-expanded={expanded}
        aria-controls={detailId}
        className={cn(
          'group grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2.5 text-left transition-colors',
          // Background drives off the expanded state, not hover, so
          // the row and the panel below read as a single block. When
          // collapsed, the row stays transparent (chrome quiet at
          // rest); when expanded, the row picks up the same bg as
          // the panel for visual continuity.
          expanded ? 'rounded-t-md bg-background-subtle' : 'rounded-md',
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
        <span className="inline-flex shrink-0 items-center rounded-sm border border-divider-subtle bg-background-subtle px-2 py-0.5 text-sm text-text-secondary">
          {row.clientName}
        </span>
        <span className="truncate text-base text-text-primary">{prompt}</span>
        <RowMeta days={days} />
        {/* Review button — only shown when the row is hovered/focused
          (i.e. `expanded`). Keeps the row chrome quiet at rest and
          surfaces the action right when the user is intent on this
          row. The reserved grid slot stays via `invisible`-vs-flow
          so the row layout doesn't shift on hover. */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'transition-opacity',
            expanded ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          tabIndex={expanded ? 0 : -1}
          aria-hidden={!expanded}
          onClick={(event) => {
            event.stopPropagation()
            onOpenObligation()
          }}
        >
          <Trans>Review</Trans>
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>

      {/* Inline expansion — sits inside the same wrapper as the row,
        so onMouseLeave doesn't trigger when the cursor crosses from
        the row into the expansion panel. The whole panel is a click
        target that opens the obligation drawer — same action as the
        Review button on the right, but with a much bigger hit area
        once the row is already open. */}
      {expanded ? (
        <button
          type="button"
          id={detailId}
          onClick={onOpenObligation}
          aria-label={t`Review ${row.clientName} in obligation drawer`}
          // Panel sits flush against the row above — top corners
          // squared, bottom rounded. Same bg as the row when
          // expanded so the two read as a single block. Hover state
          // darkens slightly to signal "this is the click target."
          className="grid w-full cursor-pointer gap-3 rounded-b-md bg-background-subtle px-4 py-4 text-left text-base transition-colors hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-2">
            <dt className="text-text-tertiary">
              <Trans>Status</Trans>
            </dt>
            <dd className="text-text-primary">{statusLabel(row.status)}</dd>

            <dt className="text-text-tertiary">
              <Trans>Form</Trans>
            </dt>
            <dd className="text-text-primary">
              <TaxCodeLabel code={row.taxType} />
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
        </button>
      ) : null}
    </div>
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
}) {
  const { t } = useLingui()
  const VISIBLE_CAP = 10
  const visible = rows.slice(0, VISIBLE_CAP)
  const overflow = Math.max(totalThisWeek - visible.length, 0)
  // Single-row hover state. Only one row expanded at a time — mouse
  // can only physically be over one row.
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <section aria-label={t`Actions this week`} className="flex flex-col gap-4">
        <SectionHeader count={null} onOpenAll={onOpenAllObligations} />
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
    //      count and route to /obligations. Avoids the "import again"
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
              <Trans>No obligations yet. Import clients to get started.</Trans>{' '}
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
      <ul className="flex flex-col gap-0.5">
        {visible.map((row) => (
          <li key={row.obligationId} className="border-b border-divider-subtle last:border-b-0">
            <ActionRow
              row={row}
              asOfDate={asOfDate}
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
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="flex items-baseline gap-2 text-xl font-semibold tracking-tight text-text-primary">
        <Trans>Actions this week</Trans>
        {count !== null && count > 0 ? (
          <span className="text-base font-normal tabular-nums text-text-tertiary">{count}</span>
        ) : null}
      </h2>
      <Link
        to="/obligations"
        onClick={(event) => {
          event.preventDefault()
          onOpenAll()
        }}
        className="inline-flex items-center gap-1 text-base text-text-secondary hover:text-text-primary"
      >
        <Trans>All obligations</Trans>
        <ArrowUpRightIcon className="size-3.5" aria-hidden />
      </Link>
    </div>
  )
}

export { DashboardActionsList, daysUntilDueFromAsOf }
