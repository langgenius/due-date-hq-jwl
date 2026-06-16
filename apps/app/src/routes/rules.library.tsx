import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLingui, Trans, Plural } from '@lingui/react/macro'
import {
  ArrowUpFromLineIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarClock,
  Check,
  Clock3,
  Sparkles,
  ChevronRightIcon,
  Circle,
  CircleCheck,
  ShieldCheck,
  ExternalLinkIcon,
  EyeIcon,
  LayersIcon,
  LibraryIcon,
  LinkIcon,
  Loader2,
  LockIcon,
  PlusIcon,
  TriangleAlertIcon,
  RssIcon,
  XIcon,
} from 'lucide-react'
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs'

import type {
  ObligationRule,
  RuleBulkImpactPreview,
  RuleConcreteDraftCacheEntry,
  RuleCoverageRow,
  RuleCustomRuleInput,
  RuleJurisdiction,
  RuleReviewTask,
  RuleStatus,
} from '@duedatehq/contracts'

// `RuleTier` isn't re-exported from the contracts package today —
// infer it from the same union literal the schema uses.
type RuleTier = ObligationRule['ruleTier']
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@duedatehq/ui/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Label } from '@duedatehq/ui/components/ui/label'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
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

import { EmptyState } from '@/components/patterns/empty-state'
import { FloatingActionBar } from '@/components/patterns/floating-action-bar'
import { KbdHint } from '@/components/patterns/kbd'
import {
  isInteractiveEventTarget,
  useAppHotkey,
  useKeyboardShortcutsBlocked,
} from '@/components/patterns/keyboard-shell'
import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'
import { PageHeader } from '@/components/patterns/page-header'
import { RowActionsMenu } from '@/components/patterns/row-actions-menu'
import { StatBand } from '@/components/patterns/stat-band'
import { CountDotChip } from '@/components/primitives/count-dot-chip'
import { CollapsibleSearch } from '@/components/primitives/collapsible-search'
import { StateBadge } from '@/components/primitives/state-badge'
import { ToggleChip } from '@/components/primitives/toggle-chip'
import { RuleDetailCompact } from '@/features/rules/rule-detail-drawer'
import {
  ENTITY_KEYS,
  ENTITY_LABELS,
  STATUS_LABEL_SHORT,
  STATUS_TONE,
  jurisdictionLabel,
  stripJurisdictionPrefix,
  type EntityKey,
} from '@/features/rules/rules-console-model'
import { PulsingDot } from '@/features/alerts/components/PulsingDot'
import { JurisdictionRail, type RailJurisdiction } from '@/features/rules/states-rail'
import {
  EMPTY_RULE_TABLE_FILTER,
  JurisdictionFilterBar,
  JurisdictionKpiStrip,
  JurisdictionRuleTable,
  formatRuleTypeLabel,
  type RuleScope,
  type RuleTableFilter,
} from '@/features/rules/jurisdiction-rule-table'
import { formatTaxCode } from '@/lib/tax-codes'
import { formatDatePretty, formatRelativeTime } from '@/lib/utils'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

/**
 * Rule library v3 — one surface, no toggle.
 *
 * Structure:
 *   - Rules grouped by jurisdiction (Federal first, fully active states next,
 *     then review/missing work, alphabetical inside each bucket)
 *   - Each group header shows: chevron, name, rule count, 7 entity dots
 *   - Expanded groups reveal rule rows aligned to a STICKY column header
 *     (Rule / Form / Entity / Tier / Status) — header lives once at the
 *     top of the table, not per-jurisdiction
 *   - Coverage gaps render inline as rows inside their jurisdiction
 *     group with [+ Add rule] CTAs
 *   - Search flattens groups: typing in the search box collapses the
 *     jurisdiction grouping and shows a flat list with a Jurisdiction
 *     column added
 *   - All jurisdiction groups start collapsed so the catalog is
 *     scannable on first load
 *   - Clicking a rule sets `?rule=X` and the rule detail renders in a
 *     side panel
 *
 * Legacy `?view=rules` / `?library=` / `?jur=` links still land here;
 * `normalizeRulesLibrarySearch` rewrites them to V3's `?q=` state so
 * older bookmarks/docs don't 404 silently.
 *
 * Compare with `/rules/library` (original toggle-driven surface) and
 * the now-retired v2 (gap section above flat list). If this lands,
 * the design promotes here, drops the matrix view, and the legacy
 * route is retired.
 */

// ---------------------------------------------------------------------------
// Entity coverage dots
// ---------------------------------------------------------------------------

// EntityKey / ENTITY_KEYS / ENTITY_LABELS live in rules-console-model
// (shared with the states rail + per-jurisdiction table feature
// components). Imported above.

// The per-entity column headers are abbreviated to fit the dense
// 7-column grid (LLC / PART / S-CORP / C-CORP / SOLE / IND / TRUST). The
// full legal-name map sits here so the native browser tooltip explains
// what each column actually means to a CPA — using the compact
// `ENTITY_LABELS` as `title` would just echo the visible abbreviation.
const ENTITY_FULL_LABELS: Record<EntityKey, string> = {
  llc: 'Limited Liability Company',
  partnership: 'Partnership',
  s_corp: 'S Corporation',
  c_corp: 'C Corporation',
  sole_prop: 'Sole Proprietorship',
  individual: 'Individual',
  trust: 'Trust',
}

type CoverageState = 'active' | 'review' | 'none' | 'not_applicable'

// Short column-header labels for the 7 per-entity columns. Fit in
// ~36px column widths; full names live in `ENTITY_LABELS` for the
// header `title` attribute + EntityCoverageDots tooltip.
//
// Each rule row gets per-entity applicability dots in its own column; each
// STATE row gets a per-entity overview cell (count of rules for that entity
// in that state, with a colored status icon — green check / amber warning /
// red empty-ring — depending on coverage).
const ENTITY_COLUMN_LABELS: Record<EntityKey, string> = {
  llc: 'LLC',
  partnership: 'Part',
  s_corp: 'S-Corp',
  c_corp: 'C-Corp',
  sole_prop: 'Sole',
  individual: 'Ind',
  trust: 'Trust',
}

// Total table column count: Rule + Form + 7 per-entity columns + Tier.
// The needs-review signal folds into Tier as a number-only chip (alongside
// the gap chip + progress bar) rather than getting its own column.
const RULES_TABLE_COLUMN_COUNT = 3 + ENTITY_KEYS.length

// The "needs review" signal uses the violet/lavender family — the same hue
// the Badge `info` variant uses for the obligation "In review" lifecycle —
// so "pending review" reads identically wherever it appears. 2026-06-16
// (audit): repainted off the old golden `yellow-700`/`orange-100` (the
// caution-tape mustard the Q1 palette retired and which double-coded against
// the peach `state-warning`). Violet sits between blue (FYI) and red (alarm):
// "attention needed, not urgent," and is visually distinct from the navy
// brand accent. Held in local consts pending promotion to `--state-review-*`.
const REVIEW_TEXT_CLS = 'text-[var(--color-util-colors-violet-700)]'
const REVIEW_BG_TINT_CLS = 'bg-[var(--color-util-colors-violet-100)]'
const REVIEW_DOT_CLS = 'bg-[var(--color-util-colors-violet-600)]'

// Status sub-grouping inside an expanded jurisdiction. Rules are
// bucketed into these groups and rendered under a section header
// row so the user doesn't have to scan a per-rule "Status" column —
// the section IS the status.
type StatusGroupKey = 'needs_review' | 'active' | 'rejected' | 'archived' | 'other'

const STATUS_GROUP_ORDER: readonly StatusGroupKey[] = [
  'needs_review',
  'active',
  'rejected',
  'archived',
  'other',
] as const

function statusGroupOf(status: RuleStatus): StatusGroupKey {
  if (status === 'pending_review' || status === 'candidate') return 'needs_review'
  if (status === 'active' || status === 'verified') return 'active'
  if (status === 'rejected') return 'rejected'
  if (status === 'archived') return 'archived'
  return 'other'
}

function compareByStatusGroupPriority(a: ObligationRule, b: ObligationRule): number {
  return (
    STATUS_GROUP_ORDER.indexOf(statusGroupOf(a.status)) -
    STATUS_GROUP_ORDER.indexOf(statusGroupOf(b.status))
  )
}

type RuleConcreteDraftTarget = {
  ruleId: string
  sourceId: string
}

function isSourceDefinedRule(rule: Pick<ObligationRule, 'dueDateLogic'>): boolean {
  return rule.dueDateLogic.kind === 'source_defined_calendar'
}

function ruleReviewSourceId(rule: Pick<ObligationRule, 'sourceIds' | 'evidence'>): string {
  return rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? ''
}

function concreteDraftTargetForRule(rule: ObligationRule): RuleConcreteDraftTarget | null {
  if (!isSourceDefinedRule(rule)) return null
  const sourceId = ruleReviewSourceId(rule)
  if (sourceId.length === 0) return null
  return { ruleId: rule.id, sourceId }
}

function concreteDraftTargetKey(input: { ruleId: string; sourceId: string }): string {
  return [input.ruleId, input.sourceId].join(':')
}

function useStatusGroupLabels(): Record<StatusGroupKey, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      needs_review: t`Awaiting review`,
      active: t`Active`,
      rejected: t`Rejected`,
      archived: t`Archived`,
      other: t`Other`,
    }),
    [t],
  )
}

/**
 * Rewrites legacy rule-library URL params (introduced before the V3
 * collapse) onto the param shape V3 understands. Returns `null` when
 * the URL already looks current — V3's main route uses that as the
 * signal to render normally instead of issuing a redirect.
 *
 * Legacy → V3:
 *   ?view=rules         → (dropped; V3 is one surface, no toggle)
 *   ?library=active|…   → (dropped; V3 doesn't expose a status filter
 *                          in URL state)
 *   ?jur=CA             → ?q=CA  (V3's search flattens groups and
 *                                  matches by jurisdiction name)
 *
 * Ported (lightly adapted) from the preview-integration branch so old
 * bookmarks, docs, and shared links don't silently 404.
 */
function normalizeRulesLibrarySearch(search: string): string | null {
  const params = new URLSearchParams(search)
  let changed = false

  if (params.has('view')) {
    params.delete('view')
    changed = true
  }
  if (params.has('library')) {
    // V3 has no equivalent URL-level status filter; drop it rather
    // than translate to a no-op param.
    params.delete('library')
    changed = true
  }
  if (params.has('jur')) {
    const jurisdictions = params
      .getAll('jur')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean)
    const first = jurisdictions[0]
    if (jurisdictions.length === 1 && first && !params.has('q')) {
      params.set('q', first)
    }
    params.delete('jur')
    changed = true
  }

  if (!changed) return null
  const next = params.toString()
  return next.length > 0 ? `?${next}` : ''
}

// EntityCoverageDots — compact 7-dot summary that replaces the 7
// entity columns on a STATE row. Each dot represents one of the 7
// entity types in canonical order (LLC, Part, S-Corp, C-Corp, Sole,
// Ind, Trust). Green dot when this jurisdiction has at least one
// rule for that entity, gray dot when there's a gap, faded outline
// when the entity is N/A here. Tooltip carries the full breakdown
// so screen readers + hover audits still get the underlying counts.
//
// Reads as a quiet texture (~70px wide) instead of a 12-element
// matrix — anchors the row by the state name + count, lets the
// trailing badges + tier bar carry the "where the work is" signal.
// EntityStateCell — state row's per-entity overview.
//
// Conditional pending/total format so the eye automatically lands on
// cells with pending work.
//   - All-active (no review pending): plain count `3` in primary
//     text — quiet, scans past
//   - Has review pending: `2/3` with the pending part in
//     `text-text-warning` (purple/amber) so the cell visually
//     stands out from clean siblings
//   - Empty (no rules): em-dash `–` in muted — clearly different
//     from `0/N`
//   - Not applicable (N/A in this jurisdiction): tiny muted dot
function EntityStateCell({
  count,
  pendingReviewCount,
  state,
}: {
  count: number
  pendingReviewCount: number
  state: CoverageState
}) {
  if (state === 'not_applicable') {
    // Entity doesn't apply to this jurisdiction at all.
    return <span aria-hidden className="mx-auto block size-[3px] rounded-full bg-divider-subtle" />
  }
  if (count === 0) {
    // No rules defined for this entity in this state — em-dash.
    return (
      <span aria-hidden className="text-sm font-medium text-text-tertiary">
        –
      </span>
    )
  }
  if (pendingReviewCount > 0) {
    // Pending count `1` carries the review tone (matches every other
    // "needs review" indicator); slash + total `3` both dim down to
    // `text-text-tertiary` — the total isn't the actionable number, just
    // context for the pending part. Reading "1/3" your eye lands on the
    // brown 1, the muted /3 supplies "of how many" without competing for
    // attention.
    return (
      <span
        className="inline-flex items-baseline gap-0.5 text-sm font-medium tabular-nums"
        title={`${pendingReviewCount} of ${count} need review`}
      >
        <span className={REVIEW_TEXT_CLS}>{pendingReviewCount}</span>
        <span className="text-text-tertiary">/{count}</span>
      </span>
    )
  }
  return <span className="text-sm font-medium tabular-nums text-text-primary">{count}</span>
}

// EntityApplicabilityCell — per-rule per-entity affordance.
// Uses icons rather than tonal dots so the per-entity grid reads as
// STATUS LANGUAGE not COLOR SPRAY:
//   - active → `Check` (✓) in soft gray — "this rule is in effect
//              for this entity"
//   - review → `Circle` (○) in sienna — "this entity is pending
//              review, still open"
// Both at 14px (`size-3.5`). Destructive / muted tones keep the dot.
function EntityApplicabilityCell({ applies, status }: { applies: boolean; status: RuleStatus }) {
  if (!applies) {
    return <span aria-hidden className="mx-auto block size-[3px] rounded-full bg-divider-subtle" />
  }
  const tone = STATUS_TONE[status]
  if (tone === 'success') {
    // The active-row check tick recolors from neutral gray to success
    // green when the parent row is hovered, mirroring the leading bullet's
    // hover treatment. The whole row's "active" identity reads as one
    // motion — bullet greens + every applicable-entity tick greens together.
    return (
      <Check
        aria-hidden
        className="mx-auto size-3.5 text-text-tertiary transition-colors group-hover/row:text-state-success-solid"
      />
    )
  }
  if (tone === 'review') {
    return <Circle aria-hidden className={cn('mx-auto size-3.5', REVIEW_TEXT_CLS)} />
  }
  return (
    <span
      aria-hidden
      className={cn(
        'mx-auto block size-1.5 rounded-full',
        tone === 'destructive' && 'bg-state-destructive-solid',
        tone === 'muted' && 'bg-text-muted',
      )}
    />
  )
}

// Rule status progress bar — replaces the prior 7-entity-dots in the
// group header. Segments width is proportional to rule count per
// status. Lets the CPA see "mostly active" vs "all under review"
// vs "mixed" at a glance, scaling visually with how many rules a
// jurisdiction owns. Earlier 7-dot fixed treatment hid this signal
// because dot count never reflected rule count.
//
// The bar is wrapped in the canonical Tooltip primitive so the hover
// affordance is a real popover (keyboard-focusable, screen-reader narrated,
// themed surface) instead of a native `title` (mouse-only, browser-styled,
// no a11y affordance). The popover surfaces the same status-tone color
// chips the segments use so the eye carries the legend from segment →
// tooltip line without translation work.
function RuleStatusBar({ rules }: { rules: ObligationRule[] }) {
  const { t } = useLingui()
  const counts = useMemo(() => {
    let active = 0
    let review = 0
    let other = 0
    for (const rule of rules) {
      const tone = STATUS_TONE[rule.status]
      if (tone === 'success') active++
      else if (tone === 'review') review++
      else other++
    }
    return { active, review, other }
  }, [rules])
  const total = counts.active + counts.review + counts.other
  if (total === 0) {
    return <span className="inline-block h-1.5 w-28 rounded-full bg-divider-subtle" />
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            // `tabIndex=0` so keyboard users can land on the trigger
            // and read the breakdown — matches how /clients +
            // /deadlines expose passive metric chips to a11y.
            tabIndex={0}
            className="inline-flex h-1.5 w-28 overflow-hidden rounded-full bg-background-subtle outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            aria-label={t`${counts.review} of ${total} rules need review`}
          >
            {counts.active > 0 ? (
              <span className="block bg-state-success-solid" style={{ flex: counts.active }} />
            ) : null}
            {counts.review > 0 ? (
              // Review segment uses mustard (REVIEW_DOT_CLS) so review work
              // reads the same color in every bar on the page.
              <span className={cn('block', REVIEW_DOT_CLS)} style={{ flex: counts.review }} />
            ) : null}
            {counts.other > 0 ? (
              <span className="block bg-divider-regular" style={{ flex: counts.other }} />
            ) : null}
          </span>
        }
      />
      <TooltipContent className="flex flex-col gap-1 px-2.5 py-2">
        <span className="text-xs font-medium text-components-tooltip-text">
          <Plural
            value={counts.review}
            one={`# of ${total} need review`}
            other={`# of ${total} need review`}
          />
        </span>
        <span className="flex flex-col gap-0.5 text-caption text-components-tooltip-text/80">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-state-success-solid" />
            <span>
              <Trans>{counts.active} active</Trans>
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn('size-1.5 rounded-full', REVIEW_DOT_CLS)} />
            <span>
              <Plural value={counts.review} one="# needs review" other="# need review" />
            </span>
          </span>
          {counts.other > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-divider-regular" />
              <span>
                <Trans>{counts.other} other</Trans>
              </span>
            </span>
          ) : null}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

// Strip the jurisdiction name from the start of a rule title. The
// state is already shown in the group header above; rule titles
// like "Alabama individual income tax" repeat the state name once
// per row, making the rule column hard to scan. Drop the prefix
// (and any leading separator), capitalize the first letter so
// "individual income tax" reads as a sentence start.
// stripJurisdictionPrefix lives in rules-console-model (shared with
// the per-jurisdiction table). Imported above.

// Form-cell renderer. Shows the form code (or the canonical em-dash
// placeholder when no form is set) in regular sans-serif text.
// Tooltip carries the humanized tax type.
// Empty cells use the EmptyCellMark em-dash to match /clients +
// /deadlines — one empty-cell visual across every table.
// Rules library renders `rule.formName` (the rule's own authored
// form-name string) rather than going through `TaxCodeLabel` like
// /deadlines and /clients do, because each rule owns an authoritative
// form-name field set when the rule was created, which may diverge from
// what `describeTaxCode(taxType)` would resolve.
// The presentation (text-xs text-text-secondary, EmptyCellMark on
// placeholders, tooltip-only-on-hover via native `title`) matches the
// canonical TaxCodeLabel default visual when used in dense table rows,
// so the *visual* shape stays unified across the three surfaces — only
// the data source differs.
function FormCell({ formName, taxType }: { formName: string; taxType: string }) {
  const trimmed = formName.trim()
  const isPlaceholder =
    !trimmed || trimmed === '—' || trimmed === '-' || trimmed.toLowerCase() === 'n/a'
  if (isPlaceholder) {
    return <EmptyCellMark label="No form code" />
  }
  const taxLabel = formatTaxCode(taxType)
  return (
    <span
      className="text-xs text-text-secondary"
      title={taxLabel ? `${trimmed} · ${taxLabel}` : trimmed}
    >
      {trimmed}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Data shaping — group rules by jurisdiction
// ---------------------------------------------------------------------------

type JurisdictionGroup = {
  jurisdiction: RuleJurisdiction
  label: string
  rules: ObligationRule[]
  coverage: RuleCoverageRow['entityCoverage'] | null
  sourceCoverage: RuleCoverageRow['entitySourceCoverage'] | null
  ruleCount: number
  gapEntities: EntityKey[]
  hasGap: boolean
  isFullyActive: boolean
  pendingReviewCount: number
  // Count of rules in this jurisdiction applicable to each entity
  // type. Pre-computed in buildGroups so the state-row entity-coverage
  // dot cluster (`EntityCoverageDots`) and its hover tooltip can read
  // counts without re-filtering on every render.
  entityCounts: Record<EntityKey, number>
  // Per-entity pending-review count for the EntityStateCell's
  // `pending/total` informativeness format.
  entityPendingReviewCounts: Record<EntityKey, number>
}

function buildGroups(
  rules: readonly ObligationRule[],
  coverageRows: readonly RuleCoverageRow[],
): JurisdictionGroup[] {
  // Index coverage rows by jurisdiction for fast lookup.
  const coverageByJur = new Map(coverageRows.map((row) => [row.jurisdiction, row]))
  // Collect every jurisdiction that has either rules OR a coverage row
  // (so jurisdictions with 0 rules but coverage definition still
  // appear — they're the all-gaps case).
  const jurSet = new Set<RuleJurisdiction>()
  for (const rule of rules) jurSet.add(rule.jurisdiction)
  for (const row of coverageRows) jurSet.add(row.jurisdiction)
  const groups: JurisdictionGroup[] = []
  for (const jur of jurSet) {
    const groupRules = rules.filter((r) => r.jurisdiction === jur)
    const coverageRow = coverageByJur.get(jur)
    const coverage = coverageRow?.entityCoverage ?? null
    const sourceCoverage = coverageRow?.entitySourceCoverage ?? null
    const gapEntities: EntityKey[] = []
    if (coverage) {
      for (const e of ENTITY_KEYS) {
        if (coverage[e] === 'none' && sourceCoverage?.[e] !== 'not_applicable') {
          gapEntities.push(e)
        }
      }
    }
    const pendingReviewCount = groupRules.filter(
      (r) => r.status === 'pending_review' || r.status === 'candidate',
    ).length
    // Per-entity rule count for this jurisdiction. A rule with
    // entityApplicability ['llc','partnership'] adds 1 to llc AND
    // 1 to partnership — so totals across entities can exceed the
    // rule count, by design.
    const entityCounts: Record<EntityKey, number> = {
      llc: 0,
      partnership: 0,
      s_corp: 0,
      c_corp: 0,
      sole_prop: 0,
      individual: 0,
      trust: 0,
    }
    // Per-entity pending-review count: EntityStateCell uses this to render
    // the `pending/total` format in warning tone when at least one rule for
    // that entity needs review.
    const entityPendingReviewCounts: Record<EntityKey, number> = {
      llc: 0,
      partnership: 0,
      s_corp: 0,
      c_corp: 0,
      sole_prop: 0,
      individual: 0,
      trust: 0,
    }
    for (const rule of groupRules) {
      const isPendingReview = rule.status === 'pending_review' || rule.status === 'candidate'
      for (const entity of ENTITY_KEYS) {
        if (rule.entityApplicability.includes(entity)) {
          entityCounts[entity]++
          if (isPendingReview) entityPendingReviewCounts[entity]++
        }
      }
    }
    const isFullyActive =
      groupRules.length > 0 &&
      gapEntities.length === 0 &&
      groupRules.every((rule) => rule.status === 'active' || rule.status === 'verified')
    groups.push({
      jurisdiction: jur,
      label: jurisdictionLabel(jur),
      rules: groupRules,
      coverage,
      sourceCoverage,
      ruleCount: groupRules.length,
      gapEntities,
      hasGap: gapEntities.length > 0 || pendingReviewCount > 0,
      isFullyActive,
      pendingReviewCount,
      entityCounts,
      entityPendingReviewCounts,
    })
  }
  // Sort: Federal first, then states whose catalog is already active,
  // then jurisdictions with review/missing work, then the remaining
  // inactive/archived tail. Within each bucket keep the state-name
  // order predictable.
  return groups.toSorted((a, b) => {
    if (a.jurisdiction === 'FED' && b.jurisdiction !== 'FED') return -1
    if (b.jurisdiction === 'FED' && a.jurisdiction !== 'FED') return 1
    if (a.isFullyActive !== b.isFullyActive) return a.isFullyActive ? -1 : 1
    if (a.hasGap !== b.hasGap) return a.hasGap ? -1 : 1
    return a.label.localeCompare(b.label)
  })
}

function defaultExpandedSet(): Set<RuleJurisdiction> {
  // Keep first paint compact: jurisdictions, including Federal, open
  // only when the user expands them or uses Expand all.
  return new Set<RuleJurisdiction>()
}

// Hoisted out of the route body so the initial useState seed +
// IntersectionObserver increment + reset effect all reference the same
// constant. 10 groups per batch keeps the first-paint cost predictable and
// surfaces ~70% of the federal+top-state catalog in the first batch without
// a fetch.
const PAGE_SIZE = 10

// ---------------------------------------------------------------------------
// Label maps — re-declared inline so the Lingui macro picks up the
// t-templates. (See obligation-drawer.tsx for why function-parameter
// `t` doesn't transform.)
// ---------------------------------------------------------------------------

function useRuleTierLabels(): Record<RuleTier, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      basic: t`Basic`,
      annual_rolling: t`Annual rolling`,
      exception: t`Exception`,
      applicability_review: t`Applicability review`,
    }),
    [t],
  )
}

// STATUS_TONE / STATUS_LABEL_SHORT live in rules-console-model
// (shared with the per-jurisdiction table). Imported above.

// ---------------------------------------------------------------------------
// Overview summary surfaces (Pencil O0pyRO)
//
// The "All jurisdictions" overview keeps the wired GroupedRulesTable
// (infinite scroll + batch review + gap rows). Per Pencil O0pyRO, the
// design surrounds that table with three summary blocks ABOVE it:
//   1. ActionHero    — blue review-queue callout (count tile + body +
//                      "Open review queue" CTA), shown only when there
//                      are rules awaiting review.
//   2. Status coverage card — segmented active/review/draft bar + chips.
//   3. Recent changes card  — the most-recently-touched rules with a
//                      jurisdiction pill, change-kind pill, and relative
//                      timestamp.
// All three read from the SAME wired data the table consumes (rules +
// statusCounts), so no functionality is dropped — they are an additive
// scannable header for the catalog.
// ---------------------------------------------------------------------------

