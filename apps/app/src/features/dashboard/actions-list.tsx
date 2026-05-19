import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, ArrowUpRightIcon, FileSearchIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardTopRow } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatCents } from '@/lib/utils'

// Dashboard v2 "Actions this week" — verb-led action list that
// replaces the legacy triage table when `?dashboard=v2` is on.
// Per docs/Design/dashboard-actions-design-brief.md:
//
// - No table; no tab strip; no sort or filter controls.
// - Each line reads like a Slack message: action prompt + client +
//   urgency + risk. System-ordered by Smart Priority (already
//   ranked upstream).
// - Reuses the same nextCheck-style prompt the legacy table already
//   produced — no new verb dictionary.
// - Click sends the user into Obligations (slice A behavior). The
//   inline accordion expansion lands in slice B.

// Slice B: maps a row's current status to its forward transition —
// the "advance one step" move the primary button performs. Matches
// the lifecycle v2 vocabulary (project_status_taxonomy.md).
//   pending           → in_review   ("Start review")
//   waiting_on_client → in_review   ("Mark responded")
//   blocked           → in_review   ("Mark unblocked")
//   in_progress       → in_review   ("Send to review")  (legacy state)
//   review            → done         ("Mark filed")
//   done              → completed   ("Mark accepted")
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

function daysUntilDueFromAsOf(currentDueDate: string, asOfDate: string | null): number {
  if (!asOfDate) return 0
  const due = new Date(currentDueDate).getTime()
  const as = new Date(asOfDate).getTime()
  return Math.round((due - as) / (1000 * 60 * 60 * 24))
}

function ActionLine({
  row,
  asOfDate,
  onOpenObligation,
}: {
  row: DashboardTopRow
  asOfDate: string | null
  onOpenObligation: () => void
}) {
  const { t } = useLingui()
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  const prompt = actionPromptFor(row, asOfDate)
  const urgencyText = days < 0 ? t`${-days}d late` : days === 0 ? t`due today` : t`due in ${days}d`
  // Red is reserved for genuinely critical (>7 days past due). Amber
  // for the rest of "past due or due soon" window. Muted for future.
  const urgencyTone =
    days < -7 ? 'text-text-destructive' : days <= 2 ? 'text-text-warning' : 'text-text-tertiary'
  return (
    <button
      type="button"
      onClick={onOpenObligation}
      aria-label={t`${prompt} for ${row.clientName}`}
      // Row reshape:
      //  [Client badge] · {task}    {urgency · risk}
      // The client is now the leading anchor — visually pinned as a
      // pill so the eye scans clients first, then reads what to do
      // for each. Single click → open in the Obligations queue;
      // dashboard doesn't carry inline action state, it just routes
      // you to where the action happens.
      className="group grid w-full grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-background-default-hover focus-visible:bg-background-default-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
    >
      <ArrowRightIcon
        className="size-3 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary"
        aria-hidden
      />
      <span className="flex min-w-0 items-center gap-2">
        <span className="inline-flex shrink-0 items-center rounded-sm bg-background-subtle px-1.5 py-0.5 text-xs font-medium text-text-secondary">
          {row.clientName}
        </span>
        <span className="truncate text-sm text-text-primary">{prompt}</span>
      </span>
      <span className="inline-flex shrink-0 items-baseline gap-1.5 font-mono text-xs tabular-nums">
        <span className={cn(urgencyTone)}>{urgencyText}</span>
        <span aria-hidden className="text-text-tertiary">
          ·
        </span>
        <span className="text-text-secondary">
          {row.estimatedExposureCents !== null && row.exposureStatus === 'ready'
            ? formatCents(row.estimatedExposureCents)
            : t`needs input`}
        </span>
      </span>
    </button>
  )
}

function DashboardActionsList({
  rows,
  asOfDate,
  isLoading,
  totalThisWeek,
  canRunMigration,
  onOpenWizard,
  onOpenObligation,
  onOpenAllObligations,
}: {
  rows: DashboardTopRow[]
  asOfDate: string | null
  isLoading: boolean
  // Total this-week count (used to render "… N more" footer when capped).
  totalThisWeek: number
  canRunMigration: boolean
  onOpenWizard: () => void
  onOpenObligation: (row: DashboardTopRow) => void
  onOpenAllObligations: () => void
}) {
  const { t } = useLingui()
  const VISIBLE_CAP = 10
  const visible = rows.slice(0, VISIBLE_CAP)
  const overflow = Math.max(totalThisWeek - visible.length, 0)

  if (isLoading) {
    return (
      <section aria-label={t`Actions this week`} className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          <Trans>Actions this week</Trans>
        </h2>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </section>
    )
  }

  if (visible.length === 0) {
    return (
      <section aria-label={t`Actions this week`} className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          <Trans>Actions this week</Trans>
        </h2>
        <p className="rounded-md border border-divider-subtle px-4 py-6 text-center text-sm text-text-tertiary">
          {canRunMigration ? (
            <>
              <Trans>No obligations this week. Import clients to get started.</Trans>{' '}
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
    <section aria-label={t`Actions this week`} className="flex flex-col gap-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
        <Trans>Actions this week</Trans>
      </h2>
      <ul className="flex flex-col">
        {visible.map((row) => (
          <li key={row.obligationId} className="border-b border-divider-subtle last:border-b-0">
            <ActionLine
              row={row}
              asOfDate={asOfDate}
              onOpenObligation={() => onOpenObligation(row)}
            />
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between text-xs">
        {overflow > 0 ? (
          <span className="text-text-tertiary">
            <Plural value={overflow} one="… # more in the queue" other="… # more in the queue" />
          </span>
        ) : (
          <span />
        )}
        <Link
          to="/obligations"
          onClick={(event) => {
            event.preventDefault()
            onOpenAllObligations()
          }}
          className="inline-flex items-center gap-1 font-medium text-text-secondary hover:text-text-primary"
        >
          <Trans>Open full queue</Trans>
          <ArrowUpRightIcon className="size-3" aria-hidden />
        </Link>
      </div>
    </section>
  )
}

// Re-export the helper so other dashboard surfaces (the aggregate
// strip in slice C) can reuse the same days computation.
export { DashboardActionsList, daysUntilDueFromAsOf }
