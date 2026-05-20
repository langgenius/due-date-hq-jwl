import { useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRightIcon, ChevronDownIcon, FileSearchIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardTopRow } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { formatCents } from '@/lib/utils'

// Dashboard v2 "Actions this week" — the verb-led action queue that
// replaces the legacy triage table when `?dashboard=v2` is on.
// Layout philosophy (post 2026-05-20 review #3):
//   [due pill]   Task prompt                     Risk of losing $X   [chevron]
//                Client name
//   --- expanded on click ---
//   Status / Form / Sources / Open-in-Obligations
// Task carries primary weight — what to DO is what the CPA scans for.
// Client name sits below as supporting context. The dollar amount
// rides the right edge as a phrase, not a badge.

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

// Tone for the penalty pill. Past-due with accrued penalty is the only
// case that warrants red — projected risk stays neutral so the eye
// isn't pulled to every row.
function penaltyTone(row: DashboardTopRow, days: number): 'critical' | 'neutral' | 'muted' {
  if (days < 0 && (row.accruedPenaltyCents ?? 0) > 0) return 'critical'
  if (row.exposureStatus === 'ready' && (row.estimatedExposureCents ?? 0) > 0) return 'neutral'
  return 'muted'
}

function penaltyValue(row: DashboardTopRow, days: number): string | null {
  if (days < 0 && (row.accruedPenaltyCents ?? 0) > 0) {
    return formatCents(row.accruedPenaltyCents!)
  }
  if (row.exposureStatus === 'ready' && (row.estimatedExposureCents ?? 0) > 0) {
    return formatCents(row.estimatedExposureCents!)
  }
  return null
}

// Risk meta on the right edge of the row. Written as a phrase, not
// a badge, per 2026-05-20 designer note: "no badge. say risk of
// losing $X." Past-due rows with accrued penalty color the dollar
// red; projected exposure stays neutral so the eye isn't pulled.
function RiskMeta({ row, days }: { row: DashboardTopRow; days: number }) {
  const tone = penaltyTone(row, days)
  const value = penaltyValue(row, days)
  if (!value) return <span aria-hidden />
  return (
    <span className="hidden whitespace-nowrap text-base text-text-secondary sm:inline-flex sm:items-baseline sm:gap-1">
      <Trans>Risk of losing</Trans>
      <span
        className={cn(
          'font-medium tabular-nums',
          tone === 'critical' ? 'text-text-destructive' : 'text-text-primary',
        )}
      >
        {value}
      </span>
    </span>
  )
}

function DueDatePill({ days }: { days: number }) {
  const past = days < 0
  return (
    <span
      className={cn(
        'inline-flex h-8 min-w-[92px] items-center justify-center rounded-md px-2.5 text-md tabular-nums',
        past
          ? 'bg-state-destructive-hover font-medium text-text-destructive'
          : days === 0
            ? 'bg-background-subtle font-medium text-text-primary'
            : 'border border-divider-subtle bg-background-default text-text-secondary',
      )}
    >
      {past ? (
        <Plural value={-days} one="# day late" other="# days late" />
      ) : days === 0 ? (
        <Trans>Today</Trans>
      ) : (
        <Plural value={days} one="in # day" other="in # days" />
      )}
    </span>
  )
}

function ActionRow({
  row,
  asOfDate,
  expanded,
  onToggle,
  onOpenObligation,
}: {
  row: DashboardTopRow
  asOfDate: string | null
  expanded: boolean
  onToggle: () => void
  onOpenObligation: () => void
}) {
  const { t } = useLingui()
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  const prompt = actionPromptFor(row, asOfDate)

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`action-detail-${row.obligationId}`}
        aria-label={t`${prompt} for ${row.clientName}`}
        className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-5 rounded-md px-4 py-4 text-left transition-colors hover:bg-background-default-hover focus-visible:bg-background-default-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        <DueDatePill days={days} />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-md font-medium text-text-primary">{prompt}</span>
          <span className="truncate text-base text-text-secondary">{row.clientName}</span>
        </span>
        <RiskMeta row={row} days={days} />
        <ChevronDownIcon
          className={cn(
            'size-4 shrink-0 text-text-tertiary transition-transform',
            expanded && 'rotate-180 text-text-primary',
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div
          id={`action-detail-${row.obligationId}`}
          className="mt-2 ml-3 mr-3 mb-2 grid gap-3 rounded-md border border-divider-subtle bg-background-subtle/40 px-4 py-3 text-base"
        >
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)]">
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
                  <Trans>Penalty rule</Trans>
                </dt>
                <dd className="text-text-primary">{row.penaltyFormulaLabel}</dd>
              </>
            ) : null}
          </dl>
          <div>
            <Button variant="primary" size="sm" onClick={onOpenObligation}>
              <Trans>Open in Obligations</Trans>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
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
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
    return (
      <section aria-label={t`Actions this week`} className="flex flex-col gap-4">
        <SectionHeader count={0} onOpenAll={onOpenAllObligations} />
        <p className="rounded-md border border-divider-subtle px-4 py-6 text-center text-base text-text-secondary">
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
    <section aria-label={t`Actions this week`} className="flex flex-col gap-4">
      <SectionHeader count={totalThisWeek} onOpenAll={onOpenAllObligations} />
      <ul className="flex flex-col gap-0.5">
        {visible.map((row) => (
          <li key={row.obligationId} className="border-b border-divider-subtle last:border-b-0">
            <ActionRow
              row={row}
              asOfDate={asOfDate}
              expanded={expandedId === row.obligationId}
              onToggle={() =>
                setExpandedId((id) => (id === row.obligationId ? null : row.obligationId))
              }
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
        <Trans>Open full queue</Trans>
        <ArrowUpRightIcon className="size-3.5" aria-hidden />
      </Link>
    </div>
  )
}

export { DashboardActionsList, daysUntilDueFromAsOf }
