import { useEffect, useMemo, useRef, useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CircleAlertIcon, UsersIcon } from 'lucide-react'

import type { PulseAlertPublic, PulsePriorityLevel } from '@duedatehq/contracts'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { isLowAiConfidence } from '@/features/_surface-vocabulary/ai-confidence'

import {
  ListRail,
  ListRailBody,
  ListRailHead,
  ListRailSection,
} from '@/components/patterns/list-rail'
import { CountPill } from '@/components/primitives/count-pill'
import { SearchInput } from '@/components/primitives/search-input'
import { SeverityChip, type SeverityLevel } from '@/components/primitives/severity-chip'
import { JurisdictionChip } from '@/components/primitives/state-badge'
import { useActiveAlertCount } from '@/features/alerts/api'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { deadlineProximity, proximityToTier, thresholdsForKind } from '../lib/urgency'
import { AlertSourceLink } from './AlertSourceLink'
import { ChangeKindIcon, changeKindLabel } from './PulseChangeKindChip'

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

/**
 * Leading severity pill, mirroring `PulseAlertRow`'s `LEVEL_PILL` — the same
 * `<SeverityChip>` family + label per tier (urgent → critical red, high →
 * orange). The rail only ever derives the BASELINE (deadline-proximity) tier,
 * never the smart-priority queue tier, and renders the chip ONLY for
 * urgent/high — `normal` stays null so the lean rail stays calm.
 */
