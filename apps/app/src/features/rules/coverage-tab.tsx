import { type ReactNode, useMemo } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, ChevronRightIcon } from 'lucide-react'

import type { RuleCoverageRow, RuleJurisdiction } from '@duedatehq/contracts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { usePulseSourceHealthQueryOptions } from '@/features/pulse/api'

import {
  coverageCellState,
  ENTITY_COLUMN_GROUPS,
  jurisdictionLabel,
  type CoverageCellState,
  type CoverageEntityColumn,
} from './rules-console-model'
import {
  CoverageLegend,
  JurisdictionCode,
  QueryPanelState,
  SectionFrame,
  ToneDot,
} from './rules-console-primitives'

type StatusTone = 'candidate' | 'basicReview' | 'review'

function entityLabel(entity: CoverageEntityColumn): string {
  const labels: Record<CoverageEntityColumn, string> = {
    llc: 'LLC',
    partnership: 'Partnership',
    s_corp: 'S-Corp',
    c_corp: 'C-Corp',
    sole_prop: 'Sole prop',
    individual: 'Individual',
    trust: 'Trust',
  }
  return labels[entity]
}

function CoverageStatusPill({
  jurisdiction,
  label,
}: {
  jurisdiction: RuleJurisdiction
  label: ReactNode
}) {
  // FED's "candidate watch" pill uses the *review* blue token,
  // not `text-text-accent`. The latter is reserved
  // for read-only badges and active filter chips.
  const tone: StatusTone =
    jurisdiction === 'FED'
      ? 'candidate'
      : jurisdiction === 'TX' || jurisdiction === 'FL' || jurisdiction === 'WA'
        ? 'review'
        : 'basicReview'
  const className =
    tone === 'review'
      ? 'inline-flex h-[22px] items-center gap-2 rounded bg-severity-medium-tint px-2 text-xs font-medium text-severity-medium'
      : tone === 'candidate'
        ? 'inline-flex h-[22px] items-center gap-2 rounded bg-accent-tint px-2 text-xs font-medium text-status-review'
        : 'inline-flex h-[22px] items-center gap-2 rounded bg-background-subtle px-2 text-xs font-medium text-text-secondary'
  return (
    <span className={className}>
      <ToneDot tone={tone === 'candidate' ? 'review' : tone === 'review' ? 'warning' : 'success'} />
      {label}
    </span>
  )
}

/**
 * Inline per-jurisdiction strip of 7 small dots, one per entity type
 * (LLC · Partnership · S-Corp · C-Corp · Sole prop · Trust · Individual).
 *
 * Each dot is tone-coded for that (jurisdiction, entity) cell's coverage
 * state: green (active), orange (review), gray (no rule). When an
 * `onEntityDrillIn` callback is provided AND the cell has rules (verified
 * or review), the dot becomes a button that drills into the Library
 * pre-filtered by jurisdiction × entity × library-filter. Dots with
 * `none` state stay non-interactive — there's nothing to show.
 *
 * Hover affordance is `title` text ("LLC — active / review / no rule")
 * so the user can verify the meaning without leaving the row. Focus
 * affordance is a ring on the dot button.
 *
 * Replaces the separate "Entity coverage" matrix table that used to sit
 * to the right of the jurisdiction summary. The matrix added a second
 * 52-row scan axis without answering a question CPAs ask here; entity-
 * level filtering is more naturally a Library concern. See dev log
 * 2026-05-19-coverage-status-single-table.md for the rationale.
 */
const ALL_ENTITIES: readonly CoverageEntityColumn[] = ENTITY_COLUMN_GROUPS.all

function entityCellState(state: CoverageCellState) {
  if (state === 'verified') return { tone: 'success' as const, label: 'active' as const }
  if (state === 'review') return { tone: 'warning' as const, label: 'review' as const }
  return { tone: 'disabled' as const, label: 'no rule' as const }
}

