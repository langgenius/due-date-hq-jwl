import { useMemo, useState } from 'react'
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

const ALL_ENTITIES: readonly CoverageEntityColumn[] = ENTITY_COLUMN_GROUPS.all

const ENTITY_SHORT_CODES: Record<CoverageEntityColumn, string> = {
  llc: 'LLC',
  partnership: 'PRT',
  s_corp: 'S-C',
  c_corp: 'C-C',
  sole_prop: 'SP',
  trust: 'TR',
  individual: 'IN',
}

const ENTITY_FULL_LABELS: Record<CoverageEntityColumn, string> = {
  llc: 'LLC',
  partnership: 'Partnership',
  s_corp: 'S-Corp',
  c_corp: 'C-Corp',
  sole_prop: 'Sole prop',
  trust: 'Trust',
  individual: 'Individual',
}

function entityCellState(state: CoverageCellState) {
  if (state === 'verified') return { tone: 'success' as const, label: 'active' as const }
  if (state === 'review') return { tone: 'warning' as const, label: 'review' as const }
  return { tone: 'disabled' as const, label: 'no rule' as const }
}

/**
 * One (jurisdiction, entity) cell — a single tone-coded dot rendered as
 * the only content of its own table cell. Visible by default (no
 * popover), self-documenting via the entity sub-header above it
 * (LLC / PRT / S-C / C-C / SP / TR / IN). Verified/review dots are
 * interactive buttons that drill into Library; no-rule dots are static.
 */
