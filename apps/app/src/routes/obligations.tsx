import {
  Fragment,
  useCallback,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { plural } from '@lingui/core/macro'
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
import { AnimatePresence, motion } from 'motion/react'
import { useLocation, useNavigate, useParams } from 'react-router'
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  CircleDashed,
  Clock,
  Eye,
  FileCheck2,
  Lock,
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
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileArchiveIcon,
  FileSearchIcon,
  CalendarClockIcon,
  CheckIcon,
  FileTextIcon,
  Info,
  PaperclipIcon,
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
import { Link } from 'react-router'

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
  type ObligationPrepStage,
  type ObligationQueueListInput,
  type ObligationQueueRow,
  type ObligationQueueSort,
  type ObligationQueueExportFormat,
  type ObligationQueueExportSelectedInput,
  type ObligationReviewStage,
  type AiInsightPublic,
  type AuditEventPublic,
  type ClientReadinessRequestPublic,
  type ClientReadinessResponsePublic,
  type ReadinessDocumentChecklistItemPublic,
} from '@duedatehq/contracts'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button, buttonVariants } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Input } from '@duedatehq/ui/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
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
  tableHeaderFilterIconTrigger,
  tableHeaderFilterTrigger,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { EmptyState as SharedEmptyState } from '@/components/patterns/empty-state'
import { FloatingActionBar } from '@/components/patterns/floating-action-bar'
import { PageHeader } from '@/components/patterns/page-header'
import { IsoDatePicker, isValidIsoDate } from '@/components/primitives/iso-date-picker'
import { SearchInput } from '@/components/primitives/search-input'
import { ConceptLabel } from '@/features/concepts/concept-help'
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
  STATUS_ICON,
  STATUS_ICON_COLOR,
  STATUS_VARIANT,
  useLifecycleV2StatusLabels,
  useStatusLabels,
  type ObligationStatus,
} from '@/features/obligations/status-control'
import { BlockedByChip, isBlockedByVisible } from '@/features/obligations/blocked-by-chip'
import {
  DEADLINE_DETAIL_TABS,
  cleanDeadlineDetailSearch,
  deadlineDetailHref,
  findObligationIdByDeadlineRef,
  normalizeDeadlineDetailTab,
  normalizeDeadlineRef,
  obligationIdMatchesDeadlineRef,
} from '@/features/obligations/deadline-detail-url'
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
const DETAIL_TABS = DEADLINE_DETAIL_TABS
const DENSITY_OPTIONS = [
  'comfortable',
  'compact',
] as const satisfies readonly ObligationQueueDensity[]
const DEFAULT_SORT: ObligationQueueSort = 'smart_priority'
const DEFAULT_DENSITY: ObligationQueueDensity = 'comfortable'
// 2026-05-26 (Yuqi /deadlines #2): explicit "Group by" mode. Default
// `due` keeps the chronological flat list the current product
// optimises for. `client` clusters rows under client section
// headers (with aggregate metadata). `status` clusters by status
// (Blocked / Waiting on client / In review / Filed / Not started).
const GROUP_OPTIONS = ['due', 'client', 'status'] as const
type ObligationQueueGroup = (typeof GROUP_OPTIONS)[number]
const DEFAULT_GROUP: ObligationQueueGroup = 'due'
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

async function copyTextToClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    return
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.append(textarea)
    textarea.focus()
    textarea.select()
    try {
      if (!document.execCommand('copy')) throw new Error('Clipboard fallback failed.')
    } finally {
      textarea.remove()
    }
  }
}

function openExternalUrl(value: string): void {
  const opened = window.open(value, '_blank')
  if (opened) {
    opened.opener = null
    opened.focus()
    return
  }
  window.location.assign(value)
}

function openExternalUrlFromAnchorClick(event: MouseEvent<HTMLAnchorElement>, value: string): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  ) {
    return
  }
  event.preventDefault()
  openExternalUrl(value)
}

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
// Columns that auto-collapse when the detail panel is open.
// 2026-05-25 (Yuqi Deadlines #11): widened the auto-hide set to
// keep only Client + Internal Due in the queue while the drawer is
// open. Status / Priority / Days-until-due all repeat information
// the drawer header / body already surfaces for the focused
// obligation, and the queue here only needs to support row-to-row
// navigation — name + when-it's-due. State / County / Tax type /
// Assignee / Evidence were already in the auto-hide set from the
// earlier 2026-05-21 panel-fit pass for the same reason (panel
// header carries them). On close, the user's saved column choices
// come back because we strip the auto-hidden set from the saved
// `hidden` URL state before persisting (see onColumnVisibilityChange).
const PANEL_OPEN_AUTO_HIDDEN_COLUMN_IDS = [
  'clientState',
  'clientCounty',
  'taxType',
  'assigneeName',
  'evidenceCount',
  'smartPriority',
  'daysUntilDue',
  'status',
] as const
const OBLIGATION_QUEUE_ROW_CONTROL_SELECTOR =
  'button,a[href],input,label,select,textarea,[role="button"],[role="checkbox"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="option"],[role="radio"],[role="tab"],[data-slot="checkbox"]'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STATE_CODE_RE = /^[A-Z]{2}$/
const ReadinessChecklistItemsSchema = ReadinessChecklistItemSchema.array().min(1).max(30)

function isObligationQueueDetailTab(value: string): value is ObligationQueueDetailTab {
  return ObligationQueueDetailTabSchema.safeParse(value).success
}

