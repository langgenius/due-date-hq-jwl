import { useMemo, useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ExternalLinkIcon, UsersIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { cn } from '@duedatehq/ui/lib/utils'

import {
  ListRail,
  ListRailBody,
  ListRailHead,
  ListRailSection,
} from '@/components/patterns/list-rail'
import { CountPill } from '@/components/primitives/count-pill'
import { SearchInput } from '@/components/primitives/search-input'
import { useActiveAlertCount } from '@/features/alerts/api'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { aiConfidenceTier } from '@/features/_surface-vocabulary/ai-confidence'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { formatRelativeTime } from '@/lib/utils'

import { changeKindLabel } from './PulseChangeKindChip'
import { isActiveAlert } from './pulse-alert-chrome'

/**
 * The 380px alert-list secondary sidebar shown on the full-page detail
 * layout — its own `Alerts · N active` head, an All / Unresolved
 * segmented control + search, and a compact-item body (60px time
 * column + head meta-row + two-line title + source + bottom meta).
 * Each item carries the same field set as the main /alerts row
 * (PulseAlertRow): ACTIVE badge · jurisdiction · form · change-kind in
 * the head, the title, the source link, and the affected-clients + AI-
 * confidence bottom meta. The open alert's item carries the 2px left
 * accent.
 */

export function AlertListRail({
  alerts,
  activeId,
  onSelect,
  onCloseDetail,
  workQueue,
  onWorkQueueChange,
  workQueueCounts,
}: {
  alerts: readonly PulseAlertPublic[]
  activeId: string | null
  onSelect: (alertId: string) => void
  onCloseDetail?: () => void
  // The work-queue toggle is echoed in the rail head so you can switch
  // queues while stepping through a detail. Wired to the page's
  // workQueue state; omit to hide it.
  workQueue?: 'active' | 'review'
  onWorkQueueChange?: (queue: 'active' | 'review') => void
  workQueueCounts?: { active: number; review: number }
}) {
  const { t } = useLingui()
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)

  const [search, setSearch] = useState('')

  // "N active" head count uses the SAME authoritative source as the sidebar
  // badge and the page-header pill (`pulse.activeCount` = matched +
  // partially_applied, approved, not expired) — NOT a count of the rows handed
  // to this rail (which are capped at the list limit).
  const activeCount = useActiveAlertCount()

  // The rail has no All/Unresolved segmented — every alert in the active
  // queue is already unresolved, so the toggle is a near-no-op here (it
  // lives on the main list page where the distinction matters). The rail
  // filters by search only, and the search owns the full filter bar.
  const query = search.trim().toLowerCase()
  const visible = useMemo(
    () =>
      alerts.filter(
        (a) =>
          query === '' ||
          a.title.toLowerCase().includes(query) ||
          a.source.toLowerCase().includes(query),
      ),
    [alerts, query],
  )

  return (
    <ListRail>
      {/* ListHead — "Alerts · N active". */}
      <ListRailHead className="justify-between">
        {/* The head title closes the open detail and returns to the
            /alerts list. Rendered as a button when a close handler is
            wired; falls back to a plain label otherwise. */}
        {onCloseDetail ? (
          <button
            type="button"
            onClick={onCloseDetail}
            className="-mx-1 cursor-pointer rounded-lg px-1 text-[16px] font-semibold text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Alerts</Trans>
          </button>
        ) : (
          <span className="text-[16px] font-semibold text-text-primary">
            <Trans>Alerts</Trans>
          </span>
        )}
        {activeCount > 0 ? (
          <CountPill>
            <Plural value={activeCount} one="# active" other="# active" />
          </CountPill>
        ) : null}
      </ListRailHead>

      {/* Work-queue toggle — echoes the main list's Active/Review switch so the
          queue can be changed while a detail is open. */}
      {workQueue && onWorkQueueChange ? (
        <ListRailSection>
          <Segmented
            className="h-8 w-full [&>button]:h-7 [&>button]:flex-1"
            ariaLabel={t`Alert work queue`}
            value={workQueue}
            onValueChange={onWorkQueueChange}
            options={[
              {
                value: 'review',
                label: (
                  <span className="inline-flex items-center gap-1">
                    <Trans>Review</Trans>
                    <span className="tabular-nums text-text-tertiary">
                      {workQueueCounts?.review ?? 0}
                    </span>
                  </span>
                ),
              },
              {
                value: 'active',
                label: (
                  <span className="inline-flex items-center gap-1">
                    <Trans>Active</Trans>
                    <span className="tabular-nums text-text-tertiary">
                      {workQueueCounts?.active ?? 0}
                    </span>
                  </span>
                ),
              },
            ]}
          />
        </ListRailSection>
      ) : null}

      {/* FilterRow — full-width search (no All/Unresolved segmented,
          see note above). */}
      <ListRailSection>
        <SearchInput
          variant="compact"
          value={search}
          onChange={setSearch}
          placeholder={t`Search alerts`}
          className="w-full"
        />
      </ListRailSection>

      {/* ListBody — compact items, the open one accented. */}
      <ListRailBody>
        {visible.length === 0 ? (
          <p className="px-[18px] py-10 text-center text-base text-text-tertiary">
            <Trans>No alerts match.</Trans>
          </p>
        ) : (
          visible.map((alert) => (
            <RailItem
              key={alert.id}
              alert={alert}
              active={alert.id === activeId}
              firmTimezone={firmTimezone}
              onSelect={() => onSelect(alert.id)}
            />
          ))
        )}
      </ListRailBody>
    </ListRail>
  )
}

