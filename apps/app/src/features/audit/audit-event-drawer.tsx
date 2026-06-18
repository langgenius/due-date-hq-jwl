import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Astroid } from 'lucide-react'

import type { AiEventMetadata, AuditActorType, AuditEventPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { formatDateTimeWithTimezone } from '@/lib/utils'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import {
  useLifecycleV2StatusLabels,
  useReadinessLabels,
  useStatusLabels,
} from '@/features/obligations/status-control'
import { useLifecycleV2 } from '@/features/obligations/use-lifecycle-v2'

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

function AuditEventField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <CapsFieldLabel as="dt">{label}</CapsFieldLabel>
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
  // v2-aware labels: see audit-log-table.tsx for the rationale.
  const lifecycleV2 = useLifecycleV2()
  const legacyStatusLabels = useStatusLabels()
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const statusLabels = lifecycleV2 ? v2StatusLabels : legacyStatusLabels
  const readinessLabels = useReadinessLabels()
  const changeLabels = useAuditChangeLabels({ actionLabels, readinessLabels, statusLabels })
  // η pass — F-035 / F-036: see audit-log-table.tsx for the actor logic.
  const actor = event.actorType === 'ai' ? t`AI` : (event.actorLabel ?? event.actorId ?? t`System`)
  const actionLabel = formatAuditActionLabel(event.action, actionLabels)
  const entityTypeLabel = formatAuditEntityTypeLabel(event.entityType, entityTypeLabels)
  const entityDisplay = getAuditEntityDisplay(event, entityTypeLabel)
  const firmTime = formatDateTimeWithTimezone(event.createdAt, firmTimezone)
  const utcTime = formatDateTimeWithTimezone(event.createdAt, 'UTC')
  const changeView = buildAuditChangeView(event, changeLabels, firmTimezone)
  const actorTypeLabel = useActorTypeLabel(event.actorType)

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
              {/* η pass — F-035 / F-023: provenance chips. The Astroid
                  pill is the canonical "AI was involved" marker; the
                  "Overrode AI" pill surfaces F-023 reverse-provenance
                  (a user who edited a previously-AI value). Both are
                  optional — non-AI events show neither. */}
              {event.actorType === 'ai' || event.actorType === 'ai_assisted' ? (
                <Badge shape="square" variant="info">
                  <Astroid aria-hidden />
                  {event.actorType === 'ai' ? <Trans>AI</Trans> : <Trans>AI-assisted</Trans>}
                </Badge>
              ) : null}
              {event.previousActorType === 'ai' && event.actorType === 'user' ? (
                <Badge shape="square" variant="warning">
                  <Trans>Overrode AI suggestion</Trans>
                </Badge>
              ) : null}
            </div>
            <p className="text-base text-text-primary">{changeView.headline}</p>
          </section>

          <dl className="grid gap-4 rounded-lg border border-divider-subtle p-4">
            <AuditEventField label={t`Practice time`} value={firmTime} />
            <AuditEventField label={t`UTC time`} value={utcTime} />
            <AuditEventField label={t`Entity`} value={entityDisplay.primary} />
            <AuditEventField label={t`Entity type`} value={entityTypeLabel} />
            <AuditEventField label={t`Entity id`} value={shortenAuditId(event.entityId)} />
            <AuditEventField label={t`Actor`} value={actor} />
            <AuditEventField label={t`Actor type`} value={actorTypeLabel} />
            {event.reason ? <AuditEventField label={t`Reason`} value={event.reason} /> : null}
          </dl>

          <AiTraceSection actorType={event.actorType} metadata={event.aiEventMetadata} />

          <AuditChangeDetails changeView={changeView} />

          <dl className="grid gap-4 rounded-lg border border-divider-subtle p-4">
            <AuditEventField label={t`IP hash`} value={event.ipHash ?? t`Not recorded`} />
            <AuditEventField
              label={t`User agent hash`}
              value={event.userAgentHash ?? t`Not recorded`}
            />
          </dl>
        </div>
      </div>
    </>
  )
}

