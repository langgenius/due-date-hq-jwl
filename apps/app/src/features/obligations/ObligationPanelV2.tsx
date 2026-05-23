import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleIcon,
  CircleDotIcon,
  LinkIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { ObligationQueueRow } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import {
  LIFECYCLE_V2_STATUSES,
  STATUS_VARIANT,
  useLifecycleV2StatusLabels,
  type ObligationStatus,
} from './status-control'
import { useObligationPanelVersion } from './use-obligation-panel-version'

/**
 * Obligation Panel V2 — opt-in alternate shape (?panel=v2).
 *
 * Designed 2026-05-22. See:
 *   docs/Design/obligation-panel-v2-and-alerts-vocabulary.md
 *
 * Status: comparison prototype. The user can flip between this and the
 * existing panel via the URL `?panel=v2` flag. Both are mounted
 * simultaneously behind the dispatcher — V2 doesn't replace V1.
 *
 * V2 is intentionally feature-thin so the new shape can be evaluated
 * visually without committing to the new architecture. Status changes
 * remain in V1 for now — V2's pipeline is read-only display.
 *
 * Layout (top → bottom):
 *  1. Header (client + jurisdiction + form + tax year)
 *  2. Panel-version toggle ("← Original" link)
 *  3. Status pipeline (6 dots, dates underneath each stage)
 *  4. Active-stage card (status-dispatched body)
 *  5. Deadlines section
 *  6. Period section (fiscal-year clients only)
 *  7. Evidence section (collapsed, one-liner)
 *  8. Documents received section (readiness roll-up, read-only)
 *  9. Light footer (Copy link · Close)
 */

const PIPELINE_STAGES = LIFECYCLE_V2_STATUSES

type PipelineState = 'complete' | 'current' | 'future'

interface StatusTimestamp {
  status: ObligationStatus
  enteredAt: Date | null
}

