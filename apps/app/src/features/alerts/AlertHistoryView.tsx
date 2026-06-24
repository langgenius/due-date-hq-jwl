import { Fragment, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'

import type { PulseAlertPublic, PulseFirmAlertStatus } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { StatBand, type StatBandItem } from '@/components/patterns/stat-band'
import { SearchInput } from '@/components/primitives/search-input'
import { getJurisdictionName, JurisdictionChip } from '@/components/primitives/state-badge'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatRelativeTime } from '@/lib/utils'

import { AlertDetailDrawer } from './AlertDetailDrawer'
import { useAlertsHistoryQueryOptions } from './api'
import { useAlertDrawer } from './DrawerProvider'
import { changeKindLabel } from './components/PulseChangeKindChip'

/**
 * The handled-alerts archive — a derived-stats row, status tabs +
 * search, and a day-grouped DATE / JURIS / ALERT / STATUS table.
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

type HistoryTab = 'all' | 'applied' | 'dismissed' | 'reverted' | 'expired'

// Single source of truth for the tab ladder — the label travels with
// the id so the rendered control can never desync from the tab it
// selects.
//
// 2026-06-16 (audit): added the "Expired" tab. The StatBand above and the
// per-row status badge both surface an Expired bucket (aged-out `matched`),
// and `matchesTab` already supported 'expired' — but the tab ladder omitted
// it, so a user could SEE an Expired stat + badges yet had no way to filter
// to them (only "All" showed them). Counts now ride on each tab (Segmented
// `count`) to match every other scope selector in the app.
const TABS: { id: HistoryTab; label: React.ReactNode }[] = [
  { id: 'all', label: <Trans>All</Trans> },
  { id: 'applied', label: <Trans>Applied</Trans> },
  { id: 'dismissed', label: <Trans>Dismissed</Trans> },
  { id: 'reverted', label: <Trans>Reverted</Trans> },
  { id: 'expired', label: <Trans>Expired</Trans> },
]

const STATUS_META: Record<
  PulseFirmAlertStatus,
  { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' | 'info' }
> = {
  applied: { label: 'Applied', variant: 'success' },
  partially_applied: { label: 'Partly applied', variant: 'success' },
  dismissed: { label: 'Dismissed', variant: 'secondary' },
  // A handled archive is calm; nothing here is urgent. A revert is a
  // normal logged outcome, not an alarm, so it reads as a neutral chip
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
    const reverted = by((s) => s === 'reverted')
    const expired = by((s) => s === 'matched')
    const pct = (n: number) => (handled > 0 ? Math.round((n / handled) * 100) : 0)
    return { handled, applied, dismissed, reverted, expired, pct }
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

  const statCards: StatBandItem[] = [
    {
      key: 'handled',
      label: t`Handled`,
      value: stats.handled,
      sub: t`last 90 days`,
      subClass: 'text-text-tertiary',
    },
    {
      key: 'applied',
      label: t`Applied`,
      value: stats.applied,
      sub: `${stats.pct(stats.applied)}% ${t`of handled`}`,
      subClass: 'text-text-success',
    },
    {
      key: 'dismissed',
      label: t`Dismissed`,
      value: stats.dismissed,
      sub: `${stats.pct(stats.dismissed)}%`,
      subClass: 'text-text-tertiary',
    },
    {
      key: 'reverted',
      label: t`Reverted`,
      value: stats.reverted,
      // Amber only when something WAS reverted — a warning-toned zero
      // signals a problem that doesn't exist, and "all with reason" is a
      // vacuous claim about an empty set.
      sub: stats.reverted > 0 ? t`all with reason` : t`none in 90 days`,
      subClass: stats.reverted > 0 ? 'text-text-warning' : 'text-text-tertiary',
    },
    {
      key: 'expired',
      label: t`Expired`,
      value: stats.expired,
      sub: t`deadline passed`,
      subClass: 'text-text-tertiary',
    },
  ]

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* STATS — derived from real loaded data, via the shared StatBand
          (the same "card summary" the rule-library overview, /clients/[id],
          and /rules/sources render). */}
        <StatBand stats={statCards} ariaLabel={t`Handled alerts summary`} />

        {/* TABS + SEARCH — wraps instead of scrolling on small screens.
            Tabs render off the shared flat <Segmented> primitive driven
            by the TABS array, so labels can't desync from ids. */}
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            ariaLabel={t`Filter handled alerts`}
            value={tab}
            onValueChange={setTab}
            options={TABS.map((entry) => ({
              value: entry.id,
              label: entry.label,
              count:
                entry.id === 'all'
                  ? stats.handled
                  : entry.id === 'applied'
                    ? stats.applied
                    : entry.id === 'dismissed'
                      ? stats.dismissed
                      : entry.id === 'reverted'
                        ? stats.reverted
                        : stats.expired,
            }))}
          />
          {/* Canonical SearchInput so rest/hover/focus/placeholder + the
              clear-(×)/Esc affordance match every other page search. */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t`Filter handled alerts`}
            className="min-w-0 flex-1 sm:max-w-[240px]"
          />
        </div>

        {/* BULK BAR — appears when rows are selected. */}
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-state-accent-border bg-state-accent-hover px-4 py-2.5">
            <Checkbox
              checked={allVisibleSelected}
              indeterminate={someSelected}
              onCheckedChange={(next) => toggleAll(next)}
              aria-label={t`Select all`}
              className="size-4 rounded"
            />
            <span className="text-base font-semibold text-text-accent tabular-nums">
              <Plural value={selected.size} one="# alert selected" other="# alerts selected" />
            </span>
            <TextLink
              variant="accent"
              size="sm"
              onClick={() => setSelected(new Set())}
              className="text-base"
            >
              <Trans>Clear</Trans>
            </TextLink>
          </div>
        ) : null}

        {/* TABLE — built on the canonical <Table> primitive so the history
            table shares the exact same DOM + style source as every other
            table. `table-fixed` + the truncating ALERT cell keep the
            no-horizontal-scroll guarantee; zebra is disabled (per-row
            `even:bg-transparent`) to match the calm alerts surfaces. Month
            bands + loading/empty render as full-width `colSpan` rows. */}
        <div className="overflow-hidden rounded-xl border border-divider-regular bg-background-default">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[52px]">
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={someSelected}
                    onCheckedChange={(next) => toggleAll(next)}
                    aria-label={t`Select all`}
                    className="size-4 rounded"
                  />
                </TableHead>
                <TableHead className="w-[104px]">
                  <Trans>Date</Trans>
                </TableHead>
                <TableHead className="w-[72px]">
                  <Trans>Juris</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Alert</Trans>
                </TableHead>
                <TableHead className="w-[132px]">
                  <Trans>Status</Trans>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyQuery.isLoading ? (
                <>
                  {/* sr-only live region — visual users get the shimmer rows
                      below; SR users get the status announcement. */}
                  <TableRow className="even:bg-transparent hover:bg-transparent">
                    <TableCell colSpan={5} className="p-0">
                      <span className="sr-only" role="status" aria-live="polite">
                        <Trans>Loading handled alerts…</Trans>
                      </span>
                    </TableCell>
                  </TableRow>
                  {Array.from({ length: 6 }).map((_, index) => (
                    // oxlint-disable-next-line no-array-index-key -- skeleton placeholder rows, no real data identity
                    <SkeletonHistoryRow key={index} />
                  ))}
                </>
              ) : historyQuery.isError ? (
                // Error-as-empty guard: a failed history query used to fall
                // through to "No handled alerts match this view." — telling the
                // CPA their archive is empty when the load actually failed.
                // Mirrors the AlertsListPage list error (message + inline retry).
                <TableRow className="even:bg-transparent hover:bg-transparent">
                  <TableCell colSpan={5} className="py-10 text-center text-base text-text-tertiary">
                    <span className="font-medium text-text-secondary">
                      <Trans>Couldn't load handled alerts</Trans>
                    </span>{' '}
                    {rpcErrorMessage(historyQuery.error) ??
                      t`Try again in a moment. If it keeps failing, contact support.`}{' '}
                    <TextLink
                      variant="accent"
                      size="sm"
                      onClick={() => void historyQuery.refetch()}
                    >
                      <Trans>Retry</Trans>
                    </TextLink>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow className="even:bg-transparent hover:bg-transparent">
                  <TableCell colSpan={5} className="py-10 text-center text-base text-text-tertiary">
                    <Trans>No handled alerts match this view.</Trans>
                    {/* Recovery affordance when the empty is caused by the
                        free-text filter (matches the alerts/audit/notifications
                        page-level empties). Filter-state empties keep the plain
                        sentence — the entry pills above are the way back. */}
                    {search.trim().length > 0 ? (
                      <>
                        {' '}
                        <TextLink variant="accent" size="sm" onClick={() => setSearch('')}>
                          <Trans>Clear filter</Trans>
                        </TextLink>
                      </>
                    ) : null}
                  </TableCell>
                </TableRow>
              ) : (
                groups.map(([month, monthAlerts]) => (
                  <Fragment key={month}>
                    {/* Month band — same gray-200 (#e9ebf0) group-header band
                        the /today Actions table uses. */}
                    <TableRow className="even:bg-transparent hover:bg-transparent">
                      <TableCell colSpan={5} className="bg-background-subtle px-5 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-column-label text-text-secondary uppercase">
                            {month}
                          </span>
                          <span className="text-column-label text-text-tertiary uppercase tabular-nums">
                            <Plural value={monthAlerts.length} one="# handled" other="# handled" />
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
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
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
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
  // `formatRelativeTime` switches to an absolute "Mon D" string once an
  // item is older than a week — which, in this archive of mostly
  // weeks-old alerts, is byte-identical to `dateLabel` and would render
  // as a duplicate second line. Only show the relative sub-line when
  // it's an actual relative phrase (i.e. differs from the date label).
  const relative = formatRelativeTime(alert.publishedAt)
  const relativeSub = relative && relative !== dateLabel ? relative : null
  const impacted = alert.matchedCount + alert.needsReviewCount

  return (
    <TableRow
      tabIndex={0}
      aria-label={t`Alert: ${alert.title}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      // `[&>td]:py-3` keeps the prior compact row height (the canonical cell
      // default is py-4). `even:bg-*` disables the canonical zebra; active
      // rows keep the accent wash on hover too.
      className={cn(
        'cursor-pointer outline-none [&>td]:py-3',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt',
        active
          ? 'bg-state-accent-hover even:bg-state-accent-hover hover:bg-state-accent-hover'
          : 'even:bg-transparent',
      )}
    >
      {/* Checkbox */}
      <TableCell onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={(next) => onToggle(next)}
          aria-label={t`Select alert: ${alert.title}`}
          className="size-4 rounded"
        />
      </TableCell>

      {/* DATE */}
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text-primary">{dateLabel}</span>
          {relativeSub ? (
            <span className="text-caption-xs font-medium text-text-tertiary">{relativeSub}</span>
          ) : null}
        </div>
      </TableCell>

      {/* JURIS — shared JurisdictionChip primitive (outline reference
          tag; was a drifted bg-subtle one-off). */}
      <TableCell>
        <JurisdictionChip code={alert.jurisdiction} />
      </TableCell>

      {/* ALERT — table-fixed column + truncation so the row never overflows. */}
      <TableCell className="overflow-hidden">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-base font-semibold text-text-primary" title={alert.title}>
            {alert.title}
          </span>
          <span className="flex min-w-0 items-center gap-2 truncate text-xs text-text-tertiary">
            <span className="shrink-0 font-semibold tracking-[0.3px] text-text-tertiary uppercase">
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
      </TableCell>

      {/* STATUS */}
      <TableCell>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
    </TableRow>
  )
}

// First-load placeholder row — mirrors HistoryRow's 5 columns (checkbox /
// date / juris / two-line alert / status badge) so the table doesn't reflow
// on paint. Only the value slots shimmer; the chrome (row height via
// [&>td]:py-3) matches the real row.
function SkeletonHistoryRow() {
  return (
    <TableRow aria-hidden className="even:bg-transparent hover:bg-transparent [&>td]:py-3">
      <TableCell>
        <Skeleton className="size-4 rounded" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-3.5 w-12 rounded" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-[22px] w-12 rounded" />
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3.5 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-[22px] w-20 rounded" />
      </TableCell>
    </TableRow>
  )
}
