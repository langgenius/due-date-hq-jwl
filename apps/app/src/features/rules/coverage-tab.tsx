import { Fragment, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs'

import type {
  ObligationRule,
  RuleCoverageRow,
  RuleJurisdiction,
  RuleSource,
} from '@duedatehq/contracts'
import { Input } from '@duedatehq/ui/components/ui/input'
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
  jurisdictionLabel,
  type CoverageCellState,
  type CoverageEntityColumn,
} from './rules-console-model'
import { JurisdictionCode, QueryPanelState, SectionFrame } from './rules-console-primitives'
import { RuleDetailCompact } from './rule-detail-drawer'

// Column order matches the canonical Coverage design — full names in
// the sub-column header, no codes. "Partner." abbreviates Partnership
// for column-width parity without losing recognizability.
const ENTITY_DISPLAY: { col: CoverageEntityColumn; label: string; fullName: string }[] = [
  { col: 'llc', label: 'LLC', fullName: 'LLC' },
  { col: 'partnership', label: 'Partner.', fullName: 'Partnership' },
  { col: 's_corp', label: 'S-Corp', fullName: 'S-Corp' },
  { col: 'c_corp', label: 'C-Corp', fullName: 'C-Corp' },
  { col: 'sole_prop', label: 'Sole Prop', fullName: 'Sole proprietor' },
  { col: 'individual', label: 'Individual', fullName: 'Individual' },
  { col: 'trust', label: 'Trust', fullName: 'Trust' },
]

type RowFilter = 'all' | 'attention' | 'pending' | 'active'
const ROW_FILTERS: readonly RowFilter[] = ['all', 'attention', 'pending', 'active']
// URL-state parsers — filter + search go into the URL so browser
// back/forward, deep-linking, and shareable views all work. Both
// use `history: 'replace'` so each character / toggle doesn't bloat
// history.
const filterParser = parseAsStringLiteral(ROW_FILTERS)
  .withDefault('all')
  .withOptions({ history: 'replace' })
const searchParser = parseAsString.withDefault('').withOptions({ history: 'replace' })

