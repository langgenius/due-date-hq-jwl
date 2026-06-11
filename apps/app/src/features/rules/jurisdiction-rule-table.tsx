import { Fragment, useMemo, type ReactNode } from 'react'
import { CircleCheckIcon, GitPullRequestArrowIcon } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'

import type { ObligationRule, RuleStatus } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { cn } from '@duedatehq/ui/lib/utils'

import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import { SearchInput } from '@/components/primitives/search-input'
import { JurisdictionChip } from '@/components/primitives/state-badge'
import {
  ENTITY_LABELS,
  STATUS_LABEL_SHORT,
  STATUS_TONE,
  stripJurisdictionPrefix,
  type EntityKey,
  type RuleTierLabels,
} from '@/features/rules/rules-console-model'
import { formatTaxCode } from '@/lib/tax-codes'
import { formatDatePretty } from '@/lib/utils'

/**
 * `JurisdictionRuleTable` — the right detail pane of the Rule Library.
 *
 * A flat rule table for ONE selected jurisdiction (no expand/collapse —
 * the states rail is the navigation axis now). Columns mirror the
 * Pencil row: Rule · Form · Entities · Due date · Status · ⋯, with a
 * leading select column for batch review. Style uses design-system
 * tokens + the canonical workbench table-card chrome (matches
 * /deadlines + /clients), not the Pencil's raw hex.
 *
 * Decoupled from the route's private `JurisdictionGroup` — it takes a
 * plain `ObligationRule[]` (already scope-filtered by the route) plus
 * the gap entities for the Missing tab, so it never imports back from
 * the route module.
 */

function isSelectable(status: RuleStatus): boolean {
  return status === 'pending_review' || status === 'candidate'
}

// Severity (rule riskLevel) → Badge variant (Pencil oJL8o `SevPill`).
// HIGH reads warning-amber; MED/LOW stay quiet (secondary) so the eye
// lands on the high-severity rows. LOW additionally mutes its text.
const SEVERITY_PILL: Record<
  ObligationRule['riskLevel'],
  { label: string; variant: 'warning' | 'secondary'; cls?: string }
> = {
  high: { label: 'HIGH', variant: 'warning' },
  med: { label: 'MED', variant: 'secondary' },
  low: { label: 'LOW', variant: 'secondary', cls: 'text-text-muted' },
}

// Status tone → Badge variant for the row status pill (Pencil oJL8o
// `StPill`). `review` maps to `info` (blue), matching the
// rules-console-model contract ("review is its own tone — accent blue,
// NOT warning") and the §4.10 ladder (in-flight review work = info;
// amber is reserved for external pauses). The old hand-rolled pill
// painted review amber, contradicting the blue leading row dot.
const STATUS_PILL_VARIANT: Record<
  (typeof STATUS_TONE)[RuleStatus],
  'success' | 'info' | 'destructive' | 'secondary'
> = {
  success: 'success',
  review: 'info',
  destructive: 'destructive',
  muted: 'secondary',
}

// Humanized type label for a rule's tax type, with the jurisdiction's
// "AK State …" prefix stripped (the column/filter is already scoped to one
// jurisdiction). Shared by the TYPE column + the Type filter options so
// the two never drift.
export function formatRuleTypeLabel(taxType: string, jurisdiction: string): string {
  return (formatTaxCode(taxType) || taxType).replace(
    new RegExp(`^${jurisdiction}\\s+State\\s+`, 'i'),
    '',
  )
}

// Status segmented scopes for the selected-jurisdiction filter bar (Pencil
// oJL8o `Z4x36`): All / Active / Pending / Deprecated. Maps onto the
// route's existing `scope` URL values (review = Pending, archived =
// Deprecated); the catalog-only "missing" scope is dropped here.
export type RuleScope = 'all' | 'active' | 'review' | 'archived'

