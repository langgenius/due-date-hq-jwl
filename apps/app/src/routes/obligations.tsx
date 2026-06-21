import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  ChevronsUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CircleCheckIcon,
  HourglassIcon,
  Loader2Icon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  CircleIcon,
  ClipboardListIcon,
  Columns3Icon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  FileArchiveIcon,
  CalendarClockIcon,
  CheckIcon,
  LayersIcon,
  ListChecksIcon,
  BookmarkIcon,
  RotateCcwIcon,
  RefreshCwIcon,
  SendIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  UserRoundIcon,
  ArrowRightIcon,
  XIcon,
} from 'lucide-react'
import {
  parseAsArrayOf,
  parseAsBoolean,
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
  type MemberAssigneeOption,
  type ObligationQueueDetailTab,
  type ObligationQueueDensity,
  type ObligationQueueFacetOption,
  type ObligationQueueListInput,
  type ObligationQueueRow,
  type ObligationQueueSort,
  type ObligationQueueExportFormat,
  type ObligationQueueExportSelectedInput,
  type AuditEventPublic,
} from '@duedatehq/contracts'
import { renderTemplate, SIGNATURE_REMINDER_THROTTLE_DAYS } from '@duedatehq/core/email-template'
import { compareSmartPriority } from '@duedatehq/core/priority'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@duedatehq/ui/components/ui/alert-dialog'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Field, FieldDescription, FieldLabel } from '@duedatehq/ui/components/ui/field'
import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@duedatehq/ui/components/ui/combobox'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@duedatehq/ui/components/ui/command'
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
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { useSidebar } from '@duedatehq/ui/components/ui/sidebar'

import {
  isInteractiveEventTarget,
  useAppHotkey,
  useKeyboardShortcutsBlocked,
} from '@/components/patterns/keyboard-shell'
import { useCurrentUserName } from '@/lib/use-current-user-name'
import { type TableFilterOption } from '@/components/patterns/table-header-filter'
import { DestructiveChangePreview } from '@/components/patterns/destructive-change-preview'
import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'
import { EmptyState } from '@/components/patterns/empty-state'
import {
  FloatingActionBar,
  FLOATING_ACTION_BAR_SCROLL_PADDING,
} from '@/components/patterns/floating-action-bar'
import { PageHeader } from '@/components/patterns/page-header'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import { Kbd } from '@/components/patterns/kbd'
import { CountPill } from '@/components/primitives/count-pill'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { DueCountdownText } from '@/components/primitives/due-date-label'
import { IsoDatePicker, isValidIsoDate } from '@/components/primitives/iso-date-picker'
import { ToggleChip } from '@/components/primitives/toggle-chip'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { ClientPeekHoverCard } from '@/features/clients/ClientPeekHoverCard'
import { useEvidenceDrawer } from '@/features/evidence/EvidenceDrawerContext'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { paidPlanActive } from '@/features/billing/model'
import {
  ALL_STATUSES,
  LIFECYCLE_V2_STATUSES,
  LIFECYCLE_V2_STATUS_SETS,
  ObligationQueueStatusControl,
  StatusMark,
  STATUS_ICON_COLOR,
  useLifecycleV2StatusLabels,
  useStatusLabels,
  type ObligationStatus,
} from '@/features/obligations/status-control'
import { BlockedByChip, isBlockedByVisible } from '@/features/obligations/blocked-by-chip'
import { CreateObligationDialog } from '@/features/obligations/CreateObligationDialog'
import { paymentOverdueDays } from '@/features/obligations/payment-overdue'
import {
  DEADLINE_DETAIL_TABS,
  cleanDeadlineDetailSearch,
  deadlineDetailHref,
  findObligationIdByDeadlineRef,
  normalizeDeadlineDetailTab,
  normalizeDeadlineRef,
  obligationIdMatchesDeadlineRef,
} from '@/features/obligations/deadline-detail-url'
import { isRejectionVisible, RejectionChip } from '@/features/obligations/rejection-chip'
import { useLifecycleV2 } from '@/features/obligations/use-lifecycle-v2'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { ObligationPanelDispatcher } from '@/features/obligations/ObligationPanelDispatcher'
import { ObligationListRail } from '@/features/obligations/components/ObligationListRail'
import {
  DETAIL_PANEL_OPEN_ANIM,
  DETAIL_PANEL_CLOSE_ANIM,
  DETAIL_PANEL_INNER_RISE_ANIM,
  DETAIL_PANEL_INNER_FADE_ANIM,
  DETAIL_PANEL_CONTENT_ENTER_ANIM,
  DETAIL_PANEL_CONTENT_EXIT_ANIM,
} from '@/features/obligations/queue/constants'
import { formatTaxCode } from '@/lib/tax-codes'
import { jurisdictionLabel } from '@/features/rules/rules-console-model'
import { SearchInput } from '@/components/primitives/search-input'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { queryInputUrlUpdateRateLimit, useDebouncedQueryInput } from '@/lib/query-rate-limit'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { cn, formatDate, formatDatePretty } from '@/lib/utils'

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
// Queue opens sorted by INTERNAL due date ascending (most-overdue first),
// with the blue active-sort arrow on that column.
const DEFAULT_SORT: ObligationQueueSort = 'due_asc'
const DEFAULT_DENSITY: ObligationQueueDensity = 'comfortable'
// Explicit "Group by" mode. `due` keeps the chronological flat list.
// `urgency` clusters deadlines into OVERDUE / THIS WEEK / UPCOMING bands.
// `client` clusters rows under client section headers (with aggregate
// metadata). `filing` clusters rows under filing-type section headers.
// `urgency` sits next to `due` in the dropdown since both are
// due-date-derived; both legacy and new `?group=urgency` URLs resolve.
const GROUP_OPTIONS = ['due', 'urgency', 'client', 'filing'] as const
type ObligationQueueGroup = (typeof GROUP_OPTIONS)[number]
// Default grouping is urgency bands (Overdue / This week / Upcoming) so the
// queue opens on the banded view — an "OVERDUE · N DEADLINES" header leads the
// list. Users can still switch to Due date / Client / Filing in the kebab.
const DEFAULT_GROUP: ObligationQueueGroup = 'urgency'
const EMPTY_OBLIGATION_QUEUE_ROWS: ObligationQueueRow[] = []
const EMPTY_ASSIGNEES: MemberAssigneeOption[] = []
const EMPTY_FACET_OPTIONS: FilterOption[] = []
const EMPTY_CLIENT_OPTIONS: ClientFilterOption[] = []
const INITIAL_CURSOR: ObligationQueueCursor = null
const PAGE_SIZE = 50
// Client-side pagination window over the cumulative useInfiniteQuery
// buffer. The page size is derived from the viewport height so the table
// fills the screen with as many rows as fit and the user never gets a
// "half-full page above the pagination footer" view on short
// monitors or a "scroll to see anything" view on tall monitors.
// See `useResponsivePageSize` below — the floor/ceil + per-row
// estimate live there. The constants here are clamp bounds so the
// table never collapses to <8 rows or balloons past ~40 even on
// huge displays (40 already taxes scan readability).
const CLIENT_PAGE_SIZE_MIN = 8
const CLIENT_PAGE_SIZE_MAX = 40
// Estimated per-row height in the current rendering. 56px = h-14
// (the canonical workbench-table row height shared with /clients +
// /rules/library). All three tables share the same row pitch. If row
// chrome changes again, re-measure with a quick `getBoundingClientRect().
// height` test and adjust — undershooting fills the viewport
// partially, overshooting scrolls.
const CLIENT_ROW_HEIGHT_PX = 56
const REPLACE_HISTORY_OPTIONS = { history: 'replace' } as const
const DAYS_FILTER_MIN = -3650
const DAYS_FILTER_MAX = 3650
const THIS_WEEK_MAX_DAYS = 7

// Page size is derived from the ACTUAL scroll container height, not window
// height. A window-height heuristic overshoots when the page chrome
// is tall (e.g. filter bar wrapping two lines) and undershoots when
// the panel is open eating side space but not vertical. Measuring
// the container with ResizeObserver gives the true "how much room
// do I have for rows" answer.
//
// The measurement target is the table-card, a bordered frame that
// contains ONLY the Table + Pagination — no filter bars, no page
// header. So the chrome budget is small and stable (doesn't drift
// when the filter bar wraps).
//
// Chrome subtracted from the table-card's clientHeight:
//   - TableHeader                ≈ 40px (h-12 with cell padding + border)
//   - Pagination footer          ≈ 44px (border-t + py-2 + content)
//   - card border (1px × 2)      ≈ 2px
//   - safety buffer              ≈ 4px (round-off vs sub-px line heights)
//   Total ≈ 90px. Set to 96 for breathing room.
const INSIDE_CHROME_PX = 96

function computeResponsivePageSize(containerHeight: number): number {
  const usable = Math.max(0, containerHeight - INSIDE_CHROME_PX)
  const fit = Math.floor(usable / CLIENT_ROW_HEIGHT_PX)
  return Math.max(CLIENT_PAGE_SIZE_MIN, Math.min(CLIENT_PAGE_SIZE_MAX, fit || CLIENT_PAGE_SIZE_MIN))
}

// Uses a callback-ref shape (not a `React.RefObject`): the hook returns a
// SETTER instead of accepting a ref. When the DOM element attaches,
// React calls the setter with the element; when it detaches, the
// setter is called with null. The effect runs whenever `element`
// state changes, so observation kicks in correctly the moment the
// table-card mounts (even if it mounts AFTER the initial render).
// A `RefObject` shape would break when the observed element renders
// CONDITIONALLY: the ref is null on first mount, the effect early-returns,
// and it never re-fires because its dep (the ref object) is stable —
// leaving page size stuck at MIN (8 rows).
function useResponsivePageSize(): [number, (element: HTMLElement | null) => void] {
  const [pageSize, setPageSize] = useState<number>(CLIENT_PAGE_SIZE_MIN)
  const [element, setElement] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return () => {}
    if (!element) return () => {}
    const measure = (): void => {
      setPageSize(computeResponsivePageSize(element.clientHeight))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])
  return [pageSize, setElement]
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

type ExtensionPlanDraft = {
  obligationId: string
  memo: string
  source: string
  internalTargetDate: string
  // Manually-entered extended filing deadline — only used for rules with no
  // statutory durationMonths (the server computes it otherwise).
  extendedFilingDate: string
}

export function emptyExtensionPlanDraft(obligationId = ''): ExtensionPlanDraft {
  return {
    obligationId,
    memo: '',
    source: '',
    internalTargetDate: '',
    extendedFilingDate: '',
  }
}

export function extensionPlanDraftFromRow(
  row: Pick<
    ObligationQueueRow,
    'id' | 'extensionInternalTargetDate' | 'extensionMemo' | 'extensionSource'
  >,
): ExtensionPlanDraft {
  return {
    obligationId: row.id,
    memo: row.extensionMemo ?? '',
    source: row.extensionSource ?? '',
    internalTargetDate: row.extensionInternalTargetDate ?? '',
    extendedFilingDate: '',
  }
}

const DAY_MS = 86_400_000
// Form-code chips need enough room for the longest default federal label
// ("Form 1099-NEC"). The table is fixed-layout, so content cannot resize this
// column after layout; keep the width explicit and large enough for the chip.
const OBLIGATION_QUEUE_FORM_COL_WIDTH = 'w-[168px] min-w-[168px]'
// Width of the Due column. Tokenized so the magic-number doesn't fight
// long client-name wraps if the table layout shifts.
const OBLIGATION_QUEUE_DUE_COL_WIDTH = 'w-32'
const NON_HIDEABLE_COLUMNS = new Set(['select'])
// Columns that ship hidden by default and are opt-in via the
// Columns dropdown. 12 columns is too much for skim-reading, so the
// default visible set is trimmed and power users can opt into the rest
// from the Columns menu. Smart Priority is hidden by default but the
// queue still sorts by it (sort=smart_priority); enable it from the menu
// when you want the tier label rendered as a cell. `clientState` (the
// STATE column) is in the default visible set; Smart Priority + Evidence
// stay hidden.
const DEFAULT_HIDDEN_COLUMN_IDS = [
  'smartPriority',
  'clientCounty',
  'dueDateExact',
  'daysUntilDue',
  'evidenceCount',
  // The broad TAX category ("Income tax" / "Payroll") is secondary to the FORM
  // chip that already anchors each row; hidden by default, still toggleable
  // from the View menu.
  'taxCategory',
] as const
// Explicit left→right column order — FILING · CLIENT · STATE · ASSIGNEE ·
// INTERNAL DUE · OFFICIAL DUE · STATUS. Set via TanStack `columnOrder` so the
// column object literals below stay in their original source order (avoids a
// risky 600-line block reshuffle). Hidden columns trail at the end.
const DEFAULT_COLUMN_ORDER = [
  'select',
  'taxType',
  'clientName',
  'taxCategory',
  'clientState',
  'currentDueDate',
  'filingDueDate',
  'assigneeName',
  'status',
  'smartPriority',
  'dueDateExact',
  'evidenceCount',
] as const
// Columns that auto-collapse when the detail panel is open.
// Only the secondary / state-cluster columns auto-hide; the row anchor
// (Client + Form + Due + Status) survives the panel-open layout so the
// table still tells the row's primary story even with a 600px panel
// claiming half the width. The auto-hidden columns repeat information the
// drawer header / body already surfaces for the focused obligation.
// On close, the user's saved column choices come back because we strip the
// auto-hidden set from the saved `hidden` URL state before persisting (see
// onColumnVisibilityChange).
const PANEL_OPEN_AUTO_HIDDEN_COLUMN_IDS = [
  'clientState',
  'clientCounty',
  'taxCategory',
  'assigneeName',
  'evidenceCount',
  'smartPriority',
  // With the panel open the list shrinks to ~2/5 width, so the fixed-width
  // columns no longer all fit. Keep only the row anchor (Filing + Client +
  // Internal due + Status); Official due auto-hides alongside the
  // state-cluster columns and comes back when the panel closes.
  'filingDueDate',
] as const
const OBLIGATION_QUEUE_ROW_CONTROL_SELECTOR =
  'button,a[href],input,label,select,textarea,[role="button"],[role="checkbox"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="option"],[role="radio"],[role="tab"],[data-slot="checkbox"]'

// Short entity-type labels for the CLIENT cell identity subtitle
// ("Sole Prop · California"), Pencil /deadlines production recreation.
// Mirrors clients.entity_type; kept terse so the subtitle stays a quiet
// one-liner under the client name.
const CLIENT_ENTITY_TYPE_LABELS: Record<ObligationQueueRow['clientEntityType'], string> = {
  llc: 'LLC',
  s_corp: 'S-Corp',
  c_corp: 'C-Corp',
  partnership: 'Partnership',
  sole_prop: 'Sole Prop',
  trust: 'Trust',
  individual: 'Individual',
  other: 'Entity',
}

// Broad tax category for the TAX column ("Income tax" / "Payroll" /
// "Information"), Pencil /deadlines production recreation. Derived from
// the form code + obligation type since the queue row carries no explicit
// category. Payroll = the 94x employment-tax family + deposits;
// Information = BOI / 990 / 1099 information returns; everything else
// (1040 / 1065 / 1120 / 1041 / elections) reads as income tax.
function taxCategoryLabel(row: Pick<ObligationQueueRow, 'taxType' | 'obligationType'>): string {
  const code = formatTaxCode(row.taxType).toLowerCase()
  if (row.obligationType === 'deposit' || /\b94\d\b|payroll|w-?2/.test(code)) return 'Payroll'
  if (row.obligationType === 'information' || /\bboi\b|\b990\b|\b1099\b|information/.test(code)) {
    return 'Information'
  }
  return 'Income tax'
}

// Short filing-authority token for the STATE cell ("IRS" / "FinCEN").
// The queue row's `authority` is free text; we only surface the two
// recognizable federal authorities (the design's vocabulary). State
// agencies and unknowns return null so the cell falls back to the bare
// state-code badge instead of printing a truncated agency name.
function shortFilingAuthority(
  row: Pick<ObligationQueueRow, 'authority' | 'taxType'>,
): string | null {
  if (row.authority) {
    if (/fincen/i.test(row.authority)) return 'FinCEN'
    if (/irs|internal revenue/i.test(row.authority)) return 'IRS'
  }
  const code = formatTaxCode(row.taxType).toLowerCase()
  if (/\bboi\b/.test(code)) return 'FinCEN'
  // Federal income/payroll/information forms file to the IRS.
  if (/\b(1040|1041|1065|1120|94\d|990|1099|2553|7004|4868)\b/.test(code)) return 'IRS'
  return null
}

// The obligation detail panel shares the alerts panel's width contract and
// motion choreography (match AlertDetailDrawer) so the two right-rail panels
// read as siblings. The page-mode panel here and the queue drawer are the
// SAME surface in two modes, so they share ONE set of motion constants —
// imported from queue/constants.ts (the canonical source) rather than
// re-declared locally. A prior local copy had silently drifted (close 0.28
// vs 0.30, inner-fade 0.22 vs 0.12, content-exit 0.08 vs 0.12); keeping a
// single definition is exactly what the motion-grammar token system is for.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STATE_CODE_RE = /^[A-Z]{2}$/

type DeadlineInputRequestAudit = {
  recipientName: string | null
  recipientRole: string | null
  message: string | null
  createdAt: string
}

function readPlainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return Object.fromEntries(Object.entries(value))
}

function readNonEmptyString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function latestDeadlineInputRequest(
  auditEvents: readonly AuditEventPublic[],
): DeadlineInputRequestAudit | null {
  const sorted = [...auditEvents].toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  for (const event of sorted) {
    if (event.action !== 'obligation.input_requested') continue
    const after = readPlainRecord(event.afterJson)
    return {
      recipientName: readNonEmptyString(after, 'recipientName'),
      recipientRole: readNonEmptyString(after, 'recipientRole'),
      message: readNonEmptyString(after, 'message'),
      createdAt: event.createdAt,
    }
  }
  return null
}