function EntityCoverageStrip({
  jurisdiction,
  onEntityDrillIn,
}: {
  jurisdiction: RuleJurisdiction
  // Fires when a verified or review dot is clicked. Receives the cell
  // state so the caller can choose the right library-filter (active for
  // verified, pending_review for review). Omit the callback to render
  // dots non-interactively (e.g. embedded contexts with no router).
  onEntityDrillIn?: (
    jurisdiction: RuleJurisdiction,
    entity: CoverageEntityColumn,
    state: CoverageCellState,
  ) => void
}) {
  const { t } = useLingui()
  return (
    <div className="inline-flex items-center gap-1.5">
      {ALL_ENTITIES.map((entity) => {
        const state = coverageCellState(jurisdiction, entity)
        const { tone, label } = entityCellState(state)
        const tooltip = `${entityLabel(entity)} — ${label}`
        if (state === 'none' || !onEntityDrillIn) {
          return (
            <span key={entity} title={tooltip} aria-label={tooltip} className="inline-flex">
              <ToneDot tone={tone} />
            </span>
          )
        }
        return (
          <button
            key={entity}
            type="button"
            title={tooltip}
            aria-label={t`Drill to ${entityLabel(entity)} rules for ${jurisdictionLabel(jurisdiction)} — ${label}`}
            onClick={() => onEntityDrillIn(jurisdiction, entity, state)}
            className="inline-flex rounded-full outline-none transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1"
          >
            <ToneDot tone={tone} />
          </button>
        )
      })}
    </div>
  )
}

function aggregateCoverage(rows: readonly RuleCoverageRow[]) {
  const active = rows.reduce((sum, row) => sum + (row.activeRuleCount ?? row.verifiedRuleCount), 0)
  const pending = rows.reduce((sum, row) => sum + (row.pendingReviewCount ?? row.candidateCount), 0)
  const sources = rows.reduce((sum, row) => sum + row.sourceCount, 0)
  const fullyCovered = rows.filter(
    (row) => (row.pendingReviewCount ?? row.candidateCount) === 0,
  ).length
  return { active, pending, sources, fullyCovered, jurisdictions: rows.length }
}

/**
 * One-line situational read at the top of the Coverage status page.
 *
 *   3 active · 123 needs review · 52 jurisdictions      88 sources watched →
 *   3 active · 123 needs review · 52 jurisdictions   ⚠ 11 degraded · 1 failing → Sources
 *
 * Replaces the earlier 4-card KPI grid (hero-metrics pattern, AI-slop tell)
 * with a newspaper-kicker rhythm. Left cluster is *catalog state* (what the
 * library contains); right cluster is *source-of-truth state* (whether the
 * official documents backing those rules are still being watched). The
 * source-health pointer is always visible — when fully healthy it carries a
 * neutral count, when degraded/failing it gains tone (severity) and a
 * pointer to /rules/sources where the bad rows can be triaged.
 *
 * The right-side pointer is the page's source-of-truth credential: every
 * count on the page traces back to those watched documents.
 */
function CoverageSnapshotStrip({
  active,
  pending,
  jurisdictions,
  sourcesWatched,
  sourcesDegraded,
  sourcesFailing,
}: {
  active: number
  pending: number
  jurisdictions: number
  sourcesWatched: number
  sourcesDegraded: number
  sourcesFailing: number
}) {
  const hasIncident = sourcesDegraded > 0 || sourcesFailing > 0
  return (
    <div className="flex h-10 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-divider-regular bg-background-default px-3">
      <SnapshotNumber value={active} label={<Trans>active</Trans>} conceptKey="verifiedRule" />
      <SnapshotSeparator />
      <SnapshotNumber
        value={pending}
        label={<Trans>needs review</Trans>}
        conceptKey="candidateRule"
        tone={pending > 0 ? 'review' : 'muted'}
      />
      <SnapshotSeparator />
      <SnapshotNumber
        value={jurisdictions}
        label={<Trans>jurisdictions</Trans>}
        conceptKey="coverage"
      />
      <span aria-hidden className="ml-auto" />
      {hasIncident ? (
        <Link
          to="/rules/sources"
          className={cn(
            'group/sources inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md',
            'border border-divider-regular bg-background-subtle px-2',
            'text-xs text-text-secondary outline-none',
            'hover:border-state-accent-active-alt hover:bg-background-default hover:text-text-accent',
            'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
          )}
        >
          <AlertTriangleIcon aria-hidden className="size-3.5 text-severity-medium" />
          {sourcesDegraded > 0 ? (
            <span className="inline-flex items-baseline gap-1">
              <span className="font-mono text-sm font-semibold tabular-nums text-severity-medium">
                {sourcesDegraded}
              </span>
              <span>
                <Trans>degraded</Trans>
              </span>
            </span>
          ) : null}
          {sourcesDegraded > 0 && sourcesFailing > 0 ? (
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
          ) : null}
          {sourcesFailing > 0 ? (
            <span className="inline-flex items-baseline gap-1">
              <span className="font-mono text-sm font-semibold tabular-nums text-text-destructive">
                {sourcesFailing}
              </span>
              <span>
                <Trans>failing</Trans>
              </span>
            </span>
          ) : null}
          <span className="mx-1 font-medium">
            <Trans>Sources</Trans>
          </span>
          <ChevronRightIcon
            aria-hidden
            className="size-3.5 text-text-tertiary transition-transform group-hover/sources:translate-x-0.5 group-hover/sources:text-text-accent"
          />
        </Link>
      ) : (
        <Link
          to="/rules/sources"
          className={cn(
            'group/sources inline-flex h-6 shrink-0 items-baseline gap-1 rounded-md px-2',
            'text-xs text-text-tertiary outline-none',
            'hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
          )}
        >
          <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">
            {sourcesWatched}
          </span>
          <span>
            <Trans>sources watched</Trans>
          </span>
          <ChevronRightIcon aria-hidden className="size-3.5 self-center text-text-tertiary" />
        </Link>
      )}
    </div>
  )
}

