import { Fragment, useMemo, type ReactNode } from 'react'
import {
  ArrowUpRightIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  ExternalLinkIcon,
  GitPullRequestArrowIcon,
  LinkIcon,
} from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'

import type { ObligationRule, RuleStatus } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'
import { RowActionsMenu } from '@/components/patterns/row-actions-menu'
import {
  ENTITY_KEYS,
  ENTITY_LABELS,
  STATUS_LABEL_SHORT,
  STATUS_TONE,
  humanizeDueDateLogic,
  stripJurisdictionPrefix,
  type EntityKey,
  type RuleTierLabels,
} from '@/features/rules/rules-console-model'
import { formatTaxCode } from '@/lib/tax-codes'

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

// Status tone → Badge variant. `review` maps to the blue `info` badge
// (review tone is accent-blue across the rule library); muted → the
// neutral gray `secondary`.
const STATUS_BADGE_VARIANT: Record<
  (typeof STATUS_TONE)[RuleStatus],
  'success' | 'info' | 'destructive' | 'secondary'
> = {
  success: 'success',
  review: 'info',
  destructive: 'destructive',
  muted: 'secondary',
}

function isSelectable(status: RuleStatus): boolean {
  return status === 'pending_review' || status === 'candidate'
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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-md border border-divider-subtle">
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
              <Trans>Rule</Trans>
            </TableHead>
            <TableHead className="w-[100px] px-2">
              <Trans>Form</Trans>
            </TableHead>
            <TableHead className="w-[112px] px-2">
              <Trans>Entities</Trans>
            </TableHead>
            <TableHead className="w-[140px] px-2">
              <Trans>Due date</Trans>
            </TableHead>
            <TableHead className="w-[108px] px-2">
              <Trans>Status</Trans>
            </TableHead>
            <TableHead className="w-12" aria-label={t`Actions`} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEmpty ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-sm text-text-tertiary">
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
  tierLabels,
  selectable,
  selected,
  focused,
  onSelectChange,
  onClick,
}: {
  rule: ObligationRule
  jurisdictionLabel: string
  tierLabels: RuleTierLabels
  selectable: boolean
  selected: boolean
  focused: boolean
  onSelectChange: (next: boolean) => void
  onClick: (rule: ObligationRule) => void
}) {
  const applicabilitySet = useMemo(
    () => new Set(rule.entityApplicability),
    [rule.entityApplicability],
  )
  const displayTitle = stripJurisdictionPrefix(rule.title, jurisLabel)
  const taxLabel = formatTaxCode(rule.taxType)
  const tone = STATUS_TONE[rule.status]
  // Honest "due" representation: a rule carries due-date LOGIC, not a
  // single date. Show the humanized logic rather than fabricating a
  // concrete date. (2026-06-07, coworker feedback: the "updated NN ago"
  // subline was dropped — that timestamp reflects when WE imported the
  // rule, not a change to the rule itself, so it read as misleading.)
  // TODO(rules): if a concrete-draft computed date is wired through,
  // prefer it as the primary value here.
  const dueLogic = humanizeDueDateLogic(rule.dueDateLogic)

  return (
    <TableRow
      className={cn(
        'group/row cursor-pointer hover:bg-state-base-hover',
        focused && 'bg-state-base-hover shadow-[inset_2px_0_0_var(--color-state-accent-solid)]',
      )}
      onClick={() => onClick(rule)}
      aria-label={`Open rule details for ${displayTitle}`}
      data-state={selected ? 'selected' : undefined}
    >
      <TableCell className="pl-4 align-top">
        {selectable ? (
          <span
            className="inline-flex items-center"
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
              'mt-1 inline-block size-1.5 rounded-full',
              tone === 'success' && 'bg-divider-regular',
              tone === 'review' && 'bg-state-accent-solid',
              tone === 'destructive' && 'bg-state-destructive-solid',
              tone === 'muted' && 'bg-divider-regular',
            )}
          />
        )}
      </TableCell>

      {/* Rule — title + meta. */}
      <TableCell className="py-2.5 align-top whitespace-normal">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-text-primary group-hover/row:underline group-hover/row:underline-offset-2 group-focus-within/row:underline">
            {displayTitle}
          </span>
          <span className="text-xs text-text-tertiary">
            {taxLabel ? `${taxLabel} · ` : ''}
            {tierLabels[rule.ruleTier]} · v{rule.version}
          </span>
        </div>
      </TableCell>

      {/* Form — clamps to its column so a long form name doesn't widen
          the table. */}
      <TableCell className="px-2 py-2.5 align-top">
        {rule.formName?.trim() && rule.formName.trim() !== '—' ? (
          <span className="line-clamp-2 text-xs text-text-secondary" title={rule.formName}>
            {rule.formName}
          </span>
        ) : (
          <EmptyCellMark label="No form code" />
        )}
      </TableCell>

      {/* Entities — compact applicability dots (filled = applies) + N/7.
          2026-06-07 (coworker feedback): one tooltip over the WHOLE
          cluster (not a native title per 6px dot, which was almost
          impossible to hover) — shows the full entity legend so it's
          clear which dot is which and whether it applies. */}
      <TableCell className="px-2 py-2.5 align-top">
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex w-fit cursor-default items-center gap-2">
                <div className="flex items-center gap-1">
                  {ENTITY_KEYS.map((entity) => (
                    <span
                      key={entity}
                      aria-hidden
                      className={cn(
                        'size-1.5 rounded-full',
                        applicabilitySet.has(entity)
                          ? 'bg-text-secondary'
                          : 'border border-divider-regular',
                      )}
                    />
                  ))}
                </div>
                <span className="shrink-0 text-xs text-text-tertiary tabular-nums">
                  {applicabilitySet.size}/{ENTITY_KEYS.length}
                </span>
              </div>
            }
          />
          <TooltipContent className="max-w-none">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-wide uppercase opacity-70">
                <Trans>Entity types</Trans>
              </span>
              <div className="flex flex-col gap-0.5">
                {ENTITY_KEYS.map((entity) => {
                  const applies = applicabilitySet.has(entity)
                  return (
                    <span
                      key={entity}
                      className={cn('flex items-center gap-1.5 text-xs', !applies && 'opacity-50')}
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          applies ? 'bg-current' : 'border border-current',
                        )}
                      />
                      {ENTITY_LABELS[entity]}
                    </span>
                  )
                })}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TableCell>

      {/* Due date — humanized rule logic, clamped to 3 lines so a long
          description stays inside its (now narrower) column instead of
          starving the Rule column under table-fixed. Full text on hover. */}
      <TableCell className="px-2 py-2.5 align-top">
        <span className="line-clamp-3 text-xs text-text-secondary" title={dueLogic}>
          {dueLogic}
        </span>
      </TableCell>

      {/* Status. */}
      <TableCell className="px-2 py-2.5 align-top">
        <Badge variant={STATUS_BADGE_VARIANT[tone]}>{STATUS_LABEL_SHORT[rule.status]}</Badge>
      </TableCell>

      {/* Actions. */}
      <TableCell className="py-2.5 align-top">
        <div className="flex items-center justify-end gap-1">
          <ChevronRightIcon
            aria-hidden
            className="size-3.5 shrink-0 text-text-tertiary opacity-30 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100"
          />
          <RowActionsMenu
            label={`Actions for ${displayTitle}`}
            items={[
              { label: 'Open rule', icon: ArrowUpRightIcon, onSelect: () => onClick(rule) },
              {
                label: 'Copy rule ID',
                icon: LinkIcon,
                onSelect: () => {
                  if (typeof window === 'undefined') return
                  try {
                    void window.navigator.clipboard?.writeText(rule.id)
                  } catch {
                    // Clipboard can throw in sandboxed iframes — non-critical.
                  }
                },
              },
              {
                label: 'Copy link',
                icon: ExternalLinkIcon,
                onSelect: () => {
                  if (typeof window === 'undefined') return
                  try {
                    const url = `${window.location.origin}/rules/library?rule=${rule.id}`
                    void window.navigator.clipboard?.writeText(url)
                  } catch {
                    // Clipboard can throw in sandboxed iframes — non-critical.
                  }
                },
              },
            ]}
          />
        </div>
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
        'border-l-2 border-l-state-destructive-solid bg-state-destructive-subtle/40 hover:bg-state-destructive-subtle/70',
        focused && 'border-l-state-accent-solid bg-state-destructive-subtle/70',
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
          size="sm"
          className="h-7 text-xs text-text-accent"
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
            <span className="text-caption-xs font-bold tracking-eyebrow text-text-muted uppercase">
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-background-subtle px-2 py-0.5 text-xs font-medium text-text-tertiary">
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
      </span>
    </span>
  )
}
