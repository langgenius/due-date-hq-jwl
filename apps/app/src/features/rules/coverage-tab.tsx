import { type ReactNode, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react'

import type { RuleCoverageRow, RuleJurisdiction } from '@duedatehq/contracts'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'
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
import { usePulseSourceHealthQueryOptions } from '@/features/pulse/api'

import {
  coverageCellState,
  ENTITY_COLUMN_GROUPS,
  jurisdictionLabel,
  type CoverageCellState,
  type CoverageEntityColumn,
} from './rules-console-model'
import {
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
 * Per-jurisdiction entity coverage summary.
 *
 * Replaces the previous 7-dot strip (which required a separate legend
 * to be decoded) with an explicit text count + a popover that reveals
 * the per-entity breakdown on demand.
 *
 * Default cell renders one of three shapes:
 *   1. Mixed state (any active or any "no rule"): "2 active · 2 not in MVP"
 *      — only mentions entity counts that DIFFER from the default
 *      "review" state. Most jurisdictions have all 7 entities in
 *      "review" by default, so this cell shows the genuinely interesting
 *      signal.
 *   2. All-review default: "All 7 in review queue" — quiet text.
 *   3. The whole cell is the click target. Click opens a popover with
 *      the full 7-entity matrix, including a per-entity drill link to
 *      Library when there are rules to see.
 *
 * The popover is the path to per-entity granularity; the cell text is
 * the at-a-glance summary that doesn't need decoding.
 */
const ALL_ENTITIES: readonly CoverageEntityColumn[] = ENTITY_COLUMN_GROUPS.all

function entityCellState(state: CoverageCellState) {
  if (state === 'verified') return { tone: 'success' as const, label: 'active' as const }
  if (state === 'review') return { tone: 'warning' as const, label: 'review' as const }
  return { tone: 'disabled' as const, label: 'no rule' as const }
}

function summarizeEntityCoverage(jurisdiction: RuleJurisdiction) {
  let active = 0
  let review = 0
  let noRule = 0
  for (const entity of ALL_ENTITIES) {
    const state = coverageCellState(jurisdiction, entity)
    if (state === 'verified') active += 1
    else if (state === 'review') review += 1
    else noRule += 1
  }
  return { active, review, noRule, total: ALL_ENTITIES.length }
}

function EntityCoverageSummary({
  jurisdiction,
  onEntityDrillIn,
}: {
  jurisdiction: RuleJurisdiction
  onEntityDrillIn?: (
    jurisdiction: RuleJurisdiction,
    entity: CoverageEntityColumn,
    state: CoverageCellState,
  ) => void
}) {
  const { t } = useLingui()
  const summary = summarizeEntityCoverage(jurisdiction)
  const isAllReview = summary.review === summary.total
  // Compose the summary line. We only mention counts that deviate from the
  // default "review" state so the eye lands on exceptions, not noise.
  const parts: string[] = []
  if (summary.active > 0) parts.push(t`${summary.active} active`)
  if (summary.noRule > 0) parts.push(t`${summary.noRule} not in MVP`)
  const summaryLine = isAllReview ? t`All ${summary.total} in review queue` : parts.join(' · ')
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              'group/entity inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5',
              'text-xs outline-none',
              isAllReview ? 'text-text-tertiary' : 'text-text-secondary',
              'hover:bg-background-subtle hover:text-text-primary',
              'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
            )}
            aria-label={t`Open entity breakdown for ${jurisdictionLabel(jurisdiction)}`}
          >
            <span>{summaryLine}</span>
            <ChevronDownIcon
              aria-hidden
              className="size-3 text-text-tertiary transition-transform group-hover/entity:text-text-secondary"
            />
          </button>
        }
      />
      <PopoverContent align="start" className="w-72 p-0">
        <EntityCoveragePopoverBody
          jurisdiction={jurisdiction}
          {...(onEntityDrillIn ? { onEntityDrillIn } : {})}
        />
      </PopoverContent>
    </Popover>
  )
}

