import { Fragment, useCallback, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLingui, Trans, Plural } from '@lingui/react/macro'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleCheck,
  CircleSlash,
  DownloadIcon,
  MessageSquareText,
  PlusIcon,
  XIcon,
} from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'

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
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
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

import { FloatingActionBar } from '@/components/patterns/floating-action-bar'
import { useAppHotkey } from '@/components/patterns/keyboard-shell'
import { SearchInput } from '@/components/primitives/search-input'
import { StateBadge } from '@/components/primitives/state-badge'
import { RuleDetailCompact, RuleDetailInline } from '@/features/rules/rule-detail-drawer'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import { countSourcesByHealth, jurisdictionLabel } from '@/features/rules/rules-console-model'
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

// Short column-header labels for the per-entity columns in the rules
// table. Fit in ~36px column widths; the full name is the title attr.
const ENTITY_COLUMN_LABELS: Record<EntityKey, string> = {
  llc: 'LLC',
  partnership: 'Part',
  s_corp: 'S-Corp',
  c_corp: 'C-Corp',
  sole_prop: 'Sole',
  individual: 'Ind',
  trust: 'Trust',
}

// Total table column count: Rule + Form + 7 entity cols + Tier.
// Status column dropped 2026-05-21 — status is now communicated by
// the sub-section the rule sits under (NEEDS REVIEW / ACTIVE / etc.).
const RULES_TABLE_COLUMN_COUNT = 10

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

// Entity coverage state cell — rendered in the per-entity columns of
// a STATE header row. Shows `count + status icon`: count of rules
// in this state for this entity, paired with an icon for the
// aggregated coverage state. Resolves the prior dual-meaning issue
// (where state and rule rows both used dot-icons): the count number
// is unmistakably an aggregate, visually distinct from the
// per-rule applicability dots in the rows below.
//
//   - active  → "8 ✓"  green count + green check
//   - review  → "5 ⚠"  accent count + accent triangle
//   - none    → "0 ○"  destructive count + outlined circle
//   - N/A     → "0 -"  muted count + dash
//
// Reading down a column: aggregate at top, individual applicability
// dots below.
function EntityStateCell({ count, state }: { count: number; state: CoverageState }) {
  return (
    <span className="inline-flex items-center justify-center gap-1">
      <span
        className={cn(
          'text-sm font-semibold tabular-nums',
          state === 'active' && 'text-state-success-solid',
          state === 'review' && 'text-text-accent',
          state === 'none' && 'text-text-destructive',
          state === 'not_applicable' && 'text-text-tertiary',
        )}
      >
        {count}
      </span>
      {state === 'active' ? (
        <CheckCircle2Icon
          className="size-3 shrink-0 text-state-success-solid"
          aria-label="active"
        />
      ) : state === 'review' ? (
        <AlertTriangleIcon className="size-3 shrink-0 text-text-accent" aria-label="needs review" />
      ) : state === 'not_applicable' ? (
        <span aria-label="not applicable" className="text-xs text-text-tertiary">
          -
        </span>
      ) : (
        <span
          aria-label="no rule"
          className="inline-block size-2.5 shrink-0 rounded-full border border-state-destructive-solid"
        />
      )}
    </span>
  )
}

