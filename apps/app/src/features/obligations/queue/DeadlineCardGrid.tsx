import { useMemo } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { CircleDollarSignIcon, HourglassIcon } from 'lucide-react'

import type { ObligationQueueRow } from '@duedatehq/contracts'
import type { ObligationStatus } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'
import { isRejectionVisible, RejectionChip } from '@/features/obligations/rejection-chip'
import { paymentOverdueDays } from '@/features/obligations/payment-overdue'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { CountPill } from '@/components/primitives/count-pill'
import { useCurrentUserName } from '@/lib/use-current-user-name'
import { formatDatePretty } from '@/lib/utils'

/**
 * The /deadlines CARD view — the signature default that mirrors the
 * /clients portfolio cards: each obligation is a compact tile in an
 * urgency swim lane (Overdue → Due today → Due this week → Upcoming →
 * Filed), with the days-to-deadline as one BOLD numeral whose colour is
 * the card's only urgency tone. The registry table stays one toggle away.
 *
 * Settled rows (done / paid / completed) are parked in a calm "Filed" lane
 * — NOT scattered as red cards through the urgent lanes — so the active
 * lanes show only work that still needs a hand.
 */

// The "settled" cluster (the success-green statuses). These are done; they
// never show a red countdown and live in their own Filed lane.
const SETTLED_STATUSES = new Set<ObligationStatus>(['done', 'paid', 'completed'])

type LaneKey = 'overdue' | 'today' | 'week' | 'upcoming' | 'filed'

const LANE_ORDER: readonly LaneKey[] = ['overdue', 'today', 'week', 'upcoming', 'filed']

function laneOf(row: ObligationQueueRow): LaneKey {
  if (SETTLED_STATUSES.has(row.status)) return 'filed'
  const days = row.daysUntilDue
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 7) return 'week'
  return 'upcoming'
}

function entityLabel(type: ObligationQueueRow['clientEntityType']): string {
  switch (type) {
    case 'llc':
      return 'LLC'
    case 's_corp':
      return 'S corp'
    case 'c_corp':
      return 'C corp'
    case 'partnership':
      return 'Partnership'
    case 'sole_prop':
      return 'Sole prop'
    case 'trust':
      return 'Trust'
    case 'individual':
      return 'Individual'
    default:
      return 'Other'
  }
}

