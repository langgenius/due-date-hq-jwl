import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
} from '@tanstack/react-table'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useLocation, useNavigate, useParams } from 'react-router'
import {
  AlertTriangleIcon,
  CircleCheck,
  Clock,
  Hourglass,
  Loader2,
  MessageSquareText,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
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
  XIcon,
} from 'lucide-react'
import { useQueryStates } from 'nuqs'
import { toast } from 'sonner'
import { Link } from 'react-router'

import {
  OBLIGATION_QUEUE_SEARCH_MAX_LENGTH,
  type ObligationQueueDetailTab,
  type ObligationPrepStage,
  type ObligationQueueRow,
  type ObligationQueueSort,
  type ObligationQueueExportFormat,
  type ObligationQueueExportSelectedInput,
  type ObligationReviewStage,
  type ReadinessDocumentChecklistItemPublic,
} from '@duedatehq/contracts'
import { computeExtendedFilingDeadline } from '@duedatehq/core/date-logic'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Field, FieldLabel } from '@duedatehq/ui/components/ui/field'
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
import { TableHeaderMultiFilter } from '@/components/patterns/table-header-filter'
import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'
import { FloatingActionBar } from '@/components/patterns/floating-action-bar'
import { KbdHint } from '@/components/patterns/kbd'
import { PageHeader } from '@/components/patterns/page-header'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import { IsoDatePicker, isValidIsoDate } from '@/components/primitives/iso-date-picker'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { ClientPeekHoverCard } from '@/features/clients/ClientPeekHoverCard'
import { useEvidenceDrawer } from '@/features/evidence/EvidenceDrawerContext'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { paidPlanActive } from '@/features/billing/model'
import {
  ALL_STATUSES,
  LIFECYCLE_V2_STATUSES,
  ObligationQueueStatusControl,
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
  deadlineDetailHref,
  findObligationIdByDeadlineRef,
  normalizeDeadlineDetailTab,
  normalizeDeadlineRef,
} from '@/features/obligations/deadline-detail-url'
import { isTabVisibleForType, tabsForObligationType } from '@/features/obligations/obligation-type'
import { isRejectionVisible, RejectionChip } from '@/features/obligations/rejection-chip'
import { useLifecycleV2 } from '@/features/obligations/use-lifecycle-v2'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { ChecklistItemRow } from '@/features/obligations/ChecklistItemRow'
import { ObligationPanelDispatcher } from '@/features/obligations/ObligationPanelDispatcher'
import { formatTaxCode } from '@/lib/tax-codes'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { queryInputUrlUpdateRateLimit, useDebouncedQueryInput } from '@/lib/query-rate-limit'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { cn, formatDate, formatDatePretty, formatDateTimeWithTimezone } from '@/lib/utils'

