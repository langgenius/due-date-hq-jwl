import { type KeyboardEvent, useCallback } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Astroid } from 'lucide-react'

import type { AuditEventPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { getAssigneeTint } from '@/lib/assignee-tint'
import { cn } from '@duedatehq/ui/lib/utils'
import { formatDateTimeWithTimezone } from '@/lib/utils'
import {
  useLifecycleV2StatusLabels,
  useReadinessLabels,
  useStatusLabels,
} from '@/features/obligations/status-control'
import { useLifecycleV2 } from '@/features/obligations/use-lifecycle-v2'

import { buildAuditChangeView } from './audit-change-view'
import {
  useAuditActionLabels,
  useAuditChangeLabels,
  useAuditEntityTypeLabels,
} from './audit-log-labels'
import {
  formatAuditActionLabel,
  formatAuditEntityTypeLabel,
  getAuditEntityDisplay,
  shortenAuditId,
} from './audit-log-model'

export function AuditLogTable({
  events,
  firmTimezone,
  onOpenEvent,
}: {
  events: AuditEventPublic[]
  firmTimezone: string
  onOpenEvent: (id: string) => void
}) {
  const { t } = useLingui()
  const actionLabels = useAuditActionLabels()
  const entityTypeLabels = useAuditEntityTypeLabels()
  // Under v2, audit log shows the same collapsed pill labels the
  // queue uses ("Filed" not "Paid", "In review" not "In progress")
  // so the CPA reads one vocabulary across the app. The underlying
  // raw status values are still preserved in the audit beforeJson /
  // afterJson payloads for forensic reconstruction.
  const lifecycleV2 = useLifecycleV2()
  const legacyStatusLabels = useStatusLabels()
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const statusLabels = lifecycleV2 ? v2StatusLabels : legacyStatusLabels
  const readinessLabels = useReadinessLabels()
  const changeLabels = useAuditChangeLabels({ actionLabels, readinessLabels, statusLabels })

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Trans>Time</Trans>
          </TableHead>
          <TableHead>
            <Trans>Actor</Trans>
          </TableHead>
          <TableHead>
            <Trans>Action</Trans>
          </TableHead>
          <TableHead>
            <Trans>Entity</Trans>
          </TableHead>
          <TableHead>
            <Trans>Change</Trans>
          </TableHead>
          <TableHead className="text-right">
            <Trans>Detail</Trans>
          </TableHead>
        </TableRow>
      </TableHeader>
      {/* 2026-05-26 (86th pass, audit §16.2 P1): added
          `bg-background-default/50` so the audit log table matches the
          cross-workbench TableBody alpha-50 white. The
          `[&_tr]:border-b-0` weld is preserved — audit log uses
          paragraph-row formatting where between-row dividers compete
          with the change-headline content. */}
      <TableBody className="bg-background-default/50 [&_tr]:border-b-0 [&_td]:py-3">
        {events.map((event) => {
          // η pass — F-035 / F-036: actor resolution now reads actor_type
          // first. An autonomous AI event ('ai') gets "AI" as the displayed
          // actor, distinct from "System" (cron / queue worker). An
          // ai_assisted event still shows the human who pressed apply, but
          // a small Astroid chip in the row signals the AI co-authorship.
          const actor =
            event.actorType === 'ai' ? t`AI` : (event.actorLabel ?? event.actorId ?? t`System`)
          const actionLabel = formatAuditActionLabel(event.action, actionLabels)
          const entityTypeLabel = formatAuditEntityTypeLabel(event.entityType, entityTypeLabels)
          const entityDisplay = getAuditEntityDisplay(event, entityTypeLabel)
          return (
            <AuditLogRow
              key={event.id}
              event={event}
              actor={actor}
              actionLabel={actionLabel}
              entityDisplay={entityDisplay}
              changeHeadline={buildAuditChangeView(event, changeLabels, firmTimezone).headline}
              firmTimezone={firmTimezone}
              onOpenEvent={onOpenEvent}
            />
          )
        })}
      </TableBody>
    </Table>
  )
}

