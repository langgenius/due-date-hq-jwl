import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useLingui, Trans, Plural } from '@lingui/react/macro'
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheck,
  CircleSlash,
  ExternalLinkIcon,
  LibraryIcon,
  LinkIcon,
  MessageSquareText,
  MoreHorizontalIcon,
  PlusIcon,
  RadioTowerIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs'

import type {
  ObligationRule,
  RuleConcreteDraftCacheEntry,
  RuleCoverageRow,
  RuleCustomRuleInput,
  RuleJurisdiction,
  RuleStatus,
} from '@duedatehq/contracts'

// `RuleTier` isn't re-exported from the contracts package today —
// infer it from the same union literal the schema uses.
type RuleTier = ObligationRule['ruleTier']
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Label } from '@duedatehq/ui/components/ui/label'
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
import { CountDotChip } from '@/components/primitives/count-dot-chip'
import { SearchInput } from '@/components/primitives/search-input'
import { StateBadge } from '@/components/primitives/state-badge'
import { RuleDetailCompact, RuleDetailInline } from '@/features/rules/rule-detail-drawer'
import { jurisdictionLabel } from '@/features/rules/rules-console-model'
import { formatTaxCode } from '@/lib/tax-codes'
import { orpc } from '@/lib/rpc'

/**
 * Rule library v3 (2026-05-21 preview) — one surface, no toggle.
 *
 * Structure:
 *   - Rules grouped by jurisdiction (Federal first, states alphabetical)
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

type EntityKey = keyof RuleCoverageRow['entityCoverage']

const ENTITY_KEYS: readonly EntityKey[] = [
  'llc',
  'partnership',
  's_corp',
  'c_corp',
  'sole_prop',
  'individual',
  'trust',
] as const

const ENTITY_LABELS: Record<EntityKey, string> = {
  llc: 'LLC',
  partnership: 'Partnership',
  s_corp: 'S-Corp',
  c_corp: 'C-Corp',
  sole_prop: 'Sole prop',
  individual: 'Individual',
  trust: 'Trust',
}

type CoverageState = 'active' | 'review' | 'none' | 'not_applicable'

// Short column-header labels for the 7 per-entity columns. Fit in
// ~36px column widths; full names live in `ENTITY_LABELS` for the
// header `title` attribute + EntityCoverageDots tooltip.
//
// 2026-05-26 (Yuqi follow-up — "back to the version before merge.
// each row of rule has the entity dots, and there is an overview
// of the State in general. Not just the dots like now. They are
// to the columns"): full pre-distill layout restored. Each rule
// row gets per-entity applicability dots in its own column; each
// STATE row gets a per-entity overview cell (count of rules for
// that entity in that state, with a colored status icon — green
// check / amber warning / red empty-ring — depending on coverage).
const ENTITY_COLUMN_LABELS: Record<EntityKey, string> = {
  llc: 'LLC',
  partnership: 'Part',
  s_corp: 'S-Corp',
  c_corp: 'C-Corp',
  sole_prop: 'Sole',
  individual: 'Ind',
  trust: 'Trust',
}

// Total table column count: Rule + Form + 7 per-entity columns +
// Tier.
const RULES_TABLE_COLUMN_COUNT = 3 + ENTITY_KEYS.length

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

type RuleConcreteDraftTarget = {
  ruleId: string
  sourceId: string
  sourceSignalId?: string
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

function concreteDraftTargetKey(input: {
  ruleId: string
  sourceId: string
  sourceSignalId?: string | null
}): string {
  return [input.ruleId, input.sourceId].join(':')
}

function useStatusGroupLabels(): Record<StatusGroupKey, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      needs_review: t`Needs review`,
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

// 2026-05-26 (Yuqi rule library deferred batch — /distill):
// `EntityStateCell` + `EntityApplicabilityCell` retired. The 7-column
// entity matrix on the state row was the densest area of the table
// (~12 elements per row); we collapsed it into a single
// `EntityCoverageDots` summary below + moved per-rule applicability
// into the rule-detail Dialog (`RuleDetailInline`'s Applicability
// section already renders the "Applies to LLC, Partnership, …"
// line). The retired components are gone — see git blame on this
// file pre-2026-05-26 for the prior shape.

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
// 2026-05-26 (Yuqi /critique — "entity table-cell 可以更informative，
// 现在一眼望过去都差不多看不出差别"): conditional pending/total
// format so the eye automatically lands on cells with pending work.
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
    // 2026-05-26 (Yuqi follow-up): pending count `1` carries the
    // accent tone (matches every other "needs review" indicator);
    // slash + total `3` both dim down to `text-text-tertiary` —
    // the total isn't the actionable number, just context for the
    // pending part. Reading "1/3" your eye lands on the bright
    // accent 1, the muted /3 supplies "of how many" without
    // competing for attention.
    return (
      <span
        className="inline-flex items-baseline gap-0.5 text-sm font-medium tabular-nums"
        title={`${pendingReviewCount} of ${count} need review`}
      >
        <span className="text-text-accent">{pendingReviewCount}</span>
        <span className="text-text-tertiary">/{count}</span>
      </span>
    )
  }
  return <span className="text-sm font-medium tabular-nums text-text-primary">{count}</span>
}

// EntityApplicabilityCell — per-rule per-entity dot. Status-tinted
// dot when the rule applies to this entity; faint placeholder
// otherwise. Reads as scan texture beneath the state-level summary.
function EntityApplicabilityCell({ applies, status }: { applies: boolean; status: RuleStatus }) {
  if (!applies) {
    return <span aria-hidden className="mx-auto block size-[3px] rounded-full bg-divider-subtle" />
  }
  const tone = STATUS_TONE[status]
  return (
    <span
      aria-hidden
      className={cn(
        'mx-auto block size-1.5 rounded-full',
        tone === 'success' && 'bg-state-success-solid',
        tone === 'review' && 'bg-accent-default',
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
function RuleStatusBar({ rules }: { rules: ObligationRule[] }) {
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
    <span
      className="inline-flex h-1.5 w-28 overflow-hidden rounded-full bg-background-subtle"
      title={`${counts.active} active · ${counts.review} need review${
        counts.other > 0 ? ` · ${counts.other} other` : ''
      }`}
    >
      {counts.active > 0 ? (
        <span className="block bg-state-success-solid" style={{ flex: counts.active }} />
      ) : null}
      {counts.review > 0 ? (
        <span className="block bg-accent-default" style={{ flex: counts.review }} />
      ) : null}
      {counts.other > 0 ? (
        <span className="block bg-divider-regular" style={{ flex: counts.other }} />
      ) : null}
    </span>
  )
}

// Strip the jurisdiction name from the start of a rule title. The
// state is already shown in the group header above; rule titles
// like "Alabama individual income tax" repeat the state name once
// per row, making the rule column hard to scan. Drop the prefix
// (and any leading separator), capitalize the first letter so
// "individual income tax" reads as a sentence start.
function stripJurisdictionPrefix(title: string, jurisLabel: string): string {
  const trimmedTitle = title.trim()
  const label = jurisLabel.trim()
  if (!label) return trimmedTitle
  const lcTitle = trimmedTitle.toLowerCase()
  const lcLabel = label.toLowerCase()
  if (!lcTitle.startsWith(lcLabel)) return trimmedTitle
  let stripped = trimmedTitle.slice(label.length).trimStart()
  // Drop a leading separator if present (em-dash, dash, colon).
  stripped = stripped.replace(/^[-:·—]+\s*/, '')
  if (!stripped) return trimmedTitle
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}

// Form-cell renderer. Shows the form code (or the canonical em-dash
// placeholder when no form is set) in regular sans-serif text.
// Tooltip carries the humanized tax type.
// 2026-05-26 (Yuqi cross-table audit — unify empty-cell treatment):
// the previous "(no form)" prose placeholder drifted from /clients +
// /deadlines, which use the EmptyCellMark em-dash. Aligned to the
// canonical primitive — one empty-cell visual across every table.
// 2026-05-26 (Yuqi cross-table drift #14 — "TaxCodeLabel / form-code
// rendering: one shape"): Rules library renders `rule.formName` (the
// rule's own authored form-name string) rather than going through
// `TaxCodeLabel` like /deadlines and /clients do. Reason: each rule
// owns an authoritative form-name field set when the rule was created,
// which may diverge from what `describeTaxCode(taxType)` would resolve.
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
    // Per-entity pending-review count (2026-05-26 Yuqi /critique —
    // "entity table-cell 可以更informative"): the EntityStateCell
    // uses this to render the `pending/total` format in warning tone
    // when at least one rule for that entity needs review.
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
    groups.push({
      jurisdiction: jur,
      label: jurisdictionLabel(jur),
      rules: groupRules,
      coverage,
      sourceCoverage,
      ruleCount: groupRules.length,
      gapEntities,
      hasGap: gapEntities.length > 0 || pendingReviewCount > 0,
      pendingReviewCount,
      entityCounts,
      entityPendingReviewCounts,
    })
  }
  // Sort: federal first, then jurisdictions with gaps, then by name.
  return groups.toSorted((a, b) => {
    if (a.jurisdiction === 'FED' && b.jurisdiction !== 'FED') return -1
    if (b.jurisdiction === 'FED' && a.jurisdiction !== 'FED') return 1
    if (a.hasGap !== b.hasGap) return a.hasGap ? -1 : 1
    return a.label.localeCompare(b.label)
  })
}

