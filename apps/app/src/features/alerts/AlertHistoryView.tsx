import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { SearchIcon } from 'lucide-react'

import type { PulseAlertPublic, PulseFirmAlertStatus } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { cn } from '@duedatehq/ui/lib/utils'

import { getJurisdictionName } from '@/components/primitives/state-badge'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { formatRelativeTime } from '@/lib/utils'

import { AlertDetailDrawer } from './AlertDetailDrawer'
import { useAlertsHistoryQueryOptions } from './api'
import { useAlertDrawer } from './DrawerProvider'
import { changeKindLabel } from './components/PulseChangeKindChip'

/**
 * 2026-06-08 (Pencil hFOEo "/alerts/history"): the handled-alerts
 * archive, rebuilt from the active-list reuse into the dedicated
 * table design — a derived-stats row, status tabs + search, and a
 * day-grouped DATE / JURIS / ALERT / STATUS table.
 *
 * Data honesty: every stat is derived from the real loaded history
 * list (no aggregate endpoint is faked). The design's ACTOR column
 * and AVG REVIEW TIME stat are intentionally omitted — the data model
 * records no per-alert handler identity / review duration, and the
 * codebase rule is to wire real data rather than hardcode the mock.
 *
 * No-horizontal-scroll: the table is a flex grid whose ALERT cell is
 * `flex-1 min-w-0` and every other cell is a fixed shrink-0 width, so
 * the row reflows/truncates within the column and never overflows.
 */

const HISTORY_LIMIT = 50

type HistoryTab = 'all' | 'applied' | 'dismissed' | 'snoozed' | 'reverted' | 'expired'

// Single source of truth for the tab ladder — the label travels with
// the id so the rendered control can never desync from the tab it
// selects (the prior hand-rolled if/else ladder had no `expired`
// branch, so both 'reverted' and 'expired' fell through to "Reverted").
//
// 2026-06-08 (Pencil hFOEo `rgWeB FilterRow`): the design's segmented
// control carries exactly FIVE tabs — All / Applied / Dismissed /
// Snoozed / Reverted. There is no "Expired" tab; expired (aged-out
// `matched`) rows still surface under "All" with their Expired status
// badge, and the Expired STAT card above keeps the standalone count.
const TABS: { id: HistoryTab; label: React.ReactNode }[] = [
  { id: 'all', label: <Trans>All</Trans> },
  { id: 'applied', label: <Trans>Applied</Trans> },
  { id: 'dismissed', label: <Trans>Dismissed</Trans> },
  { id: 'snoozed', label: <Trans>Snoozed</Trans> },
  { id: 'reverted', label: <Trans>Reverted</Trans> },
]