/**
 * `<value> <label>` stat used inside CoverageSnapshotStrip.
 *
 * Tone vs affordance (same contract as the old Library SummaryNumber):
 *  - `tone` signals severity only — `review` blue for "needs CPA attention",
 *    `muted` for deprioritized counts, `default` for neutral ones.
 *  - The stat is never interactive on its own. Click-targets live as
 *    bordered pills on the right side of the strip; the per-jurisdiction
 *    drill-in happens on the table below.
 */
function SnapshotNumber({
  value,
  label,
  conceptKey,
  tone = 'default',
}: {
  value: number
  label: ReactNode
  conceptKey: 'verifiedRule' | 'candidateRule' | 'coverage'
  tone?: 'default' | 'muted' | 'review'
}) {
  const toneClass =
    tone === 'review'
      ? 'text-status-review'
      : tone === 'muted'
        ? 'text-text-muted'
        : 'text-text-primary'
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1">
      <span className={cn('font-mono text-sm font-semibold tabular-nums', toneClass)}>{value}</span>
      <ConceptLabel concept={conceptKey}>
        <span className="text-xs text-text-secondary">{label}</span>
      </ConceptLabel>
    </span>
  )
}

function SnapshotSeparator() {
  return (
    <span aria-hidden className="shrink-0 text-text-tertiary">
      ·
    </span>
  )
}