function deadlineDetailStateObligationId(state: unknown, routeRef: string | null): string | null {
  if (!routeRef || !state || typeof state !== 'object') return null
  const obligationId = Reflect.get(state, 'obligationId')
  if (typeof obligationId !== 'string') return null
  return obligationIdMatchesDeadlineRef(obligationId, routeRef) ? obligationId : null
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
  group: parseAsStringLiteral(GROUP_OPTIONS)
    .withDefault(DEFAULT_GROUP)
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
  const location = useLocation()
  const navigate = useNavigate()
  const routeParams = useParams()
  const routeObligationRef = normalizeDeadlineRef(routeParams.obligationRef)
  const routeDetailTab = normalizeDeadlineDetailTab(routeParams.detailTab)
  const routeStateObligationId = deadlineDetailStateObligationId(location.state, routeObligationRef)
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
      group,
      hide: hiddenColumns,
      row,
    },
    setObligationQueueQuery,
  ] = useQueryStates(obligationQueueSearchParamsParsers)
  // Slice D: when ?lifecycle=v2 is active AND the URL has no explicit
  // ?sort= param, default the queue to internal deadline ascending instead of
  // Smart Priority. Smart Priority remains in the sort dropdown — it's
  // just no longer the implicit ranking. Reinforces "Dashboard
  // curates, Deadlines sorts" per the design brief.
  const sort: ObligationQueueSort = useMemo(() => {
    if (!lifecycleV2) return urlSort
    const hasExplicitSort = new URLSearchParams(location.search).has('sort')
    return hasExplicitSort ? urlSort : 'due_asc'
  }, [urlSort, lifecycleV2, location.search])
  const [penaltyRow, setPenaltyRow] = useState<ObligationQueueRow | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pageIndex, setPageIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  // 2026-05-24 (re-critique): lifted from `ObligationQueueSearchControl`
  // so the `/` hotkey can imperatively expand the collapsed search
  // box before deferring focus. The control's own click-to-expand
  // path also goes through this setter, so the two entry points
  // share the same expansion mechanism.
  const [searchOpen, setSearchOpen] = useState(false)
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
  // 2026-05-26 (Yuqi fifty-seventh pass — group-by wired):
  // previously `group` URL state was set by the Group-by dropdown
  // but NEVER consumed in the sorting/rendering pipeline, so the
  // dropdown was a UI lie (the table didn't visually change when
  // you picked "Client" or "Status"). Yuqi flagged it twice:
  // "the selection does not work, the table does not change".
  //
  // Minimum-viable fix: layer the group key as the PRIMARY sort,
  // with the user's chosen sort as secondary. TanStack table
  // honors multi-column sorting natively, so rows of the same
  // group (same client / same status) are now adjacent. The user
  // can still pick a secondary sort (e.g. group=client + sort by
  // currentDueDate asc → grouped by client, within each client
  // sorted by due date).
  //
  // This stops short of full section-headers + collapse (the
  // ~200-line port from design/deadlines-drawer-rework). What it
  // delivers: the dropdown is no longer a lie — picking Client
  // or Status visibly regroups the rows.
  const sorting = useMemo<SortingState>(() => {
    const baseSort = getSortingState(sort)
    if (group === 'client') return [{ id: 'clientName', desc: false }, ...baseSort]
    if (group === 'status') return [{ id: 'status', desc: false }, ...baseSort]
    return baseSort
  }, [sort, group])
  // When the user intends to open the detail panel (short route ref,
  // or legacy drawer=obligation + id), the table loses ~440px to make room. Auto-
  // collapse State / County / Tax type — they're already in the panel
  // header so the cell is redundant; freeing the column space lets
  // the remaining 7 columns fit the narrower viewport without
  // horizontal scroll. We react to URL intent (not `activeDetailId`)
  // so columns adjust the moment the user clicks, before the row
  // model resolves.
  const panelOpenIntent =
    Boolean(routeObligationRef) || (drawer === 'obligation' && Boolean(detailId))
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
  // 2026-05-25 (Yuqi Deadlines #6): group headers. When 2+ adjacent
  // rows share a clientId, the FIRST row's id is keyed in this map
  // with the cluster's metadata (count + earliest internal due). The
  // table body uses this to render a one-line "X · N deadlines ·
  // earliest YYYY-MM-DD" section header above the first row in the
  // cluster. Single-row clients are NOT keyed — they don't need a
  // header; the row's own Client cell speaks for itself.
  //
  // Computed from `rows` (not `pagedRows`) so the cluster count
  // reflects the full result set, not just the visible page. Same
  // pattern as continuationRowIds / withinGroupRowIds above.
  const groupHeadersByFirstRowId = useMemo(() => {
    const map = new Map<
      string,
      { clientId: string; clientName: string; count: number; earliestDueDate: string }
    >()
    let i = 0
    while (i < rows.length) {
      const start = rows[i]!
      let j = i + 1
      while (j < rows.length && rows[j]!.clientId === start.clientId) j++
      if (j - i > 1) {
        let earliest = start.currentDueDate
        for (let k = i + 1; k < j; k++) {
          if (rows[k]!.currentDueDate < earliest) earliest = rows[k]!.currentDueDate
        }
        map.set(start.id, {
          clientId: start.clientId,
          clientName: start.clientName,
          count: j - i,
          earliestDueDate: earliest,
        })
      }
      i = j
    }
    return map
  }, [rows])
  // 2026-05-25 (Yuqi /deadlines fourth pass #6): collapsible
  // client-deadline grouping. State is local + transient — not
  // URL-bound — because expand/collapse is a per-view scroll-state
  // preference, not a deep-linkable filter. Default is "all
  // expanded" (the current behaviour); user can click any group
  // header to collapse that cluster down to just its summary line.
  // Key is clientId so collapse state survives the row-id changes
  // that happen when paginating or sorting (the same client's
  // rows on page 2 still collapse if the user collapsed them on
  // page 1).
  const [collapsedClientGroups, setCollapsedClientGroups] = useState<Set<string>>(() => new Set())
  const toggleClientGroupCollapse = useCallback((clientId: string) => {
    setCollapsedClientGroups((current) => {
      const next = new Set(current)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
  }, [])
  const rowsById = useMemo(
    () => new Map(rows.map((obligationQueueRow) => [obligationQueueRow.id, obligationQueueRow])),
    [rows],
  )
  const routeDetailId =
    routeStateObligationId ?? findObligationIdByDeadlineRef(rows, routeObligationRef)
  const legacyDetailId = drawer === 'obligation' && detailId ? detailId : null
  const activeDetailId = routeDetailId ?? legacyDetailId
  const activeDetailTab = routeObligationRef ? (routeDetailTab ?? 'readiness') : detailTab
  const activeRow =
    (row ? rowsById.get(row) : null) ??
    (activeDetailId ? rowsById.get(activeDetailId) : null) ??
    rows[0] ??
    null
  // Separate "the user explicitly selected this row" (drives the
  // background highlight + aria-selected) from "the keyboard cursor
  // sits here" (drives J/K, Enter, hotkeys, falls back to rows[0]).
  // Pre-2026-05-21 the two were one variable, so the first row was
  // always tinted even with no panel open — which made the queue
  // look like row 1 was permanently focused. Now the highlight
  // only appears when `row` is set in the URL.
  const explicitActiveRowId =
    activeDetailId && rowsById.has(activeDetailId)
      ? activeDetailId
      : row && rowsById.has(row)
        ? row
        : null
  const openQueueDetail = useCallback(
    (obligationId: string, tab: ObligationQueueDetailTab = activeDetailTab) => {
      void navigate(deadlineDetailHref({ obligationId, tab, search: location.search }), {
        state: { obligationId },
      })
    },
    [activeDetailTab, location.search, navigate],
  )
  const closeQueueDetail = useCallback(() => {
    if (routeObligationRef) {
      void navigate(`/deadlines${cleanDeadlineDetailSearch(location.search)}`)
      return
    }
    void setObligationQueueQuery({ drawer: null, id: null, row: null })
  }, [location.search, navigate, routeObligationRef, setObligationQueueQuery])
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
        cell: ({ row: tableRow, table }) => {
          const isGroupedClientRow =
            continuationRowIds.has(tableRow.original.id) ||
            withinGroupRowIds.has(tableRow.original.id)
          return (
            <div className={cn(isGroupedClientRow && 'translate-x-[26px]')}>
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
            </div>
          )
        },
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
          const isGroupedClientRow = isContinuation || withinGroupRowIds.has(tableRow.original.id)
          if (isContinuation) {
            // Same-client continuation: client name lives on the
            // first row of the group. We used to render an entirely
            // empty cell which read as "this row has no client" to
            // first-time users (critique flagged Magnolia Family
            // Trust → FL Corporate Income).
            //
            // 2026-05-24 (critique /polish): show a quiet `↳` glyph
            // so the cell is visibly empty-by-design. The 2px left
            // rail on the row + the welded bottom border still carry
            // the grouping; this is a small belt-and-suspenders cue
            // for the eye. Full client name stays in `sr-only` for
            // screen readers — every row still announces its client.
            return (
              <div className="flex items-center gap-1.5 pl-3 text-text-quaternary">
                <span aria-hidden className="text-xs leading-none">
                  ↳
                </span>
                <span className="sr-only">{tableRow.original.clientName}</span>
              </div>
            )
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
            <div className={cn('flex min-w-0 items-center gap-1.5', isGroupedClientRow && 'pl-3')}>
              <span
                onClick={handleClientNameClick}
                onMouseDown={(event) => {
                  // Prevent text-selection drag from interfering with
                  // the shift-click range gesture.
                  if (event.shiftKey) event.preventDefault()
                }}
                // 2026-05-25 (Yuqi Deadlines #3): client name bumped
                // from text-xs (12px) to text-sm (14px). Yuqi flagged
                // it as still too small to read at scan distance even
                // after font-medium — the client column is the row's
                // anchor, not meta caption.
                // 2026-05-26 (Yuqi forty-second pass — content title
                // unification): rolled back from text-base → text-sm.
                // Every other content title on Today / Alerts /
                // Deadlines uses text-sm font-medium; the
                // client-name column was a one-off bump that broke
                // the rule. The row anchor still reads weighty
                // because of font-medium + text-text-primary while
                // the meta values around it use text-text-tertiary
                // — weight + color carry the prominence, not size.
                className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-tight text-text-primary"
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
                <span className="text-caption-xs tabular-nums leading-tight text-text-tertiary">
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
                className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-divider-regular text-caption-xs text-text-tertiary"
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
        meta: { cellClassName: 'w-[52px]' },
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
              label={label}
              sort={sort}
              ascSort="due_asc"
              descSort="due_desc"
              firstSort="due_asc"
              sortLabel={`${t`Sort`} ${label}`}
              onSortChange={changeSort}
            >
              <RangeHeaderFilterDropdown
                trigger="icon"
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
        cell: ({ row: tableRow }) => (
          <DueDaysPill days={tableRow.original.daysUntilDue} status={tableRow.original.status} />
        ),
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
      withinGroupRowIds,
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
  // 2026-05-26 (Yuqi /deadlines #4 follow-up): page subtitle metrics.
  // `lateCount` = past-internal-due rows excluding terminal statuses
  // (Filed / Reverted — they shouldn't read as "late" any more, that
  // ship has sailed). `dueThisWeekCount` = next 7 days, not yet late.
  // `uniqueClientCount` = distinct clients across the loaded set,
  // surfaced in the footer aggregate.
  const lateCount = useMemo(
    () =>
      tableRows.reduce((sum, r) => {
        // Skip terminal "filed" rows — past-due is no longer
        // actionable once the deadline is filed. `done` is the
        // status taxonomy's filed-state per the project's status
        // taxonomy. Reverted is also terminal, but the row union
        // type doesn't include it on this filter context — extend
        // here if the row type grows to include it later.
        if (r.original.status === 'done') return sum
        return sum + (r.original.daysUntilDue < 0 ? 1 : 0)
      }, 0),
    [tableRows],
  )
  const dueThisWeekCount = useMemo(
    () =>
      tableRows.reduce((sum, r) => {
        const days = r.original.daysUntilDue
        return sum + (days >= 0 && days <= 7 ? 1 : 0)
      }, 0),
    [tableRows],
  )
  // 2026-05-26 (Yuqi sixtieth pass — richer subtitle): the
  // subtitle had collapsed to just "13 late" when nothing was due
  // this week, which felt too sparse to justify the slot. Adding
  // two more signals — blocked count + waiting on client count —
  // so the page header always carries 2-4 metrics worth knowing
  // when ANY of them are non-zero.
  const blockedCount = useMemo(
    () => tableRows.reduce((sum, r) => sum + (r.original.status === 'blocked' ? 1 : 0), 0),
    [tableRows],
  )
  const waitingOnClientCount = useMemo(
    () =>
      tableRows.reduce((sum, r) => sum + (r.original.status === 'waiting_on_client' ? 1 : 0), 0),
    [tableRows],
  )
  const uniqueClientCount = useMemo(
    () => new Set(tableRows.map((r) => r.original.clientId)).size,
    [tableRows],
  )
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
  //
  // 2026-05-24 (re-critique): the search control is COLLAPSED to a
  // magnifier button when neither `searchOpen` nor `value.length > 0`
  // is true, so on a fresh load with no `?q=` in the URL the
  // `<Input>` isn't rendered and `searchInputRef.current` is null —
  // pressing `/` was a silent no-op. Now the hotkey opens the
  // control first (if needed) and RAF-defers focus until the input
  // mounts. `searchOpen` was lifted from the search control into
  // this parent for exactly this reason.
  useAppHotkey(
    '/',
    () => {
      setSearchOpen(true)
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      })
    },
    {
      enabled: !shortcutsBlocked,
      requireReset: true,
      meta: {
        id: 'obligations.focus-search',
        name: 'Focus search',
        description: 'Focus the Deadlines search input.',
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
      description: 'Move the active Deadlines row down.',
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
      description: 'Move the active Deadlines row up.',
      category: 'obligations',
      scope: 'route',
    },
  })

  useAppHotkey(
    'Enter',
    (event) => {
      if (isInteractiveEventTarget(event.target)) return
      if (!activeRow) return
      openQueueDetail(activeRow.id, activeDetailTab)
    },
    {
      enabled: keyboardEnabled,
      requireReset: true,
      meta: {
        id: 'obligations.open-detail',
        name: 'Open detail',
        description: 'Open the active deadline detail drawer.',
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
      if (activeDetailId) {
        closeQueueDetail()
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
        description: 'Close the deadline detail drawer or clear the focused row.',
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
    if (routeObligationRef) {
      void navigate('/deadlines')
    } else {
      void setObligationQueueQuery(null)
    }
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
        reason: t`Deadlines bulk owner change`,
      },
      {
        onSuccess: () => {
          const count = selectedIds.length
          const label = assigneeName ?? t`Unassigned`
          toast.success(t`Assigned ${count} deadlines to ${label}`)
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
    // Layout is a fixed-viewport-height column ALWAYS (was previously
    // only when the detail panel was open). The queue scrolls
    // independently inside its column so the sticky-bottom
    // pagination footer pins to the VIEWPORT bottom rather than the
    // table's natural bottom (which fell below the fold when the
    // table was long, "Deadlines的pagination去哪儿了"). When the detail
    // panel opens, the column becomes the left half of a 2-col row;
    // when it closes, the column expands to full width — both states
    // share the same height-constrained / overflow-y-auto scroll
    // model.
    // 2026-05-25 (GitHub-density pass): outer gap-6 → gap-4,
    // padding md:p-6 → md:p-5. Deadlines is the densest table
    // surface in the app — every extra row of breathing room is one
    // less row of work visible. Tighter outer rhythm reclaims room
    // for the table itself.
    // 2026-05-25 (Yuqi page-title pass): top padding pt-6 md:pt-8
    // (kept the tight horizontal + bottom from the density pass).
    <div
      className={cn(
        // 2026-05-26 (Yuqi fifty-sixth pass — panel-aware bottom):
        // when a deadline is open in the inline panel, strip the
        // page-chrome bottom padding so the drawer's left edge runs
        // edge-to-edge to the viewport bottom. Mirrors the
        // `!pb-0 md:!pb-0` pattern used on /rules/pulse when the
        // alert panel is open — the panel reads as a true column,
        // not a card floating inside page chrome.
        'flex flex-col gap-4 px-4 pt-6 pb-4 md:px-5 md:pt-8 md:pb-5',
        'xl:h-[calc(100vh-1rem)] xl:overflow-hidden xl:pb-2',
        activeDetailId && 'md:!pb-0 xl:!pb-0',
      )}
    >
      {/* 2026-05-26 (Yuqi /deadlines #4): title now carries the
          scope total alongside it ("Deadlines · 247"), matching
          /clients and /rules/library which both show their counts
          in the title. Uses scopeTotal (the unfiltered count of the
          active status scope) so the number is stable as the user
          types in the search/filter chips — what the count
          represents shouldn't change mid-typing. */}
      <PageHeader
        title={
          // 2026-05-26 (Yuqi fifty-fourth pass — title vertical
          // alignment): items-baseline → items-center so the count
          // chip's mono digits sit middle-aligned against the h1.
          // items-baseline was placing the chip lower (digit
          // baseline aligned with the larger h1 baseline), giving
          // a visual sag at the count.
          <span className="inline-flex items-center gap-2">
            <ConceptLabel concept="obligation">
              <Trans>Deadlines</Trans>
            </ConceptLabel>
            <span className="font-mono text-base font-normal tabular-nums text-text-tertiary">
              {scopeTotal}
            </span>
          </span>
        }
        // 2026-05-26 (Yuqi /deadlines redesign): subtitle surfaces
        // the two metrics CPAs care about first — what's late + what
        // needs attention this week. Both computed from the loaded
        // rows; degrades to nothing when there are zero of either.
        // 2026-05-26 (Yuqi sixtieth pass — richer subtitle): added
        // blocked + waiting-on-client signals so the subtitle always
        // carries multiple meaningful metrics. When the queue has
        // 13 late + 0 of everything else, the bare "13 late" felt
        // too sparse to justify the slot. Now reads as a full
        // pipeline scan: "13 late · 4 due this week · 2 blocked ·
        // 5 waiting on client". Dots separate; metrics with zero
        // count drop out entirely so the line stays scannable.
        description={(() => {
          const segments: Array<{ key: string; node: ReactNode }> = []
          if (lateCount > 0) {
            segments.push({
              key: 'late',
              node: (
                <span className="font-medium text-text-destructive">
                  <Plural value={lateCount} one="# late" other="# late" />
                </span>
              ),
            })
          }
          if (dueThisWeekCount > 0) {
            segments.push({
              key: 'due-this-week',
              node: (
                <span className="text-text-secondary">
                  <Plural value={dueThisWeekCount} one="# due this week" other="# due this week" />
                </span>
              ),
            })
          }
          if (blockedCount > 0) {
            segments.push({
              key: 'blocked',
              node: (
                <span className="text-text-secondary">
                  <Plural value={blockedCount} one="# blocked" other="# blocked" />
                </span>
              ),
            })
          }
          if (waitingOnClientCount > 0) {
            segments.push({
              key: 'waiting',
              node: (
                <span className="text-text-secondary">
                  <Plural
                    value={waitingOnClientCount}
                    one="# waiting on client"
                    other="# waiting on client"
                  />
                </span>
              ),
            })
          }
          if (segments.length === 0) return undefined
          return (
            <span className="inline-flex flex-wrap items-center gap-x-2 text-sm">
              {segments.map((segment, idx) => (
                <Fragment key={segment.key}>
                  {idx > 0 ? (
                    <span aria-hidden className="text-text-tertiary">
                      ·
                    </span>
                  ) : null}
                  {segment.node}
                </Fragment>
              ))}
            </span>
          )
        })()}
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
          // Always constrain the row height at xl+ so the inner
          // queue column can scroll independently and the sticky
          // pagination footer pins to the viewport.
          'xl:min-h-0 xl:flex-1 xl:items-stretch',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-3',
            // Always overflow-y-auto at xl+ with `scrollbar-gutter:
            // stable` so the layout doesn't shift when the
            // scrollbar appears.
            // 2026-05-26 (Yuqi scrollbar audit): dropped the
            // `xl:pr-1` inset that ran when a detail panel was
            // open. It pushed the scrollbar 4px inside the queue
            // column — same "inset / floating inside" issue Yuqi
            // flagged on Alerts. With the gutter stable, the
            // scrollbar hugs the column's right edge and the
            // layout doesn't jump.
            'xl:overflow-y-auto xl:[scrollbar-gutter:stable]',
            !activeDetailId && 'overflow-x-auto',
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
          {/* 2026-05-25 (Yuqi Deadlines #9): filter row is now
              sticky to the top of the scroll container so the
              status tabs stay accessible when scrolling a long
              list. `top-0` anchors to the page's main scroll
              container (set in app-shell.tsx); the row picks up
              `bg-background-default` + a backdrop-blur fallback so
              row content scrolling underneath doesn't show through.
              z-10 keeps it above table content but below modals. */}
          {/* 2026-05-25 (Yuqi /deadlines fourth pass #1): retired
              the "Filter by status" eyebrow above the scope tabs.
              The tabs are self-evidently a status filter — the
              labels (All / Today / Open / Blocked / Waiting on
              client / Filed) name the dimension out loud. The
              eyebrow was a duplicate "this is what these tabs
              are" caption that just added a row of chrome. */}
          <div className="sticky top-0 z-10 flex flex-col gap-1.5 border-b border-divider-regular bg-background-default/95 backdrop-blur-sm">
            <div className="flex flex-wrap items-end gap-3">
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
                    // 2026-05-25 (Yuqi status icon pass): scope tabs lead
                    // with the same lucide icon used on row pills — same
                    // glyph in the same color across the cell + the tab,
                    // so the user can match "this filter brings up the
                    // rows with this mark".
                    // 2026-05-25 (status-pill audit §4 #8): dropped the
                    // `dotTone={STATUS_DOT[status]}` fallback. Every
                    // status-mapped tab provides an `icon` so the dot
                    // path was already dead, and STATUS_DOT is being
                    // retired from the export surface (icon-led badges
                    // are canonical per audit §3.3).
                    icon={STATUS_ICON[status]}
                    iconColor={STATUS_ICON_COLOR[status]}
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
                open={searchOpen}
                onOpenChange={setSearchOpen}
                onChange={(nextSearch) =>
                  void setObligationQueueQuery(
                    {
                      q: nextSearch || null,
                      obligation: null,
                      row: null,
                    },
                    nextSearch === ''
                      ? undefined
                      : { limitUrlUpdates: queryInputUrlUpdateRateLimit },
                  )
                }
              />
            </div>
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
              {/* 2026-05-26 (Yuqi /deadlines redesign): Group by
                  switcher. Three modes — Due date (default flat
                  chronological), Client (clusters by client),
                  Status (clusters by status). The selected mode
                  drives the row sort key so groupings cluster
                  visually even before the full section-header
                  rendering lands. The full grouped UI with sticky
                  collapsible section headers + aggregate pills is
                  in a separate spawned task per PRD. */}
              <Select
                value={group}
                onValueChange={(next) => {
                  if (next === 'due' || next === 'client' || next === 'status') {
                    void setObligationQueueQuery({ group: next })
                  }
                }}
              >
                {/* 2026-05-26 (Yuqi fifty-fourth pass — dropdown
                    style match Alerts page): trigger now uses the
                    canonical filter-trigger chrome from
                    docs/Design/inset-surface-design-system.md
                    (border-divider-strong + bg-background-default
                    + hover:bg-state-base-hover). Same shape as the
                    /rules/pulse source / status / impact filters
                    so all dropdowns across the product read as one
                    family. Width h-8 + gap-1.5 stays — matches the
                    Alerts panel-aware filter pattern. */}
                <SelectTrigger className="h-8 w-[164px] gap-1.5 border-divider-strong bg-background-default text-xs text-text-primary hover:bg-state-base-hover">
                  <span className="text-text-tertiary">
                    <Trans>Group by</Trans>
                  </span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="due">
                    <Trans>Due date</Trans>
                  </SelectItem>
                  <SelectItem value="client">
                    <Trans>Client</Trans>
                  </SelectItem>
                  <SelectItem value="status">
                    <Trans>Status</Trans>
                  </SelectItem>
                </SelectContent>
              </Select>
              <span className="tabular-nums text-xs text-text-tertiary">
                <Plural value={totalShown} one="# row" other="# rows" />
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    /* 2026-05-26 (Yuqi /deadlines #8): variant outline →
                       ghost. The toolbar's right cluster has the
                       row-count + columns trigger; the column trigger
                       was reading as a primary affordance via its
                       outline border. Ghost matches the row-count's
                       quietness — both are "info / control" rather
                       than "do something." */
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t`Columns — ${visibleHideableCount} of ${totalHideableCount} visible`}
                      title={t`${visibleHideableCount} of ${totalHideableCount} columns visible`}
                      className="gap-1.5"
                    >
                      <Columns3Icon className="size-4" aria-hidden />
                      <span className="text-caption tabular-nums text-text-secondary">
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
              {/* 2026-05-26 (Yuqi /deadlines redesign): Snooze
                  surfaced as a peer of Assign / Set status / Export.
                  Backend mutation (bulk reschedule internal due
                  date) hasn't shipped yet — for now the affordance
                  is visually present but disabled with a "Coming
                  soon" tooltip, matching the CommandPalette's
                  honest-coming-soon pattern. When the backend
                  lands, this gets wired to `orpc.obligations.
                  bulkSnooze` and the disabled state drops. */}
              <Button
                variant="ghost"
                size="sm"
                disabled
                title={t`Snooze (coming soon)`}
                aria-label={t`Snooze selected deadlines (coming soon)`}
              >
                <Clock data-icon="inline-start" />
                <Trans>Snooze</Trans>
              </Button>
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
              <Trans>Loading deadlines…</Trans>
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-state-destructive-border bg-state-destructive-hover p-4 text-sm text-text-destructive">
              <Trans>Couldn't load deadlines.</Trans>{' '}
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
              {/* 2026-05-25 (Yuqi Deadlines #3, #4, #5): table
                  size + chrome bumped. Wrapper picks up
                  `rounded-md border` so the table reads as a
                  framed surface (was edge-to-edge). Body rows
                  go py-2.5 (was py-2) and pick up text-sm
                  (was text-xs) at the cell level so client +
                  deadline content reads at body type instead of
                  caption-tier. Per-column `headerClassName` is
                  preserved by the `meta` plumbing below. */}
              <Table className="overflow-hidden rounded-md border border-divider-regular [&_th]:!whitespace-normal [&_th]:!px-2 [&_td]:!whitespace-normal [&_td]:!px-2 [&_td]:!align-middle [&_td]:break-words">
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
                {/* 2026-05-25 (GitHub-density pass): row vertical
                    padding py-2.5 → py-2. Each row reclaims ~4px,
                    so over 17 rows the page shows ~70px more
                    content per viewport. text-sm + py-2 still keeps
                    enough vertical room to read multi-line client
                    names with the existing line-clamp-2. */}
                {/* 2026-05-26 (Yuqi fifty-fourth pass — spacier row):
                    cell padding py-2 → py-3. py-2 (8px) read as
                    cramped at the new larger client-name type size;
                    py-3 (12px) gives the row honest breathing room
                    while still keeping density reasonable for the
                    queue's primary scan. AffectedClientsTable
                    (Alerts) stays at py-2 since that table sits
                    inside a drawer with tighter chrome — different
                    surface, different density. */}
                <TableBody className="[&_td]:py-3 [&_td]:text-sm">
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
                    tableRows.map((tableRow) => {
                      // 2026-05-25 (Yuqi /deadlines fourth pass #6):
                      // group header is now an interactive collapse
                      // button. Clicking toggles whether the
                      // continuation rows underneath are shown. The
                      // continuation rows hide / show via the
                      // `isContinuationCollapsed` check below — the
                      // header row stays visible either way so the
                      // cluster is still findable when collapsed.
                      const groupHeader = groupHeadersByFirstRowId.get(tableRow.original.id)
                      const headerCollapsed = groupHeader
                        ? collapsedClientGroups.has(groupHeader.clientId)
                        : false
                      // When a client cluster is collapsed, hide
                      // the continuation rows (rows 2..N) entirely.
                      // The FIRST row of the cluster is also hidden
                      // — only the header remains, which is what
                      // "collapsed" should mean semantically. The
                      // header is rendered inside the Fragment
                      // below; when the leaf row is suppressed, we
                      // still emit the header.
                      const isHiddenContinuation =
                        continuationRowIds.has(tableRow.original.id) &&
                        collapsedClientGroups.has(tableRow.original.clientId)
                      if (isHiddenContinuation) return null
                      const suppressLeafRow = groupHeader && headerCollapsed
                      return (
                        <Fragment key={tableRow.id}>
                          {groupHeader ? (
                            <TableRow className="border-b-0 border-l-2 border-l-divider-regular hover:bg-state-base-hover">
                              <TableCell
                                colSpan={visibleColumnCount}
                                className="py-1 pl-2 pr-4 text-xs text-text-tertiary"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleClientGroupCollapse(groupHeader.clientId)}
                                  aria-expanded={!headerCollapsed}
                                  aria-controls={`client-group-${groupHeader.clientId}`}
                                  aria-label={
                                    headerCollapsed
                                      ? t`Expand ${groupHeader.clientName}`
                                      : t`Collapse ${groupHeader.clientName}`
                                  }
                                  className="inline-flex w-full items-baseline gap-x-2 gap-y-0.5 rounded-sm py-0.5 pl-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                                >
                                  <ChevronRightIcon
                                    className={cn(
                                      'size-3.5 shrink-0 text-text-tertiary transition-transform duration-100 ease-out',
                                      !headerCollapsed && 'rotate-90',
                                    )}
                                    aria-hidden
                                  />
                                  <span className="font-semibold text-text-secondary">
                                    {groupHeader.clientName}
                                  </span>
                                  <span aria-hidden>·</span>
                                  <span className="tabular-nums">
                                    <Plural
                                      value={groupHeader.count}
                                      one="# deadline"
                                      other="# deadlines"
                                    />
                                  </span>
                                  <span aria-hidden>·</span>
                                  <span className="tabular-nums">
                                    <Trans>
                                      earliest{' '}
                                      {formatDate(groupHeader.earliestDueDate.slice(0, 10))}
                                    </Trans>
                                  </span>
                                </button>
                              </TableCell>
                            </TableRow>
                          ) : null}
                          {suppressLeafRow ? null : (
                            <TableRow
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
                                tableRow.original.id === explicitActiveRowId &&
                                  'bg-state-base-hover',
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
                                if (
                                  isObligationQueueRowControlClick(
                                    event.target,
                                    event.currentTarget,
                                  )
                                ) {
                                  void setObligationQueueQuery({ row: tableRow.original.id })
                                  return
                                }
                                openQueueDetail(tableRow.original.id, activeDetailTab)
                              }}
                              onKeyDown={(event) => {
                                // Match native button semantics: Enter and
                                // Space both activate; ignore when focus is
                                // inside a control cell so spacebar-toggling
                                // a checkbox doesn't also open the drawer.
                                if (event.key !== 'Enter' && event.key !== ' ') return
                                if (
                                  isObligationQueueRowControlClick(
                                    event.target,
                                    event.currentTarget,
                                  )
                                )
                                  return
                                event.preventDefault()
                                openQueueDetail(tableRow.original.id, activeDetailTab)
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
                          )}
                        </Fragment>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </>
          )}
          {/* 2026-05-25 (Yuqi /deadlines fourth pass #3): pagination
              footer dropped `sticky bottom-0 -mx-1` so the row sits
              as a static block immediately BELOW the table frame
              instead of pinning to the viewport bottom and visually
              overlapping the last data row. With client-side page
              flipping the user navigates by page rather than by
              scroll, so the sticky pin wasn't doing useful work —
              it was just making the controls feel "inside" the
              table. `mt-auto` retained so the footer still pushes
              to the bottom of the flex column when the table is
              short. */}
          <div className="mt-auto flex items-center justify-between border-t border-divider-subtle bg-background-default px-2 py-2">
            <div className="flex items-center gap-3 text-xs text-text-tertiary">
              {/* 2026-05-26 (Yuqi /deadlines redesign): footer now
                  carries "N deadlines · M clients" so the aggregate
                  scope is visible at the bottom of the table. The
                  client count comes from distinct clientIds across
                  the loaded rows. */}
              <span>
                <Plural value={rows.length} one="# deadline" other="# deadlines" />
                {uniqueClientCount > 0 ? (
                  <>
                    <span aria-hidden> · </span>
                    <Plural value={uniqueClientCount} one="# client" other="# clients" />
                  </>
                ) : null}
              </span>
              {rows.length > 0 ? (
                <>
                  <span
                    aria-hidden
                    className="hidden h-3 border-l border-divider-subtle md:inline-block"
                  />
                  <span className="hidden items-center gap-1.5 md:inline-flex">
                    <kbd className="rounded border border-divider-regular bg-background-subtle px-1.5 py-0 font-sans text-caption-xs tabular-nums text-text-tertiary">
                      J
                    </kbd>
                    <kbd className="rounded border border-divider-regular bg-background-subtle px-1.5 py-0 font-sans text-caption-xs tabular-nums text-text-tertiary">
                      K
                    </kbd>
                    <span>
                      <Trans>navigate</Trans>
                    </span>
                    <kbd className="ml-1 rounded border border-divider-regular bg-background-subtle px-1.5 py-0 font-sans text-caption-xs tabular-nums text-text-tertiary">
                      Enter
                    </kbd>
                    <span>
                      <Trans>open</Trans>
                    </span>
                    <kbd className="ml-1 rounded border border-divider-regular bg-background-subtle px-1.5 py-0 font-sans text-caption-xs tabular-nums text-text-tertiary">
                      ?
                    </kbd>
                    <span>
                      <Trans>all</Trans>
                    </span>
                  </span>
                </>
              ) : null}
            </div>
            {/* 2026-05-26 (Yuqi /deadlines #7): pagination always
                visible. Was previously hidden when `totalLoadedPages
                === 1 && !hasNextPage` — small queues looked like
                they had no pagination at all, which Yuqi flagged as
                "where's pagination?". Now the bordered group always
                renders; single-page state shows "1 / 1" with both
                arrows disabled. Affordance is permanently
                discoverable even before the queue grows. */}
            {rows.length > 0 ? (
              <div
                className="inline-flex items-center gap-0.5 rounded-md border border-divider-regular bg-background-default px-1 py-0.5 text-xs text-text-secondary"
                role="group"
                aria-label={t`Pagination`}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6"
                  aria-label={t`Previous page`}
                  disabled={safePageIndex === 0}
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeftIcon className="size-3.5" aria-hidden />
                </Button>
                <span className="min-w-12 px-1 text-center tabular-nums">
                  {listQuery.hasNextPage ? (
                    <Trans>
                      {safePageIndex + 1} / {totalLoadedPages}+
                    </Trans>
                  ) : (
                    <Trans>
                      {safePageIndex + 1} / {totalLoadedPages}
                    </Trans>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6"
                  aria-label={t`Next page`}
                  disabled={safePageIndex + 1 >= totalLoadedPages && !listQuery.hasNextPage}
                  onClick={() => {
                    if (safePageIndex + 1 >= totalLoadedPages && listQuery.hasNextPage) {
                      void listQuery.fetchNextPage()
                    }
                    setPageIndex((p) => p + 1)
                  }}
                >
                  <ChevronRightIcon className="size-3.5" aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        {/* Right-side detail panel — rendered inline inside the route's
          2-column flex (vs. the legacy floating Sheet). Fixed 600px on
          xl+; full-width stacked below the queue at narrower viewports.
          Only mounts when a row is selected; otherwise the queue gets
          the full page width. */}
        {/* 2026-05-26 (Yuqi fifty-ninth pass — architectural parity with
            Alerts panel): wrap in AnimatePresence + motion.div so the
            panel uses the same paper-rises enter + dissolve exit motion
            that /rules/pulse uses. Two layered motion divs:
              • Outer: animates the flex slot's width (0 → 600px on xl+,
                or full-width on narrower viewports). Fast (300ms) with
                Apple's swiftOut curve so the column opens cleanly.
              • Inner: animates the panel surface itself (y: '100%' → 0)
                so the paper rises into the open slot — the
                "paper-on-a-desk" gesture per the inset-surface canonical.
            On EXIT the choreography reverses to a quick dissolve: paper
            fades + slot closes simultaneously (no slide-down). Matches
            Yuqi's reference exactly — Deadlines panel now opens/closes
            with the same feel as Alerts. */}
        <AnimatePresence initial={false}>
          {activeDetailId ? (
            <motion.div
              key={`obligation-panel-${activeDetailId}`}
              initial={{ width: 0 }}
              animate={{
                width: 600,
                transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] },
              }}
              exit={{
                width: 0,
                transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
              }}
              // 2026-05-25 (Yuqi Deadlines #16): added explicit `xl:h-full`
              // so the panel wrapper fills the parent row's stretched
              // height even when the inner ObligationQueueDetailDrawer's
              // <aside> initial render is shorter than the row (loading
              // state, empty data). Previously the wrapper relied on
              // `items-stretch` alone, which created a transient gap at
              // the panel's bottom edge during load / row-switch — the
              // "drawer not aligned to top" Yuqi flagged.
              // Width animates to 600 (px). Below xl the parent flex
              // container stacks (flex-col), so this width becomes a
              // height-like constraint at the bottom — fine in
              // practice since the queue + panel stack vertically on
              // narrow viewports anyway.
              className="min-w-0 self-stretch overflow-hidden xl:h-full xl:shrink-0 xl:min-h-0"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{
                  y: 0,
                  transition: { duration: 0.64, ease: [0.32, 0.72, 0, 1], delay: 0.14 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
                }}
                className="flex h-full w-full min-w-0"
              >
                <ObligationPanelDispatcher
                  obligationId={activeDetailId}
                  activeTab={activeDetailTab}
                  onTabChange={(nextTab) => {
                    if (routeObligationRef) {
                      openQueueDetail(activeDetailId, nextTab)
                      return
                    }
                    void setObligationQueueQuery({ tab: nextTab })
                  }}
                  onClose={closeQueueDetail}
                  onNeedsInput={setPenaltyRow}
                  practiceAiEnabled={practiceAiEnabled}
                  blockerCandidates={rows}
                />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
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
              <Trans>Export deadlines</Trans>
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
                title={<Trans>All active deadlines</Trans>}
                description={<Trans>Open, waiting, review, blocked, and extended work.</Trans>}
                onSelect={() => setExportScope('all_active')}
              />
              <ExportAxisOption
                selected={exportScope === 'selected'}
                disabled={selectedIds.length === 0}
                title={<Trans>Selected deadlines</Trans>}
                description={
                  selectedIds.length > 0 ? (
                    <Plural
                      value={selectedIds.length}
                      one="# selected deadline"
                      other="# selected deadlines"
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
                    <Trans>Exports deadlines due within the selected date window.</Trans>
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
                  <Trans>Email delivery is not connected for deadline exports yet.</Trans>
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
  label,
  children,
  sort,
  ascSort,
  descSort,
  firstSort,
  sortLabel,
  onSortChange,
}: {
  label: ReactNode
  children?: ReactNode
  sort: ObligationQueueSort
  ascSort: ObligationQueueSort
  descSort: ObligationQueueSort
  firstSort: ObligationQueueSort
  sortLabel: string
  onSortChange: (sort: ObligationQueueSort) => void
}) {
  const direction = sort === ascSort ? 'asc' : sort === descSort ? 'desc' : false

  // 2026-05-25 (Yuqi sort-arrow audit): the old sort indicator was a
  // ghost Button with `ArrowUpDown` / `ArrowUp` / `ArrowDown` icons —
  // bold arrow glyphs that read as navigation controls, not subtle
  // sort hints. Yuqi flagged the chrome as "出戏" — too prominent for
  // every column header.
  //
  // New shape:
  //   - Header label + chevron are now ONE clickable region (the
  //     sort pill, not a separate icon button).
  //   - The range filter trigger stays a sibling icon button. Keeping
  //     sort and filter as siblings avoids invalid nested button
  //     markup when this header renders inside a dropdown trigger.
  //   - Unsorted columns render a faint ChevronsUpDown so the
  //     "this is sortable" affordance is always visible —
  //     previously the column looked inert until you clicked,
  //     which Yuqi flagged: "column sort is honest — chevrons
  //     are faint until you sort, then show direction" (Yuqi
  //     /deadlines redesign). The faint icon sits at
  //     `text-text-tertiary/40` so it disappears against busy
  //     content but resolves into a "click me to sort" hint on
  //     scan.
  //   - Sorted columns render a small ChevronUp / ChevronDown
  //     inline in the accent color — quieter than the bold arrows
  //     and matches the chevron vocabulary used elsewhere
  //     (dropdowns, breadcrumbs, drawer triggers).
  const SortIcon = direction === 'asc' ? ChevronUp : direction === 'desc' ? ChevronDown : null

  return (
    <span className="-mx-1 inline-flex min-w-0 items-center gap-0.5">
      <button
        type="button"
        aria-label={sortLabel}
        aria-pressed={direction !== false}
        data-active={direction !== false ? true : undefined}
        onClick={() =>
          onSortChange(nextHeaderSort({ currentSort: sort, ascSort, descSort, firstSort }))
        }
        className={cn(
          'inline-flex min-w-0 items-center gap-0.5 rounded px-1 py-0.5 text-left',
          // 2026-05-26 (Yuqi fifty-fourth pass — sortable header
          // text matches TableHead canonical): button now inherits
          // the same `text-xs font-medium uppercase tracking-[0.08em]`
          // typography as non-sortable TableHead cells. Without
          // these, the button's label rendered without the
          // uppercase/tracking, so sortable columns looked
          // visually different from sibling non-sortable columns
          // on the same header row.
          'text-xs font-medium uppercase tracking-[0.08em]',
          'text-text-tertiary hover:text-text-primary',
          'data-[active=true]:text-text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        )}
      >
        <span className="truncate">{label}</span>
        {SortIcon ? (
          <SortIcon className="size-3 shrink-0 text-text-accent" aria-hidden />
        ) : (
          <ChevronsUpDown
            className="size-3 shrink-0 text-text-tertiary/40 transition-colors group-hover:text-text-tertiary"
            aria-hidden
          />
        )}
      </button>
      {children}
    </span>
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
  // 2026-05-25 (Yuqi Deadlines #1): bumped from size-6 (24px) to
  // size-7 (28px) and text bumped to text-xs. The initials inside
  // the 24px circle were reading as cramped at scan distance — Yuqi
  // flagged "avatar 有点太挤了". The marginal size bump gives the
  // glyphs room without inflating the Owner column footprint
  // unreasonably.
  return (
    <span
      aria-label={title}
      title={title}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold uppercase tracking-tight',
        isMine
          ? 'bg-state-accent-hover-alt text-text-accent'
          : 'bg-background-subtle text-text-secondary',
      )}
    >
      {initials}
    </span>
  )
}

// 2026-05-24 (critique P0): terminal-state rows shouldn't surface
// lateness as live debt. Once a row is `done` ("Filed"), `paid`
// ("Filed" on payment-track rows), or `completed`, the row is
// closed — "18 days late" alongside a "Filed" / "Completed" pill
// reads as if there's still work to do. We render a muted
// "Filed N days late" / "Filed N days early" stat instead —
// quality signal, not active red. Mirrors the same three statuses
// that `features/obligations/status-control.tsx` displays as
// "Filed" / "Completed".
const DUE_DAYS_TERMINAL_STATUSES: ReadonlySet<ObligationStatus> = new Set([
  'done',
  'paid',
  'completed',
])

// 2026-05-24 (re-critique): stages whose `isPastInternalDue` red
// ring should be suppressed in the milestone timeline. Lateness on
// a Filed/Completed row is a quality stat, not an active urgency —
// the dates panel shows the red Internal due value, that's the
// surface for "was this filed on time?". Hoisted from inside
// `PathToFilingSummary` so we don't allocate the Set every render.
const TIMELINE_TERMINAL_STAGE_KEYS: ReadonlySet<string> = new Set(['done', 'completed'])

function DueDaysPill({ days, status }: { days: number; status: ObligationStatus }) {
  if (DUE_DAYS_TERMINAL_STATUSES.has(status)) {
    // Quality stat, not active urgency. Skip the dot, drop the
    // urgency tone, render as a muted line. Drop entirely when the
    // row landed exactly on its deadline — no signal there.
    if (days === 0) return <span className="text-sm text-text-tertiary tabular-nums">—</span>
    return (
      // 2026-05-26 (Yuqi fifty-fourth pass — terminal pill larger):
      // "Filed N days late/early" was text-xs (12px), which read as
      // caption-tier next to the row's text-sm content. Bumped to
      // text-sm so the terminal stat (a meaningful CPA outcome —
      // "we filed this 3 days late") sits at body-tier where it
      // belongs.
      <span className="text-sm text-text-tertiary tabular-nums">
        {days < 0 ? (
          <Plural value={Math.abs(days)} one="Filed # day late" other="Filed # days late" />
        ) : (
          <Plural value={days} one="Filed # day early" other="Filed # days early" />
        )}
      </span>
    )
  }
  const tone = dueDaysTone(days)
  // 2026-05-25 (Yuqi Deadlines #7, #8): Internal-due always renders
  // as `outline` regardless of urgency. The previous filled
  // `destructive` / `warning` variants made this badge LOOK exactly
  // like the Status pill ("In review", "Blocked") next to it —
  // two filled badges, same row, different meanings, no visual
  // separation. Now: dot carries the urgency signal (red for very
  // late, amber for soon, neutral for future), and the outline
  // chip itself stays calm so the eye reads Status pill (filled,
  // workflow state) and Internal due (outline, deadline anchor)
  // as different visual classes. Reduces the red overload on
  // late+blocked+rejected rows at the same time.
  const tintedTextClass =
    tone.dot === 'error'
      ? 'text-text-destructive'
      : tone.dot === 'warning'
        ? 'text-text-warning'
        : 'text-text-primary'
  // 2026-05-25 (Yuqi Deadlines follow-up): the days-late badge used a
  // colored BadgeStatusDot (red/amber/neutral). The dot did double
  // duty as both the urgency tone signal AND a generic "this is a
  // status" mark — which collided visually with the Status pill in
  // the next column (also dot-led). Swapped to a lucide Info icon for
  // the days-late case ("you'll want to read this") and kept the dot
  // for non-late states (future / today) where the tone is the only
  // signal worth carrying. The Info icon inherits the tinted text
  // color so red text + red icon read as a single urgency cluster
  // without claiming "status pill" semantics.
  const isLate = days < 0
  return (
    <Badge
      variant="outline"
      className={`${OBLIGATION_QUEUE_TABLE_PILL_CLASSNAME} min-w-18 justify-start tabular-nums ${tintedTextClass} ${tone.badgeClassName ?? ''}`}
    >
      {isLate ? (
        <Info className="size-3" aria-hidden />
      ) : (
        <BadgeStatusDot tone={tone.dot} className={`size-1.5 ${tone.dotClassName ?? ''}`} />
      )}
      {days === 0 ? (
        <Trans>Today</Trans>
      ) : isLate ? (
        <Plural value={Math.abs(days)} one="# day late" other="# days late" />
      ) : (
        <Plural value={days} one="# day" other="# days" />
      )}
    </Badge>
  )
}

function RangeHeaderFilterDropdown({
  trigger = 'header',
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
  trigger?: 'header' | 'icon'
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
  const triggerNode =
    trigger === 'icon'
      ? tableHeaderFilterIconTrigger({ label, activeCount })
      : tableHeaderFilterTrigger({ label, activeCount })

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
      <DropdownMenuTrigger render={triggerNode} />
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
              // 2026-05-24 (interaction audit): let Escape bubble so
              // the parent dropdown closes on Esc. Other keys stay
              // swallowed so typing digits doesn't trigger global
              // J/K/etc. shortcuts.
              onKeyDown={(event) => {
                if (event.key === 'Escape') return
                event.stopPropagation()
              }}
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
              // 2026-05-24 (interaction audit): let Escape bubble so
              // the parent dropdown closes on Esc. Other keys stay
              // swallowed so typing digits doesn't trigger global
              // J/K/etc. shortcuts.
              onKeyDown={(event) => {
                if (event.key === 'Escape') return
                event.stopPropagation()
              }}
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
  // 2026-05-21: dual-mode. The /deadlines route renders the detail
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
  const navigate = useNavigate()
  const practiceTimezone = usePracticeTimezone()
  const queryClient = useQueryClient()
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
  // Previous-value snapshots for the In Review sub-status mutations.
  // Captured at click time (in the handlers passed to ActiveStageDetailCard)
  // so the success toast can offer an Undo that fires the reverse
  // mutation. Stored on refs (not state) so the snapshot survives the
  // mutation lifecycle without triggering a re-render.
  const prepStagePreviousRef = useRef<ObligationPrepStage | null>(null)
  const reviewStagePreviousRef = useRef<ObligationReviewStage | null>(null)
  // Materials tab multi-select model (2026-05-23). Keyed by the
  // checklist item id so the floating action bar can batch a
  // "Mark received" mutation across every selected row. Carries the
  // owning obligationId so the selection clears automatically when
  // the user switches rows — selection is local to the open drawer,
  // not a global UI state.
  const [materialsSelection, setMaterialsSelection] = useState<{
    obligationId: string
    itemIds: ReadonlySet<string>
  }>({ obligationId: '', itemIds: new Set<string>() })
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
  //
  // 2026-05-24 (useEffect audit): the previous shape ran this as a
  // useEffect that ran post-render. Replaced with the React-
  // recommended render-time adjustment pattern. `onTabChange` is
  // idempotent (it just updates URL state), so calling it during
  // render is safe — React bails out of the re-render when the URL
  // already matches the requested value.
  const tabFallback =
    row && !isTabVisibleForType(activeTab, row.obligationType) ? (visibleTabsList[0] ?? null) : null
  if (tabFallback && tabFallback !== activeTab) {
    onTabChange(tabFallback)
  }
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
  // Switching rows clears the Materials multi-selection. The
  // selection is local to the drawer of a single obligation — when
  // the user navigates to a different row, the old selection is
  // meaningless. Same pattern as the extensionDraft / taxYearDraft
  // syncs above.
  if (row && materialsSelection.obligationId !== row.id) {
    setMaterialsSelection({ obligationId: row.id, itemIds: new Set<string>() })
  }
  // Items that exist in the selection but no longer in the checklist
  // (deleted, regenerated) shouldn't keep accumulating. Quietly prune.
  const checklistItemIds = useMemo(
    () => new Set(detail?.readinessChecklist.map((item) => item.id) ?? []),
    [detail?.readinessChecklist],
  )
  if (row && materialsSelection.obligationId === row.id) {
    let prunedItemIds: Set<string> | null = null
    for (const id of materialsSelection.itemIds) {
      if (!checklistItemIds.has(id)) {
        if (!prunedItemIds) prunedItemIds = new Set(materialsSelection.itemIds)
        prunedItemIds.delete(id)
      }
    }
    if (prunedItemIds) {
      setMaterialsSelection({ obligationId: row.id, itemIds: prunedItemIds })
    }
  }

  function invalidateDetail() {
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
        toast.success(result.emailQueued ? t`Materials request sent` : t`Materials link created`)
      },
      onError: (err) => {
        toast.error(t`Couldn't send materials request`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const revokeRequestMutation = useMutation(
    orpc.readiness.revokeRequest.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
        toast.success(t`Materials request revoked`)
      },
      onError: (err) => {
        toast.error(t`Couldn't revoke request`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
  // The base mutation only handles cache invalidation + error toast.
  // The success toast (with its contextual Undo action) is fired by
  // the `changeStatus` callback below so it can close over the
  // `previousStatus` snapshot — react-query's onSuccess only sees the
  // input vars and result, not the value the row was at before the
  // mutation. Same pattern the queue page uses (see ObligationsRoute
  // → `updateStatus` callback) so drawer + queue offer parity Undo.
  const changeStatusMutation = useMutation(
    orpc.obligations.updateStatus.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
      },
      onError: (err) => {
        toast.error(t`Couldn't change status`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  // Per-call wrapper: captures the previous status so the success
  // toast can offer Undo. Used by both the status pill in the drawer
  // header and the forward-action buttons in ActiveStageDetailCard.
  // No-op clicks (previous === next) skip the Undo affordance since
  // there's nothing to reverse.
  const changeStatus = useCallback(
    (id: string, nextStatus: ObligationStatus, previousStatus: ObligationStatus) => {
      changeStatusMutation.mutate(
        { id, status: nextStatus },
        {
          onSuccess: (result) => {
            const canUndo = previousStatus !== nextStatus
            toast.success(t`Status changed to ${statusLabels[nextStatus]}`, {
              description: t`Audit ${result.auditId.slice(0, 8)}`,
              ...(canUndo
                ? {
                    action: {
                      label: t`Undo`,
                      onClick: () => {
                        changeStatusMutation.mutate({ id, status: previousStatus })
                      },
                    },
                  }
                : {}),
            })
          },
        },
      )
    },
    [changeStatusMutation, statusLabels, t],
  )
  // In Review sub-status mutations — the prep ↔ review pipeline strip
  // in the active stage card flips these on click. Slider model: any
  // step can move to any other step (forward, backward, jump). Each
  // success surfaces an Undo toast that fires the inverse mutation if
  // the user catches a misclick. Previous value comes from the caller
  // (captured at click time from `row.prepStage` / `row.reviewStage`)
  // since by the time the success handler runs, react-query has
  // already invalidated the cache and the "previous" is gone.
  const updatePrepStageMutation = useMutation(
    orpc.obligations.updatePrepStage.mutationOptions({
      onSuccess: (result, vars) => {
        invalidateDetail()
        const previous = prepStagePreviousRef.current
        // Wipe the ref so consecutive clicks don't replay an
        // older snapshot. Each click re-captures before mutate.
        prepStagePreviousRef.current = null
        const message = t`Step updated`
        if (previous && previous !== vars.prepStage) {
          toast.success(message, {
            description: t`Audit ${result.auditId.slice(0, 8)}`,
            action: {
              label: t`Undo`,
              onClick: () => {
                updatePrepStageMutation.mutate({ id: vars.id, prepStage: previous })
              },
            },
          })
        } else {
          toast.success(message, { description: t`Audit ${result.auditId.slice(0, 8)}` })
        }
      },
      onError: (err) => {
        prepStagePreviousRef.current = null
        toast.error(t`Couldn't update step`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const updateReviewStageMutation = useMutation(
    orpc.obligations.updateReviewStage.mutationOptions({
      onSuccess: (result, vars) => {
        invalidateDetail()
        const previous = reviewStagePreviousRef.current
        reviewStagePreviousRef.current = null
        const message = t`Step updated`
        if (previous && previous !== vars.reviewStage) {
          toast.success(message, {
            description: t`Audit ${result.auditId.slice(0, 8)}`,
            action: {
              label: t`Undo`,
              onClick: () => {
                updateReviewStageMutation.mutate({ id: vars.id, reviewStage: previous })
              },
            },
          })
        } else {
          toast.success(message, { description: t`Audit ${result.auditId.slice(0, 8)}` })
        }
      },
      onError: (err) => {
        reviewStagePreviousRef.current = null
        toast.error(t`Couldn't update step`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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

  // Materials multi-select handlers (2026-05-23). Toggling a row's
  // selection updates the local Set; the floating action bar mounts
  // when itemIds.size > 0. The batch "Mark received" calls the
  // existing per-item update RPC for each selected id in parallel —
  // no new backend procedure needed. Items already received are
  // skipped to avoid emitting no-op audit events.
  function toggleMaterialsSelection(itemId: string) {
    if (!row) return
    setMaterialsSelection((current) => {
      const next = new Set(current.itemIds)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return { obligationId: row.id, itemIds: next }
    })
  }
  function clearMaterialsSelection() {
    if (!row) return
    setMaterialsSelection({ obligationId: row.id, itemIds: new Set<string>() })
  }
  function batchMarkReceived(itemIds: ReadonlySet<string>) {
    if (!row) return
    let firedCount = 0
    for (const itemId of itemIds) {
      const item = detail?.readinessChecklist.find((entry) => entry.id === itemId)
      if (!item || item.status === 'received') continue
      updateChecklistItemMutation.mutate({ itemId, status: 'received' })
      firedCount += 1
    }
    clearMaterialsSelection()
    if (firedCount > 0) {
      toast.success(
        firedCount === 1 ? t`Marked 1 item received` : t`Marked ${firedCount} items received`,
      )
    }
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

  async function copyLatestLink() {
    const portalUrl = latestRequest?.portalUrl
    if (!portalUrl) return
    try {
      await copyTextToClipboard(portalUrl)
      toast.success(t`Portal link copied`)
    } catch {
      toast.error(t`Couldn't copy link — your browser blocked clipboard access.`)
    }
  }

  function openLatestLink() {
    const portalUrl = latestRequest?.portalUrl
    if (!portalUrl) return
    openExternalUrl(portalUrl)
  }

  function saveTaxYearProfile() {
    if (!row || !taxYearProfileEditable) return
    updateTaxYearProfileMutation.mutate({
      id: row.id,
      taxYearType: taxYearDraft.taxYearType,
      fiscalYearEndMonth:
        taxYearDraft.taxYearType === 'fiscal' ? (fiscalYearEnd?.month ?? null) : null,
      fiscalYearEndDay: taxYearDraft.taxYearType === 'fiscal' ? (fiscalYearEnd?.day ?? null) : null,
      reason: 'Deadline readiness tax year profile edit',
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
  // without duplicating header chrome. Title uses the form code now
  // (e.g. "Form 1040") with the client name as a kicker label above
  // — see header comment below for the rationale.
  const titleText = row?.clientName ?? null
  const body = (
    <>
      {/* Header — flipped 2026-05-23. The drawer is a per-obligation
          surface, so the obligation identity (Form 1040, Form 1120-S)
          deserves the primary slot, not the client. Earlier shape
          made client name the h2 and pushed the form code into a
          tertiary line under it; CPAs scanning a drawer just opened
          from "what is THIS row?" had to read three lines to know
          which deadline they were looking at.

          New shape:
            line 1: client name (clickable kicker) + close X
            line 2: Form code (h2) + status pill, on one row
            line 3: TY year · jurisdiction (compact secondary meta)
          Internal/statutory deadlines moved into a dedicated 3-col
          strip below the header (was: duplicated in dates panel). */}
      {/* 2026-05-25 (Yuqi Deadlines #17): drawer header had py-4
          (16px top + bottom), which made the title sit lower than
          the page top — wasted real estate at the top of the
          drawer. Reduced to py-3 (12px) so the form-code h2 reads
          right at the top edge. */}
      {/* 2026-05-26 (Yuqi drawer canonical — cross-drawer match):
          header padding `px-5 py-3` → `px-12 py-10` per the drawer
          canonical (see docs/Design/inset-surface-design-system.md
          "Drawer canonical"). PulseDetailDrawer + ObligationDrawer
          now share identical chrome: roomy paper-document padding
          on header + body, compact action-bar padding on footer.
          The previous tight `py-3` was a one-off Deadlines callout
          (Yuqi #17) — superseded by the cross-drawer unification. */}
      <header className="relative flex flex-col gap-1.5 border-b border-divider-subtle px-12 py-10">
        {/* Panel mode owns its own close button — there's no Sheet
            wrapper providing one. Sheet mode skips this since Radix's
            SheetContent already renders an X in the top-right corner.

            2026-05-23: a copy-link icon button sits next to the close
            button per Figma so the CPA can grab a deep-link to this
            drawer (short obligation ref + tab) without scrolling to the
            sticky footer. Both buttons live in the top-right corner
            cluster. Sheet mode keeps the link-copy in the footer
            since Radix already owns the corner there. */}
        {mode === 'panel' && row ? (
          <div className="absolute right-2 top-2 flex items-center gap-0.5">
            <button
              type="button"
              aria-label={t`Copy link to this deadline`}
              title={t`Copy link to this deadline`}
              onClick={async () => {
                const url = new URL(
                  deadlineDetailHref({ obligationId: row.id, tab: activeTab }),
                  window.location.origin,
                )
                try {
                  await navigator.clipboard.writeText(url.toString())
                  toast.success(t`Link copied`)
                } catch {
                  toast.error(t`Couldn't copy link — your browser blocked clipboard access.`)
                }
              }}
              className="inline-flex size-7 items-center justify-center rounded-md text-text-tertiary outline-none hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <LinkIcon className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={t`Close deadline detail`}
              onClick={onClose}
              className="inline-flex size-7 items-center justify-center rounded-md text-text-tertiary outline-none hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <XIcon className="size-4" aria-hidden />
            </button>
          </div>
        ) : mode === 'panel' ? (
          <button
            type="button"
            aria-label={t`Close deadline detail`}
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-md text-text-tertiary outline-none hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        ) : null}
        {/* Client kicker — small label above the form code so the user
            knows whose return this is without burying the form
            identity. The whole row (name + arrow) is one click target
            that navigates to the client detail page. Title attribute
            carries the verb. */}
        {row?.clientId && row.clientName ? (
          <button
            type="button"
            aria-label={t`Open ${row.clientName}`}
            title={t`Open ${row.clientName}`}
            onClick={() => {
              void navigate(`/clients/${encodeURIComponent(row.clientId)}`)
            }}
            className="group/clientlink inline-flex w-fit items-center gap-1 rounded-sm pr-8 text-left text-xs text-text-tertiary outline-none transition-colors hover:text-text-accent focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <span className="font-medium">{titleText}</span>
            <ArrowUpRightIcon
              aria-hidden
              className="size-3 shrink-0 text-text-tertiary transition-colors group-hover/clientlink:text-text-accent"
            />
          </button>
        ) : row?.clientId ? (
          <div className="flex items-center gap-1 pr-8 text-xs text-text-tertiary">
            <span className="font-medium">{titleText ?? <Trans>Deadline detail</Trans>}</span>
            <span
              aria-label={t`Client record missing`}
              title={t`Client record missing — deadline may be orphaned`}
              className="inline-flex items-center text-text-warning"
            >
              <AlertTriangleIcon className="size-3" aria-hidden />
            </span>
          </div>
        ) : null}
        {row
          ? (() => {
              // 2026-05-26 (Yuqi fifty-first pass — Figma-Make flag
              // chips from design/deadlines-drawer-rework): the
              // status pill names the workflow state ("Waiting on
              // client") but doesn't carry overdue urgency or the
              // exact blocked-by name. Three augmenting Badge chips
              // appear next to the pill when relevant:
              //   • Waiting on client — when status is
              //     'waiting_on_client'
              //   • Blocked — when status is 'blocked'
              //   • N days overdue — when daysUntilDue < 0 on a
              //     non-terminal row
              // 2026-05-26 (Yuqi fifty-third pass — pill dedup wired):
              // when a flag chip names the specific sub-state (waiting
              // / blocked), pass `displayStatus='in_progress'` to the
              // pill so it shows the generic verb-of-motion instead of
              // repeating the chip's noun. Reads as:
              //   pill: "In progress"  chip: "Waiting on client"
              // (instead of "Waiting on client" twice). The dropdown
              // still operates on the real `row.status` — displayStatus
              // only affects the trigger's rendered label/icon/variant.
              // Overdue chip doesn't trigger the dedup since "overdue"
              // is a date concern, not a workflow state.
              const isTerminalStatus = row.status === 'done' || row.status === 'completed'
              const showWaitingChip = row.status === 'waiting_on_client'
              const showBlockedChip = row.status === 'blocked'
              const showOverdueChip = row.daysUntilDue < 0 && !isTerminalStatus
              const pillDisplayStatus =
                showWaitingChip || showBlockedChip ? ('in_progress' as ObligationStatus) : undefined
              return (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pr-8">
                  <h2 className="text-lg font-semibold leading-tight text-text-primary">
                    <TaxCodeLabel code={row.taxType} />
                  </h2>
                  <ObligationQueueStatusControl
                    row={row}
                    labels={statusLabels}
                    statuses={statusDropdownOptions}
                    disabled={changeStatusMutation.isPending}
                    onChange={(id, status) => changeStatus(id, status, row.status)}
                    displayStatus={pillDisplayStatus}
                  />
                  {showWaitingChip ? (
                    <Badge
                      variant="warning"
                      className="h-6 text-caption-xs uppercase tracking-wide"
                      title={t`Waiting on client for materials`}
                    >
                      <Trans>Waiting on client</Trans>
                    </Badge>
                  ) : null}
                  {showBlockedChip ? (
                    <Badge
                      variant="warning"
                      className="h-6 border-state-warning-border bg-state-warning-solid/15 text-caption-xs uppercase tracking-wide text-text-warning"
                      title={t`Blocked by an upstream obligation`}
                    >
                      <Trans>Blocked</Trans>
                    </Badge>
                  ) : null}
                  {showOverdueChip ? (
                    <Badge
                      variant="destructive"
                      className="h-6 text-caption-xs uppercase tracking-wide"
                      title={t`Past the internal deadline`}
                    >
                      <Plural
                        value={Math.abs(row.daysUntilDue)}
                        one="# day overdue"
                        other="# days overdue"
                      />
                    </Badge>
                  ) : null}
                </div>
              )
            })()
          : null}
        {row && (row.taxYear || row.jurisdiction || row.taxPeriodStart) ? (
          // 2026-05-23: expanded meta line under h2 to surface the
          // full tax-period context the Figma shows — jurisdiction,
          // "Tax Year YYYY", and the period span (start — end).
          // Earlier shape ("TY 2025 · FED") was terse to a fault: the
          // CPA reading the drawer header had to open the dates panel
          // to know which period was being filed. Spelling it out
          // here makes the drawer self-contained as a header.
          //
          // 2026-05-25 (Yuqi Deadlines #15): meta line was text-xs
          // (12px) — too quiet next to the now-text-xl form code
          // title. Bumped to text-sm (14px) so the context reads
          // as a real subtitle, not buried metadata.
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-text-tertiary">
            {row.jurisdiction ? (
              <>
                <span className="inline-flex items-center rounded border border-divider-regular bg-background-default px-1.5 py-0.5 text-caption-xs font-medium uppercase tracking-[0.06em] text-text-secondary">
                  {row.jurisdiction}
                </span>
                <span aria-hidden>·</span>
              </>
            ) : null}
            {row.taxYear ? (
              <span className="tabular-nums">
                <Trans>Tax Year {row.taxYear}</Trans>
              </span>
            ) : null}
            {row.taxPeriodStart && row.taxPeriodEnd ? (
              <span className="tabular-nums text-text-secondary">
                {formatDate(row.taxPeriodStart)} — {formatDate(row.taxPeriodEnd)}
              </span>
            ) : null}
          </p>
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
      {/* 2026-05-26 (Yuqi /deadlines drawer): body top padding dropped
          from pt-4 to 0. The sticky strip below used a `-mt-4` to
          cancel the body padding — chrome cancelling chrome made
          the layout hard to reason about. With pt-0, the strip
          starts flush at the body top, and the area below the strip
          gets its own real `pt-4` so it's visually a separate
          unit (containing TabsList + tab content). */}
      {/* 2026-05-26 (Yuqi drawer canonical): body padding `px-5 pb-5`
          → `px-12 py-10` per the drawer canonical. Same paper-document
          padding as PulseDetailDrawer body — left margin runs as one
          line from header through body. */}
      {/* 2026-05-26 (Yuqi forty-seventh pass — sticky-footer buffer):
          body bottom padding bumped `py-10` → `pt-10 pb-24` to match
          PulseDetailDrawer. Sticky footer (min-h-16 + py-4) was
          covering the last content row when scrolled — 96px buffer
          guarantees clean separation between bottom content and
          action bar. */}
      {/* 2026-05-26 (Yuqi forty-eighth pass — body flex wrapper):
          body wrapper is now `flex flex-col gap-4` per drawer
          canonical. Children get a consistent 16px gap between
          them instead of each carrying its own `mb-*` margin.
          Same shape as PulseDetailDrawer body so the two drawers
          read with identical rhythm. */}
      <div
        className={cn(
          'flex flex-col gap-4 px-12 pt-10 pb-24',
          mode === 'panel' && 'flex-1 min-h-0 overflow-y-auto',
        )}
      >
        {detailQuery.isLoading ? (
          <div className="rounded-lg border border-dashed border-divider-regular py-8 text-center text-sm text-text-tertiary">
            <Trans>Loading deadline detail…</Trans>
          </div>
        ) : detailQuery.isError || !detail || !row ? (
          <div className="rounded-lg border border-state-destructive-border bg-state-destructive-hover p-4 text-sm text-text-destructive">
            <Trans>Couldn't load deadline detail.</Trans>{' '}
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
            {/* 2026-05-25 (Yuqi Deadlines #30): the sticky block used
                to host the full snapshot trio (PrimaryDeadlineStrip +
                PathToFilingSummary + ActiveStageDetailCard). Yuqi's
                #30 asked for a Summary tab that owns the milestone
                story. Split the sticky block into two:
                  • Sticky: PrimaryDeadlineStrip only — three anchor
                    dates that CPAs check at every interaction. Always
                    visible across every tab.
                  • Summary tab (below): PathToFilingSummary +
                    ActiveStageDetailCard — the deep-dive milestone
                    + stage-context view. Has a labeled home now.

                Net effect: the always-visible chrome is tighter
                (just the dates), the milestone story has its own tab
                that doesn't compete with Materials / Extension /
                Evidence, and the URL ?tab=summary is shareable. */}
            {/* 2026-05-26 (Yuqi obligation drawer): tightened the
                sticky block's vertical padding so the band of
                bg-background-subtle above the deadline cards isn't
                a visible "gap" between the header and the strip.
                Was pt-4 pb-3 (28px combined). Now pt-2 pb-2 (16px)
                — strip still has breathing room from header edge
                and from scrolling content below, just half the
                visual weight. The negative -mt-4 still negates the
                body container's pt-4, so the sticky block starts
                flush at the body's top edge. */}
            {/* 2026-05-26 (Yuqi /deadlines drawer): sticky strip now
                starts flush at the body's top edge (body lost its
                pt-4). Dropped the `-mt-4` negative margin that was
                cancelling that padding. The bottom of the strip
                gets a `border-b border-divider-subtle` so the
                tabs/content area below reads as a distinct unit. */}
            <div
              className={cn(
                'flex flex-col gap-3',
                mode === 'panel'
                  ? 'sticky top-0 z-10 -mx-12 border-b border-divider-subtle bg-background-subtle px-12 py-3'
                  : 'mb-4',
              )}
            >
              {/* PrimaryDeadlineStrip (2026-05-23): the three dates the
                  CPA actually checks first — Internal, Filing, Payment
                  — promoted out of the bottom dates panel into a
                  3-column strip at the top of the snapshot. Each
                  column carries a one-word label + the date + a small
                  state tag ("MISSED" if past, blank otherwise).
                  Reading order: identity (header) → key dates (this
                  strip) → tabs → tab content (Summary's milestone
                  chevron + stage card lives one tab over).
                  The remaining secondary dates (Statutory, Tax period,
                  Created, Last touched, e-file timestamps) still live
                  in the bottom FlatDateList under "Reference dates". */}
              <PrimaryDeadlineStrip row={row} />
              {/* 2026-05-23: StatutoryDatesPanel moved OUT of this
                  sticky snapshot block — relocated to AFTER the
                  TabsContent so the tabs sit immediately under the
                  stage card. The dates panel is reference info (most
                  rows show the same date 4× anyway: Internal due =
                  Statutory = Filing = Payment), so paying for it with
                  prime vertical real estate above the tabs was the
                  wrong trade. New reading order: identity → milestone
                  → stage card → TABS → tab content → dates (scroll for
                  reference). */}
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
                obligation, so the visual clarity wins.

                2026-05-23: dropped the `border-t` separator above. The
                pill segmented control is visually self-contained
                (rounded bg track + raised active item) — adding a top
                rule above it made the tabs feel like the bottom of
                the snapshot block above instead of the top of the tab
                content below. */}
            {/* 2026-05-25 (Yuqi Deadlines #9, #12, #16): wrapper
                top padding was dropped after Yuqi flagged extra empty
                space. 2026-05-25 (client detail side panel): add a
                panel-only gap back under the sticky date strip so the
                selected tab/focus ring does not visually tuck under
                the date cards while the tab group still belongs to
                the content below. */}
            {/* 2026-05-26 (Yuqi /deadlines drawer): pt-3 → pt-4 so
                TabsList + content area sit at a clean 16px gap
                below the sticky strip's bottom border, reading as
                a separate visual unit. */}
            {/* 2026-05-26 (Yuqi fifty-fifth pass — drop double gap):
                body wrapper now has `flex-col gap-4` (added in the
                drawer canonical apply), which already provides 16px
                between the sticky strip and this tabs container.
                The extra `pt-4` here was stacking → 32px total
                between strip and tabs ("weird top margin" per
                Yuqi). Dropped. */}
            <div className="relative z-0">
              {/* 2026-05-26 (Yuqi forty-ninth pass — Figma-Make port
                  from design/deadlines-drawer-rework): tab bar
                  switched from default pill segmented control to the
                  line-variant underline bar. Each trigger leads with
                  a lucide icon + label + context badge:
                    • Summary: no badge
                    • Materials: outstanding count (red destructive)
                      or all-received check (gray) when count == 0
                    • Extension: accent check when row has a saved
                      extension decision
                    • Evidence: workpaper count (gray placeholder)
                  TabsTrigger primitive already wires aria-selected +
                  focus-visible ring per shadcn defaults; we stretch
                  to `flex-1` so the four tabs distribute full-width
                  across the drawer. */}
              {(() => {
                const outstandingMaterials = checklist.filter((i) => i.status !== 'received').length
                const allMaterialsReceived = checklist.length > 0 && outstandingMaterials === 0
                const extensionSaved = Boolean(row?.extensionDecidedAt)
                const evidenceCount = detail?.evidence.length ?? 0
                return (
                  <TabsList
                    variant="line"
                    className="flex h-11 w-full gap-1 border-b border-divider-subtle text-sm"
                  >
                    {visibleTabs.has('summary') ? (
                      <TabsTrigger
                        value="summary"
                        className="flex-1 rounded-t focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1"
                      >
                        <Info className="size-3.5" aria-hidden />
                        <Trans>Summary</Trans>
                      </TabsTrigger>
                    ) : null}
                    {visibleTabs.has('readiness') ? (
                      <TabsTrigger
                        value="readiness"
                        className="flex-1 rounded-t focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1"
                      >
                        <PaperclipIcon className="size-3.5" aria-hidden />
                        <Trans>Materials</Trans>
                        {outstandingMaterials > 0 ? (
                          <span
                            aria-label={t`${outstandingMaterials} outstanding`}
                            className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-state-destructive-solid px-1 text-caption-xs font-medium leading-none tabular-nums text-text-inverted"
                          >
                            {outstandingMaterials}
                          </span>
                        ) : allMaterialsReceived ? (
                          <span
                            aria-label={t`All received`}
                            className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-background-section px-1 text-caption-xs text-text-tertiary"
                          >
                            <CheckIcon className="size-3" aria-hidden />
                          </span>
                        ) : null}
                      </TabsTrigger>
                    ) : null}
                    {visibleTabs.has('extension') ? (
                      <TabsTrigger
                        value="extension"
                        className="flex-1 rounded-t focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1"
                      >
                        <CalendarClockIcon className="size-3.5" aria-hidden />
                        <Trans>Extension</Trans>
                        {extensionSaved ? (
                          <span
                            aria-label={t`Extension saved`}
                            className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-default px-1 text-caption-xs leading-none text-text-inverted"
                          >
                            <CheckIcon className="size-3" aria-hidden />
                          </span>
                        ) : null}
                      </TabsTrigger>
                    ) : null}
                    {/* Risk tab removed 2026-05-21 — risk inputs live on the
                        client detail page (ClientRiskInputsPanel) rather than
                        per-obligation. Surface kept on the schema for
                        back-compat with deep-links; the trigger and content
                        are unmounted. */}
                    {visibleTabs.has('evidence') ? (
                      <TabsTrigger
                        value="evidence"
                        className="flex-1 rounded-t focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1"
                      >
                        <FileTextIcon className="size-3.5" aria-hidden />
                        <Trans>Evidence</Trans>
                        <span
                          aria-label={t`${evidenceCount} workpapers`}
                          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-background-section px-1 text-caption-xs tabular-nums text-text-tertiary"
                        >
                          {evidenceCount}
                        </span>
                      </TabsTrigger>
                    ) : null}
                  </TabsList>
                )
              })()}
            </div>
            <TabsContent value="summary" className="mt-4">
              {/* Summary tab — milestone chevron + active-stage zoom.
                  These were previously pinned in the sticky snapshot
                  block (always-visible across every tab). Yuqi #30
                  moved them into a dedicated tab so:
                    - The drawer chrome is tighter (just the deadline
                      strip stays sticky).
                    - The milestone story has a labeled home that
                      shares URL state with the rest of the surface
                      (?tab=summary is shareable).
                    - Materials / Extension / Evidence don't get the
                      stage card pushing them below the fold. */}
              <div className="grid gap-3">
                <PathToFilingSummary row={row} auditEvents={detail.auditEvents} />
                <ActiveStageDetailCard
                  row={row}
                  auditEvents={detail.auditEvents}
                  readinessChecklist={detail.readinessChecklist}
                  onChangeTab={(nextTab) => onTabChange(nextTab)}
                  onChangeStatus={(nextStatus) => changeStatus(row.id, nextStatus, row.status)}
                  onConfirmAcceptance={() =>
                    markAcceptedMutation.mutate({ id: row.id, status: 'completed' })
                  }
                  onRecordRejection={() => markFiledRejectedMutation.mutate({ id: row.id })}
                  onChangePrepStage={(nextPrepStage) => {
                    // Capture the previous value so the success toast can
                    // offer an Undo that fires the reverse mutation. No-op
                    // clicks (same value) still let the request through —
                    // the server short-circuits and emits a zero-uuid
                    // auditId, but the toast logic uses the captured
                    // previous to decide whether to show Undo.
                    prepStagePreviousRef.current = row.prepStage
                    updatePrepStageMutation.mutate({ id: row.id, prepStage: nextPrepStage })
                  }}
                  onChangeReviewStage={(nextReviewStage) => {
                    reviewStagePreviousRef.current = row.reviewStage
                    updateReviewStageMutation.mutate({
                      id: row.id,
                      reviewStage: nextReviewStage,
                    })
                  }}
                />
              </div>
            </TabsContent>
            <TabsContent value="readiness" className="mt-4">
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
                      <Trans>· firm-set deadline for this materials request</Trans>
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
                {/* 2026-05-26 (Yuqi fifty-eighth pass — section title
                    semantics): label was "Documents received" + count
                    of `checklist.length` (TOTAL items). Yuqi flagged
                    "Documents Received and Outstanding - what is the
                    relationship? I don't understand" because the same
                    "13" appeared in BOTH the header ("Documents
                    received 13 items") AND the Outstanding subsection
                    below ("Outstanding 13") — a contradiction (you
                    can't have 13 received AND 13 outstanding when
                    there's only 13 total).
                    Fix: rename to "Materials checklist" — it's the
                    SECTION TITLE for the checklist as a whole. The
                    Outstanding/Received subsections inside (added
                    in the forty-ninth pass) carry the actual
                    received-vs-outstanding split + their own counts.
                    Hierarchy now reads:
                      Materials checklist (13 total)
                        ├ Outstanding (N items)
                        └ Received (M items, M + N = 13)
                */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      <Trans>Materials checklist</Trans>
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
                    {/* 2026-05-26 (Yuqi fifty-second pass — Materials
                        Outstanding/Received split from
                        design/deadlines-drawer-rework): checklist now
                        renders as two labeled sections — Outstanding
                        first (the work the CPA still owes the client),
                        Received second (acknowledgement that the work
                        is done). Empty "Outstanding" collapses to a
                        quiet "All items received" line; empty
                        "Received" hides the section entirely so the
                        early-state checklist reads cleanly as one
                        list. Section headings use the canonical
                        body-section pattern (text-sm font-semibold).
                        ChecklistItemRow handles its own
                        received-style chrome based on item.status —
                        the split is purely organizational, no new
                        renderer needed. */}
                    {(() => {
                      const outstandingItems = checklist.filter((i) => i.status !== 'received')
                      const receivedItems = checklist.filter((i) => i.status === 'received')
                      function renderRow(item: (typeof checklist)[number]) {
                        const response =
                          latestRequest?.responses.find((r) => r.itemId === item.id) ?? null
                        const isSelected = materialsSelection.itemIds.has(item.id)
                        return (
                          <ChecklistItemRow
                            key={`${item.id}:${item.updatedAt}`}
                            item={item}
                            response={response}
                            pending={updateChecklistItemMutation.isPending}
                            selected={isSelected}
                            onToggleSelect={() => toggleMaterialsSelection(item.id)}
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
                      }
                      return (
                        <div className="flex flex-col gap-4">
                          <section className="flex flex-col gap-2">
                            <header className="flex items-baseline gap-2">
                              <h3 className="text-sm font-semibold text-text-primary">
                                <Trans>Outstanding</Trans>
                              </h3>
                              <span className="font-mono text-xs tabular-nums text-text-tertiary">
                                {outstandingItems.length}
                              </span>
                            </header>
                            {outstandingItems.length === 0 ? (
                              <p className="rounded-md border border-divider-subtle p-4 text-center text-sm text-text-tertiary">
                                <Trans>All items received.</Trans>
                              </p>
                            ) : (
                              <div className="grid gap-2">{outstandingItems.map(renderRow)}</div>
                            )}
                          </section>
                          {receivedItems.length > 0 ? (
                            <section className="flex flex-col gap-2">
                              <header className="flex items-baseline gap-2">
                                <h3 className="text-sm font-semibold text-text-secondary">
                                  <Trans>Received</Trans>
                                </h3>
                                <span className="font-mono text-xs tabular-nums text-text-tertiary">
                                  {receivedItems.length}
                                </span>
                              </header>
                              <div className="grid gap-2">{receivedItems.map(renderRow)}</div>
                            </section>
                          ) : null}
                        </div>
                      )
                    })()}
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
                    <Badge variant="outline" className="text-caption-xs uppercase tracking-wide">
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
                          <Button size="sm" variant="ghost" onClick={() => void copyLatestLink()}>
                            <CopyIcon data-icon="inline-start" />
                            <Trans>Copy link</Trans>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={openLatestLink}>
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
                      <Badge
                        variant="outline"
                        className="text-caption-xs normal-case tracking-normal"
                      >
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
                            <Trans>Saving…</Trans>
                          ) : (
                            <Trans>Save</Trans>
                          )}
                        </Button>
                      </div>
                      {taxYearFiscalMissing ? (
                        <p className="text-xs text-text-destructive">
                          <Trans>Fiscal-year deadlines require a year end.</Trans>
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
            <TabsContent value="extension" className="mt-4">
              <div className="grid gap-3">
                <AlertPanel>
                  <Trans>
                    This saves the firm's internal extension plan for this deadline. The internal
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
                            <Trans>Save extension</Trans>
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
            <TabsContent value="evidence" className="mt-4">
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
                      <Trans>No workpapers attached to this deadline yet.</Trans>
                    </EmptyPanel>
                  )}
                </section>

                <details className="group rounded-lg border border-divider-subtle">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-tertiary outline-none hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt">
                    <span>
                      <Trans>Authority citation</Trans>
                    </span>
                    {detail.matchedRule ? (
                      // 2026-05-25 (Yuqi Deadlines #13): rule-id chip
                      // is now a real Link into /rules/library — Yuqi
                      // asked "这个能点出去吗？". Clicking the chip
                      // opens the library scoped to this rule via the
                      // `?rule=` query param (the library page treats
                      // unknown params gracefully when not yet
                      // implemented; even then the user lands in the
                      // right vicinity). stopPropagation on click so
                      // the surrounding <summary> doesn't toggle the
                      // <details> open/closed at the same time.
                      <Badge
                        variant="outline"
                        className="cursor-pointer text-caption-xs normal-case tracking-normal hover:bg-state-base-hover"
                        render={
                          <Link
                            to={`/rules/library?rule=${encodeURIComponent(detail.matchedRule.id)}`}
                            onClick={(event) => event.stopPropagation()}
                            title={t`Open ${detail.matchedRule.id} in the rule library`}
                          />
                        }
                      >
                        {detail.matchedRule.id}
                        {row?.ruleVersion ? ` · v${row.ruleVersion}` : ''}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-state-warning-border text-caption-xs normal-case tracking-normal text-text-warning"
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
                          This deadline isn't bound to a rule. Deadlines without a source citation
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
                                className="text-caption-xs uppercase tracking-wide"
                              >
                                {item.authorityRole}
                              </Badge>
                            </div>
                            <p className="text-xs leading-snug text-text-secondary">
                              "{item.sourceExcerpt}"
                            </p>
                            <p className="text-caption text-text-tertiary">
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
        {/* 2026-05-23: dates panel relocated here from the sticky
            snapshot block above. The CPA scans reference dates AFTER
            acting on the active surface (stage card + tabs), so they
            land naturally at the bottom of the drawer body just above
            the sticky footer. Small uppercase eyebrow gives it gentle
            visual separation from the tab content above without
            needing a full divider. */}
        {row ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-caption-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
              <Trans>Reference dates</Trans>
            </p>
            <StatutoryDatesPanel row={row} />
          </div>
        ) : null}
      </div>
      {/* Floating multi-select action bar (2026-05-23). Mounts only
          when the Materials tab is active and the user has selected
          at least one document item via the row-leading checkbox.
          Sits between the scrolling body and the persistent footer
          so it floats over the dates panel without covering the
          provenance line + Copy-link / Close cluster. Primary action
          is "Mark received" (most common batch op); Deselect clears
          the selection back to zero. Receivd items are skipped
          server-side via batchMarkReceived's filter. */}
      {row && activeTab === 'readiness' && materialsSelection.itemIds.size > 0 ? (
        // 2026-05-26 (Yuqi drawer canonical): materials-selection
        // bar inline-padding aligned to px-12. Vertical bumped 2.5
        // → 4 to match the canonical drawer footer rhythm.
        <div className="flex flex-wrap items-center gap-2 border-t border-divider-subtle bg-background-section px-12 py-4">
          <span className="text-xs font-medium text-text-primary">
            <Plural
              value={materialsSelection.itemIds.size}
              one="# item selected"
              other="# items selected"
            />
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={clearMaterialsSelection}
              disabled={updateChecklistItemMutation.isPending}
            >
              <Trans>Deselect</Trans>
            </Button>
            <Button
              size="sm"
              onClick={() => batchMarkReceived(materialsSelection.itemIds)}
              disabled={updateChecklistItemMutation.isPending}
            >
              <Trans>Mark client docs received</Trans>
              <CheckCircle2Icon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      ) : null}
      {row ? (
        // 2026-05-26 (Yuqi drawer canonical): sticky footer aligned to
        // `px-12 py-4` per the canonical. Border bumped to border-t-2
        // (heavier) + bg-background-default + h-min so the footer reads
        // as decision-grade against the body content. Matches
        // PulseDetailDrawer SheetFooter chrome.
        <div className="sticky bottom-0 mt-auto flex min-h-16 flex-wrap items-center justify-between gap-2 border-t-2 border-divider-regular bg-background-default px-12 py-4">
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
                const url = new URL(
                  deadlineDetailHref({ obligationId: row.id, tab: activeTab }),
                  window.location.origin,
                )
                try {
                  await copyTextToClipboard(url.toString())
                  toast.success(t`Link copied`)
                } catch {
                  toast.error(t`Couldn't copy link — your browser blocked clipboard access.`)
                }
              }}
            >
              <LinkIcon data-icon="inline-start" />
              <Trans>Copy link to this deadline</Trans>
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
  //   - 'panel' (new — used by /deadlines): a persistent right-rail
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
        aria-label={titleText ?? t`Deadline detail`}
        // 2026-05-26 (Yuqi forty-eighth pass — drawer canonical
        // applied to obligation panel): chrome migrated to match
        // PulseDetailDrawer's panel-mode aside exactly. Both
        // drawers in the product now read as the same surface
        // treatment from a CPA's perspective.
        //   • `rounded-lg border` → `border-l` only — the panel
        //     is a sibling COLUMN, not a floating card; the left
        //     edge alone marks the boundary against the
        //     table/list area. No corner radius lets it run
        //     edge-to-edge of the viewport's vertical space.
        //   • `bg-background-subtle` → `bg-background-default`
        //     (white) — the panel reads as paper-on-the-desk per
        //     the inset-surface system, not as a darker tile.
        //   • Added `relative min-h-0 overflow-hidden` so the
        //     sticky header/footer don't bleed and the body's
        //     own scroll surface establishes correctly.
        //   • Added `shadow-[-4px_0_12px_-6px_rgb(0_0_0_/_0.08)]`
        //     — soft left-edge shadow, gestural "paper lifted off
        //     the desk" per the canonical.
        // Inner snapshot is still pinned via sticky positioning
        // (2026-05-21): the aside itself stops scrolling; only
        // the tabs-content area scrolls underneath, so a user 30
        // docs deep in the Readiness checklist still sees what
        // row they're on.
        className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-l border-divider-subtle bg-background-default shadow-[-4px_0_12px_-6px_rgb(0_0_0_/_0.08)]"
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
        <SheetTitle className="sr-only">{titleText ?? t`Deadline detail`}</SheetTitle>
        <SheetDescription className="sr-only">
          <Trans>Deadline workflow detail panel.</Trans>
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
        <div className="grid gap-1 text-caption text-text-tertiary">
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
            <span className="text-caption text-text-tertiary">{source.sourceExcerpt}</span>
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
              <Trans>Deadline tip</Trans>
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
  // 2026-05-25 (status-pill audit §4 #9): "Failed" was warning
  // (amber) but the §3.1 ladder reserves amber for external
  // pauses where no urgency exists. A failed AI insight is a
  // hard failure of the operation — destructive (red).
  if (status === 'failed')
    return (
      <Badge variant="destructive">
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
  if (sourceType === 'readiness_checklist_ai') return <Trans>AI materials checklist</Trans>
  if (sourceType === 'readiness_client_response') return <Trans>Client materials response</Trans>
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
  const sourceUrl = item.sourceUrl

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
      {sourceUrl ? (
        <a
          className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'mt-2 w-fit')}
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => openExternalUrlFromAnchorClick(event, sourceUrl)}
        >
          <LinkIcon data-icon="inline-start" />
          <Trans>Open source</Trans>
        </a>
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
            <Trans>Resulting materials state</Trans>
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
  const { i18n, t } = useLingui()
  const stageIdx = timelineIndexForStatus(row.status)
  const stageKey: TimelineStageKey = TIMELINE_STAGE_KEYS[stageIdx] ?? 'pending'
  const isTerminal = stageKey === 'done' || stageKey === 'completed'
  const isReady = row.readiness === 'ready' && !isTerminal
  const needsCpaAction = row.readiness === 'needs_review' && !isTerminal
  const outstanding = Math.max(0, checklistCount - receivedCount)
  const responseCount = latestRequest?.responses.length ?? 0
  const readyResponseCount =
    latestRequest?.responses.filter((r) => r.status === 'ready').length ?? 0
  // 2026-05-23: per-state copy reframe. The earlier "Ready to prep" /
  // "Not ready" headlines worked in the Waiting case but read awkwardly
  // in Blocked / In review (where readiness is a watch-list signal) and
  // wrong in Filed / Completed (where the question is closed and the
  // tab is an audit trail). The headline + subline now branch on the
  // lifecycle STAGE first, then on the readiness enum within that
  // stage — so the copy matches what the CPA is actually doing at
  // each phase of the row's life. See the docs/dev-log entry for the
  // full matrix.
  const { headline, subline }: { headline: string; subline: string } = (() => {
    // 1. Filed / Completed — historical record, audit trail mode.
    if (isTerminal) {
      if (checklistCount === 0) {
        return {
          headline: t`Filed`,
          subline: t`No document checklist was attached to this filing.`,
        }
      }
      return {
        headline: t`Filed with ${checklistCount} documents archived`,
        subline: t`Audit trail captured ${receivedCount} of ${checklistCount} items as received.`,
      }
    }
    // 2. Non-terminal — no checklist yet, regardless of stage.
    if (checklistCount === 0) {
      return {
        headline: t`No documents requested yet`,
        subline: t`Generate a list below or add items manually to start collecting.`,
      }
    }
    // 3. Non-terminal — client flagged items, needs CPA verification.
    //    This trumps stage-specific copy because the action target
    //    (review the client's notes) is the same regardless of stage.
    if (row.readiness === 'needs_review') {
      const subContext =
        stageKey === 'blocked'
          ? t`Upstream return also blocking — client flagged items separately.`
          : t`At least one item flagged by client — review their portal responses.`
      return {
        headline: t`Client needs CPA action`,
        subline: subContext,
      }
    }
    // 4. Non-terminal — readiness=ready (all materials in for this row).
    if (row.readiness === 'ready') {
      switch (stageKey) {
        case 'waiting_on_client':
          return {
            headline: t`All ${checklistCount} items in`,
            subline: t`Move to In review when ready to draft.`,
          }
        case 'blocked':
          return {
            headline: t`Materials side is fine`,
            subline: t`Blocked by upstream return — ${checklistCount} items in hand.`,
          }
        case 'review':
          return {
            headline: t`All ${checklistCount} items in workpapers`,
            subline: t`Drafting in progress with everything the client provided.`,
          }
        case 'pending':
        default:
          return {
            headline: t`All ${checklistCount} items in`,
            subline: t`Move forward when ready to start work.`,
          }
      }
    }
    // 5. Non-terminal — readiness=waiting (the typical state). Branch
    //    on stage to reflect what the CPA is actually doing.
    switch (stageKey) {
      case 'pending':
        if (latestRequest && receivedCount === 0) {
          return {
            headline: t`Requested from client`,
            subline: t`Sent ${checklistCount} items — awaiting client response.`,
          }
        }
        return {
          headline: t`${receivedCount} of ${checklistCount} received`,
          subline: t`Continue collecting before drafting.`,
        }
      case 'waiting_on_client':
        return {
          headline: i18n._(
            plural(outstanding, {
              one: 'Waiting on # item',
              other: 'Waiting on # items',
            }),
          ),
          subline:
            receivedCount === 0
              ? i18n._(
                  plural(checklistCount, {
                    one: 'No client materials received yet; # item is still waiting on the client.',
                    other:
                      'No client materials received yet; all # items are still waiting on the client.',
                  }),
                )
              : i18n._(
                  plural(outstanding, {
                    one: `${receivedCount} received; # item still waiting on the client.`,
                    other: `${receivedCount} received; # items still waiting on the client.`,
                  }),
                ),
        }
      case 'blocked':
        return {
          headline: t`${outstanding} items still owed`,
          subline: t`Blocked by upstream return AND awaiting client materials.`,
        }
      case 'review':
        return {
          headline: t`${outstanding} items still owed mid-prep`,
          subline: t`Drafting started without all client materials in hand.`,
        }
      default:
        return {
          headline: t`${receivedCount} of ${checklistCount} received`,
          subline: '',
        }
    }
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
              : needsCpaAction
                ? 'bg-state-warning-solid'
                : 'bg-background-subtle border border-divider-deep',
        )}
      >
        {isTerminal || isReady ? (
          <CheckCircle2Icon
            className={cn('size-3', isTerminal ? 'text-text-success' : 'text-text-inverted')}
            aria-hidden
          />
        ) : needsCpaAction ? (
          <AlertTriangleIcon className="size-3 text-text-inverted" aria-hidden />
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
                : needsCpaAction
                  ? 'text-text-warning'
                  : 'text-text-primary',
          )}
        >
          {headline}
        </p>
        <p className="text-xs leading-snug text-text-secondary">{subline}</p>
        {responseCount > 0 && !isTerminal ? (
          <p className="mt-0.5 text-caption tabular-nums text-text-tertiary">
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
  selected,
  onToggleSelect,
  onStatusChange,
  onLabelCommit: _onLabelCommit,
  onDescriptionCommit: _onDescriptionCommit,
  onNoteCommit: _onNoteCommit,
  onRemove,
}: {
  item: ReadinessDocumentChecklistItemPublic
  response: ClientReadinessResponsePublic | null
  pending: boolean
  // Multi-select model (2026-05-23). The leading Checkbox tracks
  // selection (for the floating "Mark client docs received" batch
  // action), NOT the item's received-state. Status is communicated
  // via the small inline status chip on received / needs-review
  // items; mutating status one-at-a-time happens via the row body
  // click-through (future: dedicated inline editor) or the floating
  // bar's batch action.
  selected: boolean
  onToggleSelect: () => void
  onStatusChange: (status: ReadinessDocumentChecklistItemPublic['status']) => void
  // Inline label/description/note editing was wired through these
  // callbacks. The new card visual is read-only (matches Figma) so
  // they're accepted but unused here; the underscore prefix silences
  // eslint while we keep the prop contract stable for the call site.
  // Restore the inline editor in a follow-up by re-introducing a
  // collapsible editor section toggled by a small overflow menu.
  onLabelCommit: (label: string) => void
  onDescriptionCommit: (description: string) => void
  onNoteCommit: (note: string) => void
  onRemove: () => void
}) {
  const { t } = useLingui()
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
  // 2026-05-23 (drawer fidelity pass): card visual rebuilt against
  // the Figma target. Per-row chrome stripped — no Mark received
  // button, no chevron expand, no italic info-icon description.
  // The card now reads as a clean checkbox + title + description
  // block; status is a small chip on the right when non-default;
  // selection state shows a strong accent border + filled checkbox.
  // The floating action bar at the bottom of the drawer owns the
  // mark-received affordance (single-item case: select one, click
  // bar). Edit/delete moved behind an overflow menu (… on hover).
  return (
    <div
      className={cn(
        'group/checklist-item rounded-md border bg-background-default p-3 transition-colors',
        selected
          ? 'border-accent-default ring-2 ring-accent-default/20'
          : 'border-divider-subtle hover:border-divider-regular',
        received && !selected && 'bg-background-subtle',
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          aria-label={
            selected
              ? t`Deselect document ${item.label}`
              : t`Select document ${item.label} for batch action`
          }
          checked={selected}
          disabled={pending}
          onCheckedChange={onToggleSelect}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'truncate text-sm font-medium leading-tight',
                received ? 'text-text-secondary' : 'text-text-primary',
              )}
            >
              {item.label}
            </span>
            {/* Status chip — sits inline with the title on the right
                so received / needs-review state is visible at a
                glance without a per-row action button. Default
                (missing) shows nothing; the absence is the signal. */}
            {received ? (
              <Badge variant="success" className="text-caption-xs uppercase tracking-wide">
                <CheckCircle2Icon className="size-3" aria-hidden />
                <Trans>Received</Trans>
              </Badge>
            ) : needsReview ? (
              <Badge variant="destructive" className="text-caption-xs uppercase tracking-wide">
                <AlertTriangleIcon className="size-3" aria-hidden />
                <Trans>Needs review</Trans>
              </Badge>
            ) : null}
            {responseBadge ? (
              <Badge
                variant={responseBadge.variant}
                className="text-caption-xs uppercase tracking-wide"
              >
                {responseBadge.label}
              </Badge>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-1 text-xs leading-snug text-text-tertiary">{item.description}</p>
          ) : null}
          {response?.note ? (
            <p className="mt-1.5 rounded-sm bg-background-section px-2 py-1 text-xs text-text-secondary">
              <Trans>Client note</Trans>: {response.note}
              {response.etaDate ? (
                <>
                  {' '}
                  · <Trans>ETA {formatDate(response.etaDate)}</Trans>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        {/* Overflow menu — accessible per-row delete + mark-needs-
            review without exposing them as chrome on every card.
            Renders only on hover/focus to keep the default state
            calm (matches the Figma's clean card surface). */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={t`More actions for ${item.label}`}
                className="shrink-0 rounded-md p-1 text-text-tertiary opacity-0 outline-none transition-opacity hover:bg-state-base-hover hover:text-text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt group-hover/checklist-item:opacity-100"
                onClick={(event) => event.stopPropagation()}
              >
                <EllipsisVerticalIcon className="size-4" aria-hidden />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-[11rem] whitespace-nowrap">
            {!needsReview ? (
              <DropdownMenuItem onClick={() => onStatusChange('needs_review')} disabled={pending}>
                <AlertTriangleIcon className="size-4" aria-hidden />
                <span>
                  <Trans>Mark needs review</Trans>
                </span>
              </DropdownMenuItem>
            ) : null}
            {received ? (
              <DropdownMenuItem onClick={() => onStatusChange('missing')} disabled={pending}>
                <span>
                  <Trans>Mark not received</Trans>
                </span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={onRemove} variant="destructive">
              <Trash2Icon className="size-4" aria-hidden />
              <span>
                <Trans>Remove</Trans>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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

// PrimaryDeadlineStrip — three-column row at the top of the snapshot
// (2026-05-23). The three dates the CPA reaches for first — Internal,
// Filing, Payment — promoted out of the bottom dates panel so they're
// answer-at-a-glance instead of buried under "Reference dates". Each
// column shows: small uppercase label / date in tabular-num / a small
// state tag (MISSED in red when the date is in the past, otherwise
// blank to keep the row quiet). Internal due is the primary CPA-
// internal deadline; Filing is the statutory; Payment is the
// authority-payment due.
function PrimaryDeadlineStrip({ row }: { row: ObligationQueueRow }) {
  const { t } = useLingui()
  const todayIso = todayIsoDate()
  // 2026-05-26 (Yuqi fiftieth pass — Figma-Make hero from
  // design/deadlines-drawer-rework): replaced the flat 3-column
  // strip with a HERO (filing) + 2-column secondary (internal +
  // payment) layout.
  //
  // Filing deadline is the date the IRS / state actually enforces,
  // so it gets a full-width dark hero card with the date in text-xl
  // and a "in N days" / "N days ago" countdown on the right. When
  // the date is past (daysUntilDue < 0 on a non-terminal row), the
  // hero flips to a red surface and the countdown becomes a
  // "Missed" badge.
  //
  // Internal target + Payment due are secondary anchors stacked
  // below the hero in a 2-column grid with quiet bordered cards.
  //
  // Direction fix from the rework: Internal = the firm's earlier
  // internal target — extensionInternalTargetDate when set; falls
  // back to currentDueDate capped at <= filing so we never render
  // internal LATER than the statutory anchor (the old shape could
  // invert these).
  const filingIso = row.filingDueDate ?? row.baseDueDate
  const paymentIso = row.paymentDueDate ?? null
  const internalCandidate = row.extensionInternalTargetDate ?? row.currentDueDate ?? filingIso
  const internalIso =
    internalCandidate && filingIso && internalCandidate > filingIso ? filingIso : internalCandidate
  const isTerminal = row.status === 'done' || row.status === 'completed'
  const isMissed = row.daysUntilDue < 0 && !isTerminal
  // Compute days-to-filing for the countdown chip (don't reuse
  // `row.daysUntilDue` since that's anchored on currentDueDate).
  function dayDiff(targetIso: string | null): number | null {
    if (!targetIso) return null
    const ms = new Date(targetIso).getTime() - new Date(todayIso).getTime()
    return Math.round(ms / DAY_MS)
  }
  const filingDays = dayDiff(filingIso)
  return (
    <div aria-label={t`Key deadlines`} className="flex flex-col gap-2">
      {/* Hero — Filing deadline. Three states:
            • isTerminal (done / completed / filed): quiet success-tinted
              surface — the work is done, not an active anchor.
            • isMissed (late + non-terminal): red destructive surface
              + Missed badge — urgent.
            • else (on-time, non-terminal): dark navy surface — the
              statutory anchor the CPA is racing toward. */}
      {/* 2026-05-26 (Yuqi sixtieth pass — terminal-state hero):
          on Filed / Completed rows the dark navy hero read as
          urgent ("70 days ago" + ominous black bg) when the
          opposite is true — the work is done. Added a quieter
          success-toned treatment for isTerminal so the hero
          celebrates the filed state instead of shouting deadline
          chrome at a closed row. The countdown chip becomes
          "Filed N days ago" / "Filed on time" framing inside the
          calmer surface. */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3',
          isTerminal
            ? 'border-state-success-border bg-state-success-hover text-text-primary'
            : isMissed
              ? 'border-state-destructive-border bg-state-destructive-hover'
              : 'border-text-primary bg-text-primary text-text-inverted',
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <span
            className={cn(
              'text-xs font-medium uppercase tracking-wider',
              isTerminal
                ? 'text-text-success'
                : isMissed
                  ? 'text-text-destructive'
                  : 'text-text-inverted/70',
            )}
          >
            <Trans>Filing deadline</Trans>
          </span>
          <span
            className={cn(
              'text-2xl font-semibold tabular-nums leading-tight',
              isTerminal
                ? 'text-text-primary'
                : isMissed
                  ? 'text-text-destructive'
                  : 'text-text-inverted',
            )}
          >
            {formatDate(filingIso)}
          </span>
        </div>
        {isTerminal ? (
          <Badge variant="success" className="h-6 text-caption-xs uppercase tracking-wide">
            <CheckCircle2Icon className="size-3" aria-hidden />
            <Trans>Filed</Trans>
          </Badge>
        ) : isMissed ? (
          <Badge variant="destructive" className="h-6 text-caption-xs uppercase tracking-wide">
            <AlertTriangleIcon className="size-3" aria-hidden />
            <Trans>Missed</Trans>
          </Badge>
        ) : filingDays !== null ? (
          <span
            className={cn(
              'shrink-0 rounded-md px-2 py-1 text-xs font-medium tabular-nums',
              'bg-text-inverted/15 text-text-inverted',
            )}
          >
            {filingDays === 0 ? (
              <Trans>Due today</Trans>
            ) : filingDays > 0 ? (
              <Plural value={filingDays} one="in # day" other="in # days" />
            ) : (
              <Plural value={Math.abs(filingDays)} one="# day ago" other="# days ago" />
            )}
          </span>
        ) : null}
      </div>
      {/* Secondary anchors — internal target + payment due. Empty
          payment column collapses to a quiet "—" so the grid stays
          balanced for payment-less obligations. */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5 rounded-lg border border-divider-subtle bg-background-default px-3 py-2">
          <span className="text-caption-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
            <Trans>Internal target</Trans>
          </span>
          <span
            className={cn(
              'text-sm font-semibold tabular-nums leading-tight',
              internalIso && internalIso < todayIso && !isTerminal
                ? 'text-text-destructive'
                : 'text-text-primary',
            )}
          >
            {internalIso ? formatDate(internalIso) : '—'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg border border-divider-subtle bg-background-default px-3 py-2">
          <span className="text-caption-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
            <Trans>Payment due</Trans>
          </span>
          <span
            className={cn(
              'text-sm font-semibold tabular-nums leading-tight',
              paymentIso ? 'text-text-primary' : 'text-text-tertiary',
            )}
          >
            {paymentIso ? formatDate(paymentIso) : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

// FlatDateList — secondary dates only (2026-05-23). The three primary
// dates the CPA reaches for first — Internal, Filing, Payment — now
// live in the PrimaryDeadlineStrip at the top of the snapshot. This
// list carries everything else (period + create/touched timestamps +
// e-file pipeline timestamps) as a quiet reference surface under
// "Reference dates" at the bottom of the drawer.
//
// 2026-05-25 (Yuqi Deadlines #14): dropped the redundant `Statutory`
// row. The PrimaryDeadlineStrip's `Filing deadline` resolves to
// `row.filingDueDate ?? row.baseDueDate` — i.e. the same baseDueDate
// when no separate filing date exists, which is most rows. Showing it
// again under "Reference dates" was the duplication Yuqi flagged ("这
// 个 dates 上面是不是已经显示了"). E-file pipeline timestamps and
// tax period stay because they're not in the primary strip.
function FlatDateList({ row }: { row: ObligationQueueRow }) {
  const { t } = useLingui()
  const dateRows = useMemo(
    () => [
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
          <dd className="text-text-primary tabular-nums">{entry.value}</dd>
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
  const stamps = useMemo(() => mineTimelineTimestamps(auditEvents), [auditEvents])
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
  //
  // 2026-05-24 (re-critique): hoisted `TIMELINE_TERMINAL_STAGE_KEYS`
  // to module scope (alongside DUE_DAYS_TERMINAL_STATUSES) — the
  // previous shape allocated a fresh Set on every render of this
  // component without need.
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
          // 2026-05-24 (critique P1 — shape): the timeline used to
          // render every stage before currentIndex as "done" (green
          // tick), even ones the row never sat in. A row that goes
          // Not started → In review directly would show Waiting and
          // Blocked as ✓ completed — telling a history that didn't
          // happen.
          //
          // Now the state map consults the audit-event stamps:
          //   - `done`     past stage WITH a stamp → genuinely entered
          //   - `skipped`  past stage WITHOUT a stamp → bypassed
          //   - `active`   the row's current stage
          //   - `upcoming` stage the row hasn't reached yet
          // `skipped` renders as a smaller muted dot — visually
          // distinct from both filled-success "done" and the empty
          // ring of "upcoming."
          //
          // Stage 0 is special: every row is born at "Not started" so
          // an empty stamp there still counts as entered. The row's
          // createdAt is the implicit stamp.
          const state: 'done' | 'skipped' | 'active' | 'upcoming' =
            i === currentIndex
              ? 'active'
              : i < currentIndex
                ? stamps[i] !== null || i === 0
                  ? 'done'
                  : 'skipped'
                : 'upcoming'
          // Date resolution (milestone-timeline-prd.md §3, 2026-05-25
          // Deadlines #23/#24/#25 doc-gap fix):
          //   Done/Active     : audit-event stamp (first entry into stage)
          //   Stage 0 fallback: row.createdAt (the row was born here)
          //   Filed upcoming  : row.currentDueDate (the FIRM's deadline
          //                     IS the projected file date — only stage
          //                     we can reliably project)
          //   Skipped         : no stamp, no projection (the stage didn't
          //                     happen — projecting a date there would
          //                     fabricate history)
          //   Other upcoming  : blank (we can't project Completed et al.
          //                     without firm-specific cadence data, and
          //                     showing a guess would mislead audit defense)
          //
          // The empty cells are intentional: misleading projections are
          // worse than honest absences for an audit-defense workflow.
          // The `title` attribute on the date span (further down) tells
          // hover users what the blank means.
          let stamp = stamps[i] ?? null
          let isExpected = false
          if (!stamp && i === 0) stamp = row.createdAt
          if (!stamp && state === 'upcoming' && i === filedStageIndex) {
            stamp = row.currentDueDate
            isExpected = true
          }
          // Hover hint that explains why the date cell may be blank.
          // Mirrors the resolution table above in plain language so
          // CPAs scanning the strip understand the absence is a
          // choice, not a missing-data bug.
          const emptyDateHint =
            state === 'skipped'
              ? t`This stage was skipped — no date applies.`
              : state === 'upcoming'
                ? i === filedStageIndex
                  ? undefined
                  : t`This stage hasn't been reached yet. We only project the Filed date (using the internal due date).`
                : undefined
          const overdueActive =
            state === 'active' && isPastInternalDue && !TIMELINE_TERMINAL_STAGE_KEYS.has(stage.key)
          return (
            <div key={stage.key} className="flex flex-col items-center gap-0.5">
              {/* 2026-05-24 (Figma replica pass): milestone strip
                  rebuilt to match the Figma’s rhythm:
                    — Connectors switch from solid 2px bars to a
                      DOTTED hairline so the strip reads as "stages on
                      a thin track", not "stages connected by a pipe".
                    — Completed circles drop the bold green fill
                      in favour of a softer success-hover bg + a small
                      green tick — less dominant per Yuqi’s "finished
                      state looks too dominant" critique.
                    — Active stage uses a stronger accent ring;
                      the inner blue dot retired since the ring + bold
                      stage label carries the active signal alone. */}
              <div className="flex w-full items-center gap-1">
                <span
                  aria-hidden
                  className={cn(
                    'h-0 flex-1 border-t border-dotted',
                    // 2026-05-24 (critique P1 — shape): the left-side
                    // connector represents the edge into THIS stage.
                    // Green only when both this stage and the prior
                    // one were genuinely entered (or active) — so
                    // skipped stages keep the edge muted on both sides.
                    (() => {
                      if (i === 0) return 'opacity-0'
                      const thisEntered = state === 'done' || state === 'active'
                      const prevIdx = i - 1
                      const prevEntered =
                        prevIdx === currentIndex ||
                        (prevIdx < currentIndex && (prevIdx === 0 || stamps[prevIdx] !== null))
                      return thisEntered && prevEntered
                        ? 'border-state-success-solid/60'
                        : 'border-divider-regular'
                    })(),
                  )}
                />
                {/* 2026-05-26 (Yuqi /deadlines drawer #1, #2, #3):
                    stage indicator now uses STAGE-SPECIFIC lucide
                    icons so the milestone strip tells the story by
                    icon identity, not just a generic check/dot.
                      - Not started: CircleDashed
                      - Waiting: Clock
                      - Blocked: Lock
                      - In review: Eye
                      - Filed: FileCheck2
                      - Completed: CheckCircle2
                    State (done/active/skipped/upcoming) maps to
                    tone instead:
                      - done   = bg success-hover + text success-solid
                      - active = bg accent-hover + text accent-solid + ring
                      - skipped = dashed border + text tertiary
                      - upcoming = empty bg + text tertiary
                    This fixes #1 ("why no stage-specific icons"),
                    #2 (Filed now has a visible icon + tone), and #3
                    (Filed-active visually distinct from Completed-
                    upcoming by both icon identity AND tone). */}
                <span
                  aria-hidden
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full border',
                    state === 'done'
                      ? 'border-state-success-solid bg-state-success-hover text-state-success-solid'
                      : state === 'skipped'
                        ? 'border-dashed border-divider-regular bg-background-default text-text-tertiary/60'
                        : overdueActive
                          ? 'border-state-destructive-solid bg-state-destructive-hover text-text-destructive ring-1 ring-state-destructive-solid'
                          : state === 'active'
                            ? 'border-accent-default bg-state-accent-hover text-text-accent ring-1 ring-accent-default'
                            : 'border-divider-regular bg-background-default text-text-tertiary/70',
                  )}
                >
                  {(() => {
                    const StageIcon = (
                      stage.key === 'pending'
                        ? CircleDashed
                        : stage.key === 'waiting_on_client'
                          ? Clock
                          : stage.key === 'blocked'
                            ? Lock
                            : stage.key === 'review'
                              ? Eye
                              : stage.key === 'done'
                                ? FileCheck2
                                : CheckCircle2Icon
                    ) as React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
                    return <StageIcon className="size-3.5" aria-hidden />
                  })()}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'h-0 flex-1 border-t border-dotted',
                    // 2026-05-24 (critique P1 — shape): the right-side
                    // connector represents the edge into stage i+1.
                    // Green only when BOTH stage i was entered (or
                    // active) AND stage i+1 was entered (or active) —
                    // i.e. the row actually crossed this edge. Skipped
                    // stages on either end keep the edge muted.
                    (() => {
                      if (i === stages.length - 1) return 'opacity-0'
                      const thisEntered = state === 'done' || state === 'active'
                      const nextIdx = i + 1
                      const nextEntered =
                        nextIdx === currentIndex ||
                        (nextIdx < currentIndex && stamps[nextIdx] !== null)
                      return thisEntered && nextEntered
                        ? 'border-state-success-solid/60'
                        : 'border-divider-regular'
                    })(),
                  )}
                />
              </div>
              {/* 2026-05-25 (Yuqi Deadlines #22): stage label
                  dropped from text-caption (11px) to text-caption-xs
                  (10px) to match the date below — the two sat at
                  different scales and made the column feel
                  unbalanced. Active state keeps font-medium for
                  weight contrast. */}
              <span
                className={cn(
                  'mt-0.5 text-center text-caption-xs leading-tight',
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
              {/* Date + Overdue label. 2026-05-24 cleanup:
                    — Em-dash placeholders dropped. Stages with no
                      date render a non-breaking space so the
                      baseline stays consistent without "—" noise
                      cluttering future stages.
                    — "ACTIVE" word retired — it was redundant
                      against the bold stage label + ring. Only
                      "Overdue" (destructive, when the active stage
                      is past internal due) and "Expected" (tertiary,
                      when projecting the Filed milestone forward)
                      still render. */}
              {/* 2026-05-25 (Yuqi Deadlines #26): mt-1.5 (6px) gap
                  between the stage label and the date block read
                  as too loose — the date felt unrelated to the
                  stage above it. Tightened to mt-1 (4px) so the
                  pair reads as one unit. */}
              <div className="mt-1 flex w-full flex-col items-center gap-0.5">
                <span
                  className={cn(
                    'text-center text-caption-xs tabular-nums leading-tight',
                    state === 'active' ? 'text-text-primary' : 'text-text-tertiary',
                  )}
                  // 2026-05-25 (Yuqi Deadlines #23/#24/#25): hover hint
                  // surfaces the date-resolution policy in plain
                  // language for blank cells (skipped / non-Filed
                  // upcoming). Stops the empty space reading as a
                  // missing-data bug.
                  title={emptyDateHint}
                >
                  {(state === 'done' || state === 'active' || isExpected) && stamp
                    ? formatDate(stamp.slice(0, 10))
                    : ' '}
                </span>
                {overdueActive ? (
                  <span className="text-center text-caption-xs font-medium uppercase tracking-wide leading-tight text-text-destructive">
                    <Trans>Overdue</Trans>
                  </span>
                ) : isExpected ? (
                  <span className="text-center text-caption-xs font-medium uppercase tracking-wide leading-tight text-text-tertiary">
                    <Trans>Expected</Trans>
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
                    className="text-center text-caption-xs leading-tight text-text-secondary"
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
        <p className="text-caption leading-snug text-text-tertiary">
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
      aria-label={t`Open blocking deadline: ${formatTaxCode(blocker.taxType)} for ${blocker.clientName}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-caption-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
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
        <Badge variant={STATUS_VARIANT[blocker.status]} className="text-caption-xs">
          {labels[blocker.status]}
        </Badge>
        <span className="tabular-nums">
          <Trans>Due {formatDate(blocker.currentDueDate)}</Trans>
        </span>
      </div>
    </button>
  )
}

// 2026-05-23: WaitingOutstandingDocs component retired with Option D.
// The full panel (count header + bullet list of doc names + routing
// button) duplicated content from the Client readiness tab. Replaced
// inline in ActiveStageDetailCard with a one-line signal that links
// to the tab; the tab owns the actual document inventory.

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
      <p className="mb-2 text-caption-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
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
  onChangePrepStage,
  onChangeReviewStage,
}: {
  row: ObligationQueueRow
  auditEvents: readonly AuditEventPublic[]
  readinessChecklist: readonly ReadinessDocumentChecklistItemPublic[]
  onChangeTab: (tab: ObligationQueueDetailTab) => void
  onChangeStatus: (status: ObligationStatus) => void
  onConfirmAcceptance: () => void
  onRecordRejection: () => void
  onChangePrepStage: (prepStage: ObligationPrepStage) => void
  onChangeReviewStage: (reviewStage: ObligationReviewStage) => void
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
  // 2026-05-23: A/B/C IA preview retired. Winning shape (Option D):
  // the stage card carries WAITING header + a single one-line signal
  // ("3 docs outstanding · Open Client readiness →") + the primary
  // "Mark client docs received" button. The full outstanding-docs
  // panel is gone — that data lives on the Client readiness tab,
  // not duplicated here. Sub-status reads "Awaiting client · N days
  // so far" so the header is honest about *time elapsed*, not just
  // a generic "waiting on docs" repeat of what the count line says.
  const isWaitingStage = stageKey === 'waiting_on_client'
  const isWaitingDocsCase = isWaitingStage && row.prepStage === 'waiting_on_client'
  // Outstanding docs count powers the inline signal in the Waiting
  // card body. Same filter logic the old WaitingOutstandingDocs panel
  // used (anything not yet `received`), just without the bullet list.
  const outstandingDocsCount = useMemo(
    () => readinessChecklist.filter((item) => item.status !== 'received').length,
    [readinessChecklist],
  )
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
        if (row.prepStage === 'waiting_on_client') {
          // Sub-status names the WHEN (days since entering Waiting),
          // not the WHAT — the WHAT is the inline signal line below
          // ("3 docs outstanding"). Header should add information,
          // not repeat the body. Find the most recent
          // status_changed → waiting_on_client event for the
          // timestamp; fall back to neutral phrasing if no audit
          // event matches (e.g., demo-seed rows with no transition
          // history).
          let enteredAt: string | null = null
          for (const event of auditEvents) {
            if (typeof event.afterJson !== 'object' || event.afterJson === null) continue
            const after = (event.afterJson as { status?: unknown }).status
            if (after === 'waiting_on_client') {
              if (!enteredAt || event.createdAt > enteredAt) enteredAt = event.createdAt
            }
          }
          if (enteredAt) {
            const today = new Date().toISOString().slice(0, 10)
            const days = daysBetween(enteredAt.slice(0, 10), today)
            if (days <= 0) return t`Awaiting client response`
            if (days === 1) return t`Awaiting client · 1 day so far`
            return t`Awaiting client · ${days} days so far`
          }
          return t`Awaiting client response`
        }
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
        // 2026-05-23 IA fix: Not Started used to offer a single primary
        // "Start drafting the return" that jumped straight to In review,
        // skipping Waiting entirely. Per the canonical CPA workflow
        // (engagement → request docs → wait → receive → prep → review →
        // file) most rows actually need a "Request docs from client"
        // step first. Two explicit paths are honest about which
        // situation applies: "Request documents from client" is the
        // common case for brand-new rows, "Start drafting the return"
        // is the rarer case where docs are already in hand.
        return [
          {
            id: 'engagement',
            label: t`Confirm engagement letter is on file for this client`,
            flavor: 'manual',
          },
          { id: 'assign', label: t`Assign a preparer to this return`, flavor: 'manual' },
          {
            id: 'request-docs',
            label: t`Request documents from client`,
            flavor: 'mutation',
            primary: true,
            hint: t`Moves the row to Waiting and opens the Materials tab to send the request.`,
          },
          {
            id: 'start',
            label: t`Skip ahead to drafting (docs already in hand)`,
            flavor: 'mutation',
            hint: t`Use only when you already have all client documents. Sends the row straight to In review.`,
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
              label: t`Mark materials received`,
              flavor: 'mutation',
              primary: true,
            },
          ]
        }
        // 2026-05-23: Option D shape — just the primary mutation.
        // The routing affordance (open Materials tab) moved into the
        // inline signal line in the card body; the manual chase
        // reminder dropped because "Send reminder" is the same action
        // surfaced from the Materials tab itself.
        return [
          {
            id: 'received',
            label: t`Mark materials received`,
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
        // 2026-05-23: the three "manual" reminders that used to live here
        // ("Mark drafting complete and hand off to reviewer", "Get
        // reviewer sign-off on the return", "Address reviewer's notes")
        // were just text-shaped placeholders for steps that now have
        // real mutations. Clicking step 3 of the pipeline strip flips
        // prepStage='prepared'; clicking step 6 flips
        // reviewStage='approved'; the "Leave note" / "Notes addressed"
        // affordances rendered inline with step 5 handle the notes_open
        // round-trip. So the strip itself is the action surface and the
        // manual reminders are redundant.
        const reviewTasks: StageTask[] = []
        // 2026-05-23: renamed from "Get 8879 signed by client" per
        // critique. The 8879 signature actually flows through the
        // Filed stage's e-file pipeline (`efileState='authorization_
        // requested' → 'authorization_signed' → 'ready_to_submit'`),
        // which starts the moment the CPA marks this row filed. The
        // affordance here lets the CPA pre-stage the packet inside
        // the Evidence tab BEFORE marking filed, so the 8879 is
        // ready to send the second the row enters the Filed stage.
        // Tooltip names that timing relationship so the routing
        // doesn't read as a duplicate of the Filed sub-status work.
        reviewTasks.push({
          id: 'sign-8879',
          label: t`Pre-stage 8879 packet for client`,
          flavor: 'routing',
          hint: t`The 8879 is sent to the client once you mark this filed — open Evidence to prep the packet now.`,
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
                label: t`Mark deadline complete`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          case 'final_package_delivered':
            return [
              {
                id: 'complete',
                label: t`Mark deadline complete`,
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
  }, [stageKey, row.status, row.prepStage, row.efileState, row.paymentState, t])
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
      // Status → waiting_on_client. Also opens the Readiness tab so
      // the CPA can immediately send the document request from the
      // place it actually lives. The status flip happens first; the
      // tab change runs in the same tick so the CPA lands on the
      // Readiness surface with the row already in the Waiting stage.
      case 'request-docs':
        onChangeStatus('waiting_on_client')
        onChangeTab('readiness')
        return
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
          toast.info(t`This row isn't linked to a blocking deadline.`)
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
  //
  // 2026-05-24: also require that there's an ACTIVE sub-state before
  // rendering the STEPS list. The drawer was showing a column of 4-6
  // empty/dim sub-steps for a freshly-filed obligation that hadn't
  // entered any e-file or payment sub-stage yet (e.g. a partnership
  // return where status=done but efileState is null). Empty checklist
  // reads as "nothing's happening" — the design (Figma node 109:13725)
  // collapses the stage card to a compact info box in that case.
  const efileStateSet =
    row.efileState !== null && row.efileState !== undefined && row.efileState !== 'not_applicable'
  const paymentStateSet =
    row.paymentState !== null &&
    row.paymentState !== undefined &&
    row.paymentState !== 'not_applicable'
  const showEfilePipeline = stageKey === 'done' && row.status !== 'paid' && efileStateSet
  const showPaymentPipeline = stageKey === 'done' && row.status === 'paid' && paymentStateSet
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
      {/* Header: stage name + sub-status + when we entered this stage.
          2026-05-23: dropped the uppercase tracking-wider treatment on
          the stage label — at h3 weight it read as a section tag, not
          a heading. Title-case + base text size lets "Waiting" /
          "Blocked" / "In review" read as honest noun phrases, matching
          the milestone strip labels above. Sub-status follows on the
          same line with a thin dot separator. */}
      {/* 2026-05-25 (Yuqi #27): stage label promoted from text-sm
          (14px) to text-base (16px) — it's the h3 of this card and
          was reading as inline chrome at the same size as the rest
          of the body. The sub-status that follows stays at the
          larger size too so the whole line reads as one heading.
          The "Entered DATE" subline stays at text-xs as quiet meta. */}
      <header className="flex flex-col gap-0.5">
        <h3 className="flex flex-wrap items-baseline gap-x-1.5 text-base leading-tight">
          <span className="font-semibold text-text-primary">{stageLabel}</span>
          {subStatus ? (
            <>
              <span aria-hidden className="text-text-tertiary">
                ·
              </span>
              <span className="text-text-secondary">{subStatus}</span>
            </>
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
      {/* 2026-05-23 Option D: the WaitingOutstandingDocs panel
          (count header + bullet list of doc names) was retired here —
          that data lives on the Materials tab, not duplicated in the
          stage card. The card carries a one-line signal instead:
          "N items outstanding · Check Materials →". Single-line, no
          list, no panel chrome. The CPA who needs the actual document
          inventory clicks through.

          Verb 2026-05-23 (pass 2): "Open Materials" → "Check
          Materials". "Open" reads as "open the tab"; "Check" reads as
          "go review what's outstanding" — the CPA's actual intent
          when the count is non-zero. */}
      {isWaitingDocsCase && outstandingDocsCount > 0 ? (
        <button
          type="button"
          onClick={() => onChangeTab('readiness')}
          className="mt-3 -mx-1 flex items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs text-text-secondary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          aria-label={t`Check Materials to review ${outstandingDocsCount} outstanding items`}
        >
          <CircleIcon className="size-2 fill-current text-state-warning-solid" aria-hidden />
          <span>
            <Plural
              value={outstandingDocsCount}
              one="# item outstanding"
              other="# items outstanding"
            />
          </span>
          <span className="text-text-tertiary">·</span>
          <span className="text-text-tertiary">
            <Trans>Check materials</Trans>
          </span>
          <ArrowUpRightIcon className="size-3 text-text-tertiary" aria-hidden />
        </button>
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
      {/* 2026-05-25 (Yuqi #28, #29): Steps eyebrow was
          text-caption-xs (10px) — sub-visible against the rest of
          the card. Promoted to text-caption (11px) matching the
          "Entered DATE" subline, so the eyebrow + the entered-date
          line read at the same scale. Step list items inside ride
          on text-sm so they're a clear tier below the stage h3
          but legibly above the eyebrow. */}
      {showEfilePipeline || showPaymentPipeline ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-caption font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Steps</Trans>
          </p>
          <ul className="flex flex-col gap-1.5">
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
                  <div className="flex items-start gap-2 text-sm">
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
                    <div className="ml-3 mt-2 mb-2">
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
           Each step is a real <button> (slider model): clicking moves
           the row to that step, forward or backward. Steps 1-3 fire
           updatePrepStage; steps 4-6 fire updateReviewStage. Current
           step is rendered as a non-button label since clicking "go
           to where you already are" is a no-op (server short-circuits
           anyway, but suppressing the button avoids a stray toast).
           When `reviewStage === 'notes_open'` the in_review step
           picks up a "Notes open" annotation plus a "Notes addressed"
           affordance; otherwise step 5 surfaces a "Leave note" button. */
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Steps</Trans>
          </p>
          <ul className="flex flex-col gap-1">
            {REVIEW_PIPELINE_KEYS.map((key) => {
              const state = pipelineStateOf(key, reviewCurrent, REVIEW_PIPELINE_KEYS)
              const label = reviewPipelineLabels[key]
              const showNotesOpen = state === 'current' && key === 'in_review' && notesOpen
              // prep stage owns ready_for_prep / in_prep / prepared;
              // review stage owns ready_for_review / in_review /
              // approved. Each step's click target is the matching
              // mutation handler with the step's value.
              const handleStepClick = () => {
                if (state === 'current') return
                if (key === 'ready_for_prep' || key === 'in_prep' || key === 'prepared') {
                  onChangePrepStage(key)
                } else {
                  // notes_open never appears as a step key; the
                  // remaining three (ready_for_review / in_review /
                  // approved) all flow through reviewStage.
                  onChangeReviewStage(key)
                }
              }
              const stepTitle = state === 'current' ? t`You're on this step` : t`Move to: ${label}`
              return (
                <li key={key} className="flex flex-col">
                  <button
                    type="button"
                    onClick={handleStepClick}
                    disabled={state === 'current'}
                    title={stepTitle}
                    aria-label={stepTitle}
                    className={cn(
                      '-mx-1 flex w-full items-start gap-2 rounded px-1 py-0.5 text-left text-xs outline-none transition-colors',
                      state === 'current'
                        ? 'cursor-default'
                        : 'cursor-pointer hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                    )}
                  >
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
                        <span className="ml-1.5 text-caption-xs font-medium uppercase tracking-wide text-text-warning">
                          · <Trans>Notes open</Trans>
                        </span>
                      ) : null}
                    </span>
                  </button>
                  {/* notes_open affordances on the in_review step.
                      When the reviewer is checking the return:
                        - notes NOT open → small "Leave note" ghost
                          button flips reviewStage='notes_open'
                        - notes ARE open → "Notes addressed" flips
                          back to 'in_review'. */}
                  {state === 'current' && key === 'in_review' ? (
                    <div className="ml-3 mt-1 mb-1">
                      {notesOpen ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onChangeReviewStage('in_review')}
                        >
                          <Trans>Mark notes addressed</Trans>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onChangeReviewStage('notes_open')}
                        >
                          <Trans>Leave note for preparer</Trans>
                        </Button>
                      )}
                    </div>
                  ) : null}
                  {state === 'current' && tasks.length > 0 ? (
                    <div className="ml-3 mt-2 mb-2">
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
          <p className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
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
          <p className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
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
      if (row.blockedByObligationInstanceId) return t`Upstream deadline`
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

// Number of distinct stages in the milestone timeline — pending,
// waiting_on_client, blocked, review, done, completed. Used to size
// the result array of `mineTimelineTimestamps` so the indices line up
// with `timelineIndexForStatus`.
const TIMELINE_STAGE_COUNT = 6

// Earliest audit-event timestamp per timeline stage. The lifecycle is
// not strictly linear (a row can ping-pong between waiting_on_client
// and blocked, or come back to in_review after a rejection), so we
// stamp each stage at its FIRST entry rather than the latest.
//
// 2026-05-24 (re-critique): the previous shape took a `stageKeys`
// param that looked like it controlled matching, but actually only
// sized the array — matching was driven by `timelineIndexForStatus`.
// Dropped the misleading argument; the array length is now an
// explicit module constant aligned with the index function above.
function mineTimelineTimestamps(auditEvents: readonly AuditEventPublic[]): (string | null)[] {
  const sorted = [...auditEvents].toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))
  const stamps: (string | null)[] = Array.from({ length: TIMELINE_STAGE_COUNT }, () => null)
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
      reason: t`Deadline needs-input update`,
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
// global hotkey focuses `inputRef`, which auto-opens via the
// Input's own onFocus). Stays open while a query value is present
// so the user always sees what they're filtering by.
function ObligationQueueSearchControl({
  inputRef,
  value,
  open,
  onOpenChange,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  value: string
  // 2026-05-24 (re-critique): lifted from local state to a controlled
  // prop so the route's `/` hotkey can expand the collapsed control
  // before deferring focus. The button-click expand path and the
  // hotkey path now share the same setter.
  open: boolean
  onOpenChange: (next: boolean) => void
  onChange: (next: string) => void
}) {
  const { t } = useLingui()
  const isOpen = open || value.length > 0
  const setOpen = onOpenChange
  // 2026-05-24 (useEffect audit): the previous shape attached a
  // window-style focus listener to the input ref via useEffect. The
  // Input component already exposes an `onFocus` prop — moved the
  // open-on-focus signal there, removing one useEffect violation.
  if (!isOpen) {
    // 2026-05-25 (Yuqi Deadlines #2): ghost-variant search icon
    // disappeared into the page chrome — CPAs reading the
    // toolbar couldn't tell it was a tappable affordance.
    // Promoted to `outline` variant so the icon button has a
    // visible bordered chip on the toolbar.
    return (
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t`Filter clients`}
        title={t`Filter clients  ·  press / to focus`}
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
  // 2026-05-26 (Yuqi cross-product search audit): expanded state now
  // delegates to the canonical SearchInput primitive. Previously the
  // expanded state hand-rolled an h-8 Input with bespoke clear button
  // + Escape logic — which drifted from /rules/library's h-9
  // SearchInput. Now both surfaces share the exact same chrome when
  // expanded; deadlines keeps the toolbar-density collapse pattern
  // because Yuqi #2 specifically designed for it (densest table
  // surface needs room).
  return (
    <div className="relative mb-1.5 w-full md:w-56 md:flex-none">
      <SearchInput
        ref={inputRef}
        value={value}
        onChange={onChange}
        placeholder={t`Filter clients`}
        ariaLabel={t`Filter deadlines`}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (value.length === 0) setOpen(false)
        }}
      />
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
  icon: Icon,
  iconColor,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  // 2026-05-25 (Yuqi status icon pass): scope tabs now lead with a
  // lucide status icon when the tab maps to a lifecycle status (the
  // 6 v2 scope tabs). `icon` is the lucide component, `iconColor`
  // is the tailwind text-color class. The "All" tab passes neither
  // and renders without a leading mark.
  // 2026-05-25 (status-pill audit §4 #8): the prior `dotTone`
  // fallback (BadgeStatusDot) was removed — icon-led badges are
  // canonical per audit §3.3, and every status-mapped tab already
  // provides an icon.
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  iconColor?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      // 2026-05-25 (Yuqi Deadlines #1): scope tab padding bumped
      // from px-2 py-2 → px-3 py-2.5 so the filters breathe. The
      // active underline + count sat 8px apart with the old gap;
      // 12px gives the eye room without sacrificing density.
      className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors ${
        active
          ? 'border-accent-default font-medium text-text-primary'
          : 'border-transparent text-text-secondary hover:border-divider-deep hover:text-text-primary'
      }`}
    >
      {Icon ? <Icon className={cn('size-3.5', iconColor)} aria-hidden /> : null}
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
  // 2026-05-25 (Yuqi Deadlines #2): click target was 22px tall
  // (px-2.5 py-0.5 text-xs) — too small for filter chips that are
  // primary triage affordances. Bumped to ~30px (px-3 py-1 text-sm)
  // so the hit zone matches a real button and the label reads as
  // body text instead of meta caption.
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? 'border-accent-default bg-accent-tint font-medium text-text-accent'
          : 'border-divider-regular bg-background-default text-text-secondary hover:border-divider-deep hover:text-text-primary'
      }`}
    >
      <span>{children}</span>
      {active ? <XIcon aria-hidden className="size-3.5" /> : null}
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
          <Trans>No deadlines match these filters.</Trans>
        ) : (
          <Trans>No deadlines yet. Import clients to get started.</Trans>
        )
      }
      description={
        hasActiveFilters ? (
          <Trans>
            Try a different filter combination, or clear all filters to see the full queue.
          </Trans>
        ) : null
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
