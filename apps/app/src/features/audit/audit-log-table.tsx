import { useCallback, useMemo } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { SparklesIcon } from 'lucide-react'

import type { AuditEventPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { DeltaMark, highlightCitations } from '@/components/primitives/legal-typography'
import { formatDateTimeWithTimezone, formatRelativeTime } from '@/lib/utils'
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
import {
  auditDayBandLabel,
  auditDayKey,
  auditTimeOfDay,
  getAuditTimelineIcon,
  getAuditTimelineToneTokens,
  getAuditTimelineType,
  type AuditTimelineType,
} from './audit-timeline-model'

// Snapshot "name" fields occasionally carry a bare UUID (e.g. obligationId);
// a UUID is not a human name, so the meta chip falls back to the short id.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * AuditLogTable — the practice audit stream rendered as a day-grouped
 * timeline (Pencil `RqOJw`). Each day is introduced by a sticky-feel
 * band ("Today · Fri · Jun 5, 2026" + N events); rows carry a left time
 * rail (HH:MM + relative), a category-tinted icon tile, and a body with
 * a TYPE eyebrow · actor · short hash, the change headline, and a row
 * of mono metadata chips. The whole row stays a button that opens the
 * audit-event drawer — the wired query / filters above are unchanged.
 */
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

  const typeLabels = useMemo<Record<AuditTimelineType, string>>(
    () => ({
      filing: t`Filing`,
      amendment: t`Amendment`,
      decision: t`Decision`,
      access: t`Access`,
      system: t`System`,
    }),
    [t],
  )

  // Group the (already newest-first) events into local-day buckets,
  // preserving order. Today / Yesterday get a relative prefix.
  const todayKey = auditDayKey(new Date().toISOString(), firmTimezone)
  const yesterdayKey = auditDayKey(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    firmTimezone,
  )
  const days = useMemo(() => {
    const buckets: Array<{ key: string; events: AuditEventPublic[] }> = []
    for (const event of events) {
      const key = auditDayKey(event.createdAt, firmTimezone)
      const last = buckets.at(-1)
      if (last && last.key === key) last.events.push(event)
      else buckets.push({ key, events: [event] })
    }
    return buckets
  }, [events, firmTimezone])

  return (
    <div
      className="overflow-hidden rounded-xl border border-divider-subtle"
      aria-label={t`Audit event timeline`}
    >
      {days.map((day) => {
        const sample = day.events[0]
        const relativePrefix =
          day.key === todayKey ? t`Today` : day.key === yesterdayKey ? t`Yesterday` : null
        const bandLabel = sample ? auditDayBandLabel(sample.createdAt, firmTimezone) : day.key
        return (
          <div key={day.key}>
            <div className="flex items-center justify-between gap-3 border-y border-divider-subtle bg-background-section px-5 py-2.5 first:border-t-0">
              <CapsFieldLabel as="span" variant="group" className="text-text-secondary">
                {relativePrefix ? `${relativePrefix} · ${bandLabel}` : bandLabel}
              </CapsFieldLabel>
              <span className="font-mono text-caption-xs font-semibold tracking-wide text-text-tertiary tabular-nums">
                <Plural value={day.events.length} one="# event" other="# events" />
              </span>
            </div>
            {day.events.map((event) => {
              // Prefer the human label; an unresolvable actorId is shortened
              // (full value lives on the row's title attribute) rather than
              // printed as a full UUID in prose.
              const actor =
                event.actorType === 'ai'
                  ? t`AI`
                  : (event.actorLabel ??
                    (event.actorId ? shortenAuditId(event.actorId) : t`System`))
              const actionLabel = formatAuditActionLabel(event.action, actionLabels)
              const entityTypeLabel = formatAuditEntityTypeLabel(event.entityType, entityTypeLabels)
              const entityDisplay = getAuditEntityDisplay(event, entityTypeLabel)
              const changeHeadline = buildAuditChangeView(
                event,
                changeLabels,
                firmTimezone,
              ).headline
              return (
                <AuditTimelineRow
                  key={event.id}
                  event={event}
                  actor={actor}
                  actionLabel={actionLabel}
                  entityTypeLabel={entityTypeLabel}
                  entityDisplay={entityDisplay}
                  changeHeadline={changeHeadline}
                  typeLabel={typeLabels[getAuditTimelineType(event)]}
                  firmTimezone={firmTimezone}
                  onOpenEvent={onOpenEvent}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function AuditTimelineRow({
  event,
  actor,
  actionLabel,
  entityTypeLabel,
  entityDisplay,
  changeHeadline,
  typeLabel,
  firmTimezone,
  onOpenEvent,
}: {
  event: AuditEventPublic
  actor: string
  actionLabel: string
  entityTypeLabel: string
  entityDisplay: { primary: string; secondary: string }
  changeHeadline: string
  typeLabel: string
  firmTimezone: string
  onOpenEvent: (id: string) => void
}) {
  const { t } = useLingui()
  const type = getAuditTimelineType(event)
  const Icon = getAuditTimelineIcon(type)
  const tone = getAuditTimelineToneTokens(type)
  const time = auditTimeOfDay(event.createdAt, firmTimezone)
  const relative = formatRelativeTime(event.createdAt)
  const absolute = formatDateTimeWithTimezone(event.createdAt, firmTimezone)
  const hash = event.ipHash ? shortenAuditId(event.ipHash) : null

  // "SYSTEM · Sarah Martinez" reads as a contradiction: the eyebrow is the
  // derived timeline category, but when a person performed the action the
  // category fallback ("system" = anything unmatched) must not outrank the
  // actor. Person present → drop the SYSTEM eyebrow. Conversely, a true
  // system event with no actor would render "SYSTEM · System" — drop the
  // redundant actor there.
  const actorIsPerson =
    (event.actorType === 'user' || event.actorType === 'ai_assisted') &&
    Boolean(event.actorLabel ?? event.actorId)
  const showTypeEyebrow = !(type === 'system' && actorIsPerson)
  const actorIsSystemFallback = event.actorType !== 'ai' && !event.actorLabel && !event.actorId
  const showActor = !(type === 'system' && actorIsSystemFallback)

  const handleClick = useCallback(() => onOpenEvent(event.id), [event.id, onOpenEvent])
  // Native <button> handles Enter/Space natively — no explicit keyboard handler needed.

  // Meta chips: entity type + the entity's human name when the change
  // snapshot carries one ("client Hudson River Imports"), plus reason when
  // present. The raw id is demoted to the chip's title attribute — hover
  // (or the drawer) for forensics, prose for people.
  const entityName =
    entityDisplay.primary !== entityTypeLabel && !UUID_PATTERN.test(entityDisplay.primary)
      ? entityDisplay.primary
      : null
  const metaChips: Array<{ text: string; title?: string }> = [
    {
      text: `${entityTypeLabel.toLowerCase()} ${entityName ?? shortenAuditId(event.entityId)}`,
      title: event.entityId,
    },
    ...(event.reason ? [{ text: event.reason }] : []),
  ]

  return (
    <button
      type="button"
      aria-label={t`View audit detail`}
      data-audit-action={event.action}
      onClick={handleClick}
      className="flex w-full cursor-pointer gap-4 border-b border-divider-subtle px-5 py-3.5 text-left outline-none transition last:border-b-0 hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset active:scale-[0.99] motion-reduce:active:scale-100"
    >
      {/* Left time rail */}
      <div className="grid w-16 shrink-0 gap-0.5 pt-0.5 sm:w-[88px]">
        <span className="font-mono text-xs font-semibold text-text-primary tabular-nums">
          {time}
        </span>
        <span
          className="font-mono text-caption-xs text-text-tertiary tabular-nums"
          title={absolute}
        >
          {relative}
        </span>
      </div>

      {/* Category icon tile */}
      <span
        className={cn('grid size-8 shrink-0 place-items-center rounded-lg', tone.tile)}
        aria-hidden
      >
        <Icon className={cn('size-4', tone.icon)} />
      </span>

      {/* Body */}
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {showTypeEyebrow ? (
            <CapsFieldLabel as="span" variant="group" className="font-mono">
              {typeLabel}
            </CapsFieldLabel>
          ) : null}
          {showTypeEyebrow && showActor ? (
            <span className="size-1 rounded-full bg-text-tertiary/50" aria-hidden />
          ) : null}
          {showActor ? (
            <span
              className="text-xs font-semibold text-text-secondary"
              title={event.actorId ?? undefined}
            >
              {actor}
            </span>
          ) : null}
          {event.actorType === 'ai_assisted' ? (
            <Badge
              variant="info"
              size="sm"
              shape="square"
              title={t`AI produced the value; the user applied it.`}
            >
              <SparklesIcon data-icon="inline-start" aria-hidden />
              <Trans>AI-assisted</Trans>
            </Badge>
          ) : null}
          <span className="grow" />
          {hash ? (
            <span
              className="font-mono text-caption-xs text-text-tertiary tabular-nums"
              title={event.ipHash ?? undefined}
            >
              {hash}
            </span>
          ) : null}
        </div>

        <p className="text-sm leading-snug text-text-primary">
          {/* Amendment / revert / unfile rows wear a leading Δ — the
              regulatory-diff convention for "this is a change". The icon
              tile already signals the category; Δ adds the semantic mark
              at the prose level so the row reads as "Δ <what changed>"
              at scan speed. `highlightCitations` re-renders any inline
              `§ XXXX` reference (e.g. "§ 6651(a)(2)") in the canonical
              Citation typography. */}
          {type === 'amendment' ? <DeltaMark className="mr-1" /> : null}
          {highlightCitations(changeHeadline) || `${actionLabel} · ${entityDisplay.primary}`}
        </p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
          {metaChips.map((chip, index) => (
            <span key={chip.text} className="inline-flex items-center gap-2">
              {index > 0 ? (
                <span className="size-1 rounded-full bg-text-tertiary/50" aria-hidden />
              ) : null}
              <span className="font-mono text-caption-xs text-text-tertiary" title={chip.title}>
                {/* Reason text on meta chips routinely contains "§ 6651"
                    style citations (the penalty/justification register).
                    Same Citation chrome applied here for consistency. */}
                {highlightCitations(chip.text)}
              </span>
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}
