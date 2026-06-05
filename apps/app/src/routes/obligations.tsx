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
  CircleCheck,
  Clock,
  Hourglass,
  Loader2,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  Columns3Icon,
  DownloadIcon,
  EyeIcon,
  FileArchiveIcon,
  CalendarClockIcon,
  SendIcon,
  XIcon,
} from 'lucide-react'
import { useQueryStates } from 'nuqs'
import { toast } from 'sonner'

import {
  OBLIGATION_QUEUE_SEARCH_MAX_LENGTH,
  type ObligationQueueDetailTab,
  type ObligationQueueRow,
  type ObligationQueueSort,
  type ObligationQueueExportFormat,
  type ObligationQueueExportSelectedInput,
} from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Field, FieldLabel } from '@duedatehq/ui/components/ui/field'
import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@duedatehq/ui/components/ui/combobox'
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
import { isRejectionVisible, RejectionChip } from '@/features/obligations/rejection-chip'
import { useLifecycleV2 } from '@/features/obligations/use-lifecycle-v2'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { ObligationPanelDispatcher } from '@/features/obligations/ObligationPanelDispatcher'
import { formatTaxCode } from '@/lib/tax-codes'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { queryInputUrlUpdateRateLimit, useDebouncedQueryInput } from '@/lib/query-rate-limit'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { cn, formatDate, formatDatePretty } from '@/lib/utils'

import type {
  ClientFilterOption,
  FilterOption,
  ObligationExportDialogScope,
  ObligationExportRecipient,
  ObligationQueueListInputWithoutCursor,
} from '@/features/obligations/queue/types'
import {
  CLIENT_PAGE_SIZE_MAX,
  CLIENT_PAGE_SIZE_MIN,
  CLIENT_ROW_HEIGHT_PX,
  DETAIL_PANEL_CLOSE_ANIM,
  DETAIL_PANEL_CONTENT_ENTER_ANIM,
  DETAIL_PANEL_CONTENT_EXIT_ANIM,
  DETAIL_PANEL_INNER_FADE_ANIM,
  DETAIL_PANEL_INNER_RISE_ANIM,
  DETAIL_PANEL_OPEN_ANIM,
  EMPTY_ASSIGNEES,
  EMPTY_CLIENT_OPTIONS,
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
  cleanEntityIdFilters,
  cleanStateFilters,
  cleanStringFilters,
  columnLabel,
  columnVisibilityFromHidden,
  daysFilterValue,
  daysUntilEffectiveInternalDueDate,
  deadlineDetailSearchFromQueueState,
  deadlineDetailStateObligationId,
  diffIsoDateDays,
  downloadBase64File,
  effectiveInternalDueDate,
  exportQueryFromListInput,
  facetOptionToFilterOption,
  getSortingState,
  hiddenFromColumnVisibility,
  isObligationQueueRowControlClick,
  isObligationStatus,
  isThisWeekFilterActive,
  nextThisWeekFilterPatch,
  obligationQueueColumnAriaSort,
  rangeSelectionUpdate,
  scrollObligationRowIntoView,
  todayIsoDate,
  withDefaultSortCleared,
} from '@/features/obligations/queue/helpers'
import {
  BulkExtensionDialog,
  ExportAxis,
  ExportAxisOption,
  PenaltyInputDialog,
  SignatureReminderDialog,
} from '@/features/obligations/queue/dialogs'
import { DueDaysPill } from '@/features/obligations/queue/components/primitives'
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