export function ObligationPanelV2({
  obligationId,
  onClose,
}: {
  obligationId: string | null
  onClose: () => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const detailQuery = useQuery({
    ...orpc.obligations.getDetail.queryOptions({
      input: { obligationId: obligationId ?? '' },
    }),
    enabled: obligationId !== null,
  })
  // 2026-05-23: V2 panel now owns its own status mutations. Earlier
  // the active-stage card pointed back at V1 ("Move into work via
  // the original panel for now"); V1's status-actions row was
  // removed in the same commit pass, so V2 has to stand on its own.
  // Mirrors the mutation set V1 had: generic updateStatus +
  // dedicated markFiledRejected (different RPC for that audit
  // semantic). Invalidating the obligation detail queries on success
  // refetches the row so the V2 surface reflects the new status
  // without a manual close+reopen.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
  }
  const labels = useLifecycleV2StatusLabels()
  const changeStatusMutation = useMutation(
    orpc.obligations.updateStatus.mutationOptions({
      onSuccess: (result, vars) => {
        invalidate()
        toast.success(t`Status changed to ${labels[vars.status]}`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't change status`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const markFiledRejectedMutation = useMutation(
    orpc.obligations.markFiledRejected.mutationOptions({
      onSuccess: (result) => {
        invalidate()
        toast.success(t`Marked e-file rejected`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't mark e-file rejected`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const mutationsPending = changeStatusMutation.isPending || markFiledRejectedMutation.isPending

  const row = detailQuery.data?.row ?? null
  // Stabilize the array fallbacks via useMemo so `[]` doesn't get
  // re-created on every render and break downstream useMemo / useEffect
  // dep arrays. Once react-query resolves data the array refs are stable.
  const auditEventsRaw = detailQuery.data?.auditEvents
  const auditEvents = useMemo(() => auditEventsRaw ?? [], [auditEventsRaw])
  const evidenceRaw = detailQuery.data?.evidence
  const evidence = useMemo(() => evidenceRaw ?? [], [evidenceRaw])
  const readinessRaw = detailQuery.data?.readinessChecklist
  const readinessChecklist = useMemo(() => readinessRaw ?? [], [readinessRaw])

  // Reduce audit events to one timestamp per pipeline stage — the FIRST
  // time we saw the obligation enter that state. Re-entries keep the
  // earlier timestamp so the strip reads as a steady progression.
  const statusTimestamps = useMemo<StatusTimestamp[]>(() => {
    const firstSeen = new Map<ObligationStatus, Date>()
    for (const event of auditEvents) {
      if (event.action !== 'status_changed') continue
      if (typeof event.afterJson !== 'object' || event.afterJson === null) continue
      const after = (event.afterJson as { status?: unknown }).status
      if (typeof after !== 'string') continue
      // Validate `after` against the canonical lifecycle list at runtime
      // — `as ObligationStatus` is unsafe because the JSON value could
      // be anything (a stale `extended`, a legacy status name). `find`
      // returns the matched member typed as ObligationStatus | undefined
      // so the downstream code stays strictly typed without a cast.
      const status = LIFECYCLE_V2_STATUSES.find((candidate) => candidate === after)
      if (!status) continue
      if (firstSeen.has(status)) continue
      firstSeen.set(status, new Date(event.createdAt))
    }
    return PIPELINE_STAGES.map((status) => ({
      status,
      enteredAt: firstSeen.get(status) ?? null,
    }))
  }, [auditEvents])

  if (obligationId === null) return null

  if (detailQuery.isLoading || !row) {
    return (
      <div className="flex h-full flex-col gap-4 rounded-lg border border-divider-regular bg-background-default p-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-5 rounded-lg border border-divider-regular bg-background-default p-5 text-sm">
      <PanelHeader row={row} />
      <VersionToggle />
      <StatusPipeline statuses={statusTimestamps} currentStatus={row.status} />
      <ActiveStageCard
        row={row}
        readinessChecklist={readinessChecklist}
        pending={mutationsPending}
        onChangeStatus={(status) => changeStatusMutation.mutate({ id: row.id, status })}
        onMarkRejected={() => markFiledRejectedMutation.mutate({ id: row.id })}
      />
      <DeadlinesSection row={row} />
      <PeriodSection row={row} />
      <EvidenceSection count={evidence.length} />
      <DocumentsSection items={readinessChecklist} />
      <div className="mt-auto" />
      <PanelFooter obligationId={row.id} onClose={onClose} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function PanelHeader({ row }: { row: ObligationQueueRow }) {
  return (
    <header className="flex flex-col gap-1.5">
      <h2 className="text-lg font-semibold leading-tight text-text-primary">{row.clientName}</h2>
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
        {row.jurisdiction ? (
          <span
            className="inline-flex items-center rounded-md border border-divider-regular bg-state-warning-hover px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-primary"
            aria-label={row.jurisdiction}
          >
            {row.jurisdiction}
          </span>
        ) : null}
        <span className="font-medium text-text-primary">{row.formName ?? row.taxType}</span>
        {row.taxYear !== null ? (
          <>
            <span aria-hidden>·</span>
            <span>
              <Trans>Tax Year {row.taxYear}</Trans>
            </span>
          </>
        ) : null}
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Version toggle — small link, low visual weight
// ---------------------------------------------------------------------------

function VersionToggle() {
  const { setVersion } = useObligationPanelVersion()
  return (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={() => setVersion('v1')}
        className="text-xs text-text-tertiary underline-offset-2 hover:text-text-accent hover:underline"
      >
        <Trans>← Back to original panel</Trans>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status pipeline — horizontal 6-stage strip
// ---------------------------------------------------------------------------

function StatusPipeline({
  statuses,
  currentStatus,
}: {
  statuses: StatusTimestamp[]
  currentStatus: ObligationStatus
}) {
  const labels = useLifecycleV2StatusLabels()
  // Legacy statuses outside the v2 strip (in_progress, extended, paid,
  // not_applicable) return -1 here, which correctly renders every dot
  // as "future" — V2 surfaces a fallback message in the active-stage
  // card prompting the user to switch back to V1 in that case.
  const currentIndex = (PIPELINE_STAGES as readonly ObligationStatus[]).indexOf(currentStatus)

  return (
    <ol className="flex items-start gap-1" aria-label="Status pipeline">
      {statuses.map((stamp, idx) => {
        const state: PipelineState =
          idx < currentIndex ? 'complete' : idx === currentIndex ? 'current' : 'future'
        return (
          <li
            key={stamp.status}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
            title={`${labels[stamp.status]}${stamp.enteredAt ? ` · ${stamp.enteredAt.toLocaleString()}` : ''}`}
          >
            <div className="flex w-full items-center">
              <Connector active={idx <= currentIndex} hidden={idx === 0} />
              <PipelineDot state={state} />
              <Connector active={idx < currentIndex} hidden={idx === statuses.length - 1} />
            </div>
            <span
              className={cn(
                'truncate text-[10px] uppercase tracking-[0.06em]',
                state === 'current'
                  ? 'font-semibold text-text-accent'
                  : state === 'complete'
                    ? 'text-text-secondary'
                    : 'text-text-tertiary',
              )}
            >
              {labels[stamp.status]}
            </span>
            <span className="text-[10px] tabular-nums text-text-tertiary">
              {stamp.enteredAt
                ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
                    stamp.enteredAt,
                  )
                : '—'}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function PipelineDot({ state }: { state: PipelineState }) {
  if (state === 'complete') {
    return (
      <CheckCircle2Icon
        className="size-3.5 shrink-0 text-state-success-solid"
        aria-label="completed"
      />
    )
  }
  if (state === 'current') {
    return (
      <CircleDotIcon
        className="size-3.5 shrink-0 text-state-accent-active-alt"
        aria-label="current"
      />
    )
  }
  return <CircleIcon className="size-3.5 shrink-0 text-text-tertiary" aria-label="upcoming" />
}

function Connector({ active, hidden }: { active: boolean; hidden: boolean }) {
  if (hidden) return <span className="flex-1" aria-hidden />
  return (
    <span
      aria-hidden
      className={cn('mx-0.5 h-px flex-1', active ? 'bg-state-success-solid' : 'bg-divider-regular')}
    />
  )
}

// ---------------------------------------------------------------------------
// Active stage card — body dispatches on the current status
// ---------------------------------------------------------------------------

function ActiveStageCard({
  row,
  readinessChecklist,
  pending,
  onChangeStatus,
  onMarkRejected,
}: {
  row: ObligationQueueRow
  readinessChecklist: Array<{ id: string; label: string; receivedAt: string | null }>
  pending: boolean
  onChangeStatus: (status: ObligationStatus) => void
  onMarkRejected: () => void
}) {
  const labels = useLifecycleV2StatusLabels()
  return (
    <section className="rounded-lg bg-background-subtle p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          <Trans>Current stage</Trans>
        </h3>
        <Badge variant={STATUS_VARIANT[row.status]} className="h-6 text-xs">
          {labels[row.status]}
        </Badge>
      </div>
      <ActiveStageBody
        row={row}
        readinessChecklist={readinessChecklist}
        pending={pending}
        onChangeStatus={onChangeStatus}
        onMarkRejected={onMarkRejected}
      />
    </section>
  )
}

/**
 * Stage-dispatched body for the Current stage card. Each branch
 * returns:
 *  - a brief contextual headline (optional — only when there's a
 *    sub-message worth saying, e.g. "Waiting on N documents"),
 *  - a primary forward-action button that advances the canonical
 *    status transition for this stage,
 *  - any recovery actions that apply (e.g. "Record rejection" on
 *    filed rows).
 *
 * Previous shape had placeholder copy pointing back to "the
 * original panel"; that pointer was removed in the same commit pass
 * that retired V1's status-actions row, so V2 has to carry the
 * primary forward affordances itself.
 */
function ActiveStageBody({
  row,
  readinessChecklist,
  pending,
  onChangeStatus,
  onMarkRejected,
}: {
  row: ObligationQueueRow
  readinessChecklist: Array<{ id: string; label: string; receivedAt: string | null }>
  pending: boolean
  onChangeStatus: (status: ObligationStatus) => void
  onMarkRejected: () => void
}) {
  if (row.status === 'pending') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">
          <Trans>
            No work has started on this return. Move to In review when preparation begins.
          </Trans>
        </p>
        <div>
          <Button size="sm" disabled={pending} onClick={() => onChangeStatus('review')}>
            <CheckCircle2Icon data-icon="inline-start" aria-hidden />
            <Trans>Start preparation</Trans>
          </Button>
        </div>
      </div>
    )
  }
  if (row.status === 'waiting_on_client') {
    const outstanding = readinessChecklist.filter((item) => !item.receivedAt)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-tertiary">
            <Trans>Waiting on these documents:</Trans>
          </p>
          {outstanding.length === 0 ? (
            <p className="text-sm text-text-secondary">
              <Trans>No outstanding checklist items.</Trans>
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {outstanding.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm text-text-primary">
                  <CircleIcon className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <Button size="sm" disabled={pending} onClick={() => onChangeStatus('review')}>
            <CheckCircle2Icon data-icon="inline-start" aria-hidden />
            <Trans>Mark docs received</Trans>
          </Button>
        </div>
      </div>
    )
  }
  if (row.status === 'blocked') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">
          <Trans>
            An external blocker is holding this return. Move it back to In review once the blocker
            is resolved.
          </Trans>
        </p>
        <div>
          <Button size="sm" disabled={pending} onClick={() => onChangeStatus('review')}>
            <CheckCircle2Icon data-icon="inline-start" aria-hidden />
            <Trans>Mark unblocked</Trans>
          </Button>
        </div>
      </div>
    )
  }
  if (row.status === 'review' || row.status === 'in_progress' || row.status === 'extended') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">
          <Trans>Preparation in progress. Mark filed once the return is submitted.</Trans>
        </p>
        <div>
          <Button size="sm" disabled={pending} onClick={() => onChangeStatus('done')}>
            <CheckCircle2Icon data-icon="inline-start" aria-hidden />
            <Trans>Mark filed</Trans>
          </Button>
        </div>
      </div>
    )
  }
  if (row.status === 'done') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">
          <Trans>Filed — awaiting authority acceptance.</Trans>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={pending} onClick={() => onChangeStatus('completed')}>
            <CheckCircle2Icon data-icon="inline-start" aria-hidden />
            <Trans>Confirm authority acceptance</Trans>
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={onMarkRejected}>
            <AlertTriangleIcon data-icon="inline-start" aria-hidden />
            <Trans>Record authority rejection</Trans>
          </Button>
        </div>
      </div>
    )
  }
  if (row.status === 'paid') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">
          <Trans>Payment processed. Close the obligation once everything is reconciled.</Trans>
        </p>
        <div>
          <Button size="sm" disabled={pending} onClick={() => onChangeStatus('completed')}>
            <CheckCircle2Icon data-icon="inline-start" aria-hidden />
            <Trans>Mark obligation complete</Trans>
          </Button>
        </div>
      </div>
    )
  }
  if (row.status === 'completed') {
    return (
      <p className="text-sm text-text-secondary">
        <Trans>Closed out — no further action.</Trans>
      </p>
    )
  }
  // not_applicable + any unrecognized status. Quiet terminal label,
  // no forward affordance.
  return (
    <p className="text-sm text-text-secondary">
      <Trans>No outstanding work for this status.</Trans>
    </p>
  )
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function DeadlinesSection({ row }: { row: ObligationQueueRow }) {
  const rows: Array<{ label: string; value: string | null }> = [
    { label: 'Current due', value: formatDate(row.currentDueDate) },
    { label: 'Base due', value: formatDate(row.baseDueDate) },
  ]
  if (row.filingDueDate) {
    rows.push({ label: 'Filing due', value: formatDate(row.filingDueDate) })
  }
  if (row.paymentDueDate) {
    rows.push({ label: 'Payment due', value: formatDate(row.paymentDueDate) })
  }
  return (
    <SectionShell title="Deadlines">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-text-tertiary">{r.label}</dt>
            <dd className="text-right tabular-nums text-text-primary">{r.value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </SectionShell>
  )
}

function PeriodSection({ row }: { row: ObligationQueueRow }) {
  if (row.taxYearType !== 'fiscal') return null
  const monthDay =
    row.fiscalYearEndMonth !== null && row.fiscalYearEndDay !== null
      ? `${monthName(row.fiscalYearEndMonth)} ${row.fiscalYearEndDay}`
      : null
  return (
    <SectionShell title="Period">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-text-tertiary">Tax year type</dt>
        <dd className="text-right text-text-primary">Fiscal</dd>
        {monthDay ? (
          <>
            <dt className="text-text-tertiary">Fiscal year end</dt>
            <dd className="text-right text-text-primary">{monthDay}</dd>
          </>
        ) : null}
      </dl>
    </SectionShell>
  )
}

function EvidenceSection({ count }: { count: number }) {
  return (
    <SectionShell title="Evidence">
      <p className="text-sm text-text-secondary">
        {count === 0 ? (
          <Trans>No evidence linked yet.</Trans>
        ) : count === 1 ? (
          <Trans>1 item linked. The original panel has the full editor.</Trans>
        ) : (
          <Trans>{count} items linked. The original panel has the full editor.</Trans>
        )}
      </p>
    </SectionShell>
  )
}

function DocumentsSection({
  items,
}: {
  items: Array<{ id: string; label: string; receivedAt: string | null }>
}) {
  if (items.length === 0) return null
  return (
    <SectionShell title="Documents received">
      <ul className="flex flex-col gap-1.5 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-text-primary">
            {item.receivedAt ? (
              <CheckCircle2Icon
                className="size-3.5 shrink-0 text-state-success-solid"
                aria-label="received"
              />
            ) : (
              <CircleIcon
                className="size-3.5 shrink-0 text-text-tertiary"
                aria-label="outstanding"
              />
            )}
            <span className="truncate">{item.label}</span>
          </li>
        ))}
      </ul>
    </SectionShell>
  )
}

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-text-tertiary">
        {title}
      </h3>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function PanelFooter({ obligationId, onClose }: { obligationId: string; onClose: () => void }) {
  const { t } = useLingui()
  return (
    <footer className="flex items-center justify-between border-t border-divider-regular pt-3">
      <button
        type="button"
        onClick={() => {
          const url = `${window.location.origin}/obligations?id=${obligationId}&drawer=obligation`
          void navigator.clipboard
            .writeText(url)
            .then(() => toast.success(t`Link copied`))
            .catch(() => toast.error(t`Couldn't copy link`))
        }}
        className="inline-flex items-center gap-1.5 text-sm text-text-accent hover:underline"
      >
        <LinkIcon className="size-3.5" aria-hidden />
        <Trans>Copy link</Trans>
      </button>
      <Button variant="ghost" size="sm" onClick={onClose}>
        <Trans>Close</Trans>
      </Button>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function monthName(month: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return names[month - 1] ?? String(month)
}
