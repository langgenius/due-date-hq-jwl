import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, ChevronRightIcon } from 'lucide-react'

import type { RuleCoverageRow, RuleJurisdiction } from '@duedatehq/contracts'
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
const SPECIAL_STATUS_JURISDICTIONS = new Set<RuleJurisdiction>([
  'FED',
  'CA',
  'NY',
  'TX',
  'FL',
  'WA',
])

const ENTITY_SHORT_CODES: Record<CoverageEntityColumn, string> = {
  llc: 'LLC',
  partnership: 'PRT',
  s_corp: 'S-C',
  c_corp: 'C-C',
  sole_prop: 'SP',
  trust: 'TR',
  individual: 'IN',
}

function entityFullLabel(entity: CoverageEntityColumn): string {
  const labels: Record<CoverageEntityColumn, string> = {
    llc: 'LLC',
    partnership: 'Partnership',
    s_corp: 'S-Corp',
    c_corp: 'C-Corp',
    sole_prop: 'Sole prop',
    trust: 'Trust',
    individual: 'Individual',
  }
  return labels[entity]
}

function entityCellState(state: CoverageCellState) {
  if (state === 'verified') return { tone: 'success' as const, label: 'active' as const }
  if (state === 'review') return { tone: 'warning' as const, label: 'review' as const }
  return { tone: 'disabled' as const, label: 'no rule' as const }
}

function needsAttentionRows(rows: readonly RuleCoverageRow[]): RuleCoverageRow[] {
  return rows.filter((row) => {
    const pending = row.pendingReviewCount ?? row.candidateCount
    if (pending > 2) return true
    if (SPECIAL_STATUS_JURISDICTIONS.has(row.jurisdiction)) return true
    const hasInteresting = ALL_ENTITIES.some(
      (entity) => coverageCellState(row.jurisdiction, entity) !== 'review',
    )
    return hasInteresting
  })
}

