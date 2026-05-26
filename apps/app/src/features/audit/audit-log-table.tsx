import { type KeyboardEvent, useCallback } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'

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
          const actor = event.actorLabel ?? event.actorId ?? t`System`
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
        <div className="grid gap-1">
          <span className="text-xs font-medium text-text-primary">{actor}</span>
          {event.actorId ? (
            <span className="font-mono text-xs text-text-tertiary">
              {shortenAuditId(event.actorId)}
            </span>
          ) : null}
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
