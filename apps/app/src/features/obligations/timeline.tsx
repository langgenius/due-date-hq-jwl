import { useMemo } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'

import type { AuditEventPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

import { useAuditActionLabels } from '@/features/audit/audit-log-labels'
import { formatAuditActionLabel } from '@/features/audit/audit-log-model'
import { formatDateTimeWithTimezone } from '@/lib/utils'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { DeltaMark, highlightCitations } from '@/components/primitives/legal-typography'

import { LIFECYCLE_V2_STATUSES, isObligationStatus, type ObligationStatus } from './status-control'

// Map every legacy ObligationStatus → its canonical v2 milestone bucket.
// Mirrors the collapse contract spelled out in `useLifecycleV2StatusLabels`
// (status-control.tsx) and `timelineIndexForStatus` / `STAGE_STATUS_GROUPS`
// (routes/obligations.tsx). Single source of truth: when a row changes
// status, every milestone surface (queue pill, drawer header pill, strip,
// stage card, AND this vertical journal) must land on the SAME milestone.
//
// `paid` collapses into the FILED milestone, not Completed (see PRD
// §2). `not_applicable`, `in_progress`, and `extended` must map to a
// real milestone rather than falling into "Other activity", which
// would tell the CPA the row's currently-active review stage never
// happened. See docs/Design/milestone-audit.md for the full matrix.
const MILESTONE_MAP: Record<ObligationStatus, ObligationStatus> = {
  pending: 'pending',
  not_applicable: 'pending',
  waiting_on_client: 'waiting_on_client',
  blocked: 'blocked',
  in_progress: 'review',
  review: 'review',
  extended: 'review',
  done: 'done',
  paid: 'done',
  completed: 'completed',
}

function milestoneFor(status: ObligationStatus | null): ObligationStatus | null {
  return status === null ? null : MILESTONE_MAP[status]
}

function statusFromAudit(event: AuditEventPublic): ObligationStatus | null {
  const after = event.afterJson
  if (typeof after !== 'object' || after === null) return null
  const record: Record<string, unknown> = { ...after }
  const raw = record.status
  if (typeof raw !== 'string') return null
  return isObligationStatus(raw) ? raw : null
}

type StatusLabels = Record<ObligationStatus, string>

function ObligationTimeline({
  currentStatus,
  events,
  labels,
  practiceTimezone,
}: {
  currentStatus: ObligationStatus
  events: readonly AuditEventPublic[]
  labels: StatusLabels
  practiceTimezone: string
}) {
  const grouped = useMemo(() => {
    const map = new Map<ObligationStatus, AuditEventPublic[]>()
    const other: AuditEventPublic[] = []
    for (const event of events) {
      const milestone = milestoneFor(statusFromAudit(event))
      if (milestone) {
        const bucket = map.get(milestone) ?? []
        bucket.push(event)
        map.set(milestone, bucket)
      } else {
        other.push(event)
      }
    }
    return { map, other }
  }, [events])

  const currentMilestone = milestoneFor(currentStatus)
  // The milestone immediately after the current one — marked "Up next" so the
  // future (untouched) tail reads as a journey-ahead, not a stack of empty rows.
  // findIndex (not indexOf) — currentMilestone is the wider ObligationStatus
  // type; the comparison narrows safely and yields -1 when there's no match.
  const currentIndex = LIFECYCLE_V2_STATUSES.findIndex((m) => m === currentMilestone)

  return (
    <div className="grid gap-0">
      {LIFECYCLE_V2_STATUSES.map((milestone, index) => {
        const milestoneEvents = grouped.map.get(milestone) ?? []
        const isCurrent = milestone === currentMilestone
        const isTouched = milestoneEvents.length > 0 || isCurrent
        const isNext = index === currentIndex + 1
        const isLast = index === LIFECYCLE_V2_STATUSES.length - 1
        return (
          <MilestoneNode
            key={milestone}
            label={labels[milestone]}
            isCurrent={isCurrent}
            isTouched={isTouched}
            isNext={isNext}
            isLast={isLast}
            events={milestoneEvents}
            practiceTimezone={practiceTimezone}
          />
        )
      })}
      {grouped.other.length > 0 ? (
        <OtherActivity events={grouped.other} practiceTimezone={practiceTimezone} />
      ) : null}
    </div>
  )
}

function MilestoneNode({
  label,
  isCurrent,
  isTouched,
  isNext,
  isLast,
  events,
  practiceTimezone,
}: {
  label: string
  isCurrent: boolean
  isTouched: boolean
  isNext: boolean
  isLast: boolean
  events: AuditEventPublic[]
  practiceTimezone: string
}) {
  const { t } = useLingui()
  return (
    <div className={cn('grid grid-cols-[20px_1fr] gap-x-3', !isTouched && 'opacity-45')}>
      <div className="flex flex-col items-center" aria-hidden="true">
        <div
          className={cn(
            'mt-1.5 h-2.5 w-2.5 rounded-full border',
            isCurrent && 'border-state-accent-active bg-state-accent-active',
            !isCurrent && isTouched && 'border-text-tertiary bg-text-tertiary',
            !isTouched && 'border-divider-regular bg-surface-base',
          )}
        />
        {!isLast ? (
          <div
            className={cn(
              // Dashed vertical connector (img-178) — a 1px border-line reads as
              // a lighter chronological chain than a solid bar.
              'mt-1 w-0 flex-1 border-l border-dashed',
              isTouched ? 'border-text-tertiary/50' : 'border-divider-regular',
            )}
          />
        ) : null}
      </div>
      {/* Untouched future rows get tighter spacing so the journey-ahead tail
          reads as a compact list, not a stack of empty rows. */}
      <div className={cn(isTouched ? 'pb-4' : 'pb-2.5', isLast && 'pb-0')}>
        {/* justify-between so the right edge carries a marker (Current / Up
            next) instead of leaving every row's right side empty. */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              isCurrent
                ? 'text-text-primary'
                : isTouched
                  ? 'text-text-secondary'
                  : 'text-text-tertiary',
            )}
          >
            {label}
          </span>
          {isCurrent ? (
            // Badge primitive (variant="outline" + shape="square") owns the
            // uppercase tracking + rounded-sm chrome; the className override
            // only re-tints the border and text from the outline default
            // (border-divider-regular / text-text-secondary) to the accent
            // tone that distinguishes the active timeline phase.
            <Badge
              variant="outline"
              shape="square"
              className="border-state-accent-active text-state-accent-active"
            >
              {t`Current`}
            </Badge>
          ) : isNext ? (
            // The immediate next milestone — a quiet forward marker so the
            // ghosted tail reads as "the road ahead", not empty placeholder rows.
            <span className="text-caption-xs font-medium tracking-wide text-text-tertiary uppercase">
              {t`Up next`}
            </span>
          ) : null}
        </div>
        {events.length > 0 ? (
          <ul className="mt-2 grid gap-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-lg border border-divider-regular bg-surface-base px-3 py-2"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-text-secondary">
                    {event.actorLabel ?? t`System`}
                  </span>
                  <span className="text-caption-xs text-text-tertiary">
                    {formatDateTimeWithTimezone(event.createdAt, practiceTimezone)}
                  </span>
                </div>
                {/* Each event inside a milestone IS a status transition,
                    so the row earns a leading Δ. The reason text routinely
                    carries citations like "§ 6651(a)(2)" (penalty justification,
                    extension reason) — `highlightCitations` renders them in
                    Citation chrome inline. */}
                {event.reason ? (
                  <p className="mt-1 text-sm text-text-primary">
                    <DeltaMark className="mr-1" />
                    {highlightCitations(event.reason)}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-text-tertiary">
                    <DeltaMark className="mr-1" />
                    <Trans>Status set to {label.toLowerCase()}.</Trans>
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

function OtherActivity({
  events,
  practiceTimezone,
}: {
  events: AuditEventPublic[]
  practiceTimezone: string
}) {
  const { t } = useLingui()
  const actionLabels = useAuditActionLabels()
  return (
    <div className="mt-4 border-t border-divider-regular pt-3">
      <CapsFieldLabel>{t`Other activity`}</CapsFieldLabel>
      <ul className="mt-2 grid gap-2">
        {events.map((event) => (
          <li
            key={event.id}
            className="rounded-lg border border-divider-regular bg-surface-base px-3 py-2"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-text-secondary">
                {formatAuditActionLabel(event.action, actionLabels)}
              </span>
              <span className="text-caption-xs text-text-tertiary">
                {formatDateTimeWithTimezone(event.createdAt, practiceTimezone)}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-tertiary">
              {event.actorLabel ?? t`System`}
              {event.reason ? <> · {highlightCitations(event.reason)}</> : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { ObligationTimeline }