function AuditLogRow({
  event,
  actor,
  actionLabel,
  entityDisplay,
  changeHeadline,
  firmTimezone,
  onOpenEvent,
}: {
  event: AuditEventPublic
  actor: string
  actionLabel: string
  entityDisplay: { primary: string; secondary: string }
  changeHeadline: string
  firmTimezone: string
  onOpenEvent: (id: string) => void
}) {
  const { t } = useLingui()
  const handleClick = useCallback(() => onOpenEvent(event.id), [event.id, onOpenEvent])
  const handleKeyDown = useCallback(
    (keyboardEvent: KeyboardEvent<HTMLTableRowElement>) => {
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault()
        onOpenEvent(event.id)
      }
    },
    [event.id, onOpenEvent],
  )

  return (
    <TableRow
      role="button"
      tabIndex={0}
      aria-label={t`View audit detail`}
      data-audit-action={event.action}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="cursor-pointer align-top outline-none hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset"
    >
      <TableCell className="text-xs tabular-nums">
        <div className="grid gap-1">
          <span className="text-text-primary">
            {formatDateTimeWithTimezone(event.createdAt, firmTimezone)}
          </span>
          <span className="text-text-tertiary">
            {formatDateTimeWithTimezone(event.createdAt, 'UTC')}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {/* 2026-05-26 (87th pass, audit §16.7 P2): added the canonical
            inline avatar chip (size-6, getAssigneeTint) before the
            actor name. Lets a CPA scan the audit log by color — same
            person → same tint → "Sarah made all of these changes"
            jumps out at a glance. Falls back to a neutral chrome
            when the event has no actor name (system events).
            2026-05-27 (η — F-035 / F-036): autonomous AI events render
            a dedicated AI tile (Astroid icon, accent tint) so they don't
            collide with the human avatar bucket. ai_assisted events keep
            the human avatar + add a small AI chip below the name. */}
        <div className="flex items-start gap-2">
          {event.actorType === 'ai' ? (
            <span
              aria-hidden
              className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-state-accent-subtle text-text-accent"
            >
              <Astroid className="size-3.5" />
            </span>
          ) : (
            <span
              aria-hidden
              className={cn(
                'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-caption-xs font-semibold uppercase tracking-tight',
                actor ? getAssigneeTint(actor) : 'bg-background-subtle text-text-tertiary',
              )}
            >
              {actor
                ? actor
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part.charAt(0))
                    .join('')
                    .toUpperCase() || '?'
                : '?'}
            </span>
          )}
          <div className="grid min-w-0 gap-1">
            <span className="text-xs font-medium text-text-primary">{actor}</span>
            {event.actorType === 'ai_assisted' ? (
              <span
                className="inline-flex w-fit items-center gap-1 rounded-sm bg-state-accent-subtle px-1 py-0.5 text-caption-xs font-medium uppercase tracking-eyebrow-tight text-text-accent"
                title={t`AI produced the value; the user applied it.`}
              >
                <Astroid className="size-2.5" aria-hidden />
                <Trans>AI-assisted</Trans>
              </span>
            ) : event.actorId ? (
              <span className="font-mono text-xs text-text-tertiary">
                {shortenAuditId(event.actorId)}
              </span>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {actionLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="grid gap-1">
          <span className="text-xs text-text-primary" title={event.entityType}>
            {entityDisplay.primary}
          </span>
          <span className="text-xs text-text-tertiary">{entityDisplay.secondary}</span>
        </div>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal">
        <span className="line-clamp-2 text-xs text-text-secondary">{changeHeadline}</span>
      </TableCell>
      <TableCell className="text-right">
        <span className="text-xs text-text-tertiary" aria-hidden>
          ›
        </span>
      </TableCell>
    </TableRow>
  )
}
