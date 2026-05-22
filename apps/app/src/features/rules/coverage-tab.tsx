import { Fragment, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  ExternalLinkIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'
import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs'
import { toast } from 'sonner'

import type {
  ObligationRule,
  RuleBulkImpactPreview,
  RuleConcreteDraft,
  RuleConcreteDraftCacheEntry,
  RuleCoverageRow,
  RuleJurisdiction,
  RuleReviewTask,
  RuleSource,
  RuleSourceCoverageStatus,
} from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Input } from '@duedatehq/ui/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { cn } from '@duedatehq/ui/lib/utils'

import {
  isInteractiveEventTarget,
  useAppHotkey,
  useKeyboardShortcutsBlocked,
} from '@/components/patterns/keyboard-shell'
import { KbdHint } from '@/components/patterns/kbd'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

import {
  formatEnumLabel,
  humanizeDueDateLogic,
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

type RowFilter = 'all' | 'pending' | 'active'
type RuleQueueMode = 'pending' | 'active'
const ROW_FILTERS: readonly RowFilter[] = ['all', 'pending', 'active']
// URL-state parsers — filter + search go into the URL so browser
// back/forward, deep-linking, and shareable views all work. Both
// use `history: 'replace'` so each character / toggle doesn't bloat
// history.
const filterParser = parseAsStringLiteral(ROW_FILTERS)
  .withDefault('all')
  .withOptions({ history: 'replace' })
const searchParser = parseAsString.withDefault('').withOptions({ history: 'replace' })
const legacyLibraryParser = parseAsString.withOptions({ history: 'replace' })
const legacyJurisdictionParser = parseAsArrayOf(parseAsString)
  .withDefault([])
  .withOptions({ history: 'replace' })

function ruleRowKey(rule: Pick<ObligationRule, 'id' | 'status' | 'version'>): string {
  return `${rule.id}:${rule.version}:${rule.status}`
}

function reviewTaskKey(input: Pick<RuleReviewTask, 'ruleId' | 'templateVersion'>): string {
  return `${input.ruleId}:${input.templateVersion}`
}

function reviewTaskKeyForRule(rule: Pick<ObligationRule, 'id' | 'version'>): string {
  return `${rule.id}:${rule.version}`
}

function isSourceDefinedRule(rule: Pick<ObligationRule, 'dueDateLogic'>): boolean {
  return rule.dueDateLogic.kind === 'source_defined_calendar'
}

function queueModeForRule(rule: Pick<ObligationRule, 'status'>): RuleQueueMode {
  return rule.status === 'active' || rule.status === 'verified' ? 'active' : 'pending'
}

type RuleConcreteDraftTarget = {
  ruleId: string
  sourceId: string
  sourceSignalId?: string
}

type SelectedConcreteDraftRule = {
  rule: ObligationRule
  sourceId: string
  sourceSignalId: string | null
  draft: RuleConcreteDraft
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

export function CoverageTab({
  onJurisdictionDrillIn,
  onActiveDrillIn,
  onSourceDrillIn,
  onEntityDrillIn,
}: {
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onActiveDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onSourceDrillIn?: (jurisdiction: RuleJurisdiction, domain?: string) => void
  onEntityDrillIn?: (
    jurisdiction: RuleJurisdiction,
    entity: CoverageEntityColumn,
    state: CoverageCellState,
  ) => void
} = {}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  // Filter + search live in URL state (nuqs) — survives refresh,
  // back/forward navigation, and shareable links to "Coverage filtered
  // to a focused coverage view. Component state would have lost the user's view
  // on refresh and broken browser-back through filter changes.
  const [filterRaw, setFilterQuery] = useQueryState('filter', filterParser)
  const [search, setSearch] = useQueryState('q', searchParser)
  const [legacyLibraryFilter, setLegacyLibraryFilter] = useQueryState(
    'library',
    legacyLibraryParser,
  )
  const [legacyJurisdictionFilters, setLegacyJurisdictionFilters] = useQueryState(
    'jur',
    legacyJurisdictionParser,
  )
  const legacyFilter = legacyLibraryFilterToCoverageFilter(legacyLibraryFilter)
  const legacyJurisdictions = legacyJurisdictionFilters ?? []
  const filter = filterRaw === 'all' && legacyFilter ? legacyFilter : filterRaw
  const effectiveSearch =
    search.length > 0 || legacyJurisdictions.length !== 1 ? search : (legacyJurisdictions[0] ?? '')
  const setFilter = (next: RowFilter) => {
    void setLegacyLibraryFilter(null)
    void setFilterQuery(next)
  }
  const setSearchValue = (next: string) => {
    void setLegacyJurisdictionFilters(null)
    void setSearch(next)
  }

  const coverageQuery = useQuery(orpc.rules.coverage.queryOptions({ input: undefined }))
  const sourcesQuery = useQuery(orpc.rules.listSources.queryOptions({ input: undefined }))
  const rulesQuery = useQuery(
    orpc.rules.listRules.queryOptions({ input: { includeCandidates: true } }),
  )
  const tasksQuery = useQuery(
    orpc.rules.listReviewTasks.queryOptions({ input: { status: 'open' } }),
  )
  const [selectedRuleKeys, setSelectedRuleKeys] = useState<string[]>([])
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false)
  const [reviewNote, setReviewNote] = useState('')
  const [preview, setPreview] = useState<RuleBulkImpactPreview | null>(null)
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
    if (selectedRuleId === ruleId) return
    void setSelectedRuleId(ruleId)
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

  // Active rules grouped by jurisdiction — shown alongside pending
  // rules in the expanded row so the row detail matches the Active
  // count instead of looking empty after onboarding activation.
  const activeRulesByJurisdiction = useMemo(() => {
    const map = new Map<RuleJurisdiction, ObligationRule[]>()
    for (const rule of rulesQuery.data ?? []) {
      if (rule.status !== 'active' && rule.status !== 'verified') continue
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
    const q = effectiveSearch.trim().toLowerCase()
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
  }, [effectiveSearch, rulesByJurisdiction])

  // Lookup so expanded rows can render the actual cited source per
  // rule (rule.sourceIds → RuleSource).
  const sourceById = useMemo(() => {
    const map = new Map<string, RuleSource>()
    for (const source of sourcesQuery.data ?? []) map.set(source.id, source)
    return map
  }, [sourcesQuery.data])

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
      if (effectiveSearch.trim().length > 0) {
        const q = effectiveSearch.trim().toLowerCase()
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
  }, [rowsData, filter, effectiveSearch, rulesByJurisdiction])

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
  const visiblePendingQueue = useMemo<ObligationRule[]>(() => {
    const out: ObligationRule[] = []
    for (const row of filteredRows) {
      const rules = pendingRulesByJurisdiction.get(row.jurisdiction) ?? []
      out.push(...rules)
    }
    return out
  }, [filteredRows, pendingRulesByJurisdiction])
  const activeQueue = useMemo<ObligationRule[]>(() => {
    const out: ObligationRule[] = []
    for (const row of rowsData) {
      const rules = activeRulesByJurisdiction.get(row.jurisdiction) ?? []
      out.push(...rules)
    }
    return out
  }, [rowsData, activeRulesByJurisdiction])
  const visibleActiveQueue = useMemo<ObligationRule[]>(() => {
    const out: ObligationRule[] = []
    for (const row of filteredRows) {
      const rules = activeRulesByJurisdiction.get(row.jurisdiction) ?? []
      out.push(...rules)
    }
    return out
  }, [filteredRows, activeRulesByJurisdiction])
  const queueMode = selectedRule ? queueModeForRule(selectedRule) : 'pending'
  const visibleQueue = queueMode === 'active' ? visibleActiveQueue : visiblePendingQueue
  const fullQueue = queueMode === 'active' ? activeQueue : pendingQueue
  const selectedRuleVisibleInQueue =
    selectedRuleId !== null && visibleQueue.some((rule) => rule.id === selectedRuleId)
  const workspaceQueue =
    selectedRuleId !== null && !selectedRuleVisibleInQueue ? fullQueue : visibleQueue
  const pendingQueueRows =
    queueMode === 'pending' && selectedRuleId !== null && !selectedRuleVisibleInQueue
      ? rowsData
      : filteredRows
  const activeQueueRows =
    queueMode === 'active' && selectedRuleId !== null && !selectedRuleVisibleInQueue
      ? rowsData
      : filteredRows
  const switchQueueMode = (mode: RuleQueueMode) => {
    if (mode === queueMode) return
    const next = mode === 'active' ? activeQueue[0] : pendingQueue[0]
    if (next) void setSelectedRuleId(next.id)
  }
  const reviewTasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data])
  const openTaskByRuleVersion = useMemo(
    () => new Map(reviewTasks.map((task) => [reviewTaskKey(task), task])),
    [reviewTasks],
  )
  const concreteDraftInputs = useMemo(() => {
    const seen = new Set<string>()
    const inputs: RuleConcreteDraftTarget[] = []
    for (const rule of pendingQueue) {
      const target = concreteDraftTargetForRule(rule)
      if (!target) continue
      const key = concreteDraftTargetKey(target)
      if (seen.has(key)) continue
      seen.add(key)
      inputs.push(target)
    }
    return inputs
  }, [pendingQueue])
  const concreteDraftsQuery = useQuery({
    ...orpc.rules.listConcreteDrafts.queryOptions({ input: { rules: concreteDraftInputs } }),
    enabled: concreteDraftInputs.length > 0,
  })
  const concreteDraftByTarget = useMemo(() => {
    const map = new Map<string, RuleConcreteDraftCacheEntry>()
    for (const entry of concreteDraftsQuery.data ?? []) {
      map.set(concreteDraftTargetKey(entry), entry)
    }
    return map
  }, [concreteDraftsQuery.data])
  const selectedConcreteDraft = useMemo(() => {
    if (!selectedRule) return null
    const target = concreteDraftTargetForRule(selectedRule)
    return target ? (concreteDraftByTarget.get(concreteDraftTargetKey(target)) ?? null) : null
  }, [concreteDraftByTarget, selectedRule])
  const selectedRows = useMemo(
    () =>
      visiblePendingQueue.filter(
        (rule) =>
          selectedRuleKeys.includes(ruleRowKey(rule)) &&
          canBulkReviewRule(rule, openTaskByRuleVersion, concreteDraftByTarget),
      ),
    [concreteDraftByTarget, openTaskByRuleVersion, selectedRuleKeys, visiblePendingQueue],
  )
  const templateRows = selectedRows.filter((rule) => !isSourceDefinedRule(rule))
  const concreteDraftRows = selectedRows.flatMap((rule): SelectedConcreteDraftRule[] => {
    const target = concreteDraftTargetForRule(rule)
    if (!target) return []
    const entry = concreteDraftByTarget.get(concreteDraftTargetKey(target))
    if (!entry) return []
    return [
      {
        rule,
        sourceId: entry.sourceId,
        sourceSignalId: entry.sourceSignalId,
        draft: entry.draft,
      },
    ]
  })
  const selections = templateRows.map((rule) => ({
    ruleId: rule.id,
    expectedVersion:
      openTaskByRuleVersion.get(reviewTaskKeyForRule(rule))?.templateVersion ?? rule.version,
  }))
  const concreteDraftSelections = concreteDraftRows.map((entry) => ({
    ruleId: entry.rule.id,
    sourceId: entry.sourceId,
    ...(entry.sourceSignalId ? { sourceSignalId: entry.sourceSignalId } : {}),
    aiOutputId: entry.draft.aiOutputId,
  }))
  const visibleSelectableRows = visiblePendingQueue.filter((rule) =>
    canBulkReviewRule(rule, openTaskByRuleVersion, concreteDraftByTarget),
  )
  const visibleSelectedRows = visibleSelectableRows.filter((rule) =>
    selectedRuleKeys.includes(ruleRowKey(rule)),
  )
  const allVisibleSelected =
    visibleSelectableRows.length > 0 && visibleSelectedRows.length === visibleSelectableRows.length
  const visibleSingleReviewCount = Math.max(
    0,
    visiblePendingQueue.length - visibleSelectableRows.length,
  )

  const clearBulkSelection = () => {
    setSelectedRuleKeys([])
    setBulkDrawerOpen(false)
    setPreview(null)
  }

  const invalidateRules = () => {
    void queryClient.invalidateQueries({ queryKey: orpc.rules.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
  }

  const invalidateAcceptedRuleOutputs = () => {
    invalidateRules()
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.facets.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
  }

  const previewMutation = useMutation(
    orpc.rules.previewBulkRuleImpact.mutationOptions({
      onSuccess: (result) => setPreview(result),
      onError: (error) => {
        toast.error(t`Couldn't preview selected rules`, {
          description: rpcErrorMessage(error) ?? t`Check the selected rows and try again.`,
        })
      },
    }),
  )
  const bulkAcceptMutation = useMutation(orpc.rules.bulkAcceptTemplates.mutationOptions({}))
  const bulkVerifyMutation = useMutation(orpc.rules.bulkVerifyCandidates.mutationOptions({}))

  // Queue navigation helpers + keyboard shortcuts. All hoisted ABOVE
  // the loading/error early-returns so the hook order stays stable
  // across renders (React Rules of Hooks).
  const goNext = () => {
    if (workspaceQueue.length === 0 || !selectedRuleId) return
    const idx = workspaceQueue.findIndex((r) => r.id === selectedRuleId)
    if (idx < 0) return
    const next = workspaceQueue[idx + 1] ?? workspaceQueue[0]
    if (next && next.id !== selectedRuleId) void setSelectedRuleId(next.id)
  }
  const goPrev = () => {
    if (workspaceQueue.length === 0 || !selectedRuleId) return
    const idx = workspaceQueue.findIndex((r) => r.id === selectedRuleId)
    if (idx < 0) return
    const prev = workspaceQueue[idx - 1] ?? workspaceQueue[workspaceQueue.length - 1]
    if (prev && prev.id !== selectedRuleId) void setSelectedRuleId(prev.id)
  }
  const advanceAfterDecision = () => {
    if (!selectedRuleId) return
    const remaining = workspaceQueue.filter((r) => r.id !== selectedRuleId)
    if (remaining.length === 0) {
      void setSelectedRuleId(null)
      return
    }
    const idx = workspaceQueue.findIndex((r) => r.id === selectedRuleId)
    const next =
      (idx >= 0 ? workspaceQueue.slice(idx + 1).find((r) => r.id !== selectedRuleId) : null) ??
      remaining[0]
    if (next) void setSelectedRuleId(next.id)
  }

  // Keyboard shortcuts in review mode: j/↓ next, k/↑ prev, Esc exit.
  // Ignored when focus is inside an input / textarea / contentEditable
  // so the user can still type into the search box.
  const panelOpenForKeys = selectedRuleId !== null
  const reviewHotkeysEnabled = panelOpenForKeys && !shortcutsBlocked
  const ignoreReviewHotkey = (target: EventTarget | null) => isInteractiveEventTarget(target)

  useAppHotkey(
    'J',
    (event) => {
      if (ignoreReviewHotkey(event.target)) return
      event.preventDefault()
      goNext()
    },
    {
      enabled: reviewHotkeysEnabled,
      requireReset: true,
      meta: {
        id: 'rules.review-next',
        name: 'Next pending rule',
        description: 'Move to the next rule in the review queue.',
        category: 'rules',
        scope: 'route',
      },
    },
  )
  useAppHotkey(
    'ArrowDown',
    (event) => {
      if (ignoreReviewHotkey(event.target)) return
      event.preventDefault()
      goNext()
    },
    {
      enabled: reviewHotkeysEnabled,
      requireReset: true,
      meta: {
        id: 'rules.review-next-arrow',
        name: 'Next pending rule',
        description: 'Move to the next rule in the review queue.',
        category: 'rules',
        scope: 'route',
      },
    },
  )
  useAppHotkey(
    'K',
    (event) => {
      if (ignoreReviewHotkey(event.target)) return
      event.preventDefault()
      goPrev()
    },
    {
      enabled: reviewHotkeysEnabled,
      requireReset: true,
      meta: {
        id: 'rules.review-previous',
        name: 'Previous pending rule',
        description: 'Move to the previous rule in the review queue.',
        category: 'rules',
        scope: 'route',
      },
    },
  )
  useAppHotkey(
    'ArrowUp',
    (event) => {
      if (ignoreReviewHotkey(event.target)) return
      event.preventDefault()
      goPrev()
    },
    {
      enabled: reviewHotkeysEnabled,
      requireReset: true,
      meta: {
        id: 'rules.review-previous-arrow',
        name: 'Previous pending rule',
        description: 'Move to the previous rule in the review queue.',
        category: 'rules',
        scope: 'route',
      },
    },
  )
  useAppHotkey(
    'Escape',
    (event) => {
      if (ignoreReviewHotkey(event.target)) return
      event.preventDefault()
      void setSelectedRuleId(null)
    },
    {
      enabled: reviewHotkeysEnabled,
      requireReset: true,
      // Multiple Escape handlers ship across the app (wizard, queue
      // drawer, rule review). Context-scoped, mutually exclusive in
      // practice — silence the global 'warn' default.
      conflictBehavior: 'allow',
      meta: {
        id: 'rules.review-exit',
        name: 'Exit review',
        description: 'Close the active rule review panel.',
        category: 'rules',
        scope: 'route',
      },
    },
  )

  if (coverageQuery.isLoading) {
    return <QueryPanelState state="loading" message={t`Loading rules coverage…`} />
  }
  if (coverageQuery.isError) {
    return <QueryPanelState state="error" message={t`Couldn't load rules coverage`} />
  }

  const panelOpen = selectedRuleId !== null
  const visibleEntityColumns = panelOpen ? [] : ENTITY_DISPLAY
  const totalColumnCount = 3 + 1 + visibleEntityColumns.length

  const toggleRuleSelection = (rowKey: string, checked: boolean) => {
    setSelectedRuleKeys((current) =>
      checked
        ? current.includes(rowKey)
          ? current
          : [...current, rowKey]
        : current.filter((key) => key !== rowKey),
    )
    setPreview(null)
  }
  const toggleVisibleSelection = (checked: boolean) => {
    const visibleKeys = visibleSelectableRows.map(ruleRowKey)
    setSelectedRuleKeys((current) =>
      checked
        ? Array.from(new Set([...current, ...visibleKeys]))
        : current.filter((key) => !visibleKeys.includes(key)),
    )
    setPreview(null)
  }
  const openBulkReview = () => {
    if (selectedRows.length === 0) {
      toast.error(t`Select at least one pending rule.`)
      return
    }
    setBulkDrawerOpen(true)
  }
  const runBulkPreview = () => {
    if (selections.length === 0) {
      toast.error(t`Select at least one template rule to preview.`)
      return
    }
    setBulkDrawerOpen(true)
    previewMutation.mutate({ rules: selections })
  }
  const bulkAccept = async () => {
    const note = reviewNote.trim()
    if (selectedRows.length === 0) {
      toast.error(t`Select at least one pending rule.`)
      return
    }
    if (!note) {
      toast.error(t`Batch review note is required.`)
      return
    }
    try {
      const [templateResult, concreteDraftResult] = await Promise.all([
        selections.length > 0
          ? bulkAcceptMutation.mutateAsync({ rules: selections, reviewNote: note })
          : Promise.resolve({ accepted: [], skipped: [] }),
        concreteDraftSelections.length > 0
          ? bulkVerifyMutation.mutateAsync({ rules: concreteDraftSelections, reviewNote: note })
          : Promise.resolve({ verified: [], skipped: [] }),
      ])
      invalidateAcceptedRuleOutputs()
      clearBulkSelection()
      setReviewNote('')
      toast.success(t`Rules accepted`, {
        description: t`${templateResult.accepted.length + concreteDraftResult.verified.length} accepted · ${templateResult.skipped.length + concreteDraftResult.skipped.length} skipped.`,
      })
    } catch (error) {
      toast.error(t`Couldn't accept selected rules`, {
        description: rpcErrorMessage(error) ?? t`Add a review note and try again.`,
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* StatsStrip removed 2026-05-21 per docs/Design/ux-audit-2026-05-21.md
        P0 #5 — the active/pending/jurisdiction counts already render in
        `CoverageSummaryStrip` at the page top (drillable). Repeating
        them here read as "this designer hasn't decided." */}

      <section className="flex flex-col gap-3">
        {/* In normal mode, the section header carries the "Entity
          coverage" label + search input. In review mode, that
          orientation chrome moves into the workspace (search goes into
          the queue header). */}
        {!panelOpen ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-semibold tracking-[0.12em] text-text-primary uppercase">
                <Trans>Entity coverage</Trans>
              </h2>
              <SearchInput value={effectiveSearch} onChange={setSearchValue} />
            </div>
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
                {queueMode === 'active' ? (
                  <ActiveRuleQueue
                    filteredRows={activeQueueRows}
                    activeRulesByJurisdiction={activeRulesByJurisdiction}
                    sourceById={sourceById}
                    selectedRuleId={selectedRuleId}
                    onSelectRule={selectRule}
                    search={effectiveSearch}
                    onSearchChange={setSearchValue}
                    mode={queueMode}
                    pendingCount={pendingQueue.length}
                    activeCount={activeQueue.length}
                    onModeChange={switchQueueMode}
                  />
                ) : (
                  <PendingRuleQueue
                    filteredRows={pendingQueueRows}
                    pendingRulesByJurisdiction={pendingRulesByJurisdiction}
                    sourceById={sourceById}
                    selectedRuleId={selectedRuleId}
                    onSelectRule={selectRule}
                    search={effectiveSearch}
                    onSearchChange={setSearchValue}
                    mode={queueMode}
                    pendingCount={pendingQueue.length}
                    activeCount={activeQueue.length}
                    onModeChange={switchQueueMode}
                    selectedRuleKeys={selectedRuleKeys}
                    selectedCount={selectedRows.length}
                    allVisibleSelected={allVisibleSelected}
                    visibleSelectableCount={visibleSelectableRows.length}
                    visibleSingleReviewCount={visibleSingleReviewCount}
                    openTaskByRuleVersion={openTaskByRuleVersion}
                    concreteDraftByTarget={concreteDraftByTarget}
                    onRuleSelectionChange={toggleRuleSelection}
                    onToggleVisibleSelection={toggleVisibleSelection}
                    onReviewSelected={openBulkReview}
                    onClearSelection={clearBulkSelection}
                  />
                )}
              </div>
              {selectedRule ? (
                <div className="flex flex-1 min-w-0 flex-col">
                  <RulePanel
                    rule={selectedRule}
                    concreteDraft={selectedConcreteDraft}
                    onClose={() => void setSelectedRuleId(null)}
                    onActionComplete={advanceAfterDecision}
                    mode={queueMode}
                    queuePosition={
                      workspaceQueue.length > 0
                        ? {
                            index: workspaceQueue.findIndex((r) => r.id === selectedRule.id),
                            total: workspaceQueue.length,
                          }
                        : null
                    }
                    {...(workspaceQueue.length > 1 ? { onSkip: goNext } : {})}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <SectionFrame className="max-h-[clamp(420px,calc(100svh-12rem),920px)] overflow-auto overscroll-auto">
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
                          activeRules={activeRulesByJurisdiction.get(row.jurisdiction) ?? []}
                          pendingRules={pendingRulesByJurisdiction.get(row.jurisdiction) ?? []}
                          sourceById={sourceById}
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
      <BulkReviewDrawer
        open={bulkDrawerOpen}
        onOpenChange={setBulkDrawerOpen}
        selectedRules={selectedRows}
        selectedConcreteDrafts={concreteDraftRows}
        templateRuleCount={templateRows.length}
        preview={preview}
        reviewNote={reviewNote}
        previewPending={previewMutation.isPending}
        acceptPending={bulkAcceptMutation.isPending || bulkVerifyMutation.isPending}
        onReviewNoteChange={setReviewNote}
        onPreview={runBulkPreview}
        onAccept={() => void bulkAccept()}
      />
    </div>
  )
}

// StatsStrip + Stat removed 2026-05-21 — counts now live in the page-
// level CoverageSummaryStrip + SourcesSummaryStrip (rules.library.tsx).
// See docs/Design/ux-audit-2026-05-21.md P0 #5.

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
 * section header and the table so a first-time CPA can decode the
 * orange triangle / green check / em-dash glyphs without hover-discovering them.
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
        <AlertTriangleIcon aria-hidden className="size-3.5 text-severity-medium" />
        <Trans>Needs review</Trans>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-flex size-3.5 items-center justify-center rounded-full border border-text-muted text-[9px] font-semibold text-text-muted"
        >
          S
        </span>
        <Trans>Source only</Trans>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <XIcon
          aria-hidden
          data-coverage-legend-icon="missing_source"
          className="size-3.5 text-text-muted"
        />
        <Trans>Missing source</Trans>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          data-coverage-legend-icon="not_applicable"
          className="inline-flex size-3.5 items-center justify-center text-sm text-text-muted"
        >
          —
        </span>
        <Trans>Not applicable</Trans>
      </span>
    </div>
  )
}

function CoverageRow({
  row,
  sources,
  activeRules,
  pendingRules,
  sourceById,
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
  activeRules: readonly ObligationRule[]
  pendingRules: readonly ObligationRule[]
  sourceById: ReadonlyMap<string, RuleSource>
  isExpanded: boolean
  onToggleExpanded: () => void
  selectedRuleId: string | null
  onSelectRule: (ruleId: string) => void
  visibleEntityColumns: typeof ENTITY_DISPLAY
  totalColumnCount: number
  onJurisdictionDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onActiveDrillIn?: (jurisdiction: RuleJurisdiction) => void
  onSourceDrillIn?: (jurisdiction: RuleJurisdiction, domain?: string) => void
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
  const missingSourceCount = row.missingSourceCount
  const sourceDescriptor =
    missingSourceCount > 0
      ? t`${missingSourceCount} source gaps`
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
    if (!(event.target instanceof HTMLElement)) return
    const target = event.target
    if (target.closest('button, a')) return
    onToggleExpanded()
  }
  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (!(event.target instanceof HTMLElement)) return
    const target = event.target
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
        click target. */}
        <TableCell className="py-2">
          {onSourceDrillIn ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onSourceDrillIn(row.jurisdiction, row.missingSourceDomains?.[0])
              }}
              aria-label={t`Open sources for ${jurisdictionLabel(row.jurisdiction)}`}
              className="group/source inline-flex items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <SourceCountBadge count={sourceCount} attention={missingSourceCount > 0} />
              <span
                className={cn(
                  'text-sm group-hover/source:underline',
                  missingSourceCount > 0
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
              <SourceCountBadge count={sourceCount} attention={missingSourceCount > 0} />
              <span className="text-sm text-text-secondary">{sourceDescriptor}</span>
            </div>
          )}
        </TableCell>

        {/* Entity coverage cells — three explicit states share a single
        visual grammar (text pill + tinted background). Unifying the
        review state into a REVIEW pill instead of a dot fixes the
        a11y gap and the asymmetry the critique flagged. */}
        {visibleEntityColumns.map(({ col, fullName }) => {
          const sourceState = row.entitySourceCoverage[col]
          const state = coverageCellStateFromSourceState(sourceState, row.entityCoverage[col])
          const drillable = state !== null && Boolean(onEntityDrillIn)
          const cellInner = <EntityCellContent state={sourceState} />
          return (
            <TableCell key={col} className="py-2 text-center">
              {drillable ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onEntityDrillIn?.(row.jurisdiction, col, state)
                  }}
                  aria-label={t`Open ${fullName} rules for ${jurisdictionLabel(row.jurisdiction)} — ${labelForSourceState(sourceState)}`}
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
          activeRules={activeRules}
          pendingRules={pendingRules}
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
 * the actual active + pending rules first (each with a Source ↗ link
 * to the citing document), then watched sources. No "Open in Catalog"
 * CTA — the main-row Pending count already drills there for users who
 * need the full catalog view, and once the inline Accept/Reject is
 * wired the expanded panel becomes the action surface itself.
 *
 * Sits inside the same `<TableBody>` as a sibling `<TableRow>` with
 * `colSpan = 11` (Jurisdiction + Active + Pending + Source + 7 entity).
 */
function ExpandedRowDetail({
  activeRules,
  pendingRules,
  sources,
  sourceById,
  selectedRuleId,
  onSelectRule,
  totalColumnCount,
}: {
  activeRules: readonly ObligationRule[]
  pendingRules: readonly ObligationRule[]
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
              <Trans>Active rules</Trans>
            </p>
            {activeRules.length === 0 ? (
              <p className="text-sm text-text-tertiary">
                <Trans>No active rules for this jurisdiction.</Trans>
              </p>
            ) : (
              <ul className="flex flex-col">
                {activeRules.map((rule) => (
                  <CoverageRuleItem
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
              <Trans>Pending rules</Trans>
            </p>
            {pendingRules.length === 0 ? (
              <p className="text-sm text-text-tertiary">
                <Trans>No pending rules for this jurisdiction.</Trans>
              </p>
            ) : (
              <ul className="flex flex-col">
                {pendingRules.map((rule) => (
                  <CoverageRuleItem
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
 * One rule inside the expanded row or pending queue. Acts as a selectable row
 * in a master-detail layout — clicking the title sets it as the
 * selected rule in the parent CoverageTab state, which docks the
 * `RulePanel` on the right with that rule's detail. The selected
 * rule gets a subtle bg tint so the user can see which row the right
 * panel is showing.
 */
function CoverageRuleItem({
  rule,
  ruleSource,
  isSelected,
  onSelect,
  selection,
  selectionUnavailableLabel,
  sourceDefinedDraftReady = false,
}: {
  rule: ObligationRule
  ruleSource: RuleSource | null
  isSelected: boolean
  onSelect: () => void
  selection?: {
    checked: boolean
    label: string
    onChange: (checked: boolean) => void
  }
  selectionUnavailableLabel?: ReactNode
  sourceDefinedDraftReady?: boolean
}) {
  const { t } = useLingui()
  const sourceDefined = rule.dueDateLogic.kind === 'source_defined_calendar'
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
        starts at the same x as the section eyebrow above.
        Taller row (py-2 = 8px each side) gives a comfortable click
        target. Selected state shows as a bg-tint that spans the
        natural row width. */}
      <div
        onClick={() => onSelect()}
        className={cn(
          'flex cursor-pointer items-center justify-between gap-3 rounded py-2 transition-colors',
          isSelected ? 'bg-state-accent-tint/50' : 'hover:bg-background-subtle/50',
        )}
      >
        {selection ? <RuleSelectionCheckbox selection={selection} /> : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onSelect()
          }}
          aria-pressed={isSelected}
          title={rule.title}
          className={cn(
            'flex-1 cursor-pointer truncate rounded text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
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
          <div className="flex shrink-0 items-center gap-2">
            {selectionUnavailableLabel ? (
              <RuleSelectionUnavailableChip>
                {selectionUnavailableLabel}
              </RuleSelectionUnavailableChip>
            ) : null}
            <RuleStatusChip
              rule={rule}
              sourceDefined={sourceDefined}
              sourceDefinedDraftReady={sourceDefinedDraftReady}
            />
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
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            {selectionUnavailableLabel ? (
              <RuleSelectionUnavailableChip>
                {selectionUnavailableLabel}
              </RuleSelectionUnavailableChip>
            ) : null}
            <RuleStatusChip
              rule={rule}
              sourceDefined={sourceDefined}
              sourceDefinedDraftReady={sourceDefinedDraftReady}
            />
          </div>
        )}
      </div>
    </li>
  )
}

function RuleSelectionCheckbox({
  selection,
}: {
  selection: {
    checked: boolean
    label: string
    onChange: (checked: boolean) => void
  }
}) {
  return (
    <input
      type="checkbox"
      aria-label={selection.label}
      checked={selection.checked}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onChange={(event) => selection.onChange(event.target.checked)}
      className="size-4 shrink-0"
    />
  )
}

function RuleSelectionUnavailableChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[18px] shrink-0 items-center rounded-sm bg-background-subtle px-1.5 text-[10px] font-medium text-text-tertiary">
      {children}
    </span>
  )
}

function RuleStatusChip({
  rule,
  sourceDefined,
  sourceDefinedDraftReady = false,
}: {
  rule: Pick<ObligationRule, 'status'>
  sourceDefined: boolean
  sourceDefinedDraftReady?: boolean
}) {
  if (sourceDefined) {
    if (sourceDefinedDraftReady) {
      return (
        <span className="inline-flex h-[18px] shrink-0 items-center rounded-sm bg-status-review/10 px-1.5 text-[10px] font-medium text-status-review">
          <Trans>AI draft ready</Trans>
        </span>
      )
    }
    return (
      <span className="inline-flex h-[18px] shrink-0 items-center rounded-sm bg-severity-medium-tint px-1.5 text-[10px] font-medium text-severity-medium">
        <Trans>AI draft needed</Trans>
      </span>
    )
  }

  if (rule.status === 'active' || rule.status === 'verified') {
    return (
      <span className="inline-flex h-[18px] shrink-0 items-center rounded-sm bg-status-done/10 px-1.5 text-[10px] font-medium text-status-done">
        <Trans>Active</Trans>
      </span>
    )
  }

  return (
    <span className="inline-flex h-[18px] shrink-0 items-center rounded-sm bg-status-review/10 px-1.5 text-[10px] font-medium text-status-review">
      <Trans>Needs review</Trans>
    </span>
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
 * count. The CoverageRuleItem rows below it stay the same, so
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
  mode,
  pendingCount,
  activeCount,
  onModeChange,
  selectedRuleKeys,
  selectedCount,
  allVisibleSelected,
  visibleSelectableCount,
  visibleSingleReviewCount,
  openTaskByRuleVersion,
  concreteDraftByTarget,
  onRuleSelectionChange,
  onToggleVisibleSelection,
  onReviewSelected,
  onClearSelection,
}: {
  filteredRows: readonly RuleCoverageRow[]
  pendingRulesByJurisdiction: ReadonlyMap<RuleJurisdiction, ObligationRule[]>
  sourceById: ReadonlyMap<string, RuleSource>
  selectedRuleId: string | null
  onSelectRule: (ruleId: string) => void
  search: string
  onSearchChange: (value: string) => void
  mode: RuleQueueMode
  pendingCount: number
  activeCount: number
  onModeChange: (mode: RuleQueueMode) => void
  selectedRuleKeys: readonly string[]
  selectedCount: number
  allVisibleSelected: boolean
  visibleSelectableCount: number
  visibleSingleReviewCount: number
  openTaskByRuleVersion: ReadonlyMap<string, RuleReviewTask>
  concreteDraftByTarget: ReadonlyMap<string, RuleConcreteDraftCacheEntry>
  onRuleSelectionChange: (rowKey: string, checked: boolean) => void
  onToggleVisibleSelection: (checked: boolean) => void
  onReviewSelected: () => void
  onClearSelection: () => void
}) {
  const { t } = useLingui()
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
        <RuleQueueModeToggle
          mode={mode}
          pendingCount={pendingCount}
          activeCount={activeCount}
          onModeChange={onModeChange}
        />
        <SearchInput value={search} onChange={onSearchChange} fullWidth />
        <div className="flex items-center justify-between gap-2">
          {visibleSelectableCount > 0 ? (
            <label className="inline-flex min-w-0 items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                aria-label={t`Select visible batch-ready rules`}
                checked={allVisibleSelected}
                onChange={(event) => onToggleVisibleSelection(event.target.checked)}
                className="size-4"
              />
              <span className="truncate">
                <Trans>Select batch-ready</Trans>
              </span>
            </label>
          ) : (
            <span className="text-xs text-text-tertiary">
              <Trans>No batch-ready rules</Trans>
            </span>
          )}
          {selectedCount > 0 ? (
            <span className="shrink-0 text-xs tabular-nums text-text-tertiary">
              <Trans>{selectedCount} selected</Trans>
            </span>
          ) : null}
        </div>
        <p className="text-xs text-text-tertiary">
          <Trans>
            {visibleSelectableCount} batch-ready · {visibleSingleReviewCount} need single review
          </Trans>
        </p>
        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={onReviewSelected}>
              <Trans>Review selected</Trans>
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
              <Trans>Clear</Trans>
            </Button>
          </div>
        ) : null}
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
                    {rules.map((rule) => {
                      const rowKey = ruleRowKey(rule)
                      const reviewTask = openTaskByRuleVersion.get(reviewTaskKeyForRule(rule))
                      const disabledReason = bulkReviewDisabledReason(
                        rule,
                        reviewTask ?? null,
                        concreteDraftByTarget,
                      )
                      const disabledReasonLabel =
                        disabledReason === 'source_defined'
                          ? t`AI draft needed`
                          : disabledReason === 'source_changed'
                            ? t`Single review`
                            : disabledReason === 'no_open_task'
                              ? t`No open review task.`
                              : null
                      const draftTarget = concreteDraftTargetForRule(rule)
                      const concreteDraftReady = draftTarget
                        ? concreteDraftByTarget.has(concreteDraftTargetKey(draftTarget))
                        : false
                      return (
                        <CoverageRuleItem
                          key={rule.id}
                          rule={rule}
                          ruleSource={sourceById.get(rule.sourceIds[0] ?? '') ?? null}
                          isSelected={selectedRuleId === rule.id}
                          onSelect={() => onSelectRule(rule.id)}
                          sourceDefinedDraftReady={concreteDraftReady}
                          {...(disabledReason === null
                            ? {
                                selection: {
                                  checked: selectedRuleKeys.includes(rowKey),
                                  label: concreteDraftReady
                                    ? t`Select AI draft rule ${rule.title}`
                                    : t`Select rule ${rule.title}`,
                                  onChange: (checked) => onRuleSelectionChange(rowKey, checked),
                                },
                              }
                            : disabledReasonLabel !== null && disabledReason !== 'source_defined'
                              ? { selectionUnavailableLabel: disabledReasonLabel }
                              : {})}
                        />
                      )
                    })}
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

function ActiveRuleQueue({
  filteredRows,
  activeRulesByJurisdiction,
  sourceById,
  selectedRuleId,
  onSelectRule,
  search,
  onSearchChange,
  mode,
  pendingCount,
  activeCount,
  onModeChange,
}: {
  filteredRows: readonly RuleCoverageRow[]
  activeRulesByJurisdiction: ReadonlyMap<RuleJurisdiction, ObligationRule[]>
  sourceById: ReadonlyMap<string, RuleSource>
  selectedRuleId: string | null
  onSelectRule: (ruleId: string) => void
  search: string
  onSearchChange: (value: string) => void
  mode: RuleQueueMode
  pendingCount: number
  activeCount: number
  onModeChange: (mode: RuleQueueMode) => void
}) {
  const jurisdictionsWithActive = filteredRows.filter(
    (row) => (activeRulesByJurisdiction.get(row.jurisdiction) ?? []).length > 0,
  )
  const totalActive = jurisdictionsWithActive.reduce(
    (sum, row) => sum + (activeRulesByJurisdiction.get(row.jurisdiction) ?? []).length,
    0,
  )
  return (
    <>
      <header className="flex flex-col gap-2 border-b border-divider-regular px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-medium tracking-[0.12em] text-text-tertiary uppercase">
            <Trans>Active rule queue</Trans>
          </p>
          <span className="text-xs tabular-nums text-text-tertiary">
            <Trans>{totalActive} rules</Trans>
          </span>
        </div>
        <RuleQueueModeToggle
          mode={mode}
          pendingCount={pendingCount}
          activeCount={activeCount}
          onModeChange={onModeChange}
        />
        <SearchInput value={search} onChange={onSearchChange} fullWidth />
        <p className="text-xs text-text-tertiary">
          <Trans>Accepted practice rules for source and deadline review.</Trans>
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {jurisdictionsWithActive.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            <Trans>No active rules match this view.</Trans>
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {jurisdictionsWithActive.map((row) => {
              const rules = activeRulesByJurisdiction.get(row.jurisdiction) ?? []
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
                      <CoverageRuleItem
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

function RuleQueueModeToggle({
  mode,
  pendingCount,
  activeCount,
  onModeChange,
}: {
  mode: RuleQueueMode
  pendingCount: number
  activeCount: number
  onModeChange: (mode: RuleQueueMode) => void
}) {
  const { t } = useLingui()
  return (
    <div
      role="tablist"
      aria-label={t`Rule queue`}
      className="grid h-8 grid-cols-2 rounded-md bg-background-subtle p-0.5"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'pending'}
        disabled={pendingCount === 0}
        onClick={() => onModeChange('pending')}
        className={cn(
          'inline-flex min-w-0 items-center justify-center gap-1 rounded px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50',
          mode === 'pending'
            ? 'bg-background-default text-text-primary shadow-xs'
            : 'text-text-secondary hover:bg-background-default/70 hover:text-text-primary',
        )}
      >
        <Trans>Pending</Trans>
        <span className="font-mono text-[11px] text-text-tertiary">{pendingCount}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'active'}
        disabled={activeCount === 0}
        onClick={() => onModeChange('active')}
        className={cn(
          'inline-flex min-w-0 items-center justify-center gap-1 rounded px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50',
          mode === 'active'
            ? 'bg-background-default text-text-primary shadow-xs'
            : 'text-text-secondary hover:bg-background-default/70 hover:text-text-primary',
        )}
      >
        <Trans>Active</Trans>
        <span className="font-mono text-[11px] text-text-tertiary">{activeCount}</span>
      </button>
    </div>
  )
}

type BulkReviewDisabledReason = 'source_defined' | 'source_changed' | 'no_open_task'

function legacyLibraryFilterToCoverageFilter(value: string | null): RowFilter | null {
  if (value === 'active' || value === 'verified') return 'active'
  if (value === 'pending_review' || value === 'candidate') return 'pending'
  return null
}

function canBulkReviewRule(
  rule: ObligationRule,
  openTaskByRuleVersion: ReadonlyMap<string, RuleReviewTask>,
  concreteDraftByTarget: ReadonlyMap<string, RuleConcreteDraftCacheEntry>,
): boolean {
  if (rule.status !== 'pending_review') return false
  if (!canBulkReviewTask(openTaskByRuleVersion.get(reviewTaskKeyForRule(rule)) ?? null)) {
    return false
  }
  if (!isSourceDefinedRule(rule)) return true
  const target = concreteDraftTargetForRule(rule)
  return target ? concreteDraftByTarget.has(concreteDraftTargetKey(target)) : false
}

function canBulkReviewTask(task: RuleReviewTask | null): boolean {
  return task !== null && task.reason !== 'source_changed'
}

function bulkReviewDisabledReason(
  rule: ObligationRule,
  reviewTask: RuleReviewTask | null,
  concreteDraftByTarget: ReadonlyMap<string, RuleConcreteDraftCacheEntry>,
): BulkReviewDisabledReason | null {
  if (reviewTask?.reason === 'source_changed') return 'source_changed'
  if (!canBulkReviewTask(reviewTask)) return 'no_open_task'
  if (isSourceDefinedRule(rule)) {
    const target = concreteDraftTargetForRule(rule)
    if (!target || !concreteDraftByTarget.has(concreteDraftTargetKey(target))) {
      return 'source_defined'
    }
  }
  return null
}

function BulkReviewDrawer({
  open,
  onOpenChange,
  selectedRules,
  selectedConcreteDrafts,
  templateRuleCount,
  preview,
  reviewNote,
  previewPending,
  acceptPending,
  onReviewNoteChange,
  onPreview,
  onAccept,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedRules: ObligationRule[]
  selectedConcreteDrafts: SelectedConcreteDraftRule[]
  templateRuleCount: number
  preview: RuleBulkImpactPreview | null
  reviewNote: string
  previewPending: boolean
  acceptPending: boolean
  onReviewNoteChange: (value: string) => void
  onPreview: () => void
  onAccept: () => void
}) {
  const { t } = useLingui()
  const hiddenRuleCount = Math.max(0, selectedRules.length - 8)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="data-[side=right]:w-full sm:data-[side=right]:w-[min(720px,calc(100vw-2rem))] sm:data-[side=right]:max-w-none flex flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="gap-2 border-b border-divider-regular px-5 py-4">
          <SheetTitle className="text-md text-text-primary">
            <Trans>Review selected rules</Trans>
          </SheetTitle>
          <SheetDescription>
            <Trans>
              Review batch-ready templates and AI concrete drafts, add one batch note, then accept
              them into active practice rules.
            </Trans>
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-2">
              <BulkSectionLabel>
                <Trans>SELECTED RULES</Trans>
              </BulkSectionLabel>
              <div className="overflow-hidden rounded-md border border-divider-regular bg-background-subtle">
                {selectedRules.length > 0 ? (
                  selectedRules.slice(0, 8).map((rule) => (
                    <div
                      key={ruleRowKey(rule)}
                      className="flex items-center gap-3 border-b border-divider-subtle px-3 py-2 last:border-b-0"
                    >
                      <JurisdictionCode code={rule.jurisdiction} />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-text-primary">
                          {rule.title}
                        </span>
                        <span className="block truncate font-mono text-[11px] text-text-tertiary">
                          {rule.id}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-text-tertiary">v{rule.version}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-3 text-xs text-text-tertiary">
                    <Trans>Select pending rules from the queue.</Trans>
                  </div>
                )}
                {hiddenRuleCount > 0 ? (
                  <div className="border-t border-divider-subtle px-3 py-2 text-xs text-text-tertiary">
                    <Trans>{hiddenRuleCount} more selected rules</Trans>
                  </div>
                ) : null}
              </div>
            </section>
            {selectedConcreteDrafts.length > 0 ? (
              <section className="flex flex-col gap-2">
                <BulkSectionLabel>
                  <Trans>AI CONCRETE DRAFTS</Trans>
                </BulkSectionLabel>
                <BulkConcreteDraftSummary selectedDrafts={selectedConcreteDrafts} />
              </section>
            ) : null}
            {templateRuleCount > 0 ? (
              <section className="flex flex-col gap-2">
                <BulkSectionLabel>
                  <Trans>PREVIEW</Trans>
                </BulkSectionLabel>
                <BulkPreviewSummary preview={preview} />
              </section>
            ) : null}
            <label className="flex flex-col gap-2">
              <BulkSectionLabel>
                <Trans>BATCH REVIEW NOTE</Trans>
              </BulkSectionLabel>
              <Textarea
                value={reviewNote}
                onChange={(event) => onReviewNoteChange(event.target.value)}
                placeholder={t`Reviewed source authority and practice applicability.`}
                className="min-h-24 text-xs"
              />
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-divider-regular px-5 py-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPreview}
            disabled={previewPending || templateRuleCount === 0}
          >
            <EyeIcon className="size-3.5" />
            <Trans>Preview</Trans>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onAccept}
            disabled={acceptPending || selectedRules.length === 0}
          >
            <CheckIcon className="size-3.5" />
            <Trans>Accept selected</Trans>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function BulkConcreteDraftSummary({
  selectedDrafts,
}: {
  selectedDrafts: SelectedConcreteDraftRule[]
}) {
  const hiddenDraftCount = Math.max(0, selectedDrafts.length - 5)
  return (
    <div className="flex flex-col gap-2 rounded-md border border-divider-regular bg-background-subtle px-3 py-3 text-xs">
      {selectedDrafts.slice(0, 5).map(({ rule, draft }) => (
        <div
          key={ruleRowKey(rule)}
          className="flex flex-col gap-1 border-b border-divider-subtle pb-2 last:border-b-0 last:pb-0"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate font-medium text-text-primary">{rule.title}</span>
            <span className="shrink-0 text-text-tertiary">
              <Trans>{Math.round(draft.confidence * 100)}% confidence</Trans>
            </span>
          </div>
          <span className="text-text-secondary">{humanizeDueDateLogic(draft.dueDateLogic)}</span>
          <div className="flex flex-wrap gap-1.5 text-text-tertiary">
            <span>{formatEnumLabel(draft.coverageStatus)}</span>
            {draft.requiresApplicabilityReview ? (
              <span>
                <Trans>Applicability review</Trans>
              </span>
            ) : null}
          </div>
          <p className="line-clamp-2 text-text-tertiary">"{draft.sourceExcerpt}"</p>
        </div>
      ))}
      {hiddenDraftCount > 0 ? (
        <span className="text-text-tertiary">
          <Trans>{hiddenDraftCount} more AI drafts</Trans>
        </span>
      ) : null}
    </div>
  )
}

function BulkPreviewSummary({ preview }: { preview: RuleBulkImpactPreview | null }) {
  const { t } = useLingui()

  if (!preview) {
    return (
      <div className="rounded-md border border-divider-regular bg-background-subtle px-3 py-3 text-xs text-text-tertiary">
        <Trans>Preview selected rules before accepting them into production.</Trans>
      </div>
    )
  }

  const skipReasonLabels: Record<RuleBulkImpactPreview['skipped'][number]['reason'], string> = {
    template_not_found: t`Rule not found`,
    version_conflict: t`Version conflict`,
    already_active: t`Already active`,
    rejected: t`Rejected`,
    archived: t`Archived`,
    invalid_template: t`Invalid rule`,
    source_changed_requires_review: t`Source changed requires single-rule review`,
    source_defined_requires_ai_review: t`AI draft review required`,
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-divider-regular bg-background-subtle px-3 py-3 text-xs">
      <div className="grid gap-2 text-text-secondary">
        <span>
          <Trans>
            {preview.acceptReadyCount} ready · {preview.estimatedObligationCount} estimated
            obligation matches
          </Trans>
        </span>
        <span>
          <Trans>{preview.sourceCount} sources involved</Trans>
        </span>
      </div>
      {preview.jurisdictionCounts.length > 0 ? (
        <PreviewList label={<Trans>Jurisdictions</Trans>} rows={preview.jurisdictionCounts} />
      ) : null}
      {preview.formCounts.length > 0 ? (
        <PreviewList label={<Trans>Forms</Trans>} rows={preview.formCounts} />
      ) : null}
      {preview.entityCounts.length > 0 ? (
        <PreviewList label={<Trans>Entities</Trans>} rows={preview.entityCounts} />
      ) : null}
      {preview.reviewReasonCounts.length > 0 ? (
        <PreviewList label={<Trans>Review reasons</Trans>} rows={preview.reviewReasonCounts} />
      ) : null}
      {preview.reviewReasonCounts.some((row) => row.key === 'source_changed') ? (
        <div className="flex items-start gap-2 text-severity-medium">
          <span>
            <Trans>Source-changed rules should be checked against evidence before accepting.</Trans>
          </span>
        </div>
      ) : null}
      {preview.skipped.some((row) => row.reason === 'source_changed_requires_review') ? (
        <div className="flex items-start gap-2 text-severity-medium">
          <span>
            <Trans>
              Source-changed rules are skipped from bulk accept. Review them one by one.
            </Trans>
          </span>
        </div>
      ) : null}
      {preview.skipped.some((row) => row.reason === 'source_defined_requires_ai_review') ? (
        <div className="flex items-start gap-2 text-severity-medium">
          <span>
            <Trans>
              Source-defined rules are skipped from bulk accept. Generate and review their AI draft
              one by one.
            </Trans>
          </span>
        </div>
      ) : null}
      {preview.skipped.length > 0 ? (
        <div className="flex flex-col gap-1 text-severity-medium">
          <span className="font-medium">
            <Trans>Skipped</Trans>
          </span>
          <span>{preview.skipped.map((row) => skipReasonLabels[row.reason]).join(', ')}</span>
        </div>
      ) : null}
    </div>
  )
}

function PreviewList({
  label,
  rows,
}: {
  label: ReactNode
  rows: RuleBulkImpactPreview['jurisdictionCounts']
}) {
  return (
    <div className="flex flex-col gap-1 text-text-secondary">
      <span className="font-medium">{label}</span>
      <span>
        {rows
          .slice(0, 6)
          .map((row) => `${row.key} ${row.count}`)
          .join(' · ')}
      </span>
    </div>
  )
}

function BulkSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
      {children}
    </p>
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
  concreteDraft,
  mode,
  onClose,
  onSkip,
  onActionComplete,
  queuePosition,
}: {
  rule: ObligationRule
  concreteDraft: RuleConcreteDraftCacheEntry | null
  mode: RuleQueueMode
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
              mode === 'active' ? (
                <Trans>
                  Viewing {queuePosition.index + 1} of {queuePosition.total}
                </Trans>
              ) : (
                <Trans>
                  Reviewing {queuePosition.index + 1} of {queuePosition.total}
                </Trans>
              )
            ) : mode === 'active' ? (
              <Trans>Viewing rule</Trans>
            ) : (
              <Trans>Reviewing rule</Trans>
            )}
          </p>
          <div className="flex items-center gap-1">
            {onSkip ? (
              <button
                type="button"
                onClick={onSkip}
                aria-label={
                  mode === 'active'
                    ? t`Next active rule (j)`
                    : t`Skip — review next pending rule (j)`
                }
                title={mode === 'active' ? t`Next · j` : t`Skip · j`}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded px-2 text-xs font-medium text-text-secondary outline-none hover:bg-background-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                {mode === 'active' ? <Trans>Next</Trans> : <Trans>Skip</Trans>}
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
        {/* Visible hotkey hints — replaces the title-attribute-only
          hints that nobody discovered. Per docs/Design/ux-audit-2026-05-21.md
          P0 #7: the product has good hotkeys nobody knew about. */}
        <KbdHint
          className="mt-1"
          items={[
            ...(onSkip
              ? [
                  { keys: ['j'], label: t`next` },
                  { keys: ['k'], label: t`prev` },
                ]
              : []),
            { keys: ['esc'], label: t`exit` },
          ]}
        />
      </header>
      {/* keyed by rule.id so React mounts a fresh subtree per rule;
        the `animate-in fade-in` (Tailwind animate) plays a quick
        fade as the user advances through the queue. */}
      <div
        key={rule.id}
        className="flex-1 overflow-y-auto px-4 py-3 animate-in fade-in duration-150 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <RuleDetailCompact
          rule={rule}
          concreteDraft={concreteDraft}
          onActionComplete={onActionComplete}
        />
      </div>
    </>
  )
}

/**
 * Source count badge — a soft green circle with the count, matching
 * the reference design. Goes to a warning tone when this jurisdiction
 * still has source gaps.
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
 * alert triangle, and an em dash carry the same meaning with a small
 * fraction of the ink, and the `title` attribute keeps the spoken
 * label one hover away for first-time users.
 *
 *   - 'active' → green check
 *   - 'review' → orange alert triangle
 *   - 'none' (no rule) → muted em dash
 */
function coverageCellStateFromSourceState(
  sourceState: RuleSourceCoverageStatus,
  fallback: CoverageCellState,
): CoverageCellState | null {
  if (sourceState === 'rule_active') return 'active'
  if (sourceState === 'rule_pending_review') return 'review'
  if (sourceState === 'source_registered' || sourceState === 'source_verified') return null
  if (sourceState === 'missing_source') return null
  return fallback === 'none' ? null : fallback
}

function EntityCellContent({ state }: { state: RuleSourceCoverageStatus }) {
  if (state === 'rule_active') {
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
  if (state === 'rule_pending_review') {
    return (
      <span
        title="Pending review for this entity"
        className="inline-flex size-5 items-center justify-center"
      >
        <AlertTriangleIcon aria-hidden className="size-4 text-severity-medium" />
        <span className="sr-only">Review</span>
      </span>
    )
  }
  if (state === 'source_registered' || state === 'source_verified') {
    return (
      <span
        title="Official source registered; rule still needs review"
        className="inline-flex size-5 items-center justify-center"
      >
        <span
          aria-hidden
          className="inline-flex size-4 items-center justify-center rounded-full border border-text-muted text-[10px] font-semibold text-text-muted"
        >
          S
        </span>
        <span className="sr-only">Source only</span>
      </span>
    )
  }
  if (state === 'missing_source') {
    return (
      <span
        title="No official source registered"
        className="inline-flex size-5 items-center justify-center"
      >
        <XIcon aria-hidden className="size-4 text-text-muted" />
        <span className="sr-only">No source</span>
      </span>
    )
  }
  return (
    <span
      title="Not applicable"
      className="inline-flex size-5 items-center justify-center text-sm text-text-muted"
    >
      —<span className="sr-only">Not applicable</span>
    </span>
  )
}

function labelForSourceState(state: RuleSourceCoverageStatus): string {
  if (state === 'rule_active') return 'active'
  if (state === 'rule_pending_review') return 'review'
  if (state === 'source_registered' || state === 'source_verified') return 'source only'
  if (state === 'missing_source') return 'no source'
  return 'not applicable'
}
