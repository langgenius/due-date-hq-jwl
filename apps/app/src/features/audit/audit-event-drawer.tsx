import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'

import type { AuditEventPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { formatDateTimeWithTimezone } from '@/lib/utils'
import { useReadinessLabels, useStatusLabels } from '@/features/obligations/status-control'

import { buildAuditChangeView, type AuditChangeView } from './audit-change-view'
import {
  formatAuditActionLabel,
  formatAuditEntityTypeLabel,
  getAuditEntityDisplay,
  shortenAuditId,
} from './audit-log-model'
import {
  useAuditActionLabels,
  useAuditChangeLabels,
  useAuditEntityTypeLabels,
} from './audit-log-labels'

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
        {label}
      </dt>
      <dd className="break-all text-sm text-text-primary">{value}</dd>
    </div>
  )
}

export function AuditEventDrawer({
  event,
  firmTimezone,
  open,
  onOpenChange,
}: {
  event: AuditEventPublic | null
  firmTimezone: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [renderedEvent, setRenderedEvent] = useState<AuditEventPublic | null>(event)

  if (event && renderedEvent !== event) {
    setRenderedEvent(event)
  }

  const detailEvent = event ?? renderedEvent

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[440px]">
        {detailEvent ? (
          <AuditEventDrawerContent event={detailEvent} firmTimezone={firmTimezone} />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function AuditEventDrawerContent({
  event,
  firmTimezone,
}: {
  event: AuditEventPublic
  firmTimezone: string
}) {
  const { t } = useLingui()
  const actionLabels = useAuditActionLabels()
  const entityTypeLabels = useAuditEntityTypeLabels()
  const statusLabels = useStatusLabels()
  const readinessLabels = useReadinessLabels()
  const changeLabels = useAuditChangeLabels({ actionLabels, readinessLabels, statusLabels })
  const actor = event.actorLabel ?? event.actorId ?? t`System`
  const actionLabel = formatAuditActionLabel(event.action, actionLabels)
  const entityTypeLabel = formatAuditEntityTypeLabel(event.entityType, entityTypeLabels)
  const entityDisplay = getAuditEntityDisplay(event, entityTypeLabel)
  const firmTime = formatDateTimeWithTimezone(event.createdAt, firmTimezone)
  const utcTime = formatDateTimeWithTimezone(event.createdAt, 'UTC')
  const changeView = buildAuditChangeView(event, changeLabels, firmTimezone)

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          <Trans>Audit detail</Trans>
        </SheetTitle>
        <SheetDescription>{shortenAuditId(event.id)}</SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid gap-6">
          <section className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{actionLabel}</Badge>
              <Badge variant={event.actorId ? 'secondary' : 'outline'}>{actor}</Badge>
            </div>
            <p className="text-md text-text-primary">{changeView.headline}</p>
          </section>

          <dl className="grid gap-4 rounded-lg border border-divider-subtle p-4">
            <MetadataRow label={t`Practice time`} value={firmTime} />
            <MetadataRow label={t`UTC time`} value={utcTime} />
            <MetadataRow label={t`Entity`} value={entityDisplay.primary} />
            <MetadataRow label={t`Entity type`} value={entityTypeLabel} />
            <MetadataRow label={t`Entity id`} value={shortenAuditId(event.entityId)} />
            <MetadataRow label={t`Actor`} value={actor} />
            {event.reason ? <MetadataRow label={t`Reason`} value={event.reason} /> : null}
          </dl>

          <AuditChangeDetails changeView={changeView} />

          <dl className="grid gap-4 rounded-lg border border-divider-subtle p-4">
            <MetadataRow label={t`IP hash`} value={event.ipHash ?? t`Not recorded`} />
            <MetadataRow
              label={t`User agent hash`}
              value={event.userAgentHash ?? t`Not recorded`}
            />
            <MetadataRow label={t`Practice ID`} value={event.firmId} />
          </dl>
        </div>
      </div>
    </>
  )
}

function AuditChangeDetails({ changeView }: { changeView: AuditChangeView }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
        <Trans>What changed</Trans>
      </h3>
      {changeView.changes.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-divider-subtle">
          <div className="grid grid-cols-[minmax(88px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-0 border-b border-divider-subtle bg-background-subtle px-3 py-2 text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
            <span>
              <Trans>Field</Trans>
            </span>
            <span>
              <Trans>Previous</Trans>
            </span>
            <span>
              <Trans>New</Trans>
            </span>
          </div>
          {changeView.changes.map((row) => (
            <div
              key={`${row.field}-${row.previous}-${row.next}`}
              className="grid grid-cols-[minmax(88px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-0 border-b border-divider-subtle px-3 py-2 text-sm last:border-b-0"
            >
              <span className="font-medium text-text-primary">{row.field}</span>
              <span className="break-words text-text-secondary">{row.previous}</span>
              <span className="break-words text-text-primary">{row.next}</span>
            </div>
          ))}
        </div>
      ) : null}
      {changeView.notes.length > 0 ? (
        <div className="grid gap-1 text-sm text-text-secondary">
          {changeView.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}
    </section>
  )
}
