import { useMemo } from 'react'
import { CircleCheckIcon, GitPullRequestArrowIcon, SlidersHorizontalIcon } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'

import type { ObligationRule, RuleStatus } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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
import { FLOATING_ACTION_BAR_SCROLL_PADDING } from '@/components/patterns/floating-action-bar'
import { StatBand, type StatBandItem } from '@/components/patterns/stat-band'
import { CollapsibleSearch } from '@/components/primitives/collapsible-search'
import { SeverityChip, type SeverityLevel } from '@/components/primitives/severity-chip'
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
import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'

// `motion.create(TableRow)` keeps the styled `<tr>`'s full recipe (zebra,
// hover, data-slot, accent rules) while gaining `exit`. Only the Review scope
// uses it (post-Accept slide-out); other scopes render the plain `TableRow`,
// so their layout is byte-for-byte unchanged.
const MotionTableRow = motion.create(TableRow)

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

// Severity (rule riskLevel) → shared <SeverityChip> level (Pencil oJL8o
// `SevPill`). 2026-06-18: routed onto the canonical severity ramp so rule HIGH
// reads the same orange as alert/dashboard HIGH (was Badge `warning` amber).
// MED/LOW stay quiet neutral so the eye lands on the high-severity rows; LOW
// additionally mutes its text. Rendered `shape="square"` for the registry
// eyebrow-tag treatment.
const SEVERITY_PILL: Record<
  ObligationRule['riskLevel'],
  { label: string; level: SeverityLevel; cls?: string }
