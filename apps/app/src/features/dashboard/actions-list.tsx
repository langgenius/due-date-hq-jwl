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
  onClick,
}: {
  row: DashboardTopRow
  asOfDate: string | null
  onClick: () => void
}) {
  const { t } = useLingui()
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  const prompt = actionPromptFor(row, asOfDate)
  const urgencyText = days < 0 ? t`${-days}d late` : days === 0 ? t`due today` : t`due in ${days}d`
  const urgencyTone =
    days < 0 ? 'text-text-destructive' : days <= 2 ? 'text-text-warning' : 'text-text-tertiary'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t`${prompt} for ${row.clientName}`}
      className="group flex w-full items-baseline gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-background-default-hover focus-visible:bg-background-default-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
    >
      <ArrowRightIcon
        className="size-3 shrink-0 self-center text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary"
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">
        <span className="text-sm font-medium text-text-primary">{prompt} for </span>
        <span className="text-sm font-medium text-text-primary">{row.clientName}</span>
      </span>
      <span className={cn('shrink-0 font-mono text-xs tabular-nums', urgencyTone)}>
        {urgencyText}
      </span>
      <span className="shrink-0 font-mono text-xs tabular-nums text-text-tertiary">
        {row.estimatedExposureCents !== null && row.exposureStatus === 'ready'
          ? formatCents(row.estimatedExposureCents)
          : t`needs input`}
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
            <ActionLine row={row} asOfDate={asOfDate} onClick={() => onOpenObligation(row)} />
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
