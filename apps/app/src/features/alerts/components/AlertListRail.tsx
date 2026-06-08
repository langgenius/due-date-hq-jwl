import { useMemo, useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { SearchIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { cn } from '@duedatehq/ui/lib/utils'

import { CountPill } from '@/components/primitives/count-pill'
import { StateBadge } from '@/components/primitives/state-badge'
import { useActiveAlertCount } from '@/features/alerts/api'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { formatRelativeTime } from '@/lib/utils'

import { changeKindLabel } from './PulseChangeKindChip'

/**
 * 2026-06-08 (Pencil ibEoz `DOga0 List Pane`): the 380px alert-list
 * secondary sidebar shown on the full-page detail layout — its own
 * `Alerts · N active` head, an All / Unresolved segmented control +
 * search, and a compact-item body (60px time column + badge meta-row +
 * two-line title). The open alert's item carries the 2px left accent.
 *
 * This is the SECONDARY-SIDEBAR framing of the detail page; the prior
 * implementation rendered the full card list beside a slide-over
 * panel, which was the wrong skeleton.
 */
type RailTab = 'all' | 'unresolved'

export function AlertListRail({
  alerts,
  activeId,
  onSelect,
}: {
  alerts: readonly PulseAlertPublic[]
  activeId: string | null
  onSelect: (alertId: string) => void
}) {
  const { t } = useLingui()
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)

  const [tab, setTab] = useState<RailTab>('all')
  const [search, setSearch] = useState('')

  // "N active" head count uses the SAME authoritative source as the sidebar
  // badge and the page-header pill (`pulse.activeCount` = matched +
  // partially_applied, approved, not expired) — NOT a count of the rows handed
  // to this rail (which are capped at the list limit and miss partially_applied).
  // The Unresolved tab below still filters the visible rows by `matched`.
  const activeCount = useActiveAlertCount()

  const query = search.trim().toLowerCase()
  const visible = useMemo(
    () =>
      alerts.filter(
        (a) =>
          (tab === 'all' || a.status === 'matched') &&
          (query === '' ||
            a.title.toLowerCase().includes(query) ||
            a.source.toLowerCase().includes(query)),
      ),
    [alerts, tab, query],
  )

  return (
    <div className="flex h-full w-[380px] shrink-0 flex-col border-r border-divider-subtle bg-background-default">
      {/* ListHead — "Alerts · N active". */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-divider-subtle px-[18px] py-3.5">
        <span className="text-[15px] font-semibold text-text-primary">
          <Trans>Alerts</Trans>
        </span>
        {activeCount > 0 ? (
          <CountPill>
            <Plural value={activeCount} one="# active" other="# active" />
          </CountPill>
        ) : null}
      </div>

      {/* FilterRow — All / Unresolved segmented control + search. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-divider-subtle px-4 py-2.5">
        <Segmented
          size="sm"
          ariaLabel={t`Alert filter`}
          value={tab}
          onValueChange={setTab}
          options={[
            { value: 'all', label: <Trans>All</Trans> },
            { value: 'unresolved', label: <Trans>Unresolved</Trans> },
          ]}
        />
        <span className="flex-1" aria-hidden />
        <label className="inline-flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-state-base-hover focus-within:bg-state-base-hover">
          <SearchIcon className="size-3.5 shrink-0" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t`Search alerts`}
            className="w-0 bg-transparent outline-none focus:w-28"
          />
        </label>
      </div>

      {/* ListBody — compact items, the open one accented. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="px-[18px] py-10 text-center text-[13px] text-text-tertiary">
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
      </div>
    </div>
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

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={t`Alert: ${alert.title}`}
      className={cn(
        // `border-b-divider-subtle` (bottom-only color) so it doesn't
        // override the left accent below.
        // 2026-06-08 (Yuqi "左边 list 太密密麻麻"): roomier item padding
        // (py-4) + a touch more column gap so the rail breathes.
        'flex w-full gap-3 border-b border-b-divider-subtle px-[18px] py-4 text-left outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt',
        active
          ? 'border-l-2 border-l-state-accent-solid bg-[#fafbfc]'
          : 'border-l-2 border-l-transparent hover:bg-state-base-hover',
      )}
    >
      {/* Time column (60px). */}
      <div className="flex w-[60px] shrink-0 flex-col gap-0.5">
        <span className="text-[12px] font-medium text-text-primary">{dateLabel}</span>
        <span className="text-[10px] font-medium tracking-[-0.1px] text-text-tertiary tabular-nums">
          {timeLabel}
        </span>
        <span className="text-[10px] font-medium text-text-muted">{relative}</span>
      </div>

      {/* Content — badge meta row + 2-line title. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {/* 2026-06-08 (Yuqi alert-detail feedback #9 "missing the circular
              rounded state badge"): the jurisdiction chip carries the
              canonical StateBadge motif + code, matching the /today card +
              /alerts row. */}
          <span className="inline-flex h-[20px] shrink-0 items-center gap-1 rounded-[6px] border border-divider-regular px-1.5 text-[11px] font-semibold text-text-secondary uppercase">
            <StateBadge code={alert.jurisdiction} size="xs" style={{ width: 12, height: 12 }} />
            {alert.jurisdiction}
          </span>
          {form ? <TaxCodeBadge code={form} /> : null}
          {/* 2026-06-08 (Yuqi feedback #14 "same style as Today's alert"):
              change-kind matches the /today card's treatment — sans
              font-semibold tracking-[0.4px] text-tertiary (was font-bold
              text-muted). */}
          <span className="text-[10px] font-semibold tracking-[0.4px] text-text-tertiary uppercase">
            {changeKindLabel(alert.changeKind)}
          </span>
        </div>
        {/* 2026-06-08 (Yuqi /alerts D2 "non-active items read dimmer so
            the selected one stands out"): the active item's title is
            text-primary; non-active titles drop to text-tertiary. The 2px
            left accent on the active row is kept. */}
        <span
          className={cn(
            'line-clamp-2 text-[14px] font-medium leading-[1.35]',
            active ? 'text-text-primary' : 'text-text-tertiary',
          )}
        >
          {alert.title}
        </span>
      </div>
    </button>
  )
}
