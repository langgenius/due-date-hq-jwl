import { useCallback, useMemo } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react/macro'
import { ChevronRightIcon } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'

import type { RuleCoverageRow, RuleJurisdiction } from '@duedatehq/contracts'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { CoverageTab } from '@/features/rules/coverage-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import {
  countSourcesByHealth,
  type CoverageCellState,
  type CoverageEntityColumn,
} from '@/features/rules/rules-console-model'
import { orpc } from '@/lib/rpc'

/**
 * Rule library — single sidebar destination for rule governance.
 *
 * Layout (top → bottom):
 *  1. Coverage summary strip — `N active · N needs review · N jurisdictions
 *     with gaps`. Clickable numbers filter the Coverage map.
 *  2. Sources summary strip — `N watched · N paused`,
 *     with a link to /rules/sources for the full table.
 *  3. Coverage map — jurisdiction × entity matrix with inline rule
 *     detail and review queue. The former per-rule Rule List view was
 *     removed because it duplicated this map and made the page harder
 *     to scan.
 *
 * Legacy `?view=rules` / `library=` / `jur=` links still land here;
 * the route normalizes them to Coverage `filter=` / `q=` state.
 *
 * `/rules/coverage` still resolves to the legacy CoverageRoute for
 * back-compat; its drill-ins also point here.
 */
type CoverageSummaryFilter = 'active' | 'pending'

export function RulesLibraryRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const location = useLocation()
  const normalizedSearch = useMemo(
    () => normalizeRulesLibrarySearch(location.search),
    [location.search],
  )
  const [selectedRuleId] = useQueryState('rule', parseAsString)
  const inReview = selectedRuleId !== null && selectedRuleId.length > 0

  const filterCoverage = useCallback(
    (filter: CoverageSummaryFilter, jurisdiction?: string) => {
      const params = new URLSearchParams()
      params.set('filter', filter)
      if (jurisdiction) params.set('q', jurisdiction)
      params.set('from', 'coverage')
      void navigate(`/rules/library?${params.toString()}`)
    },
    [navigate],
  )

  const handleJurisdictionDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction) => filterCoverage('pending', jurisdiction),
    [filterCoverage],
  )

  const handleActiveDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction) => filterCoverage('active', jurisdiction),
    [filterCoverage],
  )

  const handleSourceDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction, domain?: string) => {
      const params = new URLSearchParams({ jur: jurisdiction, from: 'library' })
      if (domain) params.set('domain', domain)
      void navigate(`/rules/sources?${params.toString()}`)
    },
    [navigate],
  )

  const handleEntityDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction, _entity: CoverageEntityColumn, state: CoverageCellState) => {
      filterCoverage(state === 'active' ? 'active' : 'pending', jurisdiction)
    },
    [filterCoverage],
  )

  if (normalizedSearch !== null) {
    return (
      <Navigate
        replace
        to={{ pathname: location.pathname, search: normalizedSearch, hash: location.hash }}
      />
    )
  }

  return (
    <RulesPageShell title={t`Rule library`} compact={inReview}>
      <div className="flex flex-col gap-3">
        <CoverageSummaryStrip onDrillIn={(filter) => filterCoverage(filter)} />
        <SourcesSummaryStrip />
      </div>
      <CoverageTab
        onJurisdictionDrillIn={handleJurisdictionDrillIn}
        onActiveDrillIn={handleActiveDrillIn}
        onSourceDrillIn={handleSourceDrillIn}
        onEntityDrillIn={handleEntityDrillIn}
      />
    </RulesPageShell>
  )
}

function normalizeRulesLibrarySearch(search: string): string | null {
  const params = new URLSearchParams(search)
  let changed = false

  if (params.has('view')) {
    params.delete('view')
    changed = true
  }

  const legacyLibrary = params.get('library')
  const mappedFilter =
    legacyLibrary === 'active' || legacyLibrary === 'verified'
      ? 'active'
      : legacyLibrary === 'pending_review' || legacyLibrary === 'candidate'
        ? 'pending'
        : null
  if (mappedFilter && !params.has('filter')) {
    params.set('filter', mappedFilter)
    changed = true
  }
  if (params.has('library')) {
    params.delete('library')
    changed = true
  }

  if (params.has('jur')) {
    const jurisdictions = params
      .getAll('jur')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean)
    const jurisdiction = jurisdictions[0]
    if (jurisdictions.length === 1 && jurisdiction && !params.has('q')) {
      params.set('q', jurisdiction)
    }
    params.delete('jur')
    changed = true
  }

  if (!changed) return null
  const next = params.toString()
  return next.length > 0 ? `?${next}` : ''
}

