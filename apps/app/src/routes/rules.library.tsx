import { useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useLingui, Trans } from '@lingui/react/macro'
import { ChevronRightIcon, LibraryIcon, MapIcon } from 'lucide-react'
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs'

import type { RuleCoverageRow, RuleJurisdiction } from '@duedatehq/contracts'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@duedatehq/ui/components/ui/tabs'
import { cn } from '@duedatehq/ui/lib/utils'

import { CoverageTab } from '@/features/rules/coverage-tab'
import { RuleLibraryTab } from '@/features/rules/rule-library-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import {
  countSourcesByHealth,
  type CoverageCellState,
  type CoverageEntityColumn,
  type RuleLibraryFilter,
} from '@/features/rules/rules-console-model'
import { orpc } from '@/lib/rpc'

/**
 * Rule library — single sidebar destination for rule governance.
 *
 * Layout (top → bottom):
 *  1. Coverage summary strip — `N active · N needs review · N jurisdictions
 *     with gaps`. Clickable numbers drill into the rule list with the
 *     matching filter pre-applied.
 *  2. Sources summary strip — `N watched · N paused`,
 *     with a link to /rules/sources for the full table.
 *  3. View body — either the **Coverage map** (jurisdiction × entity
 *     matrix, default) or the **Rule list** (per-rule table). Switched
 *     by a button at the strip's right edge ("View all rules →" /
 *     "Back to coverage map").
 *
 * The view is URL-state via `?view=matrix|rules`. Matrix drill-ins
 * (jurisdiction pending count, entity dots) flip to the rules view
 * with `?library=...&jur=...&entity=...` so deep links land cleanly.
 *
 * `/rules/coverage` still resolves to the legacy CoverageRoute for
 * back-compat; its drill-ins also point here.
 */
const VIEW_VALUES = ['matrix', 'rules'] as const
type LibraryView = (typeof VIEW_VALUES)[number]
const viewParser = parseAsStringLiteral(VIEW_VALUES).withDefault('matrix')

export function RulesLibraryRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const [view, setView] = useQueryState('view', viewParser)
  const [selectedRuleId] = useQueryState('rule', parseAsString)
  const inReview = selectedRuleId !== null && selectedRuleId.length > 0

  const switchToList = useCallback(
    (filter: RuleLibraryFilter, jurisdiction?: string, entity?: string) => {
      const params = new URLSearchParams()
      params.set('view', 'rules')
      params.set('library', filter)
      if (jurisdiction) params.set('jur', jurisdiction)
      if (entity) params.set('entity', entity)
      params.set('from', 'coverage')
      void navigate(`/rules/library?${params.toString()}`)
    },
    [navigate],
  )

  const handleJurisdictionDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction) => switchToList('pending_review', jurisdiction),
    [switchToList],
  )

  const handleActiveDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction) => switchToList('active', jurisdiction),
    [switchToList],
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
    (jurisdiction: RuleJurisdiction, entity: CoverageEntityColumn, state: CoverageCellState) => {
      const filter = state === 'active' ? 'active' : 'pending_review'
      switchToList(filter, jurisdiction, entity)
    },
    [switchToList],
  )

  const switchView = useCallback(
    (next: LibraryView) => {
      void setView(next)
    },
    [setView],
  )

  return (
    <RulesPageShell title={t`Rule library`} compact={inReview}>
      <div className="flex flex-col gap-3">
        <CoverageSummaryStrip onDrillIn={(filter, jur) => switchToList(filter, jur)} />
        <SourcesSummaryStrip />
        {/* Segmented control replaces the old "View all rules →" button.
          Per docs/Design/ux-audit-2026-05-21.md P1: the button read as
          "navigate elsewhere," not "switch view." A real segmented
          control with two same-weight options signals "two ways to look
          at the same data." */}
        <div className="flex items-center justify-end">
          <Tabs
            value={view}
            onValueChange={(next) => switchView(next as LibraryView)}
            className="gap-0"
          >
            <TabsList>
              <TabsTrigger value="matrix">
                <MapIcon data-icon="inline-start" />
                <Trans>Coverage map</Trans>
              </TabsTrigger>
              <TabsTrigger value="rules">
                <LibraryIcon data-icon="inline-start" />
                <Trans>Rule list</Trans>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      {view === 'matrix' ? (
        <CoverageTab
          onJurisdictionDrillIn={handleJurisdictionDrillIn}
          onActiveDrillIn={handleActiveDrillIn}
          onSourceDrillIn={handleSourceDrillIn}
          onEntityDrillIn={handleEntityDrillIn}
        />
      ) : (
        <RuleLibraryTab />
      )}
    </RulesPageShell>
  )
}

/**
 * One-line read of the rule catalog's coverage:
 * `Coverage  3 active · 12 needs review · 6 jurisdictions with gaps`
 * Numbers drill into the rule list with the matching filter applied.
 */
function CoverageSummaryStrip({
  onDrillIn,
}: {
  onDrillIn: (filter: RuleLibraryFilter, jurisdiction?: string) => void
}) {
  const { t } = useLingui()
  const coverageQuery = useQuery(orpc.rules.coverage.queryOptions({ input: undefined }))
  const stats = useMemo(
    () => aggregateCoverageStrip(coverageQuery.data ?? []),
    [coverageQuery.data],
  )
  return (
    <SummaryStrip
      label={t`Coverage`}
      loading={coverageQuery.isLoading}
      detailHref="/rules/library?view=rules"
      detailLabel={t`Browse rules`}
    >
      <SummaryNumber value={stats.active} label={t`active`} onClick={() => onDrillIn('active')} />
      <SummarySeparator />
      <SummaryNumber
        value={stats.pending}
        label={t`needs review`}
        tone={stats.pending > 0 ? 'review' : 'muted'}
        onClick={() => onDrillIn('pending_review')}
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
  detailHref: string
  detailLabel: string
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
      <Link
        to={detailHref}
        className="inline-flex shrink-0 items-center gap-0.5 rounded-sm text-xs font-medium text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        {detailLabel}
        <ChevronRightIcon className="size-3.5" aria-hidden />
      </Link>
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