function defaultExpandedSet(): Set<RuleJurisdiction> {
  // Keep first paint compact: jurisdictions, including Federal, open
  // only when the user expands them or uses Expand all.
  return new Set<RuleJurisdiction>()
}

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

// Status tone palette — `review` is its own tone (accent blue), NOT
// reused with `warning`. Amber/warning is reserved for true caution
// states (paused sources, expiring auth) so the eye learns one
// signal = one meaning. Pre-2026-05-21 we shared amber for both,
// which conflated "in-progress work" with "needs caution."
const STATUS_TONE: Record<RuleStatus, 'success' | 'review' | 'destructive' | 'muted'> = {
  active: 'success',
  verified: 'success',
  pending_review: 'review',
  candidate: 'review',
  rejected: 'destructive',
  archived: 'muted',
  deprecated: 'muted',
}

// 2026-05-26 (Yuqi follow-up — "hovering onto the row currently
// just changes the background — but can actually expand the
// green dot/blue dot to a word explanation of what is happening
// at the entity"): single-word label per status, rendered next to
// the leading status dot on row hover. Sits ASIDE the dot rather
// than replacing it so the dot remains the resting affordance and
// the word reveals on demand. Kept short (1-2 words) so the hover-
// expand doesn't shift the title further than the row width can
// absorb.
const STATUS_LABEL_SHORT: Record<RuleStatus, string> = {
  active: 'Active',
  verified: 'Verified',
  pending_review: 'Needs review',
  candidate: 'Candidate',
  rejected: 'Rejected',
  archived: 'Archived',
  deprecated: 'Deprecated',
}

// ---------------------------------------------------------------------------
// Main route
// ---------------------------------------------------------------------------