/**
 * One-line read of the rule catalog's coverage:
 * `Coverage  3 active · 12 needs review · 6 jurisdictions with gaps`
 * Numbers filter the Coverage map.
 */
function CoverageSummaryStrip({
  onDrillIn,
}: {
  onDrillIn: (filter: CoverageSummaryFilter) => void
}) {
  const { t } = useLingui()
  const coverageQuery = useQuery(orpc.rules.coverage.queryOptions({ input: undefined }))
  const stats = useMemo(
    () => aggregateCoverageStrip(coverageQuery.data ?? []),
    [coverageQuery.data],
  )
  return (
    <SummaryStrip label={t`Coverage`} loading={coverageQuery.isLoading}>
      <SummaryNumber value={stats.active} label={t`active`} onClick={() => onDrillIn('active')} />
      <SummarySeparator />
      <SummaryNumber
        value={stats.pending}
        label={t`needs review`}
        tone={stats.pending > 0 ? 'review' : 'muted'}
        onClick={() => onDrillIn('pending')}
      />
      <SummarySeparator />
      <SummaryNumber
        value={stats.jurisdictionsWithGaps}
        label={t`jurisdictions with gaps`}
        tone={stats.jurisdictionsWithGaps > 0 ? 'warning' : 'muted'}
      />
    </SummaryStrip>
  )
}

/**
 * One-line read of the source-watcher fleet:
 * `Sources  88 watched · 0 paused`
 */
function SourcesSummaryStrip() {
  const { t } = useLingui()
  const sourcesQuery = useQuery(orpc.rules.listSources.queryOptions({ input: undefined }))
  const counts = useMemo(() => countSourcesByHealth(sourcesQuery.data ?? []), [sourcesQuery.data])
  return (
    <SummaryStrip
      label={t`Sources`}
      loading={sourcesQuery.isLoading}
      detailHref="/rules/sources"
      detailLabel={t`View sources`}
    >
      <SummaryNumber value={counts.healthy} label={t`watched`} />
      <SummarySeparator />
      <SummaryNumber
        value={counts.paused}
        label={t`paused`}
        tone={counts.paused > 0 ? 'warning' : 'muted'}
        {...(counts.paused > 0 ? { href: '/rules/sources' } : {})}
      />
    </SummaryStrip>
  )
}

function SummaryStrip({
  label,
  loading,
  detailHref,
  detailLabel,
  children,
}: {
  label: string
  loading: boolean
  detailHref?: string
  detailLabel?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-10 items-center gap-3 rounded-md border border-divider-regular bg-background-default px-4">
      <span className="w-[80px] shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
        {label}
      </span>
      <div
        className="flex min-w-0 flex-1 flex-wrap items-center gap-3"
        aria-busy={loading || undefined}
      >
        {loading ? (
          <div className="flex items-center gap-2" aria-label="Loading">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : (
          children
        )}
      </div>
      {detailHref && detailLabel ? (
        <Link
          to={detailHref}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-sm text-xs font-medium text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          {detailLabel}
          <ChevronRightIcon className="size-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}

function SummaryNumber({
  value,
  label,
  tone = 'default',
  onClick,
  href,
}: {
  value: number
  label: string
  tone?: 'default' | 'muted' | 'review' | 'warning' | 'destructive'
  onClick?: () => void
  href?: string
}) {
  const toneClass =
    tone === 'review'
      ? 'text-status-review'
      : tone === 'warning'
        ? 'text-severity-medium'
        : tone === 'destructive'
          ? 'text-text-destructive'
          : tone === 'muted'
            ? 'text-text-muted'
            : 'text-text-primary'

  const inner = (
    <>
      <span className={cn('text-sm font-semibold tabular-nums', toneClass)}>{value}</span>
      <span className="text-xs text-text-secondary">{label}</span>
    </>
  )
  const className = cn(
    'inline-flex items-baseline gap-1 rounded-sm outline-none',
    'hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
  )
  if (!onClick && !href) {
    return <span className="inline-flex items-baseline gap-1">{inner}</span>
  }
  if (href) {
    return (
      <Link to={href} className={className}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  )
}

function SummarySeparator() {
  return (
    <span aria-hidden className="text-text-tertiary">
      ·
    </span>
  )
}

function aggregateCoverageStrip(rows: readonly RuleCoverageRow[]) {
  let active = 0
  let pending = 0
  let jurisdictionsWithGaps = 0
  for (const row of rows) {
    active += row.activeRuleCount ?? row.verifiedRuleCount
    pending += row.pendingReviewCount ?? row.candidateCount
    if ((row.pendingReviewCount ?? row.candidateCount) > 0) {
      jurisdictionsWithGaps += 1
    }
  }
  return { active, pending, jurisdictionsWithGaps }
}
