import { useCallback, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router'
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
  Columns3Icon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileArchiveIcon,
  FileSearchIcon,
  FilterIcon,
  LinkIcon,
  RefreshCwIcon,
  SendIcon,
  ShieldAlertIcon,
  PinIcon,
  SaveIcon,
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
  type ObligationQueueDetail,
  type ObligationQueueColumnVisibility,
  type ReadinessChecklistItem,
  type ObligationQueueDetailTab,
  type ObligationQueueDensity,
  type ObligationQueueFacetOption,
  type ObligationQueueListInput,
  type ObligationQueueRow,
  type ObligationQueueSavedView,
  type ObligationQueueSort,
  type AiInsightPublic,
} from '@duedatehq/contracts'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Card, CardContent } from '@duedatehq/ui/components/ui/card'
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
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'

import {
  isInteractiveEventTarget,
  useAppHotkey,
  useKeyboardShortcutsBlocked,
} from '@/components/patterns/keyboard-shell'
import {
  TableHeaderMultiFilter,
  tableHeaderFilterTrigger,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { IsoDatePicker, isValidIsoDate } from '@/components/primitives/iso-date-picker'
import { buildAuditChangeView, type AuditChangeView } from '@/features/audit/audit-change-view'
import { useAuditActionLabels, useAuditChangeLabels } from '@/features/audit/audit-log-labels'
import { formatAuditActionLabel } from '@/features/audit/audit-log-model'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { useEvidenceDrawer } from '@/features/evidence/EvidenceDrawerContext'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { paidPlanActive } from '@/features/billing/model'
import { UpgradeCtaButton } from '@/features/billing/upgrade-cta-button'
import { SmartPriorityBadge } from '@/features/priority/SmartPriorityBadge'
import {
  ALL_STATUSES,
  LIFECYCLE_V2_STATUSES,
  ObligationQueueStatusControl,
  useLifecycleV2StatusLabels,
  useStatusLabels,
  useReadinessLabels,
  type ObligationStatus,
} from '@/features/obligations/status-control'
import { BlockedByChip, isBlockedByVisible } from '@/features/obligations/blocked-by-chip'
import { isRejectionVisible, RejectionChip } from '@/features/obligations/rejection-chip'
import { ObligationTimeline } from '@/features/obligations/timeline'
import { useLifecycleV2 } from '@/features/obligations/use-lifecycle-v2'
import { formatTaxCode } from '@/lib/tax-codes'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
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

const ALL_SORTS = [
  'smart_priority',
  'due_asc',
  'due_desc',
  'exposure_desc',
  'exposure_asc',
  'updated_desc',
] as const satisfies readonly ObligationQueueSort[]
const OWNER_FILTERS = ['unassigned'] as const
const DUE_FILTERS = ['overdue'] as const
const EXPOSURE_FILTERS = ['ready', 'needs_input', 'unsupported'] as const
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
const EMPTY_OBLIGATION_QUEUE_ROWS: ObligationQueueRow[] = []
const EMPTY_SAVED_VIEWS: ObligationQueueSavedView[] = []
const EMPTY_ASSIGNEES: MemberAssigneeOption[] = []
const EMPTY_CHECKLIST: ReadinessChecklistItem[] = []
const EMPTY_FACET_OPTIONS: FilterOption[] = []
const EMPTY_CLIENT_OPTIONS: ClientFilterOption[] = []
const EMPTY_COUNTY_OPTIONS: CountyFilterOption[] = []
const INITIAL_CURSOR: ObligationQueueCursor = null
const PAGE_SIZE = 50
const REPLACE_HISTORY_OPTIONS = { history: 'replace' } as const
const DAYS_FILTER_MIN = -3650
const DAYS_FILTER_MAX = 3650
const THIS_WEEK_MAX_DAYS = 7
const UNASSIGNED_OWNER_OPTION = '__unassigned__'
const OBLIGATION_QUEUE_TABLE_PILL_CLASSNAME = 'text-xs'
const NON_HIDEABLE_COLUMNS = new Set(['select'])
const OBLIGATION_QUEUE_ROW_CONTROL_SELECTOR =
  'button,a[href],input,label,select,textarea,[role="button"],[role="checkbox"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="option"],[role="radio"],[role="tab"],[data-slot="checkbox"]'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STATE_CODE_RE = /^[A-Z]{2}$/
const ReadinessChecklistItemsSchema = ReadinessChecklistItemSchema.array().min(1).max(8)

interface GeneratedReadinessChecklistDraft {
  items: ReadinessChecklistItem[]
  createdAtMs: number
}

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

function latestGeneratedReadinessChecklistDraft(
  evidence: ObligationQueueDetail['evidence'],
): GeneratedReadinessChecklistDraft | null {
  let latest: GeneratedReadinessChecklistDraft | null = null

  for (const item of evidence) {
    if (item.sourceType !== 'readiness_checklist_ai') continue
    const checklist = parseGeneratedReadinessChecklist(item.normalizedValue)
    if (!checklist) continue
    const createdAtMs = Date.parse(item.appliedAt)
    const normalizedCreatedAtMs = Number.isFinite(createdAtMs) ? createdAtMs : 0
    if (!latest || normalizedCreatedAtMs > latest.createdAtMs) {
      latest = { items: checklist, createdAtMs: normalizedCreatedAtMs }
    }
  }

  return latest
}

type DueDaysTone = {
  variant: 'destructive' | 'warning' | 'success'
  dot: 'error' | 'warning' | 'success'
  badgeClassName?: string
  dotClassName?: string
}

type FilterOption = TableFilterOption

interface ClientFilterOption extends FilterOption {
  state: string | null
  county: string | null
}

interface CountyFilterOption extends FilterOption {
  state: string | null
}

export const obligationQueueSearchParamsParsers = {
  q: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  status: parseAsArrayOf(parseAsStringLiteral(ALL_STATUSES))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  obligation: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
  client: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  state: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  county: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  taxType: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  assignee: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  assignees: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  owner: parseAsStringLiteral(OWNER_FILTERS).withOptions(REPLACE_HISTORY_OPTIONS),
  due: parseAsStringLiteral(DUE_FILTERS).withOptions(REPLACE_HISTORY_OPTIONS),
  dueWithin: parseAsInteger.withOptions(REPLACE_HISTORY_OPTIONS),
  exposure: parseAsStringLiteral(EXPOSURE_FILTERS).withOptions(REPLACE_HISTORY_OPTIONS),
  evidence: parseAsStringLiteral(EVIDENCE_FILTERS).withOptions(REPLACE_HISTORY_OPTIONS),
  drawer: parseAsStringLiteral(DETAIL_DRAWERS).withOptions(REPLACE_HISTORY_OPTIONS),
  id: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
  tab: parseAsStringLiteral(DETAIL_TABS)
    .withDefault('readiness')
    .withOptions({ ...REPLACE_HISTORY_OPTIONS, clearOnDefault: false }),
  riskMin: parseAsInteger.withOptions(REPLACE_HISTORY_OPTIONS),
  riskMax: parseAsInteger.withOptions(REPLACE_HISTORY_OPTIONS),
  daysMin: parseAsInteger.withOptions(REPLACE_HISTORY_OPTIONS),
  daysMax: parseAsInteger.withOptions(REPLACE_HISTORY_OPTIONS),
  asOf: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
  sort: parseAsStringLiteral(ALL_SORTS)
    .withDefault(DEFAULT_SORT)
    .withOptions(REPLACE_HISTORY_OPTIONS),
  density: parseAsStringLiteral(DENSITY_OPTIONS)
    .withDefault(DEFAULT_DENSITY)
    .withOptions(REPLACE_HISTORY_OPTIONS),
  hide: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  view: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
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

function isObligationQueueSort(value: string): value is ObligationQueueSort {
  return ALL_SORTS.some((sortOption) => sortOption === value)
}

function isObligationStatus(value: string): value is ObligationStatus {
  return ALL_STATUSES.some((status) => status === value)
}

function useSortLabels(): Record<ObligationQueueSort, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      smart_priority: t`Smart Priority`,
      due_asc: t`Due date — earliest first`,
      due_desc: t`Due date — latest first`,
      exposure_desc: `${t`Projected risk`} ↓`,
      exposure_asc: `${t`Projected risk`} ↑`,
      updated_desc: t`Recently updated`,
    }),
    [t],
  )
}

