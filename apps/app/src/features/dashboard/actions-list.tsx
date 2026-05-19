import { useEffect, useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, ArrowUpRightIcon, FileSearchIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardTopRow } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import type { ObligationStatus } from '@/features/obligations/status-control'
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
// Statuses without a sensible forward transition (extended, paid,
// not_applicable, completed) return null and the primary button is
// suppressed — only the "Open in Obligations" link is shown.
const FORWARD_TRANSITIONS: Partial<
  Record<ObligationStatus, { next: ObligationStatus; label: string }>
> = {
  pending: { next: 'review', label: 'Start review' },
  waiting_on_client: { next: 'review', label: 'Mark responded' },
  blocked: { next: 'review', label: 'Mark unblocked' },
  in_progress: { next: 'review', label: 'Send to review' },
  review: { next: 'done', label: 'Mark filed' },
  done: { next: 'completed', label: 'Mark accepted' },
}

function forwardTransitionFor(
  status: ObligationStatus,
): { next: ObligationStatus; label: string } | null {
  return FORWARD_TRANSITIONS[status] ?? null
}

// v2 display labels for the reason line. Mirrors the labels in
// status-control.tsx (`useLifecycleV2StatusLabels`) so the dashboard
// expansion speaks the same vocabulary as the queue.
const STATUS_DISPLAY_LABEL: Record<ObligationStatus, string> = {
  pending: 'Not started',
  in_progress: 'In progress',
  waiting_on_client: 'Waiting on client',
  blocked: 'Blocked',
  review: 'In review',
  done: 'Filed',
  paid: 'Paid',
  extended: 'Extended',
  completed: 'Completed',
  not_applicable: 'Not applicable',
}

function reasonLineFor(row: DashboardTopRow, asOfDate: string | null): string {
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  const lateness =
    days < 0 ? `${-days} days past due` : days === 0 ? 'due today' : `due in ${days} days`
  const label = STATUS_DISPLAY_LABEL[row.status]
  if (row.status === 'blocked')
    return `Status: ${label} · ${lateness} · waiting on upstream obligation`
  if (row.status === 'waiting_on_client')
    return `Status: ${label} · ${lateness} · send a reminder to unblock`
  if (row.evidenceCount === 0) return `Status: ${label} · ${lateness} · no source attached yet`
  if (row.exposureStatus === 'needs_input')
    return `Status: ${label} · ${lateness} · penalty inputs missing`
  return `Status: ${label} · ${lateness}`
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

function daysUntilDueFromAsOf(currentDueDate: string, asOfDate: string | null): number {
  if (!asOfDate) return 0
  const due = new Date(currentDueDate).getTime()
  const as = new Date(asOfDate).getTime()
  return Math.round((due - as) / (1000 * 60 * 60 * 24))
}

function ActionLine({
  row,
  asOfDate,
  expanded,
  dimmed,
  onToggle,
  onPrimary,
  onOpenObligation,
}: {
  row: DashboardTopRow
  asOfDate: string | null
  expanded: boolean
  dimmed: boolean
  onToggle: () => void
  onPrimary: (next: ObligationStatus) => void
  onOpenObligation: () => void
}) {
  const { t } = useLingui()
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  const prompt = actionPromptFor(row, asOfDate)
  const urgencyText = days < 0 ? t`${-days}d late` : days === 0 ? t`due today` : t`due in ${days}d`
  // Red is reserved for genuinely critical (>7 days past due). Amber
  // for the rest of "past due or due soon" window. Muted for future.
  // Avoids red-on-red-on-red overload per design call 2026-05-19.
  const urgencyTone =
    days < -7 ? 'text-text-destructive' : days <= 2 ? 'text-text-warning' : 'text-text-tertiary'
  const forward = forwardTransitionFor(row.status)
  return (
    <div
      className={cn(
        'transition-opacity',
        dimmed && !expanded && 'opacity-60',
        expanded && 'bg-background-subtle',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={t`${prompt} for ${row.clientName}`}
        // Three columns now: arrow · prompt (1fr) · meta cluster (auto).
        // Days + risk group together on the right with a soft middot
        // separator — reads as one phrase, not two columns. Avoids the
        // "4 alignment edges" table-feel the previous critique flagged.
        className="group grid w-full grid-cols-[12px_1fr_auto] items-baseline gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-background-default-hover focus-visible:bg-background-default-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        <ArrowRightIcon
          className={cn(
            'size-3 shrink-0 self-center text-text-tertiary transition-transform',
            expanded
              ? 'rotate-90 text-text-primary'
              : 'group-hover:translate-x-0.5 group-hover:text-text-primary',
          )}
          aria-hidden
        />
        <span className="min-w-0 truncate text-base font-medium text-text-primary">
          {prompt} · {row.clientName}
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
      {expanded ? (
        <div className="flex items-center justify-between gap-3 px-3 pb-3 pl-9">
          <p className="text-xs text-text-secondary">{reasonLineFor(row, asOfDate)}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            {forward ? (
              <Button
                size="sm"
                onClick={(event) => {
                  event.stopPropagation()
                  onPrimary(forward.next)
                }}
              >
                {forward.label}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                onOpenObligation()
              }}
            >
              <Trans>Open in Obligations</Trans>
              <ArrowUpRightIcon data-icon="inline-end" />
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
  onForwardTransition,
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
  // Slice B: primary-button action — advance the row's status one
  // step forward. Returns void; the dashboard route owns the
  // mutation + toast.
  onForwardTransition: (row: DashboardTopRow, next: ObligationStatus) => void
}) {
  const { t } = useLingui()
  const VISIBLE_CAP = 10
  const visible = rows.slice(0, VISIBLE_CAP)
  const overflow = Math.max(totalThisWeek - visible.length, 0)
  // Slice B: only one row is expanded at a time. Click same row to
  // collapse. Esc collapses any open row.
  const [expandedId, setExpandedId] = useState<string | null>(null)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && expandedId !== null) setExpandedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expandedId])

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
              expanded={expandedId === row.obligationId}
              dimmed={expandedId !== null && expandedId !== row.obligationId}
              onToggle={() =>
                setExpandedId((current) => (current === row.obligationId ? null : row.obligationId))
              }
              onPrimary={(next) => {
                setExpandedId(null)
                onForwardTransition(row, next)
              }}
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