export function CoverageTab({
  onJurisdictionDrillIn,
  onEntityDrillIn,
}: {
  // Fired when the PENDING count is clicked. The standalone route handler
  // pushes `library=pending_review&jur=<jurisdiction>` to the Library.
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
  // Fired when an entity dot is clicked (verified or review state only;
  // `none` dots are inert). Caller chooses the right library filter based
  // on the cell state (active for verified, pending_review for review).
  onEntityDrillIn?: (
    jurisdiction: RuleJurisdiction,
    entity: CoverageEntityColumn,
    state: CoverageCellState,
  ) => void
} = {}) {
  const { t } = useLingui()
  const coverageQuery = useQuery(orpc.rules.coverage.queryOptions({ input: undefined }))
  // Live source-of-truth health from Pulse. Surfaces in the snapshot strip
  // header so every page view carries the credential "are the documents
  // backing our rules still being watched?". `usePulseSourceHealthQueryOptions`
  // refetches in the background per its interval; we don't gate the page on it
  // (registry counts already render without it).
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())
  const sourceHealthCounts = useMemo(() => {
    const entries = sourceHealthQuery.data?.sources ?? []
    let degraded = 0
    let failing = 0
    for (const entry of entries) {
      if (entry.healthStatus === 'degraded') degraded += 1
      else if (entry.healthStatus === 'failing') failing += 1
    }
    return { degraded, failing }
  }, [sourceHealthQuery.data])

  const coverageStatusLabels: Partial<Record<RuleJurisdiction, string>> = {
    FED: t`Practice review required`,
    CA: t`Practice review required`,
    NY: t`Practice review required`,
    TX: t`All review-flagged`,
    FL: t`Source-defined cal`,
    WA: t`Filing-frequency review`,
  }

  if (coverageQuery.isLoading) {
    return <QueryPanelState state="loading" message={t`Loading rules coverage…`} />
  }

  if (coverageQuery.isError) {
    return <QueryPanelState state="error" message={t`Couldn't load rules coverage`} />
  }

  const rows = coverageQuery.data ?? []
  const stats = aggregateCoverage(rows)

  return (
    <div className="flex flex-col gap-6">
      <CoverageSnapshotStrip
        active={stats.active}
        pending={stats.pending}
        jurisdictions={stats.jurisdictions}
        sourcesWatched={stats.sources}
        sourcesDegraded={sourceHealthCounts.degraded}
        sourcesFailing={sourceHealthCounts.failing}
      />

      {/*
        Single per-jurisdiction table. Each row carries ACTIVE / PENDING /
        SOURCES counts plus a 7-dot entity coverage strip and a
        human-readable STATUS pill. Replaces the old two-table layout
        (jurisdiction summary on the left, entity coverage matrix on the
        right) — both were scanning the same 52 jurisdictions twice. The
        entity dots inline the matrix info; entity-level filtering happens
        in the Library via the ENTITY header filter or by clicking a dot.
        See dev log 2026-05-19-coverage-status-single-table.md.
      */}
      <SectionFrame>
        <Table>
          <TableHeader className="bg-background-subtle">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[60px]">JUR</TableHead>
              <TableHead className="w-[110px]">NAME</TableHead>
              <TableHead className="w-[200px]">ENTITY COVERAGE</TableHead>
              <TableHead className="w-[80px] text-right">ACTIVE</TableHead>
              <TableHead className="w-[80px] text-right">PENDING</TableHead>
              <TableHead className="w-[80px] text-right">SOURCES</TableHead>
              <TableHead>STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.jurisdiction} className="h-11 hover:bg-transparent">
                <TableCell className="py-2">
                  <JurisdictionCode code={row.jurisdiction} />
                </TableCell>
                <TableCell className="max-w-[110px] truncate py-2 text-xs font-medium">
                  {jurisdictionLabel(row.jurisdiction)}
                </TableCell>
                <TableCell className="py-2">
                  <EntityCoverageStrip
                    jurisdiction={row.jurisdiction}
                    {...(onEntityDrillIn ? { onEntityDrillIn } : {})}
                  />
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs tabular-nums">
                  {row.activeRuleCount ?? row.verifiedRuleCount}
                </TableCell>
                <TableCell
                  className={cn(
                    'py-2 text-right font-mono text-xs tabular-nums',
                    (row.pendingReviewCount ?? row.candidateCount) > 0
                      ? 'text-status-review'
                      : 'text-text-muted',
                  )}
                >
                  {onJurisdictionDrillIn && (row.pendingReviewCount ?? row.candidateCount) > 0 ? (
                    <button
                      type="button"
                      onClick={() => onJurisdictionDrillIn(row.jurisdiction)}
                      aria-label={t`Review ${row.pendingReviewCount ?? row.candidateCount} pending rules for ${jurisdictionLabel(row.jurisdiction)}`}
                      className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                    >
                      {row.pendingReviewCount ?? row.candidateCount}
                    </button>
                  ) : (
                    (row.pendingReviewCount ?? row.candidateCount)
                  )}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs tabular-nums text-text-secondary">
                  {row.sourceCount > 0 ? (
                    <Link
                      to={`/rules/sources?jur=${row.jurisdiction}&from=coverage`}
                      aria-label={t`View ${row.sourceCount} watched sources for ${jurisdictionLabel(row.jurisdiction)}`}
                      className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                    >
                      {row.sourceCount}
                    </Link>
                  ) : (
                    row.sourceCount
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <CoverageStatusPill
                    jurisdiction={row.jurisdiction}
                    label={
                      coverageStatusLabels[row.jurisdiction] ?? t`Official sources · pending rules`
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionFrame>

      <CoverageLegend />
    </div>
  )
}