function RailItem({
  alert,
  active,
  firmTimezone,
  onSelect,
}: {
  alert: PulseAlertPublic
  active: boolean
  firmTimezone: string
  onSelect: () => void
}) {
  const { t } = useLingui()
  const published = new Date(alert.publishedAt)
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: firmTimezone,
  }).format(published)
  const timeLabel = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: firmTimezone,
  }).format(published)
  const relative = formatRelativeTime(alert.publishedAt)
  const form = alert.forms[0] ?? null

  // Bottom-meta parity with the main /alerts row (PulseAlertRow):
  // affected-clients count (matched + needs-review) and the AI
  // confidence meter. Both read straight off PulseAlertPublic — no
  // detail-cache subscription needed (the old→new date row + ACTION line
  // on the main row DO need the detail cache, so those stay in the detail
  // pane, not the rail).
  const impacted = alert.matchedCount + alert.needsReviewCount
  const confidencePct = Math.round(alert.confidence * 100)
  const confidenceTier = aiConfidenceTier(alert.confidence)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={t`Alert: ${alert.title}`}
      className={cn(
        // `border-b-divider-subtle` (bottom-only color) so it doesn't
        // override the left accent below. Roomier item padding (py-4) +
        // a touch more column gap so the rail breathes.
        'flex w-full cursor-pointer gap-3 border-b border-b-divider-subtle px-[18px] py-4 text-left outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt',
        // Selected vs unselected is carried by the 2px left accent + bg
        // wash on the active row, and a hover wash on the rest. The
        // inactive row stays full-strength (no opacity dimming — that read
        // as "disabled") so every row looks active/clickable; the only
        // distinction is the accent + fill, not contrast.
        active
          ? 'border-l-2 border-l-state-accent-solid bg-state-accent-hover'
          : 'border-l-2 border-l-transparent hover:bg-state-base-hover',
      )}
    >
      {/* Time column (60px). */}
      <div className="flex w-[60px] shrink-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-text-primary">{dateLabel}</span>
        <span className="text-caption-xs font-medium tracking-[-0.1px] text-text-tertiary tabular-nums">
          {timeLabel}
        </span>
        <span className="text-caption-xs font-medium text-text-muted">{relative}</span>
      </div>

      {/* Content — head meta row + 2-line title + bottom meta row, the
          same field set the main /alerts row carries, wrapped to the
          narrower rail width. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {/* ACTIVE badge — mirrors the main row's actionable-queue flag
              (green dot + label) for due-date-overlay alerts. */}
          {isActiveAlert(alert) ? (
            <span className="inline-flex h-[20px] shrink-0 items-center gap-1 rounded-lg border border-state-success-border bg-state-success-hover px-1.5 text-xs font-semibold tracking-[0.3px] text-text-success uppercase">
              <span className="size-1.5 rounded-full bg-text-success" aria-hidden />
              <Trans>Active</Trans>
            </span>
          ) : null}
          {/* Plain bordered 2-letter code (no StateBadge seal),
              matching the /alerts row. */}
          <span className="inline-flex h-[20px] shrink-0 items-center rounded-lg border border-divider-regular px-1.5 text-xs font-semibold text-text-secondary uppercase">
            {alert.jurisdiction}
          </span>
          {form ? <TaxCodeBadge code={form} /> : null}
          {/* Change-kind matches the /today card's treatment — sans
              font-semibold tracking-[0.4px] text-tertiary. */}
          <span className="text-caption-xs font-semibold tracking-[0.4px] text-text-tertiary uppercase">
            {changeKindLabel(alert.changeKind)}
          </span>
        </div>
        {/* Title is AA-readable on both states — text-primary when active,
            text-secondary otherwise (never the faint tertiary that read as
            disabled). The 2px left accent on the active row carries the
            selected distinction. */}
        <span
          className={cn(
            'line-clamp-2 text-base font-medium leading-[1.35]',
            active ? 'text-text-primary' : 'text-text-secondary',
          )}
        >
          {alert.title}
        </span>

        {/* Source link — mirrors the main row's source slot
            (ExternalLinkIcon + alert.source). Opens the bulletin in a new
            tab; click is isolated so it doesn't also select the row. */}
        <span
          role="link"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation()
            window.open(alert.sourceUrl, '_blank', 'noopener,noreferrer')
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              event.stopPropagation()
              window.open(alert.sourceUrl, '_blank', 'noopener,noreferrer')
            }
          }}
          className="inline-flex min-w-0 cursor-pointer items-center gap-1 text-sm font-medium text-text-tertiary outline-none transition-colors hover:text-text-secondary hover:underline focus-visible:text-text-secondary"
        >
          <ExternalLinkIcon className="size-3 shrink-0" strokeWidth={1.5} aria-hidden />
          <span className="truncate">{alert.source}</span>
        </span>

        {/* Bottom meta — affected-clients line + AI confidence meter, the
            same two signals the main row carries on its bottom shelf,
            wrapped to the rail width. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-muted">
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap',
              impacted > 0 ? 'text-text-secondary' : 'text-text-muted',
            )}
          >
            <UsersIcon className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
            {impacted > 0 ? (
              <Plural value={impacted} one="Affects # client" other="Affects # clients" />
            ) : (
              <Trans>No matching clients</Trans>
            )}
          </span>
          {/* AI confidence — neutral three-bar signal-strength meter + %,
              identical to the main row (LOW keeps a warning tint; the rest
              stay neutral so it reads as a measurement, not a status). */}
          <span
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-text-tertiary tabular-nums"
            title={t`AI confidence ${confidencePct}%`}
          >
            <span className="inline-flex items-end gap-[2px]" aria-hidden>
              {[0, 1, 2].map((i) => {
                const filled =
                  i < (confidenceTier === 'high' ? 3 : confidenceTier === 'medium' ? 2 : 1)
                return (
                  <span
                    key={i}
                    className={cn(
                      'w-[3px] rounded-full',
                      i === 0 ? 'h-1.5' : i === 1 ? 'h-2' : 'h-2.5',
                      filled
                        ? confidenceTier === 'low'
                          ? 'bg-text-warning'
                          : 'bg-text-tertiary'
                        : 'bg-divider-regular',
                    )}
                  />
                )
              })}
            </span>
            {t`${confidencePct}% conf`}
          </span>
        </div>
      </div>
    </button>
  )
}