function deadlineDetailStateObligationId(state: unknown, routeRef: string | null): string | null {
  if (!routeRef || !state || typeof state !== 'object') return null
  const obligationId = Reflect.get(state, 'obligationId')
  if (typeof obligationId !== 'string') return null
  return obligationIdMatchesDeadlineRef(obligationId, routeRef) ? obligationId : null
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

const obligationQueueSearchParamsParsers = {
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
  // "Awaiting signature" triage lens — filed returns still waiting on the
  // client's 8879. Absent when off (no default); ?awaitingSignature=true
  // when on.
  awaitingSignature: parseAsBoolean.withOptions(REPLACE_HISTORY_OPTIONS),
  // Projected lens — projected (annual-rollover / auto-projection) deadlines
  // awaiting CPA confirmation. Absent when off; ?projected=true when on.
  projected: parseAsBoolean.withOptions(REPLACE_HISTORY_OPTIONS),
  drawer: parseAsStringLiteral(DETAIL_DRAWERS).withOptions(REPLACE_HISTORY_OPTIONS),
  id: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
  tab: parseAsStringLiteral(DETAIL_TABS)
    .withDefault('summary')
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

type ObligationQueueSearchParams = inferParserType<typeof obligationQueueSearchParamsParsers>
// A partial patch for the nuqs `setObligationQueueQuery` setter: every
// param may be set to `null` to reset it to its parser default. (The state
// type alone is too strict — array facets infer as non-null `string[]`, but
// the setter accepts `null` to clear them.)
type ObligationQueueQueryPatch = Partial<{
  [K in keyof ObligationQueueSearchParams]: ObligationQueueSearchParams[K] | null
}>
type DeadlineDetailQueueSearchState = Pick<
  ObligationQueueSearchParams,
  | 'q'
  | 'status'
  | 'obligation'
  | 'client'
  | 'rule'
  | 'state'
  | 'county'
  | 'taxType'
  | 'assignee'
  | 'assignees'
  | 'owner'
  | 'due'
  | 'dueWithin'
  | 'evidence'
  | 'awaitingSignature'
  | 'projected'
  | 'daysMin'
  | 'daysMax'
  | 'asOf'
  | 'sort'
  | 'density'
  | 'group'
  | 'hide'
>

function searchParamArrayEquals(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function setOptionalSearchParam(
  params: URLSearchParams,
  key: string,
  value: string | number | null,
): void {
  if (value === null || value === '') {
    params.delete(key)
    return
  }
  params.set(key, String(value))
}

function setArraySearchParam(
  params: URLSearchParams,
  key: string,
  values: readonly string[],
): void {
  if (values.length === 0) {
    params.delete(key)
    return
  }
  params.set(key, values.join(','))
}

export function deadlineDetailSearchFromQueueState(
  search: string,
  state: DeadlineDetailQueueSearchState,
): string {
  const baseSearch = cleanDeadlineDetailSearch(search)
  const params = new URLSearchParams(baseSearch.startsWith('?') ? baseSearch.slice(1) : baseSearch)

  setOptionalSearchParam(params, 'q', state.q)
  setArraySearchParam(params, 'status', state.status)
  setOptionalSearchParam(params, 'obligation', state.obligation)
  setArraySearchParam(params, 'client', state.client)
  setArraySearchParam(params, 'rule', state.rule)
  setArraySearchParam(params, 'state', state.state)
  setArraySearchParam(params, 'county', state.county)
  setArraySearchParam(params, 'taxType', state.taxType)
  setOptionalSearchParam(params, 'assignee', state.assignee)
  setArraySearchParam(params, 'assignees', state.assignees)
  setOptionalSearchParam(params, 'owner', state.owner)
  setOptionalSearchParam(params, 'due', state.due)
  setOptionalSearchParam(params, 'dueWithin', state.dueWithin)
  setOptionalSearchParam(params, 'evidence', state.evidence)
  if (state.awaitingSignature === true) params.set('awaitingSignature', 'true')
  else params.delete('awaitingSignature')
  if (state.projected === true) params.set('projected', 'true')
  else params.delete('projected')
  setOptionalSearchParam(params, 'daysMin', state.daysMin)
  setOptionalSearchParam(params, 'daysMax', state.daysMax)
  setOptionalSearchParam(params, 'asOf', state.asOf)
  setOptionalSearchParam(params, 'sort', state.sort === DEFAULT_SORT ? null : state.sort)
  setOptionalSearchParam(
    params,
    'density',
    state.density === DEFAULT_DENSITY ? null : state.density,
  )
  setOptionalSearchParam(params, 'group', state.group === DEFAULT_GROUP ? null : state.group)
  if (state.hide.length === 0) {
    params.set('hide', '')
  } else if (searchParamArrayEquals(state.hide, DEFAULT_HIDDEN_COLUMN_IDS)) {
    params.delete('hide')
  } else {
    params.set('hide', state.hide.join(','))
  }

  const nextSearch = params.toString()
  return nextSearch ? `?${nextSearch}` : ''
}

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

function isObligationQueueSort(value: string | null): value is ObligationQueueSort {
  return ALL_SORTS.some((sort) => sort === value)
}

function sortFromSearch(search: string): ObligationQueueSort | null {
  const value = new URLSearchParams(search).get('sort')
  return isObligationQueueSort(value) ? value : null
}

function getSortingState(sort: ObligationQueueSort): SortingState {
  if (sort === 'smart_priority') return [{ id: 'smartPriority', desc: true }]
  if (sort === 'due_desc') return [{ id: 'currentDueDate', desc: true }]
  if (sort === 'updated_desc') return [{ id: 'updatedAt', desc: true }]
  return [{ id: 'currentDueDate', desc: false }]
}

type SortableObligationQueueRow = Pick<
  ObligationQueueRow,
  'currentDueDate' | 'id' | 'smartPriority' | 'updatedAt'
>

export function compareObligationQueueRowsForSort(
  a: SortableObligationQueueRow,
  b: SortableObligationQueueRow,
  sort: ObligationQueueSort,
): number {
  if (sort === 'smart_priority') {
    return compareSmartPriority(
      {
        obligationId: a.id,
        currentDueDate: a.currentDueDate,
        smartPriority: a.smartPriority,
      },
      {
        obligationId: b.id,
        currentDueDate: b.currentDueDate,
        smartPriority: b.smartPriority,
      },
    )
  }

  if (sort === 'updated_desc') {
    const updatedDelta = b.updatedAt.localeCompare(a.updatedAt)
    if (updatedDelta !== 0) return updatedDelta
    return b.id.localeCompare(a.id)
  }

  const direction = sort === 'due_desc' ? -1 : 1
  const dueDelta = a.currentDueDate.localeCompare(b.currentDueDate)
  if (dueDelta !== 0) return dueDelta * direction
  return a.id.localeCompare(b.id) * direction
}

function withDefaultSortCleared(sort: ObligationQueueSort): ObligationQueueSort | null {
  return sort === DEFAULT_SORT ? null : sort
}

export function nextHeaderSort({
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
  return currentSort === ascSort ? descSort : ascSort
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

function daysFilterValue(value: number | null): number | undefined {
  if (value === null || !Number.isSafeInteger(value)) return undefined
  return Math.min(DAYS_FILTER_MAX, Math.max(DAYS_FILTER_MIN, value))
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
  // Gates the bulk "Set status" dropdown: the server already enforces, but
  // without this the trigger would be clickable for read-only roles and only
  // fail with a 403 toast. Disables the trigger with a tooltip explaining why.
  const canUpdateObligationStatus = permission.can('obligation.status.update')
  const practiceAiEnabled = paidPlanActive(permission.firm)
  const { openEvidence } = useEvidenceDrawer()
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  // Current user's display name — used by the Owner column to label
  // "yours" via a tiny chip on the row. Per
  // docs/Design/ux-audit-2026-05-21.md P0 #3: triage of 47 rows is
  // impossible without "is this mine."
  const currentUserName = useCurrentUserName()
  // Hover-revealed peek affordance on the Client cell — same pattern as
  // `/clients` row peek (see ClientFactsWorkspace.tsx). Lets you glance into
  // the client without leaving the queue or swapping the obligation drawer's
  // content. Uses ClientPeekHoverCard (hover-anchored PreviewCard);
  // `useClientDrawer` still exists for other call sites (e.g.
  // ClientFactsWorkspace).
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
      awaitingSignature,
      projected,
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
  const liveLocationSearch =
    typeof window === 'undefined' ? location.search : window.location.search
  const locationSort = useMemo(() => sortFromSearch(liveLocationSearch), [liveLocationSearch])
  const [optimisticSort, setOptimisticSort] = useState<ObligationQueueSort | null>(null)
  const deadlineDetailSearch = useMemo(
    () =>
      deadlineDetailSearchFromQueueState(liveLocationSearch, {
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
        awaitingSignature,
        projected,
        daysMin,
        daysMax,
        asOf,
        sort: urlSort,
        density,
        group,
        hide: hiddenColumns,
      }),
    [
      liveLocationSearch,
      searchInput,
      statusFilter,
      obligation,
      clientFilter,
      ruleFilter,
      stateFilter,
      countyFilter,
      taxTypeFilter,
      assignee,
      assigneeFilter,
      owner,
      due,
      dueWithin,
      evidence,
      awaitingSignature,
      projected,
      daysMin,
      daysMax,
      asOf,
      urlSort,
      density,
      group,
      hiddenColumns,
    ],
  )
  // Slice D: when ?lifecycle=v2 is active AND the URL has no explicit
  // ?sort= param, default the queue to internal deadline ascending instead of
  // Smart Priority. Smart Priority remains in the sort dropdown — it's
  // just no longer the implicit ranking. Reinforces "Dashboard
  // curates, Deadlines sorts" per the design brief.
  //
  // Treat the real URL search as the authoritative explicit sort, and let
  // header/dropdown interactions set a matching optimistic sort so the table
  // flips immediately. Without the optimistic layer, clicking the Internal due
  // date header could update the address bar to `sort=due_desc` while the
  // current render still read the previous nuqs state, leaving rows in
  // ascending order until a reload.
  const sort: ObligationQueueSort = useMemo(() => {
    const urlDrivenSort = locationSort ?? (lifecycleV2 ? DEFAULT_SORT : urlSort)
    const optimisticMatchesUrl =
      optimisticSort !== null &&
      (locationSort === optimisticSort ||
        (locationSort === null && optimisticSort === DEFAULT_SORT))
    return optimisticMatchesUrl ? optimisticSort : urlDrivenSort
  }, [locationSort, lifecycleV2, optimisticSort, urlSort])
  const [penaltyRow, setPenaltyRow] = useState<ObligationQueueRow | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  // The at-a-glance banner is dismissible. Persisted in localStorage so it
  // stays closed across reloads; guarded for SSR/no-storage.
  const [glanceDismissed, setGlanceDismissed] = useState<boolean>(() => {
    try {
      return globalThis.localStorage?.getItem('deadlines.glance.dismissed') === '1'
    } catch {
      return false
    }
  })
  const dismissGlance = useCallback(() => {
    setGlanceDismissed(true)
    try {
      globalThis.localStorage?.setItem('deadlines.glance.dismissed', '1')
    } catch {
      // ignore (private mode / storage disabled) — in-memory dismiss still holds
    }
  }, [])
  // The queue renders the full loaded buffer inside a scroll container and
  // grows it via an IntersectionObserver sentinel at the bottom (fetchNextPage
  // when it nears the viewport). `scrollContainerRef` is the observer
  // root + the element we scroll back to top on a sort change.
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  // In full-page mode the filter bar pins to the page top; the table's column
  // header (select-all + sort/filter controls) must pin right BELOW it. We
  // measure the sticky filter bar's live height so the header's sticky `top`
  // offset tracks it (the bar wraps responsively, so a hard-coded offset would
  // drift).
  const filterBarRef = useRef<HTMLDivElement | null>(null)
  // Controlled open for the split "Add deadline" button — both the main button
  // and the dropdown's "Add one deadline" item drive the same
  // CreateObligationDialog.
  const [addDeadlineOpen, setAddDeadlineOpen] = useState(false)
  const [filterBarHeight, setFilterBarHeight] = useState(0)
  useEffect(() => {
    const element = filterBarRef.current
    if (!element) return undefined
    const measure = () => setFilterBarHeight(element.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const loadMoreSentinelRef = useRef<HTMLTableRowElement | null>(null)
  // Responsive rows-per-page derived from the table-card's clientHeight via
  // ResizeObserver. The card frame contains ONLY the Table + Pagination, so
  // the chrome subtraction is a stable, small value (≈96px). The hook returns
  // a callback ref because the table-card mounts inside a conditional ternary
  // (loading/success) — a ref-object pattern would early-return with null on
  // first paint and never re-fire. See useResponsivePageSize above.
  const [, setTableCardElement] = useResponsivePageSize()
  // Ref targets the always-mounted fixed-row search field — no open-state shim
  // needed.
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  // Anchor for shift-click range selection — last id the user clicked.
  const lastSelectedIdRef = useRef<string | null>(null)
  const [extendedMemoOpen, setExtendedMemoOpen] = useState(false)
  // P0: confirm gate for the bulk "Remind to sign" floating-bar action.
  const [remindToSignConfirmOpen, setRemindToSignConfirmOpen] = useState(false)
  // P1: bulk "Decide extension" floating-bar action.
  const [bulkExtensionOpen, setBulkExtensionOpen] = useState(false)
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
  // The group key is layered as the PRIMARY sort, with the user's chosen sort
  // as secondary. TanStack table honors multi-column sorting natively, so rows
  // of the same group (same client / same status) are adjacent. The user can
  // still pick a secondary sort (e.g. group=client + sort by currentDueDate
  // asc → grouped by client, within each client sorted by due date). This
  // stops short of full section-headers + collapse; picking Client or Filing
  // visibly regroups the rows.
  const sorting = useMemo<SortingState>(() => {
    const baseSort = getSortingState(sort)
    if (group === 'urgency') return [{ id: 'currentDueDate', desc: false }, ...baseSort]
    if (group === 'client') return [{ id: 'clientName', desc: false }, ...baseSort]
    if (group === 'filing') return [{ id: 'taxType', desc: false }, ...baseSort]
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
    // Skip the panel-open auto-hide when hide=[] is the explicit intent: when
    // the user clicks Show all (hide=[]) they want EVERYTHING visible
    // regardless of panel state.
    const userExplicitlyShowAll = hiddenColumns.length === 0
    if (panelOpenIntent && !userExplicitlyShowAll) {
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
      clientState: t`Jurisdiction`,
      clientCounty: t`County`,
      // "Form" matches the column header (the cell is the form-code chip) and
      // stays unambiguous next to the `taxCategory` entry; the broad tax
      // category lives in its own TAX column.
      taxType: t`Form`,
      taxCategory: t`Tax`,
      // Spells out "date" so the two date-column labels read as a consistent
      // pair with the neighbouring "Due date" column.
      currentDueDate: t`Internal due date`,
      // Header reads "Official due"; the menu spells out "date" so
      // the date-column entries read as a consistent family.
      filingDueDate: t`Official due date`,
      dueDateExact: t`Due date`,
      daysUntilDue: t`Days`,
      evidenceCount: t`Evidence`,
      status: t`Status`,
    }),
    [t],
  )
  const statusQuery = useMemo(() => [...statusFilter], [statusFilter])
  // When a single status is active via the top scope tabs (the scope is not
  // "All"), every visible row carries that same status, so the STATUS cell's
  // text label is pure redundancy — the cell renders the status ICON only (the
  // `compact` mode of ObligationQueueStatusControl drops the label). When the
  // scope is "All" the full status label stays. Mirrors `activeScope`
  // (computed later for the scope-tab bar) but is needed earlier here, inside
  // the column definitions.
  const singleStatusScopeActive = statusQuery.length === 1 && isObligationStatus(statusQuery[0]!)
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
  // Derived adapter so the Export dialog's SearchableCombobox can take the
  // existing `clientOptions` shape without duplicating the map. Folding the
  // state into `meta` keeps the row dense (label + trailing jurisdiction);
  // folding `state` and `county` into `keywords` lets the typeahead match on
  // partial location strings too.
  const exportClientComboboxOptions = useMemo<SearchableComboboxOption[]>(
    () =>
      clientOptions.map((option) => {
        const keywords = [option.state, option.county].filter(
          (part): part is string => typeof part === 'string' && part.length > 0,
        )
        const base: SearchableComboboxOption = { value: option.value, label: option.label }
        // Strict optionals — only attach `meta` / `keywords` when
        // populated so we don't carry literal `undefined` shapes.
        if (option.state) base.meta = option.state
        if (keywords.length > 0) base.keywords = keywords
        return base
      }),
    [clientOptions],
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
  // Assignee + county facets feed the new faceted Filter sheet (the flat
  // popover never surfaced them). Both come straight off the same facets RPC
  // with real counts, so they scale through the per-facet typeahead like every
  // other dimension. Assignee filtering writes the `assignees` param by NAME
  // (the query maps it to `assigneeNames`), so the facet value IS the name.
  const assigneeOptions = useMemo<FilterOption[]>(
    () => facetsQuery.data?.assigneeNames.map(facetOptionToFilterOption) ?? EMPTY_FACET_OPTIONS,
    [facetsQuery.data?.assigneeNames],
  )
  const countyOptions = useMemo<FilterOption[]>(
    () => facetsQuery.data?.counties.map(facetOptionToFilterOption) ?? EMPTY_FACET_OPTIONS,
    [facetsQuery.data?.counties],
  )
  // No `statusOptions` here: the status scope tabs at the top of the toolbar
  // own status filtering (there is no per-column STATUS header filter).
  // `statusDropdownOptions` / `statusLabels` are used by the scope tabs + row
  // status pills.
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
      ...(awaitingSignature ? { awaitingSignature: true } : {}),
      ...(projected ? { confirmed: false } : {}),
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
      awaitingSignature,
      projected,
      asOf,
      sort,
    ],
  )
  const listQuery = useInfiniteQuery({
    ...orpc.obligations.list.infiniteOptions({
      initialPageParam: INITIAL_CURSOR,
      input: (cursor) => ({
        ...queryInputWithoutCursor,
        cursor,
      }),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
    // Keep showing the previous query result while the new filter set is
    // fetching. Without this, every tab or chip click collapses the table to
    // the `isInitialLoading` skeleton for a beat — the table height collapses
    // and re-expands as rows re-mount, reading as a page that blinks and
    // glitches. `placeholderData: (prev) => prev` renders the old rows during
    // the re-fetch; they fade to the new rows in place once the new data lands,
    // with no skeleton in between. Standard React Query pattern for smooth
    // filter transitions.
    placeholderData: (previous) => previous,
  })

  const updateStatusMutation = useMutation(
    orpc.obligations.updateStatus.mutationOptions({
      onSuccess: () => {
        // Cache invalidation only — the per-call onSuccess (wired in
        // `updateStatus` below) owns the toast so it can attach the
        // contextual Undo action with the previous status closed over.
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDeadlineTip.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
      },
      onError: (err) => {
        toast.error(t`Couldn't update status`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  const bulkStatusMutation = useMutation(
    orpc.obligations.bulkUpdateStatus.mutationOptions({
      onSuccess: (result, variables) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        setRowSelection({})
        // Toast copy uses "deadlines" not "rows" (engineering-speak); CPAs say
        // "deadlines" or "filings". The title reflects which status was applied
        // (via the v2-aware `statusLabels` map) so a CPA running several bulk
        // actions back-to-back can distinguish them. The RPC silently skips
        // rows whose source status can't reach the target per the transition
        // matrix (e.g. a terminal `completed` row in a "Waiting on client"
        // batch), so surface the skipped count so preparers know the batch
        // wasn't entirely applied.
        const skipped = result.skippedCount
        // Bulk status change — from_status is heterogeneous across the batch so
        // it's omitted; count reflects rows actually updated. Non-PII enums only.
        track(ANALYTICS_EVENTS.deadlineStatusChanged, {
          to_status: variables.status,
          bulk: true,
          count: result.updatedCount,
          surface: 'deadlines_table',
        })
        track(ANALYTICS_EVENTS.deadlinesBulkAction, {
          action: 'set_status',
          count: result.updatedCount,
        })
        toast.success(t`Status changed to ${statusLabels[variables.status]}`, {
          description:
            skipped > 0
              ? t`${result.updatedCount} deadlines changed · ${skipped} skipped (already closed)`
              : t`${result.updatedCount} deadlines changed`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't update selected rows`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  const confirmObligationsMutation = useMutation(
    orpc.obligations.confirmObligations.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        setRowSelection({})
        track(ANALYTICS_EVENTS.deadlinesBulkAction, {
          action: 'confirm_projected',
          count: result.confirmedCount,
        })
        toast.success(t`${result.confirmedCount} deadlines confirmed`, {
          description: t`Confirmed deadlines now send client reminders on schedule.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't confirm deadlines`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  // P0: bulk Form 8879 signature reminders from the floating action bar.
  // The server emails only the rows actually awaiting signature and
  // returns counts so the toast can report what was sent vs skipped.
  const bulkRemindSignatureMutation = useMutation(
    orpc.obligations.bulkRemindSignature.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        setRowSelection({})
        // Bulk Form 8879 signature reminders — fire the signature event once for
        // the action and record it as a bulk action with the emailed count.
        track(ANALYTICS_EVENTS.signatureRequested, { surface: 'deadlines_table' })
        track(ANALYTICS_EVENTS.deadlinesBulkAction, {
          action: 'remind_signature',
          count: result.remindedCount,
        })
        const description =
          result.skippedCount > 0 || result.noEmailCount > 0
            ? t`${result.remindedCount} emailed · ${result.skippedCount} not awaiting signature · ${result.noEmailCount} without an email on file`
            : t`${result.remindedCount} emailed`
        toast.success(t`Signature reminders sent`, { description })
      },
      onError: (err) => {
        toast.error(t`Couldn't send reminders`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  // P1: bulk "Decide extension" from the floating action bar. Applies one
  // extension plan to every eligible selected deadline; the server skips rows
  // already extended (or past the shared target date) and returns counts.
  const bulkDecideExtensionMutation = useMutation(
    orpc.obligations.bulkDecideExtension.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        setRowSelection({})
        // Bulk extension — jurisdiction/filing_type are heterogeneous across the
        // batch so they're omitted; surfaced as a bulk action with the count.
        track(ANALYTICS_EVENTS.deadlineExtended, {})
        track(ANALYTICS_EVENTS.deadlinesBulkAction, {
          action: 'decide_extension',
          count: result.decidedCount,
        })
        toast.success(t`Extension plans saved`, {
          description:
            result.skippedCount > 0
              ? t`${result.decidedCount} deadlines extended · ${result.skippedCount} skipped (already extended or past deadline)`
              : t`${result.decidedCount} deadlines extended`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't decide extensions`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  // Single-call mutation used by BOTH the bulk-action bar (many clientIds) and
  // the per-row Unassigned `?` picker (one clientId). When
  // `clientIds.length === 1` we treat it as a quick-assign and DON'T clear the
  // row checkbox selection — the user might have unrelated rows selected and
  // just want to assign one specific client. Multi-id calls keep the
  // "clear selection on success" behavior since the bulk bar's selection IS
  // the input.
  const bulkAssigneeMutation = useMutation(
    orpc.clients.bulkUpdateAssignee.mutationOptions({
      onSuccess: (result, vars) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.workload.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        const isQuickAssign = vars.clientIds.length === 1
        if (!isQuickAssign) setRowSelection({})
        // Assign analytics: self_assigned compares the assigned member's name to
        // the current user's name LOCALLY and emits only a boolean — no name leaves.
        const assignedMemberName =
          vars.assigneeId === null
            ? null
            : (assignableMembers.find((m) => m.assigneeId === vars.assigneeId)?.name ?? null)
        track(ANALYTICS_EVENTS.deadlineAssigned, {
          bulk: !isQuickAssign,
          count: vars.clientIds.length,
          self_assigned:
            assignedMemberName !== null &&
            currentUserName !== null &&
            assignedMemberName.trim().toLowerCase() === currentUserName.trim().toLowerCase(),
          surface: 'deadlines_table',
        })
        if (!isQuickAssign) {
          track(ANALYTICS_EVENTS.deadlinesBulkAction, {
            action: 'assign',
            count: vars.clientIds.length,
          })
        }
        toast.success(
          isQuickAssign
            ? vars.assigneeId === null
              ? t`Owner cleared`
              : t`Owner assigned`
            : t`Owners updated`,
          {
            description: t`Audit ${result.auditId.slice(0, 8)}`,
          },
        )
      },
      onError: (err) => {
        toast.error(t`Couldn't update owners`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  const assignClient = useCallback(
    (input: { clientIds: string[]; assigneeId: string | null }) => {
      bulkAssigneeMutation.mutate(input)
    },
    [bulkAssigneeMutation],
  )
  const assigneeUpdatePending = bulkAssigneeMutation.isPending
  const exportMutation = useMutation(
    orpc.obligations.exportSelected.mutationOptions({
      onSuccess: (result) => {
        downloadBase64File(result)
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        // Toast names WHERE the file went: most browsers drop to Downloads
        // silently, so without the destination cue the user can't tell whether
        // they need to click Save somewhere. The audit-id stays accessible —
        // power-users who need it can grab it from the audit log.
        toast.success(t`Export ready`, {
          description: t`Saved to your Downloads folder.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't export selected rows`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  const rows = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.rows) ?? EMPTY_OBLIGATION_QUEUE_ROWS,
    [listQuery.data?.pages],
  )
  // The AT A GLANCE tiles must summarize ALL deadlines regardless of the
  // active status scope tab or any filter — feeding them the filtered `rows`
  // would flip the tiles to "Nothing overdue — you're clear" the moment the
  // user switched to e.g. the "Waiting on client" scope. This SECOND query
  // re-uses the same `obligations.list` endpoint with NO status / due /
  // evidence / signature / taxType / client / state filters applied — only the
  // always-on scoping (tenant + the `asOfDate` clock, kept so the
  // daysUntilDue math matches the queue's). It shares React Query's cache via
  // the standard query key, and the default `due_asc` sort surfaces the
  // most-overdue + due-this-week rows in the first page, so a single PAGE_SIZE
  // slice carries every headline name the tiles render.
  const glanceQueryInput = useMemo<ObligationQueueListInputWithoutCursor>(
    () => ({
      ...(asOf ? { asOfDate: asOf } : {}),
      sort: DEFAULT_SORT,
      limit: PAGE_SIZE,
    }),
    [asOf],
  )
  const glanceQuery = useQuery({
    ...orpc.obligations.list.queryOptions({
      input: { ...glanceQueryInput, cursor: INITIAL_CURSOR },
    }),
    placeholderData: (previous) => previous,
  })
  const glanceRows = glanceQuery.data?.rows ?? EMPTY_OBLIGATION_QUEUE_ROWS
  const isInitialLoading = listQuery.isLoading
  const isError = listQuery.isError
  // Page-view event — fire ONCE per route mount, after the first page has
  // settled so `result_count` is meaningful. `filter_count` counts the active
  // filter categories; all props are non-PII enums/counts.
  const deadlinesViewedTracked = useRef(false)
  useEffect(() => {
    if (deadlinesViewedTracked.current) return
    if (listQuery.isLoading) return
    deadlinesViewedTracked.current = true
    const filterCount =
      (searchInput !== '' ? 1 : 0) +
      (statusQuery.length > 0 ? 1 : 0) +
      (stateQuery.length > 0 ? 1 : 0) +
      (countyQuery.length > 0 ? 1 : 0) +
      (taxTypeQuery.length > 0 ? 1 : 0) +
      (assigneeQuery.length > 0 ? 1 : 0) +
      (clientQuery.length > 0 ? 1 : 0) +
      (obligationQuery.length > 0 ? 1 : 0) +
      (ruleQuery.length > 0 ? 1 : 0) +
      (due !== null ? 1 : 0) +
      (evidence !== null ? 1 : 0) +
      (awaitingSignature ? 1 : 0) +
      (projected ? 1 : 0) +
      (owner !== null ? 1 : 0) +
      (asOf !== null ? 1 : 0) +
      (minDaysUntilDue !== undefined || maxDaysUntilDue !== undefined ? 1 : 0)
    track(ANALYTICS_EVENTS.deadlinesViewed, {
      result_count: rows.length,
      filter_count: filterCount,
      sort,
      density,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once page view
  }, [listQuery.isLoading])
  const keyboardEnabled = rows.length > 0 && !shortcutsBlocked
  // TanStack is in manualSorting mode, and React Query keeps the previous
  // result as placeholder data while a new sort is fetching. Re-sort the
  // currently loaded buffer by the active sort so a header click has an
  // immediate visible effect; the server response still supplies the complete
  // keyset-ordered page once it arrives. For visual Group by modes, group key
  // stays primary and the active sort orders rows inside each group.
  const orderedRows = useMemo(() => {
    const groupSortKeyOf = (obligationQueueRow: ObligationQueueRow) =>
      group === 'due'
        ? ''
        : group === 'urgency'
          ? String(URGENCY_BAND_ORDER.indexOf(urgencyBandOf(obligationQueueRow)))
          : group === 'filing'
            ? formatTaxCode(obligationQueueRow.taxType).toLocaleLowerCase()
            : `${obligationQueueRow.clientName.toLocaleLowerCase()}\u0000${obligationQueueRow.clientId}`
    return rows.toSorted((a, b) => {
      const groupDelta = groupSortKeyOf(a).localeCompare(groupSortKeyOf(b))
      if (groupDelta !== 0) return groupDelta
      return compareObligationQueueRowsForSort(a, b, sort)
    })
  }, [rows, group, sort])

  // Pure adjacency-based grouping (NO reordering): when the active
  // sort naturally places a client's obligations next to each other,
  // show the client name once on the first row, then render following
  // deadlines as indented continuation rows. If the sort scatters a
  // client's rows, each row stands alone with its own client name.
  //
  // When grouped by Due Date the same-client adjacency grouping is wrong —
  // every row should stand alone with its own client name. Early-return an
  // empty Set when `group !== 'client'` so the continuation visualization only
  // runs in group=client mode.
  const continuationRowIds = useMemo(() => {
    const set = new Set<string>()
    if (group !== 'client') return set
    for (let i = 1; i < orderedRows.length; i++) {
      if (orderedRows[i]!.clientId === orderedRows[i - 1]!.clientId) {
        set.add(orderedRows[i]!.id)
      }
    }
    return set
  }, [orderedRows, group])
  // "Within-group" = this row is NOT the last in its client group, i.e.
  // the NEXT row is a continuation (same client). Within-group rows
  // drop their bottom border so the group reads as a single visual
  // block. Group boundaries keep the border so the eye can find them.
  const withinGroupRowIds = useMemo(() => {
    const set = new Set<string>()
    for (let i = 0; i < orderedRows.length - 1; i++) {
      if (continuationRowIds.has(orderedRows[i + 1]!.id)) set.add(orderedRows[i]!.id)
    }
    return set
  }, [orderedRows, continuationRowIds])
  // Group-by section-header map:
  //
  //   • Client mode → header at EVERY client boundary.
  //   • Filing mode → header at EVERY filing-type boundary.
  //   • Due-date mode → NO section headers. Flat chronological list.
  //
  // Keyed by the FIRST row's id in each cluster. `lateCount` powers
  // the late-pill, while `earliestDueDate` carries the "next due"
  // semantics. Computed from `orderedRows` so counts reflect
  // the full result set, not just the visible page.
  const groupHeadersByFirstRowId = useMemo(() => {
    const map = new Map<
      string,
      {
        groupKey: string
        count: number
        label: string
        kind: 'client' | 'filing' | 'urgency'
        clientId?: string
        lateCount?: number
        earliestDueDate?: string
        // Average |days from internal due| across the group — powers the
        // "≈12D AVG" right-side meta on the band header (production design).
        avgAbsDays?: number
      }
    >()
    if (group === 'due') {
      // Due-date mode is a flat list per the wireframes. No section
      // headers, no clusters. Earlier the `if (group === 'due')`
      // branch emitted a 2+-row cluster header (multi-deadline-per-
      // client); now suppressed so the by-date list reads as one
      // chronological run.
      return map
    }
    // Emit a header at EVERY group boundary, including single-row
    // groups. The rows are already sorted with the relevant group key
    // as primary sort (see `sorting` useMemo earlier), so adjacent rows
    // of the same group cluster naturally.
    const urgencyBandLabels: Record<UrgencyBand, string> = {
      overdue: t`Overdue`,
      this_week: t`This week`,
      upcoming: t`Upcoming`,
    }
    const groupKeyOf = (r: ObligationQueueRow) =>
      group === 'urgency'
        ? urgencyBandOf(r)
        : group === 'filing'
          ? formatTaxCode(r.taxType)
          : r.clientId
    const groupLabelOf = (r: ObligationQueueRow) =>
      group === 'urgency'
        ? urgencyBandLabels[urgencyBandOf(r)]
        : group === 'filing'
          ? formatTaxCode(r.taxType)
          : r.clientName
    let i = 0
    while (i < orderedRows.length) {
      const start = orderedRows[i]!
      const startKey = groupKeyOf(start)
      let j = i + 1
      while (j < orderedRows.length && groupKeyOf(orderedRows[j]!) === startKey) j++
      let earliest = start.currentDueDate
      let lateCount = 0
      let absDaysSum = 0
      for (let k = i; k < j; k++) {
        const r = orderedRows[k]!
        if (r.currentDueDate < earliest) earliest = r.currentDueDate
        absDaysSum += Math.abs(daysUntilEffectiveInternalDueDate(r))
        // "Late" = past internal due AND non-terminal (still actionable).
        // Same terminal set as the narrative banner — paid / not-applicable
        // rows can't be late either.
        if (
          r.daysUntilDue < 0 &&
          r.status !== 'done' &&
          r.status !== 'paid' &&
          r.status !== 'completed' &&
          r.status !== 'not_applicable'
        ) {
          lateCount++
        }
      }
      const groupSize = j - i
      map.set(start.id, {
        groupKey: startKey,
        label: groupLabelOf(start),
        kind: group === 'urgency' ? 'urgency' : group === 'filing' ? 'filing' : 'client',
        ...(group === 'client' ? { clientId: start.clientId } : {}),
        count: groupSize,
        lateCount,
        earliestDueDate: earliest,
        avgAbsDays: groupSize > 0 ? Math.round(absDaysSum / groupSize) : 0,
      })
      i = j
    }
    return map
  }, [orderedRows, group, t])
  // Collapsible grouping. State is local + transient — not URL-bound — because
  // expand/collapse is a per-view scroll-state preference, not a deep-linkable
  // filter. Key is the active group key: clientId for Client mode, taxType for
  // Filing mode.
  const [collapsedQueueGroups, setCollapsedQueueGroups] = useState<Set<string>>(() => new Set())
  const toggleQueueGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedQueueGroups((current) => {
      const next = new Set(current)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
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
  const activeDetailTab = routeObligationRef ? (routeDetailTab ?? 'summary') : detailTab
  // The ONLY time the sidebar auto-collapses is when this route opens its
  // right detail panel. The user's manual collapse preference (persisted in
  // localStorage) is untouched — when the panel closes, that preference takes
  // over again. If the user manually expands while auto-collapsed, their
  // toggle wins for the rest of the panel session (see SidebarProvider).
  const { setAutoCollapsed } = useSidebar()
  useEffect(() => {
    setAutoCollapsed(activeDetailId !== null)
    return () => {
      // Restore the user's preference on unmount (route change).
      setAutoCollapsed(false)
    }
  }, [activeDetailId, setAutoCollapsed])
  const activeRow =
    (row ? rowsById.get(row) : null) ??
    (activeDetailId ? rowsById.get(activeDetailId) : null) ??
    rows[0] ??
    null
  // Separate "the user explicitly selected this row" (drives the
  // background highlight + aria-selected) from "the keyboard cursor
  // sits here" (drives J/K, Enter, hotkeys, falls back to rows[0]).
  // The highlight only appears when `row` is set in the URL — otherwise the
  // first row would always be tinted, making the queue look like row 1 was
  // permanently focused.
  const explicitActiveRowId =
    activeDetailId && rowsById.has(activeDetailId)
      ? activeDetailId
      : row && rowsById.has(row)
        ? row
        : null
  const openQueueDetail = useCallback(
    (obligationId: string, tab: ObligationQueueDetailTab = activeDetailTab) => {
      void navigate(deadlineDetailHref({ obligationId, tab, search: deadlineDetailSearch }), {
        state: { obligationId },
      })
    },
    [activeDetailTab, deadlineDetailSearch, navigate],
  )
  const closeQueueDetail = useCallback(() => {
    if (routeObligationRef) {
      void navigate(`/deadlines${deadlineDetailSearch}`)
      return
    }
    void setObligationQueueQuery({ drawer: null, id: null, row: null })
  }, [deadlineDetailSearch, navigate, routeObligationRef, setObligationQueueQuery])
  const onRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      const nextSelection = functionalUpdate(updater, rowSelection)
      setRowSelection(nextSelection)
    },
    [rowSelection],
  )
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
          // Status-change analytics fire once here for single-row queue moves
          // (the drawer/detail own their own). Non-PII enums/counts only.
          const changedRow = rows.find((r) => r.id === input.id)
          track(ANALYTICS_EVENTS.deadlineStatusChanged, {
            from_status: previousStatus,
            to_status: input.status,
            bulk: false,
            count: 1,
            surface: 'deadlines_table',
          })
          if (isDueDaysSuppressedForStatus(input.status) && input.status !== 'not_applicable') {
            track(ANALYTICS_EVENTS.deadlineCompleted, {
              jurisdiction: changedRow?.jurisdiction ?? null,
              filing_type: changedRow?.taxType ?? null,
              days_to_due: changedRow?.daysUntilDue,
            })
          }
          // Toast names the chosen status so a CPA marking 10 rows filed in
          // succession can spot at-a-glance when a wrong status was picked
          // (otherwise the 10 toasts would be visually identical). Mirrors the
          // per-row drawer toast.
          toast.success(t`Status changed to ${statusLabels[input.status]}`, {
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
    [updateStatusMutation, statusLabels, t, rows],
  )
  const statusUpdatePending = updateStatusMutation.isPending || bulkStatusMutation.isPending
  const changeSort = useCallback(
    (nextSort: ObligationQueueSort) => {
      // A new sort re-keys the infinite query → the buffer resets to the
      // first page; jump the scroll container back to the top so the
      // user sees the new top row, not a mid-scroll position.
      setOptimisticSort(nextSort)
      scrollContainerRef.current?.scrollTo({ top: 0 })
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
          const isContinuation = continuationRowIds.has(tableRow.original.id)
          return (
            <div className={cn(isContinuation && 'translate-x-[26px]')}>
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
        // Plain label header (no per-column filter — Client filtering lives in
        // the consolidated "Filters" popover in the toolbar, mirroring
        // /alerts).
        header: () => <span>{t`Client`}</span>,
        cell: ({ row: tableRow, table }) => {
          const isContinuation = continuationRowIds.has(tableRow.original.id)
          // Shift+click the client name → range-select every row
          // sharing this clientId. Matches the hybrid multi-select model:
          // filings-default, with a group-expand keystroke for the one
          // workflow (reassignment) that naturally lives at the client level.
          // Unshifted clicks pass through to the row handler that opens the
          // drawer.
          const handleClientNameClick = (event: React.MouseEvent<HTMLElement>) => {
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
          if (isContinuation) {
            return (
              <div
                className="min-w-0 pl-6"
                onClick={handleClientNameClick}
                onMouseDown={(event) => {
                  if (event.shiftKey) event.preventDefault()
                }}
              >
                <span className="sr-only">{tableRow.original.clientName}</span>
                <span aria-hidden className="block h-px w-8 rounded-full bg-divider-regular" />
              </div>
            )
          }
          // Identity subtitle under the client name — "Sole Prop · California"
          // (entity type · home state). Gives each row a second line of
          // who-is-this context without opening the client peek.
          const entityLabel = CLIENT_ENTITY_TYPE_LABELS[tableRow.original.clientEntityType]
          const stateName = tableRow.original.clientState
            ? jurisdictionLabel(tableRow.original.clientState)
            : null
          const clientSubtitle = stateName ? `${entityLabel} · ${stateName}` : entityLabel
          return (
            <div className="flex min-w-44 items-center gap-1.5">
              <div
                className="flex min-w-0 flex-1 flex-col"
                onClick={handleClientNameClick}
                onMouseDown={(event) => {
                  // Prevent text-selection drag from interfering with
                  // the shift-click range gesture.
                  if (event.shiftKey) event.preventDefault()
                }}
              >
                <span
                  className={cn(
                    // Client name is font-medium by default; the active row
                    // steps up to semibold so the selection still reads. 15px
                    // so it anchors the row a touch more strongly over the
                    // secondary cells.
                    'line-clamp-1 min-w-0 text-sm leading-tight text-text-primary',
                    tableRow.original.id === explicitActiveRowId ? 'font-semibold' : 'font-medium',
                  )}
                  title={t`${tableRow.original.clientName} · Shift+click to select all of this client's rows`}
                >
                  {tableRow.original.clientName}
                </span>
                <span className="line-clamp-1 text-caption-xs leading-tight text-text-tertiary">
                  {clientSubtitle}
                </span>
              </div>
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
                <Button
                  variant="ghost"
                  size="icon-xs"
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={t`Peek ${tableRow.original.clientName} details`}
                  title={t`Peek client details`}
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <EyeIcon className="size-3.5" aria-hidden />
                </Button>
              </ClientPeekHoverCard>
            </div>
          )
        },
        meta: { headerClassName: 'w-[196px]', cellClassName: 'w-[196px]' },
      },
      {
        // Smart Priority — second data column (right after Client). Client is
        // the primary anchor; Priority answers "why am I looking at this row"
        // right next to the name. Default sort is smart_priority desc, so this
        // column doubles as the implicit sort key.
        accessorKey: 'smartPriority',
        id: 'smartPriority',
        // Plain-text header (no click-to-sort affordance): Priority IS the
        // default sort, so a sort control here would be a no-op.
        header: () => <span>{t`Priority`}</span>,
        cell: ({ row: tableRow }) => {
          const score = tableRow.original.smartPriority.score
          const rank = tableRow.original.smartPriority.rank
          // Renders just the numeric score (rounded), no tier labels, with
          // optical-weight inherited from the tier — the score's heaviness IS
          // the visual urgency cue, so dropping the weight too would flatten
          // the whole column.
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
              <span className={cn('text-xs tabular-nums leading-tight', tierClassName)}>
                {Math.round(score)}
              </span>
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
            // Reads as "slot exists but nobody's filled it." The `?` is a real
            // DropdownMenu trigger; clicking it opens an assignee picker (same
            // member list + `clients.bulkUpdateAssignee` flow the client-detail
            // H1 owner-pill uses). There is no per-obligation `assignee` — an
            // obligation's assignee inherits from the client, so the picker
            // assigns the CLIENT, which propagates to every deadline for that
            // client. Tooltip + footer copy make that scope explicit so the
            // user doesn't assign one row and discover they assigned twelve.
            return (
              <AssigneeQuickPicker
                clientName={tableRow.original.clientName}
                currentAssigneeId={null}
                currentUserName={currentUserName}
                assignableMembers={assignableMembers}
                disabled={assigneeUpdatePending}
                onChange={(assigneeId) =>
                  assignClient({
                    clientIds: [tableRow.original.clientId],
                    assigneeId,
                  })
                }
              />
            )
          }
          const isMine =
            currentUserName !== null &&
            assigneeName.trim().toLowerCase() === currentUserName.toLowerCase()
          return (
            <AssigneeAvatar
              name={assigneeName}
              isMine={isMine}
              size="sm"
              title={isMine ? t`Assigned to you (${assigneeName})` : assigneeName}
            />
          )
        },
        // 76px so the canonical uppercase "ASSIGNEE" header fits without
        // colliding with the next column. Status fills the remainder, so no
        // overflow.
        meta: { headerClassName: 'w-[76px]', cellClassName: 'w-[76px]' },
      },
      {
        accessorKey: 'clientState',
        // Plain label header (no per-column filter — State filtering lives in
        // the toolbar "Filters" popover). Header reads "Jurisdiction" not
        // "State": the cell leads with the filing AUTHORITY ("IRS" / "FinCEN")
        // for federal forms, and a federal agency under a "State" label would
        // read as a category error — "Jurisdiction" covers both the federal
        // agency (IRS) and the state code (NY). Abbreviated to "Juris." so it
        // doesn't crowd the narrow badge column; the View menu + a11y label
        // keep the full "Jurisdiction" word.
        header: () => (
          <span title={t`Jurisdiction`} aria-label={t`Jurisdiction`}>
            <Trans>Juris.</Trans>
          </span>
        ),
        // Cell leads with the filing AUTHORITY ("IRS" / "FinCEN") followed by
        // the client's state code — "IRS · CA". The authority answers "who are
        // we filing to" and the state code "where the client sits". Both are
        // FRAMED outline badges so they read as one jurisdiction cluster of
        // like things at scan distance. Empty cell stays "—".
        cell: ({ row: tableRow }) => {
          const state = tableRow.original.clientState
          const authority = shortFilingAuthority(tableRow.original)
          if (!state && !authority) return <EmptyCellMark />
          return (
            <div className="flex flex-wrap items-center gap-1">
              {authority ? (
                <Badge
                  variant="outline"
                  className="h-5 border-divider-regular px-1.5 text-caption-xs font-medium uppercase tracking-wide text-text-secondary"
                >
                  {authority}
                </Badge>
              ) : null}
              {state ? (
                <Badge
                  variant="outline"
                  className="h-5 border-divider-regular px-1.5 text-caption-xs font-medium uppercase tracking-wide text-text-secondary tabular-nums"
                >
                  {state}
                </Badge>
              ) : null}
            </div>
          )
        },
        meta: { headerClassName: 'w-[92px]', cellClassName: 'w-[92px] text-text-secondary' },
      },
      {
        accessorKey: 'taxType',
        // Header reads "Form" — the cell is the form-code chip ("Form 1040"),
        // so the FORM column anchors each row by the document, and the broad
        // category lives in the separate TAX column below.
        header: () => <span>{t`Form`}</span>,
        // FILING cell uses /today's ActionsTable canonical primitive —
        // `<TaxCodeBadge>` (bordered chip + mono + rounded-5 + tooltip). /today
        // + /alerts + drawer + Affected Clients all share the same chip
        // primitive.
        cell: (info) => <TaxCodeBadge code={info.getValue<string>()} />,
        meta: {
          headerClassName: OBLIGATION_QUEUE_FORM_COL_WIDTH,
          cellClassName: `${OBLIGATION_QUEUE_FORM_COL_WIDTH} text-text-secondary`,
        },
      },
      {
        // TAX column — the broad tax category ("Income tax" / "Payroll" /
        // "Information") derived from the form code + obligation type. Sits
        // between CLIENT and STATE so the row reads "who · what kind of tax ·
        // where".
        id: 'taxCategory',
        accessorFn: (queueRow) => taxCategoryLabel(queueRow),
        enableSorting: false,
        header: () => <span>{t`Tax`}</span>,
        cell: ({ row: tableRow }) => (
          <span className="text-xs text-text-secondary">{taxCategoryLabel(tableRow.original)}</span>
        ),
        meta: { headerClassName: 'w-[96px]', cellClassName: 'w-[96px]' },
      },
      {
        accessorKey: 'currentDueDate',
        header: () => {
          const label = t`Internal due`
          // No range-filter affordance on this header: the toolbar chip row
          // above (Past Due / Due this week) covers the common date-range
          // filters with one click, and the column sort handle on this header
          // lets you find any row by ordering — a range filter here would
          // overlap semantically with both.
          return (
            <ObligationQueueSortableHeader
              label={label}
              sort={sort}
              ascSort="due_asc"
              descSort="due_desc"
              firstSort="due_asc"
              sortLabel={`${t`Sort`} ${label}`}
              onSortChange={changeSort}
            />
          )
        },
        // Relative-time pill only ("3d late" / "in 5d"). The exact date lives
        // in its own hide-by-default column ('dueDateExact' below) — most
        // triage decisions only need the relative urgency, and the date row is
        // signal-to-noise tax.
        cell: ({ row: tableRow }) => (
          <DueDaysPill
            days={daysUntilEffectiveInternalDueDate(tableRow.original)}
            status={tableRow.original.status}
          />
        ),
        meta: {
          headerClassName: OBLIGATION_QUEUE_DUE_COL_WIDTH,
          cellClassName: `tabular-nums ${OBLIGATION_QUEUE_DUE_COL_WIDTH}`,
        },
      },
      {
        // OFFICIAL DUE DATE — the statutory filing deadline (`filingDueDate`),
        // shown alongside the INTERNAL working date so the CPA can see the
        // firm's buffer against the authority's hard date. Nullable → "—" when
        // the rule carries no statutory filing date.
        accessorKey: 'filingDueDate',
        id: 'filingDueDate',
        header: () => <span className="whitespace-nowrap">{t`Official due`}</span>,
        cell: (info) => {
          const value = info.getValue<string | null>()
          if (!value) return <EmptyCellMark />
          // Prose date "May 12, 2026". alwaysShowYear keeps the year visible
          // even within the current tax year.
          return (
            <span className="text-xs tabular-nums text-text-secondary">
              {formatDatePretty(value, { alwaysShowYear: true })}
            </span>
          )
        },
        meta: {
          headerClassName: 'w-[116px]',
          cellClassName: 'w-[116px] tabular-nums',
        },
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
          const internal = effectiveInternalDueDate(tableRow.original)
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
        meta: {
          headerClassName: OBLIGATION_QUEUE_DUE_COL_WIDTH,
          cellClassName: `tabular-nums ${OBLIGATION_QUEUE_DUE_COL_WIDTH}`,
        },
      },
      // No dollar / "projected risk" column in the queue: a per-row $ figure
      // over-quantifies triage decisions that are really driven by status +
      // due date. Triage filtering still ships via the chip row above.
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
              className="inline-flex cursor-pointer items-center rounded-sm outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
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
        // Urgency-ordered priority sort (not alphabetical, which would cluster
        // statuses in an order that matches no task-flow logic): not_started →
        // blocked → waiting_on_client → in_progress → in_review → done →
        // filed → paid → completed → extended → not_applicable. The urgent /
        // action-needed states come first so "Sort by Status" surfaces what
        // the CPA should work on next at the top.
        sortingFn: (a, b) => {
          const order: Record<string, number> = {
            not_started: 0,
            pending: 0,
            blocked: 1,
            waiting_on_client: 2,
            review: 3,
            in_progress: 4,
            in_review: 5,
            done: 6,
            filed: 7,
            paid: 8,
            completed: 9,
            extended: 10,
            not_applicable: 11,
          }
          const ai = order[a.original.status] ?? 99
          const bi = order[b.original.status] ?? 99
          return ai - bi
        },
        // Plain label header (no per-column filter — it would be redundant with
        // the status scope tabs at the top of the toolbar, which write the same
        // `status` param).
        header: () => <span>{t`Status`}</span>,
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
          // Payment-overdue chip in the queue Status column: a small red Badge
          // appears next to the status pill when the row's payment is past due,
          // regardless of the lifecycle status — otherwise a Filed row whose
          // paymentDueDate has slipped would show only the green Filed pill and
          // bury the payment-overdue signal. Stacks cleanly with BlockedByChip
          // / RejectionChip (they're status-state signals; this is a date-state
          // signal).
          const paymentLateDays = paymentOverdueDays(obligationQueueRow, Date.now())
          // The quiet confirmation sub-states (awaiting-signature / accepted /
          // payment-due) collapse into a single secondary line under the status
          // pill — mirroring /today's "Why now:" reason line with a leading
          // corner glyph — instead of three competing badges that are hard to
          // read together. High-attention chips (Blocked / Rejected /
          // Projected) stay on the primary row. The compact (panel-open) layout
          // keeps its inline icons since space is the constraint there, not
          // badge count.
          const secondaryStatusLabels: string[] = []
          if (
            obligationQueueRow.status === 'done' &&
            obligationQueueRow.efileState === 'authorization_requested'
          ) {
            secondaryStatusLabels.push(t`Awaiting signature`)
          }
          if (obligationQueueRow.efileAcceptedAt && obligationQueueRow.status !== 'completed') {
            secondaryStatusLabels.push(t`Accepted`)
          }
          if (paymentLateDays !== null) {
            secondaryStatusLabels.push(t`Payment due`)
          }
          return (
            // The Status cell can stack a pill + several signal badges
            // (payment-late / awaiting-signature / accepted). Bound the cell
            // and wrap the badges to a second line instead of letting the row
            // push the table past the viewport, so the trailing flex column
            // doesn't force horizontal overflow.
            <div className="flex flex-col gap-1">
              <div className={cn('flex items-center gap-1.5', !panelOpenIntent && 'flex-wrap')}>
                <ObligationQueueStatusControl
                  row={obligationQueueRow}
                  labels={statusLabels}
                  statuses={statusDropdownOptions}
                  disabled={statusUpdatePending}
                  onChange={(id, status) => updateStatus({ id, status }, obligationQueueRow.status)}
                  // Icon-only when the detail panel is open (space) OR when a
                  // single status scope is active (the label is redundant —
                  // every row shares it). Full label only in the "All" scope,
                  // panel closed.
                  compact={panelOpenIntent || singleStatusScopeActive}
                  readOnly={!canUpdateObligationStatus}
                />
                {/* Projected (rolled-forward / auto-generated) deadline awaiting CPA
                  confirmation — withheld from the reminder pipeline until confirmed. */}
                {!obligationQueueRow.confirmed ? (
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-caption-xs"
                    title={t`Projected — won't send client reminders until a CPA confirms it.`}
                  >
                    <Trans>Projected</Trans>
                  </Badge>
                ) : null}
                {/* Awaiting-signature signal. A row marked Filed but still
                  parked at efileState=authorization_requested isn't truly
                  done — it's waiting on the client's 8879. Quiet outline
                  chip so the green Filed pill stops reading as "complete."
                  Mirrors the queue "Awaiting signature" filter lens. */}
                {obligationQueueRow.status === 'done' &&
                obligationQueueRow.efileState === 'authorization_requested' ? (
                  panelOpenIntent ? (
                    <span
                      title={t`Filed, but the client hasn't signed Form 8879 yet — e-filing is blocked until they sign.`}
                      aria-label={t`Awaiting signature`}
                      className="inline-flex size-4 shrink-0 items-center justify-center text-text-tertiary"
                    >
                      <HourglassIcon className="size-3.5" aria-hidden />
                    </span>
                  ) : null
                ) : null}
                {/* "Accepted" is a soft success Badge — a quiet confirmation
                  that reinforces Filed rather than shouting over it (a solid-
                  green pill would out-weight the Filed status pill, making two
                  green elements compete), leaving the red Payment-late chip as
                  the single high-attention signal. */}
                {panelOpenIntent &&
                obligationQueueRow.efileAcceptedAt &&
                obligationQueueRow.status !== 'completed' ? (
                  <Badge
                    variant="success"
                    className="h-5 gap-1 px-1.5 text-caption-xs"
                    title={`${t`Authority accepted the return`} · ${formatDatePretty(obligationQueueRow.efileAcceptedAt.slice(0, 10))}`}
                  >
                    <CircleCheckIcon className="size-3" aria-hidden />
                    <Trans>Accepted</Trans>
                  </Badge>
                ) : null}
                {paymentLateDays !== null ? (
                  panelOpenIntent ? (
                    <span
                      title={t`Filing submitted but the authority payment due ${formatDate(obligationQueueRow.paymentDueDate ?? '')} hasn't been confirmed. Penalty interest accrues until the wire lands.`}
                      aria-label={t`Payment ${paymentLateDays}d late`}
                      className="inline-flex size-4 shrink-0 items-center justify-center text-text-tertiary"
                    >
                      <CircleDollarSignIcon className="size-4" aria-hidden />
                    </span>
                  ) : null
                ) : null}
                {showBlockedBy && obligationQueueRow.blockedByObligationInstanceId ? (
                  <BlockedByChip
                    parentObligationId={obligationQueueRow.blockedByObligationInstanceId}
                    parentLabel={(() => {
                      const parent = rowsById.get(obligationQueueRow.blockedByObligationInstanceId)
                      if (!parent) return null
                      return `${parent.clientName} · ${formatTaxCode(parent.taxType)}`
                    })()}
                    onOpen={(parentId) => openQueueDetail(parentId)}
                    compact={panelOpenIntent}
                  />
                ) : null}
                {showRejection ? <RejectionChip compact={panelOpenIntent} /> : null}
              </div>
              {/* Why-now-style secondary line (Pencil /today parity): the quiet
                  confirmation sub-states collapsed off the badge row, with a
                  leading corner glyph. Panel-closed only. */}
              {!panelOpenIntent && secondaryStatusLabels.length > 0 ? (
                <span
                  className="relative inline-flex items-center pl-3 text-caption-xs text-text-tertiary"
                  title={secondaryStatusLabels.join(' · ')}
                >
                  <svg
                    viewBox="0 0 9 9"
                    className="absolute top-1/2 left-0 size-[5px] -translate-y-1/2 text-text-muted"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M0 2V0H1V2C1 5.03757 3.46243 7.5 6.5 7.5H8.5V8.5H6.5C2.91015 8.5 0 5.58985 0 2Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="truncate">{secondaryStatusLabels.join(' · ')}</span>
                </span>
              ) : null}
            </div>
          )
        },
      },
    ],
    [
      assignClient,
      assignableMembers,
      assigneeUpdatePending,
      changeSort,
      canUpdateObligationStatus,
      continuationRowIds,
      currentUserName,
      explicitActiveRowId,
      openEvidence,
      openQueueDetail,
      panelOpenIntent,
      rowsById,
      singleStatusScopeActive,
      sort,
      statusDropdownOptions,
      statusLabels,
      statusUpdatePending,
      t,
      updateStatus,
    ],
  )

  // Hand the FULL loaded buffer to TanStack and render it inside a scroll
  // container. The bottom IntersectionObserver sentinel grows the buffer via
  // `fetchNextPage` (infinite scroll, not pagination).
  const table = useReactTable({
    data: orderedRows,
    columns,
    state: {
      columnOrder: [...DEFAULT_COLUMN_ORDER],
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
      // Pass `[]` (not `null`) when no columns are hidden. The `hide` parser
      // has a non-empty default (DEFAULT_HIDDEN_COLUMN_IDS), so `null` resolves
      // back to that default — meaning unhiding everything would silently
      // re-hide the default-hidden columns on the next URL read. Passing `[]`
      // (with `clearOnDefault: false` on the parser) preserves the explicit
      // "nothing is hidden" state.
      void setObligationQueueQuery({ hide: nextHidden })
    },
    onRowSelectionChange,
  })

  const tableRows = table.getRowModel().rows
  const visibleColumnCount = table.getVisibleLeafColumns().length
  // Prefetch the next page when the bottom sentinel nears the scroll viewport.
  // Mirrors the /rules/library infinite-scroll sentinel. `rootMargin`
  // pre-loads ~256px ahead so the user rarely sees the Load-more fallback. The
  // observer root is the queue's own scroll container (the rows-area), not the
  // page viewport, since scrolling happens inside the card.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = listQuery
  useEffect(() => {
    if (!hasNextPage) return undefined
    const node = loadMoreSentinelRef.current
    if (!node) return undefined
    if (typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage()
            break
          }
        }
      },
      // When the page scrolls as one (panel closed) the sentinel intersects
      // the viewport (root: null); in the panel-open split the queue scrolls
      // inside its own container.
      {
        root: panelOpenIntent ? scrollContainerRef.current : null,
        rootMargin: '256px 0px',
      },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, tableRows.length, panelOpenIntent])
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
  // Aggregates for the narrative banner. Overdue / due-today counts are derived
  // from the loaded glance page; entity count comes from the client facet (full
  // set). These power one editorial sentence + a metric line.
  const deadlinesNarrative = useMemo(() => {
    let overdue = 0
    let dueToday = 0
    for (const r of glanceRows) {
      // Terminal set mirrors workload's open-statuses complement (a `paid`
      // payment can't be overdue) — the banner and /workload must publish
      // the same overdue number or the CPA triages a phantom.
      const terminal =
        r.status === 'done' ||
        r.status === 'paid' ||
        r.status === 'completed' ||
        r.status === 'not_applicable'
      const days = daysUntilEffectiveInternalDueDate(r)
      if (!terminal && days < 0) overdue++
      if (!terminal && days === 0) dueToday++
    }
    const entities =
      facetsQuery.data?.clients.length ?? new Set(glanceRows.map((r) => r.clientId)).size
    return { overdue, dueToday, entities }
  }, [glanceRows, facetsQuery.data?.clients])
  // Eyebrow date for the narrative banner — "TUE JUN 9". Built from the
  // as-of date when one is pinned (demo / time-travel), else today.
  const bannerDateLabel = useMemo(() => {
    const base = asOf ? new Date(`${asOf}T00:00:00`) : new Date()
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(base)
    const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
      base,
    )
    return `${weekday} ${monthDay}`.toUpperCase()
  }, [asOf])
  const scopeStatuses = lifecycleV2 ? LIFECYCLE_V2_STATUSES : ALL_STATUSES
  // A v2 scope tab filters to the FULL set of raw statuses that display
  // under its label (see LIFECYCLE_V2_STATUS_SETS) — so the active tab is
  // the one whose set matches the current status filter exactly.
  const scopeStatusSet = useCallback(
    (status: ObligationStatus): readonly ObligationStatus[] =>
      lifecycleV2 && status in LIFECYCLE_V2_STATUS_SETS
        ? LIFECYCLE_V2_STATUS_SETS[status as keyof typeof LIFECYCLE_V2_STATUS_SETS]
        : [status],
    [lifecycleV2],
  )
  const activeScope: ObligationStatus | 'all' = useMemo(() => {
    if (statusQuery.length === 0) return 'all'
    const sortedQuery = [...statusQuery].toSorted().join(',')
    for (const status of scopeStatuses) {
      if ([...scopeStatusSet(status)].toSorted().join(',') === sortedQuery) return status
    }
    return 'all'
  }, [statusQuery, scopeStatuses, scopeStatusSet])
  // Auto-hide zero-count scopes. Keeps the bar honest about what the
  // user can actually triage — and respects the cognitive-load cap
  // when the firm has nothing in `Blocked` or `Completed`. The active
  // scope is always shown even if its count is zero (otherwise the
  // selected tab vanishes and the UI looks broken).
  // Tab count = sum across every raw status displaying under the label,
  // so "In review" counts in_progress + review + extended — the same rows
  // that visibly wear the "In review" chip in the table below.
  const scopeCount = useCallback(
    (status: ObligationStatus): number =>
      scopeStatusSet(status).reduce((sum, raw) => sum + (statusFacetCounts.get(raw) ?? 0), 0),
    [scopeStatusSet, statusFacetCounts],
  )
  const visibleScopeStatuses = useMemo(
    () => scopeStatuses.filter((status) => scopeCount(status) > 0 || status === activeScope),
    [scopeStatuses, scopeCount, activeScope],
  )
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
  // The search input is always mounted in the filter row above the table, so
  // the hotkey just focuses + selects.
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
        // Help-dialog label "Filter deadlines" (not "Focus search") so the `/`
        // hotkey reads identically across surfaces (matches "Filter rules" +
        // "Filter coverage"). The control is a page-level filter, not entity
        // search; verb-discipline matters when the help dialog lists three `/`
        // rows side-by-side under different categories.
        id: 'obligations.focus-search',
        name: 'Filter deadlines',
        description: 'Focus the Deadlines filter input.',
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

  function resetObligationQueue() {
    if (routeObligationRef) {
      void navigate('/deadlines')
    } else {
      void setObligationQueueQuery(null)
    }
    setRowSelection({})
  }

  // Single flag for the "Reset filters" affordance in the toolbar overflow
  // (kebab) menu — true whenever any search / status / facet / date filter is
  // set.
  const queueFiltersActive =
    searchInput !== '' ||
    statusQuery.length > 0 ||
    due !== null ||
    thisWeekFilterActive ||
    evidence !== null ||
    Boolean(awaitingSignature) ||
    Boolean(projected) ||
    stateQuery.length > 0 ||
    countyQuery.length > 0 ||
    taxTypeQuery.length > 0 ||
    assigneeQuery.length > 0 ||
    obligationQuery.length > 0 ||
    ruleQuery.length > 0 ||
    clientQuery.length > 0 ||
    assigneeNameQuery !== null ||
    owner !== null ||
    minDaysUntilDue !== undefined ||
    maxDaysUntilDue !== undefined ||
    asOf !== null

  function changeSelectedStatus(status: ObligationStatus, reason?: string) {
    if (selectedIds.length === 0) return
    bulkStatusMutation.mutate({
      ids: selectedIds,
      status,
      ...(reason ? { reason } : {}),
    })
  }

  function confirmSelectedProjected() {
    if (selectedIds.length === 0) return
    confirmObligationsMutation.mutate({ obligationIds: selectedIds })
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
      onSuccess: () => {
        // row_count is only known client-side for the `selected` scope; omit it
        // for filtered/all_active where the server decides the row set.
        track(ANALYTICS_EVENTS.deadlinesExported, {
          format: input.format,
          row_count: input.scope === 'selected' ? (input.ids?.length ?? 0) : undefined,
        })
        setExportModalOpen(false)
      },
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
    <div
      className={cn(
        // Page wrapper matches /today + /alerts exactly. `pb-12` / `md:pb-12`
        // matches /today's vertical breathing room at standard viewport
        // heights; the `xl:pb-0` override below keeps the pagination footer
        // flush at tall viewports where the queue fills the screen.
        'mx-auto flex w-full max-w-page-expanded flex-col gap-8 px-4 pt-8 pb-12 md:px-8 md:pt-8 md:pb-12',
        // The xl height-cap + overflow-hidden (which turns the queue into an
        // inner-table scroll) applies ONLY when the detail panel is open — the
        // side-by-side split needs a full-height rail. With the panel closed
        // the whole page scrolls naturally like /today + /alerts, and the
        // at-a-glance card row collapses as it scrolls away.
        panelOpenIntent && 'xl:h-screen xl:overflow-hidden xl:pb-0',
      )}
    >
      {/* Title carries the scope total alongside it ("Deadlines · 247"),
          matching /clients and /rules/library. Uses scopeTotal (the unfiltered
          count of the active status scope) so the number is stable as the user
          types in the search/filter chips — what the count represents
          shouldn't change mid-typing. */}
      <PageHeader
        // Sync status line above the title — a calm "we're live and how much
        // we track" signal: "Synced just now [glyph] · N deadlines tracked".
        // No leading green status dot, and the refresh glyph trails the
        // "Synced just now" label, matching /today's sync stamp (flat tertiary
        // text, icon trailing, no chrome) — freshness is an informational
        // stamp, not a success state, so a green dot would over-claim. The
        // "· N deadlines tracked" count is the page's scope context (Today has
        // no equivalent).
        eyebrow={
          <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-text-tertiary">
            <Trans>Synced just now</Trans>
            <RefreshCwIcon className="size-3 shrink-0" aria-hidden />
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              <Plural value={scopeTotal} one="# deadline tracked" other="# deadlines tracked" />
            </span>
          </span>
        }
        title={
          // items-center (not items-baseline) so the count chip's mono digits
          // middle-align against the h1 — baseline alignment placed the chip
          // lower and gave a visual sag. Title is the noun ("Deadlines"); the
          // count chip sits AFTER it as a rounded pill, matching the /clients
          // pattern ("9 Clients", "3 Ongoing" on /alerts, "N Rules" on
          // /rules/library).
          <span className="inline-flex items-center gap-2">
            <Trans>Deadlines</Trans>
            {scopeTotal > 0 ? <CountPill tone="neutral">{scopeTotal}</CountPill> : null}
          </span>
        }
        actions={
          <>
            {/* Export uses ArrowUpRightIcon (arrow up + out — data LEAVING the
                app), not a download arrow — the convention used by Linear /
                Notion / Figma for export actions. */}
            <Button variant="outline" size="sm" onClick={() => openExportDialog('filtered')}>
              <ArrowUpRightIcon data-icon="inline-start" />
              <Trans>Export</Trans>
            </Button>
            <CalendarSyncPopover />
            {/* No "Annual rollover" toolbar button here — the rollover engine
                + the `RollForwardAction` ("Generate Tax Year … deadlines") chip
                in the filter row carry that flow. */}
            {/* The "Add deadline" CTA lives on the queue (right-edge of the
                actions cluster, matching /clients's "+ Add client") so the
                common mid-day task — "I just learned client X owes a thing,
                add it" — doesn't require navigating back to the dashboard or a
                client detail to find `CreateObligationDialog`. It's a split
                button: the main button opens the single-create dialog; the
                caret opens a menu with "Add one deadline" (same dialog) + "Add
                several deadlines" (the bulk migration wizard), with a note that
                Pulse drafts land in Projected. Filled `primary` variant (the
                page's one real CTA, matching /today's single filled
                affordance); Export + Calendar sync stay outline as the
                secondary cluster. */}
            <div className="inline-flex">
              <CreateObligationDialog
                open={addDeadlineOpen}
                onOpenChange={setAddDeadlineOpen}
                trigger={
                  <Button type="button" variant="primary" size="sm" className="rounded-r-none">
                    <PlusIcon data-icon="inline-start" />
                    <Trans>Add deadline</Trans>
                  </Button>
                }
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      aria-label={t`More add-deadline options`}
                      className="-ml-px rounded-l-none px-2"
                    >
                      <ChevronDownIcon className="size-4" aria-hidden />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="min-w-[260px]">
                  <DropdownMenuItem onClick={() => setAddDeadlineOpen(true)}>
                    <PlusIcon className="size-4" aria-hidden />
                    <span className="flex-1">
                      <Trans>Add one deadline</Trans>
                    </span>
                    <Kbd>N</Kbd>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canRunMigration}
                    onClick={() => {
                      if (canRunMigration) openWizard()
                    }}
                  >
                    <ClipboardListIcon className="size-4" aria-hidden />
                    <span className="flex-1">
                      <Trans>Add several deadlines</Trans>
                    </span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-caption-xs">
                      <Trans>Bulk</Trans>
                    </Badge>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <p className="px-2 py-1.5 text-caption-xs text-text-tertiary">
                    <Trans>Pulse-generated drafts live in Projected</Trans>
                  </p>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* No Saved views / Reset UI — Reset is redundant with the "Clear
                filters" link in the applied-filters strip, and saved views was
                high-chrome for a feature CPAs barely touch. The underlying
                view/filter state machinery stays so the URL param still works
                for shared deep links. */}
          </>
        }
      />

      {/* A single narrative banner — an editorial read of where the week
          stands (eyebrow date + one headline + a metric line). Derived from
          the loaded glance page + client facet. Hidden while a detail panel is
          open so the split view keeps its vertical budget for the table. */}
      {!panelOpenIntent && !glanceDismissed ? (
        <section
          aria-label={t`Deadlines at a glance`}
          // Tight px-5/py-3.5 + 4px stack with a text-lg headline so the
          // eyebrow/headline/metric trio reads as one compact editorial block,
          // not a hero. `relative` + `pr-9` host the dismiss button without
          // overlapping the metric line.
          className="relative flex flex-col gap-1.5 rounded-xl border border-divider-subtle bg-background-subtle px-5 py-4 pr-9"
        >
          <Button
            variant="ghost"
            size="icon-xs"
            type="button"
            onClick={dismissGlance}
            aria-label={t`Dismiss at-a-glance summary`}
            // size-7 hit area — kept in sync with the /today Daily Brief ✕
            // (brief-banner-language.md keep-in-sync checklist).
            className="absolute right-2 top-2 size-7"
          >
            <XIcon className="size-3.5" aria-hidden />
          </Button>
          <CapsFieldLabel as="div" variant="group" className="inline-flex items-center gap-2">
            <span
              className="size-1.5 shrink-0 rounded-full bg-state-accent-active-alt"
              aria-hidden
            />
            {bannerDateLabel}
          </CapsFieldLabel>
          <h2 className="max-w-[64ch] text-lg leading-6 font-semibold text-text-primary">
            {deadlinesNarrative.overdue > 0 && deadlinesNarrative.dueToday > 0 ? (
              <Trans>
                {deadlinesNarrative.overdue} overdue, {deadlinesNarrative.dueToday} filing today —
                clear the urgent set to close the week strong.
              </Trans>
            ) : deadlinesNarrative.overdue > 0 ? (
              <Trans>
                {deadlinesNarrative.overdue} overdue — clear the urgent set to pull the week back on
                track.
              </Trans>
            ) : deadlinesNarrative.dueToday > 0 ? (
              <Trans>
                {deadlinesNarrative.dueToday} filing today — stay ahead to keep the week on track.
              </Trans>
            ) : (
              <Trans>Nothing overdue — the week is on track.</Trans>
            )}
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
            <span className="tabular-nums">
              {/* scopeTotal is every tracked deadline (incl. filed/completed),
                  NOT the "open" count the nav/Today/Workload show. Label it
                  "tracked", never "active" — "active" collided with "open"
                  and made 28-vs-15 read as a contradiction (re-critique). */}
              <Plural value={scopeTotal} one="# filing tracked" other="# filings tracked" />
            </span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              <Plural
                value={deadlinesNarrative.entities}
                one="across # entity"
                other="across # entities"
              />
            </span>
          </p>
        </section>
      ) : null}

      {/* When a row is selected, this section becomes a 2-column flex:
          queue on the left (shrinks), detail panel on the right (fixed
          440px). When no row is selected the queue takes the full width.
          Below xl the panel stacks below the queue so the table keeps
          its column space on narrow viewports. */}
      <div
        className={cn(
          'flex min-w-0 flex-col gap-4 xl:flex-row',
          // The xl height-constraint (so the queue column scrolls
          // independently) only applies in the panel-open split. Closed, the
          // row flows to natural height so the whole page scrolls.
          panelOpenIntent && 'xl:min-h-0 xl:flex-1 xl:items-stretch',
          // No recessed tray around the master-detail: the rail + detail sit
          // directly on the white page, separated by the rail's border-r
          // hairline — matching /alerts (no tray) and the
          // restraint-on-nested-surfaces rule.
        )}
      >
        {/* When a deadline is open the full table is hidden and a compact
            item-rail becomes the list (master-detail), mirroring /alerts. The
            table stays mounted (hidden) so its filter/sort/scroll state
            survives closing the detail. */}
        {panelOpenIntent ? (
          <ObligationListRail
            rows={tableRows.map((tableRow) => tableRow.original)}
            activeId={activeDetailId}
            onSelect={(id) => openQueueDetail(id, activeDetailTab)}
            hasNextPage={hasNextPage}
            onLoadMore={() => void fetchNextPage()}
          />
        ) : null}
        <div
          className={cn(
            // `gap-4` (16px) so the sticky filter bar (status tabs + action
            // chips + sort/columns) has a clearer breathing gap above the table
            // card — separating the "controls" layer from the "data" layer so
            // the two sections don't read as one dense band. The bulk-action
            // toolbar is a FloatingActionBar (fixed at viewport bottom), so
            // this gap only affects filter→table spacing.
            'flex min-w-0 flex-1 flex-col gap-4',
            // Reserve clearance for the floating bulk bar while a selection
            // exists, so the last rows scroll clear of the fixed bar instead of
            // being occluded. The bar only shows in full-page mode (this column
            // is `hidden` when the panel is open, hiding its fixed descendant
            // too), where the page scrolls as one — so the column's own bottom
            // padding extends the page scroll height.
            selectedIds.length > 0 && FLOATING_ACTION_BAR_SCROLL_PADDING,
            // In the panel-open split the queue column is `overflow-hidden` at
            // xl+ so it scrolls independently of the page. Closed, that clip is
            // OFF so `position: sticky` on the filter bar can pin to the page
            // (an `overflow:hidden` ancestor would scope sticky to itself).
            // The horizontal clip stays as `overflow-x-clip` (not -hidden) —
            // `clip` doesn't force overflow-y to `auto`, so it can't turn the
            // column back into a vertical scroll container.
            panelOpenIntent && 'hidden',
            !activeDetailId && 'overflow-x-clip',
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
          {/* Filter row is sticky to the top of the scroll container so the
              status tabs stay accessible when scrolling a long list. `top-0`
              anchors to the page's main scroll container (set in
              app-shell.tsx); z keeps it above table content but below modals.
              The bottom hairline uses `divider-subtle` (matching /alerts'
              lighter tab-strip boundary) and the tab/search row carries `pb-2`
              so the Search field's own rounded border clears the toolbar
              hairline instead of doubling against it. */}
          <div
            ref={filterBarRef}
            className={cn(
              // 2026-06-11 (Yuqi "combine into one row"): status pills + search
              // + filters share ONE line — pills shrink/scroll on the left, the
              // search/filter cluster takes the rest. Wraps only when truly
              // narrow.
              'sticky top-0 z-20 flex flex-wrap items-center gap-3',
              // Full-page mode: table rows scroll behind the bar, so it needs an
              // opaque fill + symmetric top/bottom padding. Panel-open split has
              // nothing scrolling behind it, so it stays transparent.
              !panelOpenIntent && 'bg-background-default pt-3 pb-3',
            )}
          >
            {/* Status filter — collapsed FilterTrigger (`Status │ All ⌄`)
                instead of an always-expanded 7-pill strip (2026-06-16, Yuqi
                "too long / usually collapsed"). The trigger's accent value
                names the active scope; the dropdown carries the same per-status
                counts the strip used to. Still writes the `status` URL param
                (clear → null, pick → the scope's raw status set), so deep-links
                and the /deadlines/:ref rail filter are untouched. Hidden in the
                panel-open split, matching the old strip. */}
            {!panelOpenIntent ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <FilterTrigger
                      leadingIcon={CircleIcon}
                      active={activeScope !== 'all'}
                      valueLabel={activeScope === 'all' ? t`All` : statusLabels[activeScope]}
                      aria-label={t`Filter by status`}
                    >
                      <span>
                        <Trans>Status</Trans>
                      </span>
                    </FilterTrigger>
                  }
                />
                <DropdownMenuContent align="start" className="min-w-[220px]">
                  <DropdownMenuRadioGroup
                    value={activeScope}
                    onValueChange={(next) => {
                      if (next === 'all') {
                        void setObligationQueueQuery({ status: null })
                      } else if (isObligationStatus(next)) {
                        void setObligationQueueQuery({ status: [...scopeStatusSet(next)] })
                        // Status-scope tab is a status filter — record the category.
                        track(ANALYTICS_EVENTS.deadlinesFiltered, { filter_types: ['status'] })
                      }
                    }}
                  >
                    <DropdownMenuRadioItem value="all">
                      <span className="flex w-full items-center gap-2">
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-text-tertiary"
                          aria-hidden
                        />
                        <Trans>All</Trans>
                        <span className="ml-auto tabular-nums text-text-tertiary">
                          {scopeTotal}
                        </span>
                      </span>
                    </DropdownMenuRadioItem>
                    {visibleScopeStatuses.map((status) => (
                      <DropdownMenuRadioItem key={status} value={status}>
                        <span className="flex w-full items-center gap-2">
                          <span
                            className={cn(
                              'size-1.5 shrink-0 rounded-full bg-current',
                              STATUS_ICON_COLOR[status],
                            )}
                            aria-hidden
                          />
                          <span className="whitespace-nowrap">{statusLabels[status]}</span>
                          <span className="ml-auto tabular-nums text-text-tertiary">
                            {scopeCount(status)}
                          </span>
                        </span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {/* Search — primary lookup across client / form / assignee. */}
              {/* Canonical SearchInput — unifies hover/focus/placeholder +
                  the clear-(×)/Esc affordance with every other page search.
                  The rate-limited URL write is preserved in the onChange; the
                  clear button + Escape both route through it (next === ''). */}
              <SearchInput
                ref={searchInputRef}
                value={searchInput}
                onChange={(nextSearch) => {
                  void setObligationQueueQuery(
                    { q: nextSearch || null, obligation: null, row: null },
                    nextSearch === ''
                      ? undefined
                      : { limitUrlUpdates: queryInputUrlUpdateRateLimit },
                  )
                }}
                placeholder={t`Filter client, form, or assignee`}
                className="w-full min-w-0 shrink sm:w-[320px]"
              />
              {/* Filter sheet — one button (with an active-count badge) opens a
                  faceted popover (header · tab strip · per-facet typeahead body ·
                  Reset/Apply footer). Each dimension is a searchable checkbox
                  list so it scales past a wall of chips. Saved-view presets live
                  inside the sheet's tab strip, never in the toolbar. */}
              {panelOpenIntent ? null : (
                <ObligationFiltersPopover
                  due={due}
                  thisWeekFilterActive={thisWeekFilterActive}
                  daysMax={daysMax}
                  evidence={evidence}
                  awaitingSignature={awaitingSignature}
                  taxTypeOptions={taxTypeOptions}
                  taxTypeSelected={taxTypeQuery}
                  clientOptions={clientOptions}
                  clientSelected={clientQuery}
                  stateOptions={stateOptions}
                  stateSelected={stateQuery}
                  assigneeOptions={assigneeOptions}
                  assigneeSelected={assigneeQuery}
                  countyOptions={countyOptions}
                  countySelected={countyQuery}
                  filtersDisabled={filtersDisabled}
                  onPatch={(patch) => void setObligationQueueQuery(patch)}
                />
              )}
              {/* Right cluster — overflow kebab (group by + reset) and the
                  column-visibility menu, icon-only per the design. */}
              {panelOpenIntent ? null : (
                <div className="ml-auto flex items-center gap-1">
                  {/* 2026-06-15 (Yuqi "deadlines — sort by clients, main page is
                      missing sortby"): a visible Sort-by control. The list
                      already supports clustering by client/filing/urgency (the
                      `group` param renders group headers), but it was buried in
                      the View → Group-by submenu. This surfaces it as a toolbar
                      pill that names the active ordering — mirroring the detail
                      rail's "Sorted by …" control. "Client" clusters rows under
                      client headers. */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <FilterTrigger
                          leadingIcon={LayersIcon}
                          active={group !== DEFAULT_GROUP}
                          valueLabel={
                            group === 'client'
                              ? t`Client`
                              : group === 'filing'
                                ? t`Filing`
                                : group === 'urgency'
                                  ? t`Urgency`
                                  : t`Due date`
                          }
                          aria-label={t`Sort deadlines`}
                        >
                          <span>
                            <Trans>Sort by</Trans>
                          </span>
                        </FilterTrigger>
                      }
                    />
                    <DropdownMenuContent align="end" className="min-w-[180px]">
                      <DropdownMenuRadioGroup
                        value={group}
                        onValueChange={(next) => {
                          if (
                            next === 'due' ||
                            next === 'urgency' ||
                            next === 'client' ||
                            next === 'filing'
                          ) {
                            void setObligationQueueQuery({ group: next })
                          }
                        }}
                      >
                        <DropdownMenuRadioItem value="due">
                          <Trans>Due date</Trans>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="urgency">
                          <Trans>Urgency</Trans>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="client">
                          <Trans>Client</Trans>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="filing">
                          <Trans>Filing</Trans>
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* Consolidated VIEW + ACTIONS menu. VIEW = Columns / Group
                      by / Density submenus (each trigger shows its current
                      value); ACTIONS = Export visible rows · Save current view
                      · Reset filters. Surfaced as a labelled "View" button with
                      the columns glyph (not a bare "..." kebab) so the
                      column-organise affordance is discoverable from the
                      toolbar. */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t`View, columns, and actions`}
                        >
                          <Columns3Icon data-icon="inline-start" />
                          <Trans>View</Trans>
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="min-w-[244px]">
                      {/* Base UI's GroupLabel calls useMenuGroupRootContext()
                          and throws ("MenuGroupContext is missing") the moment
                          the popup renders unless a Menu.Group/Menu.RadioGroup
                          ancestor provides it — same crash class as the assign
                          picker's label below. Every labelled section here is
                          therefore a real DropdownMenuGroup, which also wires
                          the group's aria-labelledby. */}
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-caption-xs tracking-wide text-text-tertiary uppercase">
                          <Trans>View</Trans>
                        </DropdownMenuLabel>
                        {/* Columns submenu — count on the trigger, checklist inside. */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Columns3Icon className="size-4" aria-hidden />
                            <span>
                              <Trans>Columns</Trans>
                            </span>
                            <span className="ml-auto tabular-nums text-text-tertiary">
                              {t`${visibleHideableCount} of ${totalHideableCount}`}
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-56">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="flex items-center justify-between gap-2">
                                <Trans>Visible columns</Trans>
                                {hiddenColumnsCount > 0 ? (
                                  <TextLink
                                    variant="accent"
                                    className="font-normal"
                                    onClick={() => {
                                      void setObligationQueueQuery({ hide: [] })
                                    }}
                                  >
                                    <Trans>Show all</Trans>
                                  </TextLink>
                                ) : null}
                              </DropdownMenuLabel>
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
                                      onCheckedChange={(checked) =>
                                        column.toggleVisibility(checked)
                                      }
                                    >
                                      <span>{label}</span>
                                    </DropdownMenuCheckboxItem>
                                  )
                                })}
                            </DropdownMenuGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        {/* Sort-by lives on the dedicated toolbar pill (added
                            2026-06-15 to surface grouping out of this menu); the
                            duplicate submenu here was removed 2026-06-18 (Hick's
                            — one home per control, the two had drifted to
                            different option orders). */}
                        {/* Density submenu. */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ListChecksIcon className="size-4" aria-hidden />
                            <span>
                              <Trans>Density</Trans>
                            </span>
                            <span className="ml-auto text-text-tertiary">
                              {density === 'compact' ? (
                                <Trans>Compact</Trans>
                              ) : (
                                <Trans>Default</Trans>
                              )}
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="min-w-[160px]">
                            <DropdownMenuRadioGroup
                              value={density}
                              onValueChange={(next) => {
                                if (next === 'comfortable' || next === 'compact') {
                                  void setObligationQueueQuery({ density: next })
                                }
                              }}
                            >
                              <DropdownMenuRadioItem value="comfortable">
                                <Trans>Default</Trans>
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="compact">
                                <Trans>Compact</Trans>
                              </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-caption-xs tracking-wide text-text-tertiary uppercase">
                          <Trans>Actions</Trans>
                        </DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openExportDialog('filtered')}>
                          <DownloadIcon className="size-4" aria-hidden />
                          <span className="flex-1">
                            <Trans>Export visible rows</Trans>
                          </span>
                          <Badge variant="secondary" className="h-5 px-1.5 text-caption-xs">
                            CSV
                          </Badge>
                        </DropdownMenuItem>
                        {/* 2026-06-16 (audit): saved views aren't persisted yet.
                            Was a toast that FALSELY claimed the view was saved —
                            converted to disabled-with-reason (+ "Soon" badge) per
                            the no-fiction rule so the control doesn't lie. */}
                        <DropdownMenuItem disabled title={t`Saved views are coming soon`}>
                          <BookmarkIcon className="size-4" aria-hidden />
                          <span className="flex-1">
                            <Trans>Save current view</Trans>
                          </span>
                          <Badge variant="secondary" className="h-5 px-1.5 text-caption-xs">
                            <Trans>Soon</Trans>
                          </Badge>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!queueFiltersActive}
                          onClick={() => resetObligationQueue()}
                          className="text-text-destructive data-highlighted:text-text-destructive"
                        >
                          <RotateCcwIcon className="size-4" aria-hidden />
                          <span className="flex-1">
                            {/* 2026-06-16 (audit): "Clear filters" — unified with
                                /clients, /audit, /rules/sources (was "Reset
                                filters"). */}
                            <Trans>Clear filters</Trans>
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
            {/* Active-filter chips — one removable chip per applied facet,
                rendered inline under the toolbar (Pencil `AzLvC`). Each reads
                from the same URL params the sheet writes; the ✕ emits the
                canonical clear patch. Hidden in the panel-open split (the
                narrow toolbar there has no room) and when nothing is set. */}
            {panelOpenIntent ? null : (
              <ObligationActiveFilterChips
                due={due}
                thisWeekFilterActive={thisWeekFilterActive}
                evidence={evidence}
                awaitingSignature={awaitingSignature}
                assigneeName={assignee}
                owner={owner}
                ruleSelected={ruleQuery}
                dueWithin={dueWithin}
                projected={projected}
                taxTypeSelected={taxTypeQuery}
                taxTypeOptions={taxTypeOptions}
                clientSelected={clientQuery}
                clientOptions={clientOptions}
                stateSelected={stateQuery}
                stateOptions={stateOptions}
                assigneeSelected={assigneeQuery}
                assigneeOptions={assigneeOptions}
                countySelected={countyQuery}
                countyOptions={countyOptions}
                onPatch={(patch) => void setObligationQueueQuery(patch)}
                onClearAll={resetObligationQueue}
              />
            )}
          </div>

          {selectedIds.length > 0 ? (
            /*
             * Floating bulk-action toolbar.
             *
             * Uses the shared `<FloatingActionBar>` primitive on the elevated
             * dark tone — a white pill would read as page chrome, not as a
             * distinct selection-mode surface, so darkening the fill makes the
             * "you are now in batch mode" signal unmistakable.
             *
             * Action layout:
             *   • Primary (always inline): Assign owner, Set status,
             *     Confirm projected (lifted to accent when in the
             *     Projected lens).
             *   • Secondary (collapsed under "More"): Snooze (coming
             *     soon), Export selected, Remind to sign, Decide
             *     extension. Collapsing them keeps the bar to 5 buttons +
             *     counter + clear so it stays within the queue's optical
             *     center.
             *   • Trailing: Clear selection, separated by a divider.
             *
             * Fixed at `bottom-12` (48px from viewport bottom, baked into the
             * primitive) rather than a sticky bar inside the queue column — a
             * sticky bar reflowed the table downward 50px the moment a row was
             * checked, breaking the reading flow ("where did my row go?").
             */
            <FloatingActionBar
              ariaLabel={t`Bulk actions`}
              tone="elevated"
              // The default position centers on the viewport, but the
              // persistent sidebar (220px / 13.75rem) pushes the queue panel's
              // optical center ~110px right of the viewport center.
              // `md:!left-[calc(50%+6.875rem)]` restores center alignment over
              // the queue at md+ widths; at narrow viewports the sidebar
              // collapses to an off-canvas drawer, so the bar falls back to the
              // viewport-centered default.
              className="md:!left-[calc(50%+6.875rem)]"
            >
              {/* The COUNT leads in semibold tabular-nums with the "deadlines
                  selected" label dropped to 70% so the eye lands on the number
                  first ("28 · deadlines selected") and the bar has an anchor. */}
              <span className="flex items-baseline gap-1.5 whitespace-nowrap pl-1 text-xs">
                <span className="font-semibold tabular-nums">{selectedIds.length}</span>
                <span className="text-text-inverted/70">
                  <Plural
                    value={selectedIds.length}
                    one="deadline selected"
                    other="deadlines selected"
                  />
                </span>
              </span>
              <Separator orientation="vertical" className="mx-0.5 h-4" />
              {/* Every action leads with an icon so the bar scans as one
                  consistent control row (no mixed icon/no-icon cluster). */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="sm">
                      <UserRoundIcon data-icon="inline-start" />
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
                  disabled={!canUpdateObligationStatus}
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canUpdateObligationStatus}
                      title={
                        canUpdateObligationStatus
                          ? undefined
                          : t`Status changes require owner, partner, manager, or preparer access.`
                      }
                    >
                      <CircleIcon data-icon="inline-start" />
                      <Trans>Set status</Trans>
                      <ChevronDownIcon data-icon="inline-end" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start">
                  {statusDropdownOptions.map((status) =>
                    status === 'extended' ? (
                      <DropdownMenuItem
                        key={status}
                        disabled={bulkStatusMutation.isPending}
                        onClick={() => {
                          setExtendedMemo('')
                          setExtendedMemoOpen(true)
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <StatusMark
                            status={status}
                            className={cn('size-4 shrink-0', STATUS_ICON_COLOR[status])}
                          />
                          {statusLabels[status]}
                        </span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        key={status}
                        disabled={bulkStatusMutation.isPending}
                        onClick={() => changeSelectedStatus(status)}
                      >
                        <span className="flex items-center gap-2">
                          <StatusMark
                            status={status}
                            className={cn('size-4 shrink-0', STATUS_ICON_COLOR[status])}
                          />
                          {statusLabels[status]}
                        </span>
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Confirm projected stays inline because it's the primary
                  action in the Projected lens (lifted to accent). */}
              <Button
                variant={projected ? 'accent' : 'ghost'}
                size="sm"
                disabled={!canUpdateObligationStatus || confirmObligationsMutation.isPending}
                title={
                  canUpdateObligationStatus
                    ? t`Confirm projected deadlines so they enter the reminder pipeline`
                    : t`Confirming requires owner, partner, manager, or preparer access.`
                }
                onClick={confirmSelectedProjected}
              >
                <CircleCheckIcon data-icon="inline-start" />
                <Trans>Confirm projected</Trans>
              </Button>
              {/* Secondary actions collapse under a single "More" overflow
                  menu so the bar reads as ~5 affordances instead of 8. Order
                  is Export → Remind to sign → Decide extension. */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="sm" aria-label={t`More bulk actions`}>
                      <Trans>More</Trans>
                      <ChevronDownIcon data-icon="inline-end" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => openExportDialog('selected')}>
                    <ArrowUpRightIcon className="mr-2 size-4" aria-hidden />
                    <Trans>Export selected</Trans>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canUpdateObligationStatus || bulkRemindSignatureMutation.isPending}
                    title={
                      canUpdateObligationStatus
                        ? t`Email selected clients a Form 8879 signature reminder`
                        : t`Requires status-update access`
                    }
                    onClick={() => setRemindToSignConfirmOpen(true)}
                  >
                    <SendIcon className="mr-2 size-4" aria-hidden />
                    <Trans>Remind to sign</Trans>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canUpdateObligationStatus || bulkDecideExtensionMutation.isPending}
                    title={
                      canUpdateObligationStatus
                        ? t`Apply an internal extension plan to the selected deadlines`
                        : t`Requires status-update access`
                    }
                    onClick={() => setBulkExtensionOpen(true)}
                  >
                    <CalendarClockIcon className="mr-2 size-4" aria-hidden />
                    <Trans>Decide extension</Trans>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            // Skeleton rows match the rest of the app's loading rhythm;
            // role=status + aria-live for SR announce. Table-shaped skeleton —
            // a header row + column-spaced body rows + trailing status pill — so
            // the loading state mirrors the real deadlines table instead of
            // generic bars. Responsive: a flex spacer absorbs the slack and
            // fixed cells shrink-0 so the shape holds across widths.
            <div
              role="status"
              aria-live="polite"
              aria-label={t`Loading deadlines`}
              className="overflow-hidden rounded-lg border border-divider-subtle bg-background-default"
            >
              <div className="flex items-center gap-4 border-b border-divider-subtle px-4 py-3">
                <Skeleton className="size-4 shrink-0 rounded" />
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-12 shrink-0" />
                <Skeleton className="h-3.5 w-24 shrink-0" />
                <Skeleton className="h-3.5 w-20 shrink-0" />
                <div className="flex-1" />
                <Skeleton className="h-3.5 w-16 shrink-0" />
              </div>
              {Array.from({ length: 8 }, (_, i) => `deadlines-skel-${i}`).map((key) => (
                <div
                  key={key}
                  className="flex items-center gap-4 border-b border-divider-subtle px-4 py-3.5 last:border-b-0"
                >
                  <Skeleton className="size-4 shrink-0 rounded" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-12 shrink-0" />
                  <Skeleton className="h-4 w-24 shrink-0" />
                  <Skeleton className="h-4 w-20 shrink-0" />
                  <div className="flex-1" />
                  <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          ) : isError ? (
            // Step 6 cont Q1.2: Alert primitive + Button-link retry
            // with `disabled={isFetching}` so double-clicks don't
            // double-fire.
            <Alert variant="destructive">
              <AlertTitle>
                <Trans>Couldn't load deadlines.</Trans>
              </AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                <Trans>Try again in a moment.</Trans>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => void listQuery.refetch()}
                  disabled={listQuery.isFetching}
                >
                  <Trans>Retry</Trans>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            // Table + Pagination wrapped in a single bordered card
            // (`tableCardRef`). The card:
            //   • Owns the rounded-lg border (Table + Pagination both
            //     drop their own corner radii + borders; the wrapper
            //     clips them via overflow-hidden so the rounded
            //     corners just work).
            //   • Is `flex-1 min-h-0` inside the queue column so it
            //     fills the remaining vertical space below the filter
            //     bars. THIS is the height the `useResponsivePageSize`
            //     hook measures, so the page-size math reflects the
            //     actual rows-fit area.
            //   • `overflow-hidden` is safe because no descendant uses
            //     position: sticky — the pagination is a normal block
            //     at the bottom of the card, flush against the
            //     rounded-b corner.
            // Card height = TableHeader + (rows × ROW_HEIGHT) + Pagination,
            // with the responsive hook choosing the row count so it fits.
            <div
              ref={setTableCardElement}
              className={cn(
                // Canonical workbench-table card frame (table-canonical-style.md),
                // shared with /today + /alerts + /clients + /rules/library:
                // `rounded-xl border border-divider-regular bg-default`. The
                // frame applies in BOTH modes. `overflow-hidden` is gated to
                // panel-open only — in full-page it would scope the page-level
                // sticky column header to this card; without it the header still
                // pins to the page. `flex-1` (fill height) is also panel-only, so
                // the full-page card sizes to content and never leaves a tall
                // empty bordered rectangle on short result sets.
                'flex flex-col rounded-xl border border-divider-regular bg-background-default',
                // Corner clipping. Full-page mode uses `overflow-clip`: it clips
                // the gray header's rounded top corners to the card's border
                // WITHOUT establishing a scroll container, so the page-level
                // sticky column header still pins to the page scroll (plain
                // `overflow-hidden` would scope the sticky to this card). Panel-
                // open keeps `overflow-hidden` because the inner div is the real
                // scroll container there and the card just needs to clip + cap
                // its flex child's height.
                panelOpenIntent ? 'min-h-0 flex-1 overflow-hidden' : 'overflow-clip',
              )}
            >
              {/* Flex-1 rows-area so the Table elastically fills the card:
                  when the page has fewer rows than fit the viewport, the empty
                  space below the last row pushes the pagination footer to the
                  bottom of the card. This inner wrapper carries no bg of its
                  own — the alpha-white surface lives on the OUTER card wrapper
                  (one bg for the whole card), so the thead's solid gray stacks
                  on top, body inherits, and the empty area + pagination footer
                  read as one surface. A bg here would show a 4-6px white sliver
                  at the rounded top corners before the thead's gray took
                  over. */}
              <div
                ref={scrollContainerRef}
                // The inner scroll (overflow-y-auto + flex-1 height cap) only
                // applies in the panel-open split; with the panel closed the
                // table grows to its natural height and the page scrolls as one.
                className={cn('flex flex-col', panelOpenIntent && 'min-h-0 flex-1 overflow-y-auto')}
              >
                {/* Cells use the canonical px-3 padding so /deadlines reads as
                    one family with /today's ActionsTable. `whitespace-normal` +
                    `break-words` because /deadlines columns carry longer
                    multi-word content (client name, why-now) that benefits from
                    wrapping. Body cells render at 13px (`[&_td]:text-base`),
                    matching /today's ActionsTable + /alerts' AlertCard body
                    text. The interactive header triggers (sortable +
                    faceted-filter buttons) reset text-transform/size, so the
                    canonical header typography
                    (11px/semibold/uppercase/tracking/tertiary) is forced back
                    onto them with `!important` so the whole row matches the
                    Today / Alerts tables; hover/active color still wins via its
                    own selector. The header band's bg lives on the <th> cells
                    (not the <thead>); the card's `overflow-clip` (full-page) /
                    `overflow-hidden` (panel) clips the gray header to the
                    wrapper's rounded top corners, so the <th>s carry NO corner
                    radius of their own — a manually-rounded th nested inside the
                    card's 1px border produced a doubled/misaligned corner (the
                    th's 12px arc vs the border's 11px inner arc left a hairline
                    sliver at the top-left checkbox cell). */}
                <Table className="table-fixed rounded-none border-0 [&_thead]:bg-transparent [&_th]:bg-background-section [&_thead_th]:h-9 [&_thead_th]:py-0 [&_th]:!whitespace-normal [&_th]:px-3 [&_th_button]:!text-column-label [&_th_button]:!font-semibold [&_th_button]:!uppercase [&_td]:!whitespace-normal [&_td]:px-3 [&_td]:!align-middle [&_td]:break-words [&_td]:text-base">
                  {/* Header (select-all + sort/filter controls) pins so column
                      labels stay visible as the buffer scrolls. In the
                      panel-open split it sticks to top-0 of its own scroll
                      container; in full-page mode it sticks just below the
                      page-pinned filter bar, offset by its measured height.
                      `bg-background-section` on the canonical TableHeader keeps
                      the sticky row opaque over scrolling content. */}
                  <TableHeader
                    className={cn('sticky z-10', panelOpenIntent && 'top-0')}
                    style={panelOpenIntent ? undefined : { top: filterBarHeight }}
                  >
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          const meta = header.column.columnDef.meta
                          return (
                            <TableHead
                              key={header.id}
                              // No route-local sentence-case header override —
                              // the column labels match the canonical TableHead
                              // treatment used by the Today / Alerts tables
                              // (11px semibold uppercase tertiary eyebrow,
                              // left-aligned).
                              className={cn(meta?.headerClassName)}
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
                  {/* TableBody inherits the canonical primitive defaults the
                      same way /today's ActionsTable does, so the two queues
                      share one density + hover vocabulary. Keeps
                      `[&_tr]:even:bg-transparent` — the client-cluster welding
                      (border-b-0 within a same-client group + continuous left
                      rail) requires same-tone bg across cluster rows. Zebra
                      striping by DOM position would tint cluster members
                      differently and break the weld visual; /today has no
                      clusters so it ships zebra striping ON, /deadlines opts
                      out for cluster compatibility. */}
                  <TableBody className="[&_tr]:even:bg-transparent">
                    {tableRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleColumnCount} className="py-8">
                          <ObligationQueueEmptyState
                            onOpenWizard={openWizard}
                            canRunMigration={canRunMigration}
                            // 2026-06-16 (audit): reuse the canonical
                            // `queueFiltersActive` predicate instead of a partial
                            // inline copy that omitted projected / rule / obligation
                            // — those filters could yield zero rows yet wrongly show
                            // the "import deadlines" empty state instead of "no
                            // matches · clear filters".
                            hasActiveFilters={queueFiltersActive}
                            onClearFilters={resetObligationQueue}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableRows.map((tableRow) => {
                        // Section headers render when
                        // `group === 'client' || group === 'filing'`; due-date
                        // mode is a flat list (the map is empty in that mode —
                        // see groupHeadersByFirstRowId above).
                        const groupHeader = groupHeadersByFirstRowId.get(tableRow.original.id)
                        // Collapse Set is keyed by groupKey.
                        const rowGroupKey =
                          group === 'urgency'
                            ? urgencyBandOf(tableRow.original)
                            : group === 'filing'
                              ? formatTaxCode(tableRow.original.taxType)
                              : tableRow.original.clientId
                        const headerCollapsed = groupHeader
                          ? collapsedQueueGroups.has(groupHeader.groupKey)
                          : false
                        // Hidden-row logic. Client mode uses continuation
                        // rows; Filing mode hides every non-header row in
                        // the collapsed filing cluster.
                        const isHiddenContinuation =
                          group === 'filing' || group === 'urgency'
                            ? !groupHeader && collapsedQueueGroups.has(rowGroupKey)
                            : continuationRowIds.has(tableRow.original.id) &&
                              collapsedQueueGroups.has(rowGroupKey)
                        if (isHiddenContinuation) return null
                        const suppressLeafRow = groupHeader && headerCollapsed
                        // The group header TableRow below inherits canonical
                        // TableRow chrome; `bg-background-subtle` is kept
                        // because the group header is a quieter inset surface
                        // than the canonical body.
                        return (
                          <Fragment key={tableRow.id}>
                            {groupHeader ? (
                              // Group header surface + px-5 py-2 padding match
                              // the canonical subgroup divider on /today +
                              // /alerts.
                              <TableRow className="bg-background-subtle">
                                {/* The chevron lives in a w-10 slot matching the
                                    leading select column, and the tone dot +
                                    label sit behind a pl-3 that matches the Form
                                    cell's padding — so the dot lines up
                                    vertically with the form chips below it
                                    instead of floating at the band's left edge.
                                    Cell padding drops its left inset (pl-0) to
                                    let the slot do the alignment. */}
                                <TableCell
                                  colSpan={visibleColumnCount}
                                  className="py-1.5 pr-5 pl-0"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleQueueGroupCollapse(groupHeader.groupKey)}
                                    aria-expanded={!headerCollapsed}
                                    aria-controls={`group-${groupHeader.groupKey}`}
                                    aria-label={
                                      headerCollapsed
                                        ? t`Expand ${groupHeader.label}`
                                        : t`Collapse ${groupHeader.label}`
                                    }
                                    className="flex w-full cursor-pointer items-center rounded-sm py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                                  >
                                    <span className="flex w-10 shrink-0 items-center justify-center">
                                      <ChevronRightIcon
                                        className={cn(
                                          'size-3.5 shrink-0 text-text-tertiary transition-transform',
                                          !headerCollapsed && 'rotate-90',
                                        )}
                                        aria-hidden
                                      />
                                    </span>
                                    {/* The "N late" signal is plain
                                        destructive-tinted text in the count
                                        cluster (not a filled destructive Badge,
                                        which would read as yet another red badge
                                        like the Payment-late chip in the rows
                                        below). */}
                                    <span className="flex min-w-0 items-center gap-2">
                                      <span
                                        className={cn(
                                          'size-1.5 shrink-0 rounded-full',
                                          groupHeader.kind === 'urgency' &&
                                            groupHeader.groupKey === 'overdue'
                                            ? 'bg-text-destructive'
                                            : groupHeader.kind === 'urgency' &&
                                                groupHeader.groupKey === 'this_week'
                                              ? 'bg-text-warning'
                                              : 'bg-text-tertiary',
                                        )}
                                        aria-hidden
                                      />
                                      {/* Band label conforms to the canonical
                                          eyebrow shared by /today + /alerts —
                                          11px/600/uppercase/tracking-eyebrow-tight/
                                          tertiary. The leading tone dot + count
                                          still carry urgency. */}
                                      <span className="text-column-label text-text-tertiary uppercase">
                                        {groupHeader.label}
                                      </span>
                                      <span className="text-xs tracking-eyebrow-tight text-text-tertiary uppercase tabular-nums">
                                        <Plural
                                          value={groupHeader.count}
                                          one="# deadline"
                                          other="# deadlines"
                                        />
                                      </span>
                                      {(groupHeader.lateCount ?? 0) > 0 ? (
                                        <span
                                          className="text-xs tracking-wide text-text-destructive uppercase tabular-nums"
                                          title={
                                            groupHeader.kind === 'client'
                                              ? t`${groupHeader.lateCount ?? 0} of this client's deadlines are past the internal target`
                                              : groupHeader.kind === 'urgency'
                                                ? t`${groupHeader.lateCount ?? 0} deadlines in this band are past the internal target`
                                                : t`${groupHeader.lateCount ?? 0} of this filing type's deadlines are past the internal target`
                                          }
                                        >
                                          <span aria-hidden>· </span>
                                          <Plural
                                            value={groupHeader.lateCount ?? 0}
                                            one="# late"
                                            other="# late"
                                          />
                                        </span>
                                      ) : null}
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
                                aria-pressed={tableRow.original.id === explicitActiveRowId}
                                aria-label={t`Open deadline for ${tableRow.original.clientName}`}
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
                                  // Explicit fixed row height so rows with an
                                  // avatar (size-8 32px circle) and rows with
                                  // the `?` placeholder picker (also size-8)
                                  // render the SAME height regardless of cell
                                  // content. Without an explicit height the
                                  // table picked up the tallest cell's natural
                                  // height, which varied subtly per row
                                  // (different cell wrapping, different status
                                  // pill heights).
                                  // Row height h-14 (56px) matches /clients and
                                  // /rules/library so all three workbench tables
                                  // share the same row pitch.
                                  // Row hover unified with /today's ActionsTable
                                  // — `hover:!bg-background-subtle`; the `!`
                                  // beats the TableRow primitive's
                                  // `bg-state-base-hover` so the two queues share
                                  // one hover tone, and the active-row accent
                                  // fill still wins where set below.
                                  'h-14 group cursor-pointer border-l-2 border-l-transparent transition-colors hover:!bg-background-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt',
                                  tableRow.original.id === explicitActiveRowId &&
                                    'bg-state-accent-hover-alt',
                                  // Within-group rows lose their bottom border so
                                  // same-client filings weld into a single block.
                                  // The last row of each group keeps the divider,
                                  // making group boundaries scannable.
                                  // Canonical rule: default behavior across
                                  // /clients + /rules/library is the primitive's
                                  // hairline between every row. Welding via
                                  // `border-b-0` is an opt-in for surfaces with
                                  // EXPLICIT logical sub-groups (this deadlines
                                  // client cluster is the only current
                                  // consumer). New table surfaces should NOT add
                                  // weld logic unless they have a real sub-unit
                                  // to express.
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
                                  const indentContinuationCell =
                                    continuationRowIds.has(tableRow.original.id) &&
                                    cell.column.id !== 'select' &&
                                    cell.column.id !== 'clientName'
                                  return (
                                    <TableCell
                                      key={cell.id}
                                      // No explicit `align-middle`
                                      // reinforcement — it's a canonical
                                      // primitive default now, so
                                      // `meta?.cellClassName` only wins if a
                                      // column explicitly sets align-top.
                                      className={cn(
                                        // The queue is always compact, so the
                                        // cell padding is hardcoded rather than
                                        // gated on a density control. Vertical
                                        // cell pad `py-3` matches /today's
                                        // ActionsTableRow `[&_td]:py-3` so the
                                        // two queues read at the same row pitch.
                                        'px-2 py-3',
                                        meta?.cellClassName,
                                        indentContinuationCell && 'pl-4',
                                      )}
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
                    {/* Invisible sentinel row inside the same scroll container
                        the user reads. When it nears the viewport the observer
                        above prefetches the next page, so the buffer grows as
                        the user scrolls. */}
                    {hasNextPage ? (
                      <TableRow
                        ref={loadMoreSentinelRef}
                        aria-hidden
                        className="h-1 border-0 hover:bg-transparent"
                      >
                        <TableCell colSpan={visibleColumnCount} className="!p-0" />
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 0 && hasNextPage ? (
                // Load-more fallback for users whose viewport never
                // scrolls (so the sentinel never fires). Tiny ghost
                // button below the table, no chrome around it.
                <div className="flex shrink-0 justify-center bg-background-default px-2 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 text-xs text-text-secondary"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    <Trans>Load more</Trans>
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
        {/* Right-side detail panel — rendered inline inside the route's
          2-column flex (vs. the legacy floating Sheet). Fixed 600px on
          xl+; full-width stacked below the queue at narrower viewports.
          Only mounts when a row is selected; otherwise the queue gets
          the full page width. */}
        {/* Wrap in AnimatePresence + motion.div so the panel uses the same
            paper-rises enter + dissolve exit motion that /alerts uses. Two
            layered motion divs:
              • Outer: animates the flex slot's width (0 → 600px on xl+,
                or full-width on narrower viewports). Fast (300ms) with
                Apple's swiftOut curve so the column opens cleanly.
              • Inner: animates the panel surface itself (y: '100%' → 0)
                so the paper rises into the open slot — the
                "paper-on-a-desk" gesture per the inset-surface canonical.
            On EXIT the choreography reverses to a quick dissolve: paper
            fades + slot closes simultaneously (no slide-down). */}
        <AnimatePresence initial={false}>
          {activeDetailId ? (
            // The OUTER motion.div is the FLEX SLOT — it owns
            // width: 0 → 60%. Stable key so AnimatePresence
            // doesn't remount on row switch; the queue beside
            // it holds its geometry.
            //
            // Width contract (matches AlertDetailDrawer wrapper
            // in AlertsListPage.tsx L838-867):
            //   • `shrink-0` so the slot's animated width is the
            //     authoritative source, never compressed by the
            //     queue's flex distribution.
            //   • inline style.width comes from motion's `animate`
            //     and lands at exactly 60% of the parent flex row.
            //   • `self-stretch` keeps the column at the row's
            //     stretched height even before content lays out.
            //
            // The INNER motion.div is the PAPER-RISE surface.
            // On initial open it slides up from y:'100%' → 0
            // (paper extrudes from below the slot), matching
            // the alert drawer's "paper printing from the desk" motion.
            // On ROW SWITCH (activeDetailId changes), the inner
            // `<AnimatePresence mode="wait">` swaps the content
            // with a quick fade so the user gets feedback that
            // the panel updated — but the OUTER slot keeps its
            // width, so no table reflow.
            <motion.div
              key="obligation-panel"
              data-slot="obligation-detail-panel"
              initial={{ x: '100%', opacity: 0 }}
              animate={DETAIL_PANEL_OPEN_ANIM}
              exit={DETAIL_PANEL_CLOSE_ANIM}
              // 60/40 split via flex-basis so both columns ALWAYS fill 100%
              // of the available viewport. Drawer gets basis-3/5 (60%), table
              // column has flex-1 so it takes the remaining 40%. AppShell cap
              // dropped in tandem so the available width = full viewport (minus
              // sidebar) at xl+. Below xl the drawer is full width (mobile
              // sheet pattern).
              className="flex min-h-0 self-stretch overflow-hidden w-full xl:flex-1 xl:min-w-0"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={DETAIL_PANEL_INNER_RISE_ANIM}
                exit={DETAIL_PANEL_INNER_FADE_ANIM}
                className="flex h-full w-full min-w-0"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`obligation-panel-content-${activeDetailId}`}
                    initial={{ opacity: 0, x: 6 }}
                    animate={DETAIL_PANEL_CONTENT_ENTER_ANIM}
                    exit={DETAIL_PANEL_CONTENT_EXIT_ANIM}
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
                </AnimatePresence>
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
              <Trans>Pick a scope, format, and recipient.</Trans>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
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
                  <div className="grid gap-2 rounded-lg border border-divider-subtle bg-background-subtle p-2">
                    <div className="grid gap-2 sm:grid-cols-2">
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
                    {/* Explain why the end date is invalid instead of just
                        coloring it red. */}
                    {isValidIsoDate(exportDateStart) &&
                    isValidIsoDate(exportDateEnd) &&
                    diffIsoDateDays(exportDateStart, exportDateEnd) < 0 ? (
                      <p className="text-sm text-text-destructive" role="alert">
                        <Trans>End date must be on or after the start date.</Trans>
                      </p>
                    ) : null}
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
                  // Shared SearchableCombobox primitive — same form-select
                  // visual but with typeahead, keyboard narrowing, and an
                  // empty state when the search returns no match (a flat
                  // radio group forces a scroll-hunt for any practice with
                  // > ~15 clients). State / county are folded into the row
                  // meta so partial typing ("CA", "Marin") still surfaces the
                  // client. Sibling Specific-client axis options stay an
                  // ExportAxisOption radio.
                  <SearchableCombobox
                    id="export-client-combobox"
                    value={exportClientId}
                    onValueChange={setExportClientId}
                    options={exportClientComboboxOptions}
                    placeholder={t`Select client`}
                    searchPlaceholder={t`Search clients…`}
                    ariaLabel={t`Pick a client to export`}
                    emptyState={<Trans>No clients match your search.</Trans>}
                  />
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
              {/* Email-to-self and Email-to-teammate are hidden until the
                  email pipeline lands — a list where 2/3 choices are dead
                  reads as a half-built product, so Download stays as the
                  single live option. Restore the disabled-with-tooltip
                  pattern once the backend mutation ships. */}
              <ExportAxisOption
                selected={exportRecipient === 'download'}
                icon={<DownloadIcon className="size-4" aria-hidden />}
                title={<Trans>Download</Trans>}
                description={<Trans>Creates the file in this browser.</Trans>}
                onSelect={() => setExportRecipient('download')}
              />
            </ExportAxis>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExportModalOpen(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              onClick={submitExport}
              disabled={exportMutation.isPending || !buildExportInput()}
              aria-busy={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <>
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                  <Trans>Exporting…</Trans>
                </>
              ) : (
                <Trans>Export</Trans>
              )}
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
              {/* Clarify that the memo is optional — the user can skip it if
                  they want no audit-trail note. */}
              <Trans>Add an optional memo to record why on the audit trail.</Trans>
            </DialogDescription>
          </DialogHeader>
          {/* Visible label for SR users (placeholder alone disappears on
              type). Field + FieldLabel so label/textarea density matches the
              rest of the dialog forms. */}
          <Field>
            <FieldLabel htmlFor="extended-memo-textarea">
              <Trans>Memo</Trans>
            </FieldLabel>
            <Textarea
              id="extended-memo-textarea"
              placeholder={t`e.g. Filed Form 7004 — client confirmed by phone`}
              value={extendedMemo}
              onChange={(event) => setExtendedMemo(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExtendedMemoOpen(false)}>
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
      {/* P0: editable bulk signature-reminder dialog — same editor as the
          single drawer flow. The Send button is the deliberate fan-out
          action; the dialog shows how many clients will actually be emailed
          and a live preview of how the template resolves per client. */}
      <SignatureReminderDialog
        open={remindToSignConfirmOpen}
        onOpenChange={setRemindToSignConfirmOpen}
        target={{ mode: 'bulk', ids: selectedIds }}
        sending={bulkRemindSignatureMutation.isPending}
        onSend={({ subject, body, excludeIds }) => {
          // "Skip recently reminded" drops those ids before sending.
          const ids = excludeIds?.length
            ? selectedIds.filter((id) => !excludeIds.includes(id))
            : selectedIds
          if (ids.length === 0) {
            setRemindToSignConfirmOpen(false)
            return
          }
          bulkRemindSignatureMutation.mutate(
            { ids, subject, body },
            { onSuccess: () => setRemindToSignConfirmOpen(false) },
          )
        }}
      />
      {/* P1: bulk "Decide extension" dialog — caps the target date at the
          earliest filing deadline in the selection so every eligible row
          passes validation. */}
      <BulkExtensionDialog
        open={bulkExtensionOpen}
        onOpenChange={setBulkExtensionOpen}
        ids={selectedIds}
        sending={bulkDecideExtensionMutation.isPending}
        onSend={(payload) => {
          bulkDecideExtensionMutation.mutate(
            { ids: selectedIds, ...payload },
            { onSuccess: () => setBulkExtensionOpen(false) },
          )
        }}
      />
    </div>
  )
}

function ExportAxis({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 md:grid-cols-[96px_minmax(0,1fr)] md:items-start">
      <CapsFieldLabel as="div" className="pt-2">
        {label}
      </CapsFieldLabel>
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
        'flex min-h-12 w-full cursor-pointer items-start gap-2 rounded-lg border border-divider-regular bg-background-default px-3 py-2 text-left outline-none transition-colors',
        'hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2 focus-visible:ring-offset-background-default',
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
        {selected ? <CircleCheckIcon className="size-3" /> : icon}
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

  // Sort indicator shape:
  //   - Header label + chevron are ONE clickable region (the sort pill,
  //     not a separate icon button).
  //   - The range filter trigger stays a sibling icon button. Keeping
  //     sort and filter as siblings avoids invalid nested button
  //     markup when this header renders inside a dropdown trigger.
  //   - Unsorted columns render a faint ChevronsUpDownIcon so the
  //     "this is sortable" affordance is always visible. The faint icon
  //     sits at `text-text-tertiary/40` so it disappears against busy
  //     content but resolves into a "click me to sort" hint on scan.
  //   - Sorted columns render a small ChevronUpIcon / ChevronDownIcon inline in
  //     the accent color — quieter than bold arrows and matches the
  //     chevron vocabulary used elsewhere (dropdowns, breadcrumbs,
  //     drawer triggers).
  const SortIcon =
    direction === 'asc' ? ChevronUpIcon : direction === 'desc' ? ChevronDownIcon : null

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
          'inline-flex min-w-0 cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 text-left',
          // Sortable button matches the TableHead canonical, so sortable and
          // non-sortable headers are indistinguishable in weight (no
          // uppercase/tracking caption treatment).
          'text-sm font-medium normal-case tracking-normal',
          // The sortable label matches the plain-header tertiary at rest and
          // only nudges one tier to text-secondary on hover/active — the
          // accent-coloured sort chevron is the real "this column is sorted"
          // signal, so the label no longer needs to shout.
          'text-text-tertiary hover:text-text-secondary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        )}
      >
        <span className="truncate">{label}</span>
        {SortIcon ? (
          // 2026-06-10 (Yuqi "为什么是蓝色的"): the active-sort chevron reads
          // neutral, not accent-blue — its presence + direction is the signal.
          <SortIcon className="size-3 shrink-0 text-text-secondary" aria-hidden />
        ) : (
          <ChevronsUpDownIcon
            className="size-3 shrink-0 text-text-tertiary/40 transition-colors group-hover:text-text-tertiary"
            aria-hidden
          />
        )}
      </button>
      {children}
    </span>
  )
}

// The dashed-outline `?` in the Owner column is a real DropdownMenu
// trigger. Selecting a teammate calls `clients.bulkUpdateAssignee` with
// a single-id payload — the assignment lives on the CLIENT (not the
// obligation) per the current schema, so picking a teammate on one row
// assigns ALL of that client's deadlines to them. The footer copy spells
// that out so the scope isn't a surprise.
//
// Pattern matches the ClientFactsWorkspace H1 owner-pill picker
// (same member list, same radio-group, same stale-assignee
// handling). Kept local to obligations.tsx since the trigger
// chrome (dashed `?`) is specific to this surface.
function AssigneeQuickPicker({
  clientName,
  currentAssigneeId,
  currentUserName,
  assignableMembers,
  disabled,
  onChange,
}: {
  clientName: string
  currentAssigneeId: string | null
  currentUserName: string | null
  assignableMembers: readonly MemberAssigneeOption[]
  disabled: boolean
  onChange: (assigneeId: string | null) => void
}) {
  const { t } = useLingui()
  const triggerLabel = t`Assign owner for ${clientName}`
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={triggerLabel}
            title={triggerLabel}
            disabled={disabled}
            // stopPropagation prevents the row's onClick from
            // also firing (which would open the obligation
            // drawer behind the picker — confusing UX).
            onClick={(event) => event.stopPropagation()}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-divider-regular text-sm text-text-tertiary outline-none transition-colors hover:border-divider-deep hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50"
          >
            ?
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuRadioGroup
          value={currentAssigneeId ?? '__unassigned__'}
          onValueChange={(value) => {
            const next = value === '__unassigned__' ? null : value
            if (next === currentAssigneeId) return
            onChange(next)
          }}
        >
          {/* The DropdownMenuLabel must live INSIDE the RadioGroup: Base UI's
              MenuPrimitive.GroupLabel calls useMenuGroupRootContext() and
              throws when there is no <Menu.Group> / <Menu.RadioGroup>
              ancestor. Placing it inside gives it the context it needs and
              preserves the "Assign owner" header. */}
          <DropdownMenuLabel className="text-caption-xs uppercase tracking-wide text-text-tertiary">
            <Trans>Assign owner</Trans>
          </DropdownMenuLabel>
          <DropdownMenuRadioItem value="__unassigned__">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-background-subtle text-text-tertiary">
              <UserRoundIcon className="size-3" aria-hidden />
            </span>
            <span>
              <Trans>Unassigned</Trans>
            </span>
          </DropdownMenuRadioItem>
          {assignableMembers.map((member) => {
            const isCurrentUser =
              currentUserName !== null &&
              member.name.trim().toLowerCase() === currentUserName.toLowerCase()
            return (
              <DropdownMenuRadioItem key={member.assigneeId} value={member.assigneeId}>
                <AssigneeAvatar
                  name={member.name}
                  title={member.name}
                  size="xs"
                  isMine={isCurrentUser}
                />
                <span className="truncate">{member.name}</span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
        {assignableMembers.length === 0 ? (
          <DropdownMenuItem
            disabled
            title={t`Invite teammates from Settings → Members to assign work`}
          >
            <span className="text-text-tertiary">
              <Trans>No teammates yet — invite from Settings</Trans>
            </span>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        {/* Scope-disclosure footer. Without this the picker reads
            as "assign this row" — but the schema only carries
            assignment at the client level, so assigning here
            propagates to every deadline for {clientName}. */}
        <div className="px-2 py-1.5 text-caption-xs leading-snug text-text-tertiary">
          <Trans>Assigns every deadline for {clientName}.</Trans>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Terminal-state rows shouldn't surface lateness as live debt. Once a row
// is `done` ("Filed"), `paid` ("Filed" on payment-track rows), or
// `completed`, the row is closed — "18 days late" alongside a "Filed" /
// "Completed" pill reads as if there's still work to do. We render a muted
// internal-due stat ("N days late" / "N days early") instead — quality
// signal, not active red. Mirrors the same three statuses that
// `features/obligations/status-control.tsx` displays as "Filed" /
// "Completed".
//
// `extended` stays out of this terminal set. The Extension tab saves an
// internal target and the detail strip still shows that target as active
// date context, so the queue cell must not collapse to an em dash just
// because the row has an extension plan.
const DUE_DAYS_TERMINAL_STATUSES: ReadonlySet<ObligationStatus> = new Set([
  'done',
  'paid',
  'completed',
  'not_applicable',
])

export function isDueDaysSuppressedForStatus(status: ObligationStatus): boolean {
  return DUE_DAYS_TERMINAL_STATUSES.has(status)
}

export function effectiveInternalDueDate(
  row: Pick<ObligationQueueRow, 'currentDueDate' | 'extensionInternalTargetDate'>,
): string {
  return row.extensionInternalTargetDate ?? row.currentDueDate
}

export function daysUntilEffectiveInternalDueDate(
  row: Pick<ObligationQueueRow, 'currentDueDate' | 'daysUntilDue' | 'extensionInternalTargetDate'>,
  today = todayIsoDate(),
): number {
  const internalDueDate = effectiveInternalDueDate(row)
  if (internalDueDate === row.currentDueDate) return row.daysUntilDue
  const ms = new Date(internalDueDate).getTime() - new Date(today).getTime()
  return Math.round(ms / DAY_MS)
}

// Urgency buckets are derived from the INTERNAL (effective) due date so
// they honor extension target dates exactly like the Internal-due cell pill.
// `urgency` is no longer a Group-by option; keep this helper scoped to due-date
// urgency semantics. Thresholds match the toolbar chip semantics: Past due =
// days < 0, Due this week = 0..7.
export type UrgencyBand = 'overdue' | 'this_week' | 'upcoming'
export const URGENCY_BAND_ORDER = ['overdue', 'this_week', 'upcoming'] as const
export function urgencyBandOf(
  row: Pick<ObligationQueueRow, 'currentDueDate' | 'daysUntilDue' | 'extensionInternalTargetDate'>,
  today = todayIsoDate(),
): UrgencyBand {
  const days = daysUntilEffectiveInternalDueDate(row, today)
  if (days < 0) return 'overdue'
  if (days <= 7) return 'this_week'
  return 'upcoming'
}
function DueDaysPill({ days, status }: { days: number; status: ObligationStatus }) {
  if (isDueDaysSuppressedForStatus(status)) {
    // Quality stat, not active urgency. Skip the dot, drop the
    // urgency tone, render as a muted line. Drop entirely when the
    // row landed exactly on its deadline — no signal there.
    //
    // `not_applicable` is a closed state where lateness/earliness doesn't
    // apply because the obligation never applied. Render a quiet em-dash so
    // the column still reserves its baseline without claiming a filing event.
    if (status === 'not_applicable' || days === 0) {
      // Canonical EmptyCellMark shares the same accessible "No data" label
      // as other empty cells.
      return <EmptyCellMark />
    }
    return (
      // Terminal quality stat — compact "filed Nd late/early" in tertiary tone.
      // 2026-06-16 (audit — "compact everywhere"): this column previously
      // dropped the "filed" prefix on purpose, but that divergence was
      // overridden so every surface reads one vocabulary (DueCountdownText).
      <span className="text-sm text-text-tertiary tabular-nums">
        <DueCountdownText days={days} terminal />
      </span>
    )
  }
  const tone = dueDaysTone(days)
  // The due-days value reads as plain tinted text so it stays a different
  // visual class from the filled Status pill ("In review", "Blocked") in the
  // next column — urgency is carried by the text color (red for very late,
  // amber for soon, neutral for future), which avoids a second filled badge
  // on the same row and reduces the red overload on late+blocked+rejected
  // rows.
  const tintedTextClass =
    tone.dot === 'error'
      ? 'text-text-destructive'
      : tone.dot === 'warning'
        ? 'text-text-warning'
        : 'text-text-primary'
  // No badge pill, dot, Info icon, or flame glyph here — the row already
  // carries the filled Status pill in the next column, and the tinted text
  // color already carries the late-urgency signal. Extra markers were
  // redundant signals on the same axis and added to the row's red overload.
  // Wording from the shared DueCountdownText ("5d late" / "in 5d" / "today").
  // Overdue rows get SIZE, not weight (type-weight-restraint canon: urgency is
  // the one signal allowed to scale up — 14px vs the 12px baseline — while the
  // red tone already carries the alarm; never red+bold). Mirrors the primitives
  // DueDaysPill (dual-live: this local copy drives the main /deadlines table).
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 tabular-nums leading-tight',
        days < 0 ? 'text-base' : 'text-sm',
        tintedTextClass,
      )}
    >
      <DueCountdownText days={days} />
    </span>
  )
}

// `RangeHeaderFilterDropdown` retired. The column-header range filter
// overlapped semantically with the sort handle on the same header AND with
// the toolbar "Past Due" / "Due this week" chips above. If we ever need a
// generic numeric-range column filter again, restore from git history.

// P0: editable email preview shared by the single ("Remind client to sign")
// and bulk ("Remind to sign") flows. The CPA edits a TOKEN template
// ({{client_name}} / {{form}} / {{tax_year}}); the server substitutes it per
// recipient on send, so one edited template still personalizes each email. A
// live preview shows how the current template resolves for one sample client.
type SignatureReminderTarget =
  | { mode: 'single'; obligationId: string | null }
  | { mode: 'bulk'; ids: string[] }

function SignatureReminderDialog({
  open,
  onOpenChange,
  target,
  sending,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: SignatureReminderTarget
  sending: boolean
  onSend: (input: { subject: string; body: string; excludeIds?: string[] }) => void
}) {
  const { t } = useLingui()
  const isBulk = target.mode === 'bulk'
  const singleQuery = useQuery({
    ...orpc.obligations.signatureReminderPreview.queryOptions({
      input: { id: target.mode === 'single' ? (target.obligationId ?? '') : '' },
    }),
    enabled: open && target.mode === 'single' && Boolean(target.obligationId),
  })
  const bulkQuery = useQuery({
    ...orpc.obligations.bulkSignatureReminderPreview.queryOptions({
      input: { ids: target.mode === 'bulk' ? target.ids : [] },
    }),
    enabled: open && target.mode === 'bulk' && target.ids.length > 0,
  })
  const isLoading = isBulk ? bulkQuery.isLoading : singleQuery.isLoading
  const data = isBulk ? bulkQuery.data : singleQuery.data

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [edited, setEdited] = useState(false)
  // Which eligible recipient the bulk preview is paged to (single mode ignores).
  const [previewIndex, setPreviewIndex] = useState(0)
  // P1 throttle: bulk "skip recently reminded" toggle + single two-click
  // "send anyway" confirm when the client was nudged within the window.
  const [skipRecent, setSkipRecent] = useState(false)
  const [confirmResend, setConfirmResend] = useState(false)
  // Seed the editable fields from the server template once it arrives
  // (unless the CPA already started editing this open session).
  useEffect(() => {
    if (open && data && !edited) {
      setSubject(data.subjectTemplate)
      setBody(data.bodyTemplate)
    }
  }, [open, data, edited])
  // Reset on close so the next open re-seeds from a fresh template.
  useEffect(() => {
    if (!open) {
      setSubject('')
      setBody('')
      setEdited(false)
      setPreviewIndex(0)
      setSkipRecent(false)
      setConfirmResend(false)
    }
  }, [open])

  const tokens = data?.tokens ?? []
  // Single returns one recipient; bulk returns every eligible recipient so the
  // CPA can page through them. Clamp the index in case the data shrank.
  const singleSample = singleQuery.data?.sample ?? null
  const bulkSamples = bulkQuery.data?.samples ?? []
  const previewTotal = bulkSamples.length
  const safePreviewIndex = previewTotal > 0 ? Math.min(previewIndex, previewTotal - 1) : 0
  // Live-render the preview against the active sample recipient as the CPA edits.
  const sample = isBulk ? (bulkSamples[safePreviewIndex] ?? null) : singleSample
  const previewSubject = sample ? renderTemplate(subject, sample.vars) : ''
  const previewBody = sample ? renderTemplate(body, sample.vars) : ''

  const recipientEmail = singleQuery.data?.recipientEmail ?? null
  const eligibleCount = bulkQuery.data?.eligibleCount ?? 0
  const hasRecipient = isBulk ? eligibleCount > 0 : Boolean(recipientEmail)
  const canSend = hasRecipient && subject.trim().length > 0 && body.trim().length > 0 && !sending

  // P1 repeat-nudge throttle. Single: warn + require a "send anyway" confirm
  // when this client was reminded within the window. Bulk: count + optionally
  // skip the eligible rows reminded recently. Never hard-blocks the send.
  const throttleMs = SIGNATURE_REMINDER_THROTTLE_DAYS * 86_400_000
  const lastRemindedAt = singleQuery.data?.lastRemindedAt ?? null
  const msSinceReminded = lastRemindedAt ? Date.now() - new Date(lastRemindedAt).getTime() : null
  const recentlyReminded = !isBulk && msSinceReminded !== null && msSinceReminded < throttleMs
  const daysSinceReminded = msSinceReminded !== null ? Math.floor(msSinceReminded / 86_400_000) : 0
  const recentlyRemindedCount = bulkQuery.data?.recentlyRemindedCount ?? 0
  const recentlyRemindedIds = bulkQuery.data?.recentlyRemindedIds ?? []
  const needsResendConfirm = recentlyReminded && !confirmResend

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isBulk ? (
              <Trans>Remind clients to sign Form 8879</Trans>
            ) : (
              <Trans>Remind client to sign Form 8879</Trans>
            )}
          </DialogTitle>
          <DialogDescription>
            {isBulk ? (
              <Trans>
                Edit the email, then send it to the selected clients. Each client gets their own
                details filled in; deadlines not awaiting a signature are skipped.
              </Trans>
            ) : recipientEmail ? (
              <Trans>Review and edit the email, then send it to {recipientEmail}.</Trans>
            ) : (
              <Trans>No email address on file for this client — add one to send a reminder.</Trans>
            )}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-text-tertiary">
            <Trans>Loading preview…</Trans>
          </p>
        ) : (isBulk ? bulkQuery.isError : singleQuery.isError) ? (
          // throwOnError:false → a failed preview would otherwise render with
          // eligibleCount=0 / recipientEmail=null, masquerading as the
          // misleading "No email address on file" body. Surface the failure +
          // Retry instead. Matches this file's list-error Alert pattern.
          <Alert variant="destructive">
            <AlertTitle>
              <Trans>Couldn't load the reminder preview</Trans>
            </AlertTitle>
            <AlertDescription className="flex items-center gap-2">
              {rpcErrorMessage(isBulk ? bulkQuery.error : singleQuery.error) ??
                t`Try again in a moment.`}
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => void (isBulk ? bulkQuery.refetch() : singleQuery.refetch())}
                disabled={isBulk ? bulkQuery.isFetching : singleQuery.isFetching}
              >
                <Trans>Retry</Trans>
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-3">
            {isBulk ? (
              <p className="text-sm text-text-secondary">
                <Trans>
                  Sending to {eligibleCount} clients · {bulkQuery.data?.skippedCount ?? 0} not
                  awaiting signature · {bulkQuery.data?.noEmailCount ?? 0} without an email
                </Trans>
              </p>
            ) : null}
            {/* P1 throttle: bulk skip toggle for recently-reminded clients. */}
            {isBulk && recentlyRemindedCount > 0 ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
                <Checkbox
                  checked={skipRecent}
                  onCheckedChange={(checked) => setSkipRecent(checked)}
                />
                <Plural
                  value={recentlyRemindedCount}
                  one="Skip # client reminded in the last few days"
                  other="Skip # clients reminded in the last few days"
                />
              </label>
            ) : null}
            {/* P1 throttle: single "you just reminded them" warning. */}
            {recentlyReminded ? (
              <p className="rounded-lg bg-background-subtle px-3 py-2 text-sm text-text-secondary">
                <Trans>
                  You reminded this client{' '}
                  <Plural value={daysSinceReminded} _0="today" one="# day ago" other="# days ago" />
                  . Send another?
                </Trans>
              </p>
            ) : null}
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="signature-reminder-subject">
                <Trans>Subject</Trans>
              </FieldLabel>
              <Input
                id="signature-reminder-subject"
                value={subject}
                onChange={(event) => {
                  setSubject(event.target.value)
                  setEdited(true)
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="signature-reminder-body">
                <Trans>Message</Trans>
              </FieldLabel>
              <Textarea
                id="signature-reminder-body"
                rows={9}
                value={body}
                onChange={(event) => {
                  setBody(event.target.value)
                  setEdited(true)
                }}
              />
            </div>
            {tokens.length > 0 ? (
              <p className="text-xs text-text-tertiary">
                <Trans>Placeholders filled in per client:</Trans>{' '}
                {tokens.map((token) => `{{${token}}}`).join(' · ')}
              </p>
            ) : null}
            {sample ? (
              <div className="grid gap-1 rounded-lg bg-background-subtle p-3">
                <div className="flex items-center justify-between gap-2">
                  <CapsFieldLabel as="div">
                    <Trans>Preview for {sample.clientName}</Trans>
                  </CapsFieldLabel>
                  {isBulk && previewTotal > 1 ? (
                    <div
                      className="inline-flex items-center gap-0.5 text-xs text-text-secondary"
                      role="group"
                      aria-label={t`Preview pagination`}
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6"
                        aria-label={t`Previous client`}
                        disabled={safePreviewIndex === 0}
                        onClick={() => setPreviewIndex((index) => Math.max(0, index - 1))}
                      >
                        <ChevronLeftIcon className="size-3.5" aria-hidden />
                      </Button>
                      <span className="min-w-10 px-1 text-center tabular-nums">
                        <Trans>
                          {safePreviewIndex + 1} / {previewTotal}
                        </Trans>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6"
                        aria-label={t`Next client`}
                        disabled={safePreviewIndex + 1 >= previewTotal}
                        onClick={() =>
                          setPreviewIndex((index) => Math.min(previewTotal - 1, index + 1))
                        }
                      >
                        <ChevronRightIcon className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <p className="text-sm font-medium text-text-primary">{previewSubject}</p>
                <p className="text-sm whitespace-pre-wrap text-text-secondary">{previewBody}</p>
              </div>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={!canSend}
            onClick={() => {
              // Single: first click on a recently-reminded client just confirms.
              if (needsResendConfirm) {
                setConfirmResend(true)
                return
              }
              onSend({
                subject: subject.trim(),
                body: body.trim(),
                ...(isBulk && skipRecent ? { excludeIds: recentlyRemindedIds } : {}),
              })
            }}
          >
            {needsResendConfirm ? (
              <Trans>Send anyway</Trans>
            ) : isBulk ? (
              <Trans>Send reminders</Trans>
            ) : (
              <Trans>Send reminder</Trans>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// P1: bulk "Decide extension" dialog. Collects one shared extension plan (memo
// + optional source + optional internal target date) and applies it to every
// eligible selected deadline. The date picker is capped at the earliest filing
// deadline in the selection (from the preview) so any picked date passes the
// server's per-row "target ≤ filing deadline" check for every row.
function BulkExtensionDialog({
  open,
  onOpenChange,
  ids,
  sending,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ids: string[]
  sending: boolean
  onSend: (input: { memo: string; source?: string; internalTargetDate?: string }) => void
}) {
  const { t } = useLingui()
  const query = useQuery({
    ...orpc.obligations.bulkExtensionDecisionPreview.queryOptions({ input: { ids } }),
    enabled: open && ids.length > 0,
  })
  const [memo, setMemo] = useState('')
  const [source, setSource] = useState('')
  const [internalTargetDate, setInternalTargetDate] = useState('')
  // Reset on close so the next open starts clean.
  useEffect(() => {
    if (!open) {
      setMemo('')
      setSource('')
      setInternalTargetDate('')
    }
  }, [open])

  const eligibleCount = query.data?.eligibleCount ?? 0
  const needsManualCount = query.data?.needsManualDeadlineCount ?? 0
  // Rows that can actually be bulk-decided: eligible AND have a computable
  // extended date. Rows lacking a statutory duration are skipped in bulk
  // (they need an individually-entered extended date).
  const applicableCount = Math.max(0, eligibleCount - needsManualCount)
  // Cap the picker at the earliest EXTENDED deadline so any picked date is
  // valid for every applicable row.
  const cap = query.data?.earliestExtendedFilingDeadline ?? ''
  // The picker normally prevents this, but guard if the cap shrank after a
  // re-query while a later date was already chosen.
  const dateInvalid = internalTargetDate !== '' && cap !== '' && internalTargetDate > cap
  // Internal target date is required (mirrors the single extension's
  // canSaveInternalExtensionPlan), alongside a memo.
  const canSend =
    applicableCount > 0 &&
    memo.trim().length > 0 &&
    internalTargetDate !== '' &&
    !dateInvalid &&
    !sending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Trans>Decide extension for selected deadlines</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Apply an internal extension plan to every eligible selected deadline. Each filing
              deadline moves to its statutory extended date; payment stays due on the original date.
              The target date is capped at the earliest extended deadline; deadlines already
              extended are skipped.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <p className="text-sm text-text-tertiary">
            <Trans>Loading preview…</Trans>
          </p>
        ) : query.isError ? (
          // throwOnError:false → a failed preview would otherwise render the
          // all-zeros "Extending 0 deadlines…" body with Send disabled — a
          // dead end. Surface the failure + Retry instead. Matches this file's
          // list-error Alert pattern.
          <Alert variant="destructive">
            <AlertTitle>
              <Trans>Couldn't load the extension preview</Trans>
            </AlertTitle>
            <AlertDescription className="flex items-center gap-2">
              {rpcErrorMessage(query.error) ?? t`Try again in a moment.`}
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
              >
                <Trans>Retry</Trans>
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-text-secondary">
              <Trans>
                Extending {applicableCount} deadlines · {query.data?.alreadyExtendedCount ?? 0}{' '}
                already extended · {query.data?.skippedCount ?? 0} not found
              </Trans>
            </p>
            {needsManualCount > 0 ? (
              <p className="text-xs text-text-tertiary">
                <Plural
                  value={needsManualCount}
                  one="# selected deadline has no fixed extension length — decide it individually."
                  other="# selected deadlines have no fixed extension length — decide them individually."
                />
              </p>
            ) : null}
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="bulk-extension-memo">
                <Trans>Decision memo</Trans>
              </FieldLabel>
              <Textarea
                id="bulk-extension-memo"
                rows={4}
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="bulk-extension-source">
                <Trans>Source (optional)</Trans>
              </FieldLabel>
              <Input
                id="bulk-extension-source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>
                <Trans>Internal target date</Trans>
              </FieldLabel>
              <IsoDatePicker
                value={internalTargetDate}
                invalid={dateInvalid}
                {...(cap ? { maxIsoDate: cap } : {})}
                ariaLabel={t`Internal extension target date`}
                placeholder={t`Internal extension target date`}
                onValueChange={setInternalTargetDate}
              />
              {cap ? (
                <p className="text-xs text-text-tertiary">
                  <Trans>Capped at the earliest extended filing deadline: {cap}</Trans>
                </p>
              ) : null}
              <p className="text-xs text-text-tertiary">
                <Trans>Payment stays due on each deadline&apos;s original date.</Trans>
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={!canSend}
            onClick={() =>
              onSend({
                memo: memo.trim(),
                ...(source.trim() ? { source: source.trim() } : {}),
                ...(internalTargetDate ? { internalTargetDate } : {}),
              })
            }
          >
            <Trans>Decide extensions</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
          {/* Title names the client so it answers "whose penalty am I
              editing?" without a second glance — CPAs working through a list
              of clients in one sitting open this dialog repeatedly. The
              description retains the tax-code suffix so the filing context is
              still legible. */}
          <DialogTitle>
            {row ? (
              <Trans>Penalty inputs for {row.clientName}</Trans>
            ) : (
              <Trans>Penalty inputs</Trans>
            )}
          </DialogTitle>
          <DialogDescription>{row ? formatTaxCode(row.taxType) : null}</DialogDescription>
        </DialogHeader>
        {/* Real <label> elements (placeholder alone disappears on type) plus
            inline helper text describing accepted formats. */}
        <div className="grid gap-3">
          <Field>
            <FieldLabel htmlFor="penalty-tax-due">
              <Trans>Estimated tax due</Trans>
            </FieldLabel>
            <Input
              id="penalty-tax-due"
              inputMode="decimal"
              placeholder={t`e.g. 1,234.56`}
              value={draft.taxDue}
              onChange={(event) =>
                setDraft((current) => ({ ...current, taxDue: event.target.value }))
              }
            />
            <FieldDescription>
              <Trans>Dollars and cents.</Trans>
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="penalty-owner-count">
              <Trans>Owner count</Trans>
            </FieldLabel>
            <Input
              id="penalty-owner-count"
              inputMode="numeric"
              placeholder={t`e.g. 2`}
              value={draft.ownerCount}
              onChange={(event) =>
                setDraft((current) => ({ ...current, ownerCount: event.target.value }))
              }
            />
            <FieldDescription>
              <Trans>Positive whole number.</Trans>
            </FieldDescription>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          {/* Disable save when both inputs are empty — a no-op write polluted
              the audit log. */}
          <Button
            onClick={save}
            disabled={
              mutation.isPending || (draft.taxDue.trim() === '' && draft.ownerCount.trim() === '')
            }
          >
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

// `ObligationQueueScopeTab` was removed when the status scope-tab strip was
// replaced by the toolbar's "All Status" dropdown. Status filtering still
// writes the same `status` URL param from the dropdown.

// `ObligationQueueActionChip` (the pill chrome for the 4 quick-filter chips —
// Past due / Due this week / Needs evidence / Awaiting signature) was removed
// with those chips. Those facets now live as pill sections inside
// `ObligationFiltersPopover` below.

// ── Faceted Filter sheet ────────────────────────────────────────────────
//
// One toolbar button (active-count badge) opens a popover SHEET that matches
// the Pencil "B · Minimal" canon (node `MdCKL`): a header (title + Esc), a
// vertical tab strip of facet dimensions + a Saved-views tab, a searchable
// body (per-facet typeahead checkbox list, so each dimension scales past a
// wall of chips), and a Reset/Apply footer. Selections are STAGED locally and
// only committed to the URL on Apply; Reset clears the stage. The flat-chip
// popover this replaces dumped every form + every client at once and didn't
// scale to a 50-form / 200-client practice.
//
// Param contract is unchanged — Apply emits the same `setObligationQueueQuery`
// patch the old controls used (`taxType` / `client` / `state` / `assignees` /
// `county` arrays, `due`/`daysMax` for the Due window, `evidence`/
// `awaitingSignature` for Condition). The active chips below the toolbar read
// from those same params.

// Multi-select facet dimensions backed by an array URL param + a facets-RPC
// option list. Single-axis facets (Due window, Condition) are handled
// separately because they don't write an array param.
type ObligationFacetKey = 'taxType' | 'client' | 'state' | 'assignees' | 'county'

// The locally STAGED selection while the sheet is open — committed to the URL
// only on Apply. `due` / `evidence` carry the same string-literal unions as
// their URL params so Apply can emit them straight through.
interface ObligationFilterStage {
  due: (typeof DUE_FILTERS)[number] | null
  daysMax: number | null
  evidence: (typeof EVIDENCE_FILTERS)[number] | null
  awaitingSignature: boolean | null
  taxType: string[]
  client: string[]
  state: string[]
  assignees: string[]
  county: string[]
}

// One saved-view preset surfaced inside the sheet's "Saved views" tab. Each
// preset is a thin shortcut that stages the SAME facet fields — no new param
// contract, no fiction.
interface ObligationFilterPreset {
  id: string
  label: string
  description: string
  patch: Partial<ObligationFilterStage>
}

function ObligationFiltersPopover({
  due,
  thisWeekFilterActive,
  daysMax,
  evidence,
  awaitingSignature,
  taxTypeOptions,
  taxTypeSelected,
  clientOptions,
  clientSelected,
  stateOptions,
  stateSelected,
  assigneeOptions,
  assigneeSelected,
  countyOptions,
  countySelected,
  filtersDisabled,
  onPatch,
}: {
  due: (typeof DUE_FILTERS)[number] | null
  thisWeekFilterActive: boolean
  daysMax: number | null
  evidence: (typeof EVIDENCE_FILTERS)[number] | null
  awaitingSignature: boolean | null
  taxTypeOptions: readonly FilterOption[]
  taxTypeSelected: readonly string[]
  clientOptions: readonly FilterOption[]
  clientSelected: readonly string[]
  stateOptions: readonly FilterOption[]
  stateSelected: readonly string[]
  assigneeOptions: readonly FilterOption[]
  assigneeSelected: readonly string[]
  countyOptions: readonly FilterOption[]
  countySelected: readonly string[]
  filtersDisabled: boolean
  // Patch type mirrors the nuqs `setObligationQueueQuery` setter — every
  // param accepts `null` to clear it back to its default (the array facets
  // default to `[]`, so a non-null state type alone wouldn't allow the
  // `[] → null` reset the column-header filters used).
  onPatch: (patch: ObligationQueueQueryPatch) => void
}) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ObligationFacetKey | 'condition' | 'saved'>('taxType')

  // Snapshot the committed URL state into a local stage when the sheet opens,
  // so the user can pick freely and only commit on Apply (or discard on close).
  const committedStage = useMemo<ObligationFilterStage>(
    () => ({
      due,
      daysMax: thisWeekFilterActive ? daysMax : null,
      evidence,
      awaitingSignature,
      taxType: [...taxTypeSelected],
      client: [...clientSelected],
      state: [...stateSelected],
      assignees: [...assigneeSelected],
      county: [...countySelected],
    }),
    [
      due,
      thisWeekFilterActive,
      daysMax,
      evidence,
      awaitingSignature,
      taxTypeSelected,
      clientSelected,
      stateSelected,
      assigneeSelected,
      countySelected,
    ],
  )
  const [stage, setStage] = useState<ObligationFilterStage>(committedStage)
  // Re-seed the stage every time the sheet opens so a discarded edit doesn't
  // leak into the next session.
  useEffect(() => {
    if (open) setStage(committedStage)
  }, [open, committedStage])

  const stageThisWeekActive = stage.due === null && stage.daysMax === THIS_WEEK_MAX_DAYS
  const stageDueActive = stage.due === 'overdue' || stageThisWeekActive
  const facetSelected: Record<ObligationFacetKey, string[]> = {
    taxType: stage.taxType,
    client: stage.client,
    state: stage.state,
    assignees: stage.assignees,
    county: stage.county,
  }
  const facetCounts: Record<ObligationFacetKey, number> = {
    taxType: stage.taxType.length,
    client: stage.client.length,
    state: stage.state.length,
    assignees: stage.assignees.length,
    county: stage.county.length,
  }
  const conditionCount =
    (stageDueActive ? 1 : 0) +
    (stage.evidence === 'needs' ? 1 : 0) +
    (stage.awaitingSignature === true ? 1 : 0)
  const stagedTotal = conditionCount + Object.values(facetCounts).reduce((sum, n) => sum + n, 0)

  // Active-facet count on the TRIGGER reflects COMMITTED state (one per active
  // dimension), so the badge doesn't flicker while the user stages edits.
  const committedDueActive = due === 'overdue' || thisWeekFilterActive
  const committedActiveCount =
    (committedDueActive ? 1 : 0) +
    (evidence === 'needs' ? 1 : 0) +
    (awaitingSignature === true ? 1 : 0) +
    (taxTypeSelected.length > 0 ? 1 : 0) +
    (clientSelected.length > 0 ? 1 : 0) +
    (stateSelected.length > 0 ? 1 : 0) +
    (assigneeSelected.length > 0 ? 1 : 0) +
    (countySelected.length > 0 ? 1 : 0)

  const toggleFacet = (key: ObligationFacetKey, value: string) => {
    setStage((prev) => {
      const current = prev[key]
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [key]: next }
    })
  }

  const emptyStage: ObligationFilterStage = {
    due: null,
    daysMax: null,
    evidence: null,
    awaitingSignature: null,
    taxType: [],
    client: [],
    state: [],
    assignees: [],
    county: [],
  }

  // Apply commits the stage as a single patch. Empty selections clear back to
  // the parser default (`null`), exactly the `[] → null` reset the old
  // column-header filters relied on.
  const apply = () => {
    // Filter-applied analytics: emit the active filter CATEGORY names (non-PII
    // enums), not the selected values.
    const filterTypes: string[] = []
    if (stage.due !== null || stage.daysMax !== null) filterTypes.push('due')
    if (stage.evidence !== null) filterTypes.push('evidence')
    if (stage.awaitingSignature) filterTypes.push('awaiting_signature')
    if (stage.taxType.length > 0) filterTypes.push('filing_type')
    if (stage.client.length > 0) filterTypes.push('client')
    if (stage.state.length > 0) filterTypes.push('jurisdiction')
    if (stage.assignees.length > 0) filterTypes.push('assignee')
    if (stage.county.length > 0) filterTypes.push('county')
    track(ANALYTICS_EVENTS.deadlinesFiltered, { filter_types: filterTypes })
    onPatch({
      due: stage.due,
      // Due-this-week writes daysMax; clear daysMin either way (the only other
      // axis sharing that param). Past-due (`due`) and this-week are mutually
      // exclusive in the UI, mirroring `nextThisWeekFilterPatch`.
      daysMin: null,
      daysMax: stage.daysMax,
      dueWithin: null,
      evidence: stage.evidence,
      awaitingSignature: stage.awaitingSignature,
      taxType: stage.taxType.length > 0 ? stage.taxType : null,
      client: stage.client.length > 0 ? stage.client : null,
      state: stage.state.length > 0 ? stage.state : null,
      assignees: stage.assignees.length > 0 ? stage.assignees : null,
      county: stage.county.length > 0 ? stage.county : null,
      obligation: null,
      row: null,
    })
    setOpen(false)
  }

  // Tab strip — facet dimensions + a Condition lens + a Saved-views tab.
  const facetTabs: {
    key: ObligationFacetKey
    label: string
    options: readonly FilterOption[]
    searchPlaceholder: string
  }[] = [
    {
      key: 'taxType',
      label: t`Form`,
      options: taxTypeOptions,
      searchPlaceholder: t`Search forms…`,
    },
    {
      key: 'client',
      label: t`Client`,
      options: clientOptions,
      searchPlaceholder: t`Search clients…`,
    },
    {
      key: 'state',
      label: t`State`,
      options: stateOptions,
      searchPlaceholder: t`Search states…`,
    },
    {
      key: 'assignees',
      label: t`Assignee`,
      options: assigneeOptions,
      searchPlaceholder: t`Search assignees…`,
    },
    {
      key: 'county',
      label: t`County`,
      options: countyOptions,
      searchPlaceholder: t`Search counties…`,
    },
  ]

  // Presets are thin shortcuts over the same facet params — no fiction, no new
  // contract. The Condition presets reuse the real `evidence` / `awaitingSig`
  // params; the Due preset reuses `due` / `daysMax`.
  const presets: ObligationFilterPreset[] = [
    {
      id: 'overdue',
      label: t`Past due`,
      description: t`Deadlines already past their internal due date`,
      patch: { due: 'overdue', daysMax: null },
    },
    {
      id: 'this-week',
      label: t`Due this week`,
      description: t`Next ${THIS_WEEK_MAX_DAYS} days`,
      patch: { due: null, daysMax: THIS_WEEK_MAX_DAYS },
    },
    {
      id: 'needs-evidence',
      label: t`Needs evidence`,
      description: t`Missing a workpaper or supporting document`,
      patch: { evidence: 'needs' },
    },
    {
      id: 'awaiting-signature',
      label: t`Awaiting signature`,
      description: t`Filed returns still waiting on the client's 8879`,
      patch: { awaitingSignature: true },
    },
  ]

  const activeFacetTab = facetTabs.find((tab) => tab.key === activeTab)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <FilterTrigger
            active={committedActiveCount > 0}
            leadingIcon={SlidersHorizontalIcon}
            {...(committedActiveCount > 0 ? { leadingIconColor: 'text-text-accent' } : {})}
            // When filters are applied the trigger reads as ENGAGED at a
            // glance: accent border + accent-tinted leading icon (the bg tint
            // is the FilterTrigger's own `active` state). The count rides in a
            // filled accent pill rather than the quiet muted-mono `valueLabel`,
            // so "filters are on" is unmistakable from across the toolbar.
            className={cn(
              'font-semibold',
              committedActiveCount > 0 &&
                'border-state-accent-border text-text-accent data-[state=open]:border-state-accent-border',
            )}
            valueLabel={
              committedActiveCount > 0 ? (
                <Badge
                  variant="accent-solid"
                  className="min-w-4 px-1 font-mono text-caption-xs leading-none font-semibold tabular-nums"
                >
                  {committedActiveCount}
                </Badge>
              ) : undefined
            }
            hideChevron
            aria-label={t`Filters`}
          >
            <span>
              <Trans>Filter</Trans>
            </span>
          </FilterTrigger>
        }
      />
      {/* Sheet shell — p-0/gap-0 so the four bands (header · tab strip · body ·
          footer) own their own padding + hairlines, mirroring `MdCKL`. The
          blur-24 outer shadow is the design's allowed floating-popover lift. */}
      <PopoverContent
        align="end"
        className="w-[560px] gap-0 overflow-hidden rounded-xl p-0 shadow-overlay"
      >
        {/* Header — title + staged-count "applied" pill, with an Esc
            affordance (per `M5RWL`: title 13/600 + rounded-full subtle badge,
            mono Esc chip on the right). */}
        <div className="flex items-center justify-between border-b border-divider-subtle px-4 py-3">
          <div className="flex items-center gap-2.5">
            <PopoverTitle className="text-sm font-semibold text-text-primary">
              <Trans>Filters</Trans>
            </PopoverTitle>
            {stagedTotal > 0 ? (
              <Badge variant="secondary" className="text-caption-xs font-medium tabular-nums">
                <Plural value={stagedTotal} one="# applied" other="# applied" />
              </Badge>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex cursor-pointer items-center rounded-sm border border-divider-subtle bg-background-section px-1.5 py-0.5 font-mono text-caption-xs font-medium text-text-secondary outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            aria-label={t`Close filters`}
          >
            Esc
          </button>
        </div>

        {/* Tab strip — facet dimensions + Condition + Saved views. Active tab
            carries the bottom rule + count badge. */}
        <div
          role="tablist"
          aria-label={t`Filter dimensions`}
          // Text-only tabs (icons dropped): seven dimensions + the icon glyphs
          // overflowed the 560px sheet and silently clipped "Saved views". The
          // labels are self-explanatory, so dropping the icons fits the whole
          // row with slack and reads cleaner. `px-1` lands the first tab's label
          // on the header title's 16px inset.
          className="flex items-center gap-0.5 overflow-x-auto border-b border-divider-subtle px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {facetTabs.map((tab) => (
            <ObligationFilterTab
              key={tab.key}
              label={tab.label}
              count={facetCounts[tab.key]}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
          <ObligationFilterTab
            label={t`Condition`}
            count={conditionCount}
            active={activeTab === 'condition'}
            onClick={() => setActiveTab('condition')}
          />
          <ObligationFilterTab
            label={t`Saved views`}
            count={0}
            active={activeTab === 'saved'}
            onClick={() => setActiveTab('saved')}
          />
        </div>

        {/* Body — the active tab's content. Facet tabs render a searchable
            checkbox list; Condition renders single/toggle pills; Saved views
            renders the preset list. */}
        <div className="min-h-[260px]">
          {activeFacetTab ? (
            <ObligationFacetSearchList
              key={activeFacetTab.key}
              options={activeFacetTab.options}
              selected={facetSelected[activeFacetTab.key]}
              disabled={filtersDisabled}
              searchPlaceholder={activeFacetTab.searchPlaceholder}
              emptyLabel={t`No matches`}
              mono={activeFacetTab.key === 'taxType'}
              onToggle={(value) => toggleFacet(activeFacetTab.key, value)}
              onClear={() => setStage((p) => ({ ...p, [activeFacetTab.key]: [] }))}
            />
          ) : activeTab === 'condition' ? (
            <div className="flex flex-col gap-4 p-4">
              {/* Due window — single-select. Past due / Due this week share the
                  date axis, so picking one clears the other. */}
              <div className="flex flex-col gap-1.5">
                <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
                  <Trans>Due window</Trans>
                </CapsFieldLabel>
                <div className="flex flex-wrap gap-1">
                  <ObligationFilterPill
                    active={!stageDueActive}
                    onClick={() => setStage((p) => ({ ...p, due: null, daysMax: null }))}
                  >
                    <Trans>Any</Trans>
                  </ObligationFilterPill>
                  <ObligationFilterPill
                    active={stage.due === 'overdue'}
                    onClick={() =>
                      setStage((p) => ({
                        ...p,
                        due: p.due === 'overdue' ? null : 'overdue',
                        daysMax: null,
                      }))
                    }
                  >
                    <Trans>Past due</Trans>
                  </ObligationFilterPill>
                  <ObligationFilterPill
                    active={stageThisWeekActive}
                    onClick={() =>
                      setStage((p) => ({
                        ...p,
                        due: null,
                        daysMax: stageThisWeekActive ? null : THIS_WEEK_MAX_DAYS,
                      }))
                    }
                  >
                    <Trans>Due this week</Trans>
                  </ObligationFilterPill>
                </div>
              </div>

              {/* Needs evidence + Awaiting signature — orthogonal toggles. */}
              <div className="flex flex-col gap-1.5">
                <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
                  <Trans>Triage</Trans>
                </CapsFieldLabel>
                <div className="flex flex-wrap gap-1">
                  <ObligationFilterPill
                    active={stage.evidence === 'needs'}
                    onClick={() =>
                      setStage((p) => ({
                        ...p,
                        evidence: p.evidence === 'needs' ? null : 'needs',
                      }))
                    }
                  >
                    <Trans>Needs evidence</Trans>
                  </ObligationFilterPill>
                  <ObligationFilterPill
                    active={stage.awaitingSignature === true}
                    onClick={() =>
                      setStage((p) => ({
                        ...p,
                        awaitingSignature: p.awaitingSignature ? null : true,
                      }))
                    }
                  >
                    <Trans>Awaiting signature</Trans>
                  </ObligationFilterPill>
                </div>
              </div>
            </div>
          ) : (
            // Saved views — preset shortcuts that stage the same facet params.
            // `p-4` + an eyebrow at the section inset matches the Condition tab's
            // rhythm; the preset rows use `-mx-2 px-2` so their hover wash can
            // breathe while the row text still lines up with the eyebrow.
            <div className="flex flex-col gap-1 p-4">
              <CapsFieldLabel as="span" variant="group" className="pb-1 text-text-tertiary">
                <Trans>Presets</Trans>
              </CapsFieldLabel>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setStage((p) => ({ ...p, ...preset.patch }))}
                  className="-mx-2 flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                >
                  <LayersIcon className="mt-0.5 size-3.5 shrink-0 text-text-tertiary" aria-hidden />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-text-primary">{preset.label}</span>
                    <span className="text-caption-xs text-text-tertiary">{preset.description}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer — staged summary + Clear on the left, Cancel / Apply on the
            right (Apply is the clear dark primary with a trailing arrow, per
            `ZAciP`/`IruSl`). Distinct section tint anchors the action band. */}
        <div className="flex items-center justify-between border-t border-divider-subtle bg-background-section px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-caption-xs tabular-nums text-text-tertiary">
              <Plural
                value={stagedTotal}
                _0="No filters staged"
                one="# filter staged"
                other="# filters staged"
              />
            </span>
            {stagedTotal > 0 ? (
              <Button
                variant="ghost"
                size="xs"
                type="button"
                onClick={() => setStage(emptyStage)}
                className="h-auto px-1.5 py-0.5 text-caption-xs"
              >
                <Trans>Reset</Trans>
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button size="sm" onClick={apply}>
              <Trans>Apply</Trans>
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// One tab in the Filter sheet's dimension strip — label + optional count badge,
// with the active tab carrying a 2px bottom rule (per `xrMoD`).
function ObligationFilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      // Per `xrMoD`/`vjMXx`: 13px label + count pill, with the active tab
      // carrying a 2px bottom rule, bold dark label, and an inset negative
      // margin so its rule sits flush on the strip's hairline.
      className={cn(
        '-mb-px inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm outline-none transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset',
        active
          ? 'border-text-primary font-semibold text-text-primary'
          : 'border-transparent font-medium text-text-secondary hover:text-text-primary',
      )}
    >
      <span>{label}</span>
      {count > 0 ? (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-1.5 py-px font-mono text-2xs font-medium tabular-nums',
            active
              ? 'bg-text-primary text-text-inverted'
              : 'bg-background-subtle text-text-secondary',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}

// A searchable checkbox list for one facet dimension — a cmdk `Command`
// typeahead that narrows the option rows + a leading checkbox + a trailing
// per-value count (from the facets RPC). This is what lets each dimension
// scale to many values instead of rendering a flat wall of chips. Reuses the
// same Command primitive the export-client picker / command palette use.
function ObligationFacetSearchList({
  options,
  selected,
  disabled,
  searchPlaceholder,
  emptyLabel,
  mono,
  onToggle,
  onClear,
}: {
  options: readonly FilterOption[]
  selected: readonly string[]
  disabled: boolean
  searchPlaceholder: string
  emptyLabel: string
  mono?: boolean
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const selectedSet = new Set(selected)
  const selectedCount = selectedSet.size
  if (disabled) {
    // Loading — three ghost rows that echo the search box + option-row rhythm.
    return (
      <div className="flex flex-col gap-2.5 p-4">
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="flex flex-col gap-1.5 pt-1">
          <Skeleton className="h-7 w-full rounded-md" />
          <Skeleton className="h-7 w-5/6 rounded-md" />
          <Skeleton className="h-7 w-2/3 rounded-md" />
        </div>
      </div>
    )
  }
  if (options.length === 0) {
    // No options for this dimension at all (vs. the search-narrowed empty,
    // which CommandEmpty handles).
    return (
      <div className="flex flex-col items-center gap-1 px-4 py-12 text-center">
        <SearchIcon className="size-4 text-text-tertiary" aria-hidden />
        <span className="text-sm text-text-tertiary">{emptyLabel}</span>
      </div>
    )
  }
  return (
    <Command className="bg-transparent">
      <CommandInput placeholder={searchPlaceholder} />
      {/* Dimension meta strip — "N selected · M options" + a per-dimension
          Clear (canon's "3 of 24" / "Clear" affordance, `P199zN`). */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-0.5">
        <span className="text-caption-xs tabular-nums text-text-tertiary">
          {selectedCount > 0 ? (
            <Plural
              value={selectedCount}
              one={`# selected · ${options.length} options`}
              other={`# selected · ${options.length} options`}
            />
          ) : (
            <Plural value={options.length} one="# option" other="# options" />
          )}
        </span>
        {selectedCount > 0 ? (
          <Button
            variant="ghost"
            size="xs"
            type="button"
            onClick={onClear}
            className="h-auto px-1.5 py-0.5 text-caption-xs"
          >
            <Trans>Clear</Trans>
          </Button>
        ) : null}
      </div>
      <CommandList className="max-h-[260px]">
        <CommandEmpty>{emptyLabel}</CommandEmpty>
        {options.map((option) => {
          const checked = selectedSet.has(option.value)
          return (
            <CommandItem
              key={option.value}
              value={`${option.label} ${option.value}`}
              onSelect={() => onToggle(option.value)}
              // Selected rows carry a subtle wash (canon `hCgB8`) so the
              // current picks read above the unselected options.
              className={cn(checked && 'bg-background-subtle')}
            >
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded-sm border transition-colors',
                  checked
                    ? 'border-text-primary bg-text-primary text-text-inverted'
                    : 'border-divider-regular group-hover/command-item:border-text-tertiary',
                )}
                aria-hidden
              >
                {checked ? <CheckIcon className="size-3" /> : null}
              </span>
              <span
                className={cn(
                  'truncate',
                  checked ? 'font-medium text-text-primary' : 'text-text-secondary',
                  mono && 'font-mono text-caption-xs',
                )}
              >
                {option.label}
              </span>
              {typeof option.count === 'number' ? (
                <span className="text-caption-xs tabular-nums text-text-tertiary">
                  {option.count}
                </span>
              ) : null}
            </CommandItem>
          )
        })}
      </CommandList>
    </Command>
  )
}

// One selectable pill inside the Filters popover — the canonical
// <ToggleChip> (same chrome as AlertsListPage's `FilterPillSection`).
// Generic across single-select (radio) + toggle usages.
function ObligationFilterPill({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean | undefined
  children: ReactNode
}) {
  return (
    <ToggleChip selected={active} onClick={onClick} disabled={disabled} className="max-w-full">
      <span className="truncate">{children}</span>
    </ToggleChip>
  )
}

// Resolve a facet value to its display label via the option list, falling
// back to the raw value if the facet hasn't loaded yet.
function facetLabelOf(options: readonly FilterOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value
}

// Active-filter chips — one removable chip per applied facet value, rendered
// inline under the toolbar (Pencil `AzLvC`). Each chip carries a dimension
// eyebrow ("Form ·") + the human label, and a ✕ that emits the canonical clear
// patch for just that value. Reads from the same URL params the sheet writes,
// so chips and sheet stay in lock-step. A trailing "Clear all" resets the
// queue. Returns null when nothing is applied.
function ObligationActiveFilterChips({
  due,
  thisWeekFilterActive,
  evidence,
  awaitingSignature,
  assigneeName,
  owner,
  ruleSelected,
  dueWithin,
  projected,
  taxTypeSelected,
  taxTypeOptions,
  clientSelected,
  clientOptions,
  stateSelected,
  stateOptions,
  assigneeSelected,
  assigneeOptions,
  countySelected,
  countyOptions,
  onPatch,
  onClearAll,
}: {
  due: string | null
  thisWeekFilterActive: boolean
  evidence: string | null
  awaitingSignature: boolean | null
  // Deep-link-only params (workload jump links, rule-library cross-links):
  // they filter the table but have no facet UI, so without a chip the user
  // sees 7 rows under a header claiming 28 with no visible cause.
  assigneeName: string | null
  owner: string | null
  ruleSelected: readonly string[]
  dueWithin: number | null
  projected: boolean | null
  taxTypeSelected: readonly string[]
  taxTypeOptions: readonly FilterOption[]
  clientSelected: readonly string[]
  clientOptions: readonly FilterOption[]
  stateSelected: readonly string[]
  stateOptions: readonly FilterOption[]
  assigneeSelected: readonly string[]
  assigneeOptions: readonly FilterOption[]
  countySelected: readonly string[]
  countyOptions: readonly FilterOption[]
  onPatch: (patch: ObligationQueueQueryPatch) => void
  onClearAll: () => void
}) {
  const { t } = useLingui()

  // Remove one value from an array facet, emitting the `[] → null` reset when
  // it was the last selection.
  const removeFacet = (key: ObligationFacetKey, selected: readonly string[], value: string) => {
    const next = selected.filter((v) => v !== value)
    onPatch({ [key]: next.length > 0 ? next : null, obligation: null, row: null })
  }

  type ChipDescriptor = { key: string; dimension: string; label: string; onRemove: () => void }
  const chips: ChipDescriptor[] = []

  if (due === 'overdue') {
    chips.push({
      key: 'due-overdue',
      dimension: t`Due`,
      label: t`Past due`,
      onRemove: () => onPatch({ due: null, daysMin: null, daysMax: null }),
    })
  } else if (thisWeekFilterActive) {
    chips.push({
      key: 'due-week',
      dimension: t`Due`,
      label: t`Due this week`,
      onRemove: () => onPatch({ due: null, daysMin: null, daysMax: null }),
    })
  }
  if (evidence === 'needs') {
    chips.push({
      key: 'evidence',
      dimension: t`Condition`,
      label: t`Needs evidence`,
      onRemove: () => onPatch({ evidence: null }),
    })
  }
  if (awaitingSignature === true) {
    chips.push({
      key: 'awaiting-signature',
      dimension: t`Condition`,
      label: t`Awaiting signature`,
      onRemove: () => onPatch({ awaitingSignature: null }),
    })
  }
  if (assigneeName) {
    chips.push({
      key: 'assignee-name',
      dimension: t`Assignee`,
      label: assigneeName,
      onRemove: () => onPatch({ assignee: null, obligation: null, row: null }),
    })
  }
  if (owner === 'unassigned') {
    chips.push({
      key: 'owner-unassigned',
      dimension: t`Assignee`,
      label: t`Unassigned`,
      onRemove: () => onPatch({ owner: null, obligation: null, row: null }),
    })
  }
  for (const value of ruleSelected) {
    chips.push({
      key: `rule-${value}`,
      dimension: t`Rule`,
      label: value,
      onRemove: () =>
        onPatch({
          rule: ruleSelected.filter((v) => v !== value),
          obligation: null,
          row: null,
        }),
    })
  }
  if (dueWithin && dueWithin > 0) {
    chips.push({
      key: 'due-within',
      dimension: t`Due`,
      label: t`Within ${dueWithin} days`,
      onRemove: () => onPatch({ dueWithin: null }),
    })
  }
  if (projected === true) {
    chips.push({
      key: 'projected',
      dimension: t`Condition`,
      label: t`Projected only`,
      onRemove: () => onPatch({ projected: null }),
    })
  }
  for (const value of taxTypeSelected) {
    chips.push({
      key: `taxType-${value}`,
      dimension: t`Form`,
      label: facetLabelOf(taxTypeOptions, value),
      onRemove: () => removeFacet('taxType', taxTypeSelected, value),
    })
  }
  for (const value of clientSelected) {
    chips.push({
      key: `client-${value}`,
      dimension: t`Client`,
      label: facetLabelOf(clientOptions, value),
      onRemove: () => removeFacet('client', clientSelected, value),
    })
  }
  for (const value of stateSelected) {
    chips.push({
      key: `state-${value}`,
      dimension: t`State`,
      label: facetLabelOf(stateOptions, value),
      onRemove: () => removeFacet('state', stateSelected, value),
    })
  }
  for (const value of assigneeSelected) {
    chips.push({
      key: `assignee-${value}`,
      dimension: t`Assignee`,
      label: facetLabelOf(assigneeOptions, value),
      onRemove: () => removeFacet('assignees', assigneeSelected, value),
    })
  }
  for (const value of countySelected) {
    chips.push({
      key: `county-${value}`,
      dimension: t`County`,
      label: facetLabelOf(countyOptions, value),
      onRemove: () => removeFacet('county', countySelected, value),
    })
  }

  if (chips.length === 0) return null

  return (
    // `w-full` forces the chip row onto its OWN line below the toolbar (the
    // toolbar is `flex flex-wrap`, and the search/filter cluster's `flex-1`
    // basis-0 used to let these chips ride up onto line 1 and get shoved to the
    // far right). Now they read as a clean secondary filter line, left-aligned
    // under the controls. Bottom spacing comes from the toolbar's own `pb-3`.
    <div className="flex w-full flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-divider-subtle bg-background-default py-1 pr-1 pl-2.5 text-caption-xs"
        >
          <span className="text-text-tertiary">{chip.dimension}</span>
          <span className="text-text-muted">·</span>
          <span className="truncate font-medium text-text-primary">{chip.label}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            type="button"
            onClick={chip.onRemove}
            aria-label={t`Remove ${chip.label} filter`}
            className="size-4 shrink-0 rounded-full"
          >
            <XIcon className="size-3" aria-hidden />
          </Button>
        </span>
      ))}
      <TextLink variant="secondary" className="ml-1 font-medium" onClick={onClearAll}>
        <Trans>Clear all</Trans>
      </TextLink>
    </div>
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
// `ObligationBlockerSection` removed — the editor lived inside the Readiness
// tab on every drawer open, even on rows that weren't blocked. The queue row's
// <BlockedByChip> still surfaces the state. A re-home is parked behind the
// design brainstorm; the `updateBlockedBy` RPC procedure stays on the server.

function ObligationQueueEmptyState({
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
    // The genuinely-empty queue owns the surface with the prominent empty
    // state (tinted calendar-clock icon-circle + larger title + wider copy),
    // aligned with /today's Actions-this-week treatment. The CTA stays a quiet
    // outline because Dify Blue is reserved for the one next action per surface
    // (the canvas dark-primary button is intentionally NOT adopted). The
    // filtered case keeps the inline default treatment (data exists, just
    // hidden).
    <EmptyState
      variant={hasActiveFilters ? 'default' : 'prominent'}
      icon={hasActiveFilters ? CalendarDaysIcon : CalendarClockIcon}
      title={
        hasActiveFilters ? (
          <Trans>No deadlines match these filters.</Trans>
        ) : (
          <Trans>No deadlines yet</Trans>
        )
      }
      description={
        hasActiveFilters ? (
          <Trans>
            Try a different filter combination, or clear all filters to see the full queue.
          </Trans>
        ) : (
          <Trans>
            Import your client book or add deadlines manually. We'll generate them automatically
            from the rules you activated.
          </Trans>
        )
      }
      cta={
        hasActiveFilters ? (
          <Button size="sm" variant="outline" onClick={onClearFilters}>
            <Trans>Clear filters</Trans>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onOpenWizard} disabled={!canRunMigration}>
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
  // Regenerate is gated behind an AlertDialog (mirroring the canonical
  // /calendar pattern at `features/calendar/calendar-page.tsx:215-286`)
  // because firing it immediately would silently invalidate the user's iCal
  // subscription on every device that had the old URL — the user should see
  // the consequence before committing.
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false)
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
          className="fixed inset-0 z-40 bg-background-overlay-backdrop"
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
                  onClick={() => setRegenerateConfirmOpen(true)}
                  disabled={regenerateMutation.isPending || !subscription}
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
                aria-busy={upsertMutation.isPending}
              >
                {upsertMutation.isPending ? (
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                ) : null}
                <Trans>Enable subscription</Trans>
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <AlertDialog
        open={regenerateConfirmOpen}
        onOpenChange={(next) => {
          if (!next) setRegenerateConfirmOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Regenerate calendar URL?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                Every device subscribed to the current URL will silently stop syncing. You'll need
                to share the new URL with everyone who had the old one.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <DestructiveChangePreview
            title={<Trans>Regenerating commits these changes</Trans>}
            lines={[
              {
                tone: 'remove',
                label: <Trans>Invalidates</Trans>,
                detail: <Trans>The current URL on every subscribed device</Trans>,
              },
              {
                tone: 'add',
                label: <Trans>Issues</Trans>,
                detail: <Trans>A fresh URL — same scope, same privacy mode</Trans>,
              },
              {
                tone: 'keep',
                label: <Trans>Keeps</Trans>,
                detail: <Trans>The events themselves — nothing scheduled is removed</Trans>,
              },
            ]}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={regenerateMutation.isPending || !subscription}
              onClick={() => {
                if (!subscription) return
                regenerateMutation.mutate(
                  { id: subscription.id },
                  { onSettled: () => setRegenerateConfirmOpen(false) },
                )
              }}
            >
              {regenerateMutation.isPending ? (
                <>
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                  <Trans>Regenerating…</Trans>
                </>
              ) : (
                <Trans>Regenerate URL</Trans>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