function getSortingState(sort: ObligationQueueSort): SortingState {
  if (sort === 'smart_priority') return [{ id: 'smartPriority', desc: true }]
  if (sort === 'due_desc') return [{ id: 'currentDueDate', desc: true }]
  if (sort === 'exposure_desc') return [{ id: 'estimatedExposureCents', desc: true }]
  if (sort === 'exposure_asc') return [{ id: 'estimatedExposureCents', desc: false }]
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
  if (columnId === 'estimatedExposureCents') {
    if (sort === 'exposure_asc') return 'ascending'
    if (sort === 'exposure_desc') return 'descending'
    return 'none'
  }
  return undefined
}

function withDefaultDensityCleared(density: ObligationQueueDensity): ObligationQueueDensity | null {
  return density === DEFAULT_DENSITY ? null : density
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

function dollarsToCents(value: number | null): number | undefined {
  if (value === null || value < 0 || !Number.isSafeInteger(value)) return undefined
  const cents = value * 100
  return Number.isSafeInteger(cents) ? cents : undefined
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isObligationQueueRowControlClick(target: EventTarget | null): boolean {
  if (isInteractiveEventTarget(target)) return true
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest(OBLIGATION_QUEUE_ROW_CONTROL_SELECTOR))
}

function stringArrayFromUnknown(value: unknown): string[] {
  return Array.isArray(value)
    ? cleanStringFilters(value.filter((item): item is string => typeof item === 'string'))
    : []
}

function savedViewQueryPatch(query: unknown): Partial<ObligationQueueSearchParams> {
  if (!isRecord(query)) return {}
  return {
    q: typeof query.q === 'string' ? query.q : '',
    status: stringArrayFromUnknown(query.status).filter(isObligationStatus),
    obligation: null,
    client: cleanEntityIdFilters(stringArrayFromUnknown(query.client)),
    state: cleanStateFilters(stringArrayFromUnknown(query.state)),
    county: cleanStringFilters(stringArrayFromUnknown(query.county)),
    taxType: cleanStringFilters(stringArrayFromUnknown(query.taxType)),
    assignee: typeof query.assignee === 'string' ? query.assignee : '',
    assignees: cleanStringFilters(stringArrayFromUnknown(query.assignees)),
    owner: query.owner === 'unassigned' ? 'unassigned' : null,
    due: query.due === 'overdue' ? 'overdue' : null,
    dueWithin: typeof query.dueWithin === 'number' ? query.dueWithin : null,
    exposure:
      query.exposure === 'ready' ||
      query.exposure === 'needs_input' ||
      query.exposure === 'unsupported'
        ? query.exposure
        : null,
    evidence: query.evidence === 'needs' ? 'needs' : null,
    riskMin: typeof query.riskMin === 'number' ? query.riskMin : null,
    riskMax: typeof query.riskMax === 'number' ? query.riskMax : null,
    daysMin: typeof query.daysMin === 'number' ? query.daysMin : null,
    daysMax: typeof query.daysMax === 'number' ? query.daysMax : null,
    asOf: typeof query.asOf === 'string' ? query.asOf : null,
    sort:
      typeof query.sort === 'string' && isObligationQueueSort(query.sort)
        ? query.sort
        : DEFAULT_SORT,
    row: null,
  }
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

function dueDaysTone(days: number): DueDaysTone {
  if (days < 0) {
    return {
      variant: 'destructive',
      dot: 'error',
      badgeClassName:
        'border-state-destructive-border bg-state-destructive-solid text-text-inverted',
      dotClassName: 'bg-text-inverted shadow-none',
    }
  }
  if (days <= 2) return { variant: 'destructive', dot: 'error' }
  if (days <= 7) return { variant: 'warning', dot: 'warning' }
  return { variant: 'success', dot: 'success' }
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
  // Lifecycle v2 (?lifecycle=v2) swaps the status vocabulary on this
  // page: dropdown shows 6 target states instead of legacy 10, and
  // `review` re-labels to "In review". See
  // docs/Design/obligation-lifecycle-design-brief.md.
  const lifecycleV2 = useLifecycleV2()
  const legacyStatusLabels = useStatusLabels()
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const statusLabels = lifecycleV2 ? v2StatusLabels : legacyStatusLabels
  const statusDropdownOptions = lifecycleV2 ? LIFECYCLE_V2_STATUSES : ALL_STATUSES
  const sortLabels = useSortLabels()
  const [
    {
      q: searchInput,
      status: statusFilter,
      obligation,
      client: clientFilter,
      state: stateFilter,
      county: countyFilter,
      taxType: taxTypeFilter,
      assignee,
      assignees: assigneeFilter,
      owner,
      due,
      dueWithin,
      exposure,
      evidence,
      drawer,
      id: detailId,
      tab: detailTab,
      riskMin,
      riskMax,
      daysMin,
      daysMax,
      asOf,
      sort: urlSort,
      density,
      hide: hiddenColumns,
      view: activeSavedViewId,
      row,
    },
    setObligationQueueQuery,
  ] = useQueryStates(obligationQueueSearchParamsParsers)
  // Slice D: when ?lifecycle=v2 is active AND the URL has no explicit
  // ?sort= param, default the queue to Due date ascending instead of
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
  const [savedViewDraft, setSavedViewDraft] = useState<{
    mode: 'create' | 'rename'
    id?: string
    name: string
  } | null>(null)
  const [openHeaderFilter, setOpenHeaderFilter] = useState<string | null>(null)
  const [extendedMemoOpen, setExtendedMemoOpen] = useState(false)
  const [extendedMemo, setExtendedMemo] = useState('')

  const debouncedSearch = useDebouncedQueryInput(searchInput, {
    maxLength: OBLIGATION_QUEUE_SEARCH_MAX_LENGTH,
  })
  const sorting = useMemo(() => getSortingState(sort), [sort])
  const columnVisibility = useMemo(() => columnVisibilityFromHidden(hiddenColumns), [hiddenColumns])
  const columnLabels = useMemo(
    () => ({
      clientName: t`Client`,
      smartPriority: t`Smart Priority`,
      assigneeName: t`Owner`,
      clientState: t`State`,
      clientCounty: t`County`,
      taxType: t`Tax type`,
      currentDueDate: t`Due date`,
      daysUntilDue: t`Days`,
      estimatedExposureCents: t`Projected risk`,
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
  const stateQuery = useMemo(() => cleanStateFilters(stateFilter), [stateFilter])
  const countyQuery = useMemo(() => cleanStringFilters(countyFilter), [countyFilter])
  const taxTypeQuery = useMemo(() => cleanStringFilters(taxTypeFilter), [taxTypeFilter])
  const assigneeNameQuery = useMemo(
    () => cleanStringFilters(assignee ? [assignee] : [])[0] ?? null,
    [assignee],
  )
  const assigneeQuery = useMemo(() => cleanStringFilters(assigneeFilter), [assigneeFilter])
  const combinedAssigneeQuery = useMemo(
    () => cleanStringFilters([...(assigneeNameQuery ? [assigneeNameQuery] : []), ...assigneeQuery]),
    [assigneeNameQuery, assigneeQuery],
  )
  const minExposureCents = useMemo(() => dollarsToCents(riskMin), [riskMin])
  const maxExposureCents = useMemo(() => dollarsToCents(riskMax), [riskMax])
  const minDaysUntilDue = useMemo(() => daysFilterValue(daysMin), [daysMin])
  const maxDaysUntilDue = useMemo(() => daysFilterValue(daysMax), [daysMax])

  const facetsQuery = useQuery(orpc.obligations.facets.queryOptions({ input: undefined }))
  const savedViewsQuery = useQuery(
    orpc.obligations.listSavedViews.queryOptions({ input: undefined }),
  )
  const assignableMembersQuery = useQuery(
    orpc.members.listAssignable.queryOptions({ input: undefined }),
  )
  const savedViews = savedViewsQuery.data ?? EMPTY_SAVED_VIEWS
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
  const countyOptions = useMemo<CountyFilterOption[]>(() => {
    const allCounties = facetsQuery.data?.counties ?? EMPTY_COUNTY_OPTIONS
    return allCounties
      .filter((option) => stateQuery.length === 0 || stateQuery.includes(option.state ?? ''))
      .map((option) =>
        Object.assign(
          { value: option.value, label: stateQuery.length > 0 ? option.value : option.label },
          option.count !== undefined ? { count: option.count } : {},
          { state: option.state },
        ),
      )
  }, [facetsQuery.data?.counties, stateQuery])
  const taxTypeOptions = useMemo<FilterOption[]>(
    () =>
      facetsQuery.data?.taxTypes.map((option) => ({
        value: option.value,
        label: formatTaxCode(option.value),
        count: option.count,
      })) ?? EMPTY_FACET_OPTIONS,
    [facetsQuery.data?.taxTypes],
  )
  const assigneeOptions = useMemo<FilterOption[]>(
    () => facetsQuery.data?.assigneeNames.map(facetOptionToFilterOption) ?? EMPTY_FACET_OPTIONS,
    [facetsQuery.data?.assigneeNames],
  )
  const ownerOptions = useMemo<FilterOption[]>(
    () => [{ value: UNASSIGNED_OWNER_OPTION, label: t`Unassigned` }, ...assigneeOptions],
    [assigneeOptions, t],
  )
  const ownerQuery = useMemo(
    () => (owner === 'unassigned' ? [UNASSIGNED_OWNER_OPTION] : combinedAssigneeQuery),
    [combinedAssigneeQuery, owner],
  )
  const statusOptions = useMemo<FilterOption[]>(
    () =>
      ALL_STATUSES.map((status) => ({
        value: status,
        label: statusLabels[status],
      })),
    [statusLabels],
  )
  const filtersDisabled = facetsQuery.isLoading

  const queryInputWithoutCursor = useMemo<ObligationQueueListInputWithoutCursor>(
    () => ({
      ...(statusQuery.length > 0 ? { status: statusQuery } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(obligationQuery.length > 0 ? { obligationIds: obligationQuery } : {}),
      ...(clientQuery.length > 0 ? { clientIds: clientQuery } : {}),
      ...(stateQuery.length > 0 ? { states: stateQuery } : {}),
      ...(countyQuery.length > 0 ? { counties: countyQuery } : {}),
      ...(taxTypeQuery.length > 0 ? { taxTypes: taxTypeQuery } : {}),
      ...(assigneeNameQuery ? { assigneeName: assigneeNameQuery } : {}),
      ...(assigneeQuery.length > 0 ? { assigneeNames: assigneeQuery } : {}),
      ...(owner ? { owner } : {}),
      ...(due ? { due } : {}),
      ...(dueWithin && dueWithin > 0 && dueWithin <= 30 ? { dueWithinDays: dueWithin } : {}),
      ...(exposure ? { exposureStatus: exposure } : {}),
      ...(minExposureCents !== undefined ? { minExposureCents } : {}),
      ...(maxExposureCents !== undefined ? { maxExposureCents } : {}),
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
      stateQuery,
      countyQuery,
      taxTypeQuery,
      assigneeNameQuery,
      assigneeQuery,
      owner,
      due,
      dueWithin,
      exposure,
      minExposureCents,
      maxExposureCents,
      minDaysUntilDue,
      maxDaysUntilDue,
      evidence,
      asOf,
      sort,
    ],
  )
  const currentSavedViewQuery = useMemo<Record<string, unknown>>(
    () => ({
      q: searchInput,
      status: statusFilter,
      obligation: null,
      client: clientFilter,
      state: stateFilter,
      county: countyFilter,
      taxType: taxTypeFilter,
      assignee,
      assignees: assigneeFilter,
      owner,
      due,
      dueWithin,
      exposure,
      evidence,
      riskMin,
      riskMax,
      daysMin,
      daysMax,
      asOf,
      sort,
    }),
    [
      asOf,
      assignee,
      assigneeFilter,
      clientFilter,
      countyFilter,
      daysMax,
      daysMin,
      due,
      dueWithin,
      evidence,
      exposure,
      riskMax,
      riskMin,
      searchInput,
      sort,
      stateFilter,
      statusFilter,
      taxTypeFilter,
      owner,
    ],
  )
  const currentSavedColumnVisibility = useMemo<ObligationQueueColumnVisibility>(
    () => Object.fromEntries(hiddenColumns.map((columnId) => [columnId, false])),
    [hiddenColumns],
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
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDeadlineTip.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        // Show a short audit reference so the user has an immediately
        // checkable "did this write to audit?" answer (Day 3 acceptance).
        toast.success(t`Status updated`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
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
  const createSavedViewMutation = useMutation(
    orpc.obligations.createSavedView.mutationOptions({
      onSuccess: (view) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listSavedViews.key() })
        void setObligationQueueQuery({ view: view.id })
        setSavedViewDraft(null)
        toast.success(t`Saved view created`)
      },
      onError: (err) => {
        toast.error(t`Couldn't save view`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const updateSavedViewMutation = useMutation(
    orpc.obligations.updateSavedView.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listSavedViews.key() })
        setSavedViewDraft(null)
        toast.success(t`Saved view updated`)
      },
      onError: (err) => {
        toast.error(t`Couldn't update view`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const deleteSavedViewMutation = useMutation(
    orpc.obligations.deleteSavedView.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listSavedViews.key() })
        if (activeSavedViewId === result.id) void setObligationQueueQuery({ view: null })
        toast.success(t`Saved view deleted`)
      },
      onError: (err) => {
        toast.error(t`Couldn't delete view`, {
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

  const rowsById = useMemo(
    () => new Map(rows.map((obligationQueueRow) => [obligationQueueRow.id, obligationQueueRow])),
    [rows],
  )
  const activeRow = (row ? rowsById.get(row) : null) ?? rows[0] ?? null
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
    (input: { id: string; status: ObligationStatus }) => {
      updateStatusMutation.mutate(input)
    },
    [updateStatusMutation],
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
        header: ({ table }) => (
          <Checkbox
            aria-label={t`Select all visible rows`}
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
          />
        ),
        cell: ({ row: tableRow }) => (
          <Checkbox
            aria-label={t`Select ${tableRow.original.clientName}`}
            checked={tableRow.getIsSelected()}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(checked) => tableRow.toggleSelected(checked)}
          />
        ),
        meta: { headerClassName: 'w-10', cellClassName: 'w-10' },
      },
      {
        id: 'smartPriority',
        header: () => <ConceptLabel concept="smartPriority">{t`Priority`}</ConceptLabel>,
        cell: ({ row: tableRow }) => (
          <SmartPriorityBadge smartPriority={tableRow.original.smartPriority} />
        ),
        meta: { headerClassName: 'w-[120px]', cellClassName: 'w-[120px]' },
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
        cell: (info) => info.getValue<string>(),
        meta: { cellClassName: 'font-medium text-text-primary' },
      },
      {
        accessorKey: 'assigneeName',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Owner`}
            open={openHeaderFilter === 'owner'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('owner', nextOpen)}
            options={ownerOptions}
            selected={ownerQuery}
            disabled={filtersDisabled}
            emptyLabel={t`No assignees`}
            searchable
            searchPlaceholder={t`Search assignees`}
            onSelectedChange={(nextOwner) => {
              const isUnassigned = nextOwner.includes(UNASSIGNED_OWNER_OPTION)
              const nextAssignee = nextOwner.filter((value) => value !== UNASSIGNED_OWNER_OPTION)
              void setObligationQueueQuery({
                owner: isUnassigned ? 'unassigned' : null,
                assignee: null,
                assignees: !isUnassigned && nextAssignee.length > 0 ? nextAssignee : null,
                obligation: null,
                row: null,
              })
            }}
          />
        ),
        cell: (info) => info.getValue<string | null>() ?? t`Unassigned`,
        meta: { cellClassName: 'text-text-secondary' },
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
        meta: { cellClassName: 'font-mono text-text-secondary' },
      },
      {
        accessorKey: 'clientCounty',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`County`}
            open={openHeaderFilter === 'county'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('county', nextOpen)}
            options={countyOptions}
            selected={countyQuery}
            disabled={filtersDisabled || countyOptions.length === 0}
            emptyLabel={t`No counties`}
            searchable
            searchPlaceholder={t`Search counties`}
            onSelectedChange={(nextCounty) =>
              void setObligationQueueQuery({
                county: nextCounty.length > 0 ? nextCounty : null,
                obligation: null,
                row: null,
              })
            }
          />
        ),
        cell: (info) => info.getValue<string | null>() ?? '—',
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
        cell: (info) => <TaxCodeLabel code={info.getValue<string>()} />,
        meta: { cellClassName: 'text-text-secondary' },
      },
      {
        accessorKey: 'currentDueDate',
        header: () => {
          const label = t`Due date`
          return (
            <ObligationQueueSortableHeader
              sort={sort}
              ascSort="due_asc"
              descSort="due_desc"
              firstSort="due_asc"
              sortLabel={`${t`Sort`} ${label}`}
              onSortChange={changeSort}
            >
              <span className="-mx-2 inline-flex h-7 items-center rounded-md px-2 text-xs font-medium tracking-wider whitespace-nowrap text-text-tertiary uppercase">
                {label}
              </span>
            </ObligationQueueSortableHeader>
          )
        },
        cell: (info) => formatDate(info.getValue<string>()),
        meta: { cellClassName: 'text-xs tabular-nums' },
      },
      {
        accessorKey: 'daysUntilDue',
        header: () => (
          <RangeHeaderFilterDropdown
            label={t`Days`}
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
        ),
        cell: (info) => <DueDaysPill days={info.getValue<number>()} />,
        meta: { cellClassName: 'tabular-nums' },
      },
      {
        accessorKey: 'estimatedExposureCents',
        header: () => {
          const label = t`Projected risk`
          return (
            <ObligationQueueSortableHeader
              sort={sort}
              ascSort="exposure_asc"
              descSort="exposure_desc"
              firstSort="exposure_desc"
              sortLabel={`${t`Sort`} ${label}`}
              onSortChange={changeSort}
            >
              <RangeHeaderFilterDropdown
                label={label}
                minLabel={t`Minimum dollars at risk`}
                maxLabel={t`Maximum dollars at risk`}
                minPlaceholder={t`Min $`}
                maxPlaceholder={t`Max $`}
                minValue={riskMin}
                maxValue={riskMax}
                inputMode="numeric"
                min={0}
                onCommit={(nextMin, nextMax) =>
                  void setObligationQueueQuery({
                    riskMin: integerFromInput(nextMin, 0),
                    riskMax: integerFromInput(nextMax, 0),
                    obligation: null,
                    row: null,
                  })
                }
              />
            </ObligationQueueSortableHeader>
          )
        },
        cell: ({ row: tableRow }) => (
          <ExposurePill row={tableRow.original} onNeedsInput={setPenaltyRow} />
        ),
      },
      {
        accessorKey: 'evidenceCount',
        header: () => <ConceptLabel concept="evidence">{t`Evidence`}</ConceptLabel>,
        cell: ({ row: tableRow }) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            aria-label={t`Open evidence for ${tableRow.original.clientName}`}
            onClick={(event) => {
              event.stopPropagation()
              openEvidence({
                obligationId: tableRow.original.id,
                label: `${tableRow.original.clientName} - ${formatTaxCode(tableRow.original.taxType)}`,
              })
            }}
          >
            <FileSearchIcon data-icon="inline-start" />
            {tableRow.original.evidenceCount > 0 ? (
              <Plural value={tableRow.original.evidenceCount} one="# source" other="# sources" />
            ) : (
              t`Needs evidence`
            )}
          </Button>
        ),
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
                onChange={(id, status) => updateStatus({ id, status })}
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
                />
              ) : null}
              {showRejection ? <RejectionChip /> : null}
            </div>
          )
        },
      },
    ],
    [
      changeSort,
      clientOptions,
      clientQuery,
      countyOptions,
      countyQuery,
      daysMax,
      daysMin,
      filtersDisabled,
      openHeaderFilter,
      openEvidence,
      ownerOptions,
      ownerQuery,
      riskMax,
      riskMin,
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

  const table = useReactTable({
    data: rows,
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
      const nextHidden = hiddenFromColumnVisibility(nextVisibility)
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
      updateStatus({ id: activeRow.id, status })
    },
    [activeRow, statusUpdatePending, updateStatus],
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

  useAppHotkey('X', (event) => updateActiveRowStatus('extended', event.target), {
    enabled: keyboardEnabled,
    requireReset: true,
    meta: {
      id: 'obligations.mark-extended',
      name: 'Mark extended',
      description: 'Mark the active row as extended.',
      category: 'obligations',
      scope: 'route',
    },
  })

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

  function loadMore() {
    if (!listQuery.hasNextPage) return
    void listQuery.fetchNextPage()
  }

  function resetObligationQueue() {
    void setObligationQueueQuery(null)
    setRowSelection({})
  }

  function applySavedView(viewToApply: ObligationQueueSavedView) {
    const hidden = hiddenFromColumnVisibility(viewToApply.columnVisibility)
    void setObligationQueueQuery({
      ...savedViewQueryPatch(viewToApply.query),
      density: withDefaultDensityCleared(viewToApply.density),
      hide: hidden.length > 0 ? hidden : null,
      view: viewToApply.id,
      obligation: null,
      row: null,
    })
    setRowSelection({})
  }

  function saveViewDraft() {
    if (!savedViewDraft) return
    const name = savedViewDraft.name.trim()
    if (!name) return
    if (savedViewDraft.mode === 'create') {
      createSavedViewMutation.mutate({
        name,
        query: currentSavedViewQuery,
        columnVisibility: currentSavedColumnVisibility,
        density,
        isPinned: false,
      })
      return
    }
    if (savedViewDraft.id) {
      updateSavedViewMutation.mutate({ id: savedViewDraft.id, name })
    }
  }

  function updateActiveSavedView() {
    if (!activeSavedViewId) return
    updateSavedViewMutation.mutate({
      id: activeSavedViewId,
      query: currentSavedViewQuery,
      columnVisibility: currentSavedColumnVisibility,
      density,
    })
  }

  function changeSelectedStatus(status: ObligationStatus, reason?: string) {
    if (selectedIds.length === 0) return
    bulkStatusMutation.mutate({
      ids: selectedIds,
      status,
      ...(reason ? { reason } : {}),
    })
  }

  function changeSelectedAssignee(assigneeId: string | null) {
    if (selectedClientIds.length === 0) return
    bulkAssigneeMutation.mutate({
      clientIds: selectedClientIds,
      assigneeId,
      reason: t`Obligations bulk owner change`,
    })
  }

  function exportSelected(format: 'csv' | 'pdf_zip') {
    if (selectedIds.length === 0) return
    exportMutation.mutate({ ids: selectedIds, format })
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold leading-tight text-text-primary">
              <ConceptLabel concept="obligation">
                <Trans>Obligations</Trans>
              </ConceptLabel>
            </h1>
            <p className="max-w-180 text-md text-text-secondary">
              <Trans>
                Status changes write an audit row in the same call so the trail stays trustworthy.
              </Trans>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="primary" size="sm">
                    <SaveIcon data-icon="inline-start" />
                    <Trans>Saved views</Trans>
                  </Button>
                }
              />
              <DropdownMenuContent className="w-72" align="end">
                <DropdownMenuItem
                  onClick={() =>
                    setSavedViewDraft({ mode: 'create', name: t`New obligation view` })
                  }
                >
                  <SaveIcon data-icon="inline-start" />
                  <Trans>Save current view</Trans>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!activeSavedViewId} onClick={updateActiveSavedView}>
                  <SaveIcon data-icon="inline-start" />
                  <Trans>Update active view</Trans>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {savedViews.length === 0 ? (
                  <DropdownMenuItem disabled>
                    <Trans>No saved views</Trans>
                  </DropdownMenuItem>
                ) : (
                  savedViews.map((savedView) => (
                    <DropdownMenuGroup key={savedView.id}>
                      <DropdownMenuLabel className="flex items-center gap-2">
                        {savedView.isPinned ? <PinIcon className="size-3" aria-hidden /> : null}
                        <span className="truncate">{savedView.name}</span>
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => applySavedView(savedView)}>
                        <Trans>Apply view</Trans>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateSavedViewMutation.mutate({
                            id: savedView.id,
                            isPinned: !savedView.isPinned,
                          })
                        }
                      >
                        <PinIcon data-icon="inline-start" />
                        {savedView.isPinned ? <Trans>Unpin view</Trans> : <Trans>Pin view</Trans>}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setSavedViewDraft({
                            mode: 'rename',
                            id: savedView.id,
                            name: savedView.name,
                          })
                        }
                      >
                        <Trans>Rename view</Trans>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteSavedViewMutation.mutate({ id: savedView.id })}
                      >
                        <Trash2Icon data-icon="inline-start" />
                        <Trans>Delete view</Trans>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </DropdownMenuGroup>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <CalendarSyncPopover />
            <Button variant="outline" size="sm" onClick={resetObligationQueue}>
              <FilterIcon data-icon="inline-start" />
              <Trans>Reset</Trans>
            </Button>
          </div>
        </div>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-90">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-tertiary" />
              <Input
                aria-label={t`Search obligations`}
                className="pl-8"
                placeholder={t`Search clients`}
                value={searchInput}
                onChange={(event) => {
                  const nextSearch = event.target.value
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
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm">
                      <Columns3Icon data-icon="inline-start" />
                      <Trans>Columns</Trans>
                    </Button>
                  }
                />
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      <Trans>Visible columns</Trans>
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
              <span className="text-sm text-text-secondary">
                <Trans>Sort</Trans>
              </span>
              <Select
                value={sort}
                onValueChange={(value) => {
                  if (typeof value !== 'string' || !isObligationQueueSort(value)) return
                  void setObligationQueueQuery({
                    sort: withDefaultSortCleared(value),
                    obligation: null,
                    row: null,
                  })
                }}
              >
                <SelectTrigger size="sm" className="min-w-50">
                  <SelectValue>{sortLabels[sort]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smart_priority">{sortLabels.smart_priority}</SelectItem>
                  <SelectItem value="due_asc">{sortLabels.due_asc}</SelectItem>
                  <SelectItem value="due_desc">{sortLabels.due_desc}</SelectItem>
                  <SelectItem value="exposure_desc">{sortLabels.exposure_desc}</SelectItem>
                  <SelectItem value="exposure_asc">{sortLabels.exposure_asc}</SelectItem>
                  <SelectItem value="updated_desc">{sortLabels.updated_desc}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                <Trans>Window</Trans>
              </span>
              <button
                type="button"
                className="cursor-pointer focus-visible:outline-none"
                onClick={() =>
                  void setObligationQueueQuery(nextThisWeekFilterPatch(daysMin, daysMax))
                }
              >
                <Badge variant={thisWeekFilterActive ? 'default' : 'ghost'}>
                  <Trans>This week</Trans>
                </Badge>
              </button>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                <Trans>Needs action</Trans>
              </span>
              <button
                type="button"
                className="cursor-pointer focus-visible:outline-none"
                onClick={() =>
                  void setObligationQueueQuery({
                    exposure: exposure === 'needs_input' ? null : 'needs_input',
                    obligation: null,
                    row: null,
                  })
                }
              >
                <Badge variant={exposure === 'needs_input' ? 'default' : 'ghost'}>
                  <Trans>Penalty input</Trans>
                </Badge>
              </button>
              <button
                type="button"
                className="cursor-pointer focus-visible:outline-none"
                onClick={() =>
                  void setObligationQueueQuery({
                    evidence: evidence === 'needs' ? null : 'needs',
                    obligation: null,
                    row: null,
                  })
                }
              >
                <Badge variant={evidence === 'needs' ? 'default' : 'ghost'}>
                  <Trans>Evidence</Trans>
                </Badge>
              </button>
            </div>
            <Badge variant="outline" className="text-xs tabular-nums">
              <Plural value={totalShown} one="# row" other="# rows" />
            </Badge>
          </div>

          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-divider-regular bg-background-section p-3">
              <Badge variant="info" className="tabular-nums">
                <Plural value={selectedIds.length} one="# selected" other="# selected" />
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button size="sm">
                      <Trans>Change status</Trans>
                      <ChevronDownIcon data-icon="inline-end" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start">
                  {ALL_STATUSES.map((status) => (
                    <DropdownMenuItem key={status} onClick={() => changeSelectedStatus(status)}>
                      {statusLabels[status]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm">
                      <Trans>Change assignee</Trans>
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
                        onClick={() => changeSelectedAssignee(member.assigneeId)}
                      >
                        <span className="truncate">{member.name}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExtendedMemo('')
                  setExtendedMemoOpen(true)
                }}
              >
                <Trans>Mark extended</Trans>
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportSelected('csv')}>
                <DownloadIcon data-icon="inline-start" />
                <Trans>CSV</Trans>
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportSelected('pdf_zip')}>
                <FileArchiveIcon data-icon="inline-start" />
                <Trans>PDF zip</Trans>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
                <XIcon data-icon="inline-start" />
                <Trans>Clear</Trans>
              </Button>
            </div>
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
              {/* Override the Table primitive's default `whitespace-nowrap`
                on BOTH heads and cells, letting long values (client names,
                tax type codes) wrap so the 12-column queue fits within
                the page content width instead of forcing horizontal scroll. */}
              <Table className="[&_th]:!whitespace-normal [&_th]:!px-2 [&_td]:!whitespace-normal [&_td]:!px-2 [&_td]:break-words">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const meta = header.column.columnDef.meta
                        return (
                          <TableHead
                            key={header.id}
                            className={meta?.headerClassName}
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
                <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
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
                            exposure?.length ||
                            evidence?.length ||
                            riskMin !== null ||
                            riskMax !== null ||
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
                        aria-selected={tableRow.original.id === activeRow?.id}
                        data-state={tableRow.getIsSelected() ? 'selected' : undefined}
                        className={
                          tableRow.original.id === activeRow?.id
                            ? 'cursor-pointer bg-state-base-hover'
                            : 'cursor-pointer'
                        }
                        onClick={(event) => {
                          if (isObligationQueueRowControlClick(event.target)) {
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

              {tableRows.length > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-tertiary">
                    <Plural value={totalShown} one="# obligation" other="# obligations" />
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!listQuery.hasNextPage || listQuery.isFetchingNextPage}
                    onClick={loadMore}
                  >
                    {listQuery.isFetchingNextPage ? (
                      <Trans>Loading…</Trans>
                    ) : (
                      <Trans>Load more</Trans>
                    )}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
      <ObligationQueueDetailDrawer
        obligationId={activeDetailId}
        activeTab={detailTab}
        onTabChange={(nextTab) => void setObligationQueueQuery({ tab: nextTab })}
        onClose={() => void setObligationQueueQuery({ drawer: null, id: null })}
        onNeedsInput={setPenaltyRow}
        practiceAiEnabled={practiceAiEnabled}
      />
      <PenaltyInputDialog
        row={penaltyRow}
        onClose={() => setPenaltyRow(null)}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
          void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        }}
      />
      <Dialog
        open={savedViewDraft !== null}
        onOpenChange={(open) => (!open ? setSavedViewDraft(null) : undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {savedViewDraft?.mode === 'rename' ? (
                <Trans>Rename saved view</Trans>
              ) : (
                <Trans>Save current view</Trans>
              )}
            </DialogTitle>
            <DialogDescription>
              <Trans>Saved views store filters, sort, visible columns, and density.</Trans>
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label={t`Saved view name`}
            value={savedViewDraft?.name ?? ''}
            onChange={(event) =>
              setSavedViewDraft((current) =>
                current ? { ...current, name: event.target.value } : current,
              )
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSavedViewDraft(null)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              onClick={saveViewDraft}
              disabled={
                !savedViewDraft?.name.trim() ||
                createSavedViewMutation.isPending ||
                updateSavedViewMutation.isPending
              }
            >
              <Trans>Save view</Trans>
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

function ExposurePill({
  row,
  onNeedsInput,
}: {
  row: ObligationQueueRow
  onNeedsInput: (row: ObligationQueueRow) => void
}) {
  if (row.exposureStatus === 'ready' && row.estimatedExposureCents !== null) {
    const showAccrued = row.daysUntilDue < 0
    return (
      <div className="grid min-w-0 gap-1">
        <Badge
          variant="warning"
          className={`${OBLIGATION_QUEUE_TABLE_PILL_CLASSNAME} tabular-nums`}
        >
          {formatCents(row.estimatedExposureCents)}
        </Badge>
        {showAccrued ? (
          <span className="text-[11px] leading-none text-text-tertiary">
            {row.accruedPenaltyStatus === 'ready' && row.accruedPenaltyCents !== null ? (
              <Trans>
                Accrued {formatCents(row.accruedPenaltyCents)} as of {row.penaltyAsOfDate}
              </Trans>
            ) : row.accruedPenaltyStatus === 'needs_input' ? (
              <Trans>Accrued needs input</Trans>
            ) : (
              <Trans>Accrued unsupported</Trans>
            )}
          </span>
        ) : null}
      </div>
    )
  }
  if (row.exposureStatus === 'needs_input') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={(event) => {
          event.stopPropagation()
          onNeedsInput(row)
        }}
      >
        <Trans>needs input</Trans>
      </Button>
    )
  }
  return (
    <Badge variant="outline" className={OBLIGATION_QUEUE_TABLE_PILL_CLASSNAME}>
      <Trans>unsupported</Trans>
    </Badge>
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

function ObligationQueueDetailDrawer({
  obligationId,
  activeTab,
  onTabChange,
  onClose,
  onNeedsInput,
  practiceAiEnabled,
}: {
  obligationId: string | null
  activeTab: ObligationQueueDetailTab
  onTabChange: (tab: ObligationQueueDetailTab) => void
  onClose: () => void
  onNeedsInput: (row: ObligationQueueRow) => void
  practiceAiEnabled: boolean
}) {
  const { t } = useLingui()
  const practiceTimezone = usePracticeTimezone()
  const queryClient = useQueryClient()
  // Lifecycle v2: when on, the Audit tab is relabeled to "Timeline"
  // and its content swaps to the milestone-grouped timeline. See
  // docs/Design/obligation-lifecycle-design-brief.md.
  const lifecycleV2 = useLifecycleV2()
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const [checklistDraft, setChecklistDraft] = useState<{
    obligationId: string
    items: ReadinessChecklistItem[]
  } | null>(null)
  const [extensionDraft, setExtensionDraft] = useState({
    obligationId: '',
    decision: 'applied' as 'applied' | 'rejected',
    memo: '',
    source: '',
    expectedExtendedDueDate: '',
  })
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
  const latestRequest = detail?.readinessRequests[0] ?? null
  const generatedChecklistDraft = useMemo(
    () => (detail ? latestGeneratedReadinessChecklistDraft(detail.evidence) : null),
    [detail],
  )
  const localChecklistDraft =
    row && checklistDraft?.obligationId === row.id ? checklistDraft.items : null
  const latestRequestCreatedAtMs = latestRequest ? Date.parse(latestRequest.createdAt) : 0
  const storedChecklist =
    generatedChecklistDraft && generatedChecklistDraft.createdAtMs > latestRequestCreatedAtMs
      ? generatedChecklistDraft.items
      : (latestRequest?.checklist ?? generatedChecklistDraft?.items ?? null)
  const expectedExtendedDueDateInvalid =
    extensionDraft.expectedExtendedDueDate !== '' &&
    !isValidIsoDate(extensionDraft.expectedExtendedDueDate)

  if (row && extensionDraft.obligationId !== row.id) {
    setExtensionDraft({
      obligationId: row.id,
      decision: row.extensionDecision === 'rejected' ? 'rejected' : 'applied',
      memo: row.extensionMemo ?? '',
      source: row.extensionSource ?? '',
      expectedExtendedDueDate: row.extensionExpectedDueDate ?? '',
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
      onSuccess: (result, variables) => {
        setChecklistDraft({ obligationId: variables.obligationId, items: result.checklist })
        invalidateDetail()
        toast.success(result.degraded ? t`Fallback checklist ready` : t`Checklist generated`)
      },
      onError: (err) => {
        toast.error(t`Couldn't generate checklist`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const shouldAutoGenerateChecklist = Boolean(
    row &&
    practiceAiEnabled &&
    !latestRequest &&
    !generatedChecklistDraft &&
    !localChecklistDraft &&
    !generateChecklistMutation.isPending,
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
    localChecklistDraft ?? autoGeneratedChecklist ?? storedChecklist ?? EMPTY_CHECKLIST
  const checklistGenerating =
    generateChecklistMutation.isPending || autoGenerateChecklistQuery.isFetching
  const sendRequestMutation = useMutation(
    orpc.readiness.sendRequest.mutationOptions({
      onSuccess: (result, variables) => {
        setChecklistDraft({ obligationId: variables.obligationId, items: result.request.checklist })
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
  const decideExtensionMutation = useMutation(
    orpc.obligations.decideExtension.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        toast.success(t`Extension decision saved`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't save extension decision`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
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
  function updateChecklistItem(index: number, patch: Partial<ReadinessChecklistItem>) {
    if (!row) return
    const base = checklist.length > 0 ? checklist : EMPTY_CHECKLIST
    setChecklistDraft({
      obligationId: row.id,
      items: base.map((item, itemIndex) =>
        itemIndex === index ? Object.assign({}, item, patch) : item,
      ),
    })
  }

  function addChecklistItem() {
    if (!row) return
    setChecklistDraft({
      obligationId: row.id,
      items: [
        ...checklist,
        {
          id: `custom-${crypto.randomUUID()}`,
          label: '',
          description: null,
          reason: null,
          sourceHint: null,
        },
      ],
    })
  }

  function removeChecklistItem(index: number) {
    if (!row) return
    setChecklistDraft({
      obligationId: row.id,
      items: checklist.filter((_, itemIndex) => itemIndex !== index),
    })
  }

  function copyLatestLink() {
    if (!latestRequest?.portalUrl) return
    void navigator.clipboard.writeText(latestRequest.portalUrl)
    toast.success(t`Portal link copied`)
  }

  function saveExtensionDecision() {
    if (!row) return
    if (expectedExtendedDueDateInvalid) {
      toast.error(t`The request was invalid. Please review your input and try again.`)
      return
    }

    decideExtensionMutation.mutate({
      id: row.id,
      decision: extensionDraft.decision,
      ...(extensionDraft.memo.trim() ? { memo: extensionDraft.memo.trim() } : {}),
      ...(extensionDraft.source.trim() ? { source: extensionDraft.source.trim() } : {}),
      ...(extensionDraft.expectedExtendedDueDate
        ? { expectedExtendedDueDate: extensionDraft.expectedExtendedDueDate }
        : {}),
    })
  }

  const validChecklist = checklist.filter((item) => item.label.trim())

  return (
    <Sheet open={obligationId !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:max-w-[100vw] sm:data-[side=right]:w-[min(1120px,calc(100vw-1rem))] sm:data-[side=right]:max-w-none xl:data-[side=right]:w-[min(1180px,calc(100vw-2rem))] overflow-y-auto">
        <SheetHeader className="border-b border-divider-subtle">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle>{row?.clientName ?? <Trans>Obligation detail</Trans>}</SheetTitle>
              <SheetDescription>
                {row ? (
                  <>
                    <TaxCodeLabel code={row.taxType} /> · {formatDate(row.currentDueDate)}
                  </>
                ) : null}
              </SheetDescription>
              {/* Cross-link the drawer to the client detail page —
                without this the drawer is a dead-end on the most-
                traversed entity. */}
              {row?.clientId ? (
                <Link
                  to={`/clients/${row.clientId}`}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                >
                  <Trans>Open client detail</Trans>
                  <ArrowUpRightIcon aria-hidden className="size-3" />
                </Link>
              ) : null}
            </div>
            {lifecycleV2 && row && (row.status === 'done' || row.status === 'paid') ? (
              <Button
                size="sm"
                onClick={() => markAcceptedMutation.mutate({ id: row.id, status: 'completed' })}
                disabled={markAcceptedMutation.isPending}
              >
                <CheckCircle2Icon aria-hidden="true" />
                <Trans>Mark accepted</Trans>
              </Button>
            ) : null}
          </div>
        </SheetHeader>
        <div className="px-6 pb-6">
          {detailQuery.isLoading ? (
            <div className="rounded-lg border border-dashed border-divider-regular py-8 text-center text-sm text-text-tertiary">
              <Trans>Loading obligation detail…</Trans>
            </div>
          ) : detailQuery.isError || !detail || !row ? (
            <div className="rounded-lg border border-state-destructive-border bg-state-destructive-hover p-4 text-sm text-text-destructive">
              <Trans>Couldn't load obligation detail.</Trans>{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void detailQuery.refetch()}
              >
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
              <TabsList className="mb-4 flex w-full flex-wrap justify-start">
                <TabsTrigger value="readiness">
                  <Trans>Readiness</Trans>
                </TabsTrigger>
                <TabsTrigger value="extension">
                  <Trans>Extension</Trans>
                </TabsTrigger>
                <TabsTrigger value="risk">
                  <Trans>Risk</Trans>
                </TabsTrigger>
                <TabsTrigger value="evidence">
                  <Trans>Evidence</Trans>
                </TabsTrigger>
                <TabsTrigger value="audit">
                  {lifecycleV2 ? <Trans>Timeline</Trans> : <Trans>Audit</Trans>}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="readiness">
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="grid gap-3">
                    <div className="flex flex-wrap gap-2">
                      {practiceAiEnabled ? (
                        <Button
                          size="sm"
                          onClick={() => generateChecklistMutation.mutate({ obligationId: row.id })}
                          disabled={checklistGenerating}
                        >
                          <RefreshCwIcon
                            data-icon="inline-start"
                            className={cn(checklistGenerating ? 'animate-spin' : undefined)}
                          />
                          {checklistGenerating ? (
                            <Trans>Preparing</Trans>
                          ) : (
                            <Trans>Generate checklist</Trans>
                          )}
                        </Button>
                      ) : (
                        <UpgradeCtaButton />
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addChecklistItem}
                        disabled={checklistGenerating || checklist.length >= 8}
                      >
                        <Trans>Add item</Trans>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          sendRequestMutation.mutate({
                            obligationId: row.id,
                            checklist: validChecklist,
                          })
                        }
                        disabled={sendRequestMutation.isPending || validChecklist.length === 0}
                      >
                        <SendIcon data-icon="inline-start" />
                        <Trans>Send readiness check</Trans>
                      </Button>
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
                              <Trans>Couldn't generate checklist</Trans>
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
                        <EmptyPanel>
                          <Trans>
                            Generate a checklist or add items before sending a portal link.
                          </Trans>
                        </EmptyPanel>
                      )
                    ) : (
                      checklist.map((item, index) => (
                        <div
                          key={item.id}
                          className="grid gap-2 rounded-lg border border-divider-regular p-3"
                        >
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                            <Input
                              aria-label={t`Checklist item label`}
                              value={item.label}
                              placeholder={t`Checklist item`}
                              onChange={(event) =>
                                updateChecklistItem(index, { label: event.target.value })
                              }
                            />
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="destructive-ghost"
                              aria-label={t`Remove checklist item`}
                              onClick={() => removeChecklistItem(index)}
                            >
                              <Trash2Icon />
                            </Button>
                          </div>
                          <Textarea
                            aria-label={t`Checklist item description`}
                            value={item.description ?? ''}
                            placeholder={t`Client-facing detail`}
                            onChange={(event) =>
                              updateChecklistItem(index, {
                                description: event.target.value || null,
                              })
                            }
                          />
                          <p className="text-xs text-text-tertiary">{item.reason}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="grid content-start gap-3 rounded-lg border border-divider-regular p-3">
                    <DetailRow label={<Trans>Readiness</Trans>} value={row.readiness} />
                    <DetailRow
                      label={<Trans>Latest request</Trans>}
                      value={latestRequest ? latestRequest.status : t`None`}
                    />
                    {latestRequest?.portalUrl ? (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={copyLatestLink}>
                          <CopyIcon data-icon="inline-start" />
                          <Trans>Copy link</Trans>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          render={
                            <a href={latestRequest.portalUrl} target="_blank" rel="noreferrer" />
                          }
                        >
                          <ExternalLinkIcon data-icon="inline-start" />
                          <Trans>Open portal</Trans>
                        </Button>
                      </div>
                    ) : null}
                    {latestRequest && latestRequest.status !== 'revoked' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          revokeRequestMutation.mutate({ requestId: latestRequest.id })
                        }
                        disabled={revokeRequestMutation.isPending}
                      >
                        <Trans>Revoke request</Trans>
                      </Button>
                    ) : null}
                    <Separator />
                    <div className="grid gap-2">
                      {latestRequest?.responses.length ? (
                        latestRequest.responses.map((response) => (
                          <div key={response.id} className="text-xs text-text-secondary">
                            <span className="font-medium text-text-primary">{response.itemId}</span>
                            {': '}
                            {response.status}
                            {response.note ? ` - ${response.note}` : null}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-text-tertiary">
                          <Trans>No client response yet.</Trans>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="extension">
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <div className="grid gap-3">
                    <AlertPanel>
                      <Trans>
                        This records an internal decision for this obligation. It does not update
                        the due date, change client records, or confirm an authority filing. Payment
                        may still be due by the original date.
                      </Trans>
                    </AlertPanel>
                    <div className="grid gap-2 rounded-lg border border-divider-regular p-3">
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
                    <Select
                      value={extensionDraft.decision}
                      onValueChange={(value) => {
                        if (value !== 'applied' && value !== 'rejected') return
                        setExtensionDraft((current) => ({ ...current, decision: value }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="applied">
                          <Trans>Record internal decision: extension applied</Trans>
                        </SelectItem>
                        <SelectItem value="rejected">
                          <Trans>Record internal decision: extension rejected</Trans>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <IsoDatePicker
                      value={extensionDraft.expectedExtendedDueDate}
                      invalid={expectedExtendedDueDateInvalid}
                      ariaLabel={t`Expected extended due date (reference only)`}
                      onValueChange={(expectedExtendedDueDate) =>
                        setExtensionDraft((current) => ({ ...current, expectedExtendedDueDate }))
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
                      aria-label={t`Extension memo`}
                      placeholder={t`Decision memo`}
                      value={extensionDraft.memo}
                      onChange={(event) =>
                        setExtensionDraft((current) => ({ ...current, memo: event.target.value }))
                      }
                    />
                    <Button
                      className="w-fit"
                      onClick={saveExtensionDecision}
                      disabled={decideExtensionMutation.isPending}
                    >
                      <Trans>Save internal decision</Trans>
                    </Button>
                  </div>
                  <div className="grid content-start gap-3 rounded-lg border border-divider-regular p-3">
                    <DetailRow label={<Trans>Current status</Trans>} value={row.status} />
                    <DetailRow label={<Trans>Decision</Trans>} value={row.extensionDecision} />
                    <DetailRow
                      label={<Trans>Expected extended date</Trans>}
                      value={
                        row.extensionExpectedDueDate
                          ? formatDate(row.extensionExpectedDueDate)
                          : t`Not set`
                      }
                    />
                    <DetailRow
                      label={<Trans>Decided at</Trans>}
                      value={
                        row.extensionDecidedAt
                          ? formatDateTimeWithTimezone(row.extensionDecidedAt, practiceTimezone)
                          : t`Not decided`
                      }
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="risk">
                <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-divider-regular p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-text-primary">
                          <ConceptLabel concept="smartPriority">
                            <Trans>Smart Priority</Trans>
                          </ConceptLabel>
                        </span>
                        <SmartPriorityBadge smartPriority={row.smartPriority} align="end" />
                      </div>
                      <div className="grid gap-2">
                        {row.smartPriority.factors.length === 0 ? (
                          <div className="rounded-md border border-divider-subtle bg-background-section px-3 py-2 text-xs text-text-secondary">
                            <Trans>Hidden by role</Trans>
                          </div>
                        ) : null}
                        {row.smartPriority.factors.map((factor) => (
                          <div key={factor.key} className="flex justify-between gap-3 text-xs">
                            <span className="min-w-0 truncate text-text-secondary">
                              {factor.label} · {factor.sourceLabel}
                            </span>
                            <span className="tabular-nums text-text-primary">
                              +{factor.contribution.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <DeadlineTipPanel
                      insight={deadlineTipInsight}
                      isLoading={deadlineTipQuery.isLoading}
                      isPreparing={deadlineTipPreparing}
                      isTimedOut={deadlineTipRefreshTimedOut}
                      canRefresh={practiceAiEnabled}
                      practiceTimezone={practiceTimezone}
                      onRefresh={() => requestDeadlineTipMutation.mutate({ obligationId: row.id })}
                    />
                    <DetailRow
                      label={
                        <ConceptLabel concept="exposure">{t`90-day projected risk`}</ConceptLabel>
                      }
                      value={
                        row.exposureStatus === 'ready' && row.estimatedExposureCents !== null
                          ? formatCents(row.estimatedExposureCents)
                          : row.exposureStatus
                      }
                    />
                    <DetailRow
                      label={<Trans>Accrued penalty</Trans>}
                      value={
                        row.accruedPenaltyStatus === 'ready' && row.accruedPenaltyCents !== null
                          ? `${formatCents(row.accruedPenaltyCents)} · ${row.penaltyAsOfDate}`
                          : row.accruedPenaltyStatus
                      }
                    />
                    <DetailRow
                      label={<Trans>Tax due</Trans>}
                      value={
                        row.estimatedTaxDueCents === null
                          ? t`Not entered`
                          : formatCents(row.estimatedTaxDueCents)
                      }
                    />
                    <DetailRow label={<Trans>Formula</Trans>} value={penaltyFormulaDisplay(row)} />
                    <DetailRow label={<Trans>Facts</Trans>} value={penaltyFactsDisplay(row)} />
                    <DetailRow
                      label={<Trans>Calculated</Trans>}
                      value={
                        row.exposureCalculatedAt
                          ? formatDateTimeWithTimezone(row.exposureCalculatedAt, practiceTimezone)
                          : t`Not calculated`
                      }
                    />
                    <Separator />
                    {row.missingPenaltyFacts.length > 0 ? (
                      <div className="grid gap-2 rounded-lg border border-divider-regular p-3">
                        <p className="text-xs font-medium text-text-secondary">
                          <Trans>Missing penalty facts</Trans>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {row.missingPenaltyFacts.map((fact) => (
                            <Badge key={fact} variant="outline" className="text-[11px]">
                              {penaltyFactLabel(fact)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {row.penaltyBreakdown.length > 0 ? (
                      <div className="grid gap-2">
                        <p className="text-xs font-medium text-text-secondary">
                          <Trans>Projected 90-day risk</Trans>
                        </p>
                        {row.penaltyBreakdown.map((item) => (
                          <PenaltyBreakdownCard key={`projected-${item.key}`} item={item} />
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel>
                        <Trans>No penalty breakdown is available yet.</Trans>
                      </EmptyPanel>
                    )}
                    {row.accruedPenaltyBreakdown.length > 0 ? (
                      <div className="grid gap-2">
                        <p className="text-xs font-medium text-text-secondary">
                          <Trans>Accrued penalty</Trans>
                        </p>
                        {row.accruedPenaltyBreakdown.map((item) => (
                          <PenaltyBreakdownCard key={`accrued-${item.key}`} item={item} />
                        ))}
                      </div>
                    ) : null}
                    {row.penaltySourceRefs.length > 0 ? (
                      <PenaltySourceList sourceRefs={row.penaltySourceRefs} />
                    ) : null}
                  </div>
                  <div className="content-start rounded-lg border border-divider-regular p-3">
                    {row.exposureStatus === 'needs_input' ? (
                      <Button size="sm" onClick={() => onNeedsInput(row)}>
                        <ShieldAlertIcon data-icon="inline-start" />
                        <Trans>Enter penalty inputs</Trans>
                      </Button>
                    ) : (
                      <p className="text-xs text-text-secondary">
                        <Trans>
                          Projected risk reflects the latest stored penalty calculation. Accrued
                          penalty is calculated for the selected as-of date.
                        </Trans>
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="evidence">
                <div className="grid gap-3">
                  <div className="text-sm font-medium text-text-primary">
                    <ConceptLabel concept="evidence">
                      <Trans>Evidence</Trans>
                    </ConceptLabel>
                  </div>
                  {detail.matchedRule ? (
                    <div className="rounded-lg border border-divider-regular p-3">
                      <p className="font-medium">{detail.matchedRule.title}</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {detail.matchedRule.defaultTip}
                      </p>
                    </div>
                  ) : null}
                  {detail.evidence.length > 0 ? (
                    detail.evidence.map((item) => (
                      <EvidenceInlineItem
                        key={item.id}
                        item={item}
                        practiceTimezone={practiceTimezone}
                      />
                    ))
                  ) : (
                    <EmptyPanel>
                      <Trans>No evidence links are attached to this obligation.</Trans>
                    </EmptyPanel>
                  )}
                  {detail.matchedRule?.evidence.map((item) => (
                    <div
                      key={`${item.sourceId}-${item.summary}`}
                      className="rounded-lg border border-divider-regular p-3"
                    >
                      <p className="font-medium">{item.summary}</p>
                      <p className="mt-1 text-xs text-text-tertiary">{item.sourceExcerpt}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="audit">
                <div className="grid gap-3">
                  <div className="text-sm font-medium text-text-primary">
                    <ConceptLabel concept="auditTrail">
                      {lifecycleV2 ? <Trans>Timeline</Trans> : <Trans>Audit</Trans>}
                    </ConceptLabel>
                  </div>
                  {lifecycleV2 ? (
                    detail.auditEvents.length > 0 || row !== null ? (
                      <ObligationTimeline
                        currentStatus={row.status}
                        events={detail.auditEvents}
                        labels={v2StatusLabels}
                        practiceTimezone={practiceTimezone}
                      />
                    ) : (
                      <EmptyPanel>
                        <Trans>No activity yet. The first transition will log a note here.</Trans>
                      </EmptyPanel>
                    )
                  ) : detail.auditEvents.length > 0 ? (
                    detail.auditEvents.map((event) => (
                      <ObligationQueueAuditEventCard
                        key={event.id}
                        event={event}
                        practiceTimezone={practiceTimezone}
                      />
                    ))
                  ) : (
                    <EmptyPanel>
                      <Trans>No audit events are attached to this obligation.</Trans>
                    </EmptyPanel>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
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

function PenaltyBreakdownCard({ item }: { item: ObligationQueueRow['penaltyBreakdown'][number] }) {
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

function penaltyFormulaDisplay(row: ObligationQueueRow): ReactNode {
  if (row.penaltyFormulaLabel) return row.penaltyFormulaLabel
  if (row.penaltyFormulaVersion) return <Trans>Penalty calculation available</Trans>
  return <Trans>Not calculated</Trans>
}

function penaltyFactsDisplay(row: ObligationQueueRow): ReactNode {
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

function DeadlineTipPanel({
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

type ObligationQueueAuditEvent = ObligationQueueDetail['auditEvents'][number]

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

function ObligationQueueAuditEventCard({
  event,
  practiceTimezone,
}: {
  event: ObligationQueueAuditEvent
  practiceTimezone: string
}) {
  const { t } = useLingui()
  const actionLabels = useAuditActionLabels()
  const statusLabels = useStatusLabels()
  const readinessLabels = useReadinessLabels()
  const changeLabels = useAuditChangeLabels({ actionLabels, readinessLabels, statusLabels })
  const actionLabel = formatAuditActionLabel(event.action, actionLabels)
  const changeView = buildAuditChangeView(event, changeLabels, practiceTimezone)

  return (
    <div className="rounded-lg border border-divider-regular p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{actionLabel}</span>
        <span className="text-xs text-text-tertiary">
          {formatDateTimeWithTimezone(event.createdAt, practiceTimezone)}
        </span>
      </div>
      <p className="mt-1 text-xs text-text-secondary">
        {event.actorLabel ?? t`System or client portal`}
      </p>
      {event.reason ? <p className="mt-2 text-sm text-text-secondary">{event.reason}</p> : null}
      <AuditChangeSummary changeView={changeView} />
    </div>
  )
}

function AuditChangeSummary({ changeView }: { changeView: AuditChangeView }) {
  const rows = changeView.changes.slice(0, 4).map((row) => ({
    id: row.field,
    label: row.field,
    value:
      row.previous === row.next ? (
        row.next
      ) : (
        <Trans>
          {row.previous} to {row.next}
        </Trans>
      ),
  }))

  return (
    <div className="mt-2 grid gap-2">
      <p className="text-sm text-text-primary">{changeView.headline}</p>
      <AuditSummaryRows rows={rows} />
      {changeView.notes.length > 0 ? (
        <p className="text-xs text-text-tertiary">{changeView.notes[0]}</p>
      ) : null}
    </div>
  )
}

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
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-divider-regular py-10 px-6 text-center">
      <span className="text-xs font-semibold text-text-primary">
        {hasActiveFilters ? (
          <Trans>No obligations match these filters.</Trans>
        ) : (
          <Trans>No obligations yet.</Trans>
        )}
      </span>
      <p className="max-w-105 text-xs text-text-secondary">
        {hasActiveFilters ? (
          <Trans>
            Try a different filter combination, or clear all filters to see the full queue.
          </Trans>
        ) : (
          <Trans>Import a CSV of clients to start tracking their obligations.</Trans>
        )}
      </p>
      {hasActiveFilters ? (
        <Button size="sm" className="text-xs" onClick={onClearFilters}>
          <Trans>Clear filters</Trans>
        </Button>
      ) : (
        <Button size="sm" className="text-xs" onClick={onOpenWizard} disabled={!canRunMigration}>
          <Trans>Import clients</Trans>
        </Button>
      )}
    </div>
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