const STATUS_META: Record<
  PulseFirmAlertStatus,
  { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' | 'info' }
> = {
  applied: { label: 'Applied', variant: 'success' },
  partially_applied: { label: 'Partly applied', variant: 'success' },
  dismissed: { label: 'Dismissed', variant: 'secondary' },
  snoozed: { label: 'Snoozed', variant: 'warning' },
  // 2026-06-08 (design audit task 9 — red restraint): a handled
  // archive is calm; nothing here is urgent. A revert is a normal
  // logged outcome, not an alarm, so it reads as a neutral chip
  // rather than destructive-red.
  reverted: { label: 'Reverted', variant: 'secondary' },
  reviewed: { label: 'Reviewed', variant: 'info' },
  // In the history archive, a `matched` alert is only ever one that aged out of
  // the active queue — listHistory gates matched rows on a passed deadline — so
  // it reads as "Expired" here, not "Open".
  matched: { label: 'Expired', variant: 'secondary' },
}

function matchesTab(status: PulseFirmAlertStatus, tab: HistoryTab): boolean {
  if (tab === 'all') return true
  if (tab === 'applied') return status === 'applied' || status === 'partially_applied'
  // In history a 'matched' row is one that aged out of the active queue, so the
  // Expired tab maps to it (listHistory only returns expired matched rows).
  if (tab === 'expired') return status === 'matched'
  return status === tab
}

export function AlertHistoryView() {
  const { t } = useLingui()
  const { openDrawer, alertId, closeDrawer } = useAlertDrawer()
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)

  const historyQuery = useQuery(useAlertsHistoryQueryOptions(HISTORY_LIMIT))
  const alerts = useMemo(() => historyQuery.data?.alerts ?? [], [historyQuery.data])

  const [tab, setTab] = useState<HistoryTab>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())

  // Stats derived from the real loaded list — no faked aggregate.
  const stats = useMemo(() => {
    const by = (predicate: (status: PulseFirmAlertStatus) => boolean) =>
      alerts.reduce((n, a) => n + (predicate(a.status) ? 1 : 0), 0)
    const handled = alerts.length
    const applied = by((s) => s === 'applied' || s === 'partially_applied')
    const dismissed = by((s) => s === 'dismissed')
    const snoozed = by((s) => s === 'snoozed')
    const reverted = by((s) => s === 'reverted')
    const expired = by((s) => s === 'matched')
    const pct = (n: number) => (handled > 0 ? Math.round((n / handled) * 100) : 0)
    return { handled, applied, dismissed, snoozed, reverted, expired, pct }
  }, [alerts])

  const query = search.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      alerts.filter(
        (a) =>
          matchesTab(a.status, tab) &&
          (query === '' ||
            a.title.toLowerCase().includes(query) ||
            a.source.toLowerCase().includes(query)),
      ),
    [alerts, tab, query],
  )

  // Group by firm-local period, preserving the (newest-first) order:
  // a leading "THIS WEEK · <range>" band for the last 7 days, then one
  // band per calendar month (Pencil hFOEo's day-group headers).
  const groups = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000
    const now = Date.now()
    const weekStartMs = now - 6 * dayMs
    const monthFmt = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: firmTimezone,
    })
    const rangeFmt = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: firmTimezone,
    })
    const thisWeekLabel = `THIS WEEK · ${rangeFmt.format(new Date(weekStartMs))} – ${rangeFmt.format(new Date(now))}`
    const map = new Map<string, PulseAlertPublic[]>()
    for (const alert of filtered) {
      const published = new Date(alert.publishedAt).getTime()
      const key =
        published >= weekStartMs ? thisWeekLabel : monthFmt.format(published).toUpperCase()
      const bucket = map.get(key)
      if (bucket) bucket.push(alert)
      else map.set(key, [alert])
    }
    return Array.from(map.entries())
  }, [filtered, firmTimezone])

  const allVisibleSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id))
  const someSelected = selected.size > 0 && !allVisibleSelected

  const toggleAll = (next: boolean) =>
    setSelected(next ? new Set(filtered.map((a) => a.id)) : new Set())
  const toggleOne = (id: string, next: boolean) =>
    setSelected((current) => {
      const set = new Set(current)
      if (next) set.add(id)
      else set.delete(id)
      return set
    })

  const statCards: { label: string; value: number; sub?: string; subTone?: string }[] = [
    {
      label: t`Handled`,
      value: stats.handled,
      sub: t`last 90 days`,
      subTone: 'text-text-tertiary',
    },
    {
      label: t`Applied`,
      value: stats.applied,
      sub: `${stats.pct(stats.applied)}% ${t`of handled`}`,
      subTone: 'text-text-success',
    },
    {
      label: t`Dismissed`,
      value: stats.dismissed,
      sub: `${stats.pct(stats.dismissed)}%`,
      subTone: 'text-text-tertiary',
    },
    {
      label: t`Snoozed`,
      value: stats.snoozed,
      sub: `${stats.pct(stats.snoozed)}%`,
      subTone: 'text-text-tertiary',
    },
    {
      label: t`Reverted`,
      value: stats.reverted,
      sub: t`all with reason`,
      subTone: 'text-text-warning',
    },
    {
      label: t`Expired`,
      value: stats.expired,
      sub: t`deadline passed`,
      subTone: 'text-text-tertiary',
    },
  ]

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* STATS — derived from real loaded data. Responsive grid wraps
          on narrow viewports (2 → 3 → 6 cols) so it never scrolls. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="flex flex-col gap-1 rounded-xl border border-divider-subtle bg-background-default px-4 py-3"
            >
              <span className="text-[10px] font-bold tracking-[0.6px] text-text-muted uppercase">
                {card.label}
              </span>
              <span className="text-[22px] font-semibold text-text-primary tabular-nums">
                {card.value}
              </span>
              {card.sub ? (
                <span className={cn('text-[10px] font-medium tabular-nums', card.subTone)}>
                  {card.sub}
                </span>
              ) : null}
            </div>
          ))}
        </div>

        {/* TABS + SEARCH — wraps instead of scrolling on small screens.
            2026-06-08: tabs render off the shared flat <Segmented>
            primitive driven by the TABS array, so labels can't desync
            from ids. */}
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            ariaLabel={t`Filter handled alerts`}
            value={tab}
            onValueChange={setTab}
            options={TABS.map((entry) => ({ value: entry.id, label: entry.label }))}
          />
          {/* Pencil rgWeB `search`: rounded-12, white fill, hairline
              divider-subtle border, ~240px wide (kept flex-1 on small
              screens so it never overflows). */}
          <label className="inline-flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-divider-subtle bg-background-default px-3 sm:max-w-[240px]">
            <SearchIcon className="size-3.5 shrink-0 text-text-muted" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t`Search handled alerts`}
              aria-label={t`Search handled alerts`}
              className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-text-primary outline-none placeholder:text-text-muted"
            />
          </label>
        </div>

        {/* BULK BAR — appears when rows are selected. */}
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-state-accent-border bg-state-accent-hover px-4 py-2.5">
            <Checkbox
              checked={allVisibleSelected}
              indeterminate={someSelected}
              onCheckedChange={(next) => toggleAll(next)}
              aria-label={t`Select all`}
              className="size-[18px] rounded-[4px]"
            />
            <span className="text-[13px] font-semibold text-text-accent tabular-nums">
              <Plural value={selected.size} one="# alert selected" other="# alerts selected" />
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-[13px] font-medium text-text-accent underline-offset-2 hover:underline"
            >
              <Trans>Clear</Trans>
            </button>
          </div>
        ) : null}

        {/* TABLE */}
        <div className="flex flex-col rounded-xl border border-divider-regular bg-background-default">
          {/* Header row */}
          <div className="flex items-center gap-3 border-b border-divider-subtle px-4 py-2.5 text-[11px] font-bold tracking-[0.6px] text-text-muted uppercase">
            <span className="flex w-5 shrink-0 items-center">
              <Checkbox
                checked={allVisibleSelected}
                indeterminate={someSelected}
                onCheckedChange={(next) => toggleAll(next)}
                aria-label={t`Select all`}
                className="size-[18px] rounded-[4px]"
              />
            </span>
            <span className="w-[84px] shrink-0">
              <Trans>Date</Trans>
            </span>
            <span className="w-[52px] shrink-0">
              <Trans>Juris</Trans>
            </span>
            <span className="min-w-0 flex-1">
              <Trans>Alert</Trans>
            </span>
            <span className="w-[112px] shrink-0">
              <Trans>Status</Trans>
            </span>
          </div>

          {historyQuery.isLoading ? (
            <div className="px-4 py-10 text-center text-[13px] text-text-tertiary">
              <Trans>Loading handled alerts…</Trans>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-text-tertiary">
              <Trans>No handled alerts match this view.</Trans>
            </div>
          ) : (
            groups.map(([month, monthAlerts]) => (
              <div key={month} className="flex flex-col">
                <div className="flex items-center justify-between border-b border-divider-subtle bg-background-subtle px-4 py-2">
                  <span className="text-[11px] font-bold tracking-[0.6px] text-text-secondary uppercase">
                    {month}
                  </span>
                  <span className="text-[11px] font-semibold tracking-[0.6px] text-text-muted uppercase tabular-nums">
                    <Plural value={monthAlerts.length} one="# handled" other="# handled" />
                  </span>
                </div>
                {monthAlerts.map((alert) => (
                  <HistoryRow
                    key={alert.id}
                    alert={alert}
                    active={alert.id === alertId}
                    selected={selected.has(alert.id)}
                    firmTimezone={firmTimezone}
                    onToggle={(next) => toggleOne(alert.id, next)}
                    onOpen={() => openDrawer(alert.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
      {/* Detail drawer — the /alerts/history route owns its panel
          (DrawerProvider skips the fallback Sheet here), so render it
          inline. Sheet mode floats the detail over the full-width
          table instead of squeezing the column. */}
      <AlertDetailDrawer alertId={alertId} mode="sheet" onClose={closeDrawer} />
    </>
  )
}

function HistoryRow({
  alert,
  active,
  selected,
  firmTimezone,
  onToggle,
  onOpen,
}: {
  alert: PulseAlertPublic
  active: boolean
  selected: boolean
  firmTimezone: string
  onToggle: (next: boolean) => void
  onOpen: () => void
}) {
  const { t } = useLingui()
  const status = STATUS_META[alert.status]
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: firmTimezone,
  }).format(new Date(alert.publishedAt))
  // 2026-06-08 (bug: "May 17 / May 17"): `formatRelativeTime` switches to an
  // absolute "Mon D" string once an item is older than a week — which, in
  // this archive of mostly weeks-old alerts, is byte-identical to `dateLabel`
  // and rendered as a duplicate second line. Only show the relative sub-line
  // when it's an actual relative phrase (i.e. differs from the date label).
  const relative = formatRelativeTime(alert.publishedAt)
  const relativeSub = relative && relative !== dateLabel ? relative : null
  const impacted = alert.matchedCount + alert.needsReviewCount

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t`Alert: ${alert.title}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        'flex cursor-pointer items-center gap-3 border-b border-divider-subtle px-4 py-3 outline-none transition-colors last:border-b-0',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt',
        active ? 'bg-state-accent-hover' : 'hover:bg-state-base-hover',
      )}
    >
      <span className="flex w-5 shrink-0 items-center" onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={(next) => onToggle(next)}
          aria-label={t`Select alert: ${alert.title}`}
          className="size-[18px] rounded-[4px]"
        />
      </span>

      {/* DATE */}
      <div className="flex w-[84px] shrink-0 flex-col">
        <span className="text-[12px] font-semibold text-text-primary">{dateLabel}</span>
        {relativeSub ? (
          <span className="text-[10px] font-medium text-text-muted">{relativeSub}</span>
        ) : null}
      </div>

      {/* JURIS */}
      <span className="w-[52px] shrink-0">
        <span className="inline-flex h-[20px] items-center rounded-md bg-background-subtle px-2 text-[11px] font-semibold text-text-secondary uppercase">
          {alert.jurisdiction}
        </span>
      </span>

      {/* ALERT — flex-1 min-w-0 so the row never overflows. */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-semibold text-text-primary" title={alert.title}>
          {alert.title}
        </span>
        <span className="flex min-w-0 items-center gap-2 truncate text-[11px] text-text-tertiary">
          <span className="shrink-0 font-semibold tracking-[0.3px] text-text-muted uppercase">
            {changeKindLabel(alert.changeKind)}
          </span>
          <span aria-hidden className="text-divider-regular">
            ·
          </span>
          <span className="truncate">{alert.source}</span>
          {impacted > 0 ? (
            <>
              <span aria-hidden className="text-divider-regular">
                ·
              </span>
              <span className="shrink-0 tabular-nums">
                <Plural value={impacted} one="# client" other="# clients" />
              </span>
            </>
          ) : (
            <>
              <span aria-hidden className="text-divider-regular">
                ·
              </span>
              <span className="shrink-0">{getJurisdictionName(alert.jurisdiction)}</span>
            </>
          )}
        </span>
      </div>

      {/* STATUS */}
      <span className="w-[112px] shrink-0">
        <Badge variant={status.variant}>{status.label}</Badge>
      </span>
    </div>
  )
}
