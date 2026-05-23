import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from '@tanstack/react-table'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleIcon,
  ClipboardListIcon,
  Columns3Icon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileArchiveIcon,
  FileSearchIcon,
  InfoIcon,
  LinkIcon,
  RefreshCwIcon,
  SendIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
  type inferParserType,
} from 'nuqs'
import { toast } from 'sonner'

import {
  OBLIGATION_QUEUE_SEARCH_MAX_LENGTH,
  OBLIGATION_QUEUE_FILTER_MAX_SELECTIONS,
  ReadinessChecklistItemSchema,
  ObligationQueueDetailTabSchema,
  type MemberAssigneeOption,
  type ReadinessChecklistItem,
  type ObligationQueueDetailTab,
  type ObligationQueueDensity,
  type ObligationQueueFacetOption,
  type ObligationQueueListInput,
  type ObligationQueueRow,
  type ObligationQueueSort,
  type ObligationQueueExportFormat,
  type ObligationQueueExportSelectedInput,
  type AiInsightPublic,
  type AuditEventPublic,
  type ClientReadinessRequestPublic,
  type ClientReadinessResponsePublic,
  type ReadinessDocumentChecklistItemPublic,
} from '@duedatehq/contracts'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@duedatehq/ui/components/ui/popover'
import { Separator } from '@duedatehq/ui/components/ui/separator'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@duedatehq/ui/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

import {
  isInteractiveEventTarget,
  useAppHotkey,
  useKeyboardShortcutsBlocked,
} from '@/components/patterns/keyboard-shell'
import { useCurrentUserName } from '@/lib/use-current-user-name'
import {
  TableHeaderMultiFilter,
  tableHeaderFilterTrigger,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { EmptyState as SharedEmptyState } from '@/components/patterns/empty-state'
import { FloatingActionBar } from '@/components/patterns/floating-action-bar'
import { PageHeader } from '@/components/patterns/page-header'
import { IsoDatePicker, isValidIsoDate } from '@/components/primitives/iso-date-picker'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { useClientDrawer } from '@/features/clients/ClientDrawerProvider'
import { ClientPeekHoverCard } from '@/features/clients/ClientPeekHoverCard'
import { useEvidenceDrawer } from '@/features/evidence/EvidenceDrawerContext'
import {
  extensionDecisionEvidenceDescription,
  extensionDecisionEvidenceDetails,
  readExtensionDecisionEvidence,
} from '@/features/evidence/extension-decision-evidence'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { paidPlanActive } from '@/features/billing/model'
import { UpgradeCtaButton } from '@/features/billing/upgrade-cta-button'
import {
  ALL_STATUSES,
  LIFECYCLE_V2_STATUSES,
  ObligationQueueStatusControl,
  STATUS_DOT,
  STATUS_VARIANT,
  useLifecycleV2StatusLabels,
  useStatusLabels,
  type ObligationStatus,
} from '@/features/obligations/status-control'
import { BlockedByChip, isBlockedByVisible } from '@/features/obligations/blocked-by-chip'
import { isTabVisibleForType, tabsForObligationType } from '@/features/obligations/obligation-type'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import { isRejectionVisible, RejectionChip } from '@/features/obligations/rejection-chip'
import { useLifecycleV2 } from '@/features/obligations/use-lifecycle-v2'
import { ObligationPanelDispatcher } from '@/features/obligations/ObligationPanelDispatcher'
import { formatTaxCode } from '@/lib/tax-codes'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { initialsFromName } from '@/lib/auth'
import { queryInputUrlUpdateRateLimit, useDebouncedQueryInput } from '@/lib/query-rate-limit'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { cn, formatCents, formatDate, formatDateTimeWithTimezone } from '@/lib/utils'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string
    cellClassName?: string
  }
}
type ObligationQueueCursor = NonNullable<ObligationQueueListInput['cursor']> | null
type ObligationQueueListInputWithoutCursor = Omit<ObligationQueueListInput, 'cursor'>
type ObligationQueueExportQuery = Omit<ObligationQueueListInput, 'cursor' | 'limit'>
type ObligationExportDialogScope = 'selected' | 'filtered' | 'all_active' | 'date_range' | 'client'
type ObligationExportRecipient = 'download' | 'email_self' | 'email_teammate'

const ALL_SORTS = [
  'smart_priority',
  'due_asc',
  'due_desc',
  'updated_desc',
] as const satisfies readonly ObligationQueueSort[]
const OWNER_FILTERS = ['unassigned'] as const
const DUE_FILTERS = ['overdue'] as const
const EVIDENCE_FILTERS = ['needs'] as const
const DETAIL_DRAWERS = ['obligation'] as const
const DETAIL_TABS = ['readiness', 'extension', 'risk', 'evidence', 'audit'] as const
const DENSITY_OPTIONS = [
  'comfortable',
  'compact',
] as const satisfies readonly ObligationQueueDensity[]
const DEFAULT_SORT: ObligationQueueSort = 'smart_priority'
const DEFAULT_DENSITY: ObligationQueueDensity = 'comfortable'
const DEADLINE_TIP_REFRESH_POLL_INTERVAL_MS = 3_000
const DEADLINE_TIP_REFRESH_TIMEOUT_MS = 60_000
const EXTENSION_SAVE_SUCCESS_TOOLTIP_MS = 1_800
const EMPTY_OBLIGATION_QUEUE_ROWS: ObligationQueueRow[] = []
const EMPTY_ASSIGNEES: MemberAssigneeOption[] = []
const EMPTY_DOCUMENT_CHECKLIST: ReadinessDocumentChecklistItemPublic[] = []
const EMPTY_FACET_OPTIONS: FilterOption[] = []
const EMPTY_CLIENT_OPTIONS: ClientFilterOption[] = []
const INITIAL_CURSOR: ObligationQueueCursor = null
const PAGE_SIZE = 50
// Client-side pagination window over the cumulative useInfiniteQuery
// buffer. With server PAGE_SIZE = 50 and client CLIENT_PAGE_SIZE = 25,
// one server fetch fills two client pages, so paging Next never has
// to wait for an extra request until the user crosses the 50-row
// boundary.
const CLIENT_PAGE_SIZE = 25
const REPLACE_HISTORY_OPTIONS = { history: 'replace' } as const
const DAYS_FILTER_MIN = -3650
const DAYS_FILTER_MAX = 3650
const THIS_WEEK_MAX_DAYS = 7

export function isInternalExtensionTargetDateValid(value: string, filingDueDate: string): boolean {
  if (value === '') return true
  return isValidIsoDate(value) && isValidIsoDate(filingDueDate) && value <= filingDueDate
}

export function canSaveInternalExtensionPlan({
  draftTargetDate,
  filingDeadline,
  isPending = false,
  memo,
}: {
  draftTargetDate: string
  filingDeadline: string
  isPending?: boolean
  memo: string
}): boolean {
  return (
    !isPending &&
    draftTargetDate !== '' &&
    memo.trim().length > 0 &&
    isInternalExtensionTargetDateValid(draftTargetDate, filingDeadline)
  )
}

function formatFiscalYearEnd(month: number, day: number): string {
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`
}

function fiscalYearEndDraftValue(month: number | null, day: number | null): string {
  if (!month || !day) return ''
  return formatFiscalYearEnd(month, day)
}

function fiscalYearEndParts(value: string): { month: number; day: number } | null {
  const match = /^\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*$/.exec(value)
  if (!match) return null
  const month = Number(match[1])
  const day = Number(match[2])
  const date = new Date(Date.UTC(2024, month - 1, day))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return {
    month,
    day,
  }
}

const DAY_MS = 86_400_000
const OBLIGATION_QUEUE_TABLE_PILL_CLASSNAME = 'text-xs'
// Width of the Due column. Tokenized so the magic-number doesn't fight
// long client-name wraps if the table layout shifts.
const OBLIGATION_QUEUE_DUE_COL_WIDTH = 'min-w-[148px]'
const NON_HIDEABLE_COLUMNS = new Set(['select'])
// Columns that ship hidden by default and are opt-in via the
// Columns dropdown. The default visible set was trimmed to 6
// (2026-05-21) — Select · Client · Form · Status · Due · Owner —
// per design call: 12 columns is too much for skim-reading, and
// power users can opt into the rest from the Columns menu. Smart
// Priority is hidden by default but the queue still sorts by it
// (sort=smart_priority); enable it from the menu when you want
// the tier label rendered as a cell.
const DEFAULT_HIDDEN_COLUMN_IDS = [
  'smartPriority',
  'clientState',
  'clientCounty',
  'dueDateExact',
  'daysUntilDue',
  'evidenceCount',
] as const
// Columns that auto-collapse when the detail panel is open. With the
// panel at 520px on a 1280px page, the queue gets ~700px — only the
// five essentials fit: select / Priority / Client / Internal Due /
// Status. State / County / Tax type are redundant with the panel
// header. Assignee + Evidence are useful but not navigation-critical
// while the user is focused on one obligation in the panel.
const PANEL_OPEN_AUTO_HIDDEN_COLUMN_IDS = [
  'clientState',
  'clientCounty',
  'taxType',
  'assigneeName',
  'evidenceCount',
] as const
const OBLIGATION_QUEUE_ROW_CONTROL_SELECTOR =
  'button,a[href],input,label,select,textarea,[role="button"],[role="checkbox"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="option"],[role="radio"],[role="tab"],[data-slot="checkbox"]'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STATE_CODE_RE = /^[A-Z]{2}$/
const ReadinessChecklistItemsSchema = ReadinessChecklistItemSchema.array().min(1).max(30)

function isObligationQueueDetailTab(value: string): value is ObligationQueueDetailTab {
  return ObligationQueueDetailTabSchema.safeParse(value).success
}

function parseGeneratedReadinessChecklist(value: string | null): ReadinessChecklistItem[] | null {
  if (!value) return null
  try {
    const parsed = ReadinessChecklistItemsSchema.safeParse(JSON.parse(value))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

type DueDaysTone = {
  variant: 'destructive' | 'warning' | 'success' | 'outline'
  dot: 'error' | 'warning' | 'success' | 'normal'
  badgeClassName?: string
  dotClassName?: string
}

type FilterOption = TableFilterOption

interface ClientFilterOption extends FilterOption {
  state: string | null
  county: string | null
}

export const obligationQueueSearchParamsParsers = {
  q: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  status: parseAsArrayOf(parseAsStringLiteral(ALL_STATUSES))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  obligation: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
  client: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  // Rule deep-link from the Rule library: lands the user on the
  // queue filtered to the obligations generated by one or more
  // rules. No header filter UI for this (yet) — it's a one-way
  // pre-filter set by the inbound link.
  rule: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  state: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  county: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  taxType: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  assignee: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  assignees: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  owner: parseAsStringLiteral(OWNER_FILTERS).withOptions(REPLACE_HISTORY_OPTIONS),
  due: parseAsStringLiteral(DUE_FILTERS).withOptions(REPLACE_HISTORY_OPTIONS),
  dueWithin: parseAsInteger.withOptions(REPLACE_HISTORY_OPTIONS),
  evidence: parseAsStringLiteral(EVIDENCE_FILTERS).withOptions(REPLACE_HISTORY_OPTIONS),
  drawer: parseAsStringLiteral(DETAIL_DRAWERS).withOptions(REPLACE_HISTORY_OPTIONS),
  id: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
  tab: parseAsStringLiteral(DETAIL_TABS)
    .withDefault('readiness')
    .withOptions({ ...REPLACE_HISTORY_OPTIONS, clearOnDefault: false }),
  daysMin: parseAsInteger.withOptions(REPLACE_HISTORY_OPTIONS),
  daysMax: parseAsInteger.withOptions(REPLACE_HISTORY_OPTIONS),
  asOf: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
  sort: parseAsStringLiteral(ALL_SORTS)
    .withDefault(DEFAULT_SORT)
    .withOptions(REPLACE_HISTORY_OPTIONS),
  density: parseAsStringLiteral(DENSITY_OPTIONS)
    .withDefault(DEFAULT_DENSITY)
    .withOptions(REPLACE_HISTORY_OPTIONS),
  // Default-hidden columns are seeded into the `hide` param so they
  // stay off until the user opts them in via the Columns dropdown.
  // `clearOnDefault: false` keeps an empty hide=[] in the URL after
  // the user un-hides one, so a page reload doesn't snap back to the
  // default. (Without it, nuqs strips the param and the default kicks
  // back in.)
  hide: parseAsArrayOf(parseAsString)
    .withDefault([...DEFAULT_HIDDEN_COLUMN_IDS])
    .withOptions({ ...REPLACE_HISTORY_OPTIONS, clearOnDefault: false }),
  row: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
} as const

export type ObligationQueueSearchParams = inferParserType<typeof obligationQueueSearchParamsParsers>

export function isThisWeekFilterActive(daysMin: number | null, daysMax: number | null): boolean {
  return daysMin === null && daysMax === THIS_WEEK_MAX_DAYS
}

export function nextThisWeekFilterPatch(
  daysMin: number | null,
  daysMax: number | null,
): Partial<ObligationQueueSearchParams> {
  const isActive = isThisWeekFilterActive(daysMin, daysMax)
  return {
    dueWithin: null,
    due: null,
    daysMin: null,
    daysMax: isActive ? null : THIS_WEEK_MAX_DAYS,
    obligation: null,
    row: null,
  }
}

function isObligationStatus(value: string): value is ObligationStatus {
  return ALL_STATUSES.some((status) => status === value)
}

function getSortingState(sort: ObligationQueueSort): SortingState {
  if (sort === 'smart_priority') return [{ id: 'smartPriority', desc: true }]
  if (sort === 'due_desc') return [{ id: 'currentDueDate', desc: true }]
  if (sort === 'updated_desc') return [{ id: 'updatedAt', desc: true }]
  return [{ id: 'currentDueDate', desc: false }]
}

function withDefaultSortCleared(sort: ObligationQueueSort): ObligationQueueSort | null {
  return sort === DEFAULT_SORT ? null : sort
}

function nextHeaderSort({
  currentSort,
  ascSort,
  descSort,
  firstSort,
}: {
  currentSort: ObligationQueueSort
  ascSort: ObligationQueueSort
  descSort: ObligationQueueSort
  firstSort: ObligationQueueSort
}): ObligationQueueSort {
  if (currentSort !== ascSort && currentSort !== descSort) return firstSort
  if (currentSort === firstSort) return firstSort === ascSort ? descSort : ascSort
  return DEFAULT_SORT
}

function obligationQueueColumnAriaSort(columnId: string, sort: ObligationQueueSort) {
  if (columnId === 'currentDueDate') {
    if (sort === 'due_asc') return 'ascending'
    if (sort === 'due_desc') return 'descending'
    return 'none'
  }
  return undefined
}

function cleanStringFilters(values: readonly string[], maxLength = 120): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= maxLength),
    ),
  ].slice(0, OBLIGATION_QUEUE_FILTER_MAX_SELECTIONS)
}

function cleanEntityIdFilters(values: readonly string[]): string[] {
  return cleanStringFilters(values).filter((value) => UUID_RE.test(value))
}

function cleanStateFilters(values: readonly string[]): string[] {
  return cleanStringFilters(values)
    .map((value) => value.toUpperCase())
    .filter((value) => STATE_CODE_RE.test(value))
}

function cleanColumnIds(values: readonly string[]): string[] {
  return cleanStringFilters(values, 80).filter((value) => !NON_HIDEABLE_COLUMNS.has(value))
}

function columnVisibilityFromHidden(hidden: readonly string[]): VisibilityState {
  return Object.fromEntries(cleanColumnIds(hidden).map((columnId) => [columnId, false]))
}

function hiddenFromColumnVisibility(visibility: VisibilityState): string[] {
  return Object.entries(visibility)
    .filter(([columnId, isVisible]) => !isVisible && !NON_HIDEABLE_COLUMNS.has(columnId))
    .map(([columnId]) => columnId)
}

function integerFromInput(value: string, min?: number): number | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (!/^-?\d+$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (!Number.isSafeInteger(parsed)) return null
  return min === undefined ? parsed : Math.max(min, parsed)
}

function daysFilterValue(value: number | null): number | undefined {
  if (value === null || !Number.isSafeInteger(value)) return undefined
  return Math.min(DAYS_FILTER_MAX, Math.max(DAYS_FILTER_MIN, value))
}

function inputValueFromNumber(value: number | null): string {
  return value === null ? '' : String(value)
}

function columnLabel(columnId: string, labels: Record<string, string>): string {
  return labels[columnId] ?? columnId
}

export function isObligationQueueRowControlClick(
  target: EventTarget | null,
  rowElement: HTMLElement | null,
): boolean {
  if (!(target instanceof Element)) return false
  const closestControl = target.closest<HTMLElement>(OBLIGATION_QUEUE_ROW_CONTROL_SELECTOR)
  return closestControl !== null && closestControl !== rowElement
}

function scrollObligationRowIntoView(rowId: string | null): void {
  if (!rowId || typeof document === 'undefined') return
  window.requestAnimationFrame(() => {
    const escapedRowId =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(rowId)
        : rowId.replace(/["\\]/g, '\\$&')
    const node = document.querySelector<HTMLElement>(`[data-row-id="${escapedRowId}"]`)
    node?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function diffIsoDateDays(fromIso: string, toIso: string): number {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00.000Z`) - Date.parse(`${fromIso}T00:00:00.000Z`)) / DAY_MS,
  )
}

function exportQueryFromListInput(
  input: ObligationQueueListInputWithoutCursor,
): ObligationQueueExportQuery {
  const { limit: _limit, ...query } = input
  return query
}

function downloadBase64File(input: {
  fileName: string
  contentType: string
  contentBase64: string
}) {
  const binary = atob(input.contentBase64)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: input.contentType }))
  const link = document.createElement('a')
  link.href = url
  link.download = input.fileName
  link.click()
  URL.revokeObjectURL(url)
}

function facetOptionToFilterOption(option: ObligationQueueFacetOption): FilterOption {
  return {
    value: option.value,
    label: option.label,
    count: option.count,
  }
}

// Compute the next row-selection state when shift-clicking a checkbox.
// Selects every id in `orderedIds` between `anchorId` and `targetId` inclusive.
// If `anchorId` is missing or not in the list, falls back to a single-row toggle.
export function rangeSelectionUpdate({
  current,
  orderedIds,
  anchorId,
  targetId,
  nextChecked,
}: {
  current: RowSelectionState
  orderedIds: readonly string[]
  anchorId: string | null
  targetId: string
  nextChecked: boolean
}): RowSelectionState {
  const targetIndex = orderedIds.indexOf(targetId)
  if (targetIndex === -1) return current
  const anchorIndex = anchorId ? orderedIds.indexOf(anchorId) : -1
  if (anchorIndex === -1) {
    const next = { ...current }
    if (nextChecked) next[targetId] = true
    else delete next[targetId]
    return next
  }
  const [start, end] =
    anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex]
  const next = { ...current }
  for (let i = start; i <= end; i += 1) {
    const id = orderedIds[i]
    if (!id) continue
    if (nextChecked) next[id] = true
    else delete next[id]
  }
  return next
}

export function selectionHeaderState(
  selection: RowSelectionState,
  orderedIds: readonly string[],
): 'none' | 'all' | 'partial' {
  if (orderedIds.length === 0) return 'none'
  let selectedCount = 0
  for (const id of orderedIds) {
    if (selection[id]) selectedCount += 1
  }
  if (selectedCount === 0) return 'none'
  if (selectedCount === orderedIds.length) return 'all'
  return 'partial'
}

function dueDaysTone(days: number): DueDaysTone {
  // Calmer color ladder. The previous tone used a solid white-on-red
  // pill for *any* past-due row, which made every late filing scream
  // and stripped urgency hierarchy from the queue. We now stay in soft
  // tints and reserve the loudest red for rows that are both late AND
  // imminent — the warning amber band carries everything else past
  // due, and the future band stays neutral so the eye lands on
  // genuinely urgent rows.
  if (days < -7) return { variant: 'destructive', dot: 'error' }
  if (days < 0) return { variant: 'warning', dot: 'error' }
  if (days <= 2) return { variant: 'warning', dot: 'warning' }
  if (days <= 7) return { variant: 'outline', dot: 'warning' }
  return { variant: 'outline', dot: 'normal' }
}