// Jurisdiction pill tones for the recent-changes rows. Mapped onto the
// existing token palette (no new theme colors): Federal reads as a
// dark slate chip, states cycle through the util-color tints already
// shipped in the theme. Pencil uses bespoke per-state hex; we collapse
// to a small set of semantic-ish tints keyed by jurisdiction so the
// rows stay legible without inventing tokens.
function jurisdictionPillClass(jurisdiction: string): string {
  if (jurisdiction === 'FED') {
    return 'bg-text-primary text-background-default'
  }
  return 'border border-divider-regular bg-background-subtle text-text-tertiary'
}

// Change-kind classification for a rule, derived from its wired fields.
// `version === 1` (never re-versioned) reads as NEW; a rule whose
// effective/verified date is still in the future reads as EFFECTIVE
// (a scheduled change); everything else is an UPDATED revision.
type RuleChangeKind = 'new' | 'updated' | 'effective'

function ruleChangeKind(rule: ObligationRule, now: number): RuleChangeKind {
  const effective = Date.parse(rule.verifiedAt)
  if (!Number.isNaN(effective) && effective > now) return 'effective'
  if (rule.version <= 1) return 'new'
  return 'updated'
}

// Timestamp a rule was last touched — reviewedAt (ISO datetime) wins,
// falling back to verifiedAt (date-only). Returns epoch ms or null.
function ruleChangedAt(rule: ObligationRule): number | null {
  const reviewed = rule.reviewedAt ? Date.parse(rule.reviewedAt) : Number.NaN
  if (!Number.isNaN(reviewed)) return reviewed
  const verified = Date.parse(rule.verifiedAt)
  return Number.isNaN(verified) ? null : verified
}

function useRuleChangeKindLabels(): Record<RuleChangeKind, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      new: t`New`,
      updated: t`Updated`,
      effective: t`Effective`,
    }),
    [t],
  )
}

// Change-pill tone per kind for the Recent changes rows (Pencil O0pyRO
// `lDTO0`): UPDATED reads accent-blue, NEW reads success-green, EFFECTIVE
// (a scheduled future change) reads warning-brown. Mapped onto existing
// state tokens — no bespoke hex.
const RECENT_CHANGE_PILL_CLASS: Record<RuleChangeKind, string> = {
  updated: 'bg-state-accent-hover text-text-accent',
  new: 'bg-state-success-hover text-text-success',
  effective: 'bg-state-warning-hover text-text-warning',
}

// One trailing window shared by the CHANGED (30D) stat and the Recent
// changes card — two windows is how "0 changed" ends up above 5 rows.
const CHANGED_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

/**
 * OverviewReviewBreakdown — "Where to start": the review backlog made
 * actionable. A by-reason strip (why the queue grew) over a ranked list of the
 * jurisdictions with the most pending rules; each row drills straight into that
 * jurisdiction's review queue. The overview's primary lower-zone module — it
 * fills the space the empty "Recent changes" feed used to leave dead, and
 * answers the CPA's real question ("456 — where do I start?").
 */