export type RuleTableSort = { field: 'modified' | 'effective'; dir: 'desc' | 'asc' }
export type RuleTableFilter = {
  types: ReadonlySet<string>
  severities: ReadonlySet<ObligationRule['riskLevel']>
  sort: RuleTableSort | null
}

export const EMPTY_RULE_TABLE_FILTER: RuleTableFilter = {
  types: new Set(),
  severities: new Set(),
  sort: null,
}

const SEVERITY_OPTIONS: ReadonlyArray<{ value: ObligationRule['riskLevel']; label: string }> = [
  { value: 'high', label: 'High' },
  { value: 'med', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

/**
 * `JurisdictionFilterBar` — the selected-jurisdiction toolbar (Pencil
 * oJL8o `uxrVs`): a status `Segmented` (All / Active / Pending /
 * Deprecated), an inline `SearchInput`, and four `FilterTrigger` +
 * `DropdownMenu` facet chips (Type · Modified · Effective · Severity).
 *
 * Built entirely from existing design-system primitives — the same
 * `Segmented`, `SearchInput`, and `FilterTrigger`/`DropdownMenu` chrome
 * /deadlines + /alerts use — so the Pencil's bespoke pills are replaced,
 * not re-skinned. Type + Severity multi-select filter the rows; Modified +
 * Effective set a single active sort.
 */
export function JurisdictionFilterBar({
  jurisdictionLabel,
  scope,
  onScopeChange,
  search,
  onSearchChange,
  typeOptions,
  filter,
  onFilterChange,
}: {
  jurisdictionLabel: string
  scope: RuleScope
  onScopeChange: (next: RuleScope) => void
  search: string
  onSearchChange: (next: string) => void
  typeOptions: ReadonlyArray<{ value: string; label: string; count: number }>
  filter: RuleTableFilter
  onFilterChange: (next: RuleTableFilter) => void
}) {
  const { t } = useLingui()

  const toggleType = (value: string) => {
    const next = new Set(filter.types)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onFilterChange({ ...filter, types: next })
  }
  const toggleSeverity = (value: ObligationRule['riskLevel']) => {
    const next = new Set(filter.severities)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onFilterChange({ ...filter, severities: next })
  }
  const setSort = (field: RuleTableSort['field'], dir: RuleTableSort['dir'] | 'none') => {
    onFilterChange({ ...filter, sort: dir === 'none' ? null : { field, dir } })
  }
  const sortValueFor = (field: RuleTableSort['field']) =>
    filter.sort?.field === field ? filter.sort.dir : 'none'

  // Clear-filters affordance — same model as /clients and /alerts: always
  // rendered, disabled when there's nothing to clear (no layout shift on a
  // wrapping row). Clears the facet filters + sort + the search box; the
  // status Segmented (All / Active / …) is a view scope, not a filter, so
  // it's left untouched.
  const filtersActive =
    filter.types.size > 0 || filter.severities.size > 0 || filter.sort != null || search.length > 0

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Segmented<RuleScope>
        value={scope}
        onValueChange={onScopeChange}
        className="h-9 [&>button]:h-8"
        ariaLabel={t`Filter by status`}
        options={[
          { value: 'review', label: <Trans>Review</Trans> },
          { value: 'active', label: <Trans>Active</Trans> },
        ]}
      />
      {/* Search flexes to absorb the row's slack so every control keeps an
          even gap-3 and the bar stays on one line (no dead spacer). */}
      <div className="w-full min-w-[180px] sm:flex-1 sm:basis-0 sm:w-auto sm:max-w-[280px]">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={t`Search ${jurisdictionLabel} rules`}
        />
      </div>

      {/* Type — multi-select by tax type. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <FilterTrigger
              active={filter.types.size > 0}
              valueLabel={filter.types.size > 0 ? String(filter.types.size) : undefined}
            >
              <Trans>Type</Trans>
            </FilterTrigger>
          }
        />
        <DropdownMenuContent align="end" className="max-h-[320px] min-w-[220px] overflow-y-auto">
          {typeOptions.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-text-tertiary">
              <Trans>No rule types</Trans>
            </div>
          ) : (
            typeOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={filter.types.has(option.value)}
                onCheckedChange={() => toggleType(option.value)}
              >
                <span className="flex-1 truncate">{option.label}</span>
                <span className="ml-3 tabular-nums text-text-tertiary">{option.count}</span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modified — sort by last-modified date. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <FilterTrigger active={filter.sort?.field === 'modified'}>
              <Trans>Modified</Trans>
            </FilterTrigger>
          }
        />
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuRadioGroup
            value={sortValueFor('modified')}
            onValueChange={(value) => setSort('modified', value as RuleTableSort['dir'] | 'none')}
          >
            <DropdownMenuRadioItem value="desc">
              <Trans>Newest first</Trans>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="asc">
              <Trans>Oldest first</Trans>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="none">
              <Trans>Default order</Trans>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Effective — sort by effective date. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <FilterTrigger active={filter.sort?.field === 'effective'}>
              <Trans>Effective</Trans>
            </FilterTrigger>
          }
        />
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuRadioGroup
            value={sortValueFor('effective')}
            onValueChange={(value) => setSort('effective', value as RuleTableSort['dir'] | 'none')}
          >
            <DropdownMenuRadioItem value="desc">
              <Trans>Newest first</Trans>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="asc">
              <Trans>Oldest first</Trans>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="none">
              <Trans>Default order</Trans>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Severity — multi-select by risk level. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <FilterTrigger
              active={filter.severities.size > 0}
              valueLabel={filter.severities.size > 0 ? String(filter.severities.size) : undefined}
            >
              <Trans>Severity</Trans>
            </FilterTrigger>
          }
        />
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {SEVERITY_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filter.severities.has(option.value)}
              onCheckedChange={() => toggleSeverity(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        disabled={!filtersActive}
        onClick={() => {
          onFilterChange(EMPTY_RULE_TABLE_FILTER)
          onSearchChange('')
        }}
      >
        <Trans>Clear filters</Trans>
      </Button>
    </div>
  )
}

export function JurisdictionRuleTable({
  rules,
  jurisdictionLabel,
  gapEntities,
  showGaps,
  tierLabels,
  selectedRuleIds,
  onToggleRuleSelection,
  onToggleRulesSelection,
  focusedRowId,
  activeRuleId,
  onRuleClick,
  onAddRule,
  scope,
}: {
  rules: readonly ObligationRule[]
  jurisdictionLabel: string
  gapEntities: readonly EntityKey[]
  /** True when the active scope is "Missing" — render coverage-gap rows. */
  showGaps: boolean
  tierLabels: RuleTierLabels
  selectedRuleIds: ReadonlySet<string>
  onToggleRuleSelection: (id: string) => void
  onToggleRulesSelection: (ids: readonly string[]) => void
  focusedRowId: string | null
  /** The rule whose detail panel is currently open (`?rule=`) — its row reads active. */
  activeRuleId?: string | null
  onRuleClick: (rule: ObligationRule) => void
  onAddRule: (entity: EntityKey) => void
  /** Active view scope — drives which columns show. Accepts the catalog-only
      `missing` scope (gap rows) in addition to the four filter-bar scopes. */
  scope: RuleScope | 'missing'
}) {
  const { t } = useLingui()
  // In the Review scope every row is a pending candidate, so the Status
  // column reads "Needs review" on every line (redundant with the tab
  // itself) and Last-modified is empty (candidates were never
  // re-reviewed). Drop both there and let Rule name + Type breathe.
  const reviewScope = scope === 'review'
  const showLastModified = !reviewScope
  const showStatus = !reviewScope
  const bodyColSpan = 5 + (showLastModified ? 1 : 0) + (showStatus ? 1 : 0)

  // Selectable (needs-review) rule IDs in view — drives the header
  // select-all checkbox tri-state.
  const selectableIds = useMemo(
    () => rules.filter((r) => isSelectable(r.status)).map((r) => r.id),
    [rules],
  )
  const selectedCount = selectableIds.filter((id) => selectedRuleIds.has(id)).length
  const allSelected = selectableIds.length > 0 && selectedCount === selectableIds.length
  const someSelected = selectedCount > 0 && !allSelected

  const isEmpty = rules.length === 0 && !(showGaps && gapEntities.length > 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-divider-subtle">
      {/* table-fixed so long Form / Due-logic text clamps inside its
          column instead of blowing the table wider than the pane (which
          pushed Status + ⋯ off-screen). Only this instance is fixed; the
          All-overview grouped table keeps its auto layout. */}
      <Table className="w-full table-fixed">
        <TableHeader className="sticky top-0 z-10">
          {/* Tighter header than the canonical py-3 — this dense rule table
              reads better with a lower-profile head row (Yuqi 2026-06-10). */}
          <TableRow className="[&>th]:py-2">
            <TableHead className="w-11 pl-4">
              {selectableIds.length > 0 ? (
                <span
                  className="inline-flex items-center"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={() => onToggleRulesSelection(selectableIds)}
                    aria-label={t`Select all rules needing review`}
                  />
                </span>
              ) : null}
            </TableHead>
            <TableHead className="min-w-0">
              <Trans>Rule name</Trans>
            </TableHead>
            <TableHead className="w-[188px] px-2">
              <Trans>Type</Trans>
            </TableHead>
            <TableHead className="w-[120px] px-2">
              <Trans>Effective</Trans>
            </TableHead>
            {showLastModified ? (
              <TableHead className="w-[124px] px-2">
                <Trans>Last modified</Trans>
              </TableHead>
            ) : null}
            <TableHead className="w-[96px] px-2">
              <Trans>Severity</Trans>
            </TableHead>
            {showStatus ? (
              <TableHead className="w-[120px] px-2">
                <Trans>Status</Trans>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEmpty ? (
            <TableRow>
              <TableCell
                colSpan={bodyColSpan}
                className="py-10 text-center text-sm text-text-tertiary"
              >
                <Trans>No rules in {jurisdictionLabel} for this view.</Trans>
              </TableCell>
            </TableRow>
          ) : (
            <>
              {rules.map((rule) => (
                <JurisdictionRuleRow
                  key={rule.id}
                  rule={rule}
                  jurisdictionLabel={jurisdictionLabel}
                  tierLabels={tierLabels}
                  selectable={isSelectable(rule.status)}
                  selected={selectedRuleIds.has(rule.id)}
                  active={activeRuleId === rule.id}
                  focused={focusedRowId === `rule:${rule.id}`}
                  showLastModified={showLastModified}
                  showStatus={showStatus}
                  onSelectChange={() => onToggleRuleSelection(rule.id)}
                  onClick={onRuleClick}
                />
              ))}
              {showGaps
                ? gapEntities.map((entity) => (
                    <GapRow
                      key={`gap:${entity}`}
                      entity={entity}
                      jurisdictionLabel={jurisdictionLabel}
                      focused={focusedRowId === `gap:${entity}`}
                      onAddRule={onAddRule}
                    />
                  ))
                : null}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function JurisdictionRuleRow({
  rule,
  jurisdictionLabel: jurisLabel,
  tierLabels: _tierLabels,
  selectable,
  selected,
  active,
  focused,
  showLastModified,
  showStatus,
  onSelectChange,
  onClick,
}: {
  rule: ObligationRule
  jurisdictionLabel: string
  tierLabels: RuleTierLabels
  selectable: boolean
  selected: boolean
  active: boolean
  focused: boolean
  showLastModified: boolean
  showStatus: boolean
  onSelectChange: (next: boolean) => void
  onClick: (rule: ObligationRule) => void
}) {
  const displayTitle = stripJurisdictionPrefix(rule.title, jurisLabel)
  const typeLabel = formatRuleTypeLabel(rule.taxType, rule.jurisdiction)
  const tone = STATUS_TONE[rule.status]
  // oJL8o columns: Effective = the rule's verified/effective date;
  // Last modified = the most recent review timestamp (omitted when the
  // rule has never been re-reviewed).
  const effective = formatDatePretty(rule.verifiedAt, { alwaysShowYear: true })
  const lastModified = rule.reviewedAt
    ? formatDatePretty(rule.reviewedAt, { alwaysShowYear: true })
    : null
  const severity = SEVERITY_PILL[rule.riskLevel]
  const statusVariant = STATUS_PILL_VARIANT[tone]

  // Open / active (its `?rule=` detail panel is showing) and checked-for-bulk
  // rows both read accent — the active bar is the canvas State-B selection
  // (`accent-hover` + 2px left accent); the checkbox's own checked state
  // distinguishes "selected for bulk" from "open".
  const accentRow = selected || active
  return (
    <TableRow
      className={cn(
        'group/row cursor-pointer hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        accentRow && 'bg-state-accent-hover shadow-[inset_2px_0_0_var(--color-state-accent-solid)]',
        focused &&
          !accentRow &&
          'bg-state-base-hover shadow-[inset_2px_0_0_var(--color-state-accent-solid)]',
      )}
      onClick={() => onClick(rule)}
      aria-label={`Open rule details for ${displayTitle}`}
      data-state={selected ? 'selected' : undefined}
    >
      {/* Leading affordance — a quiet status dot AT REST, swapping to the
          bulk-select checkbox on row hover (or whenever the row is checked).
          This keeps "click the row to open & review" the obvious primary
          action and makes the checkbox a deliberate, secondary bulk gesture
          rather than competing for the same click. */}
      <TableCell className="pl-4 align-middle">
        <span className="relative inline-flex size-4 items-center justify-center">
          {selectable ? (
            <>
              <span
                aria-hidden
                className={cn(
                  'absolute size-1.5 rounded-full transition-opacity',
                  tone === 'review' ? 'bg-state-accent-solid' : 'bg-divider-regular',
                  selected
                    ? 'opacity-0'
                    : 'group-hover/row:opacity-0 group-focus-within/row:opacity-0',
                )}
              />
              <span
                className={cn(
                  'inline-flex transition-opacity',
                  selected
                    ? 'opacity-100'
                    : 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100',
                )}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={onSelectChange}
                  aria-label={`Select ${displayTitle} for batch review`}
                />
              </span>
            </>
          ) : (
            <span
              aria-hidden
              className={cn(
                'size-1.5 rounded-full',
                tone === 'destructive' ? 'bg-state-destructive-solid' : 'bg-divider-regular',
              )}
            />
          )}
        </span>
      </TableCell>

      {/* Rule name — jurisdiction code badge + title + one-line summary. */}
      <TableCell className="py-3 align-middle whitespace-normal">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <JurisdictionChip code={rule.jurisdiction} />
            <span className="min-w-0 truncate text-base font-semibold text-text-primary group-hover/row:underline group-hover/row:underline-offset-2 group-focus-within/row:underline">
              {displayTitle}
            </span>
          </div>
          {rule.defaultTip ? (
            <span className="line-clamp-1 text-sm text-text-tertiary">{rule.defaultTip}</span>
          ) : null}
        </div>
      </TableCell>

      {/* Type — humanized tax type as an outline reference tag (§4.10:
          metadata tag, not a status), truncated to its column. */}
      <TableCell className="overflow-hidden px-2 py-3 align-middle">
        <Badge variant="outline" className="max-w-full" title={typeLabel}>
          <span className="truncate">{typeLabel}</span>
        </Badge>
      </TableCell>

      {/* Effective — the rule's verified/effective date, mono. */}
      <TableCell className="px-2 py-3 align-middle">
        <span className="font-mono text-sm text-text-secondary tabular-nums">{effective}</span>
      </TableCell>

      {/* Last modified — most recent review date. Hidden in the Review
          scope, where every row is a never-re-reviewed candidate (—). */}
      {showLastModified ? (
        <TableCell className="px-2 py-3 align-middle">
          {lastModified ? (
            <span className="text-sm text-text-tertiary tabular-nums">{lastModified}</span>
          ) : (
            <EmptyCellMark label="Created — not yet reviewed" />
          )}
        </TableCell>
      ) : null}

      {/* Severity — risk-level eyebrow chip (Badge `square` shape: the
          uppercase-tag treatment, matching the alerts impact chips). */}
      <TableCell className="px-2 py-3 align-middle">
        <Badge variant={severity.variant} shape="square" className={severity.cls}>
          {severity.label}
        </Badge>
      </TableCell>

      {/* Status — label pill. Hidden in the Review scope (every row would
          read "Needs review" — redundant with the tab). The dot is dropped:
          the leading row dot already carries the status colour. */}
      {showStatus ? (
        <TableCell className="px-2 py-3 align-middle">
          <Badge variant={statusVariant}>{STATUS_LABEL_SHORT[rule.status]}</Badge>
        </TableCell>
      ) : null}
    </TableRow>
  )
}

function GapRow({
  entity,
  jurisdictionLabel: jurisLabel,
  focused,
  onAddRule,
}: {
  entity: EntityKey
  jurisdictionLabel: string
  focused: boolean
  onAddRule: (entity: EntityKey) => void
}) {
  return (
    <TableRow
      className={cn(
        // No left-stripe (banned per design system) — the destructive
        // ring-dot + tint fill carry the gap signal.
        'bg-state-destructive-subtle/40 hover:bg-state-destructive-subtle/70',
        focused && 'bg-state-destructive-subtle/70',
      )}
    >
      <TableCell className="pl-4" />
      <TableCell colSpan={5} className="py-2.5">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block size-2 shrink-0 rounded-full border border-state-destructive-solid"
          />
          <span className="text-sm font-medium text-text-primary">{ENTITY_LABELS[entity]}</span>
          <span className="text-xs text-text-tertiary">
            <Trans>No rule defined for this entity in {jurisLabel}</Trans>
          </span>
        </div>
      </TableCell>
      <TableCell className="py-2.5 text-right">
        <Button
          variant="outline"
          size="xs"
          onClick={(event) => {
            event.stopPropagation()
            onAddRule(entity)
          }}
        >
          <Trans>Add rule</Trans>
        </Button>
      </TableCell>
    </TableRow>
  )
}

/**
 * A single KPI column descriptor.
 *  - `valueClass` tones the large number (default text-primary).
 *  - `subClass` tones the sub caption (default text-secondary). The
 *    overview strip colors the *sub* (success/warning) while keeping the
 *    value neutral; the per-jurisdiction strip colors the *value*.
 */
export interface KpiStat {
  key: string
  label: string
  value: ReactNode
  sub: ReactNode
  valueClass?: string
  subClass?: string
}

/**
 * `KpiStrip` — a horizontal band of stat columns split by vertical
 * hairlines (Pencil `O0pyRO` KPI Strip). One white rounded card; each
 * column is eyebrow (10/700 caps) + value (24/600) + sub caption.
 *
 * Shared by the all-jurisdictions overview (`Total rules · Jurisdictions
 * · Changed 30 days · Pending review`) and the per-jurisdiction detail
 * pane (`JurisdictionKpiStrip` below). On narrow viewports the columns
 * wrap to a 2-up grid so the values never crush together or force the
 * card to scroll horizontally.
 */
export function KpiStrip({
  stats,
  size = 'default',
}: {
  stats: KpiStat[]
  /** `lg` renders larger values + roomier padding for the overview dashboard. */
  size?: 'default' | 'lg'
}) {
  const lg = size === 'lg'
  return (
    <div
      className={cn(
        'grid shrink-0 grid-cols-2 gap-y-4 rounded-xl border border-divider-subtle bg-background-default px-2 sm:flex sm:items-center sm:gap-y-0',
        lg ? 'py-6' : 'py-[18px]',
      )}
    >
      {stats.map((stat, index) => (
        <Fragment key={stat.key}>
          {index > 0 ? (
            <span
              className={cn(
                'hidden w-px shrink-0 bg-divider-subtle sm:block',
                lg ? 'h-12' : 'h-11',
              )}
              aria-hidden
            />
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1 px-4">
            <span className="text-caption-xs font-semibold tracking-eyebrow text-text-tertiary uppercase">
              {stat.label}
            </span>
            <span
              className={cn(
                'font-semibold tabular-nums',
                lg ? 'text-section-title leading-none' : 'text-2xl',
                stat.valueClass ?? 'text-text-primary',
              )}
            >
              {stat.value}
            </span>
            <span
              className={cn('truncate text-xs font-medium', stat.subClass ?? 'text-text-secondary')}
            >
              {stat.sub}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

/**
 * `JurisdictionKpiStrip` — the 4-stat KPI band above the selected
 * jurisdiction's rule table (Pencil `O0pyRO`/`G6P12y` KPI Strip).
 *
 * Four columns: TOTAL (all rules) · EFFECTIVE (in force, success-green) ·
 * PENDING (awaiting review, warning-brown) · DEPRECATED (superseded,
 * muted). Counts are derived in the route from the selected
 * jurisdiction's status breakdown. Built on the shared `KpiStrip`.
 */
export function JurisdictionKpiStrip({
  total,
  effective,
  pending,
  deprecated,
  jurisdictionLabel,
}: {
  total: number
  effective: number
  pending: number
  deprecated: number
  jurisdictionLabel: string
}) {
  const { t } = useLingui()
  const stats: KpiStat[] = [
    {
      key: 'total',
      label: t`Total`,
      value: total,
      sub: t`All ${jurisdictionLabel} rules`,
      valueClass: 'text-text-primary',
    },
    {
      key: 'effective',
      label: t`Effective`,
      value: effective,
      sub: t`In force today`,
      valueClass: 'text-text-success',
    },
    {
      key: 'pending',
      label: t`Pending`,
      value: pending,
      sub: t`Awaiting review`,
      valueClass: 'text-text-warning',
    },
    {
      key: 'deprecated',
      label: t`Deprecated`,
      value: deprecated,
      sub: t`Superseded`,
      valueClass: 'text-text-muted',
    },
  ]
  return <KpiStrip stats={stats} />
}

/**
 * `JurisdictionStatusChips` — the title-row meta chips for the selected
 * jurisdiction's header (Pencil's "12 Requires review" / "14 Active" /
 * "Sources all working"). Rendered inside the PageHeader title slot.
 */
export function JurisdictionStatusChips({
  reviewCount,
  activeCount,
  sourcesHealthy,
}: {
  reviewCount: number
  activeCount: number
  /** Whether all monitored sources for this jurisdiction are healthy. */
  sourcesHealthy: boolean
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
      {reviewCount > 0 ? (
        <Badge variant="warning">
          <GitPullRequestArrowIcon data-icon="inline-start" />
          <Trans>{reviewCount} Requires review</Trans>
        </Badge>
      ) : null}
      {activeCount > 0 ? (
        <Badge variant="success">
          <CircleCheckIcon data-icon="inline-start" />
          <Trans>{activeCount} Active</Trans>
        </Badge>
      ) : null}
      <Badge variant="secondary">
        <span
          className={cn(
            'size-1.5 rounded-full',
            sourcesHealthy ? 'bg-state-success-solid' : 'bg-state-warning-solid',
          )}
          aria-hidden
        />
        {sourcesHealthy ? (
          <Trans>Sources all working</Trans>
        ) : (
          <Trans>Sources need attention</Trans>
        )}
      </Badge>
    </span>
  )
}
