import { type ReactNode, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'

import type { RuleCoverageRow, RuleJurisdiction } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
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

import {
  coverageCellState,
  DEFAULT_COVERAGE_ENTITY_GROUP,
  ENTITY_COLUMN_GROUPS,
  jurisdictionLabel,
  RULE_JURISDICTIONS,
  type CoverageEntityColumn,
  type CoverageEntityGroup,
} from './rules-console-model'
import {
  CoverageCell,
  CoverageLegend,
  JurisdictionCode,
  QueryPanelState,
  SectionFrame,
  SectionLabel,
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

function StatCell({
  label,
  value,
  caption,
  emphasis,
}: {
  label: ReactNode
  value: number
  caption: string
  emphasis?: 'accent' | 'warning'
}) {
  const valueClass =
    emphasis === 'accent'
      ? 'text-status-review'
      : emphasis === 'warning'
        ? 'text-severity-medium'
        : 'text-text-primary'
  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      <span className="text-[11px] font-medium tracking-[0.08em] text-text-tertiary uppercase">
        {label}
      </span>
      <span
        className={cn('font-mono text-2xl leading-none font-semibold tabular-nums', valueClass)}
      >
        {value}
      </span>
      <span className="text-xs text-text-tertiary">{caption}</span>
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

export function CoverageTab({
  onJurisdictionDrillIn,
}: {
  // Optional callback fired when a pending-count cell in the jurisdiction
  // summary is activated. The merged Library page wires this to a handler
  // that pushes `library=pending_review&jur=<jurisdiction>` into the URL
  // (which Library's filter state reads) and scrolls the Library section
  // into view. Standalone /rules/coverage callers (none today, but reserved)
  // can omit this — pending cells render as plain text instead of buttons.
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
} = {}) {
  const { t } = useLingui()
  const [entityGroup, setEntityGroup] = useState<CoverageEntityGroup>(DEFAULT_COVERAGE_ENTITY_GROUP)
  const [showAllReview, setShowAllReview] = useState(false)
  const coverageQuery = useQuery(orpc.rules.coverage.queryOptions({ input: undefined }))

  const entityColumns = ENTITY_COLUMN_GROUPS[entityGroup]
  // Partition jurisdictions so the dense matrix doesn't drown the eye in
  // identical yellow "review" dots. A jurisdiction is "interesting" when at
  // least one of its visible entity columns has an active or no-rule cell;
  // those rows go above the fold. The remainder collapse under a single
  // expander row — when ~95% of states default to review across all entity
  // types, hiding them by default makes the matrix's signal visible. Hook
  // is called before the loading / error early returns so hook order is
  // stable across renders.
  const { interestingJurisdictions, allReviewJurisdictions } = useMemo(() => {
    const interesting: RuleJurisdiction[] = []
    const allReview: RuleJurisdiction[] = []
    for (const jurisdiction of RULE_JURISDICTIONS) {
      const hasNonReviewCell = entityColumns.some(
        (entity) => coverageCellState(jurisdiction, entity) !== 'review',
      )
      if (hasNonReviewCell) {
        interesting.push(jurisdiction)
      } else {
        allReview.push(jurisdiction)
      }
    }
    return { interestingJurisdictions: interesting, allReviewJurisdictions: allReview }
  }, [entityColumns])

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
  const visibleJurisdictions = showAllReview
    ? [...interestingJurisdictions, ...allReviewJurisdictions]
    : interestingJurisdictions
  const entityGroupOptions: Array<{ value: CoverageEntityGroup; label: string }> = [
    { value: 'business', label: t`Business` },
    { value: 'personal', label: t`Personal & fiduciary` },
    { value: 'all', label: t`All` },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/*
        KPI strip — flat panel anchored to the same `left=24` as the tab nav.
        Four cells separated by 1 px hairlines (Level 1 surface, no shadow per
        DESIGN.md §6). Numbers are tabular-nums Geist Mono so the row reads as
        a financial scoreboard, not a marketing block.
      */}
      <SectionFrame>
        <div className="grid grid-cols-2 divide-y divide-divider-regular sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <StatCell
            label={<ConceptLabel concept="verifiedRule">{t`Active rules`}</ConceptLabel>}
            value={stats.active}
            caption={t`accepted by this practice`}
          />
          <StatCell
            label={<ConceptLabel concept="candidateRule">{t`Needs review`}</ConceptLabel>}
            value={stats.pending}
            caption={t`owner or manager approval required`}
            {...(stats.pending > 0 ? { emphasis: 'accent' as const } : {})}
          />
          <StatCell
            label={<ConceptLabel concept="evidence">{t`Sources watched`}</ConceptLabel>}
            value={stats.sources}
            caption={t`official channels under monitor`}
          />
          <StatCell
            label={<ConceptLabel concept="coverage">{t`Jurisdictions`}</ConceptLabel>}
            value={stats.jurisdictions}
            caption={t`${stats.fullyCovered} fully active · ${stats.jurisdictions - stats.fullyCovered} with open reviews`}
          />
        </div>
      </SectionFrame>

      {/*
        Two-column governance layout:
        - Left (col-span-6): per-jurisdiction summary — the substantive table
          where each row carries V/C/SRC counts plus the human-readable STATUS
          pill. This is the primary "what is the state per jurisdiction"
          answer the page exists to surface.
        - Right (col-span-6): jurisdiction × entity matrix — a denser
          "scanner" view that confirms which (jurisdiction, entity) pairs
          actually generate verifiable obligations vs. fall back to review.
        On viewports narrower than the `xl` breakpoint they stack with the
        summary on top — same reading order as the original 880 px column.
      */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="flex flex-col gap-2 xl:col-span-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <SectionLabel>
                <Trans>JURISDICTION SUMMARY</Trans>
              </SectionLabel>
            </div>
            <span className="text-xs text-text-tertiary">
              <Trans>active · pending · sources · current state</Trans>
            </span>
          </div>
          <SectionFrame>
            <Table>
              <TableHeader className="bg-background-subtle">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[64px]">JUR</TableHead>
                  <TableHead className="w-[90px]">NAME</TableHead>
                  <TableHead className="w-[88px] text-right">ACTIVE</TableHead>
                  <TableHead className="w-[96px] text-right">PENDING</TableHead>
                  <TableHead className="w-[88px] text-right">SOURCES</TableHead>
                  <TableHead className="w-[260px]">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.jurisdiction} className="h-11 hover:bg-transparent">
                    <TableCell className="py-2">
                      <JurisdictionCode code={row.jurisdiction} />
                    </TableCell>
                    <TableCell className="w-[90px] max-w-[90px] truncate py-2 text-xs font-medium">
                      {jurisdictionLabel(row.jurisdiction)}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs tabular-nums">
                      {row.activeRuleCount ?? row.verifiedRuleCount}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'py-2 text-right font-mono text-xs tabular-nums',
                        // Candidate count tones the column blue only when there
                        // is at least one candidate (Figma 218:24); zero values
                        // stay muted to avoid drawing the eye to "nothing here".
                        (row.pendingReviewCount ?? row.candidateCount) > 0
                          ? 'text-status-review'
                          : 'text-text-muted',
                      )}
                    >
                      {onJurisdictionDrillIn &&
                      (row.pendingReviewCount ?? row.candidateCount) > 0 ? (
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
                      {row.sourceCount}
                    </TableCell>
                    <TableCell className="py-2">
                      <CoverageStatusPill
                        jurisdiction={row.jurisdiction}
                        label={
                          coverageStatusLabels[row.jurisdiction] ??
                          t`Official sources · pending rules`
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionFrame>
        </section>

        <section className="flex flex-col gap-2 xl:col-span-6">
          <div className="relative flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionLabel>
                <Trans>ENTITY COVERAGE</Trans>
              </SectionLabel>
              <div
                className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-md border border-divider-regular bg-background-subtle p-1 xl:absolute xl:top-0 xl:right-0"
                aria-label={t`Entity coverage view`}
              >
                {entityGroupOptions.map((option) => {
                  const active = option.value === entityGroup
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      size="xs"
                      variant="ghost"
                      className={cn(
                        'h-6 rounded px-2 text-xs shadow-none',
                        active
                          ? 'bg-background-default text-text-primary shadow-xs hover:bg-background-default'
                          : 'text-text-secondary hover:bg-background-default',
                      )}
                      aria-pressed={active}
                      onClick={() => setEntityGroup(option.value)}
                    >
                      {option.label}
                    </Button>
                  )
                })}
              </div>
            </div>
            <span className="text-xs text-text-tertiary">
              <Trans>showing selected client entity groups; Other remains manual review</Trans>
            </span>
          </div>
          <SectionFrame>
            <Table className={entityGroup === 'all' ? 'min-w-[760px]' : 'min-w-[560px]'}>
              <TableHeader className="bg-background-subtle">
                <TableRow className="hover:bg-transparent">
                  <TableHead>JURISDICTION</TableHead>
                  {entityColumns.map((entity) => (
                    <TableHead key={entity} className="text-center">
                      {entityLabel(entity)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleJurisdictions.map((jurisdiction) => (
                  <TableRow key={jurisdiction} className="h-11 hover:bg-transparent">
                    <TableCell className="py-2 text-xs font-medium">
                      {jurisdictionLabel(jurisdiction)}
                    </TableCell>
                    {entityColumns.map((entity) => (
                      <TableCell key={entity} className="py-2 text-center">
                        <CoverageCell state={coverageCellState(jurisdiction, entity)} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {allReviewJurisdictions.length > 0 ? (
                  <TableRow className="h-10 hover:bg-transparent">
                    <TableCell
                      colSpan={entityColumns.length + 1}
                      className="border-t border-divider-subtle py-2 text-center"
                    >
                      <button
                        type="button"
                        onClick={() => setShowAllReview((value) => !value)}
                        className="text-xs font-medium text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                      >
                        {showAllReview ? (
                          <Trans>
                            Hide {allReviewJurisdictions.length} jurisdictions defaulting to review
                          </Trans>
                        ) : (
                          <Trans>
                            Show {allReviewJurisdictions.length} jurisdictions defaulting to review
                          </Trans>
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </SectionFrame>
          <CoverageLegend />
        </section>
      </div>
    </div>
  )
}
