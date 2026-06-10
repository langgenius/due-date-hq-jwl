import { Fragment, useMemo, type ReactNode } from 'react'
import { ChevronRightIcon, CircleCheckIcon, GitPullRequestArrowIcon } from 'lucide-react'
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
 * `JurisdictionRuleTable` — the right detail pane of the Rule Library
 * (2026-06-04, Yuqi rule-library master–detail pivot, Pencil `HR6mK`).
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

// Severity (rule riskLevel) → pill label + tone (Pencil oJL8o `SevPill`).
// HIGH reads warning-brown; MED/LOW stay quiet on the subtle surface so
// the eye lands on the high-severity rows.
const SEVERITY_PILL: Record<ObligationRule['riskLevel'], { label: string; cls: string }> = {
  high: { label: 'HIGH', cls: 'bg-state-warning-hover text-text-warning' },
  med: { label: 'MED', cls: 'bg-background-subtle text-text-secondary' },
  low: { label: 'LOW', cls: 'bg-background-subtle text-text-muted' },
}

// Status tone → dot/text/bg for the row status pill (Pencil oJL8o
// `StPill`). Mapped onto existing state tokens — Active reads success,
// Pending reads warning, rejected destructive, archived/deprecated muted.
const STATUS_PILL: Record<
  (typeof STATUS_TONE)[RuleStatus],
  { dot: string; text: string; bg: string }
> = {
  success: {
    dot: 'bg-state-success-solid',
    text: 'text-text-success',
    bg: 'bg-state-success-hover',
  },
  review: {
    dot: 'bg-state-warning-solid',
    text: 'text-text-warning',
    bg: 'bg-state-warning-hover',
  },
  destructive: {
    dot: 'bg-state-destructive-solid',
    text: 'text-text-destructive',
    bg: 'bg-state-destructive-hover',
  },
  muted: { dot: 'bg-text-muted', text: 'text-text-muted', bg: 'bg-background-subtle' },
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

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3">
      <Segmented<RuleScope>
        value={scope}
        onValueChange={onScopeChange}
        ariaLabel={t`Filter by status`}
        options={[
          { value: 'all', label: <Trans>All</Trans> },
          { value: 'active', label: <Trans>Active</Trans> },
          { value: 'review', label: <Trans>Pending</Trans> },
          { value: 'archived', label: <Trans>Deprecated</Trans> },
        ]}
      />
      <div className="w-full sm:w-[260px]">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={t`Search ${jurisdictionLabel} rules`}
        />
      </div>

      <span className="hidden flex-1 sm:block" />

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
}) {
  const { t } = useLingui()

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
          <TableRow>
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
            <TableHead className="w-[120px] px-2">
              <Trans>Type</Trans>
            </TableHead>
            <TableHead className="w-[120px] px-2">
              <Trans>Effective</Trans>
            </TableHead>
            <TableHead className="w-[124px] px-2">
              <Trans>Last modified</Trans>
            </TableHead>
            <TableHead className="w-[96px] px-2">
              <Trans>Severity</Trans>
            </TableHead>
            <TableHead className="w-[120px] px-2">
              <Trans>Status</Trans>
            </TableHead>
            {/* Trailing chevron column — the "open this rule" affordance. */}
            <TableHead className="w-10" aria-label={t`Open`} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEmpty ? (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-sm text-text-tertiary">
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
  const statusPill = STATUS_PILL[tone]

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
      <TableCell className="pl-4 align-top">
        <span className="relative mt-0.5 inline-flex size-4 items-center justify-center">
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
      <TableCell className="py-3 align-top whitespace-normal">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex shrink-0 items-center justify-center rounded bg-background-subtle px-1.5 py-0.5 font-mono text-[10px] font-semibold text-text-tertiary">
              {rule.jurisdiction}
            </span>
            <span className="min-w-0 truncate text-[13px] font-semibold text-text-primary group-hover/row:underline group-hover/row:underline-offset-2 group-focus-within/row:underline">
              {displayTitle}
            </span>
          </div>
          {rule.defaultTip ? (
            <span className="line-clamp-1 text-sm text-text-tertiary">{rule.defaultTip}</span>
          ) : null}
        </div>
      </TableCell>

      {/* Type — humanized tax type pill, truncated to its column. */}
      <TableCell className="overflow-hidden px-2 py-3 align-top">
        <span
          className="block max-w-full truncate rounded-full border border-divider-subtle bg-background-subtle px-2.5 py-0.5 text-center text-[11px] font-medium text-text-secondary"
          title={typeLabel}
        >
          {typeLabel}
        </span>
      </TableCell>

      {/* Effective — the rule's verified/effective date, mono. */}
      <TableCell className="px-2 py-3 align-top">
        <span className="font-mono text-sm text-text-secondary tabular-nums">{effective}</span>
      </TableCell>

      {/* Last modified — most recent review date. */}
      <TableCell className="px-2 py-3 align-top">
        {lastModified ? (
          <span className="text-sm text-text-tertiary tabular-nums">{lastModified}</span>
        ) : (
          <EmptyCellMark label="Never re-reviewed" />
        )}
      </TableCell>

      {/* Severity — risk-level pill. */}
      <TableCell className="px-2 py-3 align-top">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide',
            severity.cls,
          )}
        >
          {severity.label}
        </span>
      </TableCell>

      {/* Status — label pill. (The dot is dropped: the leading row dot
          already carries the status colour, so a second dot here is
          redundant — keep just the labelled pill.) */}
      <TableCell className="px-2 py-3 align-top">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
            statusPill.bg,
            statusPill.text,
          )}
        >
          {STATUS_LABEL_SHORT[rule.status]}
        </span>
      </TableCell>

      {/* Open affordance — a chevron that signals the row opens the rule
          detail; brightens + nudges +2px on hover. */}
      <TableCell className="pr-4 align-top">
        <ChevronRightIcon
          aria-hidden
          className={cn(
            'mt-1 size-4 shrink-0 transition-all duration-150 group-hover/row:translate-x-0.5',
            active ? 'text-text-accent' : 'text-text-muted group-hover/row:text-text-tertiary',
          )}
        />
      </TableCell>
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
      <TableCell colSpan={6} className="py-2.5">
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
                lg ? 'text-[32px] leading-none' : 'text-2xl',
                stat.valueClass ?? 'text-text-primary',
              )}
            >
              {stat.value}
            </span>
            <span
              className={cn(
                'truncate text-[11px] font-medium',
                stat.subClass ?? 'text-text-secondary',
              )}
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
