import { Fragment, useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ExternalLinkIcon, RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@duedatehq/ui/lib/utils'

import type { PulseAlertSourceCoverage, PulseSourceHealth, RuleSource } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'

import { EmptyState } from '@/components/patterns/empty-state'
import {
  TableHeaderMultiFilter,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { useAlertSourceHealthQueryOptions } from '@/features/alerts/api'
import { orpc } from '@/lib/rpc'

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
  const [searchParams] = useSearchParams()
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

  // Force a re-poll of a degraded/failing source instead of waiting for its
  // scheduled `nextCheckAt`. (`retrySourceHealth` was previously unused.)
  const queryClient = useQueryClient()
  const retryMutation = useMutation(
    orpc.pulse.retrySourceHealth.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.pulse.listSourceHealth.key() })
      },
      onError: () => {
        toast.error(t`Couldn't re-check that source`)
      },
    }),
  )
  const retryingSourceId = retryMutation.isPending
    ? (retryMutation.variables?.sourceId ?? null)
    : null

  // Rule catalog size powers the "Rules derived" KPI (Pencil bf6Ni KPI
  // strip). Reuses the same `listRules` payload the library already
  // fetches, so it's a warm cache hit in practice.
  const rulesQuery = useQuery(
    orpc.rules.listRules.queryOptions({ input: { includeCandidates: true } }),
  )

  const rows = useMemo(() => sourcesQuery.data ?? EMPTY_SOURCE_ROWS, [sourcesQuery.data])
  const counts = useMemo(() => countSourcesByHealth(rows), [rows])
  // KPI strip stats (Pencil bf6Ni). Derived from the wired source +
  // health + rule payloads — no new query.
  const kpiStats = useMemo(() => {
    const healthEntries = sourceHealthQuery.data?.sources ?? []
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    let fetched24h = 0
    let failed = 0
    for (const entry of healthEntries) {
      if (entry.lastCheckedAt && new Date(entry.lastCheckedAt).getTime() >= dayAgo) fetched24h += 1
      if (entry.consecutiveFailures > 0 || entry.lastError) failed += 1
    }
    return {
      feedsMonitored: rows.length,
      rulesDerived: rulesQuery.data?.length ?? null,
      fetched24h,
      failed,
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
      {/* KPI strip (Pencil bf6Ni) — feed health at a glance. Four stats
          in one bordered card, mono values, vertical hairline dividers.
          Mirrors the JurisdictionKpiStrip family already shipped on the
          library overview. */}
      <SourcesKpiStrip
        feedsMonitored={kpiStats.feedsMonitored}
        rulesDerived={kpiStats.rulesDerived}
        fetched24h={kpiStats.fetched24h}
        failed={kpiStats.failed}
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
      </div>
      <SectionFrame>
        {/*
          `table-fixed` keeps source rows stable when long values such as
          NY Article 9-A titles appear. After adding
          header filters, the right-hand columns need enough width for label +
          active-count badge + chevron; SOURCE auto-fills the remaining space
          and shrinks first on narrower viewports.
        */}
        {/* 2026-06-04 (Yuqi table sweep): `bg-background-subtle` on
            TableHeader + `hover:bg-transparent` on the header row
            REMOVED — canonical primitive ships `bg-background-section`
            (slightly lighter than the old subtle tone, but the
            family-correct header inset) + transparent header-row
            hover. /rules/sources now reads as the same family as
            /today, /deadlines, /clients. */}
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
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
              <TableHead className="w-[112px] px-2">WATCH</TableHead>
              {/* 2026-06-01: dropped uppercase/eyebrow override per DESIGN §9 — TableHead default already carries the canonical column-header type. */}
              <TableHead className="w-[92px] px-2">LAST CHECKED</TableHead>
              <TableHead className="w-[72px] px-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                health={sourceHealthBySourceId.get(source.id)}
                sourceTypeLabels={sourceTypeLabels}
                onRetry={(sourceId) => retryMutation.mutate({ sourceId })}
                retrying={retryingSourceId === source.id}
              />
            ))}
            {visibleRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7}>
                  {/* 2026-06-01: hand-rolled empty cell → EmptyState density='compact'. Drops the section-frame chrome so the message reads centered inside the table body. */}
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
                          Source watchers feed the rule catalog — once configured, they appear here
                          with watch status and cadence.
                        </Trans>
                      ) : (
                        <Trans>Clear filters above to see all watched sources.</Trans>
                      )
                    }
                  />
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

      <SourceCoverageSection />
    </div>
  )
}