> = {
  high: { label: 'HIGH', level: 'high' },
  med: { label: 'MED', level: 'neutral' },
  low: { label: 'LOW', level: 'neutral', cls: 'text-text-muted' },
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
 * Deprecated), a `CollapsibleSearch`, and four `FilterTrigger` +
 * `DropdownMenu` facet chips (Type · Modified · Effective · Severity).
 *
 * Built entirely from existing design-system primitives — the same
 * `Segmented`, `CollapsibleSearch`, and `FilterTrigger`/`DropdownMenu` chrome
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
  reviewCount,
  activeCount,
}: {
  jurisdictionLabel: string
  scope: RuleScope
  onScopeChange: (next: RuleScope) => void
  search: string
  onSearchChange: (next: string) => void
  typeOptions: ReadonlyArray<{ value: string; label: string; count: number }>
  filter: RuleTableFilter
  onFilterChange: (next: RuleTableFilter) => void
  /** Counts shown inside the Review / Active scope toggle. */
  reviewCount: number
  activeCount: number
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
  // Sort is a single radio across both fields (Modified / Effective) so the
  // consolidated Filters dropdown carries one "Sort by" group, not two.
  const sortValue = filter.sort ? `${filter.sort.field}:${filter.sort.dir}` : 'none'
  const setSortValue = (value: string) => {
    if (value === 'none') {
      onFilterChange({ ...filter, sort: null })
      return
    }
    // oxlint-disable-next-line no-unsafe-type-assertion -- value is one of the controlled options; the literal split shape is the safe interpretation
    const [field, dir] = value.split(':') as [RuleTableSort['field'], RuleTableSort['dir']]
    onFilterChange({ ...filter, sort: { field, dir } })
  }
  // Count of engaged facets — drives the Filters trigger's value badge.
  const activeFilterCount = filter.types.size + filter.severities.size + (filter.sort ? 1 : 0)

  // Clear-filters affordance — same model as /clients and /alerts: always
  // rendered, disabled when there's nothing to clear (no layout shift on a
  // wrapping row). Clears the facet filters + sort + the search box; the
  // status Segmented (Review / Active) is a view scope, not a filter, so
  // it's left untouched.
  const filtersActive =
    filter.types.size > 0 || filter.severities.size > 0 || filter.sort != null || search.length > 0

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Segmented<RuleScope>
        value={scope}
        onValueChange={onScopeChange}
        size="lg"
        ariaLabel={t`Filter by status`}
        options={[
          {
            value: 'review',
            // Whole tab (label + count) reads in the warning tone when it
            // carries work — matching the rail's needs-review dot + the
            // StatBand pending value, so Review is unambiguously the urgent
            // scope. The override beats the Segmented's selected-accent on the
            // label; selection still reads via the chip bg + border. Not bold
            // (red+bold is a banned double-highlight). Active stays neutral.
            label: (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5',
                  reviewCount > 0 && 'text-text-warning',
                )}
              >
                <Trans>Review</Trans>
                <span className={cn('tabular-nums', reviewCount === 0 && 'text-text-tertiary')}>
                  {reviewCount}
                </span>
              </span>
            ),
          },
          {
            value: 'active',
            label: (
              <span className="inline-flex items-center gap-1.5">
                <Trans>Active</Trans>
                <span className="tabular-nums text-text-tertiary">{activeCount}</span>
              </span>
            ),
          },
        ]}
      />
      {/* Canonical collapsing toolbar search — ghost magnifier, expands on
          hover/click, retains focus + query. Same control as the global rule
          search · /clients · /alerts. */}
      <CollapsibleSearch
        value={search}
        onChange={onSearchChange}
        placeholder={t`Filter ${jurisdictionLabel} rules`}
        ariaLabel={t`Filter ${jurisdictionLabel} rules`}
        size="icon"
        expandedWidthClassName="w-[200px] shrink-0 sm:w-[220px]"
      />

      {/* All facets collapsed into one Filters dropdown (Yuqi: cleaner bar,
          easier to read) — Type + Severity multi-select + a single Sort-by
          radio, grouped with labels. Replaces the four inline chips. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <FilterTrigger
              active={activeFilterCount > 0}
              leadingIcon={SlidersHorizontalIcon}
              count={activeFilterCount}
              aria-label={t`Filters`}
            >
              <Trans>Filters</Trans>
            </FilterTrigger>
          }
        />
        <DropdownMenuContent align="end" className="max-h-[440px] min-w-[240px] overflow-y-auto">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <Trans>Type</Trans>
            </DropdownMenuLabel>
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
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <Trans>Severity</Trans>
            </DropdownMenuLabel>
            {SEVERITY_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={filter.severities.has(option.value)}
                onCheckedChange={() => toggleSeverity(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={sortValue} onValueChange={setSortValue}>
            <DropdownMenuLabel>
              <Trans>Sort by</Trans>
            </DropdownMenuLabel>
            <DropdownMenuRadioItem value="none">
              <Trans>Default order</Trans>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="modified:desc">
              <Trans>Modified · newest first</Trans>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="modified:asc">
              <Trans>Modified · oldest first</Trans>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="effective:desc">
              <Trans>Effective · newest first</Trans>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="effective:asc">
              <Trans>Effective · oldest first</Trans>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
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
  acceptReadyRuleIds,
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
  /** Candidates that can be accepted right now (not draft-gated). Drives the
      Review scope's Readiness column so the acceptable rows are visible at a
      glance instead of hidden among draft-gated ones. */
  acceptReadyRuleIds?: ReadonlySet<string>
}) {
  const { t } = useLingui()
  // In the Review scope every row is a pending candidate, so the Status
  // column reads "Needs review" on every line (redundant with the tab
  // itself) and Last-modified is empty (candidates were never
  // re-reviewed). Drop both there and let Rule name + Type breathe.
  const reviewScope = scope === 'review'
  const showLastModified = !reviewScope
  const showStatus = !reviewScope
  // Review scope trades the Status column for a Readiness column: which of
  // these candidates can be accepted NOW ("Ready") vs which need an AI
  // concrete draft generated first. Mirrors the drawer's accept gate + the
  // bulk modal's per-row readiness flags, so the reviewer opens the right
  // rules first.
  const showReadiness = reviewScope && acceptReadyRuleIds !== undefined
  const bodyColSpan =
    5 + (showLastModified ? 1 : 0) + (showStatus ? 1 : 0) + (showReadiness ? 1 : 0)

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
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-divider-subtle',
        // Reserve room for the floating bulk bar while a selection exists, so
        // the last rows scroll clear of it instead of being hidden behind it.
        selectedCount > 0 && FLOATING_ACTION_BAR_SCROLL_PADDING,
      )}
    >
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
            {/* min-width independent of body content — with zero rows the
                flexible column collapsed to ~60px and the header overlapped
                "Type". */}
            <TableHead className="min-w-[220px]">
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
            {showReadiness ? (
              <TableHead className="w-[130px] px-2">
                <Trans>Readiness</Trans>
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
              {/* In the Review scope, a row leaves the table the moment its
                  candidate is accepted — give it a short slide-right + fade
                  exit so it reads as "filed away" rather than vanishing. Only
                  this scope wraps the rows in AnimatePresence (and renders them
                  as motion rows); every other scope keeps the plain row. */}
              <AnimatePresence initial={false}>
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
                    showReadiness={showReadiness}
                    acceptReady={acceptReadyRuleIds?.has(rule.id) ?? false}
                    animateExit={reviewScope}
                    onSelectChange={() => onToggleRuleSelection(rule.id)}
                    onClick={onRuleClick}
                  />
                ))}
              </AnimatePresence>
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
  showReadiness = false,
  acceptReady = false,
  animateExit = false,
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
  /** Review scope — render the Readiness cell (Ready vs Needs AI draft). */
  showReadiness?: boolean
  /** True when this candidate can be accepted now (accept isn't draft-gated). */
  acceptReady?: boolean
  /** Review scope only — render as a motion row so it can slide+fade out when
      the candidate is accepted and drops from the list. */
  animateExit?: boolean
  onSelectChange: (next: boolean) => void
  onClick: (rule: ObligationRule) => void
}) {
  const displayTitle = stripJurisdictionPrefix(rule.title, jurisLabel)
  const typeLabel = formatRuleTypeLabel(rule.taxType, rule.jurisdiction)
  const tone = STATUS_TONE[rule.status]
  // oJL8o columns: Effective = the publication date of the rule's authoritative
  // source (server-derived `effectiveOn`). When the source publishes no date we
  // fall back to our own verification date, rendered muted + "≈"-marked (tooltip
  // explains) so it never reads as the source's date;
  // Last modified = the most recent review timestamp (omitted when the
  // rule has never been re-reviewed).
  const hasSourceDate = Boolean(rule.effectiveOn)
  const effective = formatDatePretty(rule.effectiveOn ?? rule.verifiedAt, { alwaysShowYear: true })
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
  // Plain styled row everywhere; in the Review scope swap in the motion row so
  // AnimatePresence can play the accept→exit slide. `exit` is only spread for
  // the motion variant (a plain `<tr>` would warn on the unknown prop).
  const RowComp = animateExit ? MotionTableRow : TableRow
  const exitProps = animateExit
    ? {
        exit: {
          opacity: 0,
          x: 12,
          transition: { duration: MOTION_DURATION.exit, ease: EASE_APPLE },
        },
      }
    : {}
  return (
    <RowComp
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
      {...exitProps}
    >
      {/* Leading affordance — a real checkbox whenever the row can be
          bulk-reviewed, so the row reads as selectable on sight (Gmail-style).
          No "needs review" status dot here: that concept is already carried by
          the rail's red dot + count and the Review tab, and a blue dot in this
          column both duplicated it in a different colour and hid the checkbox
          until hover. Non-selectable rows show a quiet inert status dot. */}
      <TableCell className="pl-4 align-middle">
        <span className="inline-flex size-4 items-center justify-center">
          {selectable ? (
            <span
              className="inline-flex"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={onSelectChange}
                aria-label={`Select ${displayTitle} for batch review`}
              />
            </span>
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
            <span
              title={displayTitle}
              className="min-w-0 truncate text-base font-semibold text-text-primary group-hover/row:underline group-hover/row:underline-offset-2 group-focus-within/row:underline"
            >
              {displayTitle}
            </span>
          </div>
          {rule.defaultTip ? (
            <span title={rule.defaultTip} className="line-clamp-1 text-sm text-text-tertiary">
              {rule.defaultTip}
            </span>
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

      {/* Effective — source publication date when known; otherwise a muted,
          "≈"-marked fallback to our verification date. */}
      <TableCell className="px-2 py-3 align-middle">
        {hasSourceDate ? (
          <span className="font-mono text-sm text-text-secondary tabular-nums">{effective}</span>
        ) : (
          <span
            className="font-mono text-sm text-text-tertiary tabular-nums"
            title={`Source publication date unavailable — showing our last verification date (${effective}).`}
          >
            ≈ {effective}
          </span>
        )}
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
        <SeverityChip level={severity.level} shape="square" className={severity.cls}>
          {severity.label}
        </SeverityChip>
      </TableCell>

      {/* Status — label pill. Hidden in the Review scope (every row would
          read "Needs review" — redundant with the tab). The dot is dropped:
          the leading row dot already carries the status colour. */}
      {showStatus ? (
        <TableCell className="px-2 py-3 align-middle">
          <Badge variant={statusVariant}>{STATUS_LABEL_SHORT[rule.status]}</Badge>
        </TableCell>
      ) : null}

      {/* Readiness (Review scope only) — quiet "Ready" chip on candidates
          that can be accepted now; draft-gated ones say what unlocks them.
          Vocabulary matches the bulk modal's flags + the drawer's gate copy
          ("Generate the AI draft above to unlock Accept"). */}
      {showReadiness ? (
        <TableCell className="px-2 py-3 align-middle">
          {acceptReady ? (
            <Badge variant="success" className="gap-1">
              <CircleCheckIcon className="size-3" aria-hidden />
              <Trans>Ready</Trans>
            </Badge>
          ) : (
            <span className="text-sm text-text-tertiary">
              <Trans>Needs AI draft</Trans>
            </span>
          )}
        </TableCell>
      ) : null}
    </RowComp>
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
        'bg-state-destructive-hover/40 hover:bg-state-destructive-hover/70',
        focused && 'bg-state-destructive-hover/70',
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
 * `JurisdictionKpiStrip` — the 4-stat summary band above the selected
 * jurisdiction's rule table (Pencil `O0pyRO`/`G6P12y` KPI Strip).
 *
 * Four columns: Total (all rules) · Effective (in force, success-green) ·
 * Pending (awaiting review, warning) · Deprecated (superseded, muted).
 * Counts are derived in the route from the selected jurisdiction's status
 * breakdown.
 *
 * Renders the canonical shared `StatBand` — the same summary band the
 * overview + clients + sources + alert-history + audit surfaces use — so
 * there is ONE number-summary design across the product (sentence-case
 * label · big value · quiet sub). The per-status semantic colour the
 * jurisdiction detail wants rides on `StatBand`'s `valueClass`, so the big
 * numbers stay green/warning/muted without a second component.
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
  const stats: StatBandItem[] = [
    { key: 'total', label: t`Total`, value: total, sub: t`All ${jurisdictionLabel} rules` },
    {
      key: 'effective',
      label: t`Effective`,
      value: effective,
      sub: t`In force today`,
      // 2026-06-16 (audit): neutral value; tone in the sub (matches /clients).
      subClass: 'text-text-success',
    },
    {
      key: 'pending',
      label: t`Pending`,
      value: pending,
      sub: t`Awaiting review`,
      subClass: pending > 0 ? 'text-text-warning' : 'text-text-tertiary',
    },
    {
      key: 'deprecated',
      label: t`Deprecated`,
      value: deprecated,
      sub: t`Superseded`,
      valueClass: 'text-text-muted',
    },
  ]
  return <StatBand stats={stats} ariaLabel={t`${jurisdictionLabel} rule summary`} />
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