export function CoverageCardsView({
  onJurisdictionDrillIn,
  onEntityDrillIn,
}: {
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onEntityDrillIn?: (
    jurisdiction: RuleJurisdiction,
    entity: CoverageEntityColumn,
    state: CoverageCellState,
  ) => void
} = {}) {
  const { t } = useLingui()
  const [showStandardQueue, setShowStandardQueue] = useState(false)
  const coverageQuery = useQuery(orpc.rules.coverage.queryOptions({ input: undefined }))
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

  if (coverageQuery.isLoading) {
    return <QueryPanelState state="loading" message={t`Loading rules coverage…`} />
  }
  if (coverageQuery.isError) {
    return <QueryPanelState state="error" message={t`Couldn't load rules coverage`} />
  }

  const rows = coverageQuery.data ?? []
  const needsAttention = needsAttentionRows(rows)
  const standardQueue = rows.filter((row) => !needsAttention.includes(row))
  const totalSources = rows.reduce((sum, row) => sum + row.sourceCount, 0)
  const hasIncident = sourceHealthCounts.degraded > 0 || sourceHealthCounts.failing > 0

  return (
    <div className="flex flex-col gap-6">
      {/*
        Source-health callout — identical to v1 so the only thing that
        differs between v1 and v2 is the data presentation, not the
        provenance signal.
      */}
      {hasIncident ? (
        <Link
          to="/rules/sources?health=degraded"
          className="group/sources inline-flex h-8 w-fit items-center gap-2 rounded-md border border-divider-regular bg-background-subtle px-3 text-xs text-text-secondary outline-none hover:border-state-accent-active-alt hover:bg-background-default hover:text-text-accent focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <AlertTriangleIcon aria-hidden className="size-3.5 text-severity-medium" />
          {sourceHealthCounts.degraded > 0 ? (
            <span className="inline-flex items-baseline gap-1">
              <span className="font-mono text-sm font-semibold tabular-nums text-severity-medium">
                {sourceHealthCounts.degraded}
              </span>
              <span>
                <Trans>sources degraded</Trans>
              </span>
            </span>
          ) : null}
          {sourceHealthCounts.degraded > 0 && sourceHealthCounts.failing > 0 ? (
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
          ) : null}
          {sourceHealthCounts.failing > 0 ? (
            <span className="inline-flex items-baseline gap-1">
              <span className="font-mono text-sm font-semibold tabular-nums text-text-destructive">
                {sourceHealthCounts.failing}
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
      ) : (
        <Link
          to="/rules/sources"
          className="group/sources inline-flex h-8 w-fit items-baseline gap-1 rounded-md px-2 text-xs text-text-tertiary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <span>
            <Trans>All</Trans>
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">
            {totalSources}
          </span>
          <span>
            <Trans>watched sources are healthy</Trans>
          </span>
          <ChevronRightIcon aria-hidden className="size-3.5 self-center text-text-tertiary" />
        </Link>
      )}

      {/*
        Needs-attention zone — 3-column grid of cards. Each card is a
        self-contained panel for one jurisdiction. The named entity-column
        block inside the card is what Option 3 (named columns) looked like
        — labels and dots together, no decoding required.
      */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {needsAttention.map((row) => (
          <JurisdictionCard
            key={row.jurisdiction}
            row={row}
            {...(onJurisdictionDrillIn ? { onJurisdictionDrillIn } : {})}
            {...(onEntityDrillIn ? { onEntityDrillIn } : {})}
          />
        ))}
      </section>

      {/*
        Standard-queue zone — collapsed by default. When expanded, renders
        as a compact alphabetical chip grid (not a second deck of cards;
        the standard queue doesn't earn that visual weight).
      */}
      {standardQueue.length > 0 ? (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowStandardQueue((value) => !value)}
            aria-expanded={showStandardQueue}
            className="inline-flex w-fit items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            {showStandardQueue ? (
              <Trans>Hide {standardQueue.length} jurisdictions in standard review queue</Trans>
            ) : (
              <Trans>Show {standardQueue.length} jurisdictions in standard review queue</Trans>
            )}
          </button>
          {showStandardQueue ? (
            <SectionFrame>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {standardQueue.map((row) => (
                  <StandardQueueChip
                    key={row.jurisdiction}
                    row={row}
                    {...(onJurisdictionDrillIn ? { onJurisdictionDrillIn } : {})}
                  />
                ))}
              </div>
            </SectionFrame>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

/**
 * One card per needs-attention jurisdiction.
 *
 * Layout:
 *   [JUR badge] California
 *   ─────────────────────────────────
 *   Owner: approve 7 pending          ← status (action-first)
 *   ─────────────────────────────────
 *   ENTITY COVERAGE
 *   LLC  PRT  S-C  C-C  SP   TR  IN   ← named columns (Option 3)
 *    ●    ●    ●    ○    ●    ●   ●   ← per-entity state dots
 *   ─────────────────────────────────
 *   7 pending · 6 sources · 0 active  ← stats footer
 *   [Review 7 pending →] [Sources →]   ← CTAs
 */
function JurisdictionCard({
  row,
  onJurisdictionDrillIn,
  onEntityDrillIn,
}: {
  row: RuleCoverageRow
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
  // Status label inlined here (rather than extracted to a helper) so the
  // lingui macro `t\`...\`` transforms correctly. The macro only fires at
  // the call site within a component body, not in plain functions.
  const status =
    row.jurisdiction === 'FED' || row.jurisdiction === 'CA' || row.jurisdiction === 'NY'
      ? t`Owner: approve ${pending} pending`
      : row.jurisdiction === 'TX'
        ? t`Approve all ${pending} pending`
        : row.jurisdiction === 'FL'
          ? t`Auto-tracks IRS calendar`
          : row.jurisdiction === 'WA'
            ? t`Verify cadence per client`
            : pending > 0
              ? t`Approve ${pending} pending`
              : t`No pending review`
  return (
    <article className="flex flex-col gap-3 rounded-md border border-divider-regular bg-background-default p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <JurisdictionCode code={row.jurisdiction} />
          <h3 className="text-sm font-semibold text-text-primary">
            {jurisdictionLabel(row.jurisdiction)}
          </h3>
        </div>
        {pending > 0 ? (
          <span className="font-mono text-xs font-semibold tabular-nums text-status-review">
            {pending} <Trans>pending</Trans>
          </span>
        ) : null}
      </header>

      {/* Action / status — primary signal */}
      <div className="rounded-sm border border-divider-subtle bg-background-subtle/60 px-2.5 py-1.5">
        <p className="text-xs font-medium text-text-primary">{status}</p>
      </div>

      {/* Named entity columns (Option 3 within a card) */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-medium tracking-[0.06em] text-text-tertiary uppercase">
          <Trans>Entity coverage</Trans>
        </p>
        <div className="grid grid-cols-7 gap-x-1 text-center">
          {ALL_ENTITIES.map((entity) => (
            <span
              key={`${entity}-label`}
              className="text-[10px] font-medium tracking-[0.04em] text-text-tertiary"
            >
              {ENTITY_SHORT_CODES[entity]}
            </span>
          ))}
          {ALL_ENTITIES.map((entity) => {
            const state = coverageCellState(row.jurisdiction, entity)
            const { tone, label } = entityCellState(state)
            const tooltip = `${entityFullLabel(entity)} — ${label}`
            const isInteractive = state !== 'none' && onEntityDrillIn
            if (!isInteractive) {
              return (
                <span
                  key={`${entity}-dot`}
                  title={tooltip}
                  aria-label={tooltip}
                  className="inline-flex justify-center"
                >
                  <ToneDot tone={tone} />
                </span>
              )
            }
            return (
              <button
                key={`${entity}-dot`}
                type="button"
                title={tooltip}
                aria-label={t`Open ${entityFullLabel(entity)} rules for ${jurisdictionLabel(row.jurisdiction)} — ${label}`}
                onClick={() => onEntityDrillIn(row.jurisdiction, entity, state)}
                className="inline-flex justify-center rounded-full outline-none transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1"
              >
                <ToneDot tone={tone} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats footer */}
      <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
        <span>
          <Trans>{row.sourceCount} sources</Trans>
        </span>
        <span aria-hidden>·</span>
        <span>
          <Trans>{active} active</Trans>
        </span>
      </div>

      {/* CTAs */}
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {onJurisdictionDrillIn && pending > 0 ? (
          <button
            type="button"
            onClick={() => onJurisdictionDrillIn(row.jurisdiction)}
            aria-label={t`Review ${pending} pending rules for ${jurisdictionLabel(row.jurisdiction)}`}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-md',
              'border border-divider-regular bg-background-default px-2.5',
              'text-xs font-medium text-text-primary outline-none',
              'hover:border-state-accent-active-alt hover:text-text-accent',
              'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
            )}
          >
            <Trans>Review {pending} pending</Trans>
            <ChevronRightIcon aria-hidden className="size-3" />
          </button>
        ) : null}
        {row.sourceCount > 0 ? (
          <Link
            to={`/rules/sources?jur=${row.jurisdiction}&from=coverage`}
            aria-label={t`View ${row.sourceCount} watched sources for ${jurisdictionLabel(row.jurisdiction)}`}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-text-secondary outline-none hover:text-text-accent hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>{row.sourceCount} sources</Trans>
            <ChevronRightIcon aria-hidden className="size-3" />
          </Link>
        ) : null}
      </div>
    </article>
  )
}

/**
 * Compact chip used in the collapsed standard-queue zone. Each chip is
 * a single-line read of one jurisdiction: code · name · "N pending →".
 * No entity dots here — by definition, standard-queue jurisdictions
 * are all-review default, so the per-entity breakdown would be the
 * same 7 orange dots for everyone (the noise we were collapsing).
 */
function StandardQueueChip({
  row,
  onJurisdictionDrillIn,
}: {
  row: RuleCoverageRow
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
}) {
  const { t } = useLingui()
  const pending = row.pendingReviewCount ?? row.candidateCount
  const content = (
    <>
      <JurisdictionCode code={row.jurisdiction} />
      <span className="flex-1 truncate text-xs text-text-secondary">
        {jurisdictionLabel(row.jurisdiction)}
      </span>
      {pending > 0 ? (
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-tertiary">
          {pending}
        </span>
      ) : null}
    </>
  )
  if (onJurisdictionDrillIn && pending > 0) {
    return (
      <button
        type="button"
        onClick={() => onJurisdictionDrillIn(row.jurisdiction)}
        aria-label={t`Review ${pending} pending rules for ${jurisdictionLabel(row.jurisdiction)}`}
        className="inline-flex items-center gap-2 rounded px-2 py-1 text-left outline-none hover:bg-background-subtle focus-visible:bg-background-subtle focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        {content}
      </button>
    )
  }
  return <div className="inline-flex items-center gap-2 rounded px-2 py-1">{content}</div>
}
