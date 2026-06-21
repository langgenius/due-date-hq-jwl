import { Fragment } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlarmClockIcon,
  TriangleAlertIcon,
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
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatDatePretty } from '@/lib/utils'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { deadlineDetailHref } from '@/features/obligations/deadline-detail-url'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { StateBadge, getJurisdictionName } from '@/components/primitives/state-badge'

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
  // inline-expand only: drops the OFFICIAL DUE + OWNER columns so the row fits
  // a squeezed container (e.g. when the client-detail side panel is open).
  compact?: boolean
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
  compact = false,
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
        // inline-expand surface (client detail) opens the in-page side panel;
        // other surfaces navigate to the deadline detail page.
        if (mode === 'inline-expand') onExpand?.(deadline.id)
        else goToSummary(event.metaKey || event.ctrlKey)
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
      {mode === 'inline-expand' ? (
        // Fixed-column table (Pencil VtC73) — client Filings only; other
        // surfaces keep the flex row below. DEADLINE fills; the rest are
        // fixed-width columns. Due columns map to REAL dates (no firm
        // "internal due" field exists): the working column = currentDueDate
        // (?? base) + the days countdown; OFFICIAL = baseDueDate (statutory).
        <article
          role="article"
          tabIndex={0}
          aria-expanded={isExpanded}
          // When this surface opens the obligation in a side panel (isActive),
          // the row is the selected master item — announce it as current.
          aria-current={isActive ? 'true' : undefined}
          aria-labelledby={titleId}
          onClick={handleRowClick}
          onKeyDown={handleKeyDown}
          className={cn(
            'group/row grid w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left outline-none transition-colors',
            // Compact drops OFFICIAL DUE + OWNER so the row fits a squeezed
            // container (client-detail side panel open). Full layout otherwise.
            compact
              ? 'grid-cols-[minmax(0,1fr)_auto_auto_24px]'
              : // 2026-06-16 (audit): fixed columns → minmax(0,Npx) so the row
                // reflows/shrinks instead of forcing the filing-plan's old
                // horizontal scrollbar. Must match ClientWorkPlanPanel's header.
                'grid-cols-[minmax(0,1fr)_minmax(0,148px)_minmax(0,124px)_minmax(0,104px)_minmax(0,132px)_24px]',
            'hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset',
            // §1b — selected + open share one accent (VtC73 #eff4ff).
            isActive && 'bg-state-accent-hover',
            dim && 'opacity-80',
            // Overdue is signalled by the red due-countdown alone (Yuqi: red
            // used too often) — no red left rule or warning icon, matching
            // VtC73 which uses neither.
          )}
        >
          {/* DEADLINE (fill) — a quiet jurisdiction chip ("Federal" / "Texas")
              sits in a fixed-width slot so the form names align into a column.
              On this surface the form name IS the primary read, so the chip
              shows the JURISDICTION (not the form label, which would just echo
              the name beside it) — that also doubles as the per-row state, so
              the old `clientState` sub-line is dropped (one home per fact). */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={stop(() => goToSummary())}
              // w-[104px] fits the longest jurisdiction names ("California" /
              // "Washington" ≈ 95px chip) without clipping, while still aligning
              // the form names into a column.
              className="flex w-[104px] shrink-0 overflow-hidden rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              tabIndex={-1}
              aria-hidden
            >
              {/* 2026-06-16 (Yuqi "badges are in wrong styles"): a jurisdiction
                  is a PROPER NAME, not a code — render the canonical seal +
                  sans-serif name (matching the panel header + summary strip),
                  NOT the mono code-chip. Preview off (a seal-per-row hover card
                  is too busy in a dense table). Falls back to the code-derived
                  chip if a row has no jurisdiction code. */}
              {deadline.jurisdiction ? (
                <span className="flex min-w-0 items-center gap-1.5">
                  <StateBadge code={deadline.jurisdiction} size="xs" preview={false} />
                  <span className="min-w-0 truncate text-sm font-medium text-text-secondary">
                    {getJurisdictionName(deadline.jurisdiction)}
                  </span>
                </span>
              ) : (
                <TaxCodeBadge
                  code={deadline.taxType}
                  display="jurisdiction"
                  className="min-w-0 max-w-full truncate"
                />
              )}
            </button>
            <div className="flex min-w-0 flex-col">
              <Link
                id={titleId}
                to={summaryHref}
                state={{ from: 'client' }}
                onClick={(event) => {
                  event.stopPropagation()
                  // 2026-06-15 (Yuqi): on the inline-expand surface (client
                  // detail) a plain left-click opens the in-page side panel
                  // (onExpand → openDrawer) instead of navigating away to the
                  // firm-wide /deadlines page. cmd/ctrl-click falls through to
                  // the Link so power users can still open the full page in a
                  // new tab (deep-link / escape hatch).
                  if (mode === 'inline-expand' && !event.metaKey && !event.ctrlKey) {
                    event.preventDefault()
                    onExpand?.(deadline.id)
                  }
                }}
                aria-label={`Open ${deadline.formName} for ${deadline.clientName} detail page`}
                // max-w-full keeps w-fit (hover underline hugs the text) from
                // defeating truncate — without the cap, long form names paint
                // over the status chip instead of ellipsizing.
                className="w-fit max-w-full truncate text-row-name text-text-primary underline-offset-2 outline-none hover:text-text-accent hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                {deadline.formName}
              </Link>
            </div>
          </div>

          {/* STATUS */}
          <button
            type="button"
            onClick={stop(() => onFilterByStatus?.(deadline.status))}
            aria-label={`Filter by status: ${deadline.status}`}
            className="flex min-w-0 justify-self-start rounded-full outline-none transition-shadow hover:ring-2 hover:ring-divider-regular focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <ObligationStatusReadBadge status={deadline.status} />
          </button>

          {/* DUE (working) — countdown + working date */}
          <div className="flex min-w-0 flex-col gap-0.5">
            <DueDaysPill days={deadline.daysUntilDue} status={deadline.status} />
            <span className="truncate text-xs text-text-tertiary tabular-nums">
              {formatDatePretty(deadline.currentDueDate ?? deadline.baseDueDate)}
            </span>
          </div>

          {/* OFFICIAL DUE (statutory) — hidden in compact */}
          {compact ? null : (
            <div className="min-w-0 truncate font-mono text-xs text-text-secondary tabular-nums">
              {formatDatePretty(deadline.baseDueDate)}
            </div>
          )}

          {/* OWNER — hidden in compact */}
          {compact ? null : (
            <button
              type="button"
              onClick={stop(() =>
                onFilterByAssignee?.(deadline.assigneeId ?? '', deadline.assigneeName ?? ''),
              )}
              aria-label={`Filter by ${deadline.assigneeName ?? 'unassigned'}`}
              className="flex min-w-0 items-center gap-2 justify-self-start rounded-full outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <AssigneeAvatar
                name={deadline.assigneeName}
                title={deadline.assigneeName ?? 'Unassigned'}
                type={deadline.assigneeName ? 'human' : 'unassigned'}
                size="sm"
              />
              <span className="truncate text-xs text-text-secondary">
                {deadline.assigneeName ?? <Trans>Unassigned</Trans>}
              </span>
            </button>
          )}

          {/* expand chevron */}
          <ChevronRightIcon
            aria-hidden
            className={cn(
              'size-4 shrink-0 justify-self-end text-text-tertiary transition-transform',
              isExpanded && 'rotate-90',
            )}
          />
        </article>
      ) : (
        <article
          role="article"
          tabIndex={0}
          aria-labelledby={titleId}
          onClick={handleRowClick}
          onKeyDown={handleKeyDown}
          className={cn(
            'group/row flex w-full cursor-pointer items-center gap-3.5 px-5 py-3.5 text-left outline-none transition-colors',
            'hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset',
            isActive && 'bg-background-subtle',
            dim && 'opacity-80',
            // Overdue is signaled by the leading TriangleAlertIcon + the red
            // countdown pill — no colored left-stripe. A >1px side border as
            // an accent is the most overused "design touch" in dashboards and
            // never reads as intentional; the leading icon is the canonical
            // replacement and is already present (see the tax-code cluster).
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
                <TriangleAlertIcon
                  className="size-3.5 shrink-0 text-text-destructive"
                  aria-hidden
                />
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
              className="w-fit max-w-full truncate text-sm font-semibold text-text-primary underline-offset-2 outline-none hover:text-text-accent hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              {deadline.formName}
            </Link>
            <span className="truncate text-sm text-text-tertiary">
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
        </article>
      )}

      {mode === 'inline-expand' && isExpanded ? (
        <DeadlineRowExpansion
          deadline={deadline}
          canEdit={canEdit}
          summaryHref={summaryHref}
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
  onMarkFiled,
  onReassign,
  onSnooze,
}: {
  deadline: ObligationQueueRow
  canEdit: boolean
  summaryHref: string
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
      className="flex flex-col gap-3.5 border-t border-divider-subtle bg-background-subtle px-5 py-4 animate-in fade-in duration-150 motion-reduce:animate-none"
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
                    'shrink-0 rounded-full transition-[width,height,background-color,box-shadow]',
                    // Current stage reads as accent (positional), not warning —
                    // "In review" isn't a warning. `blocked` never renders as a
                    // green "passed" dot (it's a side-state, not a milestone).
                    isActive
                      ? 'size-3 bg-state-accent-solid ring-2 ring-state-accent-active-alt'
                      : isPast && stage.key !== 'blocked'
                        ? 'size-2 bg-state-success-solid'
                        : 'size-2 bg-divider-regular',
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'text-xs whitespace-nowrap',
                    isActive
                      ? 'font-semibold text-text-primary'
                      : isPast && stage.key !== 'blocked'
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
          <span className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
            {deadline.readiness === 'ready' ? (
              <SquareCheckIcon className="size-4 shrink-0 text-state-success-solid" aria-hidden />
            ) : (
              <SquareIcon className="size-4 shrink-0 text-divider-regular" aria-hidden />
            )}
            {readinessLabel}
          </span>
          <span className="text-sm text-text-tertiary">
            {t`${deadline.evidenceCount} documents attached`}
          </span>
        </div>
      ) : null}

      {/* Section D — state-aware actions (hidden read-only, §7.2). Terminal
          rows show a quiet "Filed" affirmation instead of a dead, disabled
          primary button; Snooze is dropped once filed. */}
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          {isTerminal ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-text-success">
              <CheckIcon className="size-4 shrink-0" aria-hidden />
              <Trans>Filed</Trans>
            </span>
          ) : (
            <Button size="sm" onClick={() => onMarkFiled?.(deadline.id)}>
              <CheckIcon data-icon="inline-start" />
              <Trans>Mark as filed</Trans>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onReassign?.(deadline.id)}>
            <UserRoundCogIcon data-icon="inline-start" />
            <Trans>Reassign</Trans>
          </Button>
          {!isTerminal ? (
            <Button size="sm" variant="ghost" onClick={() => onSnooze?.(deadline.id)}>
              <AlarmClockIcon data-icon="inline-start" />
              <Trans>Snooze</Trans>
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Section E — single exit. The old "Activity on full page" link pointed
          at a tab of the very page this button opens — redundant, removed. */}
      <div className="flex items-center justify-end gap-2 border-t border-divider-subtle pt-2.5">
        <TextLink
          variant="accent"
          size="sm"
          render={
            <Link
              to={summaryHref}
              state={{ from: 'client' }}
              onClick={(event) => event.stopPropagation()}
            />
          }
          className="flex gap-1.5 font-semibold"
        >
          <Trans>Open full deadline</Trans>
          <ArrowUpRightIcon className="size-3 shrink-0" aria-hidden />
        </TextLink>
      </div>
    </section>
  )
}