export function CoverageTab({
  onJurisdictionDrillIn,
  onActiveDrillIn,
  onSourceDrillIn,
  onEntityDrillIn,
}: {
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onActiveDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onSourceDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onEntityDrillIn?: (
    jurisdiction: RuleJurisdiction,
    entity: CoverageEntityColumn,
    state: CoverageCellState,
  ) => void
} = {}) {
  const { t } = useLingui()
  // Filter + search live in URL state (nuqs) — survives refresh,
  // back/forward navigation, and shareable links to "Coverage filtered
  // to attention". Component state would have lost the user's view
  // on refresh and broken browser-back through filter changes.
  const [filterRaw, setFilterQuery] = useQueryState('filter', filterParser)
  const [search, setSearch] = useQueryState('q', searchParser)
  const filter = filterRaw
  const setFilter = (next: RowFilter) => {
    void setFilterQuery(next)
  }
  const setSearchValue = (next: string) => {
    void setSearch(next)
  }

  const coverageQuery = useQuery(orpc.rules.coverage.queryOptions({ input: undefined }))
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())
  const sourcesQuery = useQuery(orpc.rules.listSources.queryOptions({ input: undefined }))
  const rulesQuery = useQuery(
    orpc.rules.listRules.queryOptions({ input: { includeCandidates: true } }),
  )
  // Per-jurisdiction expansion state. Row-click toggles a jurisdiction
  // into this set; multiple rows can be expanded simultaneously so the
  // user can compare two jurisdictions inline without context-switching.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleExpanded = (jurisdiction: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(jurisdiction)) next.delete(jurisdiction)
      else next.add(jurisdiction)
      return next
    })
  }

  // Selected rule for the docked right panel. URL-backed so review
  // mode survives a refresh, is deep-linkable, and the route file
  // can read the same state to hide the page-level title +
  // description in review mode. `null` = matrix view; any string =
  // review mode for that rule id.
  const [selectedRuleId, setSelectedRuleId] = useQueryState(
    'rule',
    parseAsString.withOptions({ history: 'replace' }),
  )
  const selectRule = (ruleId: string) => {
    void setSelectedRuleId((prev) => (prev === ruleId ? null : ruleId))
  }

  const sourcesByJurisdiction = useMemo(() => {
    const map = new Map<RuleJurisdiction, RuleSource[]>()
    for (const source of sourcesQuery.data ?? []) {
      const list = map.get(source.jurisdiction) ?? []
      list.push(source)
      map.set(source.jurisdiction, list)
    }
    return map
  }, [sourcesQuery.data])

  // Pending rules grouped by jurisdiction — feeds the expanded row's
  // rule list. Cached via useMemo so toggling expansion is cheap.
  const pendingRulesByJurisdiction = useMemo(() => {
    const map = new Map<RuleJurisdiction, ObligationRule[]>()
    for (const rule of rulesQuery.data ?? []) {
      if (rule.status !== 'pending_review' && rule.status !== 'candidate') continue
      const list = map.get(rule.jurisdiction) ?? []
      list.push(rule)
      map.set(rule.jurisdiction, list)
    }
    return map
  }, [rulesQuery.data])

  // All rules grouped by jurisdiction — used for search. Searching by
  // rule title (e.g. "Form 1040") should match any rule the practice
  // tracks for that jurisdiction, not just pending ones, so a CPA
  // looking up an existing accepted rule still finds it.
  const rulesByJurisdiction = useMemo(() => {
    const map = new Map<RuleJurisdiction, ObligationRule[]>()
    for (const rule of rulesQuery.data ?? []) {
      const list = map.get(rule.jurisdiction) ?? []
      list.push(rule)
      map.set(rule.jurisdiction, list)
    }
    return map
  }, [rulesQuery.data])

  // Rows auto-expanded by search — when a query like "form 1040"
  // matches a rule title (not the jurisdiction code/name), the row
  // appears in the filtered list, but without expanding the user
  // can't see which rule matched. Auto-expanding those rows gives
  // the matched-rule context for free. User's manual expansion in
  // `expanded` still takes precedence; effective expansion is the
  // union of the two sets.
  const searchExpanded = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q.length === 0) return new Set<string>()
    const matches = new Set<string>()
    for (const [jurisdiction, rules] of rulesByJurisdiction.entries()) {
      const code = jurisdiction.toLowerCase()
      const name = jurisdictionLabel(jurisdiction).toLowerCase()
      if (code.includes(q) || name.includes(q)) continue
      if (rules.some((rule) => rule.title.toLowerCase().includes(q))) {
        matches.add(jurisdiction)
      }
    }
    return matches
  }, [search, rulesByJurisdiction])

  // Lookup so expanded rows can render the actual cited source per
  // rule (rule.sourceIds → RuleSource).
  const sourceById = useMemo(() => {
    const map = new Map<string, RuleSource>()
    for (const source of sourcesQuery.data ?? []) map.set(source.id, source)
    return map
  }, [sourcesQuery.data])

  const sourceHealthCounts = useMemo(() => {
    const entries = sourceHealthQuery.data?.sources ?? []
    let degraded = 0
    let failing = 0
    for (const entry of entries) {
      if (entry.healthStatus === 'degraded') degraded += 1
      else if (entry.healthStatus === 'failing') failing += 1
    }
    return { degraded, failing, total: entries.length }
  }, [sourceHealthQuery.data])

  // Hoist memos BEFORE early returns so React's hook order stays
  // stable across loading/error/success renders.
  const attentionJurisdictions = useMemo(() => {
    const set = new Set<string>()
    for (const entry of sourceHealthQuery.data?.sources ?? []) {
      if (entry.healthStatus === 'degraded' || entry.healthStatus === 'failing') {
        set.add(entry.jurisdiction)
      }
    }
    return set
  }, [sourceHealthQuery.data])

  const selectedRule = useMemo(() => {
    if (!selectedRuleId) return null
    return (rulesQuery.data ?? []).find((rule) => rule.id === selectedRuleId) ?? null
  }, [selectedRuleId, rulesQuery.data])

  const rowsData = useMemo(() => coverageQuery.data ?? [], [coverageQuery.data])
  const filteredRows = useMemo(() => {
    return rowsData.filter((row) => {
      const active = row.activeRuleCount ?? row.verifiedRuleCount
      const pending = row.pendingReviewCount ?? row.candidateCount
      if (filter === 'pending' && pending === 0) return false
      if (filter === 'active' && active === 0) return false
      if (filter === 'attention' && !attentionJurisdictions.has(row.jurisdiction)) return false
      if (search.trim().length > 0) {
        const q = search.trim().toLowerCase()
        const code = row.jurisdiction.toLowerCase()
        const name = jurisdictionLabel(row.jurisdiction).toLowerCase()
        if (code.includes(q) || name.includes(q)) return true
        // Fall through to rule-title match — a query like "form 1040"
        // or "estimated payment" should find every jurisdiction that
        // has a rule with that title, not just match jurisdiction codes.
        const jurisdictionRules = rulesByJurisdiction.get(row.jurisdiction) ?? []
        const hasRuleMatch = jurisdictionRules.some((rule) => rule.title.toLowerCase().includes(q))
        if (!hasRuleMatch) return false
      }
      return true
    })
  }, [rowsData, filter, search, attentionJurisdictions, rulesByJurisdiction])

  // Pending-review queue flattened to a single ordered list — AL → AK
  // → AZ … with each jurisdiction's pending rules in submission order.
  // The queue rail renders the same order, so callers can use index +
  // 1 / -1 to "next" / "previous" without recomputing.
  const pendingQueue = useMemo<ObligationRule[]>(() => {
    const out: ObligationRule[] = []
    for (const row of rowsData) {
      const rules = pendingRulesByJurisdiction.get(row.jurisdiction) ?? []
      out.push(...rules)
    }
    return out
  }, [rowsData, pendingRulesByJurisdiction])
  const firstPendingRule = pendingQueue[0] ?? null

  // Queue navigation helpers + keyboard shortcuts. All hoisted ABOVE
  // the loading/error early-returns so the hook order stays stable
  // across renders (React Rules of Hooks).
  const goNext = () => {
    if (pendingQueue.length === 0 || !selectedRuleId) return
    const idx = pendingQueue.findIndex((r) => r.id === selectedRuleId)
    if (idx < 0) return
    const next = pendingQueue[idx + 1] ?? pendingQueue[0]
    if (next && next.id !== selectedRuleId) void setSelectedRuleId(next.id)
  }
  const goPrev = () => {
    if (pendingQueue.length === 0 || !selectedRuleId) return
    const idx = pendingQueue.findIndex((r) => r.id === selectedRuleId)
    if (idx < 0) return
    const prev = pendingQueue[idx - 1] ?? pendingQueue[pendingQueue.length - 1]
    if (prev && prev.id !== selectedRuleId) void setSelectedRuleId(prev.id)
  }
  const advanceAfterDecision = () => {
    if (!selectedRuleId) return
    const remaining = pendingQueue.filter((r) => r.id !== selectedRuleId)
    if (remaining.length === 0) {
      void setSelectedRuleId(null)
      return
    }
    const idx = pendingQueue.findIndex((r) => r.id === selectedRuleId)
    const next =
      (idx >= 0 ? pendingQueue.slice(idx + 1).find((r) => r.id !== selectedRuleId) : null) ??
      remaining[0]
    if (next) void setSelectedRuleId(next.id)
  }

  // Keyboard shortcuts in review mode: j/↓ next, k/↑ prev, Esc exit.
  // Ignored when focus is inside an input / textarea / contentEditable
  // so the user can still type into the search box.
  const panelOpenForKeys = selectedRuleId !== null
  useEffect(() => {
    if (!panelOpenForKeys) return
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault()
        goNext()
      } else if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault()
        goPrev()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        void setSelectedRuleId(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpenForKeys, selectedRuleId, pendingQueue])

  if (coverageQuery.isLoading) {
    return <QueryPanelState state="loading" message={t`Loading rules coverage…`} />
  }
  if (coverageQuery.isError) {
    return <QueryPanelState state="error" message={t`Couldn't load rules coverage`} />
  }

  const rows = rowsData
  const stats = aggregateStats(rows, sourceHealthCounts)
  const sourcesNeedingAttention = sourceHealthCounts.degraded + sourceHealthCounts.failing
  const panelOpen = selectedRuleId !== null
  const visibleEntityColumns = panelOpen ? [] : ENTITY_DISPLAY
  const totalColumnCount = 3 + 1 + visibleEntityColumns.length

  const startReview = () => {
    if (firstPendingRule) void setSelectedRuleId(firstPendingRule.id)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats strip + entry CTA — unmounted entirely in review mode.
        Stats are uniformly passive summary text (no click on any of
        them — making one clickable while the others aren't would
        violate visual-affordance consistency). The action lives in
        the dedicated `StartReviewCTA` button below. */}
      {!panelOpen ? (
        <div className="flex flex-col gap-3">
          <StatsStrip stats={stats} attentionCount={sourcesNeedingAttention} />
          {firstPendingRule ? (
            <StartReviewCTA pendingCount={stats.pending} onStartReview={startReview} />
          ) : null}
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        {/* In normal mode, the section header carries the "Entity
          coverage" label + search input + source-attention banner.
          In review mode, all of that orientation chrome moves into
          the workspace (search goes into the queue header) so the
          banner-to-workspace gap collapses. */}
        {!panelOpen ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-semibold tracking-[0.12em] text-text-primary uppercase">
                <Trans>Entity coverage</Trans>
              </h2>
              <SearchInput value={search} onChange={setSearchValue} />
            </div>
            <SourceStatusBanner
              attentionCount={sourcesNeedingAttention}
              total={stats.sourcesTotal}
            />
            <EntityCoverageLegend />
          </>
        ) : null}

        {/* Active filter chip — explicit reminder of what's filtered + clear-button */}
        {filter !== 'all' ? (
          <ActiveFilterChip filter={filter} onClear={() => setFilter('all')} />
        ) : null}

        <div className={cn('flex items-start', !panelOpen && 'gap-4')}>
          {panelOpen ? (
            /* Unified workspace card — one white surface containing
              both the pending-rule queue (left) and the rule detail
              (right), separated by a vertical divider. Eliminates
              the two-cards-with-mismatched-borders look and reads
              as a single workspace surface. */
            <div
              className="sticky top-4 flex flex-1 min-w-0 self-start overflow-hidden rounded-md bg-background-default min-h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]"
              aria-label="Review workspace"
            >
              <div className="flex w-[320px] shrink-0 flex-col border-r border-divider-regular">
                <PendingRuleQueue
                  filteredRows={filteredRows}
                  pendingRulesByJurisdiction={pendingRulesByJurisdiction}
                  sourceById={sourceById}
                  selectedRuleId={selectedRuleId}
                  onSelectRule={selectRule}
                  search={search}
                  onSearchChange={setSearchValue}
                />
              </div>
              {selectedRule ? (
                <div className="flex flex-1 min-w-0 flex-col">
                  <RulePanel
                    rule={selectedRule}
                    onClose={() => void setSelectedRuleId(null)}
                    onActionComplete={advanceAfterDecision}
                    queuePosition={
                      pendingQueue.length > 0
                        ? {
                            index: pendingQueue.findIndex((r) => r.id === selectedRule.id),
                            total: pendingQueue.length,
                          }
                        : null
                    }
                    {...(pendingQueue.length > 1 ? { onSkip: goNext } : {})}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <SectionFrame>
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background-default">
                    {/* Single-row header — the group-eyebrow strip ("Rules"
                / "Entity coverage") was visually messy: small labels
                off-center over their colspans, empty placeholders
                over Jurisdiction + Source. The section heading
                "Entity coverage" above the table already names the
                grouping, and Active/Pending are self-explanatory in
                a rules table — no in-table grouping cue needed. */}
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[200px] text-xs font-medium text-text-secondary">
                        <Trans>Jurisdiction</Trans>
                      </TableHead>
                      <TableHead className="w-[80px] text-right text-xs font-medium text-text-secondary">
                        <Trans>Active</Trans>
                      </TableHead>
                      <TableHead className="w-[100px] text-right text-xs font-medium text-text-secondary">
                        <Trans>Pending</Trans>
                      </TableHead>
                      <TableHead className="w-[300px] text-xs font-medium text-text-secondary">
                        <Trans>Source</Trans>
                      </TableHead>
                      {visibleEntityColumns.map(({ col, label, fullName }) => (
                        <TableHead
                          key={col}
                          title={fullName}
                          className="w-[80px] cursor-help text-center text-xs font-medium text-text-secondary"
                        >
                          {label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={totalColumnCount}
                          className="py-8 text-center text-sm text-text-tertiary"
                        >
                          <Trans>No jurisdictions match this filter.</Trans>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((row) => (
                        <CoverageRow
                          key={row.jurisdiction}
                          row={row}
                          sources={sourcesByJurisdiction.get(row.jurisdiction) ?? []}
                          pendingRules={pendingRulesByJurisdiction.get(row.jurisdiction) ?? []}
                          sourceById={sourceById}
                          needsAttention={attentionJurisdictions.has(row.jurisdiction)}
                          isExpanded={
                            expanded.has(row.jurisdiction) || searchExpanded.has(row.jurisdiction)
                          }
                          onToggleExpanded={() => toggleExpanded(row.jurisdiction)}
                          selectedRuleId={selectedRuleId}
                          onSelectRule={selectRule}
                          visibleEntityColumns={visibleEntityColumns}
                          totalColumnCount={totalColumnCount}
                          {...(onJurisdictionDrillIn ? { onJurisdictionDrillIn } : {})}
                          {...(onActiveDrillIn ? { onActiveDrillIn } : {})}
                          {...(onSourceDrillIn ? { onSourceDrillIn } : {})}
                          {...(onEntityDrillIn ? { onEntityDrillIn } : {})}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </SectionFrame>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

type Stats = {
  active: number
  pending: number
  sourcesWorking: number
  sourcesTotal: number
  jurisdictions: number
}

function aggregateStats(
  rows: readonly RuleCoverageRow[],
  health: { degraded: number; failing: number; total: number },
): Stats {
  let active = 0
  let pending = 0
  let sourcesTotal = 0
  for (const row of rows) {
    active += row.activeRuleCount ?? row.verifiedRuleCount
    pending += row.pendingReviewCount ?? row.candidateCount
    sourcesTotal += row.sourceCount
  }
  const sourcesWorking = Math.max(0, sourcesTotal - health.degraded - health.failing)
  return { active, pending, sourcesWorking, sourcesTotal, jurisdictions: rows.length }
}

/**
 * Stats strip — passive summary, no chrome. Plain inline text:
 * bold number + muted label, separated by generous whitespace.
 * The pill-shaped gray boxes the previous iteration used felt heavy
 * for what is just four read-only counts; stripping them down to
 * text-only keeps the data prominent without competing with the
 * table below for visual weight.
 */
function StatsStrip({ stats, attentionCount }: { stats: Stats; attentionCount: number }) {
  const jurTooltip =
    stats.jurisdictions === 52
      ? 'All 50 US states + District of Columbia + Federal (IRS). Every jurisdiction the practice can file in.'
      : `${stats.jurisdictions} tracked jurisdictions in this practice.`
  const jurLabel = stats.jurisdictions === 52 ? 'All US jurisdictions' : 'Jurisdictions'
  return (
    <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
      <Stat
        value={String(stats.active)}
        label="Active rules"
        tooltip="Rules approved by your practice and generating client obligations."
      />
      <Stat
        value={String(stats.pending)}
        label="rules pending approval"
        tooltip="Rule templates awaiting practice review — only the owner or a manager can accept or reject."
      />
      <Stat
        value={`${stats.sourcesWorking}/${stats.sourcesTotal}`}
        label="sources working"
        tooltip={
          attentionCount > 0
            ? `${stats.sourcesWorking} watched documents healthy; ${attentionCount} need a human check (the watcher flagged a change it couldn't auto-verify).`
            : `All ${stats.sourcesTotal} watched documents are healthy.`
        }
      />
      <Stat value={String(stats.jurisdictions)} label={jurLabel} tooltip={jurTooltip} />
    </div>
  )
}

function Stat({ value, label, tooltip }: { value: string; label: string; tooltip: string }) {
  return (
    <span title={tooltip} className="inline-flex cursor-help items-baseline gap-1.5 text-sm">
      <span className="font-semibold tabular-nums text-text-primary">{value}</span>
      <span className="text-text-tertiary">{label}</span>
    </span>
  )
}

/**
 * Primary entry point for reviewing pending rules. Sits right under
 * the stats strip in matrix mode so a user landing on the page can
 * jump straight into triage without first hunting for a jurisdiction
 * with pending rules. Hidden when there's nothing pending.
 */
function StartReviewCTA({
  pendingCount,
  onStartReview,
}: {
  pendingCount: number
  onStartReview: () => void
}) {
  const { t } = useLingui()
  return (
    <button
      type="button"
      onClick={onStartReview}
      aria-label={t`Start reviewing ${pendingCount} pending rules`}
      className="group/cta inline-flex h-9 w-fit items-center gap-2 rounded-md bg-text-primary px-3 text-sm font-medium text-text-inverted outline-none hover:bg-text-primary/90 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
    >
      <Trans>Review {pendingCount} pending rules</Trans>
      <ChevronRightIcon
        aria-hidden
        className="size-4 transition-transform group-hover/cta:translate-x-0.5"
      />
    </button>
  )
}

function SearchInput({
  value,
  onChange,
  fullWidth = false,
}: {
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
}) {
  const { t } = useLingui()
  return (
    <div className={cn('relative inline-flex items-center', fullWidth ? 'w-full' : 'w-[260px]')}>
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute left-2.5 size-3.5 text-text-tertiary"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t`Search jurisdictions or rules…`}
        aria-label={t`Search jurisdictions or rules`}
        className="h-9 pl-8 text-sm"
      />
    </div>
  )
}

function ActiveFilterChip({
  filter,
  onClear,
}: {
  filter: Exclude<RowFilter, 'all'>
  onClear: () => void
}) {
  const labels: Record<Exclude<RowFilter, 'all'>, string> = {
    attention: 'Showing jurisdictions where sources need attention',
    pending: 'Showing jurisdictions with pending rules',
    active: 'Showing jurisdictions with active rules',
  }
  return (
    <div className="inline-flex h-8 w-fit items-center gap-2 rounded-md border border-state-accent-active-alt/40 bg-state-accent-tint/40 pr-1 pl-2.5 text-xs text-text-secondary">
      <span>{labels[filter]}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear filter"
        className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-xs font-medium text-text-accent outline-none hover:bg-background-default focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        Clear
        <XIcon aria-hidden className="size-3" />
      </button>
    </div>
  )
}

/**
 * Compact legend for the entity-coverage glyphs. Sits between the
 * source banner and the table so a first-time CPA can decode the
 * orange / green / em-dash glyphs without hover-discovering them.
 */
function EntityCoverageLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary">
      <span className="font-medium uppercase tracking-[0.08em] text-text-muted">
        <Trans>Legend</Trans>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <CheckIcon aria-hidden className="size-3.5 text-status-done" />
        <Trans>Active rule</Trans>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <AlertCircleIcon aria-hidden className="size-3.5 text-severity-medium" />
        <Trans>Needs review</Trans>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="text-text-muted">
          —
        </span>
        <Trans>No rule</Trans>
      </span>
    </div>
  )
}

/**
 * Source-status banner — always visible. Two states:
 *
 *   - Healthy (attentionCount === 0): thin success banner reading
 *     "All N sources working". Links to /rules/sources (no filter).
 *   - Broken: warning banner reading "N sources need attention" with
 *     warning tone + a CPA-hours estimate so the urgency isn't
 *     abstract. Links to /rules/sources?health=degraded so the user
 *     lands on the affected rows.
 *
 * Always visible so the user always knows the system status —
 * silence-equals-OK is bad UX (a missing banner could mean "loading",
 * "broken", or "actually fine"). Explicit positive state removes the
 * ambiguity.
 */
function SourceStatusBanner({ attentionCount, total }: { attentionCount: number; total: number }) {
  if (attentionCount > 0) {
    // ~3 min per source is the rough CPA-hours heuristic (open the
    // URL, scan for the changed section, decide to acknowledge/edit).
    // Rounded to nearest 5 min, minimum 5.
    const estimatedMinutes = Math.max(5, Math.round((attentionCount * 3) / 5) * 5)
    return (
      <Link
        to="/rules/sources?health=degraded"
        aria-label={`Open Sources filtered to degraded — review ${attentionCount} sources flagged for attention, approximately ${estimatedMinutes} minutes of source review`}
        className={cn(
          'group/cta inline-flex h-9 w-fit items-center gap-2',
          'rounded-md bg-severity-medium/10 px-3',
          'text-sm text-text-primary outline-none',
          'hover:bg-severity-medium/15 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        )}
      >
        <AlertTriangleIcon aria-hidden className="size-4 text-severity-medium" />
        <span className="font-semibold text-text-primary">
          <Trans>{attentionCount} sources need attention</Trans>
        </span>
        <span className="text-text-tertiary">·</span>
        <span className="text-text-secondary">
          <Trans>~{estimatedMinutes} min</Trans>
        </span>
        <ChevronRightIcon
          aria-hidden
          className="size-4 text-text-tertiary transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:text-text-accent"
        />
      </Link>
    )
  }
  return (
    <Link
      to="/rules/sources"
      aria-label={`Open Sources — all ${total} watched documents are working`}
      className={cn(
        'group/cta inline-flex h-9 w-fit items-center gap-2',
        'rounded-md bg-status-done/10 px-3',
        'text-sm text-text-secondary outline-none',
        'hover:bg-status-done/15 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
      )}
    >
      <CheckCircle2Icon aria-hidden className="size-4 text-status-done" />
      <span className="font-medium text-text-primary">
        <Trans>All {total} sources working</Trans>
      </span>
      <ChevronRightIcon
        aria-hidden
        className="size-4 text-text-tertiary transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:text-text-accent"
      />
    </Link>
  )
}

function CoverageRow({
  row,
  sources,
  pendingRules,
  sourceById,
  needsAttention,
  isExpanded,
  onToggleExpanded,
  selectedRuleId,
  onSelectRule,
  visibleEntityColumns,
  totalColumnCount,
  onJurisdictionDrillIn,
  onActiveDrillIn,
  onSourceDrillIn,
  onEntityDrillIn,
}: {
  row: RuleCoverageRow
  sources: readonly RuleSource[]
  pendingRules: readonly ObligationRule[]
  sourceById: ReadonlyMap<string, RuleSource>
  needsAttention: boolean
  isExpanded: boolean
  onToggleExpanded: () => void
  selectedRuleId: string | null
  onSelectRule: (ruleId: string) => void
  visibleEntityColumns: typeof ENTITY_DISPLAY
  totalColumnCount: number
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onActiveDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onSourceDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onEntityDrillIn?: (
    jurisdiction: RuleJurisdiction,
    entity: CoverageEntityColumn,
    state: CoverageCellState,
  ) => void
}) {
  const { t } = useLingui()
  const active = row.activeRuleCount ?? row.verifiedRuleCount
  const pending = row.pendingReviewCount ?? row.candidateCount
  const sourceCount = row.sourceCount
  const sourceDescriptor = needsAttention
    ? t`Source needs attention`
    : pending > 0
      ? t`Official sources — pending rules`
      : active > 0
        ? t`Practice review required`
        : t`Awaiting sources`

  // Row click toggles expansion. Cell-level buttons inside the row
  // still drill — they stopPropagation in their own onClick. The
  // target.closest('button') guard catches the case where a click
  // bubbles up from a button that didn't stop propagation.
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button, a')) return
    onToggleExpanded()
  }
  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    const target = event.target as HTMLElement
    if (target.closest('button, a')) return
    event.preventDefault()
    onToggleExpanded()
  }

  return (
    <Fragment>
      <TableRow
        className={cn(
          'h-12 cursor-pointer transition-colors',
          isExpanded ? 'border-b-0 hover:bg-transparent' : 'hover:bg-background-subtle/40',
        )}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={t`${jurisdictionLabel(row.jurisdiction)} — click to ${isExpanded ? 'collapse' : 'expand'} detail`}
      >
        {/* Jurisdiction — leading chevron indicates expandability */}
        <TableCell className="py-2">
          <div className="flex items-center gap-2">
            <ChevronDownIcon
              aria-hidden
              className={cn(
                'size-3 text-text-tertiary transition-transform',
                isExpanded ? 'rotate-0' : '-rotate-90',
              )}
            />
            <JurisdictionCode code={row.jurisdiction} />
            <span className="text-sm font-medium text-text-primary">
              {jurisdictionLabel(row.jurisdiction)}
            </span>
          </div>
        </TableCell>

        {/* Active count — own column under "Rules" group header.
        Hover reveals a chevron arrow as a "this goes somewhere" cue. */}
        <TableCell className="py-2 text-right text-sm tabular-nums">
          {onActiveDrillIn && active > 0 ? (
            <span className="group/active inline-flex items-center justify-end gap-0.5">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onActiveDrillIn(row.jurisdiction)
                }}
                aria-label={t`Open ${active} active rules for ${jurisdictionLabel(row.jurisdiction)}`}
                className="rounded-sm text-text-secondary outline-none hover:text-text-accent hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                {active}
              </button>
              <ChevronRightIcon
                aria-hidden
                className="size-3 text-text-accent opacity-0 transition-opacity group-hover/active:opacity-100"
              />
            </span>
          ) : (
            <span className="text-text-muted">{active}</span>
          )}
        </TableCell>

        {/* Pending count — own column under "Rules" group header. */}
        <TableCell className="py-2 text-right text-sm tabular-nums">
          {onJurisdictionDrillIn && pending > 0 ? (
            <span className="group/pending inline-flex items-center justify-end gap-0.5">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onJurisdictionDrillIn(row.jurisdiction)
                }}
                aria-label={t`Open ${pending} pending rules for ${jurisdictionLabel(row.jurisdiction)}`}
                className="rounded-sm font-medium text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                {pending}
              </button>
              <ChevronRightIcon
                aria-hidden
                className="size-3 text-text-accent opacity-0 transition-opacity group-hover/pending:opacity-100"
              />
            </span>
          ) : (
            <span className="text-text-muted">{pending}</span>
          )}
        </TableCell>

        {/* Source — count badge + descriptor text, both inside a single
        click target. Descriptor switches to "Source needs attention"
        when this row's source(s) are degraded — reinforces the
        callout above so the user can scan to the affected row. */}
        <TableCell className="py-2">
          {onSourceDrillIn ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onSourceDrillIn(row.jurisdiction)
              }}
              aria-label={t`Open sources for ${jurisdictionLabel(row.jurisdiction)}`}
              className="group/source inline-flex items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <SourceCountBadge count={sourceCount} attention={needsAttention} />
              <span
                className={cn(
                  'text-sm group-hover/source:underline',
                  needsAttention
                    ? 'font-medium text-severity-medium'
                    : 'text-text-secondary group-hover/source:text-text-accent',
                )}
              >
                {sourceDescriptor}
              </span>
              <ChevronRightIcon
                aria-hidden
                className="size-3.5 text-text-accent opacity-0 transition-opacity group-hover/source:opacity-100"
              />
            </button>
          ) : (
            <div className="inline-flex items-center gap-2">
              <SourceCountBadge count={sourceCount} attention={needsAttention} />
              <span className="text-sm text-text-secondary">{sourceDescriptor}</span>
            </div>
          )}
        </TableCell>

        {/* Entity coverage cells — three explicit states share a single
        visual grammar (text pill + tinted background). Unifying the
        review state into a REVIEW pill instead of a dot fixes the
        a11y gap and the asymmetry the critique flagged. */}
        {visibleEntityColumns.map(({ col, fullName }) => {
          const state = coverageCellState(row.jurisdiction, col)
          const drillable = state !== 'none' && Boolean(onEntityDrillIn)
          const cellInner = <EntityCellContent state={state} />
          return (
            <TableCell key={col} className="py-2 text-center">
              {drillable ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onEntityDrillIn?.(row.jurisdiction, col, state)
                  }}
                  aria-label={t`Open ${fullName} rules for ${jurisdictionLabel(row.jurisdiction)} — ${labelForState(state)}`}
                  className="inline-flex items-center justify-center rounded outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                >
                  {cellInner}
                </button>
              ) : (
                cellInner
              )}
            </TableCell>
          )
        })}
      </TableRow>
      {isExpanded ? (
        <ExpandedRowDetail
          rules={pendingRules}
          sources={sources}
          sourceById={sourceById}
          selectedRuleId={selectedRuleId}
          onSelectRule={onSelectRule}
          totalColumnCount={totalColumnCount}
        />
      ) : null}
    </Fragment>
  )
}

