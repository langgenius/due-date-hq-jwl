import { useMemo } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'

import type { AuditEventPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

import { useAuditActionLabels } from '@/features/audit/audit-log-labels'
import { formatAuditActionLabel } from '@/features/audit/audit-log-model'
import { formatDateTimeWithTimezone } from '@/lib/utils'
import { FieldLabel } from '@/components/primitives/field-label'

import { LIFECYCLE_V2_STATUSES, isObligationStatus, type ObligationStatus } from './status-control'

// Map every legacy ObligationStatus → its canonical v2 milestone bucket.
// Mirrors the collapse contract spelled out in `useLifecycleV2StatusLabels`
// (status-control.tsx) and `timelineIndexForStatus` / `STAGE_STATUS_GROUPS`
// (routes/obligations.tsx). Single source of truth: when a row changes
// status, every milestone surface (queue pill, drawer header pill, strip,
// stage card, AND this vertical journal) must land on the SAME milestone.
//
// 2026-05-27 (Agent X3 milestone audit M-03/M-05/M-07/M-09/W-1): pre-fix,
// this map was missing `not_applicable`, `in_progress`, `extended` (they
// fell into "Other activity" — telling the CPA the row's currently-active
// review stage never happened) AND mapped `paid → completed` (wrong:
// `paid` collapses into the FILED milestone, not Completed — see PRD §2).
// See docs/Design/milestone-audit.md for the full matrix.
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

  return (
    <div className="grid gap-0">
      {LIFECYCLE_V2_STATUSES.map((milestone, index) => {
        const milestoneEvents = grouped.map.get(milestone) ?? []
        const isCurrent = milestone === currentMilestone
        const isTouched = milestoneEvents.length > 0 || isCurrent
        const isLast = index === LIFECYCLE_V2_STATUSES.length - 1
        return (
          <MilestoneNode
            key={milestone}
            label={labels[milestone]}
            isCurrent={isCurrent}
            isTouched={isTouched}
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
  isLast,
  events,
  practiceTimezone,
}: {
  label: string
  isCurrent: boolean
  isTouched: boolean
  isLast: boolean
  events: AuditEventPublic[]
  practiceTimezone: string
}) {
  const { t } = useLingui()
  return (
    <div className="grid grid-cols-[20px_1fr] gap-x-3">
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
              'mt-1 w-px flex-1',
              isTouched ? 'bg-text-tertiary' : 'bg-divider-regular',
            )}
          />
        ) : null}
      </div>
      <div className={cn('pb-4', isLast && 'pb-0')}>
        <div className="flex items-center gap-2">
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
            // 2026-06-01: swap hand-rolled accent-bordered eyebrow pill for the
            // Badge primitive (variant="outline" + shape="square"). The
            // primitive owns the uppercase tracking + rounded-sm chrome; the
            // className override only re-tints the border and text from the
            // outline default (border-divider-regular / text-text-secondary)
            // to the accent tone that distinguishes the active timeline phase.
            <Badge
              variant="outline"
              shape="square"
              className="border-state-accent-active text-state-accent-active"
            >
              {t`Current`}
            </Badge>
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
                {event.reason ? (
                  <p className="mt-1 text-sm text-text-primary">{event.reason}</p>
                ) : (
                  <p className="mt-1 text-xs text-text-tertiary">
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
      <FieldLabel>{t`Other activity`}</FieldLabel>
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
              {event.reason ? <> · {event.reason}</> : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { ObligationTimeline }