export function ObligationQueueRoute() {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const { openWizard } = useMigrationWizard()
  const permission = useFirmPermission()
  const canRunMigration = permission.can('migration.run')
  const practiceAiEnabled = paidPlanActive(permission.firm)
  const { openEvidence } = useEvidenceDrawer()
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  // Current user's display name — used by the Owner column to label
  // "yours" via a tiny chip on the row. Per
  // docs/Design/ux-audit-2026-05-21.md P0 #3: triage of 47 rows is
  // impossible without "is this mine."
  const currentUserName = useCurrentUserName()
  // Hover-revealed peek affordance on the Client cell opens the
  // read-only client drawer in place — same pattern as `/clients`
  // row peek (see ClientFactsWorkspace.tsx). One click into the
  // client without leaving the queue or swapping the obligation
  // drawer's content.
  // The queue eye-icon's client peek now uses ClientPeekHoverCard
  // (hover-anchored PreviewCard). Click-to-open drawer behavior was
  // retired for this surface 2026-05-22 — useClientDrawer still
  // exists for other call sites (e.g. ClientFactsWorkspace).
  // Lifecycle v2 (?lifecycle=v2) swaps the status vocabulary on this
  // page: dropdown shows 6 target states instead of legacy 10, and
  // `review` re-labels to "In review". See
  // docs/Design/obligation-lifecycle-design-brief.md.
  const lifecycleV2 = useLifecycleV2()
  const legacyStatusLabels = useStatusLabels()
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const statusLabels = lifecycleV2 ? v2StatusLabels : legacyStatusLabels
  const statusDropdownOptions = lifecycleV2 ? LIFECYCLE_V2_STATUSES : ALL_STATUSES
  const [
    {
      q: searchInput,
      status: statusFilter,
      obligation,
      client: clientFilter,
      rule: ruleFilter,
      state: stateFilter,
      county: countyFilter,
      taxType: taxTypeFilter,
      assignee,
      assignees: assigneeFilter,
      owner,
      due,
      dueWithin,
      evidence,
      drawer,
      id: detailId,
      tab: detailTab,
      daysMin,
      daysMax,
      asOf,
      sort: urlSort,
      density,
      hide: hiddenColumns,
      row,
    },
    setObligationQueueQuery,
  ] = useQueryStates(obligationQueueSearchParamsParsers)
  // Slice D: when ?lifecycle=v2 is active AND the URL has no explicit
  // ?sort= param, default the queue to internal deadline ascending instead of
  // Smart Priority. Smart Priority remains in the sort dropdown — it's
  // just no longer the implicit ranking. Reinforces "Dashboard
  // curates, Obligations sorts" per the design brief.
  const sort: ObligationQueueSort = useMemo(() => {
    if (!lifecycleV2) return urlSort
    const hasExplicitSort =
      typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('sort')
    return hasExplicitSort ? urlSort : 'due_asc'
  }, [urlSort, lifecycleV2])
  const [penaltyRow, setPenaltyRow] = useState<ObligationQueueRow | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pageIndex, setPageIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  // Anchor for shift-click range selection — last id the user clicked.
  const lastSelectedIdRef = useRef<string | null>(null)
  const [openHeaderFilter, setOpenHeaderFilter] = useState<string | null>(null)
  const [extendedMemoOpen, setExtendedMemoOpen] = useState(false)
  const [extendedMemo, setExtendedMemo] = useState('')
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportScope, setExportScope] = useState<ObligationExportDialogScope>('filtered')
  const [exportFormat, setExportFormat] = useState<ObligationQueueExportFormat>('pdf_zip')
  const [exportRecipient, setExportRecipient] = useState<ObligationExportRecipient>('download')
  const [exportDateStart, setExportDateStart] = useState(todayIsoDate)
  const [exportDateEnd, setExportDateEnd] = useState(todayIsoDate)
  const [exportClientId, setExportClientId] = useState<string | null>(null)

  const debouncedSearch = useDebouncedQueryInput(searchInput, {
    maxLength: OBLIGATION_QUEUE_SEARCH_MAX_LENGTH,
  })
  const sorting = useMemo(() => getSortingState(sort), [sort])
  // When the user intends to open the detail panel (drawer=obligation
  // + an id in the URL), the table loses ~440px to make room. Auto-
  // collapse State / County / Tax type — they're already in the panel
  // header so the cell is redundant; freeing the column space lets
  // the remaining 7 columns fit the narrower viewport without
  // horizontal scroll. We react to URL intent (not `activeDetailId`)
  // so columns adjust the moment the user clicks, before the row
  // model resolves.
  const panelOpenIntent = drawer === 'obligation' && Boolean(detailId)
  const columnVisibility = useMemo(() => {
    const base = columnVisibilityFromHidden(hiddenColumns)
    if (panelOpenIntent) {
      for (const id of PANEL_OPEN_AUTO_HIDDEN_COLUMN_IDS) {
        base[id] = false
      }
    }
    return base
  }, [hiddenColumns, panelOpenIntent])
  const columnLabels = useMemo(
    () => ({
      clientName: t`Client`,
      smartPriority: t`Priority`,
      assigneeName: t`Assignee`,
      clientState: t`State`,
      clientCounty: t`County`,
      taxType: t`Tax type`,
      currentDueDate: t`Internal Due`,
      dueDateExact: t`Due date`,
      daysUntilDue: t`Days`,
      evidenceCount: t`Evidence`,
      status: t`Status`,
    }),
    [t],
  )
  const statusQuery = useMemo(() => [...statusFilter], [statusFilter])
  const obligationQuery = useMemo(
    () => cleanEntityIdFilters(obligation ? [obligation] : []),
    [obligation],
  )
  const clientQuery = useMemo(() => cleanEntityIdFilters(clientFilter), [clientFilter])
  const ruleQuery = useMemo(() => cleanEntityIdFilters(ruleFilter), [ruleFilter])
  const stateQuery = useMemo(() => cleanStateFilters(stateFilter), [stateFilter])
  const countyQuery = useMemo(() => cleanStringFilters(countyFilter), [countyFilter])
  const taxTypeQuery = useMemo(() => cleanStringFilters(taxTypeFilter), [taxTypeFilter])
  const assigneeNameQuery = useMemo(
    () => cleanStringFilters(assignee ? [assignee] : [])[0] ?? null,
    [assignee],
  )
  const assigneeQuery = useMemo(() => cleanStringFilters(assigneeFilter), [assigneeFilter])
  const minDaysUntilDue = useMemo(() => daysFilterValue(daysMin), [daysMin])
  const maxDaysUntilDue = useMemo(() => daysFilterValue(daysMax), [daysMax])

  const facetsQuery = useQuery(orpc.obligations.facets.queryOptions({ input: undefined }))
  const assignableMembersQuery = useQuery(
    orpc.members.listAssignable.queryOptions({ input: undefined }),
  )
  const assignableMembers = assignableMembersQuery.data ?? EMPTY_ASSIGNEES
  const clientOptions = useMemo<ClientFilterOption[]>(
    () =>
      facetsQuery.data?.clients.map((option) => ({
        value: option.value,
        label: option.label,
        count: option.count,
        state: option.state,
        county: option.county,
      })) ?? EMPTY_CLIENT_OPTIONS,
    [facetsQuery.data?.clients],
  )
  const stateOptions = useMemo<FilterOption[]>(
    () => facetsQuery.data?.states.map(facetOptionToFilterOption) ?? EMPTY_FACET_OPTIONS,
    [facetsQuery.data?.states],
  )
  const taxTypeOptions = useMemo<FilterOption[]>(
    () =>
      facetsQuery.data?.taxTypes.map((option) => ({
        value: option.value,
        label: formatTaxCode(option.value),
        count: option.count,
      })) ?? EMPTY_FACET_OPTIONS,
    [facetsQuery.data?.taxTypes],
  )
  // Status filter options — iterate `statusDropdownOptions` (6 under
  // v2, 10 under legacy) NOT `ALL_STATUSES`. With v2 labels collapsed,
  // iterating all 10 raw values produced duplicate filter entries
  // ("In review" x3 for in_progress/review/extended, "Filed" x2 for
  // done/paid, "Not started" x2 for pending/not_applicable).
  const statusOptions = useMemo<FilterOption[]>(
    () =>
      statusDropdownOptions.map((status) => ({
        value: status,
        label: statusLabels[status],
      })),
    [statusDropdownOptions, statusLabels],
  )
  const filtersDisabled = facetsQuery.isLoading

  const queryInputWithoutCursor = useMemo<ObligationQueueListInputWithoutCursor>(
    () => ({
      ...(statusQuery.length > 0 ? { status: statusQuery } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(obligationQuery.length > 0 ? { obligationIds: obligationQuery } : {}),
      ...(clientQuery.length > 0 ? { clientIds: clientQuery } : {}),
      ...(ruleQuery.length > 0 ? { ruleIds: ruleQuery } : {}),
      ...(stateQuery.length > 0 ? { states: stateQuery } : {}),
      ...(countyQuery.length > 0 ? { counties: countyQuery } : {}),
      ...(taxTypeQuery.length > 0 ? { taxTypes: taxTypeQuery } : {}),
      ...(assigneeNameQuery ? { assigneeName: assigneeNameQuery } : {}),
      ...(assigneeQuery.length > 0 ? { assigneeNames: assigneeQuery } : {}),
      ...(owner ? { owner } : {}),
      ...(due ? { due } : {}),
      ...(dueWithin && dueWithin > 0 && dueWithin <= 30 ? { dueWithinDays: dueWithin } : {}),
      ...(minDaysUntilDue !== undefined ? { minDaysUntilDue } : {}),
      ...(maxDaysUntilDue !== undefined ? { maxDaysUntilDue } : {}),
      ...(evidence === 'needs' ? { needsEvidence: true } : {}),
      ...(asOf ? { asOfDate: asOf } : {}),
      sort,
      limit: PAGE_SIZE,
    }),
    [
      statusQuery,
      debouncedSearch,
      obligationQuery,
      clientQuery,
      ruleQuery,
      stateQuery,
      countyQuery,
      taxTypeQuery,
      assigneeNameQuery,
      assigneeQuery,
      owner,
      due,
      dueWithin,
      minDaysUntilDue,
      maxDaysUntilDue,
      evidence,
      asOf,
      sort,
    ],
  )
  const listQuery = useInfiniteQuery(
    orpc.obligations.list.infiniteOptions({
      initialPageParam: INITIAL_CURSOR,
      input: (cursor) => ({
        ...queryInputWithoutCursor,
        cursor,
      }),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
  )

  const updateStatusMutation = useMutation(
    orpc.obligations.updateStatus.mutationOptions({
      onSuccess: () => {
        // Cache invalidation only — the per-call onSuccess (wired in
        // `updateStatus` below) owns the toast so it can attach the
        // contextual Undo action with the previous status closed over.
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDeadlineTip.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
      },
      onError: (err) => {
        toast.error(t`Couldn't update status`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const bulkStatusMutation = useMutation(
    orpc.obligations.bulkUpdateStatus.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        setRowSelection({})
        toast.success(t`Bulk status updated`, {
          description: t`${result.updatedCount} rows changed`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't update selected rows`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const bulkAssigneeMutation = useMutation(
    orpc.clients.bulkUpdateAssignee.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.workload.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        setRowSelection({})
        toast.success(t`Owners updated`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't update owners`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const exportMutation = useMutation(
    orpc.obligations.exportSelected.mutationOptions({
      onSuccess: (result) => {
        downloadBase64File(result)
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        toast.success(t`Export ready`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't export selected rows`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const rows = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.rows) ?? EMPTY_OBLIGATION_QUEUE_ROWS,
    [listQuery.data?.pages],
  )
  const isInitialLoading = listQuery.isLoading
  const isError = listQuery.isError
  const keyboardEnabled = rows.length > 0 && !shortcutsBlocked

  // Pure adjacency-based grouping (NO reordering): when the active
  // sort naturally places a client's obligations next to each other,
  // collapse the Client cell on the continuation rows and weld the
  // group with a borderless run. When the sort scatters them across
  // the table, each row stands alone with its full Client name — the
  // grouping doesn't force itself, it only surfaces what's already
  // adjacent. Matches the 2026-05-21 wireframe: Bright Studio's two
  // back-to-back +30d-late rows group; Northstar's 3 rows at +45d /
  // +15d / +7d each stand alone with their own client name.
  const continuationRowIds = useMemo(() => {
    const set = new Set<string>()
    for (let i = 1; i < rows.length; i++) {
      if (rows[i]!.clientId === rows[i - 1]!.clientId) set.add(rows[i]!.id)
    }
    return set
  }, [rows])
  // "Within-group" = this row is NOT the last in its client group, i.e.
  // the NEXT row is a continuation (same client). Within-group rows
  // drop their bottom border so the group reads as a single visual
  // block. Group boundaries keep the border so the eye can find them.
  const withinGroupRowIds = useMemo(() => {
    const set = new Set<string>()
    for (let i = 0; i < rows.length - 1; i++) {
      if (continuationRowIds.has(rows[i + 1]!.id)) set.add(rows[i]!.id)
    }
    return set
  }, [rows, continuationRowIds])
  const rowsById = useMemo(
    () => new Map(rows.map((obligationQueueRow) => [obligationQueueRow.id, obligationQueueRow])),
    [rows],
  )
  const activeRow = (row ? rowsById.get(row) : null) ?? rows[0] ?? null
  // Separate "the user explicitly selected this row" (drives the
  // background highlight + aria-selected) from "the keyboard cursor
  // sits here" (drives J/K, Enter, hotkeys, falls back to rows[0]).
  // Pre-2026-05-21 the two were one variable, so the first row was
  // always tinted even with no panel open — which made the queue
  // look like row 1 was permanently focused. Now the highlight
  // only appears when `row` is set in the URL.
  const explicitActiveRowId = row && rowsById.has(row) ? row : null
  const activeDetailId =
    drawer === 'obligation' && detailId && rowsById.has(detailId) ? detailId : null
  const onRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      const nextSelection = functionalUpdate(updater, rowSelection)
      setRowSelection(nextSelection)
    },
    [rowSelection],
  )
  const setHeaderFilterOpen = useCallback((filterId: string, nextOpen: boolean) => {
    setOpenHeaderFilter((current) => (nextOpen ? filterId : current === filterId ? null : current))
  }, [])

  const updateStatus = useCallback(
    (input: { id: string; status: ObligationStatus }, previousStatus: ObligationStatus) => {
      // Per-call onSuccess closes over `previousStatus` so the toast
      // can offer Undo. Wiring this here (instead of in
      // `mutationOptions.onSuccess`) is what lets the Undo action exist
      // — the base callback doesn't have access to the prior state.
      // See docs/Design/ux-audit-2026-05-21.md P1: destructive moves
      // need a safety net.
      updateStatusMutation.mutate(input, {
        onSuccess: (result) => {
          const canUndo = previousStatus !== input.status
          toast.success(t`Status updated`, {
            description: t`Audit ${result.auditId.slice(0, 8)}`,
            ...(canUndo
              ? {
                  action: {
                    label: t`Undo`,
                    onClick: () => {
                      updateStatusMutation.mutate({ id: input.id, status: previousStatus })
                    },
                  },
                }
              : {}),
          })
        },
      })
    },
    [updateStatusMutation, t],
  )
  const statusUpdatePending = updateStatusMutation.isPending || bulkStatusMutation.isPending
  const changeSort = useCallback(
    (nextSort: ObligationQueueSort) => {
      void setObligationQueueQuery({
        sort: withDefaultSortCleared(nextSort),
        obligation: null,
        row: null,
      })
    },
    [setObligationQueueQuery],
  )

  const columns = useMemo<ColumnDef<ObligationQueueRow>[]>(
    () => [
      {
        id: 'select',
        enableHiding: false,
        header: ({ table }) => {
          const allSelected = table.getIsAllPageRowsSelected()
          const someSelected = table.getIsSomePageRowsSelected()
          return (
            <Checkbox
              aria-label={t`Select all visible rows`}
              checked={allSelected}
              indeterminate={!allSelected && someSelected}
              onCheckedChange={(checked) => {
                table.toggleAllPageRowsSelected(checked)
                lastSelectedIdRef.current = null
              }}
            />
          )
        },
        cell: ({ row: tableRow, table }) => (
          <Checkbox
            aria-label={t`Select ${tableRow.original.clientName}`}
            checked={tableRow.getIsSelected()}
            onClick={(event) => {
              event.stopPropagation()
              if (event.shiftKey && lastSelectedIdRef.current) {
                event.preventDefault()
                const nextChecked = !tableRow.getIsSelected()
                const orderedIds = table.getRowModel().rows.map((r) => r.original.id)
                table.setRowSelection((current) =>
                  rangeSelectionUpdate({
                    current,
                    orderedIds,
                    anchorId: lastSelectedIdRef.current,
                    targetId: tableRow.original.id,
                    nextChecked,
                  }),
                )
                lastSelectedIdRef.current = tableRow.original.id
              }
            }}
            onCheckedChange={(checked) => {
              tableRow.toggleSelected(checked)
              lastSelectedIdRef.current = tableRow.original.id
            }}
          />
        ),
        meta: { headerClassName: 'w-10', cellClassName: 'w-10' },
      },
      {
        accessorKey: 'clientName',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Client`}
            open={openHeaderFilter === 'client'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('client', nextOpen)}
            options={clientOptions}
            selected={clientQuery}
            disabled={filtersDisabled}
            emptyLabel={t`No clients`}
            searchable
            searchPlaceholder={t`Search clients`}
            onSelectedChange={(nextClient) =>
              void setObligationQueueQuery({
                client: nextClient.length > 0 ? nextClient : null,
                obligation: null,
                row: null,
              })
            }
          />
        ),
        cell: ({ row: tableRow, table }) => {
          const isContinuation = continuationRowIds.has(tableRow.original.id)
          if (isContinuation) {
            // Same-client continuation: leave the cell blank. The
            // client name reads as a sticky label visually owning the
            // rows beneath it — the empty cell *is* the grouping cue
            // (cleaner than a ┗ connector, per 2026-05-21 wireframe).
            // The `sr-only` span keeps row-level screen-reader context.
            return <span className="sr-only">{tableRow.original.clientName}</span>
          }
          // Shift+click the client name → range-select every row
          // sharing this clientId (2026-05-21). Matches the hybrid
          // multi-select model: filings-default, with a group-expand
          // keystroke for the one workflow (reassignment) that
          // naturally lives at the client level. Unshifted clicks
          // pass through to the row handler that opens the drawer.
          const handleClientNameClick = (event: React.MouseEvent<HTMLSpanElement>) => {
            if (!event.shiftKey) return
            event.preventDefault()
            event.stopPropagation()
            const targetClientId = tableRow.original.clientId
            const allRows = table.getRowModel().rows
            const groupIds = allRows
              .filter((candidate) => candidate.original.clientId === targetClientId)
              .map((candidate) => candidate.original.id)
            if (groupIds.length === 0) return
            const allSelected = groupIds.every(
              (id) =>
                allRows.find((candidate) => candidate.original.id === id)?.getIsSelected() ?? false,
            )
            const nextChecked = !allSelected
            table.setRowSelection((current) => {
              const next = { ...current }
              for (const id of groupIds) {
                if (nextChecked) next[id] = true
                else delete next[id]
              }
              return next
            })
            lastSelectedIdRef.current = tableRow.original.id
          }
          // No `role="button"` here on purpose: unshifted clicks need
          // to bubble to the row handler so the drawer opens.
          // Marking the span as a button would make
          // `isObligationQueueRowControlClick` treat it as a control
          // and the row would only focus, not open.
          return (
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                onClick={handleClientNameClick}
                onMouseDown={(event) => {
                  // Prevent text-selection drag from interfering with
                  // the shift-click range gesture.
                  if (event.shiftKey) event.preventDefault()
                }}
                className="line-clamp-2 min-w-0 flex-1 text-xs font-medium text-text-primary"
                title={t`${tableRow.original.clientName} · Shift+click to select all of this client's rows`}
              >
                {tableRow.original.clientName}
              </span>
              {/* Peek the client info in place. The eye icon is the
                  hover/focus trigger for a small popover (ClientPeek
                  HoverCard) — no click required to see identity. The
                  popover has its own "Open full page" / "All
                  obligations" navigation buttons.

                  `stopPropagation` on click prevents the row's
                  obligation-drawer onClick from firing if the user
                  does click the eye. Visible on row hover, also on
                  keyboard focus for accessibility. */}
              <ClientPeekHoverCard clientId={tableRow.original.clientId}>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={t`Peek ${tableRow.original.clientName} details`}
                  title={t`Peek client details`}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-text-tertiary opacity-0 outline-none transition-opacity group-hover:opacity-100 hover:bg-state-base-hover hover:text-text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                >
                  <EyeIcon className="size-3.5" aria-hidden />
                </button>
              </ClientPeekHoverCard>
            </div>
          )
        },
        meta: { cellClassName: 'min-w-[200px] max-w-[280px]' },
      },
      {
        // Smart Priority — second data column (right after Client) per
        // 2026-05-21 design call. Client is the primary anchor; Priority
        // answers "why am I looking at this row" right next to the
        // name. Default sort is smart_priority desc, so this column
        // doubles as the implicit sort key.
        accessorKey: 'smartPriority',
        id: 'smartPriority',
        header: () => (
          <button
            type="button"
            aria-label={t`Sort by Smart Priority`}
            aria-pressed={sort === 'smart_priority'}
            onClick={() => changeSort('smart_priority')}
            className={cn(
              'inline-flex items-center gap-1 text-left transition-colors hover:text-text-primary',
              sort === 'smart_priority' ? 'text-text-accent' : 'text-text-tertiary',
            )}
          >
            <span>{t`Priority`}</span>
            <ArrowDownIcon className="size-3.5" aria-hidden />
          </button>
        ),
        cell: ({ row: tableRow }) => {
          const score = tableRow.original.smartPriority.score
          const rank = tableRow.original.smartPriority.rank
          // 4-tier ladder, optical-weight only (no color — reserved
          // for the Status pill):
          //   ≥70  → "Urgent"  — drop everything
          //   50-69 → "High"   — today's batch
          //   25-49 → "Med"    — this week
          //   <25  → "Low"    — when time permits
          const tierLabel =
            score >= 70 ? t`Urgent` : score >= 50 ? t`High` : score >= 25 ? t`Med` : t`Low`
          const tierClassName =
            score >= 70
              ? 'text-text-primary font-semibold'
              : score >= 50
                ? 'text-text-primary font-medium'
                : score >= 25
                  ? 'text-text-secondary'
                  : 'text-text-tertiary'
          return (
            <div
              className="flex items-baseline gap-1.5"
              title={
                rank
                  ? t`Smart Priority ${score.toFixed(1)} · rank #${rank}`
                  : t`Smart Priority ${score.toFixed(1)}`
              }
            >
              <span className={cn('text-xs leading-tight', tierClassName)}>{tierLabel}</span>
              {rank ? (
                <span className="text-[10px] tabular-nums leading-tight text-text-tertiary">
                  #{rank}
                </span>
              ) : null}
            </div>
          )
        },
        meta: { cellClassName: 'w-[90px]' },
      },
      {
        // Owner column — surfaces who's on the hook for this row. Per
        // docs/Design/ux-audit-2026-05-21.md P0 #3: triage of 47
        // assigned rows is impossible without "is this mine?" The
        // existing assignee facet filter helps once you know to
        // filter; this column answers the question at-a-glance with
        // no filter step.
        accessorKey: 'assigneeName',
        id: 'assigneeName',
        header: () => <span>{t`Assignee`}</span>,
        cell: ({ row: tableRow }) => {
          const assigneeName = tableRow.original.assigneeName
          if (!assigneeName) {
            // Unassigned = dashed-outline empty avatar, no text.
            // Reads as "slot exists but nobody's filled it."
            return (
              <span
                aria-label={t`Unassigned`}
                title={t`Unassigned`}
                className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-divider-regular text-[10px] text-text-tertiary"
              >
                ?
              </span>
            )
          }
          const isMine =
            currentUserName !== null &&
            assigneeName.trim().toLowerCase() === currentUserName.toLowerCase()
          return (
            <AssigneeAvatar
              name={assigneeName}
              isMine={isMine}
              title={isMine ? t`Assigned to you (${assigneeName})` : assigneeName}
            />
          )
        },
        meta: { cellClassName: 'w-[44px]' },
      },
      {
        accessorKey: 'clientState',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`State`}
            open={openHeaderFilter === 'state'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('state', nextOpen)}
            options={stateOptions}
            selected={stateQuery}
            disabled={filtersDisabled}
            emptyLabel={t`No states`}
            onSelectedChange={(nextState) =>
              void setObligationQueueQuery({
                state: nextState.length > 0 ? nextState : null,
                county: null,
                obligation: null,
                row: null,
              })
            }
          />
        ),
        cell: (info) => info.getValue<string | null>() ?? '—',
        meta: { cellClassName: 'text-text-secondary tabular-nums' },
      },
      {
        accessorKey: 'taxType',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Tax type`}
            open={openHeaderFilter === 'taxType'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('taxType', nextOpen)}
            options={taxTypeOptions}
            selected={taxTypeQuery}
            disabled={filtersDisabled}
            emptyLabel={t`No forms`}
            onSelectedChange={(nextTaxType) =>
              void setObligationQueueQuery({
                taxType: nextTaxType.length > 0 ? nextTaxType : null,
                obligation: null,
                row: null,
              })
            }
          />
        ),
        cell: (info) => <TaxCodeLabel code={info.getValue<string>()} />,
        meta: { cellClassName: 'text-text-secondary' },
      },
      {
        accessorKey: 'currentDueDate',
        header: () => {
          const label = t`Internal Due`
          return (
            <ObligationQueueSortableHeader
              sort={sort}
              ascSort="due_asc"
              descSort="due_desc"
              firstSort="due_asc"
              sortLabel={`${t`Sort`} ${label}`}
              onSortChange={changeSort}
            >
              <RangeHeaderFilterDropdown
                label={label}
                minLabel={t`Minimum days until due`}
                maxLabel={t`Maximum days until due`}
                minPlaceholder={t`Min days`}
                maxPlaceholder={t`Max days`}
                minValue={daysMin}
                maxValue={daysMax}
                inputMode="numeric"
                min={DAYS_FILTER_MIN}
                max={DAYS_FILTER_MAX}
                onCommit={(nextMin, nextMax) =>
                  void setObligationQueueQuery({
                    daysMin: integerFromInput(nextMin),
                    daysMax: integerFromInput(nextMax),
                    obligation: null,
                    row: null,
                  })
                }
              />
            </ObligationQueueSortableHeader>
          )
        },
        // Relative-time pill only ("3d late" / "in 5d"). Per
        // 2026-05-21 design call the exact date moved to its own
        // hide-by-default column ('dueDateExact' below) — most
        // triage decisions only need the relative urgency, and the
        // date row is signal-to-noise tax.
        cell: ({ row: tableRow }) => <DueDaysPill days={tableRow.original.daysUntilDue} />,
        meta: { cellClassName: `tabular-nums ${OBLIGATION_QUEUE_DUE_COL_WIDTH}` },
      },
      {
        // "Due date (exact)" — addable column for people who do need
        // to read the date. Hidden by default via DEFAULT_HIDDEN_COLUMN_IDS.
        // When the statutory deadline diverges from the internal one,
        // surface both inline so the audit anchor stays discoverable.
        accessorKey: 'currentDueDate',
        id: 'dueDateExact',
        header: () => <span>{t`Due date`}</span>,
        cell: ({ row: tableRow }) => {
          const internal = tableRow.original.currentDueDate
          const statutory = tableRow.original.baseDueDate
          const divergent = statutory && statutory !== internal
          return (
            <span className="text-xs tabular-nums text-text-secondary">
              {formatDate(internal)}
              {divergent ? (
                <>
                  <span className="mx-1 text-text-quaternary">·</span>
                  <span className="text-text-quaternary" title={t`Statutory deadline`}>
                    {formatDate(statutory)}
                  </span>
                </>
              ) : null}
            </span>
          )
        },
        meta: { cellClassName: `tabular-nums ${OBLIGATION_QUEUE_DUE_COL_WIDTH}` },
      },
      // "Projected risk" column removed 2026-05-21 per UX call —
      // the dollar exposure number lives inside the obligation drawer
      // and is summarised at the firm level on the dashboard. Surfacing
      // a per-row $ in the queue was over-quantifying triage decisions
      // that are really driven by status + due date. Penalty inputs
      // and risk filtering still ship via the chip row above.
      {
        accessorKey: 'evidenceCount',
        header: () => <ConceptLabel concept="evidence">{t`Evidence`}</ConceptLabel>,
        // Source-count badge + descriptive text, style-matched to the
        // Rule library's SOURCE column. Soft-green circle when sources
        // exist; muted gray circle when count is zero. Keeps the click
        // affordance (opens evidence drawer) but loses the heavy
        // ghost-button chrome — the dev-defining visual is the badge,
        // not a button.
        cell: ({ row: tableRow }) => {
          const count = tableRow.original.evidenceCount
          const hasEvidence = count > 0
          return (
            <button
              type="button"
              aria-label={
                hasEvidence
                  ? t`Open ${count} evidence sources for ${tableRow.original.clientName}`
                  : t`Add evidence for ${tableRow.original.clientName}`
              }
              onClick={(event) => {
                event.stopPropagation()
                openEvidence({
                  obligationId: tableRow.original.id,
                  label: `${tableRow.original.clientName} - ${formatTaxCode(tableRow.original.taxType)}`,
                })
              }}
              className="inline-flex items-center rounded-sm outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              {hasEvidence ? (
                // Has evidence → green count badge only (the number
                // is the whole signal). No "N sources" duplicate text.
                <span
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-status-done/15 text-xs font-semibold tabular-nums text-status-done"
                  title={t`${count} sources attached`}
                >
                  {count}
                </span>
              ) : (
                // No evidence → just the text "Needs evidence" — a
                // zero-count circle would read as "we have something"
                // when we actually have nothing.
                <span className="text-xs text-text-tertiary">
                  <Trans>Needs evidence</Trans>
                </span>
              )}
            </button>
          )
        },
      },
      {
        accessorKey: 'status',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Status`}
            open={openHeaderFilter === 'status'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('status', nextOpen)}
            options={statusOptions}
            selected={statusQuery}
            emptyLabel={t`All statuses`}
            onSelectedChange={(nextStatus) => {
              const typedStatus = nextStatus.filter(isObligationStatus)
              void setObligationQueueQuery({
                status: typedStatus.length > 0 ? typedStatus : null,
                obligation: null,
                row: null,
              })
            }}
          />
        ),
        cell: ({ row: tableRow }) => {
          const obligationQueueRow = tableRow.original
          const showRejection = isRejectionVisible({
            status: obligationQueueRow.status,
            efileRejectedAt: obligationQueueRow.efileRejectedAt,
          })
          const showBlockedBy = isBlockedByVisible({
            status: obligationQueueRow.status,
            blockedByObligationInstanceId: obligationQueueRow.blockedByObligationInstanceId,
          })
          return (
            <div className="flex items-center gap-1.5">
              <ObligationQueueStatusControl
                row={obligationQueueRow}
                labels={statusLabels}
                statuses={statusDropdownOptions}
                disabled={statusUpdatePending}
                onChange={(id, status) => updateStatus({ id, status }, obligationQueueRow.status)}
              />
              {showBlockedBy && obligationQueueRow.blockedByObligationInstanceId ? (
                <BlockedByChip
                  parentObligationId={obligationQueueRow.blockedByObligationInstanceId}
                  parentLabel={(() => {
                    const parent = rowsById.get(obligationQueueRow.blockedByObligationInstanceId)
                    if (!parent) return null
                    return `${parent.clientName} · ${formatTaxCode(parent.taxType)}`
                  })()}
                  onOpen={(parentId) =>
                    void setObligationQueueQuery({
                      obligation: parentId,
                      row: null,
                    })
                  }
                  compact={panelOpenIntent}
                />
              ) : null}
              {showRejection ? <RejectionChip compact={panelOpenIntent} /> : null}
            </div>
          )
        },
      },
    ],
    [
      changeSort,
      clientOptions,
      clientQuery,
      continuationRowIds,
      currentUserName,
      daysMax,
      daysMin,
      filtersDisabled,
      openHeaderFilter,
      openEvidence,
      panelOpenIntent,
      rowsById,
      setHeaderFilterOpen,
      setObligationQueueQuery,
      sort,
      stateOptions,
      stateQuery,
      statusDropdownOptions,
      statusLabels,
      statusOptions,
      statusQuery,
      statusUpdatePending,
      t,
      taxTypeOptions,
      taxTypeQuery,
      updateStatus,
    ],
  )

  // Client-side pagination window. `rows` is the cumulative buffer
  // from useInfiniteQuery; we slice it into CLIENT_PAGE_SIZE pages
  // and only hand the active page to TanStack. Going to the next
  // page beyond the loaded buffer triggers `fetchNextPage`.
  const totalLoadedPages = Math.max(1, Math.ceil(rows.length / CLIENT_PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, totalLoadedPages - 1)
  const pagedRows = useMemo(
    () => rows.slice(safePageIndex * CLIENT_PAGE_SIZE, (safePageIndex + 1) * CLIENT_PAGE_SIZE),
    [rows, safePageIndex],
  )
  const table = useReactTable({
    data: pagedRows,
    columns,
    state: {
      columnVisibility,
      rowSelection,
      sorting,
    },
    enableMultiRowSelection: true,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (obligationQueueRow) => obligationQueueRow.id,
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    onColumnVisibilityChange: (updater) => {
      const nextVisibility = functionalUpdate(updater, columnVisibility)
      let nextHidden = hiddenFromColumnVisibility(nextVisibility)
      if (panelOpenIntent) {
        // Strip the panel-driven auto-hidden columns from the saved
        // set. Their `false` visibility is a side-effect of the panel
        // being open, not a user preference — persisting it would
        // mean closing the panel doesn't restore them.
        const autoHidden = new Set<string>(PANEL_OPEN_AUTO_HIDDEN_COLUMN_IDS)
        nextHidden = nextHidden.filter((id) => !autoHidden.has(id))
      }
      void setObligationQueueQuery({ hide: nextHidden.length > 0 ? nextHidden : null })
    },
    onRowSelectionChange,
  })

  const tableRows = table.getRowModel().rows
  const totalShown = tableRows.length
  const visibleColumnCount = table.getVisibleLeafColumns().length
  const selectedRows = table.getSelectedRowModel().rows.map((selectedRow) => selectedRow.original)
  const selectedIds = selectedRows.map((selectedRow) => selectedRow.id)
  const selectedClientIds = [...new Set(selectedRows.map((selectedRow) => selectedRow.clientId))]
  const thisWeekFilterActive = isThisWeekFilterActive(daysMin, daysMax)
  // Stripe-style scope tabs across the top of the queue. Each tab maps
  // to a single lifecycle v2 status. Counts come from the facets RPC's
  // `statuses` field (a status-aware GROUP BY across the firm's
  // obligations) when the server supplies it; in the gap before a
  // wrangler restart picks up the contract addition, fall back to
  // counting currently-loaded rows so the UI stays meaningful.
  // Picking a tab sets `status=[that one]`; clicking "All" clears it.
  const statusFacetCounts = useMemo(() => {
    const map = new Map<ObligationStatus, number>()
    const fromServer = facetsQuery.data?.statuses
    if (fromServer && fromServer.length > 0) {
      for (const facet of fromServer) {
        if (isObligationStatus(facet.value)) map.set(facet.value, facet.count)
      }
      return map
    }
    for (const r of rows) {
      map.set(r.status, (map.get(r.status) ?? 0) + 1)
    }
    return map
  }, [facetsQuery.data?.statuses, rows])
  const scopeTotal = useMemo(
    () => Array.from(statusFacetCounts.values()).reduce((sum, n) => sum + n, 0),
    [statusFacetCounts],
  )
  const scopeStatuses = lifecycleV2 ? LIFECYCLE_V2_STATUSES : ALL_STATUSES
  const activeScope: ObligationStatus | 'all' =
    statusQuery.length === 1 && isObligationStatus(statusQuery[0]!) ? statusQuery[0] : 'all'
  // Auto-hide zero-count scopes. Keeps the bar honest about what the
  // user can actually triage — and respects the cognitive-load cap
  // when the firm has nothing in `Blocked` or `Completed`. The active
  // scope is always shown even if its count is zero (otherwise the
  // selected tab vanishes and the UI looks broken).
  const visibleScopeStatuses = useMemo(
    () =>
      scopeStatuses.filter(
        (status) => (statusFacetCounts.get(status) ?? 0) > 0 || status === activeScope,
      ),
    [scopeStatuses, statusFacetCounts, activeScope],
  )
  // Note: the applied-filter chip row (hanxujiang's 30f29dc) was
  // intentionally dropped during the design call — column-header
  // filters are the only filter UI surface now. See dev-log
  // 2026-05-22-preview-integration-merge.md.
  const hideableColumns = useMemo(
    () => table.getAllLeafColumns().filter((column) => column.getCanHide()),
    [table],
  )
  const totalHideableCount = hideableColumns.length
  const visibleHideableCount = hideableColumns.filter((column) => column.getIsVisible()).length
  const hiddenColumnsCount = totalHideableCount - visibleHideableCount
  const currentExportQuery = useMemo(
    () => exportQueryFromListInput(queryInputWithoutCursor),
    [queryInputWithoutCursor],
  )

  const moveActiveRow = useCallback(
    (direction: 1 | -1) => {
      const currentRows = table.getRowModel().rows
      if (currentRows.length === 0) return
      const currentIndex = currentRows.findIndex(
        (tableRow) => tableRow.original.id === activeRow?.id,
      )
      const nextIndex =
        currentIndex === -1
          ? 0
          : Math.min(currentRows.length - 1, Math.max(0, currentIndex + direction))
      const nextRowId = currentRows[nextIndex]?.original.id ?? null
      void setObligationQueueQuery({ row: nextRowId })
      scrollObligationRowIntoView(nextRowId)
    },
    [activeRow?.id, setObligationQueueQuery, table],
  )

  const updateActiveRowStatus = useCallback(
    (status: ObligationStatus, target?: EventTarget | null) => {
      if (
        isInteractiveEventTarget(target ?? null) ||
        !activeRow ||
        activeRow.status === status ||
        statusUpdatePending
      ) {
        return
      }
      updateStatus({ id: activeRow.id, status }, activeRow.status)
    },
    [activeRow, statusUpdatePending, updateStatus],
  )

  // `/` focuses search — Linear/Slack convention. The kbd hint in the
  // input's right gutter advertises it; this wires the actual binding.
  useAppHotkey(
    '/',
    () => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    },
    {
      enabled: !shortcutsBlocked,
      requireReset: true,
      meta: {
        id: 'obligations.focus-search',
        name: 'Focus search',
        description: 'Focus the Obligations search input.',
        category: 'obligations',
        scope: 'route',
      },
    },
  )

  useAppHotkey('J', () => moveActiveRow(1), {
    enabled: keyboardEnabled,
    requireReset: true,
    meta: {
      id: 'obligations.next-row',
      name: 'Next row',
      description: 'Move the active Obligations row down.',
      category: 'obligations',
      scope: 'route',
    },
  })

  useAppHotkey('K', () => moveActiveRow(-1), {
    enabled: keyboardEnabled,
    requireReset: true,
    meta: {
      id: 'obligations.previous-row',
      name: 'Previous row',
      description: 'Move the active Obligations row up.',
      category: 'obligations',
      scope: 'route',
    },
  })

  useAppHotkey(
    'Enter',
    (event) => {
      if (isInteractiveEventTarget(event.target)) return
      if (!activeRow) return
      void setObligationQueueQuery({
        drawer: 'obligation',
        id: activeRow.id,
        tab: detailTab,
      })
    },
    {
      enabled: keyboardEnabled,
      requireReset: true,
      meta: {
        id: 'obligations.open-detail',
        name: 'Open detail',
        description: 'Open the active obligation detail drawer.',
        category: 'obligations',
        scope: 'route',
      },
    },
  )

  useAppHotkey(
    'E',
    (event) => {
      if (isInteractiveEventTarget(event.target)) return
      if (!activeRow) return
      openEvidence({
        obligationId: activeRow.id,
        label: `${activeRow.clientName} - ${formatTaxCode(activeRow.taxType)}`,
      })
    },
    {
      enabled: keyboardEnabled,
      requireReset: true,
      meta: {
        id: 'obligations.open-evidence',
        name: 'Open evidence',
        description: 'Open evidence for the active row.',
        category: 'obligations',
        scope: 'route',
      },
    },
  )

  useAppHotkey('F', (event) => updateActiveRowStatus('done', event.target), {
    enabled: keyboardEnabled,
    requireReset: true,
    meta: {
      id: 'obligations.mark-filed',
      name: 'Mark filed',
      description: 'Mark the active row as filed.',
      category: 'obligations',
      scope: 'route',
    },
  })

  useAppHotkey('P', (event) => updateActiveRowStatus('paid', event.target), {
    enabled: keyboardEnabled,
    requireReset: true,
    meta: {
      id: 'obligations.mark-paid',
      name: 'Mark paid',
      description: 'Mark the active row as paid.',
      category: 'obligations',
      scope: 'route',
    },
  })

  useAppHotkey(
    'X',
    (event) => {
      if (isInteractiveEventTarget(event.target)) return
      if (!activeRow) return
      setRowSelection((current) => {
        const next = { ...current }
        if (next[activeRow.id]) delete next[activeRow.id]
        else next[activeRow.id] = true
        return next
      })
      lastSelectedIdRef.current = activeRow.id
    },
    {
      enabled: keyboardEnabled,
      requireReset: true,
      meta: {
        id: 'obligations.toggle-select',
        name: 'Toggle selection',
        description: 'Toggle selection on the focused row.',
        category: 'obligations',
        scope: 'route',
      },
    },
  )

  useAppHotkey(
    'Escape',
    () => {
      if (drawer === 'obligation') {
        void setObligationQueueQuery({ drawer: null, id: null })
        return
      }
      if (row) {
        void setObligationQueueQuery({ row: null })
      }
    },
    {
      enabled: keyboardEnabled,
      requireReset: true,
      // Multiple Escape handlers ship across the app (wizard, queue
      // drawer, rule review). Context-scoped, mutually exclusive in
      // practice — silence the global 'warn' default.
      conflictBehavior: 'allow',
      meta: {
        id: 'obligations.dismiss',
        name: 'Close drawer or clear focus',
        description: 'Close the obligation drawer or clear the focused row.',
        category: 'obligations',
        scope: 'route',
      },
    },
  )

  useAppHotkey('I', (event) => updateActiveRowStatus('in_progress', event.target), {
    enabled: keyboardEnabled,
    requireReset: true,
    meta: {
      id: 'obligations.mark-in-progress',
      name: 'Mark in progress',
      description: 'Mark the active row as in progress.',
      category: 'obligations',
      scope: 'route',
    },
  })

  useAppHotkey('W', (event) => updateActiveRowStatus('waiting_on_client', event.target), {
    enabled: keyboardEnabled,
    requireReset: true,
    meta: {
      id: 'obligations.mark-waiting',
      name: 'Mark waiting on client',
      description: 'Mark the active row as waiting on client.',
      category: 'obligations',
      scope: 'route',
    },
  })

  // `loadMore` retired 2026-05-21 — pagination Next button calls
  // `listQuery.fetchNextPage()` inline when crossing the loaded buffer.

  function resetObligationQueue() {
    void setObligationQueueQuery(null)
    setRowSelection({})
  }

  function changeSelectedStatus(status: ObligationStatus, reason?: string) {
    if (selectedIds.length === 0) return
    bulkStatusMutation.mutate({
      ids: selectedIds,
      status,
      ...(reason ? { reason } : {}),
    })
  }

  function changeSelectedAssignee(assigneeId: string | null, assigneeName?: string) {
    if (selectedClientIds.length === 0) return
    bulkAssigneeMutation.mutate(
      {
        clientIds: selectedClientIds,
        assigneeId,
        reason: t`Obligations bulk owner change`,
      },
      {
        onSuccess: () => {
          const count = selectedIds.length
          const label = assigneeName ?? t`Unassigned`
          toast.success(t`Assigned ${count} obligations to ${label}`)
        },
      },
    )
  }

  function openExportDialog(scope: ObligationExportDialogScope = 'filtered') {
    setExportScope(scope === 'selected' && selectedIds.length === 0 ? 'filtered' : scope)
    if (!exportClientId && clientOptions[0]) setExportClientId(clientOptions[0].value)
    setExportRecipient('download')
    setExportModalOpen(true)
  }

  function buildExportInput(): ObligationQueueExportSelectedInput | null {
    if (exportRecipient !== 'download') return null
    if (exportScope === 'selected') {
      if (selectedIds.length === 0) return null
      return { scope: 'selected', ids: selectedIds, format: exportFormat }
    }
    if (exportScope === 'all_active') {
      return { scope: 'all_active', format: exportFormat }
    }
    if (exportScope === 'client') {
      if (!exportClientId) return null
      return {
        scope: 'filtered',
        query: { clientIds: [exportClientId], sort: 'due_asc' },
        format: exportFormat,
      }
    }
    if (exportScope === 'date_range') {
      if (!isValidIsoDate(exportDateStart) || !isValidIsoDate(exportDateEnd)) return null
      const today = todayIsoDate()
      const exportMinDaysUntilDue = diffIsoDateDays(today, exportDateStart)
      const exportMaxDaysUntilDue = diffIsoDateDays(today, exportDateEnd)
      if (exportMinDaysUntilDue > exportMaxDaysUntilDue) return null
      return {
        scope: 'filtered',
        query: {
          asOfDate: today,
          minDaysUntilDue: exportMinDaysUntilDue,
          maxDaysUntilDue: exportMaxDaysUntilDue,
          sort: 'due_asc',
        },
        format: exportFormat,
      }
    }
    return { scope: 'filtered', query: currentExportQuery, format: exportFormat }
  }

  function submitExport() {
    const input = buildExportInput()
    if (!input) return
    exportMutation.mutate(input, {
      onSuccess: () => setExportModalOpen(false),
    })
  }

  return (
    // Layout switches to a fixed-viewport-height two-column grid when
    // the detail panel is open at xl+. That lets the queue (left) and
    // the panel (right) scroll INDEPENDENTLY — a long checklist in the
    // panel doesn't drag the queue along, and scrolling the queue
    // doesn't lose the user's place in the panel. When the panel is
    // closed (or below xl), the route reverts to natural page-level
    // scrolling.
    <div
      className={cn(
        'flex flex-col gap-6 p-4 md:p-6',
        activeDetailId && 'xl:h-[calc(100vh-1rem)] xl:overflow-hidden xl:pb-2',
      )}
    >
      <PageHeader
        title={
          <ConceptLabel concept="obligation">
            <Trans>Deadlines</Trans>
          </ConceptLabel>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => openExportDialog('filtered')}>
              <DownloadIcon data-icon="inline-start" />
              <Trans>Export</Trans>
            </Button>
            <CalendarSyncPopover />
            {/* Saved views + Reset removed 2026-05-21 per UX call —
                Reset is redundant with the "Clear filters" link in
                the applied-filters strip; saved views was high-chrome
                for a feature CPAs barely touch. The underlying
                view/filter state machinery stays so the URL param
                still works for shared deep links. */}
          </>
        }
      />

      {/* When a row is selected, this section becomes a 2-column flex:
          queue on the left (shrinks), detail panel on the right (fixed
          440px). When no row is selected the queue takes the full width.
          Below xl the panel stacks below the queue so the table keeps
          its column space on narrow viewports. */}
      <div
        className={cn(
          'flex min-w-0 flex-col gap-4 xl:flex-row',
          activeDetailId && 'xl:min-h-0 xl:flex-1 xl:items-stretch',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-3',
            activeDetailId ? 'xl:overflow-y-auto xl:pr-1' : 'overflow-x-auto',
          )}
        >
          {/* Filter bar — two rows now:
              Row 1: status scope tabs (left) + search (right). Search lives
                here so the primary "where am I scoped" + "what am I looking
                for" controls share a line. Bottom hairline closes the row.
              Row 2: cross-cutting action chips (left) + applied chips,
                row count, Columns (right). Triage filters share a line
                with the table meta they affect.
              Zero-count scopes are auto-hidden so the bar respects the
              cognitive-load cap and doesn't render `Blocked 0` decoration
              when there's nothing there to triage. */}
          <div className="flex flex-wrap items-end gap-3 border-b border-divider-regular">
            <nav
              aria-label={t`Status scopes`}
              // No horizontal scroll — the user found it disorienting.
              // Tabs sit on one line; if the viewport is genuinely too
              // narrow, they wrap. With the collapsible search icon
              // (below), there's enough room on every reasonable
              // viewport for the 5–6 visible tabs.
              className="-mb-px flex flex-1 flex-wrap items-center gap-1"
            >
              <ObligationQueueScopeTab
                label={t`All`}
                count={scopeTotal}
                active={activeScope === 'all'}
                onClick={() =>
                  void setObligationQueueQuery({
                    status: null,
                    obligation: null,
                    row: null,
                  })
                }
              />
              {visibleScopeStatuses.map((status) => (
                <ObligationQueueScopeTab
                  key={status}
                  label={statusLabels[status]}
                  count={statusFacetCounts.get(status) ?? 0}
                  active={activeScope === status}
                  // Mirror the row badge tone — `Filed` reads green here
                  // because the row pill is green; `Waiting on client` /
                  // `In review` read amber, `Blocked` reads red. Visual
                  // continuity between the tab and the cells beneath it.
                  dotTone={STATUS_DOT[status]}
                  onClick={() =>
                    void setObligationQueueQuery({
                      status: [status],
                      obligation: null,
                      row: null,
                    })
                  }
                />
              ))}
            </nav>
            {/* Collapsible search — icon button at rest, expands into an
              inline input on click (or stays open while a query is
              active). Saves ~190px of horizontal real estate so the
              scope tabs never wrap onto a second line. The `/`
              keyboard shortcut still focuses the input (it auto-
              expands the search when triggered). */}
            <ObligationQueueSearchControl
              inputRef={searchInputRef}
              value={searchInput}
              onChange={(nextSearch) =>
                void setObligationQueueQuery(
                  {
                    q: nextSearch || null,
                    obligation: null,
                    row: null,
                  },
                  nextSearch === '' ? undefined : { limitUrlUpdates: queryInputUrlUpdateRateLimit },
                )
              }
            />
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <ObligationQueueActionChip
                active={due === 'overdue'}
                onClick={() =>
                  void setObligationQueueQuery({
                    due: due === 'overdue' ? null : 'overdue',
                    obligation: null,
                    row: null,
                  })
                }
              >
                <Trans>Past due</Trans>
              </ObligationQueueActionChip>
              <ObligationQueueActionChip
                active={thisWeekFilterActive}
                onClick={() =>
                  void setObligationQueueQuery(nextThisWeekFilterPatch(daysMin, daysMax))
                }
              >
                <Trans>Due this week</Trans>
              </ObligationQueueActionChip>
              <ObligationQueueActionChip
                active={evidence === 'needs'}
                onClick={() =>
                  void setObligationQueueQuery({
                    evidence: evidence === 'needs' ? null : 'needs',
                    obligation: null,
                    row: null,
                  })
                }
              >
                <Trans>Needs evidence</Trans>
              </ObligationQueueActionChip>
              {/* "Penalty input needed" chip retired 2026-05-22 with
                hanxujiang's projected-exposure refactor (30f29dc).
                The `exposure` query param and its filter pipeline are
                gone; the surface that asks for penalty inputs lives
                inside the obligation drawer. */}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* "Applied · <chip> · Clear filters" strip removed
                2026-05-21 — the row chips above are already the
                authoritative active-filter display, and each carries
                its own × to dismiss. The breadcrumb was reading the
                same state twice. */}
              <span className="tabular-nums text-xs text-text-tertiary">
                <Plural value={totalShown} one="# row" other="# rows" />
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      // Icon + "visible/total" ratio. The "Columns" label
                      // text was dropped 2026-05-21 per design call —
                      // the icon already conveys the affordance, the
                      // ratio carries the state. aria-label spells it
                      // out for screen readers.
                      aria-label={t`Columns — ${visibleHideableCount} of ${totalHideableCount} visible`}
                      title={t`${visibleHideableCount} of ${totalHideableCount} columns visible`}
                      className="gap-1.5"
                    >
                      <Columns3Icon className="size-4" aria-hidden />
                      <span className="text-[11px] tabular-nums text-text-secondary">
                        {visibleHideableCount}/{totalHideableCount}
                      </span>
                    </Button>
                  }
                />
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex items-center justify-between gap-2">
                      <Trans>Visible columns</Trans>
                      {hiddenColumnsCount > 0 ? (
                        // Bulk "Show all" — clear the hidden set in
                        // ONE state write. Previously this looped over
                        // `column.toggleVisibility(true)`, but each
                        // call resolved its updater against the same
                        // stale closure `columnVisibility`, so each
                        // iteration ended up overwriting the URL with
                        // just ONE column visible — leaving the rest
                        // hidden. Writing the empty hide-list directly
                        // is both correct and atomic.
                        <button
                          type="button"
                          onClick={() => {
                            void setObligationQueueQuery({ hide: null })
                          }}
                          className="text-xs font-normal text-text-accent hover:underline"
                        >
                          <Trans>Show all</Trans>
                        </button>
                      ) : null}
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  {table
                    .getAllLeafColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      const label = columnLabel(column.id, columnLabels)
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          aria-label={label}
                          checked={column.getIsVisible()}
                          closeOnClick={false}
                          onCheckedChange={(checked) => column.toggleVisibility(checked)}
                        >
                          <span>{label}</span>
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {selectedIds.length > 0 ? (
            /*
             * Floating bulk-action toolbar.
             *
             * Uses the shared `<FloatingActionBar>` primitive so the
             * shape, shadow, blur, and z-stacking match the Rule
             * library's bulk-review bar (both surfaces converged on
             * the same recipe 2026-05-22).
             *
             * Originally lived as a sticky bar at `top-2` inside the
             * queue column — but its appearance reflowed the table
             * downward 50px the moment a row was checked, which broke
             * the reading flow ("where did my row go?"). Detached to
             * `fixed bottom-10` (40px from viewport bottom), which
             * the primitive now bakes in.
             */
            <FloatingActionBar ariaLabel={t`Bulk actions`}>
              <span className="text-xs font-medium tabular-nums text-text-primary">
                <Plural value={selectedIds.length} one="# row selected" other="# rows selected" />
              </span>
              <Separator orientation="vertical" className="mx-0.5 h-4" />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="sm">
                      <Trans>Assign owner</Trans>
                      <ChevronDownIcon data-icon="inline-end" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuItem onClick={() => changeSelectedAssignee(null)}>
                    <Trans>Unassigned</Trans>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {assignableMembers.length === 0 ? (
                    <DropdownMenuItem disabled>
                      <Trans>No assignable members</Trans>
                    </DropdownMenuItem>
                  ) : (
                    assignableMembers.map((member) => (
                      <DropdownMenuItem
                        key={member.assigneeId}
                        onClick={() => changeSelectedAssignee(member.assigneeId, member.name)}
                      >
                        <span className="truncate">{member.name}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="sm">
                      <Trans>Set status</Trans>
                      <ChevronDownIcon data-icon="inline-end" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start">
                  {/* Bulk-action Set Status — iterates statusDropdownOptions
                      (6 under v2, 10 under legacy). Pre-fix iterated
                      ALL_STATUSES → duplicate "In review" / "Filed" /
                      "Not started" entries with v2 collapsed labels.
                      The `extended` special-case for the memo modal
                      is preserved but only fires under legacy (v2
                      dropdown options don't include `extended`). */}
                  {statusDropdownOptions.map((status) =>
                    status === 'extended' ? (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => {
                          setExtendedMemo('')
                          setExtendedMemoOpen(true)
                        }}
                      >
                        {statusLabels[status]}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem key={status} onClick={() => changeSelectedStatus(status)}>
                        {statusLabels[status]}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={() => openExportDialog('selected')}>
                <DownloadIcon data-icon="inline-start" />
                <Trans>Export</Trans>
              </Button>
              <Separator orientation="vertical" className="mx-0.5 h-4" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRowSelection({})
                  lastSelectedIdRef.current = null
                }}
                aria-label={t`Clear selection`}
              >
                <XIcon data-icon="inline-start" />
                <Trans>Clear</Trans>
              </Button>
            </FloatingActionBar>
          ) : null}

          {isInitialLoading ? (
            <div className="rounded-lg border border-dashed border-divider-regular py-8 text-center text-sm text-text-tertiary">
              <Trans>Loading obligations…</Trans>
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-state-destructive-border bg-state-destructive-hover p-4 text-sm text-text-destructive">
              <Trans>Couldn't load obligations.</Trans>{' '}
              <button type="button" className="underline" onClick={() => void listQuery.refetch()}>
                <Trans>Retry</Trans>
              </button>
            </div>
          ) : (
            <>
              {/* Style aligned with the Rule library table (2026-05-21):
                - Headers: UPPERCASE, text-xs, font-medium,
                  tracking-[0.08em], text-text-tertiary. Background
                  intentionally left transparent so the header sits
                  flush with the rows — the typographic weight
                  difference is what separates header from data.
                  Earlier bg-background-subtle made the header read
                  as a tinted stripe across the top, especially next
                  to the (now transparent) first row.
                - Rows: h-9, py-2, text-xs.
                Long client names + tax codes still wrap so the queue
                fits inside the page cap without horizontal scroll. */}
              <Table className="[&_th]:!whitespace-normal [&_th]:!px-2 [&_td]:!whitespace-normal [&_td]:!px-2 [&_td]:!align-middle [&_td]:break-words">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="hover:bg-transparent">
                      {headerGroup.headers.map((header) => {
                        const meta = header.column.columnDef.meta
                        return (
                          <TableHead
                            key={header.id}
                            className={cn(
                              'text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary',
                              meta?.headerClassName,
                            )}
                            colSpan={header.colSpan}
                            aria-sort={obligationQueueColumnAriaSort(header.column.id, sort)}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                {/* Row borders left to the Table primitive's default
                  (border-b-divider-subtle). Selective `border-b-0` on
                  within-group rows below welds same-client rows into
                  one visual block — group boundary lines stay so the
                  eye can find them. */}
                <TableBody className="[&_td]:py-2 [&_td]:text-xs">
                  {tableRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumnCount} className="py-8">
                        <EmptyState
                          onOpenWizard={openWizard}
                          canRunMigration={canRunMigration}
                          hasActiveFilters={Boolean(
                            searchInput ||
                            statusFilter?.length ||
                            clientFilter?.length ||
                            stateFilter?.length ||
                            countyFilter?.length ||
                            taxTypeFilter?.length ||
                            assignee ||
                            assigneeFilter?.length ||
                            owner ||
                            due ||
                            dueWithin ||
                            evidence?.length ||
                            daysMin !== null ||
                            daysMax !== null,
                          )}
                          onClearFilters={resetObligationQueue}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableRows.map((tableRow) => (
                      <TableRow
                        key={tableRow.id}
                        // Treat rows as buttons for a11y: keyboard
                        // users can Tab to a row and press Enter to
                        // open the drawer, matching the J/K shortcut
                        // for power users. Without tabindex, the only
                        // way to drive the queue without a mouse was
                        // the global J/K hotkeys.
                        role="button"
                        tabIndex={0}
                        aria-selected={tableRow.original.id === explicitActiveRowId}
                        data-row-id={tableRow.original.id}
                        data-state={tableRow.getIsSelected() ? 'selected' : undefined}
                        className={cn(
                          // Reserve a 2px left rail slot on every row
                          // (transparent by default) so single-row
                          // clients and grouped-cluster rows stay
                          // horizontally aligned. Cluster rows
                          // override the color below.
                          // `group` lets per-cell affordances (e.g. the
                          // client peek icon) fade in on row hover.
                          'group cursor-pointer border-l-2 border-l-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt',
                          tableRow.original.id === explicitActiveRowId && 'bg-state-base-hover',
                          // Within-group rows lose their bottom border so
                          // same-client filings weld into a single block.
                          // The last row of each group keeps the divider,
                          // making group boundaries scannable.
                          withinGroupRowIds.has(tableRow.original.id) && 'border-b-0',
                          // Continuous 2px left rail across every row
                          // in a multi-row client cluster (group's
                          // first row + every continuation). Reads as
                          // a single vertical mark spanning the
                          // grouped block — stronger grouping cue
                          // than the blank-continuation-cell trick
                          // alone. Single-row clients keep the
                          // transparent rail, so alignment doesn't
                          // shift.
                          (continuationRowIds.has(tableRow.original.id) ||
                            withinGroupRowIds.has(tableRow.original.id)) &&
                            'border-l-divider-regular',
                        )}
                        onClick={(event) => {
                          if (isObligationQueueRowControlClick(event.target, event.currentTarget)) {
                            void setObligationQueueQuery({ row: tableRow.original.id })
                            return
                          }
                          void setObligationQueueQuery({
                            row: tableRow.original.id,
                            drawer: 'obligation',
                            id: tableRow.original.id,
                            tab: detailTab,
                          })
                        }}
                        onKeyDown={(event) => {
                          // Match native button semantics: Enter and
                          // Space both activate; ignore when focus is
                          // inside a control cell so spacebar-toggling
                          // a checkbox doesn't also open the drawer.
                          if (event.key !== 'Enter' && event.key !== ' ') return
                          if (isObligationQueueRowControlClick(event.target, event.currentTarget))
                            return
                          event.preventDefault()
                          void setObligationQueueQuery({
                            row: tableRow.original.id,
                            drawer: 'obligation',
                            id: tableRow.original.id,
                            tab: detailTab,
                          })
                        }}
                      >
                        {tableRow.getVisibleCells().map((cell) => {
                          const meta = cell.column.columnDef.meta
                          return (
                            <TableCell
                              key={cell.id}
                              className={`${density === 'compact' ? 'px-2 py-1.5' : ''} ${meta?.cellClassName ?? ''}`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          )}
          {/* Footer — sticky to the bottom of the queue column. Always
            visible regardless of row count (per 2026-05-21 design
            call). Carries the obligation count, keyboard hints, and
            client-side pagination controls (replaced Load more). */}
          <div className="sticky bottom-0 -mx-1 mt-auto flex items-center justify-between border-t border-divider-subtle bg-background-default px-2 py-2">
            <div className="flex items-center gap-3 text-xs text-text-tertiary">
              <span>
                <Plural value={rows.length} one="# obligation" other="# obligations" />
              </span>
              {rows.length > 0 ? (
                <>
                  <span
                    aria-hidden
                    className="hidden h-3 border-l border-divider-subtle md:inline-block"
                  />
                  <span className="hidden items-center gap-1.5 md:inline-flex">
                    <kbd className="rounded border border-divider-regular bg-background-subtle px-1.5 py-0 font-sans text-[10px] tabular-nums text-text-tertiary">
                      J
                    </kbd>
                    <kbd className="rounded border border-divider-regular bg-background-subtle px-1.5 py-0 font-sans text-[10px] tabular-nums text-text-tertiary">
                      K
                    </kbd>
                    <span>
                      <Trans>navigate</Trans>
                    </span>
                    <kbd className="ml-1 rounded border border-divider-regular bg-background-subtle px-1.5 py-0 font-sans text-[10px] tabular-nums text-text-tertiary">
                      Enter
                    </kbd>
                    <span>
                      <Trans>open</Trans>
                    </span>
                    <kbd className="ml-1 rounded border border-divider-regular bg-background-subtle px-1.5 py-0 font-sans text-[10px] tabular-nums text-text-tertiary">
                      ?
                    </kbd>
                    <span>
                      <Trans>all</Trans>
                    </span>
                  </span>
                </>
              ) : null}
            </div>
            {totalLoadedPages > 1 || listQuery.hasNextPage ? (
              <div className="flex items-center gap-1 text-xs text-text-tertiary">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t`Previous page`}
                  disabled={safePageIndex === 0}
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeftIcon className="size-4" aria-hidden />
                </Button>
                <span className="px-2 tabular-nums">
                  {listQuery.hasNextPage ? (
                    <Trans>Page {safePageIndex + 1}</Trans>
                  ) : (
                    <Trans>
                      Page {safePageIndex + 1} of {totalLoadedPages}
                    </Trans>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t`Next page`}
                  disabled={safePageIndex + 1 >= totalLoadedPages && !listQuery.hasNextPage}
                  onClick={() => {
                    if (safePageIndex + 1 >= totalLoadedPages && listQuery.hasNextPage) {
                      void listQuery.fetchNextPage()
                    }
                    setPageIndex((p) => p + 1)
                  }}
                >
                  <ChevronRightIcon className="size-4" aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        {/* Right-side detail panel — rendered inline inside the route's
          2-column flex (vs. the legacy floating Sheet). Fixed 440px on
          xl+; full-width stacked below the queue at narrower viewports.
          Only mounts when a row is selected; otherwise the queue gets
          the full page width. */}
        {activeDetailId ? (
          <div className="min-w-0 w-full xl:w-[600px] xl:shrink-0 xl:min-h-0">
            <ObligationPanelDispatcher
              obligationId={activeDetailId}
              activeTab={detailTab}
              onTabChange={(nextTab) => void setObligationQueueQuery({ tab: nextTab })}
              onClose={() => void setObligationQueueQuery({ drawer: null, id: null })}
              onNeedsInput={setPenaltyRow}
              practiceAiEnabled={practiceAiEnabled}
              blockerCandidates={rows}
            />
          </div>
        ) : null}
      </div>
      <PenaltyInputDialog
        row={penaltyRow}
        onClose={() => setPenaltyRow(null)}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
          void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        }}
      />
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans>Export obligations</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>Choose one option in each row. Export writes an audit event.</Trans>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5">
            <ExportAxis label={t`What`}>
              <ExportAxisOption
                selected={exportScope === 'filtered'}
                title={<Trans>Current filtered view</Trans>}
                description={<Trans>Matches the filters and sort currently on this page.</Trans>}
                onSelect={() => setExportScope('filtered')}
              />
              <ExportAxisOption
                selected={exportScope === 'all_active'}
                title={<Trans>All active obligations</Trans>}
                description={<Trans>Open, waiting, review, blocked, and extended work.</Trans>}
                onSelect={() => setExportScope('all_active')}
              />
              <ExportAxisOption
                selected={exportScope === 'selected'}
                disabled={selectedIds.length === 0}
                title={<Trans>Selected obligations</Trans>}
                description={
                  selectedIds.length > 0 ? (
                    <Plural
                      value={selectedIds.length}
                      one="# selected obligation"
                      other="# selected obligations"
                    />
                  ) : (
                    <Trans>Select rows to use this scope.</Trans>
                  )
                }
                onSelect={() => setExportScope('selected')}
              />
              <div className="grid gap-2">
                <ExportAxisOption
                  selected={exportScope === 'date_range'}
                  title={<Trans>Specific date range</Trans>}
                  description={
                    <Trans>Exports obligations due within the selected date window.</Trans>
                  }
                  onSelect={() => setExportScope('date_range')}
                />
                {exportScope === 'date_range' ? (
                  <div className="grid gap-2 rounded-md border border-divider-subtle bg-background-subtle p-2 sm:grid-cols-2">
                    <IsoDatePicker
                      value={exportDateStart}
                      invalid={!isValidIsoDate(exportDateStart)}
                      ariaLabel={t`Export start date`}
                      onValueChange={setExportDateStart}
                    />
                    <IsoDatePicker
                      value={exportDateEnd}
                      invalid={
                        !isValidIsoDate(exportDateEnd) ||
                        diffIsoDateDays(exportDateStart, exportDateEnd) < 0
                      }
                      ariaLabel={t`Export end date`}
                      onValueChange={setExportDateEnd}
                    />
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2">
                <ExportAxisOption
                  selected={exportScope === 'client'}
                  disabled={clientOptions.length === 0}
                  title={<Trans>Specific client</Trans>}
                  description={<Trans>Exports all deadlines for one client.</Trans>}
                  onSelect={() => setExportScope('client')}
                />
                {exportScope === 'client' ? (
                  <Select
                    value={exportClientId ?? ''}
                    onValueChange={(value) => {
                      if (typeof value === 'string') setExportClientId(value)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {clientOptions.find((option) => option.value === exportClientId)?.label ??
                          t`Select client`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {clientOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            </ExportAxis>

            <ExportAxis label={t`Format`}>
              <ExportAxisOption
                selected={exportFormat === 'pdf_zip'}
                icon={<FileArchiveIcon className="size-4" aria-hidden />}
                title={<Trans>PDF report</Trans>}
                description={<Trans>Firm-branded client-facing PDFs grouped by client.</Trans>}
                onSelect={() => setExportFormat('pdf_zip')}
              />
              <ExportAxisOption
                selected={exportFormat === 'csv'}
                icon={<DownloadIcon className="size-4" aria-hidden />}
                title={<Trans>CSV</Trans>}
                description={<Trans>Raw data for spreadsheets and portability.</Trans>}
                onSelect={() => setExportFormat('csv')}
              />
              <ExportAxisOption
                selected={exportFormat === 'ics'}
                icon={<CalendarDaysIcon className="size-4" aria-hidden />}
                title={<Trans>iCal .ics</Trans>}
                description={<Trans>Calendar events dated to each internal deadline.</Trans>}
                onSelect={() => setExportFormat('ics')}
              />
            </ExportAxis>

            <ExportAxis label={t`Recipient`}>
              <ExportAxisOption
                selected={exportRecipient === 'download'}
                icon={<DownloadIcon className="size-4" aria-hidden />}
                title={<Trans>Download</Trans>}
                description={<Trans>Creates the file in this browser.</Trans>}
                onSelect={() => setExportRecipient('download')}
              />
              <ExportAxisOption
                selected={exportRecipient === 'email_self'}
                disabled
                title={<Trans>Email to self</Trans>}
                description={
                  <Trans>Email delivery is not connected for obligation exports yet.</Trans>
                }
                onSelect={() => setExportRecipient('email_self')}
              />
              <ExportAxisOption
                selected={exportRecipient === 'email_teammate'}
                disabled
                title={<Trans>Email to teammate</Trans>}
                description={
                  <Trans>Team recipient delivery will use the notification queue.</Trans>
                }
                onSelect={() => setExportRecipient('email_teammate')}
              />
            </ExportAxis>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              onClick={submitExport}
              disabled={exportMutation.isPending || !buildExportInput()}
            >
              {exportMutation.isPending ? <Trans>Exporting…</Trans> : <Trans>Export</Trans>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={extendedMemoOpen} onOpenChange={setExtendedMemoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans>Mark selected extended</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>The memo is stored on the audit trail for the bulk status change.</Trans>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label={t`Extension memo`}
            placeholder={t`Extension memo`}
            value={extendedMemo}
            onChange={(event) => setExtendedMemo(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendedMemoOpen(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              onClick={() => {
                changeSelectedStatus('extended', extendedMemo.trim() || undefined)
                setExtendedMemoOpen(false)
              }}
              disabled={bulkStatusMutation.isPending}
            >
              <Trans>Mark extended</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ExportAxis({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 md:grid-cols-[96px_minmax(0,1fr)] md:items-start">
      <div className="pt-2 text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
        {label}
      </div>
      <div role="radiogroup" aria-label={label} className="grid gap-2">
        {children}
      </div>
    </div>
  )
}

function ExportAxisOption({
  selected,
  disabled = false,
  icon,
  title,
  description,
  onSelect,
}: {
  selected: boolean
  disabled?: boolean
  icon?: ReactNode
  title: ReactNode
  description: ReactNode
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      className={cn(
        'flex min-h-12 w-full cursor-pointer items-start gap-2 rounded-md border border-divider-regular bg-background-default px-3 py-2 text-left outline-none transition-colors',
        'hover:bg-background-default-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2 focus-visible:ring-offset-background-default',
        selected && 'border-divider-deep bg-state-base-active',
        disabled && 'cursor-not-allowed opacity-50',
      )}
      onClick={() => {
        if (!disabled) onSelect()
      }}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-divider-deep',
          selected && 'border-text-primary bg-text-primary text-text-inverted',
        )}
      >
        {selected ? <CheckCircle2Icon className="size-3" /> : icon}
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-sm font-medium text-text-primary">{title}</span>
        <span className="text-xs leading-4 text-text-tertiary">{description}</span>
      </span>
    </button>
  )
}

function ObligationQueueSortableHeader({
  children,
  sort,
  ascSort,
  descSort,
  firstSort,
  sortLabel,
  onSortChange,
}: {
  children: ReactNode
  sort: ObligationQueueSort
  ascSort: ObligationQueueSort
  descSort: ObligationQueueSort
  firstSort: ObligationQueueSort
  sortLabel: string
  onSortChange: (sort: ObligationQueueSort) => void
}) {
  const direction = sort === ascSort ? 'asc' : sort === descSort ? 'desc' : false
  const SortIcon =
    direction === 'asc' ? ArrowUpIcon : direction === 'desc' ? ArrowDownIcon : ArrowUpDownIcon

  return (
    <div className="flex min-w-0 items-center gap-1">
      {children}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={sortLabel}
        aria-pressed={direction !== false}
        data-active={direction !== false ? true : undefined}
        className="size-7 text-text-tertiary hover:text-text-primary data-[active=true]:text-text-accent"
        onClick={() =>
          onSortChange(nextHeaderSort({ currentSort: sort, ascSort, descSort, firstSort }))
        }
      >
        <SortIcon className="size-3.5" aria-hidden />
      </Button>
    </div>
  )
}

// Assignee avatar — 24px circle with up-to-2-letter initials. Picks
// up the existing initialsFromName helper used by the global user
// menu so vocabulary stays consistent. `isMine` swaps the background
// to a soft accent tint + accent text — gives a quiet "this is your
// row" cue without an extra YOU chip. Name lives in the title
// (tooltip) so the column stays compact.
function AssigneeAvatar({ name, isMine, title }: { name: string; isMine: boolean; title: string }) {
  const initials = initialsFromName(name)
  return (
    <span
      aria-label={title}
      title={title}
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-tight',
        isMine
          ? 'bg-state-accent-hover-alt text-text-accent'
          : 'bg-background-subtle text-text-secondary',
      )}
    >
      {initials}
    </span>
  )
}

function DueDaysPill({ days }: { days: number }) {
  const tone = dueDaysTone(days)
  return (
    <Badge
      variant={tone.variant}
      className={`${OBLIGATION_QUEUE_TABLE_PILL_CLASSNAME} min-w-18 justify-start tabular-nums ${tone.badgeClassName ?? ''}`}
    >
      <BadgeStatusDot tone={tone.dot} className={`size-1.5 ${tone.dotClassName ?? ''}`} />
      {days === 0 ? (
        <Trans>Today</Trans>
      ) : days < 0 ? (
        <Plural value={Math.abs(days)} one="# day late" other="# days late" />
      ) : (
        <Plural value={days} one="# day" other="# days" />
      )}
    </Badge>
  )
}

function RangeHeaderFilterDropdown({
  label,
  minLabel,
  maxLabel,
  minPlaceholder,
  maxPlaceholder,
  minValue,
  maxValue,
  inputMode,
  min,
  max,
  onCommit,
}: {
  label: string
  minLabel: string
  maxLabel: string
  minPlaceholder: string
  maxPlaceholder: string
  minValue: number | null
  maxValue: number | null
  inputMode: HTMLAttributes<HTMLInputElement>['inputMode']
  min?: number
  max?: number
  onCommit: (minValue: string, maxValue: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [draftMin, setDraftMin] = useState(inputValueFromNumber(minValue))
  const [draftMax, setDraftMax] = useState(inputValueFromNumber(maxValue))
  const currentMin = inputValueFromNumber(minValue)
  const currentMax = inputValueFromNumber(maxValue)
  const activeMin = open ? draftMin : currentMin
  const activeMax = open ? draftMax : currentMax
  const activeCount = (activeMin.trim() ? 1 : 0) + (activeMax.trim() ? 1 : 0)

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraftMin(currentMin)
      setDraftMax(currentMax)
      setOpen(true)
      return
    }
    setOpen(false)
    if (draftMin !== currentMin || draftMax !== currentMax) {
      onCommit(draftMin, draftMax)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger render={tableHeaderFilterTrigger({ label, activeCount })} />
      <DropdownMenuContent className="w-72" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="grid gap-3 p-2">
          <label className="grid gap-1 text-xs font-medium text-text-secondary">
            <span>{minLabel}</span>
            <Input
              inputMode={inputMode}
              min={min}
              max={max}
              className="h-8"
              placeholder={minPlaceholder}
              value={draftMin}
              onChange={(event) => setDraftMin(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-text-secondary">
            <span>{maxLabel}</span>
            <Input
              inputMode={inputMode}
              min={min}
              max={max}
              className="h-8"
              placeholder={maxPlaceholder}
              value={draftMax}
              onChange={(event) => setDraftMax(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
            />
          </label>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ObligationQueueDetailDrawer({
  obligationId,
  activeTab,
  onTabChange,
  onClose,
  // onNeedsInput + practiceAiEnabled went unused with the Risk tab
  // removal. Kept on the prop type for back-compat with the route
  // and the ObligationDrawerProvider that still pass them; underscore
  // prefix silences eslint without breaking callers. Drop the props
  // entirely in a follow-up that also updates the two callsites.
  onNeedsInput: _onNeedsInput,
  practiceAiEnabled: _practiceAiEnabled,
  // `blockerCandidates` retired 2026-05-21 with the in-tab K-1 editor.
  // Kept on the prop type so the route + provider call sites still
  // compile; underscore-prefixed to silence eslint until we land the
  // new blocker UX.
  blockerCandidates: _blockerCandidates,
  // 2026-05-21: dual-mode. The /obligations route renders the detail
  // as a persistent right-side panel ('panel'). The ObligationDrawer-
  // Provider (dashboard / clients / pulse) still uses the modal-style
  // Sheet ('sheet'). Default 'sheet' preserves back-compat for any
  // unconverted caller.
  mode = 'sheet',
}: {
  obligationId: string | null
  activeTab: ObligationQueueDetailTab
  onTabChange: (tab: ObligationQueueDetailTab) => void
  onClose: () => void
  onNeedsInput: (row: ObligationQueueRow) => void
  practiceAiEnabled: boolean
  blockerCandidates: ObligationQueueRow[]
  mode?: 'sheet' | 'panel'
}) {
  const { t } = useLingui()
  const practiceTimezone = usePracticeTimezone()
  const queryClient = useQueryClient()
  // ClientDrawer hook lets the "Open client detail" link peek a
  // client in place instead of navigating away. See
  // ClientDrawerProvider.tsx.
  const { openDrawer: openClientDrawer } = useClientDrawer()
  // Lifecycle v2: when on, the Audit tab is relabeled to "Timeline"
  // and its content swaps to the milestone-grouped timeline. See
  // docs/Design/obligation-lifecycle-design-brief.md.
  const lifecycleV2 = useLifecycleV2()
  const legacyStatusLabels = useStatusLabels()
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const statusLabels = lifecycleV2 ? v2StatusLabels : legacyStatusLabels
  // Mirror the queue's status-set policy — under v2 the drawer pill
  // dropdown shows only the 6 canonical lifecycle states; otherwise
  // it surfaces the full legacy 10-state palette. Illegal transitions
  // are surfaced as disabled items by ObligationQueueStatusControl
  // (and re-checked server-side).
  const statusDropdownOptions = lifecycleV2 ? LIFECYCLE_V2_STATUSES : ALL_STATUSES
  const [extensionDraft, setExtensionDraft] = useState({
    obligationId: '',
    memo: '',
    source: '',
    internalTargetDate: '',
  })
  const [taxYearDraft, setTaxYearDraft] = useState<{
    obligationId: string
    taxYearType: ObligationQueueRow['taxYearType']
    fiscalYearEndDate: string
  }>({
    obligationId: '',
    taxYearType: 'calendar',
    fiscalYearEndDate: '',
  })
  const [extensionSaveSuccessOpen, setExtensionSaveSuccessOpen] = useState(false)
  const extensionSaveSuccessTimeoutRef = useRef<number | null>(null)
  const [deadlineTipRefresh, setDeadlineTipRefresh] = useState<{
    obligationId: string
    startedAt: number
  } | null>(null)
  const activeDeadlineTipRefresh =
    obligationId && deadlineTipRefresh?.obligationId === obligationId ? deadlineTipRefresh : null
  const detailQuery = useQuery({
    ...orpc.obligations.getDetail.queryOptions({
      input: { obligationId: obligationId ?? '' },
    }),
    enabled: obligationId !== null,
  })
  const requestDeadlineTipMutation = useMutation(
    orpc.obligations.requestDeadlineTipRefresh.mutationOptions({
      onMutate: (variables) => {
        setDeadlineTipRefresh({ obligationId: variables.obligationId, startedAt: Date.now() })
      },
      onSuccess: (result, variables) => {
        const queryOptions = orpc.obligations.getDeadlineTip.queryOptions({
          input: { obligationId: variables.obligationId },
        })
        queryClient.setQueryData(queryOptions.queryKey, result.insight)
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDeadlineTip.key() })
        toast.success(t`Deadline tip refresh started`)
      },
      onError: (err) => {
        setDeadlineTipRefresh(null)
        toast.error(t`Couldn't start deadline tip refresh`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const deadlineTipQuery = useQuery({
    ...orpc.obligations.getDeadlineTip.queryOptions({
      input: { obligationId: obligationId ?? '' },
    }),
    enabled: obligationId !== null,
    refetchInterval: (query) => {
      const insight = query.state.data
      if (!activeDeadlineTipRefresh) return insight?.status === 'pending' ? 5_000 : false

      const ageMs = Date.now() - activeDeadlineTipRefresh.startedAt
      if (ageMs >= DEADLINE_TIP_REFRESH_TIMEOUT_MS) return false

      const generatedAtMs = insight?.generatedAt ? Date.parse(insight.generatedAt) : 0
      const latestRefreshSettled =
        insight?.status !== 'pending' && generatedAtMs >= activeDeadlineTipRefresh.startedAt
      return latestRefreshSettled ? false : DEADLINE_TIP_REFRESH_POLL_INTERVAL_MS
    },
  })
  const detail = detailQuery.data
  const row = detail?.row ?? null
  // `obligationTypeLabels` lookup was retired with the header distill
  // (2026-05-21) — the "FILING" badge it backed is gone. If a future
  // surface wants the human label, re-add via `useObligationTypeLabels()`.
  // Type-aware drawer surface: per PRD §3.1 different obligation types
  // expose different tabs. A `payment` row has no readiness checklist;
  // a `client_action` row has no deadline readiness surface.
  const visibleTabsList = useMemo(
    () => tabsForObligationType(row?.obligationType ?? null),
    [row?.obligationType],
  )
  const visibleTabs = useMemo(() => new Set(visibleTabsList), [visibleTabsList])
  // If the URL pins a tab that this obligation type doesn't expose
  // (e.g. ?tab=extension on a payment row), bounce to the first tab
  // this type actually has. Otherwise the drawer body renders empty.
  useEffect(() => {
    if (row && !isTabVisibleForType(activeTab, row.obligationType)) {
      const fallback = visibleTabsList[0]
      if (fallback) onTabChange(fallback)
    }
  }, [row, activeTab, visibleTabsList, onTabChange])
  const deadlineTipInsight = deadlineTipQuery.data ?? null
  const deadlineTipGeneratedAtMs = deadlineTipInsight?.generatedAt
    ? Date.parse(deadlineTipInsight.generatedAt)
    : 0
  const deadlineTipLatestRefreshSettled = Boolean(
    activeDeadlineTipRefresh &&
    deadlineTipInsight?.status !== 'pending' &&
    deadlineTipGeneratedAtMs >= activeDeadlineTipRefresh.startedAt,
  )
  const deadlineTipRefreshTimedOut = Boolean(
    activeDeadlineTipRefresh &&
    !deadlineTipLatestRefreshSettled &&
    Date.now() - activeDeadlineTipRefresh.startedAt >= DEADLINE_TIP_REFRESH_TIMEOUT_MS,
  )
  const deadlineTipPreparing = Boolean(
    requestDeadlineTipMutation.isPending ||
    (activeDeadlineTipRefresh && !deadlineTipLatestRefreshSettled && !deadlineTipRefreshTimedOut),
  )
  // `deadlineTipPreparing` is currently unconsumed (Risk tab owned the
  // visual surface). Kept declared because the mutation/query
  // pipeline it summarizes is still wired; a follow-up should either
  // restore a deadline-tip surface elsewhere or rip the whole
  // pipeline. Tracked in TODO below.
  void deadlineTipPreparing
  const latestRequest = detail?.readinessRequests[0] ?? null
  const storedChecklist = detail?.readinessChecklist ?? EMPTY_DOCUMENT_CHECKLIST
  const extensionFilingDeadline = row?.filingDueDate ?? row?.baseDueDate ?? ''
  const internalTargetDateInvalid = row
    ? !isInternalExtensionTargetDateValid(
        extensionDraft.internalTargetDate,
        extensionFilingDeadline,
      )
    : false
  const fiscalYearEnd = fiscalYearEndParts(taxYearDraft.fiscalYearEndDate)
  const taxYearFiscalMissing =
    taxYearDraft.taxYearType === 'fiscal' && !taxYearDraft.fiscalYearEndDate.trim()
  const taxYearFiscalInvalid =
    taxYearDraft.taxYearType === 'fiscal' &&
    Boolean(taxYearDraft.fiscalYearEndDate) &&
    !fiscalYearEnd
  const taxYearProfileChanged = Boolean(
    row &&
    (taxYearDraft.taxYearType !== row.taxYearType ||
      (taxYearDraft.taxYearType === 'fiscal' &&
        (fiscalYearEnd?.month !== row.fiscalYearEndMonth ||
          fiscalYearEnd?.day !== row.fiscalYearEndDay)) ||
      (taxYearDraft.taxYearType === 'calendar' &&
        (row.fiscalYearEndMonth !== null || row.fiscalYearEndDay !== null))),
  )
  const taxYearProfileSummary =
    row?.taxYearType === 'fiscal' && row.fiscalYearEndMonth && row.fiscalYearEndDay
      ? `${t`Fiscal year`} · ${formatFiscalYearEnd(row.fiscalYearEndMonth, row.fiscalYearEndDay)}`
      : t`Calendar year`
  const taxYearProfileEditable = Boolean(row?.taxYearProfileEditable)

  if (row && extensionDraft.obligationId !== row.id) {
    setExtensionDraft({
      obligationId: row.id,
      memo: row.extensionMemo ?? '',
      source: row.extensionSource ?? '',
      internalTargetDate: row.extensionInternalTargetDate ?? '',
    })
  }
  if (row && taxYearDraft.obligationId !== row.id) {
    setTaxYearDraft({
      obligationId: row.id,
      taxYearType: row.taxYearType,
      fiscalYearEndDate: fiscalYearEndDraftValue(row.fiscalYearEndMonth, row.fiscalYearEndDay),
    })
  }

  function invalidateDetail() {
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDeadlineTip.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
  }

  const generateChecklistMutation = useMutation(
    orpc.readiness.generateChecklist.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        toast.success(
          result.degraded ? t`Fallback document list ready` : t`Document list generated`,
        )
      },
      onError: (err) => {
        toast.error(t`Couldn't generate document list`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const shouldAutoGenerateChecklist = Boolean(
    row && visibleTabs.has('readiness') && !generateChecklistMutation.isPending,
  )
  const autoGenerateChecklistMutationOptions = orpc.readiness.generateChecklist.mutationOptions()
  const autoGenerateChecklistQuery = useQuery({
    queryKey: ['obligations', 'readiness-checklist', 'auto-generate', row?.id ?? null],
    queryFn: async () => {
      const activeObligationId = row?.id
      const mutationFn = autoGenerateChecklistMutationOptions.mutationFn
      if (!activeObligationId || !mutationFn) throw new Error('Checklist generation unavailable.')
      const result = await mutationFn(
        { obligationId: activeObligationId },
        {
          client: queryClient,
          meta: autoGenerateChecklistMutationOptions.meta,
        },
      )
      invalidateDetail()
      return { obligationId: activeObligationId, result }
    },
    enabled: shouldAutoGenerateChecklist,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })
  const autoGeneratedChecklist =
    row && autoGenerateChecklistQuery.data?.obligationId === row.id
      ? autoGenerateChecklistQuery.data.result.checklist
      : null
  const checklist =
    storedChecklist.length > 0 ? storedChecklist : (autoGeneratedChecklist ?? storedChecklist)
  const checklistGenerating =
    generateChecklistMutation.isPending || autoGenerateChecklistQuery.isFetching
  const sendRequestMutation = useMutation(
    orpc.readiness.sendRequest.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        toast.success(result.emailQueued ? t`Readiness request sent` : t`Readiness link created`)
      },
      onError: (err) => {
        toast.error(t`Couldn't send readiness request`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const addChecklistItemMutation = useMutation(
    orpc.readiness.addChecklistItem.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
        toast.success(t`Document item added`)
      },
      onError: (err) => {
        toast.error(t`Couldn't add document item`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const updateChecklistItemMutation = useMutation(
    orpc.readiness.updateChecklistItem.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
      },
      onError: (err) => {
        toast.error(t`Couldn't update document item`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const deleteChecklistItemMutation = useMutation(
    orpc.readiness.deleteChecklistItem.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
        toast.success(t`Document item removed`)
      },
      onError: (err) => {
        toast.error(t`Couldn't remove document item`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const revokeRequestMutation = useMutation(
    orpc.readiness.revokeRequest.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
        toast.success(t`Readiness request revoked`)
      },
      onError: (err) => {
        toast.error(t`Couldn't revoke request`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const updateTaxYearProfileMutation = useMutation(
    orpc.obligations.updateTaxYearProfile.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        toast.success(t`Tax year profile saved`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't save tax year profile`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const decideExtensionMutation = useMutation(
    orpc.obligations.decideExtension.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        setExtensionSaveSuccessOpen(true)
        if (extensionSaveSuccessTimeoutRef.current !== null) {
          window.clearTimeout(extensionSaveSuccessTimeoutRef.current)
        }
        extensionSaveSuccessTimeoutRef.current = window.setTimeout(() => {
          setExtensionSaveSuccessOpen(false)
          extensionSaveSuccessTimeoutRef.current = null
        }, EXTENSION_SAVE_SUCCESS_TOOLTIP_MS)
        toast.success(t`Extension plan saved`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't save extension plan`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const saveExtensionPlanDisabled =
    !row ||
    !canSaveInternalExtensionPlan({
      draftTargetDate: extensionDraft.internalTargetDate,
      filingDeadline: extensionFilingDeadline,
      isPending: decideExtensionMutation.isPending,
      memo: extensionDraft.memo,
    })
  // Lifecycle v2 slice 2d.3: manual acceptance — when a filed return has
  // been accepted by the authority (e-file accepted / paper return
  // received with no rejection), the preparer marks it complete from the
  // drawer header. Closes the "Filed ≠ Done" loop (PDF anti-pattern #3).
  const markAcceptedMutation = useMutation(
    orpc.obligations.updateStatus.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        toast.success(t`Marked accepted`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't mark accepted`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  // PDF anti-pattern #3 (Filed ≠ Done): when the IRS / state rejects an
  // e-filed return, the preparer unwinds the row from `done` ("Filed")
  // back to `review` ("In review") with an `efile_rejected_at` stamp.
  // The Rejected chip auto-renders on the queue thereafter.
  const markFiledRejectedMutation = useMutation(
    orpc.obligations.markFiledRejected.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        toast.success(t`Marked e-file rejected`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't mark e-file rejected`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  // Generic status-change mutation — drives BOTH the contextual
  // forward buttons (Start preparation / Mark docs received / Mark
  // unblocked / Mark filed) AND the interactive status pill in the
  // drawer header. Toast copy uses the destination label so the CPA
  // gets the same feedback regardless of how the transition fired.
  // Kept distinct from markAcceptedMutation / markFiledRejectedMutation
  // because those have specific authority-acceptance/-rejection
  // semantics (different RPC procedure for rejection) and bespoke
  // toast copy worth preserving.
  const changeStatusMutation = useMutation(
    orpc.obligations.updateStatus.mutationOptions({
      onSuccess: (result, vars) => {
        invalidateDetail()
        toast.success(t`Status changed to ${statusLabels[vars.status]}`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't change status`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  // `updateBlockedByMutation` retired 2026-05-21 with the K-1 editor.
  // The RPC procedure (orpc.obligations.updateBlockedBy) still ships;
  // re-bind here when the new blocker UX lands.
  function updateDocumentChecklistItem(
    itemId: string,
    patch: {
      label?: string
      description?: string | null
      status?: ReadinessDocumentChecklistItemPublic['status']
      note?: string | null
    },
  ) {
    updateChecklistItemMutation.mutate({ itemId, ...patch })
  }

  function addChecklistItem() {
    if (!row) return
    addChecklistItemMutation.mutate({
      obligationId: row.id,
      label: t`Custom document`,
      description: null,
    })
  }

  function removeChecklistItem(itemId: string) {
    deleteChecklistItemMutation.mutate({ itemId })
  }

  function copyLatestLink() {
    if (!latestRequest?.portalUrl) return
    void navigator.clipboard.writeText(latestRequest.portalUrl)
    toast.success(t`Portal link copied`)
  }

  function saveTaxYearProfile() {
    if (!row || !taxYearProfileEditable) return
    updateTaxYearProfileMutation.mutate({
      id: row.id,
      taxYearType: taxYearDraft.taxYearType,
      fiscalYearEndMonth:
        taxYearDraft.taxYearType === 'fiscal' ? (fiscalYearEnd?.month ?? null) : null,
      fiscalYearEndDay: taxYearDraft.taxYearType === 'fiscal' ? (fiscalYearEnd?.day ?? null) : null,
      reason: 'Obligation readiness tax year profile edit',
    })
  }

  function saveExtensionDecision() {
    if (!row) return
    if (!extensionDraft.internalTargetDate) {
      toast.error(t`Internal extension target date is required.`)
      return
    }
    if (extensionDraft.memo.trim().length === 0) {
      toast.error(t`Decision memo is required.`)
      return
    }
    if (internalTargetDateInvalid) {
      toast.error(t`Internal extension target date must be on or before the filing deadline.`)
      return
    }

    decideExtensionMutation.mutate({
      id: row.id,
      memo: extensionDraft.memo.trim(),
      ...(extensionDraft.source.trim() ? { source: extensionDraft.source.trim() } : {}),
      internalTargetDate: extensionDraft.internalTargetDate,
    })
  }

  // The visible heading is shared with the drawer body. SheetTitle
  // stays sr-only below so Radix Dialog gets its accessible name
  // without duplicating header chrome.
  const titleText = row?.clientName ?? null
  const body = (
    <>
      {/* Header — distilled 2026-05-21. Old shape stacked client name
          + 7 metadata chips + 2 deadline rows + "Open client detail"
          link + maybe a 2-button CTA cluster. At 440px panel width
          everything wrapped into 5+ lines of chrome. New shape:
            line 1: client name (h2) + close X
            line 2: Form code · TY year · jurisdiction code (one row)
            line 3: status pill (matches queue's colored pill) + Open client
            line 4: action CTAs (Mark accepted / Reject) only when status==done/paid
          Internal/statutory deadlines moved entirely to the Dates
          panel below — they were duplicated. */}
      <header className="relative flex flex-col gap-2 border-b border-divider-subtle px-5 py-4">
        {/* Panel mode owns its own close button — there's no Sheet
            wrapper providing one. Sheet mode skips this since Radix's
            SheetContent already renders an X in the top-right corner. */}
        {mode === 'panel' ? (
          <button
            type="button"
            aria-label={t`Close obligation detail`}
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-md text-text-tertiary outline-none hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        ) : null}
        {/* 2026-05-21: the whole h2 + arrow is a single click target.
            Hovering the client name highlights the arrow blue (group
            hover) — the entire title reads as "open the client" not
            just the tiny ↗ icon. Title attribute carries the verb. */}
        {row?.clientId && row.clientName ? (
          <button
            type="button"
            aria-label={t`Open ${row.clientName}`}
            title={t`Open ${row.clientName}`}
            onClick={() => openClientDrawer(row.clientId)}
            className="group/clientlink inline-flex w-fit items-baseline gap-1.5 rounded-sm pr-8 text-left outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <h2 className="text-lg font-semibold leading-tight text-text-primary transition-colors group-hover/clientlink:text-text-accent">
              {titleText}
            </h2>
            <ArrowUpRightIcon
              aria-hidden
              className="size-3.5 shrink-0 text-text-tertiary transition-colors group-hover/clientlink:text-text-accent"
            />
          </button>
        ) : row?.clientId ? (
          <div className="flex items-baseline gap-1.5 pr-8">
            <h2 className="text-lg font-semibold leading-tight text-text-primary">
              {titleText ?? <Trans>Obligation detail</Trans>}
            </h2>
            <span
              aria-label={t`Client record missing`}
              title={t`Client record missing — obligation may be orphaned`}
              className="inline-flex items-center text-text-warning"
            >
              <AlertTriangleIcon className="size-3.5" aria-hidden />
            </span>
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5 pr-8">
            <h2 className="text-lg font-semibold leading-tight text-text-primary">
              {titleText ?? <Trans>Obligation detail</Trans>}
            </h2>
          </div>
        )}
        {row ? (
          <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-text-tertiary">
            <span className="font-medium text-text-secondary">
              <TaxCodeLabel code={row.taxType} />
            </span>
            {row.taxYear ? (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums">
                  <Trans>TY {row.taxYear}</Trans>
                </span>
              </>
            ) : null}
            {row.jurisdiction ? (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{row.jurisdiction}</span>
              </>
            ) : null}
          </p>
        ) : null}
        {row ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {/* Status pill — now INTERACTIVE in the drawer (was a
                static span pre-2026-05-21). Re-uses the same control
                that drives the queue row's status pill, so the
                drawer + queue share one mutation path, one legal-
                transition policy, and one keyboard a11y surface.
                Clicking opens a dropdown of all reachable statuses;
                illegal transitions render as disabled with a
                tooltip explaining why. */}
            <ObligationQueueStatusControl
              row={row}
              labels={statusLabels}
              statuses={statusDropdownOptions}
              disabled={changeStatusMutation.isPending}
              onChange={(id, status) => changeStatusMutation.mutate({ id, status })}
            />
          </div>
        ) : null}
        {/* 2026-05-23: dropped the canonical-forward-action row
            (`ObligationDrawerStatusActions`) per critique. The
            interactive `ObligationQueueStatusControl` chip above
            already exposes every valid transition with one click;
            adding a second forward-action button below it created
            redundant affordances ("Start preparation" + "pending →
            review" picker dropdown both go to the same place).
            Status pill is the single source of truth now. */}
      </header>
      {/* Body — in panel mode the aside has fixed height, so this
          inner div owns the scrolling. That lets the snapshot block
          (milestones + dates) pin via `sticky top-0` to stay visible
          while the Readiness checklist / Evidence rows scroll
          underneath. Sheet mode (mobile) keeps a single document
          scroll: SheetContent has overflow-y-auto, so we don't
          double-scroll here. */}
      <div className={cn('px-5 pb-5 pt-4', mode === 'panel' && 'flex-1 min-h-0 overflow-y-auto')}>
        {detailQuery.isLoading ? (
          <div className="rounded-lg border border-dashed border-divider-regular py-8 text-center text-sm text-text-tertiary">
            <Trans>Loading obligation detail…</Trans>
          </div>
        ) : detailQuery.isError || !detail || !row ? (
          <div className="rounded-lg border border-state-destructive-border bg-state-destructive-hover p-4 text-sm text-text-destructive">
            <Trans>Couldn't load obligation detail.</Trans>{' '}
            <button type="button" className="underline" onClick={() => void detailQuery.refetch()}>
              <Trans>Retry</Trans>
            </button>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (isObligationQueueDetailTab(value)) onTabChange(value)
            }}
          >
            {/* Snapshot — Phase 2 distillation (2026-05-21):
                - Path-to-Filing chevron collapsed to a one-line stage
                  summary. Full chevron lives on the Timeline tab now.
                  At 440px panel width, 5 milestones × 4 elements each
                  was unreadable.
                - Dates panel compressed to 2-column grid (was 4-col).
                - Dropped the bg-background-section card wrapper — the
                  snapshot doesn't need to be visually elevated.
                - Snapshot + TabsList pinned via `sticky top-0` in
                  panel mode so milestones, dates and tab nav stay
                  visible while Readiness / Evidence rows scroll
                  underneath. Negative `-mx-5 -mt-4` lets the sticky
                  bg occlude content scrolling past on the gutters.
                See docs/Design/obligation-drawer-ux-audit-2026-05-21.md. */}
            <div
              className={cn(
                'flex flex-col gap-3',
                mode === 'panel'
                  ? 'sticky top-0 z-10 -mx-5 -mt-4 bg-background-subtle px-5 pb-3 pt-4'
                  : 'mb-4',
              )}
            >
              {/* PathToFilingSummary now renders for ALL rows. Terminal
                  rows benefit from seeing the dated history of each
                  milestone (when did we hit Collecting, Preparing,
                  Signature, Filed) — that's the audit-defense story.
                  The closed summary handles the terminal case by
                  switching to a "Milestones complete" label so it
                  doesn't read as a duplicate of the header status
                  pill. */}
              <PathToFilingSummary row={row} auditEvents={detail.auditEvents} />
              {/* ActiveStageDetailCard (2026-05-21 prototype): zoom on
                  the row's current stage — sub-status + canonical
                  "what's next" task list + audit-derived "done this
                  stage" trail. Sits between the milestone overview
                  and the dates list so the CPA reads
                  visual-overview → stage-context → calendar-context. */}
              <ActiveStageDetailCard
                row={row}
                auditEvents={detail.auditEvents}
                readinessChecklist={detail.readinessChecklist}
                onChangeTab={(nextTab) => onTabChange(nextTab)}
                onChangeStatus={(nextStatus) =>
                  changeStatusMutation.mutate({ id: row.id, status: nextStatus })
                }
                onConfirmAcceptance={() =>
                  markAcceptedMutation.mutate({ id: row.id, status: 'completed' })
                }
                onRecordRejection={() => markFiledRejectedMutation.mutate({ id: row.id })}
              />
              <StatutoryDatesPanel row={row} />
              {/* `ObligationForwardingPanel` removed 2026-05-21 — the
                  "Forward to task · bright-studio-…@duedatehq.com · Phase 2"
                  block was a feature stub crowding the drawer with chrome
                  for capability that isn't shipping yet. Restore when the
                  inbound-file routing actually goes live. */}
            </div>
            {/* TabsList lives OUTSIDE the sticky snapshot block per
                critique #4 ("shouldn't the tab belong to the
                following information, not the top part information").
                Pulled out so the tabs visually group with the
                TabsContent they control, not with the milestones /
                dates above. Tradeoff: tabs scroll away with the body
                rather than staying pinned. In practice the CPA
                rarely switches tabs mid-scroll on the same
                obligation, so the visual clarity wins. A subtle
                border-t separates the tab row from the snapshot
                above. */}
            <div className="border-t border-divider-regular pt-3">
              <TabsList className="flex w-full flex-wrap justify-start">
                {visibleTabs.has('readiness') ? (
                  <TabsTrigger value="readiness">
                    <Trans>Readiness</Trans>
                  </TabsTrigger>
                ) : null}
                {visibleTabs.has('extension') ? (
                  <TabsTrigger value="extension">
                    <Trans>Extension</Trans>
                  </TabsTrigger>
                ) : null}
                {/* Risk tab removed 2026-05-21 — risk inputs live on the
                client detail page (ClientRiskInputsPanel) rather than
                per-obligation. Surface kept on the schema for
                back-compat with deep-links; the trigger and content
                are unmounted. */}
                {visibleTabs.has('evidence') ? (
                  <TabsTrigger value="evidence">
                    <Trans>Evidence</Trans>
                  </TabsTrigger>
                ) : null}
                {/* Timeline/Audit tab removed 2026-05-21 — the
                  path-to-filing milestones live inside the snapshot
                  block's PathToFilingSummary disclosure; the prior
                  Audit feed was rarely the user's current job. Bring
                  it back via a header overflow menu if a CPA asks
                  for the raw event stream again. */}
              </TabsList>
            </div>
            <TabsContent value="readiness">
              <div className="grid gap-3">
                {/* Top-of-tab summary — explains what readiness IS
                        + shows the at-a-glance state (PRD §3.2 says the
                        biggest deadline risk isn't "CPA doesn't know the
                        date," it's "CPA doesn't have enough info to
                        finish the return"). This anchor + the per-item
                        rows below replace the prior right sidebar. */}
                <ReadinessOverview
                  row={row}
                  latestRequest={latestRequest ?? null}
                  checklistCount={checklist.length}
                  receivedCount={checklist.filter((item) => item.status === 'received').length}
                />
                {/* Three-class deadline display (PRD §7.2 + §3.2):
                        client-action chip when a readiness request is
                        outstanding. The other two classes (statutory,
                        firm-internal) live in the drawer header. */}
                {latestRequest && latestRequest.status !== 'revoked' ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className="border-state-warning-border bg-state-warning-hover text-text-warning"
                    >
                      <Trans>
                        Client response due {formatDate(latestRequest.expiresAt.slice(0, 10))}
                      </Trans>
                    </Badge>
                    <span className="text-text-tertiary">
                      <Trans>· firm-set deadline for this readiness request</Trans>
                    </span>
                  </div>
                ) : null}
                {/* K-1 / parent-obligation blocker editor removed
                    2026-05-21 — it surfaced as a full picker on every
                    drawer open, even when not blocked. The queue row's
                    <BlockedByChip> still shows when a blocker is set,
                    so the signal isn't lost. A better re-home (header
                    chip + on-demand picker, or auto-detected from
                    related-entity rows) is parked for a later pass —
                    see docs/Design/obligation-drawer-ux-audit-2026-05-21.md. */}
                {/* Action hierarchy — 2026-05-21 redesign:
                    - Empty checklist → single primary "Generate document
                      list" CTA. The other two buttons (Add item, Send to
                      client) are useless here, so they're hidden.
                    - Populated checklist → "Send to client" is the
                      primary CTA on its own line; "Add item" demoted
                      to a quiet text+icon button next to the heading.
                    The old version stacked all three buttons at equal
                    weight regardless of state, so the actual workflow
                    goal (send the request) had to fight Generate +
                    Add item for the user's eye. */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      <Trans>Documents received</Trans>
                    </span>
                    {checklist.length > 0 ? (
                      <span className="tabular-nums text-xs text-text-tertiary">
                        <Plural value={checklist.length} one="# item" other="# items" />
                      </span>
                    ) : null}
                  </div>
                  {checklist.length > 0 ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={addChecklistItem}
                      disabled={
                        checklistGenerating ||
                        addChecklistItemMutation.isPending ||
                        checklist.length >= 30
                      }
                    >
                      <PlusIcon data-icon="inline-start" />
                      <Trans>Add item</Trans>
                    </Button>
                  ) : null}
                </div>
                {checklist.length === 0 ? (
                  autoGenerateChecklistQuery.isFetching ? (
                    <div className="grid gap-3 rounded-lg border border-dashed border-divider-regular p-4 text-sm text-text-secondary">
                      <div className="flex items-center gap-2">
                        <RefreshCwIcon className="size-4 animate-spin" aria-hidden />
                        <span>
                          <Trans>Preparing</Trans>
                        </span>
                      </div>
                    </div>
                  ) : autoGenerateChecklistQuery.isError ? (
                    <EmptyPanel>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span>
                          <Trans>Couldn't generate document list</Trans>
                        </span>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => void autoGenerateChecklistQuery.refetch()}
                        >
                          <Trans>Retry</Trans>
                        </Button>
                      </div>
                    </EmptyPanel>
                  ) : (
                    // Empty state — single primary CTA (Generate) sits
                    // inside the empty panel as the obvious next step.
                    // "Add item" is demoted to a small text link below
                    // for users who want to bypass the AI generation.
                    <div className="grid gap-3 rounded-lg border border-dashed border-divider-regular p-4 text-center text-sm text-text-secondary">
                      <p className="text-text-tertiary">
                        <Trans>
                          No documents listed yet. Generate an AI checklist or add items manually.
                        </Trans>
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            generateChecklistMutation.mutate({
                              obligationId: row.id,
                            })
                          }
                          disabled={checklistGenerating}
                        >
                          <RefreshCwIcon
                            data-icon="inline-start"
                            className={cn(checklistGenerating ? 'animate-spin' : undefined)}
                          />
                          {checklistGenerating ? (
                            <Trans>Preparing</Trans>
                          ) : (
                            <Trans>Generate document list</Trans>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={addChecklistItem}
                          disabled={
                            checklistGenerating ||
                            addChecklistItemMutation.isPending ||
                            checklist.length >= 30
                          }
                        >
                          <PlusIcon data-icon="inline-start" />
                          <Trans>Add item manually</Trans>
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    <div className="grid gap-2">
                      {checklist.map((item) => {
                        const response =
                          latestRequest?.responses.find((r) => r.itemId === item.id) ?? null
                        return (
                          <ChecklistItemRow
                            key={`${item.id}:${item.updatedAt}`}
                            item={item}
                            response={response}
                            pending={updateChecklistItemMutation.isPending}
                            onStatusChange={(status) =>
                              updateDocumentChecklistItem(item.id, { status })
                            }
                            onLabelCommit={(label) =>
                              updateDocumentChecklistItem(item.id, { label })
                            }
                            onDescriptionCommit={(description) =>
                              updateDocumentChecklistItem(item.id, {
                                description: description || null,
                              })
                            }
                            onNoteCommit={(note) =>
                              updateDocumentChecklistItem(item.id, { note: note || null })
                            }
                            onRemove={() => removeChecklistItem(item.id)}
                          />
                        )
                      })}
                    </div>
                    {/* Primary CTA below the checklist — the actual
                        workflow terminal action. Promoted from the
                        cluster at the top so the user's eye lands on
                        it after reading the list of items they're
                        requesting. Disabled if a request is already
                        pending out to the client (no implicit resend). */}
                    {!latestRequest || latestRequest.status === 'revoked' ? (
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          onClick={() =>
                            sendRequestMutation.mutate({
                              obligationId: row.id,
                            })
                          }
                          disabled={sendRequestMutation.isPending || checklist.length === 0}
                        >
                          <SendIcon data-icon="inline-start" />
                          <Trans>Send to client</Trans>
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
                {/* Sent request panel — visible only after a
                        request has been sent. Combines the prior
                        sidebar's portal buttons + revoke action into
                        one block at the bottom of the checklist. */}
                {latestRequest ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-divider-subtle bg-background-section p-3">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {latestRequest.status}
                    </Badge>
                    <span className="text-xs text-text-secondary">
                      <Trans>
                        Sent to {latestRequest.recipientEmail ?? t`client`} · expires{' '}
                        {formatDate(latestRequest.expiresAt.slice(0, 10))}
                      </Trans>
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {latestRequest.portalUrl ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={copyLatestLink}>
                            <CopyIcon data-icon="inline-start" />
                            <Trans>Copy link</Trans>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            render={
                              <a href={latestRequest.portalUrl} target="_blank" rel="noreferrer" />
                            }
                          >
                            <ExternalLinkIcon data-icon="inline-start" />
                            <Trans>Open portal</Trans>
                          </Button>
                        </>
                      ) : null}
                      {latestRequest.status !== 'revoked' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            revokeRequestMutation.mutate({ requestId: latestRequest.id })
                          }
                          disabled={revokeRequestMutation.isPending}
                        >
                          <Trans>Revoke</Trans>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {/* Tax year profile — relocated 2026-05-21 from the
                    top of the tab (where it dominated daily-driver
                    workflow) to a settings-style footer behind a
                    disclosure. Auto-opens when the profile is
                    incomplete (fiscal year selected without an end
                    date), so a CPA who needs to fix it sees it
                    surface naturally. Otherwise it stays collapsed —
                    one-time setup that rarely needs revisiting. */}
                {taxYearProfileEditable ? (
                  <details
                    className="mt-2 rounded-lg border border-divider-subtle"
                    open={taxYearFiscalMissing || taxYearFiscalInvalid}
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-tertiary outline-none hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt">
                      <span>
                        <Trans>Tax year profile</Trans>
                      </span>
                      <Badge variant="outline" className="text-[10px] normal-case tracking-normal">
                        {taxYearProfileSummary}
                      </Badge>
                    </summary>
                    <div className="grid gap-2 border-t border-divider-subtle px-3 py-3">
                      <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                        <Select
                          value={taxYearDraft.taxYearType}
                          onValueChange={(value) => {
                            if (value === 'calendar' || value === 'fiscal') {
                              setTaxYearDraft((current) => ({ ...current, taxYearType: value }))
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="calendar">
                              <Trans>Calendar year</Trans>
                            </SelectItem>
                            <SelectItem value="fiscal">
                              <Trans>Fiscal year</Trans>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={taxYearDraft.fiscalYearEndDate}
                          disabled={taxYearDraft.taxYearType === 'calendar'}
                          aria-label={t`Fiscal year end`}
                          aria-invalid={taxYearFiscalMissing || taxYearFiscalInvalid}
                          inputMode="numeric"
                          placeholder="MM/DD"
                          onBlur={(event) => {
                            const nextFiscalYearEnd = fiscalYearEndParts(event.currentTarget.value)
                            if (nextFiscalYearEnd) {
                              setTaxYearDraft((current) => ({
                                ...current,
                                fiscalYearEndDate: formatFiscalYearEnd(
                                  nextFiscalYearEnd.month,
                                  nextFiscalYearEnd.day,
                                ),
                              }))
                            }
                          }}
                          onChange={(event) =>
                            setTaxYearDraft((current) => ({
                              ...current,
                              fiscalYearEndDate: event.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          className="w-fit"
                          onClick={saveTaxYearProfile}
                          disabled={
                            !taxYearProfileChanged ||
                            taxYearFiscalMissing ||
                            taxYearFiscalInvalid ||
                            updateTaxYearProfileMutation.isPending
                          }
                        >
                          {updateTaxYearProfileMutation.isPending ? (
                            <Trans>Saving...</Trans>
                          ) : (
                            <Trans>Save</Trans>
                          )}
                        </Button>
                      </div>
                      {taxYearFiscalMissing ? (
                        <p className="text-xs text-text-destructive">
                          <Trans>Fiscal-year obligations require a year end.</Trans>
                        </p>
                      ) : null}
                      {taxYearFiscalInvalid ? (
                        <p className="text-xs text-text-destructive">
                          <Trans>Use a valid month and day.</Trans>
                        </p>
                      ) : null}
                    </div>
                  </details>
                ) : null}
              </div>
            </TabsContent>
            <TabsContent value="extension">
              <div className="grid gap-3">
                <AlertPanel>
                  <Trans>
                    This saves the firm's internal extension plan for this obligation. The internal
                    target date must be on or before the filing deadline. It does not update the due
                    date, change client records, or confirm an authority filing. Payment may still
                    be due by the original date.
                  </Trans>
                </AlertPanel>
                <div className="grid gap-2 rounded-lg border border-divider-regular p-3">
                  <h3 className="text-sm font-medium text-text-primary">
                    <Trans>Example</Trans>
                  </h3>
                  <DetailRow
                    label={<Trans>Rule extension policy</Trans>}
                    value={
                      detail.matchedRule?.extensionPolicy.available
                        ? t`Rule allows extension`
                        : t`No rule extension or unknown`
                    }
                  />
                  <DetailRow
                    label={<Trans>Official form or method</Trans>}
                    value={detail.matchedRule?.extensionPolicy.formName ?? t`Not specified`}
                  />
                  <DetailRow
                    label={<Trans>Rule notes</Trans>}
                    value={detail.matchedRule?.extensionPolicy.notes ?? t`No matched rule`}
                  />
                </div>
                <IsoDatePicker
                  value={extensionDraft.internalTargetDate}
                  invalid={internalTargetDateInvalid}
                  maxIsoDate={extensionFilingDeadline}
                  ariaLabel={t`Internal extension target date`}
                  placeholder={t`Internal extension target date`}
                  onValueChange={(internalTargetDate) =>
                    setExtensionDraft((current) => ({ ...current, internalTargetDate }))
                  }
                />
                <Input
                  aria-label={t`Extension source`}
                  placeholder={t`Source or confirmation reference`}
                  value={extensionDraft.source}
                  onChange={(event) =>
                    setExtensionDraft((current) => ({ ...current, source: event.target.value }))
                  }
                />
                <Textarea
                  aria-label={t`Decision memo`}
                  aria-required="true"
                  placeholder={t`Decision memo (required)`}
                  value={extensionDraft.memo}
                  onChange={(event) =>
                    setExtensionDraft((current) => ({ ...current, memo: event.target.value }))
                  }
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Tooltip open={extensionSaveSuccessOpen}>
                    <TooltipTrigger
                      render={
                        <span className="inline-flex w-fit">
                          <Button
                            className="w-fit"
                            onClick={saveExtensionDecision}
                            disabled={saveExtensionPlanDisabled}
                          >
                            <Trans>Save Extension</Trans>
                          </Button>
                        </span>
                      }
                    />
                    <TooltipContent>
                      <Trans>Extension plan saved</Trans>
                    </TooltipContent>
                  </Tooltip>
                  {/* Decided-at hint replaces the prior right-sidebar
                          status block. Current status + internal target
                          date were duplicates of the drawer header + the
                          form fields above; only "Decided at" was unique
                          info, so it lives here as a quiet footnote. */}
                  {row.extensionDecidedAt ? (
                    <span className="text-xs text-text-tertiary">
                      <Trans>
                        Last decided{' '}
                        {formatDateTimeWithTimezone(row.extensionDecidedAt, practiceTimezone)}
                      </Trans>
                    </span>
                  ) : null}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="evidence">
              {/* Evidence tab split into two visually-distinct sections
                  (2026-05-21):
                    - WORKPAPERS (top, default open): client-attached
                      files and submissions. This is the daily-driver
                      question — "what do we have on hand?"
                    - AUTHORITY (bottom, collapsed): the deadline's
                      source-of-truth chain (matched rule + IRS / state
                      citations). Used during audit defense, not day-
                      to-day. Folded behind <details> so it doesn't
                      compete with workpapers for the user's eye.
                  Previously both were under one "Evidence" heading,
                  which forced users to scroll past authority citations
                  to find the workpapers they actually wanted. */}
              <div className="grid gap-4">
                <section aria-labelledby="evidence-workpapers-heading" className="grid gap-2 pt-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3
                      id="evidence-workpapers-heading"
                      className="text-xs font-medium uppercase tracking-wider text-text-tertiary"
                    >
                      <Trans>Workpapers</Trans>
                    </h3>
                    {detail.evidence.length > 0 ? (
                      <span className="tabular-nums text-xs text-text-tertiary">
                        <Plural value={detail.evidence.length} one="# item" other="# items" />
                      </span>
                    ) : null}
                  </div>
                  {detail.evidence.length > 0 ? (
                    <div className="grid gap-2">
                      {detail.evidence.map((item) => (
                        <EvidenceInlineItem
                          key={item.id}
                          item={item}
                          practiceTimezone={practiceTimezone}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyPanel>
                      <Trans>No workpapers attached to this obligation yet.</Trans>
                    </EmptyPanel>
                  )}
                </section>

                <details className="group rounded-lg border border-divider-subtle">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-tertiary outline-none hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt">
                    <span>
                      <Trans>Authority citation</Trans>
                    </span>
                    {detail.matchedRule ? (
                      <Badge variant="outline" className="text-[10px] normal-case tracking-normal">
                        {detail.matchedRule.id}
                        {row?.ruleVersion ? ` · v${row.ruleVersion}` : ''}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-state-warning-border text-[10px] normal-case tracking-normal text-text-warning"
                      >
                        <Trans>No rule bound</Trans>
                      </Badge>
                    )}
                  </summary>
                  <div className="grid gap-2 border-t border-divider-subtle px-3 py-3">
                    {detail.matchedRule ? (
                      <div className="grid gap-1">
                        <p className="text-sm font-medium text-text-primary">
                          {detail.matchedRule.title}
                        </p>
                        <p className="text-xs leading-snug text-text-secondary">
                          {detail.matchedRule.defaultTip}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs leading-snug text-text-tertiary">
                        <Trans>
                          This obligation isn't bound to a rule. Deadlines without a source citation
                          can't be defended in audit — bind it before relying on the date.
                        </Trans>
                      </p>
                    )}
                    {detail.matchedRule?.evidence.length ? (
                      <div className="grid gap-2 pt-1">
                        {detail.matchedRule.evidence.map((item) => (
                          <div
                            key={`${item.sourceId}-${item.summary}`}
                            className="grid gap-1 rounded-md border border-divider-subtle p-3"
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-sm font-medium text-text-primary">
                                {item.summary}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase tracking-wide"
                              >
                                {item.authorityRole}
                              </Badge>
                            </div>
                            <p className="text-xs leading-snug text-text-secondary">
                              "{item.sourceExcerpt}"
                            </p>
                            <p className="text-[11px] text-text-tertiary">
                              <Trans>
                                Source #{item.sourceId} · retrieved {item.retrievedAt}
                              </Trans>
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </details>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
      {row ? (
        <div className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-divider-subtle bg-background-default px-5 py-3">
          <span className="text-xs text-text-tertiary">
            {/* Compact provenance line: when was the row last touched
                  and by what action. Reuses formatDateTimeWithTimezone
                  for consistency with the rest of the drawer. */}
            <Trans>
              Last updated {formatDateTimeWithTimezone(row.updatedAt, practiceTimezone)}
            </Trans>
          </span>
          <div className="flex items-center gap-2">
            {/* Footer CTA used to duplicate the header's "Open client
                  detail" link. Repurposed as the shareability slot —
                  copies a deep link that round-trips to the same
                  obligation + tab the user is reading right now. */}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const url = new URL(window.location.href)
                url.search = new URLSearchParams({
                  id: row.id,
                  drawer: 'obligation',
                  tab: activeTab,
                }).toString()
                try {
                  await navigator.clipboard.writeText(url.toString())
                  toast.success(t`Link copied`)
                } catch {
                  toast.error(t`Couldn't copy link — your browser blocked clipboard access.`)
                }
              }}
            >
              <LinkIcon data-icon="inline-start" />
              <Trans>Copy link</Trans>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <Trans>Close</Trans>
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )

  // Two render modes:
  //   - 'panel' (new — used by /obligations): a persistent right-rail
  //     aside that lives inside the route layout. No backdrop, no focus
  //     trap, no scroll lock — the queue stays interactive next to it.
  //     The component owns its own X close button (above) since there's
  //     no Sheet wrapper providing one.
  //   - 'sheet' (legacy / cross-surface — used by ObligationDrawerProvider
  //     for dashboard, /clients, etc.): the modal Radix Sheet with
  //     backdrop, focus trap, slide-in animation. Each surface picks
  //     its mode via the `mode` prop.
  if (mode === 'panel') {
    if (obligationId === null) return null
    return (
      <aside
        aria-label={titleText ?? t`Obligation detail`}
        // Subtle tinted background distinguishes the panel from the
        // table area beside it. Inner snapshot is now pinned via
        // sticky positioning (2026-05-21): the aside itself stops
        // scrolling; only the tabs-content area scrolls underneath,
        // so a user 30 docs deep in the Readiness checklist still
        // sees what row they're on.
        className="flex h-full min-w-0 flex-col rounded-lg border border-divider-subtle bg-background-subtle"
      >
        {body}
      </aside>
    )
  }
  // Sheet mode: Radix provides backdrop, focus trap, scroll lock, Esc.
  // A visually-hidden SheetTitle satisfies Radix Dialog's a11y
  // requirement; the visible heading is the <h2> inside `body`.
  return (
    <Sheet open={obligationId !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent className="flex flex-col data-[side=right]:w-full data-[side=right]:max-w-[100vw] sm:data-[side=right]:w-[min(720px,calc(100vw-1rem))] md:data-[side=right]:w-[min(840px,calc(100vw-1.5rem))] xl:data-[side=right]:w-[min(920px,calc(100vw-2rem))] sm:data-[side=right]:max-w-none overflow-y-auto">
        <SheetTitle className="sr-only">{titleText ?? t`Obligation detail`}</SheetTitle>
        <SheetDescription className="sr-only">
          <Trans>Obligation workflow detail panel.</Trans>
        </SheetDescription>
        {body}
      </SheetContent>
    </Sheet>
  )
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-divider-regular p-4 text-sm text-text-tertiary">
      {children}
    </div>
  )
}

// Orphaned after Risk tab removal (2026-05-21). Kept as a deletion
// candidate; underscore prefix silences eslint no-unused-vars until
// we confirm no consumer wants it back.
function _PenaltyBreakdownCard({ item }: { item: ObligationQueueRow['penaltyBreakdown'][number] }) {
  const inputs = item.inputs ? Object.entries(item.inputs) : []
  const sourceRefs = item.sourceRefs ?? []
  return (
    <div className="grid gap-2 rounded-lg border border-divider-regular p-3">
      <div className="flex justify-between gap-3">
        <span className="font-medium">{item.label}</span>
        <span className="tabular-nums">{formatCents(item.amountCents)}</span>
      </div>
      <span className="text-xs text-text-tertiary">{formatPenaltyFormula(item.formula)}</span>
      {inputs.length > 0 ? (
        <div className="grid gap-1 text-[11px] text-text-tertiary">
          {inputs.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-3">
              <span>{penaltyInputLabel(key)}</span>
              <span className="tabular-nums text-text-secondary">
                {formatPenaltyInputValue(key, value)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {sourceRefs.length > 0 ? <PenaltySourceList sourceRefs={sourceRefs} compact /> : null}
    </div>
  )
}

function PenaltySourceList({
  sourceRefs,
  compact = false,
}: {
  sourceRefs: ObligationQueueRow['penaltySourceRefs']
  compact?: boolean
}) {
  return (
    <div
      className={compact ? 'grid gap-1' : 'grid gap-2 rounded-lg border border-divider-regular p-3'}
    >
      {!compact ? (
        <p className="text-xs font-medium text-text-secondary">
          <Trans>Penalty sources</Trans>
        </p>
      ) : null}
      {sourceRefs.map((source) => (
        <a
          key={`${source.label}-${source.url}`}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="grid gap-0.5 text-xs text-accent-strong hover:underline"
        >
          <span>{source.label}</span>
          {!compact ? (
            <span className="text-[11px] text-text-tertiary">{source.sourceExcerpt}</span>
          ) : null}
        </a>
      ))}
    </div>
  )
}

// Orphaned after Risk tab removal — see _PenaltyBreakdownCard.
function _penaltyFormulaDisplay(row: ObligationQueueRow): ReactNode {
  if (row.penaltyFormulaLabel) return row.penaltyFormulaLabel
  if (row.penaltyFormulaVersion) return <Trans>Penalty calculation available</Trans>
  return <Trans>Not calculated</Trans>
}

// Orphaned after Risk tab removal — see _PenaltyBreakdownCard.
function _penaltyFactsDisplay(row: ObligationQueueRow): ReactNode {
  if (row.missingPenaltyFacts.length > 0) {
    const labels = row.missingPenaltyFacts.map((fact) => penaltyFactLabel(fact)).join(', ')
    return <Trans>Needs {labels}</Trans>
  }
  if (row.penaltyFactsVersion) return <Trans>Penalty inputs recorded</Trans>
  return <Trans>Not entered</Trans>
}

function penaltyFactLabel(value: string): string {
  if (value === 'estimatedTaxLiabilityCents') return 'estimated tax liability'
  if (value === 'equityOwnerCount') return 'owner count'
  if (value === 'partnerCount') return 'owner count'
  if (value === 'penaltyMonths') return 'months late'
  if (value === 'monthlyRateCents') return 'monthly penalty rate'
  return humanizeToken(value).toLowerCase()
}

function penaltyInputLabel(key: string): ReactNode {
  if (key === 'partnerCount' || key === 'equityOwnerCount') return <Trans>Owners</Trans>
  if (key === 'penaltyMonths') return <Trans>Months late</Trans>
  if (key === 'monthlyRateCents') return <Trans>Monthly penalty per owner</Trans>
  if (key === 'estimatedTaxLiabilityCents') return <Trans>Estimated tax liability</Trans>
  return humanizeToken(key)
}

function formatPenaltyFormula(formula: string): ReactNode {
  const match = formula.match(
    /^\$(?<rate>[\d,.]+)\s*x\s*(?<owners>\d+)\s*partner\(s\)\s*x\s*(?<months>\d+)\s*month\(s\)$/,
  )
  const rate = match?.groups?.rate
  const owners = match?.groups?.owners
  const months = match?.groups?.months
  if (rate && owners && months) {
    return (
      <Trans>
        ${rate} per owner x {owners} owners x {months} months
      </Trans>
    )
  }
  return formula.replaceAll('partner(s)', 'owner(s)')
}

function formatPenaltyInputValue(key: string, value: string | number | boolean | null): ReactNode {
  if (value === null) return <Trans>Not recorded</Trans>
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') {
    if (key.endsWith('Cents')) return formatCents(value)
    return Number.isInteger(value) ? `${value}` : value.toFixed(2)
  }
  return value
}

// Orphaned after Risk tab removal — see _PenaltyBreakdownCard.
function _DeadlineTipPanel({
  insight,
  isLoading,
  isPreparing,
  isTimedOut,
  canRefresh,
  practiceTimezone,
  onRefresh,
}: {
  insight: AiInsightPublic | null
  isLoading: boolean
  isPreparing: boolean
  isTimedOut: boolean
  canRefresh: boolean
  practiceTimezone: string
  onRefresh: () => void
}) {
  const hasPreviousTip = Boolean(insight?.generatedAt)
  const showFailedState = insight?.status === 'failed' && !isPreparing
  const buttonLabel = isPreparing ? (
    <Trans>Preparing</Trans>
  ) : isTimedOut || showFailedState ? (
    <Trans>Retry</Trans>
  ) : (
    <Trans>Refresh</Trans>
  )

  return (
    <div className="grid gap-3 rounded-lg border border-divider-regular bg-background-section p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSearchIcon className="size-4 text-text-secondary" aria-hidden />
          <span className="text-sm font-medium text-text-primary">
            <ConceptLabel concept="deadlineTip">
              <Trans>Deadline Tip</Trans>
            </ConceptLabel>
          </span>
          {isPreparing ? (
            <Badge variant="warning">
              <Trans>Preparing</Trans>
            </Badge>
          ) : insight ? (
            <InsightStatusBadge status={insight.status} />
          ) : null}
        </div>
        {canRefresh ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPreparing}
            onClick={onRefresh}
          >
            <RefreshCwIcon data-icon="inline-start" />
            {buttonLabel}
          </Button>
        ) : (
          <UpgradeCtaButton />
        )}
      </div>
      {isLoading ? (
        <div className="text-sm text-text-tertiary">
          <Trans>Loading deadline tip…</Trans>
        </div>
      ) : insight ? (
        <div className="grid gap-3">
          {isPreparing ? (
            <AlertPanel>
              {hasPreviousTip ? (
                <Trans>Showing the previous tip while the latest one is being prepared.</Trans>
              ) : (
                <Trans>Preparing tip from verified deadline context.</Trans>
              )}
            </AlertPanel>
          ) : null}
          {isTimedOut ? (
            <AlertPanel>
              <Trans>Still preparing. You can leave this page and check back later.</Trans>
            </AlertPanel>
          ) : null}
          {showFailedState ? (
            <AlertPanel>
              <Trans>
                Couldn't prepare the latest tip. Showing the previous version when available.
              </Trans>
            </AlertPanel>
          ) : null}
          {insight.sections.map((section) => (
            <div key={section.key} className="grid gap-1">
              <p className="text-sm font-medium text-text-primary">{section.label}</p>
              <p className="text-sm text-text-secondary">{section.text}</p>
              <InsightCitationChips insight={insight} citationRefs={section.citationRefs} />
            </div>
          ))}
          {insight.generatedAt ? (
            <span className="text-xs text-text-tertiary">
              <Trans>
                Updated {formatDateTimeWithTimezone(insight.generatedAt, practiceTimezone)}
              </Trans>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function InsightStatusBadge({ status }: { status: AiInsightPublic['status'] }) {
  if (status === 'ready')
    return (
      <Badge variant="success">
        <Trans>Ready</Trans>
      </Badge>
    )
  if (status === 'failed')
    return (
      <Badge variant="warning">
        <Trans>Failed</Trans>
      </Badge>
    )
  if (status === 'stale')
    return (
      <Badge variant="info">
        <Trans>Stale</Trans>
      </Badge>
    )
  return (
    <Badge variant="outline">
      <Trans>Pending</Trans>
    </Badge>
  )
}

function InsightCitationChips({
  insight,
  citationRefs,
}: {
  insight: AiInsightPublic
  citationRefs: number[]
}) {
  const citations = insight.citations.filter((citation) => citationRefs.includes(citation.ref))
  if (citations.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {citations.map((citation) => {
        const label =
          citation.evidence?.sourceId ?? citation.evidence?.sourceType ?? `#${citation.ref}`
        const badge = (
          <Badge key={citation.ref} variant="outline" className="max-w-full truncate text-xs">
            [{citation.ref}] {label}
          </Badge>
        )
        return citation.evidence?.sourceUrl ? (
          <a
            key={citation.ref}
            href={citation.evidence.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="max-w-full"
          >
            {badge}
          </a>
        ) : (
          badge
        )
      })}
    </div>
  )
}

function AlertPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-state-warning-hover-alt bg-state-warning-hover p-3 text-sm text-text-primary">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-text-warning" aria-hidden />
      <p>{children}</p>
    </div>
  )
}

type ObligationQueueEvidenceItem = {
  id: string
  sourceType: string
  sourceUrl: string | null
  rawValue: string | null
  normalizedValue: string | null
  appliedAt: string
}

type ReadinessResponseEvidenceItem = {
  itemId: string
  status: 'ready' | 'not_yet' | 'need_help'
  note: string | null
  etaDate: string | null
}

type AuditSummaryRow = {
  id: string
  label: ReactNode
  value: ReactNode
}

function readJsonRecord(value: string | null): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return Object.fromEntries(Object.entries(parsed))
  } catch {
    return null
  }
}

function readRecordString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readRecordNumber(record: Record<string, unknown> | null, key: string): number | null {
  const value = record?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function humanizeToken(value: string): string {
  const normalized = value
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  if (!normalized) return value
  return normalized
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (['ai', 'api', 'ein', 'id', 'ip', 'ssn', 'url'].includes(lower)) return lower.toUpperCase()
      return index === 0 ? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}` : lower
    })
    .join(' ')
}

function parseReadinessResponseEvidence(
  value: string | null,
): ReadinessResponseEvidenceItem[] | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return null
    const responses = parsed
      .map((entry): ReadinessResponseEvidenceItem | null => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
        const record = Object.fromEntries(Object.entries(entry))
        const itemId = readRecordString(record, 'itemId')
        const status = readRecordString(record, 'status')
        if (!itemId || (status !== 'ready' && status !== 'not_yet' && status !== 'need_help')) {
          return null
        }
        return {
          itemId,
          status,
          note: readRecordString(record, 'note'),
          etaDate: readRecordString(record, 'etaDate'),
        }
      })
      .filter((entry): entry is ReadinessResponseEvidenceItem => entry !== null)
    return responses.length === parsed.length ? responses : null
  } catch {
    return null
  }
}

function evidenceSourceLabel(sourceType: string): ReactNode {
  if (sourceType === 'verified_rule') return <Trans>Active practice rule</Trans>
  if (sourceType === 'penalty_override') return <Trans>Penalty input</Trans>
  if (sourceType === 'extension_decision') return <Trans>Extension decision</Trans>
  if (sourceType === 'pulse_apply') return <Trans>Rule update</Trans>
  if (sourceType === 'pulse_revert') return <Trans>Rule update undone</Trans>
  if (sourceType === 'migration_revert') return <Trans>Import undone</Trans>
  if (sourceType === 'user_override') return <Trans>Manual note</Trans>
  if (sourceType === 'readiness_checklist_ai') return <Trans>AI readiness checklist</Trans>
  if (sourceType === 'readiness_client_response') return <Trans>Client readiness response</Trans>
  return humanizeToken(sourceType)
}

function EvidenceInlineItem({
  item,
  practiceTimezone,
}: {
  item: ObligationQueueEvidenceItem
  practiceTimezone: string
}) {
  const checklist =
    item.sourceType === 'readiness_checklist_ai'
      ? parseGeneratedReadinessChecklist(item.normalizedValue)
      : null
  const readinessResponses =
    item.sourceType === 'readiness_client_response'
      ? parseReadinessResponseEvidence(item.rawValue)
      : null
  const penaltyRows = item.sourceType === 'penalty_override' ? penaltyInputEvidenceRows(item) : null
  const extensionDecision =
    item.sourceType === 'extension_decision' ? readExtensionDecisionEvidence(item) : null

  return (
    <div className="rounded-lg border border-divider-regular p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{evidenceSourceLabel(item.sourceType)}</span>
        <span className="text-xs text-text-tertiary">
          {formatDateTimeWithTimezone(item.appliedAt, practiceTimezone)}
        </span>
      </div>
      {penaltyRows ? (
        <div className="mt-2 grid gap-2">
          <p className="text-sm text-text-secondary">
            <Trans>Updated penalty inputs.</Trans>
          </p>
          <AuditSummaryRows rows={penaltyRows} />
        </div>
      ) : extensionDecision ? (
        <div className="mt-2 grid gap-2">
          <p className="text-sm text-text-secondary">
            {extensionDecisionEvidenceDescription(extensionDecision)}
          </p>
          <AuditSummaryRows rows={extensionDecisionEvidenceDetails(extensionDecision)} />
        </div>
      ) : checklist ? (
        <ReadinessChecklistEvidence checklist={checklist} context={readJsonRecord(item.rawValue)} />
      ) : readinessResponses ? (
        <ReadinessClientResponseEvidence
          responses={readinessResponses}
          summary={readJsonRecord(item.normalizedValue)}
        />
      ) : item.normalizedValue ? (
        <p className="mt-2 break-words text-sm text-text-secondary">{item.normalizedValue}</p>
      ) : item.rawValue ? (
        <p className="mt-2 break-words text-sm text-text-secondary">{item.rawValue}</p>
      ) : null}
      {item.sourceUrl ? (
        <Button
          className="mt-2"
          size="sm"
          variant="outline"
          render={<a href={item.sourceUrl} target="_blank" rel="noreferrer" />}
        >
          <LinkIcon data-icon="inline-start" />
          <Trans>Open source</Trans>
        </Button>
      ) : null}
    </div>
  )
}

function penaltyInputEvidenceRows(item: ObligationQueueEvidenceItem): AuditSummaryRow[] {
  const before = readJsonRecord(item.rawValue)
  const after = readJsonRecord(item.normalizedValue)
  return [
    changedPenaltyEvidenceRow(
      'estimated-tax-liability',
      <Trans>Estimated tax liability</Trans>,
      formatOptionalCents(readRecordNumber(before, 'estimatedTaxLiabilityCents')),
      formatOptionalCents(readRecordNumber(after, 'estimatedTaxLiabilityCents')),
    ),
    changedPenaltyEvidenceRow(
      'owner-count',
      <Trans>Owner count</Trans>,
      formatOptionalNumber(readRecordNumber(before, 'equityOwnerCount')),
      formatOptionalNumber(readRecordNumber(after, 'equityOwnerCount')),
    ),
  ].filter((row): row is AuditSummaryRow => row !== null)
}

function changedPenaltyEvidenceRow(
  id: string,
  label: ReactNode,
  before: string | null,
  after: string | null,
): AuditSummaryRow | null {
  if (before === after) return null
  if (!before && after) {
    return { id, label, value: <Trans>Set to {after}</Trans> }
  }
  if (before && !after) {
    return { id, label, value: <Trans>Cleared from {before}</Trans> }
  }
  if (before && after) {
    return {
      id,
      label,
      value: (
        <Trans>
          Changed from {before} to {after}
        </Trans>
      ),
    }
  }
  return null
}

function formatOptionalCents(value: number | null): string | null {
  return value === null ? null : formatCents(value)
}

function formatOptionalNumber(value: number | null): string | null {
  return value === null ? null : String(value)
}

function ReadinessChecklistEvidence({
  checklist,
  context,
}: {
  checklist: ReadinessChecklistItem[]
  context: Record<string, unknown> | null
}) {
  const taxType = readRecordString(context, 'taxType')
  const entityType = readRecordString(context, 'entityType')
  const state = readRecordString(context, 'state')
  const currentDueDate = readRecordString(context, 'currentDueDate')

  return (
    <div className="mt-3 grid gap-3">
      {taxType || entityType || state || currentDueDate ? (
        <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
          {taxType ? <Badge variant="outline">{taxType}</Badge> : null}
          {entityType ? <Badge variant="outline">{entityType}</Badge> : null}
          {state ? <Badge variant="outline">{state}</Badge> : null}
          {currentDueDate ? (
            <Badge variant="outline">
              <Trans>Due {formatDate(currentDueDate)}</Trans>
            </Badge>
          ) : null}
        </div>
      ) : null}
      <ol className="grid gap-2">
        {checklist.map((entry, index) => (
          <li
            key={entry.id}
            className="grid gap-1 border-t border-divider-subtle pt-2 first:border-0 first:pt-0"
          >
            <div className="flex min-w-0 gap-2">
              <span className="text-xs tabular-nums text-text-tertiary">{index + 1}.</span>
              <span className="min-w-0 font-medium text-text-primary">{entry.label}</span>
            </div>
            {entry.description ? (
              <p className="pl-6 text-sm text-text-secondary">{entry.description}</p>
            ) : null}
            {entry.reason || entry.sourceHint ? (
              <div className="flex flex-wrap gap-2 pl-6 text-xs text-text-tertiary">
                {entry.reason ? <span>{entry.reason}</span> : null}
                {entry.sourceHint ? <Badge variant="secondary">{entry.sourceHint}</Badge> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

function ReadinessClientResponseEvidence({
  responses,
  summary,
}: {
  responses: ReadinessResponseEvidenceItem[]
  summary: Record<string, unknown> | null
}) {
  const readiness = readRecordString(summary, 'readiness')

  return (
    <div className="mt-3 grid gap-3">
      {readiness ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text-secondary">
            <Trans>Resulting readiness</Trans>
          </span>
          <Badge variant="outline">{humanizeToken(readiness)}</Badge>
        </div>
      ) : null}
      <ol className="grid gap-2">
        {responses.map((response) => (
          <li
            key={response.itemId}
            className="grid gap-1 border-t border-divider-subtle pt-2 first:border-0 first:pt-0"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-medium text-text-primary">
                {humanizeToken(response.itemId)}
              </span>
              <ReadinessResponseStatusBadge status={response.status} />
            </div>
            {response.etaDate ? (
              <p className="text-xs text-text-tertiary">
                <Trans>ETA {formatDate(response.etaDate)}</Trans>
              </p>
            ) : null}
            {response.note ? <p className="text-sm text-text-secondary">{response.note}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

function ReadinessResponseStatusBadge({
  status,
}: {
  status: ReadinessResponseEvidenceItem['status']
}) {
  if (status === 'ready') {
    return (
      <Badge variant="success">
        <Trans>Ready</Trans>
      </Badge>
    )
  }
  if (status === 'need_help') {
    return (
      <Badge variant="warning">
        <Trans>Need help</Trans>
      </Badge>
    )
  }
  return (
    <Badge variant="outline">
      <Trans>Not yet</Trans>
    </Badge>
  )
}

// `ObligationQueueAuditEventCard` retired 2026-05-21 with the
// Audit/Timeline tab removal. Bring back when raw audit events
// surface somewhere again.

function AuditSummaryRows({ rows }: { rows: AuditSummaryRow[] }) {
  if (rows.length === 0) return null
  return (
    <dl className="mt-3 grid gap-2 text-xs">
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[112px_1fr] gap-3">
          <dt className="font-medium text-text-tertiary">{row.label}</dt>
          <dd className="break-words text-text-secondary">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function DetailRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 text-sm">
      <dt className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{label}</dt>
      <dd className="break-words text-text-primary">{value}</dd>
    </div>
  )
}

// `ObligationForwardingPanel` + `obligationForwardingAddress`
// retired 2026-05-21 with the inbound-routing Phase-2 stub. Restore
// when the email-thread-to-task pipeline actually ships.

// Top-of-Readiness-tab overview. Answers in one read:
//   1. IS THIS FILING READY? (binary headline — "Ready to prep" or
//      "Not ready" — the most important signal on the tab)
//   2. WHY (the gap: items received vs. expected, or "no checklist yet")
//   3. WHAT does "ready" mean (one-line explainer pulled from PDF §3.2)
//
// Replaces the prior side-by-side label-and-counter. The headline is
// the H2 of the tab; the rest is small support text below it.
function ReadinessOverview({
  row,
  latestRequest,
  checklistCount,
  receivedCount,
}: {
  row: ObligationQueueRow
  latestRequest: ClientReadinessRequestPublic | null
  checklistCount: number
  receivedCount: number
}) {
  const { t } = useLingui()
  const isReady = row.readiness === 'ready'
  const isTerminal = row.status === 'done' || row.status === 'paid' || row.status === 'completed'
  const responseCount = latestRequest?.responses.length ?? 0
  const readyResponseCount =
    latestRequest?.responses.filter((r) => r.status === 'ready').length ?? 0
  // Headline answers "is this filing ready?" binary — BUT only for
  // non-terminal rows. Once the obligation is Filed/Paid/Completed,
  // readiness is no longer the right question (the work is done), so
  // we switch to a closure headline that summarizes what got delivered.
  const headline = isTerminal
    ? checklistCount > 0
      ? t`Filed with ${checklistCount} document items`
      : t`Filed`
    : isReady
      ? t`Ready to prep`
      : t`Not ready`
  const subline: string = (() => {
    if (isTerminal) {
      if (checklistCount === 0) return t`No document checklist was attached to this filing.`
      return t`Document audit trail captured ${receivedCount} of ${checklistCount} items as received.`
    }
    if (isReady) {
      if (checklistCount > 0) return t`All ${checklistCount} document items are marked received.`
      if (latestRequest) return t`Client confirmed all ${checklistCount} items.`
      return t`Materials on hand — no client request was needed.`
    }
    if (row.readiness === 'needs_review') {
      return t`At least one document item needs preparer review.`
    }
    if (latestRequest && latestRequest.status !== 'revoked') {
      const outstanding = checklistCount - receivedCount
      return t`${outstanding} of ${checklistCount} document items are still missing.`
    }
    if (checklistCount > 0) {
      return t`${receivedCount} of ${checklistCount} document items are marked received.`
    }
    return t`No document list generated yet. Generate or add items below.`
  })()
  // 2026-05-23: tightened spacing per critique. Outer `py-2` dropped
  // (parent grid already supplies vertical rhythm), icon shrunk
  // size-6 → size-5, gap-3 → gap-2, removed the icon's mt-1 nudge.
  // Headline is the only thing carrying section weight here; the
  // overview shouldn't take a third of the drawer's first screen.
  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full',
          isTerminal
            ? 'bg-state-success-hover'
            : isReady
              ? 'bg-state-success-solid'
              : 'bg-background-subtle border border-divider-deep',
        )}
      >
        {isTerminal || isReady ? (
          <CheckCircle2Icon
            className={cn('size-3', isTerminal ? 'text-text-success' : 'text-text-inverted')}
            aria-hidden
          />
        ) : (
          <ClipboardListIcon className="size-3 text-text-secondary" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-semibold leading-tight tracking-tight',
            isTerminal
              ? 'text-text-secondary'
              : isReady
                ? 'text-text-success'
                : 'text-text-primary',
          )}
        >
          {headline}
        </p>
        <p className="text-xs leading-snug text-text-secondary">{subline}</p>
        {responseCount > 0 && !isTerminal ? (
          <p className="mt-0.5 text-[11px] tabular-nums text-text-tertiary">
            <Trans>
              {readyResponseCount}/{checklistCount} confirmed by client · {responseCount} total
              responses
            </Trans>
          </p>
        ) : null}
      </div>
    </div>
  )
}

// One persisted document row in the readiness checklist. The checkbox is
// the CPA-owned source of truth; client portal responses only annotate
// and can move the same item into review/missing/received states.
function ChecklistItemRow({
  item,
  response,
  pending,
  onStatusChange,
  onLabelCommit,
  onDescriptionCommit,
  onNoteCommit,
  onRemove,
}: {
  item: ReadinessDocumentChecklistItemPublic
  response: ClientReadinessResponsePublic | null
  pending: boolean
  onStatusChange: (status: ReadinessDocumentChecklistItemPublic['status']) => void
  onLabelCommit: (label: string) => void
  onDescriptionCommit: (description: string) => void
  onNoteCommit: (note: string) => void
  onRemove: () => void
}) {
  const { t } = useLingui()
  const [expanded, setExpanded] = useState(false)
  const [label, setLabel] = useState(item.label)
  const [description, setDescription] = useState(item.description ?? '')
  const [note, setNote] = useState(item.note ?? '')
  const received = item.status === 'received'
  const needsReview = item.status === 'needs_review'
  const responseBadge = response
    ? (() => {
        switch (response.status) {
          case 'ready':
            return { variant: 'success' as const, label: t`Client ready` }
          case 'not_yet':
            return { variant: 'warning' as const, label: t`Not yet` }
          case 'need_help':
            return { variant: 'destructive' as const, label: t`Needs help` }
        }
        return { variant: 'outline' as const, label: response.status }
      })()
    : null
  return (
    <div className="rounded-md border border-divider-subtle bg-background-default">
      {/* Inner row padding tightened from py-2 → py-1.5 per critique
          ("waste of space on top and bottom"). The chevron Button +
          Input height already define the row's vertical metric;
          extra py wasn't doing structural work. */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Checkbox
          aria-label={received ? t`Mark document missing` : t`Mark document received`}
          checked={received}
          indeterminate={needsReview}
          disabled={pending}
          onCheckedChange={(checked) => onStatusChange(checked ? 'received' : 'missing')}
        />
        <Input
          aria-label={t`Document item label`}
          value={label}
          placeholder={t`Document item`}
          onBlur={() => {
            const nextLabel = label.trim()
            if (nextLabel && nextLabel !== item.label) onLabelCommit(nextLabel)
            if (!nextLabel) setLabel(item.label)
          }}
          onChange={(event) => setLabel(event.target.value)}
          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
        {/* 2026-05-23: split the dual-affordance pattern (checkbox +
            interactive chip) into explicit action button vs. passive
            status label per critique ("wish it is more obvious").
            - Missing  → primary "Mark received" outline Button with
                         a check icon. Real-looking button.
            - Received → success Badge "Received" (passive label).
            - Needs review → destructive Badge (passive label).
            Checkbox stays as the keyboard quick-toggle and as a
            visual indicator at the row's leading edge; the button
            on the right is the explicit pointer-friendly affordance
            the CPA was scanning for. */}
        {received ? (
          <Badge variant="success" className="text-[10px] uppercase tracking-wide">
            <CheckCircle2Icon className="size-3" aria-hidden />
            <Trans>Received</Trans>
          </Badge>
        ) : needsReview ? (
          <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
            <AlertTriangleIcon className="size-3" aria-hidden />
            <Trans>Needs review</Trans>
          </Badge>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => onStatusChange('received')}
            aria-label={t`Mark document received`}
          >
            <CheckCircle2Icon data-icon="inline-start" aria-hidden />
            <Trans>Mark received</Trans>
          </Button>
        )}
        {responseBadge ? (
          <Badge variant={responseBadge.variant} className="text-[10px] uppercase tracking-wide">
            {responseBadge.label}
          </Badge>
        ) : null}
        {/* Chevron switched 2026-05-21 from chevron-down → chevron-
            right (rotated 90° when expanded). Chevron-down read as a
            sort/select trigger; the rotating right-chevron is the
            standard tree-expand idiom and unambiguous. */}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={expanded ? t`Hide detail` : t`Show detail`}
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronRightIcon
            className={cn('size-4 transition-transform', expanded && 'rotate-90')}
          />
        </Button>
      </div>
      {/* Description line: italic + a small Info icon prefix so
          users read it as "what this document IS" (helper context),
          not as a separate row of content / note. Critique was
          direct: "is this note?" — disambiguating the visual
          treatment so it can't be confused with the internal Note
          (which only shows in the expanded body, never here). */}
      {item.description && !expanded ? (
        <p className="flex items-start gap-1.5 border-t border-divider-subtle px-3 py-1.5 text-[11px] leading-snug text-text-tertiary italic">
          <InfoIcon className="mt-px size-3 shrink-0" aria-hidden />
          <span>{item.description}</span>
        </p>
      ) : null}
      {expanded ? (
        <div className="grid gap-2 border-t border-divider-subtle p-3">
          <Textarea
            aria-label={t`Document item description`}
            value={description}
            placeholder={t`Client-facing detail`}
            onBlur={() => {
              if (description !== (item.description ?? '')) onDescriptionCommit(description)
            }}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Textarea
            aria-label={t`Internal document note`}
            value={note}
            placeholder={t`Internal note`}
            onBlur={() => {
              if (note !== (item.note ?? '')) onNoteCommit(note)
            }}
            onChange={(event) => setNote(event.target.value)}
          />
          {response?.note ? (
            <p className="rounded-sm bg-background-section px-2 py-1.5 text-xs text-text-secondary">
              <Trans>Client note</Trans>: {response.note}
              {response.etaDate ? (
                <>
                  {' '}
                  · <Trans>ETA {formatDate(response.etaDate)}</Trans>
                </>
              ) : null}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onStatusChange('needs_review')}
              disabled={pending || needsReview}
            >
              <AlertTriangleIcon data-icon="inline-start" />
              <Trans>Needs review</Trans>
            </Button>
            <Button type="button" size="sm" variant="destructive-ghost" onClick={onRemove}>
              <Trash2Icon data-icon="inline-start" />
              <Trans>Remove</Trans>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// Format a tax-period span. Full calendar years collapse to just
// the year ("2026"); fiscal / short / quarterly periods keep the
// explicit start–end range.
function formatTaxPeriod(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return '—'
  const startIso = start.slice(0, 10)
  const endIso = end.slice(0, 10)
  const startYear = startIso.slice(0, 4)
  const endYear = endIso.slice(0, 4)
  if (startYear === endYear && startIso.endsWith('-01-01') && endIso.endsWith('-12-31')) {
    return startYear
  }
  return `${formatDate(startIso)} – ${formatDate(endIso)}`
}

// FlatDateList — every date on the row, always visible. Reverted
// from the status-aware variant (Direction F) because hiding dates
// per stage made the CPA hunt for info they expected to see. Simple
// definition list with a fixed-width label column on the left and
// tight tabular-num values on the right.
function FlatDateList({ row }: { row: ObligationQueueRow }) {
  const { t } = useLingui()
  const isOverdue = row.daysUntilDue < 0
  const dateRows = useMemo(
    () => [
      {
        key: 'internal',
        label: t`Internal due`,
        value: formatDate(row.currentDueDate),
        primary: true,
      },
      { key: 'statutory', label: t`Statutory`, value: formatDate(row.baseDueDate) },
      {
        key: 'filing',
        label: t`Filing`,
        value: formatDate(row.filingDueDate ?? row.baseDueDate),
      },
      {
        key: 'payment',
        label: t`Payment`,
        value: formatDate(row.paymentDueDate ?? row.baseDueDate),
      },
      ...(row.efileSubmittedAt
        ? [
            {
              key: 'submitted',
              label: t`Submitted`,
              value: formatDate(row.efileSubmittedAt.slice(0, 10)),
            },
          ]
        : []),
      ...(row.efileAcceptedAt
        ? [
            {
              key: 'accepted',
              label: t`Accepted`,
              value: formatDate(row.efileAcceptedAt.slice(0, 10)),
            },
          ]
        : []),
      ...(row.efileRejectedAt
        ? [
            {
              key: 'rejected',
              label: t`Rejected`,
              value: formatDate(row.efileRejectedAt.slice(0, 10)),
            },
          ]
        : []),
      {
        key: 'period',
        label: t`Tax period`,
        value: formatTaxPeriod(row.taxPeriodStart, row.taxPeriodEnd),
      },
      { key: 'created', label: t`Created`, value: formatDate(row.createdAt.slice(0, 10)) },
      { key: 'updated', label: t`Last touched`, value: formatDate(row.updatedAt.slice(0, 10)) },
    ],
    [row, t],
  )
  return (
    <dl
      aria-label={t`Dates`}
      className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-xs"
    >
      {dateRows.map((entry) => (
        <Fragment key={entry.key}>
          <dt className="text-text-tertiary">{entry.label}</dt>
          <dd
            className={cn(
              'tabular-nums',
              entry.primary && isOverdue
                ? 'font-medium text-text-destructive'
                : entry.primary
                  ? 'font-medium text-text-primary'
                  : 'text-text-primary',
            )}
          >
            {entry.value}
          </dd>
        </Fragment>
      ))}
    </dl>
  )
}

// StatutoryDatesPanel — just the flat date list (2026-05-23). The
// `YearStripTimeline` that used to sit above the list was dropped
// per critique ("can remove the timeline for dates first"). It
// duplicated the PathToFilingSummary at the top of the drawer (also
// a spatial lifecycle view) and was redundant with the explicit
// per-row dates here. Two timelines on the same drawer screen
// competed for attention without adding signal. Component + its
// `clamp01` helper were removed entirely; git history has them if
// we ever need to revive the visualization for multi-year cycles.
function StatutoryDatesPanel({ row }: { row: ObligationQueueRow }) {
  return <FlatDateList row={row} />
}

// `stageIndexForStatus` + `mineStageTimestamps` + `STAGE_ANCHOR_STATUSES`
// retired 2026-05-21. The old 5-step funnel vocabulary (Scope /
// Collecting / Preparing / Signature / Filed) was replaced by the
// 6-status lifecycle timeline below — same audit-event mining logic,
// new shape.

// Horizontal milestone timeline — 6 lifecycle stages with circles +
// connecting lines + labels. Replaces the prior collapsed disclosure
// (which hid the most useful audit-defense info behind a click).
//
// Vocabulary (per 2026-05-21 design call) follows the lifecycle v2
// status names so the timeline reads the same as the queue's status
// pills + the header status pill — no parallel "Scope / Collecting"
// jargon to translate.
//
//   Not started → Waiting → Blocked → In review → Filed → Completed
//
// Visual states per stage:
//   - "done"    : completed in audit history → green-filled circle
//   - "active"  : the row's current status → accent ring (red if overdue)
//   - "upcoming": not yet reached → empty ring
function PathToFilingSummary({
  row,
  auditEvents,
}: {
  row: ObligationQueueRow
  auditEvents: readonly AuditEventPublic[]
}) {
  const { t } = useLingui()
  const stages = useMemo(
    () =>
      [
        { key: 'pending', label: t`Not started` },
        { key: 'waiting_on_client', label: t`Waiting` },
        { key: 'blocked', label: t`Blocked` },
        { key: 'review', label: t`In review` },
        { key: 'done', label: t`Filed` },
        { key: 'completed', label: t`Completed` },
      ] as const,
    [t],
  )
  const currentIndex = timelineIndexForStatus(row.status)
  const stamps = useMemo(
    () =>
      mineTimelineTimestamps(
        auditEvents,
        stages.map((s) => s.key),
      ),
    [auditEvents, stages],
  )
  const isPastInternalDue = row.daysUntilDue < 0
  // Filed-stage index — used to project an expected date when Filed
  // is still upcoming (the row's internal deadline IS the expected
  // file date). Other upcoming stages don't get a projection.
  const filedStageIndex = stages.findIndex((s) => s.key === 'done')
  // OVERDUE only applies on PRE-TERMINAL stages (2026-05-21). Once a
  // row reaches Filed or Completed, the action has been taken —
  // calling the stage "OVERDUE" contradicts the green Filed pill in
  // the header and creates a confusing mixed signal (green pill +
  // red ring on the same lifecycle moment). Lateness is still
  // visible in the dates panel via the red `Internal due` value;
  // that's the right surface for "was this filed on time?"
  const TERMINAL_STAGE_KEYS: ReadonlySet<string> = new Set(['done', 'completed'])
  // Sub-status annotation for the ACTIVE stage. Derived from existing
  // schema fields — no migration needed:
  //   waiting_on_client → row.prepStage (waiting_on_client /
  //     waiting_on_third_party / bookkeeping_cleanup / ready_for_prep)
  //   blocked          → row.blockedByObligationInstanceId (K-1) via
  //     existing BlockedByChip; a verbal hint here would duplicate that.
  //   review           → row.reviewStage (ready_for_review / in_review /
  //     notes_open / approved)
  //   done (filed)     → row.efileState (submitted → awaiting; accepted;
  //     rejected; paper_filed; final_package_delivered)
  // Returns null when no meaningful annotation exists. Renders as a
  // small text line beneath the state word ("ACTIVE / Awaiting IRS").
  const activeSubStatus = subStatusForActiveStage(row, t)
  return (
    <div
      aria-label={t`Milestone timeline`}
      // Released from the bordered card frame (2026-05-21) — the panel
      // already has its own tinted background, so wrapping the timeline
      // in a second card created a nested box. Inline-padding only.
      className="py-1"
    >
      <div className="grid grid-cols-6 gap-0">
        {stages.map((stage, i) => {
          const state: 'done' | 'active' | 'upcoming' =
            i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'upcoming'
          // Date resolution (milestone-timeline-prd.md §3):
          //   Done/Active : audit-event stamp (first entry into stage)
          //   Stage 0 fallback : row.createdAt (the row was born here)
          //   Filed upcoming : row.currentDueDate (expected file date)
          //   Other upcoming : null → em-dash placeholder
          let stamp = stamps[i] ?? null
          let isExpected = false
          if (!stamp && i === 0) stamp = row.createdAt
          if (!stamp && state === 'upcoming' && i === filedStageIndex) {
            stamp = row.currentDueDate
            isExpected = true
          }
          const overdueActive =
            state === 'active' && isPastInternalDue && !TERMINAL_STAGE_KEYS.has(stage.key)
          return (
            <div key={stage.key} className="flex flex-col items-center gap-0.5">
              <div className="flex w-full items-center gap-1">
                <span
                  aria-hidden
                  className={cn(
                    'h-0.5 flex-1',
                    i === 0
                      ? 'opacity-0'
                      : state === 'upcoming'
                        ? 'bg-divider-regular'
                        : 'bg-state-success-solid',
                  )}
                />
                {/* All circles share `size-5 border-2` so the connector
                    line stays perfectly horizontal regardless of state
                    — the prior larger-active variant disrupted line
                    alignment. Color + fill alone signal the state. */}
                <span
                  aria-hidden
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-full border-2',
                    state === 'done'
                      ? 'border-state-success-solid bg-state-success-solid'
                      : overdueActive
                        ? 'border-state-destructive-solid bg-background-default'
                        : state === 'active'
                          ? 'border-accent-default bg-background-default'
                          : 'border-divider-regular bg-background-default',
                  )}
                >
                  {state === 'done' ? (
                    <CheckCircle2Icon className="size-3 text-text-inverted" aria-hidden />
                  ) : state === 'active' ? (
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        overdueActive ? 'bg-state-destructive-solid' : 'bg-accent-default',
                      )}
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'h-0.5 flex-1',
                    i === stages.length - 1
                      ? 'opacity-0'
                      : i < currentIndex
                        ? 'bg-state-success-solid'
                        : 'bg-divider-regular',
                  )}
                />
              </div>
              <span
                className={cn(
                  'mt-0.5 text-center text-[11px] leading-tight',
                  state === 'active'
                    ? 'font-medium text-text-primary'
                    : state === 'done'
                      ? 'text-text-secondary'
                      : 'text-text-tertiary',
                )}
              >
                {stage.label}
              </span>
              {/* Date + state + sub-status grouped into a single block
                  with a real gap from the stage label above. Earlier
                  they were direct flex children with no separation, so
                  the eye couldn't tell that the stage name (e.g.
                  "Filed") and the date + Overdue/Active/Expected
                  pill below it were two different units. Critique #16
                  flagged this; wrapping them in a child flex column
                  with `mt-2` + internal `gap-0.5` separates the stage
                  label from its status detail.

                  2026-05-23 (critique #2: "no alignment to the other
                  states"): the inner block now renders for EVERY
                  column with consistent height — empty columns
                  reserve space via &nbsp; placeholders so the
                  timeline reads as a level baseline across all six
                  stages instead of a ragged active-tall / upcoming-
                  short pattern. */}
              <div className="mt-2 flex w-full flex-col items-center gap-0.5">
                <span
                  className={cn(
                    'text-center text-[10px] tabular-nums leading-tight',
                    state === 'active' ? 'text-text-primary' : 'text-text-tertiary',
                  )}
                >
                  {state === 'done' || state === 'active' || isExpected
                    ? stamp
                      ? formatDate(stamp.slice(0, 10))
                      : '—'
                    : ' '}
                </span>
                {state === 'active' || isExpected ? (
                  <span
                    className={cn(
                      'text-center text-[10px] font-medium uppercase tracking-wide leading-tight',
                      overdueActive
                        ? 'text-text-destructive'
                        : state === 'active'
                          ? 'text-text-accent'
                          : 'text-text-tertiary',
                    )}
                  >
                    {overdueActive ? t`Overdue` : state === 'active' ? t`Active` : t`Expected`}
                  </span>
                ) : null}
                {/* Sub-status annotation — only on the ACTIVE stage,
                      only when there's something meaningful to add
                      (e.g., "Awaiting acceptance" on Filed; "Partner
                      sign-off" later when review_level lands). Reads
                      existing schema fields (prepStage / reviewStage
                      / efileState). See subStatusForActiveStage()
                      above. */}
                {state === 'active' && activeSubStatus ? (
                  <span
                    className="text-center text-[10px] leading-tight text-text-secondary"
                    title={activeSubStatus}
                  >
                    {activeSubStatus}
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Stage keys, in strip order. Indexed by `timelineIndexForStatus`.
const TIMELINE_STAGE_KEYS = [
  'pending',
  'waiting_on_client',
  'blocked',
  'review',
  'done',
  'completed',
] as const

type TimelineStageKey = (typeof TIMELINE_STAGE_KEYS)[number]

// Maps each strip-stage key back to the full set of lifecycle statuses
// it absorbs (e.g., the "Filed" milestone covers both `done` and `paid`).
// Used to filter the audit-event log to events that happened WHILE the
// row was sitting in this stage.
const STAGE_STATUS_GROUPS: Record<TimelineStageKey, ReadonlySet<ObligationStatus>> = {
  pending: new Set(['pending', 'not_applicable'] as const),
  waiting_on_client: new Set(['waiting_on_client'] as const),
  blocked: new Set(['blocked'] as const),
  review: new Set(['in_progress', 'review', 'extended'] as const),
  done: new Set(['done', 'paid'] as const),
  completed: new Set(['completed'] as const),
}

// Per-stage canonical "what's next" task list. Surfaced in the
// ActiveStageDetailCard below the milestone strip. Tasks come in three
// flavours:
//   - mutation: tapping it should fire a state-change mutation (e.g.
//               "Mark filed" calls changeStatusMutation with `done`)
//   - routing : navigates somewhere else (Readiness tab, the upstream
//               blocking obligation, the Evidence tab)
//   - manual  : passive ☐ — the CPA confirms it themselves
// For the static prototype shipped 2026-05-21, tasks render as visual
// checklist rows ONLY — no mutations or routes are wired yet. Next pass
// will bind mutation tasks to the existing mutations and routing tasks
// to tab/route handlers.
type StageTaskFlavor = 'mutation' | 'routing' | 'manual'

type StageTask = {
  id: string
  label: string
  flavor: StageTaskFlavor
  primary?: boolean
  hint?: string
}

// Note: task labels are populated INSIDE ActiveStageDetailCard via
// useLingui's `t` (see useMemo below). Earlier we factored this out
// to a standalone `canonicalTasksForStage(stageKey, row, t)` helper,
// but Lingui's `@lingui/react/macro` only transforms `t\`...\``
// patterns when `t` is in scope from `useLingui()` or imported from
// the macro module — passing `t` as a function PARAMETER caused the
// macro to skip transformation, and the labels rendered empty.
// Keeping the logic inline trades a little verbosity for guaranteed
// macro coverage.

// Humanize an audit-event action string for the "Done this stage"
// list. The action vocabulary is server-defined; until we have a
// proper label map this is a best-effort de-snake. Prototype only.
function humanizeAuditAction(action: string): string {
  const cleaned = action
    .replace(/^obligation\./, '')
    .replace(/[._-]/g, ' ')
    .trim()
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : action
}

// Past-stage entry = a contiguous span the row spent in one stage,
// bookended by audit events. Used by the "Previous stages" collapsible
// list below the active card so the CPA can see (and drill into) what
// happened in earlier stages without leaving the panel.
type PastStageEntry = {
  stageKey: TimelineStageKey
  entryAt: string
  exitAt: string
  events: AuditEventPublic[]
}

function computePastStageEntries(auditEvents: readonly AuditEventPublic[]): PastStageEntry[] {
  if (auditEvents.length === 0) return []
  // Sort oldest → newest so spans accumulate forward in time
  const sorted = [...auditEvents].toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))
  // Tag each event with the stage it lands the row in (drop events
  // that don't carry a status transition)
  type EventWithStage = { event: AuditEventPublic; stageKey: TimelineStageKey }
  const tagged: EventWithStage[] = []
  for (const event of sorted) {
    if (typeof event.afterJson !== 'object' || event.afterJson === null) continue
    const status = (event.afterJson as { status?: unknown }).status
    if (typeof status !== 'string') continue
    const stageIdx = timelineIndexForStatus(status)
    const stageKey = TIMELINE_STAGE_KEYS[stageIdx]
    if (!stageKey) continue
    tagged.push({ event, stageKey })
  }
  if (tagged.length === 0) return []
  // Group consecutive events with the same stage into one span. Each
  // new stage closes the previous span's exitAt at the new entry.
  type Span = {
    stageKey: TimelineStageKey
    entryAt: string
    exitAt: string | null
    events: AuditEventPublic[]
  }
  const spans: Span[] = []
  for (const { event, stageKey } of tagged) {
    const last = spans[spans.length - 1]
    if (last && last.stageKey === stageKey) {
      last.events.push(event)
    } else {
      if (last) last.exitAt = event.createdAt
      spans.push({ stageKey, entryAt: event.createdAt, exitAt: null, events: [event] })
    }
  }
  // Past = every span EXCEPT the latest (which is the active stage
  // the row is still sitting in)
  const past = spans.slice(0, -1)
  return past.map((span) => ({
    stageKey: span.stageKey,
    entryAt: span.entryAt,
    exitAt: span.exitAt ?? span.entryAt,
    events: span.events,
  }))
}

function daysBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
}

// Canonical e-file sub-status pipeline. Linear path the row walks
// from the moment we ask for 8879 authorization through to delivering
// the final package. Branch states (rejected, corrected_resubmitted,
// paper_filed) render inline as alternative current-step labels
// rather than full extra rows, to keep the strip compact.
const EFILE_PIPELINE_KEYS = [
  'authorization_requested',
  'authorization_signed',
  'ready_to_submit',
  'submitted',
  'accepted',
  'final_package_delivered',
] as const

const PAYMENT_PIPELINE_KEYS = [
  'estimate_needed',
  'client_approval_needed',
  'scheduled',
  'confirmed',
] as const

// In-Review sub-status pipeline. Mirrors the e-file strip's shape —
// six sequential steps the row walks through from "ready to prep"
// to "approved, ready to file." Combines `prepStage` (three values:
// ready_for_prep / in_prep / prepared) with `reviewStage` (three
// non-flag values: ready_for_review / in_review / approved) into
// one linear path the CPA can see. `notes_open` is a reactive flag
// on the in_review step, not a separate step — surfaced as an
// annotation when present rather than its own column.
//
// Why we visualize this: prep ↔ review is the longest stage in the
// lifecycle and where the most days are typically spent. Without a
// strip, the CPA only sees a single sub-status word ("Ready for
// review") and has no idea what step that is in the journey, nor
// what's ahead. Same critique that originally motivated the e-file
// pipeline strip.
const REVIEW_PIPELINE_KEYS = [
  'ready_for_prep',
  'in_prep',
  'prepared',
  'ready_for_review',
  'in_review',
  'approved',
] as const
type ReviewPipelineKey = (typeof REVIEW_PIPELINE_KEYS)[number]

// Derive the current step from the row's prep + review sub-state
// columns. Review takes priority over prep — once `reviewStage` is
// set, the row has handed off to the reviewer and the strip should
// reflect that.
function reviewPipelineCurrent(row: ObligationQueueRow): ReviewPipelineKey | null {
  if (row.reviewStage === 'approved') return 'approved'
  if (row.reviewStage === 'in_review' || row.reviewStage === 'notes_open') return 'in_review'
  if (row.reviewStage === 'ready_for_review') return 'ready_for_review'
  if (row.prepStage === 'prepared') return 'prepared'
  if (row.prepStage === 'in_prep') return 'in_prep'
  if (row.prepStage === 'ready_for_prep') return 'ready_for_prep'
  // Status is `review` but no sub-stage is set yet. Treat as just-
  // started so the strip shows the first step as current rather than
  // every step as upcoming (which would be misleading — the row IS
  // in the In Review stage).
  return 'ready_for_prep'
}

// Resolve the pipeline position of a step relative to where the row
// currently sits. Returns 'done' for steps the row has already
// passed, 'current' for the active step, 'upcoming' for steps still
// ahead. If the row has no sub-status set, EVERY step reads as
// 'upcoming' (the row hasn't entered the pipeline).
function pipelineStateOf<T extends string>(
  stepKey: T,
  current: T | null | undefined,
  pipeline: readonly T[],
): 'done' | 'current' | 'upcoming' {
  if (!current) return 'upcoming'
  const currentIdx = pipeline.indexOf(current)
  if (currentIdx === -1) return 'upcoming'
  const stepIdx = pipeline.indexOf(stepKey)
  if (stepIdx < currentIdx) return 'done'
  if (stepIdx === currentIdx) return 'current'
  return 'upcoming'
}

// StageActions — the actionable surface for the active stage.
// Restructured 2026-05-21 because the prior "list of mixed-shape
// checkboxes" pattern read as chaotic: square boxes (manual) sitting
// alongside an accent-ring dot (primary mutation) sitting alongside
// ghost mutation rows. Nothing read as a clear "click here" button;
// the primary task looked like a selected radio item.
//
// New visual hierarchy:
//   1. Primary mutation task    → solid <Button>. Unmistakable CTA.
//   2. Other mutation/routing   → ghost <Button> with right-edge glyph.
//   3. Manual reminders         → single tertiary text line beneath,
//                                  not a checklist (manual tasks have
//                                  no backing schema and confused
//                                  CPAs into thinking they could
//                                  check them off in-app).
//
// Renders nothing if the task list is empty.
function StageActions({
  tasks,
  onTaskClick,
}: {
  tasks: StageTask[]
  onTaskClick: (task: StageTask) => void
}) {
  const primary = tasks.find((task) => task.primary && task.flavor === 'mutation')
  const secondary = tasks.filter(
    (task) => task !== primary && (task.flavor === 'mutation' || task.flavor === 'routing'),
  )
  const reminders = tasks.filter((task) => task.flavor === 'manual')
  if (!primary && secondary.length === 0 && reminders.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {primary ? (
        <Button
          size="sm"
          onClick={() => onTaskClick(primary)}
          title={primary.hint ?? undefined}
          className="w-fit"
        >
          {primary.label}
        </Button>
      ) : null}
      {secondary.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {secondary.map((task) => (
            <li key={task.id} className="flex">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTaskClick(task)}
                title={task.hint ?? undefined}
                className="-mx-2 h-7 justify-start gap-1.5 px-2 text-xs font-normal text-text-secondary"
              >
                <span className="flex-1 text-left">{task.label}</span>
                {task.flavor === 'routing' ? (
                  <ArrowUpRightIcon className="size-3.5 text-text-tertiary" aria-hidden />
                ) : (
                  <ChevronRightIcon className="size-3.5 text-text-tertiary" aria-hidden />
                )}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {reminders.length > 0 ? (
        <p className="text-[11px] leading-snug text-text-tertiary">
          {reminders.map((task) => task.label).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Inline blocker card rendered on the Blocked stage. Shows the
 * upstream obligation's form / client / due / current status so the
 * CPA understands WHY this row is blocked without leaving the
 * drawer. The whole card is clickable — opens the blocker's drawer
 * via the same provider the queue + client detail use.
 *
 * Fetches via `obligations.getDetail` (the same query the drawer
 * itself uses), so when the CPA clicks through to the blocker the
 * data is already in cache and the destination drawer opens
 * instantly.
 */
function BlockerContextCard({
  blockerId,
  onOpen,
}: {
  blockerId: string
  onOpen: (id: string) => void
}) {
  const { t } = useLingui()
  const detailQuery = useQuery({
    ...orpc.obligations.getDetail.queryOptions({
      input: { obligationId: blockerId },
    }),
    enabled: blockerId !== '',
  })
  const labels = useLifecycleV2StatusLabels()
  const blocker = detailQuery.data?.row ?? null
  if (detailQuery.isLoading || !blocker) {
    return (
      <div
        role="status"
        aria-label={t`Loading blocker details`}
        className="rounded-md border border-divider-subtle bg-background-subtle p-3"
      >
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-2 h-3 w-1/3" />
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(blockerId)}
      className="group flex w-full flex-col gap-1.5 rounded-md border border-divider-regular bg-background-subtle p-3 text-left transition-colors hover:border-divider-deep hover:bg-state-base-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-accent-active-alt"
      aria-label={t`Open blocking obligation: ${formatTaxCode(blocker.taxType)} for ${blocker.clientName}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
          <Trans>Blocked by</Trans>
        </span>
        <ArrowUpRightIcon
          className="size-3.5 shrink-0 text-text-tertiary transition-colors group-hover:text-text-primary"
          aria-hidden
        />
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-sm font-medium text-text-primary">
          {formatTaxCode(blocker.taxType)}
        </span>
        <span className="text-xs text-text-secondary">{blocker.clientName}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
        <Badge variant={STATUS_VARIANT[blocker.status]} className="text-[10px]">
          {labels[blocker.status]}
        </Badge>
        <span className="tabular-nums">
          <Trans>Due {formatDate(blocker.currentDueDate)}</Trans>
        </span>
      </div>
    </button>
  )
}

/**
 * Inline outstanding-docs summary rendered on the Waiting stage.
 * Shows the CPA what they're actually waiting on without forcing
 * them to switch to the Readiness tab. Up to 3 item labels surface
 * inline; the rest collapse into a "+N more" count. Clicking the
 * whole block routes to the Readiness tab for the full editor.
 *
 * Hidden entirely when no checklist exists (the row may be a
 * lightweight `payment` obligation with no readiness surface, in
 * which case the Waiting state is being used loosely). The Waiting
 * stage's regular task list still renders below to give the CPA
 * the canonical forward affordance.
 */
function WaitingOutstandingDocs({
  items,
  onOpenReadiness,
}: {
  items: readonly ReadinessDocumentChecklistItemPublic[]
  onOpenReadiness: () => void
}) {
  const { t } = useLingui()
  const outstanding = useMemo(() => items.filter((item) => item.status !== 'received'), [items])
  if (outstanding.length === 0) return null
  const visible = outstanding.slice(0, 3)
  const overflow = outstanding.length - visible.length
  return (
    <button
      type="button"
      onClick={onOpenReadiness}
      className="group flex w-full flex-col gap-1.5 rounded-md border border-divider-regular bg-background-subtle p-3 text-left transition-colors hover:border-divider-deep hover:bg-state-base-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-accent-active-alt"
      aria-label={t`Open the Readiness tab to review ${outstanding.length} outstanding documents`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
          <Plural
            value={outstanding.length}
            one="# outstanding document"
            other="# outstanding documents"
          />
        </span>
        <ArrowUpRightIcon
          className="size-3.5 shrink-0 text-text-tertiary transition-colors group-hover:text-text-primary"
          aria-hidden
        />
      </div>
      <ul className="flex flex-col gap-1">
        {visible.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm text-text-primary">
            <CircleIcon className="size-3 shrink-0 text-text-tertiary" aria-hidden />
            <span className="truncate">{item.label}</span>
          </li>
        ))}
        {overflow > 0 ? (
          <li className="text-xs text-text-tertiary">
            <Trans>+{overflow} more in the Readiness tab</Trans>
          </li>
        ) : null}
      </ul>
    </button>
  )
}

/**
 * Inline key-dates summary rendered on the Completed stage. The
 * terminal stage card is otherwise sparse — just a stage label and
 * a "Archive workpapers" reminder. CPAs landing on a closed
 * obligation are usually answering "when did this close and how
 * long did it take" for client communication or year-end review;
 * this card surfaces those answers without forcing a trip to the
 * Dates panel.
 *
 * Dates derived from audit events:
 *  - Filed: first event where status became `done`
 *  - Completed: first event where status became `completed`
 *  - Total turnaround: createdAt → completed (in days)
 *
 * `row.createdAt` is always available; the other two only render if
 * we have audit evidence for them (some rows skip directly to
 * completed via the status picker without a `done` intermediate
 * stop — for those, the Filed row is omitted).
 */
function CompletedKeyDates({
  row,
  auditEvents,
}: {
  row: ObligationQueueRow
  auditEvents: readonly AuditEventPublic[]
}) {
  const { t } = useLingui()
  const [filedAt, completedAt] = useMemo(() => {
    let filed: string | null = null
    let completed: string | null = null
    for (const event of auditEvents) {
      if (event.action !== 'status_changed') continue
      if (typeof event.afterJson !== 'object' || event.afterJson === null) continue
      const after = (event.afterJson as { status?: unknown }).status
      if (typeof after !== 'string') continue
      if (after === 'done' && !filed) filed = event.createdAt
      if (after === 'completed' && !completed) completed = event.createdAt
    }
    return [filed, completed]
  }, [auditEvents])
  const turnaroundDays = useMemo(() => {
    if (!completedAt) return null
    return daysBetween(row.createdAt, completedAt)
  }, [row.createdAt, completedAt])
  const rows: Array<{ label: string; value: string }> = [
    { label: t`Opened`, value: formatDate(row.createdAt.slice(0, 10)) },
  ]
  if (filedAt) rows.push({ label: t`Filed`, value: formatDate(filedAt.slice(0, 10)) })
  if (completedAt) rows.push({ label: t`Completed`, value: formatDate(completedAt.slice(0, 10)) })
  return (
    <div className="rounded-md border border-divider-regular bg-background-subtle p-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
        <Trans>Key dates</Trans>
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {rows.map((r) => (
          <Fragment key={r.label}>
            <dt className="text-text-tertiary">{r.label}</dt>
            <dd className="text-right tabular-nums text-text-primary">{r.value}</dd>
          </Fragment>
        ))}
        {turnaroundDays !== null ? (
          <>
            <dt className="text-text-tertiary">
              <Trans>Cycle time</Trans>
            </dt>
            <dd className="text-right tabular-nums text-text-secondary">
              <Plural value={turnaroundDays} one="# day" other="# days" />
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  )
}

function ActiveStageDetailCard({
  row,
  auditEvents,
  readinessChecklist,
  onChangeTab,
  onChangeStatus,
  onConfirmAcceptance,
  onRecordRejection,
}: {
  row: ObligationQueueRow
  auditEvents: readonly AuditEventPublic[]
  readinessChecklist: readonly ReadinessDocumentChecklistItemPublic[]
  onChangeTab: (tab: ObligationQueueDetailTab) => void
  onChangeStatus: (status: ObligationStatus) => void
  onConfirmAcceptance: () => void
  onRecordRejection: () => void
}) {
  const { t } = useLingui()
  // For the `blocked` stage's "Open blocking obligation" action.
  // Routes to the drawer for whichever upstream row blocks this one
  // (row.blockedByObligationInstanceId). Same provider the queue +
  // client-detail surfaces use, so the navigation is consistent.
  const { openDrawer } = useObligationDrawer()
  const stageIdx = timelineIndexForStatus(row.status)
  const stageKey: TimelineStageKey = TIMELINE_STAGE_KEYS[stageIdx] ?? 'pending'
  const stageLabels: Record<TimelineStageKey, string> = {
    pending: t`Not started`,
    waiting_on_client: t`Waiting`,
    blocked: t`Blocked`,
    review: t`In review`,
    done: t`Filed`,
    completed: t`Completed`,
  }
  const stageLabel = stageLabels[stageKey]
  // Sub-status descriptor — read inline (NOT from
  // `subStatusForActiveStage(row, t)` because that helper takes `t`
  // as a parameter, which the Lingui macro doesn't transform → label
  // came back empty in the prototype). Each canonical sub-status
  // gets a human-readable phrase here.
  const subStatus: string | null = (() => {
    // Sub-status text answers "WHAT is the row actually doing right
    // now?" — appears next to the stage label as "STAGE · sub-status".
    // Earlier copy ("Documents from client", "Upstream obligation",
    // "Submitted") punted on the object; readers had to fill in the
    // gap mentally. Each label below names the object + actor so the
    // line reads as a complete sentence.
    switch (row.status) {
      case 'waiting_on_client':
        if (row.prepStage === 'waiting_on_client') return t`Waiting on client to send docs`
        if (row.prepStage === 'waiting_on_third_party')
          return t`Waiting on third party for K-1 / 1099`
        if (row.prepStage === 'bookkeeping_cleanup') return t`Cleaning up client's books`
        if (row.prepStage === 'ready_for_prep') return t`All docs in — ready to draft`
        return null
      case 'blocked':
        if (row.blockedByObligationInstanceId) return t`Waiting on upstream return to file`
        return null
      case 'review':
      case 'in_progress':
        if (row.reviewStage === 'ready_for_review') return t`Ready for reviewer sign-off`
        if (row.reviewStage === 'in_review') return t`Reviewer checking the return`
        if (row.reviewStage === 'notes_open') return t`Reviewer left notes to address`
        if (row.reviewStage === 'approved') return t`Reviewer approved — ready to file`
        if (row.prepStage === 'in_prep') return t`Preparer drafting the return`
        if (row.prepStage === 'prepared') return t`Draft complete — sent to reviewer`
        if (row.prepStage === 'ready_for_prep') return t`Ready to draft the return`
        return null
      case 'extended':
        return t`Extension filed — new due date in effect`
      case 'done':
        if (row.efileState === 'authorization_requested')
          return t`8879 sent to client for signature`
        if (row.efileState === 'authorization_signed')
          return t`Client returned signed 8879 — ready to e-file`
        if (row.efileState === 'ready_to_submit') return t`Ready to e-file with authority`
        if (row.efileState === 'submitted') return t`E-filed — awaiting authority acceptance`
        if (row.efileState === 'accepted') return t`Authority accepted the return`
        if (row.efileState === 'rejected') return t`Authority rejected the e-file`
        if (row.efileState === 'corrected_resubmitted')
          return t`Corrected and re-submitted to authority`
        if (row.efileState === 'paper_filed') return t`Paper-filed with authority`
        if (row.efileState === 'final_package_delivered') return t`Final package sent to client`
        return null
      case 'paid':
        if (row.paymentState === 'estimate_needed') return t`Calculating the tax estimate`
        if (row.paymentState === 'client_approval_needed')
          return t`Awaiting client approval of estimate`
        if (row.paymentState === 'scheduled') return t`Payment scheduled with authority`
        if (row.paymentState === 'confirmed') return t`Authority confirmed payment cleared`
        return null
      default:
        return null
    }
  })()
  const stageStatusSet = STAGE_STATUS_GROUPS[stageKey]
  const stageEvents = useMemo(() => {
    const filtered = auditEvents.filter((event) => {
      if (typeof event.afterJson !== 'object' || event.afterJson === null) return false
      const status = (event.afterJson as { status?: unknown }).status
      // Widen Set<ObligationStatus> → ReadonlySet<string> for the lookup
      // (covariant widening: ReadonlySet only reads, so a Set of a narrower
      // type satisfies a ReadonlySet of a wider type). Lets us check
      // membership against an arbitrary string without an unsafe narrow.
      return typeof status === 'string' && (stageStatusSet as ReadonlySet<string>).has(status)
    })
    return [...filtered].toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)
  }, [auditEvents, stageStatusSet])
  const tasks: StageTask[] = useMemo(() => {
    switch (stageKey) {
      case 'pending':
        return [
          {
            id: 'engagement',
            label: t`Confirm engagement letter is on file for this client`,
            flavor: 'manual',
          },
          { id: 'assign', label: t`Assign a preparer to this return`, flavor: 'manual' },
          {
            id: 'start',
            label: t`Start drafting the return`,
            flavor: 'mutation',
            primary: true,
          },
        ]
      case 'waiting_on_client': {
        if (row.prepStage === 'bookkeeping_cleanup') {
          return [
            {
              id: 'books',
              label: t`Finish cleaning up the client's books`,
              flavor: 'manual',
            },
            {
              id: 'resume',
              label: t`Resume drafting the return`,
              flavor: 'mutation',
              primary: true,
            },
          ]
        }
        if (row.prepStage === 'waiting_on_third_party') {
          return [
            {
              id: 'eta',
              label: t`Confirm ETA with the third party`,
              flavor: 'manual',
            },
            {
              id: 'received',
              label: t`Mark client docs received`,
              flavor: 'mutation',
              primary: true,
            },
          ]
        }
        return [
          {
            id: 'readiness',
            label: t`Send document request to client`,
            flavor: 'routing',
            hint: t`Opens the Readiness tab to send and track the request`,
          },
          {
            id: 'chase',
            label: t`Chase client for outstanding documents`,
            flavor: 'manual',
          },
          {
            id: 'received',
            label: t`Mark client docs received`,
            flavor: 'mutation',
            primary: true,
          },
        ]
      }
      case 'blocked':
        // The inline `BlockerContextCard` above already surfaces +
        // routes to the blocking obligation. Dropping the duplicate
        // "Open blocking obligation" task — the card IS that
        // affordance, with the blocker's identity attached.
        return [
          {
            id: 'unblocked',
            label: t`Mark upstream return resolved`,
            flavor: 'mutation',
            primary: true,
          },
        ]
      case 'review': {
        const reviewTasks: StageTask[] = []
        if (row.prepStage === 'ready_for_prep' || row.prepStage === 'in_prep') {
          reviewTasks.push({
            id: 'prep-done',
            label: t`Mark drafting complete and hand off to reviewer`,
            flavor: 'manual',
          })
        }
        if (row.reviewStage === 'ready_for_review' || row.reviewStage === 'in_review') {
          reviewTasks.push({
            id: 'review-pass',
            label: t`Get reviewer sign-off on the return`,
            flavor: 'manual',
          })
        }
        if (row.reviewStage === 'notes_open') {
          reviewTasks.push({
            id: 'notes',
            label: t`Address reviewer's notes on the return`,
            flavor: 'manual',
          })
        }
        reviewTasks.push({
          id: 'sign-8879',
          label: t`Get 8879 signed by client`,
          flavor: 'routing',
        })
        reviewTasks.push({
          id: 'file',
          label: t`Mark return submitted to authority`,
          flavor: 'mutation',
          primary: true,
        })
        return reviewTasks
      }
      case 'done': {
        // Sub-status mutations on a `done` row (advancing efileState
        // through 8879-requested → signed → submitted → accepted, or
        // paymentState through estimate → approval → scheduled →
        // confirmed) need their own RPC procedures that don't ship
        // yet — see `apps/server/src/procedures/obligations/` for
        // the surfaces that exist (`updateStatus`, `markFiledRejected`)
        // and the ones that DON'T (`updateEfileState`,
        // `updatePaymentState`). Until those land, the stage card
        // surfaces sub-status work as MANUAL reminders ("do this
        // offline") rather than as buttons that click into a
        // "pending backend" toast. Where the status-level mutation
        // can still close the workflow (e.g. accepted → mark
        // obligation complete), THAT becomes the wired primary.
        //
        // Payment obligations (status === 'paid') walk the
        // paymentState pipeline; e-file rows walk efileState. Branch
        // on row.status to pick the right vocabulary.
        if (row.status === 'paid') {
          switch (row.paymentState) {
            case 'estimate_needed':
              return [
                {
                  id: 'compute-estimate',
                  label: t`Calculate the tax payment estimate`,
                  flavor: 'manual',
                },
                {
                  id: 'send-estimate',
                  label: t`Send the estimate to client for approval`,
                  flavor: 'manual',
                },
              ]
            case 'client_approval_needed':
              return [
                {
                  id: 'follow-up-approval',
                  label: t`Follow up with client to approve the estimate`,
                  flavor: 'manual',
                },
                {
                  id: 'mark-approved',
                  label: t`Mark client approved the estimate`,
                  flavor: 'manual',
                },
              ]
            case 'scheduled':
              return [
                {
                  id: 'confirm-cleared',
                  label: t`Confirm authority received the payment`,
                  flavor: 'manual',
                },
              ]
            case 'confirmed':
              return [
                {
                  id: 'complete-paid',
                  label: t`Close out this payment`,
                  flavor: 'mutation',
                  primary: true,
                },
              ]
            default:
              return [
                {
                  id: 'schedule',
                  label: t`Schedule the payment with the authority`,
                  flavor: 'manual',
                },
                {
                  id: 'confirm-cleared',
                  label: t`Confirm the payment cleared (offline)`,
                  flavor: 'manual',
                },
              ]
          }
        }
        // e-file pipeline.
        switch (row.efileState) {
          case 'authorization_requested':
            return [
              {
                id: 'remind-8879',
                label: t`Remind client to sign the 8879`,
                flavor: 'manual',
              },
              {
                id: 'mark-signed',
                label: t`Mark 8879 signed when client returns it`,
                flavor: 'manual',
              },
              // Even pre-submission rows benefit from a direct route
              // to the Evidence tab — that's where the 8879 packet
              // lives.
              {
                id: 'request-auth',
                label: t`Open the Evidence tab`,
                flavor: 'routing',
                hint: t`The Evidence tab is where the 8879 packet lives`,
              },
            ]
          case 'authorization_signed':
          case 'ready_to_submit':
            return [
              {
                id: 'submit',
                label: t`E-file the return with the tax authority`,
                flavor: 'manual',
              },
              {
                id: 'request-auth',
                label: t`Open the Evidence tab`,
                flavor: 'routing',
              },
            ]
          case 'submitted':
            return [
              {
                id: 'confirm',
                label: t`Confirm the authority accepted the return`,
                flavor: 'mutation',
                primary: true,
              },
              {
                id: 'record-rejection',
                label: t`Record the authority rejected the return`,
                flavor: 'mutation',
              },
            ]
          case 'accepted':
            return [
              {
                id: 'deliver',
                label: t`Send the final package to the client`,
                flavor: 'routing',
              },
              {
                id: 'mark-delivered',
                label: t`Mark final package sent when delivered`,
                flavor: 'manual',
              },
              // Skip past the unbacked `final_package_delivered`
              // sub-status; this canonical status advance closes the
              // workflow.
              {
                id: 'complete',
                label: t`Close out this return`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          case 'rejected':
            return [
              {
                id: 'correct',
                label: t`Correct the return for re-submission`,
                flavor: 'manual',
              },
              {
                id: 'resubmit',
                label: t`Re-submit the corrected return to the authority`,
                flavor: 'manual',
              },
              // Unwinding to In review is the canonical wired path
              // when a return is rejected — `markFiledRejected`
              // records the rejection and reopens the row.
              {
                id: 'unwind',
                label: t`Reopen the return for drafting`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          case 'corrected_resubmitted':
            return [
              {
                id: 'confirm-resubmit',
                label: t`Confirm the authority accepted the re-submission`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          case 'paper_filed':
            return [
              {
                id: 'deliver-paper',
                label: t`Send the final package to the client`,
                flavor: 'routing',
              },
              {
                id: 'mark-delivered-paper',
                label: t`Mark final package sent when delivered`,
                flavor: 'manual',
              },
              {
                id: 'complete',
                label: t`Mark obligation complete`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          case 'final_package_delivered':
            return [
              {
                id: 'complete',
                label: t`Mark obligation complete`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          default:
            // No efileState yet — row entered Filed manually (e.g.,
            // via the status dropdown) without going through the
            // e-file pipeline. Surface generic "where do we go from
            // here?" choices.
            return [
              {
                id: 'request-auth',
                label: t`Send 8879 to client for signature`,
                flavor: 'routing',
              },
              {
                id: 'confirm-default',
                label: t`Confirm the authority accepted the return`,
                flavor: 'mutation',
                primary: true,
              },
            ]
        }
      }
      case 'completed':
        return [{ id: 'archive', label: t`File the workpapers in the archive`, flavor: 'manual' }]
      default:
        return []
    }
  }, [stageKey, row.status, row.prepStage, row.reviewStage, row.efileState, row.paymentState, t])
  const stageEnteredAt =
    stageEvents.length > 0 ? stageEvents[stageEvents.length - 1]!.createdAt : null
  // Past stages — every stage the row visited BEFORE the active one.
  // Collapsed by default; one click reveals the audit events for that
  // stage. The CPA sees the chronology without losing the active-card
  // focus. Single-expand-at-a-time keeps the panel from ballooning.
  const pastEntries = useMemo(() => computePastStageEntries(auditEvents), [auditEvents])
  const [expandedPast, setExpandedPast] = useState<TimelineStageKey | null>(null)
  // Label maps for the e-file / payment sub-status pipelines, computed
  // inline so the Lingui macro transforms the t-tags correctly.
  // Same "actor + object" treatment as the review pipeline above.
  // "Ready to submit" → ready to submit *what*? The e-file. "Final
  // package delivered" → delivered *to whom*? The client. Naming the
  // object (the return, the e-file, the package) keeps the CPA
  // anchored on what's actually happening at this step.
  const efilePipelineLabels: Record<(typeof EFILE_PIPELINE_KEYS)[number], string> = {
    authorization_requested: t`8879 sent to client for signature`,
    authorization_signed: t`Client returned signed 8879`,
    ready_to_submit: t`Ready to e-file the return`,
    submitted: t`E-filed — awaiting authority acceptance`,
    accepted: t`Authority accepted the return`,
    final_package_delivered: t`Final package sent to client`,
  }
  const paymentPipelineLabels: Record<(typeof PAYMENT_PIPELINE_KEYS)[number], string> = {
    estimate_needed: t`Calculating tax estimate`,
    client_approval_needed: t`Awaiting client approval of estimate`,
    scheduled: t`Payment scheduled with authority`,
    confirmed: t`Authority confirmed payment cleared`,
  }
  // Step labels say WHO is doing WHAT to the return, not generic
  // verbs. Earlier copy ("Preparer in progress", "Prepared — handing
  // off", "Ready for prep") punted on the object — prep of what,
  // ready for what? Each label below names both the actor (preparer
  // / reviewer / etc.) and what's happening to the return.
  const reviewPipelineLabels: Record<ReviewPipelineKey, string> = {
    ready_for_prep: t`Ready to draft the return`,
    in_prep: t`Preparer drafting the return`,
    prepared: t`Draft complete — sent to reviewer`,
    ready_for_review: t`Ready for reviewer sign-off`,
    in_review: t`Reviewer checking the return`,
    approved: t`Reviewer approved — ready to file`,
  }
  const reviewCurrent = reviewPipelineCurrent(row)
  const notesOpen = row.reviewStage === 'notes_open'
  // Task click dispatcher. Sub-status mutations (efileState /
  // paymentState / prepStage / reviewStage) don't have RPC procedures
  // yet — those tasks fall through to a toast placeholder. Status-
  // level transitions (review / done / completed) and the special
  // markAccepted / markFiledRejected calls are wired to the
  // mutations the drawer already owns.
  const handleTaskClick = (task: StageTask) => {
    switch (task.id) {
      // Status → review (start work / unpause / unblock / resume)
      case 'start':
      case 'received':
      case 'resume':
      case 'unblocked':
        return onChangeStatus('review')
      // Status → done (mark filed)
      case 'file':
        return onChangeStatus('done')
      // Done → completed (acceptance verdict variants)
      case 'confirm':
      case 'confirm-default':
      case 'confirm-resubmit':
        return onConfirmAcceptance()
      // Done → review (rejection verdict variants)
      case 'record-rejection':
      case 'unwind':
        return onRecordRejection()
      // Status → completed (terminal advance)
      case 'complete':
      case 'complete-paid':
        return onChangeStatus('completed')
      // Routing: switch tab so the CPA can act on the next surface
      case 'deliver':
      case 'deliver-paper':
      case 'request-auth':
      case 'sign-8879':
        return onChangeTab('evidence')
      case 'readiness':
        return onChangeTab('readiness')
      // Blocked → open the blocking obligation's drawer. Uses the
      // same ObligationDrawerProvider the queue + client-detail
      // mount, so the navigation matches every other "open this
      // obligation" affordance. If the row carries a blocker ID but
      // the provider isn't mounted for some reason, fall back to
      // the toast so the click isn't silently dropped.
      case 'open-blocker': {
        if (row.blockedByObligationInstanceId) {
          openDrawer(row.blockedByObligationInstanceId)
        } else {
          toast.info(t`This row isn't linked to a blocking obligation.`)
        }
        return
      }
      // Defensive fallback. Earlier this branch absorbed sub-status
      // mutations (mark-signed / submit / mark-approved / etc.) that
      // didn't have RPC procedures yet — those tasks are now
      // declared as `manual` flavor so they render as text reminders
      // and never reach `handleTaskClick`. If we ever reintroduce a
      // wired task without updating this switch, the toast at least
      // tells the user the click registered.
      default:
        return toast.info(t`This action isn't wired up yet.`)
    }
  }
  // Is this Filed (done) AND in the e-file route, vs Filed (paid)
  // AND in the payment route? Both map to the same milestone but
  // walk different sub-status pipelines.
  const showEfilePipeline = stageKey === 'done' && row.status !== 'paid'
  const showPaymentPipeline = stageKey === 'done' && row.status === 'paid'
  // In Review gets the same pipeline strip treatment as Filed, but
  // only for `review`/`in_progress`/`extended` rows that actually
  // live in the canonical review flow. The strip walks the row's
  // prepStage + reviewStage as a single 6-step path so the CPA can
  // see "we're in prep" vs "we're in review" at a glance.
  const showReviewPipeline = stageKey === 'review'
  return (
    <section
      aria-label={t`Active stage detail`}
      className="rounded-lg border border-divider-subtle bg-background-default p-4"
    >
      {/* Header: stage name + sub-status + when we entered this stage. */}
      <header className="flex flex-col gap-0.5">
        <h3 className="flex flex-wrap items-baseline gap-x-2 text-xs font-medium uppercase tracking-wider text-text-tertiary">
          <span className="text-text-primary">{stageLabel}</span>
          {subStatus ? (
            <span className="normal-case tracking-normal text-text-secondary">· {subStatus}</span>
          ) : null}
        </h3>
        {stageEnteredAt ? (
          <p className="text-xs text-text-tertiary">
            <Trans>Entered {formatDate(stageEnteredAt.slice(0, 10))}</Trans>
          </p>
        ) : null}
      </header>

      {/* Stage-specific context. Each branch surfaces the info the
          CPA actually needs to act on this stage without leaving the
          drawer (per docs/Design/deadline-status-meaning-and-journey-2026-05-23.md):
            - Blocked → WHICH upstream obligation is blocking (form +
              client + due + status, clickable into the blocker's
              drawer).
            - Waiting → outstanding documents count + first few items
              so the CPA knows what they're waiting on without
              switching to the Readiness tab.
          The other stages either have their info already (e-file /
          payment pipelines) or land in P1 (In Review pipeline,
          Completed summary). */}
      {stageKey === 'blocked' && row.blockedByObligationInstanceId ? (
        <div className="mt-3">
          <BlockerContextCard
            blockerId={row.blockedByObligationInstanceId}
            onOpen={(id) => openDrawer(id)}
          />
        </div>
      ) : null}
      {stageKey === 'waiting_on_client' ? (
        <div className="mt-3">
          <WaitingOutstandingDocs
            items={readinessChecklist}
            onOpenReadiness={() => onChangeTab('readiness')}
          />
        </div>
      ) : null}
      {stageKey === 'completed' ? (
        <div className="mt-3">
          <CompletedKeyDates row={row} auditEvents={auditEvents} />
        </div>
      ) : null}

      {/* Steps within the current stage — vertical list of every
          canonical sub-status. Done steps render with a green check,
          the current step gets an accent dot + bold label + its task
          list indented beneath, and upcoming steps render as quiet
          empty circles. "Steps" (not "Pipeline") because CPAs say
          "what step am I on?" — pipeline reads as engineering jargon. */}
      {showEfilePipeline || showPaymentPipeline ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Steps</Trans>
          </p>
          <ul className="flex flex-col gap-1">
            {(showEfilePipeline ? EFILE_PIPELINE_KEYS : PAYMENT_PIPELINE_KEYS).map((key) => {
              // The 4 casts in this block (key + row state, repeated for
              // efile/payment branches) are runtime-correlated with
              // `showEfilePipeline` by construction: when true the keys
              // came from EFILE_PIPELINE_KEYS and `row.efileState` is the
              // relevant column; when false the payment-side equivalents
              // apply. TypeScript can't track the correlation through the
              // ternary, but the existing call shape is safe — the lint
              // suppressions match the runtime-safe pattern used elsewhere
              // in this file.
              const state = showEfilePipeline
                ? pipelineStateOf(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- key correlated with showEfilePipeline
                    key as (typeof EFILE_PIPELINE_KEYS)[number],
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- row.efileState is the matching column
                    row.efileState as (typeof EFILE_PIPELINE_KEYS)[number] | null | undefined,
                    EFILE_PIPELINE_KEYS,
                  )
                : pipelineStateOf(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- key correlated with showEfilePipeline
                    key as (typeof PAYMENT_PIPELINE_KEYS)[number],
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- row.paymentState is the matching column
                    row.paymentState as (typeof PAYMENT_PIPELINE_KEYS)[number] | null | undefined,
                    PAYMENT_PIPELINE_KEYS,
                  )
              // `key` is iterated from EFILE_PIPELINE_KEYS or PAYMENT_PIPELINE_KEYS
              // depending on `showEfilePipeline` — same correlation already
              // applied at the `pipelineStateOf` calls above. The cast is
              // runtime-safe by construction; lint can't prove the ternary
              // correlation so we suppress the same way as the adjacent
              // pipelineStateOf args.
              const label = showEfilePipeline
                ? // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- key correlated with showEfilePipeline
                  efilePipelineLabels[key as (typeof EFILE_PIPELINE_KEYS)[number]]
                : // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- key correlated with showEfilePipeline
                  paymentPipelineLabels[key as (typeof PAYMENT_PIPELINE_KEYS)[number]]
              return (
                <li key={key} className="flex flex-col">
                  <div className="flex items-start gap-2 text-xs">
                    {state === 'done' ? (
                      <CheckCircle2Icon
                        className="mt-0.5 size-3.5 shrink-0 text-state-success-solid"
                        aria-hidden
                      />
                    ) : state === 'current' ? (
                      <span
                        aria-hidden
                        className="mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border-2 border-accent-default bg-background-default"
                      >
                        <span className="size-1.5 rounded-full bg-accent-default" />
                      </span>
                    ) : (
                      <span
                        aria-hidden
                        className="mt-0.5 inline-block size-3.5 shrink-0 rounded-full border border-divider-regular bg-background-default"
                      />
                    )}
                    <span
                      className={cn(
                        'flex-1 leading-snug',
                        state === 'done'
                          ? 'text-text-tertiary'
                          : state === 'current'
                            ? 'font-medium text-text-primary'
                            : 'text-text-tertiary opacity-70',
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {/* Actions ONLY under the current step. Primary
                      mutation becomes a solid button; secondary
                      options become ghost text-links; manual
                      reminders collapse to one tertiary text line. */}
                  {state === 'current' && tasks.length > 0 ? (
                    <div className="ml-6 mt-2 mb-2">
                      <StageActions tasks={tasks} onTaskClick={handleTaskClick} />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : showReviewPipeline ? (
        /* In Review pipeline strip — same shape as the e-file /
           payment strips above but walks prepStage → reviewStage.
           When `reviewStage === 'notes_open'` the in_review step
           keeps the current-step treatment but picks up a small
           "Notes open" annotation, since notes_open is a flag on
           the in_review step rather than its own step. */
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Steps</Trans>
          </p>
          <ul className="flex flex-col gap-1">
            {REVIEW_PIPELINE_KEYS.map((key) => {
              const state = pipelineStateOf(key, reviewCurrent, REVIEW_PIPELINE_KEYS)
              const label = reviewPipelineLabels[key]
              const showNotesOpen = state === 'current' && key === 'in_review' && notesOpen
              return (
                <li key={key} className="flex flex-col">
                  <div className="flex items-start gap-2 text-xs">
                    {state === 'done' ? (
                      <CheckCircle2Icon
                        className="mt-0.5 size-3.5 shrink-0 text-state-success-solid"
                        aria-hidden
                      />
                    ) : state === 'current' ? (
                      <span
                        aria-hidden
                        className="mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border-2 border-accent-default bg-background-default"
                      >
                        <span className="size-1.5 rounded-full bg-accent-default" />
                      </span>
                    ) : (
                      <span
                        aria-hidden
                        className="mt-0.5 inline-block size-3.5 shrink-0 rounded-full border border-divider-regular bg-background-default"
                      />
                    )}
                    <span
                      className={cn(
                        'flex-1 leading-snug',
                        state === 'done'
                          ? 'text-text-tertiary'
                          : state === 'current'
                            ? 'font-medium text-text-primary'
                            : 'text-text-tertiary opacity-70',
                      )}
                    >
                      {label}
                      {showNotesOpen ? (
                        <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-text-warning">
                          · <Trans>Notes open</Trans>
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {state === 'current' && tasks.length > 0 ? (
                    <div className="ml-6 mt-2 mb-2">
                      <StageActions tasks={tasks} onTaskClick={handleTaskClick} />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : tasks.length > 0 ? (
        /* Non-pipeline stages (Not started / Waiting / Blocked /
           Completed) — no pipeline strip, just the action surface.
           Primary button + secondary ghost links + manual reminders
           inline. No "What's next" eyebrow because the button is
           self-evident as the next action. */
        <div className="mt-3">
          <StageActions tasks={tasks} onTaskClick={handleTaskClick} />
        </div>
      ) : null}

      {/* Done this stage: audit events whose afterJson.status maps to
          the current stage. Shows the recent chronology so the CPA can
          see HOW the row landed here without leaving the panel. */}
      {stageEvents.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-divider-subtle pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Done this stage</Trans>
          </p>
          <ul className="flex flex-col gap-1.5">
            {stageEvents.map((event) => (
              <li key={event.id} className="flex items-start gap-2 text-xs">
                <CheckCircle2Icon
                  className="mt-0.5 size-3.5 shrink-0 text-state-success-solid"
                  aria-hidden
                />
                <span className="flex-1 leading-snug text-text-secondary">
                  {humanizeAuditAction(event.action)}
                  {event.actorLabel ? (
                    <span className="text-text-tertiary"> · {event.actorLabel}</span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums text-text-tertiary">
                  {formatDate(event.createdAt.slice(0, 10))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Previous stages — every stage the row passed through before
          landing on the active one. Collapsed by default so the card
          stays quiet; each row expands individually to show that
          stage's audit chronology. Answers "how did we get here?"
          without taking up vertical space when the CPA only cares
          about what's happening now. */}
      {pastEntries.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-divider-subtle pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Previous stages</Trans> · {pastEntries.length}
          </p>
          <ul className="flex flex-col gap-0.5">
            {pastEntries.map((entry) => {
              const open = expandedPast === entry.stageKey
              const days = daysBetween(entry.entryAt, entry.exitAt)
              return (
                <li key={entry.stageKey} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setExpandedPast(open ? null : entry.stageKey)}
                    aria-expanded={open}
                    className="-mx-1 flex items-center gap-2 rounded px-1 py-1 text-left text-xs outline-none hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  >
                    <ChevronRightIcon
                      className={cn(
                        'size-3 shrink-0 text-text-tertiary transition-transform',
                        open && 'rotate-90',
                      )}
                      aria-hidden
                    />
                    <CheckCircle2Icon
                      className="size-3.5 shrink-0 text-state-success-solid"
                      aria-hidden
                    />
                    <span className="flex-1 truncate text-text-secondary">
                      {stageLabels[entry.stageKey]}
                    </span>
                    <span className="shrink-0 tabular-nums text-text-tertiary">
                      {days === 0 ? (
                        <Trans>same day</Trans>
                      ) : (
                        <Plural value={days} one="# day" other="# days" />
                      )}
                    </span>
                  </button>
                  {open ? (
                    <ul className="ml-7 mt-1 mb-1 flex flex-col gap-1 border-l border-divider-subtle pl-3">
                      {entry.events.map((event) => (
                        <li key={event.id} className="flex items-start gap-2 text-xs">
                          <span className="flex-1 leading-snug text-text-secondary">
                            {humanizeAuditAction(event.action)}
                            {event.actorLabel ? (
                              <span className="text-text-tertiary"> · {event.actorLabel}</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 tabular-nums text-text-tertiary">
                            {formatDate(event.createdAt.slice(0, 10))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

// Lifecycle status → timeline-stage index (0-5). Maps the full 10-state
// `ObligationStatus` palette to the 6-stage milestone strip:
//   pending / not_applicable → 0 (Not started)
//   waiting_on_client        → 1 (Waiting)
//   blocked                  → 2 (Blocked)
//   in_progress / review / extended → 3 (In review)
//   done / paid              → 4 (Filed)
//   completed                → 5 (Completed)
// Sub-status annotation for the active milestone. Reads existing
// schema fields (prepStage / reviewStage / efileState) — no new
// columns. Each lifecycle status has its own "what specifically is
// happening here" follow-up vocabulary; surfacing it on the timeline
// turns "In review" into "In review · Partner sign-off" so a senior
// CPA knows whether to escalate or wait.
function subStatusForActiveStage(
  row: ObligationQueueRow,
  t: (strings: TemplateStringsArray, ...keys: unknown[]) => string,
): string | null {
  switch (row.status) {
    case 'waiting_on_client': {
      if (row.prepStage === 'waiting_on_client') return t`Documents from client`
      if (row.prepStage === 'waiting_on_third_party') return t`Third-party docs`
      if (row.prepStage === 'bookkeeping_cleanup') return t`Bookkeeping cleanup`
      if (row.prepStage === 'ready_for_prep') return t`Ready for prep`
      return null
    }
    case 'blocked': {
      if (row.blockedByObligationInstanceId) return t`Upstream obligation`
      return null
    }
    case 'review':
    case 'in_progress': {
      if (row.reviewStage === 'ready_for_review') return t`Ready for review`
      if (row.reviewStage === 'in_review') return t`In review`
      if (row.reviewStage === 'notes_open') return t`Notes open`
      if (row.reviewStage === 'approved') return t`Approved — ready to file`
      if (row.prepStage === 'in_prep') return t`Preparer in progress`
      return null
    }
    case 'done':
    case 'paid': {
      if (row.efileState === 'accepted') return t`Accepted by authority`
      if (row.efileState === 'rejected') return t`Rejected — unwind to In review`
      if (row.efileState === 'submitted') return t`Awaiting acceptance`
      if (row.efileState === 'paper_filed') return t`Paper filed`
      if (row.efileState === 'corrected_resubmitted') return t`Corrected & resubmitted`
      if (row.efileState === 'final_package_delivered') return t`Package delivered`
      return null
    }
    case 'extended': {
      return t`Extension active`
    }
    default:
      return null
  }
}

function timelineIndexForStatus(status: string): number {
  switch (status) {
    case 'pending':
    case 'not_applicable':
      return 0
    case 'waiting_on_client':
      return 1
    case 'blocked':
      return 2
    case 'in_progress':
    case 'review':
    case 'extended':
      return 3
    case 'done':
    case 'paid':
      return 4
    case 'completed':
      return 5
    default:
      return 0
  }
}

// Earliest audit-event timestamp per timeline stage. The lifecycle is
// not strictly linear (a row can ping-pong between waiting_on_client
// and blocked, or come back to in_review after a rejection), so we
// stamp each stage at its FIRST entry rather than the latest.
function mineTimelineTimestamps(
  auditEvents: readonly AuditEventPublic[],
  stageKeys: readonly ObligationStatus[],
): (string | null)[] {
  const sorted = [...auditEvents].toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))
  const stamps: (string | null)[] = stageKeys.map(() => null)
  for (const event of sorted) {
    if (typeof event.afterJson !== 'object' || event.afterJson === null) continue
    const afterStatus = (event.afterJson as { status?: unknown }).status
    if (typeof afterStatus !== 'string') continue
    const idx = timelineIndexForStatus(afterStatus)
    if (stamps[idx] === null) stamps[idx] = event.createdAt
  }
  return stamps
}

// `PathToFilingChevron` removed 2026-05-21 — at 440px panel width the
// 5 × 4 = 20 text/icon elements were unreadable. `PathToFilingSummary`
// replaces it in the snapshot block; full stage-by-stage history lives
// on the Timeline tab via `ObligationTimeline`.

function PenaltyInputDialog({
  row,
  onClose,
  onSaved,
}: {
  row: ObligationQueueRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useLingui()
  const [draft, setDraft] = useState({ rowId: '', taxDue: '', ownerCount: '' })
  const mutation = useMutation(
    orpc.clients.updatePenaltyInputs.mutationOptions({
      onSuccess: () => {
        toast.success(t`Penalty inputs saved`)
        onSaved()
        onClose()
      },
      onError: (err) => {
        toast.error(t`Couldn't save penalty inputs`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )

  if (row && draft.rowId !== row.id) {
    setDraft({ rowId: row.id, taxDue: '', ownerCount: '' })
  }

  function save() {
    if (!row) return
    const taxDue = parseMoneyCents(draft.taxDue)
    const ownerCount = parseOwnerCount(draft.ownerCount)
    mutation.mutate({
      id: row.clientId,
      ...(taxDue !== null ? { estimatedTaxLiabilityCents: taxDue } : {}),
      ...(ownerCount !== null ? { equityOwnerCount: ownerCount } : {}),
      reason: t`Obligation needs-input update`,
    })
  }

  return (
    <Dialog open={row !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans>Penalty inputs</Trans>
          </DialogTitle>
          <DialogDescription>
            {row ? `${row.clientName} - ${formatTaxCode(row.taxType)}` : null}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            inputMode="decimal"
            placeholder={t`Estimated tax due`}
            value={draft.taxDue}
            onChange={(event) =>
              setDraft((current) => ({ ...current, taxDue: event.target.value }))
            }
          />
          <Input
            inputMode="numeric"
            placeholder={t`Owner count`}
            value={draft.ownerCount}
            onChange={(event) =>
              setDraft((current) => ({ ...current, ownerCount: event.target.value }))
            }
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={save} disabled={mutation.isPending}>
            <Trans>Save changes</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function parseMoneyCents(value: string): number | null {
  const normalized = value.trim().replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : null
}

function parseOwnerCount(value: string): number | null {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

// Scope tab — borderless, inline count, active state is a 2px accent
// underline that overlaps the parent's bottom hairline (via -mb-px on
// the parent and border-b-2 here). The count is a sibling tabular span,
// not a nested pill — pill-inside-pill was visual stutter.
//
// Collapsible search control — magnifier icon at rest, expands into
// an inline Input when clicked OR when the user presses `/` (the
// global hotkey focuses `inputRef`, which auto-opens via
// useEffect below). Stays open while a query value is present so the
// user always sees what they're filtering by.
function ObligationQueueSearchControl({
  inputRef,
  value,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  value: string
  onChange: (next: string) => void
}) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const isOpen = open || value.length > 0
  // `/` hotkey focuses the input — open the box so focus has a place
  // to land. The handler in the route still calls .focus()+.select()
  // on inputRef; we just react to the focus.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return undefined
    const onFocus = () => setOpen(true)
    el.addEventListener('focus', onFocus)
    return () => el.removeEventListener('focus', onFocus)
  }, [inputRef])
  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t`Search clients`}
        title={t`Search clients  ·  press / to focus`}
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        className="mb-1.5 size-8 shrink-0"
      >
        <SearchIcon className="size-4" aria-hidden />
      </Button>
    )
  }
  return (
    <div className="relative mb-1.5 w-full md:w-56 md:flex-none">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-tertiary" />
      <Input
        ref={inputRef}
        aria-label={t`Search obligations`}
        className="h-8 pl-8 pr-8"
        placeholder={t`Search clients`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          if (value.length === 0) setOpen(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onChange('')
            setOpen(false)
            inputRef.current?.blur()
          }
        }}
      />
      {value.length > 0 ? (
        <button
          type="button"
          aria-label={t`Clear search`}
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          className="absolute top-1/2 right-1.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-text-tertiary outline-none hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <XIcon className="size-3.5" aria-hidden />
        </button>
      ) : (
        <kbd
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-divider-regular bg-background-subtle px-1.5 font-sans text-[10px] tabular-nums text-text-tertiary"
        >
          /
        </kbd>
      )}
    </div>
  )
}

// `dotTone` (optional) renders the same status indicator dot the row
// badge uses, mirroring queue colors into the tab so the user can see
// at a glance which scope corresponds to which row tint. Omitted on
// the "All" tab (it's an aggregate, not a single status).
function ObligationQueueScopeTab({
  label,
  count,
  active,
  onClick,
  dotTone,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  dotTone?: React.ComponentProps<typeof BadgeStatusDot>['tone']
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2 py-2 text-sm whitespace-nowrap transition-colors ${
        active
          ? 'border-accent-default font-medium text-text-primary'
          : 'border-transparent text-text-secondary hover:border-divider-deep hover:text-text-primary'
      }`}
    >
      {dotTone ? <BadgeStatusDot tone={dotTone} /> : null}
      <span>{label}</span>
      <span className="tabular-nums text-text-tertiary">{count}</span>
    </button>
  )
}

// Quick-filter chip: ghost when off, soft-tinted when on. Used for the
// 4 CPA action filters under the scope tabs (Past due, Due this week,
// Needs evidence, Penalty input needed). Pill-shaped per T3 —
// indicator, not commit.
//
// When active, an inline × renders inside the chip as a visible
// dismissal affordance. The whole chip is still the click target
// (clicking anywhere on an active chip toggles it off) — the × is a
// visual cue so users don't have to guess that "click again to remove."
function ObligationQueueActionChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
        active
          ? 'border-accent-default bg-accent-tint font-medium text-text-accent'
          : 'border-divider-regular bg-background-default text-text-secondary hover:border-divider-deep hover:text-text-primary'
      }`}
    >
      <span>{children}</span>
      {active ? <XIcon aria-hidden className="size-3" /> : null}
    </button>
  )
}

// K-1 dependency wiring (PDF anti-pattern #4 + §6.4). Lives in the
// Readiness tab because "what's upstream of us" is part of the
// readiness picture — if a partner's 1040 is waiting on a
// partnership's K-1, that's the binding blocker, not whether the W-2
// landed. Renders one of three states:
//   - currently blocked: shows the parent label + Clear button
//   - not blocked, candidates available: shows a Select to set one
//   - not blocked, no candidates loaded: minimal hint only
// `ObligationBlockerSection` removed 2026-05-21 — the editor lived
// inside the Readiness tab on every drawer open, even on rows that
// weren't blocked. The queue row's <BlockedByChip> still surfaces the
// state. A re-home is parked behind the design brainstorm; the
// `updateBlockedBy` RPC procedure stays on the server.

function EmptyState({
  onOpenWizard,
  canRunMigration,
  hasActiveFilters,
  onClearFilters,
}: {
  onOpenWizard: () => void
  canRunMigration: boolean
  hasActiveFilters: boolean
  onClearFilters: () => void
}) {
  // Branch on whether the user has narrowed the queue via filters.
  // With filters: "Clear filters" CTA (do NOT recommend Import — the
  // workspace may very well have data hidden by the filter).
  // Without filters: import-clients CTA (workspace is genuinely empty).
  return (
    <SharedEmptyState
      title={
        hasActiveFilters ? (
          <Trans>No obligations match these filters.</Trans>
        ) : (
          <Trans>No obligations yet.</Trans>
        )
      }
      description={
        hasActiveFilters ? (
          <Trans>
            Try a different filter combination, or clear all filters to see the full queue.
          </Trans>
        ) : (
          <Trans>Import a CSV of clients to start tracking their obligations.</Trans>
        )
      }
      cta={
        hasActiveFilters ? (
          <Button size="sm" onClick={onClearFilters}>
            <Trans>Clear filters</Trans>
          </Button>
        ) : (
          <Button size="sm" onClick={onOpenWizard} disabled={!canRunMigration}>
            <Trans>Import clients</Trans>
          </Button>
        )
      }
    />
  )
}

function CalendarSyncPopover() {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const subscriptionsQuery = useQuery({
    ...orpc.calendar.listSubscriptions.queryOptions({ input: undefined }),
    enabled: open,
  })
  const subscription =
    subscriptionsQuery.data?.find((entry) => entry.scope === 'my' && entry.feedUrl) ?? null
  const feedUrl = subscription?.feedUrl ?? null

  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.calendar.key() })

  const upsertMutation = useMutation(
    orpc.calendar.upsertSubscription.mutationOptions({
      onSuccess: () => {
        toast.success(t`Calendar subscription enabled`)
        void invalidate()
      },
      onError: (err) => {
        toast.error(t`Couldn't enable calendar subscription`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const regenerateMutation = useMutation(
    orpc.calendar.regenerateSubscription.mutationOptions({
      onSuccess: () => {
        toast.success(t`Calendar URL regenerated`)
        void invalidate()
      },
      onError: (err) => {
        toast.error(t`Couldn't regenerate calendar URL`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )

  async function copyFeedUrl() {
    if (!feedUrl) return
    try {
      await navigator.clipboard.writeText(feedUrl)
      toast.success(t`Calendar URL copied`)
    } catch {
      toast.error(t`Couldn't copy calendar URL`)
    }
  }

  return (
    <>
      {open ? (
        <div
          aria-hidden
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm">
              <CalendarDaysIcon data-icon="inline-start" />
              <Trans>Calendar sync</Trans>
            </Button>
          }
        />
        <PopoverContent align="end" className="w-80 gap-3">
          <PopoverHeader>
            <PopoverTitle>
              <Trans>My deadlines</Trans>
            </PopoverTitle>
            <p className="text-xs text-text-tertiary">
              <Trans>
                Subscribe from Google Calendar, Apple Calendar, or Outlook. DueDateHQ stays the
                source of truth.
              </Trans>
            </p>
          </PopoverHeader>
          {subscriptionsQuery.isLoading ? (
            <div className="grid gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : feedUrl ? (
            <div className="grid gap-2">
              <Input
                readOnly
                value={feedUrl}
                className="font-mono text-xs"
                aria-label={t`Calendar URL`}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void copyFeedUrl()} className="flex-1">
                  <CopyIcon data-icon="inline-start" />
                  <Trans>Copy URL</Trans>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => subscription && regenerateMutation.mutate({ id: subscription.id })}
                  disabled={regenerateMutation.isPending}
                >
                  <RefreshCwIcon
                    data-icon="inline-start"
                    className={cn(regenerateMutation.isPending && 'animate-spin')}
                  />
                  <Trans>Regenerate</Trans>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <p className="text-xs text-text-secondary">
                <Trans>
                  Generate a private subscription URL so deadlines assigned to you appear in your
                  personal calendar.
                </Trans>
              </p>
              <Button
                size="sm"
                onClick={() => upsertMutation.mutate({ scope: 'my', privacyMode: 'full' })}
                disabled={upsertMutation.isPending}
              >
                <Trans>Enable subscription</Trans>
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  )
}