export function RulesLibraryRoute() {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
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
  // 2026-05-26 (Yuqi cross-table drift #3 — "clients and rule library
  // are prev/next + page count footer"): page index for jurisdiction-
  // group pagination. nuqs-bound so the active page deep-links + the
  // browser back button moves between pages. Resets to 0 whenever a
  // filter/search/scope change shrinks the result set (see effect
  // below).
  const [page, setPage] = useQueryState('page', parseAsInteger)
  const pageIndex = page ?? 0
  // 2026-05-26 (Yuqi /rules/library critique P0): scope tabs above
  // the table. URL-bound so the active scope deep-links. Default is
  // 'all'. `null` from nuqs maps back to 'all' for the activeScope
  // computation so the chip is always one of the four known states.
  const [scope, setScope] = useQueryState(
    'scope',
    parseAsStringLiteral(['all', 'active', 'review', 'missing'] as const),
  )
  const activeScope = scope ?? 'all'
  const isSearching = (search ?? '').trim().length > 0
  // Batch-review state. `selectedRuleIds` tracks which needs-review
  // rules the user has checked off. `batchReviewRuleIds` snapshots the
  // queue when the modal opens so progress stays anchored to the
  // original session even as accepted rules leave the live pending
  // set. `batchReviewIndex` is the currently-shown card in the
  // review modal; `null` means the modal is closed.
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(() => new Set())
  const [batchReviewRuleIds, setBatchReviewRuleIds] = useState<string[] | null>(null)
  const [batchReviewIndex, setBatchReviewIndex] = useState<number | null>(null)
  const [batchReviewDirty, setBatchReviewDirty] = useState(false)
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

  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data])
  const rulesById = useMemo(() => new Map(rules.map((rule) => [rule.id, rule])), [rules])
  const coverageRows = useMemo(() => coverageQuery.data ?? [], [coverageQuery.data])
  // Apply entity + scope filter. Entity slices by who-the-rule-applies-to;
  // scope slices by review state. Coverage rows stay untouched —
  // state-level coverage signals reflect the full picture regardless
  // of filter.
  // 2026-05-26 (Yuqi /rules/library critique P0): scope tabs filter
  // rules ahead of grouping. 'all' = no filter; 'active' = status
  // active|verified; 'review' = pending-review group; 'missing' is
  // handled at the group level (post-build) since it filters by
  // coverage gaps not rule status.
  const filteredRules = useMemo(() => {
    let result = rules
    if (activeEntity) {
      result = result.filter((r) => r.entityApplicability.includes(activeEntity))
    }
    if (activeScope === 'active') {
      result = result.filter((r) => r.status === 'active' || r.status === 'verified')
    } else if (activeScope === 'review') {
      result = result.filter((r) => statusGroupOf(r.status) === 'needs_review')
    }
    // For 'missing' scope, the rules array stays — we still need rule
    // data to identify which entity columns have a rule. Group-level
    // post-filter below restricts to groups with gap entities.
    return result
  }, [rules, activeEntity, activeScope])
  const groupsAll = useMemo(
    () => buildGroups(filteredRules, coverageRows),
    [filteredRules, coverageRows],
  )
  const filteredGroups = useMemo(() => {
    if (activeScope !== 'missing') return groupsAll
    // Missing scope: only state groups that have at least one
    // entity gap (entity × jurisdiction with no rule). Each group's
    // own gapEntities array already encodes the gaps.
    return groupsAll.filter((g) => g.gapEntities.length > 0)
  }, [groupsAll, activeScope])
  // 2026-05-26 (Yuqi cross-table drift #3 — "clients and rule library
  // are prev/next + page count footer"): paginate jurisdiction groups
  // so the catalog feel matches /clients. Page size of 10 groups gives
  // ~6 pages for the 52-jurisdiction catalog — fast prev/next without
  // burying any state more than 5 pages deep. The user picks a state
  // by paging or by typing it into the search filter (which surfaces
  // matches across ALL pages by reducing `filteredGroups` further).
  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE))
  // Clamp page in case the filter shrinks the result set below the
  // current page. nuqs holds the value as-is; this just trims the
  // index used for slicing + display.
  const clampedPageIndex = Math.min(pageIndex, totalPages - 1)
  const groups = useMemo(
    () => filteredGroups.slice(clampedPageIndex * PAGE_SIZE, (clampedPageIndex + 1) * PAGE_SIZE),
    [filteredGroups, clampedPageIndex],
  )
  // Reset to page 0 whenever a filter/scope/search change shrinks
  // result set so the user always sees the first matching groups
  // rather than landing on an empty page mid-catalog.
  useEffect(() => {
    if (pageIndex > 0 && pageIndex > totalPages - 1) {
      void setPage(0)
    }
  }, [pageIndex, totalPages, setPage])
  // 2026-05-26 (Yuqi seventy-second pass — product feel sweep):
  // `sourceCounts` + `totalGaps` retired with the 3-tile scoreboard.
  // Total rule count drives the page-header chip; per-entity gap
  // count surfaces on each chip in EntityChipRow.
  // 2026-05-26 (Yuqi feedback — "把进度条放回来"): restored
  // `totalActive` + `totalPendingReview` because the top-of-page
  // progress bar (active filled vs needs-review trailing) is back
  // in StatsBar. Same two values the third-pass implementation used.
  // 2026-05-26 (Stripe S14 restyle, merged with Phase A/B): progress
  // bar now reads as a multi-color stacked breakdown — one segment
  // per `RuleStatus` with >0 rules. `statusCounts` is the data; the
  // bar derives segment widths + label fits from it. Scope tab
  // counts (`totalActive`, `totalPendingReview`, `totalGapEntities`)
  // are computed against the UNFILTERED rules + `groupsAll` so the
  // tab badges stay stable as the user toggles scopes.
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
    setExpanded(defaultExpandedSet())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [jurisdictionFingerprint])

  const toggleGroup = useCallback((jur: RuleJurisdiction) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(jur)) next.delete(jur)
      else next.add(jur)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpanded(new Set(groups.map((g) => g.jurisdiction)))
  }, [groups])
  const collapseAll = useCallback(() => {
    setExpanded(new Set())
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

  const openBatchReview = useCallback(() => {
    if (selectedReviewRules.length === 0) return
    setBatchReviewRuleIds(selectedReviewRules.map((rule) => rule.id))
    setBatchReviewIndex(0)
    setBatchReviewDirty(false)
  }, [selectedReviewRules])

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
      if (shouldRefresh) refreshAfterBatchReview()
      setBatchReviewRuleIds(null)
      setBatchReviewIndex(null)
      setBatchReviewDirty(false)
    },
    [refreshAfterBatchReview],
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

  const handleExport = useCallback(() => {
    // Placeholder — real impl calls orpc.rules.coverage.export which
    // streams CSV. For prototype, just toast (no backend procedure).
    void navigate('#export-coverage')
  }, [navigate])

  // Start the batch review queue with everything that's pending. The
  // header button is the "I just want to clear my review queue" path
  // (CPA opens the page, hits Start review, walks through 459 cards).
  const startReviewAll = useCallback(() => {
    if (allReviewableRuleIds.length === 0) return
    setSelectedRuleIds(new Set(allReviewableRuleIds))
    setBatchReviewRuleIds(allReviewableRuleIds)
    setBatchReviewIndex(0)
    setBatchReviewDirty(false)
  }, [allReviewableRuleIds])

  const selectAllPending = useCallback(() => {
    setSelectedRuleIds(new Set(allReviewableRuleIds))
  }, [allReviewableRuleIds])

  // Header actions cluster — sits inline with the page title via the
  // shell's `actions` slot. Replaces the prior standalone PageActions
  // row (which left a ~48px dead zone between the title and the next
  // content block).
  const reviewCount = allReviewableRuleIds.length
  const currentBatchReviewRuleId =
    batchReviewIndex === null ? null : (batchReviewRuleIds?.[batchReviewIndex] ?? null)
  const currentBatchReviewRule = currentBatchReviewRuleId
    ? (rulesById.get(currentBatchReviewRuleId) ?? null)
    : null
  // 2026-05-26 (Yuqi follow-up — "Sources and New rule should be
  // outside the ⋯"): promoted Sources + New rule out of the overflow
  // menu so the two most frequent header actions are one-click. The
  // ⋯ menu now carries only Export coverage (a rare, advanced
  // operation that doesn't warrant chrome real estate).
  //
  // Layout per scope:
  //   reviewCount > 0  → [⋯] [Sources] [+ New rule (outline)] [Start review N (primary)]
  //   reviewCount === 0 → [⋯] [Sources] [+ New rule (primary)]
  //
  // The header keeps a single primary CTA. When there's a review
  // queue Start review wins; otherwise New rule becomes primary so
  // the page never has zero primary actions.
  const headerActions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon-sm" aria-label={t`More library actions`}>
              <MoreHorizontalIcon className="size-4" aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-[200px]">
          <DropdownMenuItem onClick={handleExport}>
            <ArrowUpRightIcon className="size-4" aria-hidden />
            <Trans>Export coverage</Trans>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="sm" render={<Link to="/rules/sources" />}>
        <RadioTowerIcon data-icon="inline-start" />
        <Trans>Sources</Trans>
      </Button>
      {reviewCount > 0 ? (
        <>
          <Button variant="outline" size="sm" onClick={openNewRule}>
            <PlusIcon data-icon="inline-start" />
            <Trans>New rule</Trans>
          </Button>
          <Button size="sm" onClick={startReviewAll}>
            <Trans>Start review</Trans>
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-background-default px-1.5 text-xs tabular-nums text-text-accent">
              {reviewCount}
            </span>
          </Button>
        </>
      ) : (
        // No-review baseline: + New rule promotes to the primary
        // slot so the header always carries a single primary action.
        <Button size="sm" onClick={openNewRule}>
          <PlusIcon data-icon="inline-start" />
          <Trans>New rule</Trans>
        </Button>
      )}
    </>
  )

  // 2026-05-26 (Yuqi rule library deferred batch — /adapt):
  // keyboard navigation across the rule grid. Power users running 476
  // rules need J/K row nav + Enter/Esc/e for the same muscle memory
  // /deadlines exposes (see obligations.tsx `useAppHotkey('J'…)`).
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

  // 2026-05-26 (Yuqi follow-up — "collapse the search into a ghost
  // icon and put it besides the entity chip row, click to expand"):
  // search now starts as a ghost icon and expands into the
  // SearchInput on click or `/` hotkey. Matches /deadlines'
  // ObligationQueueSearchControl pattern. Open state is lifted so
  // the `/` hotkey can expand the collapsed control before focusing.
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

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

  return (
    // 2026-05-26 (Yuqi /rules/library critique P0 — structural pass):
    // Rule library adopts the canonical sticky-footer + table-card +
    // independent-scroll mechanism that /deadlines + /alerts + /clients
    // run. Replaces the prior RulesPageShell wrapping (Regular variant
    // + frameless table + page-level scroll). PageHeader + progress
    // bar + scope tabs + search + entity chips stay pinned above; only
    // the rule grid scrolls. `max-w-[1440px]` cap preserved so the
    // jurisdiction + entity matrix has room to breathe at desktop.
    <div
      className={cn(
        'mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 pt-6 pb-0 md:px-6 md:pt-8 md:pb-0',
        'xl:h-screen xl:overflow-hidden',
      )}
    >
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Trans>Rule library</Trans>
            {!rulesQuery.isLoading ? (
              <span className="rounded-full bg-state-base-hover px-2 py-0.5 text-xs font-medium tabular-nums text-text-secondary">
                <Plural value={totalRules} one="# rule" other="# rules" />
              </span>
            ) : null}
          </span>
        }
        actions={headerActions}
      />

      {/* Progress bar — completion meter (active LEFT / needs-review
          RIGHT). Yuqi explicitly asked for this to stay at the top
          ("把进度条放回来"). */}
      <RuleReviewProgressBar
        {...(statsLoading ? ({ loading: true } as const) : ({ statusCounts } as const))}
      />

      {/* Scope tabs — primary navigation axis. All / Active / Needs
          review / Missing. Tab counts are pinned to the unfiltered
          rules + groupsAll so badges stay stable as the user toggles
          scopes (each tab is honest about what it'll show). */}
      <ScopeTabBand
        activeScope={activeScope}
        totalAll={totalRules}
        totalActive={totalActive}
        totalReview={totalPendingReview}
        totalMissing={totalGapEntities}
        onChange={(next) => void setScope(next === 'all' ? null : next)}
      />

      {/* Filter row — entity-filter chips + collapsible search.
          2026-05-26 (Yuqi follow-up): chips and search now share a
          single row (`justify-between`). Search starts as a ghost
          icon button and expands inline when clicked or `/` is
          pressed. Matches /deadlines' compact filter band. */}
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
        <RuleSearchControl
          inputRef={searchInputRef}
          value={search ?? ''}
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onChange={(next) => void setSearch(next || null)}
        />
      </div>

      {/* 2026-05-26 (Yuqi follow-up — move the visible card chrome
          DOWN onto the table-container itself):
            - Outer flex wrapper: lost its `rounded-md`, `border`,
              `border-divider-subtle`. Now a plain `flex-1` shell;
              the bordered card lives one level below.
            - Inner rows-area: lost its `bg-background-default`.
              No longer paints white; the table-container does that.
            - Table primitive: gained `[&_[data-slot=table-container]]:`
              chrome (rounded-md, border, bg) so the actual visible
              card boundary now coincides with the table edge. This
              avoids the layer-mismatch that was producing rounded-
              corner white slivers above the thead.
          The thead's `!bg-background-default-dimmed` sits inside
          this new card. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {rulesQuery.isLoading || coverageQuery.isLoading ? (
            <LoadingState />
          ) : isSearching ? (
            <SearchResultsTable
              rules={matchedRules}
              query={searchLower}
              onRuleClick={handleRuleClick}
              focusedRowId={focusedRowId}
            />
          ) : groups.length === 0 ? (
            // 2026-05-26 (Yuqi rule library deferred batch — /clarify):
            // first-time empty state hoisted OUT of the table chrome.
            // Previously a bare "No rules and no coverage data yet."
            // row sat inside the TableBody; CPAs landing here saw a
            // sad empty table. Now we render the canonical EmptyState
            // primitive (used by /deadlines, /clients, /alerts) with
            // an icon, title, description, and two CTAs — Import from
            // sources (primary, the federal/state catalog we maintain)
            // + New rule (outline, manual entry).
            <RulesLibraryEmptyState onNewRule={openNewRule} />
          ) : (
            <GroupedRulesTable
              groups={groups}
              expanded={expanded}
              onToggle={toggleGroup}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              onRuleClick={handleRuleClick}
              onAddRule={handleAddRule}
              selectedRuleIds={selectedRuleIds}
              onToggleRuleSelection={toggleRuleSelection}
              onToggleRulesSelection={toggleRulesSelection}
              focusedRowId={focusedRowId}
              pageIndex={clampedPageIndex}
              totalPages={totalPages}
              totalGroupCount={filteredGroups.length}
              onPageChange={(next) => void setPage(next === 0 ? null : next)}
            />
          )}
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
      {selectedReviewRules.length > 0 && batchReviewIndex === null ? (
        <BulkReviewBar
          count={selectedReviewRules.length}
          totalPending={allReviewableRuleIds.length}
          onReview={openBatchReview}
          onSelectAll={selectAllPending}
          onClear={clearSelection}
        />
      ) : null}
      {/* Batch-review modal — opens on `Review N rules` click and
          walks the user through each selected rule one card at a
          time, dating-app style. */}
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

// PageActions retired 2026-05-21 — actions moved inline with the
// page title via RulesPageShell's `actions` slot. See header above.

// ---------------------------------------------------------------------------
// Scope tabs band (replaces the prior StatsBar wrapper)
// ---------------------------------------------------------------------------