/**
 * SourcesKpiStrip — the 4-stat band above the Sources table (Pencil
 * bf6Ni KPI Strip): FEEDS MONITORED · RULES DERIVED · FETCHED LAST 24H ·
 * FAILED FETCHES. One bordered card, mono values, vertical hairline
 * dividers, tone-colored "failed" value (success-green at 0, destructive
 * otherwise). Same visual contract as the library overview's KPI strip.
 */
function SourcesKpiStrip({
  feedsMonitored,
  rulesDerived,
  fetched24h,
  failed,
}: {
  feedsMonitored: number
  rulesDerived: number | null
  fetched24h: number
  failed: number
}) {
  const { t } = useLingui()
  const stats: Array<{ key: string; label: string; value: string; valueClass: string }> = [
    {
      key: 'feeds',
      label: t`Feeds monitored`,
      value: String(feedsMonitored),
      valueClass: 'text-text-primary',
    },
    {
      key: 'rules',
      label: t`Rules derived`,
      // TODO(data): no per-source derived-rule count in the RuleSource
      // contract — falls back to the total rule-catalog size, and to an
      // em-dash while that query is in flight.
      value: rulesDerived === null ? '—' : String(rulesDerived),
      valueClass: 'text-text-primary',
    },
    {
      key: 'fetched',
      label: t`Fetched last 24h`,
      value: String(fetched24h),
      valueClass: 'text-text-primary',
    },
    {
      key: 'failed',
      label: t`Failed fetches`,
      value: String(failed),
      valueClass: failed > 0 ? 'text-text-destructive' : 'text-text-success',
    },
  ]
  return (
    <div className="flex shrink-0 items-center rounded-xl border border-divider-subtle bg-background-default px-2 py-[18px]">
      {stats.map((stat, index) => (
        <Fragment key={stat.key}>
          {index > 0 ? (
            <span className="h-[42px] w-px shrink-0 bg-divider-subtle" aria-hidden />
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-[22px]">
            <span className="text-caption-xs font-bold tracking-eyebrow text-text-muted uppercase">
              {stat.label}
            </span>
            <span className={cn('font-mono text-2xl font-semibold tabular-nums', stat.valueClass)}>
              {stat.value}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

/**
 * Coverage-by-jurisdiction matrix — answers "are we actually watching
 * everything for my states?" Each row reports how comprehensively a
 * jurisdiction is covered and which watcher roles (primary web, guidance
 * notices, email signal, …) are missing. Powered by the previously-unused
 * `pulse.listAlertSourceCoverage`.
 */
function SourceCoverageSection() {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const coverageQuery = useQuery(
    orpc.pulse.listAlertSourceCoverage.queryOptions({ input: undefined }),
  )
  // Opt-in catch-up: pull this firm up to the still-open, high-value windows it
  // missed by joining / importing clients after approval (the live fan-out only
  // reaches firms that exist at approval time). Refreshes the alerts list so any
  // newly-surfaced alerts appear without a reload.
  const catchUpMutation = useMutation(
    orpc.pulse.catchUpStillOpenWindows.mutationOptions({
      onSuccess: ({ materializedCount }) => {
        void queryClient.invalidateQueries({ queryKey: orpc.pulse.listAlerts.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.pulse.activeCount.key() })
        toast.success(
          materializedCount > 0
            ? t`Surfaced ${materializedCount} still-open alert(s) for your firm.`
            : t`You're already caught up — no still-open windows to add.`,
        )
      },
      onError: () => {
        toast.error(t`Couldn't run catch-up. Please try again.`)
      },
    }),
  )
  const roleLabels = useMemo<Record<PulseAlertSourceCoverage['requiredRoles'][number], string>>(
    () => ({
      primary_web_news: t`Primary web`,
      guidance_notice: t`Guidance notices`,
      email_signal: t`Email signal`,
      rule_source_watch: t`Rule watch`,
      tax_type_sources: t`Tax-type sources`,
      relief_or_disaster_signal: t`Relief / disaster`,
      rights_window_signal: t`Rights window`,
      multi_agency_sources: t`Multi-agency`,
    }),
    [t],
  )

  const coverage = coverageQuery.data?.coverage ?? []
  if (coverageQuery.isLoading || coverage.length === 0) return null

  const coverageLevelVariant = {
    comprehensive: 'success',
    standard: 'info',
    missing: 'destructive',
  } as const

  return (
    <SectionFrame>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-text-primary">
            <Trans>Coverage by jurisdiction</Trans>
          </h2>
          <p className="text-xs text-text-tertiary">
            <Trans>
              Which watcher roles are in place per jurisdiction. Gaps mean a change could be missed.
            </Trans>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => catchUpMutation.mutate(undefined)}
          disabled={catchUpMutation.isPending}
          title={t`Surface still-open protective-claim windows and unexpired deadline shifts this firm may have missed.`}
        >
          {catchUpMutation.isPending ? (
            <Trans>Catching up…</Trans>
          ) : (
            <Trans>Catch up still-open windows</Trans>
          )}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">JURISDICTION</TableHead>
            <TableHead className="w-[140px] px-2">COVERAGE</TableHead>
            <TableHead className="w-[88px] px-2">ROLES</TableHead>
            <TableHead className="px-2">MISSING</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coverage.map((row) => (
            <TableRow key={row.jurisdiction} className="hover:bg-transparent">
              <TableCell className="px-4 py-1.5">
                <JurisdictionCode code={row.jurisdiction} />
              </TableCell>
              <TableCell className="px-2 py-1.5">
                <Badge variant={coverageLevelVariant[row.coverageLevel]} size="sm">
                  {row.coverageLevel}
                </Badge>
              </TableCell>
              <TableCell className="px-2 py-1.5 font-mono text-xs tabular-nums text-text-secondary">
                {row.coveredRoles.length}/{row.requiredRoles.length}
              </TableCell>
              <TableCell className="px-2 py-1.5">
                {row.missingRoles.length === 0 ? (
                  <span className="text-xs text-text-tertiary">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1" title={row.missingReason ?? undefined}>
                    {row.missingRoles.map((role) => (
                      <Badge key={role} variant="outline" size="sm">
                        {roleLabels[role]}
                      </Badge>
                    ))}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionFrame>
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
  onRetry,
  retrying,
}: {
  source: RuleSource
  health: PulseSourceHealth | undefined
  sourceTypeLabels: SourceTypeLabelMap
  onRetry: (sourceId: string) => void
  retrying: boolean
}) {
  const { t } = useLingui()
  // A source "needs attention" when the watcher has a failure streak or a
  // recorded last error — that's when the manual re-check is worth offering.
  const needsAttention = Boolean(health && (health.consecutiveFailures > 0 || health.lastError))

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

  return (
    <TableRow
      role="link"
      tabIndex={-1}
      onClick={openSource}
      onKeyDown={handleKeyDown}
      // 2026-06-04 (Yuqi table sweep): `hover:bg-state-base-hover`
      // dropped — canonical row default. `h-10 cursor-pointer`
      // kept (compact source row + interactivity).
      className="h-10 cursor-pointer"
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
      </TableCell>
      <TableCell className="px-0 py-1.5">
        {/* Accent-tinted jurisdiction pill (Pencil bf6Ni) — mono code on
            a soft accent fill, matching the canvas Sources table. */}
        <span className="inline-flex items-center rounded-full bg-state-accent-hover px-2 py-0.5 font-mono text-xs font-semibold text-text-accent">
          {source.jurisdiction}
        </span>
      </TableCell>
      <TableCell className="px-2 py-1.5">
        {/* Subtle type pill (Pencil bf6Ni). */}
        <span className="inline-flex items-center rounded-full bg-background-subtle px-2 py-0.5 text-xs font-medium text-text-secondary">
          {sourceTypeLabel(source.sourceType, sourceTypeLabels)}
        </span>
      </TableCell>
      <TableCell className="px-2 py-1.5 text-xs text-text-secondary">
        {source.cadence.replace('_', '-')}
      </TableCell>
      <TableCell
        className="px-2 py-1.5"
        title={
          needsAttention && health?.lastError
            ? t`Last error: ${health.lastError}`
            : health?.lastCheckedAt
              ? t`Last checked: ${relativeTimeShort(health.lastCheckedAt)}`
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
      <TableCell className="px-0 py-1.5">
        <div className="flex items-center justify-center gap-0.5">
          {needsAttention ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onRetry(source.id)
              }}
              disabled={retrying}
              aria-label={t`Re-check ${source.title} now`}
              title={t`Re-check now`}
              className="inline-flex size-7 items-center justify-center rounded-md text-text-tertiary outline-none hover:bg-state-base-hover-alt hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:opacity-50"
            >
              <RefreshCwIcon className={`size-3.5 ${retrying ? 'animate-spin' : ''}`} aria-hidden />
            </button>
          ) : null}
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
        </div>
      </TableCell>
    </TableRow>
  )
}