/**
 * Expanded detail — a clean white panel that drops in under the
 * main row when the user clicks to expand. Two-column inline read:
 * the actual pending rules on the left (each with a Source ↗ link to
 * the citing document), the watched sources on the right. No "Open
 * in Catalog" CTA — the main-row Pending count already drills there
 * for users who need the full catalog view, and once the inline
 * Accept/Reject is wired the expanded panel becomes the action
 * surface itself.
 *
 * Sits inside the same `<TableBody>` as a sibling `<TableRow>` with
 * `colSpan = 11` (Jurisdiction + Active + Pending + Source + 7 entity).
 */
function ExpandedRowDetail({
  rules,
  sources,
  sourceById,
  selectedRuleId,
  onSelectRule,
  totalColumnCount,
}: {
  rules: readonly ObligationRule[]
  sources: readonly RuleSource[]
  sourceById: ReadonlyMap<string, RuleSource>
  selectedRuleId: string | null
  onSelectRule: (ruleId: string) => void
  totalColumnCount: number
}) {
  return (
    <TableRow className="bg-background-default hover:bg-background-default">
      <TableCell colSpan={totalColumnCount} className="p-0">
        <div className="flex flex-col gap-5 px-6 py-4">
          <section className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-[0.12em] text-text-tertiary uppercase">
              <Trans>Pending rules</Trans>
            </p>
            {rules.length === 0 ? (
              <p className="text-sm text-text-tertiary">
                <Trans>No pending rules for this jurisdiction.</Trans>
              </p>
            ) : (
              <ul className="flex flex-col">
                {rules.map((rule) => (
                  <PendingRuleItem
                    key={rule.id}
                    rule={rule}
                    ruleSource={sourceById.get(rule.sourceIds[0] ?? '') ?? null}
                    isSelected={selectedRuleId === rule.id}
                    onSelect={() => onSelectRule(rule.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-[0.12em] text-text-tertiary uppercase">
              <Trans>Watched sources</Trans>
            </p>
            {sources.length === 0 ? (
              <p className="text-sm text-text-tertiary">
                <Trans>No sources for this jurisdiction yet.</Trans>
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {sources.slice(0, 6).map((source) => (
                  <li
                    key={source.id}
                    className="flex items-center gap-2 rounded px-1 py-1 hover:bg-background-subtle/40"
                  >
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      title={source.title}
                      className="inline-flex items-center gap-1 text-sm text-text-secondary outline-none hover:text-text-accent hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                    >
                      <span className="truncate">{source.title}</span>
                      <ExternalLinkIcon aria-hidden className="size-3 shrink-0 opacity-60" />
                    </a>
                  </li>
                ))}
                {sources.length > 6 ? (
                  <li className="px-1 pt-1 text-xs text-text-tertiary">
                    <Trans>+{sources.length - 6} more</Trans>
                  </li>
                ) : null}
              </ul>
            )}
          </section>
        </div>
      </TableCell>
    </TableRow>
  )
}

/**
 * One pending rule inside the expanded row. Acts as a selectable row
 * in a master-detail layout — clicking the title sets it as the
 * selected rule in the parent CoverageTab state, which docks the
 * `RulePanel` on the right with that rule's detail. The selected
 * rule gets a left-bar + subtle bg tint so the user can see which
 * row the right panel is showing.
 */
function PendingRuleItem({
  rule,
  ruleSource,
  isSelected,
  onSelect,
}: {
  rule: ObligationRule
  ruleSource: RuleSource | null
  isSelected: boolean
  onSelect: () => void
}) {
  const { t } = useLingui()
  // Strip the jurisdiction prefix from the displayed title — the
  // jurisdiction is already shown in the queue section header (or
  // the expanded coverage row) above this item, so repeating it
  // ("Alabama individual…" / "Alaska individual…" / "Arizona
  // individual…") is pure visual chatter. Falls back to the full
  // title when the prefix doesn't match (defensive). Hover tooltip
  // still carries the full title for full context.
  const displayTitle = useMemo(() => {
    const jurName = jurisdictionLabel(rule.jurisdiction)
    const prefix = `${jurName} `
    if (rule.title.toLowerCase().startsWith(prefix.toLowerCase())) {
      return rule.title.slice(prefix.length)
    }
    return rule.title
  }, [rule.title, rule.jurisdiction])
  return (
    <li className="flex flex-col">
      {/* No left border, no horizontal padding — the title text
        starts at the same x as the "PENDING RULES" eyebrow above.
        Taller row (py-2 = 8px each side) gives a comfortable click
        target. Selected state shows as a bg-tint that spans the
        natural row width. */}
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded py-2 transition-colors',
          isSelected ? 'bg-state-accent-tint/50' : 'hover:bg-background-subtle/50',
        )}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onSelect()
          }}
          aria-pressed={isSelected}
          title={rule.title}
          className={cn(
            'flex-1 truncate rounded text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
            // Selection: heavier weight + bg-tint instead of accent
            // colour — keeps blue reserved for the primary CTA.
            isSelected
              ? 'font-semibold text-text-primary'
              : 'text-text-primary hover:text-text-accent',
          )}
        >
          <span className="truncate">{displayTitle}</span>
        </button>
        {ruleSource ? (
          <a
            href={ruleSource.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            title={ruleSource.title}
            aria-label={t`Open cited source: ${ruleSource.title}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-sm px-1 py-0.5 text-xs text-text-tertiary outline-none hover:text-text-accent hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Source</Trans>
            <ExternalLinkIcon aria-hidden className="size-3 shrink-0" />
          </a>
        ) : null}
      </div>
    </li>
  )
}

/**
 * Pending-review queue rail — replaces the full coverage table while
 * the user is in review mode. The matrix's Active / Pending / Source
 * / entity-coverage columns are orientation chrome for the
 * "where am I covered?" task; once the user has opened a rule for
 * review, what they need is fast hop between pending rules. So the
 * left side collapses to a narrow rail listing every jurisdiction
 * that has pending rules, with each rule one click away.
 *
 * Each jurisdiction section header carries the JUR badge + name +
 * count. The PendingRuleItem rows below it stay the same, so
 * selection state + hover treatment carry over from the table view.
 *
 * Scrolls within itself (max-h-[calc(100vh-...)]) so the user can
 * scan the full queue without losing the docked panel on the right.
 */
function PendingRuleQueue({
  filteredRows,
  pendingRulesByJurisdiction,
  sourceById,
  selectedRuleId,
  onSelectRule,
  search,
  onSearchChange,
}: {
  filteredRows: readonly RuleCoverageRow[]
  pendingRulesByJurisdiction: ReadonlyMap<RuleJurisdiction, ObligationRule[]>
  sourceById: ReadonlyMap<string, RuleSource>
  selectedRuleId: string | null
  onSelectRule: (ruleId: string) => void
  search: string
  onSearchChange: (value: string) => void
}) {
  const jurisdictionsWithPending = filteredRows.filter(
    (row) => (row.pendingReviewCount ?? row.candidateCount) > 0,
  )
  const totalPending = jurisdictionsWithPending.reduce(
    (sum, row) => sum + (row.pendingReviewCount ?? row.candidateCount),
    0,
  )
  return (
    <>
      <header className="flex flex-col gap-2 border-b border-divider-regular px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-medium tracking-[0.12em] text-text-tertiary uppercase">
            <Trans>Pending review queue</Trans>
          </p>
          <span className="text-xs tabular-nums text-text-tertiary">
            <Trans>{totalPending} rules</Trans>
          </span>
        </div>
        <SearchInput value={search} onChange={onSearchChange} fullWidth />
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {jurisdictionsWithPending.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            <Trans>No pending rules to review.</Trans>
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {jurisdictionsWithPending.map((row) => {
              const rules = pendingRulesByJurisdiction.get(row.jurisdiction) ?? []
              return (
                <section key={row.jurisdiction} className="flex flex-col gap-1">
                  <header className="flex items-center gap-2 pb-1">
                    <JurisdictionCode code={row.jurisdiction} />
                    <span className="truncate text-xs font-medium text-text-secondary">
                      {jurisdictionLabel(row.jurisdiction)}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-text-tertiary">
                      {rules.length}
                    </span>
                  </header>
                  <ul className="flex flex-col">
                    {rules.map((rule) => (
                      <PendingRuleItem
                        key={rule.id}
                        rule={rule}
                        ruleSource={sourceById.get(rule.sourceIds[0] ?? '') ?? null}
                        isSelected={selectedRuleId === rule.id}
                        onSelect={() => onSelectRule(rule.id)}
                      />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Rule detail content — the right half of the unified workspace.
 * Renders flush against the queue with a vertical divider between
 * them (added by the parent workspace). No outer card chrome
 * (border / rounded / bg) — the workspace owns those — just the
 * header + scrollable body.
 */
function RulePanel({
  rule,
  onClose,
  onSkip,
  onActionComplete,
  queuePosition,
}: {
  rule: ObligationRule
  onClose: () => void
  onSkip?: () => void
  onActionComplete: () => void
  queuePosition: { index: number; total: number } | null
}) {
  const { t } = useLingui()
  return (
    <>
      <header className="flex flex-col gap-1.5 border-b border-divider-regular px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Eyebrow shows queue position so the reviewer always
            knows where they are in the burndown. "Reviewing 1 of 7"
            beats a static "Reviewing rule" — answers progress + mode
            in one phrase. */}
          <p className="text-[10px] font-medium tracking-[0.12em] text-text-tertiary uppercase">
            {queuePosition && queuePosition.index >= 0 ? (
              <Trans>
                Reviewing {queuePosition.index + 1} of {queuePosition.total}
              </Trans>
            ) : (
              <Trans>Reviewing rule</Trans>
            )}
          </p>
          <div className="flex items-center gap-1">
            {onSkip ? (
              <button
                type="button"
                onClick={onSkip}
                aria-label={t`Skip — review next pending rule (j)`}
                title={t`Skip · j`}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded px-2 text-xs font-medium text-text-secondary outline-none hover:bg-background-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                <Trans>Skip</Trans>
                <ChevronRightIcon aria-hidden className="size-3.5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label={t`Close rule detail`}
              title={t`Exit review · Esc`}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded text-text-tertiary outline-none hover:bg-background-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <XIcon aria-hidden className="size-4" />
            </button>
          </div>
        </div>
        <h3 className="line-clamp-2 text-base font-semibold text-text-primary">{rule.title}</h3>
      </header>
      {/* keyed by rule.id so React mounts a fresh subtree per rule;
        the `animate-in fade-in` (Tailwind animate) plays a quick
        fade as the user advances through the queue. */}
      <div
        key={rule.id}
        className="flex-1 overflow-y-auto px-4 py-3 animate-in fade-in duration-150 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <RuleDetailCompact rule={rule} onActionComplete={onActionComplete} />
      </div>
    </>
  )
}

/**
 * Source count badge — a soft green circle with the count, matching
 * the reference design. Goes to a warning tone when this jurisdiction
 * has at least one source degraded/failing.
 */
function SourceCountBadge({ count, attention }: { count: number; attention?: boolean }) {
  if (count === 0) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-background-subtle text-xs font-semibold tabular-nums text-text-tertiary">
        0
      </span>
    )
  }
  if (attention) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-severity-medium/15 text-xs font-semibold tabular-nums text-severity-medium">
        {count}
      </span>
    )
  }
  return (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-status-done/15 text-xs font-semibold tabular-nums text-status-done">
      {count}
    </span>
  )
}

/**
 * Per-entity coverage cell — a single glyph per state. After 7
 * columns × 52 rows the prior text-pill grammar (ACTIVE / REVIEW /
 * NO RULE repeated 364 times) reads as visual chatter. A check, an
 * alert circle, and an em dash carry the same meaning with a small
 * fraction of the ink, and the `title` attribute keeps the spoken
 * label one hover away for first-time users.
 *
 *   - 'verified' (active) → green check
 *   - 'review' → orange alert circle
 *   - 'none' (no rule) → muted em dash
 */
function EntityCellContent({ state }: { state: CoverageCellState }) {
  if (state === 'verified') {
    return (
      <span
        title="Active rule for this entity"
        className="inline-flex size-5 items-center justify-center"
      >
        <CheckIcon aria-hidden className="size-4 text-status-done" />
        <span className="sr-only">Active</span>
      </span>
    )
  }
  if (state === 'review') {
    return (
      <span
        title="Pending review for this entity"
        className="inline-flex size-5 items-center justify-center"
      >
        <AlertCircleIcon aria-hidden className="size-4 text-severity-medium" />
        <span className="sr-only">Review</span>
      </span>
    )
  }
  return (
    <span
      title="No rule for this entity"
      className="inline-flex size-5 items-center justify-center text-sm text-text-muted"
    >
      —<span className="sr-only">No rule</span>
    </span>
  )
}

function labelForState(state: CoverageCellState): string {
  if (state === 'verified') return 'active'
  if (state === 'review') return 'review'
  return 'no rule'
}
