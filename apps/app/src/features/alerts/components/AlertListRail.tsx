import { useEffect, useMemo, useRef, useState } from 'react'
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
import { JurisdictionChip } from '@/components/primitives/state-badge'
import { useActiveAlertCount } from '@/features/alerts/api'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { changeKindLabel } from './PulseChangeKindChip'

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
            className="-mx-1 cursor-pointer rounded-lg px-1 text-item-title text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Alerts</Trans>
          </button>
        ) : (
          <span className="text-item-title text-text-primary">
            <Trans>Alerts</Trans>
          </span>
        )}
        {activeCount > 0 ? (
          // Neutral tone (critique #2): a standing count isn't an alarm — red
          // stays reserved for URGENT pills + overdue countdowns. "open" (not
          // "active") because the count spans both queues.
          <CountPill tone="neutral">
            <Plural value={activeCount} one="# open" other="# open" />
          </CountPill>
        ) : null}
      </ListRailHead>

      {/* Work-queue toggle — echoes the main list's Active/Review switch so the
          queue can be changed while a detail is open. */}
      {workQueue && onWorkQueueChange ? (
        <ListRailSection>
          <Segmented
            className="w-full [&>button]:flex-1"
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

  // 2026-06-12 (Yuqi "…go to the alert detail WITH THAT ALERT SELECTED AND
  // SCROLLED TO THE TOP"): on the rail's first paint the selected item
  // scrolls to the TOP of the list viewport (arriving from /today or a
  // shared URL, the selection is visible immediately, leading the list).
  // Later activations (↑/↓ paging) use 'nearest' so the rail never
  // teleports under an in-rail click — a click target is already visible.
  const itemRef = useRef<HTMLButtonElement | null>(null)
  const hasPainted = useRef(false)
  useEffect(() => {
    if (active) {
      itemRef.current?.scrollIntoView({ block: hasPainted.current ? 'nearest' : 'start' })
    }
    hasPainted.current = true
  }, [active])

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
  const form = alert.forms[0] ?? null

  // Bottom-meta parity with the main /alerts row (PulseAlertRow):
  // affected-clients count (matched + needs-review) and the AI
  // confidence meter. Both read straight off PulseAlertPublic — no
  // detail-cache subscription needed (the old→new date row + ACTION line
  // on the main row DO need the detail cache, so those stay in the detail
  // pane, not the rail).
  const impacted = alert.matchedCount + alert.needsReviewCount

  return (
    <button
      ref={itemRef}
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
        // Selected vs unselected is carried by the bg WASH alone — no left
        // accent bar. 2026-06-12 (Yuqi: "the side border doesn't work when the
        // item sits next to a floating sidebar on the left"): this rail abuts
        // the app's floating icon sidebar, so a 2px left bar doubled up against
        // that edge and read as a clash. The canonical hover-accent-bar motif
        // (dev-log 2026-06-10-hover-accent-bar-rows) still applies to rows that
        // DON'T border the sidebar; here the fill wash carries selection +
        // hover on its own. Inactive rows stay full-strength (no opacity
        // dimming — that read as "disabled").
        active ? 'bg-state-accent-hover' : 'hover:bg-state-base-hover',
      )}
    >
      {/* Time column (60px). */}
      <div className="flex w-[60px] shrink-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-text-primary">{dateLabel}</span>
        {/* Two lines only — date + wall-clock. The relative-time third
            line is gone entirely (batch 4 #9): in a date-sorted rail it
            restated the date column's information as noise. */}
        <span className="text-caption-xs font-medium tracking-title text-text-tertiary tabular-nums">
          {timeLabel}
        </span>
      </div>

      {/* Content — head meta row + 2-line title + bottom meta row, the
          same field set the main /alerts row carries, wrapped to the
          narrower rail width. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {/* No ACTIVE badge (2026-06-12, Yuqi): the rail's own
              Review/Active toggle states the queue, so a per-item pill
              repeating it was noise — same call as the main list rows. */}
          {/* Shared JurisdictionChip primitive (outline reference tag,
              no StateBadge seal), matching the /alerts row. */}
          <JurisdictionChip code={alert.jurisdiction} />
          {/* Stock TaxCodeBadge chrome — the SAME alert wears the same
              chip in the row and the rail, and both match the app-wide
              form-badge treatment (same-entity-same-rendering audit). */}
          {form ? <TaxCodeBadge code={form} /> : null}
          {/* Change-kind — the SAME demoted treatment as the main /alerts
              row (caption-xs/medium/muted): classification metadata, not a
              signal (batch 4 #8). */}
          <span className="text-chip-label text-text-muted uppercase">
            {changeKindLabel(alert.changeKind)}
          </span>
        </div>
        {/* Title is AA-readable on both states — text-primary when active,
            text-secondary otherwise (never the faint tertiary that read as
            disabled). The 2px left accent on the active row carries the
            selected distinction. */}
        <span
          className={cn(
            'line-clamp-2 text-base font-medium leading-snug',
            active ? 'text-text-primary' : 'text-text-secondary',
          )}
        >
          {alert.title}
        </span>

        {/* Source — interactive (text + trailing ↗, the one external-link
            order app-wide) ONLY when a sourceUrl exists; otherwise a plain
            non-clickable caption. Previously this called
            window.open(null) on url-less alerts — a dead about:blank tab
            (state-completeness audit). */}
        {alert.sourceUrl ? (
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
            className="inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-sm text-sm text-text-tertiary outline-none transition-colors hover:text-text-secondary hover:underline focus-visible:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <span className="truncate">{alert.source}</span>
            <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
          </span>
        ) : (
          <span className="inline-flex min-w-0 items-center text-sm text-text-tertiary">
            <span className="truncate">{alert.source}</span>
          </span>
        )}

        {/* Bottom meta — client impact, answered on EVERY row (it's
            triage question #1: which alert do I open next?). Impacted
            rows are loud (icon + secondary); zero-match rows state the
            conclusion quietly (muted, no icon) so the rail still ranks
            by impact at a glance. The AI-confidence meter stays out —
            that's an apply-time fact, owned by the detail panel (Yuqi
            batch 4 #10). */}
        {impacted > 0 ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-text-secondary">
            <UsersIcon className="size-3.5 shrink-0" aria-hidden />
            <Plural value={impacted} one="Affects # client" other="Affects # clients" />
          </span>
        ) : (
          <span className="whitespace-nowrap text-sm text-text-muted">
            <Trans>No client impact</Trans>
          </span>
        )}
      </div>
    </button>
  )
}