import type {
  AuthorityRejectionDraft,
  ClientFilterOption,
  DeadlineInputRequestDraft,
  FilterOption,
  ObligationExportDialogScope,
  ObligationExportRecipient,
  ObligationQueueListInputWithoutCursor,
} from '@/features/obligations/queue/types'
import {
  CLIENT_PAGE_SIZE_MAX,
  CLIENT_PAGE_SIZE_MIN,
  CLIENT_ROW_HEIGHT_PX,
  DEADLINE_TIP_REFRESH_POLL_INTERVAL_MS,
  DEADLINE_TIP_REFRESH_TIMEOUT_MS,
  DETAIL_PANEL_CLOSE_ANIM,
  DETAIL_PANEL_CONTENT_ENTER_ANIM,
  DETAIL_PANEL_CONTENT_EXIT_ANIM,
  DETAIL_PANEL_INNER_FADE_ANIM,
  DETAIL_PANEL_INNER_RISE_ANIM,
  DETAIL_PANEL_OPEN_ANIM,
  EMPTY_ASSIGNEES,
  EMPTY_CLIENT_OPTIONS,
  EMPTY_DOCUMENT_CHECKLIST,
  EMPTY_FACET_OPTIONS,
  EMPTY_OBLIGATION_QUEUE_ROWS,
  INITIAL_CURSOR,
  INSIDE_CHROME_PX,
  OBLIGATION_QUEUE_DUE_COL_WIDTH,
  obligationQueueSearchParamsParsers,
  PAGE_SIZE,
  PANEL_OPEN_AUTO_HIDDEN_COLUMN_IDS,
} from '@/features/obligations/queue/constants'
import {
  canSaveInternalExtensionPlan,
  cleanEntityIdFilters,
  cleanOptionalText,
  cleanStateFilters,
  cleanStringFilters,
  columnLabel,
  columnVisibilityFromHidden,
  copyTextToClipboard,
  daysFilterValue,
  daysUntilEffectiveInternalDueDate,
  deadlineDetailSearchFromQueueState,
  deadlineDetailStateObligationId,
  defaultAuthorityRejectionDraft,
  diffIsoDateDays,
  downloadBase64File,
  effectiveInternalDueDate,
  emptyExtensionPlanDraft,
  exportQueryFromListInput,
  extensionPlanDraftFromRow,
  facetOptionToFilterOption,
  fiscalYearEndDraftValue,
  fiscalYearEndParts,
  formatFiscalYearEnd,
  getSortingState,
  hiddenFromColumnVisibility,
  isInternalExtensionTargetDateValid,
  isObligationQueueDetailTab,
  isObligationQueueRowControlClick,
  isObligationStatus,
  isThisWeekFilterActive,
  latestDeadlineInputRequest,
  materialsChecklistReference,
  nextThisWeekFilterPatch,
  obligationQueueColumnAriaSort,
  openExternalUrl,
  rangeSelectionUpdate,
  scrollObligationRowIntoView,
  todayIsoDate,
  willReadinessChecklistBeFullyReceived,
  withDefaultSortCleared,
} from '@/features/obligations/queue/helpers'
import {
  AuthorityRejectionDialog,
  BulkExtensionDialog,
  DeadlineInputRequestDialog,
  ExportAxis,
  ExportAxisOption,
  MaterialsRequestPreviewDialog,
  PenaltyInputDialog,
  SignatureReminderDialog,
} from '@/features/obligations/queue/dialogs'
import {
  AlertPanel,
  DetailRow,
  DropdownTriggerButton,
  DueDaysPill,
  EmptyPanel,
} from '@/features/obligations/queue/components/primitives'
import { EvidenceInlineItem } from '@/features/obligations/queue/components/evidence'
import {
  ActiveStageDetailCard,
  AuthorityResponsePanel,
  PathToFilingSummary,
  PrimaryDeadlineStrip,
  ReadinessOverview,
  StatutoryDatesPanel,
} from '@/features/obligations/queue/components/panels'
import {
  AssigneeQuickPicker,
  CalendarSyncPopover,
  ObligationQueueActionChip,
  ObligationQueueEmptyState,
  ObligationQueueScopeTab,
  ObligationQueueSearchControl,
  ObligationQueueSortableHeader,
  RollForwardAction,
} from '@/features/obligations/queue/components/toolbar'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string
    cellClassName?: string
  }
}
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
          if (!state) return <EmptyCellMark />
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
              // 2026-06-01: swapped hand-rolled count pill for Badge
              // (variant="secondary" size="lg") — canonical
              // PageHeader-title count chip.
              <Badge variant="secondary" size="lg" className="tabular-nums">
                {scopeTotal}
              </Badge>
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
        // 2026-06-04 round 21 (Yuqi Pencil h4bQ2 — Deadlines production
        // recreation): description text dropped per Pencil. The h1
        // "Deadlines" + count chip is the entire header anchor; the
        // descriptive sentence was claiming a row of chrome that
        // Pencil's mock doesn't reserve. Concept-help popover on the
        // title still surfaces the long-form description on demand
        // for first-time users.
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
                // 2026-06-04 round 21 (Yuqi Pencil h4bQ2): inter-tab gap
                // bumped `gap-1` (4px) → `gap-6` (24px) to match
                // Pencil's `WB7vU` tab strip. The previous tight gap
                // read as "buttons crammed together"; 24px makes each
                // tab read as its own destination, the way the design
                // intends.
                className="-mb-px flex flex-1 flex-wrap items-center gap-6"
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
              // 2026-06-04 round 23 (Yuqi "apply the style from
              // Today's Action table to Deadline's table"): outer
              // card radius bumped `rounded-md` (6px) → `rounded-[12px]`
              // to match /today's ActionsTable wrapper exactly. The
              // 12px radius reads as a real surface card, not a
              // utility data panel. Border tone stays at
              // `divider-regular` (8%) — same as /today.
              className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-divider-regular"
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
                {/* 2026-06-04 round 23 (Yuqi "apply the style from
                    Today's Action table to Deadline's table"): the
                    compact horizontal padding override
                    `[&_th]:!px-2 [&_td]:!px-2` dropped. /today's
                    ActionsTable uses the canonical px-5 cell
                    padding; /deadlines now inherits the same — at
                    1920px the wide-column queue has the room, and
                    matching pad widths makes the two tables read
                    as one family. `whitespace-normal` + `break-words`
                    kept because /deadlines columns carry longer
                    multi-word content (client name, why-now) that
                    benefits from wrapping. */}
                <Table className="rounded-none border-0 [&_th]:!whitespace-normal [&_td]:!whitespace-normal [&_td]:!align-middle [&_td]:break-words">
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          const meta = header.column.columnDef.meta
                          return (
                            <TableHead
                              key={header.id}
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
                  {/* 2026-06-04 (Yuqi table sweep): `bg-background-default`
                    dropped — canonical default. Kept intentional
                    deviations: `[&_td]:py-2 [&_td]:text-sm` (queue
                    is a dense data scan, canonical py-4 + text-base
                    forces fewer rows per laptop viewport), and
                    `[&_tr]:hover:!bg-state-accent-hover` (this
                    queue's hover is the SAME accent tint as the
                    detail-panel selection, so hover = "where the
                    panel will land" — overrides the canonical
                    `bg-state-base-hover`). */}
                  {/* 2026-06-04 round 23 (Yuqi "apply the style from
                      Today's Action table to Deadline's table"):
                      TableBody overrides REVERTED to inherit the
                      canonical primitive defaults the same way
                      /today's ActionsTable does.
                        • Dropped `[&_td]:py-2 [&_td]:text-sm` —
                          canonical px-5 py-4 + text-base now applies,
                          giving rows the same generous breathing
                          room as /today (rows will be ~24px taller
                          than the previous dense queue; that's the
                          family-consistency cost).
                        • Dropped `[&_tr]:hover:!bg-state-accent-hover`
                          — canonical `hover:bg-state-base-hover`
                          applies. The accent-tinted hover was a
                          /deadlines-only quirk; /today uses the
                          base-hover tone and the two queues now
                          share one hover vocabulary.
                        • Kept `[&_tr]:even:bg-transparent` — the
                          client-cluster welding (border-b-0 within
                          a same-client group + continuous left rail)
                          requires same-tone bg across cluster rows.
                          Zebra striping by DOM position would tint
                          cluster members differently and break the
                          weld visual. /today doesn't have clusters,
                          so it ships zebra striping ON; /deadlines
                          opts out for cluster compatibility. */}
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
                        // 2026-06-04 (Yuqi table sweep): on the group
                        // header TableRow below, `border-b`,
                        // `border-divider-subtle`, `hover:bg-state-base-hover`
                        // ALL dropped — canonical TableRow ships them.
                        // `bg-background-subtle/60` kept because the
                        // group header is a quieter inset surface than
                        // the canonical body.
                        return (
                          <Fragment key={tableRow.id}>
                            {groupHeader ? (
                              <TableRow className="bg-background-subtle/60">
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
                                      // 2026-06-04 (Yuqi table sweep): explicit
                                      // `align-middle` reinforcement removed —
                                      // it's a canonical primitive default
                                      // now, so the only way `meta?.cellClassName`
                                      // wins is if a column explicitly sets
                                      // align-top, which would be intentional.
                                      className={cn(
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
                      {/* 2026-06-01: hand-rolled <kbd> strip swapped for
                          canonical KbdHint — same J/K/Enter/? recipe,
                          but the `·` separator now comes from the
                          primitive instead of stray mx-1 padding. */}
                      <KbdHint
                        className="hidden md:inline-flex"
                        items={[
                          { keys: ['J', 'K'], label: t`navigate` },
                          { keys: ['Enter'], label: t`open` },
                          { keys: ['?'], label: t`all` },
                        ]}
                      />
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
              for SR users (placeholder alone disappears on type).
              2026-06-01: switched to Field + FieldLabel so label/textarea
              density matches the rest of the dialog forms. */}
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
