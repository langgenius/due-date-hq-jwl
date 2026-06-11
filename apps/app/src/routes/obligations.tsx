import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  type SVGProps,
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
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  CircleCheck,
  Clock,
  Construction,
  FileCheck,
  Hourglass,
  Loader,
  Loader2,
  MessageSquareText,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  CircleIcon,
  ClipboardListIcon,
  Columns3Icon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileArchiveIcon,
  CalendarClockIcon,
  CheckIcon,
  FileTextIcon,
  PaperclipIcon,
  LinkIcon,
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
  MapPinIcon,
  ClockIcon,
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
  type ObligationFiledRejectionNextStep,
  type AuditEventPublic,
  type ClientReadinessRequestPublic,
  type ReadinessDocumentChecklistItemPublic,
  type ReadinessPreviewRequestEmailOutput,
} from '@duedatehq/contracts'
import { renderTemplate, SIGNATURE_REMINDER_THROTTLE_DAYS } from '@duedatehq/core/email-template'
import { computeExtendedFilingDeadline } from '@duedatehq/core/date-logic'
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
import { Button, buttonVariants } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@duedatehq/ui/components/ui/field'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@duedatehq/ui/components/ui/tabs'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
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
import { FloatingActionBar } from '@/components/patterns/floating-action-bar'
import { PageHeader } from '@/components/patterns/page-header'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import { CountPill } from '@/components/primitives/count-pill'
import { IsoDatePicker, isValidIsoDate } from '@/components/primitives/iso-date-picker'
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
import {
  ALL_STATUSES,
  LIFECYCLE_V2_STATUSES,
  ObligationQueueStatusControl,
  ObligationStatusReadBadge,
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
import { isTabVisibleForType, tabsForObligationType } from '@/features/obligations/obligation-type'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import { isRejectionVisible, RejectionChip } from '@/features/obligations/rejection-chip'
import { useLifecycleV2 } from '@/features/obligations/use-lifecycle-v2'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { BlockerContextCard } from '@/features/obligations/BlockerContextCard'
import { ChecklistItemRow } from '@/features/obligations/ChecklistItemRow'
import { CompletedKeyDates } from '@/features/obligations/CompletedKeyDates'
import { ObligationPanelDispatcher } from '@/features/obligations/ObligationPanelDispatcher'
import { ObligationListRail } from '@/features/obligations/components/ObligationListRail'
import { StageActions, type StageTask } from '@/features/obligations/StageActions'
import { formatTaxCode } from '@/lib/tax-codes'
import { jurisdictionLabel } from '@/features/rules/rules-console-model'
import { SearchInput } from '@/components/primitives/search-input'
import { TaxCodeBadge, TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { queryInputUrlUpdateRateLimit, useDebouncedQueryInput } from '@/lib/query-rate-limit'
import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import {
  cn,
  daysBetween,
  formatCents,
  formatDate,
  formatDatePretty,
  formatDateTimeWithTimezone,
} from '@/lib/utils'

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
const DEADLINE_TIP_REFRESH_POLL_INTERVAL_MS = 3_000
const DEADLINE_TIP_REFRESH_TIMEOUT_MS = 60_000
const EMPTY_OBLIGATION_QUEUE_ROWS: ObligationQueueRow[] = []
const EMPTY_ASSIGNEES: MemberAssigneeOption[] = []
const EMPTY_DOCUMENT_CHECKLIST: ReadinessDocumentChecklistItemPublic[] = []
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

/**
 * Local trigger-shell for the three full-width `<DropdownMenu>` selects
 * used elsewhere in this file (client picker on export dialog, calendar/
 * fiscal-year picker on year config, recipient picker on email-recipient
 * dropdown). Three byte-identical class strings previously lived inline;
 * extracted here as a local helper because the shape isn't shared outside
 * this route (the Layer C4 audit found no broader cluster — every other
 * `bg-background-default` trigger across the app is a Popover wrapper
 * that uses different button content). Local, not a primitive.
 *
 * Use:
 *   <DropdownMenuTrigger render={<DropdownTriggerButton size="default">…</DropdownTriggerButton>} />
 */
function DropdownTriggerButton({
  size = 'default',
  disabled,
  className,
  children,
  ...props
}: {
  size?: 'default' | 'lg'
  disabled?: boolean | undefined
  className?: string
  children: ReactNode
} & Omit<ComponentProps<'button'>, 'children' | 'className' | 'disabled'>) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-divider-regular bg-background-default px-3 text-sm text-text-primary outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:bg-state-base-hover',
        size === 'lg' ? 'h-10 text-left' : 'h-9',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
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
  'estimatedExposureCents',
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
  // Internal due + Status); Official due + Exposure auto-hide alongside the
  // state-cluster columns and come back when the panel closes.
  'filingDueDate',
  'estimatedExposureCents',
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
// read as siblings — same ease-apple curve, same durations as the alert
// drawer. The inner surface rises from y:'100%' → 0 on enter, dissolves
// opacity → 0 on exit.
// Same curve as the app-wide grammar token — aliased so the detail-pane
// choreography ladder below reads in one place (durations are a deliberate
// staggered sequence, documented motion-grammar outlier).
const DETAIL_SWIFT_EASE = EASE_APPLE
// Sizing is CSS-class driven (responsive: full width on narrow, 3/5 at xl+,
// max-capped so ultra-wide doesn't bloat the drawer past usefulness).
// Animation uses x-transform (not width-interpolation) so the slide-in works
// regardless of the final width value.
const DETAIL_PANEL_OPEN_ANIM = {
  x: 0,
  opacity: 1,
  transition: { duration: 0.3, ease: DETAIL_SWIFT_EASE },
} as const
const DETAIL_PANEL_CLOSE_ANIM = {
  x: '100%',
  opacity: 0,
  transition: { duration: 0.28, ease: DETAIL_SWIFT_EASE },
} as const
// Paper-rise enter matches AlertDetailDrawer's inner choreography
// (y:100%→0, 0.64s duration, 0.14s delay) — the surface visibly extrudes
// from below the slot. Exit collapses to opacity-only dissolve (0.22s) so
// the slot closes underneath without a slide-down mirror motion.
const DETAIL_PANEL_INNER_RISE_ANIM = {
  y: 0,
  transition: { duration: 0.64, ease: DETAIL_SWIFT_EASE, delay: 0.14 },
} as const
const DETAIL_PANEL_INNER_FADE_ANIM = {
  opacity: 0,
  transition: { duration: 0.22, ease: DETAIL_SWIFT_EASE },
} as const
// The row-to-row content swap is a quick crossfade (no x-translation, short
// duration) — a SMALL animation. Open/close still uses the bigger width +
// paper-rise animations above.
const DETAIL_PANEL_CONTENT_ENTER_ANIM = {
  opacity: 1,
  transition: { duration: 0.12, ease: DETAIL_SWIFT_EASE },
} as const
const DETAIL_PANEL_CONTENT_EXIT_ANIM = {
  opacity: 0,
  transition: { duration: 0.08, ease: DETAIL_SWIFT_EASE },
} as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STATE_CODE_RE = /^[A-Z]{2}$/
const ReadinessChecklistItemsSchema = ReadinessChecklistItemSchema.array().min(1).max(30)

type DeadlineInputRequestAudit = {
  recipientName: string | null
  recipientRole: string | null
  message: string | null
  createdAt: string
}

type DeadlineInputRequestDraft = {
  obligationId: string
  recipientUserId: string
  message: string
}

function isObligationQueueDetailTab(value: string): value is ObligationQueueDetailTab {
  return ObligationQueueDetailTabSchema.safeParse(value).success
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

type AuthorityRejectionDraft = {
  rejectedAt: string
  authority: string
  reference: string
  reason: string
  nextStep: ObligationFiledRejectionNextStep
}

type AuthorityRejectionAuditDetails = {
  rejectedAt: string | null
  authority: string | null
  reference: string | null
  reason: string | null
  nextStep: ObligationFiledRejectionNextStep | null
}

const AUTHORITY_REJECTION_NEXT_STEPS: ReadonlySet<string> = new Set([
  'correct_resubmit',
  'request_client_input',
  'paper_file',
])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAuthorityRejectionNextStep(value: unknown): value is ObligationFiledRejectionNextStep {
  return typeof value === 'string' && AUTHORITY_REJECTION_NEXT_STEPS.has(value)
}

function cleanOptionalText(value: string): string | undefined {
  const cleaned = value.trim()
  return cleaned ? cleaned : undefined
}

function defaultAuthorityRejectionDraft(row: ObligationQueueRow): AuthorityRejectionDraft {
  return {
    rejectedAt: todayIsoDate(),
    authority: row.authority?.trim() || 'IRS',
    reference: '',
    reason: '',
    nextStep: 'correct_resubmit',
  }
}

function latestAuthorityRejectionAudit(
  auditEvents: readonly AuditEventPublic[],
): AuthorityRejectionAuditDetails | null {
  const event = auditEvents
    .filter((candidate) => candidate.action === 'obligation.efile.rejected')
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (!event) return null

  const after = isPlainObject(event.afterJson) ? event.afterJson : {}
  const rejectedAt = typeof after.efileRejectedAt === 'string' ? after.efileRejectedAt : null
  const authority = typeof after.authority === 'string' && after.authority ? after.authority : null
  const reference = typeof after.reference === 'string' && after.reference ? after.reference : null
  const reason =
    typeof after.reason === 'string' && after.reason
      ? after.reason
      : event.reason && event.reason.trim()
        ? event.reason
        : null
  const nextStep = isAuthorityRejectionNextStep(after.nextStep) ? after.nextStep : null

  return { rejectedAt, authority, reference, reason, nextStep }
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
      estimatedExposureCents: t`Exposure`,
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
        if (r.daysUntilDue < 0 && r.status !== 'done' && r.status !== 'completed') {
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
    [updateStatusMutation, statusLabels, t],
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
      // No "Projected risk" column — the dollar exposure number lives inside
      // the obligation drawer and is summarised at the firm level on the
      // dashboard. A per-row $ in the queue over-quantifies triage decisions
      // that are really driven by status + due date. Penalty inputs and risk
      // filtering still ship via the chip row above.
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
        // EXPOSURE column — the headline estimated-$ exposure with the accrued-
        // penalty figure as a subline (see estimatedExposureCents in
        // packages/contracts/src/obligation-queue.ts). Null exposure → em-dash;
        // coordinators without dollar visibility receive null from the server
        // (hideDollars), so the column reads "—" for them too.
        accessorKey: 'estimatedExposureCents',
        id: 'estimatedExposureCents',
        // Left-aligned (not right-aligned) so every header + cell in the table
        // reads left-aligned and uniform.
        header: () => <span>{t`Exposure`}</span>,
        cell: ({ row: tableRow }) => {
          const exposure = tableRow.original.estimatedExposureCents
          if (exposure === null) {
            return <EmptyCellMark />
          }
          const penalty = tableRow.original.accruedPenaltyCents
          return (
            <div className="flex flex-col items-start leading-tight">
              <span className="text-xs font-medium tabular-nums text-text-primary">
                {formatCents(exposure)}
              </span>
              {penalty !== null && penalty > 0 ? (
                <span className="text-caption-xs tabular-nums text-text-tertiary">
                  {t`≈${formatCents(penalty)} penalty`}
                </span>
              ) : null}
            </div>
          )
        },
        meta: {
          headerClassName: 'w-[88px]',
          cellClassName: 'w-[88px] tabular-nums',
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
                      <Hourglass className="size-3.5" aria-hidden />
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
                    <CheckCircle2Icon className="size-3" aria-hidden />
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
      panelOpenIntent,
      rowsById,
      setObligationQueueQuery,
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
  // Aggregates for the narrative banner. Overdue / due-today counts and total
  // penalty exposure are derived from the loaded glance page; entity count
  // comes from the client facet (full set). These power one editorial sentence
  // + a metric line.
  const deadlinesNarrative = useMemo(() => {
    let overdue = 0
    let dueToday = 0
    let penaltyCents = 0
    for (const r of glanceRows) {
      const terminal =
        r.status === 'done' || r.status === 'completed' || r.status === 'not_applicable'
      const days = daysUntilEffectiveInternalDueDate(r)
      if (!terminal && days < 0) overdue++
      if (!terminal && days === 0) dueToday++
      penaltyCents += r.accruedPenaltyCents ?? 0
    }
    const entities =
      facetsQuery.data?.clients.length ?? new Set(glanceRows.map((r) => r.clientId)).size
    return { overdue, dueToday, penaltyCents, entities }
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
    <div
      className={cn(
        // Page wrapper matches /today + /alerts exactly. `pb-12` / `md:pb-12`
        // matches /today's vertical breathing room at standard viewport
        // heights; the `xl:pb-0` override below keeps the pagination footer
        // flush at tall viewports where the queue fills the screen.
        'mx-auto flex w-full max-w-page-expanded flex-col gap-8 px-4 pt-6 pb-12 md:px-8 md:pt-6 md:pb-12',
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
                    <kbd className="rounded border border-divider-regular bg-background-subtle px-1 font-sans text-caption-xs text-text-tertiary">
                      N
                    </kbd>
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
          <p className="inline-flex items-center gap-2 text-caption font-medium tracking-eyebrow text-text-tertiary uppercase">
            <span
              className="size-1.5 shrink-0 rounded-full bg-state-accent-active-alt"
              aria-hidden
            />
            {bannerDateLabel}
          </p>
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
              <Plural value={scopeTotal} one="# active filing" other="# active filings" />
            </span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              <Plural
                value={deadlinesNarrative.entities}
                one="across # entity"
                other="across # entities"
              />
            </span>
            {deadlinesNarrative.penaltyCents > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums">
                  <Trans>
                    {formatCents(deadlinesNarrative.penaltyCents)} penalty exposure on the line
                  </Trans>
                </span>
              </>
            ) : null}
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
            {/* Horizontal status scope pill-strip — a leading "Status" label +
                a segmented control of All + each present status (colored dot +
                count). Writes the `status` URL param. Scrolls horizontally on
                narrow viewports; hidden in the panel-open split. */}
            {!panelOpenIntent ? (
              <div className="flex min-w-0 shrink items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-background-subtle p-1">
                  <button
                    type="button"
                    data-active={activeScope === 'all'}
                    onClick={() => void setObligationQueueQuery({ status: null })}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt data-[active=true]:bg-background-default data-[active=true]:text-text-accent"
                  >
                    <Trans>All</Trans>
                    <span className="tabular-nums text-text-tertiary">{scopeTotal}</span>
                  </button>
                  {visibleScopeStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      data-active={activeScope === status}
                      onClick={() => void setObligationQueueQuery({ status: [status] })}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt data-[active=true]:bg-background-default data-[active=true]:text-text-primary"
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full bg-current',
                          STATUS_ICON_COLOR[status],
                        )}
                        aria-hidden
                      />
                      <span className="whitespace-nowrap">{statusLabels[status]}</span>
                      <span className="tabular-nums text-text-tertiary">
                        {statusFacetCounts.get(status) ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
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
                placeholder={t`Search client, form, or assignee`}
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
                        {/* Group by submenu. */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <LayersIcon className="size-4" aria-hidden />
                            <span>
                              <Trans>Group by</Trans>
                            </span>
                            <span className="ml-auto text-text-tertiary">
                              {group === 'client' ? (
                                <Trans>Client</Trans>
                              ) : group === 'filing' ? (
                                <Trans>Filing</Trans>
                              ) : group === 'urgency' ? (
                                <Trans>Urgency</Trans>
                              ) : (
                                <Trans>Due date</Trans>
                              )}
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="min-w-[160px]">
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
                              <DropdownMenuRadioItem value="urgency">
                                <Trans>Urgency</Trans>
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="due">
                                <Trans>Due date</Trans>
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="client">
                                <Trans>Client</Trans>
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="filing">
                                <Trans>Filing</Trans>
                              </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
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
                        <DropdownMenuItem
                          onClick={() =>
                            toast.success(t`View saved`, {
                              description: t`Your current columns, grouping, and filters are saved to this view.`,
                            })
                          }
                        >
                          <BookmarkIcon className="size-4" aria-hidden />
                          <span className="flex-1">
                            <Trans>Save current view</Trans>
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!queueFiltersActive}
                          onClick={() => resetObligationQueue()}
                          className="text-text-destructive data-highlighted:text-text-destructive"
                        >
                          <RotateCcwIcon className="size-4" aria-hidden />
                          <span className="flex-1">
                            <Trans>Reset filters</Trans>
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
                        {statusLabels[status]}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        key={status}
                        disabled={bulkStatusMutation.isPending}
                        onClick={() => changeSelectedStatus(status)}
                      >
                        {statusLabels[status]}
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
                <CircleCheck data-icon="inline-start" />
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
                panelOpenIntent && 'min-h-0 flex-1 overflow-hidden',
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
                    (not the <thead>) so its top corners can round
                    (`rounded-t[lr]`) — the gray header reads as the rounded top
                    of a sheet, while the rows below stay frameless. */}
                <Table className="table-fixed rounded-none border-0 [&_thead]:bg-transparent [&_th]:bg-background-section [&_thead_tr_th:first-child]:rounded-tl-xl [&_thead_tr_th:last-child]:rounded-tr-xl [&_thead_th]:h-9 [&_thead_th]:py-0 [&_th]:!whitespace-normal [&_th]:px-3 [&_th_button]:!text-column-label [&_th_button]:!font-semibold [&_th_button]:!uppercase [&_td]:!whitespace-normal [&_td]:px-3 [&_td]:!align-middle [&_td]:break-words [&_td]:text-base">
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
                                  'h-14 group cursor-pointer border-l-2 border-l-transparent hover:!bg-background-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt',
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
                  <Loader2 data-icon="inline-start" className="animate-spin" />
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
      <div className="pt-2 text-xs font-medium tracking-eyebrow text-text-tertiary uppercase">
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
        'flex min-h-12 w-full cursor-pointer items-start gap-2 rounded-lg border border-divider-regular bg-background-default px-3 py-2 text-left outline-none transition-colors',
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

  // Sort indicator shape:
  //   - Header label + chevron are ONE clickable region (the sort pill,
  //     not a separate icon button).
  //   - The range filter trigger stays a sibling icon button. Keeping
  //     sort and filter as siblings avoids invalid nested button
  //     markup when this header renders inside a dropdown trigger.
  //   - Unsorted columns render a faint ChevronsUpDown so the
  //     "this is sortable" affordance is always visible. The faint icon
  //     sits at `text-text-tertiary/40` so it disappears against busy
  //     content but resolves into a "click me to sort" hint on scan.
  //   - Sorted columns render a small ChevronUp / ChevronDown inline in
  //     the accent color — quieter than bold arrows and matches the
  //     chevron vocabulary used elsewhere (dropdowns, breadcrumbs,
  //     drawer triggers).
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
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-divider-regular text-sm text-text-tertiary outline-none transition-colors hover:border-divider-strong hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50"
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
// Stages whose `isPastInternalDue` red ring should be suppressed in the
// milestone timeline. Lateness on a Filed/Completed row is a quality stat,
// not active urgency.
// Keep the Internal due date column framed only as "relative to the
// internal target", not "when the authority filing happened." Hoisted
// from inside `PathToFilingSummary` so we don't allocate the Set every render.
const TIMELINE_TERMINAL_STAGE_KEYS: ReadonlySet<string> = new Set(['done', 'completed'])

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
      // This column compares only against the internal due date. Do not
      // prefix terminal rows with "Filed"; that mixes the status/action
      // vocabulary into a due-date metric.
      <span className="text-sm text-text-tertiary tabular-nums">
        {days < 0 ? (
          <Plural value={Math.abs(days)} one="# day late" other="# days late" />
        ) : (
          <Plural value={days} one="# day early" other="# days early" />
        )}
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
  const isLate = days < 0
  // No badge pill, dot, Info icon, or flame glyph here — the row already
  // carries the filled Status pill in the next column, and the tinted text
  // color already carries the late-urgency signal. Extra markers were
  // redundant signals on the same axis and added to the row's red overload.
  // Reads as a value ("3 days late"), not a control.
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm tabular-nums leading-tight',
        tintedTextClass,
      )}
    >
      {days === 0 ? (
        <Trans>Today</Trans>
      ) : isLate ? (
        <Plural value={Math.abs(days)} one="# day late" other="# days late" />
      ) : (
        <Plural value={days} one="# day" other="# days" />
      )}
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
                  <p className="text-xs font-medium tracking-eyebrow text-text-tertiary uppercase">
                    <Trans>Preview for {sample.clientName}</Trans>
                  </p>
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
  // `blockerCandidates` retired with the in-tab K-1 editor. Kept on the prop
  // type so the route + provider call sites still compile; underscore-prefixed
  // to silence eslint until we land the new blocker UX.
  blockerCandidates: _blockerCandidates,
  // Dual-mode. The /deadlines route renders the detail
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
  const permission = useFirmPermission()
  const canRequestInput = permission.firm?.role === 'preparer'
  // Lifecycle v2: when on, the Audit tab is relabeled to "Timeline"
  // and its content swaps to the milestone-grouped timeline. See
  // docs/Design/obligation-lifecycle-design-brief.md.
  const lifecycleV2 = useLifecycleV2()
  const legacyStatusLabels = useStatusLabels()
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const statusLabels = lifecycleV2 ? v2StatusLabels : legacyStatusLabels
  // No `_statusDropdownOptions` computation — the drawer-header status pill
  // was retired. If the pill comes back, re-derive from
  // LIFECYCLE_V2_STATUSES / ALL_STATUSES at that point; the cost is
  // negligible.
  const [extensionDraft, setExtensionDraft] = useState(() => emptyExtensionPlanDraft())
  const [taxYearDraft, setTaxYearDraft] = useState<{
    obligationId: string
    taxYearType: ObligationQueueRow['taxYearType']
    fiscalYearEndDate: string
  }>({
    obligationId: '',
    taxYearType: 'calendar',
    fiscalYearEndDate: '',
  })
  // Previous-value snapshots for the In Review sub-status mutations.
  // Captured at click time (in the handlers passed to ActiveStageDetailCard)
  // so the success toast can offer an Undo that fires the reverse
  // mutation. Stored on refs (not state) so the snapshot survives the
  // mutation lifecycle without triggering a re-render.
  const prepStagePreviousRef = useRef<ObligationPrepStage | null>(null)
  const reviewStagePreviousRef = useRef<ObligationReviewStage | null>(null)
  // Materials tab multi-select model. Keyed by the
  // checklist item id so the checklist action row can batch a
  // "Mark received" mutation across every selected row. Carries the
  // owning obligationId so the selection clears automatically when
  // the user switches rows — selection is local to the open drawer,
  // not a global UI state.
  const [materialsSelection, setMaterialsSelection] = useState<{
    obligationId: string
    itemIds: ReadonlySet<string>
  }>({ obligationId: '', itemIds: new Set<string>() })
  const [materialsRequestPreview, setMaterialsRequestPreview] = useState<{
    open: boolean
    obligationId: string | null
  }>({ open: false, obligationId: null })
  const [requestInputDialogOpen, setRequestInputDialogOpen] = useState(false)
  const [requestInputDraft, setRequestInputDraft] = useState<DeadlineInputRequestDraft>({
    obligationId: '',
    recipientUserId: '',
    message: '',
  })
  const [authorityRejectionDialogOpen, setAuthorityRejectionDialogOpen] = useState(false)
  // P0: editable signature-reminder email preview dialog (opened from the
  // drawer's "Remind client to sign" action).
  const [remindDialogOpen, setRemindDialogOpen] = useState(false)
  const [authorityRejectionDraft, setAuthorityRejectionDraft] = useState<AuthorityRejectionDraft>({
    rejectedAt: todayIsoDate(),
    authority: 'IRS',
    reference: '',
    reason: '',
    nextStep: 'correct_resubmit',
  })
  const [authorityRejectionReasonError, setAuthorityRejectionReasonError] = useState(false)
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
  const requestRecipientsQuery = useQuery({
    ...orpc.members.listAssignable.queryOptions({ input: undefined }),
    enabled: obligationId !== null && canRequestInput,
  })
  const requestRecipients = useMemo(
    () =>
      // Reviewer roles (owner/partner/manager) — must mirror the server gate
      // in obligations.requestInput and the Pulse review recipient set.
      (requestRecipientsQuery.data ?? []).filter(
        (member) =>
          member.role === 'owner' || member.role === 'partner' || member.role === 'manager',
      ),
    [requestRecipientsQuery.data],
  )
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  const requestInputMutation = useMutation(
    orpc.obligations.requestInput.mutationOptions({
      onSuccess: (_result, variables) => {
        const recipientName =
          requestRecipients.find((recipient) => recipient.assigneeId === variables.recipientUserId)
            ?.name ?? t`owner or partner`
        setRequestInputDialogOpen(false)
        setRequestInputDraft((current) => ({ ...current, message: '' }))
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.notifications.key() })
        toast.success(t`Sent to ${recipientName}`, {
          description: t`They'll see your note in their inbox and on this deadline.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't send input request`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
  const selectedRequestRecipientUserId =
    requestInputDraft.recipientUserId || requestRecipients[0]?.assigneeId || ''
  const latestInputRequest = useMemo(
    () => latestDeadlineInputRequest(detail?.auditEvents ?? []),
    [detail?.auditEvents],
  )
  const latestInputRequestRecipient = latestInputRequest?.recipientName ?? t`owner or partner`
  const latestInputRequestTitle = latestInputRequest
    ? t`Input requested from ${latestInputRequestRecipient} on ${formatDateTimeWithTimezone(latestInputRequest.createdAt, practiceTimezone)}`
    : undefined
  // `obligationTypeLabels` lookup was retired with the header distill — the
  // "FILING" badge it backed is gone. If a future surface wants the human
  // label, re-add via `useObligationTypeLabels()`.
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
  // Uses the React-recommended render-time adjustment pattern (not a
  // post-render useEffect). `onTabChange` is idempotent (it just updates URL
  // state), so calling it during render is safe — React bails out of the
  // re-render when the URL already matches the requested value.
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
  // Extension policy from the matched rule (drives the extended-deadline math).
  const extensionPolicy = detail?.matchedRule?.extensionPolicy ?? null
  const extensionDurationMonths = extensionPolicy?.durationMonths ?? null
  const extensionOriginalDeadline = row?.baseDueDate ?? ''
  // The statutory extended filing deadline, computed from the immutable base
  // date so it matches the server (and stays stable across re-saves). Rules
  // with no durationMonths (Form 8809 / TX franchise) need a manual date.
  const extensionComputedDeadline =
    row && extensionDurationMonths !== null && isValidIsoDate(row.baseDueDate)
      ? computeExtendedFilingDeadline(
          new Date(`${row.baseDueDate}T00:00:00.000Z`),
          extensionDurationMonths,
        )
          .toISOString()
          .slice(0, 10)
      : ''
  const extensionNeedsManualDeadline = Boolean(row) && extensionDurationMonths === null
  // The cap for the internal target picker = the extended filing deadline
  // (manual date when the rule has no duration). The internal target can now
  // sit anywhere up to the extended deadline — the whole point of an extension.
  const extensionDeadlineCap = extensionNeedsManualDeadline
    ? extensionDraft.extendedFilingDate
    : extensionComputedDeadline
  const extensionManualDeadlineInvalid =
    extensionNeedsManualDeadline &&
    extensionDraft.extendedFilingDate !== '' &&
    isValidIsoDate(extensionOriginalDeadline) &&
    extensionDraft.extendedFilingDate <= extensionOriginalDeadline
  const internalTargetDateInvalid = row
    ? !isInternalExtensionTargetDateValid(extensionDraft.internalTargetDate, extensionDeadlineCap)
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
    setExtensionDraft(extensionPlanDraftFromRow(row))
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
    void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
  const correctionMaterialsMode = row?.status === 'review' && row.efileRejectedAt !== null
  const correctionChecklistItems = checklist.filter((item) => item.status === 'needs_review')
  const canOpenMaterialsRequestPreview =
    checklist.length > 0 && (!correctionMaterialsMode || correctionChecklistItems.length > 0)
  const canShowMaterialsRequestAction =
    !latestRequest ||
    latestRequest.status === 'revoked' ||
    (correctionMaterialsMode &&
      (latestRequest.status === 'responded' || latestRequest.status === 'expired'))
  // Surface the "degraded fallback list" signal as an inline banner above
  // the checklist, not just a transient toast. The degraded flag IS the AI's
  // "I'm not sure" state — losing it on render means the user can't tell a
  // fallback-list run apart from a real run on a stale tab.
  const checklistDegraded = Boolean(
    row &&
    autoGenerateChecklistQuery.data?.obligationId === row.id &&
    autoGenerateChecklistQuery.data?.result.degraded &&
    storedChecklist.length === 0,
  )
  const checklistItemsForSelection = checklist.filter((item) =>
    correctionMaterialsMode ? item.status === 'received' : item.status !== 'received',
  )
  const checklistItemIdsForSelection = checklistItemsForSelection.map((item) => item.id)
  const selectedChecklistItemIdsForAction =
    row && materialsSelection.obligationId === row.id
      ? checklistItemIdsForSelection.filter((itemId) => materialsSelection.itemIds.has(itemId))
      : []
  const selectedChecklistItemCount = selectedChecklistItemIdsForAction.length
  const allMaterialsSelected =
    checklistItemIdsForSelection.length > 0 &&
    selectedChecklistItemCount === checklistItemIdsForSelection.length
  const checklistGenerating =
    generateChecklistMutation.isPending || autoGenerateChecklistQuery.isFetching
  const previewRequestEmailMutation = useMutation(
    orpc.readiness.previewRequestEmail.mutationOptions({
      onError: (err) => {
        toast.error(t`Couldn't prepare materials request preview`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  const sendRequestMutation = useMutation(
    orpc.readiness.sendRequest.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        toast.success(result.emailQueued ? t`Materials request sent` : t`Materials link created`)
      },
      onError: (err) => {
        toast.error(t`Couldn't send materials request`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  const previewRequestEmail =
    previewRequestEmailMutation.data?.obligationId === materialsRequestPreview.obligationId
      ? previewRequestEmailMutation.data
      : null
  function closeMaterialsRequestPreview() {
    setMaterialsRequestPreview({ open: false, obligationId: null })
    previewRequestEmailMutation.reset()
  }
  function openMaterialsRequestPreview(activeObligationId: string) {
    setMaterialsRequestPreview({ open: true, obligationId: activeObligationId })
    previewRequestEmailMutation.mutate({ obligationId: activeObligationId })
  }
  const addChecklistItemMutation = useMutation(
    orpc.readiness.addChecklistItem.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
        toast.success(t`Document item added`)
      },
      onError: (err) => {
        toast.error(t`Couldn't add document item`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  const decideExtensionMutation = useMutation(
    orpc.obligations.decideExtension.mutationOptions({
      onSuccess: (result, variables) => {
        invalidateDetail()
        setExtensionDraft(emptyExtensionPlanDraft(variables.id))
        toast.success(t`Extension plan saved`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't save extension plan`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  const saveExtensionPlanDisabled =
    !row ||
    (extensionNeedsManualDeadline &&
      (extensionDraft.extendedFilingDate === '' || extensionManualDeadlineInvalid)) ||
    !canSaveInternalExtensionPlan({
      draftTargetDate: extensionDraft.internalTargetDate,
      filingDeadline: extensionDeadlineCap,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  // P0 signature loop: advance the e-file pipeline from
  // authorization_requested → authorization_signed when the client returns
  // their signed 8879. Sub-status only — status stays `done` ("Filed").
  // Base mutation handles invalidate + error toast; the success toast
  // (with Undo) fires from the per-call onSuccess at the call site, same
  // split as `changeStatus` below.
  const updateEfileStateMutation = useMutation(
    orpc.obligations.updateEfileState.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
      },
      onError: (err) => {
        toast.error(t`Couldn't update e-file state`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  // P0: email the client a Form 8879 signature reminder. Record-and-send —
  // the server queues the email AND writes an audit row (so the stage card
  // can surface "last reminded N days ago"). No Undo — you can't unsend.
  const remindSignatureMutation = useMutation(
    orpc.obligations.remindSignature.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        if (result.emailQueued) {
          toast.success(t`Signature reminder emailed`)
        } else {
          toast.warning(t`No client email on file`, {
            description: t`Add an email address for this client to send signature reminders.`,
          })
        }
      },
      onError: (err) => {
        toast.error(t`Couldn't send reminder`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
  function advanceWaitingRowToReview() {
    if (!row || row.status !== 'waiting_on_client') return
    onTabChange('summary')
    changeStatus(row.id, 'review', row.status)
  }
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  // `updateBlockedByMutation` retired with the K-1 editor. The RPC procedure
  // (orpc.obligations.updateBlockedBy) still ships; re-bind here when the new
  // blocker UX lands.
  function updateDocumentChecklistItem(
    itemId: string,
    patch: {
      label?: string
      description?: string | null
      status?: ReadinessDocumentChecklistItemPublic['status']
      note?: string | null
    },
  ) {
    const shouldAdvanceToReview =
      patch.status === 'received' &&
      row?.status === 'waiting_on_client' &&
      willReadinessChecklistBeFullyReceived(checklist, new Set([itemId]))
    updateChecklistItemMutation.mutate(
      { itemId, ...patch },
      {
        onSuccess: () => {
          if (shouldAdvanceToReview) advanceWaitingRowToReview()
        },
      },
    )
  }

  // Materials multi-select handlers. Toggling a row's
  // selection updates the local Set; the checklist action row shows
  // selected-item actions when itemIds.size > 0. The batch "Mark
  // received" calls the existing per-item update RPC for each selected
  // id in parallel.
  // Items already received are skipped to avoid emitting no-op audit
  // events; if the batch leaves every item received, the row advances
  // to In review from the Summary tab.
  function toggleMaterialsSelection(itemId: string) {
    if (!row) return
    const item = checklist.find((entry) => entry.id === itemId)
    if (!item) return
    if (correctionMaterialsMode ? item.status !== 'received' : item.status === 'received') return
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
  function selectAllMaterials() {
    if (!row) return
    setMaterialsSelection({
      obligationId: row.id,
      itemIds: new Set(checklistItemIdsForSelection),
    })
  }
  async function batchMarkReceived(itemIds: ReadonlySet<string>) {
    if (!row) return
    const receivingItemIds = new Set<string>()
    for (const itemId of itemIds) {
      const item = detail?.readinessChecklist.find((entry) => entry.id === itemId)
      if (!item || item.status === 'received') continue
      receivingItemIds.add(itemId)
    }
    const shouldAdvanceToReview =
      row.status === 'waiting_on_client' &&
      willReadinessChecklistBeFullyReceived(checklist, receivingItemIds)
    if (receivingItemIds.size === 0) {
      clearMaterialsSelection()
      if (shouldAdvanceToReview) advanceWaitingRowToReview()
      return
    }
    try {
      await Promise.all(
        [...receivingItemIds].map((itemId) =>
          updateChecklistItemMutation.mutateAsync({ itemId, status: 'received' }),
        ),
      )
    } catch {
      return
    }
    clearMaterialsSelection()
    toast.success(
      receivingItemIds.size === 1
        ? t`Marked 1 item received`
        : t`Marked ${receivingItemIds.size} items received`,
    )
    if (shouldAdvanceToReview) advanceWaitingRowToReview()
  }

  async function batchMarkNeedsCorrection(itemIds: ReadonlySet<string>) {
    if (!row) return
    const correctionItemIds = new Set<string>()
    for (const itemId of itemIds) {
      const item = detail?.readinessChecklist.find((entry) => entry.id === itemId)
      if (!item || item.status !== 'received') continue
      correctionItemIds.add(itemId)
    }
    if (correctionItemIds.size === 0) {
      clearMaterialsSelection()
      return
    }
    try {
      await Promise.all(
        [...correctionItemIds].map((itemId) =>
          updateChecklistItemMutation.mutateAsync({ itemId, status: 'needs_review' }),
        ),
      )
    } catch {
      return
    }
    clearMaterialsSelection()
    toast.success(
      correctionItemIds.size === 1
        ? t`Marked 1 item needs correction`
        : t`Marked ${correctionItemIds.size} items need correction`,
    )
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
    if (extensionNeedsManualDeadline && !extensionDraft.extendedFilingDate) {
      toast.error(t`Enter the extended filing deadline.`)
      return
    }
    if (extensionManualDeadlineInvalid) {
      toast.error(t`Extended filing deadline must be after the original deadline.`)
      return
    }
    if (!extensionDraft.internalTargetDate) {
      toast.error(t`Internal extension target date is required.`)
      return
    }
    if (extensionDraft.memo.trim().length === 0) {
      toast.error(t`Decision memo is required.`)
      return
    }
    if (internalTargetDateInvalid) {
      toast.error(
        t`Internal extension target date must be on or before the extended filing deadline.`,
      )
      return
    }

    decideExtensionMutation.mutate({
      id: row.id,
      memo: extensionDraft.memo.trim(),
      ...(extensionDraft.source.trim() ? { source: extensionDraft.source.trim() } : {}),
      internalTargetDate: extensionDraft.internalTargetDate,
      ...(extensionNeedsManualDeadline && extensionDraft.extendedFilingDate
        ? { extendedFilingDate: extensionDraft.extendedFilingDate }
        : {}),
    })
  }

  function openRequestInputDialog() {
    if (!row || !canRequestInput) return
    setRequestInputDraft((current) => ({
      obligationId: row.id,
      recipientUserId:
        current.obligationId === row.id
          ? current.recipientUserId || requestRecipients[0]?.assigneeId || ''
          : requestRecipients[0]?.assigneeId || '',
      message: current.obligationId === row.id ? current.message : '',
    }))
    setRequestInputDialogOpen(true)
  }

  function closeRequestInputDialog() {
    setRequestInputDialogOpen(false)
  }

  function submitRequestInput() {
    if (!row || !canRequestInput) return
    const recipientUserId = selectedRequestRecipientUserId
    const message = requestInputDraft.message.trim()
    if (!recipientUserId) {
      toast.error(t`Choose an owner or partner.`)
      return
    }
    if (!message) {
      toast.error(t`Message is required.`)
      return
    }
    requestInputMutation.mutate({
      obligationId: row.id,
      recipientUserId,
      message,
    })
  }

  function openAuthorityRejectionDialog() {
    if (!row || row.status !== 'done') return
    setAuthorityRejectionDraft(defaultAuthorityRejectionDraft(row))
    setAuthorityRejectionReasonError(false)
    setAuthorityRejectionDialogOpen(true)
  }

  function closeAuthorityRejectionDialog() {
    setAuthorityRejectionDialogOpen(false)
    setAuthorityRejectionReasonError(false)
  }

  function submitAuthorityRejection() {
    if (!row) return
    const reason = authorityRejectionDraft.reason.trim()
    if (
      !authorityRejectionDraft.rejectedAt ||
      !isValidIsoDate(authorityRejectionDraft.rejectedAt)
    ) {
      toast.error(t`Rejected date is required.`)
      return
    }
    if (!reason) {
      setAuthorityRejectionReasonError(true)
      toast.error(t`Add a reason.`)
      return
    }

    markFiledRejectedMutation.mutate(
      {
        id: row.id,
        rejectedAt: authorityRejectionDraft.rejectedAt,
        authority: cleanOptionalText(authorityRejectionDraft.authority),
        reference: cleanOptionalText(authorityRejectionDraft.reference),
        reason,
        nextStep: authorityRejectionDraft.nextStep,
      },
      {
        onSuccess: closeAuthorityRejectionDialog,
      },
    )
  }

  const checklistReference = row ? materialsChecklistReference(row) : null
  // The visible heading is shared with the drawer body. SheetTitle
  // stays sr-only below so Radix Dialog gets its accessible name
  // without duplicating header chrome. Title uses the form code now
  // (e.g. "Form 1040") with the client name as a kicker label above
  // — see header comment below for the rationale.
  const titleText = row?.clientName ?? null
  const drawerBody = (
    <>
      {/* Header — the drawer is a per-obligation surface, so the obligation
          identity (Form 1040, Form 1120-S) deserves the primary slot, not the
          client. Shape:
            line 1: client name (clickable kicker) + close X
            line 2: Form code (h2) + status pill, on one row
            line 3: TY year · jurisdiction (compact secondary meta)
          Internal/statutory deadlines live in a dedicated 3-col strip below
          the header. Header padding (px-12) matches AlertDetailDrawer so both
          right-rail drawers share the same paper-document header rhythm; pt-8
          keeps the title near the top edge. */}
      <header className="relative flex flex-col gap-1.5 px-12 pt-8 pb-2">
        {/* Panel mode owns its own close button — there's no Sheet
            wrapper providing one. Sheet mode skips this since Radix's
            SheetContent already renders an X in the top-right corner.

            A copy-link icon button sits next to the close button so the CPA
            can grab a deep-link to this drawer (short obligation ref + tab)
            without scrolling to the sticky footer. Both buttons live in the
            top-right corner cluster. Sheet mode keeps the link-copy in the
            footer since Radix already owns the corner there. */}
        {mode === 'panel' && row ? (
          // Close-button cluster pinned at `right-3 top-3` to match
          // AlertDetailDrawer's close affordance, so both drawers' close X
          // sit at the identical corner inset.
          <div className="absolute right-3 top-3 flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
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
            >
              <LinkIcon className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label={t`Close deadline detail`}
              onClick={onClose}
            >
              <XIcon className="size-4" aria-hidden />
            </Button>
          </div>
        ) : mode === 'panel' ? (
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label={t`Close deadline detail`}
            onClick={onClose}
            className="absolute right-3 top-3"
          >
            <XIcon className="size-4" aria-hidden />
          </Button>
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
            // The client link reads at text-sm / font-semibold because the
            // client is the row's true primary identity (the form is the
            // secondary identifier), so it earns the visual anchor over the
            // form title.
            className="group/clientlink inline-flex w-fit cursor-pointer items-center gap-1 rounded-sm pr-8 text-left text-sm text-text-secondary outline-none transition-colors hover:text-text-accent focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <span className="font-semibold">{titleText}</span>
            <ArrowUpRightIcon
              aria-hidden
              className="size-3.5 shrink-0 text-text-tertiary transition-colors group-hover/clientlink:text-text-accent"
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
              // The status pill names the workflow state ("Waiting on
              // client") but doesn't carry overdue urgency or the exact
              // blocked-by name. Augmenting Badge chips appear next to the
              // pill when relevant:
              //   • Waiting on client — when status is 'waiting_on_client'
              //   • Blocked — when status is 'blocked'
              //   • N days overdue — when daysUntilDue < 0 on a
              //     non-terminal row
              const showWaitingChip = row.status === 'waiting_on_client'
              const showBlockedChip = row.status === 'blocked'
              // `pillDisplayStatus` retired with the drawer-header
              // status control removal (feedback #4). The dedup logic
              // it powered (showing "In progress" pill while the chip
              // says "Waiting on client") doesn't apply when the pill
              // doesn't exist on this surface.
              return (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pr-8">
                  {/* h1 size matched to Alert's panel title (text-2xl) so
                      both drawers use the same anchor weight. */}
                  <h2 className="text-2xl font-semibold leading-tight text-text-primary">
                    <TaxCodeLabel code={row.taxType} className="cursor-default" />
                  </h2>
                  {/* No status control in the drawer header — the table's
                      Status column is already visible AND interactive, so the
                      cell's pill is the canonical affordance. The drawer
                      header carries the form title + meta chip cluster only. */}
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
                  {/* Overdue + payment-late labels moved into the
                      Filing / Internal / Payment deadline tiles below. */}
                  {latestInputRequest ? (
                    <Badge
                      variant="secondary"
                      className="h-6 gap-1 text-caption-xs uppercase tracking-wide"
                      title={latestInputRequestTitle}
                    >
                      <MessageSquareText className="size-3.5" aria-hidden />
                      <Trans>Input requested</Trans>
                    </Badge>
                  ) : null}
                </div>
              )
            })()
          : null}
        {row && (row.taxYear || row.jurisdiction || row.taxPeriodStart) ? (
          // Meta line under h2 surfaces the full tax-period context —
          // jurisdiction, "Tax Year YYYY", and the period span (start — end)
          // — so the CPA doesn't have to open the dates panel to know which
          // period is being filed. Makes the drawer self-contained as a
          // header.
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-text-tertiary">
            {row.jurisdiction ? (
              <>
                <span className="inline-flex items-center rounded border border-divider-regular bg-background-default px-1.5 py-0.5 text-caption-xs font-medium uppercase tracking-eyebrow-tight text-text-secondary">
                  {row.jurisdiction}
                </span>
                <span aria-hidden>·</span>
              </>
            ) : null}
            {row.taxYear ? (
              <span className="tabular-nums font-semibold text-text-primary">
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
        {/* No canonical-forward-action row (`ObligationDrawerStatusActions`)
            — the interactive `ObligationQueueStatusControl` chip above
            already exposes every valid transition with one click, so a second
            forward-action button would be a redundant affordance. The status
            pill is the single source of truth. */}
      </header>
      {/* Body — in panel mode the aside has fixed height, so this
          inner div owns the scrolling. That lets the snapshot block
          (milestones + dates) pin via `sticky top-0` to stay visible
          while the Readiness checklist / Evidence rows scroll
          underneath. Sheet mode (mobile) keeps a single document
          scroll: SheetContent has overflow-y-auto, so we don't
          double-scroll here. */}
      {/* Body wrapper is `flex flex-col gap-4` so children get a consistent
          16px gap instead of each carrying its own `mb-*`. Same shape as
          AlertDetailDrawer body so the two drawers read with identical
          rhythm. */}
      <div
        className={cn(
          // Body padding (px-12) matches header/footer so the panel reads as
          // one continuous paper-document surface edge-to-edge.
          'flex flex-col gap-4 px-12 pb-12',
          // scrollbar-gutter:stable on the panel-mode body: different tabs
          // render different content heights (Summary is short, Materials is
          // long). Without it, the scrollbar appears/disappears on tab switch
          // and shifts the content ~15px horizontally — reads as "panel width
          // flickers." Reserving the scrollbar space holds the content steady.
          mode === 'panel' && 'flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]',
        )}
      >
        {detailQuery.isLoading ? (
          <EmptyPanel className="py-8 text-center">
            <Trans>Loading…</Trans>
          </EmptyPanel>
        ) : detailQuery.isError || !detail || !row ? (
          // Step 1-5 reaudit Alert primitive + Step 6 UX #147
          // Button-link retry.
          <Alert variant="destructive">
            <AlertDescription>
              <Trans>Couldn't load deadline detail.</Trans>{' '}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 align-baseline"
                onClick={() => void detailQuery.refetch()}
              >
                <Trans>Retry</Trans>
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (isObligationQueueDetailTab(value)) onTabChange(value)
            }}
          >
            {/* The sticky block is split into two:
                  • Sticky: PrimaryDeadlineStrip only — three anchor dates that
                    CPAs check at every interaction, always visible across
                    every tab.
                  • Summary tab (below): PathToFilingSummary +
                    ActiveStageDetailCard — the deep-dive milestone +
                    stage-context view, with a labeled home.
                So the always-visible chrome is tighter (just the dates), the
                milestone story has its own tab that doesn't compete with
                Materials / Extension / Evidence, and ?tab=summary is
                shareable. */}
            {/* The sticky strip is opaque: in the Materials tab, checklist
                rows scroll under this band, and a transparent sticky layer
                would let document text show through the date tiles/gutters. A
                white surface + subtle bottom rule keeps the flat drawer-body
                feel while giving the sticky layer a real backing. */}
            <div
              className={cn(
                'flex flex-col gap-3',
                mode === 'panel'
                  ? // Negative bleed (-mx-12) matches the body's px-12 padding;
                    // re-applying px-12 inside keeps the sticky strip's content
                    // edge aligned with the rest of the body.
                    'sticky top-0 z-20 -mx-12 border-b border-divider-subtle bg-background-default px-12 py-3'
                  : 'mb-4',
              )}
            >
              {/* PrimaryDeadlineStrip: the three dates the CPA checks first —
                  Internal, Filing, Payment — in a 3-column strip at the top of
                  the snapshot. Each column carries a one-word label + the date
                  + a small state tag ("MISSED" if past, blank otherwise).
                  Reading order: identity (header) → key dates (this strip) →
                  tabs → tab content. The remaining secondary dates (Statutory,
                  Tax period, Created, Last touched, e-file timestamps) live in
                  the bottom FlatDateList under "Reference dates". */}
              <PrimaryDeadlineStrip row={row} />
              {/* StatutoryDatesPanel lives AFTER the TabsContent, not in this
                  sticky snapshot block, so the tabs sit immediately under the
                  stage card. The dates panel is reference info (most rows show
                  the same date 4×: Internal due = Statutory = Filing =
                  Payment), so it doesn't earn prime vertical real estate above
                  the tabs. */}
              {/* `ObligationForwardingPanel` removed — the "Forward to task ·
                  …@duedatehq.com · Phase 2" block was a feature stub crowding
                  the drawer with chrome for capability that isn't shipping yet.
                  Restore when inbound-file routing goes live. */}
            </div>
            {/* TabsList lives OUTSIDE the sticky snapshot block so the tabs
                visually group with the TabsContent they control, not with the
                milestones / dates above. Tradeoff: tabs scroll away with the
                body rather than staying pinned, but the CPA rarely switches
                tabs mid-scroll on the same obligation, so the visual clarity
                wins. No `border-t` separator above — the pill segmented
                control is visually self-contained (rounded bg track + raised
                active item), and a top rule would make the tabs read as the
                bottom of the snapshot block above instead of the top of the
                tab content below. The `pt-3` here opens a buffer above the bar
                while `mt-0` on the TabsContent panels keeps the gap below it
                tight, so the bar reads as the leading edge of the tab content
                beneath. */}
            <div className="sticky top-0 z-10 bg-background-default pt-3">
              {/* Tab bar uses the line-variant underline bar. Each trigger
                  leads with a lucide icon + label + context badge:
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
                    // Explicit white bg on the TabsList: the line-variant
                    // defaults to transparent, which would let the sticky
                    // deadline strip bleed through visually when it scrolls
                    // behind the tabs.
                    //
                    // `justify-start` so the four tabs hug the left edge
                    // instead of distributing across the panel (each
                    // TabsTrigger drops `flex-1` for the same reason — see the
                    // trigger className below). `gap-6` opens 24px between tabs
                    // so they stay individually scannable without per-tab px.
                    className="flex h-11 w-full justify-start gap-6 border-b border-divider-subtle bg-background-default text-sm"
                  >
                    {/* Every TabsTrigger layers four signals so the active
                        tab pops without abandoning the tab paradigm for a
                        segmented-control look:
                          1. Inactive text: `text-text-secondary` — still
                             visible enough to invite a click.
                          2. Active text: `text-text-primary` +
                             `font-semibold` — strongest contrast jump.
                          3. Active underline color: `accent-default` (matches
                             the /clients/[id] tabs + /deadlines scope tabs).
                          4. Active underline position: primitive default
                             (`bottom-[-5px]`) — floats ~5px below the trigger
                             for breathing room from the text descender.
                        Stays with TABS (not segmented control) because the 4
                        panels are different sections of the SAME deadline
                        (Summary / Materials / Extension / Evidence), not
                        filters or scopes. Segmented control belongs to the
                        /deadlines top-level scope tabs where each option
                        re-filters the queue. */}
                    {visibleTabs.has('summary') ? (
                      // No leading icon on Summary — the word is
                      // self-explanatory, and an info-glyph would imply "click
                      // here for info ABOUT the summary" rather than "this is
                      // the summary tab." Other tabs (Materials, Extension,
                      // Evidence) keep their icons because they distinguish by
                      // purpose (paperclip / calendar / file).
                      <TabsTrigger
                        value="summary"
                        className="!flex-none !px-0 rounded-t text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1 data-active:text-text-primary data-active:font-semibold after:!bg-accent-default"
                      >
                        <Trans>Summary</Trans>
                      </TabsTrigger>
                    ) : null}
                    {visibleTabs.has('readiness') ? (
                      <TabsTrigger
                        value="readiness"
                        className="!flex-none !px-0 rounded-t text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1 data-active:text-text-primary data-active:font-semibold after:!bg-accent-default"
                      >
                        <PaperclipIcon className="size-3.5" aria-hidden />
                        <Trans>Materials</Trans>
                        {outstandingMaterials > 0 ? (
                          <span
                            aria-label={t`${outstandingMaterials} outstanding`}
                            // Light accent tint (state-accent-hover-alt) with
                            // accent-tinted text, not solid destructive red —
                            // it communicates "13 items here" without making
                            // every Materials tab with outstanding items shout
                            // "danger."
                            className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-state-accent-hover-alt px-1 text-caption-xs font-medium leading-none tabular-nums text-text-accent"
                          >
                            {outstandingMaterials}
                          </span>
                        ) : allMaterialsReceived ? (
                          <span
                            aria-label={t`All received`}
                            className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-state-success-hover px-1 text-caption-xs text-state-success-solid"
                          >
                            <CheckIcon className="size-3" aria-hidden />
                          </span>
                        ) : null}
                      </TabsTrigger>
                    ) : null}
                    {visibleTabs.has('extension') ? (
                      <TabsTrigger
                        value="extension"
                        className="!flex-none !px-0 rounded-t text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1 data-active:text-text-primary data-active:font-semibold after:!bg-accent-default"
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
                    {/* Risk tab removed — risk inputs live on the client
                        detail page (ClientRiskInputsPanel) rather than
                        per-obligation. Surface kept on the schema for
                        back-compat with deep-links; the trigger and content
                        are unmounted. */}
                    {visibleTabs.has('evidence') ? (
                      <TabsTrigger
                        value="evidence"
                        className="!flex-none !px-0 rounded-t text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1 data-active:text-text-primary data-active:font-semibold after:!bg-accent-default"
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
            <TabsContent value="summary" key="summary-content">
              <motion.div
                className="pt-6"
                initial={{ x: 12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
              >
                {/* Summary tab — milestone chevron + active-stage zoom. These
                  live in a dedicated tab (not pinned in the sticky snapshot
                  block) so:
                    - The drawer chrome is tighter (just the deadline strip
                      stays sticky).
                    - The milestone story has a labeled home that shares URL
                      state (?tab=summary is shareable).
                    - Materials / Extension / Evidence don't get the stage card
                      pushing them below the fold. */}
                <div className="grid gap-3">
                  <PathToFilingSummary row={row} auditEvents={detail.auditEvents} />
                  <AuthorityResponsePanel
                    row={row}
                    auditEvents={detail.auditEvents}
                    accepting={markAcceptedMutation.isPending}
                    rejecting={markFiledRejectedMutation.isPending}
                    onConfirmAccepted={() =>
                      markAcceptedMutation.mutate({ id: row.id, status: 'completed' })
                    }
                    onRecordRejection={openAuthorityRejectionDialog}
                    onChangeTab={(nextTab) => onTabChange(nextTab)}
                  />
                  <ActiveStageDetailCard
                    row={row}
                    auditEvents={detail.auditEvents}
                    readinessChecklist={detail.readinessChecklist}
                    onChangeTab={(nextTab) => onTabChange(nextTab)}
                    onChangeStatus={(nextStatus) => changeStatus(row.id, nextStatus, row.status)}
                    onConfirmAcceptance={() =>
                      markAcceptedMutation.mutate({ id: row.id, status: 'completed' })
                    }
                    onRecordRejection={openAuthorityRejectionDialog}
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
                    onMarkSigned={() => {
                      // Advance the e-file pipeline; success toast offers an
                      // Undo that reverts to authorization_requested (the
                      // only state mark-signed fires from). Same per-call
                      // onSuccess + Undo split as `changeStatus`.
                      updateEfileStateMutation.mutate(
                        { id: row.id, efileState: 'authorization_signed' },
                        {
                          onSuccess: (result) => {
                            toast.success(t`Marked 8879 signed`, {
                              description: t`Audit ${result.auditId.slice(0, 8)}`,
                              action: {
                                label: t`Undo`,
                                onClick: () =>
                                  updateEfileStateMutation.mutate({
                                    id: row.id,
                                    efileState: 'authorization_requested',
                                  }),
                              },
                            })
                          },
                        },
                      )
                    }}
                    onRemindSignature={() => setRemindDialogOpen(true)}
                    onSubmitEfile={() => {
                      // Signed → e-filed. Undo reverts to
                      // authorization_signed (where submit fires from).
                      updateEfileStateMutation.mutate(
                        { id: row.id, efileState: 'submitted' },
                        {
                          onSuccess: (result) => {
                            toast.success(t`Marked e-filed`, {
                              description: t`Audit ${result.auditId.slice(0, 8)}`,
                              action: {
                                label: t`Undo`,
                                onClick: () =>
                                  updateEfileStateMutation.mutate({
                                    id: row.id,
                                    efileState: 'authorization_signed',
                                  }),
                              },
                            })
                          },
                        },
                      )
                    }}
                  />
                </div>
              </motion.div>
            </TabsContent>
            <TabsContent value="readiness" key="readiness-content">
              <motion.div
                className="pt-6"
                initial={{ x: 12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
              >
                {/* Outer gap-4 so each top-level block (overview, checklist,
                    sent panel, tax year settings) reads as its own clear
                    section instead of one long stack. Cross-tab default. */}
                <div className="grid gap-4">
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
                          Client response due{' '}
                          {formatDatePretty(latestRequest.expiresAt.slice(0, 10))}
                        </Trans>
                      </Badge>
                      <span className="text-text-tertiary">
                        <Trans>· firm-set deadline for this materials request</Trans>
                      </span>
                    </div>
                  ) : null}
                  {correctionMaterialsMode ? (
                    <div className="flex items-start gap-2 rounded-lg border border-state-destructive-border bg-state-destructive-hover px-3 py-2 text-sm text-text-destructive">
                      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <div className="grid gap-1">
                        <p className="font-medium">
                          <Trans>Request corrected materials</Trans>
                        </p>
                        <p className="text-xs leading-snug">
                          <Trans>
                            Select received items that need changes, mark them needs correction,
                            then send only those items to the client.
                          </Trans>
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {/* K-1 / parent-obligation blocker editor removed — it
                    surfaced as a full picker on every drawer open, even when
                    not blocked. The queue row's <BlockedByChip> still shows
                    when a blocker is set, so the signal isn't lost. A better
                    re-home (header chip + on-demand picker, or auto-detected
                    from related-entity rows) is parked for a later pass. */}
                  {/* Action hierarchy:
                    - Empty checklist → single primary "Generate document
                      list" CTA. The other two buttons (Add item, Send to
                      client) are useless here, so they're hidden.
                    - Populated checklist → "Send to client" is the primary CTA
                      on its own line; "Add item" demoted to a quiet text+icon
                      button next to the heading.
                    Avoids stacking all three buttons at equal weight, where
                    the actual workflow goal (send the request) would fight
                    Generate + Add item for the user's eye. */}
                  {/* Section title is "Materials checklist" (the title for the
                    checklist as a whole) — NOT "Documents received" with a
                    TOTAL-items count, which collided with the Outstanding
                    subsection's count below and read as a contradiction. The
                    Outstanding/Received subsections inside carry the actual
                    received-vs-outstanding split + their own counts.
                    Hierarchy now reads:
                      Materials checklist (13 total)
                        ├ Outstanding (N items)
                        └ Received (M items, M + N = 13)
                */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-text-primary">
                            <Trans>Materials checklist</Trans>
                          </h3>
                          {checklistReference ? (
                            <Badge
                              variant="outline"
                              className="h-5 rounded-lg px-1.5 text-caption-xs font-medium text-text-secondary"
                            >
                              {checklistReference}
                            </Badge>
                          ) : null}
                        </div>
                        {(() => {
                          if (row.status !== 'done' && row.status !== 'completed') return null
                          const total = checklist.length
                          const received = checklist.filter((i) => i.status === 'received').length
                          const description =
                            total === 0
                              ? t`No document checklist was attached to this filing.`
                              : received === 0
                                ? t`${total} checklist items weren't individually ticked during filing.`
                                : received < total
                                  ? t`${received} of ${total} items recorded as received before filing.`
                                  : t`All ${total} items recorded as received.`
                          return (
                            <p className="text-caption italic leading-snug text-text-tertiary">
                              {description}
                            </p>
                          )
                        })()}
                      </div>
                      {checklist.length > 0 ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <div className="flex h-8 items-center gap-2 rounded-lg px-1 text-sm font-medium text-text-secondary">
                            <Checkbox
                              aria-label={
                                correctionMaterialsMode
                                  ? t`Select all received items`
                                  : t`Select all`
                              }
                              checked={allMaterialsSelected}
                              disabled={
                                checklistItemIdsForSelection.length === 0 ||
                                checklistGenerating ||
                                updateChecklistItemMutation.isPending
                              }
                              onCheckedChange={() => {
                                if (allMaterialsSelected) clearMaterialsSelection()
                                else selectAllMaterials()
                              }}
                            />
                            <span>
                              {correctionMaterialsMode ? (
                                <Trans>Select received</Trans>
                              ) : (
                                <Trans>Select all</Trans>
                              )}
                            </span>
                          </div>
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
                        </div>
                      ) : null}
                    </div>
                    {checklist.length === 0 ? (
                      autoGenerateChecklistQuery.isFetching ? (
                        <EmptyPanel className="grid gap-3 text-text-secondary">
                          <div className="flex items-center gap-2">
                            <RefreshCwIcon className="size-4 animate-spin" aria-hidden />
                            <span>
                              <Trans>Preparing</Trans>
                            </span>
                          </div>
                        </EmptyPanel>
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
                        <EmptyPanel className="grid gap-3 text-center text-text-secondary">
                          <p className="text-text-tertiary">
                            <Trans>
                              No documents listed yet. Generate an AI checklist or add items
                              manually.
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
                        </EmptyPanel>
                      )
                    ) : (
                      <>
                        {/* When the auto-generated checklist comes back with
                        `degraded: true`, surface it as an inline banner that
                        stays as long as the fallback list is on screen — the
                        AI's "I'm not sure" signal needs to be persistent, not
                        a transient toast the user blows past while using the
                        fallback list. */}
                        {checklistDegraded ? (
                          <div className="flex items-start gap-2 rounded-lg border border-state-warning-active-alt bg-state-warning-hover px-3 py-2 text-xs text-text-warning">
                            <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            <span>
                              <Trans>
                                AI couldn't reach the full model — showing a fallback list. Review
                                each item against the deadline before relying on it.
                              </Trans>
                            </span>
                          </div>
                        ) : null}
                        {/* Checklist renders as two labeled sections —
                        Outstanding first (the work the CPA still owes the
                        client), Received second (acknowledgement the work is
                        done). Empty "Outstanding" collapses to a quiet "All
                        items received" line; empty "Received" hides the
                        section entirely so the early-state checklist reads
                        cleanly as one list. ChecklistItemRow handles its own
                        received-style chrome based on item.status — the split
                        is purely organizational, no new renderer needed. */}
                        {(() => {
                          const outstandingItems = checklist.filter((i) => i.status !== 'received')
                          const receivedItems = checklist.filter((i) => i.status === 'received')
                          function renderRow(item: (typeof checklist)[number]) {
                            const response =
                              latestRequest?.responses.find((r) => r.itemId === item.id) ?? null
                            const received = item.status === 'received'
                            const selectable = correctionMaterialsMode
                              ? received
                              : item.status !== 'received'
                            const isSelected = selectable && materialsSelection.itemIds.has(item.id)
                            return (
                              <ChecklistItemRow
                                key={`${item.id}:${item.updatedAt}`}
                                item={item}
                                response={response}
                                correctionMode={correctionMaterialsMode}
                                pending={updateChecklistItemMutation.isPending}
                                selected={isSelected}
                                selectionDisabled={!selectable}
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
                          // When the row is filed / completed the checklist is
                          // an ARCHIVE, not a to-do list — "Outstanding 13" on
                          // a Filed row would read as "13 items still to do"
                          // when the work is closed (the items just weren't
                          // ticked in the audit trail). Terminal headings:
                          //   • "Outstanding" → "Not in audit trail" — same
                          //     items, framed as "missing from the archive"
                          //     not "still to be done."
                          //   • "Received" → "Archived" — historical record
                          //     framing.
                          const isTerminalRow = row.status === 'done' || row.status === 'completed'
                          return (
                            <div className="flex flex-col gap-4">
                              {/* No "This deadline has been filed" banner —
                              the header status pill + the section title ("Not
                              in audit trail" / "Archived") + ReadinessOverview's
                              italic subline already tell the historical-record
                              story; a banner would be a fourth telling. */}
                              {/* Outstanding / Received are small kicker
                                sub-headers (text-caption-xs uppercase
                                tracking-wider text-text-tertiary). The
                                Materials checklist h3 above is the section
                                title; these are sub-section labels under it. */}
                              <section className="flex flex-col gap-1.5">
                                <header className="flex items-baseline gap-1.5">
                                  <h4 className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
                                    {isTerminalRow ? (
                                      <Trans>Not in audit trail</Trans>
                                    ) : (
                                      <Trans>Outstanding</Trans>
                                    )}
                                  </h4>
                                  <span
                                    aria-label={t`${outstandingItems.length} items`}
                                    className="text-caption-xs font-medium tabular-nums text-text-tertiary"
                                  >
                                    {outstandingItems.length}
                                  </span>
                                </header>
                                {outstandingItems.length === 0 ? (
                                  <p className="rounded-lg border border-divider-subtle p-4 text-center text-sm text-text-tertiary">
                                    <Trans>All items received.</Trans>
                                  </p>
                                ) : (
                                  <div className="grid gap-1.5">
                                    {outstandingItems.map(renderRow)}
                                  </div>
                                )}
                              </section>
                              {receivedItems.length > 0 ? (
                                <section className="flex flex-col gap-1.5">
                                  <header className="flex items-baseline gap-1.5">
                                    <h4 className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
                                      {isTerminalRow ? (
                                        <Trans>Archived</Trans>
                                      ) : (
                                        <Trans>Received</Trans>
                                      )}
                                    </h4>
                                    <span
                                      aria-label={t`${receivedItems.length} items`}
                                      className="text-caption-xs font-medium tabular-nums text-text-tertiary"
                                    >
                                      {receivedItems.length}
                                    </span>
                                  </header>
                                  <div className="grid gap-1.5">{receivedItems.map(renderRow)}</div>
                                </section>
                              ) : null}
                            </div>
                          )
                        })()}
                        {/* Primary CTA below the checklist — the actual
                        workflow terminal action. Selection state now
                        lives in the same row, with client-send on the
                        left and selected-item batch actions on the right. */}
                        {canShowMaterialsRequestAction || selectedChecklistItemCount > 0 ? (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {canShowMaterialsRequestAction ? (
                              <Button
                                size="sm"
                                onClick={() => openMaterialsRequestPreview(row.id)}
                                disabled={
                                  previewRequestEmailMutation.isPending ||
                                  sendRequestMutation.isPending ||
                                  !canOpenMaterialsRequestPreview
                                }
                              >
                                <SendIcon data-icon="inline-start" />
                                {correctionMaterialsMode ? (
                                  <Trans>Send correction request</Trans>
                                ) : (
                                  <Trans>Send to client</Trans>
                                )}
                              </Button>
                            ) : null}
                            {selectedChecklistItemCount > 0 ? (
                              <div className="ml-auto flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-text-primary">
                                  <Plural
                                    value={selectedChecklistItemCount}
                                    one="# item selected"
                                    other="# items selected"
                                  />
                                </span>
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
                                  variant={correctionMaterialsMode ? 'outline' : 'default'}
                                  onClick={() =>
                                    void (correctionMaterialsMode
                                      ? batchMarkNeedsCorrection(
                                          new Set(selectedChecklistItemIdsForAction),
                                        )
                                      : batchMarkReceived(
                                          new Set(selectedChecklistItemIdsForAction),
                                        ))
                                  }
                                  disabled={updateChecklistItemMutation.isPending}
                                >
                                  {correctionMaterialsMode ? (
                                    <>
                                      <Trans>Mark needs correction</Trans>
                                      <AlertTriangleIcon data-icon="inline-end" />
                                    </>
                                  ) : (
                                    <>
                                      <Trans>Mark client docs received</Trans>
                                      <CheckCircle2Icon data-icon="inline-end" />
                                    </>
                                  )}
                                </Button>
                              </div>
                            ) : null}
                            {correctionMaterialsMode && correctionChecklistItems.length === 0 ? (
                              <p className="text-xs text-text-tertiary">
                                <Trans>
                                  Mark at least one received item needs correction first.
                                </Trans>
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                  {latestRequest ? (
                    <section className="flex flex-col gap-2">
                      <header className="flex items-baseline gap-2">
                        <h3 className="text-sm font-semibold text-text-primary">
                          <Trans>Client request</Trans>
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-caption-xs uppercase tracking-wide"
                        >
                          {latestRequest.status}
                        </Badge>
                      </header>
                      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-background-subtle p-3">
                        <span className="text-xs text-text-secondary">
                          <Trans>
                            Sent to {latestRequest.recipientEmail ?? t`client`} · expires{' '}
                            {formatDatePretty(latestRequest.expiresAt.slice(0, 10))}
                          </Trans>
                        </span>
                        <div className="ml-auto flex items-center gap-1.5">
                          {latestRequest.portalUrl ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void copyLatestLink()}
                              >
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
                    </section>
                  ) : null}
                  {/* Tax year profile lives in a settings-style footer behind
                    a disclosure (not at the top of the tab, where it would
                    dominate the daily-driver workflow). Auto-opens when the
                    profile is incomplete (fiscal year selected without an end
                    date), so a CPA who needs to fix it sees it surface
                    naturally. Otherwise it stays collapsed — one-time setup
                    that rarely needs revisiting. */}
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
                          {/* Tax year type binary toggle uses a DropdownMenu
                              (not a Base UI Select) so the interaction matches
                              every other dropdown in the drawer (Sort-by /
                              Columns / export client picker). */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <DropdownTriggerButton>
                                  <span className="truncate">
                                    {taxYearDraft.taxYearType === 'calendar' ? (
                                      <Trans>Calendar year</Trans>
                                    ) : (
                                      <Trans>Fiscal year</Trans>
                                    )}
                                  </span>
                                  <ChevronDownIcon
                                    className="size-3.5 shrink-0 text-text-tertiary"
                                    aria-hidden
                                  />
                                </DropdownTriggerButton>
                              }
                            />
                            <DropdownMenuContent align="start" className="w-[var(--anchor-width)]">
                              <DropdownMenuRadioGroup
                                value={taxYearDraft.taxYearType}
                                onValueChange={(value) => {
                                  if (value === 'calendar' || value === 'fiscal') {
                                    setTaxYearDraft((current) => ({
                                      ...current,
                                      taxYearType: value,
                                    }))
                                  }
                                }}
                              >
                                <DropdownMenuRadioItem value="calendar">
                                  <Trans>Calendar year</Trans>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="fiscal">
                                  <Trans>Fiscal year</Trans>
                                </DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Input
                            value={taxYearDraft.fiscalYearEndDate}
                            disabled={taxYearDraft.taxYearType === 'calendar'}
                            aria-label={t`Fiscal year end`}
                            aria-invalid={taxYearFiscalMissing || taxYearFiscalInvalid}
                            inputMode="numeric"
                            placeholder="MM/DD"
                            onBlur={(event) => {
                              const nextFiscalYearEnd = fiscalYearEndParts(
                                event.currentTarget.value,
                              )
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
                            aria-busy={updateTaxYearProfileMutation.isPending || undefined}
                          >
                            {updateTaxYearProfileMutation.isPending ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden />
                            ) : null}
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
              </motion.div>
            </TabsContent>
            <TabsContent value="extension" key="extension-content">
              <motion.div
                className="pt-6"
                initial={{ x: 12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
              >
                <div className="grid gap-3">
                  <AlertPanel>
                    <Trans>
                      This saves the firm's internal extension plan for this deadline. The internal
                      target date must be on or before the filing deadline. It does not update the
                      due date, change client records, or confirm an authority filing. Payment may
                      still be due by the original date.
                    </Trans>
                  </AlertPanel>
                  {/* Extension reads as a flat section — header + content, no
                      extra card frame around the rule facts — to match the
                      rest of the drawer (Summary uses self-framed components,
                      Materials uses flat sections with `<h3>` headers). */}
                  <section className="flex flex-col gap-2">
                    <header className="flex items-baseline gap-2">
                      <h3 className="text-sm font-semibold text-text-primary">
                        <Trans>Rule reference</Trans>
                      </h3>
                      <span className="text-caption-xs text-text-tertiary">
                        <Trans>from matched rule</Trans>
                      </span>
                    </header>
                    <div className="grid gap-1.5">
                      <DetailRow
                        label={<Trans>Extension policy</Trans>}
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
                        label={<Trans>Extension length</Trans>}
                        value={
                          extensionDurationMonths !== null
                            ? t`${extensionDurationMonths} months`
                            : t`Not specified`
                        }
                      />
                      <DetailRow
                        label={<Trans>Original filing deadline</Trans>}
                        value={formatDate(extensionOriginalDeadline)}
                      />
                      <DetailRow
                        label={<Trans>Extended filing deadline</Trans>}
                        value={
                          extensionDeadlineCap ? formatDate(extensionDeadlineCap) : t`Enter below`
                        }
                      />
                      <DetailRow
                        label={<Trans>Payment still due</Trans>}
                        value={formatDate(row.paymentDueDate ?? row.baseDueDate)}
                      />
                      <DetailRow
                        label={<Trans>Rule notes</Trans>}
                        value={detail.matchedRule?.extensionPolicy.notes ?? t`No matched rule`}
                      />
                    </div>
                  </section>
                  {extensionNeedsManualDeadline ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-caption-xs text-text-tertiary">
                        <Trans>
                          This obligation type has no fixed extension length — enter the extended
                          filing deadline.
                        </Trans>
                      </span>
                      <IsoDatePicker
                        value={extensionDraft.extendedFilingDate}
                        invalid={extensionManualDeadlineInvalid}
                        ariaLabel={t`Extended filing deadline`}
                        placeholder={t`Extended filing deadline`}
                        onValueChange={(extendedFilingDate) =>
                          setExtensionDraft((current) => ({ ...current, extendedFilingDate }))
                        }
                      />
                    </div>
                  ) : null}
                  <IsoDatePicker
                    value={extensionDraft.internalTargetDate}
                    invalid={internalTargetDateInvalid}
                    maxIsoDate={extensionDeadlineCap}
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
                    <Button
                      className="w-fit"
                      onClick={saveExtensionDecision}
                      disabled={saveExtensionPlanDisabled}
                    >
                      <Trans>Save extension</Trans>
                    </Button>
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
              </motion.div>
            </TabsContent>
            <TabsContent value="evidence" key="evidence-content">
              <motion.div
                className="pt-6"
                initial={{ x: 12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
              >
                {/* Evidence tab split into two visually-distinct sections:
                    - WORKPAPERS (top, default open): client-attached files
                      and submissions. This is the daily-driver question —
                      "what do we have on hand?"
                    - AUTHORITY (bottom, collapsed): the deadline's
                      source-of-truth chain (matched rule + IRS / state
                      citations). Used during audit defense, not day-to-day.
                      Folded behind <details> so it doesn't compete with
                      workpapers for the user's eye. */}
                <div className="grid gap-4">
                  {/* Workpapers heading uses `text-sm font-semibold
                      text-text-primary` (not a kicker style) so all 4 tabs
                      share one section-heading vocabulary. */}
                  <section
                    aria-labelledby="evidence-workpapers-heading"
                    className="flex flex-col gap-2"
                  >
                    <header className="flex items-baseline justify-between gap-2">
                      <h3
                        id="evidence-workpapers-heading"
                        className="text-sm font-semibold text-text-primary"
                      >
                        <Trans>Workpapers</Trans>
                      </h3>
                      <div className="flex items-center gap-2">
                        {detail.evidence.length > 0 ? (
                          <span className="text-xs tabular-nums text-text-tertiary">
                            {detail.evidence.length}
                          </span>
                        ) : null}
                        {/* Stub CTA so the workpapers section isn't a dead
                            end (audit L11). Upload pipeline isn't wired yet,
                            so the click acknowledges + sets expectation
                            without losing the user. */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toast.info(t`Workpaper upload is coming soon`, {
                              description: t`We'll let you attach PDFs and exports here as soon as ingest lands.`,
                            })
                          }
                        >
                          <Trans>Add workpaper</Trans>
                        </Button>
                      </div>
                    </header>
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
                        // Rule-id chip is a real Link into /rules/library:
                        // clicking it opens the library scoped to this rule
                        // via the `?rule=` query param (the library page
                        // treats unknown params gracefully when not yet
                        // implemented; even then the user lands in the right
                        // vicinity). stopPropagation on click so the
                        // surrounding <summary> doesn't toggle the <details>
                        // open/closed at the same time.
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
                              className="grid gap-1 rounded-lg border border-divider-subtle p-3"
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
              </motion.div>
            </TabsContent>
          </Tabs>
        )}
        {/* Reference dates panel sits at the bottom of the drawer body, just
            above the sticky footer — the CPA scans reference dates AFTER
            acting on the active surface (stage card + tabs). A small uppercase
            eyebrow gives it gentle separation from the tab content above
            without needing a full divider. */}
        {row ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-caption-xs font-medium uppercase tracking-eyebrow text-text-tertiary">
              <Trans>Reference dates</Trans>
            </p>
            <StatutoryDatesPanel row={row} />
          </div>
        ) : null}
      </div>
      <DeadlineInputRequestDialog
        open={requestInputDialogOpen}
        recipients={requestRecipients}
        selectedRecipientUserId={selectedRequestRecipientUserId}
        message={requestInputDraft.message}
        loadingRecipients={requestRecipientsQuery.isLoading}
        submitting={requestInputMutation.isPending}
        onOpenChange={(open) => {
          if (open) openRequestInputDialog()
          else closeRequestInputDialog()
        }}
        onRecipientChange={(recipientUserId) => {
          setRequestInputDraft((current) => ({ ...current, recipientUserId }))
        }}
        onMessageChange={(message) => {
          setRequestInputDraft((current) => ({ ...current, message }))
        }}
        onSubmit={submitRequestInput}
      />
      <AuthorityRejectionDialog
        open={authorityRejectionDialogOpen}
        draft={authorityRejectionDraft}
        reasonError={authorityRejectionReasonError}
        submitting={markFiledRejectedMutation.isPending}
        onOpenChange={(open) => {
          if (open) openAuthorityRejectionDialog()
          else closeAuthorityRejectionDialog()
        }}
        onDraftChange={(patch) => {
          setAuthorityRejectionDraft((current) => ({ ...current, ...patch }))
          if (patch.reason !== undefined && patch.reason.trim()) {
            setAuthorityRejectionReasonError(false)
          }
        }}
        onSubmit={submitAuthorityRejection}
      />
      <SignatureReminderDialog
        open={remindDialogOpen}
        onOpenChange={setRemindDialogOpen}
        target={{ mode: 'single', obligationId: row?.id ?? null }}
        sending={remindSignatureMutation.isPending}
        onSend={({ subject, body }) => {
          if (!row) return
          remindSignatureMutation.mutate(
            { id: row.id, subject, body },
            { onSuccess: () => setRemindDialogOpen(false) },
          )
        }}
      />
      <MaterialsRequestPreviewDialog
        open={materialsRequestPreview.open}
        preview={previewRequestEmail}
        correctionMode={row?.status === 'review' && row.efileRejectedAt !== null}
        loading={previewRequestEmailMutation.isPending}
        errorMessage={
          previewRequestEmailMutation.isError
            ? (rpcErrorMessage(previewRequestEmailMutation.error) ??
              t`Couldn't prepare materials request preview`)
            : null
        }
        sending={sendRequestMutation.isPending}
        onOpenChange={(open) => {
          if (!open) closeMaterialsRequestPreview()
          else if (materialsRequestPreview.obligationId) {
            setMaterialsRequestPreview((current) => ({ ...current, open: true }))
          }
        }}
        onSend={() => {
          const obligationIdToSend = previewRequestEmail?.obligationId
          if (!obligationIdToSend) return
          sendRequestMutation.mutate(
            { obligationId: obligationIdToSend },
            { onSuccess: closeMaterialsRequestPreview },
          )
        }}
      />
      {row ? (
        /* Footer chrome matches the alert drawer's sticky action bar:
             • `border-t-2 border-divider-regular` — committed decision
               surface separator (relying on the body's pb-24 alone read
               inconsistent between drawers).
             • `px-12` — match header/body left margin. */
        <div className="sticky bottom-0 mt-auto flex min-h-16 flex-wrap items-center justify-between gap-2 border-t-2 border-divider-regular bg-background-default px-12 pt-4 pb-6">
          {/* "Last updated" stacks vertically — label on line 1, timestamp
              on line 2 — because a single line gets cramped at narrower panel
              widths with the action cluster on the right. */}
          <span className="flex flex-col text-xs leading-tight text-text-tertiary">
            <span>
              <Trans>Last updated</Trans>
            </span>
            <span className="tabular-nums">
              {formatDateTimeWithTimezone(row.updatedAt, practiceTimezone)}
            </span>
          </span>
          <div className="flex items-center gap-2">
            {canRequestInput ? (
              <Button
                variant="outline"
                size="sm"
                onClick={openRequestInputDialog}
                disabled={requestInputMutation.isPending}
              >
                <MessageSquareText data-icon="inline-start" />
                <Trans>Request input</Trans>
              </Button>
            ) : null}
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
        // Chrome matches AlertDetailDrawer's panel-mode aside so both drawers
        // read as the same surface treatment:
        //   • `border-l` only — the panel is a sibling COLUMN, not a floating
        //     card; the left edge alone marks the boundary against the
        //     table/list area, and no corner radius lets it run edge-to-edge.
        //   • `bg-background-default` (white) — reads as paper-on-the-desk per
        //     the inset-surface system, not as a darker tile.
        //   • `relative min-h-0 overflow-hidden` so the sticky header/footer
        //     don't bleed and the body's own scroll surface establishes.
        //   • soft left-edge shadow — gestural "paper lifted off the desk".
        // The inner snapshot stays pinned via sticky positioning: the aside
        // itself stops scrolling, only the tabs-content area scrolls
        // underneath, so a user 30 docs deep in the Readiness checklist still
        // sees what row they're on.
        className="relative flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden border-l border-divider-subtle bg-background-default shadow-subtle"
      >
        {drawerBody}
      </aside>
    )
  }
  // Sheet mode: Radix provides backdrop, focus trap, scroll lock, Esc.
  // A visually-hidden SheetTitle satisfies Radix Dialog's a11y
  // requirement; the visible heading is the <h2> inside `drawerBody`.
  return (
    <Sheet open={obligationId !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent className="flex flex-col data-[side=right]:w-full data-[side=right]:max-w-[100vw] sm:data-[side=right]:w-[min(720px,calc(100vw-1rem))] md:data-[side=right]:w-[min(840px,calc(100vw-1.5rem))] xl:data-[side=right]:w-[min(920px,calc(100vw-2rem))] sm:data-[side=right]:max-w-none overflow-y-auto">
        <SheetTitle className="sr-only">{titleText ?? t`Deadline detail`}</SheetTitle>
        <SheetDescription className="sr-only">
          <Trans>Deadline workflow detail panel.</Trans>
        </SheetDescription>
        {drawerBody}
      </SheetContent>
    </Sheet>
  )
}

function DeadlineInputRequestDialog({
  open,
  recipients,
  selectedRecipientUserId,
  message,
  loadingRecipients,
  submitting,
  onOpenChange,
  onRecipientChange,
  onMessageChange,
  onSubmit,
}: {
  open: boolean
  recipients: readonly MemberAssigneeOption[]
  selectedRecipientUserId: string
  message: string
  loadingRecipients: boolean
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onRecipientChange: (recipientUserId: string) => void
  onMessageChange: (message: string) => void
  onSubmit: () => void
}) {
  const { t } = useLingui()
  const selectedRecipient =
    recipients.find((recipient) => recipient.assigneeId === selectedRecipientUserId) ?? null
  // Keep role-specific labels — collapsing manager/preparer/coordinator to
  // "Team member" would hide information the rest of the app exposes.
  const roleLabels = {
    owner: t`Owner`,
    partner: t`Partner`,
    manager: t`Manager`,
    preparer: t`Preparer`,
    coordinator: t`Coordinator`,
  } satisfies Record<MemberAssigneeOption['role'], string>
  const recipientTriggerText =
    selectedRecipient?.name ?? (loadingRecipients ? t`Loading team` : t`Choose recipient`)
  const submitDisabled =
    submitting || loadingRecipients || !selectedRecipientUserId || message.trim().length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-none p-0">
        <DialogHeader className="border-b border-divider-subtle px-6 py-5 pr-12">
          <DialogTitle>
            <Trans>Request input</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Send an internal request to an owner or partner for this deadline.</Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          {/* The recipient label is exposed via id so DropdownTriggerButton's
              aria-labelledby binds it for SR users. Rows ride Field +
              FieldLabel; the seat-warning "Add an active owner…" uses
              FieldDescription tone="warning" instead of a hand-rolled
              <p role=alert>. */}
          <Field>
            <FieldLabel id="deadline-input-request-recipient-label">
              <Trans>Recipient</Trans>
            </FieldLabel>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  // HEAD uses the canonical DropdownTriggerButton primitive
                  // (post Step 1-5 reaudit). Step 6 cont's `aria-labelledby`
                  // SR binding kept since the primitive accepts it.
                  <DropdownTriggerButton
                    size="lg"
                    aria-labelledby="deadline-input-request-recipient-label"
                    disabled={loadingRecipients || recipients.length === 0}
                  >
                    <span className="truncate">{recipientTriggerText}</span>
                    <ChevronDownIcon className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
                  </DropdownTriggerButton>
                }
              />
              <DropdownMenuContent align="start" className="max-h-72 w-[var(--anchor-width)]">
                <DropdownMenuRadioGroup
                  value={selectedRecipientUserId}
                  onValueChange={onRecipientChange}
                >
                  {recipients.map((recipient) => (
                    <DropdownMenuRadioItem key={recipient.assigneeId} value={recipient.assigneeId}>
                      <AssigneeAvatar name={recipient.name} title={recipient.name} size="xs" />
                      <span className="min-w-0 flex-1 truncate">{recipient.name}</span>
                      <span className="text-xs text-text-tertiary">
                        {roleLabels[recipient.role]}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                  {!loadingRecipients && recipients.length === 0 ? (
                    <DropdownMenuItem disabled>
                      <Trans>No owner or partner available</Trans>
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {!loadingRecipients && recipients.length === 0 ? (
              <FieldDescription tone="warning">
                <Trans>Add an active owner or partner before sending an input request.</Trans>
              </FieldDescription>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="deadline-input-request-message">
              <Trans>Message</Trans>
            </FieldLabel>
            <Textarea
              id="deadline-input-request-message"
              value={message}
              maxLength={1000}
              rows={5}
              placeholder={t`Add the decision or context you need.`}
              onChange={(event) => onMessageChange(event.currentTarget.value)}
            />
          </Field>
        </div>
        <DialogFooter className="border-t border-divider-subtle px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button type="button" onClick={onSubmit} disabled={submitDisabled} aria-busy={submitting}>
            {submitting ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <SendIcon data-icon="inline-start" />
            )}
            <Trans>Send request</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AuthorityRejectionDialog({
  open,
  draft,
  reasonError,
  submitting,
  onOpenChange,
  onDraftChange,
  onSubmit,
}: {
  open: boolean
  draft: AuthorityRejectionDraft
  reasonError: boolean
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onDraftChange: (patch: Partial<AuthorityRejectionDraft>) => void
  onSubmit: () => void
}) {
  const { t } = useLingui()
  const nextStepOptions: Array<{
    value: ObligationFiledRejectionNextStep
    label: string
    description: string
  }> = [
    {
      value: 'correct_resubmit',
      label: t`Correct and resubmit`,
      description: t`Keep this deadline in the In review workflow.`,
    },
    {
      value: 'request_client_input',
      label: t`Request client input`,
      description: t`Open Readiness after the rejection is recorded.`,
    },
    {
      value: 'paper_file',
      label: t`Switch to paper filing`,
      description: t`Use Evidence to track the paper filing packet.`,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(760px,calc(100vh-2rem))] w-[min(640px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-divider-subtle px-6 py-5 pr-12">
          <DialogTitle>
            <Trans>Record authority rejection</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Record the rejection details before moving this deadline back to In review.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 gap-4 overflow-y-auto px-6 py-5">
          {/* Reason's char counter rides FieldLabel as a trailing span —
              FieldLabel already gap-2's children so no extra flex row is
              needed; the w-full + justify-between recipe keeps the counter
              right-aligned. */}
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="authority-rejected-date">
                <Trans>Rejected date</Trans>
              </FieldLabel>
              <Input
                id="authority-rejected-date"
                type="date"
                value={draft.rejectedAt}
                onChange={(event) => onDraftChange({ rejectedAt: event.currentTarget.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="authority-rejected-authority">
                <Trans>Authority</Trans>
              </FieldLabel>
              <Input
                id="authority-rejected-authority"
                value={draft.authority}
                maxLength={80}
                placeholder={t`IRS / CA FTB`}
                onChange={(event) => onDraftChange({ authority: event.currentTarget.value })}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="authority-rejected-reference">
              <Trans>Reject code / notice reference</Trans>
            </FieldLabel>
            <Input
              id="authority-rejected-reference"
              value={draft.reference}
              maxLength={120}
              placeholder={t`Optional`}
              onChange={(event) => onDraftChange({ reference: event.currentTarget.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="authority-rejected-reason" className="w-full justify-between">
              <Trans>Reason</Trans>
              <span className="text-caption-xs tabular-nums font-normal text-text-tertiary">
                {draft.reason.length}/280
              </span>
            </FieldLabel>
            <Textarea
              id="authority-rejected-reason"
              value={draft.reason}
              maxLength={280}
              rows={4}
              aria-invalid={reasonError}
              aria-describedby={reasonError ? 'authority-rejected-reason-error' : undefined}
              placeholder={t`Summarize what the authority rejected and what needs correction.`}
              onChange={(event) => onDraftChange({ reason: event.currentTarget.value })}
            />
            {reasonError ? (
              <FieldError id="authority-rejected-reason-error">
                <Trans>Add a reason.</Trans>
              </FieldError>
            ) : null}
          </Field>
          <div className="grid gap-2">
            <span className="text-sm font-medium">
              <Trans>Next step</Trans>
            </span>
            <div role="radiogroup" className="grid gap-2">
              {nextStepOptions.map((option) => {
                const selected = draft.nextStep === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={cn(
                      'grid cursor-pointer gap-1 rounded-lg border px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                      selected
                        ? 'border-accent-default bg-state-accent-hover-alt'
                        : 'border-divider-subtle hover:bg-state-base-hover',
                    )}
                    onClick={() => onDraftChange({ nextStep: option.value })}
                  >
                    <span className="text-sm font-medium text-text-primary">{option.label}</span>
                    <span className="text-xs text-text-secondary">{option.description}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-divider-subtle px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button type="button" onClick={onSubmit} disabled={submitting} aria-busy={submitting}>
            {submitting ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <AlertTriangleIcon data-icon="inline-start" />
            )}
            <Trans>Record rejection</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MaterialsRequestPreviewDialog({
  open,
  preview,
  correctionMode,
  loading,
  errorMessage,
  sending,
  onOpenChange,
  onSend,
}: {
  open: boolean
  preview: ReadinessPreviewRequestEmailOutput | null
  correctionMode: boolean
  loading: boolean
  errorMessage: string | null
  sending: boolean
  onOpenChange: (open: boolean) => void
  onSend: () => void
}) {
  const emailStatus = preview?.recipientEmail ? (
    preview.emailWillBeQueued ? (
      <Badge variant="success">
        <Trans>Email will be queued</Trans>
      </Badge>
    ) : (
      <Badge variant="secondary">
        <Trans>Link only</Trans>
      </Badge>
    )
  ) : (
    <Badge variant="secondary">
      <Trans>No client email</Trans>
    </Badge>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(760px,calc(100vh-2rem))] w-[min(720px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-divider-subtle px-6 py-5 pr-12">
          <DialogTitle>
            <Trans>Preview materials request</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Review the email generated from the email template before creating the client
              materials link.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 gap-4 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : errorMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-state-danger-border bg-state-danger-hover p-3 text-sm text-text-danger"
            >
              {errorMessage}
            </p>
          ) : preview ? (
            <>
              <section className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
                    <Trans>Recipient</Trans>
                  </span>
                  {emailStatus}
                </div>
                <p className="rounded-lg border border-divider-subtle bg-background-subtle p-3 font-mono text-sm text-text-primary">
                  {preview.recipientEmail ?? <Trans>A materials link will be created only.</Trans>}
                </p>
                {!preview.emailWillBeQueued ? (
                  <p className="text-xs text-text-tertiary">
                    {preview.recipientEmail && !preview.templateActive ? (
                      <Trans>
                        The template is paused in Email Template settings, so no email will be
                        queued.
                      </Trans>
                    ) : (
                      <Trans>
                        The client can still receive the link manually after it is created.
                      </Trans>
                    )}
                  </p>
                ) : null}
              </section>
              <section className="grid gap-2">
                <span className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
                  <Trans>Subject</Trans>
                </span>
                <p className="rounded-lg border border-divider-subtle p-3 text-sm font-medium text-text-primary">
                  {preview.subject}
                </p>
              </section>
              <section className="grid gap-2">
                <span className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
                  <Trans>Email body</Trans>
                </span>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-divider-subtle bg-background-subtle p-3 font-mono text-xs leading-relaxed text-text-primary">
                  {preview.bodyText}
                </pre>
              </section>
              <div className="grid gap-3 md:grid-cols-2">
                <MaterialsRequestPreviewChecklist
                  title={
                    correctionMode ? <Trans>Needs correction</Trans> : <Trans>Outstanding</Trans>
                  }
                  items={preview.checklist.outstanding}
                />
                {correctionMode ? null : (
                  <MaterialsRequestPreviewChecklist
                    title={<Trans>Received</Trans>}
                    items={preview.checklist.received}
                  />
                )}
              </div>
            </>
          ) : null}
        </div>
        <DialogFooter className="border-t border-divider-subtle px-6 py-4">
          <Button variant="outline" render={<Link to="/reminders" />}>
            <ExternalLinkIcon data-icon="inline-start" />
            <Trans>Edit template in Email Template settings</Trans>
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button type="button" onClick={onSend} disabled={!preview || loading || sending}>
            <SendIcon data-icon="inline-start" />
            {preview?.emailWillBeQueued ? (
              correctionMode ? (
                <Trans>Send correction request</Trans>
              ) : (
                <Trans>Send request</Trans>
              )
            ) : (
              <Trans>Create materials link</Trans>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MaterialsRequestPreviewChecklist({
  title,
  items,
}: {
  title: ReactNode
  items: readonly ReadinessDocumentChecklistItemPublic[]
}) {
  return (
    <section className="grid content-start gap-2 rounded-lg border border-divider-subtle p-3">
      <header className="flex items-center gap-2">
        <h3 className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
          {title}
        </h3>
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-background-subtle px-1 text-caption-xs font-medium tabular-nums text-text-secondary">
          {items.length}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          <Trans>None</Trans>
        </p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.id} className="grid gap-0.5 text-sm">
              <span className="font-medium text-text-primary">{item.label}</span>
              {item.description ? (
                <span className="text-xs text-text-secondary">{item.description}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function EmptyPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-divider-regular p-4 text-sm text-text-tertiary',
        className,
      )}
    >
      {/* Step 9's branch had Penalty-sources rendering here (an older
          `_PenaltyBreakdownCard` shape); HEAD's `EmptyPanel` is now a
          simple children-wrapper. Step 9's block doesn't apply here.
          The `_penaltyFormulaDisplay` / `_penaltyFactsDisplay` orphans
          that lived directly below were also deleted as part of this
          merge (lint flagged the dangling `_` prefix on the diff). */}
      {children}
    </div>
  )
}

// The `_DeadlineTipPanel` + `InsightStatusBadge` + `InsightCitationChips`
// cluster was removed when the Risk tab went away. To revive deadline-tip
// insights, restore from `feat/step-9-ai-visibility-audit` and reintroduce
// the required imports (`AiInsightPublic`, `FileSearchIcon`,
// `UpgradeCtaButton`) + a real mount point.
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

// `ObligationQueueAuditEventCard` retired with the Audit/Timeline tab
// removal. Bring back when raw audit events surface somewhere again.

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

// `ObligationForwardingPanel` + `obligationForwardingAddress` retired with
// the inbound-routing Phase-2 stub. Restore when the email-thread-to-task
// pipeline ships.

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
  // The headline + subline branch on the lifecycle STAGE first, then on the
  // readiness enum within that stage — so the copy matches what the CPA is
  // actually doing at each phase. A flat "Ready to prep" / "Not ready" reads
  // awkwardly in Blocked / In review (where readiness is a watch-list signal)
  // and wrong in Filed / Completed (where the question is closed and the tab
  // is an audit trail). See the docs/dev-log entry for the full matrix.
  const { headline, subline }: { headline: string; subline: string } = (() => {
    // 1. Filed / Completed — historical record, audit trail mode.
    if (isTerminal) {
      if (checklistCount === 0) {
        return {
          headline: t`Filed`,
          subline: t`No document checklist was attached to this filing.`,
        }
      }
      // Terminal copy branches by ratio (complete archive vs partial vs
      // untracked) so a filed row with 0 received items doesn't read as
      // "we filed without any receipts" or "the audit trail is broken."
      if (receivedCount === 0) {
        return {
          headline: t`Filed`,
          subline: t`${checklistCount} checklist items weren't individually ticked during filing.`,
        }
      }
      if (receivedCount < checklistCount) {
        return {
          headline: t`Filed`,
          subline: t`${receivedCount} of ${checklistCount} items recorded as received before filing.`,
        }
      }
      return {
        headline: t`Filed`,
        subline: t`All ${checklistCount} items recorded as received.`,
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
            headline: t`All ${checklistCount} items received`,
            subline: t`Move to In review when ready to draft.`,
          }
        case 'blocked':
          return {
            headline: t`Materials side is fine`,
            subline: t`Blocked by upstream return — ${checklistCount} items in hand.`,
          }
        case 'review':
          return {
            headline: t`All ${checklistCount} items received`,
            subline: t`Drafting in progress with everything the client provided.`,
          }
        case 'pending':
        default:
          return {
            headline: t`All ${checklistCount} items received`,
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
            headline: t`Awaiting client response`,
            subline: t`Requested ${checklistCount} items from the client.`,
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
  // Terminal-state subline now renders as a description under the
  // "Materials checklist" heading instead of above it.
  if (isTerminal) return null
  // Tight spacing (no outer py-2, the parent grid supplies vertical rhythm)
  // because the headline is the only thing carrying section weight here — the
  // overview shouldn't take a third of the drawer's first screen.
  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full',
          isReady
            ? 'bg-state-success-solid'
            : needsCpaAction
              ? 'bg-state-warning-solid'
              : 'bg-background-subtle border border-divider-deep',
        )}
      >
        {isReady ? (
          <CheckCircle2Icon className="size-3 text-text-inverted" aria-hidden />
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
            isReady
              ? 'text-text-success'
              : needsCpaAction
                ? 'text-text-warning'
                : 'text-text-primary',
          )}
        >
          {headline}
        </p>
        <p className="pt-2 text-caption italic leading-snug text-text-tertiary">{subline}</p>
        {responseCount > 0 ? (
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

// PrimaryDeadlineStrip — the three dates the CPA reaches for first —
// Internal, Filing, Payment — at the top of the snapshot so they're
// answer-at-a-glance instead of buried under "Reference dates". Each column
// shows: small uppercase label / date in tabular-num / a small state tag
// (MISSED in red when the date is past, otherwise blank to keep the row
// quiet). Internal due is the primary CPA-internal deadline; Filing is the
// statutory; Payment is the authority-payment due.
function PrimaryDeadlineStrip({ row }: { row: ObligationQueueRow }) {
  const { i18n, t } = useLingui()
  const todayIso = todayIsoDate()
  // HERO (filing) + 2-column secondary (internal + payment) layout.
  //
  // Filing deadline is the date the IRS / state actually enforces, so it gets
  // a full-width dark hero card with the date in text-xl and a "in N days" /
  // "N days ago" countdown on the right. When the date is past
  // (daysUntilDue < 0 on a non-terminal row), the hero flips to a red surface
  // and the countdown becomes a "Missed" badge.
  //
  // Internal target + Payment due are secondary anchors stacked below the
  // hero in a 2-column grid with quiet bordered cards.
  //
  // Internal = the firm's earlier internal target —
  // extensionInternalTargetDate when set; falls back to currentDueDate capped
  // at <= filing so we never render internal LATER than the statutory anchor.
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
  // When the row is filed AND internal + payment dates match the filing date
  // (the common clean-filing case), render a single compact one-liner — "Filed
  // on <date> · N days ago" — and skip the redundant Internal / Payment cards,
  // since the 3-card strip would be 100+px of dates that all say the same
  // thing. Non-terminal rows + terminal rows with mixed dates keep the full
  // strip.
  // Suppress the compact-terminal collapse when the payment is overdue: the
  // compact strip hides the Payment tile (the dates all "match"), but a
  // Filed-but-payment-overdue row really does have a live signal on the
  // payment leg. Fall through to the full 3-tile strip so the Payment tile can
  // paint destructive.
  const hasOverduePayment =
    paymentIso !== null && paymentIso < todayIso && row.status !== 'completed'
  const allTerminalDatesMatch =
    isTerminal &&
    filingIso !== null &&
    internalIso === filingIso &&
    (paymentIso === null || paymentIso === filingIso) &&
    !hasOverduePayment
  if (allTerminalDatesMatch) {
    // No green chrome on the compact hero — the header status pill is the
    // single green-tone Filed anchor, so painting the hero strip green too
    // would make the green status appear multiple times. The hero is a quiet
    // strip with date data only and a small green ✓ icon as the state cue.
    return (
      <div
        aria-label={t`Filed on ${formatDate(filingIso)}`}
        // No frame on the compact hero — it's just info (date + relative
        // time), an inline row of text with a leading green check.
        className="flex flex-wrap items-center justify-between gap-3 py-1"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <ObligationStatusReadBadge status={row.status} />
          <span className="tabular-nums text-text-secondary">{formatDate(filingIso)}</span>
          {filingDays !== null && filingDays !== 0 ? (
            <>
              <span aria-hidden className="text-text-tertiary">
                ·
              </span>
              <span className="text-text-tertiary">
                {filingDays < 0 ? (
                  <Plural value={Math.abs(filingDays)} one="# day ago" other="# days ago" />
                ) : (
                  <Plural value={filingDays} one="in # day" other="in # days" />
                )}
              </span>
            </>
          ) : null}
        </div>
      </div>
    )
  }
  // All three deadlines share a single grid-cols-3 row with the same tile
  // shape — Filing always FIRST so it reads as the primary anchor, then
  // Internal, then Payment. The tile tone ladder carries urgency:
  //   • Filing on a missed row → bordered red tone (destructive border +
  //     tinted bg + red value).
  //   • Filing on terminal → success tone.
  //   • Other tiles → neutral white with a small red value when the
  //     individual date is past.
  // The "MISSED" word doesn't repeat as a separate badge inside the tile —
  // the header pill carries that text, and the tile's tone (red border +
  // tint) is the visual cue.
  // `'done'` (UI label "Filed") means the filing event is satisfied but the
  // payment may still be outstanding, so the "satisfied" check is split by
  // milestone — the FILING tile shouldn't paint red on a `'done'` row even
  // though its filing date is past; the red signal belongs on payment-due.
  const filingSatisfied = isTerminal || row.status === 'done' || row.status === 'paid'
  const filingPast = filingIso !== null && filingIso < todayIso && !filingSatisfied
  // Internal target overdueness is moot once the filing is satisfied —
  // the firm's earlier internal goal stops being actionable once the
  // statutory filing event has happened (Filed / Paid / Completed).
  // Gating on `filingSatisfied` (not `isTerminal`) keeps `'paid'` rows
  // from showing a red "INTERNAL TARGET N DAYS OVERDUE" chip beside a
  // green "Filed" status pill — the conflict the audit (L10) flagged.
  const internalPast = internalIso !== null && internalIso < todayIso && !filingSatisfied
  // Payment-overdue isn't gated by `isTerminal` / filing-satisfied. A row
  // that's been Filed (status='done') but whose payment date has slipped
  // should STILL paint the Payment tile destructive — penalty interest
  // accrues until the wire clears. Only `completed` and `not_applicable`
  // suppress red on the payment tile; `'paid'` is legacy and means payment
  // cleared, so don't repaint it as overdue.
  const paymentPast =
    paymentIso !== null &&
    paymentIso < todayIso &&
    row.status !== 'completed' &&
    row.status !== 'not_applicable' &&
    row.status !== 'paid'
  const filingLateDays = filingPast ? -dayDiff(filingIso)! : null
  const internalLateDays = internalPast ? -dayDiff(internalIso)! : null
  // Route the payment-late count through the canonical helper so the
  // panel tile agrees with the row chip (audit L10 off-by-one 72/73
  // came from the panel using `dayDiff` midnight math while the row
  // used `paymentOverdueDays` real-now math).
  const paymentLateDays = paymentOverdueDays(row, Date.now())
  const formatDaysOverdue = (d: number) =>
    i18n._(plural(d, { one: '# day overdue', other: '# days overdue' }))
  return (
    <div aria-label={t`Key deadlines`} className="grid grid-cols-3 gap-2">
      <DeadlineTile
        label={t`Filing deadline`}
        date={filingIso}
        tone={filingSatisfied ? 'success' : isMissed ? 'destructive' : 'primary'}
        primary
        valueTone={filingPast ? 'destructive' : 'primary'}
        {...(filingLateDays !== null && filingLateDays > 0
          ? { lateLabel: formatDaysOverdue(filingLateDays) }
          : {})}
      />
      <DeadlineTile
        label={t`Internal target`}
        date={internalIso}
        tone="neutral"
        valueTone={internalPast ? 'destructive' : 'primary'}
        {...(internalLateDays !== null && internalLateDays > 0
          ? { lateLabel: formatDaysOverdue(internalLateDays) }
          : {})}
      />
      <DeadlineTile
        label={t`Payment due`}
        date={paymentIso}
        tone={paymentPast ? 'destructive' : 'neutral'}
        valueTone={paymentPast ? 'destructive' : paymentIso ? 'primary' : 'tertiary'}
        {...(paymentLateDays !== null && paymentLateDays > 0
          ? { lateLabel: formatDaysOverdue(paymentLateDays) }
          : {})}
      />
    </div>
  )
}

// Canonical tile for the unified 3-column deadline strip. `tone` paints the
// surface (neutral white, success-tinted, destructive-tinted); `valueTone`
// colors the date itself (independent of surface so a non-terminal "internal
// target past" row can show a red value on a neutral surface).
function DeadlineTile({
  label,
  date,
  tone,
  valueTone,
  primary = false,
  lateLabel,
}: {
  label: string
  date: string | null
  tone: 'neutral' | 'success' | 'destructive' | 'primary'
  valueTone: 'primary' | 'destructive' | 'tertiary'
  primary?: boolean
  lateLabel?: string
}) {
  // The destructive tile uses a hairline red border + neutral surface (not a
  // filled red bg): the header pill ("18 days overdue"), the milestone-strip
  // In-review ring, AND the alert banner already carry the lateness signal, so
  // a fully-red tile would stack the alarm. A neutral surface with the date
  // value in red (via `valueTone`) + the destructive border keeps the cue
  // without flooding.
  const surfaceClass =
    tone === 'success'
      ? 'border-state-success-border bg-state-success-hover'
      : tone === 'destructive'
        ? 'border-divider-regular bg-background-default'
        : tone === 'primary'
          ? 'border-divider-regular bg-background-default'
          : 'border-divider-subtle bg-background-default'
  const labelToneClass = tone === 'success' ? 'text-text-success' : 'text-text-tertiary'
  const valueClass = valueTone === 'tertiary' ? 'text-text-tertiary' : 'text-text-primary'
  // Tile labels use the canonical eyebrow treatment — uppercase + tracking
  // — so "FILING DEADLINE / INTERNAL TARGET / PAYMENT DUE" read as TILE
  // LABELS (consistent with the rest of the drawer eyebrows + the
  // dashboard summary tiles). Date value uses the canonical sans + tabular-
  // nums (NOT font-mono — mono made the number read as "code-y" when it's
  // just a date; tabular-nums alone keeps columnar alignment).
  return (
    <div className={cn('flex flex-col gap-0.5 rounded-lg border px-2.5 py-1.5', surfaceClass)}>
      <span
        className={cn(
          // `text-caption-xs` not `text-caption-xs` — twMerge collapses
          // custom font-size tokens against `text-text-destructive`.
          'text-caption-xs leading-tight font-medium uppercase tracking-eyebrow-tight',
          labelToneClass,
          primary && 'font-semibold',
        )}
      >
        {label}
      </span>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <span className={cn('tabular-nums leading-tight', valueClass, 'text-sm font-semibold')}>
          {date ? formatDate(date) : '—'}
        </span>
        {lateLabel ? (
          <Badge
            variant="destructive"
            className="text-caption-xs font-medium uppercase tracking-eyebrow-tight"
          >
            {lateLabel}
          </Badge>
        ) : null}
      </div>
    </div>
  )
}

// FlatDateList — secondary dates only. The three primary dates the CPA
// reaches for first — Internal, Filing, Payment — live in the
// PrimaryDeadlineStrip at the top of the snapshot. This list carries
// everything else (period + create/touched timestamps + e-file pipeline
// timestamps) as a quiet reference surface under "Reference dates" at the
// bottom of the drawer.
//
// No `Statutory` row here — the PrimaryDeadlineStrip's `Filing deadline`
// resolves to `row.filingDueDate ?? row.baseDueDate` (the same baseDueDate
// when no separate filing date exists, which is most rows), so repeating it
// under "Reference dates" would duplicate the strip. E-file pipeline
// timestamps and tax period stay because they're not in the primary strip.
function FlatDateList({ row }: { row: ObligationQueueRow }) {
  const { t } = useLingui()
  const dateRows = useMemo(
    () => [
      // The reference-date list renders prose via `formatDatePretty` (e.g.
      // "May 9, 2026") instead of ISO — the drawer is a panel the user reads,
      // where ISO undermines the "finance-grade calm" feel. The queue row date
      // column keeps `formatDate` because that's a dense triage table where
      // ISO alignment + tabular-nums is the better trade.
      ...(row.efileSubmittedAt
        ? [
            {
              key: 'submitted',
              label: t`Submitted`,
              value: formatDatePretty(row.efileSubmittedAt.slice(0, 10)),
            },
          ]
        : []),
      ...(row.efileAcceptedAt
        ? [
            {
              key: 'accepted',
              label: t`Accepted`,
              value: formatDatePretty(row.efileAcceptedAt.slice(0, 10)),
            },
          ]
        : []),
      ...(row.efileRejectedAt
        ? [
            {
              key: 'rejected',
              label: t`Rejected`,
              value: formatDatePretty(row.efileRejectedAt.slice(0, 10)),
            },
          ]
        : []),
      {
        key: 'period',
        label: t`Tax period`,
        value: formatTaxPeriod(row.taxPeriodStart, row.taxPeriodEnd),
      },
      { key: 'created', label: t`Created`, value: formatDatePretty(row.createdAt.slice(0, 10)) },
      {
        key: 'updated',
        label: t`Last touched`,
        value: formatDatePretty(row.updatedAt.slice(0, 10)),
      },
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

// StatutoryDatesPanel — just the flat date list. There's no
// `YearStripTimeline` above the list: it duplicated the PathToFilingSummary at
// the top of the drawer (also a spatial lifecycle view) and was redundant with
// the explicit per-row dates here, so two timelines on the same screen
// competed for attention without adding signal. The component + its `clamp01`
// helper were removed entirely; git history has them if we ever need to revive
// the visualization for multi-year cycles.
function StatutoryDatesPanel({ row }: { row: ObligationQueueRow }) {
  return <FlatDateList row={row} />
}

// `stageIndexForStatus` + `mineStageTimestamps` + `STAGE_ANCHOR_STATUSES`
// retired. The old 5-step funnel vocabulary (Scope / Collecting / Preparing /
// Signature / Filed) was replaced by the 6-status lifecycle timeline below —
// same audit-event mining logic, new shape.

// Horizontal milestone timeline — 6 lifecycle stages with circles +
// connecting lines + labels. Replaces the prior collapsed disclosure
// (which hid the most useful audit-defense info behind a click).
//
// Vocabulary follows the lifecycle v2 status names so the timeline reads the
// same as the queue's status pills + the header status pill — no parallel
// "Scope / Collecting" jargon to translate.
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
    // Use "Waiting on client" (not the short "Waiting") so the strip matches
    // the queue pill + drawer header pill + readiness overview headline + v2
    // label hook — one name across every milestone surface.
    () =>
      [
        { key: 'pending', label: t`Not started` },
        { key: 'waiting_on_client', label: t`Waiting on client` },
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
  // OVERDUE only applies on PRE-TERMINAL stages. Once a row reaches Filed or
  // Completed the action has been taken, so calling the stage "OVERDUE" would
  // contradict the green Filed pill in the header and create a confusing mixed
  // signal (green pill + red ring on the same lifecycle moment). Lateness is
  // still visible in the dates panel via the red `Internal due` value — the
  // right surface for "was this filed on time?"
  //
  // `TIMELINE_TERMINAL_STAGE_KEYS` is hoisted to module scope (alongside
  // DUE_DAYS_TERMINAL_STATUSES) so it isn't reallocated on every render.
  // Sub-status annotation for the ACTIVE stage. Derived from existing
  // schema fields — no migration needed:
  //   waiting_on_client → row.prepStage (waiting_on_client /
  //     waiting_on_third_party / bookkeeping_cleanup / ready_for_prep)
  //   blocked          → row.blockedByObligationInstanceId (K-1) via
  //     existing BlockedByChip; a verbal hint here would duplicate that.
  //   review           → compact workflow from row.prepStage + row.reviewStage
  //     (preparing return / reviewing return / ready to file)
  //   done (filed)     → row.efileState (submitted → awaiting; accepted;
  //     rejected; paper_filed; final_package_delivered)
  // Returns null when no meaningful annotation exists. Renders as a
  // small text line beneath the state word ("ACTIVE / Awaiting IRS").
  const activeSubStatus = subStatusForActiveStage(row, t)
  return (
    <div aria-label={t`Milestone timeline`} className="pb-1">
      <div className="grid grid-cols-6 gap-0">
        {stages.map((stage, i) => {
          // The state map consults the audit-event stamps so the timeline
          // never shows a stage the row never sat in as "done" (a row going
          // Not started → In review directly must not show Waiting / Blocked
          // as ✓ completed):
          //   - `done`     past stage WITH a stamp → genuinely entered
          //   - `skipped`  past stage WITHOUT a stamp → bypassed
          //   - `active`   the row's current stage
          //   - `upcoming` stage the row hasn't reached yet
          // `skipped` renders as a smaller muted dot — visually distinct from
          // both filled-success "done" and the empty ring of "upcoming."
          //
          // Stage 0 is special: every row is born at "Not started" so an empty
          // stamp there still counts as entered. The row's createdAt is the
          // implicit stamp.
          const state: 'done' | 'skipped' | 'active' | 'upcoming' =
            i === currentIndex
              ? 'active'
              : i < currentIndex
                ? stamps[i] !== null || i === 0
                  ? 'done'
                  : 'skipped'
                : 'upcoming'
          // Date resolution (milestone-timeline-prd.md §3):
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
              {/* Milestone strip rhythm:
                    — Connectors are a DOTTED hairline (not solid 2px bars) so
                      the strip reads as "stages on a thin track", not "stages
                      connected by a pipe".
                    — Completed circles use a soft success-hover bg + small
                      green tick (not a bold green fill) so the finished state
                      doesn't dominate.
                    — Active stage uses a stronger accent ring; no inner dot,
                      since the ring + bold stage label carry the active signal
                      alone. */}
              <div className="flex w-full items-center gap-1">
                <span
                  aria-hidden
                  className={cn(
                    'h-0 flex-1 border-t border-dotted',
                    // The left-side connector represents the edge into THIS
                    // stage. Green only when both this stage and the prior one
                    // were genuinely entered (or active) — so skipped stages
                    // keep the edge muted on both sides.
                    (() => {
                      if (i === 0) return 'opacity-0'
                      const thisEntered = state === 'done' || state === 'active'
                      const prevIdx = i - 1
                      const prevEntered =
                        prevIdx === currentIndex ||
                        (prevIdx < currentIndex && (prevIdx === 0 || stamps[prevIdx] !== null))
                      return thisEntered && prevEntered
                        ? 'border-divider-strong'
                        : 'border-divider-regular'
                    })(),
                  )}
                />
                {/* The stage indicator uses STAGE-SPECIFIC lucide icons so the
                    milestone strip tells the story by icon identity, not just
                    a generic check/dot. State (done/active/skipped/upcoming)
                    maps to tone separately:
                      - done   = bg success-hover + text success-solid
                      - active = bg accent-hover + text accent-solid + ring
                      - skipped = dashed border + text tertiary
                      - upcoming = empty bg + text tertiary
                    So a Filed-active stage stays visually distinct from a
                    Completed-upcoming stage by both icon identity AND tone. */}
                <span
                  aria-hidden
                  className={cn(
                    // No `ring-1` outer ring on `active` / `overdueActive` —
                    // the border + tint + icon identity already convey "this is
                    // the current stage", and an extra ring read as a
                    // double-bordered chip shouting too hard against the calmer
                    // done/upcoming neighbors.
                    'grid size-6 shrink-0 place-items-center rounded-full border',
                    state === 'done'
                      ? 'border-divider-regular bg-background-default text-text-secondary'
                      : state === 'skipped'
                        ? 'border-dashed border-divider-regular bg-background-default text-text-tertiary/60'
                        : overdueActive
                          ? 'border-state-destructive-solid bg-state-destructive-hover text-text-destructive'
                          : state === 'active'
                            ? 'border-accent-default bg-state-accent-hover text-text-accent'
                            : 'border-divider-regular bg-background-default text-text-tertiary/70',
                  )}
                >
                  {(() => {
                    // The stage icon set aligns with the canonical STATUS_ICON
                    // map (status-control.tsx) — e.g. the pending stage uses
                    // Loader (not CircleDashed) so it's consistent with the row
                    // pill, the scope tabs, and the status dropdown.
                    const StageIcon = (
                      stage.key === 'pending'
                        ? Loader
                        : stage.key === 'waiting_on_client'
                          ? Hourglass
                          : stage.key === 'blocked'
                            ? Construction
                            : stage.key === 'review'
                              ? MessageSquareText
                              : stage.key === 'done'
                                ? FileCheck
                                : CircleCheck
                    ) as React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
                    return <StageIcon className="size-3.5" aria-hidden />
                  })()}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'h-0 flex-1 border-t border-dotted',
                    // The right-side connector represents the edge into stage
                    // i+1. Green only when BOTH stage i was entered (or active)
                    // AND stage i+1 was entered (or active) — i.e. the row
                    // actually crossed this edge. Skipped stages on either end
                    // keep the edge muted.
                    (() => {
                      if (i === stages.length - 1) return 'opacity-0'
                      const thisEntered = state === 'done' || state === 'active'
                      const nextIdx = i + 1
                      const nextEntered =
                        nextIdx === currentIndex ||
                        (nextIdx < currentIndex && stamps[nextIdx] !== null)
                      return thisEntered && nextEntered
                        ? 'border-divider-strong'
                        : 'border-divider-regular'
                    })(),
                  )}
                />
              </div>
              {/* Stage label is text-caption-xs (10px) to match the date
                  below, so the column scales feel balanced. Active state keeps
                  font-medium for weight contrast. */}
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
              {/* Date + state + sub-status grouped into a single block with a
                  gap from the stage label above (a child flex column with
                  internal `gap-0.5`) so the stage name (e.g. "Filed") and the
                  date + Overdue/Expected detail below read as two distinct
                  units. The inner block renders for EVERY column with
                  consistent height — empty columns reserve space via &nbsp;
                  placeholders so the timeline reads as a level baseline across
                  all six stages instead of a ragged active-tall /
                  upcoming-short pattern. Stages with no date render a
                  non-breaking space (not an em-dash) so the baseline stays
                  consistent without "—" noise. No "ACTIVE" word — it's
                  redundant against the bold stage label + ring; only "Overdue"
                  (destructive, when the active stage is past internal due) and
                  "Expected" (tertiary, projecting the Filed milestone forward)
                  render. mt-1 keeps the date close enough to read as one unit
                  with the stage label. */}
              <div className="mt-1 flex w-full flex-col items-center gap-0.5">
                <span
                  // Date is text-micro — one step smaller than the
                  // caption-xs stage label above, so the label keeps visual
                  // primacy and the date reads as meta.
                  className={cn(
                    'text-center text-micro tabular-nums leading-none',
                    state === 'active' ? 'text-text-primary' : 'text-text-tertiary',
                  )}
                  // Hover hint surfaces the date-resolution policy in plain
                  // language for blank cells (skipped / non-Filed upcoming) so
                  // the empty space doesn't read as a missing-data bug.
                  title={emptyDateHint}
                >
                  {(state === 'done' || state === 'active' || isExpected) && stamp
                    ? formatDate(stamp.slice(0, 10))
                    : ' '}
                </span>
                {overdueActive ? (
                  // The OVERDUE label ties back to the canonical thing that's
                  // late — the FIRM'S internal target date — so a CPA scanning
                  // the strip sees both the urgency cue and the noun; hover
                  // spells out the exact days-late count + the deadline date.
                  // Toned to text-text-secondary (not destructive): the
                  // destructive-toned In-review CIRCLE above is already the red
                  // signal at this stage, so red caption copy underneath would
                  // read as a shout. The word still says "Past deadline" —
                  // readable in any tone.
                  <span
                    className="text-center text-caption-xs font-medium uppercase tracking-wide leading-tight text-text-secondary"
                    title={t`Filing was due ${formatDatePretty(row.currentDueDate.slice(0, 10))} · ${Math.abs(row.daysUntilDue)} days past deadline.`}
                  >
                    <Trans>Past deadline</Trans>
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

function AuthorityResponsePanel({
  row,
  auditEvents,
  accepting,
  rejecting,
  onConfirmAccepted,
  onRecordRejection,
  onChangeTab,
}: {
  row: ObligationQueueRow
  auditEvents: readonly AuditEventPublic[]
  accepting: boolean
  rejecting: boolean
  onConfirmAccepted: () => void
  onRecordRejection: () => void
  onChangeTab: (tab: ObligationQueueDetailTab) => void
}) {
  const { t } = useLingui()
  const rejection = useMemo(() => latestAuthorityRejectionAudit(auditEvents), [auditEvents])

  // Completed rows surface the authority response inline in
  // ActiveStageDetailCard's header — no separate panel here.
  if (row.status === 'completed') return null

  if (row.status === 'review' && row.efileRejectedAt !== null) {
    const rejectedAt = rejection?.rejectedAt ?? row.efileRejectedAt
    const nextStep = rejection?.nextStep ?? 'correct_resubmit'
    const action =
      nextStep === 'request_client_input'
        ? {
            label: t`Request client input`,
            tab: 'readiness' as const,
          }
        : nextStep === 'paper_file'
          ? {
              label: t`Switch to paper filing`,
              tab: 'evidence' as const,
            }
          : null

    return (
      <section className="grid gap-3 rounded-lg border border-state-danger-border bg-state-danger-hover px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-text-primary">
              <Trans>Correction needed</Trans>
            </p>
            <p className="text-sm text-text-secondary">
              <Trans>Rejected by authority</Trans>
              {rejectedAt ? <> · {formatDatePretty(rejectedAt.slice(0, 10))}</> : null}
            </p>
          </div>
          <Badge variant="destructive">
            <AlertTriangleIcon className="size-3" aria-hidden />
            <Trans>Rejected</Trans>
          </Badge>
        </div>
        {rejection?.reason || rejection?.authority || rejection?.reference ? (
          <dl className="grid gap-2 text-sm md:grid-cols-3">
            {rejection.authority ? (
              <div className="grid gap-0.5">
                <dt className="text-caption-xs font-medium uppercase tracking-wide text-text-tertiary">
                  <Trans>Authority</Trans>
                </dt>
                <dd className="text-text-primary">{rejection.authority}</dd>
              </div>
            ) : null}
            {rejection.reference ? (
              <div className="grid gap-0.5">
                <dt className="text-caption-xs font-medium uppercase tracking-wide text-text-tertiary">
                  <Trans>Reference</Trans>
                </dt>
                <dd className="text-text-primary">{rejection.reference}</dd>
              </div>
            ) : null}
            {rejection.reason ? (
              <div className="grid gap-0.5 md:col-span-3">
                <dt className="text-caption-xs font-medium uppercase tracking-wide text-text-tertiary">
                  <Trans>Reason</Trans>
                </dt>
                <dd className="text-text-primary">{rejection.reason}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {action ? (
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChangeTab(action.tab)}
            >
              {action.label}
            </Button>
          </div>
        ) : null}
      </section>
    )
  }

  if (row.status !== 'done') return null

  return (
    <section className="grid gap-3 rounded-lg border border-divider-subtle bg-background-default px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-text-primary">
            <Trans>Authority response</Trans>
          </p>
          <p className="text-sm text-text-secondary">
            <Trans>Awaiting authority acceptance</Trans>
          </p>
        </div>
        <Badge variant="warning">
          <Clock className="size-3" aria-hidden />
          <Trans>Pending</Trans>
        </Badge>
      </div>
      <p className="text-sm text-text-secondary">
        <Trans>
          Filed means the return was submitted to the authority. Keep it open until the authority
          accepts or rejects it.
        </Trans>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onConfirmAccepted}
          disabled={accepting || rejecting}
          aria-busy={accepting}
        >
          {accepting ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <CheckCircle2Icon data-icon="inline-start" />
          )}
          <Trans>Confirm authority accepted</Trans>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRecordRejection}
          disabled={accepting || rejecting}
        >
          <AlertTriangleIcon data-icon="inline-start" />
          <Trans>Record authority rejection</Trans>
        </Button>
      </div>
    </section>
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

// `StageTask` and `StageActions` (the render component) live in
// `@/features/obligations/StageActions`. The flavor system + rendering
// rules are documented there. ActiveStageDetailCard's useMemo below
// builds the per-stage task list.
//
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

// In-Review workflow shown to CPAs. The database keeps finer-grained
// prep/review columns for auditability, but the drawer should not
// expose every internal flag as a separate "step" — it made freshly
// generated review rows look like they had already jumped to step 4.
// Collapse the work into the three business states a preparer expects:
// prepare the return, review the return, then file it.
const REVIEW_PIPELINE_KEYS = ['preparing_return', 'reviewing_return', 'ready_to_file'] as const
type ReviewPipelineKey = (typeof REVIEW_PIPELINE_KEYS)[number]

export function reviewPipelineCurrent(
  row: Pick<ObligationQueueRow, 'prepStage' | 'reviewStage'>,
): ReviewPipelineKey {
  if (row.reviewStage === 'approved') return 'ready_to_file'
  if (row.prepStage === 'in_prep' && row.reviewStage !== 'in_review') return 'preparing_return'
  if (
    row.reviewStage === 'in_review' ||
    row.reviewStage === 'notes_open' ||
    row.prepStage === 'prepared' ||
    row.prepStage === 'ready_for_prep'
  ) {
    return 'reviewing_return'
  }
  return 'preparing_return'
}

export function countOutstandingReadinessDocuments(
  checklist: readonly Pick<ReadinessDocumentChecklistItemPublic, 'status'>[],
): number {
  return checklist.filter((item) => item.status !== 'received').length
}

export function willReadinessChecklistBeFullyReceived(
  checklist: readonly Pick<ReadinessDocumentChecklistItemPublic, 'id' | 'status'>[],
  receivedItemIds: ReadonlySet<string>,
): boolean {
  return (
    checklist.length > 0 &&
    // Waived items count as satisfied alongside received ones.
    checklist.every(
      (item) =>
        item.status === 'received' || item.status === 'waived' || receivedItemIds.has(item.id),
    )
  )
}

function normalizeMaterialsReferenceValue(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

function materialsReferenceSearchValue(
  row: Pick<ObligationQueueRow, 'taxType' | 'formName' | 'obligationType'>,
): string {
  return [row.taxType, row.formName, row.obligationType]
    .map(normalizeMaterialsReferenceValue)
    .filter(Boolean)
    .join('_')
}

function matchesMaterialsReference(value: string, fragments: readonly string[]): boolean {
  return fragments.some((fragment) => value.includes(fragment))
}

export function materialsChecklistReference(
  row: Pick<ObligationQueueRow, 'taxType' | 'formName' | 'obligationType'>,
): string | null {
  const value = materialsReferenceSearchValue(row)
  if (
    matchesMaterialsReference(value, ['1040_es', '1040_estimated_tax', 'individual_estimated_tax'])
  ) {
    return row.formName?.trim() || 'Form 1040-ES'
  }
  if (
    matchesMaterialsReference(value, [
      '1040',
      'individual_income_tax',
      'state_individual_income_tax',
      'schedule_c',
      'sch_c',
    ])
  ) {
    return 'Form 1040'
  }
  return null
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

// WaitingOutstandingDocs component retired. The full panel (count header +
// bullet list of doc names + routing button) duplicated content from the
// Client readiness tab. Replaced inline in ActiveStageDetailCard with a
// one-line signal that links to the tab; the tab owns the actual document
// inventory.

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
  onMarkSigned,
  onRemindSignature,
  onSubmitEfile,
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
  // P0 signature loop: advance efileState → authorization_signed.
  onMarkSigned: () => void
  // P0: email the client a Form 8879 signature reminder.
  onRemindSignature: () => void
  // P0: e-file the signed return (efileState → submitted).
  onSubmitEfile: () => void
}) {
  const { t } = useLingui()
  // For the `blocked` stage's "Open blocking obligation" action.
  // Routes to the drawer for whichever upstream row blocks this one
  // (row.blockedByObligationInstanceId). Same provider the queue +
  // client-detail surfaces use, so the navigation is consistent.
  const { openDrawer } = useObligationDrawer()
  const stageIdx = timelineIndexForStatus(row.status)
  const stageKey: TimelineStageKey = TIMELINE_STAGE_KEYS[stageIdx] ?? 'pending'
  // Use "Waiting on client" so this card's header label matches the strip
  // above it, the queue pill, and the v2 label hook (see PathToFilingSummary
  // for the matching label on the strip).
  const stageLabels: Record<TimelineStageKey, string> = {
    pending: t`Not started`,
    waiting_on_client: t`Waiting on client`,
    blocked: t`Blocked`,
    review: t`In review`,
    done: t`Filed`,
    completed: t`Completed`,
  }
  const stageLabel = stageLabels[stageKey]
  // The stage card carries a WAITING header + a single one-line signal
  // ("3 docs outstanding · Open Client readiness →") + the primary "Mark
  // client docs received" button. There's no full outstanding-docs panel —
  // that data lives on the Client readiness tab, not duplicated here.
  // Sub-status reads "Awaiting client · N days so far" so the header is honest
  // about *time elapsed*, not just a generic "waiting on docs" repeat of the
  // count line.
  const isWaitingStage = stageKey === 'waiting_on_client'
  const isWaitingDocsCase = isWaitingStage && row.prepStage === 'waiting_on_client'
  // Outstanding docs count powers the inline signal in the Waiting
  // card body. Same filter logic the old WaitingOutstandingDocs panel
  // used (anything not yet `received`), just without the bullet list.
  const outstandingDocsCount = useMemo(
    () => countOutstandingReadinessDocuments(readinessChecklist),
    [readinessChecklist],
  )
  const allReadinessDocsReceived = useMemo(
    () => willReadinessChecklistBeFullyReceived(readinessChecklist, new Set<string>()),
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
        if (row.reviewStage === 'notes_open') return t`Review notes open`
        if (reviewPipelineCurrent(row) === 'ready_to_file') return t`Ready to file`
        if (reviewPipelineCurrent(row) === 'reviewing_return') return t`Reviewing return`
        return t`Preparing return`
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
  // P0: most-recent Form 8879 signature-reminder timestamp, for the "last
  // reminded N days ago" line on the awaiting-signature stage card.
  // Derived from the audit log — no dedicated column.
  const lastSignatureReminderAt = useMemo(() => {
    let latest: string | null = null
    for (const event of auditEvents) {
      if (event.action !== 'obligation.signature.reminded') continue
      if (!latest || event.createdAt > latest) latest = event.createdAt
    }
    return latest
  }, [auditEvents])
  const reviewCurrent = reviewPipelineCurrent(row)
  const notesOpen = row.reviewStage === 'notes_open'
  const tasks: StageTask[] = useMemo(() => {
    switch (stageKey) {
      case 'pending':
        // Not Started offers two explicit paths instead of a single "Start
        // drafting" that would jump straight to In review, skipping Waiting.
        // Per the canonical CPA workflow (engagement → request docs → wait →
        // receive → prep → review → file) most rows need a "Request docs from
        // client" step first, so the paths are honest about which situation
        // applies: "Request documents from client" for brand-new rows, "Start
        // drafting the return" for the rarer case where docs are in hand.
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
            {
              id: 'mark-blocked',
              label: t`Mark blocked`,
              flavor: 'mutation',
              hint: t`Use when another return, notice, or issue is stopping this deadline.`,
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
            {
              id: 'mark-blocked',
              label: t`Mark blocked`,
              flavor: 'mutation',
              hint: t`Use when another return, notice, or issue is stopping this deadline.`,
            },
          ]
        }
        // A primary mutation plus a quiet escape hatch for genuine blocker
        // cases. The routing affordance (open Materials tab) lives in the
        // inline signal line in the card body; there's no manual chase
        // reminder because "Send reminder" is the same action surfaced from
        // the Materials tab itself.
        return [
          {
            id: 'received',
            label: t`Mark materials received`,
            flavor: 'mutation',
            primary: true,
          },
          {
            id: 'mark-blocked',
            label: t`Mark blocked`,
            flavor: 'mutation',
            hint: t`Use when another return, notice, or issue is stopping this deadline.`,
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
        if (reviewCurrent === 'preparing_return') {
          return [
            {
              id: 'send-review',
              label: t`Send to review`,
              flavor: 'mutation',
              primary: true,
              hint: t`Use after the preparer has finished the draft.`,
            },
          ]
        }
        if (reviewCurrent === 'reviewing_return') {
          if (notesOpen) {
            return [
              {
                id: 'mark-notes-addressed',
                label: t`Mark notes addressed`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          }
          return [
            {
              id: 'approve-return',
              label: row.efileRejectedAt !== null ? t`Approve corrected return` : t`Approve return`,
              flavor: 'mutation',
              primary: true,
            },
            {
              id: 'leave-review-note',
              label: t`Leave note for preparer`,
              flavor: 'mutation',
            },
          ]
        }
        // No 8879 routing task here — the app doesn't yet support sending or
        // collecting client e-file authorization, so routing to Evidence from
        // In review would create a dead-end workflow.
        return [
          {
            id: 'file',
            label: t`Mark return submitted to authority`,
            flavor: 'mutation',
            primary: true,
          },
        ]
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
              // P0: both wired now. Primary = advance the pipeline once
              // the client signs; secondary = chase them until they do.
              {
                id: 'mark-signed',
                label: t`Mark 8879 signed`,
                flavor: 'mutation',
                primary: true,
              },
              {
                id: 'remind-8879',
                label: t`Remind client to sign the 8879`,
                flavor: 'mutation',
              },
            ]
          case 'authorization_signed':
          case 'ready_to_submit':
            // Client signed → the next move is to e-file with the
            // authority. Primary, wired action (efileState →
            // `submitted`); the Authority response panel then handles
            // acceptance / rejection.
            return [
              {
                id: 'submit',
                label: t`E-file the return with the tax authority`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          case 'submitted':
            // Acceptance/rejection are captured by the dedicated
            // Authority response panel above this card. Keep the stage
            // detail focused on status chronology so the drawer does
            // not show duplicate decision points.
            return []
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
            return []
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
            return []
        }
      }
      case 'completed':
        return []
      default:
        return []
    }
  }, [
    stageKey,
    row.status,
    row.prepStage,
    row.efileState,
    row.efileRejectedAt,
    row.paymentState,
    reviewCurrent,
    notesOpen,
    t,
  ])
  const stageEnteredAt =
    stageEvents.length > 0 ? stageEvents[stageEvents.length - 1]!.createdAt : null
  // Past stages — every stage the row visited BEFORE the active one.
  // Collapsed by default; one click reveals the audit events for that
  // stage. The CPA sees the chronology without losing the active-card
  // focus. Single-expand-at-a-time keeps the panel from ballooning.
  const pastEntries = useMemo(() => computePastStageEntries(auditEvents), [auditEvents])
  const [expandedPast, setExpandedPast] = useState<string | null>(null)
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
  // Step labels stay at the business-workflow altitude. The underlying
  // data still tracks ready_for_prep / prepared / notes_open, but CPAs
  // only need the three decisions they can act on from this card.
  const reviewPipelineLabels: Record<ReviewPipelineKey, string> = {
    preparing_return: t`Preparing return`,
    reviewing_return: t`Reviewing return`,
    ready_to_file: t`Ready to file`,
  }
  // Task click dispatcher. Sub-status mutations (efileState /
  // paymentState / prepStage / reviewStage) don't have RPC procedures
  // yet — those tasks fall through to a toast placeholder. Status-
  // level transitions (review / done / completed) and the special
  // markAccepted / markFiledRejected calls are wired to the
  // mutations the drawer already owns.
  const handleTaskClick = (task: StageTask) => {
    switch (task.id) {
      // Status → review (start work / unpause / unblock / resume)
      // `start` = "Skip ahead to drafting" from Not started. This bypasses
      // the materials collection workflow. Confirm before flipping so a
      // misclick doesn't commit the audit trail to "zero items received."
      case 'start':
        return toast.warning(t`Skip materials collection?`, {
          description: t`Use this only when the client documents are already in hand. The audit trail will show no checklist items were ticked.`,
          action: {
            label: t`Skip to drafting`,
            onClick: () => onChangeStatus('review'),
          },
        })
      case 'resume':
      case 'unblocked':
        return onChangeStatus('review')
      case 'received':
        if (!allReadinessDocsReceived) {
          onChangeTab('readiness')
          if (outstandingDocsCount > 0) {
            return toast.info(t`Materials still outstanding`, {
              description: plural(outstandingDocsCount, {
                one: '# item still needs to be received before moving to In review.',
                other: '# items still need to be received before moving to In review.',
              }),
              action: {
                label: t`Check materials`,
                onClick: () => onChangeTab('readiness'),
              },
            })
          }
          return
        }
        return onChangeStatus('review')
      case 'mark-blocked':
        return onChangeStatus('blocked')
      // Status → waiting_on_client. Also opens the Readiness tab so
      // the CPA can immediately send the document request from the
      // place it actually lives. The status flip happens first; the
      // tab change runs in the same tick so the CPA lands on the
      // Readiness surface with the row already in the Waiting stage.
      case 'request-docs':
        onChangeStatus('waiting_on_client')
        onChangeTab('readiness')
        return
      case 'send-review':
        return onChangePrepStage('prepared')
      case 'approve-return':
        return onChangeReviewStage('approved')
      case 'leave-review-note':
        return onChangeReviewStage('notes_open')
      case 'mark-notes-addressed':
        return onChangeReviewStage('in_review')
      // P0 signature loop (efileState authorization_requested →
      // authorization_signed when the client returns their signed 8879).
      case 'mark-signed':
        return onMarkSigned()
      // P0: email the client a Form 8879 signature reminder.
      case 'remind-8879':
        return onRemindSignature()
      // P0: signed → e-file with the authority (efileState → submitted).
      case 'submit':
        return onSubmitEfile()
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
  // Require an ACTIVE sub-state before rendering the STEPS list — otherwise a
  // freshly-filed obligation that hasn't entered any e-file or payment
  // sub-stage (e.g. a partnership return where status=done but efileState is
  // null) shows a column of 4-6 empty/dim sub-steps that reads as "nothing's
  // happening." In that case the stage card collapses to a compact info box.
  const efileStateSet =
    row.efileState !== null && row.efileState !== undefined && row.efileState !== 'not_applicable'
  const paymentStateSet =
    row.paymentState !== null &&
    row.paymentState !== undefined &&
    row.paymentState !== 'not_applicable'
  const showEfilePipeline = stageKey === 'done' && row.status !== 'paid' && efileStateSet
  const showPaymentPipeline = stageKey === 'done' && row.status === 'paid' && paymentStateSet
  // In Review keeps a compact three-state strip. The detailed
  // prepStage/reviewStage values are still useful for audit and undo,
  // but showing all six internal flags made normal rows look more
  // advanced than they really were.
  const showReviewPipeline = stageKey === 'review'
  // When the active stage is past the firm's internal target date, surface
  // that fact INSIDE the stage card body so a CPA reading "In review" /
  // "Waiting" / "Blocked" sees the missed-deadline context next to the
  // actions, not only on the milestone strip above. Terminal stages (Filed /
  // Completed) don't get the banner — by then the work is closed and the
  // Internal due date cell carries the historical lateness stat.
  const isPastInternalDue = row.daysUntilDue < 0
  const showOverdueBanner = isPastInternalDue && !TIMELINE_TERMINAL_STAGE_KEYS.has(stageKey)
  const daysPastDeadline = Math.abs(row.daysUntilDue)
  return (
    <section
      aria-label={t`Active stage detail`}
      // Light tinted background (bg-background-section, not pure white) so the
      // card reads as the "deep-dive zone for the current stage" without going
      // full color. No `border` ring — the panel was already stacking four
      // near-rules in close proximity (status-strip bottom border + tab-bar
      // baseline + card outline + inner Key dates outline), and the tint vs the
      // panel's white provides the separation without another rule.
      className="rounded-lg bg-background-section p-4"
    >
      {/* Header: stage name + sub-status + when we entered this stage. The
          stage label is title-case at text-base (no uppercase tracking-wider)
          so "Waiting" / "Blocked" / "In review" read as honest noun phrases
          matching the milestone strip labels above, and as the h3 of this card
          rather than inline chrome. The sub-status follows on the same line
          with a thin dot separator; "Entered DATE" sits on the same row with
          justify-between, pinned right, at text-xs quiet meta. */}
      <header className="flex items-baseline justify-between gap-3">
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
        <div className="flex shrink-0 items-center gap-2">
          {row.status === 'completed' ? (
            <Badge
              variant="success-solid"
              className="text-caption-xs"
              title={
                row.efileAcceptedAt
                  ? `${t`Authority accepted the return`} · ${formatDatePretty(row.efileAcceptedAt.slice(0, 10))}`
                  : t`Authority accepted the return`
              }
            >
              <CheckCircle2Icon className="size-3" aria-hidden />
              <Trans>Accepted</Trans>
            </Badge>
          ) : null}
          {stageEnteredAt ? (
            <p className="text-xs text-text-tertiary">
              <Trans>Entered {formatDatePretty(stageEnteredAt.slice(0, 10))}</Trans>
            </p>
          ) : null}
        </div>
      </header>
      {/* P0: chase visibility on the awaiting-signature card — how long
          since we last nudged the client to sign their 8879. */}
      {row.status === 'done' &&
      row.efileState === 'authorization_requested' &&
      lastSignatureReminderAt ? (
        <p className="text-xs text-text-tertiary">
          {(() => {
            const today = new Date().toISOString().slice(0, 10)
            const days = daysBetween(lastSignatureReminderAt.slice(0, 10), today)
            if (days <= 0) return t`Last reminded today`
            if (days === 1) return t`Last reminded · 1 day ago`
            return t`Last reminded · ${days} days ago`
          })()}
        </p>
      ) : null}

      {/* The banner ties the stage back to the missed date with a real noun
          ("Filing was due …") + a concrete days-late count + the two
          actionable verbs (submit, file an extension), so a CPA scanning the
          card doesn't have to infer urgency from the milestone strip alone. On
          terminal stages the banner hides — once the work is closed,
          late-vs-on-time is a quality stat, not a call-to-action. */}
      {showOverdueBanner ? (
        // Neutral surface (not a filled red bg) so the banner isn't the
        // loudest element on the panel: the red AlertTriangle + red title line
        // carry the urgency cue, and the action line drops to text-secondary so
        // the eye lands on the urgent line first and "what to do" reads as a
        // calmer follow-up.
        <div
          role="status"
          className="mt-3 flex flex-col gap-0.5 rounded-lg border border-divider-regular bg-background-default px-3 py-2 text-sm leading-snug"
        >
          <p className="font-medium text-text-primary">
            <Trans>
              Filing was due {formatDatePretty(row.currentDueDate.slice(0, 10))} —{' '}
              <Plural value={daysPastDeadline} one="# day" other="# days" /> past deadline.
            </Trans>
          </p>
          <p className="text-xs text-text-secondary">
            <Trans>Submit the return now, or file an extension if eligible.</Trans>
          </p>
        </div>
      ) : null}

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
      {/* Auto-unblock context — when the row is Not started because a
          parent cascade just cleared it, surface the why so the
          assignee knows the row moved on its own. Banner is durable
          (not a toast) because the user may land on the row days
          later. Disappears as soon as any subsequent status change
          happens (then the banner is no longer the latest signal). */}
      {stageKey === 'pending'
        ? (() => {
            const autoUnblockEvent = auditEvents.find(
              (event) => event.action === 'obligation.status.auto_unblocked',
            )
            const latestStatusEvent = auditEvents.find(
              (event) =>
                event.action === 'obligation.status.updated' ||
                event.action === 'obligation.status.auto_unblocked',
            )
            if (
              !autoUnblockEvent ||
              !latestStatusEvent ||
              latestStatusEvent.id !== autoUnblockEvent.id
            ) {
              return null
            }
            return (
              <div className="mt-3 rounded-lg border border-divider-subtle bg-background-subtle px-3 py-2 text-xs leading-snug text-text-secondary">
                <Trans>
                  Resumed from blocked on{' '}
                  {formatDatePretty(autoUnblockEvent.createdAt.slice(0, 10))} after the upstream
                  deadline was completed.
                </Trans>
              </div>
            )
          })()
        : null}
      {/* No WaitingOutstandingDocs panel (count header + bullet list) here —
          that data lives on the Materials tab, not duplicated in the stage
          card. The card carries a one-line signal instead: "N items
          outstanding · Check Materials →". The CPA who needs the actual
          document inventory clicks through. The verb is "Check" not "Open" —
          "Open" reads as "open the tab", "Check" reads as "go review what's
          outstanding", which is the CPA's actual intent when the count is
          non-zero. */}
      {isWaitingDocsCase && outstandingDocsCount > 0 ? (
        <button
          type="button"
          onClick={() => onChangeTab('readiness')}
          className="mt-3 -mx-1 flex cursor-pointer items-center gap-1.5 rounded-lg px-1 py-1 text-left text-xs text-text-secondary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
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
      {/* Steps eyebrow is text-caption (11px), matching the "Entered DATE"
          subline so the two read at the same scale. Step list items inside
          ride on text-sm — a clear tier below the stage h3 but legibly above
          the eyebrow. */}
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
                      // Solid filled disc (not a ring + inner-dot): a ring
                      // around an inner dot reads as a textbook selected-radio,
                      // so readers tried to click it expecting a form input.
                      // The solid bullet reads as a status marker, not an
                      // interactive choice.
                      <span
                        aria-hidden
                        className="mt-1 size-2.5 shrink-0 rounded-full bg-accent-default"
                      />
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
        /* In Review workflow — compact progress only. The old slider
           exposed implementation flags and made default rows look too
           far along. Keep actions on the current step, while the
           steps themselves stay as status markers. */
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-caption font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Steps</Trans>
          </p>
          <ul className="flex flex-col gap-1.5">
            {REVIEW_PIPELINE_KEYS.map((key) => {
              const state = pipelineStateOf(key, reviewCurrent, REVIEW_PIPELINE_KEYS)
              const label = reviewPipelineLabels[key]
              const showNotesOpen = state === 'current' && key === 'reviewing_return' && notesOpen
              return (
                <li key={key} className="flex flex-col">
                  <div className="flex items-start gap-2 text-sm">
                    {state === 'done' ? (
                      <CheckCircle2Icon
                        className="mt-0.5 size-3.5 shrink-0 text-state-success-solid"
                        aria-hidden
                      />
                    ) : state === 'current' ? (
                      // Solid filled disc (not a ring + inner-dot): a ring
                      // around an inner dot reads as a textbook selected-radio,
                      // so readers tried to click it expecting a form input.
                      // The solid bullet reads as a status marker, not an
                      // interactive choice.
                      <span
                        aria-hidden
                        className="mt-1 size-2.5 shrink-0 rounded-full bg-accent-default"
                      />
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
                  </div>
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
            {pastEntries.map((entry, index) => {
              const entryKey = `${entry.stageKey}:${entry.entryAt}:${entry.exitAt}:${index}`
              const open = expandedPast === entryKey
              const days = daysBetween(entry.entryAt, entry.exitAt)
              return (
                <li key={entryKey} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setExpandedPast(open ? null : entryKey)}
                    aria-expanded={open}
                    className="-mx-1 flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-left text-xs outline-none hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
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
      if (row.reviewStage === 'notes_open') return t`Notes open`
      if (reviewPipelineCurrent(row) === 'ready_to_file') return t`Ready to file`
      if (reviewPipelineCurrent(row) === 'reviewing_return') return t`Reviewing`
      return t`Preparing`
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
// No `stageKeys` param — it would look like it controlled matching but only
// sized the array (matching is driven by `timelineIndexForStatus`). The array
// length is an explicit module constant aligned with the index function above.
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

// `PathToFilingChevron` removed — at 440px panel width its 5 × 4 = 20
// text/icon elements were unreadable. `PathToFilingSummary` replaces it in the
// snapshot block; full stage-by-stage history lives on the Timeline tab via
// `ObligationTimeline`.

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
    icon: ComponentType<SVGProps<SVGSVGElement>>
    options: readonly FilterOption[]
    searchPlaceholder: string
  }[] = [
    {
      key: 'taxType',
      label: t`Form`,
      icon: FileTextIcon,
      options: taxTypeOptions,
      searchPlaceholder: t`Search forms…`,
    },
    {
      key: 'client',
      label: t`Client`,
      icon: UserRoundIcon,
      options: clientOptions,
      searchPlaceholder: t`Search clients…`,
    },
    {
      key: 'state',
      label: t`State`,
      icon: MapPinIcon,
      options: stateOptions,
      searchPlaceholder: t`Search states…`,
    },
    {
      key: 'assignees',
      label: t`Assignee`,
      icon: UserRoundIcon,
      options: assigneeOptions,
      searchPlaceholder: t`Search assignees…`,
    },
    {
      key: 'county',
      label: t`County`,
      icon: MapPinIcon,
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
          className="flex items-center gap-0.5 overflow-x-auto border-b border-divider-subtle px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {facetTabs.map((tab) => (
            <ObligationFilterTab
              key={tab.key}
              icon={tab.icon}
              label={tab.label}
              count={facetCounts[tab.key]}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
          <ObligationFilterTab
            icon={ClockIcon}
            label={t`Condition`}
            count={conditionCount}
            active={activeTab === 'condition'}
            onClick={() => setActiveTab('condition')}
          />
          <ObligationFilterTab
            icon={LayersIcon}
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
                <span className="text-caption-xs font-bold tracking-eyebrow-tight text-text-muted uppercase">
                  <Trans>Due window</Trans>
                </span>
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
                <span className="text-caption-xs font-bold tracking-eyebrow-tight text-text-muted uppercase">
                  <Trans>Triage</Trans>
                </span>
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
            <div className="flex flex-col gap-1 p-3">
              <span className="px-1 pb-1 text-caption-xs font-bold tracking-eyebrow-tight text-text-muted uppercase">
                <Trans>Presets</Trans>
              </span>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setStage((p) => ({ ...p, ...preset.patch }))}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
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

// One tab in the Filter sheet's dimension strip — icon + label + optional
// count badge, with the active tab carrying a 2px bottom rule (per `xrMoD`).
function ObligationFilterTab({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>
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
      // Per `xrMoD`/`vjMXx`: icon (13px) + 12px label + count pill, with the
      // active tab carrying a 2px bottom rule, bold dark label, and an inset
      // negative margin so its rule sits flush on the strip's hairline.
      className={cn(
        '-mb-px inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm outline-none transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset',
        active
          ? 'border-text-primary font-semibold text-text-primary'
          : 'border-transparent font-medium text-text-secondary hover:text-text-primary',
      )}
    >
      <Icon
        className={cn('size-3.5 shrink-0', active ? 'text-text-primary' : 'text-text-tertiary')}
        aria-hidden
      />
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
  const { t } = useLingui()
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
              one={t`# selected · ${options.length} options`}
              other={t`# selected · ${options.length} options`}
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

// One selectable pill inside the Filters popover — mirrors
// AlertsListPage's `FilterPillSection` pill chrome (h-7, accent wash when
// active). Generic across single-select (radio) + toggle usages.
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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 max-w-full cursor-pointer items-center rounded-lg border px-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'border-state-accent-border bg-state-accent-hover text-text-accent'
          : 'border-divider-subtle text-text-secondary hover:bg-state-base-hover',
      )}
    >
      <span className="truncate">{children}</span>
    </button>
  )
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

  // Resolve a facet value to its display label via the option list, falling
  // back to the raw value if the facet hasn't loaded yet.
  const labelOf = (options: readonly FilterOption[], value: string) =>
    options.find((option) => option.value === value)?.label ?? value

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
  for (const value of taxTypeSelected) {
    chips.push({
      key: `taxType-${value}`,
      dimension: t`Form`,
      label: labelOf(taxTypeOptions, value),
      onRemove: () => removeFacet('taxType', taxTypeSelected, value),
    })
  }
  for (const value of clientSelected) {
    chips.push({
      key: `client-${value}`,
      dimension: t`Client`,
      label: labelOf(clientOptions, value),
      onRemove: () => removeFacet('client', clientSelected, value),
    })
  }
  for (const value of stateSelected) {
    chips.push({
      key: `state-${value}`,
      dimension: t`State`,
      label: labelOf(stateOptions, value),
      onRemove: () => removeFacet('state', stateSelected, value),
    })
  }
  for (const value of assigneeSelected) {
    chips.push({
      key: `assignee-${value}`,
      dimension: t`Assignee`,
      label: labelOf(assigneeOptions, value),
      onRemove: () => removeFacet('assignees', assigneeSelected, value),
    })
  }
  for (const value of countySelected) {
    chips.push({
      key: `county-${value}`,
      dimension: t`County`,
      label: labelOf(countyOptions, value),
      onRemove: () => removeFacet('county', countySelected, value),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-3">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-divider-subtle bg-background-default py-1 pr-1 pl-2.5 text-caption-xs"
        >
          <span className="text-text-muted">{chip.dimension}</span>
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
                  <Loader2 data-icon="inline-start" className="animate-spin" />
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
                  <Loader2 data-icon="inline-start" className="animate-spin" />
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