export function DeadlineCardGrid({
  rows,
  isLoading,
  onOpen,
}: {
  rows: ObligationQueueRow[]
  isLoading: boolean
  onOpen: (obligationId: string) => void
}) {
  const { t } = useLingui()
  const currentUserName = useCurrentUserName()

  const lanes = useMemo(() => {
    const buckets: Record<LaneKey, ObligationQueueRow[]> = {
      overdue: [],
      today: [],
      week: [],
      upcoming: [],
      filed: [],
    }
    for (const row of rows) buckets[laneOf(row)].push(row)
    // Soonest-first within each active lane (most-overdue first in Overdue);
    // the Filed lane reads most-recently-due first.
    const byDueAsc = (a: ObligationQueueRow, b: ObligationQueueRow) =>
      a.daysUntilDue - b.daysUntilDue
    buckets.overdue.sort(byDueAsc)
    buckets.today.sort(byDueAsc)
    buckets.week.sort(byDueAsc)
    buckets.upcoming.sort(byDueAsc)
    buckets.filed.sort((a, b) => b.daysUntilDue - a.daysUntilDue)
    return LANE_ORDER.map((key) => ({ key, rows: buckets[key] })).filter(
      (lane) => lane.rows.length > 0,
    )
  }, [rows])

  const laneLabel = (key: LaneKey) =>
    key === 'overdue'
      ? t`Overdue`
      : key === 'today'
        ? t`Due today`
        : key === 'week'
          ? t`Due this week`
          : key === 'upcoming'
            ? t`Upcoming`
            : t`Filed`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Gray well so the white cards separate from the page (border + bg
          contrast does the lift — no shadows). The well is the scroll
          region, mirroring /clients. */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-background-section p-4">
        {isLoading ? (
          <DeadlineCardGridSkeleton />
        ) : rows.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-divider-regular text-sm text-text-secondary">
            <Trans>No deadlines match these filters</Trans>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {lanes.map((lane) => (
              <section key={lane.key} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 px-0.5">
                  <CapsFieldLabel as="h3" variant="group">
                    {laneLabel(lane.key)}
                  </CapsFieldLabel>
                  {/* text-caption-xs (11px) so the count matches the lane label's
                      size (Yuqi 2026-06-23: "same text size as OVERDUE"). */}
                  <CountPill tone="neutral" className="text-caption-xs">
                    {lane.rows.length}
                  </CountPill>
                </div>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                  {lane.rows.map((row) => (
                    <DeadlineCard
                      key={row.id}
                      row={row}
                      currentUserName={currentUserName}
                      onOpen={onOpen}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DeadlineCard({
  row,
  currentUserName,
  onOpen,
}: {
  row: ObligationQueueRow
  currentUserName: string | null
  onOpen: (obligationId: string) => void
}) {
  const { t } = useLingui()
  const settled = SETTLED_STATUSES.has(row.status)
  const days = row.daysUntilDue
  const dueIso = row.filingDueDate ?? row.currentDueDate

  // The hero numeral's colour is the card's ONLY urgency tone (red late ·
  // amber due-soon · neutral comfortable). Settled rows never go red.
  const heroTone = settled
    ? 'text-text-secondary'
    : days < 0
      ? 'text-text-destructive'
      : days <= 7
        ? 'text-text-warning'
        : 'text-text-primary'

  const assigneeName = row.assigneeName
  const isMine =
    currentUserName !== null &&
    assigneeName !== null &&
    assigneeName.trim().toLowerCase() === currentUserName.toLowerCase()

  // Triage signals that the status pill alone doesn't carry, so a CPA can
  // act from the card without opening the table. (Blocked is omitted — the
  // status pill already reads "Blocked".) Reuses the table's exact
  // visibility predicates so cards + table never disagree.
  const showRejection = isRejectionVisible({
    status: row.status,
    efileRejectedAt: row.efileRejectedAt,
  })
  const paymentLateDays = paymentOverdueDays(row, Date.now())
  const awaitingSignature = row.status === 'done' && row.efileState === 'authorization_requested'

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={t`Open ${row.clientName} ${row.taxType} deadline`}
      onClick={() => onOpen(row.id)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onOpen(row.id)
      }}
      className={cn(
        // Hover = a quiet accent WASH only (Yuqi 2026-06-23: "hate the border" on
        // hover) — the base border stays put, no darkening; matches the app's
        // interactive-row hover motif (accent tint + the name underline below).
        'group/card flex cursor-pointer flex-col gap-2 rounded-xl border border-divider-regular bg-background-default p-3 outline-none transition-colors',
        'hover:bg-state-accent-hover',
        'focus-visible:border-state-accent-solid focus-visible:bg-state-accent-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
      )}
    >
      {/* Identity: client monogram · name + form/jurisdiction/entity · owner */}
      <div className="flex items-start gap-2.5">
        <AssigneeAvatar name={row.clientName} shape="square" size="md" title={row.clientName} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3
            className="truncate text-sm font-medium text-text-primary group-hover/card:underline"
            title={row.clientName}
          >
            {row.clientName}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <TaxCodeBadge code={row.taxType} />
            {row.clientState ? (
              <Badge variant="outline" className="text-xs font-normal tabular-nums">
                {row.clientState}
              </Badge>
            ) : null}
            <span className="text-xs text-text-tertiary">{entityLabel(row.clientEntityType)}</span>
          </div>
        </div>
        <AssigneeAvatar
          name={assigneeName}
          isMine={isMine}
          size="sm"
          title={
            assigneeName === null
              ? t`Unassigned`
              : isMine
                ? t`Assigned to you (${assigneeName})`
                : assigneeName
          }
          className="shrink-0"
        />
      </div>

      {/* Countdown hero (pinned to the bottom of equal-height cards) — bold
          days-to-deadline numeral (active rows) or a calm due date (filed
          rows), with quiet triage-signal icons + the status pill on the right. */}
      <div className="mt-auto flex items-end justify-between gap-2 border-t border-divider-subtle pt-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          {settled ? (
            <span className="text-sm font-medium text-text-secondary">
              {t`Due`} {formatDatePretty(dueIso)}
            </span>
          ) : days === 0 ? (
            <>
              <span className={cn('text-lg font-semibold tracking-tight', heroTone)}>
                <Trans>Due today</Trans>
              </span>
              <span className="text-xs tabular-nums text-text-tertiary">
                {formatDatePretty(dueIso)}
              </span>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    'text-stat-value font-semibold leading-none tracking-tight tabular-nums',
                    heroTone,
                  )}
                >
                  {Math.abs(days)}
                </span>
                <span className="text-xs text-text-tertiary">
                  {days < 0
                    ? Math.abs(days) === 1
                      ? t`day late`
                      : t`days late`
                    : days === 1
                      ? t`day left`
                      : t`days left`}
                </span>
              </div>
              <span className="text-xs tabular-nums text-text-tertiary">
                {t`Due`} {formatDatePretty(dueIso)}
              </span>
            </>
          )}
        </div>
        {/* Triage signals the status pill can't carry, rendered as QUIET
            icons (not red badges) so a grid never reads as a wall of red:
            payment overdue ($, amber) · awaiting client signature
            (hourglass) · e-file rejected (the canonical compact chip). */}
        <div className="flex shrink-0 items-center gap-1">
          {showRejection ? <RejectionChip compact /> : null}
          {paymentLateDays !== null ? (
            <span
              className="inline-flex size-5 items-center justify-center text-text-warning"
              title={t`Authority payment ${paymentLateDays}d overdue — penalty interest accrues until it's confirmed.`}
              aria-label={t`Payment ${paymentLateDays} days overdue`}
            >
              <CircleDollarSignIcon className="size-4" aria-hidden />
            </span>
          ) : null}
          {awaitingSignature ? (
            <span
              className="inline-flex size-5 items-center justify-center text-text-tertiary"
              title={t`Filed, but the client hasn't signed Form 8879 yet.`}
              aria-label={t`Awaiting signature`}
            >
              <HourglassIcon className="size-4" aria-hidden />
            </span>
          ) : null}
          <ObligationStatusReadBadge status={row.status} />
        </div>
      </div>
    </article>
  )
}

function DeadlineCardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-xl border border-divider-regular bg-background-default p-3"
        >
          <div className="flex items-start gap-2.5">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}
