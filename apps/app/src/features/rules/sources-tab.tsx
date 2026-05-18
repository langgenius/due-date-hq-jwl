import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronRightIcon, ExternalLinkIcon } from 'lucide-react'
import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'

import type { PulseSourceHealth, RuleSource } from '@duedatehq/contracts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { cn } from '@duedatehq/ui/lib/utils'

import {
  TableHeaderMultiFilter,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { usePulseSourceHealthQueryOptions } from '@/features/pulse/api'
import { orpc } from '@/lib/rpc'

import {
  compactAcquisitionMethod,
  compactSourceType,
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

type SourceHeaderFilterId = 'jurisdiction' | 'sourceType' | 'cadence' | 'method'

const SOURCE_PAGE_SIZE = 25
const EMPTY_SOURCE_ROWS: RuleSource[] = []

// Jurisdiction filter is URL-state via `?jur=AL,CA,NY` so cross-page links
// (e.g. Coverage status per-row SOURCES cell) can land here pre-filtered.
// Library uses the same `?jur=` convention — see rule-library-tab.tsx.
const jurisdictionParser = parseAsArrayOf(parseAsString)
  .withDefault([])
  .withOptions({ history: 'replace' })

export function SourcesTab() {
  const { t } = useLingui()
  const [healthFilter, setHealthFilter] = useState<SourceHealthFilter>('all')
  const [jurisdictionFilters, setJurisdictionFiltersQuery] = useQueryState(
    'jur',
    jurisdictionParser,
  )
  const setJurisdictionFilters = useCallback(
    (values: string[]) => {
      void setJurisdictionFiltersQuery(values)
    },
    [setJurisdictionFiltersQuery],
  )
  const [sourceTypeFilters, setSourceTypeFilters] = useState<string[]>([])
  const [cadenceFilters, setCadenceFilters] = useState<string[]>([])
  const [methodFilters, setMethodFilters] = useState<string[]>([])
  const [openHeaderFilter, setOpenHeaderFilter] = useState<SourceHeaderFilterId | null>(null)
  const [pageIndex, setPageIndex] = useState(0)

  const sourcesQuery = useQuery(orpc.rules.listSources.queryOptions({ input: undefined }))
  // Reverse lookup: which rules cite each source? Used to render the
  // "Used by N rules" link on each source row, which drills into
  // /rules/library?source=<id>&from=sources. listRules includes both
  // active and pending so the count reflects all catalog usage.
  const rulesQuery = useQuery(
    orpc.rules.listRules.queryOptions({ input: { includeCandidates: true } }),
  )
  const ruleCountBySourceId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const rule of rulesQuery.data ?? []) {
      for (const sourceId of rule.sourceIds) {
        counts.set(sourceId, (counts.get(sourceId) ?? 0) + 1)
      }
    }
    return counts
  }, [rulesQuery.data])
  // Pulse maintains the watcher health record per source (when the scraper
  // last ran, when it'll run next, and the most recent error if any). The
  // RuleSource registry doesn't carry these — they're operational signals
  // owned by the Pulse subsystem. Join here by id so the Sources table can
  // surface diagnostic columns alongside the registry metadata.
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())
  const sourceHealthBySourceId = useMemo(() => {
    const map = new Map<string, PulseSourceHealth>()
    for (const entry of sourceHealthQuery.data?.sources ?? []) {
      map.set(entry.sourceId, entry)
    }
    return map
  }, [sourceHealthQuery.data])

  const rows = useMemo(() => sourcesQuery.data ?? EMPTY_SOURCE_ROWS, [sourcesQuery.data])
  const counts = useMemo(() => countSourcesByHealth(rows), [rows])
  const filteredRows = useMemo(
    () =>
      filterSources(rows, healthFilter).filter(
        (source) =>
          matchesSelected(source.jurisdiction, jurisdictionFilters) &&
          matchesSelected(source.sourceType, sourceTypeFilters) &&
          matchesSelected(source.cadence, cadenceFilters) &&
          matchesSelected(source.acquisitionMethod, methodFilters),
      ),
    [cadenceFilters, healthFilter, jurisdictionFilters, methodFilters, rows, sourceTypeFilters],
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
    () => sourceFilterOptions(rows, (source) => source.sourceType, compactSourceType),
    [rows],
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
  const methodOptions = useMemo(
    () => sourceFilterOptions(rows, (source) => source.acquisitionMethod, compactAcquisitionMethod),
    [rows],
  )

  const filterOptions = useMemo(
    () => [
      { value: 'all' as const, label: t`All`, count: counts.all },
      { value: 'healthy' as const, label: t`Healthy`, count: counts.healthy },
      { value: 'degraded' as const, label: t`Degraded`, count: counts.degraded },
      { value: 'failing' as const, label: t`Failing`, count: counts.failing },
      { value: 'paused' as const, label: t`Paused`, count: counts.paused },
    ],
    [counts, t],
  )

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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <FilterChips
          options={filterOptions}
          value={healthFilter}
          onValueChange={(value) => {
            setHealthFilter(value)
            setPageIndex(0)
          }}
        />
      </div>
      <SectionFrame>
        {/*
          `table-fixed` keeps source rows stable when long values such as
          "email_subscription" or NY Article 9-A titles appear. After adding
          header filters, the right-hand columns need enough width for label +
          active-count badge + chevron; SOURCE auto-fills the remaining space
          and shrinks first on narrower viewports.
        */}
        <Table className="table-fixed">
          <TableHeader className="bg-background-subtle">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4">SOURCE</TableHead>
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
                <TableHeaderMultiFilter
                  trigger="header"
                  label={t`METHOD`}
                  open={openHeaderFilter === 'method'}
                  onOpenChange={(nextOpen) => setHeaderFilterOpen('method', nextOpen)}
                  options={methodOptions}
                  selected={methodFilters}
                  emptyLabel={emptyFilterLabel}
                  onSelectedChange={(next) => updateHeaderFilter(setMethodFilters, next)}
                />
              </TableHead>
              <TableHead className="w-[112px] px-2">HEALTH</TableHead>
              <TableHead className="w-[92px] px-2 font-mono text-[10px] uppercase tracking-[0.06em] text-text-tertiary">
                LAST CHECKED
              </TableHead>
              <TableHead className="w-[42px] px-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                health={sourceHealthBySourceId.get(source.id)}
                ruleCount={ruleCountBySourceId.get(source.id) ?? 0}
              />
            ))}
            {visibleRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={8}
                  className="px-4 py-10 text-center text-xs text-text-tertiary"
                >
                  {rows.length === 0 ? (
                    <Trans>
                      No sources registered yet. Source watchers feed the rule catalog — once
                      configured, they appear here with health and cadence.
                    </Trans>
                  ) : (
                    <Trans>
                      No sources match these filters. Clear filters above to see all watched
                      sources.
                    </Trans>
                  )}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
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
  ruleCount,
}: {
  source: RuleSource
  health: PulseSourceHealth | undefined
  // How many rules in the catalog cite this source. Renders inline below
  // the source.id as a Library drill link ("Used by 3 rules →"). Zero
  // shows as muted "Not yet cited" so the absence is visible.
  ruleCount: number
}) {
  const { t } = useLingui()

  // Keep every interactive affordance on this row pointed at the exact
  // RuleSource.url from the registry. The title and trailing icon are native
  // anchors; the row-level handler is only a larger mouse target.
  const openSource = useCallback(() => {
    if (typeof window === 'undefined') return
    window.open(source.url, '_blank', 'noopener,noreferrer')
  }, [source.url])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>) => {
      // Only handle Enter / Space when focus is on the row itself; trailing
      // anchor handles its own activation.
      if (event.target !== event.currentTarget) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openSource()
      }
    },
    [openSource],
  )

  const isManualReview = source.acquisitionMethod === 'manual_review'

  return (
    <TableRow
      role="link"
      tabIndex={-1}
      onClick={openSource}
      onKeyDown={handleKeyDown}
      className="h-10 cursor-pointer hover:bg-state-base-hover"
    >
      <TableCell className="px-4 py-1.5">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t`Open official source: ${source.title}`}
          onClick={(event) => event.stopPropagation()}
          className="block min-w-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <span className="block truncate text-xs font-medium text-text-primary">
            {source.title}
          </span>
          <span className="block truncate font-mono text-xs text-text-tertiary">{source.id}</span>
        </a>
        {ruleCount > 0 ? (
          <Link
            to={`/rules/library?source=${source.id}&from=sources`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            aria-label={t`View ${ruleCount} rules citing ${source.title}`}
            className="mt-1 inline-flex items-center gap-1 rounded-sm text-[11px] text-text-tertiary outline-none hover:text-text-accent hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Used by {ruleCount} rules</Trans>
            <ChevronRightIcon aria-hidden className="size-3" />
          </Link>
        ) : (
          <span className="mt-1 inline-flex text-[11px] text-text-muted">
            <Trans>Not yet cited</Trans>
          </span>
        )}
      </TableCell>
      <TableCell className="px-0 py-1.5">
        <JurisdictionCode code={source.jurisdiction} />
      </TableCell>
      <TableCell className="px-2 py-1.5 text-xs text-text-secondary">
        {compactSourceType(source.sourceType)}
      </TableCell>
      <TableCell className="px-2 py-1.5 text-xs text-text-secondary">
        {source.cadence.replace('_', '-')}
      </TableCell>
      <TableCell
        className={cn(
          'px-2 py-1.5 text-xs',
          isManualReview ? 'text-severity-medium' : 'text-text-secondary',
        )}
        title={
          isManualReview ? t`Manual review source · click to open the official page` : undefined
        }
      >
        {compactAcquisitionMethod(source.acquisitionMethod)}
      </TableCell>
      <TableCell
        className="px-2 py-1.5"
        // The HealthBadge by itself is a verdict with no evidence — the
        // CPA opening Sources to triage "why is X degraded?" gets a yellow
        // pill and nothing else. Surface the most recent error from Pulse
        // on hover so the diagnostic answer is one tooltip away.
        title={
          health?.lastError
            ? t`Last error: ${health.lastError}`
            : source.healthStatus === 'degraded' || source.healthStatus === 'failing'
              ? t`Status set by Pulse · open Radar for full watcher diagnostics`
              : undefined
        }
      >
        <HealthBadge health={source.healthStatus} />
      </TableCell>
      <TableCell
        className="px-2 py-1.5 font-mono text-xs tabular-nums text-text-tertiary"
        // Exact ISO timestamp on hover; relative-time label in the cell
        // keeps the column scannable at a glance.
        title={health?.lastCheckedAt ?? undefined}
      >
        {health?.lastCheckedAt ? relativeTimeShort(health.lastCheckedAt) : '—'}
      </TableCell>
      <TableCell className="px-0 py-1.5 text-center">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t`Open official source: ${source.title}`}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex size-7 items-center justify-center rounded-md text-text-tertiary outline-none hover:bg-state-base-hover-alt hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </a>
      </TableCell>
    </TableRow>
  )
}