function EntityCell({
  jurisdiction,
  entity,
  onEntityDrillIn,
}: {
  jurisdiction: RuleJurisdiction
  entity: CoverageEntityColumn
  onEntityDrillIn?: (
    jurisdiction: RuleJurisdiction,
    entity: CoverageEntityColumn,
    state: CoverageCellState,
  ) => void
}) {
  const { t } = useLingui()
  const state = coverageCellState(jurisdiction, entity)
  const { tone, label } = entityCellState(state)
  const tooltip = `${ENTITY_FULL_LABELS[entity]} — ${label}`
  if (state === 'none' || !onEntityDrillIn) {
    return (
      <span title={tooltip} aria-label={tooltip} className="inline-flex justify-center">
        <ToneDot tone={tone} />
      </span>
    )
  }
  return (
    <button
      type="button"
      title={tooltip}
      aria-label={t`Open ${ENTITY_FULL_LABELS[entity]} rules for ${jurisdictionLabel(jurisdiction)} — ${label}`}
      onClick={() => onEntityDrillIn(jurisdiction, entity, state)}
      className="inline-flex justify-center rounded-full outline-none transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1"
    >
      <ToneDot tone={tone} />
    </button>
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
  onActiveDrillIn,
  onEntityDrillIn,
}: {
  row: RuleCoverageRow
  statusLabel: string
  compactStatus?: boolean
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onActiveDrillIn?: (jurisdiction: RuleJurisdiction) => void
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
        <div className="flex items-center gap-2">
          <JurisdictionCode code={row.jurisdiction} />
          <span className="truncate text-xs font-medium">
            {jurisdictionLabel(row.jurisdiction)}
          </span>
        </div>
      </TableCell>
      {ALL_ENTITIES.map((entity) => (
        <TableCell key={entity} className="px-1 py-2 text-center">
          <EntityCell
            jurisdiction={row.jurisdiction}
            entity={entity}
            {...(onEntityDrillIn ? { onEntityDrillIn } : {})}
          />
        </TableCell>
      ))}
      <TableCell
        className={cn(
          'border-l border-divider-subtle py-2 text-right font-mono text-xs tabular-nums',
          active > 0 ? 'text-text-primary' : 'text-text-muted',
        )}
      >
        {onActiveDrillIn && active > 0 ? (
          <button
            type="button"
            onClick={() => onActiveDrillIn(row.jurisdiction)}
            aria-label={t`View ${active} active rules for ${jurisdictionLabel(row.jurisdiction)}`}
            className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            {active}
          </button>
        ) : (
          active
        )}
      </TableCell>
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
      <TableCell className="py-2">
        {compactStatus ? (
          <span className="text-xs text-text-tertiary">—</span>
        ) : (
          <span
            className={cn(
              'text-xs',
              pending > 0 ? 'font-medium text-text-primary' : 'text-text-tertiary',
            )}
          >
            {statusLabel}
          </span>
        )}
      </TableCell>
      <TableCell className="border-l border-divider-subtle py-2 text-right font-mono text-[11px] tabular-nums text-text-tertiary">
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
  onActiveDrillIn,
  onEntityDrillIn,
}: {
  // Fired when the PENDING count is clicked → Library filtered to
  // pending_review for the jurisdiction.
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
  // Fired when the ACTIVE count is clicked → Library filtered to
  // active for the jurisdiction. Lets the count link to the rules
  // it represents instead of staying a cold number.
  onActiveDrillIn?: (jurisdiction: RuleJurisdiction) => void
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
  // Plain-language action label per row. No role prefix ("Owner:")
  // — permission to act is gated elsewhere; surfacing it on every row
  // adds cognitive load without adding agency. Reads as a to-do, not a
  // category tag.
  const statusLabelFor = (row: RuleCoverageRow): string => {
    const pending = row.pendingReviewCount ?? row.candidateCount
    switch (row.jurisdiction) {
      case 'FL':
        return t`Auto-tracks IRS calendar`
      case 'WA':
        return t`Verify cadence per client`
      case 'TX':
        return pending > 0 ? t`Approve all ${pending} pending` : t`No pending review`
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
      {...(onActiveDrillIn ? { onActiveDrillIn } : {})}
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
  onActiveDrillIn,
  onEntityDrillIn,
}: {
  stats: ReturnType<typeof aggregateCoverage>
  sourceHealthCounts: { degraded: number; failing: number }
  needsAttention: readonly RuleCoverageRow[]
  allClear: readonly RuleCoverageRow[]
  statusLabelFor: (row: RuleCoverageRow) => string
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onActiveDrillIn?: (jurisdiction: RuleJurisdiction) => void
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
              <TableHead className="w-[170px]" rowSpan={2}>
                JURISDICTION
              </TableHead>
              <TableHead colSpan={ALL_ENTITIES.length} className="border-b-0 text-center">
                ENTITY COVERAGE
              </TableHead>
              <TableHead className="w-[72px] border-l border-divider-subtle text-right" rowSpan={2}>
                ACTIVE
              </TableHead>
              <TableHead className="w-[72px] text-right" rowSpan={2}>
                PENDING
              </TableHead>
              <TableHead className="w-[220px]" rowSpan={2}>
                ACTION
              </TableHead>
              <TableHead
                className="w-[64px] border-l border-divider-subtle text-right text-[10px] font-medium tracking-[0.06em] text-text-tertiary uppercase"
                rowSpan={2}
              >
                Sources
              </TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent">
              {ALL_ENTITIES.map((entity) => (
                <TableHead
                  key={entity}
                  className="w-[36px] px-1 text-center text-[10px] font-medium tracking-[0.04em] text-text-tertiary uppercase"
                >
                  {ENTITY_SHORT_CODES[entity]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {needsAttention.map((row) => (
              <CoverageRow
                key={row.jurisdiction}
                row={row}
                statusLabel={statusLabelFor(row)}
                {...(onJurisdictionDrillIn ? { onJurisdictionDrillIn } : {})}
                {...(onActiveDrillIn ? { onActiveDrillIn } : {})}
                {...(onEntityDrillIn ? { onEntityDrillIn } : {})}
              />
            ))}
            {allClear.length > 0 ? (
              <TableRow className="h-10 hover:bg-transparent">
                <TableCell
                  colSpan={ALL_ENTITIES.length + 5}
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
                    {...(onActiveDrillIn ? { onActiveDrillIn } : {})}
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