// Cell-level applicability dot for the per-entity columns. If the
// rule applies to this entity, render a colored dot tinted by the
// rule's status; otherwise render a faint placeholder.
function EntityApplicabilityCell({ applies, status }: { applies: boolean; status: RuleStatus }) {
  // Quieted 2026-05-21 per /critique. The applicability dots used to
  // be size-2 (8px) — same prominence as the state row's count+icon
  // ABOVE them, so the column read with two competing grammars.
  // Now: 6px (size-1.5) dot when applies, 3px (size-[3px]) faint
  // dot when not. The header dominates the column visually; rule
  // applicability becomes a quiet texture that scanning reads as
  // "presence vs absence" without the dots screaming for attention.
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

// Form-cell renderer. Shows the form code (or `(no form)` placeholder)
// in regular sans-serif text. Tooltip carries the humanized tax type.
// Earlier iteration used a monospace font for codes (`1120-S` in mono)
// but that hurt readability without adding signal — the cell is
// narrow, the codes are short, and a sans font reads cleaner here.
function FormCell({ formName, taxType }: { formName: string; taxType: string }) {
  const trimmed = formName.trim()
  const isPlaceholder =
    !trimmed || trimmed === '—' || trimmed === '-' || trimmed.toLowerCase() === 'n/a'
  if (isPlaceholder) {
    return <span className="text-xs italic text-text-tertiary">(no form)</span>
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
  // type. Pre-computed in buildGroups so the state-row entity cells
  // (`EntityStateCell`) can render `count + status icon` without
  // re-filtering on every render.
  entityCounts: Record<EntityKey, number>
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
    for (const rule of groupRules) {
      for (const entity of ENTITY_KEYS) {
        if (rule.entityApplicability.includes(entity)) entityCounts[entity]++
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
  // Apply entity filter — when a By-Entity chip is active, restrict
  // the rules feeding the table to just those that apply to that
  // entity type. Coverage rows are untouched (state-level coverage
  // signals still reflect the full picture).
  const filteredRules = useMemo(() => {
    if (!activeEntity) return rules
    return rules.filter((r) => r.entityApplicability.includes(activeEntity))
  }, [rules, activeEntity])
  const groups = useMemo(
    () => buildGroups(filteredRules, coverageRows),
    [filteredRules, coverageRows],
  )
  const sourceCounts = useMemo(
    () => countSourcesByHealth(sourcesQuery.data ?? []),
    [sourcesQuery.data],
  )
  const statsLoading = rulesQuery.isLoading || coverageQuery.isLoading || sourcesQuery.isLoading

  // Stats line.
  const totalRules = rules.length
  const totalActive = rules.filter((r) => r.status === 'active' || r.status === 'verified').length
  const totalPendingReview = groups.reduce((acc, g) => acc + g.pendingReviewCount, 0)
  const totalGaps = groups.reduce((acc, g) => acc + g.gapEntities.length, 0)
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
  const headerActions = (
    <>
      {reviewCount > 0 ? (
        // 2026-05-25 (Yuqi rule library #5 — third pass): Yuqi
        // flagged the amber treatment as reading as "destructive."
        // Switched to a default primary blue with the count
        // rendered as an inset tabular chip — the count carries
        // the "N waiting" magnitude cue, the button color reads as
        // "primary action, not danger." Standard accent palette
        // matches every other primary CTA in the app.
        <Button size="sm" onClick={startReviewAll}>
          <Trans>Start review</Trans>
          {/* 2026-05-25 (Yuqi rule library fourth pass #5 + #12):
              count chip switches to a WHITE background. Was a
              translucent accent (`bg-state-accent-active-alt/40`)
              which, sitting inside the primary-blue button,
              picked up enough red from the alt accent token that
              Yuqi flagged the whole button as "destructive red."
              Solid white chip + accent text reads cleanly as a
              "count badge inside a primary CTA" — same pattern
              GitHub uses for the count chip inside its "Open N
              issues" button. */}
          <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-background-default px-1.5 font-mono text-xs tabular-nums text-text-accent">
            {reviewCount}
          </span>
        </Button>
      ) : null}
      <Button variant="outline" size="sm" onClick={handleExport}>
        <DownloadIcon data-icon="inline-start" />
        <Trans>Export coverage</Trans>
      </Button>
      <Button variant="outline" size="sm" onClick={openNewRule}>
        <PlusIcon data-icon="inline-start" />
        <Trans>New rule</Trans>
      </Button>
    </>
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
    <RulesPageShell
      title={t`Rule library`}
      description={t`Every filing obligation the practice tracks. Review pending rules, fill missing coverage, and add new ones.`}
      actions={headerActions}
    >
      <div className="flex flex-col gap-4">
        <StatsBar
          totalRules={totalRules}
          totalActive={totalActive}
          totalPendingReview={totalPendingReview}
          totalGaps={totalGaps}
          sourcesHealthy={sourceCounts.healthy}
          sourcesPaused={sourceCounts.paused}
          loading={statsLoading}
          entityStats={entityStats}
          activeEntity={activeEntity}
          onSelectEntity={(entity) => void setEntityFilter(entity)}
          onClearEntity={() => void setEntityFilter(null)}
          search={search ?? ''}
          onSearchChange={(next) => void setSearch(next || null)}
        />

        {/* Active-filter banner — when an entity chip is active, make
            it crystal-clear that the table below has been narrowed.
            Was a silent filter before; users clicked a chip and the
            table changed but there was no top-level "you are
            filtering" cue, so the effect read as "the data
            shrunk for some reason." Banner names the filter,
            shows the resulting count, and surfaces a Clear button
            in the same row so undoing is one click. */}
        {activeEntity ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-divider-subtle bg-background-subtle px-3 py-2 text-xs">
            <span className="font-medium text-text-secondary">
              <Trans>Filtering</Trans>
            </span>
            <Badge
              variant="secondary"
              className="h-5 rounded px-1.5 text-caption font-medium uppercase tracking-wider"
            >
              {ENTITY_LABELS[activeEntity]}
            </Badge>
            <span className="text-text-tertiary">
              <Plural value={filteredRules.length} one="# rule applies" other="# rules apply" />
            </span>
            <span aria-hidden className="flex-1" />
            <button
              type="button"
              onClick={() => void setEntityFilter(null)}
              className="inline-flex items-center gap-1 rounded-sm text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <Trans>Clear filter</Trans>
              <XIcon className="size-3" aria-hidden />
            </button>
          </div>
        ) : null}

        {rulesQuery.isLoading || coverageQuery.isLoading ? (
          <LoadingState />
        ) : isSearching ? (
          <SearchResultsTable
            rules={matchedRules}
            query={searchLower}
            onRuleClick={handleRuleClick}
          />
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
          />
        )}

        {/* Rule detail — when ?rule=X is set, render the rule detail
            inline below the table. Compact form (a focused review
            surface), not a sheet, so it composes with the grouped
            list above. Closing clears the URL param. */}
        {selectedRule ? (
          <RuleDetailPanel
            rule={selectedRule}
            concreteDraft={selectedConcreteDraft}
            onClose={() => void setRuleId(null)}
          />
        ) : null}
      </div>
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
    </RulesPageShell>
  )
}

// PageActions retired 2026-05-21 — actions moved inline with the
// page title via RulesPageShell's `actions` slot. See header above.

// ---------------------------------------------------------------------------
// One-line stats bar (replaces the two stacked summary strips)
// ---------------------------------------------------------------------------

function StatsBar({
  totalRules,
  totalActive,
  totalPendingReview,
  totalGaps,
  sourcesHealthy,
  sourcesPaused,
  loading,
  entityStats,
  activeEntity,
  onSelectEntity,
  onClearEntity,
  search,
  onSearchChange,
}: {
  totalRules: number
  totalActive: number
  totalPendingReview: number
  totalGaps: number
  sourcesHealthy: number
  sourcesPaused: number
  loading: boolean
  entityStats: Array<{ entity: EntityKey; count: number; gapCount: number; reviewCount: number }>
  activeEntity: EntityKey | null
  onSelectEntity: (entity: EntityKey) => void
  onClearEntity: () => void
  // 2026-05-25 (Yuqi rule library #8): search relocated from a lone
  // row below the stats into the filter band — it lives next to
  // the entity-filter chip strip as one coherent "narrow the
  // table" surface. StatsBar accepts the search state + setter
  // and renders the input inline so search reads as a sibling
  // filter, not chrome that floated in between stats and table.
  search: string
  onSearchChange: (next: string) => void
}) {
  const { t } = useLingui()
  // Stats scoreboard (redesign 2026-05-21 per /critique).
  //
  // The prior interpunct-separated counts read as AI-dashboard prose
  // ("42 active · 12 needs review · 6 missing · 60 total"). Replaced
  // with a 4-column scoreboard: big numbers on top, labels below.
  // Reads as data, not a sentence. Sources sits as a separate
  // right-aligned trailing link, visually demoted (it's the related
  // surface, not the headline).
  //
  // Below the scoreboard, the By-Entity row is now a clickable chip
  // strip (was a horizontal lollipop chart, now `EntityChipRow`).
  // Each chip is a real filter target instead of a passive bar that
  // pretended to be interactive.
  const totalReviewed = totalActive + totalPendingReview
  // 2026-05-25 (Yuqi rule library #4 — re-flip): Yuqi reverted the
  // earlier flip and asked for the canonical "progress fills as you
  // complete work" reading — active anchors the LEFT (green, work
  // done), needs-review trails on the RIGHT (amber, work pending).
  // Same two tones, just back to the conventional progress-bar
  // direction so the bar reads as a completion meter rather than a
  // backlog meter.
  const activePct = totalReviewed > 0 ? (totalActive / totalReviewed) * 100 : 0
  // Label fits inside the bar only when the segment has at least
  // ~80px to render the text. Below that we fall back to the count
  // only; the full label lives in the title tooltip for hover.
  const ACTIVE_LABEL_FITS = activePct >= 18
  const REVIEW_LABEL_FITS = 100 - activePct >= 18
  if (loading) {
    return (
      <div className="flex flex-col gap-4 border-b border-divider-subtle pb-4" aria-busy="true">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-full rounded-md" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTileSkeleton />
            <StatTileSkeleton />
            <StatTileSkeleton />
          </div>
        </div>
        <SearchBar search={search} onChange={onSearchChange} />
        <EntityChipRowSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 border-b border-divider-subtle pb-4" aria-busy="false">
      <div className="flex flex-col gap-3">
        <div
          className="relative flex h-7 w-full overflow-hidden rounded-md border border-divider-subtle bg-background-subtle"
          role="img"
          aria-label={`${totalActive} active out of ${totalReviewed} reviewed`}
          title={`${totalActive} active · ${totalPendingReview} need review`}
        >
          <div
            className="flex items-center overflow-hidden bg-state-success-hover px-2 transition-[width] duration-300"
            style={{ width: `${activePct}%` }}
          >
            {ACTIVE_LABEL_FITS ? (
              <span className="truncate text-xs font-medium tabular-nums text-text-success">
                <Trans>{totalActive} active</Trans>
              </span>
            ) : activePct > 0 ? (
              <span className="truncate text-xs font-medium tabular-nums text-text-success">
                {totalActive}
              </span>
            ) : null}
          </div>
          {/* 2026-05-25 (Yuqi rule library fourth pass #4, #11):
              needs-review label switches from `justify-end` to
              `justify-start` so the "N need review" text sits at
              the LEFT edge of its own segment, immediately after
              the active segment's right edge. The previous
              right-aligned text pushed the label all the way out
              to the bar's far edge, breaking the "active count
              on left, review count next to it" reading Yuqi
              wanted. */}
          <div className="flex flex-1 items-center justify-start overflow-hidden bg-state-warning-hover px-2">
            {REVIEW_LABEL_FITS ? (
              <span className="truncate text-xs font-medium tabular-nums text-text-warning">
                <Trans>{totalPendingReview} need review</Trans>
              </span>
            ) : totalPendingReview > 0 ? (
              <span className="truncate text-xs font-medium tabular-nums text-text-warning">
                {totalPendingReview}
              </span>
            ) : null}
          </div>
        </div>
        {/* 2026-05-25 (Yuqi rule library #7): three cards (Total /
            Missing / Watched). Was a single `SurfaceSummaryStrip`
            with dot-separated counts that read like a sentence
            fragment ("476 total · 6 missing · 12 watched · View
            sources →"). Now each metric gets its own surface so the
            eye finds them as distinct items, not as run-on prose.
            "View sources" is promoted to a dedicated outline link
            with an explicit chevron — was a quiet inline link
            previously (Yuqi #5: too hidden). */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatTile label={t`Total`} value={totalRules} />
          <StatTile
            label={t`Missing`}
            value={totalGaps}
            tone={totalGaps > 0 ? 'destructive' : 'muted'}
          />
          <StatTile
            label={t`Watched`}
            value={sourcesHealthy}
            href="/rules/sources"
            {...(sourcesPaused > 0
              ? {
                  sublabel: t`${sourcesPaused} paused`,
                  sublabelTone: 'warning' as const,
                }
              : {})}
          />
        </div>
      </div>
      {/* 2026-05-25 (Yuqi rule library #8 — "absurd place to place
          the search bar"): search lifted out of the filter band's
          right slot to its own row above the entity chips. Reads
          like GitHub's PR list — search is the top-of-stack filter
          affordance, entity chips below modify the searched set.
          Full-width on mobile, capped at max-w-md on desktop so it
          doesn't look bloated next to dense controls. */}
      <SearchBar search={search} onChange={onSearchChange} />
      <EntityChipRow
        entityStats={entityStats}
        activeEntity={activeEntity}
        onSelect={onSelectEntity}
        onClear={onClearEntity}
      />
    </div>
  )
}

function StatTileSkeleton() {
  return (
    <div className="inline-flex flex-col gap-2 rounded-md border border-divider-subtle bg-background-default px-3 py-2">
      <Skeleton className="h-3 w-14" />
      <Skeleton className="h-6 w-12" />
    </div>
  )
}

// 2026-05-25 (Yuqi rule library #7): replaces the inline
// SurfaceSummaryStrip dots with a discrete card. Total / Missing /
// Watched each get a tile; Watched is a link target (clickable
// tile). Tones map destructive (red number) when missing > 0 and
// warning (amber sublabel) when sources are paused — quiet by
// default, raised only when there's something to look at.
function StatTile({
  label,
  value,
  tone = 'muted',
  href,
  sublabel,
  sublabelTone = 'muted',
}: {
  label: string
  value: number
  tone?: 'muted' | 'destructive'
  href?: string
  sublabel?: string
  sublabelTone?: 'muted' | 'warning'
}) {
  const valueColor =
    tone === 'destructive' && value > 0 ? 'text-text-destructive' : 'text-text-primary'
  const sublabelColor = sublabelTone === 'warning' ? 'text-text-warning' : 'text-text-tertiary'
  const inner = (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-xl font-semibold tabular-nums', valueColor)}>{value}</span>
        {sublabel ? <span className={cn('text-xs', sublabelColor)}>{sublabel}</span> : null}
      </div>
    </div>
  )
  if (href) {
    return (
      <Link
        to={href}
        className="group/tile inline-flex flex-col rounded-md border border-divider-subtle bg-background-default px-3 py-2 transition-colors hover:border-divider-regular hover:bg-state-base-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        {inner}
      </Link>
    )
  }
  return (
    <div className="inline-flex flex-col rounded-md border border-divider-subtle bg-background-default px-3 py-2">
      {inner}
    </div>
  )
}

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
      <div className="flex items-baseline gap-2">
        <span className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
          <Trans>Filter by entity</Trans>
        </span>
        {activeEntity ? (
          <button
            type="button"
            onClick={onClear}
            className="text-caption-xs text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Clear</Trans>
          </button>
        ) : null}
      </div>
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
function SearchBar({ search, onChange }: { search: string; onChange: (next: string) => void }) {
  const { t } = useLingui()
  return <SearchInput value={search} onChange={onChange} placeholder={t`Search rules…`} />
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
    <div>
      <Table>
        {/* Column header doubles as the toolbar: jurisdiction count
            sits beside the "Rule" label (per user feedback — was on
            its own mini-toolbar line, which read as a second header),
            and Expand/Collapse-all anchors the right edge of the
            header row.
            2026-05-25 (Yuqi rule library #29): header sticky to the
            page scroll container so the entity column labels stay
            visible while scrolling a long catalog — the column dots
            below stay paired with their headers. Background flipped
            from transparent to default + a subtle bottom border so
            the sticky header doesn't show row content bleeding
            through during scroll. */}
        <TableHeader className="sticky top-0 z-10 !bg-background-default [&_tr]:!bg-background-default">
          <TableRow className="border-b-divider-subtle hover:bg-transparent">
            {/* 2026-05-25 (Yuqi rule library fourth pass #2 + #7
                — wider, fourth time asking): Rule column widened
                again 42% → 52%. The 42% earlier pass left long
                rule titles still truncating on the default
                viewport. 52% takes most of the table width; Form
                column shrinks below to fit (#3), entity dot
                columns stay at their fixed 48px each. */}
            <TableHead className="w-[52%] text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
              <span className="inline-flex items-baseline gap-2">
                <Trans>Rule</Trans>
                <span aria-hidden className="text-text-tertiary/60">
                  ·
                </span>
                <span className="font-normal normal-case tracking-normal text-text-tertiary">
                  <Plural value={groups.length} one="# jurisdiction" other="# jurisdictions" />
                </span>
              </span>
            </TableHead>
            {/* 2026-05-25 (Yuqi rule library fourth pass #3): Form
                column further narrowed 120px → 96px. The shortest
                code "7004" (4 chars) and average code "1120-S"
                (6 chars) both fit comfortably; long codes like
                "1120-S Final" truncate with an ellipsis and keep
                the full text in a title tooltip. The reclaimed
                24px goes to the Rule column above (#7). */}
            <TableHead className="w-[96px] text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
              <Trans>Form</Trans>
            </TableHead>
            {ENTITY_KEYS.map((entity) => (
              <TableHead
                key={entity}
                title={ENTITY_LABELS[entity]}
                // 2026-05-25 (Yuqi rule library #12): per-entity
                // columns now left-aligned (was text-center) so the
                // dots in the rule rows below sit next to the same
                // x-coordinate as their column label. Better for
                // scanning down a single column — eye doesn't have to
                // sweep across centered content to compare values.
                className="w-12 text-left text-caption-xs font-medium uppercase tracking-wider text-text-tertiary"
              >
                {ENTITY_COLUMN_LABELS[entity]}
              </TableHead>
            ))}
            <TableHead className="text-right text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
              <span className="inline-flex items-baseline gap-3">
                <Trans>Tier</Trans>
                <button
                  type="button"
                  onClick={someExpanded ? onCollapseAll : onExpandAll}
                  className="font-normal normal-case tracking-normal text-text-tertiary outline-none hover:text-text-accent hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                >
                  {someExpanded ? <Trans>Collapse all</Trans> : <Trans>Expand all</Trans>}
                </button>
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => {
            const isExpanded = expanded.has(group.jurisdiction)
            return (
              <Fragment key={group.jurisdiction}>
                {/* Group header row — spans all 5 columns. Chevron +
                    name + count + entity dots in a single flex row. */}
                <GroupHeaderRow group={group} expanded={isExpanded} onToggle={onToggle} />
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
          {groups.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={RULES_TABLE_COLUMN_COUNT}
                className="py-8 text-center text-xs text-text-tertiary"
              >
                <Trans>No rules and no coverage data yet.</Trans>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  )
}

function GroupHeaderRow({
  group,
  expanded,
  onToggle,
}: {
  group: JurisdictionGroup
  expanded: boolean
  onToggle: (jur: RuleJurisdiction) => void
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
        'cursor-pointer hover:bg-state-base-hover',
      )}
      onClick={() => onToggle(group.jurisdiction)}
      data-state={expanded ? 'expanded' : 'collapsed'}
    >
      {/* Cell 1 (colSpan=2): chevron + state badge (solid tinted)
          + full name (bigger semibold) + rule count. Promoted weight
          per /critique — was previously the same text-sm font-medium
          as rule titles, so the state row didn't anchor the eye. */}
      <TableCell
        colSpan={2}
        className="py-2"
        // 2026-05-25 (Yuqi rule library #9): hover hint explains
        // what the row aggregates. CPAs new to the catalog were
        // unsure if the dots in the row showed jurisdiction-level
        // coverage or just the open rules — the title clarifies.
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
          {/* 2026-05-25 (Yuqi rule library fourth pass #6):
              jurisdiction marker upgraded to the StateBadge SVG
              primitive used everywhere else US-states surface
              (Alerts page, Pulse drawer, /clients States column).
              Was a square mono-text Badge that read different from
              the rest of the app. The 2-letter code label stays
              alongside the SVG so the row remains keyboard-typable
              and the column reads at a glance. Federal-level
              groups (jurisdiction === "US") still receive a
              StateBadge — the primitive renders a "FED" mark for
              that code. */}
          <span className="inline-flex items-center gap-1.5">
            <StateBadge code={group.jurisdiction} size="xs" title={group.jurisdiction} />
            <span className="font-mono text-caption-xs uppercase tracking-wider text-text-secondary">
              {group.jurisdiction}
            </span>
          </span>
          <span className="text-base font-semibold text-text-primary">{group.label}</span>
          <span className="text-xs tabular-nums text-text-tertiary">
            <Plural value={group.ruleCount} one="# rule" other="# rules" />
          </span>
        </div>
      </TableCell>
      {/* Cells 2-8: count + status icon per entity. Shows how many
          rules in this state apply to each entity (aggregate),
          colored + iconed by overall coverage state. Visually
          distinct from rule-row applicability dots so the column
          reads "summary on top, individual rules below." */}
      {ENTITY_KEYS.map((entity) => {
        const state: CoverageState =
          group.sourceCoverage?.[entity] === 'not_applicable'
            ? 'not_applicable'
            : (group.coverage?.[entity] ?? 'none')
        return (
          <TableCell key={entity} className="py-2 text-left">
            <EntityStateCell count={group.entityCounts[entity]} state={state} />
          </TableCell>
        )
      })}
      {/* Cell 9 (Tier column position): attention badges (needs
          review / missing) + status distribution bar, right-aligned.
          Moving the badges here (from the name cell on the left)
          gives a vertical "where the work is" scan: jurisdictions
          with active badges line up down the right edge. */}
      <TableCell className="py-2">
        <div className="flex items-center justify-end gap-3">
          {/* 2026-05-25 (Yuqi rule library #30): "N needs review"
              demoted from an outline badge to a colored inline count
              with a leading dot. The badge chrome stacked with the
              actual status-distribution bar to its right + the
              section-header badges below, making the row read as a
              "wall of badges." Inline text + dot does the same job
              with less visual claim. Same treatment for "N missing"
              (red dot + red text). */}
          {group.pendingReviewCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-text-accent">
              <span
                aria-hidden
                className="inline-block size-1.5 shrink-0 rounded-full bg-state-accent-solid"
              />
              <Plural value={group.pendingReviewCount} one="# needs review" other="# need review" />
            </span>
          ) : null}
          {group.gapEntities.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-text-destructive">
              <span
                aria-hidden
                className="inline-block size-1.5 shrink-0 rounded-full bg-state-destructive-solid"
              />
              <Plural value={group.gapEntities.length} one="# missing" other="# missing" />
            </span>
          ) : null}
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
      className="group cursor-pointer hover:bg-state-base-hover"
      onClick={() => onClick(rule)}
      aria-label={`Open rule details for ${displayTitle}`}
      data-state={selected ? 'selected' : undefined}
    >
      {/* 2026-05-25 (Yuqi rule library #11, #12, second-pass #1):
          rule rows now use a single canonical pl-9 (36px) for the
          title cell regardless of checkbox presence. A leading `w-4`
          slot reserves space whether the row is selectable or not,
          so checkbox and non-checkbox rows render their titles at
          the EXACT same x-position. The slot's x-position sits flush
          with the state row's chevron above, so every interactive
          column of the table — chevron → checkbox → title — anchors
          to one left edge. Drops the prior `!pl-[58px]` /
          `!pl-[34px]` cascade that left selectable / non-selectable
          rule titles ~24px apart. */}
      <TableCell className="!pl-3 min-h-10 whitespace-normal py-2 text-sm font-medium text-text-primary">
        <div className="flex min-w-0 items-start gap-2">
          <span className="inline-flex w-4 shrink-0 items-start pt-0.5">
            {selectable ? (
              // Checkbox is its own click target — stopping propagation
              // so the row's `onClick` (which opens the rule detail
              // panel) doesn't fire when the user is just selecting for
              // batch review.
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
            ) : null}
          </span>
          <span className="group-hover:underline group-hover:underline-offset-2 group-hover:decoration-divider-regular">
            {displayTitle}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-2">
        <FormCell formName={rule.formName} taxType={rule.taxType} />
      </TableCell>
      {/* Per-entity applicability dots. Status column dropped —
          status is implied by the section header above.
          2026-05-25 (Yuqi #12): left-aligned (was text-center) so
          the dot sits at the same x-coordinate as the column
          header above. Eye scans down a single column without
          sweeping across centered content. */}
      {ENTITY_KEYS.map((entity) => (
        <TableCell key={entity} className="py-2 text-left">
          <EntityApplicabilityCell applies={applicabilitySet.has(entity)} status={rule.status} />
        </TableCell>
      ))}
      {/* Tier label + trailing affordance chevron. The chevron is
          always rendered (so column widths stay stable) but fades in
          only on row hover — it tells the user "clicking this row
          opens the rule detail panel." A canonical "list item → open"
          cue, mirroring native iOS/desktop list patterns. */}
      <TableCell className="py-2">
        <div className="flex items-center justify-end gap-2 text-xs text-text-secondary">
          <span>{tierLabels[rule.ruleTier]}</span>
          <ChevronRightIcon
            aria-hidden
            className="size-3.5 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

function GapTableRow({
  group,
  entity,
  onAddRule,
}: {
  group: JurisdictionGroup
  entity: EntityKey
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
      className="border-l-2 border-l-state-destructive-solid bg-state-destructive-subtle/40 hover:bg-state-destructive-subtle/70"
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
}: {
  rules: ObligationRule[]
  query: string
  onRuleClick: (rule: ObligationRule) => void
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
      <Table>
        <TableHeader className="bg-background-subtle">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              <Trans>Rule</Trans>
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              <Trans>Jurisdiction</Trans>
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              <Trans>Form</Trans>
            </TableHead>
            {ENTITY_KEYS.map((entity) => (
              <TableHead
                key={entity}
                title={ENTITY_LABELS[entity]}
                className="w-12 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary"
              >
                {ENTITY_COLUMN_LABELS[entity]}
              </TableHead>
            ))}
            <TableHead className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
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
              const applicabilitySet = new Set(rule.entityApplicability)
              return (
                <TableRow
                  key={rule.id}
                  className="group cursor-pointer hover:bg-state-base-hover"
                  onClick={() => onRuleClick(rule)}
                  aria-label={`Open rule details for ${rule.title}`}
                >
                  <TableCell className="whitespace-normal py-2 text-sm font-medium text-text-primary">
                    <span className="group-hover:underline group-hover:underline-offset-2 group-hover:decoration-divider-regular">
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
                    <TableCell key={entity} className="py-2 text-left">
                      <EntityApplicabilityCell
                        applies={applicabilitySet.has(entity)}
                        status={rule.status}
                      />
                    </TableCell>
                  ))}
                  {/* Trailing affordance chevron — fades in on row
                      hover so users can see "this row opens the rule
                      detail." Mirrors the same pattern in the grouped
                      table above. */}
                  <TableCell className="py-2">
                    <div className="flex items-center justify-end gap-2 text-xs text-text-secondary">
                      <span>{tierLabels[rule.ruleTier]}</span>
                      <ChevronRightIcon
                        aria-hidden
                        className="size-3.5 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
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
        <span className="font-mono text-caption-xs uppercase tracking-wider text-text-secondary">
          {rule.jurisdiction}
        </span>
      </span>
      <span aria-hidden>·</span>
      <span className="font-medium text-text-secondary">{rule.formName}</span>
      <span aria-hidden>·</span>
      <span className="font-mono tabular-nums">
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
  return (
    <FloatingActionBar ariaLabel={t`Bulk review actions`}>
      <span className="text-xs font-medium tabular-nums text-text-primary">
        <Plural value={count} one="# rule selected" other="# rules selected" />
      </span>
      <span aria-hidden className="mx-0.5 h-4 w-px bg-divider-regular" />
      {showSelectAll ? (
        // Small link to expand the selection to every pending rule in
        // the catalog. The total appears in the label so the user
        // knows the size of the commitment before clicking.
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <Trans>Select all {totalPending}</Trans>
        </button>
      ) : null}
      <Button type="button" size="sm" onClick={onReview}>
        <Trans>Review</Trans>
        <ChevronRightIcon data-icon="inline-end" />
      </Button>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-text-tertiary outline-none hover:text-text-secondary hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        <Trans>Clear</Trans>
      </button>
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
            <span className="font-mono text-xs tabular-nums text-text-tertiary">
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
          <h3 className="mb-3 text-base font-semibold text-text-primary">{current.title}</h3>
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
    <div className="hidden flex-wrap items-center gap-2 text-caption text-text-tertiary sm:flex">
      <KbdHint k="A" label="accept" />
      <span aria-hidden className="text-text-tertiary/50">
        ·
      </span>
      <KbdHint k="←" label="prev" />
      <KbdHint k="→" label="skip" />
    </div>
  )
}

function KbdHint({ k, label }: { k: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-divider-regular bg-background-default px-1 font-mono text-caption-xs font-medium text-text-secondary">
        {k}
      </kbd>
      <span>{label}</span>
    </span>
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