function useActorTypeLabel(actorType: AuditActorType): string {
  // η pass — F-035. The drawer's field-grid surfaces actor_type as a
  // first-class piece of provenance, not just a chip. CPAs auditing
  // events want to read the value, not infer it from icons.
  const { t } = useLingui()
  switch (actorType) {
    case 'ai':
      return t`AI (autonomous)`
    case 'ai_assisted':
      return t`AI-assisted (user applied)`
    case 'system':
      return t`System (cron / queue)`
    case 'user':
    default:
      return t`User`
  }
}

function AiTraceSection({
  actorType,
  metadata,
}: {
  actorType: AuditActorType
  metadata: AiEventMetadata | null
}) {
  // η pass — F-037: AI trace disclosure. Only renders for AI / ai_assisted
  // events. If metadata is missing (older events written before the column
  // landed, or AI paths that haven't been wired yet), we still render the
  // section header with a graceful "not recorded" line so the CPA knows
  // the row IS AI-originated even when the trace is absent.
  const { t } = useLingui()
  if (actorType !== 'ai' && actorType !== 'ai_assisted') return null
  const hasAny =
    metadata !== null &&
    Object.values(metadata).some((value) => value !== undefined && value !== null)

  return (
    <section className="grid gap-3">
      <CapsFieldLabel as="h3" variant="field" className="flex items-center gap-2">
        <Astroid className="size-3" aria-hidden />
        <Trans>AI trace</Trans>
      </CapsFieldLabel>
      {hasAny && metadata ? (
        <dl className="grid gap-4 rounded-lg border border-divider-subtle p-4">
          {metadata.model ? <AuditEventField label={t`Model`} value={metadata.model} /> : null}
          {metadata.promptVersion ? (
            <AuditEventField label={t`Prompt version`} value={metadata.promptVersion} />
          ) : null}
          {metadata.inputTokens !== undefined ? (
            <AuditEventField
              label={t`Input tokens`}
              value={metadata.inputTokens.toLocaleString()}
            />
          ) : null}
          {metadata.outputTokens !== undefined ? (
            <AuditEventField
              label={t`Output tokens`}
              value={metadata.outputTokens.toLocaleString()}
            />
          ) : null}
          {metadata.latencyMs !== undefined ? (
            <AuditEventField
              label={t`Latency`}
              value={`${metadata.latencyMs.toLocaleString()} ms`}
            />
          ) : null}
          {metadata.guardStatus ? (
            <AuditEventField label={t`Guard status`} value={metadata.guardStatus} />
          ) : null}
          {metadata.confidence !== undefined ? (
            <AuditEventField
              label={t`Confidence`}
              value={`${Math.round(metadata.confidence * 100)}%`}
            />
          ) : null}
          {metadata.aiOutputId ? (
            <AuditEventField label={t`AI output id`} value={metadata.aiOutputId} />
          ) : null}
        </dl>
      ) : (
        <p className="rounded-lg border border-dashed border-divider-subtle px-4 py-3 text-xs text-text-tertiary">
          <Trans>
            This event was AI-originated. Trace metadata (model, prompt, tokens) was not recorded
            for this row.
          </Trans>
        </p>
      )}
    </section>
  )
}

function AuditChangeDetails({ changeView }: { changeView: AuditChangeView }) {
  return (
    <section className="grid gap-3">
      <CapsFieldLabel as="h3" variant="field">
        <Trans>What changed</Trans>
      </CapsFieldLabel>
      {changeView.changes.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-divider-subtle">
          <CapsFieldLabel
            as="div"
            className="grid grid-cols-[minmax(88px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-0 border-b border-divider-subtle bg-background-subtle px-3 py-2"
          >
            <span>
              <Trans>Field</Trans>
            </span>
            <span>
              <Trans>Previous</Trans>
            </span>
            <span>
              <Trans>New</Trans>
            </span>
          </CapsFieldLabel>
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
