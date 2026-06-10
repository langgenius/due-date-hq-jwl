import { Fragment } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlarmClockIcon,
  AlertTriangleIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ChevronRightIcon,
  SquareCheckIcon,
  SquareIcon,
  UserRoundCogIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import type { ObligationQueueRow, ObligationStatus } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { deadlineDetailHref } from '@/features/obligations/deadline-detail-url'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'

import { DueDaysPill } from './primitives'

/**
 * `DeadlineRow` — the single shared obligation-row component used across every
 * surface (clients detail · deadlines list · today · alerts), per
 * docs/Design/deadline-row-interaction.md.
 *
 * Behaviour is driven by `mode`:
 *   • inline-expand (/clients) — body click toggles the accordion below the row
 *   • navigate (/deadlines, /today) — body click → /deadlines/:ref/summary
 *   • drawer (/alerts) — body click → onOpenDrawer
 *   • navigate-to-audit (/audit-log) — body click → /deadlines/:ref/audit
 *
 * The title link ALWAYS navigates (the consistent escape hatch + Cmd+click → new
 * tab). Status pill and owner are lateral filter affordances; every nested
 * control stops propagation so it never triggers the row-body behaviour (§2.2).
 */
export type DeadlineRowMode = 'navigate' | 'inline-expand' | 'drawer' | 'navigate-to-audit'

export interface DeadlineRowProps {
  deadline: ObligationQueueRow
  mode: DeadlineRowMode
  isExpanded?: boolean
  isSelected?: boolean
  isActive?: boolean
  multiSelectMode?: boolean
  canEdit?: boolean
  onExpand?: (obligationId: string) => void
  onCollapse?: (obligationId: string) => void
  onSelect?: (obligationId: string, selected: boolean) => void
  onFilterByStatus?: (status: ObligationStatus) => void
  onFilterByAssignee?: (assigneeId: string, assigneeName: string) => void
  onOpenDrawer?: (obligationId: string) => void
  onMarkFiled?: (obligationId: string) => void
  onReassign?: (obligationId: string) => void
  onSnooze?: (obligationId: string) => void
}

// §4.3 — the 6 canonical workflow stages (design names → backend enum).
const WORKFLOW_STAGES = [
  { key: 'pending', label: 'Not started' },
  { key: 'waiting_on_client', label: 'Waiting on client' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'review', label: 'In review' },
  { key: 'done', label: 'Filed' },
  { key: 'completed', label: 'Completed' },
] as const satisfies ReadonlyArray<{ key: ObligationStatus; label: string }>

const TERMINAL_STATUSES: ReadonlySet<ObligationStatus> = new Set([
  'done',
  'paid',
  'completed',
  'not_applicable',
])

function isOverdue(deadline: ObligationQueueRow): boolean {
  return deadline.daysUntilDue < 0 && !TERMINAL_STATUSES.has(deadline.status)
}