// 2026-05-26 (Yuqi /rules/library critique P0): ScopeTabBand is the
// primary navigation axis — All / Active / Needs review / Missing.
// Same visual contract as /deadlines' ObligationQueueScopeTab so
// CPAs switching between surfaces read the same tabbar treatment:
// hug-content triggers, accent underline on active, count badge per
// tab, transparent background.
//
// The prior `StatsBar` wrapper (progress + search + chips) is
// retired — those three rows are now siblings in the route's flex
// column. Agent 6's S14 multi-color stacked bar landed on the
// retired StatsBar; the multi-color treatment is preserved by
// re-applying it to `RuleReviewProgressBar` (which now consumes
// `statusCounts` directly — see the bar implementation below).
type ScopeKey = 'all' | 'active' | 'review' | 'missing'

function ScopeTabBand({
  activeScope,
  totalAll,
  totalActive,
  totalReview,
  totalMissing,
  onChange,
}: {
  activeScope: ScopeKey
  totalAll: number
  totalActive: number
  totalReview: number
  totalMissing: number
  onChange: (scope: ScopeKey) => void
}) {
  const { t } = useLingui()
  const tabs: Array<{ key: ScopeKey; label: string; count: number }> = [
    { key: 'all', label: t`All`, count: totalAll },
    { key: 'active', label: t`Active`, count: totalActive },
    { key: 'review', label: t`Needs review`, count: totalReview },
    { key: 'missing', label: t`Missing`, count: totalMissing },
  ]
  // 2026-05-26 (Yuqi follow-up — "Deadlines's Status scopes
  // animation and interaction, same style + interaction + design"):
  // adopted the canonical /deadlines ObligationQueueScopeTab pattern
  // 1:1.
  //   - Outer hairline (`border-b border-divider-regular`) wraps the
  //     row; tabs sit on a `-mb-px` lifted nav so the active
  //     underline overlaps the hairline rather than fighting it.
  //   - `text-base` labels (was `text-sm`), `px-3 py-1.5` padding.
  //   - Active = `font-medium text-text-primary` (was accent-purple
  //     semibold). The neutral active style + animated underline
  //     reads less aggressive than the static rule-library treatment.
  //   - Inactive = transparent 2px bottom border that turns
  //     `divider-deep` on hover — gives the row symmetry on hover
  //     instead of the cold "I just sit here" look that prompted
  //     the "too ugly" callout.
  //   - Active underline is a single `<motion.span layoutId>` that
  //     smoothly slides between tabs on click — same spring tuning
  //     the canonical Deadlines pattern uses.
  return (
    <div className="flex flex-col gap-1.5 border-b border-divider-regular">
      <nav
        className="-mb-px flex flex-1 flex-wrap items-center gap-1"
        aria-label={t`Filter by scope`}
      >
        {tabs.map((tab) => {
          const active = tab.key === activeScope
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(tab.key)}
              className={cn(
                'relative -mb-px flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-base whitespace-nowrap transition-colors',
                active
                  ? 'font-medium text-text-primary'
                  : 'border-b-2 border-transparent text-text-secondary hover:border-divider-deep hover:text-text-primary',
              )}
            >
              <span>{tab.label}</span>
              <span className="text-sm tabular-nums text-text-tertiary">{tab.count}</span>
              {active ? (
                <motion.span
                  layoutId="rule-library-scope-tab-underline"
                  aria-hidden
                  className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-accent-default"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              ) : null}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// 2026-05-26 (Stripe S14 restyle — "Your overview" Payments card):
// Was a two-tone meter (active LEFT vs needs-review RIGHT). Now a
// multi-color stacked bar — one segment per `RuleStatus` with >0
// rules in the catalog. Same h-7 rounded-md shape; the data is
// just broken out finer so the eye reads the actual catalog
// composition (verified / candidate / archived weren't visible
// before, all collapsed into "active" or implicit). Per-segment
// tone uses the canonical token already mapped to each status
// elsewhere in the file (`STATUS_TONE` + `EntityStateCell`).
// Segments hide their label below ~18 % width and fall back to a
// numeric count; the full breakdown lives in the title tooltip
// and aria-label.
type ProgressSegment = {
  status: RuleStatus
  count: number
  label: string
  /** Background color class. */
  bg: string
  /** Text color class, paired with `bg` for adequate contrast. */
  text: string
}

function RuleReviewProgressBar(
  props:
    | { loading: true; statusCounts?: never }
    | { loading?: false; statusCounts: Record<RuleStatus, number> },
) {
  if (props.loading) {
    return (
      <div className="h-7 w-full animate-pulse rounded-md border border-divider-subtle bg-background-subtle" />
    )
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
    active: 'active',
    verified: 'verified',
    pending_review: 'need review',
    candidate: 'candidate',
    rejected: 'rejected',
    archived: 'archived',
    deprecated: 'deprecated',
  }
  const SEGMENT_BG: Record<RuleStatus, string> = {
    active: 'bg-state-success-hover',
    verified: 'bg-state-accent-hover',
    pending_review: 'bg-state-warning-hover',
    candidate: 'bg-state-base-active',
    rejected: 'bg-state-destructive-hover',
    archived: 'bg-divider-regular',
    deprecated: 'bg-divider-regular',
  }
  const SEGMENT_TEXT: Record<RuleStatus, string> = {
    active: 'text-text-success',
    verified: 'text-text-accent',
    pending_review: 'text-text-warning',
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
      className="relative flex h-7 w-full overflow-hidden rounded-md border border-divider-subtle bg-background-subtle"
      role="img"
      aria-label={total > 0 ? `Rule catalog breakdown — ${breakdown}` : 'Empty rule catalog'}
      title={breakdown || undefined}
    >
      {segments.map((segment) => {
        const pct = total > 0 ? (segment.count / total) * 100 : 0
        const labelFits = pct >= 18
        return (
          <div
            key={segment.status}
            className={cn(
              'flex items-center overflow-hidden px-2 transition-[width] duration-300',
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

// 2026-05-26 (Yuqi seventy-second pass): `StatTile` and
// `StatTileSkeleton` retired with the rest of the scoreboard. The
// total rule count → page-header chip; gaps → per-entity-chip
// badge; sources → header action button. Restore from git
// history if a future surface needs the discrete-card metric
// pattern back.

// EntityChipRow — entity-filter chip strip. Each chip is a button:
// clicking applies an entity filter to the rules table below (and to
// search). Clicking the active chip (or "Clear") unsets it.
//
// 2026-05-21 — addresses both /critique P0s:
//
//   1. "Looks like data viz but isn't" — chips now read unambiguously
//      as filter buttons. Each one has a discrete border, hover
//      transitions in border + background + text color, a filled
//      active state, and cursor:pointer (via <button>). The eyebrow
//      label literally says "FILTER BY ENTITY" so the action is
//      stated up front. No more saturated bars to imply data viz.
//
//   2. "Color logic too pessimistic" — the prior implementation
//      lit up a destructive red dot the moment ANY one of 52
//      jurisdictions had a gap for that entity, which fired almost
//      always. Now we show actual gap count as `· N missing` text
//      only when N > 0. The label stays explicit because a bare red
//      number is too easy to misread as a review queue count.
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
      {/* 2026-05-26 (Yuqi seventy-third pass — cross-page chip
          row convention): retired the "FILTER BY ENTITY" eyebrow
          + inline Clear link. No other list page in the product
          labels its filter chip row with an eyebrow — /deadlines
          + /alerts + /clients all rely on the chips themselves
          carrying the meaning. The active chip's dark-filled
          state IS the "this is selected" cue, and clicking that
          same chip again clears the filter (onSelect handler
          calls onClear when isActive). For accessibility the
          group still has an aria-label below; the visible label
          was redundant chrome. */}
      {activeEntity ? (
        <button
          type="button"
          onClick={onClear}
          className="self-start text-caption-xs text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <Trans>Clear filter</Trans>
        </button>
      ) : null}
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={t`Filter the rule table by entity`}
      >
        {entityStats.map(({ entity, count, gapCount }) => {
          const isActive = activeEntity === entity
          const hasGaps = gapCount > 0
          return (
            <button
              key={entity}
              type="button"
              onClick={() => (isActive ? onClear() : onSelect(entity))}
              aria-pressed={isActive}
              title={
                hasGaps
                  ? `${ENTITY_LABELS[entity]} — ${count} ${count === 1 ? 'rule' : 'rules'} · ${gapCount} ${gapCount === 1 ? 'jurisdiction' : 'jurisdictions'} missing a rule`
                  : `${ENTITY_LABELS[entity]} — ${count} ${count === 1 ? 'rule' : 'rules'}`
              }
              className={cn(
                // `items-center` (was `items-baseline`) — the active
                // chip's destructive pill around the gap count has
                // its own padding/leading and didn't sit on the text
                // baseline, so it visibly bobbed up. Centering keeps
                // the label + count + pill aligned on the same midline.
                'group inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs outline-none transition-colors',
                isActive
                  ? 'border-text-primary bg-text-primary text-text-inverted'
                  : 'border-divider-regular bg-background-default text-text-secondary hover:border-text-secondary hover:bg-state-base-hover hover:text-text-primary',
                'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
              )}
            >
              <span>{ENTITY_LABELS[entity]}</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  isActive ? 'text-text-inverted' : 'text-text-primary',
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
                  <span
                    aria-hidden
                    className={cn(
                      'select-none',
                      isActive ? 'text-text-inverted/50' : 'text-text-tertiary',
                    )}
                  >
                    ·
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 tabular-nums',
                      isActive
                        ? 'rounded-full bg-state-destructive-subtle px-1.5 text-caption font-semibold leading-4 text-text-destructive'
                        : 'font-medium text-text-destructive',
                    )}
                  >
                    <span>{gapCount}</span>
                    <span className="font-normal">
                      <Trans>missing</Trans>
                    </span>
                  </span>
                </>
              ) : null}
            </button>
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
// Search bar
// ---------------------------------------------------------------------------

// 2026-05-25 (Yuqi cross-surface "search pattern same on each
// page" directive): the local SearchBar component was retired in
// favour of the canonical SearchInput primitive
// (apps/app/src/components/primitives/search-input.tsx). The
// primitive carries the same height / icon / clear-button /
// Escape-to-clear behavior the prior local impl had — call sites
// migrated below now share the exact same control with the
// /deadlines queue (and any future surfaces that adopt it).
// 2026-05-26 (Yuqi cross-product search audit, Phase 1): placeholder
// changed from "Search rules…" to "Filter rules…". The mental model
// is: this input narrows the rule list visible on THIS page, it
// doesn't search globally. Aligning the verb with the verb removes
// the conceptual overlap with cmd+k (which will become real entity
// search in Phase 2). `hotkey="/"` opts into the primitive's
// page-search hotkey + kbd hint convention.
// 2026-05-26 (Yuqi follow-up — "collapse the search into a ghost
// icon and put it besides the entity chip row"): collapsible search
// control. Renders as a ghost icon button at rest; expands inline
// into the canonical `SearchInput` on click or `/` hotkey. Open
// state is lifted so the `/` hotkey can expand → focus in one
// gesture. Mirrors /deadlines `ObligationQueueSearchControl`.
function RuleSearchControl({
  inputRef,
  value,
  open,
  onOpenChange,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  value: string
  open: boolean
  onOpenChange: (next: boolean) => void
  onChange: (next: string) => void
}) {
  const { t } = useLingui()
  // Open when explicitly opened OR when a query is already active —
  // collapsing while text remains would hide active state.
  const isOpen = open || value.length > 0
  // `/` hotkey expands the collapsed control AND focuses the input
  // in one gesture. SearchInput's own `hotkey` prop can't drive this
  // path because when collapsed the input isn't mounted yet.
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  useAppHotkey(
    '/',
    () => {
      onOpenChange(true)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    },
    {
      enabled: !shortcutsBlocked,
      meta: {
        id: 'rules.library.focus-search',
        name: 'Filter rules',
        description: 'Focus the Rule library filter input.',
        category: 'rules',
        scope: 'route',
      },
    },
  )
  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t`Filter rules`}
        title={t`Filter rules  ·  press / to focus`}
        onClick={() => {
          onOpenChange(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        className="shrink-0"
      >
        <SearchIcon className="size-4" aria-hidden />
      </Button>
    )
  }
  return (
    <div className="relative w-full md:w-56 md:flex-none">
      <SearchInput
        ref={inputRef}
        value={value}
        onChange={onChange}
        placeholder={t`Filter rules…`}
        ariaLabel={t`Filter rules`}
        onFocus={() => onOpenChange(true)}
        onBlur={() => {
          if (value.length === 0) onOpenChange(false)
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-divider-subtle p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

// 2026-05-26 (Yuqi rule library deferred batch — /adapt):
// RowNavHints — the kbd-strip surfaced in the grid toolbar so power
// users discover J/K + Enter + e without reading docs. Hidden on
// narrow viewports so the toolbar doesn't wrap onto two lines.
// Mirrors the `KeyboardHints` strip in the batch-review modal footer
// (same `KbdHint` primitive from `@/components/patterns/kbd`).
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

// 2026-05-26 (Yuqi rule library deferred batch — /clarify):
// First-time empty state. Replaces the bare "No rules and no coverage
// data yet." TableCell row that sat inside the table chrome before.
// Uses the canonical `EmptyState` primitive shared with /deadlines +
// /clients + /alerts; renders inside the table-card frame so the
// chrome stays consistent across full / empty states.
function RulesLibraryEmptyState({ onNewRule }: { onNewRule: () => void }) {
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
            <Button size="sm" render={<Link to="/rules/sources" />}>
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

// ---------------------------------------------------------------------------
// Grouped rules table — the main visualization
// ---------------------------------------------------------------------------

function GroupedRulesTable({
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
  pageIndex,
  totalPages,
  totalGroupCount,
  onPageChange,
}: {
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
  // 2026-05-26 (Yuqi rule library deferred batch — /adapt):
  // J/K keyboard nav threads the focused row id down so the
  // matching TableRow can paint a focus ring.
  focusedRowId: string | null
  // 2026-05-26 (Yuqi cross-table drift #3): pagination props. Parent
  // owns the page state (nuqs-bound), the table just renders the
  // prev/next footer + reflects the current slice.
  pageIndex: number
  totalPages: number
  totalGroupCount: number
  onPageChange: (next: number) => void
}) {
  const { t } = useLingui()
  const tierLabels = useRuleTierLabels()
  const statusGroupLabels = useStatusGroupLabels()
  const someExpanded = expanded.size > 0
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
    // 2026-05-26 (Yuqi sixty-ninth pass — Rule library #1/#2/#3/#4):
    // page chrome aligned with /deadlines + /alerts + /today.
    //
    //   #4 Expand-all button hoisted OUT of the TableHead and into a
    //      toolbar row ABOVE the table (sits next to the
    //      jurisdiction count). The button was a non-header control
    //      buried inside a header cell that also carried the "Tier"
    //      column label — a textbook "what does this cell mean"
    //      problem.
    //
    //   #2/#3 TableHeader className overrides dropped so the primitive
    //      defaults take over — `text-sm font-medium normal-case
    //      text-text-secondary` on headers (matches /deadlines'
    //      queue header per inset-followups H). The kicker style
    //      (`text-caption-xs uppercase tracking-wider`) read as a
    //      meta label, not a column header. Header BG is now the
    //      primitive's `bg-background-subtle` (also matching
    //      /deadlines).
    //
    //   #1 (inherit page styles) — the table now drops its
    //      hand-rolled chrome and uses the same shape as /deadlines:
    //      header bg-subtle, body bg-default, sm-medium headers. The
    //      RulesPageShell wrapper continues to own the page-level
    //      spacing.
    <div className="flex flex-col gap-3">
      {/* Toolbar row — jurisdiction count + keyboard hint cluster +
          Expand/Collapse-all button. Sits above the table so the
          button is discoverable as a table-level action, not a
          column-cell affordance.
          2026-05-26 (Yuqi rule library deferred batch — /adapt):
          keyboard hint strip surfaces the J/K + Enter + e contract
          power users now have. Hidden on narrow screens (the
          toolbar would wrap otherwise) and on touch-only sessions
          via `sm:flex` — matches the `KeyboardHints` strip in the
          batch-review modal footer. */}
      {/* 2026-05-26 (Yuqi follow-up — "和下面 row 一样的 padding"):
          toolbar now uses `px-3` so its text starts at the same x
          as the table header cells (which inherit `px-3` from the
          TableHead primitive). The previous flush-left layout
          parked the toolbar text 12px to the LEFT of the first
          column header — a visible misalignment when scanning down
          from "52 jurisdictions" into the first column label
          "Rule". */}
      <div className="flex items-center justify-between gap-3 px-3 text-sm">
        <span className="text-text-secondary">
          {/* 2026-05-26 (Yuqi cross-table drift #3): when paginated,
              show "Showing N of M" so the user knows how many they're
              looking at on the current page vs the full filter set.
              Single-page mode keeps the simpler "N jurisdictions". */}
          {totalPages > 1 ? (
            <Trans>
              Showing {groups.length} of {totalGroupCount} jurisdictions
            </Trans>
          ) : (
            <Plural value={groups.length} one="# jurisdiction" other="# jurisdictions" />
          )}
        </span>
        <div className="flex items-center gap-3">
          <RowNavHints />
          <button
            type="button"
            onClick={someExpanded ? onCollapseAll : onExpandAll}
            className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary outline-none hover:text-text-primary hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            {someExpanded ? <Trans>Collapse all</Trans> : <Trans>Expand all</Trans>}
          </button>
        </div>
      </div>
      {/* 2026-05-26 (Yuqi cross-table chrome unify): canonical
          workbench-table card frame. Same recipe as /deadlines +
          /clients. The Table primitive used to host the rounded
          border via `[&_[data-slot=table-container]]:` arbitrary
          selectors; now the chrome lives on this outer div so the
          card wraps the table AND the pagination footer below as
          one cohesive rounded surface. */}
      <div className="flex flex-col overflow-hidden rounded-md border border-divider-subtle">
        <Table>
          {/* 2026-05-26 (Yuqi follow-up — "table-header和别的页面上的
            table header一样颜色"): override the primitive's default
            `bg-background-subtle` with `!bg-background-default-dimmed`
            so the rule-library header band matches /deadlines + the
            rest of the workbench table family. */}
          {/* 2026-05-26 (Yuqi feedback — "table head should not be transparent.
            scrolling up you see the information behind the header"): dropped
            the `!bg-background-default-dimmed` override. That token resolves
            to `rgb(200 206 218 / 0.4)` — 40% alpha — so the sticky thead was
            see-through and showed row text bleeding through. Falling back to
            the primitive's solid `bg-background-subtle` (#f2f4f7) gives the
            same visual gray tone WITHOUT alpha. */}
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[42%]">
                <Trans>Rule</Trans>
              </TableHead>
              <TableHead className="w-[140px]">
                <Trans>Form</Trans>
              </TableHead>
              {ENTITY_KEYS.map((entity) => (
                <TableHead
                  key={entity}
                  title={ENTITY_LABELS[entity]}
                  className="w-12 text-center text-[10px] font-medium uppercase tracking-wider text-text-tertiary"
                >
                  {ENTITY_COLUMN_LABELS[entity]}
                </TableHead>
              ))}
              {/* 2026-05-26 (Yuqi follow-up — "the header of Tier
                should be left aligned"): dropped `text-right` so
                the column header sits at the column's natural
                left edge, matching the Rule / Form headers above. */}
              <TableHead>
                <Trans>Tier</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                        return (
                          <Fragment key={statusKey}>
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
                            {rulesInGroup.map((rule) => (
                              <RuleTableRow
                                key={rule.id}
                                rule={rule}
                                tierLabels={tierLabels}
                                jurisdictionLabel={group.label}
                                selectable={isReviewable}
                                selected={selectedRuleIds.has(rule.id)}
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
            {/* 2026-05-26 (Yuqi rule library deferred batch — /clarify):
              the bare "No rules and no coverage data yet." row has
              been retired — `RulesLibraryEmptyState` now renders
              ABOVE this table when `groups.length === 0` (see the
              parent route). The table itself is never rendered with
              zero groups now. */}
          </TableBody>
        </Table>
        {/* 2026-05-26 (Yuqi cross-table drift #3 — "clients and rule
          library are prev/next + page count footer"): pagination
          footer matching /clients shape (px-2 py-6, prev/next chevrons,
          "Page X of N" between). Footer only renders when there's
          more than one page. */}
        {totalPages > 1 ? (
          <div className="flex shrink-0 items-center justify-between border-t border-divider-subtle bg-background-default px-2 py-6 text-xs text-text-tertiary">
            <span className="px-2">
              <Plural value={totalGroupCount} one="# jurisdiction" other="# jurisdictions" />
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t`Previous page`}
                disabled={pageIndex === 0}
                onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
              >
                <ChevronLeftIcon className="size-4" aria-hidden />
              </Button>
              <span className="px-2 tabular-nums">
                <Trans>
                  Page {pageIndex + 1} of {totalPages}
                </Trans>
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t`Next page`}
                disabled={pageIndex >= totalPages - 1}
                onClick={() => onPageChange(Math.min(totalPages - 1, pageIndex + 1))}
              >
                <ChevronRightIcon className="size-4" aria-hidden />
              </Button>
            </div>
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
  // 2026-05-26 (Yuqi rule library deferred batch — /adapt):
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
        // No extra border-t! The TableRow primitive already adds
        // `border-b border-divider-subtle` on every row, so adding
        // a border-t here stacked with the previous row's border-b
        // and painted as a 2px line — that read as a heavy
        // chunk-divider. Letting the primitive's natural border-b
        // be the only line between states gives one clean hairline
        // and lets typography do the anchoring.
        // 2026-05-26 (Stripe-bar /polish pass): row height bumped
        // to h-14 (56px) so the catalog reads at the same premium
        // breathing room as /clients + /deadlines tables.
        // 2026-05-26 (Yuqi cross-table drift #11 — group header
        // hover): KEEP hover-bg here. The canonical rule across
        // tables: group headers that are CLICKABLE (this state row
        // expands/collapses) keep hover-bg + cursor-pointer as the
        // "this is interactive" affordance. Group headers that are
        // PASSIVE section labels (/deadlines client-group row) stay
        // static. The semantic difference drives the visual.
        'h-14 cursor-pointer hover:bg-state-base-hover',
        focused && 'bg-state-base-hover shadow-[inset_2px_0_0_var(--color-state-accent-solid)]',
      )}
      onClick={() => onToggle(group.jurisdiction)}
      data-state={expanded ? 'expanded' : 'collapsed'}
    >
      {/* State row layout:
          - Cell 1 (Rule column): identity — chevron + state badge +
            full name + rule count.
          - Cell 2 (Form column): total number — sum of all per-entity
            counts. Mirrors the per-entity overview numbers in the
            7 columns to its right; tells the eye "this state covers
            N rules across all entities" at column-true position.
          - Cells 3-9: per-entity overview via EntityStateCell —
            plain count of rules for that entity in this state.
          - Cell 10 (Tier column): attention badges + status bar. */}
      <TableCell
        className="py-2"
        title={`${group.label} — ${group.ruleCount} rule${group.ruleCount === 1 ? '' : 's'} across all entities. Expand to see the breakdown.`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ChevronRightIcon
            className={cn(
              'size-3.5 shrink-0 text-text-tertiary transition-transform duration-100 ease-out',
              expanded && 'rotate-90',
            )}
            aria-hidden
          />
          <span className="inline-flex items-center gap-1.5">
            <StateBadge code={group.jurisdiction} size="xs" title={group.jurisdiction} />
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
      {/* Form column on the state row: total count across all
          entities. Per Yuqi follow-up — "for the overall Form for
          the state, you could write the total number." Gives the
          eye a column-anchored summary that lines up with the
          per-entity counts to the right. */}
      <TableCell className="py-2">
        <span className="text-sm font-medium tabular-nums text-text-primary">
          {ENTITY_KEYS.reduce((sum, entity) => sum + group.entityCounts[entity], 0)}
        </span>
      </TableCell>
      {/* Per-entity overview cells — one per ENTITY_KEY. Plain
          count, no icon, no color tint. */}
      {ENTITY_KEYS.map((entity) => {
        const isNA = group.sourceCoverage?.[entity] === 'not_applicable'
        const state: CoverageState = isNA ? 'not_applicable' : (group.coverage?.[entity] ?? 'none')
        return (
          <TableCell key={entity} className="py-2 text-center">
            <EntityStateCell
              count={group.entityCounts[entity]}
              pendingReviewCount={group.entityPendingReviewCounts[entity]}
              state={state}
            />
          </TableCell>
        )
      })}
      <TableCell className="py-2">
        {/* 2026-05-26 (Yuqi follow-up — "NOT ALIGNED"): badges sit
            inside a fixed-width slot (120px) so the left edge of the
            dot+text is at the same x across every state row regardless
            of singular/plural copy length ("1 needs review" vs
            "10 need review"). The status bar still right-aligns;
            gap-3 separates the two.
            2026-05-26 (Yuqi cross-table drift #9 — "Count chip
            primitive: one pill for review counts everywhere"): the
            two badges below moved from hand-rolled spans to the
            canonical `<CountDotChip>` primitive. Same visual; new
            surfaces can adopt the same chip with one import. */}
        <div className="flex items-center justify-end gap-3">
          <CountDotChip
            count={group.pendingReviewCount}
            tone="accent"
            minWidth="120px"
            label={
              <Plural value={group.pendingReviewCount} one="# needs review" other="# need review" />
            }
          />
          <CountDotChip
            count={group.gapEntities.length}
            tone="destructive"
            minWidth="120px"
            label={<Plural value={group.gapEntities.length} one="# missing" other="# missing" />}
          />
          <RuleStatusBar rules={group.rules} />
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
  // 2026-05-26 (Yuqi rule library deferred batch — /adapt):
  // J/K nav focus indicator. Paints a 2px accent inset rail +
  // subtle bg to mark "Enter opens THIS rule."
  focused: boolean
  onSelectChange: (next: boolean) => void
  onClick: (rule: ObligationRule) => void
}) {
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
  return (
    // `group` so the title and the trailing chevron can react to
    // row-level hover. The chevron is the affordance for "this row
    // opens a detail view"; the title underline is a secondary cue
    // that the title itself is the link target.
    <TableRow
      className={cn(
        // 2026-05-26 (Stripe-bar /polish pass): h-14 row height
        // matches the rest of the family.
        // 2026-05-26 (Stripe Phase B per-row ⋯): `group/row` so the
        // canonical RowActionsMenu's hover-reveal selector
        // (`group-hover/row:opacity-100`) keys off this row's hover
        // state. Replaces the bare `group` so the named group token
        // matches /clients list rows + /clients/[id] filing-plan
        // rows for cross-surface consistency.
        'group/row h-14 cursor-pointer hover:bg-state-base-hover',
        focused && 'bg-state-base-hover shadow-[inset_2px_0_0_var(--color-state-accent-solid)]',
      )}
      onClick={() => onClick(rule)}
      aria-label={`Open rule details for ${displayTitle}`}
      data-state={selected ? 'selected' : undefined}
    >
      {/* Rule rows sit one level deeper than the NEEDS REVIEW / ACTIVE
          section headers: the row checkbox starts under the section
          label, then the title sits after the checkbox slot. The same
          slot is reserved for non-selectable active rows so titles
          stay aligned across sections. */}
      {/* 2026-05-26 (Yuqi cross-table unify — "Deadlines text-sm ·
          Clients text-base · Rules library text-sm … visually make
          them similar"): primary identity title is now text-base
          regular weight (was text-sm font-medium). Matches /clients
          + /deadlines so all three workbench tables share the same
          canonical title scale. Tier label + meta below stay text-xs
          so the title still reads as the primary anchor. */}
      <TableCell className="!pl-9 min-h-10 whitespace-normal py-2 text-base">
        {/* 2026-05-26 (Yuqi follow-up — "the checkbox and text do not
            middle align. The dot and the text do not middle align"):
            outer flex is now `items-center` (was `items-start` with a
            `pt-1.5` shim on the inner slot). Single source of vertical
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
                  aria-label={`Select ${displayTitle} for batch review`}
                />
              </span>
            </span>
          ) : (
            // 2026-05-26 (Yuqi feedback — "Needs review and review item
            // have checkbox, active 20 and the active items need
            // something in front of them at the same position as the
            // checkbox as well to look nicely done"): non-selectable
            // rules (ACTIVE / VERIFIED / REJECTED / ARCHIVED) render a
            // status-toned dot at the checkbox X-position so the row's
            // leading slot is never empty.
            //
            // 2026-05-26 (Yuqi follow-up — "green dot turns gray so
            // not clashing with the entity status"): active +
            // verified rules use a gray dot. The entity-status green
            // dots in the same row already carry the "applies +
            // healthy" signal; a second green dot in the leading
            // slot was visually competing. Gray reads as "marker
            // for the state group above" without stealing the eye.
            //
            // 2026-05-26 (Yuqi follow-up — "hovering onto the row
            // currently just changes the background — but can
            // actually expand the green dot/blue dot to a word
            // explanation of what is happening at the entity"): on
            // row hover the dot stays, and a short status label
            // (Active / Needs review / Rejected / Archived …)
            // reveals next to it. The title shifts right on hover —
            // intentional: the dot "expands" into the word, matching
            // the user's mental model.
            (() => {
              const tone = STATUS_TONE[rule.status]
              return (
                <span aria-hidden className="inline-flex shrink-0 items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-block size-1.5 rounded-full',
                      tone === 'success' && 'bg-divider-regular',
                      tone === 'destructive' && 'bg-state-destructive-solid',
                      tone === 'review' && 'bg-state-accent-solid',
                      tone === 'muted' && 'bg-divider-regular',
                    )}
                  />
                  <span className="hidden whitespace-nowrap text-xs text-text-tertiary group-hover/row:inline">
                    {STATUS_LABEL_SHORT[rule.status]}
                  </span>
                </span>
              )
            })()
          )}
          {/* 2026-05-26 (Yuqi follow-up — "revert the titles back
              to black"): rule title back to `text-text-primary`.
              Hover underline stays as the row-affordance cue; the
              accent-purple coloring (from the earlier Stripe
              /colorize pass) is gone. */}
          <span className="text-text-primary group-hover/row:underline group-hover/row:underline-offset-2 group-hover/row:decoration-current">
            {displayTitle}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-2">
        <FormCell formName={rule.formName} taxType={rule.taxType} />
      </TableCell>
      {/* Per-entity applicability dots — one per ENTITY_KEY. Status-
          tinted when the rule applies to that entity, faint
          placeholder otherwise. */}
      {ENTITY_KEYS.map((entity) => (
        <TableCell key={entity} className="py-2 text-center">
          <EntityApplicabilityCell applies={applicabilitySet.has(entity)} status={rule.status} />
        </TableCell>
      ))}
      {/* Tier label + trailing chevron + canonical row-action menu.
          The chevron stays as the "this row opens detail" affordance
          cue (fades in on row hover). The ⋯ menu lives next to it as
          the per-row sub-action surface — Stripe Phase B pattern,
          consistent with /clients list rows + /clients/[id]
          filing-plan rows. */}
      <TableCell className="py-2">
        <div className="flex items-center justify-end gap-2 text-xs text-text-secondary">
          <span>{tierLabels[rule.ruleTier]}</span>
          <ChevronRightIcon
            aria-hidden
            className="size-3.5 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover/row:opacity-100"
          />
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
  // 2026-05-26 (Yuqi rule library deferred batch — /adapt):
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
        'border-l-2 border-l-state-destructive-solid bg-state-destructive-subtle/40 hover:bg-state-destructive-subtle/70',
        // When focused via J/K, paint an accent left rail + lift the
        // bg so the row reads "you are here" louder than "this is
        // missing" — the user is acting on it now.
        focused && 'border-l-state-accent-solid bg-state-destructive-subtle/70',
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

// 2026-05-26 (Yuqi cross-table drift #12 — "Status section header
// visual"): this NEEDS REVIEW / ACTIVE / MISSING band is Rule-library-
// only. The pattern (tinted label + count + tri-state batch checkbox
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
  const hasSelectAll = selectAllState !== undefined && onToggleSelectAll !== undefined
  // Section header inside an expanded jurisdiction. The TITLE itself
  // is highlighted (per /critique) — NEEDS REVIEW reads in accent,
  // ACTIVE reads in the same success green as active entity counts,
  // and MISSING RULES reads in destructive. Other groups stay tertiary.
  // Both the label and the count carry the same color so the row
  // reads as one tinted line, not a label + colored badge.
  return (
    <TableRow className="hover:bg-transparent">
      {/* 2026-05-25 (Yuqi rule library #10, #11 + second-pass #1):
          the checkbox slot now sits at the SAME x-position as the
          chevron in the state row above (i.e. the cell's natural
          p-3 left padding). NEEDS REVIEW and ACTIVE labels share
          one left edge with each other AND with the chevron above
          — "everything to the left." When the checkbox is absent
          (ACTIVE section), the w-4 placeholder reserves the slot
          so the label x-position stays constant across section
          headers. */}
      {/* 2026-05-25 (Yuqi rule library fourth pass #1 — "everything
          to the left"): added explicit `pl-3 text-left` so the
          section header label x-position is anchored to the
          cell's left padding regardless of any primitive
          `text-center` defaults inherited via colSpan. The flex
          row inside already left-aligns its content; the
          additional cell-level overrides defend against the
          colspan cell defaulting to centered alignment when the
          column widths shift. */}
      <TableCell colSpan={RULES_TABLE_COLUMN_COUNT} className="pb-1 pt-3 pl-3 text-left">
        <div className="flex items-center gap-2">
          <span className="inline-flex w-4 shrink-0 items-center justify-center" aria-hidden>
            {hasSelectAll ? (
              <Checkbox
                checked={selectAllState === 'all'}
                indeterminate={selectAllState === 'some'}
                onCheckedChange={() => onToggleSelectAll()}
                aria-label={`Select all ${count} rules in ${label}`}
              />
            ) : null}
          </span>
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              statusKey === 'needs_review' && 'text-text-accent',
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
              statusKey === 'needs_review' && 'text-text-accent',
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
  rules,
  query,
  onRuleClick,
  focusedRowId,
}: {
  rules: ObligationRule[]
  query: string
  onRuleClick: (rule: ObligationRule) => void
  // 2026-05-26 (Yuqi rule library deferred batch — /adapt):
  // J/K row nav focus id threaded down so the matching search-result
  // row paints a focus ring. Search results carry only rule rows
  // (no groups, no gaps), so we only check `rule:<id>` matches.
  focusedRowId: string | null
}) {
  const tierLabels = useRuleTierLabels()
  return (
    <div className="rounded-md border border-divider-subtle bg-background-default">
      <div className="flex items-center justify-between border-b border-divider-subtle px-3 py-1.5 text-xs">
        <span className="text-text-secondary">
          <Plural
            value={rules.length}
            one={`# match for "${query}"`}
            other={`# matches for "${query}"`}
          />
        </span>
      </div>
      {/* 2026-05-26 (Yuqi sixty-ninth pass — Rule library #2/#3):
          flat-rules table headers stripped of the kicker style
          overrides so they inherit the TableHead primitive default
          (sm-medium normal-case, matches /deadlines + /alerts).
          2026-05-26 (Yuqi rule library deferred batch — /distill):
          7 per-entity columns dropped to match the grouped view.
          Search results now read Rule / Jurisdiction / Form / Tier;
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
                title={ENTITY_LABELS[entity]}
                className="w-12 text-center text-[10px] font-medium uppercase tracking-wider text-text-tertiary"
              >
                {ENTITY_COLUMN_LABELS[entity]}
              </TableHead>
            ))}
            {/* 2026-05-26 (Yuqi follow-up — "the header of Tier
                should be left aligned"): dropped `text-right` so
                the column header sits at the column's natural
                left edge, matching the Rule / Form headers above. */}
            <TableHead>
              <Trans>Tier</Trans>
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
                  )}
                  onClick={() => onRuleClick(rule)}
                  aria-label={`Open rule details for ${rule.title}`}
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
                    <TableCell key={entity} className="py-2 text-center">
                      <EntityApplicabilityCell
                        applies={rule.entityApplicability.includes(entity)}
                        status={rule.status}
                      />
                    </TableCell>
                  ))}
                  {/* Trailing affordance chevron + canonical row-action
                      menu — same shape as the grouped table above so
                      search results carry the identical per-row
                      affordance. */}
                  <TableCell className="py-2">
                    <div className="flex items-center justify-end gap-2 text-xs text-text-secondary">
                      <span>{tierLabels[rule.ruleTier]}</span>
                      <ChevronRightIcon
                        aria-hidden
                        className="size-3.5 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover/row:opacity-100"
                      />
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
  return (
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      {/* 2026-05-25 (Yuqi rule library #13, #14, #24, #26): dialog
          chrome rebuilt.
          - DialogTitle is now the RULE TITLE itself (proper title,
            text-base font-semibold) instead of an eyebrow caps
            label "Rule details" (Yuqi: never use ALL CAPS or
            eyebrow text for a section/page title).
          - Header carries a kicker line above with the rule's
            jurisdiction badge, form name, tax year, and status —
            identity reads top-down: badge cluster → title → body.
          - Body padding tightened. The kicker carries the identity
            shape the audit ID line used to spell out, so the body
            no longer needs to repeat it. */}
      <DialogContent showCloseButton className="flex max-h-[85vh] max-w-[640px] flex-col gap-0 p-0">
        {/* 2026-05-25 (Yuqi rule library fourth pass #8, #10):
            third-pass tweaks weren't enough — Yuqi still flagged
            the header as "混乱" (chaotic, no section).
            Restructured:
              - Title bumped text-lg → text-xl (even bigger anchor)
              - Title moved ABOVE the kicker so the eye lands on
                "Arizona individual income tax return" first, then
                catches the identity-meta line (jurisdiction + form
                + year + status) as supporting context below.
              - 12px gap between title and kicker (gap-3) so the
                two read as two distinct sections, not one
                visually-fused block.
              - Background slightly lifted (bg-background-subtle)
                on the header surface so it visually separates from
                the body content scroll area. */}
        <DialogHeader className="flex flex-col gap-3 border-b border-divider-subtle bg-background-subtle px-5 py-4">
          <DialogTitle className="text-xl font-semibold leading-tight text-text-primary">
            {rule.title}
          </DialogTitle>
          <RuleDetailKicker rule={rule} />
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <RuleDetailInline rule={rule} concreteDraft={concreteDraft} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 2026-05-25 (Yuqi rule library #15, #16, #17): identity kicker
// above the rule title. Replaces the dot-separated mono ID line
// in RuleDetailInline (`fed.7004.extension.1065.2025`) that read
// as a developer string — CPAs don't parse that vocabulary. The
// kicker reads "FED · Form 7004 · TY 2025-2026 · Active" — human
// shape with the same audit reference info, organized by what a
// CPA scans for first. The full mono ID is kept at the end as a
// quiet reference for audit / engineer use.
function RuleDetailKicker({ rule }: { rule: ObligationRule }) {
  return (
    // 2026-05-25 (Yuqi rule library fourth pass #9): jurisdiction
    // marker upgraded from the mono-text Badge to the StateBadge
    // SVG primitive used everywhere else US-states surface in the
    // app (the GroupHeaderRow above, Alerts page, Pulse drawer,
    // /clients States column). One visual grammar for "this is a
    // jurisdiction" instead of two parallel ones. The 2-letter
    // code text follows the SVG so the chip remains keyboard-
    // typable and the kicker reads at a glance.
    <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
      <span className="inline-flex items-center gap-1.5">
        <StateBadge code={rule.jurisdiction} size="xs" title={rule.jurisdiction} />
        <span className="text-caption-xs uppercase tracking-wider text-text-secondary">
          {rule.jurisdiction}
        </span>
      </span>
      <span aria-hidden>·</span>
      <span className="font-medium text-text-secondary">{rule.formName}</span>
      <span aria-hidden>·</span>
      <span className="tabular-nums">
        <Trans>TY {rule.taxYear}</Trans>
        {rule.taxYear !== rule.applicableYear ? `–${rule.applicableYear}` : ''}
      </span>
      <span aria-hidden>·</span>
      <RuleStatusKicker status={rule.status} />
    </div>
  )
}

// 2026-05-25 (Yuqi rule library #17): replace the green-dot + "Active"
// treatment with an icon-led chip so rule status doesn't visually
// collide with the obligation status icons we just iconified
// app-wide. Active = CircleCheck (green), Needs review =
// MessageSquareText (blue), Inactive/Rejected = CircleSlash (gray).
function RuleStatusKicker({ status }: { status: ObligationRule['status'] }) {
  if (status === 'candidate' || status === 'pending_review') {
    return (
      <span className="inline-flex items-center gap-1 text-text-accent">
        <MessageSquareText className="size-3.5" aria-hidden />
        <span className="font-medium">
          <Trans>Needs review</Trans>
        </span>
      </span>
    )
  }
  if (status === 'deprecated' || status === 'archived' || status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 text-text-tertiary">
        <CircleSlash className="size-3.5" aria-hidden />
        <span className="font-medium">
          {status === 'rejected' ? <Trans>Rejected</Trans> : <Trans>Inactive</Trans>}
        </span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-text-success">
      <CircleCheck className="size-3.5" aria-hidden />
      <span className="font-medium">
        <Trans>Active</Trans>
      </span>
    </span>
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
  totalPending,
  onReview,
  onSelectAll,
  onClear,
}: {
  count: number
  totalPending: number
  onReview: () => void
  onSelectAll: () => void
  onClear: () => void
}) {
  const { t } = useLingui()
  // Only show the "select all N" link when there are MORE pending
  // rules than the user has currently selected — otherwise it's a
  // no-op that just clutters the bar.
  const showSelectAll = totalPending > count
  // 2026-05-26 (Yuqi feedback — "Bulk review actions look ugly and not
  // UX friendly"): bar internals restructured for clearer hierarchy.
  // Three named slots, separated by a single muted divider:
  //   [ count-line + Clear ] | [ Select-all link ] | [ Review CTA ]
  //
  // Count is sm (was xs) so it carries weight as the primary status
  // line. "Clear" sits as a quiet tertiary link DIRECTLY next to the
  // count — same group ("what's selected"). "Select all" lives in its
  // own slot — separate action of expanding the selection — only when
  // it'd actually do something. The primary "Review" button keeps its
  // place at the right end as the canonical "act on selection" CTA;
  // the count is also baked into its label ("Review N rules") so a
  // user who already knows what they selected can fire the action
  // without re-reading the count line.
  return (
    <FloatingActionBar ariaLabel={t`Bulk review actions`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium tabular-nums text-text-primary">
          <Plural value={count} one="# rule selected" other="# rules selected" />
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-text-tertiary outline-none hover:text-text-secondary hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <Trans>Clear</Trans>
        </button>
      </div>
      {showSelectAll ? (
        <>
          <span aria-hidden className="h-4 w-px bg-divider-subtle" />
          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Select all {totalPending}</Trans>
          </button>
        </>
      ) : null}
      <span aria-hidden className="h-4 w-px bg-divider-subtle" />
      <Button type="button" size="sm" onClick={onReview}>
        <Trans>Review {count}</Trans>
        <ChevronRightIcon data-icon="inline-end" />
      </Button>
    </FloatingActionBar>
  )
}

// ---------------------------------------------------------------------------
// Batch-review modal — centered Dialog that walks the user through
// every selected rule, dating-app style. One rule per "card";
// Prev / Skip / Next at the bottom; Accept lives inside the rule body
// via `RuleDetailCompact`. Progress shown as "1 / 5" at the header.
// Closes when the queue is exhausted.
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
          <Button type="button" variant="outline" size="sm" onClick={onSkip}>
            {isLast ? <Trans>Finish</Trans> : <Trans>Skip</Trans>}
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </footer>
        <span className="sr-only">{t`Press Escape to close the review queue.`}</span>
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
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
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
              <div className="rounded-md border border-divider-subtle bg-background-subtle px-3 py-3 text-xs text-text-secondary">
                <Trans>
                  Custom rules currently need to be created from a missing-rule row in the table
                  below so the jurisdiction and entity are unambiguous. Close this dialog and click
                  "+ Add rule" on the row you want to fill in.
                </Trans>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Disclosure: this rule will ACTIVATE immediately.
                    Server forces `status: 'active'` on createCustomRule. */}
                <div className="rounded-md border border-state-warning-border bg-state-warning-subtle px-3 py-2 text-xs text-text-secondary">
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
                    <Input
                      id="new-rule-tax-type"
                      value={taxType}
                      onChange={(event) => setTaxType(event.target.value)}
                      placeholder={t`e.g. income, sales, payroll`}
                      required
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
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {mutation.isPending ? <Trans>Creating…</Trans> : <Trans>Create rule</Trans>}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}
