import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRightIcon, ExternalLinkIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import type { PulseSourceHealth, RuleSource } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'

import { EmptyState } from '@/components/patterns/empty-state'
import { StatBand, type StatBandItem } from '@/components/patterns/stat-band'
import {
  TableHeaderMultiFilter,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { useAlertSourceHealthQueryOptions } from '@/features/alerts/api'
import { orpc } from '@/lib/rpc'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { fadeMotion } from '@/lib/motion'

import {
  countSourcesByHealth,
  filterSources,
  jurisdictionLabel,
  type SourceHealthFilter,
} from './rules-console-model'
import {
  FilterChips,
  HealthBadge,
  JurisdictionCode,
  QueryPanelState,
  SectionFrame,
  TablePaginationFooter,
} from './rules-console-primitives'

type SourceHeaderFilterId = 'jurisdiction' | 'sourceType' | 'cadence'
type SourceTypeLabelMap = Record<RuleSource['sourceType'], string>

const SOURCE_PAGE_SIZE = 25
const EMPTY_SOURCE_ROWS: RuleSource[] = []

export function SourcesTab() {
  const { t } = useLingui()
  const [searchParams, setSearchParams] = useSearchParams()
  const domainFilter = searchParams.get('domain')
  const [healthFilter, setHealthFilter] = useState<SourceHealthFilter>('all')
  const [jurisdictionFilters, setJurisdictionFilters] = useState<string[]>(() => {
    const jurisdiction = searchParams.get('jur')
    return jurisdiction ? [jurisdiction] : []
  })
  const [sourceTypeFilters, setSourceTypeFilters] = useState<string[]>([])
  const [cadenceFilters, setCadenceFilters] = useState<string[]>([])
  const [openHeaderFilter, setOpenHeaderFilter] = useState<SourceHeaderFilterId | null>(null)
  const [pageIndex, setPageIndex] = useState(0)

  const sourcesQuery = useQuery(orpc.rules.listSources.queryOptions({ input: undefined }))
  // Alert ingestion maintains the watcher health record per source (when the scraper
  // last ran, when it'll run next, and the most recent error if any). The
  // RuleSource registry doesn't carry these — they're operational signals
  // owned by the alert-ingestion subsystem. Join here by id so the Sources table can
  // surface diagnostic columns alongside the registry metadata.
  const sourceHealthQuery = useQuery(useAlertSourceHealthQueryOptions())
  const sourceHealthBySourceId = useMemo(() => {
    const map = new Map<string, PulseSourceHealth>()
    for (const entry of sourceHealthQuery.data?.sources ?? []) {
      map.set(entry.sourceId, entry)
    }
    return map
  }, [sourceHealthQuery.data])

  // Rule catalog size powers the "Rules derived" KPI (Pencil bf6Ni KPI
  // strip). Reuses the same `listRules` payload the library already
  // fetches, so it's a warm cache hit in practice.
  const rulesQuery = useQuery(
    orpc.rules.listRules.queryOptions({ input: { includeCandidates: true } }),
  )

  // sourceId → number of rules that cite it. De-isolates the Sources page:
  // each row shows "Feeds N rules" linking into the library filtered to that
  // source (matches the library's `?source=` filter, which is sourceIds-based).
  const ruleCountBySourceId = useMemo(() => {
    const map = new Map<string, number>()
    for (const rule of rulesQuery.data ?? []) {
      for (const sourceId of rule.sourceIds) map.set(sourceId, (map.get(sourceId) ?? 0) + 1)
    }
    return map
  }, [rulesQuery.data])

  const rows = useMemo(() => sourcesQuery.data ?? EMPTY_SOURCE_ROWS, [sourcesQuery.data])
  const counts = useMemo(() => countSourcesByHealth(rows), [rows])
  // KPI strip stats (Pencil bf6Ni). Derived from the wired source +
  // health + rule payloads — no new query.
  const kpiStats = useMemo(() => {
    const healthEntries = sourceHealthQuery.data?.sources ?? []
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    let fetched24h = 0
    for (const entry of healthEntries) {
      if (entry.lastCheckedAt && new Date(entry.lastCheckedAt).getTime() >= dayAgo) fetched24h += 1
    }
    return {
      feedsMonitored: rows.length,
      rulesDerived: rulesQuery.data?.length ?? null,
      fetched24h,
    }
  }, [rows.length, rulesQuery.data, sourceHealthQuery.data])
  const sourceTypeLabels = useMemo<SourceTypeLabelMap>(
    () => ({
      calendar: t`Calendar`,
      due_dates: t`Due dates`,
      early_warning: t`Early alert`,
      emergency_relief: t`Relief notice`,
      form: t`Form`,
      instructions: t`Instructions`,
      news: t`News`,
      publication: t`Publication`,
      subscription: t`Email updates`,
    }),
    [t],
  )
  const filteredRows = useMemo(
    () =>
      filterSources(rows, healthFilter).filter(
        (source) =>
          matchesSelected(source.jurisdiction, jurisdictionFilters) &&
          matchesSelected(source.sourceType, sourceTypeFilters) &&
          matchesSelected(source.cadence, cadenceFilters) &&
          (!domainFilter || source.domains.some((domain) => domain === domainFilter)),
      ),
    [cadenceFilters, domainFilter, healthFilter, jurisdictionFilters, rows, sourceTypeFilters],
  )
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / SOURCE_PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)
  const pageStartIndex = currentPageIndex * SOURCE_PAGE_SIZE
  const visibleRows = filteredRows.slice(pageStartIndex, pageStartIndex + SOURCE_PAGE_SIZE)
  const firstItemNumber = filteredRows.length > 0 ? pageStartIndex + 1 : 0
  const lastItemNumber = pageStartIndex + visibleRows.length
  const jurisdictionOptions = useMemo(
    () => sourceFilterOptions(rows, (source) => source.jurisdiction, jurisdictionLabel),
    [rows],
  )
  const sourceTypeOptions = useMemo(
    () =>
      sourceFilterOptions(
        rows,
        (source) => source.sourceType,
        (type) => sourceTypeLabel(type, sourceTypeLabels),
      ),
    [rows, sourceTypeLabels],
  )
  const cadenceOptions = useMemo(
    () =>
      sourceFilterOptions(
        rows,
        (source) => source.cadence,
        (cadence) => cadence.replace('_', '-'),
      ),
    [rows],
  )

  const filterOptions = useMemo(
    () => [
      { value: 'all' as const, label: t`All`, count: counts.all },
      { value: 'healthy' as const, label: t`Watched`, count: counts.healthy },
      { value: 'paused' as const, label: t`Paused`, count: counts.paused },
    ],
    [counts, t],
  )

  // 2026-06-16 (audit): the filtered-empty state told users to "Clear filters
  // above" but no Clear control existed — and the deep-link-only ?jur / ?domain
  // params narrowed the list with no visible way to remove them. This adds the
  // canonical "Clear filters" affordance (matching /clients, /alerts, rules
  // library) that resets the health chip + all three column filters AND drops
  // the URL filter params. NOTE: declared BEFORE the early returns below so the
  // useCallback hook order stays stable (Rules of Hooks).
  const filtersActive =
    healthFilter !== 'all' ||
    jurisdictionFilters.length > 0 ||
    sourceTypeFilters.length > 0 ||
    cadenceFilters.length > 0 ||
    Boolean(domainFilter)

  const clearFilters = useCallback(() => {
    setHealthFilter('all')
    setJurisdictionFilters([])
    setSourceTypeFilters([])
    setCadenceFilters([])
    setPageIndex(0)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('jur')
        next.delete('domain')
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

  if (sourcesQuery.isLoading) {
    return <QueryPanelState state="loading" message={t`Loading rule sources…`} />
  }

  if (sourcesQuery.isError) {
    return <QueryPanelState state="error" message={t`Couldn't load rule sources`} />
  }

  const emptyFilterLabel = t`No options`

  function setHeaderFilterOpen(filterId: SourceHeaderFilterId, nextOpen: boolean) {
    setOpenHeaderFilter((current) => (nextOpen ? filterId : current === filterId ? null : current))
  }

  function updateHeaderFilter(setter: (values: string[]) => void, values: string[]) {
    setter(values)
    setPageIndex(0)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Feed-health summary (Pencil bf6Ni) — four stats at a glance via
          the shared StatBand, the same "card summary" the rule-library
          overview, /clients/[id], and /alerts/history render. */}
      <SourcesKpiStrip
        feedsMonitored={kpiStats.feedsMonitored}
        rulesDerived={kpiStats.rulesDerived}
        fetched24h={kpiStats.fetched24h}
        paused={counts.paused}
      />
      <div className="flex items-center gap-4">
        <FilterChips
          options={filterOptions}
          value={healthFilter}
          onValueChange={(value) => {
            setHealthFilter(value)
            setPageIndex(0)
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={!filtersActive}
          onClick={clearFilters}
        >
          <Trans>Clear filters</Trans>
        </Button>
      </div>
      <SectionFrame>
        {/*
          `table-fixed` keeps source rows stable when long values such as
          NY Article 9-A titles appear. After adding
          header filters, the right-hand columns need enough width for label +
          active-count badge + chevron; SOURCE auto-fills the remaining space
          and shrinks first on narrower viewports.
        */}
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">
                <Trans>Source</Trans>
              </TableHead>
              <TableHead className="w-[76px] px-2">
                <TableHeaderMultiFilter
                  trigger="header"
                  label={t`JUR`}
                  open={openHeaderFilter === 'jurisdiction'}
                  onOpenChange={(nextOpen) => setHeaderFilterOpen('jurisdiction', nextOpen)}
                  options={jurisdictionOptions}
                  selected={jurisdictionFilters}
                  emptyLabel={emptyFilterLabel}
                  searchable
                  searchPlaceholder={t`Filter jurisdictions`}
                  onSelectedChange={(next) => updateHeaderFilter(setJurisdictionFilters, next)}
                />
              </TableHead>
              <TableHead className="w-[104px] px-2">
                <TableHeaderMultiFilter
                  trigger="header"
                  label={t`TYPE`}
                  open={openHeaderFilter === 'sourceType'}
                  onOpenChange={(nextOpen) => setHeaderFilterOpen('sourceType', nextOpen)}
                  options={sourceTypeOptions}
                  selected={sourceTypeFilters}
                  emptyLabel={emptyFilterLabel}
                  onSelectedChange={(next) => updateHeaderFilter(setSourceTypeFilters, next)}
                />
              </TableHead>
              <TableHead className="w-[116px] px-2">
                <TableHeaderMultiFilter
                  trigger="header"
                  label={t`CADENCE`}
                  open={openHeaderFilter === 'cadence'}
                  onOpenChange={(nextOpen) => setHeaderFilterOpen('cadence', nextOpen)}
                  options={cadenceOptions}
                  selected={cadenceFilters}
                  emptyLabel={emptyFilterLabel}
                  onSelectedChange={(next) => updateHeaderFilter(setCadenceFilters, next)}
                />
              </TableHead>
              <TableHead className="w-[112px] px-2">
                <Trans>Watch</Trans>
              </TableHead>
              <TableHead className="w-[92px] px-2">
                <Trans>Last checked</Trans>
              </TableHead>
              <TableHead className="w-[72px] px-0" />
            </TableRow>
          </TableHeader>
          {/* Crossfade the body when the health filter (All / Watched / Paused)
              changes. `TableBody` is a styled `<tbody>` wrapper, so per the
              motion catalog we key a `motion.tbody` directly and carry the same
              classes + data-slot. `mode="wait"` swaps one body for the next;
              keyed on `healthFilter` only, so pagination (which keeps the same
              filter) does not crossfade. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.tbody
              key={healthFilter}
              data-slot="table-body"
              className="bg-background-default [&_tr:last-child]:border-0"
              {...fadeMotion}
            >
              {visibleRows.map((source) => (
                <SourceRow
                  key={source.id}
                  source={source}
                  health={sourceHealthBySourceId.get(source.id)}
                  sourceTypeLabels={sourceTypeLabels}
                  ruleCount={ruleCountBySourceId.get(source.id) ?? 0}
                />
              ))}
              {visibleRows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7}>
                    {/* EmptyState density='compact' drops the section-frame chrome so the message reads centered inside the table body. */}
                    <EmptyState
                      density="compact"
                      title={
                        rows.length === 0 ? (
                          <Trans>No sources registered yet</Trans>
                        ) : (
                          <Trans>No sources match these filters</Trans>
                        )
                      }
                      description={
                        rows.length === 0 ? (
                          <Trans>
                            Source watchers feed the rule catalog — once configured, they appear
                            here with watch status and cadence.
                          </Trans>
                        ) : (
                          <Trans>Clear filters above to see all watched sources.</Trans>
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </motion.tbody>
          </AnimatePresence>
        </Table>
        <TablePaginationFooter
          pageIndex={currentPageIndex}
          pageCount={pageCount}
          firstItemNumber={firstItemNumber}
          lastItemNumber={lastItemNumber}
          totalCount={filteredRows.length}
          onPreviousPage={() => setPageIndex(Math.max(0, currentPageIndex - 1))}
          onNextPage={() => setPageIndex(Math.min(pageCount - 1, currentPageIndex + 1))}
        />
      </SectionFrame>
    </div>
  )
}

/**
 * SourcesKpiStrip — the 3-stat summary above the Sources table (Pencil
 * bf6Ni): FEEDS MONITORED · RULES DERIVED · FETCHED LAST 24H. Renders the
 * shared `StatBand` — the same "card summary" component the rule-library
 * overview, /clients/[id], and /alerts/history use — so the surfaces never
 * drift apart again.
 */
function SourcesKpiStrip({
  feedsMonitored,
  rulesDerived,
  fetched24h,
  paused,
}: {
  feedsMonitored: number
  rulesDerived: number | null
  fetched24h: number
  paused: number
}) {
  const { t } = useLingui()
  // "0 of N fetched" is not a neutral fact — it means the monitoring sweep
  // hasn't run in a day, which contradicts the green "Watched" pills below.
  // Carry that honestly in the band: warning tone + an explicit caption
  // instead of the quiet "of N feeds" sub.
  const monitoringStale = fetched24h === 0 && feedsMonitored > 0
  const stats: StatBandItem[] = [
    {
      key: 'feeds',
      label: t`Sources monitored`,
      value: feedsMonitored,
      sub: paused > 0 ? t`${feedsMonitored - paused} active · ${paused} paused` : t`All active`,
      subClass: paused > 0 ? 'text-text-warning' : 'text-text-tertiary',
    },
    {
      key: 'rules',
      label: t`Rules derived`,
      // TODO(data): no per-source derived-rule count in the RuleSource
      // contract — falls back to the total rule-catalog size, and to an
      // em-dash while that query is in flight.
      value: rulesDerived === null ? '—' : rulesDerived,
      sub: t`From ${feedsMonitored} feeds`,
    },
    {
      key: 'fetched',
      label: t`Fetched last 24h`,
      value: fetched24h,
      // 2026-06-16 (audit): neutral value; the stale signal lives in the sub.
      sub: monitoringStale ? t`Monitoring has not run in 24h` : t`of ${feedsMonitored} feeds`,
      subClass: monitoringStale ? 'text-text-warning' : 'text-text-tertiary',
    },
  ]
  return <StatBand stats={stats} ariaLabel={t`Source feed summary`} />
}

function matchesSelected(value: string, selected: readonly string[]): boolean {
  return selected.length === 0 || selected.includes(value)
}

/**
 * Compact relative-time formatter for the Sources table's `LAST CHECKED`
 * column. Returns `"2m"`, `"3h"`, `"5d"`, `"3w"` — short enough to fit a
 * narrow column without truncating, precise enough to distinguish "fresh"
 * from "stale" at a glance. Exact ISO timestamp is exposed via the cell's
 * `title` attribute for the precise-detail case.
 */
function relativeTimeShort(iso: string): string {
  const checked = new Date(iso).getTime()
  if (Number.isNaN(checked)) return '—'
  const ms = Date.now() - checked
  if (ms < 0) return 'now'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 14) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 12) return `${weeks}w`
  const months = Math.floor(days / 30)
  return `${months}mo`
}

function sourceTypeLabel(sourceType: RuleSource['sourceType'], labels: SourceTypeLabelMap): string {
  return labels[sourceType]
}

function sourceFilterOptions<T extends string>(
  sources: readonly RuleSource[],
  getValue: (source: RuleSource) => T,
  getLabel: (value: T) => string,
): TableFilterOption[] {
  const counts = new Map<T, number>()
  for (const source of sources) {
    const value = getValue(source)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: getLabel(value), count }))
    .toSorted((left, right) => left.label.localeCompare(right.label))
}

function SourceRow({
  source,
  health,
  sourceTypeLabels,
  ruleCount,
}: {
  source: RuleSource
  health: PulseSourceHealth | undefined
  sourceTypeLabels: SourceTypeLabelMap
  ruleCount: number
}) {
  const { t } = useLingui()
  // No row-level click handler (2026-07-02 audit): the whole-row click
  // opened a NEW TAB to an external government site — an unsignposted eject
  // that surprised users who clicked anywhere on the row to inspect it. The
  // external affordance stays explicit instead: the TITLE anchor and the
  // trailing ↗ icon open the source; "Feeds N rules" stays internal. A click
  // on the rest of the row now does nothing (there is no expandable detail).
  return (
    <TableRow
      // Row height h-14 (56px) matches /deadlines, /clients, and
      // /rules/library so every workbench table shares one row pitch —
      // the Sources table previously ran a tighter h-10 and read denser
      // than the rest of the app.
      className="h-14"
    >
      <TableCell className="px-4 py-3">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t`Open official source: ${source.title}`}
          onClick={() => track(ANALYTICS_EVENTS.sourceLinkOpened, {})}
          className="block min-w-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          {/* Title + id mirror the rules-library "Rule name" column — the
              structurally identical registry primary cell: a text-base/600
              title over a muted text-sm subtitle. Sources is a registry table
              (one identity column), so it follows that treatment rather than
              the denser workbench client-name scale. With the title at its
              proper weight the row fills the same ~67px pitch as
              /rules/library and /deadlines. */}
          <span className="block truncate text-base font-semibold text-text-primary">
            {source.title}
          </span>
          <span className="block truncate font-mono text-sm text-text-tertiary">{source.id}</span>
        </a>
        {/* Internal "Feeds N rules" link — the de-isolation path into the rule
            library, filtered to this source (?source=). Sibling of the external
            anchor (not nested). Hidden when no rule cites this source. */}
        {ruleCount > 0 ? (
          <TextLink
            variant="accent"
            size="default"
            className="mt-1"
            render={<Link to={`/rules/library?source=${encodeURIComponent(source.id)}`} />}
          >
            <Plural value={ruleCount} one="Feeds # rule" other="Feeds # rules" />
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </TextLink>
        ) : null}
      </TableCell>
      <TableCell className="px-2 py-3">
        {/* Shared JurisdictionCode — the quiet gray mono chip used by the
            /rules/library jurisdiction table. Replaces a hand-rolled accent
            `<Badge>` so the jurisdiction cell reads identically across the
            rules-console tables instead of being a lone blue-pill outlier. */}
        <JurisdictionCode code={source.jurisdiction} />
      </TableCell>
      <TableCell className="px-2 py-3">
        {/* Subtle type pill (Pencil bf6Ni). */}
        <Badge variant="secondary" className="text-xs font-medium">
          {sourceTypeLabel(source.sourceType, sourceTypeLabels)}
        </Badge>
      </TableCell>
      <TableCell className="px-2 py-3 text-sm text-text-secondary">
        {source.cadence.replace('_', '-')}
      </TableCell>
      <TableCell
        className="px-2 py-3"
        title={
          health?.lastCheckedAt
            ? t`Last checked: ${relativeTimeShort(health.lastCheckedAt)}`
            : undefined
        }
      >
        <HealthBadge health={source.healthStatus} />
      </TableCell>
      <TableCell
        className="px-2 py-3 font-mono text-sm tabular-nums text-text-tertiary"
        // Exact ISO timestamp on hover; relative-time label in the cell
        // keeps the column scannable at a glance.
        title={health?.lastCheckedAt ?? undefined}
      >
        {health?.lastCheckedAt ? relativeTimeShort(health.lastCheckedAt) : '—'}
      </TableCell>
      <TableCell className="px-0 py-3">
        <div className="flex items-center justify-center gap-0.5">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t`Open official source: ${source.title}`}
            onClick={() => track(ANALYTICS_EVENTS.sourceLinkOpened, {})}
            className="inline-flex size-7 items-center justify-center rounded-lg text-text-tertiary outline-none hover:bg-state-base-hover-alt hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <ExternalLinkIcon className="size-3.5" aria-hidden />
          </a>
        </div>
      </TableCell>
    </TableRow>
  )
}