export function DeadlineRow({
  deadline,
  mode,
  isExpanded = false,
  isSelected = false,
  isActive = false,
  multiSelectMode = false,
  canEdit = false,
  onExpand,
  onCollapse,
  onSelect,
  onFilterByStatus,
  onFilterByAssignee,
  onOpenDrawer,
  onMarkFiled,
  onReassign,
  onSnooze,
}: DeadlineRowProps) {
  const navigate = useNavigate()
  const overdue = isOverdue(deadline)
  const dim = deadline.status === 'completed' || TERMINAL_STATUSES.has(deadline.status)
  const summaryHref = deadlineDetailHref({ obligationId: deadline.id, tab: 'summary' })
  const titleId = `deadline-title-${deadline.id}`

  const goToSummary = (newTab = false) => {
    if (newTab) {
      window.open(summaryHref, '_blank', 'noopener,noreferrer')
      return
    }
    void navigate(summaryHref, { state: { from: 'client' } })
  }

  // §3.2 — mode-aware body click.
  const handleRowClick = (event: React.MouseEvent) => {
    if (multiSelectMode) {
      onSelect?.(deadline.id, !isSelected)
      return
    }
    switch (mode) {
      case 'inline-expand':
        if (isExpanded) onCollapse?.(deadline.id)
        else onExpand?.(deadline.id)
        break
      case 'navigate':
        goToSummary(event.metaKey || event.ctrlKey)
        break
      case 'drawer':
        onOpenDrawer?.(deadline.id)
        break
      case 'navigate-to-audit':
        void navigate(deadlineDetailHref({ obligationId: deadline.id, tab: 'audit' }))
        break
    }
  }

  // §6.2 — keyboard parity.
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.target !== event.currentTarget) return
    switch (event.key) {
      case 'Enter':
        event.preventDefault()
        goToSummary(event.metaKey || event.ctrlKey)
        break
      case ' ':
      case 'Spacebar':
        event.preventDefault()
        if (mode === 'inline-expand') {
          if (isExpanded) onCollapse?.(deadline.id)
          else onExpand?.(deadline.id)
        } else {
          goToSummary()
        }
        break
      case 'ArrowRight':
        if (mode === 'inline-expand' && !isExpanded) {
          event.preventDefault()
          onExpand?.(deadline.id)
        }
        break
      case 'ArrowLeft':
      case 'Escape':
        if (mode === 'inline-expand' && isExpanded) {
          event.preventDefault()
          onCollapse?.(deadline.id)
        }
        break
    }
  }

  const stop = (fn: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation()
    fn()
  }

  return (
    <div
      className={cn(
        'overflow-hidden border-b border-divider-subtle bg-background-default last:border-b-0',
        isActive && 'bg-background-subtle',
      )}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <article
        role="article"
        tabIndex={0}
        aria-expanded={mode === 'inline-expand' ? isExpanded : undefined}
        aria-labelledby={titleId}
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'group/row flex w-full cursor-pointer items-center gap-3.5 px-5 py-3.5 text-left outline-none transition-colors',
          'hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset',
          isActive && 'bg-background-subtle',
          dim && 'opacity-80',
          // §7.1 overdue: left destructive rule.
          overdue && 'border-l-[3px] border-l-state-destructive-solid pl-[17px]',
        )}
      >
        {/* Form tag — navigates (paired with title, §2 target 3). */}
        <button
          type="button"
          onClick={stop(() => goToSummary())}
          className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          tabIndex={-1}
          aria-hidden
        >
          <span className="flex items-center gap-1.5">
            {overdue ? (
              <AlertTriangleIcon className="size-3.5 shrink-0 text-text-destructive" aria-hidden />
            ) : null}
            <TaxCodeBadge code={deadline.taxType} />
          </span>
        </button>

        {/* Title + sub-meta. */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            id={titleId}
            to={summaryHref}
            state={{ from: 'client' }}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Open ${deadline.formName} for ${deadline.clientName} detail page`}
            className="w-fit truncate text-sm font-semibold text-text-primary underline-offset-2 outline-none hover:text-text-accent hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            {deadline.formName}
          </Link>
          <span className="truncate text-[12px] text-text-tertiary">
            {deadline.clientName}
            {deadline.clientState ? <span aria-hidden> · {deadline.clientState}</span> : null}
          </span>
        </div>

        {/* Status pill — lateral filter (§2 target 4). */}
        <button
          type="button"
          onClick={stop(() => onFilterByStatus?.(deadline.status))}
          aria-label={`Filter by status: ${deadline.status}`}
          className="shrink-0 rounded-full outline-none transition-shadow hover:ring-2 hover:ring-divider-regular focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <ObligationStatusReadBadge status={deadline.status} />
        </button>

        {/* Owner — lateral filter (§2 target 5). */}
        <button
          type="button"
          onClick={stop(() =>
            onFilterByAssignee?.(deadline.assigneeId ?? '', deadline.assigneeName ?? ''),
          )}
          aria-label={`Filter by ${deadline.assigneeName ?? 'unassigned'}`}
          className="flex shrink-0 items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <AssigneeAvatar
            name={deadline.assigneeName}
            title={deadline.assigneeName ?? 'Unassigned'}
            type={deadline.assigneeName ? 'human' : 'unassigned'}
            size="sm"
          />
        </button>

        {/* Due countdown — pure information, NOT clickable (§2.1). */}
        <div className="w-[68px] shrink-0 text-right">
          <DueDaysPill days={deadline.daysUntilDue} status={deadline.status} />
        </div>

        {/* Chevron — inline-expand only (§2 target 6). */}
        {mode === 'inline-expand' ? (
          <ChevronRightIcon
            aria-hidden
            className={cn(
              'size-4 shrink-0 text-text-tertiary transition-transform duration-200',
              isExpanded && 'rotate-90',
            )}
          />
        ) : null}
      </article>

      {mode === 'inline-expand' && isExpanded ? (
        <DeadlineRowExpansion
          deadline={deadline}
          canEdit={canEdit}
          summaryHref={summaryHref}
          overdue={overdue}
          onMarkFiled={onMarkFiled}
          onReassign={onReassign}
          onSnooze={onSnooze}
        />
      ) : null}
    </div>
  )
}

/**
 * Inline expansion (§4) — deliberately *less* than the full page: workflow
 * journey + what's-left + actions + open-full. Recent-activity is deferred to a
 * link (the `getRecentActivity` procedure does not exist — §11).
 */
function DeadlineRowExpansion({
  deadline,
  canEdit,
  summaryHref,
  overdue,
  onMarkFiled,
  onReassign,
  onSnooze,
}: {
  deadline: ObligationQueueRow
  canEdit: boolean
  summaryHref: string
  overdue: boolean
  onMarkFiled?: ((obligationId: string) => void) | undefined
  onReassign?: ((obligationId: string) => void) | undefined
  onSnooze?: ((obligationId: string) => void) | undefined
}) {
  const { t } = useLingui()
  const activeIdx = WORKFLOW_STAGES.findIndex((s) => s.key === deadline.status)
  const isTerminal = TERMINAL_STATUSES.has(deadline.status)
  // §4.5 "What's left" (per-item todos) is deferred: the queue row only carries
  // a `readiness` *status* enum + `evidenceCount`, not a checklist with counts.
  // We surface the readiness status + evidence count as the lightweight signal;
  // the full editable checklist lives on the Materials tab (Open full deadline).
  const readinessLabel =
    deadline.readiness === 'ready'
      ? t`Ready to work`
      : deadline.readiness === 'waiting'
        ? t`Waiting on materials`
        : t`Needs review`

  return (
    <section
      role="region"
      aria-labelledby={`deadline-title-${deadline.id}`}
      className="flex flex-col gap-3.5 border-t border-divider-subtle bg-background-subtle px-5 py-4"
    >
      {/* Section A — workflow journey. */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {WORKFLOW_STAGES.map((stage, idx) => {
          const isActive = stage.key === deadline.status
          const isPast = activeIdx > idx
          return (
            <Fragment key={stage.key}>
              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className={cn(
                    'shrink-0 rounded-full transition-all',
                    isActive
                      ? 'size-3 bg-state-warning-hover ring-2 ring-state-warning-solid'
                      : isPast
                        ? 'size-2 bg-state-success-solid'
                        : 'size-2 bg-divider-regular',
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'text-[11px] whitespace-nowrap',
                    isActive
                      ? 'font-semibold text-text-warning'
                      : isPast
                        ? 'font-medium text-text-tertiary'
                        : 'font-medium text-text-muted opacity-60',
                  )}
                >
                  {stage.label}
                </span>
              </div>
              {idx < WORKFLOW_STAGES.length - 1 ? (
                <div className="h-px w-4 shrink-0 bg-divider-subtle" aria-hidden />
              ) : null}
            </Fragment>
          )
        })}
      </div>

      {/* Section C — what's left (readiness status + evidence count signal). */}
      {!isTerminal ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary">
            {deadline.readiness === 'ready' ? (
              <SquareCheckIcon className="size-4 shrink-0 text-state-success-solid" aria-hidden />
            ) : (
              <SquareIcon className="size-4 shrink-0 text-divider-regular" aria-hidden />
            )}
            {readinessLabel}
          </span>
          <span className="text-[12px] text-text-tertiary">
            {t`${deadline.evidenceCount} documents attached`}
          </span>
        </div>
      ) : null}

      {/* §7.1 — penalty exposure surfaces inline only when overdue. */}
      {overdue && deadline.estimatedExposureCents !== null ? (
        <p className="text-[12px] text-text-tertiary">
          <Trans>Estimated exposure</Trans>{' '}
          <span className="font-semibold text-text-destructive tabular-nums">
            ${(deadline.estimatedExposureCents / 100).toLocaleString()}
          </span>
        </p>
      ) : null}

      {/* Section D — actions (hidden read-only, §7.2). */}
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={isTerminal} onClick={() => onMarkFiled?.(deadline.id)}>
            <CheckIcon data-icon="inline-start" />
            <Trans>Mark filed</Trans>
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReassign?.(deadline.id)}>
            <UserRoundCogIcon data-icon="inline-start" />
            <Trans>Reassign</Trans>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onSnooze?.(deadline.id)}>
            <AlarmClockIcon data-icon="inline-start" />
            <Trans>Snooze</Trans>
          </Button>
        </div>
      ) : null}

      {/* Section E — open full + (deferred) activity link. */}
      <div className="flex items-center justify-between gap-2 border-t border-divider-subtle pt-2.5">
        <Link
          to={deadlineDetailHref({ obligationId: deadline.id, tab: 'audit' })}
          onClick={(event) => event.stopPropagation()}
          className="text-[12px] font-medium text-text-tertiary underline-offset-2 outline-none hover:text-text-secondary hover:underline"
        >
          <Trans>Activity on full page →</Trans>
        </Link>
        <Link
          to={summaryHref}
          state={{ from: 'client' }}
          onClick={(event) => event.stopPropagation()}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-text-accent underline-offset-2 outline-none hover:underline"
        >
          <Trans>Open full deadline</Trans>
          <ArrowUpRightIcon className="size-3 shrink-0" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