function EntityCoveragePopoverBody({
  jurisdiction,
  onEntityDrillIn,
}: {
  jurisdiction: RuleJurisdiction
  onEntityDrillIn?: (
    jurisdiction: RuleJurisdiction,
    entity: CoverageEntityColumn,
    state: CoverageCellState,
  ) => void
}) {
  const { t } = useLingui()
  return (
    <div className="flex flex-col">
      <div className="border-b border-divider-subtle px-3 py-2">
        <p className="text-xs font-medium tracking-[0.04em] text-text-tertiary uppercase">
          <Trans>Entity coverage</Trans>
        </p>
        <p className="text-sm font-medium text-text-primary">{jurisdictionLabel(jurisdiction)}</p>
      </div>
      <ul className="flex flex-col py-1">
        {ALL_ENTITIES.map((entity) => {
          const state = coverageCellState(jurisdiction, entity)
          const { tone, label } = entityCellState(state)
          const canDrill = state !== 'none' && onEntityDrillIn
          const Inner = (
            <>
              <ToneDot tone={tone} />
              <span className="flex-1 text-sm text-text-primary">{entityLabel(entity)}</span>
              <span className="text-xs text-text-tertiary">{label}</span>
            </>
          )
          return (
            <li key={entity}>
              {canDrill ? (
                <button
                  type="button"
                  onClick={() => onEntityDrillIn(jurisdiction, entity, state)}
                  aria-label={t`Open ${entityLabel(entity)} rules for ${jurisdictionLabel(jurisdiction)} — ${label}`}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left outline-none hover:bg-background-subtle focus-visible:bg-background-subtle focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset"
                >
                  {Inner}
                </button>
              ) : (
                <div className="flex w-full items-center gap-2 px-3 py-1.5">{Inner}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Single jurisdiction row used in both Coverage zones (needs-attention
 * and all-clear). Factored out of the table body so the zone partition
 * doesn't duplicate row markup.
 *
 * `compactStatus`: when rendered in the all-clear zone, hide the status
 * pill entirely. All-clear rows by definition have the default
 * "Official sources · pending rules" pill, repeating it 40+ times adds
 * pure noise. The expander caption already explains the zone meaning.
 */
function CoverageRow({
  row,
  statusLabel,
  compactStatus,
  onJurisdictionDrillIn,
  onEntityDrillIn,
}: {
  row: RuleCoverageRow
  statusLabel: string
  compactStatus?: boolean
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onEntityDrillIn?: (
    jurisdiction: RuleJurisdiction,
    entity: CoverageEntityColumn,
    state: CoverageCellState,
  ) => void
}) {
  const { t } = useLingui()
  const pending = row.pendingReviewCount ?? row.candidateCount
  const active = row.activeRuleCount ?? row.verifiedRuleCount
  return (
    <TableRow className="h-11 hover:bg-transparent">
      <TableCell className="py-2">
        <JurisdictionCode code={row.jurisdiction} />
      </TableCell>
      <TableCell className="max-w-[110px] truncate py-2 text-xs font-medium">
        {jurisdictionLabel(row.jurisdiction)}
      </TableCell>
      <TableCell className="py-2">
        <EntityCoverageSummary
          jurisdiction={row.jurisdiction}
          {...(onEntityDrillIn ? { onEntityDrillIn } : {})}
        />
      </TableCell>
      <TableCell className="py-2 text-right font-mono text-xs tabular-nums">{active}</TableCell>
      <TableCell
        className={cn(
          'py-2 text-right font-mono text-xs tabular-nums',
          pending > 0 ? 'text-status-review' : 'text-text-muted',
        )}
      >
        {onJurisdictionDrillIn && pending > 0 ? (
          <button
            type="button"
            onClick={() => onJurisdictionDrillIn(row.jurisdiction)}
            aria-label={t`Review ${pending} pending rules for ${jurisdictionLabel(row.jurisdiction)}`}
            className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            {pending}
          </button>
        ) : (
          pending
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
        {compactStatus ? (
          <span className="text-xs text-text-tertiary">—</span>
        ) : (
          <CoverageStatusPill jurisdiction={row.jurisdiction} label={statusLabel} />
        )}
      </TableCell>
    </TableRow>
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
 * Source-health callout. The Coverage table below shows per-jurisdiction
 * counts (active / pending / sources) — those don't need to be repeated
 * at the top. What IS unique to this slot is source health: a credential
 * the table can't show because it's an aggregate of the Pulse subsystem,
 * not the registry.
 *
 * Behavior:
 *   - When degraded > 0 OR failing > 0: render a bordered pill with the
 *     incident counts, linking to /rules/sources?health=degraded so the
 *     CPA lands on the affected rows.
 *   - When everything is healthy: render a quiet line "All N watched
 *     sources are healthy →" with the link still active so the user can
 *     verify on demand.
 */
function SourceHealthCallout({
  sourcesWatched,
  sourcesDegraded,
  sourcesFailing,
}: {
  sourcesWatched: number
  sourcesDegraded: number
  sourcesFailing: number
}) {
  const hasIncident = sourcesDegraded > 0 || sourcesFailing > 0
  if (hasIncident) {
    return (
      <Link
        to="/rules/sources?health=degraded"
        className={cn(
          'group/sources inline-flex h-8 w-fit items-center gap-2 rounded-md',
          'border border-divider-regular bg-background-subtle px-3',
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
              <Trans>sources degraded</Trans>
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
        <span className="ml-1 font-medium">
          <Trans>Review sources</Trans>
        </span>
        <ChevronRightIcon
          aria-hidden
          className="size-3.5 text-text-tertiary transition-transform group-hover/sources:translate-x-0.5 group-hover/sources:text-text-accent"
        />
      </Link>
    )
  }
  return (
    <Link
      to="/rules/sources"
      className="group/sources inline-flex h-8 w-fit items-baseline gap-1 rounded-md px-2 text-xs text-text-tertiary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
    >
      <span>
        <Trans>All</Trans>
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">
        {sourcesWatched}
      </span>
      <span>
        <Trans>watched sources are healthy</Trans>
      </span>
      <ChevronRightIcon aria-hidden className="size-3.5 self-center text-text-tertiary" />
    </Link>
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

  // Build per-jurisdiction action labels with the pending count baked in
  // so users see what to DO (and how many), not just a category tag.
  // Example: "Owner: approve 7 pending" vs the prior "Needs owner approval".
  const statusLabelFor = (row: RuleCoverageRow): string => {
    const pending = row.pendingReviewCount ?? row.candidateCount
    switch (row.jurisdiction) {
      case 'FED':
      case 'CA':
      case 'NY':
        return t`Owner: approve ${pending} pending`
      case 'TX':
        return t`Approve all ${pending} pending`
      case 'FL':
        return t`Auto-tracks IRS calendar`
      case 'WA':
        return t`Verify cadence per client`
      default:
        return pending > 0 ? t`Approve ${pending} pending` : t`No pending review`
    }
  }

  if (coverageQuery.isLoading) {
    return <QueryPanelState state="loading" message={t`Loading rules coverage…`} />
  }

  if (coverageQuery.isError) {
    return <QueryPanelState state="error" message={t`Couldn't load rules coverage`} />
  }

  const rows = coverageQuery.data ?? []
  const stats = aggregateCoverage(rows)

  // Zone sort: partition jurisdictions into "needs attention" (top, always
  // visible) and "all clear" (collapsed under expander). A jurisdiction
  // earns the top zone when:
  //   - PENDING count > 2 (substantial review backlog), OR
  //   - it has a non-default status pill (FED, CA, NY, TX, FL, WA today),
  //     OR
  //   - any of its entity dots are NOT in `review` state (i.e. there's a
  //     verified rule or an explicit "no rule" gap worth noticing).
  // The bottom zone is everything else — mostly "1 pending, all-review
  // entity dots" rows that repeat 40+ times in alphabetical order. Hiding
  // them by default cuts the wall of repetition without losing the data:
  // expander reveals the full alphabetical list.
  const needsAttention = needsAttentionRows(rows)
  const allClear = rows.filter((row) => !needsAttention.includes(row))
  return (
    <CoverageTable
      stats={stats}
      sourceHealthCounts={sourceHealthCounts}
      needsAttention={needsAttention}
      allClear={allClear}
      statusLabelFor={statusLabelFor}
      {...(onJurisdictionDrillIn ? { onJurisdictionDrillIn } : {})}
      {...(onEntityDrillIn ? { onEntityDrillIn } : {})}
    />
  )
}

// Jurisdictions that get a unique action label rather than the generic
// "Approve N pending" — these are the rows that earn the needs-attention
// zone even when their PENDING count is small. Single source of truth so
// the predicate and the label resolver stay in sync.
const SPECIAL_STATUS_JURISDICTIONS = new Set<RuleJurisdiction>([
  'FED',
  'CA',
  'NY',
  'TX',
  'FL',
  'WA',
])

function needsAttentionRows(rows: readonly RuleCoverageRow[]): RuleCoverageRow[] {
  return rows.filter((row) => {
    const pending = row.pendingReviewCount ?? row.candidateCount
    if (pending > 2) return true
    if (SPECIAL_STATUS_JURISDICTIONS.has(row.jurisdiction)) return true
    // Has at least one non-review entity dot (active or explicit no-rule)
    const hasInteresting = ALL_ENTITIES.some(
      (entity) => coverageCellState(row.jurisdiction, entity) !== 'review',
    )
    return hasInteresting
  })
}

function CoverageTable({
  stats,
  sourceHealthCounts,
  needsAttention,
  allClear,
  statusLabelFor,
  onJurisdictionDrillIn,
  onEntityDrillIn,
}: {
  stats: ReturnType<typeof aggregateCoverage>
  sourceHealthCounts: { degraded: number; failing: number }
  needsAttention: readonly RuleCoverageRow[]
  allClear: readonly RuleCoverageRow[]
  statusLabelFor: (row: RuleCoverageRow) => string
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onEntityDrillIn?: (
    jurisdiction: RuleJurisdiction,
    entity: CoverageEntityColumn,
    state: CoverageCellState,
  ) => void
}) {
  const [showAllClear, setShowAllClear] = useState(false)
  return (
    <div className="flex flex-col gap-6">
      <SourceHealthCallout
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
            {needsAttention.map((row) => (
              <CoverageRow
                key={row.jurisdiction}
                row={row}
                statusLabel={statusLabelFor(row)}
                {...(onJurisdictionDrillIn ? { onJurisdictionDrillIn } : {})}
                {...(onEntityDrillIn ? { onEntityDrillIn } : {})}
              />
            ))}
            {allClear.length > 0 ? (
              <TableRow className="h-10 hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="border-t border-divider-subtle bg-background-subtle/40 py-2 text-center"
                >
                  <button
                    type="button"
                    onClick={() => setShowAllClear((value) => !value)}
                    aria-expanded={showAllClear}
                    className="text-xs font-medium text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  >
                    {showAllClear ? (
                      <Trans>Hide {allClear.length} jurisdictions in standard review queue</Trans>
                    ) : (
                      <Trans>Show {allClear.length} jurisdictions in standard review queue</Trans>
                    )}
                  </button>
                </TableCell>
              </TableRow>
            ) : null}
            {showAllClear
              ? allClear.map((row) => (
                  <CoverageRow
                    key={row.jurisdiction}
                    row={row}
                    statusLabel={statusLabelFor(row)}
                    compactStatus
                    {...(onJurisdictionDrillIn ? { onJurisdictionDrillIn } : {})}
                    {...(onEntityDrillIn ? { onEntityDrillIn } : {})}
                  />
                ))
              : null}
          </TableBody>
        </Table>
      </SectionFrame>
    </div>
  )
}