function OverviewReviewBreakdown({
  jurisdictions,
  onSelectJurisdiction,
}: {
  jurisdictions: ReadonlyArray<{
    jurisdiction: string
    label: string
    pendingReviewCount: number
    highCount: number
    oldest: number | null
  }>
  onSelectJurisdiction: (jurisdiction: string) => void
}) {
  const { t } = useLingui()
  const now = Date.now()

  return (
    <section className="flex shrink-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-region-title text-text-primary">
          <Trans>Where to start</Trans>
        </span>
        <span className="text-sm font-medium text-text-tertiary">
          <Trans>Most urgent first</Trans>
        </span>
      </div>
      {/* Ranked jurisdictions (longest-waiting first). Per the Pencil
          reference nCNln the row carries the triage signal as text —
          high-severity · days waiting — not a magnitude bar, with an
          explicit Review button into that jurisdiction's queue. */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-divider-subtle">
        {jurisdictions.map((g, index) => {
          const days =
            g.oldest != null ? Math.max(1, Math.ceil((now - g.oldest) / 86_400_000)) : null
          return (
            <div
              key={g.jurisdiction}
              className={cn(
                'flex items-center gap-3 px-4 py-3',
                index > 0 && 'border-t border-divider-subtle',
              )}
            >
              <StateBadge code={g.jurisdiction} size="sm" preview={false} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-base font-medium text-text-primary">{g.label}</span>
                {/* Subline carries only the row's *differentiators*: high
                      severity (when present) + how long it's waited. The
                      absolute "oldest {date}" lived here too, but it restates
                      the same timestamp as "Nd waiting" and is identical on
                      every row in single-cohort data — the StatBand owns the
                      absolute date. "No high-severity" is dropped: absence
                      reads as none without a label on 4-of-6 rows. */}
                <span className="flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-text-tertiary">
                  {g.highCount > 0 ? (
                    <span className="text-text-warning">
                      <Plural value={g.highCount} one="# high-severity" other="# high-severity" />
                    </span>
                  ) : null}
                  {g.highCount > 0 && days != null ? <span aria-hidden>·</span> : null}
                  {days != null ? <span>{t`${days}d waiting`}</span> : null}
                </span>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums text-text-warning">
                <Plural value={g.pendingReviewCount} one="# to review" other="# to review" />
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelectJurisdiction(g.jurisdiction)}
              >
                <Trans>Review</Trans>
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * OverviewCoverageGaps — entity-coverage gaps as a small warning module that
 * only renders when something is actually uncovered (Yuqi: "shows teeth only
 * when there are gaps"). Each chip drills into that jurisdiction.
 */
function OverviewCoverageGaps({
  jurisdictions,
  onSelectJurisdiction,
}: {
  jurisdictions: ReadonlyArray<{
    jurisdiction: string
    label: string
    gapEntities: readonly string[]
  }>
  onSelectJurisdiction: (jurisdiction: string) => void
}) {
  if (jurisdictions.length === 0) return null
  return (
    <section className="flex shrink-0 flex-col gap-2.5 rounded-xl border border-divider-regular bg-state-warning-hover px-4 py-3.5">
      <div className="flex items-center gap-2">
        <TriangleAlertIcon aria-hidden className="size-4 shrink-0 text-text-warning" />
        <span className="text-nav font-semibold text-text-primary">
          <Plural
            value={jurisdictions.length}
            one="# jurisdiction has a coverage gap"
            other="# jurisdictions have coverage gaps"
          />
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {jurisdictions.map((g) => (
          <button
            key={g.jurisdiction}
            type="button"
            onClick={() => onSelectJurisdiction(g.jurisdiction)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-divider-regular bg-background-default px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-state-base-hover"
          >
            <StateBadge code={g.jurisdiction} size="xs" preview={false} />
            {g.label}
            <span className="tabular-nums text-text-tertiary">{g.gapEntities.length}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

/**
 * OverviewRecentChangesCard — the most-recently-touched rules (Pencil
 * O0pyRO `lDTO0`). A flush, full-width section (header + hairline-
 * separated rows), NOT a bordered card: jurisdiction code pill · title +
 * source/effective/author meta · change pill (UPDATED / NEW / EFFECTIVE)
 * · relative timestamp · chevron. Clicking a row opens that rule's detail
 * panel (same `?rule=` deep-link the table rows use). Derived from the
 * wired rules — no separate query.
 */
function OverviewRecentChangesCard({
  rules,
  changedTotal,
  lastChangeAt,
  onRuleClick,
  onViewAll,
}: {
  rules: ObligationRule[]
  /** Total rules changed in the trailing window — drives the "N of M" sub. */
  changedTotal: number
  /** Most recent change across ALL rules — powers the honest empty state. */
  lastChangeAt: number | null
  onRuleClick: (rule: ObligationRule) => void
  onViewAll: () => void
}) {
  const { t } = useLingui()
  const changeKindLabels = useRuleChangeKindLabels()
  const now = Date.now()
  if (rules.length === 0) {
    return (
      <div className="flex shrink-0 flex-col gap-4">
        <span className="text-region-title text-text-primary">
          <Trans>Recent changes</Trans>
        </span>
        {/* Intentional empty state (canonical EmptyState primitive) instead of
            a lone grey line stranded in the dashboard's lower half. The feed
            stays windowed to 30 days — surfacing older changes here would
            contradict the "Changed (30d)" stat, the data-consistency breach
            this page guards against — so the empty state stays honest.
            Copy is scoped strictly to *changes* (source/content updates), NOT
            overall status: claiming the library is "current"/"caught up" would
            contradict the pending-review backlog in the banner above — review
            status and change activity are different things. */}
        <EmptyState
          density="compact"
          icon={CircleCheck}
          iconTone="neutral"
          title={<Trans>No rule changes in the last 30 days</Trans>}
          description={
            lastChangeAt !== null ? (
              <Trans>
                The most recent rule or source change was{' '}
                {formatDatePretty(new Date(lastChangeAt).toISOString())}.
              </Trans>
            ) : (
              <Trans>No rule changes have been recorded yet.</Trans>
            )
          }
        />
      </div>
    )
  }
  return (
    <div className="flex shrink-0 flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-region-title text-text-primary">
            <Trans>Recent changes</Trans>
          </span>
          <span className="text-sm font-medium text-text-tertiary">
            {changedTotal > rules.length ? (
              <Trans>
                Last 30 days · {rules.length} of {changedTotal}
              </Trans>
            ) : (
              <Trans>Last 30 days</Trans>
            )}
          </span>
        </div>
        <span className="flex-1" />
        <TextLink
          variant="accent"
          size="sm"
          onClick={onViewAll}
          className="group/viewall shrink-0 gap-1.5 text-base"
        >
          <Trans>View all changes</Trans>
          <ArrowRightIcon
            aria-hidden
            className="size-3.5 transition-transform group-hover/viewall:translate-x-0.5"
          />
        </TextLink>
      </div>
      <ul className="-mx-3 flex flex-col">
        {rules.map((rule) => {
          const kind = ruleChangeKind(rule, now)
          const changedAt = ruleChangedAt(rule)
          const relative = changedAt ? formatRelativeTime(new Date(changedAt).toISOString()) : null
          // Meta line mirrors the mock: source/form code · effective date ·
          // reviewer. `reviewedByName` is a real display name; the seed
          // placeholder `verifiedBy` slug is deliberately never shown. The
          // effective date is the source's publication date (`effectiveOn`); when
          // absent we fall back to the rule's verified date with a muted "≈"
          // prefix so it doesn't read as the source's date.
          const effectiveDate = rule.effectiveOn ?? rule.verifiedAt
          const effective = effectiveDate
            ? `${rule.effectiveOn ? '' : '≈ '}${formatDatePretty(effectiveDate)}`
            : null
          const metaParts = [
            rule.formName,
            effective ? t`effective ${effective}` : null,
            rule.reviewedByName ? t`by ${rule.reviewedByName}` : null,
          ].filter(Boolean)
          return (
            <li key={rule.id}>
              <button
                type="button"
                onClick={() => onRuleClick(rule)}
                className="group/row flex w-full cursor-pointer items-center gap-3.5 rounded-lg px-3 py-3 text-left outline-none transition-colors hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                <span
                  className={cn(
                    'inline-flex w-[38px] shrink-0 items-center justify-center rounded px-2 py-[3px] text-xs font-semibold',
                    jurisdictionPillClass(rule.jurisdiction),
                  )}
                >
                  {rule.jurisdiction}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base font-semibold tracking-title text-text-primary transition-colors group-hover/row:text-text-accent">
                    {rule.title}
                  </span>
                  {metaParts.length > 0 ? (
                    <span className="truncate text-sm font-medium text-text-tertiary">
                      {metaParts.join(' · ')}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center rounded-full px-2 py-[3px] text-caption-xs font-semibold tracking-wider uppercase',
                    RECENT_CHANGE_PILL_CLASS[kind],
                  )}
                >
                  {changeKindLabels[kind]}
                </span>
                {relative ? (
                  <span className="shrink-0 text-sm font-medium text-text-muted tabular-nums">
                    {relative}
                  </span>
                ) : null}
                <ChevronRightIcon
                  aria-hidden
                  className="size-3.5 shrink-0 text-text-muted transition-[transform,color] group-hover/row:translate-x-0.5 group-hover/row:text-text-tertiary"
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * OverviewCaughtUpCard — the "all caught up" empty state shown on the
 * Overview when the review queue is clear (Pencil O0pyRO `whr8M` /
 * `sgts2`). A centered card on the subtle surface: a success check, a
 * headline + body, a quiet "last reviewed" meta line, and two quiet
 * links (past decisions / monitor sources). Per the mock it sits ABOVE
 * the stats band so a clear queue reads as the reward, not an afterthought.
 */
function OverviewCaughtUpCard({
  lastReviewedRelative,
  onViewDecisions,
  onMonitorSources,
}: {
  lastReviewedRelative: string | null
  onViewDecisions: () => void
  onMonitorSources: () => void
}) {
  const linkClass =
    'group/link inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg text-base font-medium text-text-accent outline-none transition-colors hover:text-text-accent/80 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt'
  const linkArrowClass = 'size-3.5 transition-transform group-hover/link:translate-x-0.5'
  return (
    <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-background-subtle px-6 py-10">
      <div className="flex w-[520px] max-w-full flex-col items-center gap-3.5 text-center">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-state-success-hover"
        >
          <Check className="size-[22px] text-state-success-solid" />
        </span>
        <span className="text-xl font-semibold tracking-title text-text-primary">
          <Trans>Review queue is clear</Trans>
        </span>
        <p className="max-w-[480px] text-base font-medium leading-relaxed text-text-tertiary">
          <Trans>
            No rule changes are waiting on review. We'll surface new updates from sources as they're
            published.
          </Trans>
        </p>
        {lastReviewedRelative ? (
          <span className="text-sm font-medium text-text-muted">
            <Trans>Last rule reviewed {lastReviewedRelative}</Trans>
          </span>
        ) : null}
        <div className="flex items-center gap-4 pt-1.5">
          <button type="button" onClick={onViewDecisions} className={linkClass}>
            <Trans>View past decisions</Trans>
            <ArrowRightIcon aria-hidden className={linkArrowClass} />
          </button>
          <button type="button" onClick={onMonitorSources} className={linkClass}>
            <Trans>Monitor sources</Trans>
            <ArrowRightIcon aria-hidden className={linkArrowClass} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main route
// ---------------------------------------------------------------------------

export function RulesLibraryRoute() {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const location = useLocation()
  // Legacy deep-link redirect — see normalizeRulesLibrarySearch.
  // Calculated before any hooks that depend on URL state so the
  // <Navigate /> early-return swaps params before nuqs latches onto
  // them. The hook order below the redirect is stable; React only
  // unmounts/remounts when the URL actually changes.
  const normalizedSearch = useMemo(
    () => normalizeRulesLibrarySearch(location.search),
    [location.search],
  )
  const [search, setSearch] = useQueryState('q', parseAsString)
  const [ruleId, setRuleId] = useQueryState('rule', parseAsString)
  const [entityFilter, setEntityFilter] = useQueryState('entity', parseAsString)
  // Incremental client-side reveal. `visibleGroupCount` tracks how many
  // jurisdiction groups are mounted; an IntersectionObserver sentinel at
  // the bottom of the loaded slice grows the count by PAGE_SIZE when it
  // crosses the viewport. Resets to PAGE_SIZE whenever the filtered set
  // changes (search/scope/entity/sort) so the user never has to scroll to
  // "page 5" again after narrowing.
  //
  // Why client-side instead of cursor pagination: `listRules` already
  // ships the full catalog payload in one request (52 jurisdictions
  // × ~9 rules average = ~470 rule objects, ~85KB JSON). The
  // perceived-perf wins live in not mounting 470 TableRows at once,
  // not in reducing network. Cursor pagination would multiply
  // round-trips for marginal gain and break the in-memory search /
  // jurisdiction-grouping flow this page already runs.
  const [visibleGroupCount, setVisibleGroupCount] = useState(PAGE_SIZE)
  // The selected jurisdiction drives the right-pane flat table. URL-bound
  // so a state deep-links; null / unknown code = the All overview.
  const [jurisdictionParam, setJurisdiction] = useQueryState('jurisdiction', parseAsString)
  // Scope tabs above the table. URL-bound so the active scope deep-links.
  // Default is 'all'. `null` from nuqs maps back to 'all' for the
  // activeScope computation so the chip is always one of the four known
  // states.
  const [scope, setScope] = useQueryState(
    'scope',
    parseAsStringLiteral(['all', 'active', 'review', 'archived', 'missing'] as const),
  )
  const activeScope = scope ?? 'all'
  // Catalog-release cohort deep-link (?cohort=YYYY) — narrows the library
  // to a single filing-year cohort when present.
  const [cohort] = useQueryState('cohort', parseAsInteger)
  const isSearching = (search ?? '').trim().length > 0
  // Batch-review state. `selectedRuleIds` tracks which needs-review
  // rules the user has checked off. `batchReviewRuleIds` snapshots the
  // queue when the modal opens so progress stays anchored to the
  // original session even as accepted rules leave the live pending
  // set. `batchReviewIndex` is the currently-shown card in the
  // review modal; `null` means the modal is closed.
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(() => new Set())
  // The bulk-review list modal (Pencil `Oaey3`) — the default bulk surface.
  const [bulkListOpen, setBulkListOpen] = useState(false)
  const [batchReviewRuleIds, setBatchReviewRuleIds] = useState<string[] | null>(null)
  const [batchReviewIndex, setBatchReviewIndex] = useState<number | null>(null)
  const [batchReviewDirty, setBatchReviewDirty] = useState(false)
  const batchAcceptedRuleIdsRef = useRef<Set<string>>(new Set())
  const autoExpandAfterBatchRef = useRef<Set<RuleJurisdiction>>(new Set())
  // New-rule modal. `null` = closed. Setting to an object opens the
  // modal with the given seed (used to pre-fill jurisdiction + entity
  // when launched from a "+ Add rule" gap row).
  const [newRuleSeed, setNewRuleSeed] = useState<{
    jurisdiction?: RuleJurisdiction
    entity?: EntityKey
  } | null>(null)
  const activeEntity: EntityKey | null = useMemo(() => {
    if (!entityFilter) return null
    return ENTITY_KEYS.find((key) => key === entityFilter) ?? null
  }, [entityFilter])

  const rulesQuery = useQuery(
    orpc.rules.listRules.queryOptions({ input: { includeCandidates: true } }),
  )
  const coverageQuery = useQuery(orpc.rules.coverage.queryOptions({ input: undefined }))
  const sourcesQuery = useQuery(orpc.rules.listSources.queryOptions({ input: undefined }))
  const temporaryQuery = useQuery(orpc.rules.listTemporaryRules.queryOptions({ input: undefined }))

  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data])
  const rulesById = useMemo(() => new Map(rules.map((rule) => [rule.id, rule])), [rules])
  const coverageRows = useMemo(() => coverageQuery.data ?? [], [coverageQuery.data])
  // Apply entity + scope filter. Entity slices by who-the-rule-applies-to;
  // scope slices by review state. Coverage rows stay untouched —
  // state-level coverage signals reflect the full picture regardless
  // of filter.
  // Scope tabs filter rules ahead of grouping. 'all' = no filter;
  // 'active' = status active|verified; 'review' = pending-review group;
  // 'missing' is handled at the group level (post-build) since it filters
  // by coverage gaps not rule status.
  const filteredRules = useMemo(() => {
    let result = rules
    if (activeEntity) {
      result = result.filter((r) => r.entityApplicability.includes(activeEntity))
    }
    if (activeScope === 'active') {
      result = result.filter((r) => r.status === 'active' || r.status === 'verified')
    } else if (activeScope === 'review') {
      result = result.filter((r) => statusGroupOf(r.status) === 'needs_review')
    } else if (activeScope === 'archived') {
      result = result.filter((r) => statusGroupOf(r.status) === 'archived')
    }
    // For 'missing' scope, the rules array stays — we still need rule
    // data to identify which entity columns have a rule. Group-level
    // post-filter below restricts to groups with gap entities.
    if (cohort) {
      result = result.filter((r) => r.applicableYear === cohort)
    }
    return result
  }, [rules, activeEntity, activeScope, cohort])
  const groupsAll = useMemo(
    () => buildGroups(filteredRules, coverageRows),
    [filteredRules, coverageRows],
  )
  const allCatalogGroups = useMemo(() => buildGroups(rules, coverageRows), [rules, coverageRows])
  const filteredGroups = useMemo(() => {
    if (activeScope !== 'missing') return groupsAll
    // Missing scope: only state groups that have at least one
    // entity gap (entity × jurisdiction with no rule). Each group's
    // own gapEntities array already encodes the gaps.
    return groupsAll.filter((g) => g.gapEntities.length > 0)
  }, [groupsAll, activeScope])
  // The visible slice grows by PAGE_SIZE whenever the bottom sentinel
  // crosses the viewport.
  const totalGroupCount = filteredGroups.length
  const clampedVisibleCount = Math.min(visibleGroupCount, totalGroupCount)
  const groups = useMemo(
    () => filteredGroups.slice(0, clampedVisibleCount),
    [filteredGroups, clampedVisibleCount],
  )
  // Reset the visible window whenever the filter/scope set changes
  // shape. Using a derived fingerprint (jurisdiction list identity)
  // means re-running `listRules` data without a filter change DOESN'T
  // reset the scroll position — the user can keep reading.
  const filteredGroupsFingerprint = useMemo(
    () => filteredGroups.map((g) => g.jurisdiction).join('|'),
    [filteredGroups],
  )
  useEffect(() => {
    setVisibleGroupCount(PAGE_SIZE)
  }, [filteredGroupsFingerprint])
  // Top-of-page stats data. `statusCounts` drives the multi-color
  // stacked progress bar (one segment per `RuleStatus` with >0 rules).
  // Scope-tab counts (`totalActive`, `totalPendingReview`,
  // `totalGapEntities`) are computed against the UNFILTERED rules +
  // `groupsAll` so the tab badges stay stable as the user toggles
  // scopes — filtering shouldn't make a tab read as "(0)".
  const statsLoading = rulesQuery.isLoading || coverageQuery.isLoading || sourcesQuery.isLoading
  const totalRules = rules.length
  const statusCounts = useMemo<Record<RuleStatus, number>>(() => {
    const counts: Record<RuleStatus, number> = {
      active: 0,
      verified: 0,
      pending_review: 0,
      candidate: 0,
      rejected: 0,
      archived: 0,
      deprecated: 0,
    }
    for (const rule of rules) {
      counts[rule.status] += 1
    }
    return counts
  }, [rules])
  const totalActive = statusCounts.active + statusCounts.verified
  const totalPendingReview = useMemo(
    () => rules.filter((r) => statusGroupOf(r.status) === 'needs_review').length,
    [rules],
  )
  const totalGapEntities = useMemo(
    () => groupsAll.reduce((acc, g) => acc + g.gapEntities.length, 0),
    [groupsAll],
  )
  // Per-entity statistics — for each entity type:
  //   - `count`       total rules applicable to it across the catalog
  //   - `gapCount`    applicable jurisdictions with NO rule for this entity
  //   - `reviewCount` jurisdictions needing CPA review for this entity
  //
  // Previously this collapsed to a single 'worst-wins' state ('none'
  // if any one of 52 jurisdictions was missing a rule), which made
  // every entity light up red almost all the time — even Trust with
  // 44 rules read as "broken" because one tiny jurisdiction had a
  // gap. The signal was unusable.
  //
  // Now we keep the real numbers and let the UI decide how to show
  // them: the chip surfaces "· N missing" as quiet text when N > 0,
  // no red dot, no severity inference. The user reads "247 LLC rules,
  // 2 missing across 52 jurisdictions" instead of "LLC is red".
  const entityStats = useMemo(() => {
    const out: Array<{
      entity: EntityKey
      count: number
      gapCount: number
      reviewCount: number
    }> = []
    for (const entity of ENTITY_KEYS) {
      const count = rules.filter((r) => r.entityApplicability.includes(entity)).length
      let gapCount = 0
      let reviewCount = 0
      for (const row of coverageRows) {
        const cell = row.entityCoverage[entity]
        const sourceCell = row.entitySourceCoverage[entity]
        if (sourceCell === 'not_applicable') continue
        if (cell === 'none') gapCount++
        else if (cell === 'review') reviewCount++
      }
      out.push({ entity, count, gapCount, reviewCount })
    }
    return out
  }, [rules, coverageRows])
  const totalArchived = statusCounts.archived + statusCounts.deprecated

  // The overview summary surfaces read from the SAME wired `rules` the
  // grouped table consumes — no new query. `recentChanges` is the
  // 5 most-recently-touched rules (by reviewedAt → verifiedAt) for the
  // Recent Changes card; `oldestReviewRelative` is the age of the
  // longest-waiting pending-review rule for the ActionHero "oldest Nd"
  // chip.
  // Windowed to the SAME trailing 30 days as the CHANGED (30D) stat tile —
  // a "Last 30 days" header listing 45-day-old rows above a stat saying 0
  // is the exact data-consistency breach this page is supposed to prevent.
  const recentChanges = useMemo(() => {
    const cutoff = Date.now() - CHANGED_WINDOW_MS
    return rules
      .filter((rule) => {
        const changed = ruleChangedAt(rule)
        return changed !== null && changed >= cutoff
      })
      .toSorted((a, b) => (ruleChangedAt(b) ?? 0) - (ruleChangedAt(a) ?? 0))
      .slice(0, 5)
  }, [rules])
  const lastChangeAt = useMemo(() => {
    let latest: number | null = null
    for (const rule of rules) {
      const changed = ruleChangedAt(rule)
      if (changed !== null && (latest === null || changed > latest)) latest = changed
    }
    return latest
  }, [rules])
  const oldestReviewRelative = useMemo(() => {
    let oldest = Number.POSITIVE_INFINITY
    for (const rule of rules) {
      if (statusGroupOf(rule.status) !== 'needs_review') continue
      const changed = ruleChangedAt(rule)
      if (changed !== null && changed < oldest) oldest = changed
    }
    if (!Number.isFinite(oldest)) return null
    return formatRelativeTime(new Date(oldest).toISOString())
  }, [rules])
  // Most-recent review timestamp — backs the "all caught up" empty
  // state's "Last rule reviewed …" meta line (Pencil O0pyRO `whr8M`).
  const lastReviewedRelative = useMemo(() => {
    let latest = 0
    for (const rule of rules) {
      const reviewed = rule.reviewedAt ? Date.parse(rule.reviewedAt) : Number.NaN
      if (!Number.isNaN(reviewed) && reviewed > latest) latest = reviewed
    }
    return latest > 0 ? formatRelativeTime(new Date(latest).toISOString()) : null
  }, [rules])

  // Overview KPI-strip + eyebrow inputs (Pencil O0pyRO KPI Strip /
  // eyebrow). All derived from already-wired queries — no extra fetch.
  //   jurisdictionCount — one coverage row per jurisdiction
  //   changedLast30     — rules touched in the trailing 30d
  const jurisdictionCount = coverageRows.length
  // Rail library-section rows (Pencil O0pyRO — Sources / Temporary rules).
  const railSources = useMemo(() => {
    const data = sourcesQuery.data
    if (!data) return undefined
    return { count: data.length, healthy: data.every((s) => s.healthStatus === 'healthy') }
  }, [sourcesQuery.data])
  const railTemporary = useMemo(() => {
    const data = temporaryQuery.data
    if (!data) return undefined
    const active = data.filter((rule) => rule.status === 'active')
    return {
      activeCount: active.length,
      // Total includes expired/reverted overrides — proving a PAST override
      // existed is precisely the compliance need, so the rail row must stay
      // reachable when nothing is currently active.
      totalCount: data.length,
      obligationCount: active.reduce((acc, rule) => acc + rule.activeObligationCount, 0),
    }
  }, [temporaryQuery.data])
  const changedLast30 = useMemo(() => {
    const cutoff = Date.now() - CHANGED_WINDOW_MS
    return rules.filter((rule) => {
      const changed = ruleChangedAt(rule)
      return changed !== null && changed >= cutoff
    }).length
  }, [rules])
  // Overview stats-band subs (Pencil O0pyRO `p0WeNy`) — all derived from
  // already-wired queries, no fiction:
  //   coveragePct      — share of jurisdictions with zero entity gaps
  //   highImpactChanged — high-risk rules touched in the trailing 30d
  //   reviewedLast30    — rules explicitly reviewed by the practice in the trailing 30d
  const coveragePct = useMemo(() => {
    if (coverageRows.length === 0) return 0
    let covered = 0
    for (const row of coverageRows) {
      const hasGap = ENTITY_KEYS.some(
        (e) => row.entityCoverage[e] === 'none' && row.entitySourceCoverage[e] !== 'not_applicable',
      )
      if (!hasGap) covered++
    }
    return Math.round((covered / coverageRows.length) * 100)
  }, [coverageRows])

  // The states rail + per-jurisdiction detail pane. `unfilteredGroups`
  // powers stable per-jurisdiction totals (rail counts + review dots + the
  // selected group's header chips / scoped progress + entity stats),
  // independent of the active scope/entity filter.
  const tierLabels = useRuleTierLabels()
  const unfilteredGroups = useMemo(() => buildGroups(rules, coverageRows), [rules, coverageRows])
  const railItems = useMemo<RailJurisdiction[]>(
    () =>
      unfilteredGroups.map((g) => ({
        jurisdiction: g.jurisdiction,
        label: g.label,
        ruleCount: g.ruleCount,
        reviewCount: g.pendingReviewCount,
      })),
    [unfilteredGroups],
  )
  // Overview "Where to start" + sharpened-stat data — all from already-wired
  // sources, no new fiction.
  //   topReviewJurisdictions — backlog ranked by pending count (the drill-in).
  //   gappedJurisdictions    — entity-coverage gaps (the coverage module; only
  //                            shows teeth when something is actually uncovered).
  //   highSeverityPending    — high-risk rules awaiting review ("review first").
  const topReviewJurisdictions = useMemo(() => {
    // Per-jurisdiction triage meta from the pending rules: how many are
    // high-severity, and the oldest one's timestamp (drives "Nd waiting" +
    // the urgency sort).
    const meta = new Map<string, { high: number; oldest: number | null }>()
    for (const r of rules) {
      if (r.status !== 'candidate' && r.status !== 'pending_review') continue
      const cur = meta.get(r.jurisdiction) ?? { high: 0, oldest: null }
      if (r.riskLevel === 'high') cur.high += 1
      const changed = ruleChangedAt(r)
      if (changed !== null && (cur.oldest === null || changed < cur.oldest)) cur.oldest = changed
      meta.set(r.jurisdiction, cur)
    }
    return (
      unfilteredGroups
        .filter((g) => g.pendingReviewCount > 0)
        .map((g) => {
          const m = meta.get(g.jurisdiction)
          return {
            jurisdiction: g.jurisdiction,
            label: g.label,
            pendingReviewCount: g.pendingReviewCount,
            highCount: m?.high ?? 0,
            oldest: m?.oldest ?? null,
          }
        })
        // Most urgent first = longest-waiting (oldest pending); ties broken by
        // the bigger backlog, so when everything was seeded the same day the
        // ranking still reads most-pending-first, not alphabetical.
        .toSorted(
          (a, b) =>
            (a.oldest ?? Infinity) - (b.oldest ?? Infinity) ||
            b.pendingReviewCount - a.pendingReviewCount,
        )
        .slice(0, 6)
    )
  }, [unfilteredGroups, rules])
  const gappedJurisdictions = useMemo(
    () => unfilteredGroups.filter((g) => g.gapEntities.length > 0),
    [unfilteredGroups],
  )
  // High-severity count in the review backlog — drives the StatBand stat.
  const highSeverityPending = useMemo(() => {
    let n = 0
    for (const r of rules) {
      if (r.status !== 'candidate' && r.status !== 'pending_review') continue
      if (r.riskLevel === 'high') n += 1
    }
    return n
  }, [rules])

  const [railSearch, setRailSearch] = useState('')
  // Validate the URL param against real jurisdictions — an unknown
  // code falls back to the All overview rather than an empty pane.
  const activeJurisdiction = useMemo(
    () =>
      jurisdictionParam && unfilteredGroups.some((g) => g.jurisdiction === jurisdictionParam)
        ? jurisdictionParam
        : null,
    [jurisdictionParam, unfilteredGroups],
  )
  const selectedGroup = useMemo(
    () => unfilteredGroups.find((g) => g.jurisdiction === activeJurisdiction) ?? null,
    [unfilteredGroups, activeJurisdiction],
  )
  const selectedJurisdictionScope = useMemo<'review' | 'active' | 'missing'>(() => {
    if (activeScope === 'missing') return 'missing'
    if (activeScope === 'active') return 'active'
    if (!selectedGroup) return 'active'
    if (activeScope === 'review' && selectedGroup.pendingReviewCount > 0) return 'review'
    return selectedGroup.pendingReviewCount > 0 ? 'review' : 'active'
  }, [activeScope, selectedGroup])
  const selectJurisdiction = useCallback(
    (jurisdiction: string | null) => {
      void setJurisdiction(jurisdiction)
      if (!jurisdiction) {
        void setScope(null)
        return
      }
      const nextGroup = unfilteredGroups.find((group) => group.jurisdiction === jurisdiction)
      void setScope(nextGroup && nextGroup.pendingReviewCount === 0 ? 'active' : 'review')
    },
    [setJurisdiction, setScope, unfilteredGroups],
  )
  const setJurisdictionScope = useCallback(
    (next: RuleScope) => {
      if (next === 'review' && selectedGroup?.pendingReviewCount === 0) {
        void setScope('active')
        return
      }
      void setScope(next === 'all' ? null : next)
    },
    [selectedGroup, setScope],
  )
  // oJL8o facet-filter state (Type / Severity / sort). Ephemeral, not
  // URL-bound; reset whenever the selected jurisdiction changes so the
  // chips never carry stale selections between states.
  const [tableFilter, setTableFilter] = useState<RuleTableFilter>(EMPTY_RULE_TABLE_FILTER)
  useEffect(() => {
    setTableFilter(EMPTY_RULE_TABLE_FILTER)
  }, [activeJurisdiction])
  // Rules for the selected jurisdiction's flat table — filtered by the
  // active scope (active/review/archived) + entity + rule search.
  // 'missing' scope shows gap rows only (handled in the render).
  const jurisdictionTableRules = useMemo(() => {
    if (!selectedGroup || selectedJurisdictionScope === 'missing') return []
    let result = selectedGroup.rules
    if (activeEntity) result = result.filter((r) => r.entityApplicability.includes(activeEntity))
    // Jurisdiction view carries only the two working states: Review and
    // Active. When a state is opened without an explicit working scope,
    // prefer Review if there is pending work; otherwise fall back to Active.
    if (selectedJurisdictionScope === 'review') {
      result = result.filter((r) => statusGroupOf(r.status) === 'needs_review')
    } else {
      result = result.filter((r) => r.status === 'active' || r.status === 'verified')
    }
    const q = (search ?? '').trim().toLowerCase()
    if (q) {
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.formName.toLowerCase().includes(q) ||
          r.taxType.toLowerCase().includes(q),
      )
    }
    // oJL8o filter bar — Type / Severity multi-select, Modified / Effective
    // sort. Applied after scope/entity/search so the facet chips narrow the
    // already-scoped set.
    if (tableFilter.types.size > 0) {
      result = result.filter((r) => tableFilter.types.has(r.taxType))
    }
    if (tableFilter.severities.size > 0) {
      result = result.filter((r) => tableFilter.severities.has(r.riskLevel))
    }
    if (tableFilter.sort) {
      const { field, dir } = tableFilter.sort
      const stamp = (r: ObligationRule) =>
        field === 'modified'
          ? r.reviewedAt
            ? Date.parse(r.reviewedAt)
            : 0
          : Date.parse(r.verifiedAt)
      return [...result].toSorted((a, b) =>
        dir === 'desc' ? stamp(b) - stamp(a) : stamp(a) - stamp(b),
      )
    }
    return result.toSorted(compareByStatusGroupPriority)
  }, [selectedGroup, selectedJurisdictionScope, activeEntity, search, tableFilter])
  // Distinct tax-type options for the selected jurisdiction's Type filter.
  const jurisdictionTypeOptions = useMemo(() => {
    if (!selectedGroup) return []
    const counts = new Map<string, number>()
    for (const rule of selectedGroup.rules) {
      counts.set(rule.taxType, (counts.get(rule.taxType) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        label: formatRuleTypeLabel(value, selectedGroup.jurisdiction),
        count,
      }))
      .toSorted((a, b) => a.label.localeCompare(b.label))
  }, [selectedGroup])
  // Scoped progress-bar status counts for the selected jurisdiction.
  const jurisdictionStatusCounts = useMemo<Record<RuleStatus, number> | null>(() => {
    if (!selectedGroup) return null
    const counts: Record<RuleStatus, number> = {
      active: 0,
      verified: 0,
      pending_review: 0,
      candidate: 0,
      rejected: 0,
      archived: 0,
      deprecated: 0,
    }
    for (const rule of selectedGroup.rules) counts[rule.status] += 1
    return counts
  }, [selectedGroup])
  // Per-jurisdiction scope-tab counts (stable across tab toggles).
  const jurisdictionTabCounts = useMemo(() => {
    if (!selectedGroup || !jurisdictionStatusCounts) return null
    return {
      all: selectedGroup.ruleCount,
      active: jurisdictionStatusCounts.active + jurisdictionStatusCounts.verified,
      review: selectedGroup.pendingReviewCount,
      archived: jurisdictionStatusCounts.archived + jurisdictionStatusCounts.deprecated,
      missing: selectedGroup.gapEntities.length,
    }
  }, [selectedGroup, jurisdictionStatusCounts])

  // Expansion state — local to the page. Start collapsed and reset to
  // collapsed when the available jurisdiction set changes.
  const [expanded, setExpanded] = useState<Set<RuleJurisdiction>>(() => defaultExpandedSet())
  // Re-init when groups change (e.g., data loaded after the first render).
  // We use a JSON shape of the jurisdiction list so we only re-init
  // when the SET of jurisdictions changes, not on every data refetch.
  const jurisdictionFingerprint = useMemo(
    () =>
      groups
        .map((g) => g.jurisdiction)
        .toSorted()
        .join(','),
    [groups],
  )
  // useMemo on the fingerprint gives us a single re-init point.
  useMemo(() => {
    const visibleJurisdictions = new Set(
      jurisdictionFingerprint
        .split(',')
        .filter((value): value is RuleJurisdiction => value.length > 0),
    )
    setExpanded(() => {
      const next = defaultExpandedSet()
      for (const jurisdiction of autoExpandAfterBatchRef.current) {
        if (visibleJurisdictions.has(jurisdiction)) next.add(jurisdiction)
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [jurisdictionFingerprint])

  const toggleGroup = useCallback((jur: RuleJurisdiction) => {
    autoExpandAfterBatchRef.current.delete(jur)
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(jur)) next.delete(jur)
      else next.add(jur)
      return next
    })
  }, [])

  // Filter rules across all groups by search query. Honors the
  // entity filter too — search inside the active entity scope.
  const searchLower = (search ?? '').trim().toLowerCase()
  const matchedRules = useMemo(() => {
    if (!searchLower) return []
    return filteredRules.filter((rule) => {
      if (rule.title.toLowerCase().includes(searchLower)) return true
      if (rule.formName.toLowerCase().includes(searchLower)) return true
      if (jurisdictionLabel(rule.jurisdiction).toLowerCase().includes(searchLower)) return true
      if (rule.taxType.toLowerCase().includes(searchLower)) return true
      return false
    })
  }, [filteredRules, searchLower])

  const selectedRule = useMemo(
    () => (ruleId ? (rules.find((r) => r.id === ruleId) ?? null) : null),
    [ruleId, rules],
  )
  const concreteDraftInputs = useMemo(() => {
    const seen = new Set<string>()
    const inputs: RuleConcreteDraftTarget[] = []
    for (const rule of rules) {
      const target = concreteDraftTargetForRule(rule)
      if (!target) continue
      const key = concreteDraftTargetKey(target)
      if (seen.has(key)) continue
      seen.add(key)
      inputs.push(target)
    }
    return inputs
  }, [rules])
  const concreteDraftsQuery = useQuery({
    ...orpc.rules.listConcreteDrafts.queryOptions({ input: { rules: concreteDraftInputs } }),
    enabled: concreteDraftInputs.length > 0,
  })
  const concreteDraftSessionCacheRef = useRef(new Map<string, RuleConcreteDraftCacheEntry>())
  const concreteDraftByTarget = useMemo(() => {
    const map = new Map(concreteDraftSessionCacheRef.current)
    for (const entry of concreteDraftsQuery.data ?? []) {
      const key = concreteDraftTargetKey(entry)
      map.set(key, entry)
      concreteDraftSessionCacheRef.current.set(key, entry)
    }
    return map
  }, [concreteDraftsQuery.data])
  const selectedConcreteDraft = useMemo(() => {
    if (!selectedRule) return null
    const target = concreteDraftTargetForRule(selectedRule)
    return target ? (concreteDraftByTarget.get(concreteDraftTargetKey(target)) ?? null) : null
  }, [concreteDraftByTarget, selectedRule])

  const handleRuleClick = useCallback(
    (rule: ObligationRule) => {
      void setRuleId(rule.id)
    },
    [setRuleId],
  )

  // Recent-changes "View all changes" → the audit log, the canonical
  // full history of rule edits (Pencil O0pyRO `pyrzT`). The overview no
  // longer hosts a grouped table to filter, so the link points at the
  // real changes feed rather than a scope toggle.
  const navigate = useNavigate()
  const handleViewAllChanges = useCallback(() => {
    void navigate('/audit')
  }, [navigate])
  const handleMonitorSources = useCallback(() => {
    void navigate('/rules/sources')
  }, [navigate])

  // Toggle one rule's selection. Used by the row checkbox.
  const toggleRuleSelection = useCallback((id: string) => {
    setSelectedRuleIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Toggle ALL rules in a set at once. Used by:
  //   - section-header checkbox (select all needs-review in a state)
  //   - "Select all pending" mass action in the bulk-review bar
  //   - "Start review" header button (select-all-then-open)
  // If every id is already selected → unselect them. Otherwise add
  // them all. Matches the spreadsheet/email idiom for select-all.
  const toggleRulesSelection = useCallback((ids: readonly string[]) => {
    setSelectedRuleIds((current) => {
      const next = new Set(current)
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id))
      if (allSelected) {
        for (const id of ids) next.delete(id)
      } else {
        for (const id of ids) next.add(id)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedRuleIds(new Set())
  }, [])

  // All needs-review rule IDs across the whole catalog. Powers the
  // "Start review" header action (select-and-open) and the mass
  // "select all N" link inside the bulk-review bar.
  const allReviewableRuleIds = useMemo(
    () =>
      rules
        .filter((r) => r.status === 'candidate' || r.status === 'pending_review')
        .map((r) => r.id),
    [rules],
  )

  // How many pending rules are blocked behind an AI concrete draft — a
  // source-defined rule with no ready draft *cannot* be accepted yet (this is
  // the server's `source_defined_requires_ai_review` gate, computed here from
  // the same structural facts so the overview never contradicts the bulk
  // preview). Lets the entry say "generate drafts first" instead of implying
  // these are ready to accept. Non-source-defined rules and already-drafted
  // ones are not counted.
  const draftGatedPendingCount = useMemo(() => {
    let n = 0
    for (const rule of rules) {
      if (rule.status !== 'candidate' && rule.status !== 'pending_review') continue
      const target = concreteDraftTargetForRule(rule)
      if (!target) continue
      const entry = concreteDraftByTarget.get(concreteDraftTargetKey(target))
      if (!entry?.draft) n += 1
    }
    return n
  }, [rules, concreteDraftByTarget])

  // Ordered list of selected rules that are still in needs-review
  // status. Order matches the order rules appear in `rules` (which is
  // the catalog order — jurisdiction-grouped, then by title) so the
  // user reviews them in a predictable sequence inside the modal.
  // Filters to needs-review only — if a rule leaves needs-review
  // elsewhere in another tab, it falls out of the review queue.
  const selectedReviewRules = useMemo(() => {
    if (selectedRuleIds.size === 0) return []
    return rules.filter(
      (r) =>
        selectedRuleIds.has(r.id) && (r.status === 'candidate' || r.status === 'pending_review'),
    )
  }, [rules, selectedRuleIds])

  const _openBatchReview = useCallback(() => {
    if (selectedReviewRules.length === 0) return
    batchAcceptedRuleIdsRef.current = new Set()
    autoExpandAfterBatchRef.current = new Set()
    setBatchReviewRuleIds(selectedReviewRules.map((rule) => rule.id))
    setBatchReviewIndex(0)
    setBatchReviewDirty(false)
  }, [selectedReviewRules])

  const completedJurisdictionsForAcceptedBatch = useCallback(
    (acceptedRuleIds: ReadonlySet<string>) => {
      const completed = new Set<RuleJurisdiction>()
      if (acceptedRuleIds.size === 0) return completed
      for (const group of allCatalogGroups) {
        if (group.rules.length === 0 || group.gapEntities.length > 0) continue
        let acceptedRuleInGroup = false
        const fullyActiveAfterAccept = group.rules.every((rule) => {
          if (rule.status === 'active' || rule.status === 'verified') return true
          const acceptedInThisBatch =
            acceptedRuleIds.has(rule.id) && statusGroupOf(rule.status) === 'needs_review'
          if (acceptedInThisBatch) acceptedRuleInGroup = true
          return acceptedInThisBatch
        })
        if (acceptedRuleInGroup && fullyActiveAfterAccept) completed.add(group.jurisdiction)
      }
      return completed
    },
    [allCatalogGroups],
  )

  const refreshAfterBatchReview = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orpc.rules.listRules.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.rules.listReviewTasks.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.rules.listReviewDecisions.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.facets.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
  }, [queryClient])

  const finishBatchReview = useCallback(
    (shouldRefresh: boolean) => {
      if (shouldRefresh) {
        const completedJurisdictions = completedJurisdictionsForAcceptedBatch(
          batchAcceptedRuleIdsRef.current,
        )
        autoExpandAfterBatchRef.current = completedJurisdictions
        if (completedJurisdictions.size > 0) {
          setExpanded((current) => {
            const next = new Set(current)
            for (const jurisdiction of completedJurisdictions) next.add(jurisdiction)
            return next
          })
        }
        refreshAfterBatchReview()
      }
      batchAcceptedRuleIdsRef.current = new Set()
      setBatchReviewRuleIds(null)
      setBatchReviewIndex(null)
      setBatchReviewDirty(false)
    },
    [completedJurisdictionsForAcceptedBatch, refreshAfterBatchReview],
  )

  const closeBatchReview = useCallback(() => {
    finishBatchReview(batchReviewDirty)
  }, [batchReviewDirty, finishBatchReview])

  // Called when the user skips or finishes inside the modal. Finish
  // still refreshes the live Rule Library list so the user returns to
  // current data even when no accept mutation ran during the session.
  const advanceBatchReview = useCallback(() => {
    if (batchReviewIndex === null) return
    const next = batchReviewIndex + 1
    if (next >= (batchReviewRuleIds?.length ?? 0)) {
      finishBatchReview(true)
      return
    }
    setBatchReviewIndex(next)
  }, [batchReviewIndex, batchReviewRuleIds, finishBatchReview])

  const completeBatchReviewAction = useCallback(() => {
    if (batchReviewIndex === null) return
    const acceptedRuleId = batchReviewRuleIds?.[batchReviewIndex] ?? null
    if (acceptedRuleId) batchAcceptedRuleIdsRef.current.add(acceptedRuleId)
    const total = batchReviewRuleIds?.length ?? 0
    const next = batchReviewIndex + 1
    if (next >= total) {
      finishBatchReview(true)
      return
    }
    setBatchReviewDirty(true)
    setBatchReviewIndex(next)
  }, [batchReviewIndex, batchReviewRuleIds, finishBatchReview])

  const goBackBatchReview = useCallback(() => {
    setBatchReviewIndex((current) => {
      if (current === null || current === 0) return current
      return current - 1
    })
  }, [])

  // "+ Add rule" on a gap row opens the new-rule modal pre-filled
  // with that gap's jurisdiction and entity. Replaces the prior dead
  // navigate-to-hash that pointed at a `#new-rule` anchor that didn't
  // exist on the page.
  const handleAddRule = useCallback((group: JurisdictionGroup, entity: EntityKey) => {
    setNewRuleSeed({ jurisdiction: group.jurisdiction, entity })
  }, [])

  // Header "New rule" — opens the modal with no pre-fill.
  const openNewRule = useCallback(() => {
    setNewRuleSeed({})
  }, [])

  const closeNewRule = useCallback(() => {
    setNewRuleSeed(null)
  }, [])

  // Export — CSV of the loaded rules. Real download (no dead control):
  // one row per rule with the catalog's columns (jurisdiction, form,
  // status tier, applicable entities). Mirrors the pattern on
  // /alerts history (Blob + object URL + temp <a download>).
  const handleExport = useCallback(() => {
    if (rules.length === 0) return
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
    const header = ['Jurisdiction', 'Rule / Form', 'Status', 'Tier', 'Entities']
    const rows = rules.map((rule) =>
      [
        jurisdictionLabel(rule.jurisdiction),
        rule.title,
        STATUS_LABEL_SHORT[rule.status],
        tierLabels[rule.ruleTier],
        rule.entityApplicability.join('; '),
      ]
        .map((cell) => escape(cell))
        .join(','),
    )
    const csv = [header.map(escape).join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rules-coverage-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [rules, tierLabels])

  // Start the batch review queue with everything that's pending. The
  // header button is the "I just want to clear my review queue" path
  // (CPA opens the page, hits Start review, walks through 459 cards).
  const _startReviewAll = useCallback(() => {
    if (allReviewableRuleIds.length === 0) return
    batchAcceptedRuleIdsRef.current = new Set()
    autoExpandAfterBatchRef.current = new Set()
    setSelectedRuleIds(new Set(allReviewableRuleIds))
    setBatchReviewRuleIds(allReviewableRuleIds)
    setBatchReviewIndex(0)
    setBatchReviewDirty(false)
  }, [allReviewableRuleIds])

  // Header actions cluster — sits inline with the page title via the
  // shell's `actions` slot. Replaces the prior standalone PageActions
  // row (which left a ~48px dead zone between the title and the next
  // content block).
  const _reviewCount = allReviewableRuleIds.length
  const currentBatchReviewRuleId =
    batchReviewIndex === null ? null : (batchReviewRuleIds?.[batchReviewIndex] ?? null)
  const currentBatchReviewRule = currentBatchReviewRuleId
    ? (rulesById.get(currentBatchReviewRuleId) ?? null)
    : null
  // Sources + New rule live outside the overflow menu so the two most
  // frequent header actions are one-click. The ⋯ menu carries only Export
  // coverage (a rare, advanced operation that doesn't warrant chrome real
  // estate).
  //
  // Layout per scope:
  //   reviewCount > 0  → [⋯] [Sources] [+ New rule (outline)] [Start review N (primary)]
  //   reviewCount === 0 → [⋯] [Sources] [+ New rule (primary)]
  //
  // The header keeps a single primary CTA. When there's a review
  // queue Start review wins; otherwise New rule becomes primary so
  // the default catalog view never has zero primary actions.
  //
  // The header New rule CTA shows on every scope, including Missing, so a
  // CPA always has a global way to add a brand-new (unseeded) rule; the
  // gap-row prefilled `Add rule` action remains as a quicker path for the
  // specific row case.
  // Overview header actions (Pencil O0pyRO): pared down to Export +
  // Add new rule. The all-jurisdictions overview promotes the catalog
  // export (was buried in the ⋯ menu) and the create flow; review lives
  // in the ActionHero, sources in the rail. The fuller `headerActions`
  // set still drives the per-jurisdiction detail header.
  const overviewHeaderActions = (
    <>
      {/* Sources — moved off the jurisdiction rail to a header button
          (links to the standalone Sources view, with a live health dot +
          monitored count). */}
      <Button
        variant="outline"
        onClick={() => void navigate('/rules/sources')}
        aria-label={t`View monitored sources`}
      >
        <RssIcon data-icon="inline-start" />
        <Trans>Sources</Trans>
        {railSources ? (
          <span className="ml-0.5 inline-flex items-center gap-1.5">
            <PulsingDot
              tone={railSources.healthy ? 'success' : 'warning'}
              active={false}
              label={railSources.healthy ? t`All sources healthy` : t`Some sources need attention`}
            />
            <span className="tabular-nums text-text-tertiary">{railSources.count}</span>
          </span>
        ) : null}
      </Button>
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={rules.length === 0}
        aria-label={t`Export rules as CSV`}
      >
        <ArrowUpFromLineIcon data-icon="inline-start" />
        <Trans>Export</Trans>
      </Button>
      {/* Secondary, not primary: a global "Add rule" can't actually create
          a rule (custom rules need a jurisdiction+entity seed from a gap row
          or the rollover preview), so the dialog it opens is a signpost.
          Dressing a signpost as the page's primary CTA was the re-critique
          finding — the page's real primary action is reviewing the queue. */}
      <Button variant="outline" onClick={openNewRule}>
        <PlusIcon data-icon="inline-start" />
        <Trans>Add rule</Trans>
      </Button>
    </>
  )

  // Keyboard navigation across the rule grid. Power users running
  // hundreds of rules need J/K row nav + Enter/Esc/e for the same muscle
  // memory /deadlines exposes (see obligations.tsx `useAppHotkey('J'…)`).
  //
  // Focused row model: a flat list of focusable "rows" in document
  // order. Each row carries a stable id derived from its kind:
  //   - `group:<jurisdiction>`        — state header row
  //   - `rule:<id>`                   — rule row inside an expanded group
  //   - `gap:<jurisdiction>:<entity>` — coverage-gap row inside an expanded group
  //
  // J/K advance through this flat list. Enter dispatches per kind
  // (toggle expand / open rule detail / open new-rule modal seeded
  // with the gap). Esc closes the rule-detail Dialog if open, otherwise
  // clears the focused row. `e` toggles expand/collapse on the focused
  // state group. Search results table is keyboard-navigable via the
  // same model (its rules feed a `rule:<id>` list — no groups).
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null)
  const shortcutsBlocked = useKeyboardShortcutsBlocked()

  // Flat list of focusable row ids in document order. Recomputed when
  // the visible rows change (search results / scope filter / expanded
  // set). Kept as a memoized array so J/K's findIndex stays O(N) with
  // N capped at the visible row count.
  const focusableRowIds = useMemo<string[]>(() => {
    const ids: string[] = []
    if (isSearching) {
      for (const rule of matchedRules) ids.push(`rule:${rule.id}`)
      return ids
    }
    for (const group of groups) {
      ids.push(`group:${group.jurisdiction}`)
      if (!expanded.has(group.jurisdiction)) continue
      for (const rule of group.rules) ids.push(`rule:${rule.id}`)
      for (const entity of group.gapEntities) {
        ids.push(`gap:${group.jurisdiction}:${entity}`)
      }
    }
    return ids
  }, [isSearching, matchedRules, groups, expanded])

  // Clamp the focused row when it falls outside the visible set — a
  // common case after toggling scope tabs or running a search that
  // removes the previously focused row. Without this, J/K start from
  // a phantom anchor and the first press feels broken.
  useEffect(() => {
    if (focusedRowId !== null && !focusableRowIds.includes(focusedRowId)) {
      setFocusedRowId(null)
    }
  }, [focusedRowId, focusableRowIds])

  const moveFocusedRow = useCallback(
    (direction: 1 | -1) => {
      if (focusableRowIds.length === 0) return
      const currentIndex = focusedRowId ? focusableRowIds.indexOf(focusedRowId) : -1
      const nextIndex =
        currentIndex === -1
          ? 0
          : Math.min(focusableRowIds.length - 1, Math.max(0, currentIndex + direction))
      const nextId = focusableRowIds[nextIndex] ?? null
      setFocusedRowId(nextId)
    },
    [focusableRowIds, focusedRowId],
  )

  // Disambiguate a focused row id into the underlying domain object.
  // Returns `null` for ids that don't resolve (stale id, race against
  // data refetch). Memoized on `focusedRowId` + the lookup tables so
  // re-renders don't reshape the resolved record needlessly.
  const focusedRowKind = focusedRowId?.split(':')[0] ?? null
  const focusedRule = useMemo(() => {
    if (focusedRowKind !== 'rule' || !focusedRowId) return null
    const id = focusedRowId.slice('rule:'.length)
    return rulesById.get(id) ?? null
  }, [focusedRowKind, focusedRowId, rulesById])
  const focusedGroupJur = useMemo<RuleJurisdiction | null>(() => {
    if (focusedRowKind !== 'group' || !focusedRowId) return null
    // Validate against the live group list rather than blindly
    // casting an arbitrary string slice — keeps the resolved value
    // honest (typed match wins over `as RuleJurisdiction`).
    const candidate = focusedRowId.slice('group:'.length)
    return groups.find((g) => g.jurisdiction === candidate)?.jurisdiction ?? null
  }, [focusedRowKind, focusedRowId, groups])
  const focusedGap = useMemo<{ group: JurisdictionGroup; entity: EntityKey } | null>(() => {
    if (focusedRowKind !== 'gap' || !focusedRowId) return null
    const rest = focusedRowId.slice('gap:'.length)
    const sep = rest.lastIndexOf(':')
    if (sep === -1) return null
    const jurCandidate = rest.slice(0, sep)
    const entityCandidate = rest.slice(sep + 1)
    const group = groups.find((g) => g.jurisdiction === jurCandidate)
    if (!group) return null
    const entity = ENTITY_KEYS.find((key) => key === entityCandidate)
    if (!entity) return null
    return { group, entity }
  }, [focusedRowKind, focusedRowId, groups])

  // J/K row navigation — mirrors /deadlines convention. `requireReset`
  // matches obligations.tsx so the hotkey doesn't repeat-fire on hold.
  const keyboardEnabled = focusableRowIds.length > 0 && !shortcutsBlocked
  useAppHotkey('J', () => moveFocusedRow(1), {
    enabled: keyboardEnabled,
    requireReset: true,
    meta: {
      id: 'rules.library.next-row',
      name: 'Next row',
      description: 'Move the focused Rule library row down.',
      category: 'rules',
      scope: 'route',
    },
  })
  useAppHotkey('K', () => moveFocusedRow(-1), {
    enabled: keyboardEnabled,
    requireReset: true,
    meta: {
      id: 'rules.library.previous-row',
      name: 'Previous row',
      description: 'Move the focused Rule library row up.',
      category: 'rules',
      scope: 'route',
    },
  })

  // Enter — context-sensitive open. Toggles expand on a state group,
  // opens the rule-detail Dialog on a rule, opens the new-rule modal
  // seeded with the gap when a gap row is focused.
  useAppHotkey(
    'Enter',
    (event) => {
      if (isInteractiveEventTarget(event.target)) return
      if (!focusedRowId) return
      if (focusedGroupJur) {
        toggleGroup(focusedGroupJur)
        return
      }
      if (focusedRule) {
        handleRuleClick(focusedRule)
        return
      }
      if (focusedGap) {
        handleAddRule(focusedGap.group, focusedGap.entity)
      }
    },
    {
      enabled: keyboardEnabled,
      requireReset: true,
      meta: {
        id: 'rules.library.open',
        name: 'Open focused row',
        description: 'Expand the group / open the rule detail / start the gap fix.',
        category: 'rules',
        scope: 'route',
      },
    },
  )

  // `e` toggles expand/collapse on the focused state group. Per the
  // /critique recommendation — `e` is the muscle memory other tree-y
  // surfaces use. No-op when the focused row isn't a group (so a
  // user reading rule rows doesn't accidentally collapse the parent).
  useAppHotkey(
    'E',
    (event) => {
      if (isInteractiveEventTarget(event.target)) return
      if (!focusedGroupJur) return
      toggleGroup(focusedGroupJur)
    },
    {
      enabled: keyboardEnabled,
      requireReset: true,
      meta: {
        id: 'rules.library.toggle-group',
        name: 'Expand or collapse group',
        description: 'Toggle the focused state group.',
        category: 'rules',
        scope: 'route',
      },
    },
  )

  // Esc — close the rule-detail Dialog if open, otherwise clear the
  // focused row. Mirror of /deadlines' Esc behavior (closes the queue
  // drawer or clears the focused row). `conflictBehavior: 'allow'`
  // because the Dialog primitive owns its own Escape handler — we
  // only want to fire when neither is open.
  useAppHotkey(
    'Escape',
    () => {
      if (ruleId) {
        void setRuleId(null)
        return
      }
      if (focusedRowId) {
        setFocusedRowId(null)
      }
    },
    {
      enabled: !shortcutsBlocked,
      requireReset: true,
      conflictBehavior: 'allow',
      meta: {
        id: 'rules.library.dismiss',
        name: 'Close drawer or clear focus',
        description: 'Close the rule detail Dialog or clear the focused row.',
        category: 'rules',
        scope: 'route',
      },
    },
  )

  // After all hooks have run, swap legacy URLs in place. Returning
  // <Navigate replace /> avoids dirtying history with the old shape.
  if (normalizedSearch !== null) {
    return (
      <Navigate
        replace
        to={{ pathname: location.pathname, search: normalizedSearch, hash: location.hash }}
      />
    )
  }

  // Overview stats band (Pencil O0pyRO `p0WeNy`) — extracted so it renders
  // identically whether it sits below the Recent changes feed (queue has
  // work) or below the "all caught up" card (queue clear).
  // Decision-oriented stat band (Yuqi): drop the static vanity figures
  // (Jurisdictions, Changed-30d — the totals already live in the page
  // subtitle) for stats that drive the CPA's next move — the backlog, what's
  // high-risk, coverage health, and one Total anchor.
  const overviewStats = [
    {
      key: 'pending',
      label: t`Pending review`,
      value: totalPendingReview,
      sub: oldestReviewRelative ? t`oldest ${oldestReviewRelative}` : t`Queue clear`,
      // 2026-06-16 (audit): StatBand values stay neutral; tone lives in the
      // sub, matching the /clients grammar (neutral value · colored caption).
      subClass: totalPendingReview > 0 ? 'text-text-warning' : 'text-text-success',
    },
    {
      key: 'high-severity',
      label: t`High-severity`,
      value: highSeverityPending,
      sub: highSeverityPending > 0 ? t`Review these first` : t`None awaiting`,
      subClass: highSeverityPending > 0 ? 'text-text-warning' : 'text-text-tertiary',
    },
    {
      key: 'coverage',
      label: t`Coverage`,
      value: t`${coveragePct}%`,
      sub:
        gappedJurisdictions.length > 0
          ? t`${gappedJurisdictions.length} with gaps`
          : t`Full coverage`,
      subClass: coveragePct < 100 ? 'text-text-warning' : 'text-text-success',
    },
    {
      key: 'total',
      label: t`Total rules`,
      value: totalRules,
      sub: t`${totalActive} active`,
      subClass: 'text-text-accent',
    },
  ]

  return (
    // The rule library uses the canonical sticky-footer + table-card +
    // independent-scroll mechanism that /deadlines + /alerts + /clients
    // run. PageHeader + progress bar + scope tabs + search + entity chips
    // stay pinned above; only the rule grid scrolls. `max-w-[1440px]` cap
    // so the jurisdiction + entity matrix has room to breathe at desktop.
    // Two-pane layout — a left States rail (the navigation axis) drives a
    // right detail pane. When a jurisdiction is selected the right pane
    // shows a flat per-state table + scoped header chips / progress /
    // entity stats; the "All jurisdictions" overview keeps the grouped +
    // paginated table. The rail is lg+ only — narrow viewports fall back to
    // the overview pane full-width.
    <div className={cn('flex w-full flex-col', 'xl:h-screen xl:overflow-hidden')}>
      {/* The jurisdiction rail is hoisted OUT of the centered max-w
          content container so it sits flush against the global app sidebar
          (full-height secondary sidebar, Pencil O0pyRO), rather than
          floating inside the padded right panel. The content padding +
          width cap live on the main column. */}
      <div className="flex min-h-0 flex-1">
        <JurisdictionRail
          items={railItems}
          totalRuleCount={totalRules}
          selected={activeJurisdiction}
          onSelect={selectJurisdiction}
          search={railSearch}
          onSearchChange={setRailSearch}
          temporary={railTemporary}
          // Narrower than the shared 380px ListRail default — jurisdiction
          // names ("District of Columbia" being the longest) + count fit
          // comfortably at 300px, giving the rule table more room.
          className="hidden w-[300px] lg:flex"
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Inner panel is centered + width-capped (like /today) so the
              overview reads as a focused dashboard with side breathing
              room, not an edge-to-edge wall. */}
          <div className="mx-auto flex min-h-0 w-full max-w-page-expanded flex-1 flex-col gap-8 px-4 pt-8 pb-0 md:px-8 md:pb-0">
            {selectedGroup ? (
              // Selected-jurisdiction header (Pencil O0pyRO `oJL8o`): a
              // sync/coverage eyebrow, the state name + mono code pill, and
              // Export + "Add <state> rule". The "back" affordance is the
              // rail's Overview row, so no breadcrumb. Per-status counts live
              // in the KPI strip below, not as title chips.
              <PageHeader
                eyebrow={
                  <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 tracking-normal normal-case">
                    <PulsingDot
                      tone={selectedGroup.pendingReviewCount > 0 ? 'warning' : 'success'}
                      label={
                        selectedGroup.pendingReviewCount > 0
                          ? t`Rules awaiting review`
                          : t`All rules reviewed`
                      }
                    />
                    <span className="text-xs font-medium text-text-tertiary">
                      <Plural value={selectedGroup.ruleCount} one="# rule" other="# rules" />
                    </span>
                    <span aria-hidden className="text-text-muted">
                      ·
                    </span>
                    <span className="text-xs font-medium text-text-tertiary">
                      {selectedGroup.pendingReviewCount > 0 ? (
                        <Trans>{selectedGroup.pendingReviewCount} pending review</Trans>
                      ) : (
                        <Trans>Queue clear</Trans>
                      )}
                    </span>
                  </span>
                }
                title={
                  <span className="inline-flex items-center gap-2.5">
                    {/* Canonical jurisdiction mark — the same StateBadge seal
                        the rail shows for the selected row, so the detail
                        header reads as the same identity (not a one-off
                        text pill). */}
                    <StateBadge code={selectedGroup.jurisdiction} size="sm" preview={false} />
                    <span>{selectedGroup.label}</span>
                  </span>
                }
                actions={
                  <>
                    <Button
                      variant="outline"
                      onClick={handleExport}
                      disabled={rules.length === 0}
                      aria-label={t`Export rules as CSV`}
                    >
                      <ArrowUpFromLineIcon data-icon="inline-start" />
                      <Trans>Export</Trans>
                    </Button>
                    <Button
                      onClick={() => setNewRuleSeed({ jurisdiction: selectedGroup.jurisdiction })}
                    >
                      <PlusIcon data-icon="inline-start" />
                      <Trans>Add {selectedGroup.label} rule</Trans>
                    </Button>
                  </>
                }
              />
            ) : (
              // Overview header (Pencil O0pyRO): a sentence-case "Live"
              // status eyebrow with a green sync dot, the "Rule library"
              // title + "N rules across M jurisdictions" subtitle, and a
              // lean two-button action cluster (Export + Add rule). The
              // catalog totals live in the subtitle + stats band below.
              <PageHeader
                title={<Trans>Rule library</Trans>}
                description={
                  !statsLoading ? (
                    <Trans>
                      {totalRules} rules across {jurisdictionCount} jurisdictions
                    </Trans>
                  ) : undefined
                }
                actions={overviewHeaderActions}
              />
            )}

            {/* Body. The Overview (no jurisdiction selected, not
              mid-search) is the clean Pencil O0pyRO dashboard — a
              borderless stats band + a full-width Recent changes feed,
              and nothing else. Drilling into a jurisdiction (or running a
              rule search) swaps in the working console: scoped KPI strip,
              progress meter, scope tabs, entity/search filters, and the
              rule table. */}
            {selectedGroup || isSearching ? (
              <>
                {/* KPI strip — 4-stat band (Total / Effective / Pending /
                  Deprecated) for the selected jurisdiction. */}
                {selectedGroup && jurisdictionStatusCounts ? (
                  <JurisdictionKpiStrip
                    total={selectedGroup.ruleCount}
                    effective={jurisdictionStatusCounts.active + jurisdictionStatusCounts.verified}
                    pending={selectedGroup.pendingReviewCount}
                    deprecated={
                      jurisdictionStatusCounts.archived + jurisdictionStatusCounts.deprecated
                    }
                    jurisdictionLabel={selectedGroup.label}
                  />
                ) : null}

                {selectedGroup ? (
                  // Selected jurisdiction → the oJL8o filter bar: status
                  // segmented + search + Type/Modified/Effective/Severity
                  // facet chips, all on shared design-system primitives. The
                  // completion meter is dropped (the KPI strip carries the
                  // status breakdown).
                  <JurisdictionFilterBar
                    jurisdictionLabel={selectedGroup.label}
                    scope={selectedJurisdictionScope === 'review' ? 'review' : 'active'}
                    onScopeChange={setJurisdictionScope}
                    search={search ?? ''}
                    onSearchChange={(next) => void setSearch(next || null)}
                    typeOptions={jurisdictionTypeOptions}
                    filter={tableFilter}
                    onFilterChange={setTableFilter}
                    reviewCount={selectedGroup.pendingReviewCount}
                    activeCount={
                      (jurisdictionStatusCounts?.active ?? 0) +
                      (jurisdictionStatusCounts?.verified ?? 0)
                    }
                  />
                ) : (
                  // Global rule search → scope tabs + entity chips + the
                  // collapsible search control (unchanged).
                  <>
                    <ScopeTabBand
                      activeScope={activeScope}
                      totalAll={jurisdictionTabCounts ? jurisdictionTabCounts.all : totalRules}
                      totalActive={
                        jurisdictionTabCounts ? jurisdictionTabCounts.active : totalActive
                      }
                      totalReview={
                        jurisdictionTabCounts ? jurisdictionTabCounts.review : totalPendingReview
                      }
                      totalArchived={
                        jurisdictionTabCounts ? jurisdictionTabCounts.archived : totalArchived
                      }
                      totalMissing={
                        jurisdictionTabCounts ? jurisdictionTabCounts.missing : totalGapEntities
                      }
                      onChange={(next) => void setScope(next === 'all' ? null : next)}
                    />
                    <div className="flex shrink-0 items-center justify-between gap-3">
                      {statsLoading ? (
                        <EntityChipRowSkeleton />
                      ) : (
                        <EntityChipRow
                          entityStats={entityStats}
                          activeEntity={activeEntity}
                          onSelect={(entity) => void setEntityFilter(entity)}
                          onClear={() => void setEntityFilter(null)}
                        />
                      )}
                      <CollapsibleSearch
                        value={search ?? ''}
                        onChange={(next) => void setSearch(next || null)}
                        placeholder={t`Filter rules…`}
                        ariaLabel={t`Filter rules`}
                        collapsedLabel={t`Filter rules`}
                        hotkey="/"
                        hotkeyMeta={{
                          id: 'rules.library.focus-search',
                          name: 'Filter rules',
                          description: 'Focus the Rule library filter input.',
                          category: 'rules',
                          scope: 'route',
                        }}
                      />
                    </div>
                  </>
                )}

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                    {rulesQuery.isLoading || coverageQuery.isLoading ? (
                      <LoadingState />
                    ) : selectedGroup ? (
                      // Selected jurisdiction → flat per-state table.
                      <JurisdictionRuleTable
                        rules={jurisdictionTableRules}
                        jurisdictionLabel={selectedGroup.label}
                        gapEntities={selectedGroup.gapEntities}
                        scope={selectedJurisdictionScope}
                        showGaps={selectedJurisdictionScope === 'missing'}
                        tierLabels={tierLabels}
                        selectedRuleIds={selectedRuleIds}
                        onToggleRuleSelection={toggleRuleSelection}
                        onToggleRulesSelection={toggleRulesSelection}
                        focusedRowId={focusedRowId}
                        activeRuleId={ruleId}
                        onRuleClick={handleRuleClick}
                        onAddRule={(entity) =>
                          setNewRuleSeed({ jurisdiction: selectedGroup.jurisdiction, entity })
                        }
                      />
                    ) : (
                      // Active rule search → flat global results.
                      <SearchResultsTable
                        activeRuleId={ruleId}
                        rules={matchedRules}
                        query={searchLower}
                        onRuleClick={handleRuleClick}
                        focusedRowId={focusedRowId}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : // Overview (Pencil O0pyRO). Reads from the same wired `rules`
            // the jurisdiction tables consume; no banner, hero, status
            // card, scope tabs, or grouped table here.
            //
            //  - loading            → stats-band skeleton
            //  - queue clear (0 pending, `whr8M`) → "all caught up" card
            //    ABOVE the stats band (a clear queue reads as the reward)
            //  - otherwise (`O0pyRO`) → stats band ABOVE the flush Recent
            //    changes feed
            statsLoading ? (
              <StatBand loading stats={overviewStats} ariaLabel={t`Rule library summary`} />
            ) : totalPendingReview === 0 ? (
              <>
                <OverviewCaughtUpCard
                  lastReviewedRelative={lastReviewedRelative}
                  onViewDecisions={handleViewAllChanges}
                  onMonitorSources={handleMonitorSources}
                />
                <StatBand stats={overviewStats} ariaLabel={t`Rule library summary`} />
              </>
            ) : (
              <>
                {/* Review prompt — the counterpart to OverviewCaughtUpCard.
                    When the queue is NOT clear, tell the CPA plainly that
                    rules are waiting and give them a one-click way into the
                    bulk review (select all pending → open the review list). */}
                <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-divider-subtle bg-state-accent-hover px-4 py-3.5">
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background-default text-text-accent"
                  >
                    <EyeIcon className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-nav font-semibold text-text-primary">
                      <Plural
                        value={totalPendingReview}
                        one="# rule needs your review"
                        other="# rules need your review"
                      />
                    </p>
                    {/* Sets the real first step. When pending rules are gated
                        behind an AI draft, "review" starts with generating one
                        — say so rather than implying they're ready to accept.
                        (The oldest-waiting date is owned by the StatBand.) */}
                    <p className="truncate text-sm font-medium text-text-tertiary">
                      {draftGatedPendingCount === 0 ? (
                        <Trans>Review them before they affect client filings</Trans>
                      ) : draftGatedPendingCount >= totalPendingReview ? (
                        <Trans>Each needs an AI draft generated before it can be accepted</Trans>
                      ) : (
                        <Plural
                          value={draftGatedPendingCount}
                          one="# needs an AI draft before it can be accepted"
                          other="# need an AI draft before they can be accepted"
                        />
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      // Select EVERY rule awaiting review and open the bulk
                      // modal. The modal handles >BULK_ACCEPT_BATCH_MAX: Reject
                      // has no cap (acts on all), and the impact preview/Accept
                      // explain the per-batch ceiling there — so the entry never
                      // silently withholds rules from the batch.
                      setSelectedRuleIds(new Set(allReviewableRuleIds))
                      setBulkListOpen(true)
                    }}
                  >
                    <Trans>Start review</Trans>
                  </Button>
                </div>
                <StatBand stats={overviewStats} ariaLabel={t`Rule library summary`} />
                {/* "Where to start" — the backlog ranked + actionable. The
                    overview's primary lower-zone module (Yuqi #1/#4). */}
                <OverviewReviewBreakdown
                  jurisdictions={topReviewJurisdictions}
                  onSelectJurisdiction={selectJurisdiction}
                />
                {/* Coverage gaps — renders nothing unless something's uncovered. */}
                <OverviewCoverageGaps
                  jurisdictions={gappedJurisdictions}
                  onSelectJurisdiction={selectJurisdiction}
                />
                {/* Recent changes — only when the 30-day feed has entries, so an
                    empty window pivots to the breakdown above rather than
                    showing a dead empty card (Yuqi #3). */}
                {recentChanges.length > 0 ? (
                  <OverviewRecentChangesCard
                    rules={recentChanges}
                    changedTotal={changedLast30}
                    lastChangeAt={lastChangeAt}
                    onRuleClick={handleRuleClick}
                    onViewAll={handleViewAllChanges}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rule detail — when ?rule=X is set, render the rule detail
          Dialog. Portals out so it doesn't compete with the flex
          layout above. */}
      {selectedRule ? (
        <RuleDetailPanel
          rule={selectedRule}
          concreteDraft={selectedConcreteDraft}
          onClose={() => void setRuleId(null)}
        />
      ) : null}
      {/* Floating bulk-review bar — appears at the bottom of the
          viewport when ≥1 rule is selected. Stays visible while the
          user scrolls so they can launch the review modal at any
          time, then disappears when they clear or finish reviewing. */}
      {selectedReviewRules.length > 0 && !bulkListOpen ? (
        <BulkReviewBar
          count={selectedReviewRules.length}
          onReview={() => setBulkListOpen(true)}
          onClear={clearSelection}
        />
      ) : null}
      {/* Bulk-review list modal (Pencil `Oaey3`) — the default bulk surface:
          all selected rules in one list with per-row readiness flags +
          open-detail, a shared note, honest impact, and batch Accept/Reject. */}
      {bulkListOpen && selectedReviewRules.length > 0 ? (
        <BulkReviewListModal
          rules={selectedReviewRules}
          onClose={() => setBulkListOpen(false)}
          onOpenRule={(rule) => {
            setBulkListOpen(false)
            handleRuleClick(rule)
          }}
          onComplete={() => {
            setBulkListOpen(false)
            clearSelection()
          }}
        />
      ) : null}
      {/* Legacy one-at-a-time walkthrough (`BatchReviewModal`) — retained but
          no longer the default entry; `batchReviewIndex` stays null. */}
      {batchReviewIndex !== null && currentBatchReviewRule ? (
        <BatchReviewModal
          rule={currentBatchReviewRule}
          totalCount={batchReviewRuleIds?.length ?? 0}
          currentIndex={batchReviewIndex}
          concreteDraftByTarget={concreteDraftByTarget}
          concreteDraftLoading={concreteDraftsQuery.isFetching}
          onPrev={goBackBatchReview}
          onSkip={advanceBatchReview}
          onActionComplete={completeBatchReviewAction}
          onClose={closeBatchReview}
        />
      ) : null}
      {/* New-rule modal — opens from the header "New rule" button
          (no pre-fill) and from each gap row's "+ Add rule" button
          (pre-filled with the missing jurisdiction + entity). */}
      {newRuleSeed !== null ? <NewRuleModal seed={newRuleSeed} onClose={closeNewRule} /> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scope tabs band
// ---------------------------------------------------------------------------

// ScopeTabBand is the primary navigation axis — All / Active / Needs
// review / Missing. Rendered with the shared <Segmented> primitive (gray
// track + white active fill + count per option) — the SAME control /alerts,
// /alerts/history, /rules/sources and /rules/temporary use, so scope
// selection reads consistently across those surfaces.
//
// 2026-06-16 (audit): this comment previously claimed parity with /deadlines'
// ObligationQueueScopeTab (accent underline on a transparent bg) — that was
// FALSE; the two never matched. The real divergence is /deadlines (underline
// tabs) vs everything else (Segmented). Converging those is tracked as a
// dedicated follow-up; the comment is corrected here so it stops asserting a
// contract the code doesn't honor.
type ScopeKey = 'all' | 'active' | 'review' | 'archived' | 'missing'

function ScopeTabBand({
  activeScope,
  totalAll,
  totalActive,
  totalReview,
  totalArchived,
  totalMissing,
  onChange,
}: {
  activeScope: ScopeKey
  totalAll: number
  totalActive: number
  totalReview: number
  totalArchived: number
  totalMissing: number
  onChange: (scope: ScopeKey) => void
}) {
  const { t } = useLingui()
  // The Archive tab makes the band read All · Active · Requires review ·
  // Archive · Missing, matching the design's per-jurisdiction tabs.
  const tabs: Array<{ key: ScopeKey; label: string; count: number }> = [
    { key: 'all', label: t`All`, count: totalAll },
    { key: 'active', label: t`Active`, count: totalActive },
    { key: 'review', label: t`Requires review`, count: totalReview },
    { key: 'archived', label: t`Archive`, count: totalArchived },
    { key: 'missing', label: t`Missing`, count: totalMissing },
  ]
  // Uses the shared <Segmented> primitive so every single-select toggle in
  // the product reads the same. Counts ride inside each option's label as
  // a dimmed tabular-nums span.
  return (
    <Segmented<ScopeKey>
      value={activeScope}
      onValueChange={onChange}
      ariaLabel={t`Filter by scope`}
      options={tabs.map((tab) => ({
        value: tab.key,
        label: (
          <span className="flex items-center gap-1.5">
            <span>{tab.label}</span>
            <span className="tabular-nums text-text-tertiary">{tab.count}</span>
          </span>
        ),
      }))}
    />
  )
}

// Multi-color stacked bar — one segment per `RuleStatus` with >0 rules in
// the catalog (h-7 rounded-lg) — so the eye reads the actual catalog
// composition rather than collapsing everything into "active" vs
// "needs-review". Per-segment tone uses the canonical token already mapped
// to each status elsewhere in the file (`STATUS_TONE` + `EntityStateCell`).
// Segments hide their label below ~18 % width and fall back to a numeric
// count; the full breakdown lives in the title tooltip and aria-label.
type ProgressSegment = {
  status: RuleStatus
  count: number
  label: string
  /** Background color class. */
  bg: string
  /** Text color class, paired with `bg` for adequate contrast. */
  text: string
}

function _RuleReviewProgressBar(
  props:
    | { loading: true; statusCounts?: never }
    | { loading?: false; statusCounts: Record<RuleStatus, number> },
) {
  // The visible segment labels and the aria-label breakdown flow through
  // useLingui so non-EN firms see translated catalog progress.
  const { t } = useLingui()
  if (props.loading) {
    return <Skeleton className="h-7 w-full rounded-lg" />
  }
  const { statusCounts } = props
  // Order matches the catalog's lifecycle reading: green (done) →
  // blue (verified) → amber (in review) → neutral (candidate) →
  // red (rejected) → muted (archived / deprecated). Reading left to
  // right tells the maturity story.
  const SEGMENT_ORDER: readonly RuleStatus[] = [
    'active',
    'verified',
    'pending_review',
    'candidate',
    'rejected',
    'archived',
    'deprecated',
  ] as const
  const SEGMENT_LABEL: Record<RuleStatus, string> = {
    active: t`active`,
    verified: t`verified`,
    pending_review: t`need review`,
    candidate: t`candidate`,
    rejected: t`rejected`,
    archived: t`archived`,
    deprecated: t`deprecated`,
  }
  const SEGMENT_BG: Record<RuleStatus, string> = {
    active: 'bg-state-success-hover',
    verified: 'bg-state-accent-hover',
    // pending_review uses brown (`REVIEW_BG_TINT_CLS`), which reads as
    // "attention needed" without the alert energy of coral, and matches
    // the row progress bar + chip tone.
    pending_review: REVIEW_BG_TINT_CLS,
    candidate: 'bg-state-base-active',
    rejected: 'bg-state-destructive-hover',
    archived: 'bg-divider-regular',
    deprecated: 'bg-divider-regular',
  }
  const SEGMENT_TEXT: Record<RuleStatus, string> = {
    active: 'text-text-success',
    verified: 'text-text-accent',
    pending_review: REVIEW_TEXT_CLS,
    candidate: 'text-text-secondary',
    rejected: 'text-text-destructive',
    archived: 'text-text-tertiary',
    deprecated: 'text-text-tertiary',
  }
  const segments: ProgressSegment[] = SEGMENT_ORDER.flatMap((status) => {
    const count = statusCounts[status] ?? 0
    if (count <= 0) return []
    return [
      {
        status,
        count,
        label: SEGMENT_LABEL[status],
        bg: SEGMENT_BG[status],
        text: SEGMENT_TEXT[status],
      },
    ]
  })
  const total = segments.reduce((acc, s) => acc + s.count, 0)
  const breakdown = segments.map((s) => `${s.count} ${s.label}`).join(' · ')
  return (
    <div
      className="relative flex h-7 w-full overflow-hidden rounded-lg border border-divider-subtle bg-background-subtle"
      role="img"
      aria-label={total > 0 ? t`Rule catalog breakdown — ${breakdown}` : t`Empty rule catalog`}
      title={breakdown || undefined}
    >
      {segments.map((segment) => {
        const pct = total > 0 ? (segment.count / total) * 100 : 0
        const labelFits = pct >= 18
        return (
          <div
            key={segment.status}
            className={cn(
              'flex items-center overflow-hidden px-2 transition-[width] duration-300 motion-reduce:transition-none',
              segment.bg,
            )}
            style={{ width: `${pct}%` }}
          >
            {labelFits ? (
              <span className={cn('truncate text-xs font-medium tabular-nums', segment.text)}>
                {segment.count} {segment.label}
              </span>
            ) : (
              <span className={cn('truncate text-xs font-medium tabular-nums', segment.text)}>
                {segment.count}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// EntityChipRow — entity-filter chip strip. Each chip is a button:
// clicking applies an entity filter to the rules table below (and to
// search). Clicking the active chip (or "Clear") unsets it.
//
// Chips read unambiguously as filter buttons — discrete border, hover
// transitions in border + background + text color, a filled active state,
// and cursor:pointer (via <button>) — rather than saturated bars that
// imply data viz. Gap count shows as `· N missing` text only when N > 0;
// the label stays explicit because a bare red number is too easy to
// misread as a review queue count.
function EntityChipRow({
  entityStats,
  activeEntity,
  onSelect,
  onClear,
}: {
  entityStats: Array<{ entity: EntityKey; count: number; gapCount: number; reviewCount: number }>
  activeEntity: EntityKey | null
  onSelect: (entity: EntityKey) => void
  onClear: () => void
}) {
  const { t } = useLingui()
  return (
    <div className="flex flex-col gap-1.5">
      {/* No "FILTER BY ENTITY" eyebrow and no explicit Clear link — no
          other list page (/deadlines, /alerts, /clients) labels its filter
          chip row with an eyebrow; the chips carry the meaning. The active
          chip's dark-filled state IS the "this is selected" cue, and
          clicking it again clears the filter (the onClick toggles between
          onSelect and onClear). The group still has an aria-label below for
          accessibility. */}
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={t`Filter the rule table by entity`}
      >
        {entityStats.map(({ entity, count, gapCount }) => {
          const isActive = activeEntity === entity
          const hasGaps = gapCount > 0
          return (
            <ToggleChip
              key={entity}
              selected={isActive}
              onClick={() => (isActive ? onClear() : onSelect(entity))}
              title={
                hasGaps
                  ? `${ENTITY_LABELS[entity]} — ${count} ${count === 1 ? 'rule' : 'rules'} · ${gapCount} ${gapCount === 1 ? 'jurisdiction' : 'jurisdictions'} missing a rule`
                  : `${ENTITY_LABELS[entity]} — ${count} ${count === 1 ? 'rule' : 'rules'}`
              }
            >
              <span>{ENTITY_LABELS[entity]}</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  isActive ? 'text-text-accent' : 'text-text-primary',
                )}
              >
                {count}
              </span>
              {hasGaps ? (
                // Sub-figure showing how many jurisdictions are
                // missing a rule for this entity. Reads as `· 9 missing`
                // beside the main count. On the inactive chip it
                // takes the destructive tone (red on white — high
                // contrast). On the ACTIVE chip (dark background)
                // pure destructive red would lose contrast, so we
                // wrap the count in a small destructive pill that
                // stays legible against the dark fill while still
                // signaling "this is the gap count, not part of
                // the main number."
                <>
                  <span aria-hidden className="select-none text-text-tertiary">
                    ·
                  </span>
                  {/* With the active chip on a light accent tint (not a
                      dark fill), the destructive "missing" count reads as
                      plain destructive text in both active and inactive
                      states — no pill needed for contrast. */}
                  <span className="inline-flex items-center gap-1 font-medium tabular-nums text-text-destructive">
                    <span>{gapCount}</span>
                    <span className="font-normal">
                      <Trans>missing</Trans>
                    </span>
                  </span>
                  {/* sr-only text exposes the gap-jurisdiction detail for
                      screen-reader users — a `title` attribute is
                      mouse-only, so keyboard and touch users never see it. */}
                  <span className="sr-only">
                    {gapCount === 1
                      ? t`(${gapCount} jurisdiction missing a rule)`
                      : t`(${gapCount} jurisdictions missing a rule)`}
                  </span>
                </>
              ) : null}
            </ToggleChip>
          )
        })}
      </div>
    </div>
  )
}

function EntityChipRowSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-3 w-24" />
      <div className="flex flex-wrap items-center gap-1.5">
        {ENTITY_KEYS.map((entity) => (
          <Skeleton key={entity} className="h-7 w-24 rounded-full" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-divider-subtle p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

// RowNavHints — the kbd-strip surfaced in the grid toolbar so power users
// discover J/K + Enter + e without reading docs. Hidden on narrow viewports
// so the toolbar doesn't wrap onto two lines. Mirrors the `KeyboardHints`
// strip in the batch-review modal footer (same `KbdHint` primitive from
// `@/components/patterns/kbd`).
function RowNavHints() {
  return (
    <KbdHint
      className="hidden md:inline-flex"
      items={[
        { keys: ['J/K'], label: 'row' },
        { keys: ['↵'], label: 'open' },
        { keys: ['E'], label: 'expand' },
      ]}
    />
  )
}

// First-time empty state. Uses the canonical `EmptyState` primitive shared
// with /deadlines + /clients + /alerts; renders inside the table-card frame
// so the chrome stays consistent across full / empty states.
function _RulesLibraryEmptyState({ onNewRule }: { onNewRule: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={LibraryIcon}
        title={<Trans>Your rule catalog is empty.</Trans>}
        description={
          <Trans>
            Import from the federal/state sources we maintain, or write your first rule from
            scratch.
          </Trans>
        }
        cta={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" nativeButton={false} render={<Link to="/rules/sources" />}>
              <PlusIcon data-icon="inline-start" />
              <Trans>Import from sources</Trans>
            </Button>
            <Button variant="outline" size="sm" onClick={onNewRule}>
              <PlusIcon data-icon="inline-start" />
              <Trans>New rule</Trans>
            </Button>
          </div>
        }
        className="max-w-md border-0 bg-transparent"
      />
    </div>
  )
}

function _MissingRulesEmptyState({ onViewAll }: { onViewAll: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={CircleCheck}
        title={<Trans>No missing rules</Trans>}
        description={
          <Trans>
            Every applicable jurisdiction and entity already has a rule. Missing gaps will show an
            inline Add rule action when they appear.
          </Trans>
        }
        cta={
          <Button variant="outline" size="sm" onClick={onViewAll}>
            <Trans>View all rules</Trans>
          </Button>
        }
        className="max-w-md border-0 bg-transparent"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Grouped rules table — the main visualization
// ---------------------------------------------------------------------------

function _GroupedRulesTable({
  activeScope,
  activeRuleId,
  groups,
  expanded,
  onToggle,
  onExpandAll,
  onCollapseAll,
  onRuleClick,
  onAddRule,
  selectedRuleIds,
  onToggleRuleSelection,
  onToggleRulesSelection,
  focusedRowId,
  totalGroupCount,
  hasMoreGroups,
  onLoadMore,
}: {
  // The current scope (`all` / `active` / `review` / `missing`) is
  // threaded down so the per-jurisdiction sub-section headers ("NEEDS
  // REVIEW N" / "ACTIVE N") can be hidden when the scope already filters to
  // that one status — the label would just restate the scope tab.
  activeScope: ScopeKey
  // The URL `?rule=<id>` state — when set, the matching RuleTableRow paints
  // the accent-tint bg + 2px rail "drawer is on this row" treatment.
  activeRuleId: string | null
  groups: JurisdictionGroup[]
  expanded: Set<RuleJurisdiction>
  onToggle: (jur: RuleJurisdiction) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  onRuleClick: (rule: ObligationRule) => void
  onAddRule: (group: JurisdictionGroup, entity: EntityKey) => void
  selectedRuleIds: Set<string>
  onToggleRuleSelection: (id: string) => void
  onToggleRulesSelection: (ids: readonly string[]) => void
  // J/K keyboard nav threads the focused row id down so the matching
  // TableRow can paint a focus ring.
  focusedRowId: string | null
  // Total count for the toolbar "Showing N of M" copy, plus the hasMore
  // flag + onLoadMore handler used by the sentinel + fallback Load-more
  // button.
  totalGroupCount: number
  hasMoreGroups: boolean
  onLoadMore: () => void
}) {
  const { t } = useLingui()
  const tierLabels = useRuleTierLabels()
  const statusGroupLabels = useStatusGroupLabels()
  const someExpanded = expanded.size > 0
  // A ref-attached empty sentinel renders just below the last visible
  // group. When it scrolls into the viewport (root = null, the route's
  // overflow-y-auto wrapper happens to be the viewport's effective scroll
  // root since it spans the full remaining height), we call `onLoadMore`.
  // `rootMargin: '256px'` pre-fetches one viewport-ish ahead of the bottom
  // so the user never sees the spinner — by the time the sentinel is
  // on-screen the next batch has already painted.
  const loadMoreSentinelRef = useRef<HTMLTableRowElement | null>(null)
  useEffect(() => {
    if (!hasMoreGroups) return undefined
    const node = loadMoreSentinelRef.current
    if (!node) return undefined
    if (typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onLoadMore()
            break
          }
        }
      },
      { rootMargin: '256px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMoreGroups, onLoadMore, groups.length])
  return (
    // No outer card frame — the table sits directly on the page so it
    // doesn't compete with `RulesPageShell`'s existing scroll region.
    //
    // No `overflow-x-auto` wrapper either: it created a nested scroll
    // container that ate vertical wheel events whenever the cursor
    // was over the table (Chrome routes the wheel to the innermost
    // scrollable ancestor). Vertical scroll stopped working anywhere
    // over the rows. The trade-off was the page scrolling sideways
    // when the table was too wide — fixed instead by letting the
    // Rule column WRAP (see `whitespace-normal` override on rule
    // title cells). The table now shrinks to fit any viewport
    // without needing a horizontal scrollbar.
    // Page chrome aligned with /deadlines + /alerts + /today:
    //   - The Expand-all button lives in a toolbar row ABOVE the table
    //     (next to the jurisdiction count), not buried inside a header cell
    //     — a non-header control inside a header cell is a "what does this
    //     cell mean" problem.
    //   - Headers use the primitive defaults (`text-sm font-medium
    //     normal-case text-text-secondary`) so they read as column headers,
    //     not as a `text-caption-xs uppercase` meta label. Header BG is the
    //     primitive's `bg-background-subtle`.
    //   - The table uses the same shape as /deadlines (header bg-subtle,
    //     body bg-default, sm-medium headers); the RulesPageShell wrapper
    //     owns the page-level spacing.
    <div className="flex flex-col gap-3">
      {/* Toolbar row — jurisdiction count + keyboard hint cluster +
          Expand/Collapse-all button. Sits above the table so the button is
          discoverable as a table-level action, not a column-cell
          affordance. The keyboard hint strip surfaces the J/K + Enter + e
          contract; hidden on narrow screens (the toolbar would wrap
          otherwise) and on touch-only sessions via `sm:flex`, matching the
          `KeyboardHints` strip in the batch-review modal footer. */}
      {/* The toolbar uses `px-3` so its text starts at the same x as the
          table header cells (which inherit `px-3` from the TableHead
          primitive); a flush-left layout would park the toolbar text 12px
          to the LEFT of the first column header — a visible misalignment
          when scanning down from the jurisdiction count into the "Rule"
          column label. */}
      <div className="flex items-center justify-between gap-3 px-3 text-sm">
        <span className="text-text-secondary">
          {/* "Showing N of M jurisdictions" so the user understands the
              viewport is a window into a larger filtered set; the count
              grows in place as they scroll instead of changing pages.
              Single-batch mode collapses to the simpler "# jurisdictions"
              copy. */}
          {totalGroupCount > groups.length ? (
            <Trans>
              Showing {groups.length} of {totalGroupCount} jurisdictions
            </Trans>
          ) : (
            <Plural value={groups.length} one="# jurisdiction" other="# jurisdictions" />
          )}
        </span>
        <div className="flex items-center gap-3">
          <RowNavHints />
          <TextLink variant="quiet" size="sm" onClick={someExpanded ? onCollapseAll : onExpandAll}>
            {someExpanded ? <Trans>Collapse all</Trans> : <Trans>Expand all</Trans>}
          </TextLink>
        </div>
      </div>
      {/* Canonical workbench-table card frame (same recipe as /deadlines +
          /clients). The chrome lives on this outer div so the card wraps
          the table AND the pagination footer below as one cohesive rounded
          surface. */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-divider-subtle">
        <Table>
          {/* The sticky TableHeader needs a SOLID bg to keep body rows from
              bleeding through on scroll (an alpha bg shows row text behind
              the header). The canonical solid is `bg-background-section`,
              inherited from the primitive — no override needed. */}
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              {/* Column shrink ladder: Rule min-w-[260px] (protected
                  baseline); Form/Type w-[140px]; entity columns w-12
                  (48px minimal). */}
              <TableHead className="min-w-[260px]">
                <Trans>Rule</Trans>
              </TableHead>
              <TableHead className="hidden w-[140px] xl:table-cell">
                <Trans>Form</Trans>
              </TableHead>
              {ENTITY_KEYS.map((entity) => (
                <TableHead
                  key={entity}
                  title={ENTITY_FULL_LABELS[entity]}
                  className="w-12 px-2 text-center"
                >
                  {ENTITY_COLUMN_LABELS[entity]}
                </TableHead>
              ))}
              {/* No dedicated "Needs review" column — every row's chip
                would just repeat the header copy ("9 need review"). The
                pending-review count is folded into the Tier cell as a
                number-only chip next to the gap chip + progress bar. */}
              <TableHead className="hidden w-[140px] 2xl:table-cell">
                {/* The visible label is "Type", not "Tier" — "Tier"
                  implied a subscription tier, but the actual values
                  (Basic / Annual rolling / Exception / Applicability
                  review) describe rule KIND. Only the column label
                  changes; the internal RuleTier type + useRuleTierLabels
                  helper stay since they match the contract field name
                  `ruleTier`. `w-[140px]` floors the Type column so it
                  gives ground after Rule / Form when the viewport
                  narrows. */}
                <Trans>Type</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          {/* Zebra striping (`even:bg-background-section/40` on canonical
              TableRow) is opted OUT here. The library interleaves state
              group-header rows with rule data rows; zebra based on DOM
              position would tint state headers and rules inconsistently
              against their semantic role. Tier-tinted rows (needsReview,
              focused, isOpen) already supply per-row distinction. */}
          <TableBody className="[&_tr]:even:bg-transparent">
            {groups.map((group) => {
              const isExpanded = expanded.has(group.jurisdiction)
              return (
                <Fragment key={group.jurisdiction}>
                  {/* Group header row — spans all columns. Chevron +
                    name + count + entity coverage dots inline. */}
                  <GroupHeaderRow
                    group={group}
                    expanded={isExpanded}
                    onToggle={onToggle}
                    focused={focusedRowId === `group:${group.jurisdiction}`}
                  />
                  {/* Expanded — render rules grouped by status under
                    section headers (NEEDS REVIEW / ACTIVE / etc.),
                    then coverage gaps as their own section. The
                    section header replaces the per-rule Status
                    column. */}
                  {isExpanded ? (
                    <>
                      {STATUS_GROUP_ORDER.map((statusKey) => {
                        const rulesInGroup = group.rules.filter(
                          (r) => statusGroupOf(r.status) === statusKey,
                        )
                        if (rulesInGroup.length === 0) return null
                        const isReviewable = statusKey === 'needs_review'
                        // Compute tri-state for the section's select-all
                        // checkbox: all / some / none of this section's
                        // rules currently selected. Only needs-review
                        // sections get the checkbox; other sections can't
                        // be batch-reviewed.
                        const selectedInSection = isReviewable
                          ? rulesInGroup.filter((r) => selectedRuleIds.has(r.id)).length
                          : 0
                        const selectAllState: 'all' | 'some' | 'none' =
                          selectedInSection === 0
                            ? 'none'
                            : selectedInSection === rulesInGroup.length
                              ? 'all'
                              : 'some'
                        // When the scope tab already selects ONE status
                        // family, the sub-section header inside the
                        // jurisdiction would just restate it ("NEEDS REVIEW
                        // 10" under the Needs review scope). Hide the
                        // header row in that case; the rules still render
                        // inline beneath the jurisdiction title.
                        const hideSectionHeader =
                          (activeScope === 'review' && statusKey === 'needs_review') ||
                          (activeScope === 'active' && statusKey === 'active')
                        return (
                          <Fragment key={statusKey}>
                            {hideSectionHeader ? null : (
                              <StatusSectionHeaderRow
                                label={statusGroupLabels[statusKey]}
                                count={rulesInGroup.length}
                                statusKey={statusKey}
                                {...(isReviewable
                                  ? {
                                      selectAllState,
                                      onToggleSelectAll: () =>
                                        onToggleRulesSelection(rulesInGroup.map((r) => r.id)),
                                    }
                                  : {})}
                              />
                            )}
                            {rulesInGroup.map((rule) => (
                              <RuleTableRow
                                key={rule.id}
                                rule={rule}
                                tierLabels={tierLabels}
                                jurisdictionLabel={group.label}
                                selectable={isReviewable}
                                selected={selectedRuleIds.has(rule.id)}
                                isOpen={rule.id === activeRuleId}
                                focused={focusedRowId === `rule:${rule.id}`}
                                onSelectChange={() => onToggleRuleSelection(rule.id)}
                                onClick={onRuleClick}
                              />
                            ))}
                          </Fragment>
                        )
                      })}
                      {/* Coverage gaps section (its own sub-header) */}
                      {group.gapEntities.length > 0 ? (
                        <>
                          <StatusSectionHeaderRow
                            label={t`Missing rules`}
                            count={group.gapEntities.length}
                            statusKey="gaps"
                          />
                          {group.gapEntities.map((entity) => (
                            <GapTableRow
                              key={entity}
                              group={group}
                              entity={entity}
                              focused={focusedRowId === `gap:${group.jurisdiction}:${entity}`}
                              onAddRule={onAddRule}
                            />
                          ))}
                        </>
                      ) : null}
                      {/* Empty state inside an empty jurisdiction. */}
                      {group.rules.length === 0 && group.gapEntities.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={RULES_TABLE_COLUMN_COUNT}
                            className="py-3 text-center text-xs text-text-tertiary"
                          >
                            <Trans>No rules yet for {group.label}.</Trans>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </>
                  ) : null}
                </Fragment>
              )
            })}
            {/* The empty state isn't a table row — `RulesLibraryEmptyState`
              renders ABOVE this table when `groups.length === 0` (see the
              parent route). */}
            {/* An invisible TR holds the IntersectionObserver target so
                the observer fires inside the same scroll container the
                user is reading. Rendered ABOVE the fallback "Load more"
                row so observer-driven prefetch runs without ever showing
                the button on a healthy connection. */}
            {hasMoreGroups ? (
              <TableRow
                ref={loadMoreSentinelRef}
                aria-hidden
                className="h-1 border-0 hover:bg-transparent"
              >
                <TableCell colSpan={RULES_TABLE_COLUMN_COUNT} className="!p-0" />
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        {/* The IntersectionObserver above carries the common path; this
            "Load more" button is the explicit keyboard/touch-accessible
            fallback for users who don't auto-scroll (e.g. keyboard-only
            navigation with focus pinned in the toolbar). When
            `hasMoreGroups` is false, the entire footer disappears so the
            catalog's "last row" reads as a clean stop instead of a
            disabled chrome strip. */}
        {hasMoreGroups ? (
          <div className="flex shrink-0 flex-col items-center gap-1 border-t border-divider-subtle bg-background-default px-2 py-4">
            <Button variant="outline" size="sm" onClick={onLoadMore}>
              <Trans>Load more</Trans>
            </Button>
            <span className="text-caption tabular-nums text-text-tertiary">
              <Trans>
                {groups.length} of {totalGroupCount} loaded
              </Trans>
            </span>
          </div>
        ) : null}
      </div>
      {/* /card frame opened above the Table */}
    </div>
  )
}

function GroupHeaderRow({
  group,
  expanded,
  onToggle,
  focused,
}: {
  group: JurisdictionGroup
  expanded: boolean
  onToggle: (jur: RuleJurisdiction) => void
  // J/K nav lights up the focused row with a 2px accent inset rail
  // + matching subtle bg, mirroring /deadlines' focused-row
  // treatment.
  focused: boolean
}) {
  return (
    <TableRow
      className={cn(
        // State row: NO gray background (per user feedback —
        // "don't like state header to be gray"). Anchors by
        // typography (bigger semibold name) alone.
        //
        // A 2px deep top border paints over the previous row's faint
        // `border-b divider-subtle`. The combined ~2.5px solid line
        // gives a clear visual break between an expanded jurisdiction's
        // rule rows and the NEXT jurisdiction header, so the eye can find
        // the next state at a glance even after a long scroll-through of
        // expanded rules. The first GroupHeaderRow in the table doesn't
        // need the top border (no preceding content to separate from),
        // but rendering it there is harmless — the sticky TableHeader
        // sits above it anyway. `border-t-2 border-divider-deep` lands at
        // deep-gray (#171717 / 0.14 alpha) rather than pulling the page
        // tint; it has to win against the rule row's border-b without
        // competing with row text.
        'h-14 cursor-pointer border-t-2 border-divider-deep',
        focused && 'bg-state-base-hover shadow-[inset_2px_0_0_var(--color-state-accent-solid)]',
      )}
      onClick={() => onToggle(group.jurisdiction)}
      data-state={expanded ? 'expanded' : 'collapsed'}
    >
      {/* State row layout:
          - Cell 1 (Rule column): identity — chevron + state badge +
            full name + rule count.
          - Cell 2 (Form column): unique rule count for this
            jurisdiction. Expanded rule rows use the same column for
            the concrete form/rule name.
          - Cells 3-9: per-entity overview via EntityStateCell —
            plain count of rules for that entity in this state.
          - Cell 10 (Tier column): attention badges + status bar. */}
      <TableCell
        className="py-2"
        title={`${group.label} — ${group.ruleCount} rule${group.ruleCount === 1 ? '' : 's'}. Expand to see the breakdown.`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ChevronRightIcon
            className={cn(
              'size-3.5 shrink-0 text-text-tertiary transition-transform',
              expanded && 'rotate-90',
            )}
            aria-hidden
          />
          {/* The pill uses `border-divider-deep` (14% alpha), not
              `border-divider-subtle` (4%) which is too faint to read as
              a contained pill — the deeper border actually defines the
              chip. */}
          {/* No SVG StateBadge in the jurisdiction header pill — the
              bordered pill alone carries the identity. */}
          <span className="inline-flex items-center rounded-lg border border-divider-deep bg-background-subtle px-1.5 py-0.5">
            <span className="text-caption-xs uppercase tracking-wider text-text-secondary">
              {group.jurisdiction}
            </span>
          </span>
          <span className="text-base font-semibold text-text-primary">{group.label}</span>
          <span className="text-xs tabular-nums text-text-tertiary">
            <Plural value={group.ruleCount} one="# rule" other="# rules" />
          </span>
        </div>
      </TableCell>
      {/* Form column on the state row: unique rule count, not the
          per-entity applicability-slot total. Hidden below xl to match
          the header (frees width for the Rule + entity matrix). */}
      <TableCell className="hidden py-2 xl:table-cell">
        <span className="text-sm font-medium tabular-nums text-text-primary">
          {group.ruleCount}
        </span>
      </TableCell>
      {/* Per-entity overview cells — one per ENTITY_KEY. Plain
          count, no icon, no color tint. */}
      {ENTITY_KEYS.map((entity) => {
        const isNA = group.sourceCoverage?.[entity] === 'not_applicable'
        const state: CoverageState = isNA ? 'not_applicable' : (group.coverage?.[entity] ?? 'none')
        return (
          <TableCell key={entity} className="py-2 px-2 text-center">
            <EntityStateCell
              count={group.entityCounts[entity]}
              pendingReviewCount={group.entityPendingReviewCounts[entity]}
              state={state}
            />
          </TableCell>
        )
      })}
      <TableCell className="hidden py-2 2xl:table-cell">
        {/* The per-row count sits to the RIGHT of the progress bar. The
            bar paints active (green) LEFT → review RIGHT; positioning the
            count after the bar spatially anchors the number to the side
            of the bar it represents. The chip tone is brown (sienna text
            + mustard dot) so every "needs review" indicator on the page
            shares one color — matching the top progress bar's review
            segment and the row-bar's review segment. The progress bar +
            count sit at the LEFT edge of the Tier cell, matching the Type
            label's left edge in rule rows below, so the two visuals
            (progress bar above + Type label below) read as one stacked
            column on the same vertical line. */}
        <div className="flex items-center gap-3">
          <CountDotChip
            count={group.gapEntities.length}
            tone="destructive"
            minWidth="120px"
            label={<Plural value={group.gapEntities.length} one="# missing" other="# missing" />}
          />
          <RuleStatusBar rules={group.rules} />
          {/* The trailing count slot has a fixed width so 1-, 2-, and
              3-digit values keep their right edge aligned across rows.
              `tabular-nums` handles digit-glyph widths, but the dot + gap
              span would shift horizontally without a width floor. The
              outer `w-9 justify-end` wrapper keeps the chip's right edge
              stable so progress bars above the count line up cleanly
              column-by-column. Needs-review rows use review tone;
              fully-active rows use success tone instead of leaving the
              slot empty. */}
          <span className="inline-flex w-9 justify-end">
            {group.pendingReviewCount > 0 ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
                  REVIEW_TEXT_CLS,
                )}
                title={`${group.pendingReviewCount} need review`}
              >
                <span
                  aria-hidden
                  className={cn('inline-block size-1.5 shrink-0 rounded-full', REVIEW_DOT_CLS)}
                />
                {group.pendingReviewCount}
              </span>
            ) : group.isFullyActive ? (
              <span
                className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-text-success"
                title={`${group.ruleCount} active`}
              >
                <span
                  aria-hidden
                  className="inline-block size-1.5 shrink-0 rounded-full bg-state-success-solid"
                />
                {group.ruleCount}
              </span>
            ) : null}
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}

function RuleTableRow({
  rule,
  tierLabels,
  jurisdictionLabel: jurisLabel,
  selectable,
  selected,
  isOpen,
  focused,
  onSelectChange,
  onClick,
}: {
  rule: ObligationRule
  tierLabels: Record<RuleTier, string>
  jurisdictionLabel: string
  // `selectable` is true when the rule is in needs-review state
  // (candidate / pending_review). Other states can't be batch-
  // reviewed, so they don't show a checkbox at all — keeps the
  // affordance honest.
  selectable: boolean
  selected: boolean
  // True when the rule drawer is currently open for THIS rule (i.e.
  // `?rule=<id>` matches this row). Drives the bg-accent-tint + 2px accent rail
  // "the drawer is on this rule" visual treatment. Distinct from
  // `selected` (bulk-review checkbox state) so the two states never
  // conflate.
  isOpen: boolean
  // J/K nav focus indicator. Paints a 2px accent inset rail +
  // subtle bg to mark "Enter opens THIS rule."
  focused: boolean
  onSelectChange: (next: boolean) => void
  onClick: (rule: ObligationRule) => void
}) {
  // The row's two aria-labels (`Open rule details for …`, `Select … for
  // batch review`) go through useLingui so SR copy is translated.
  const { t } = useLingui()
  // Memo-set for O(1) applicability lookup per entity column.
  const applicabilitySet = useMemo(
    () => new Set(rule.entityApplicability),
    [rule.entityApplicability],
  )

  // Strip the state prefix from the rule title since the state is
  // already in the group header above. "Alabama individual income
  // tax" → "Individual income tax". Reads cleaner; the column
  // doesn't look like the same word repeating down the page.
  const displayTitle = stripJurisdictionPrefix(rule.title, jurisLabel)
  // The section header above declares which status group the rows belong
  // to, but the rows themselves would read identically across both
  // sections, so CPAs scanning a long expanded jurisdiction lose track of
  // "which rows still need me." Rows in the needs-review status group
  // carry a subtle warning surface tint — light enough to stay calm (no
  // border-left stripe; per design-system, stripes are banned), strong
  // enough to distinguish at a glance from active rows on the default
  // background. The hover override remains (`hover:bg-state-base-hover`)
  // so hover still reads as interactive, just from a tinted resting
  // state. Active / verified / archived rows are unchanged.
  const needsReviewRow = statusGroupOf(rule.status) === 'needs_review'
  return (
    // `group` so the title and the trailing chevron can react to
    // row-level hover. The chevron is the affordance for "this row
    // opens a detail view"; the title underline is a secondary cue
    // that the title itself is the link target.
    <TableRow
      className={cn(
        // h-14 row height matches the rest of the family. `group/row` so
        // the canonical RowActionsMenu's hover-reveal selector
        // (`group-hover/row:opacity-100`) keys off this row's hover state;
        // the named group token matches /clients list rows + /clients/[id]
        // filing-plan rows for cross-surface consistency.
        'group/row h-14 cursor-pointer',
        // Needs-review row tint is orange-50 (warm-brown read), matching
        // the top callout pill.
        needsReviewRow && 'bg-[var(--color-util-colors-orange-50)]/60',
        focused && 'bg-state-base-hover shadow-[inset_2px_0_0_var(--color-state-accent-solid)]',
        // When the rule drawer is open for this row, paint the
        // accent-tint bg + 2px left accent rail. Mirrors the
        // focused-state inset rail vocabulary so the eye learns one
        // indicator; the accent tint wins over `focused` so "the drawer
        // is on this rule" reads distinct from "this row is
        // keyboard-focused." Uses its own `isOpen` prop so it never
        // conflates with bulk-select state (`selected`, driven by the row
        // checkbox).
        isOpen &&
          'bg-state-accent-active-alt shadow-[inset_2px_0_0_var(--color-state-accent-solid)]',
      )}
      onClick={() => onClick(rule)}
      aria-label={t`Open rule details for ${displayTitle}`}
      data-state={selected ? 'selected' : undefined}
    >
      {/* Rule rows sit one level deeper than the NEEDS REVIEW / ACTIVE
          section headers: the row checkbox starts under the section
          label, then the title sits after the checkbox slot. The same
          slot is reserved for non-selectable active rows so titles
          stay aligned across sections. */}
      {/* The primary identity title is text-base, matching /clients +
          /deadlines so all three workbench tables share the same
          canonical title scale. `font-medium` + `text-text-primary` give
          the Rule cell more visual weight than the surrounding Form /
          Type / progress cells, so Rule reads as the row's anchor at scan
          distance. Form + Tier cells stay text-xs secondary so the eye
          lands on Rule first. */}
      <TableCell className="!pl-9 min-h-10 whitespace-normal py-2 text-base font-medium text-text-primary">
        {/* Outer flex is `items-center` — single source of vertical
            alignment for the whole row: leading slot, title, and any
            hover-revealed status word all sit on one baseline. */}
        <div className="flex min-w-0 items-center gap-2">
          {selectable ? (
            <span className="inline-flex w-4 shrink-0 items-center justify-center">
              {/* Checkbox is its own click target — stopping
                  propagation so the row's `onClick` (which opens the
                  rule detail panel) doesn't fire when the user is just
                  selecting for batch review. */}
              <span
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center"
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={onSelectChange}
                  aria-label={t`Select ${displayTitle} for batch review`}
                />
              </span>
            </span>
          ) : (
            // For ACTIVE rows, the resting state shows a neutral gray dot
            // (calm "established"). On hover the dot recolors to success
            // green so the row visually confirms its active status without
            // spilling a textual "Active" label that adds noise.
            // Non-success tones (destructive / review / muted) still
            // surface their short status label on hover since those carry
            // signal the dot color alone doesn't.
            (() => {
              const tone = STATUS_TONE[rule.status]
              return (
                <span aria-hidden className="inline-flex shrink-0 items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-block size-1.5 rounded-full transition-colors',
                      tone === 'success' &&
                        'bg-divider-regular group-hover/row:bg-state-success-solid',
                      tone === 'destructive' && 'bg-state-destructive-solid',
                      tone === 'review' && 'bg-state-accent-solid',
                      tone === 'muted' && 'bg-divider-regular',
                    )}
                  />
                  {tone === 'success' ? null : (
                    <span className="hidden whitespace-nowrap text-xs text-text-tertiary group-hover/row:inline">
                      {STATUS_LABEL_SHORT[rule.status]}
                    </span>
                  )}
                </span>
              )
            })()
          )}
          {/* Step 6 cont R4.2: focus-within underline matches hover so
              keyboard nav previews the link affordance. */}
          <span className="text-text-primary group-hover/row:underline group-hover/row:underline-offset-2 group-hover/row:decoration-current group-focus-within/row:underline group-focus-within/row:underline-offset-2 group-focus-within/row:decoration-current">
            {displayTitle}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden py-2 xl:table-cell">
        <FormCell formName={rule.formName} taxType={rule.taxType} />
      </TableCell>
      {/* Per-entity applicability dots — one per ENTITY_KEY. Status-
          tinted when the rule applies to that entity, faint
          placeholder otherwise. */}
      {ENTITY_KEYS.map((entity) => (
        <TableCell key={entity} className="py-2 px-2 text-center">
          <EntityApplicabilityCell applies={applicabilitySet.has(entity)} status={rule.status} />
        </TableCell>
      ))}
      {/* No trailing chevron — it would be redundant decoration alongside
          the ⋯ RowActionsMenu and the row-level hover bg. The Type label
          sits in its own column without the visual noise of a permanent
          30% chevron; the open affordance lives in the row's hover bg +
          the ⋯ menu. Left-aligned so the Type label stacks with the
          progress bar column above. */}
      <TableCell className="hidden py-2 2xl:table-cell">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>{tierLabels[rule.ruleTier]}</span>
          <span className="ml-auto inline-flex items-center">
            <RowActionsMenu
              label={`Actions for ${displayTitle}`}
              items={[
                {
                  label: 'Open rule',
                  icon: ArrowUpRightIcon,
                  onSelect: () => onClick(rule),
                },
                {
                  label: 'Copy rule ID',
                  icon: LinkIcon,
                  onSelect: () => {
                    if (typeof window === 'undefined') return
                    try {
                      void window.navigator.clipboard?.writeText(rule.id)
                    } catch {
                      // Clipboard can throw in sandboxed iframes.
                      // Silent fail — the action is non-critical.
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
                      // Clipboard can throw in sandboxed iframes.
                      // Silent fail — the action is non-critical.
                    }
                  },
                },
              ]}
            />
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}

function GapTableRow({
  group,
  entity,
  focused,
  onAddRule,
}: {
  group: JurisdictionGroup
  entity: EntityKey
  // J/K nav focus indicator. The gap row already carries a left
  // destructive rail; when focused we swap to an accent rail so
  // "focus" reads stronger than "missing".
  focused: boolean
  onAddRule: (group: JurisdictionGroup, entity: EntityKey) => void
}) {
  // Gap rows used to render with per-entity column dots aligned to
  // the rules above, but the row read as "rule with dashes + a tiny
  // circle somewhere" — CPAs couldn't tell which entity was
  // missing. New shape: colSpan the content so the entity name is
  // loud, paired with a destructive icon + clear "needs a rule"
  // descriptor. Action button stays in the rightmost cell, aligned
  // with the rest of the table's action edge.
  return (
    <TableRow
      // Faint destructive band + 2px left rail (per /critique). Lets
      // vertical-scan register "this row is missing something" without
      // shouting. The [Add rule] button is the only colored CTA in the
      // table body — promoted from ghost to outlined accent.
      className={cn(
        'border-l-2 border-l-state-destructive-solid bg-state-destructive-hover/40 hover:bg-state-destructive-hover/70',
        // When focused via J/K, paint an accent left rail + lift the
        // bg so the row reads "you are here" louder than "this is
        // missing" — the user is acting on it now.
        focused && 'border-l-state-accent-solid bg-state-destructive-hover/70',
      )}
    >
      {/* Aligned with rule rows above (badge-left edge in the state
          header) — `!pl-[34px]` overrides the primitive's `p-3`
          shorthand. `min-h-10` matches the rule row's min-height
          so needs-review rows and missing-rule rows scan as the
          same rhythm. */}
      <TableCell colSpan={RULES_TABLE_COLUMN_COUNT - 1} className="!pl-[34px] min-h-10 py-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block size-2 shrink-0 rounded-full border border-state-destructive-solid"
          />
          <span className="text-sm font-medium text-text-primary">{ENTITY_LABELS[entity]}</span>
          <span className="text-xs text-text-tertiary">
            <Trans>No rule defined for this entity in {group.label}</Trans>
          </span>
        </div>
      </TableCell>
      <TableCell className="py-2 text-right">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-text-accent"
          onClick={(event) => {
            event.stopPropagation()
            onAddRule(group, entity)
          }}
        >
          <PlusIcon data-icon="inline-start" />
          <Trans>Add rule</Trans>
        </Button>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Status section header — sub-section inside an expanded jurisdiction
// ---------------------------------------------------------------------------

// This NEEDS REVIEW / ACTIVE / MISSING band is Rule-library-only.
// The pattern (tinted label + count + tri-state batch checkbox
// + collapse chevron) exists because the rule library is the only
// surface that does state-grouped batch review. /deadlines groups by
// client (no batch axis), /clients is a flat directory (no grouping).
// Keep this as a local component — promote to a shared primitive only
// if a second surface lands batch-review semantics.
function StatusSectionHeaderRow({
  label,
  count,
  statusKey,
  selectAllState,
  onToggleSelectAll,
}: {
  label: string
  count: number
  statusKey: StatusGroupKey | 'gaps'
  // When the section is `needs_review`, the caller passes a tri-state
  // value + handler so users can select / deselect every rule in
  // this state's NEEDS REVIEW section at once. `'all'` = every rule
  // selected; `'some'` = partial (renders the indeterminate dash);
  // `'none'` = nothing selected. Undefined → no checkbox renders.
  selectAllState?: 'all' | 'some' | 'none'
  onToggleSelectAll?: () => void
}) {
  // The section-header select-all checkbox's aria-label goes through
  // useLingui so non-EN firms hear the translated bulk-review affordance.
  const { t } = useLingui()
  const hasSelectAll = selectAllState !== undefined && onToggleSelectAll !== undefined
  // Section header inside an expanded jurisdiction. The TITLE itself
  // is highlighted (per /critique) — NEEDS REVIEW reads in accent,
  // ACTIVE reads in the same success green as active entity counts,
  // and MISSING RULES reads in destructive. Other groups stay tertiary.
  // Both the label and the count carry the same color so the row
  // reads as one tinted line, not a label + colored badge.
  return (
    <TableRow className="hover:bg-transparent">
      {/* The checkbox slot sits at the SAME x-position as the chevron in
          the state row above (the cell's natural p-3 left padding), so
          NEEDS REVIEW and ACTIVE labels share one left edge with each
          other AND with the chevron above. When the checkbox is absent
          (ACTIVE section), the w-4 placeholder reserves the slot so the
          label x-position stays constant across section headers. The
          explicit `pl-3 text-left` anchors the label x-position to the
          cell's left padding regardless of any primitive `text-center`
          defaults inherited via colSpan. */}
      <TableCell colSpan={RULES_TABLE_COLUMN_COUNT} className="pb-1 pt-3 pl-3 text-left">
        <div className="flex items-center gap-2">
          <span className="inline-flex w-4 shrink-0 items-center justify-center" aria-hidden>
            {hasSelectAll ? (
              <Checkbox
                checked={selectAllState === 'all'}
                indeterminate={selectAllState === 'some'}
                onCheckedChange={() => onToggleSelectAll()}
                aria-label={t`Select all ${count} rules in ${label}`}
              />
            ) : null}
          </span>
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              statusKey === 'needs_review' && REVIEW_TEXT_CLS,
              statusKey === 'active' && 'text-state-success-solid',
              statusKey === 'gaps' && 'text-text-destructive',
              statusKey !== 'needs_review' &&
                statusKey !== 'active' &&
                statusKey !== 'gaps' &&
                'text-text-tertiary',
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              statusKey === 'needs_review' && REVIEW_TEXT_CLS,
              statusKey === 'active' && 'text-state-success-solid',
              statusKey === 'gaps' && 'text-text-destructive',
              statusKey !== 'needs_review' &&
                statusKey !== 'active' &&
                statusKey !== 'gaps' &&
                'text-text-tertiary',
            )}
          >
            {count}
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Search results — flat table with Jurisdiction column added
// ---------------------------------------------------------------------------

function SearchResultsTable({
  activeRuleId,
  rules,
  query,
  onRuleClick,
  focusedRowId,
}: {
  // Same `activeRuleId` thread as `GroupedRulesTable` so the "drawer is
  // on this row" treatment carries over to search results.
  activeRuleId: string | null
  rules: ObligationRule[]
  query: string
  onRuleClick: (rule: ObligationRule) => void
  // J/K row nav focus id threaded down so the matching search-result
  // row paints a focus ring. Search results carry only rule rows
  // (no groups, no gaps), so we only check `rule:<id>` matches.
  focusedRowId: string | null
}) {
  // The search-result row's aria-label goes through useLingui.
  const { t } = useLingui()
  const tierLabels = useRuleTierLabels()
  return (
    <div className="rounded-xl border border-divider-subtle bg-background-default">
      <div className="flex items-center justify-between border-b border-divider-subtle px-3 py-1.5 text-xs">
        <span className="text-text-secondary">
          <Plural
            value={rules.length}
            one={`# match for "${query}"`}
            other={`# matches for "${query}"`}
          />
        </span>
      </div>
      {/* Flat-rules table headers carry no kicker style overrides, so
          they inherit the TableHead primitive default (sm-medium
          normal-case, matches /deadlines + /alerts). Only 4 columns —
          Rule / Jurisdiction / Form / Tier — to match the grouped view;
          per-rule applicability lives in the rule-detail Dialog. */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Trans>Rule</Trans>
            </TableHead>
            <TableHead>
              <Trans>Jurisdiction</Trans>
            </TableHead>
            <TableHead>
              <Trans>Form</Trans>
            </TableHead>
            {ENTITY_KEYS.map((entity) => (
              <TableHead
                key={entity}
                title={ENTITY_FULL_LABELS[entity]}
                className="w-12 px-2 text-center text-caption-xs font-medium uppercase tracking-eyebrow-tight text-text-tertiary"
              >
                {ENTITY_COLUMN_LABELS[entity]}
              </TableHead>
            ))}
            {/* 2026-05-27 (Yuqi rule library rework — needs-review
                column): mirrors the grouped table so column geometry
                stays identical across the two surfaces (the user can
                type to search and back to browse without the table
                shape changing). */}
            <TableHead className="w-[120px] text-right">
              <Trans>Awaiting review</Trans>
            </TableHead>
            {/* 2026-05-26 (Yuqi follow-up — "the header of Tier
                should be left aligned"): dropped `text-right` so
                the column header sits at the column's natural
                left edge, matching the Rule / Form headers above. */}
            <TableHead>
              {/* 2026-05-28 (Yuqi rename): "Tier" implied subscription
                  tier; the actual values (Basic / Annual rolling /
                  Exception / Applicability review) describe rule
                  KIND, not tier level. Renamed to "Type" — the
                  visible column label only; the internal RuleTier
                  type + useRuleTierLabels helper stay since they
                  match the contract field name `ruleTier`. */}
              <Trans>Type</Trans>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={RULES_TABLE_COLUMN_COUNT + 1 /* +1 for Jurisdiction column */}
                className="py-8 text-center text-xs text-text-tertiary"
              >
                <Trans>No rules match "{query}".</Trans>
              </TableCell>
            </TableRow>
          ) : (
            rules.map((rule) => {
              const isFocused = focusedRowId === `rule:${rule.id}`
              const isOpen = rule.id === activeRuleId
              return (
                <TableRow
                  key={rule.id}
                  className={cn(
                    // 2026-05-26 (Stripe Phase B per-row ⋯): `group/row`
                    // matches the grouped table — the canonical
                    // RowActionsMenu's hover-reveal selector keys off
                    // this token.
                    'group/row cursor-pointer hover:bg-state-base-hover',
                    isFocused &&
                      'bg-state-base-hover shadow-[inset_2px_0_0_var(--color-state-accent-solid)]',
                    // 2026-05-28 (Yuqi /rules/library polish #15): same
                    // accent-tint + 2px rail treatment as the grouped
                    // table so search-results rows also visualise
                    // "drawer is on this row."
                    isOpen &&
                      'bg-state-accent-active-alt shadow-[inset_2px_0_0_var(--color-state-accent-solid)]',
                  )}
                  onClick={() => onRuleClick(rule)}
                  aria-label={t`Open rule details for ${rule.title}`}
                >
                  {/* 2026-05-26 (Yuqi cross-table unify): text-sm
                      font-medium → text-base regular. Matches the
                      grouped RuleTableRow above + /clients + /deadlines
                      so search results carry the same primary-identity
                      treatment as the rest of the family. */}
                  <TableCell className="whitespace-normal py-2 text-base text-text-primary">
                    <span className="group-hover/row:underline group-hover/row:underline-offset-2 group-hover/row:decoration-divider-regular">
                      {rule.title}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-xs text-text-secondary">
                    {jurisdictionLabel(rule.jurisdiction)}
                  </TableCell>
                  <TableCell className="py-2">
                    <FormCell formName={rule.formName} taxType={rule.taxType} />
                  </TableCell>
                  {ENTITY_KEYS.map((entity) => (
                    <TableCell key={entity} className="py-2 px-2 text-center">
                      <EntityApplicabilityCell
                        applies={rule.entityApplicability.includes(entity)}
                        status={rule.status}
                      />
                    </TableCell>
                  ))}
                  {/* 2026-05-27 (Yuqi rule library rework — needs-review
                      column): per-rule search result lights up the cell
                      when THIS rule needs review. Surfaces the catalog
                      lookup signal at a glance ("which of these matches
                      need my attention right now") without making the
                      user click into each rule's detail. */}
                  <TableCell className="py-2 text-right">
                    {statusGroupOf(rule.status) === 'needs_review' ? (
                      <CountDotChip count={1} tone="accent" label={<Trans>review</Trans>} />
                    ) : (
                      <EmptyCellMark label="" />
                    )}
                  </TableCell>
                  {/* 2026-05-28 (Yuqi /rules/library polish #14):
                      chevron removed here too so search results
                      stay in family with the grouped-table rows. */}
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>{tierLabels[rule.ruleTier]}</span>
                      <span className="ml-auto inline-flex items-center">
                        <RowActionsMenu
                          label={`Actions for ${rule.title}`}
                          items={[
                            {
                              label: 'Open rule',
                              icon: ArrowUpRightIcon,
                              onSelect: () => onRuleClick(rule),
                            },
                            {
                              label: 'Copy rule ID',
                              icon: LinkIcon,
                              onSelect: () => {
                                if (typeof window === 'undefined') return
                                try {
                                  void window.navigator.clipboard?.writeText(rule.id)
                                } catch {
                                  // Clipboard can throw in sandboxed iframes.
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
                                  // Clipboard can throw in sandboxed iframes.
                                }
                              },
                            },
                          ]}
                        />
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rule detail panel — centered Dialog modal. Replaces the prior
// inline section that rendered below the entire table; clicking a
// rule used to push the user into a `scrollIntoView` that flew the
// page down past the rest of the catalog. A modal at the screen
// center keeps the user's place — they click, they see the rule,
// they close, they're back where they were.
// ---------------------------------------------------------------------------

function RuleDetailPanel({
  rule,
  concreteDraft,
  onClose,
}: {
  rule: ObligationRule
  concreteDraft: RuleConcreteDraftCacheEntry | null
  onClose: () => void
}) {
  const { t } = useLingui()
  const isReviewable = rule.status === 'candidate' || rule.status === 'pending_review'
  // The open review task for this rule carries the queue age (`createdAt`) and
  // why it's in review (`reason`) — surfaced in the hero, per the mock.
  const reviewTasksQuery = useQuery(
    orpc.rules.listReviewTasks.queryOptions({ input: { status: 'open' } }),
  )
  const reviewTask = isReviewable
    ? (reviewTasksQuery.data?.find((task) => task.ruleId === rule.id) ?? null)
    : null
  return (
    // 2026-06-15 (Yuqi, Pencil TkpJG): the rule review is a CENTERED two-pane
    // modal — a left column of rule facts under the header, and a right gray
    // decision rail that owns the whole commit flow (impact · Before-you-accept
    // gate · required note · Generate-draft / Reject / Accept). Replaces the
    // prior full-window 3-zone panel + sticky footer.
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent
        showCloseButton
        aria-label={t`Rule detail`}
        className="flex h-[min(860px,calc(100dvh-96px))] w-[min(1200px,calc(100vw-96px))] max-w-none gap-0 overflow-hidden bg-background-default p-0"
      >
        {/* a11y label for the Dialog; the visible title lives in the header band. */}
        <DialogTitle className="sr-only">{rule.title}</DialogTitle>
        <RuleDetailCompact
          key={rule.id}
          rule={rule}
          concreteDraft={concreteDraft}
          confirmImpact
          splitRail
          header={
            <>
              <RuleDetailHeroCard
                rule={rule}
                concreteDraft={concreteDraft}
                reviewTask={reviewTask}
              />
              <RuleEffectiveBanner rule={rule} />
            </>
          }
          onActionComplete={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}

/**
 * `RuleDetailHeroCard` — the "Rule under review" hero (Pencil `irBJ8` card 1):
 * bar (triangle-alert · "Rule under review" · "Awaiting review" warning chip) +
 * title + identity meta + 2-line summary + a meta strip (AI % · audit ledger).
 *
 * Honest data only: the AI-confidence chip renders ONLY when a real concrete
 * draft confidence exists (the rule itself carries no confidence). The queue age
 * + review reason come from the rule's open `RuleReviewTask` (`createdAt` /
 * `reason`) when one exists — omitted otherwise.
 */
const REVIEW_REASON_LABEL: Record<RuleReviewTask['reason'], React.ReactNode> = {
  new_template: <Trans>New template</Trans>,
  source_changed: <Trans>Source changed</Trans>,
  pulse_signal: <Trans>Pulse signal</Trans>,
  custom_edit: <Trans>Custom edit</Trans>,
  annual_review: <Trans>Annual review</Trans>,
}

function RuleDetailHeroCard({
  rule,
  concreteDraft,
  reviewTask,
}: {
  rule: ObligationRule
  concreteDraft: RuleConcreteDraftCacheEntry | null
  reviewTask: RuleReviewTask | null
}) {
  const isReviewable = rule.status === 'candidate' || rule.status === 'pending_review'
  const confidence = concreteDraft?.draft?.confidence ?? null
  const aiPct = confidence !== null ? Math.round(confidence * 100) : null
  // Flush header band (not a bordered card): the rule TITLE is the one
  // dominant element, with a status pill + provenance demoted to a quiet
  // eyebrow above it. Replaces the old card-with-a-bar-header hero, which
  // read as just another of the body cards and buried the title under a
  // same-weight "Rule under review" label. `pr-12` on the eyebrow keeps the
  // Dialog close button's top-right corner clear.
  return (
    <header className="shrink-0 border-b border-divider-regular bg-background-default px-6 pt-5 pb-4">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pr-12">
        <Badge variant={isReviewable ? 'warning' : 'success'} className="gap-1 px-2 font-semibold">
          {isReviewable ? (
            <Clock3 aria-hidden className="size-2.5" />
          ) : (
            <CircleCheck aria-hidden className="size-2.5" />
          )}
          {isReviewable ? <Trans>Awaiting review</Trans> : <Trans>Active</Trans>}
        </Badge>
        {reviewTask ? (
          <span className="text-xs font-medium text-text-tertiary">
            <Trans>In queue {formatRelativeTime(reviewTask.createdAt)}</Trans>
          </span>
        ) : null}
        {reviewTask ? (
          <>
            <span aria-hidden className="text-text-muted">
              ·
            </span>
            <span className="text-xs font-medium text-text-tertiary">
              <Trans>Reason</Trans>: {REVIEW_REASON_LABEL[reviewTask.reason]}
            </span>
          </>
        ) : null}
        {aiPct !== null ? (
          <>
            <span aria-hidden className="text-text-muted">
              ·
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-text-success">
              <Sparkles aria-hidden className="size-2.5" />
              <Trans>AI {aiPct}%</Trans>
            </span>
          </>
        ) : null}
      </div>
      <h2 className="mt-2 text-2xl leading-tight font-semibold tracking-tight text-text-primary">
        {rule.title}
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        {rule.jurisdiction} · {rule.formName} · <Trans>Tax season {rule.applicableYear}</Trans>
      </p>
      {rule.defaultTip ? (
        <p className="mt-1 line-clamp-1 text-sm text-text-tertiary">{rule.defaultTip}</p>
      ) : null}
    </header>
  )
}

// Effective-date banner. Renders only when the rule's effective date
// (`verifiedAt`) is still in the future — a scheduled change the CPA should
// see before acting. Uses the shared `Alert` primitive (variant `warning`)
// so it reads as the same callout vocabulary as the `Needs CPA review`
// Alert in the body below, rather than a one-off hand-rolled strip.
function RuleEffectiveBanner({ rule }: { rule: ObligationRule }) {
  const effective = Date.parse(rule.verifiedAt)
  if (Number.isNaN(effective)) return null
  const now = Date.now()
  if (effective <= now) return null
  const days = Math.max(1, Math.ceil((effective - now) / (24 * 60 * 60 * 1000)))
  const effectiveLabel = new Date(effective).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return (
    <div className="shrink-0 px-5 pt-4">
      <Alert variant="warning" aria-label="Scheduled change">
        <CalendarClock />
        <AlertTitle>
          <Plural value={days} one="Effective in # day" other="Effective in # days" />
        </AlertTitle>
        <AlertDescription>
          <Trans>This change takes effect {effectiveLabel}.</Trans>
        </AlertDescription>
      </Alert>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bulk-review bar — floats at the bottom of the viewport when ≥1
// needs-review rule is checked off. Uses the shared
// `<FloatingActionBar>` primitive so the affordance reads the same as
// the Obligations queue's bulk-actions bar (both surfaces converged
// on the same recipe 2026-05-22).
// ---------------------------------------------------------------------------

function BulkReviewBar({
  count,
  onReview,
  onClear,
}: {
  count: number
  onReview: () => void
  onClear: () => void
}) {
  const { t } = useLingui()
  // No "Select all N" here — the table's header checkbox already owns
  // select-all for the visible/state rows, and the table has no pagination,
  // so a second select-all in the bar just duplicated it (Yuqi). The bar's
  // job is acting on the current selection: count + Clear + Review N.
  return (
    <FloatingActionBar ariaLabel={t`Bulk review actions`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium tabular-nums text-text-primary">
          <Plural value={count} one="# rule selected" other="# rules selected" />
        </span>
        <TextLink variant="quiet" onClick={onClear}>
          <Trans>Clear</Trans>
        </TextLink>
      </div>
      <span aria-hidden className="h-4 w-px bg-divider-subtle" />
      <Button
        type="button"
        size="sm"
        onClick={onReview}
        className="!text-components-button-primary-text hover:!bg-components-button-primary-bg-hover hover:!text-components-button-primary-text"
      >
        <Trans>Review {count}</Trans>
        <ChevronRightIcon data-icon="inline-end" />
      </Button>
    </FloatingActionBar>
  )
}

// ---------------------------------------------------------------------------
// Bulk-review list modal (Pencil `Oaey3` / review-flow State G) — the
// canonical bulk surface. Shows ALL selected rules in one list with
// per-row readiness/risk flags + open-detail, a shared review note, an
// honest impact summary (no fabricated coverage-lift / est-work pills), and
// batch Accept N / Reject N. Readiness comes from `previewBulkRuleImpact`
// (server classifies which rules can be bulk-accepted vs need individual
// review); `bulkAcceptTemplates` only activates the ready ones. Replaced the
// one-at-a-time walkthrough (`BatchReviewModal`, kept below) at the
// "Review N" entry per Yuqi 2026-06-10 (option a, with per-row flags).
// ---------------------------------------------------------------------------

/**
 * Server-side batch ceiling for bulk accept + impact preview — mirrors
 * `.max(100)` on `RuleBulkImpactPreviewInputSchema` and
 * `RuleBulkAcceptTemplatesInputSchema` in @duedatehq/contracts. Keep in sync.
 */
const BULK_ACCEPT_BATCH_MAX = 100

// Rejecting compliance rules is final and audited. Above this many in one
// batch, the Reject button arms first (two-step confirm) — the re-critique
// flagged that you could reject 400+ statutory rules in a single click while
// Accept was capped at 100, i.e. the friction sat on the SAFE action.
const REJECT_CONFIRM_THRESHOLD = 10

/** Honest impact/readiness pill — value + label, tone-keyed. */
function BulkMetric({
  value,
  label,
  tone = 'default',
}: {
  value: number
  label: string
  tone?: 'default' | 'warning' | 'muted'
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          'text-xl font-semibold tabular-nums',
          tone === 'warning'
            ? 'text-text-warning'
            : tone === 'muted'
              ? 'text-text-tertiary'
              : 'text-text-primary',
        )}
      >
        {value}
      </span>
      <span className="text-caption-xs font-medium text-text-muted">{label}</span>
    </div>
  )
}

function BulkReviewListModal({
  rules,
  onClose,
  onOpenRule,
  onComplete,
}: {
  /** The selected reviewable rules (candidate / pending_review). */
  rules: ObligationRule[]
  onClose: () => void
  /** Open one rule's full detail (takeover) — closes this modal. */
  onOpenRule: (rule: ObligationRule) => void
  /** After a successful batch accept/reject — clears selection + closes. */
  onComplete: () => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(() => new Set())
  const [rejecting, setRejecting] = useState(false)
  // Two-step arm for mass reject (see REJECT_CONFIRM_THRESHOLD).
  const [rejectArmed, setRejectArmed] = useState(false)

  const included = useMemo(() => rules.filter((r) => !excluded.has(r.id)), [rules, excluded])
  const selections = useMemo(
    () => included.map((r) => ({ ruleId: r.id, expectedVersion: r.version })),
    [included],
  )

  // The preview + bulk-accept contracts cap a batch at 100 rules
  // (`RuleBulkImpactPreviewInputSchema` / `RuleBulkAcceptTemplatesInputSchema`
  // both say `.max(100)`). Firing the preview over that limit just fails
  // input validation — which used to leave the modal on "Calculating
  // impact…" forever. Don't fire it; say so instead. Reject is unaffected:
  // it loops per-rule mutations, so it has no batch cap.
  const overAcceptLimit = selections.length > BULK_ACCEPT_BATCH_MAX
  const previewQuery = useQuery({
    ...orpc.rules.previewBulkRuleImpact.queryOptions({ input: { rules: selections } }),
    enabled: selections.length > 0 && !overAcceptLimit,
  })
  const preview = previewQuery.data ?? null
  const skippedReasonById = useMemo(
    () => new Map((preview?.skipped ?? []).map((s) => [s.ruleId, s.reason])),
    [preview],
  )

  const skipReasonLabel: Record<RuleBulkImpactPreview['skipped'][number]['reason'], string> = {
    template_not_found: t`Not found`,
    version_conflict: t`Version conflict`,
    already_active: t`Already active`,
    rejected: t`Rejected`,
    archived: t`Archived`,
    invalid_template: t`Invalid rule`,
    source_changed_requires_review: t`Source changed — review individually`,
    source_drifted_requires_review: t`Source updated — re-verify`,
    source_defined_requires_ai_review: t`Needs AI draft review`,
    substantive_requires_review: t`Substantive change — review individually`,
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: orpc.rules.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
  }

  const acceptMutation = useMutation(
    orpc.rules.bulkAcceptTemplates.mutationOptions({
      onSuccess: (result) => {
        const accepted = result.accepted.length
        const skipped = result.skipped.length
        toast.success(
          skipped > 0
            ? t`${accepted} rules accepted · ${skipped} skipped for individual review`
            : t`${accepted} rules accepted`,
        )
        invalidate()
        onComplete()
      },
      onError: (error) => {
        toast.error(t`Couldn't accept rules`, {
          description: rpcErrorMessage(error) ?? t`Check the selection and try again.`,
        })
      },
    }),
  )
  const rejectTemplateMutation = useMutation(orpc.rules.rejectTemplate.mutationOptions({}))
  const rejectCandidateMutation = useMutation(orpc.rules.rejectCandidate.mutationOptions({}))

  const noteTrimmed = note.trim()
  const readyCount = preview?.acceptReadyCount ?? 0
  const busy = acceptMutation.isPending || rejecting
  const canAccept = !overAcceptLimit && readyCount > 0 && noteTrimmed.length > 0 && !busy
  const canReject = included.length > 0 && noteTrimmed.length > 0 && !busy

  // Every disabled footer button states its reason (the first gate that
  // applies, in the order a reviewer can clear them). `null` when both
  // actions are live — the footer then shows the standing open-a-rule hint.
  const disabledReason = busy
    ? null
    : included.length === 0
      ? t`Tick at least one rule to act on this batch.`
      : overAcceptLimit
        ? t`Accept handles up to ${BULK_ACCEPT_BATCH_MAX} rules per batch — untick down to ${BULK_ACCEPT_BATCH_MAX} or fewer. Reject has no batch cap.`
        : noteTrimmed.length === 0
          ? t`Add a review note to enable Accept and Reject — it's logged to the audit trail.`
          : previewQuery.isError
            ? t`Accept stays off — the impact preview failed, so readiness is unknown. Reject is still available.`
            : !preview
              ? t`Accept enables once the impact preview finishes.`
              : readyCount === 0
                ? t`None of these rules can be bulk-accepted — open each rule to review it individually.`
                : null

  const needsRejectConfirm = included.length > REJECT_CONFIRM_THRESHOLD

  const toggleExcluded = (id: string) => {
    setRejectArmed(false) // selection changed — re-confirm a mass reject
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Reject button click: arm first for large batches, execute on the
  // second click (or immediately for small, low-risk batches).
  function handleRejectClick() {
    if (!canReject) return
    if (needsRejectConfirm && !rejectArmed) {
      setRejectArmed(true)
      return
    }
    void handleReject()
  }

  function handleAccept() {
    if (!canAccept) return
    acceptMutation.mutate({ rules: selections, reviewNote: noteTrimmed })
  }

  async function handleReject() {
    if (!canReject) return
    setRejecting(true)
    let ok = 0
    let failed = 0
    for (const rule of included) {
      try {
        if (isSourceDefinedRule(rule)) {
          await rejectCandidateMutation.mutateAsync({ ruleId: rule.id, reason: noteTrimmed })
        } else {
          await rejectTemplateMutation.mutateAsync({
            ruleId: rule.id,
            expectedVersion: rule.version,
            reason: noteTrimmed,
          })
        }
        ok += 1
      } catch {
        failed += 1
      }
    }
    setRejecting(false)
    if (failed === 0) toast.success(t`${ok} rules rejected`)
    else toast.error(t`${ok} rejected · ${failed} failed`)
    invalidate()
    onComplete()
  }

  const substantive = preview?.classificationCounts.substantive ?? 0
  const skippedTotal = preview?.skipped.length ?? 0

  // When every selected rule shares one jurisdiction, name it in the
  // subtitle (Pencil Fzzoq: "Reviewing N rules in Arkansas").
  const singleJurisdiction = useMemo(() => {
    const first = rules[0]
    const set = new Set(rules.map((r) => r.jurisdiction))
    return set.size === 1 && first ? jurisdictionLabel(first.jurisdiction) : null
  }, [rules])
  // Blocked-batch banner: the impact preview reports nothing acceptable.
  // Elevated from the footer caption to a top banner (Pencil) because it's
  // the dominant fact about this batch. When the only thing standing between
  // these rules and acceptance is a missing AI draft, say exactly that.
  const noneReady = Boolean(preview) && readyCount === 0 && included.length > 0
  const allNeedAiDraft =
    noneReady &&
    included.every((r) => skippedReasonById.get(r.id) === 'source_defined_requires_ai_review')

  // Select-all re-includes every row; Clear excludes every row.
  const selectAll = () => {
    setRejectArmed(false)
    setExcluded(new Set())
  }
  const clearAll = () => {
    setRejectArmed(false)
    setExcluded(new Set(rules.map((r) => r.id)))
  }

  return (
    <Dialog protectInput open onOpenChange={(next) => (next || busy ? undefined : onClose())}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] w-[min(720px,calc(100vw-2rem))] max-w-[720px] flex-col gap-0 overflow-hidden p-0"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-divider-subtle px-5 py-4">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-state-accent-hover"
          >
            <LayersIcon className="size-[18px] text-text-accent" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <DialogTitle className="text-lg font-semibold text-text-primary">
              <Trans>Bulk review</Trans>
            </DialogTitle>
            <p className="text-base text-text-tertiary">
              {/* One source of truth for "how many": the ticked rows below.
                  Header, Reject N, and the impact preview all read
                  `included` — unticking a row moves every number together. */}
              {singleJurisdiction ? (
                // Trans-ternary (not <Plural> with an interpolated prop, which
                // renders blank) — plural + variable per the lingui footgun.
                included.length === 1 ? (
                  <Trans>Reviewing 1 rule in {singleJurisdiction}</Trans>
                ) : (
                  <Trans>
                    Reviewing {included.length} rules in {singleJurisdiction}
                  </Trans>
                )
              ) : (
                <Plural value={included.length} one="# rule selected" other="# rules selected" />
              )}
            </p>
          </div>
          <button
            type="button"
            aria-label={t`Close`}
            onClick={onClose}
            disabled={busy}
            className="-mr-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors hover:bg-state-base-hover hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-40"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        </div>

        {/* Blocked-batch banner (Pencil Fzzoq) — when the impact preview
            reports nothing acceptable, surface why at the top instead of
            burying it in the footer caption. */}
        {noneReady ? (
          <div className="flex items-start gap-2.5 border-b border-divider-subtle bg-state-warning-hover px-5 py-3">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-text-warning" aria-hidden />
            <div className="flex min-w-0 flex-col gap-0.5">
              {allNeedAiDraft ? (
                <>
                  <p className="text-sm font-medium text-text-warning">
                    <Trans>
                      None of these can be accepted yet — each needs an AI concrete draft.
                    </Trans>
                  </p>
                  <p className="text-xs text-text-secondary">
                    <Trans>Reject them here, or close and generate drafts first.</Trans>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-text-warning">
                    <Trans>None of these rules can be bulk-accepted.</Trans>
                  </p>
                  <p className="text-xs text-text-secondary">
                    <Trans>Reject them here, or open each rule to review it individually.</Trans>
                  </p>
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* Bulk-select controls — count + select-all / clear (Pencil Fzzoq). */}
        <div className="flex items-center justify-between gap-3 border-b border-divider-subtle px-5 py-2.5">
          <span className="text-xs font-medium text-text-secondary tabular-nums">
            <Trans>
              {included.length} of {rules.length} selected
            </Trans>
          </span>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={selectAll}
              disabled={busy || included.length === rules.length}
              className="cursor-pointer font-medium text-text-accent outline-none hover:underline focus-visible:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline"
            >
              <Trans>Select all</Trans>
            </button>
            <span aria-hidden className="text-text-muted">
              ·
            </span>
            <button
              type="button"
              onClick={clearAll}
              disabled={busy || included.length === 0}
              className="cursor-pointer font-medium text-text-accent outline-none hover:underline focus-visible:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline"
            >
              <Trans>Clear</Trans>
            </button>
          </div>
        </div>

        {/* Selected-rules list — per-row readiness/risk flag + open-detail. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <ul className="flex flex-col">
            {rules.map((rule, index) => {
              const isExcluded = excluded.has(rule.id)
              const reason = skippedReasonById.get(rule.id)
              return (
                <li
                  key={rule.id}
                  className={cn(
                    'flex items-center gap-3 py-2.5',
                    index > 0 && 'border-t border-divider-subtle',
                  )}
                >
                  <Checkbox
                    checked={!isExcluded}
                    onCheckedChange={() => toggleExcluded(rule.id)}
                    aria-label={t`Include ${rule.title} in this batch`}
                  />
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full bg-state-accent-solid"
                  />
                  <div
                    className={cn(
                      'flex min-w-0 flex-1 flex-col gap-0.5',
                      isExcluded && 'opacity-45',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex shrink-0 items-center rounded bg-background-subtle px-1.5 py-0.5 font-mono text-caption-xs font-semibold text-text-tertiary">
                        {rule.jurisdiction}
                      </span>
                      <span className="min-w-0 truncate text-sm font-semibold text-text-primary">
                        {rule.title}
                      </span>
                    </div>
                    <span className="truncate text-xs text-text-tertiary">
                      {formatRuleTypeLabel(rule.taxType, rule.jurisdiction)}
                    </span>
                  </div>
                  {/* Readiness/risk flag (real, from previewBulkRuleImpact). */}
                  {!isExcluded ? (
                    reason ? (
                      <Badge variant="warning" className="shrink-0 text-caption-xs font-semibold">
                        {skipReasonLabel[reason]}
                      </Badge>
                    ) : preview ? (
                      <Badge
                        variant="success"
                        className="shrink-0 gap-1 text-caption-xs font-semibold"
                      >
                        <Check className="size-2.5" aria-hidden />
                        <Trans>Ready</Trans>
                      </Badge>
                    ) : null
                  ) : null}
                  <button
                    type="button"
                    aria-label={t`Open ${rule.title}`}
                    onClick={() => onOpenRule(rule)}
                    className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors hover:bg-state-base-hover hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  >
                    <EyeIcon className="size-4" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Shared review note — required (serves accept reviewNote + reject reason). */}
        <div className="flex flex-col gap-1.5 border-t border-divider-subtle bg-background-subtle px-5 py-3">
          <label htmlFor="bulk-review-note" className="text-xs font-medium text-text-secondary">
            <Trans>Review note</Trans>
            <span className="ml-1 text-text-tertiary">
              <Trans>· required · logged to audit</Trans>
            </span>
          </label>
          <Textarea
            id="bulk-review-note"
            value={note}
            onChange={(event) => {
              setRejectArmed(false) // note changed — re-confirm a mass reject
              setNote(event.target.value)
            }}
            maxLength={1000}
            disabled={busy}
            placeholder={t`Why are you accepting or rejecting these rules?`}
            className="min-h-16 bg-background-default text-sm"
          />
        </div>

        {/* Honest impact summary — only metrics the API actually returns.
            The Pencil's "coverage lift" + "est. work" pills are dropped
            (no backend signal); these four are real. */}
        <div className="flex items-center gap-6 border-t border-divider-subtle px-5 py-3">
          {preview ? (
            <>
              <BulkMetric value={readyCount} label={t`Ready to accept`} />
              <BulkMetric value={preview.estimatedObligationCount} label={t`Est. deadlines`} />
              {substantive > 0 ? (
                <BulkMetric value={substantive} label={t`Need review`} tone="warning" />
              ) : null}
              {skippedTotal > 0 ? (
                <BulkMetric value={skippedTotal} label={t`Skipped`} tone="muted" />
              ) : null}
            </>
          ) : (
            <span className="text-xs text-text-tertiary">
              {selections.length === 0 ? (
                <Trans>Select at least one rule to preview impact.</Trans>
              ) : overAcceptLimit ? (
                // The preview RPC rejects batches over 100, so it isn't
                // fired at all — say that instead of spinning forever.
                <Trans>
                  Impact preview covers up to {BULK_ACCEPT_BATCH_MAX} rules at a time —{' '}
                  {selections.length} selected. Untick rules to see impact.
                </Trans>
              ) : previewQuery.isError ? (
                <Trans>Couldn't calculate impact for this selection.</Trans>
              ) : (
                <Trans>Calculating impact…</Trans>
              )}
            </span>
          )}
        </div>

        {/* Footer — Reject N (destructive outline) · Cancel · Accept N.
            When either action is disabled, the leading caption states the
            actual gate instead of a generic hint. */}
        <div className="flex flex-wrap items-center gap-2 border-t border-divider-subtle px-5 py-3.5">
          <span
            className={cn(
              'flex items-center gap-1.5 text-xs',
              rejectArmed ? 'font-medium text-text-destructive' : 'text-text-tertiary',
            )}
          >
            <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden />
            {rejectArmed ? (
              <Trans>
                Reject {included.length} rules? Each records a final, audited decision. Click again
                to confirm.
              </Trans>
            ) : (
              (disabledReason ?? <Trans>Open any rule to review it individually.</Trans>)
            )}
          </span>
          <span className="flex-1" aria-hidden />
          <Button
            type="button"
            size="sm"
            variant={rejectArmed ? 'destructive-primary' : 'outline'}
            onClick={handleRejectClick}
            disabled={!canReject}
            className={
              rejectArmed
                ? undefined
                : 'text-text-destructive hover:bg-state-destructive-hover hover:text-text-destructive'
            }
          >
            {rejecting ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
            {rejectArmed ? (
              <Trans>Confirm — reject {included.length}</Trans>
            ) : (
              <Trans>Reject {included.length}</Trans>
            )}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={busy}>
            <Trans>Cancel</Trans>
          </Button>
          <Button type="button" size="sm" onClick={handleAccept} disabled={!canAccept}>
            {acceptMutation.isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : !canAccept && !busy ? (
              // Locked Accept reads as gated (TkpJG/Fzzoq), not merely greyed.
              <LockIcon data-icon="inline-start" />
            ) : (
              <ShieldCheck data-icon="inline-start" />
            )}
            {/* No fabricated "Accept 0" while readiness is unknown — the
                count only appears once the impact preview has reported it. */}
            {preview ? <Trans>Accept {readyCount}</Trans> : <Trans>Accept</Trans>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Batch-review modal — centered Dialog that walks the user through
// every selected rule, dating-app style. One rule per "card";
// Prev / Skip / Next at the bottom; Accept lives inside the rule body
// via `RuleDetailCompact`. Progress shown as "1 / 5" at the header.
// Closes when the queue is exhausted.
// (Retained but no longer the default bulk entry — see BulkReviewListModal.)
// ---------------------------------------------------------------------------

function BatchReviewModal({
  rule,
  totalCount,
  currentIndex,
  concreteDraftByTarget,
  concreteDraftLoading,
  onPrev,
  onSkip,
  onActionComplete,
  onClose,
}: {
  rule: ObligationRule
  totalCount: number
  currentIndex: number
  concreteDraftByTarget: ReadonlyMap<string, RuleConcreteDraftCacheEntry>
  concreteDraftLoading: boolean
  onPrev: () => void
  onSkip: () => void
  onActionComplete: () => void
  onClose: () => void
}) {
  const { t } = useLingui()
  const current = rule
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const total = totalCount
  const isFirst = currentIndex === 0
  const isLast = currentIndex === total - 1
  const concreteDraftTarget = current ? concreteDraftTargetForRule(current) : null
  const concreteDraft = concreteDraftTarget
    ? (concreteDraftByTarget.get(concreteDraftTargetKey(concreteDraftTarget)) ?? null)
    : null
  // Keyboard shortcuts. With large review queues, a mouse-only flow
  // is brutal — Tinder/Linear/Superhuman idiom is left/right for
  // nav, `A` for accept. Esc is handled by the Dialog primitive.
  //   ←      Previous
  //   →      Skip
  //   A      Accept (clicks the form's Accept button via data hook)
  //
  // 2026-05-24 (merge): teammates intentionally dropped the R-reject
  // hotkey — rejection stays a mouse click to prevent accidental
  // destructive triggers on a single keystroke. My useAppHotkey
  // conversion stays for the three remaining keys so they continue
  // to appear in the keyboard-shortcuts help overlay and route
  // through the standard editable-target filter.
  const clickReviewButton = useCallback(
    (action: 'accept' | 'reject') => {
      const selector = `[data-rule-action="${action}"]`
      const button = bodyRef.current?.querySelector<HTMLButtonElement>(selector)
      if (button && !button.disabled) {
        button.click()
      }
    },
    [bodyRef],
  )
  useAppHotkey(
    'ArrowLeft',
    (event) => {
      if (isFirst) return
      event.preventDefault()
      onPrev()
    },
    {
      enabled: !isFirst,
      meta: {
        id: 'rules.review-modal.prev',
        name: 'Previous pending rule',
        description: 'Step backward inside the review modal.',
        category: 'rules',
        scope: 'overlay',
      },
    },
  )
  useAppHotkey(
    'ArrowRight',
    (event) => {
      event.preventDefault()
      onSkip()
    },
    {
      meta: {
        id: 'rules.review-modal.skip',
        name: 'Skip pending rule',
        description: 'Step forward inside the review modal without acting.',
        category: 'rules',
        scope: 'overlay',
      },
    },
  )
  useAppHotkey(
    'A',
    (event) => {
      event.preventDefault()
      clickReviewButton('accept')
    },
    {
      meta: {
        id: 'rules.review-modal.accept',
        name: 'Accept pending rule',
        description: 'Trigger the Accept button inside the review modal.',
        category: 'rules',
        scope: 'overlay',
      },
    },
  )
  return (
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent
        showCloseButton={false}
        // Wider than default so the rule body breathes; capped at
        // ~640px so it doesn't dominate the viewport on big screens.
        // Tall flex column with header / scrollable body / footer so
        // long rule details scroll INSIDE the modal instead of
        // pushing the footer below the viewport.
        className="flex max-h-[85vh] max-w-[640px] flex-col gap-0 p-0"
      >
        {/* Header. Purpose ("Reviewing pending rules") is the primary
            read; position ("1 / 459") is a quiet right-aligned eyebrow.
            Previously the position was the large mono read and the
            purpose was small — flipped per /critique so the title
            actually titles. */}
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b border-divider-subtle px-5 py-3">
          <DialogTitle className="text-sm font-semibold text-text-primary">
            <Trans>Reviewing pending rules</Trans>
          </DialogTitle>
          {/* 2026-05-27 (Step 6 cont R3.5): the sr-only Escape hint
              previously sat at the BOTTOM of the dialog, so screen
              reader users heard it AFTER navigating through hundreds
              of characters of rule body. Moved to the top of the
              DialogContent, right after the title, so the close
              affordance is announced before the rule body. */}
          <span className="sr-only">{t`Press Escape to close the review queue.`}</span>
          {/* 2026-05-25 (Yuqi Rule Library #46): use an inline
              header action cluster instead of DialogContent's
              absolute top-right close button. The default X sat on
              top of the progress eyebrow ("1 / N") in this compact
              review header; keeping both in normal flow reserves
              space for the count and the close affordance. */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs tabular-nums text-text-tertiary">
              <span className="text-text-secondary">{currentIndex + 1}</span> / {total}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label={t`Close review queue`}
              title={t`Close review queue`}
              className="-mr-1 text-text-tertiary hover:text-text-primary"
            >
              <XIcon aria-hidden className="size-4" />
            </Button>
          </div>
        </DialogHeader>
        {/* Scrollable body — each rule gets its own scroll position
            via the `key` on the inner wrapper, so moving Prev/Next
            resets scroll to the top of the new rule. `bodyRef` is
            used by the keyboard handler to find Accept. */}
        <div ref={bodyRef} key={current.id} className="flex-1 overflow-y-auto px-5 py-4">
          {/* 2026-05-26 (Yuqi /critique — P0-1): rule title
              promoted from `text-base font-semibold` (16px) →
              `text-xl font-semibold` (20px) so the user's actual
              decision unit anchors the modal. The modal header
              ("Reviewing pending rules") stays at text-sm
              font-semibold as quiet chrome — it's the modal's
              purpose, not the user's task. The rule title IS the
              task. */}
          <h2 className="mb-4 text-xl font-semibold leading-tight text-text-primary">
            {current.title}
          </h2>
          {/* RuleDetailCompact already houses Accept via its
              CandidateReviewSection. Wire `onActionComplete` so
              accepting advances the queue to the next card. */}
          <RuleDetailCompact
            rule={current}
            concreteDraft={concreteDraft}
            concreteDraftLoading={concreteDraftLoading}
            deferQueryInvalidation
            onActionComplete={onActionComplete}
          />
        </div>
        {/* Footer: nav buttons + keyboard hints. The redundant
            "1 of N" was removed (already in the header) and replaced
            with the actual reason to look at the footer — what your
            keys do. For 459-card review queues this is the difference
            between a usable flow and a closed tab. */}
        <footer className="flex items-center justify-between gap-3 border-t border-divider-subtle px-5 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={onPrev} disabled={isFirst}>
            <Trans>Previous</Trans>
          </Button>
          <KeyboardHints />
          {/* 2026-05-26 (step-6 ux-flow audit R3.4): Skip and the
              terminal Finish are semantically distinct (Skip is
              passive forward-step, Finish closes the modal). Match
              them visually: Skip stays outline-quiet, Finish gets
              a primary fill so the terminal action is visible. */}
          <Button type="button" variant={isLast ? 'default' : 'outline'} size="sm" onClick={onSkip}>
            {isLast ? <Trans>Done</Trans> : <Trans>Skip</Trans>}
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}

// Compact keyboard-shortcut hint strip for the batch-review footer.
// Each chip renders the key in a small bordered pill + a tiny verb
// next to it. Hidden on narrow screens to avoid wrapping the footer
// onto two lines.
function KeyboardHints() {
  return (
    <KbdHint
      className="hidden sm:inline-flex"
      items={[
        { keys: ['A'], label: 'accept' },
        { keys: ['←'], label: 'prev' },
        { keys: ['→'], label: 'skip' },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// New-rule modal — opens from the gap row "+ Add rule" button and from
// the page-header "New rule" button. Captures the 4 fields a CPA
// minimally needs (Title, Form name, Tax type, Due-date description)
// and stubs the other 20+ ObligationRule fields with sensible defaults
// so the form fits the contract without burying the user in compliance
// metadata.
//
// `createCustomRule` immediately ACTIVATES the rule (server forces
// `status: 'active'`), so the modal makes that explicit in the helper
// banner. Future iteration: a richer form to refine due-date logic,
// extension policy, evidence.
// ---------------------------------------------------------------------------

// 2026-05-27 (audit-drain ζ R5.3 — canonical tax-type picker):
//
// The new-rule modal's Tax type field used to be a free-form `<Input>`
// with placeholder "e.g. income, sales, payroll". CPAs typed "Income
// tax", "income", "Income" — three rows for the same concept, which
// poisoned the rule library's tax-type facet and broke filtering
// downstream.
//
// Canonical tax-type codes follow the snake_case shape `federal_1040`
// / `ca_568` / `ny_ct3s` that lives in `lib/tax-codes` (`TAX_CODES`).
// We curate a per-jurisdiction subset of the most common codes here
// rather than re-exporting the full table — the new-rule path is
// rare enough that the curated short-list (10-12 per jurisdiction)
// covers the realistic creation cases without forcing a user to
// memorise the snake_case form. A "create new tax type" affordance
// is intentionally not in this iteration; the SearchableCombobox
// shape is single-select-from-list and the v2 audit can layer a
// `+ Add custom` row when the demand surfaces.
//
// Jurisdictions NOT in this map (most of the long-tail STATE_RULE_
// JURISDICTIONS) fall back to a generic federal-leaning list so the
// modal still works.

const COMMON_TAX_TYPE_CODES_BY_JURISDICTION: Record<string, readonly string[]> = {
  FED: [
    'federal_1040',
    'federal_1040_estimated_tax',
    'federal_1041',
    'federal_1065',
    'federal_1120',
    'federal_1120s',
    'federal_4868',
    'federal_7004',
    'federal_941',
    'federal_990',
    'federal_1099_nec',
    'federal_fbar',
  ],
  CA: [
    'ca_100',
    'ca_100s',
    'ca_540',
    'ca_541',
    'ca_565',
    'ca_568',
    'ca_llc_annual_tax',
    'ca_llc_estimated_fee',
    'ca_ptet',
  ],
  NY: [
    'ny_ct3',
    'ny_ct3s',
    'ny_it201',
    'ny_it204',
    'ny_it204ll',
    'ny_it205',
    'ny_llc_filing_fee',
    'ny_ptet',
  ],
  TX: ['tx_franchise_tax', 'tx_franchise_report', 'tx_franchise_extension'],
  FL: ['fl_corp_income'],
  WA: ['wa_b_o', 'wa_combined_excise_quarterly'],
  IL: ['il_il1040', 'il_il1120'],
}

const FALLBACK_TAX_TYPE_CODES: readonly string[] = COMMON_TAX_TYPE_CODES_BY_JURISDICTION.FED ?? []

function comboboxTaxTypeOptionsForJurisdiction(
  jurisdiction: RuleJurisdiction | undefined,
): SearchableComboboxOption[] {
  const codes =
    (jurisdiction ? COMMON_TAX_TYPE_CODES_BY_JURISDICTION[jurisdiction] : undefined) ??
    FALLBACK_TAX_TYPE_CODES
  return codes.map((code) => ({
    value: code,
    label: formatTaxCode(code),
    // Raw snake_case is shown as tertiary meta so the CPA who knows
    // the code can confirm the mapping. Keyword fold lets typing
    // "1120s" surface "Form 1120-S" even though the label drops
    // the underscore.
    meta: code,
    keywords: [code, code.replace(/_/g, ' ')],
  }))
}

function NewRuleModal({
  seed,
  onClose,
}: {
  seed: { jurisdiction?: RuleJurisdiction; entity?: EntityKey }
  onClose: () => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [formName, setFormName] = useState('')
  const [taxType, setTaxType] = useState('')
  const [dueDateDescription, setDueDateDescription] = useState('')

  // Jurisdiction-aware option list. Recomputed when the seed changes
  // (which only happens when the dialog opens) so the typeahead list
  // matches what the rule will actually carry.
  const taxTypeOptions = useMemo(
    () => comboboxTaxTypeOptionsForJurisdiction(seed.jurisdiction),
    [seed.jurisdiction],
  )

  const mutation = useMutation(
    orpc.rules.createCustomRule.mutationOptions({
      onSuccess: () => {
        // Re-fetch rules + coverage so the new rule appears in the
        // library and the gap row disappears.
        void queryClient.invalidateQueries({ queryKey: orpc.rules.key() })
        toast.success(t`Rule created`)
        onClose()
      },
      onError: (error) => {
        toast.error(t`Couldn't create rule`, {
          description: error instanceof Error ? error.message : undefined,
        })
      },
    }),
  )

  const needsPicker = !seed.jurisdiction || !seed.entity

  const canSubmit =
    !needsPicker &&
    title.trim().length > 0 &&
    formName.trim().length > 0 &&
    taxType.trim().length > 0 &&
    dueDateDescription.trim().length > 0 &&
    !mutation.isPending

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit || !seed.jurisdiction || !seed.entity) return
    const today = new Date()
    const year = today.getUTCFullYear()
    const todayIso = today.toISOString().slice(0, 10)
    const nextReview = new Date(today)
    nextReview.setUTCFullYear(year + 1)
    const nextReviewIso = nextReview.toISOString().slice(0, 10)
    // Stable-looking ID. Practice rules are tenant-scoped server side.
    const ruleId = `custom_${seed.jurisdiction.toLowerCase()}_${seed.entity}_${Date.now()}`
    // Stubs for fields the user isn't asked to provide. Server
    // overrides `status`, `verifiedBy`, `verifiedAt`, but the contract
    // still requires valid values here so we pass placeholders
    // matching the schemas.
    const rule: ObligationRule = {
      id: ruleId,
      title: title.trim(),
      jurisdiction: seed.jurisdiction,
      entityApplicability: [seed.entity],
      taxType: taxType.trim(),
      formName: formName.trim(),
      eventType: 'filing',
      isFiling: true,
      isPayment: false,
      taxYear: year,
      applicableYear: year,
      ruleTier: 'basic',
      status: 'active',
      coverageStatus: 'manual',
      riskLevel: 'med',
      requiresApplicabilityReview: false,
      dueDateLogic: {
        kind: 'source_defined_calendar',
        description: dueDateDescription.trim(),
        holidayRollover: 'next_business_day',
      },
      extensionPolicy: {
        available: false,
        paymentExtended: false,
        notes: 'No extension policy defined for this custom rule.',
      },
      sourceIds: [],
      evidence: [],
      defaultTip: title.trim(),
      quality: {
        filingPaymentDistinguished: false,
        extensionHandled: false,
        calendarFiscalSpecified: false,
        holidayRolloverHandled: false,
        crossVerified: false,
        exceptionChannel: false,
      },
      verifiedBy: 'pending',
      verifiedAt: todayIso,
      nextReviewOn: nextReviewIso,
      version: 1,
    }
    const payload: RuleCustomRuleInput = {
      rule,
      reviewNote: `Custom rule created from Rule library: ${title.trim()}`,
    }
    mutation.mutate(payload)
  }

  const titleLabel =
    seed.jurisdiction && seed.entity
      ? t`New rule for ${seed.jurisdiction} · ${ENTITY_LABELS[seed.entity]}`
      : t`New custom rule`

  return (
    <Dialog protectInput open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent showCloseButton className="flex max-h-[85vh] max-w-[560px] flex-col gap-0 p-0">
        <DialogHeader className="border-b border-divider-subtle px-5 py-3">
          <DialogTitle className="text-sm font-semibold text-text-primary">
            {titleLabel}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {needsPicker ? (
              // Header "New rule" path — no jurisdiction/entity seed.
              // Full jurisdiction + entity pickers would expand scope;
              // for now we route users back to a specific gap row so
              // the rule has unambiguous applicability.
              <div className="flex flex-col gap-2 rounded-lg border border-divider-subtle bg-background-subtle px-3 py-3 text-xs text-text-secondary">
                <Trans>
                  Custom rules start from a missing-rule row, so the jurisdiction and entity are
                  unambiguous. Click "+ Add rule" on a coverage-gap row in a jurisdiction group — or
                  review what's missing across next year's deadlines:
                </Trans>
                <Link
                  to="/rules/preview"
                  className="w-fit font-medium text-text-accent underline-offset-2 hover:underline"
                >
                  <Trans>Open the Annual rollover preview →</Trans>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Disclosure: this rule will ACTIVATE immediately.
                    Server forces `status: 'active'` on createCustomRule. */}
                <div className="rounded-lg border border-state-warning-hover-alt bg-state-warning-hover px-3 py-2 text-xs text-text-secondary">
                  <Trans>
                    This rule will be active immediately for every client filing in{' '}
                    {seed.jurisdiction} as {ENTITY_LABELS[seed.entity ?? 'llc']}. You can refine the
                    details after creating it from the rule's detail view.
                  </Trans>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-rule-title">
                    <Trans>Title</Trans>
                  </Label>
                  <Input
                    id="new-rule-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t`e.g. Quarterly estimated tax for trusts`}
                    autoFocus
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-rule-form">
                      <Trans>Form name</Trans>
                    </Label>
                    <Input
                      id="new-rule-form"
                      value={formName}
                      onChange={(event) => setFormName(event.target.value)}
                      placeholder={t`e.g. Form 41-ES`}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-rule-tax-type">
                      <Trans>Tax type</Trans>
                    </Label>
                    {/* 2026-05-27 (audit-drain ζ R5.3): swapped a
                        free-form Input for a SearchableCombobox over
                        the curated jurisdiction-specific tax-code
                        list (see COMMON_TAX_TYPE_CODES_BY_
                        JURISDICTION above). The old field accepted
                        "Income tax", "income", "Income" as three
                        different strings — every typo silently
                        created a new facet value in the rule
                        library's tax-type filter. Constraining the
                        list to canonical codes (with `formatTaxCode`
                        for the user-facing label and the snake_case
                        shown as tertiary meta) keeps the saved
                        `rule.taxType` consistent with the rest of
                        the matrix. Required-state is enforced via
                        canSubmit's `taxType.trim().length > 0`. */}
                    <SearchableCombobox
                      id="new-rule-tax-type"
                      value={taxType.length > 0 ? taxType : null}
                      onValueChange={setTaxType}
                      options={taxTypeOptions}
                      placeholder={t`Pick a tax type…`}
                      searchPlaceholder={t`Search tax types…`}
                      ariaLabel={t`Tax type`}
                      emptyState={<Trans>No tax types match your search.</Trans>}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-rule-due">
                    <Trans>When is it due?</Trans>
                  </Label>
                  <Textarea
                    id="new-rule-due"
                    value={dueDateDescription}
                    onChange={(event) => setDueDateDescription(event.target.value)}
                    placeholder={t`Describe the due-date pattern in plain English. You can refine the calendar logic from the rule's detail view after creation.`}
                    rows={3}
                    required
                  />
                  <p className="text-caption text-text-tertiary">
                    <Trans>
                      The rule starts with a source-defined calendar. Refine to a specific date or
                      schedule after creation.
                    </Trans>
                  </p>
                </div>
              </div>
            )}
          </div>
          <footer className="flex items-center justify-end gap-2 border-t border-divider-subtle px-5 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {needsPicker ? <Trans>Close</Trans> : <Trans>Cancel</Trans>}
            </Button>
            {needsPicker ? null : (
              <Button type="submit" size="sm" disabled={!canSubmit} aria-busy={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                    <Trans>Creating…</Trans>
                  </>
                ) : (
                  <Trans>Create rule</Trans>
                )}
              </Button>
            )}
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}