const LEVEL_PILL: Record<PulsePriorityLevel, { label: string; level: SeverityLevel }> = {
  urgent: { label: 'URGENT', level: 'critical' },
  high: { label: 'HIGH', level: 'high' },
  normal: { label: 'NORMAL', level: 'neutral' },
}

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
                // 2026-06-15 (Yuqi "number in toggle never in a badge"): the
                // count is a plain number, not a pill. Review still pulls the
                // eye when it carries work — its count reads in the accent tone
                // ("N waiting for you") vs Active's quiet tertiary count. Color
                // is the signal, not weight (color+bold is a banned
                // double-highlight — matches AlertsListPage's Review tab).
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Trans>Review</Trans>
                    <span
                      className={cn(
                        'tabular-nums',
                        (workQueueCounts?.review ?? 0) > 0
                          ? 'text-text-accent'
                          : 'text-text-tertiary',
                      )}
                    >
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
          placeholder={t`Filter by title or source`}
          className="w-full"
        />
      </ListRailSection>

      {/* ListBody — compact items, the open one accented. */}
      <ListRailBody>
        {visible.length === 0 ? (
          // Zero-results is a recovery moment, not a dead-end: offer a one-click
          // way back to the full list (matches the page-level empties).
          <div className="px-[18px] py-10 text-center">
            <p className="text-base text-text-tertiary">
              <Trans>No alerts match.</Trans>
            </p>
            {search.trim().length > 0 ? (
              <TextLink
                variant="accent"
                size="sm"
                onClick={() => setSearch('')}
                className="mt-2 inline-block"
              >
                <Trans>Clear filter</Trans>
              </TextLink>
            ) : null}
          </div>
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

  // Parity with the main /alerts row (Pencil aUZTy) so the rail speaks the same
  // visual language — a smooth hand-off from the list into the detail layout:
  //   • unread dot leads the time column while the alert awaits a decision
  //   • a confidence pill that fires on the SAME < 0.5 threshold as the main
  //     row + the detail banner (2026-06-15 critique #1/#3), so one alert never
  //     reads "Low" here and "Medium" in its detail
  const unread = alert.status === 'matched' || alert.status === 'partially_applied'
  const showLowConfidence = isLowAiConfidence(alert.confidence)

  // Leading severity pill = the BASELINE (deadline-proximity) tier, derived the
  // same ungated way `PulseAlertRow` derives its Layer-1 fallback: bucket the
  // alert's own `actionDeadline` against the per-kind horizon, then map to the
  // shared priority vocabulary. The rail never has the smart-priority queue
  // tier, so this is always the baseline read. Render the chip ONLY for
  // urgent/high — `normal` is null so the lean rail isn't stamped with a pill on
  // every far-out / no-deadline item (silence stays the signal, same call as the
  // main row's baseline tier).
  const baselineTier = proximityToTier(
    deadlineProximity(alert.actionDeadline, Date.now(), thresholdsForKind(alert.changeKind))
      .proximity,
  )
  const levelPill = baselineTier === 'normal' ? null : LEVEL_PILL[baselineTier]

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
        'group/rail flex w-full cursor-pointer gap-3 border-b border-b-divider-subtle px-[18px] py-4 text-left outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt',
        // 2026-06-14 (Yuqi: "active bg is too dark"): selection is a LIGHT
        // neutral fill — `state-base-hover` (0.2) instead of the heavier
        // `state-base-active` (0.4). Hover on unselected rows drops to the
        // faint `state-base-hover-subtle` (0.08) so the selected row still
        // reads as the most present without being dark. No accent (steady
        // selection isn't the action color), no left bar (rail has its edge).
        active ? 'bg-state-base-hover' : 'hover:bg-state-base-hover-subtle',
      )}
    >
      {/* Time column (60px). When another alert is the selected one, the date
          dims so the open alert's date reads as the focal one (Yuqi 2026-06-15
          "unselected alerts dimmed — date + badge colours"); hover restores. */}
      <div
        className={cn(
          'flex w-[64px] shrink-0 flex-col gap-0.5 transition-opacity',
          !active && 'opacity-55 group-hover/rail:opacity-100',
        )}
      >
        {/* Unread dot (Pencil aUZTy) leads the date — accent while the alert
            awaits a decision; reserves its slot when read so dates stay
            aligned. Matches the main list's time-rail dot for a smooth
            hand-off into the detail layout. */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              // Unseen marker → bright highlight tier (--color-brand-highlight).
              unread ? 'bg-brand-highlight' : 'bg-transparent',
            )}
            aria-hidden
          />
          <span className="text-sm font-medium text-text-primary">{dateLabel}</span>
        </div>
        {/* Two lines only — date + wall-clock. The relative-time third
            line is gone entirely (batch 4 #9): in a date-sorted rail it
            restated the date column's information as noise. The time aligns
            under the date (past the dot's reserved slot). */}
        <span className="pl-3 text-caption-xs font-medium tracking-title text-text-tertiary tabular-nums">
          {timeLabel}
        </span>
      </div>

      {/* Content — head meta row + 2-line title + bottom meta row, the
          same field set the main /alerts row carries, wrapped to the
          narrower rail width. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Badge row dims on unselected items so the selected alert's chips
            carry the colour (Yuqi 2026-06-15); hover restores. */}
        <div
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-1.5 transition-opacity',
            !active && 'opacity-55 group-hover/rail:opacity-100',
          )}
        >
          {/* No ACTIVE badge (2026-06-12, Yuqi): the rail's own
              Review/Active toggle states the queue, so a per-item pill
              repeating it was noise — same call as the main list rows. */}
          {/* Leading severity pill (Pencil `Rrafe`) — the baseline
              deadline-proximity tier, the SAME `<SeverityChip>` + `LEVEL_PILL`
              treatment the main /alerts row carries (urgent → critical red, high
              → orange). Only urgent/high render; `normal` is null so the lean
              rail stays calm — the chip's presence is the time signal. */}
          {levelPill ? (
            <SeverityChip level={levelPill.level}>{levelPill.label}</SeverityChip>
          ) : null}
          {/* Shared JurisdictionChip primitive (outline reference tag,
              no StateBadge seal), matching the /alerts row. */}
          <JurisdictionChip code={alert.jurisdiction} />
          {/* Stock TaxCodeBadge chrome — the SAME alert wears the same
              chip in the row and the rail, and both match the app-wide
              form-badge treatment (same-entity-same-rendering audit). */}
          {form ? <TaxCodeBadge code={form} /> : null}
          {/* Change-kind — icon + sentence-case medium secondary, matching
              the main row + detail hero (2026-06-14 consistency pass). */}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <ChangeKindIcon changeKind={alert.changeKind} />
            {changeKindLabel(alert.changeKind)}
          </span>
          {/* Confidence flag (Pencil aUZTy) — same low-only amber pill the main
              row carries, so a shaky extraction reads the same in both places.
              High confidence shows nothing. */}
          {showLowConfidence ? (
            <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-lg bg-state-warning-hover px-1.5 text-xs font-medium whitespace-nowrap text-text-warning">
              <CircleAlertIcon className="size-3 shrink-0" aria-hidden />
              <Trans>Low confidence</Trans>
            </span>
          ) : null}
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

        {/* Source — the shared `AlertSourceLink` (row-safe `stopPropagation`,
            trailing ↗ only when a sourceUrl exists; never a dead
            window.open(null) tab). */}
        <AlertSourceLink source={alert.source} sourceUrl={alert.sourceUrl} />

        {/* Bottom meta — client impact. Impacted rows are loud (icon +
            secondary); no-impact rows now stay SILENT (2026-06-15 critique #7),
            matching the main /alerts row: the line's presence is the signal, so
            the rail isn't padded with a muted "No client impact" on every item.
            The AI-confidence meter stays out — that's an apply-time fact, owned
            by the detail panel (Yuqi batch 4 #10). */}
        {impacted > 0 ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-text-secondary">
            <UsersIcon className="size-3.5 shrink-0" aria-hidden />
            <Plural value={impacted} one="Affects # client" other="Affects # clients" />
          </span>
        ) : null}
      </div>
    </button>
  )
}
