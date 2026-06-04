import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
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
  RefreshCwIcon,
  SendIcon,
  PlusIcon,
  SearchIcon,
  UserRoundIcon,
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
import { useSidebar } from '@duedatehq/ui/components/ui/sidebar'

import {
  isInteractiveEventTarget,
  useAppHotkey,
  useKeyboardShortcutsBlocked,
} from '@/components/patterns/keyboard-shell'
import { useCurrentUserName } from '@/lib/use-current-user-name'
import {
  TableHeaderMultiFilter,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { DestructiveChangePreview } from '@/components/patterns/destructive-change-preview'
import { EmptyState } from '@/components/patterns/empty-state'
import { FloatingActionBar } from '@/components/patterns/floating-action-bar'
import { PageHeader } from '@/components/patterns/page-header'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
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
import {
  ALL_STATUSES,
  LIFECYCLE_V2_STATUSES,
  ObligationQueueStatusControl,
  ObligationStatusReadBadge,
  STATUS_ICON,
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
import { StageActions, type StageTask } from '@/features/obligations/StageActions'
import { formatTaxCode } from '@/lib/tax-codes'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { initialsFromName } from '@/lib/auth'
import { queryInputUrlUpdateRateLimit, useDebouncedQueryInput } from '@/lib/query-rate-limit'
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
const DEFAULT_SORT: ObligationQueueSort = 'smart_priority'
const DEFAULT_DENSITY: ObligationQueueDensity = 'comfortable'
// 2026-05-26 (Yuqi /deadlines #2): explicit "Group by" mode. Default
// `due` keeps the chronological flat list the current product
// optimises for. `client` clusters rows under client section
// headers (with aggregate metadata). `status` clusters by status
// (Blocked / Waiting on client / In review / Filed / Not started).
// 2026-05-26 (Yuqi follow-up — "remove group by status, since there
// is already the top tab switch between status"): Status is no
// longer a Group-by option. The scope-tab band above the table
// already filters by status (All / Past due / This week / Not started
// / Waiting on client / Blocked / In review / Filed), so adding it
// as a grouping axis was a redundant control. Group-by now offers
// only "Due date" (default flat list) and "Client" (per-client
// cluster headers). Legacy URLs with `?group=status` fall back to
// the default `due` via nuqs's `parseAsStringLiteral` rejection.
const GROUP_OPTIONS = ['due', 'client'] as const
type ObligationQueueGroup = (typeof GROUP_OPTIONS)[number]
const DEFAULT_GROUP: ObligationQueueGroup = 'due'
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
// buffer. The page size is now derived from the viewport height
// (2026-05-26, /deadlines sixty-fifth pass #14) so the table fills
// the screen with as many rows as fit and the user never gets a
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
// /rules/library after the 2026-05-26 cross-table element unify
// pass). Was 48 briefly during a tighter-density experiment; bumped
// back so all three tables share the same row pitch. If row chrome
// changes again, re-measure with a quick `getBoundingClientRect().
// height` test and adjust — undershooting fills the viewport
// partially, overshooting scrolls.
const CLIENT_ROW_HEIGHT_PX = 56
// Page chrome above + below the rows: page header + breadcrumb +
// filter scope-tabs + filter action-chips + table header + pagination
// footer + page bottom padding ≈ 320-360px. We pick 360 to leave
// a small buffer so the last row is never clipped under the
// footer. If the chrome grows or shrinks materially, tune here.
// PAGE_CHROME_PX retired 2026-05-26 — responsive page size now
// measures the scroll container's clientHeight directly, see
// useResponsivePageSize. INSIDE_CHROME_PX replaces this constant
// (defined near the hook).
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

// 2026-05-26 (Yuqi feedback — responsive page size pivot): page size
// now derived from the ACTUAL scroll container height, not window
// height. The window-height heuristic overshot when the page chrome
// was tall (e.g. filter bar wrapping two lines) and undershot when
// the panel was open eating side space but not vertical. Measuring
// the container with ResizeObserver gives the true "how much room
// do I have for rows" answer.
//
// 2026-05-26 (Yuqi feedback — "refactor the page structure or table
// structure/pagination framing"): the measurement target moved from
// the queue column to the table-card. The table-card is a bordered
// frame that contains ONLY the Table + Pagination — no filter bars,
// no page header. So the chrome budget shrinks dramatically and
// becomes stable (no longer drifts when the filter bar wraps).
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

// 2026-05-26 (Yuqi feedback — "large blank space at the bottom"):
// the previous shape took a `React.RefObject` and read `ref.current`
// inside useEffect. That breaks when the observed element is
// rendered CONDITIONALLY (e.g. inside a loading/success ternary
// branch): on first mount the ref is null, useEffect's `if (!element)
// return` early-returns, page size stays at MIN forever (8 rows) —
// and the ResizeObserver never gets attached. When the success
// branch later renders the element, the effect doesn't re-fire
// (its dep is the ref object itself, which is stable).
//
// Fixed by switching to a callback-ref shape. The hook returns a
// SETTER instead of accepting a ref. When the DOM element attaches,
// React calls the setter with the element; when it detaches, the
// setter is called with null. The effect runs whenever `element`
// state changes, so observation kicks in correctly the moment the
// table-card mounts (even if it mounts AFTER the initial render).
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
        'inline-flex w-full items-center justify-between gap-2 rounded-md border border-divider-regular bg-background-default px-3 text-sm text-text-primary outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:bg-state-base-hover',
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
// OBLIGATION_QUEUE_TABLE_PILL_CLASSNAME retired 2026-05-26 with the
// sixty-fifth pass #17 DueDaysPill cleanup — the Badge wrapper was
// dropped so the shared text-xs token is no longer in use.
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
// 2026-05-26 (Yuqi feedback #8): the auto-hide set when the right
// panel is open shrunk significantly. Yuqi's call: task/deadline
// (taxType + daysUntilDue) and status should stay visible alongside
// the client name so the table still tells the row's primary story
// even with a 600px panel claiming half the width. Now only the
// secondary / state-cluster columns auto-hide; the row anchor
// (Client + Form + Due + Status) survives the panel-open layout.
const PANEL_OPEN_AUTO_HIDDEN_COLUMN_IDS = [
  'clientState',
  'clientCounty',
  'assigneeName',
  'evidenceCount',
  'smartPriority',
] as const
const OBLIGATION_QUEUE_ROW_CONTROL_SELECTOR =
  'button,a[href],input,label,select,textarea,[role="button"],[role="checkbox"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="option"],[role="radio"],[role="tab"],[data-slot="checkbox"]'

// 2026-05-27 (Yuqi drawer parity — match AlertDetailDrawer):
// the obligation detail panel now shares the alerts panel's
// width contract and motion choreography. The flex slot opens
// from 0 → 60% (matching the alerts panel in
// AlertsListPage.tsx L838-867), the inner surface rises from
// y:'100%' → 0 on enter, dissolves opacity → 0 on exit. Same
// ease-apple curve, same durations as the alert drawer so the
// two right-rail panels read as siblings.
const DETAIL_SWIFT_EASE = [0.32, 0.72, 0, 1] as const
// 2026-05-27 (Yuqi feedback "remove width:60%" + "responsive也都
//是没有的"): dropped the hardcoded width animation. Sizing is now
// CSS-class driven (responsive: full width on narrow, 3/5 at xl+,
// max-capped so ultra-wide doesn't bloat the drawer past usefulness).
// Animation switched from width-interpolation to x-transform so the
// slide-in works regardless of the final width value.
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
// 2026-05-27 (Yuqi drawer parity): paper-rise enter matches
// AlertDetailDrawer's inner choreography (y:100%→0, 0.64s
// duration, 0.14s delay) — the surface visibly extrudes from
// below the slot. Exit collapses to opacity-only dissolve
// (0.22s) so the slot closes underneath without a slide-down
// mirror motion.
const DETAIL_PANEL_INNER_RISE_ANIM = {
  y: 0,
  transition: { duration: 0.64, ease: DETAIL_SWIFT_EASE, delay: 0.14 },
} as const
const DETAIL_PANEL_INNER_FADE_ANIM = {
  opacity: 0,
  transition: { duration: 0.22, ease: DETAIL_SWIFT_EASE },
} as const
// 2026-05-26 (Yuqi seventieth pass #1 — row-switch should be a
// SMALL animation, not big): drop the x-translation on the
// content swap entirely and tighten the duration. Open/close
// still uses the bigger width + paper-rise animations above; only
// the row-to-row content transition is the quick crossfade.
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

function getSortingState(sort: ObligationQueueSort): SortingState {
  if (sort === 'smart_priority') return [{ id: 'smartPriority', desc: true }]
  if (sort === 'due_desc') return [{ id: 'currentDueDate', desc: true }]
  if (sort === 'updated_desc') return [{ id: 'updatedAt', desc: true }]
  return [{ id: 'currentDueDate', desc: false }]
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

// `integerFromInput` retired 2026-05-26 with the sixty-fifth pass #5
// RangeHeaderFilterDropdown removal — only the dropdown's onCommit
// callback ever called this helper.

function daysFilterValue(value: number | null): number | undefined {
  if (value === null || !Number.isSafeInteger(value)) return undefined
  return Math.min(DAYS_FILTER_MAX, Math.max(DAYS_FILTER_MIN, value))
}

// `inputValueFromNumber` retired 2026-05-26 with RangeHeaderFilter-
// Dropdown removal — only the dropdown's draft-input state needed it.

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
  // Audit-drain ρ ROH-D3 (2026-05-27): the bulk "Set status" dropdown
  // had no UI gate — coordinator could open it, click a status, and
  // get a 403 toast from the server. Server already enforces; this
  // adds the missing affordance so the dropdown trigger is disabled
  // for read-only roles with a tooltip explaining why.
  const canUpdateObligationStatus = permission.can('obligation.status.update')
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
  const sort: ObligationQueueSort = useMemo(() => {
    if (!lifecycleV2) return urlSort
    const hasExplicitSort = new URLSearchParams(location.search).has('sort')
    return hasExplicitSort ? urlSort : 'due_asc'
  }, [urlSort, lifecycleV2, location.search])
  const [penaltyRow, setPenaltyRow] = useState<ObligationQueueRow | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pageIndex, setPageIndex] = useState(0)
  // 2026-05-26 (Yuqi feedback pivot): responsive rows-per-page now
  // derived from a container's clientHeight via ResizeObserver, not
  // the window.
  //
  // 2026-05-26 (Yuqi feedback — "refactor the page structure or
  // table structure/pagination framing"): pivoted the measurement
  // target from the queue column to the table-card. The queue column
  // included filter bars in its height; the page-size hook had to
  // subtract a 180-240px chrome estimate that drifted when the
  // filter bar wrapped to two rows. The new card frame ONLY contains
  // the Table + Pagination, so the chrome subtraction is a stable,
  // smaller value (TableHeader + Pagination ≈ 96px).
  //
  // 2026-05-26 (Yuqi follow-up — "large blank space at the bottom"):
  // hook now returns a callback ref. The table-card mounts inside a
  // conditional ternary (loading/success), so a ref-object pattern
  // would early-return with null on first paint and never re-fire.
  // The callback ref attaches when the element mounts, regardless of
  // initial render path. See useResponsivePageSize above for the
  // diagnosis.
  const [responsivePageSize, setTableCardElement] = useResponsivePageSize()
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
    // 2026-05-26 (Yuqi feedback #11 — "Show all is broken"): the
    // panel-open auto-hide was overriding the user's explicit
    // "Show all" choice. When the user clicks Show all (hide=[]),
    // they want EVERYTHING visible regardless of panel state.
    // Skip the auto-hide when hide=[] is the explicit intent.
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
      clientState: t`State`,
      clientCounty: t`County`,
      taxType: t`Tax type`,
      // 2026-05-27 (Step 6 #61 — P3): was "Internal Due" — dropped
      // the noun and didn't match the neighbouring "Due date" column
      // header. Restored "date" so the two date-column labels read
      // as a consistent pair.
      currentDueDate: t`Internal due date`,
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
  // 2026-05-27 (audit-drain ζ Q3.4): derived adapter so the Export
  // dialog's SearchableCombobox can take the existing
  // `clientOptions` shape without duplicating the map. Folding the
  // state into `meta` keeps the row dense (label + trailing
  // jurisdiction); folding `state` and `county` into `keywords`
  // lets the typeahead match on partial location strings too.
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
    // 2026-05-26 (Yuqi sixty-fifth pass follow-up #6/#7 — kill tab/chip
    // flicker): keep showing the previous query result while the new
    // filter set is fetching. Without this, every tab or chip click
    // collapsed the table to the `isInitialLoading` skeleton for a
    // beat — which read as "page blinks and glitches around" because
    // the table height collapsed and re-expanded as rows re-mounted.
    // `placeholderData: (prev) => prev` tells TanStack: "while we
    // re-fetch for the new filter, render the old rows." The old
    // rows fade to new rows in place once the new data lands, with
    // no skeleton in between. This is the standard React Query
    // pattern for smooth filter transitions.
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
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
        // 2026-05-26 (Step 6 UX audit #49): "rows" is engineering-speak.
        // CPAs say "deadlines" or "filings". Title also dropped the
        // word "Bulk" — the description carries the count which is
        // already the bulk signal.
        // 2026-05-27 (Step 6 #156 — P2): title reflects which status
        // was applied so a CPA running several bulk actions back-to-
        // back can distinguish them at a glance. The status label
        // resolves through the v2-aware `statusLabels` map.
        // 2026-05-27 (bulk-status partial-skip): the RPC now silently
        // skips rows whose source status can't reach the target per
        // the transition matrix (e.g. a terminal `completed` row in
        // a "Waiting on client" batch). Surface the skipped count so
        // preparers know the batch wasn't entirely applied.
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
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  // 2026-05-26 (Yuqi sixty-sixth pass — assignee quick-pick): single-
  // call mutation now used by BOTH the bulk-action bar (many
  // clientIds) and the per-row Unassigned `?` picker (one
  // clientId). Heuristic: when `clientIds.length === 1` we treat
  // it as a quick-assign and DON'T clear the row checkbox
  // selection — the user might have unrelated rows selected and
  // just want to assign one specific client. Multi-id calls keep
  // the original "clear selection on success" behavior since the
  // bulk bar's selection IS the input.
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
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
        // 2026-05-27 (Step 6 #56 — P3): "Export ready" + audit-id
        // didn't tell the user WHERE the file went. Most browsers
        // drop to Downloads silently; without the destination cue,
        // the user can't tell whether they need to click Save
        // somewhere. Audit-id stays accessible — power-users who
        // need it can grab it from the audit log.
        toast.success(t`Export ready`, {
          description: t`Saved to your Downloads folder.`,
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
  // show the client name once on the first row, then render following
  // deadlines as indented continuation rows. If the sort scatters a
  // client's rows, each row stands alone with its own client name.
  //
  // 2026-05-27 (Yuqi feedback "discard the group by clients when the
  // filter is Group by Due Date. Just like any other row"): when
  // grouped by Due Date the same-client adjacency grouping is
  // wrong — every row should stand alone with its own client name.
  // Early-return empty Set when `group !== 'client'` so the
  // continuation visualization only runs in group=client mode.
  const continuationRowIds = useMemo(() => {
    const set = new Set<string>()
    if (group !== 'client') return set
    for (let i = 1; i < rows.length; i++) {
      if (rows[i]!.clientId === rows[i - 1]!.clientId) set.add(rows[i]!.id)
    }
    return set
  }, [rows, group])
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
  // Group-by section-header map. Each mode has different header semantics
  // (per the Group-by wireframes):
  //
  //   • Status mode → header at EVERY status boundary, simple
  //     "<Label> <count>" treatment ("Blocked 2", "Waiting on client 1").
  //   • Client mode → header at EVERY client boundary, richer
  //     "<Name> <N deadlines · next [date]> [N late]" treatment that
  //     surfaces the next-due date + a small late-count pill so the
  //     CPA can triage at scan distance.
  //   • Due-date mode → NO section headers. Flat chronological list
  //     (Filed entries first, then most-late first).
  //
  // Keyed by the FIRST row's id in each cluster. `lateCount` is computed
  // in client mode for the late-pill. `earliestDueDate` carries the
  // "next due" semantics. Computed from `rows` (not `pagedRows`) so
  // counts reflect the full result set, not just the visible page —
  // same pattern as continuationRowIds / withinGroupRowIds above.
  const groupHeadersByFirstRowId = useMemo(() => {
    const map = new Map<
      string,
      {
        groupKey: string
        clientId: string
        clientName: string
        count: number
        lateCount: number
        earliestDueDate: string
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
    // group=client — emit a header at EVERY client boundary, including
    // single-row clients. The rows are already sorted with clientName
    // as primary sort (see `sorting` useMemo earlier), so adjacent
    // rows of the same client cluster naturally.
    const groupKeyOf = (r: ObligationQueueRow) => r.clientId
    let i = 0
    while (i < rows.length) {
      const start = rows[i]!
      const startKey = groupKeyOf(start)
      let j = i + 1
      while (j < rows.length && groupKeyOf(rows[j]!) === startKey) j++
      let earliest = start.currentDueDate
      let lateCount = 0
      for (let k = i; k < j; k++) {
        const r = rows[k]!
        if (r.currentDueDate < earliest) earliest = r.currentDueDate
        // "Late" = past internal due AND non-terminal (still actionable).
        if (r.daysUntilDue < 0 && r.status !== 'done' && r.status !== 'completed') {
          lateCount++
        }
      }
      map.set(start.id, {
        groupKey: startKey,
        clientId: start.clientId,
        clientName: start.clientName,
        count: j - i,
        lateCount,
        earliestDueDate: earliest,
      })
      i = j
    }
    return map
  }, [rows, group])
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
  const activeDetailTab = routeObligationRef ? (routeDetailTab ?? 'summary') : detailTab
  // 2026-05-26 (Yuqi sixty-eighth pass — sidebar mechanism): the
  // ONLY time the sidebar auto-collapses is when this route opens
  // its right detail panel. The user's manual collapse preference
  // (persisted in localStorage) is untouched — when the panel
  // closes, that preference takes over again. If the user
  // manually expands while auto-collapsed, their toggle wins for
  // the rest of the panel session (see SidebarProvider).
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
          // 2026-05-27 (Step 6 #156 — P2): all status-change toasts
          // shared `t\`Status updated\`` regardless of which status
          // was chosen. A CPA marking 10 rows filed in succession
          // saw 10 visually identical toasts — losing the ability
          // to spot at-a-glance when a wrong status was picked.
          // Mirrors the per-row drawer toast at line ~5303.
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
      setPageIndex(0)
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
          // Shift+click the client name → range-select every row
          // sharing this clientId (2026-05-21). Matches the hybrid
          // multi-select model: filings-default, with a group-expand
          // keystroke for the one workflow (reassignment) that
          // naturally lives at the client level. Unshifted clicks
          // pass through to the row handler that opens the drawer.
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
          return (
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                onClick={handleClientNameClick}
                onMouseDown={(event) => {
                  // Prevent text-selection drag from interfering with
                  // the shift-click range gesture.
                  if (event.shiftKey) event.preventDefault()
                }}
                className={cn(
                  'line-clamp-2 min-w-0 flex-1 text-sm leading-tight text-text-primary',
                  tableRow.original.id === explicitActiveRowId ? 'font-medium' : 'font-normal',
                )}
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
        // 2026-05-27 (Yuqi feedback "remove the sortby arrow besides
        // priority — no use"): Priority IS the default sort, so the
        // click-to-sort affordance was a no-op (sorting by priority
        // when already sorted by priority). Header is now plain text.
        header: () => <span>{t`Priority`}</span>,
        cell: ({ row: tableRow }) => {
          const score = tableRow.original.smartPriority.score
          const rank = tableRow.original.smartPriority.rank
          // 2026-05-27 (Yuqi feedback "priority just show the number, don't
          // write urgent or now"): tier labels ("Urgent" / "High" / "Med"
          // / "Low") retired. Column now renders just the numeric score
          // (rounded), with optical-weight inherited from the tier (kept
          // because the score's heaviness IS the visual urgency cue —
          // dropping weight too would flatten the whole column).
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
            // Reads as "slot exists but nobody's filled it."
            // 2026-05-26 (Yuqi sixty-sixth pass — inset-followup E
            // finally lands): the `?` is now a real DropdownMenu
            // trigger. Clicking it opens an assignee picker (same
            // member list + `clients.bulkUpdateAssignee` flow the
            // client-detail H1 owner-pill uses). Per obligation
            // schema review: there is no per-obligation `assignee`
            // — an obligation's assignee inherits from the client.
            // So the picker assigns the CLIENT, which propagates
            // to every deadline for that client. Tooltip + footer
            // copy make that scope explicit so the user doesn't
            // assign one row and discover they assigned twelve.
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
        // 2026-05-26 (Yuqi /deadlines sixty-fifth pass — State cell
        // canonical): adopt the Alerts page's universal state
        // representation. The bare 2-letter code "CA" / "NY" read
        // as the same line of text as every other cell — the column
        // didn't actually look like "state" anything. Now: leading
        // StateBadge SVG (flag/seal motif) + code, matches the
        // Alerts state-chip strip + the /clients filing-states
        // pill so "state" reads as a recognized motif at scan
        // distance. Empty cell stays "—" since rendering a flag for
        // "no state" would be more confusing than less.
        cell: (info) => {
          const state = info.getValue<string | null>()
          if (!state) return <span className="text-text-tertiary">—</span>
          // 2026-05-29 (Yuqi /clients round 1 — "remove the state icon
          // everywhere"): swept to a bordered Badge for cross-route
          // consistency with /clients. The SVG flag glyph is gone;
          // the code itself sits in the unified outline pill.
          return (
            <Badge variant="outline" className="text-xs font-normal tabular-nums">
              {state}
            </Badge>
          )
        },
        meta: { cellClassName: 'text-text-secondary' },
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
        cell: (info) => <TaxCodeLabel code={info.getValue<string>()} tooltip={false} />,
        meta: { cellClassName: 'min-w-[200px] text-text-secondary' },
      },
      {
        accessorKey: 'currentDueDate',
        header: () => {
          const label = t`Internal due date`
          // 2026-05-26 (Yuqi /deadlines sixty-fifth pass #5): dropped
          // the RangeHeaderFilterDropdown icon button. Yuqi's call:
          // "remove. Sort by is doing the same thing." The dropdown
          // was a min/max-days range filter on the column — but the
          // toolbar chip row above (Past Due / Due this week) already
          // covers the common date-range filters with one click, and
          // the column sort handle on this same header lets you find
          // any row by ordering. The icon-button-inside-header chrome
          // added a second affordance (range filter) that overlapped
          // semantically with sort + the toolbar chips. Killing it
          // also addresses #4 (no way to cancel an applied range)
          // because there's no longer an applied range to cancel.
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
        // Relative-time pill only ("3d late" / "in 5d"). Per
        // 2026-05-21 design call the exact date moved to its own
        // hide-by-default column ('dueDateExact' below) — most
        // triage decisions only need the relative urgency, and the
        // date row is signal-to-noise tax.
        cell: ({ row: tableRow }) => (
          <DueDaysPill
            days={daysUntilEffectiveInternalDueDate(tableRow.original)}
            status={tableRow.original.status}
          />
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
        // 2026-05-26 (Yuqi /deadlines feedback): "Sort by Status does
        // not work." It WAS working, just sorting alphabetically —
        // ('blocked', 'completed', 'done', 'extended', 'in_progress',
        // ...) which clustered statuses in an order that didn't match
        // any task-flow logic. Replace the alphabetical sort with an
        // urgency-ordered priority sort: not_started → blocked →
        // waiting_on_client → in_progress → in_review → done →
        // filed → paid → completed → extended → not_applicable. The
        // urgent / action-needed states come first so "Sort by
        // Status" surfaces what the CPA should work on next at the
        // top.
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
          // 2026-05-27 (phi journey audit J1): payment-overdue chip in
          // the queue Status column. A row that's been Filed but whose
          // paymentDueDate has slipped used to render only the green
          // Filed pill — the queue itself never surfaced the buried
          // payment-overdue signal. Now: a small red Badge appears
          // next to the status pill when the row's payment is past
          // due, regardless of the lifecycle status. Stacks cleanly
          // with BlockedByChip / RejectionChip (they're status-state
          // signals; this is a date-state signal).
          const paymentLateDays = paymentOverdueDays(obligationQueueRow, Date.now())
          return (
            <div className="flex items-center gap-1.5">
              <ObligationQueueStatusControl
                row={obligationQueueRow}
                labels={statusLabels}
                statuses={statusDropdownOptions}
                disabled={statusUpdatePending}
                onChange={(id, status) => updateStatus({ id, status }, obligationQueueRow.status)}
                compact={panelOpenIntent}
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
                ) : (
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 px-1.5 text-caption-xs"
                    title={t`Filed, but the client hasn't signed Form 8879 yet — e-filing is blocked until they sign.`}
                  >
                    <Hourglass className="size-3" aria-hidden />
                    <Trans>Awaiting signature</Trans>
                  </Badge>
                )
              ) : null}
              {obligationQueueRow.efileAcceptedAt && obligationQueueRow.status !== 'completed' ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-state-success-solid px-2 py-0.5 text-caption-xs font-medium text-text-inverted"
                  title={`${t`Authority accepted the return`} · ${formatDatePretty(obligationQueueRow.efileAcceptedAt.slice(0, 10))}`}
                >
                  <CheckCircle2Icon className="size-3" aria-hidden />
                  <Trans>Accepted</Trans>
                </span>
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
                ) : (
                  <Badge
                    variant="destructive"
                    className="h-5 px-1.5 text-caption-xs uppercase tracking-wide"
                    title={t`Filing submitted but the authority payment due ${formatDate(obligationQueueRow.paymentDueDate ?? '')} hasn't been confirmed. Penalty interest accrues until the wire lands.`}
                  >
                    <Trans>Payment {paymentLateDays}d late</Trans>
                  </Badge>
                )
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
      clientOptions,
      clientQuery,
      continuationRowIds,
      currentUserName,
      explicitActiveRowId,
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
  // from useInfiniteQuery; we slice it into `responsivePageSize`-sized
  // pages and only hand the active page to TanStack. Going to the next
  // page beyond the loaded buffer triggers `fetchNextPage`.
  // 2026-05-26 (Yuqi /deadlines sixty-fifth pass #14): pageSize now
  // tracks viewport height instead of a fixed 25. `responsivePageSize`
  // changes on window resize so totalLoadedPages re-derives and the
  // user always sees a "table fills the screen" view.
  const totalLoadedPages = Math.max(1, Math.ceil(rows.length / responsivePageSize))
  const safePageIndex = Math.min(pageIndex, totalLoadedPages - 1)
  const pagedRows = useMemo(
    () => rows.slice(safePageIndex * responsivePageSize, (safePageIndex + 1) * responsivePageSize),
    [rows, safePageIndex, responsivePageSize],
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
      // 2026-05-26 (Yuqi sixty-fifth pass follow-up): pass `[]` instead
      // of `null` when no columns are hidden. The `hide` parser has a
      // non-empty default (DEFAULT_HIDDEN_COLUMN_IDS), so `null`
      // resolves back to that default — meaning unhiding everything
      // would silently re-hide the default-hidden columns on the next
      // URL read. Passing `[]` (with `clearOnDefault: false` on the
      // parser) preserves the explicit "nothing is hidden" state.
      void setObligationQueueQuery({ hide: nextHidden })
    },
    onRowSelectionChange,
  })

  const tableRows = table.getRowModel().rows
  // 2026-05-26 (Yuqi feedback — "should say the number of deadlines in
  // total"): the toolbar's row-count label switched from `totalShown`
  // (current page count) to `rows.length` (total). `totalShown` is
  // therefore no longer needed; removed.
  const visibleColumnCount = table.getVisibleLeafColumns().length
  // 2026-05-26 (Yuqi feedback #2): lateCount / dueThisWeekCount /
  // blockedCount / waitingOnClientCount were the inputs for the
  // page subtitle metrics ("13 late · 4 due this week · ..."). The
  // subtitle was dropped per feedback #2, so the computations are
  // now dead. Removed entirely; restore from git history if a
  // subtitle is revived.
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
        // 2026-05-26 (Yuqi step-8 data-finding audit — F-X16): help-
        // dialog label "Focus search" → "Filter deadlines" so the
        // `/` hotkey reads identically across surfaces (matches the
        // "Filter rules" + "Filter coverage" label discipline
        // established in the cross-product search audit Phase 1).
        // The control is a page-level filter, not entity search;
        // verb-discipline matters when the help dialog lists three
        // `/` rows side-by-side under different categories.
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
    // 2026-05-25 (GitHub-density pass): outer gap-6 → gap-4,
    // padding md:p-6 → md:p-5. Deadlines is the densest table
    // surface in the app — every extra row of breathing room is one
    // less row of work visible. Tighter outer rhythm reclaims room
    // for the table itself.
    // 2026-05-25 (Yuqi page-title pass): top padding pt-6 md:pt-8
    // (kept the tight horizontal + bottom from the density pass).
    <div
      className={cn(
        // 2026-05-26 (Yuqi feedback #12): bottom padding zeroed out
        // across all sizes. The table's pagination row owns the
        // bottom edge of the page now; an additional `pb-4 / md:pb-5
        // / xl:pb-2` was adding 8-20px of dead space below the
        // pagination strip. Bottom is flush against the viewport.
        // 2026-05-26 (Yuqi feedback #6/#15): page height bumped from
        // `100vh-1rem` → `100vh`. The 1rem subtraction was leaving
        // 16px of dead space below the drawer's sticky footer + the
        // table pagination — neither the drawer nor the table footer
        // could pin to the actual viewport bottom. Now flush.
        // 2026-05-26 (Yuqi seventy-fourth pass — canonical
        // container padding): aligned `md:px-5` → `md:px-6` to
        // match /today + /clients + /alerts + /rules/library.
        // `pb-0` retained — /deadlines has a sticky pagination
        // footer that needs to ride flush to the viewport bottom.
        // `gap-4` retained too: dense table page intentionally
        // tighter than the gap-6 used by header-heavy pages.
        'mx-auto flex w-full max-w-page-expanded flex-col gap-4 px-4 pt-8 pb-0 md:px-6 md:pb-0',
        'xl:h-screen xl:overflow-hidden xl:pb-0',
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
          // 2026-05-26 (Yuqi seventy-first pass — canonical page
          // header chip): aligned to the `/clients` pattern. Title
          // stays as the noun ("Deadlines"); the count chip sits
          // AFTER the title as a rounded pill carrying "N open"
          // — qualifies the slice the user is currently looking
          // at, not just the raw total. Other surfaces now use
          // the matching shape: "3 Ongoing" on /alerts,
          // "9 Clients" on /clients, "N Rules" on /rules/library.
          // 2026-05-27 (Yuqi FINAL — sorry for flip-flopping):
          // "Deadlines" heading + canonical chip with just the number.
          // Earlier "去掉" / "remove" meant remove the word "deadlines"
          // inside the chip (so "17" not "17 deadlines"), NOT remove
          // the chip entirely.
          <span className="inline-flex items-center gap-2">
            <Trans>Deadlines</Trans>
            {scopeTotal > 0 ? (
              <span className="rounded-full bg-state-base-hover px-2 py-1.5 text-xs font-medium tabular-nums text-text-secondary">
                {scopeTotal}
              </span>
            ) : null}
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
        // 2026-05-26 (Yuqi feedback #2): subtitle hidden. The
        // "10 late · 2 blocked · ..." pipeline scan duplicates info
        // already carried by each scope tab below (which renders its
        // own count). Page header was minimal — title + count chip
        // only.
        // 2026-05-27 (Yuqi follow-up — "像 Rule Library 一样，把
        // description 放出来"): the page concept description is now
        // surfaced inline below the title (same pattern as the
        // canonical PageHeader `description` slot). One short sentence
        // explains what /deadlines is for at a glance — the `?`
        // ConceptLabel beside the title is still there for the full
        // popover. Copy mirrors the `obligation` concept-help body
        // (intentional duplication: the inline copy answers "what is
        // this page" without a click, the popover answers "what's a
        // deadline" in product terms).
        description={
          <Trans>
            The operating surface for deadline work — filter, sort, assign owners, update status,
            and open evidence for each row.
          </Trans>
        }
        actions={
          <>
            {/* 2026-05-26 (Yuqi seventieth pass #17): Export icon
                flipped from DownloadIcon (arrow down to disk) to
                ArrowUpRightIcon (arrow up + out — data LEAVING
                the app). Matches Yuqi's "export is with the arrow
                the other way up" — and the convention used by
                Linear / Notion / Figma for export actions. */}
            <Button variant="outline" size="sm" onClick={() => openExportDialog('filtered')}>
              <ArrowUpRightIcon data-icon="inline-start" />
              <Trans>Export</Trans>
            </Button>
            <CalendarSyncPopover />
            {/* 2026-05-26 (audit P0 #8 — Q1): the /deadlines queue
                had no labeled primary CTA — the most common CPA
                mid-day task ("I just learned client X owes a thing,
                add it") required navigating back to the dashboard or
                opening a client detail to find `CreateObligationDialog`.
                Now lives on the queue too, right-edge of the actions
                cluster (matches /clients's "+ Add client" placement).
                Same global dialog, no schema change. */}
            <CreateObligationDialog />
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
            // 2026-05-27 (Yuqi follow-up — "tab和时间filter和下面table的
            // 间距应该有一点变化"): gap bumped from `gap-3` (12px) to
            // `gap-4` (16px) so the sticky filter bar (status tabs +
            // action chips + sort/columns) has a clearer breathing
            // gap above the table card. Previously the row sat flush
            // against the table edge, making the two sections read as
            // a single dense band. The 4px extra space separates the
            // "controls" layer from the "data" layer without changing
            // either's internal density. The bulk-action toolbar is
            // a FloatingActionBar (fixed at viewport bottom), so this
            // gap only affects filter→table spacing — no other gap in
            // the queue column shifts.
            'flex min-w-0 flex-1 flex-col gap-4',
            // 2026-05-26 (Yuqi /deadlines feedback — page-flip
            // pattern): the queue column is `overflow-hidden` at xl+
            // so neither axis can scroll. Vertical fit is owned by
            // the table-card's responsive page-size hook (below);
            // horizontal fit by the cell `break-words` rules. Any
            // residual 1-2px overflow is silently clipped — the
            // pagination handles "what doesn't fit."
            'xl:min-h-0 xl:overflow-hidden',
            !activeDetailId && 'overflow-x-hidden',
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
          {/* 2026-05-26 (Yuqi sixty-third pass — filter bar transparent):
              dropped `bg-background-default/95 backdrop-blur-sm` from
              the sticky filter bar per Yuqi's DevTools-screenshot
              callout. The bar now reads as part of the page surface
              (transparent) rather than a separate white card sitting
              on top of the inset gray. The `border-b border-divider-
              regular` still gives the boundary; scrolling rows
              underneath simply show through, which is fine because
              the bar is anchored to the top of the page scroll
              container — there's never table content directly behind
              it (it ends at the table top edge). */}
          <div className="sticky top-0 z-10 flex flex-col gap-1.5 border-b border-divider-regular">
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
                  compact={panelOpenIntent}
                  // 2026-05-26 (Yuqi /deadlines sixty-fifth pass —
                  // "page blinks and jumps on tab/pill click"):
                  // dropped the `obligation: null, row: null` patch
                  // from scope-tab handlers. The clears were auto-
                  // closing the detail panel on every filter change,
                  // which triggered the AnimatePresence width-collapse
                  // exit (280ms) + queue column re-expand to full
                  // width — that's the "jump." The panel now persists
                  // across filter changes; if the selected row is no
                  // longer in the filtered set, the user can close
                  // explicitly via X / Esc.
                  onClick={() => void setObligationQueueQuery({ status: null })}
                />
                {visibleScopeStatuses.map((status) => (
                  <ObligationQueueScopeTab
                    key={status}
                    label={statusLabels[status]}
                    count={statusFacetCounts.get(status) ?? 0}
                    active={activeScope === status}
                    compact={panelOpenIntent}
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
                    // 2026-05-26: drop panel-close patch (see "All" tab
                    // handler above) so filter clicks no longer trigger
                    // the drawer width-collapse animation.
                    onClick={() => void setObligationQueueQuery({ status: [status] })}
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
              {/* 2026-05-26 (Yuqi /deadlines sixty-fifth pass — page
                  blink fix): same change as scope tabs — dropped the
                  `obligation: null, row: null` clears so action-chip
                  toggles no longer auto-close the detail panel and
                  trigger its width-collapse animation. */}
              {/* 2026-05-26 (Yuqi inset-followups B): Past due + Due
                  this week are now MUTUALLY EXCLUSIVE. Clicking one
                  clears the other. They're conceptually overlapping
                  views of the same date axis (Past due = days < 0,
                  Due this week = 0 ≤ days ≤ 7) so combining them is
                  meaningless. Needs evidence stays orthogonal — it's
                  a different axis (audit completeness, not date) so
                  the user can still combine "Past due AND needs
                  evidence" to find overdue rows still missing
                  documents. */}
              <ObligationQueueActionChip
                active={due === 'overdue'}
                onClick={() =>
                  void setObligationQueueQuery({
                    due: due === 'overdue' ? null : 'overdue',
                    // Clearing Due this week if it was active — same axis
                    daysMin: null,
                    daysMax: null,
                  })
                }
              >
                <Trans>Past due</Trans>
              </ObligationQueueActionChip>
              <ObligationQueueActionChip
                active={thisWeekFilterActive}
                onClick={() =>
                  void setObligationQueueQuery({
                    ...nextThisWeekFilterPatch(daysMin, daysMax),
                    // Clearing Past due if it was active — same axis
                    due: null,
                  })
                }
              >
                <Trans>Due this week</Trans>
              </ObligationQueueActionChip>
              <ObligationQueueActionChip
                active={evidence === 'needs'}
                onClick={() =>
                  void setObligationQueueQuery({
                    evidence: evidence === 'needs' ? null : 'needs',
                  })
                }
              >
                <Trans>Needs evidence</Trans>
              </ObligationQueueActionChip>
              <ObligationQueueActionChip
                active={awaitingSignature === true}
                onClick={() =>
                  void setObligationQueueQuery({
                    awaitingSignature: awaitingSignature ? null : true,
                  })
                }
              >
                <Trans>Awaiting signature</Trans>
              </ObligationQueueActionChip>
              <ObligationQueueActionChip
                active={projected === true}
                onClick={() =>
                  void setObligationQueueQuery({
                    projected: projected ? null : true,
                  })
                }
              >
                <Trans>Projected</Trans>
              </ObligationQueueActionChip>
              {/* "Penalty input needed" chip retired 2026-05-22 with
                hanxujiang's projected-exposure refactor (30f29dc).
                The `exposure` query param and its filter pipeline are
                gone; the surface that asks for penalty inputs lives
                inside the obligation drawer. */}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RollForwardAction canRun={canRunMigration} />
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
              {/* 2026-05-26 (Yuqi inset-followups D): Sort by converted
                  from Base UI Select → DropdownMenu w/ RadioGroup.
                  Base UI Select had different click + keyboard
                  behavior than every other dropdown in the product
                  (which all use Base UI Menu / DropdownMenu). User
                  flagged "incorrect dropdown interaction" — converting
                  to DropdownMenu puts Sort-by in the same interaction
                  family as the Columns dropdown right next to it.
                  Trigger chrome unchanged (single "Sort by X" label,
                  matches Alerts). */}
              <DropdownMenu>
                {/* 2026-05-26 (Yuqi feedback — "change the icon for
                    sort by to lucide arrow-down-up"): the FilterTrigger
                    default leading `+` icon read as "add a filter".
                    Sort/Group-by isn't a filter — it's reorder. Swapped
                    in `ArrowDownUp` (the canonical lucide sort icon)
                    so the trigger reads as "change how rows are
                    ordered/grouped". Aligns with the three Group-by
                    wireframes Yuqi shared. */}
                <DropdownMenuTrigger
                  render={
                    /* 2026-05-27 (Yuqi feedback "remove" Plus icon):
                       `noLeadingIcon` explicitly suppresses both the
                       default PlusIcon (which was showing up after
                       I removed ArrowDownUp) and any custom icon.
                       The "Group by" label already names the action. */
                    <FilterTrigger noLeadingIcon>
                      <span className="text-text-tertiary">
                        <Trans>Group by</Trans>
                      </span>
                      <span>
                        {group === 'client' ? <Trans>Client</Trans> : <Trans>Due date</Trans>}
                      </span>
                    </FilterTrigger>
                  }
                />
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  {/* 2026-05-26 (Yuqi follow-up — "remove group by
                      status, since there is already the top tab switch
                      between status"): Status option dropped. The
                      scope-tab band above the table already filters by
                      status, so a Group-by option was a redundant
                      control. Just Due date (default flat list) and
                      Client (per-client cluster headers) remain. */}
                  <DropdownMenuRadioGroup
                    value={group}
                    onValueChange={(next) => {
                      if (next === 'due' || next === 'client') {
                        void setObligationQueueQuery({ group: next })
                      }
                    }}
                  >
                    <DropdownMenuRadioItem value="due">
                      <Trans>Due date</Trans>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="client">
                      <Trans>Client</Trans>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* 2026-05-26 (Yuqi feedback — "14 rows is misleading on
                  top right. should say the number of deadlines in
                  total"): label switched from `totalShown` (current
                  page row count) to `rows.length` (total deadlines
                  matching current filters across ALL pages). The
                  per-page count was confusing — the page-header
                  already carries the total open count ("17 open"),
                  and this toolbar slot should reflect the same
                  semantic ("how many things am I working with"),
                  not "how many things are on this page right now." */}
              {/* 2026-05-27 (Yuqi "去掉这个17 deadlines"): inline
                  "{N} deadlines" count next to Group-by removed —
                  was duplicating what the status tabs above already
                  show (All 17, Not started 3, etc.). */}
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
                        // ONE state write.
                        // 2026-05-26 (Yuqi /deadlines sixty-fifth pass
                        // — "Show all doesn't work"): switched from
                        // `hide: null` → `hide: []`. The `hide` parser
                        // has a non-empty default (DEFAULT_HIDDEN_-
                        // COLUMN_IDS), so passing null resolved BACK
                        // to that default — which still hides 3+
                        // columns. The user clicked "Show all" and
                        // nothing changed because the defaults were
                        // re-applied. Passing an empty array (combined
                        // with `clearOnDefault: false` on the parser)
                        // explicitly says "no columns are hidden,
                        // preserve this in URL."
                        <button
                          type="button"
                          onClick={() => {
                            void setObligationQueueQuery({ hide: [] })
                          }}
                          className="rounded-sm text-xs font-normal text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
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
                {/* 2026-05-26 (step-6 ux-flow audit Q4.1): "rows" is
                    engineering-speak. CPAs say "deadlines". The prev
                    audit shipped the toast fix but missed this
                    counter chip. */}
                <Plural
                  value={selectedIds.length}
                  one="# deadline selected"
                  other="# deadlines selected"
                />
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
                  {/* 2026-05-27 (Step 6 cont Q4.4 — P1): each item now
                      respects `bulkStatusMutation.isPending` so a CPA
                      hammering "Filed" on a 47-row selection during the
                      first request can't fire the mutation twice. The
                      Base UI DropdownMenuItem honors `disabled` for
                      both pointer and keyboard activation. */}
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
              {/* Confirm projected (rolled-forward / auto-generated) deadlines so
                  they leave the Projected lens and re-enter the reminder pipeline.
                  Already-confirmed rows are no-ops server-side. */}
              <Button
                // In the Projected lens this is the primary action — lift it from
                // ghost to accent (+ a check icon) so CPAs don't miss it among the
                // peer bulk actions. Stays ghost in other views where the selection
                // may be already-confirmed rows.
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
                <ArrowUpRightIcon data-icon="inline-start" />
                <Trans>Export</Trans>
              </Button>
              {/* P0: bulk Form 8879 signature reminder. Outward-facing,
                  fan-out email — confirm before sending. Rows not awaiting
                  signature are skipped server-side. */}
              <Button
                variant="ghost"
                size="sm"
                disabled={!canUpdateObligationStatus || bulkRemindSignatureMutation.isPending}
                title={
                  canUpdateObligationStatus
                    ? t`Email selected clients a Form 8879 signature reminder`
                    : t`Requires status-update access`
                }
                onClick={() => setRemindToSignConfirmOpen(true)}
              >
                <SendIcon data-icon="inline-start" />
                <Trans>Remind to sign</Trans>
              </Button>
              {/* P1: bulk "Decide extension" — applies one extension plan to
                  every eligible selected deadline. Rows already extended (or
                  past the shared target date) are skipped server-side. */}
              <Button
                variant="ghost"
                size="sm"
                disabled={!canUpdateObligationStatus || bulkDecideExtensionMutation.isPending}
                title={
                  canUpdateObligationStatus
                    ? t`Apply an internal extension plan to the selected deadlines`
                    : t`Requires status-update access`
                }
                onClick={() => setBulkExtensionOpen(true)}
              >
                <CalendarClockIcon data-icon="inline-start" />
                <Trans>Decide extension</Trans>
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
            // Step 6 cont Q1.1/Q1.3: skeleton rows match the rest
            // of the app's loading rhythm; role=status + aria-live
            // for SR announce.
            <div
              role="status"
              aria-live="polite"
              aria-label={t`Loading deadlines`}
              className="grid gap-2 rounded-md border border-divider-subtle bg-background-default p-3"
            >
              {Array.from({ length: 12 }, (_, i) => `deadlines-skel-${i}`).map((key) => (
                <Skeleton key={key} className="h-8 w-full" />
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
                <Trans>Check your network and try again.</Trans>
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
            // 2026-05-26 (Yuqi /deadlines feedback — "refactor the
            // page structure or table structure/pagination framing"):
            // Table + Pagination wrapped in a single bordered card
            // (`tableCardRef`). The card:
            //   • Owns the rounded-md border (Table + Pagination both
            //     drop their own corner radii + borders; the wrapper
            //     clips them via overflow-hidden so the rounded
            //     corners just work).
            //   • Is `flex-1 min-h-0` inside the queue column so it
            //     fills the remaining vertical space below the filter
            //     bars. THIS is the height the `useResponsivePageSize`
            //     hook measures — the page-size math now reflects the
            //     actual rows-fit area, not "queue column minus an
            //     unstable estimate of filter-bar height."
            //   • `overflow-hidden` on the card is safe now because
            //     no descendant uses position: sticky any more — the
            //     pagination is a normal block at the bottom of the
            //     card, sitting flush against the rounded-b corner.
            // Net effect: page-flip pattern lands cleanly. Card height
            // = TableHeader + (rows × ROW_HEIGHT) + Pagination, with
            // the responsive hook choosing the row count so it fits.
            <div
              ref={setTableCardElement}
              // 2026-05-26 (Yuqi cross-table chrome unify — "can you
              // ensure the style across all of the tables are the
              // same? background for the table-body, the border
              // between rows, the border of the table, rounded
              // corners, radius, paddings, text sizes."): canonical
              // workbench-table card frame. Same recipe across
              // /deadlines + /clients + /rules/library:
              //
              //   • `rounded-md` (6px) corner radius
              //   • `border border-divider-subtle` hairline
              //   • `overflow-hidden` so rounded corners clip the
              //     thead's gray + the pagination footer flush
              //   • `bg-background-default/50` — one alpha-white
              //     surface that fills the entire card (thead bg
              //     stacks solid on top; tbody + empty-area + pag
              //     footer all read as one card). Previously the
              //     alpha lived on TableBody only, which left the
              //     space below partial pages + the pagination
              //     strip painted differently from the rows. Now
              //     one bg = one card.
              //
              // The earlier "white edge sliver" concern is moot now
              // that the inner wrapper drops its own bg + the
              // tbody alpha moved up to this layer.
              className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-divider-subtle"
            >
              {/* 2026-05-26 (Yuqi feedback — pagination position +
                  empty-row background): wrap Table in a flex-1 rows-
                  area so it ELASTICALLY fills the card. The rows-area
                  itself was previously `bg-background-default` so the
                  empty space below partial-page rows read as white.
                  2026-05-26 (Yuqi follow-up — "白边 / white edge on
                  the Deadlines table"): retired the nested
                  `bg-background-default` here. The thead's
                  `bg-background-default-dimmed` (gray) was sitting
                  ON TOP of this nested white wrapper; the outer
                  rounded-md card's corner clip showed the WHITE
                  through the rounded mask before the gray took over,
                  producing a 4-6px white sliver at the top-left and
                  top-right corners. With the nested bg dropped, the
                  thead's gray now goes flush to the rounded corner.
                  Empty space below partial-page rows now inherits
                  the outer card bg (set on the parent below).
                  2026-05-26 (Yuqi feedback — "can you see the gap
                  between the table row end and the pagination?"):
                  the rows-area is flex-1, so when the page has
                  fewer rows than fit the viewport the empty space
                  below the last row pushes the pagination footer
                  to the bottom of the card.
                  2026-05-26 (Yuqi cross-table chrome unify): the
                  alpha-white surface now lives on the OUTER card
                  wrapper (one bg for the whole card). This inner
                  wrapper drops its own bg so the layering reads
                  clean — outer card paints alpha-white, thead's
                  solid gray stacks on top, body inherits, empty
                  area below + pagination footer all read as one
                  surface. */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <Table className="rounded-none border-0 [&_th]:!whitespace-normal [&_th]:!px-2 [&_td]:!whitespace-normal [&_td]:!px-2 [&_td]:!align-middle [&_td]:break-words">
                  {/* 2026-05-26 (Yuqi feedback — "table head should not be
                    transparent. scrolling up you see the information behind
                    the header"): dropped the `!bg-background-default-dimmed`
                    override. That token resolves to alpha-0.4 gray, which
                    rendered as semi-transparent over the scrolling body
                    rows below. Falling back to the primitive's solid
                    `bg-background-subtle` keeps the same visual gray tone
                    WITHOUT alpha bleed. */}
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="hover:bg-transparent">
                        {headerGroup.headers.map((header) => {
                          const meta = header.column.columnDef.meta
                          return (
                            <TableHead
                              key={header.id}
                              className={cn(
                                // 2026-05-26 (Yuqi /deadlines sixty-fifth
                                // pass #2/#3/#6/#7): header text moved off
                                // the small-caps caption style. Yuqi flagged
                                // it as "not header style" — the uppercase
                                // + tracking + text-tertiary combo read as
                                // a kicker label, not a column header,
                                // especially next to the larger body text
                                // below. New style matches the Alerts
                                // AffectedClientsTable headers (text-sm
                                // sentence-case font-medium text-secondary)
                                // so column headers across the product
                                // read as one family.
                                'text-sm font-medium normal-case tracking-normal text-text-secondary',
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
                  {/* TableBody bg-background-default (white). Rows sit
                    on white; outer table is transparent. Per-row hover
                    state uses bg-state-accent-hover (light accent tint
                    = same color the right detail panel uses for a
                    selected row), so hovering previews where the
                    panel will paint when you click.
                    2026-05-26 (Yuqi /deadlines sixty-fifth pass follow-up
                    — denser rows): cell py-3 → py-2 (12px → 8px vertical
                    padding). Combined with text-base client name +
                    size-8 avatar the row was reading too tall; py-2
                    keeps the avatar comfortable and tightens the
                    overall row rhythm so more rows fit on a 992px
                    laptop viewport. */}
                  <TableBody className="bg-background-default [&_td]:py-2 [&_td]:text-sm [&_tr]:hover:!bg-state-accent-hover">
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
                        // 2026-05-26 (Yuqi Group-by wireframes — Sort by
                        // Status / Client / Due date): section headers
                        // are back, wired to the real map. The prior
                        // `undefined` hardcode is gone. Headers render
                        // ONLY when `group === 'client' || 'status'`;
                        // due-date mode is a flat list (the map is
                        // empty in that mode — see groupHeadersByFirstRowId
                        // above). Each header style varies per mode (see
                        // the render block below).
                        const groupHeader = groupHeadersByFirstRowId.get(tableRow.original.id)
                        // 2026-05-26 (Yuqi sixty-second pass — generalized
                        // collapse): collapse Set is keyed by `groupKey`
                        // — always `clientId` now that Group=Status is
                        // gone (clients are the only grouping axis,
                        // due-date mode is a flat list with no headers).
                        const rowGroupKey = tableRow.original.clientId
                        const headerCollapsed = groupHeader
                          ? collapsedClientGroups.has(groupHeader.groupKey)
                          : false
                        // Continuation rows in group=due (multi-deadline
                        // clusters): same as before — hide when their
                        // client cluster is collapsed. In group=client /
                        // group=status: the continuationRowIds set still
                        // applies (adjacent rows share clientId after
                        // the group sort), so this logic naturally
                        // generalizes — collapsing a group hides every
                        // continuation row in it.
                        const isHiddenContinuation =
                          continuationRowIds.has(tableRow.original.id) &&
                          collapsedClientGroups.has(rowGroupKey)
                        if (isHiddenContinuation) return null
                        const suppressLeafRow = groupHeader && headerCollapsed
                        return (
                          <Fragment key={tableRow.id}>
                            {groupHeader ? (
                              <TableRow className="border-b border-divider-subtle bg-background-subtle/60 hover:bg-state-base-hover">
                                <TableCell colSpan={visibleColumnCount} className="py-2 pl-3 pr-4">
                                  {/* 2026-05-26 (Yuqi Group-by wireframes,
                                      follow-up — Status option removed):
                                      Client-mode is now the only group
                                      surface. Header renders the bold
                                      client name + secondary meta line
                                      ("N deadlines · next [date]") + a
                                      small destructive-toned late pill
                                      when any deadlines in the cluster
                                      are past the internal target.
                                      Matches the wireframe's
                                      "Arbor & Vine LLC  2 deadlines ·
                                      next May 2  [2 late]" pattern. */}
                                  <button
                                    type="button"
                                    onClick={() => toggleClientGroupCollapse(groupHeader.groupKey)}
                                    aria-expanded={!headerCollapsed}
                                    aria-controls={`group-${groupHeader.groupKey}`}
                                    aria-label={
                                      headerCollapsed
                                        ? t`Expand ${groupHeader.clientName}`
                                        : t`Collapse ${groupHeader.clientName}`
                                    }
                                    className="inline-flex w-full items-center gap-2 rounded-sm py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                                  >
                                    <ChevronRightIcon
                                      className={cn(
                                        'size-3.5 shrink-0 text-text-tertiary transition-transform duration-100 ease-out',
                                        !headerCollapsed && 'rotate-90',
                                      )}
                                      aria-hidden
                                    />
                                    {/* Client-mode header content. Bold
                                        client name + secondary meta line
                                        + optional late pill. */}
                                    <>
                                      <span className="text-sm font-semibold text-text-primary">
                                        {groupHeader.clientName}
                                      </span>
                                      <span className="text-xs text-text-tertiary">
                                        <Plural
                                          value={groupHeader.count}
                                          one="# deadline"
                                          other="# deadlines"
                                        />
                                        <span aria-hidden> · </span>
                                        <Trans>
                                          next{' '}
                                          {formatDatePretty(
                                            groupHeader.earliestDueDate.slice(0, 10),
                                          )}
                                        </Trans>
                                      </span>
                                      {groupHeader.lateCount > 0 ? (
                                        <Badge
                                          variant="destructive"
                                          className="h-5 px-1.5 text-caption-xs"
                                          title={t`${groupHeader.lateCount} of this client's deadlines are past the internal target`}
                                        >
                                          <Plural
                                            value={groupHeader.lateCount}
                                            one="# late"
                                            other="# late"
                                          />
                                        </Badge>
                                      ) : null}
                                    </>
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
                                  // 2026-05-26 (Yuqi /deadlines feedback —
                                  // "row height in the expanded view different
                                  // from the unexpanded row height"): added
                                  // explicit fixed row height so rows with an
                                  // avatar (size-8 32px circle) and rows with
                                  // the `?` placeholder picker (also size-8)
                                  // render the SAME height regardless of cell
                                  // content. Without an explicit height the
                                  // table picked up the tallest cell's natural
                                  // height, which varied subtly per row
                                  // (different cell wrapping, different status
                                  // pill heights).
                                  // 2026-05-26 (Yuqi cross-table element
                                  // unify — "unify the deadline table, rule
                                  // library table, and client table"): row
                                  // height bumped h-12 (48px) → h-14 (56px)
                                  // to match /clients (h-14) and /rules/library
                                  // (h-14). All three workbench tables now
                                  // share the same row pitch — scanning the
                                  // queue feels identical to scanning the
                                  // clients directory or the rules catalog.
                                  'h-14 group cursor-pointer border-l-2 border-l-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt',
                                  tableRow.original.id === explicitActiveRowId &&
                                    'bg-state-accent-hover-alt',
                                  // Within-group rows lose their bottom border so
                                  // same-client filings weld into a single block.
                                  // The last row of each group keeps the divider,
                                  // making group boundaries scannable.
                                  // 2026-05-26 (Yuqi cross-table drift #13 —
                                  // "weld or hairline?"): canonical rule —
                                  // default behavior across /clients +
                                  // /rules/library is the primitive's hairline
                                  // between every row. Welding via `border-b-0`
                                  // is an opt-in for surfaces with EXPLICIT
                                  // logical sub-groups (this deadlines client
                                  // cluster is the only current consumer). New
                                  // table surfaces should NOT add weld logic
                                  // unless they have a real sub-unit to express.
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
                                      // 2026-05-26 (Yuqi sixty-sixth pass —
                                      // cell middle alignment): explicit
                                      // `align-middle` so a row with a
                                      // line-clamped 2-line client name
                                      // keeps the 1-line cells (status,
                                      // tax type, due-days, owner) optically
                                      // centered against it. The primitive
                                      // already sets it, but reinforcing
                                      // here guards against future
                                      // overrides via `meta.cellClassName`
                                      // that would otherwise win on
                                      // Tailwind specificity.
                                      className={cn(
                                        'align-middle',
                                        density === 'compact' && 'px-2 py-1.5',
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
                  </TableBody>
                </Table>
              </div>
              {/* 2026-05-26 (Yuqi /deadlines feedback — refactor):
                  pagination is the last child of the bordered table-
                  card. The card's rounded corners + border are
                  applied to the WRAPPER and clip via overflow-hidden,
                  so pagination drops its own rounded-b + outer
                  borders. Only the `border-t` hairline survives —
                  that's the line that separates the strip from the
                  last data row, which the card's overflow-hidden
                  clip won't draw on its own. `shrink-0` keeps the
                  strip at its natural height so the flex-1 rows-
                  area above can grow into all remaining card height
                  — that's what pins the pagination position across
                  pages with different row counts. */}
              {/* 2026-05-26 (Yuqi feedback — vertical padding bump):
                  py-2 (8px) → py-6 (24px) so the pagination strip
                  reads as a deliberate card footer with breathing
                  room, not a slim toolbar squeezed against the last
                  data row. The card now ends with a clearly framed
                  strip below the rows-area. */}
              <div className="flex shrink-0 items-center justify-between border-t border-divider-subtle bg-background-default px-2 py-6">
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
          )}
        </div>
        {/* Right-side detail panel — rendered inline inside the route's
          2-column flex (vs. the legacy floating Sheet). Fixed 600px on
          xl+; full-width stacked below the queue at narrower viewports.
          Only mounts when a row is selected; otherwise the queue gets
          the full page width. */}
        {/* 2026-05-26 (Yuqi fifty-ninth pass — architectural parity with
            Alerts panel): wrap in AnimatePresence + motion.div so the
            panel uses the same paper-rises enter + dissolve exit motion
            that /alerts uses. Two layered motion divs:
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
            // 2026-05-27 (Yuqi drawer parity — match AlertDetailDrawer):
            //
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
              // 2026-05-27 (Yuqi "draw 60%, table 40%, 但是每次都
              // 占不满"): 60/40 split via flex-basis so both columns
              // ALWAYS fill 100% of the available viewport. Drawer
              // gets basis-3/5 (60%), table column has flex-1 so it
              // takes the remaining 40%. AppShell cap dropped in
              // tandem so the available width = full viewport (minus
              // sidebar) at xl+. Below xl the drawer is full width
              // (mobile sheet pattern).
              className="flex min-h-0 self-stretch overflow-hidden w-full xl:basis-3/5 xl:shrink-0 xl:grow-0"
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
                  <div className="grid gap-2 rounded-md border border-divider-subtle bg-background-subtle p-2">
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
                    {/* 2026-05-26 (step-6 ux-flow audit Q3.5): explain
                        why the end date is invalid instead of just
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
                  // 2026-05-27 (audit-drain ζ Q3.4 — searchable
                  // combobox): the prior shape was a flat
                  // DropdownMenuRadioGroup, which forced a scroll-hunt
                  // for any practice with > ~15 clients. Promoted to
                  // the shared SearchableCombobox primitive — same
                  // form-select visual but with typeahead, keyboard
                  // narrowing, and an empty state when the search
                  // returns no match. State / county are folded into
                  // the row meta so partial typing ("CA", "Marin")
                  // still surfaces the client. Sibling Specific-client
                  // axis options stay an ExportAxisOption radio.
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
              {/* 2026-05-26 (step-6 ux-flow audit Q3.2): Email-to-self
                  and Email-to-teammate were disabled options with
                  apologetic copy. A list where 2/3 choices are dead
                  reads as a half-built product. Hidden until the
                  email pipeline lands — Download stays as the single
                  live option. Restore the disabled-with-tooltip
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
              {/* 2026-05-26 (step-6 ux-flow audit Q4.6): clarified
                  that the memo is optional; if the user wants no
                  audit-trail note they should know they can skip it. */}
              <Trans>Add an optional memo to record why on the audit trail.</Trans>
            </DialogDescription>
          </DialogHeader>
          {/* 2026-05-26 (step-6 ux-flow audit Q4.5): visible label
              for SR users (placeholder alone disappears on type). */}
          <div className="grid gap-2">
            <label htmlFor="extended-memo-textarea" className="text-sm font-medium">
              <Trans>Memo</Trans>
            </label>
            <Textarea
              id="extended-memo-textarea"
              placeholder={t`e.g. Filed Form 7004 — client confirmed by phone`}
              value={extendedMemo}
              onChange={(event) => setExtendedMemo(event.target.value)}
            />
          </div>
          <DialogFooter>
            {/* 2026-05-27 (σ cross-route audit D9): final outline →
                ghost straggler in obligations.tsx. Step 6 cont X1
                migrated Export / Penalty / Calendar-sync / etc., but
                the extended-memo dialog flew under the radar. */}
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
          // 2026-05-26 (Yuqi /deadlines sixty-fifth pass #2/#3): sortable
          // button now matches the new TableHead canonical (text-sm
          // sentence-case font-medium text-secondary). Previously the
          // sortable header was rendering as a quieter `text-text-
          // tertiary` than the row content — Yuqi flagged it as
          // "wrong colour" because the column header read as fainter
          // than the data it labeled. Bumping to text-secondary +
          // dropping the uppercase/tracking caption treatment makes
          // sortable and non-sortable headers indistinguishable in
          // weight.
          'text-sm font-medium normal-case tracking-normal',
          'text-text-secondary hover:text-text-primary',
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

// 2026-05-26 (Yuqi sixty-sixth pass — Unassigned `?` quick-pick):
// the dashed-outline `?` in the Owner column is now a real
// DropdownMenu trigger. Selecting a teammate calls
// `clients.bulkUpdateAssignee` with a single-id payload — the
// assignment lives on the CLIENT (not the obligation) per the
// current schema, so picking a teammate on one row assigns ALL
// of that client's deadlines to them. The footer copy spells
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
          {/* 2026-05-27 (Yuqi "assign是坏的" round 2): the actual
              MenuGroupContext crash on this picker was the
              DropdownMenuLabel rendered as a direct child of
              DropdownMenuContent — Base UI's MenuPrimitive.GroupLabel
              calls useMenuGroupRootContext() and throws when there
              is no <Menu.Group> / <Menu.RadioGroup> ancestor.
              bb12a8f4 moved the empty-state Item out (which Base UI
              tolerates either way) but left the Label outside the
              RadioGroup — the crash kept firing. Placing the Label
              INSIDE the RadioGroup gives it the context it needs
              and preserves the "Assign owner" header. */}
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
                <span
                  className={cn(
                    'inline-flex size-5 items-center justify-center rounded-full text-caption-xs font-semibold uppercase tracking-tight',
                    isCurrentUser
                      ? 'bg-state-accent-hover-alt text-text-accent'
                      : 'bg-background-subtle text-text-secondary',
                  )}
                >
                  {initialsFromName(member.name)}
                </span>
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

// 2026-05-24 (critique P0): terminal-state rows shouldn't surface
// lateness as live debt. Once a row is `done` ("Filed"), `paid`
// ("Filed" on payment-track rows), or `completed`, the row is
// closed — "18 days late" alongside a "Filed" / "Completed" pill
// reads as if there's still work to do. We render a muted
// "Filed N days late" / "Filed N days early" stat instead —
// quality signal, not active red. Mirrors the same three statuses
// that `features/obligations/status-control.tsx` displays as
// "Filed" / "Completed".
//
// 2026-05-29: `extended` stays out of this terminal set. The Extension
// tab saves an internal target and the detail strip still shows that
// target as active date context, so the queue cell must not collapse
// to an em dash just because the row has an extension plan.
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

// 2026-05-24 (re-critique): stages whose `isPastInternalDue` red
// ring should be suppressed in the milestone timeline. Lateness on
// a Filed/Completed row is a quality stat, not an active urgency —
// the dates panel shows the red Internal due value, that's the
// surface for "was this filed on time?". Hoisted from inside
// `PathToFilingSummary` so we don't allocate the Set every render.
const TIMELINE_TERMINAL_STAGE_KEYS: ReadonlySet<string> = new Set(['done', 'completed'])

function DueDaysPill({ days, status }: { days: number; status: ObligationStatus }) {
  if (isDueDaysSuppressedForStatus(status)) {
    // Quality stat, not active urgency. Skip the dot, drop the
    // urgency tone, render as a muted line. Drop entirely when the
    // row landed exactly on its deadline — no signal there.
    //
    // 2026-05-27 (Agent X3 milestone audit M-08): `not_applicable`
    // is a closed state where the "Filed N days late/early" phrasing
    // doesn't apply because the obligation never applied. Render a
    // quiet em-dash so the column still reserves its baseline without
    // claiming a filing event that didn't happen.
    if (status === 'not_applicable' || days === 0) {
      return <span className="text-sm text-text-tertiary tabular-nums">—</span>
    }
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
  // 2026-05-26 (Yuqi /deadlines sixty-fifth pass #17): dropped the
  // outline Badge wrapper. Yuqi questioned "is it necessary to put
  // it in a badge pill?" — the row already carries the Status pill
  // (filled, workflow state) in the next column, and a second
  // bordered chip for due-days read as "two badges, same row,
  // different meanings, what's a primary?" Now: dot + plain text,
  // text-sm tabular-nums, urgency carried by text color (red /
  // amber / neutral) and the leading dot/icon. Reads as a value
  // ("3 days late"), not a control.
  // 2026-05-26 (Yuqi sixty-eighth pass #6/#7): dropped the Info
  // icon on late rows. The leading dot already carries the urgency
  // tone (red for late, amber for soon, neutral for future) and the
  // red text reinforces it — the Info icon was a third signal on
  // the same axis. Cell gap bumped 1.5 → 2 so dot + value have a
  // touch more breathing room.
  return (
    <span
      className={cn(
        // 2026-05-27 (Yuqi "去掉这个点"): BadgeStatusDot removed
        // entirely. The tinted text color already carries the
        // urgency signal (text-text-destructive for late, etc.);
        // the dot was redundant noise next to the date.
        'inline-flex items-center text-sm tabular-nums leading-tight',
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

// `RangeHeaderFilterDropdown` retired 2026-05-26 with the sixty-fifth
// pass #5. The column-header range filter overlapped semantically
// with the sort handle on the same header AND with the toolbar
// "Past Due" / "Due this week" chips above. If we ever need a
// generic numeric-range column filter again, restore from git
// history (commit before 2026-05-26-deadlines-pass-65).

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
              <label className="flex items-center gap-2 text-sm text-text-secondary">
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
              <p className="rounded-md bg-background-subtle px-3 py-2 text-sm text-text-secondary">
                <Trans>
                  You reminded this client{' '}
                  <Plural value={daysSinceReminded} _0="today" one="# day ago" other="# days ago" />
                  . Send another?
                </Trans>
              </p>
            ) : null}
            <div className="grid gap-1.5">
              <label htmlFor="signature-reminder-subject" className="text-sm font-medium">
                <Trans>Subject</Trans>
              </label>
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
              <label htmlFor="signature-reminder-body" className="text-sm font-medium">
                <Trans>Message</Trans>
              </label>
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
              <div className="grid gap-1 rounded-md bg-background-subtle p-3">
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
              <label htmlFor="bulk-extension-memo" className="text-sm font-medium">
                <Trans>Decision memo</Trans>
              </label>
              <Textarea
                id="bulk-extension-memo"
                rows={4}
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="bulk-extension-source" className="text-sm font-medium">
                <Trans>Source (optional)</Trans>
              </label>
              <Input
                id="bulk-extension-source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                <Trans>Internal target date</Trans>
              </label>
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
  const permission = useFirmPermission()
  const canRequestInput = permission.firm?.role === 'preparer'
  // Lifecycle v2: when on, the Audit tab is relabeled to "Timeline"
  // and its content swaps to the milestone-grouped timeline. See
  // docs/Design/obligation-lifecycle-design-brief.md.
  const lifecycleV2 = useLifecycleV2()
  const legacyStatusLabels = useStatusLabels()
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const statusLabels = lifecycleV2 ? v2StatusLabels : legacyStatusLabels
  // 2026-05-26 (step-6 ux-flow audit Q7.1): removed dead
  // `_statusDropdownOptions` computation. The drawer-header status
  // pill was retired and the dropdown-options value was being
  // computed only to immediately `void` it. If the pill comes back,
  // re-derive from LIFECYCLE_V2_STATUSES / ALL_STATUSES at that
  // point — the cost is negligible.
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
  // Materials tab multi-select model (2026-05-23). Keyed by the
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
      (requestRecipientsQuery.data ?? []).filter(
        (member) => member.role === 'owner' || member.role === 'partner',
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
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
  const correctionMaterialsMode = row?.status === 'review' && row.efileRejectedAt !== null
  const correctionChecklistItems = checklist.filter((item) => item.status === 'needs_review')
  const canOpenMaterialsRequestPreview =
    checklist.length > 0 && (!correctionMaterialsMode || correctionChecklistItems.length > 0)
  const canShowMaterialsRequestAction =
    !latestRequest ||
    latestRequest.status === 'revoked' ||
    (correctionMaterialsMode &&
      (latestRequest.status === 'responded' || latestRequest.status === 'expired'))
  // 2026-05-26 (Step 9 AI Visibility Audit F-020): surface the
  // "degraded fallback list" signal as an inline banner above the
  // checklist, not just a 4-second toast that disappears forever.
  // The degraded flag IS the AI's "I'm not sure" state — losing
  // it on render means the user can't tell a fallback-list run
  // apart from a real run on a stale tab.
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
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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

  // Materials multi-select handlers (2026-05-23). Toggling a row's
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
      toast.error(t`Reason is required.`)
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
          "Drawer canonical"). */}
      {/* 2026-05-26 (Yuqi sixty-first pass — header tighter):
          py-10 → py-6 (40px → 24px vertical). On the obligation
          drawer the header carries the form-code h2 + flag chips +
          meta line — about 80-100px of content. py-10 (40+40)
          added 80px of dead chrome around it. py-6 (24+24) gives
          enough breathing room without the panel reading as half-
          empty before the body even starts. Alert drawer keeps
          py-10 because its header has a state kicker + bigger h1
          + chip row + description — more content earning more
          vertical space. */}
      {/* 2026-05-27 (Yuqi drawer parity — match AlertDetailDrawer):
          header padding aligned to AlertDetailDrawer.tsx L574
          (`px-12 py-10`). Both right-rail drawers in the product
          now share the same paper-document header rhythm — same
          left margin top-to-bottom, same vertical breathing room
          above the title. The earlier inset-followups tightening
          (px-8 py-5) was reverted in favor of cross-drawer
          consistency per Yuqi's "should match Alert detail"
          instruction. */}
      {/* 2026-05-27 (Yuqi "remove top padding"): header pt-10 → pt-4
          so the title sits closer to the top of the drawer. Bottom
          spacing kept (pb-10) for the breathing gap before tabs. */}
      <header className="relative flex flex-col gap-1.5 px-12 pt-8 pb-2">
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
          // 2026-05-27 (Yuqi drawer parity): close-button cluster
          // pinned at `right-3 top-3` to match AlertDetailDrawer's
          // close affordance (AlertDetailDrawer.tsx L1112). Both
          // drawers' close X now sit at the identical corner inset.
          <div className="absolute right-3 top-3 flex items-center gap-0.5">
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
            // 2026-05-26 (Yuqi feedback #14): client link bumped from
            // text-xs / icon size-3 → text-sm / icon size-3.5, and the
            // name from font-medium → font-semibold. The kicker was
            // reading as quieter-than-form-title, but the client is
            // the row's true primary identity (form is the secondary
            // identifier). Bigger text gives the client the visual
            // anchor it deserves.
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
              const showWaitingChip = row.status === 'waiting_on_client'
              const showBlockedChip = row.status === 'blocked'
              // `pillDisplayStatus` retired with the drawer-header
              // status control removal (feedback #4). The dedup logic
              // it powered (showing "In progress" pill while the chip
              // says "Waiting on client") doesn't apply when the pill
              // doesn't exist on this surface.
              return (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pr-8">
                  {/* 2026-05-26 (Yuqi feedback #12): h1 size matched
                      to Alert's panel title — text-2xl. Was text-lg
                      which read as a quieter "label" than the alert
                      drawer's authoritative h1. Both drawers now use
                      the same anchor weight. */}
                  <h2 className="text-2xl font-semibold leading-tight text-text-primary">
                    <TaxCodeLabel code={row.taxType} className="cursor-default" />
                  </h2>
                  {/* 2026-05-26 (Yuqi feedback #4): dropped the drawer
                      header's ObligationQueueStatusControl. With the
                      table's Status column visible (per #8) AND
                      interactive, the same control rendered TWICE on
                      the same screen (once in the row, once in the
                      drawer header) — "appeared again, bad UX." The
                      table cell's pill is the canonical interactive
                      affordance; the drawer header now just carries
                      the form title + meta chip cluster. */}
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
          padding as AlertDetailDrawer body — left margin runs as one
          line from header through body. */}
      {/* 2026-05-26 (Yuqi forty-seventh pass — sticky-footer buffer):
          body bottom padding bumped `py-10` → `pt-10 pb-24` to match
          AlertDetailDrawer. Sticky footer (min-h-16 + py-4) was
          covering the last content row when scrolled — 96px buffer
          guarantees clean separation between bottom content and
          action bar. */}
      {/* 2026-05-26 (Yuqi forty-eighth pass — body flex wrapper):
          body wrapper is now `flex flex-col gap-4` per drawer
          canonical. Children get a consistent 16px gap between
          them instead of each carrying its own `mb-*` margin.
          Same shape as AlertDetailDrawer body so the two drawers
          read with identical rhythm. */}
      <div
        className={cn(
          // 2026-05-27 (Yuqi drawer parity — match AlertDetailDrawer):
          // body padding aligned to AlertDetailDrawer.tsx L752
          // (`px-12 pt-10 pb-24`). Same left margin as header/footer
          // so the panel reads as one continuous paper-document
          // surface edge-to-edge. The earlier inset-followups
          // tightening (px-8 pt-0) was reverted for cross-drawer
          // consistency; the body's pt-10 buffer mirrors the alert drawer's
          // header → body breathing room.
          // 2026-05-27 (Yuqi "remove padding-top"): pt-10 dropped.
          'flex flex-col gap-4 px-12 pb-12',
          // 2026-05-26 (Yuqi feedback #1): added scrollbar-gutter:stable
          // on the panel-mode body. Different tabs render different
          // content heights (Summary is short, Materials is long).
          // Without gutter:stable, the scrollbar appears/disappears
          // on tab switch and shifts the content ~15px horizontally —
          // reads as "panel width flickers." Reserving the scrollbar
          // space holds the content steady regardless of which tab
          // is active.
          mode === 'panel' && 'flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]',
        )}
      >
        {detailQuery.isLoading ? (
          <EmptyPanel className="py-8 text-center">
            <Trans>Loading deadline detail…</Trans>
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
            {/* 2026-05-26 (Yuqi inset-followups A): sticky-section
                heading dropped its `border-b border-divider-subtle
                bg-background-subtle`. The gray bg + bottom border were
                framing the deadline strip as a separate "card" inside
                the drawer body — fighting the flat surface treatment.
                Now: just the sticky position + tight padding, no
                visual weight beyond the content itself. Also bled
                changed `-mx-12 px-12` → `-mx-8 px-8` to match the new
                tightened body padding. */}
            {/* 2026-05-26 follow-up: keep the flat treatment, but make
                the sticky strip opaque. In the Materials tab, checklist
                rows scroll under this band; a transparent sticky layer
                lets document text show through the date tiles/gutters.
                White surface + subtle bottom rule preserves the drawer
                body feel while giving the sticky layer a real backing. */}
            <div
              className={cn(
                'flex flex-col gap-3',
                mode === 'panel'
                  ? // 2026-05-27 (Yuqi drawer parity): negative bleed
                    // updated -mx-8 → -mx-12 to match the body's new
                    // px-12 padding. Inside px-12 re-applies the
                    // canonical inset, so the sticky strip's content
                    // edge still aligns with the rest of the body.
                    'sticky top-0 z-20 -mx-12 border-b border-divider-subtle bg-background-default px-12 py-3'
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
            {/* 2026-05-26 (Yuqi feedback — "the 4 tabs in the deadline
                detail panel can be more obvious, … more obvious about
                it is with the below information, not above"): inverted
                the spacing rhythm so the tab bar visually belongs to
                what's BELOW it.

                Before: tabs sat ~8px below the sticky strip and ~24px
                above the content (gap-2 from Tabs root + mt-4 on
                TabsContent). That asymmetry made the bar read as the
                bottom edge of the header block above.

                After: `pt-3` on this wrapper (+ the Tabs root's
                `gap-2`) opens a 20px buffer ABOVE the bar — enough
                to separate it from the sticky strip without the
                cavernous 32px the earlier `pt-6` produced (Yuqi
                follow-up: "still strange padding and gap"). `mt-0`
                on the TabsContent panels drops the gap below the
                bar to just `gap-2`, so the bar still reads as the
                leading edge of the tab content beneath. */}
            <div className="sticky top-0 z-10 bg-background-default pt-3">
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
                    // 2026-05-26 (Yuqi feedback #2): white bg on the
                    // TabsList. The line-variant defaulted to transparent
                    // which let the body's white still show through, but
                    // when the sticky deadline strip above scrolls behind
                    // the tabs they bled together visually. Explicit
                    // white bg gives the tab bar a clear surface.
                    //
                    // 2026-05-26 (Yuqi feedback — "justify content left"
                    // + "remove the left right padding"): bar is now
                    // `justify-start` so the four tabs hug the left
                    // edge instead of distributing across the panel
                    // (each TabsTrigger drops `flex-1` for the same
                    // reason — see the trigger className below). Inter-
                    // tab `gap-1` → `gap-6` opens 24px between tabs so
                    // they remain individually scannable now that each
                    // one no longer carries its own `px-2`.
                    className="flex h-11 w-full justify-start gap-6 border-b border-divider-subtle bg-background-default text-sm"
                  >
                    {/* 2026-05-26 (Yuqi feedback — "tabs can be more
                        obvious, signalling people hey check these
                        out" + "yes please" to pushing the active
                        state further): every TabsTrigger now layers
                        FOUR signals so the active tab pops without
                        the bar abandoning the tab paradigm in favor
                        of a segmented-control look:
                          1. Inactive text: `text-text-secondary` —
                             still visible enough to invite a click.
                          2. Active text: `text-text-primary` +
                             `font-semibold` — strongest contrast
                             jump from inactive (medium-weight
                             secondary) to active (semibold primary).
                          3. Active underline color: `accent-default`
                             (matches the /clients/[id] tabs +
                             /deadlines scope tabs), so the rule
                             pops in the canonical brand accent
                             instead of plain text-active black.
                          4. Active underline position: primitive
                             default (`bottom-[-5px]`) — floats ~5px
                             below the trigger for 15-16px breathing
                             room from the text descender (an earlier
                             `bottom-0` pulled it too close — "the
                             underline is so close to the text").
                        Stayed with TABS (not segmented control)
                        because the 4 panels are different sections
                        of the SAME deadline (Summary / Materials /
                        Extension / Evidence), not filters or scopes.
                        Segmented control belongs to the /deadlines
                        top-level scope tabs where each option
                        re-filters the queue. */}
                    {visibleTabs.has('summary') ? (
                      // 2026-05-26 (Yuqi seventieth pass #5): dropped
                      // the leading Info icon. The "Summary" word is
                      // self-explanatory; an info-glyph next to it
                      // implied "click here for info ABOUT the
                      // summary" rather than "this is the summary
                      // tab." Other tabs (Materials, Extension,
                      // Evidence) keep their icons because they
                      // distinguish by purpose (paperclip /
                      // calendar / file).
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
                            // 2026-05-26 (Yuqi feedback #3): badge subtler.
                            // Was solid destructive red with white text —
                            // that loudness made every Materials tab with
                            // outstanding items shout "danger." Now: light
                            // accent tint (state-accent-hover-alt) with
                            // accent-tinted text. Communicates "13 items
                            // here" without alarm chrome.
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
                    {/* Risk tab removed 2026-05-21 — risk inputs live on the
                        client detail page (ClientRiskInputsPanel) rather than
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
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              >
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
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              >
                {/* 2026-05-26 (Yuqi sixty-sixth pass — Materials
                    structural tighten, #13 "scattered"): outer gap
                    bumped from gap-3 → gap-4 so each top-level
                    block (overview, checklist, sent panel, tax
                    year settings) reads as its own clear section
                    instead of one long stack. Cross-tab default. */}
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
                    <div className="flex items-start gap-2 rounded-md border border-state-destructive-border bg-state-destructive-hover px-3 py-2 text-sm text-text-destructive">
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
                              className="h-5 rounded-md px-1.5 text-caption-xs font-medium text-text-secondary"
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
                          <div className="flex h-8 items-center gap-2 rounded-md px-1 text-sm font-medium text-text-secondary">
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
                        {/* 2026-05-26 (Step 9 AI Visibility Audit F-020):
                        when the auto-generated checklist came back
                        with `degraded: true` the toast disappears in
                        4 seconds but the user keeps using the
                        fallback list. Surface the degraded state as
                        an inline banner that stays as long as the
                        fallback list is on screen — the AI's "I'm
                        not sure" signal needs to be persistent,
                        not transient. */}
                        {checklistDegraded ? (
                          <div className="flex items-start gap-2 rounded-md border border-state-warning-active-alt bg-state-warning-hover px-3 py-2 text-xs text-text-warning">
                            <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            <span>
                              <Trans>
                                AI couldn't reach the full model — showing a fallback list. Review
                                each item against the deadline before relying on it.
                              </Trans>
                            </span>
                          </div>
                        ) : null}
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
                          // 2026-05-26 (Yuqi sixtieth pass — terminal-state
                          // Materials framing): when the row is filed /
                          // completed the checklist becomes an ARCHIVE,
                          // not a to-do list. "Outstanding 13" on a
                          // Filed row read as "13 items still to do"
                          // when the work is closed — the items just
                          // weren't ticked in the audit trail.
                          // Terminal headings:
                          //   • "Outstanding" → "Not in audit trail" —
                          //     same items, but framed as "missing from
                          //     the archive" not "still to be done."
                          //   • "Received" → "Archived" — same items,
                          //     historical record framing.
                          const isTerminalRow = row.status === 'done' || row.status === 'completed'
                          return (
                            <div className="flex flex-col gap-4">
                              {/* 2026-05-26 (Yuqi feedback #5): dropped the
                              "This deadline has been filed" banner. The
                              header status pill + the section title
                              ("Not in audit trail" / "Archived") +
                              ReadinessOverview's italic subline already
                              tell the historical-record story 3x over;
                              this green banner was a 4th. Removed. */}
                              {/* 2026-05-26 (Yuqi seventieth pass #6,
                                #9): Outstanding / Received are now
                                small kicker sub-headers (text-
                                caption-xs uppercase tracking-wider
                                text-text-tertiary) — Yuqi's "needs
                                review from Rule Library's table"
                                reference. The Materials checklist
                                h3 above is the section title; these
                                are sub-section labels under it.
                                Inner gap tightened from `gap-2 →
                                gap-1.5` per #9. */}
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
                                  <p className="rounded-md border border-divider-subtle p-4 text-center text-sm text-text-tertiary">
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
                          {/* 2026-05-26 (Yuqi sixty-ninth pass #4):
                              Tax year type binary toggle converted
                              from Base UI Select → DropdownMenu so
                              the interaction matches every other
                              dropdown in the drawer (Sort-by /
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
                            {/* 2026-05-27 (σ cross-route audit D10):
                                Save in tax-year-profile drawer drifted
                                from the cross-app mutation-button
                                pattern — relabel only, no Loader2 + no
                                aria-busy. Step 6 cont X2 canon: spinner
                                + busy state + label-change together. */}
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
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
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
                  {/* 2026-05-26 (Yuqi sixty-sixth pass — cross-tab
                      visual unity): the "Example" panel previously
                      wore a bordered card chrome
                      (`rounded-lg border border-divider-regular`)
                      that didn't appear anywhere else in the drawer.
                      Summary uses self-framed components; Materials
                      uses flat sections with `<h3>` headers. Now
                      Extension also reads as a flat section — header
                      + content, no extra card frame around the rule
                      facts. */}
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
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              >
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
                  {/* 2026-05-26 (Yuqi sixty-sixth pass — cross-tab
                      section heading unify): workpapers heading was
                      `text-xs uppercase tracking-wider text-text-
                      tertiary` (kicker style); every other tab uses
                      `text-sm font-semibold text-text-primary` for
                      section labels. Aligned so all 4 tabs share
                      one heading vocabulary. */}
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
              </motion.div>
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
        /* 2026-05-27 (Yuqi drawer parity — match AlertDetailDrawer):
           footer chrome reinstated to match the alert drawer's
           sticky action bar (AlertDetailDrawer.tsx L955):
             • `border-t-2 border-divider-regular` — committed
               decision surface separator (vs. relying on body's
               pb-24 alone, which read inconsistent between
               drawers).
             • `px-12` — match header/body left margin.
           The pt-4 pb-6 vertical rhythm and `min-h-16` stay —
           those already mirror the alert drawer. */
        <div className="sticky bottom-0 mt-auto flex min-h-16 flex-wrap items-center justify-between gap-2 border-t-2 border-divider-regular bg-background-default px-12 pt-4 pb-6">
          {/* 2026-05-26 (Yuqi feedback #7): "Last updated" stacked
              vertically — label on line 1, timestamp on line 2.
              Single-line layout was getting cramped at narrower
              panel widths with the action cluster on the right. */}
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
        // 2026-05-26 (Yuqi forty-eighth pass — drawer canonical
        // applied to obligation panel): chrome migrated to match
        // AlertDetailDrawer's panel-mode aside exactly. Both
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
  // 2026-05-26 (step-6 ux-flow audit Q6.3): keep role-specific
  // labels — collapsing manager/preparer/coordinator to "Team
  // member" hid information the rest of the app exposes.
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
          <div className="grid gap-2">
            {/* 2026-05-26 (step-6 ux-flow audit Q6.1): converted the
                span "Recipient" tag to a real <label id> so the
                DropdownMenuTrigger button can claim it via
                aria-labelledby — SR users now hear "Recipient: Joe
                Smith" instead of just the truncated trigger text. */}
            <label
              id="deadline-input-request-recipient-label"
              className="text-sm font-medium text-text-primary"
            >
              <Trans>Recipient</Trans>
            </label>
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
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-background-subtle text-caption-xs font-semibold uppercase text-text-secondary">
                        {initialsFromName(recipient.name)}
                      </span>
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
              <p role="alert" className="text-sm text-text-warning">
                <Trans>Add an active owner or partner before sending an input request.</Trans>
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <label htmlFor="deadline-input-request-message" className="text-sm font-medium">
              <Trans>Message</Trans>
            </label>
            <Textarea
              id="deadline-input-request-message"
              value={message}
              maxLength={1000}
              rows={5}
              placeholder={t`Add the decision or context you need.`}
              onChange={(event) => onMessageChange(event.currentTarget.value)}
            />
          </div>
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="authority-rejected-date" className="text-sm font-medium">
                <Trans>Rejected date</Trans>
              </label>
              <Input
                id="authority-rejected-date"
                type="date"
                value={draft.rejectedAt}
                onChange={(event) => onDraftChange({ rejectedAt: event.currentTarget.value })}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="authority-rejected-authority" className="text-sm font-medium">
                <Trans>Authority</Trans>
              </label>
              <Input
                id="authority-rejected-authority"
                value={draft.authority}
                maxLength={80}
                placeholder={t`IRS / CA FTB`}
                onChange={(event) => onDraftChange({ authority: event.currentTarget.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="authority-rejected-reference" className="text-sm font-medium">
              <Trans>Reject code / notice reference</Trans>
            </label>
            <Input
              id="authority-rejected-reference"
              value={draft.reference}
              maxLength={120}
              placeholder={t`Optional`}
              onChange={(event) => onDraftChange({ reference: event.currentTarget.value })}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="authority-rejected-reason" className="text-sm font-medium">
                <Trans>Reason</Trans>
              </label>
              <span className="text-caption-xs tabular-nums text-text-tertiary">
                {draft.reason.length}/280
              </span>
            </div>
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
              <p
                id="authority-rejected-reason-error"
                role="alert"
                className="text-sm text-text-danger"
              >
                <Trans>Reason is required.</Trans>
              </p>
            ) : null}
          </div>
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
                      'grid gap-1 rounded-md border px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
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
              Review the email generated from the Reminders template before creating the client
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
              className="rounded-md border border-state-danger-border bg-state-danger-hover p-3 text-sm text-text-danger"
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
                <p className="rounded-md border border-divider-subtle bg-background-subtle p-3 font-mono text-sm text-text-primary">
                  {preview.recipientEmail ?? <Trans>A materials link will be created only.</Trans>}
                </p>
                {!preview.emailWillBeQueued ? (
                  <p className="text-xs text-text-tertiary">
                    {preview.recipientEmail && !preview.templateActive ? (
                      <Trans>
                        The template is paused in Reminders, so no email will be queued.
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
                <p className="rounded-md border border-divider-subtle p-3 text-sm font-medium text-text-primary">
                  {preview.subject}
                </p>
              </section>
              <section className="grid gap-2">
                <span className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
                  <Trans>Email body</Trans>
                </span>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-divider-subtle bg-background-subtle p-3 font-mono text-xs leading-relaxed text-text-primary">
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
            <Trans>Edit template in Reminders</Trans>
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
    <section className="grid content-start gap-2 rounded-md border border-divider-subtle p-3">
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

// 2026-05-27 (Step 9 merge cleanup): the orphaned `_DeadlineTipPanel`
// + `InsightStatusBadge` + `InsightCitationChips` cluster was retained
// when the Risk tab was removed, surviving as `_`-prefixed dead code.
// Step 9's AI-visibility audit explicitly flagged this as "fully wired
// in the data layer but its React component is orphaned." The cluster
// referenced symbols (`AiInsightPublic`, `FileSearchIcon`,
// `UpgradeCtaButton`) that no longer exist in this file's import
// graph, so the merge would not compile with them in place. If we
// want to revive deadline-tip insights, restore from
// `feat/step-9-ai-visibility-audit` and reintroduce the required
// imports + a real mount point.
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
      // 2026-05-26 (Yuqi sixty-first pass — better terminal copy):
      // "Audit trail captured 0 of 13 items as received" on a filed
      // row read as either (a) we filed without any receipts (alarming)
      // or (b) the audit trail is broken (also alarming). Reframe by
      // ratio: complete archive vs partial vs untracked, with copy
      // that matches each case honestly.
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
  // Terminal-state subline now renders as a description under the
  // "Materials checklist" heading instead of above it.
  if (isTerminal) return null
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
  const { i18n, t } = useLingui()
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
  // 2026-05-26 (Yuqi sixty-first pass — compact terminal strip):
  // when the row is filed AND internal + payment dates match the
  // filing date (the common case for a clean filing), the original
  // 3-card strip was 100+ px of dates that all said the same thing.
  // Render a single compact one-liner instead — "Filed on
  // 2026-03-16 · 70 days ago" — and skip the redundant Internal /
  // Payment cards. Non-terminal rows + terminal rows with mixed
  // dates keep the full strip.
  // 2026-05-27 (phi journey audit J1): suppress the compact-terminal
  // collapse when the payment is overdue. The compact strip hides the
  // Payment tile (the dates all "match"), but a Filed-but-payment-
  // overdue row REALLY DOES have a live signal on the payment leg
  // that the user needs to see. Fall through to the full 3-tile
  // strip so the Payment tile can paint destructive.
  const hasOverduePayment =
    paymentIso !== null && paymentIso < todayIso && row.status !== 'completed'
  const allTerminalDatesMatch =
    isTerminal &&
    filingIso !== null &&
    internalIso === filingIso &&
    (paymentIso === null || paymentIso === filingIso) &&
    !hasOverduePayment
  if (allTerminalDatesMatch) {
    // 2026-05-26 (Yuqi feedback #3): dropped the full green chrome
    // (border-state-success-border + bg-state-success-hover) from the
    // compact hero. With the header status pill ALSO carrying the
    // green Filed tone, having the hero strip + the Filed status pill
    // BOTH paint green was "the green status appears three times."
    // Hero is now a quiet divider-subtle bordered strip — date data
    // only, with a small green ✓ icon as the state cue. The header
    // pill is the single green-tone anchor.
    return (
      <div
        aria-label={t`Filed on ${formatDate(filingIso)}`}
        // 2026-05-26 (Yuqi feedback #13): dropped the rounded-lg
        // border + bg. The compact hero is just info — date and
        // relative time, no surface needed. Now an inline row of
        // text with a leading green check, no frame.
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
  // 2026-05-26 (Yuqi seventieth pass — deadline strip unified 3-col):
  // dropped the HERO + 2-col secondary split (items #2, #3, #4, #14).
  // The hero card was painting too much red on missed rows AND was
  // visually disconnected from the two sub-tiles below it. Now ALL
  // three deadlines share a single grid-cols-3 row with the same
  // tile shape — Filing always FIRST so it reads as the primary
  // anchor, then Internal, then Payment. The tile tone ladder
  // carries urgency:
  //   • Filing on a missed row → bordered red tone (destructive
  //     border + tinted bg + red value). No hero-style filled
  //     background.
  //   • Filing on terminal → success tone.
  //   • Other tiles → neutral white with a small red value when the
  //     individual date is past.
  // Date text reduced from `text-2xl` (hero) to `text-base` (item
  // #2: too big). The "MISSED" word doesn't repeat as a separate
  // badge inside the tile — the header pill carries that text
  // (answers item #4 "what's the relationship"). The tile's tone
  // (red border + tint) is the visual cue.
  // 2026-05-27 (Yuqi screenshot — pill tone with payment-overdue rows):
  // `'done'` (UI label "Filed") means the filing event has been
  // satisfied but the payment may still be outstanding. The prior
  // tone math painted the FILING tile red whenever the filing date
  // was past AND the row wasn't terminal — but a `'done'` row IS
  // satisfied on its filing milestone; the red signal belongs on
  // payment-due. Split the "satisfied" check by milestone.
  const filingSatisfied = isTerminal || row.status === 'done' || row.status === 'paid'
  const filingPast = filingIso !== null && filingIso < todayIso && !filingSatisfied
  // Internal target overdueness is moot once the filing is satisfied —
  // the firm's earlier internal goal stops being actionable once the
  // statutory filing event has happened (Filed / Paid / Completed).
  // Gating on `filingSatisfied` (not `isTerminal`) keeps `'paid'` rows
  // from showing a red "INTERNAL TARGET N DAYS OVERDUE" chip beside a
  // green "Filed" status pill — the conflict the audit (L10) flagged.
  const internalPast = internalIso !== null && internalIso < todayIso && !filingSatisfied
  // 2026-05-27 (root-bug + phi J1 merge): payment-overdue isn't gated
  // by `isTerminal` / filing-satisfied. A row that's been Filed
  // (status='done') but whose payment date has slipped should STILL
  // paint the Payment tile destructive — penalty interest accrues
  // until the wire clears. Matches the canonical payment-terminal
  // set: only `completed` and `not_applicable` suppress red on the
  // payment tile. `'paid'` is legacy: technically means payment
  // cleared, so don't repaint as overdue.
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

// 2026-05-26 (Yuqi seventieth pass): canonical tile for the unified
// 3-column deadline strip. `tone` paints the surface (neutral white,
// success-tinted, destructive-tinted); `valueTone` colors the date
// itself (independent of surface so a non-terminal "internal target
// past" row can show a red value on a neutral surface).
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
  // 2026-05-26 (Yuqi drawer feedback — "too much red on the right
  // panel"): destructive tile drops the filled red bg in favour of a
  // hairline red border + neutral surface. The header pill ("18 days
  // overdue"), the milestone-strip In-review ring, AND the alert
  // banner already carry the lateness signal; this tile filled all
  // its real estate with red on top of those, stacking the alarm. A
  // neutral surface with the date value in red (via `valueTone`) +
  // the destructive border keeps the cue without flooding.
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
    <div className={cn('flex flex-col gap-0.5 rounded-md border px-2.5 py-1.5', surfaceClass)}>
      <span
        className={cn(
          // `text-[10px]` not `text-caption-xs` — twMerge collapses
          // custom font-size tokens against `text-text-destructive`.
          'text-[10px] leading-tight font-medium uppercase tracking-eyebrow-tight',
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
          <span className="inline-flex items-center rounded-full bg-state-destructive-hover px-2 py-0.5 text-[10px] font-medium uppercase tracking-eyebrow-tight text-text-destructive">
            {lateLabel}
          </span>
        ) : null}
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
      // 2026-05-26 (86th pass, audit cross-cutting A): user-facing
      // reference-date list now renders prose via `formatDatePretty`
      // (e.g. "May 9, 2026") instead of ISO. The drawer is a panel
      // the user reads; ISO format here undermines the canonical
      // "finance-grade calm" feel. Queue row date column keeps
      // `formatDate` because that's a dense triage table where ISO
      // alignment + tabular-nums is the better trade.
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
    // 2026-05-27 (Agent X3 milestone audit M-04): "Waiting" → "Waiting
    // on client" so the strip matches the queue pill + drawer header
    // pill + readiness overview headline + v2 label hook. Same row,
    // one name across every milestone surface. The short form was a
    // legacy convenience from when this strip was a tight 6-column
    // grid; the column now has enough width to carry the full label
    // and the consistency win outweighs the few pixels saved.
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
                        ? 'border-divider-strong'
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
                    // 2026-05-26 (Yuqi drawer feedback — "said there should not
                    // be a bold border"): dropped the `ring-1` outer ring on
                    // both `active` and `overdueActive` states. The border +
                    // tint + icon identity were ALREADY conveying "this is the
                    // current stage"; the extra ring layer was reading as a
                    // double-bordered chip and shouting too hard against the
                    // calmer done/upcoming neighbors.
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
                    // 2026-05-26 (Yuqi feedback #8): align the stage
                    // icon set with the canonical STATUS_ICON map
                    // (status-control.tsx). The pending stage now
                    // uses Loader (the canonical pending icon) rather
                    // than CircleDashed — consistent with the row
                    // pill, the scope tabs, and the status dropdown.
                    // Other stages were already aligned via their
                    // status mapping; only `pending` was the
                    // outlier here.
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
                        ? 'border-divider-strong'
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
                  // 2026-05-26 (Yuqi feedback #9): date smaller —
                  // text-caption-xs (10px) → text-[9px] leading-none.
                  // The stage label sits at caption-xs above, dates
                  // were at the same scale making the column feel
                  // even-weight. One step smaller gives the label
                  // visual primacy and the date reads as meta.
                  className={cn(
                    'text-center text-[9px] tabular-nums leading-none',
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
                  // 2026-05-26 (Yuqi sixty-seventh pass — context for
                  // OVERDUE): the bare word "Overdue" answered "is
                  // this late?" but not "late vs what?" Tied it back
                  // to the canonical thing that's late — the FIRM'S
                  // internal target date — so a CPA scanning the
                  // strip sees both the urgency cue and the noun.
                  // Hover spells out the exact days-late count + the
                  // deadline date.
                  // 2026-05-26 (Yuqi drawer feedback — "too much red on
                  // the right panel"): demoted from text-text-destructive
                  // to text-text-secondary. The destructive-toned In-
                  // review CIRCLE above is already the red signal at
                  // this stage; doubling it with red caption copy
                  // underneath read as a shout. The word still says
                  // "Past deadline" — readable in any tone.
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
      <section className="grid gap-3 rounded-md border border-state-danger-border bg-state-danger-hover px-4 py-3">
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
          <span className="inline-flex items-center gap-1 rounded-full border border-state-destructive-border bg-state-destructive-hover px-2 py-1 text-caption-xs font-medium text-text-destructive">
            <AlertTriangleIcon className="size-3" aria-hidden />
            <Trans>Rejected</Trans>
          </span>
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
    <section className="grid gap-3 rounded-md border border-divider-subtle bg-background-default px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-text-primary">
            <Trans>Authority response</Trans>
          </p>
          <p className="text-sm text-text-secondary">
            <Trans>Awaiting authority acceptance</Trans>
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-state-warning-hover px-2 py-1 text-caption-xs font-medium text-text-warning">
          <Clock className="size-3" aria-hidden />
          <Trans>Pending</Trans>
        </span>
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
    checklist.every((item) => item.status === 'received' || receivedItemIds.has(item.id))
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

// 2026-05-23: WaitingOutstandingDocs component retired with Option D.
// The full panel (count header + bullet list of doc names + routing
// button) duplicated content from the Client readiness tab. Replaced
// inline in ActiveStageDetailCard with a one-line signal that links
// to the tab; the tab owns the actual document inventory.

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
  // 2026-05-27 (Agent X3 milestone audit M-04): "Waiting" → "Waiting on
  // client" so this card's header label matches the strip above it, the
  // queue pill, and the v2 label hook. See PathToFilingSummary for the
  // matching change on the strip.
  const stageLabels: Record<TimelineStageKey, string> = {
    pending: t`Not started`,
    waiting_on_client: t`Waiting on client`,
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
        // 2026-05-23: Option D shape — a primary mutation plus a
        // quiet escape hatch for genuine blocker cases. The routing
        // affordance (open Materials tab) moved into the inline
        // signal line in the card body; the manual chase reminder
        // dropped because "Send reminder" is the same action surfaced
        // from the Materials tab itself.
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
        // 2026-05-27: no 8879 routing task here. The app does not yet
        // support sending or collecting client e-file authorization, so
        // routing to Evidence from In review creates a dead-end workflow.
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
  // In Review keeps a compact three-state strip. The detailed
  // prepStage/reviewStage values are still useful for audit and undo,
  // but showing all six internal flags made normal rows look more
  // advanced than they really were.
  const showReviewPipeline = stageKey === 'review'
  // 2026-05-26 (Yuqi sixty-seventh pass — structure the OVERDUE
  // signal inside the card): when the active stage is past the
  // firm's internal target date, surface that fact INSIDE the
  // stage card body so a CPA reading "In review" / "Waiting" /
  // "Blocked" sees the missed-deadline context next to the
  // actions, not only on the milestone strip above. Terminal
  // stages (Filed / Completed) don't get the banner — by then
  // the work is closed and "Filed N days late" is the right
  // surface for the lateness story.
  const isPastInternalDue = row.daysUntilDue < 0
  const showOverdueBanner = isPastInternalDue && !TIMELINE_TERMINAL_STAGE_KEYS.has(stageKey)
  const daysPastDeadline = Math.abs(row.daysUntilDue)
  return (
    <section
      aria-label={t`Active stage detail`}
      // 2026-05-26 (Yuqi feedback #10): light tinted background
      // (bg-background-section) instead of pure white. The card was
      // reading as identical to the page surface; a soft tint gives
      // it the "this is the deep-dive zone for the current stage"
      // anchor without going full color.
      // 2026-05-26 (Yuqi feedback — "too many lines going on. please
      // restructure and look at the frontend ensure it is cleanly
      // designed and implemented"): dropped the `border
      // border-divider-subtle` ring. The right panel was stacking
      // four near-rules in close proximity (status-strip bottom
      // border + tab-bar baseline + this card's outline + inner Key
      // dates outline). Keeping just the soft `bg-background-section`
      // tint still anchors this as the "deep-dive zone for the
      // current stage"; the tint vs the panel's white provides the
      // separation without a rule.
      className="rounded-lg bg-background-section p-4"
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
      {/* 2026-05-27 (Yuqi "onto the same line at Completed, space
          between"): stage label + "Entered DATE" now sit on one
          row with justify-between, the entered date pinned right. */}
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
            <span
              className="inline-flex items-center gap-1 rounded-full bg-state-success-solid px-2 py-0.5 text-caption-xs font-medium text-text-inverted"
              title={
                row.efileAcceptedAt
                  ? `${t`Authority accepted the return`} · ${formatDatePretty(row.efileAcceptedAt.slice(0, 10))}`
                  : t`Authority accepted the return`
              }
            >
              <CheckCircle2Icon className="size-3" aria-hidden />
              <Trans>Accepted</Trans>
            </span>
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

      {/* 2026-05-26 (Yuqi sixty-seventh pass — overdue context):
          the milestone strip's red "Past deadline" word answers "is
          this late?" but the stage card below was silent on the
          fact, so a CPA scanning the card had to infer urgency
          from the strip. The banner ties the stage back to the
          missed date with a real noun ("Filing was due …") and a
          concrete days-late count + the two actionable verbs
          (submit, file an extension). On terminal stages the
          banner hides — once the work is closed, late-vs-on-time
          is a quality stat, not a call-to-action. */}
      {showOverdueBanner ? (
        // 2026-05-26 (Yuqi drawer feedback — "too much red"): the
        // filled red bg made the banner the loudest element on the
        // panel, even after demoting the tile + caption. Switched to
        // a neutral surface with the red AlertTriangle + red title
        // line carrying the urgency cue; the action line drops to
        // text-secondary so the eye lands on the urgent line first
        // and the "what to do" reads as a calmer follow-up.
        <div
          role="status"
          className="mt-3 flex flex-col gap-0.5 rounded-md border border-divider-regular bg-background-default px-3 py-2 text-sm leading-snug"
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
              <div className="mt-3 rounded-md border border-divider-subtle bg-background-subtle px-3 py-2 text-xs leading-snug text-text-secondary">
                <Trans>
                  Resumed from blocked on{' '}
                  {formatDatePretty(autoUnblockEvent.createdAt.slice(0, 10))} after the upstream
                  deadline was completed.
                </Trans>
              </div>
            )
          })()
        : null}
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
                      // 2026-05-26 (Yuqi sixty-seventh pass — "looks
                      // like radio checkbox"): replaced the ring +
                      // inner-dot construction with a solid filled
                      // disc. The previous shape was a textbook
                      // selected-radio (border-2 ring around inner
                      // dot) — readers tried to click it expecting a
                      // form input. The new solid bullet reads as a
                      // status marker, not an interactive choice.
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
                      // 2026-05-26 (Yuqi sixty-seventh pass — "looks
                      // like radio checkbox"): replaced the ring +
                      // inner-dot construction with a solid filled
                      // disc. The previous shape was a textbook
                      // selected-radio (border-2 ring around inner
                      // dot) — readers tried to click it expecting a
                      // form input. The new solid bullet reads as a
                      // status marker, not an interactive choice.
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
          {/* 2026-05-27 (Step 6 cont Q5.4 — P3): title was generic
              "Penalty inputs" with the client name buried in the
              description. CPAs working through a list of clients in
              one sitting open this dialog repeatedly — the title
              should answer "whose penalty am I editing?" without a
              second glance. Description retains the tax-code suffix
              so the filing context is still legible. */}
          <DialogTitle>
            {row ? (
              <Trans>Penalty inputs for {row.clientName}</Trans>
            ) : (
              <Trans>Penalty inputs</Trans>
            )}
          </DialogTitle>
          <DialogDescription>{row ? formatTaxCode(row.taxType) : null}</DialogDescription>
        </DialogHeader>
        {/* 2026-05-26 (step-6 ux-flow audit Q5.1/Q5.2): added real
            <label> elements (placeholder alone disappears on type)
            and inline helper text describing accepted formats. */}
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label htmlFor="penalty-tax-due" className="text-sm font-medium">
              <Trans>Estimated tax due</Trans>
            </label>
            <Input
              id="penalty-tax-due"
              inputMode="decimal"
              placeholder={t`e.g. 1,234.56`}
              value={draft.taxDue}
              onChange={(event) =>
                setDraft((current) => ({ ...current, taxDue: event.target.value }))
              }
            />
            <p className="text-xs text-text-tertiary">
              <Trans>Dollars and cents.</Trans>
            </p>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="penalty-owner-count" className="text-sm font-medium">
              <Trans>Owner count</Trans>
            </label>
            <Input
              id="penalty-owner-count"
              inputMode="numeric"
              placeholder={t`e.g. 2`}
              value={draft.ownerCount}
              onChange={(event) =>
                setDraft((current) => ({ ...current, ownerCount: event.target.value }))
              }
            />
            <p className="text-xs text-text-tertiary">
              <Trans>Positive whole number.</Trans>
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          {/* 2026-05-26 (step-6 ux-flow audit Q5.3): disable save
              when both inputs are empty (no-op write polluted the
              audit log). */}
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
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t`Filter deadlines`}
        title={t`Filter deadlines  ·  press / to focus`}
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
      {/* 2026-05-26 (Yuqi step-8 data-finding audit — F-X05): placeholder
          changed "Filter clients" → "Filter deadlines" to align with
          the expanded state's ariaLabel and the collapsed-state
          aria-label. The input matches client name + obligation title
          + rule name; the prior placeholder named just one of those
          axes which understated the input's reach. */}
      <SearchInput
        ref={inputRef}
        value={value}
        onChange={onChange}
        placeholder={t`Filter deadlines`}
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
  compact = false,
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
  compact?: boolean
}) {
  // 2026-05-26 (Yuqi inset-followups G — smooth slide transition):
  // dropped the per-tab `border-b-2` and replaced it with a single
  // shared underline rendered via `layoutId="scope-tab-underline"`.
  // Framer Motion smoothly slides the underline between tabs when a
  // new one becomes active — no more jumpy "underline disappears
  // here, reappears there" feel. Inactive tabs render a transparent
  // 2px bottom border for hover state symmetry.
  const hideLabel = compact && Boolean(Icon)
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={hideLabel ? label : undefined}
      title={hideLabel ? label : undefined}
      onClick={onClick}
      className={cn(
        'relative -mb-px flex h-9 shrink-0 items-center gap-1.5 px-3 text-base whitespace-nowrap transition-colors',
        active
          ? 'font-medium text-text-primary'
          : 'border-b-2 border-transparent text-text-secondary hover:border-divider-deep hover:text-text-primary',
      )}
    >
      {Icon ? <Icon className={cn('size-4', iconColor)} aria-hidden /> : null}
      {hideLabel ? null : <span>{label}</span>}
      <span className="text-sm tabular-nums text-text-tertiary">{count}</span>
      {active ? (
        <motion.span
          layoutId="scope-tab-underline"
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 bg-accent-default"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      ) : null}
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

// Annual rollover, simplified to one button + a confirm dialog. Rolls the firm's
// book forward to next filing year — generating *projected* (confirmed=false)
// deadlines that stay out of the reminder pipeline until a CPA confirms them via
// the Projected lens. Gated on migration.run (matches the server handler).
function RollForwardAction({ canRun }: { canRun: boolean }) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const targetFilingYear = new Date().getFullYear() + 1
  const sourceFilingYear = targetFilingYear - 1
  // Copy speaks Tax Year (the canonical identifier): a return filed in FY{n} is
  // for tax year {n-1}. The engine stays filing-year driven (source/target
  // FilingYear above feed the rollover); only the user-facing labels change.
  const targetTaxYear = targetFilingYear - 1
  const sourceTaxYear = sourceFilingYear - 1
  const previewQuery = useQuery({
    ...orpc.obligations.previewAnnualRollover.queryOptions({
      input: { sourceFilingYear, targetFilingYear },
    }),
    enabled: open,
  })
  const createMutation = useMutation(
    orpc.obligations.createAnnualRollover.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.facets.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        setOpen(false)
        toast.success(t`${result.summary.createdCount} projected deadlines created`, {
          description: t`Review and confirm them with the Projected filter.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't roll deadlines forward`, {
          description: rpcErrorMessage(err) ?? t`Try again in a moment.`,
        })
      },
    }),
  )
  const summary = previewQuery.data?.summary
  const willCreate = summary ? summary.willCreateCount + summary.reviewCount : 0
  const clientCount = summary?.clientCount ?? 0
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={!canRun}
        title={
          canRun
            ? undefined
            : t`Rolling deadlines forward requires owner, partner, manager, or preparer access.`
        }
        onClick={() => setOpen(true)}
      >
        <Trans>Generate Tax Year {targetTaxYear} deadlines</Trans>
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Generate Tax Year {targetTaxYear} deadlines?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {previewQuery.isLoading ? (
                <Trans>Calculating what will be created…</Trans>
              ) : (
                <Trans>
                  Creates {willCreate} projected Tax Year {targetTaxYear} deadlines for{' '}
                  {clientCount} clients from their completed Tax Year {sourceTaxYear} returns.
                  Projected deadlines stay hidden from client reminders until you confirm them with
                  the Projected filter.
                </Trans>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <Button
              variant="accent"
              disabled={createMutation.isPending || previewQuery.isLoading || willCreate === 0}
              onClick={() => createMutation.mutate({ sourceFilingYear, targetFilingYear })}
            >
              {createMutation.isPending ? (
                <Trans>Rolling forward…</Trans>
              ) : (
                <Trans>Roll forward</Trans>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
    // 2026-05-28 (Yuqi /today polish — extended to /deadlines): empty
    // state aligned with /today's Actions-this-week treatment —
    // icon at top + split title/description + outline CTA. Dify Blue
    // primary stays reserved for the one next action per surface, so
    // the empty-state CTA renders as a quieter secondary button.
    <EmptyState
      icon={CalendarDaysIcon}
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
          <Trans>Import your client list to start tracking filing deadlines.</Trans>
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
  // 2026-05-27 (Step 6 cont Q8.2 — P0): Regenerate previously fired
  // immediately on click, silently invalidating the user's iCal
  // subscription on every device that had the old URL. Gate behind
  // an AlertDialog mirroring the canonical /calendar pattern at
  // `features/calendar/calendar-page.tsx:215-286` so the user sees
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
