import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { parseAsStringLiteral, useQueryState } from 'nuqs'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArchiveIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleHelpIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  EyeIcon,
  LightbulbIcon,
  LinkIcon,
  MailIcon,
  MapPinIcon,
  MegaphoneIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  PlusIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  AiInsightPublic,
  AuditEventPublic,
  ClientFilingProfilesReplaceInput,
  ClientPublic,
  ClientSourceDetailsUpdateInput,
  MemberAssigneeOption,
  ObligationInstancePublic,
  ObligationRule,
} from '@duedatehq/contracts'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Field, FieldError, FieldLabel } from '@duedatehq/ui/components/ui/field'
import { Input } from '@duedatehq/ui/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import {
  TableHeaderMultiFilter,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'
import { EmptyState } from '@/components/patterns/empty-state'
import { InfoBanner } from '@/components/patterns/info-banner'
import { useAppHotkey, useKeyboardShortcutsBlocked } from '@/components/patterns/keyboard-shell'
import { PageHeader } from '@/components/patterns/page-header'
import { RowActionsMenu, type RowActionsMenuItem } from '@/components/patterns/row-actions-menu'
import { SearchInput } from '@/components/primitives/search-input'
import { getAssigneeTint } from '@/lib/assignee-tint'
import { StateBadge } from '@/components/primitives/state-badge'
import { RULE_JURISDICTION_LABELS } from '@/features/rules/rules-console-model'
import { formatDate, formatDatePretty, formatDateTimeWithTimezone } from '@/lib/utils'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { initialsFromName } from '@/lib/auth'
import { formatTaxCode } from '@/lib/tax-codes'
import { useCurrentUserName } from '@/lib/use-current-user-name'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { UpgradeCtaButton } from '@/features/billing/upgrade-cta-button'
import { CreateObligationDialog } from '@/features/obligations/CreateObligationDialog'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import { ObligationPanelDispatcher } from '@/features/obligations/ObligationPanelDispatcher'
import {
  LIFECYCLE_V2_STATUSES,
  ObligationQueueStatusControl,
  ObligationStatusReadBadge,
  useLifecycleV2StatusLabels,
  type ObligationStatus,
} from '@/features/obligations/status-control'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { ClientOpportunitiesCard } from '@/features/opportunities/client-opportunities-card'
import { useAuditActionLabels } from '@/features/audit/audit-log-labels'
import { formatAuditActionLabel } from '@/features/audit/audit-log-model'
// `SectionFrame` + `SectionLabel` imports retired 2026-05-24 with the
// switch to <TabSection>. They're still exported from
// rules-console-primitives for any rules-console caller that wants
// them.

import { ClientCycleArrows } from './ClientCycleArrows'
import { ClientTitleSwitcher } from './ClientTitleSwitcher'
import { ClientCompliancePosturePanel } from './ClientCompliancePosturePanel'
import { useClientDrawer } from './ClientDrawerProvider'
import { ClientPeekHoverCard } from './ClientPeekHoverCard'
import { FixNeedsFactsSheet } from './FixNeedsFactsSheet'
import { ClientSummaryStrip } from './ClientSummaryStrip'
import { clientDetailPath } from './client-url'

import {
  CLIENT_UNASSIGNED_OWNER_FILTER,
  getClientFilingStates,
  getClientSourceType,
  type ClientEntityType,
  type ClientFactsModel,
  type ClientPulseFilter,
  type ClientReadiness,
  type ClientReadinessStatus,
  type ClientSourceType,
} from './client-readiness'
import { writeClientCycleList } from './client-cycle'
import {
  buildClientHeaderContactItems,
  buildClientPulseMatches,
  buildClientWorkPlanSummary,
  findExtensionWithoutPaymentObligations,
  type ClientHeaderContactItem,
  type ClientObligationListSummary,
  type ClientPulseMatch,
  type ClientWorkPlanSummary,
} from './client-detail-model'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string
    cellClassName?: string
  }
}

type FilterOption = TableFilterOption

type ClientFactsWorkspaceProps = {
  clients: ClientPublic[]
  filteredClients: ClientPublic[]
  factsModel: ClientFactsModel
  // 2026-05-23: entity labels (LLC / S corp / Partnership / …) flow in
  // from the route so the workspace can render them in the new ENTITY
  // column without depending on the route module (avoids a circular
  // import — route imports workspace).
  entityLabels: Record<ClientEntityType, string>
  isLoading: boolean
  // 2026-05-26 (Yuqi /clients directory pivot brief): search wiring.
  // `searchQuery` is the current URL-backed `q` value; the workspace
  // surfaces it via the toolbar's search input. `onSearchChange` writes
  // back to the URL on every keystroke (the route debounces if needed).
  searchQuery: string
  onSearchChange: (value: string) => void
  clientFilter: readonly string[]
  entityFilter: readonly ClientEntityType[]
  stateFilter: readonly string[]
  readinessFilter: readonly ClientReadinessStatus[]
  sourceFilter: readonly ClientSourceType[]
  ownerFilter: readonly string[]
  pulseFilter: readonly ClientPulseFilter[]
  pulseMatchesByClient: ReadonlyMap<string, readonly ClientPulseMatch[]>
  obligationSummariesByClient: ReadonlyMap<string, ClientObligationListSummary>
  opportunityCountByClient: ReadonlyMap<string, number>
  onClientFilterChange: (value: string[]) => void
  onEntityFilterChange: (value: string[]) => void
  onStateFilterChange: (value: string[]) => void
  onSourceFilterChange: (value: string[]) => void
  onOwnerFilterChange: (value: string[]) => void
  onPulseFilterChange: (value: string[]) => void
  onImport: () => void
  canImport: boolean
}

const STATE_CODE_RE = /^[A-Z]{2}$/
const EMPTY_OBLIGATIONS: readonly ObligationInstancePublic[] = []

// 2026-05-26 (Yuqi macro→micro audit, Fix #6 / §3.4): /clients adopts
// the /deadlines responsive page-size pattern so the table fills the
// visible viewport instead of paginating at a fixed 25 regardless of
// monitor height. Constants mirror obligations.tsx so both surfaces
// share the same row-fit math.
// 2026-05-26 (Stripe-level Phase A / §S8): row height bumped from
// h-12 (48px) to h-14 (56px) — the "premium-feeling" Stripe rhythm
// per the critique. The +8px per row gives the dense client list
// more breathing room without changing the rendered cell content.
// Constant updated in tandem so the responsive page-size math still
// accurately measures rows-that-fit (was 49 = 48 + 1px border).
const CLIENTS_ROW_HEIGHT_PX = 57 // h-14 + 1px border
const CLIENTS_PAGE_SIZE_MIN = 8
const CLIENTS_PAGE_SIZE_MAX = 50
// Inside-card chrome subtracted from the table-card's clientHeight:
//   TableHeader (≈40) + Pagination footer (≈44) + 1px borders + buffer
const CLIENTS_INSIDE_CHROME_PX = 96

function computeClientsResponsivePageSize(containerHeight: number): number {
  const usable = Math.max(0, containerHeight - CLIENTS_INSIDE_CHROME_PX)
  const fit = Math.floor(usable / CLIENTS_ROW_HEIGHT_PX)
  return Math.max(
    CLIENTS_PAGE_SIZE_MIN,
    Math.min(CLIENTS_PAGE_SIZE_MAX, fit || CLIENTS_PAGE_SIZE_MIN),
  )
}

// Callback-ref shape so observation kicks in when the table-card
// mounts (even if it mounts AFTER the initial render — e.g. inside
// a loading/success ternary).
function useClientsResponsivePageSize(): [number, (element: HTMLElement | null) => void] {
  const [pageSize, setPageSize] = useState<number>(CLIENTS_PAGE_SIZE_MIN)
  const [element, setElement] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return () => {}
    if (!element) return () => {}
    const measure = (): void => {
      setPageSize(computeClientsResponsivePageSize(element.clientHeight))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])
  return [pageSize, setElement]
}

/**
 * `TabSection` — canonical section primitive for the client detail
 * tabs (Work / Client info / Discover / Activity).
 *
 * 2026-05-24: introduced to unify what used to be three different
 * section vocabularies on this page:
 *   - Work tab's Filing plan rolled its own h2 + subtitle inline
 *   - Client info / Discover used `DetailSection` (collapsible
 *     disclosure with chevron, summary on the right, body hidden
 *     until expanded)
 *   - Activity tab mixed `DetailSection` with one ad-hoc
 *     `SectionFrame` for the Notes block
 *
 * The Figma reference (node 109:13725) shows the Work tab's flat
 * pattern as the canonical: h2 (text-base / semibold / primary) +
 * subtitle (text-xs / tertiary) on a single baseline, optional
 * actions cluster on the right, content rendered flat directly
 * underneath without a nested card frame.
 *
 * All four tabs now use this primitive so the four-tab body reads
 * as one consistent surface, not four design dialects stitched
 * together. Content inside a section can still introduce its own
 * card chrome where the data shape calls for it (compliance
 * panel, jurisdiction form) — but the SECTION HEADER is
 * pixel-identical across all surfaces.
 */
function TabSection({
  title,
  titleAccessory,
  summary,
  actions,
  children,
}: {
  title: ReactNode
  titleAccessory?: ReactNode
  summary?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <div className="flex min-w-0 items-center gap-1">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            {titleAccessory}
          </div>
          {summary ? <span className="text-xs text-text-tertiary">{summary}</span> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

function RiskProfileSmartPriorityHelp() {
  const { t } = useLingui()
  const helpText = t`Risk profile feeds Smart Priority. Importance and recent late filings make this client's deadlines rank higher in work queues.`

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={t`Explain Risk profile`}
            title={helpText}
            className="inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-md text-text-tertiary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          />
        }
      >
        <CircleHelpIcon className="size-3.5" aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="right" align="start" className="max-w-xs whitespace-normal text-left">
        {helpText}
      </TooltipContent>
    </Tooltip>
  )
}

// `DetailSection` (collapsible disclosure) retired 2026-05-24 in
// favour of the flat <TabSection> primitive above. Sections on the
// client detail page no longer collapse — the four tabs share one
// heading style so the body reads as a single consistent surface.
// Git history has the prior implementation if a future surface
// needs a disclosure pattern again (e.g. on an admin-only screen).

/**
 * Primary filing state — the marked-primary profile if present, else
 * `client.state`, else the first filing-profile state. Returns null
 * when the client has no jurisdiction facts at all (in which case
 * readiness will surface "Needs filing state").
 */
function getPrimaryFilingState(client: ClientPublic): string | null {
  const primary = client.filingProfiles.find((profile) => profile.isPrimary)
  if (primary?.state) return primary.state
  if (client.state) return client.state
  return client.filingProfiles[0]?.state ?? null
}

/**
 * Filing states the client owes filings in *beyond* the primary
 * jurisdiction. Rendered as outline badges alongside the primary
 * state in the unified `States` column (the earlier standalone
 * "Other states" column was retired per critique L-7).
 */
function getOtherFilingStates(client: ClientPublic): string[] {
  const primary = getPrimaryFilingState(client)
  return getClientFilingStates(client).filter((state) => state !== primary)
}

/**
 * Count of unique tax-type services the practice manages for this
 * client. Sums distinct tax codes across all filing profiles — a
 * single 1065 in CA + a single 1065 in NY counts as one service
 * (same form), so the number reads as scope-of-work, not row count.
 * Differs from `openCount` (in-flight obligations) on purpose: a
 * client can have 8 services and only 2 open this week.
 */
function getClientServicesCount(client: ClientPublic): number {
  const taxTypes = new Set<string>()
  for (const profile of client.filingProfiles) {
    for (const taxType of profile.taxTypes) {
      if (taxType) taxTypes.add(taxType)
    }
  }
  return taxTypes.size
}

/**
 * Single-line urgency label for the Next-due column in the clients
 * list. Replaces the previous 3-line composite cell (date + form +
 * readiness chip) flagged as "三行不友好" in the design review.
 *
 * Vocabulary:
 *   - days < 0 → "Nd late" (destructive tone)
 *   - days = 0 → "Today"   (warning tone)
 *   - 1 ≤ days ≤ 7 → "in Nd" (warning tone)
 *   - days > 7  → prose date ("May 23") in primary text
 *
 * Mirrors the obligations queue's urgency phrasing so a CPA scanning
 * either surface reads the same signal.
 */
function NextDueRelativeLabel({ iso }: { iso: string }) {
  const dueTs = Date.parse(iso)
  if (!Number.isFinite(dueTs)) {
    return <span className="text-text-tertiary">{iso}</span>
  }
  const days = Math.ceil((dueTs - Date.now()) / 86_400_000)
  // 2026-05-26 (Yuqi /clients feedback #4 — "data can be even more
  // obvious"): bumped the relative-due label to `text-sm font-semibold`
  // (was inheriting cell defaults, ~text-xs regular). The next-due
  // date is the PRIMARY scannable data on the directory — it's the
  // single most important thing a CPA reads per row. Making it the
  // row's loudest cell value matches its importance. Destructive +
  // warning tones unchanged.
  // 2026-05-26 (cross-table element unify): copy matches /deadlines
  // DUE column — verbose "# days late" / "# days" form.
  if (days < 0) {
    return (
      <span className="whitespace-nowrap text-sm font-semibold text-text-destructive tabular-nums">
        <Plural value={Math.abs(days)} one="# day late" other="# days late" />
      </span>
    )
  }
  if (days === 0) {
    return (
      <span className="whitespace-nowrap text-sm font-semibold text-text-warning">
        <Trans>Today</Trans>
      </span>
    )
  }
  if (days <= 7) {
    return (
      <span className="whitespace-nowrap text-sm font-semibold text-text-warning tabular-nums">
        <Plural value={days} one="in # day" other="in # days" />
      </span>
    )
  }
  return (
    <span className="whitespace-nowrap text-sm font-semibold text-text-primary">
      {formatDatePretty(iso)}
    </span>
  )
}

function ClientFilingStateChips({ client }: { client: ClientPublic }) {
  const states = getClientFilingStates(client)
  if (states.length === 0) return null
  const visible = states.slice(0, 3)
  const overflow = states.length - visible.length
  // 2026-05-24 (clarify — critique P1): these used to render as
  // `Badge variant="secondary"` next to the LIVE owner pill in the
  // H1 chip cluster. Same visual treatment, but the owner pill is
  // interactive and these chips are not — that's a UI lie. First-
  // timer CPAs waste ~30s trying to click them.
  //
  // Demoted to plain monospace tokens with a hairline border. They
  // still scan as filing-state codes (font-mono + uppercase + tabular)
  // but the badge frame is gone so they read as labels, not affordances.
  // Live chips in the cluster (owner, readiness, add-state) keep their
  // badge treatment so the live-vs-dead distinction reads instantly.
  return (
    <div
      className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-4 text-text-tertiary"
      title={
        states.length === 1 ? `Filing state: ${states[0]}` : `Filing states: ${states.join(', ')}`
      }
    >
      {visible.map((state, index) => (
        <span key={state} className="inline-flex items-center gap-1">
          {index > 0 ? <span aria-hidden>·</span> : null}
          <span className="font-mono uppercase tabular-nums text-text-secondary">{state}</span>
        </span>
      ))}
      {overflow > 0 ? <span className="tabular-nums text-text-tertiary">+{overflow}</span> : null}
    </div>
  )
}

function taxClassificationLabel(value: ClientPublic['taxClassification']): string | null {
  switch (value) {
    case 'partnership':
      return 'taxed as partnership'
    case 's_corp':
      return 'taxed as S corp'
    case 'c_corp':
      return 'taxed as C corp'
    case 'disregarded_entity':
      return 'disregarded entity'
    case 'individual':
    case 'trust':
    case 'estate':
    case 'nonprofit':
    case 'foreign_reporting_company':
    case 'unknown':
    default:
      return null
  }
}

function renderClientHeaderSubLine({
  workPlan,
  entityType,
  taxClassification,
}: {
  workPlan: ClientWorkPlanSummary
  entityType: ClientPublic['entityType']
  taxClassification: ClientPublic['taxClassification']
}): ReactNode {
  // Daily-driver signal line under the client name. Tone-coded so a
  // CPA scanning the page in <1 second can spot "anything overdue?"
  // without reading prose. Order mirrors the four canonical questions
  // (what kind of client → urgency → tone).
  //
  // 2026-05-24 (distill — critique P0): dropped the "N open filings"
  // segment. The Open Filing summary tile (now at 20px after the
  // typeset pass) is the canonical surface for that number; repeating
  // it in the subtitle, the tile, AND the year-section badge gave
  // CPAs three nearly-identical counts with three different scopes —
  // they had to compute the relationship instead of just reading.
  // Subtitle now carries only the qualitative tail: classification,
  // next-due date, and the late / on-track tone marker.
  const parts: Array<{ id: string; node: ReactNode }> = []
  const taxLabel = entityType === 'llc' ? taxClassificationLabel(taxClassification) : null
  if (taxLabel) parts.push({ id: 'tax', node: <span>{taxLabel}</span> })
  if (workPlan.nextDueDate) {
    parts.push({
      id: 'due',
      node: <span>next due {formatDatePretty(workPlan.nextDueDate)}</span>,
    })
  }
  // 2026-05-24 (critique P0 — clarify): the pill used to bottom-out at
  // "All on track" whenever `overdueOpenCount` (currentDueDate-based)
  // was zero. That hid two real product states from the CPA:
  //
  //   1. Statutory date missed but no extension on the wire (the row
  //      that quietly looked fine because `currentDueDate` still equals
  //      `baseDueDate` and we were rendered before re-render)
  //   2. Extension filed but payment not yet settled — the canonical
  //      anti-pattern #1 ("extension does NOT mean payment is extended")
  //
  // Priority order, most severe first, so the CPA always sees the
  // truest negative state and "Extended" / "All on track" stop being
  // lazy fall-throughs.
  if (workPlan.statutoryLateUnextendedCount > 0) {
    parts.push({
      id: 'statutory-late',
      node: (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangleIcon className="size-3" aria-hidden />
          <span>
            {workPlan.statutoryLateUnextendedCount === 1
              ? '1 statutory late'
              : `${workPlan.statutoryLateUnextendedCount} statutory late`}
          </span>
        </Badge>
      ),
    })
  } else if (workPlan.extensionPaymentDueCount > 0) {
    parts.push({
      id: 'extension-payment-due',
      node: (
        <Badge variant="warning" className="text-xs">
          <AlertTriangleIcon className="size-3" aria-hidden />
          <span>
            {workPlan.extensionPaymentDueCount === 1
              ? 'Extension filed — payment still due'
              : `${workPlan.extensionPaymentDueCount} extensions — payments still due`}
          </span>
        </Badge>
      ),
    })
  } else if (workPlan.overdueOpenCount > 0) {
    parts.push({
      id: 'late',
      node: (
        <span className="font-medium text-text-destructive">
          {workPlan.overdueOpenCount === 1 ? '1 late' : `${workPlan.overdueOpenCount} late`}
        </span>
      ),
    })
  } else if (workPlan.extensionFiledOpenCount > 0) {
    // Informational blue, not green: a client on an extension is on a
    // different track than "All on track" — the work shifted, not
    // disappeared. Says "Extended" rather than the count because
    // the per-row state lives in the filing-plan table below.
    parts.push({
      id: 'extended',
      node: (
        <Badge variant="info" className="text-xs">
          <span>Extended</span>
        </Badge>
      ),
    })
  } else if (workPlan.openCount > 0) {
    // Positive-state chip. Stops the app from relying on "absence of
    // red" as the implicit positive — every other surface that ends
    // a daily-driver line cleanly should use this same Badge variant.
    // See critique D-3 cont. "positive status visual vocabulary".
    parts.push({
      id: 'ontrack',
      node: (
        <Badge variant="success" className="text-xs">
          <CheckCircle2Icon className="size-3" aria-hidden />
          <span>All on track</span>
        </Badge>
      ),
    })
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      {parts.map((part, index) => (
        <span key={part.id} className="inline-flex items-baseline gap-x-1.5">
          {part.node}
          {index < parts.length - 1 ? (
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
          ) : null}
        </span>
      ))}
    </span>
  )
}

/**
 * 2026-05-23: column-header SORT button. Wraps the label + a sort-
 * arrow icon in a single click target so the whole label is clickable
 * to cycle sort (asc → desc → cleared). Visually distinct from the
 * separate filter funnel icon (`tableHeaderFilterIconTrigger`) that
 * sits beside it — sort and filter are two controls, two clicks, no
 * accidental triggering.
 *
 * The arrow has three states matching TanStack's column.getIsSorted():
 *   - false (idle)  → muted up/down chevron pair (sortable affordance)
 *   - 'asc'         → solid up arrow (active ascending)
 *   - 'desc'        → solid down arrow (active descending)
 */
function ColumnSortHeader({
  label,
  sortState,
  onToggle,
  align = 'left',
  description,
}: {
  label: string
  sortState: false | 'asc' | 'desc'
  onToggle: () => void
  align?: 'left' | 'right'
  description?: string
}) {
  const sortLabel = description ? `Sort by ${label}. ${description}` : `Sort by ${label}`

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={sortLabel}
      title={sortLabel}
      data-active={sortState !== false ? true : undefined}
      className={cn(
        // 2026-05-26 (Yuqi macro→micro audit, Fix #7 / §3.3): retired
        // uppercase + tracking-wider kicker style; family canonical
        // (page-family-canonical §6) specifies sortable headers use
        // sm + normal-case + text-secondary so they read as labels,
        // not eyebrows. Matches /deadlines + /alerts table headers.
        '-mx-1 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1 text-sm font-medium whitespace-nowrap text-text-secondary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt data-[active=true]:text-text-primary',
        align === 'right' && 'justify-end',
      )}
    >
      <span className="truncate">{label}</span>
      {/* 2026-05-26 (Yuqi /clients feedback #2 — "remove the sort by
          icon"): idle (sortState=false) no longer renders the
          ArrowUpDownIcon. The header itself still functions as a
          click-to-sort button (cursor-pointer + hover bg), but the
          dual-chevron icon was visual noise on a directory where the
          user rarely re-sorts. Active states still render the up/down
          arrow so the user always sees WHICH column is sorted + in
          which direction. */}
      {sortState === 'asc' ? (
        <ArrowUpIcon className="size-3 shrink-0" aria-hidden />
      ) : sortState === 'desc' ? (
        <ArrowDownIcon className="size-3 shrink-0" aria-hidden />
      ) : null}
    </button>
  )
}

function formatJurisdictionSummary(client: ClientPublic): string {
  const stateCount = getClientFilingStates(client).length
  if (stateCount === 0) return 'Needs filing state'
  const taxTypeCount = new Set(client.filingProfiles.flatMap((profile) => profile.taxTypes)).size
  const statesLabel = stateCount === 1 ? '1 state' : `${stateCount} states`
  const taxTypesLabel =
    taxTypeCount === 0
      ? 'no tax types'
      : taxTypeCount === 1
        ? '1 tax type'
        : `${taxTypeCount} tax types`
  return `${statesLabel} · ${taxTypesLabel}`
}

function formatImportSourceSummary(client: ClientPublic): string {
  const parts = [client.externalClientId, client.sourceStatus].filter(Boolean)
  if (parts.length > 0) return parts.join(' · ')
  return getClientSourceType(client) === 'imported' ? 'Imported client details' : 'Manual client'
}

export function ClientFactsWorkspace({
  clients,
  filteredClients,
  factsModel,
  entityLabels,
  isLoading,
  searchQuery,
  onSearchChange,
  clientFilter,
  stateFilter,
  ownerFilter,
  entityFilter,
  pulseMatchesByClient,
  obligationSummariesByClient,
  opportunityCountByClient,
  onClientFilterChange,
  onEntityFilterChange,
  onStateFilterChange,
  onOwnerFilterChange,
  // 2026-05-26 (Yuqi /clients directory pivot brief): retired
  // `onPulseFilterChange` consumer (was driving the Pulse hits
  // StatTile click). Prop still typed for caller stability; will
  // be removed end-to-end in a follow-up cleanup pass when the
  // route's `handlePulseFilterChange` retires too.
  onImport,
  canImport,
}: ClientFactsWorkspaceProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const currentUserName = useCurrentUserName()
  const { openDrawer: openClientDrawer } = useClientDrawer()
  // 2026-05-26 (Stripe Phase B per-row ⋯): hoisted above the columns
  // useMemo because the rowActions column declares this in its deps
  // array. Previously declared further down (after the React Table
  // hook), but the deps eval order forces it earlier in the closure.
  const handleOpenClientDetail = useCallback(
    (clientId: string) => {
      // 2026-05-24 (useEffect audit): persist the currently-visible
      // client order to sessionStorage at navigation time so the
      // detail page can offer prev/next cycling across the same
      // filter subset.
      // 2026-05-24 (merge): adopted the `clientDetailPath()` helper
      // for the readable /clients/<slug>-<id> URL. Falls back to the
      // raw id when the client isn't in the current list.
      writeClientCycleList(filteredClients.map((client) => client.id))
      const client = clients.find((candidate) => candidate.id === clientId)
      void navigate(client ? clientDetailPath(client) : `/clients/${clientId}`)
    },
    [clients, filteredClients, navigate],
  )
  // 2026-05-25 (Yuqi /clients #8): header-filter open-state retired
  // with the move of all filter dropdowns into the ClientsFilterToolbar
  // strip above the table. Each toolbar trigger now manages its own
  // uncontrolled open state, so we no longer need to coordinate
  // mutual-exclusion at the table level.
  const clientOptions = useMemo<FilterOption[]>(
    () =>
      clients
        .map((client) => ({ value: client.id, label: client.name }))
        .toSorted((a, b) => a.label.localeCompare(b.label)),
    [clients],
  )
  const stateOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>()
    for (const client of clients) {
      for (const state of getClientFilingStates(client)) {
        counts.set(state, (counts.get(state) ?? 0) + 1)
      }
    }
    return factsModel.stateOptions.map((state) => ({
      value: state,
      label: state,
      count: counts.get(state) ?? 0,
    }))
  }, [clients, factsModel.stateOptions])
  // 2026-05-23: entity options for the new ENTITY column filter
  // dropdown. Counts how many clients sit at each entity type so the
  // dropdown shows "S corp · 7" / "LLC · 5" etc.
  const entityOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<ClientEntityType, number>()
    for (const client of clients) {
      counts.set(client.entityType, (counts.get(client.entityType) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: entityLabels[value], count }))
      .toSorted((a, b) => a.label.localeCompare(b.label))
  }, [clients, entityLabels])
  const ownerOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>()
    const labels = new Map<string, string>()
    for (const client of clients) {
      const value = client.assigneeName ?? CLIENT_UNASSIGNED_OWNER_FILTER
      counts.set(value, (counts.get(value) ?? 0) + 1)
      labels.set(value, client.assigneeName ?? t`Unassigned`)
    }
    return [...counts.entries()]
      .map(([value, count]) => ({
        value,
        label: labels.get(value) ?? value,
        count,
      }))
      .toSorted((a, b) => {
        if (a.value === CLIENT_UNASSIGNED_OWNER_FILTER) return -1
        if (b.value === CLIENT_UNASSIGNED_OWNER_FILTER) return 1
        return a.label.localeCompare(b.label)
      })
  }, [clients, t])
  // Column order per the 2026-05-21 product review (with L-7
  // "Other states" merged into the unified States column 2026-05-22):
  //
  //   Client · States (primary + others inline) ·
  //   Next due (date + form + readiness) ·
  //   # Services · # Open · Owner (avatar) · Opportunities
  //
  // Source column was dropped — provenance trivia, not a reason to
  // pick a row. The filter param + filter pipeline are still wired
  // for deep links but no longer surface as a column header.
  // Readiness chip moves from a standalone column into the Next due
  // composite cell — see ClientsActionStrip's Needs facts banner for
  // the actionable filter entry.
  const columns = useMemo<ColumnDef<ClientPublic>[]>(
    () => [
      {
        accessorKey: 'name',
        // 2026-05-25 (Yuqi /clients #8): filter funnel removed from
        // the column header — was an icon-only TableHeaderMultiFilter
        // sitting on the right edge of every filterable column. All
        // four filters (Client / States / Entity / Owner) now live in
        // a single ToolbarFilters row above the table, matching the
        // Alerts page rhythm. Column header keeps only the sort
        // arrow.
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`Client`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        cell: ({ row }) => {
          const matches = pulseMatchesByClient.get(row.original.id)
          const readiness = factsModel.readinessById.get(row.original.id)
          return (
            <div className="flex min-w-0 items-center gap-2">
              {/* L-6 (2026-05-22): dropped the entity-type sub-line that
                  lived under the client name. Entity is already
                  filterable via the column header dropdown + visible on
                  the detail page header chip; surfacing it under every
                  list row was redundant noise.
                  L-5 (2026-05-23): readiness chip moves into this row so
                  the page-level scan sees identity + setup state
                  together. The Next-due cell then carries ONLY urgency
                  (a single tone-coded line). */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {/* 2026-05-26 (Yuqi follow-up — "client name is so
                    big"): bumped back down from text-lg → text-base.
                    The text-lg bump landed earlier in the day and
                    immediately read as too loud on the list grid.
                    text-base still scales above the other body cells
                    (which inherit text-sm) so it reads as primary
                    identity without dominating the row.
                    2026-05-26 (Yuqi cross-table unify — "Deadlines
                    text-sm · Clients text-base · Rules library text-sm.
                    maybe have clients text-base size as regular
                    weight"): dropped `font-medium`. The medium weight
                    was making text-base feel heavy; regular weight at
                    text-base reads as primary identity (larger than
                    text-sm meta) without shouting. Same treatment now
                    applied to Deadlines + Rules library so all three
                    workbench tables share one canonical title scale. */}
                <span className="truncate text-base text-text-primary group-hover:underline">
                  {row.original.name}
                </span>
                {readiness?.status === 'needs_facts' ? (
                  <ClientReadinessBadge readiness={readiness} compact />
                ) : null}
                {matches && matches.length > 0 ? <ClientRadarBadge matches={matches} /> : null}
              </div>
              {/* Hover-revealed peek affordance: row click still goes to
                  the full page; this opens the read-only drawer for a
                  fast "is this the right client?" glance. ⌘-click on
                  the row is also wired below for a power-user shortcut. */}
              <ClientPeekHoverCard clientId={row.original.id}>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={t`Peek ${row.original.name} details`}
                  title={t`Peek details (without leaving the list)`}
                  className="ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-md text-text-tertiary opacity-0 outline-none transition-opacity group-hover:opacity-100 hover:bg-state-base-hover hover:text-text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                >
                  <EyeIcon className="size-4" aria-hidden />
                </button>
              </ClientPeekHoverCard>
            </div>
          )
        },
        meta: {
          headerClassName: 'w-[240px]',
          cellClassName: 'w-[240px]',
        },
      },
      {
        accessorKey: 'state',
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`States`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        // Render primary state and any additional filing states inline:
        // primary state = filled secondary badge, additional states =
        // outline badges. Replaces the earlier `otherStates` column —
        // primary + others are the same scan signal ("which states does
        // this client file in?") and splitting them across two columns
        // duplicated header space + forced the user's eye to track both.
        // See `docs/Design/clients-list-and-detail-critique-2026-05-22.md`
        // L-7 for the rationale.
        // 2026-05-25 (Yuqi /clients fifth pass #5): state cell now
        // matches the Pulse drawer's jurisdiction pill exactly —
        // a single rounded-full pill containing the StateBadge SVG
        // + 2-letter code + full state name ("CA · California").
        // Primary state gets the full pill; additional states stay
        // as bare StateBadge motifs so the row width stays bounded
        // even with multi-state filings. The +N overflow chip on
        // the tail mirrors the previous behaviour.
        cell: ({ row }) => {
          const primary = getPrimaryFilingState(row.original)
          if (!primary) {
            return <EmptyCellMark label={t`No filing state on file`} />
          }
          const primaryFull = RULE_JURISDICTION_LABELS[primary] ?? null
          const others = getOtherFilingStates(row.original)
          const visibleOthers = others.slice(0, 2)
          const overflow = others.length - visibleOthers.length
          // 2026-05-26 (Yuqi /clients feedback #5 — "is this the right
          // badge? MAMassachusetts"): the previous treatment glued
          // the 2-letter code + full state name with NO separator
          // — rendered as "MAMassachusetts". The redundancy was also
          // unnecessary because the leading SVG StateBadge icon
          // already encodes the state visually. Simplified to just
          // `[icon] [Full state name]` — readable, no glue, no
          // redundancy. The 2-letter code only appears on the
          // overflow / other-states chips that need a compact form.
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-divider-regular bg-background-default pl-0.5 pr-2 text-xs">
                <StateBadge code={primary} size="xs" aria-hidden />
                <span className="font-medium text-text-primary">{primaryFull ?? primary}</span>
              </span>
              {visibleOthers.map((state) => (
                <StateBadge key={state} code={state} size="xs" title={state} />
              ))}
              {overflow > 0 ? (
                <span
                  className="text-caption tabular-nums text-text-tertiary"
                  title={others.slice(2).join(', ')}
                >
                  +{overflow}
                </span>
              ) : null}
            </div>
          )
        },
        meta: {
          // 2026-05-25 (Yuqi /clients fifth pass #5): widened
          // 160px → 220px to fit the primary-state full pill
          // ("CA · California") at default font-size without
          // truncating. Other-state SVG-only badges stay compact
          // on the tail.
          headerClassName: 'w-[220px]',
          cellClassName: 'w-[220px]',
        },
      },
      {
        // 2026-05-23: ENTITY column returns as its own column per the
        // design mock. Was previously a sub-line under the client name
        // (L-6 retired it), then a header-only filter with no body
        // rendering. Now it gets a single chip per row showing the
        // entity type (LLC / S corp / Partnership / …) so the CPA can
        // scan "what kind of return am I looking at?" without opening
        // the client.
        accessorKey: 'entityType',
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`Entity`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        // 2026-05-25 (Yuqi /clients #6): entity badge unified with
        // the detail-page header chip (line ~1893). Was `rounded-sm
        // font-normal tabular-nums`, now matches detail's `text-xs`
        // shape so the same identity fact reads the same way on both
        // surfaces. tabular-nums dropped — entity labels aren't
        // numeric ("S corp", "LLC"), the tabular-nums override was a
        // copy-paste artifact from the dot column next door.
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs font-normal">
            {entityLabels[row.original.entityType]}
          </Badge>
        ),
        meta: {
          headerClassName: 'w-[110px]',
          cellClassName: 'w-[110px]',
        },
      },
      {
        // 2026-05-23 design pass: NEXT DUE cell becomes a 2-line composite
        // and absorbs the standalone STATUS column.
        //   Line 1: relative urgency ("In 2 days" / "8d late") with the
        //           same tone semantics as before.
        //   Line 2: ISO calendar date (YYYY-MM-DD) so the CPA can read
        //           the absolute deadline without hovering.
        //   Inline: status pill next to the date — answers "Xd late, but
        //           why?" without a separate column.
        // The standalone STATUS column (added 2026-05-23, retired same
        // day) is gone; the inline pill is its replacement.
        id: 'nextDue',
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`Next due`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        // Custom sortingFn — the value comes from the summary map
        // (not row.original), so the default accessor-based sort
        // doesn't apply. Rows with no nextDueDate sort last regardless
        // of direction (clients with nothing open sit at the bottom of
        // an asc sort and at the top of a desc sort would feel wrong).
        sortingFn: (rowA, rowB) => {
          const a = obligationSummariesByClient.get(rowA.original.id)?.nextDueDate
          const b = obligationSummariesByClient.get(rowB.original.id)?.nextDueDate
          if (!a && !b) return 0
          if (!a) return 1
          if (!b) return -1
          return a.localeCompare(b)
        },
        cell: ({ row }) => {
          const summary = obligationSummariesByClient.get(row.original.id)
          if (!summary?.nextDueDate) {
            return <EmptyCellMark label={t`No upcoming deadline`} />
          }
          return (
            <div className="flex min-w-0 flex-col gap-0.5">
              <NextDueRelativeLabel iso={summary.nextDueDate} />
              <div className="flex flex-wrap items-center gap-1.5">
                {/* 2026-05-26 (Yuqi cross-table audit): exact-date
                    secondary line bumped `text-text-tertiary`
                    → `text-text-secondary` to match the /deadlines
                    queue row treatment. One tone for the same job.
                    2026-05-26 (Yuqi cross-table element unify): dropped
                    `font-mono` + raw ISO. Same reasoning as the drawer
                    DeadlineTile fix — mono numbers read as "code/
                    identifier-y" when these are just dates. Now uses
                    `formatDate()` for the same prose date format
                    /deadlines uses (e.g. "May 8") + `tabular-nums` for
                    column alignment without the mono treatment. */}
                <span className="text-caption tabular-nums text-text-secondary">
                  {formatDate(summary.nextDueDate)}
                </span>
                {summary.nextDueStatus ? (
                  // 2026-05-26 (Yuqi cross-table element unify): status
                  // pill renders at the canonical ObligationStatusReadBadge
                  // default size. Previously this site shrank it to
                  // `px-1.5 py-0 text-caption-xs font-normal` — same
                  // semantic chip as /deadlines, but visibly smaller
                  // than the queue's status pill. One status → one
                  // pill size across the product.
                  <ObligationStatusReadBadge status={summary.nextDueStatus} />
                ) : null}
              </div>
            </div>
          )
        },
        meta: {
          headerClassName: 'w-[200px]',
          cellClassName: 'w-[200px]',
        },
      },
      // 2026-05-26 (Yuqi follow-up — "bring back services"): the
      // brief had retired this column; Yuqi reversed that call.
      // Column restored to its prior shape — hidden by default
      // (via columnVisibility below), accessible via the column-
      // toggle UI for the CPA who actively reviews scope-of-work.
      {
        id: 'servicesCount',
        header: () => <span>{t`Services`}</span>,
        cell: ({ row }) => {
          const count = getClientServicesCount(row.original)
          if (count === 0) {
            return <EmptyCellMark label={t`No tax-type services tracked`} />
          }
          // Plain count — sum of unique tax types across filing
          // profiles. No deep-link here because the destination is
          // ambiguous (rules library? filing plan tab?); the row's
          // own click handler opens the client detail, which is the
          // right place to see services in context.
          // 2026-05-26 (Yuqi /clients feedback #3 — "left align"):
          // dropped `block text-right` + `font-mono`. Numeric cells
          // are now left-aligned + sans-serif tabular-nums.
          return (
            <span
              className="tabular-nums text-text-primary"
              title={t`${count} tax-type services managed for this client`}
            >
              {count}
            </span>
          )
        },
        meta: {
          // 2026-05-26 (Yuqi /clients feedback #3 — "left align"):
          // numeric columns left-aligned to match /deadlines + /rules/
          // library family. Right-aligned numbers read as a balance
          // sheet; left-aligned matches the rest of the workbench
          // tables and the canonical TableCell default.
          headerClassName: 'w-[90px]',
          cellClassName: 'w-[90px]',
        },
      },
      {
        id: 'openObligations',
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`Open`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        sortingFn: (rowA, rowB) => {
          const a = obligationSummariesByClient.get(rowA.original.id)?.openCount ?? 0
          const b = obligationSummariesByClient.get(rowB.original.id)?.openCount ?? 0
          return a - b
        },
        cell: ({ row }) => {
          const summary = obligationSummariesByClient.get(row.original.id)
          const count = summary?.openCount ?? 0
          if (count === 0) {
            // Open=0 renders as em-dash — Stripe-style quiet treatment
            // that mutes the "nothing happening" row so the eye glides
            // past it to clients who actually have work pending.
            return <EmptyCellMark label={t`No open deadlines`} />
          }
          // Count becomes a deep link into the queue pre-filtered to
          // this client. 2026-05-26 (Yuqi feedback #3): dropped
          // `block text-right` — left-aligned numeric matches the
          // table family.
          return (
            <Link
              to={`/deadlines?client=${row.original.id}`}
              onClick={(event) => event.stopPropagation()}
              className="rounded-sm tabular-nums text-text-primary outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              aria-label={t`View ${count} open deadlines for this client`}
            >
              {count}
            </Link>
          )
        },
        meta: {
          // 2026-05-26 (Yuqi /clients feedback #3 — "left align"):
          // numeric columns left-aligned to match the rest of the
          // workbench tables.
          headerClassName: 'w-[80px]',
          cellClassName: 'w-[80px]',
        },
      },
      {
        // 2026-05-23: DONE column added per design mock. Counts
        // obligations whose status is done/completed (terminal states).
        // Built from the widened obligations query that now includes
        // those statuses alongside the open ones — see route
        // CLIENTS_LIST_OBLIGATION_STATUSES. Plain count, no deep link
        // (we don't have a routed view for closed obligations yet; the
        // client detail's Activity tab is the right destination when
        // we add that link).
        // 2026-05-26 (browser comment): renamed `Filed YTD` →
        // `Filed` because this summary is status-based, not a true
        // year-to-date audit timestamp filter. It counts rows already
        // in the user-facing Filed or Completed terminal states.
        id: 'doneObligations',
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`Filed`}
            description={t`Counts this client's deadlines that are already Filed or Completed.`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        sortingFn: (rowA, rowB) => {
          const a = obligationSummariesByClient.get(rowA.original.id)?.doneCount ?? 0
          const b = obligationSummariesByClient.get(rowB.original.id)?.doneCount ?? 0
          return a - b
        },
        cell: ({ row }) => {
          const summary = obligationSummariesByClient.get(row.original.id)
          const count = summary?.doneCount ?? 0
          const title =
            count === 1
              ? t`1 filed or completed deadline for this client`
              : t`${count} filed or completed deadlines for this client`
          if (count === 0) {
            // 2026-05-26 (merge with main): keep left-aligned (our
            // Yuqi feedback #3) but adopt main's `title` const above
            // for the singular/plural tooltip copy.
            return (
              <span className="tabular-nums text-text-tertiary" title={title}>
                0
              </span>
            )
          }
          // 2026-05-26 (Yuqi feedback #3): left-aligned numeric matches
          // the table family.
          return (
            <span className="tabular-nums text-text-secondary" title={title}>
              {count}
            </span>
          )
        },
        meta: {
          // 2026-05-26 (Yuqi /clients feedback #3 — "left align"):
          // numeric columns left-aligned to match the rest of the
          // workbench tables.
          headerClassName: 'w-[80px]',
          cellClassName: 'w-[80px]',
        },
      },
      {
        accessorKey: 'assigneeName',
        header: () => (
          // 2026-05-26 (Yuqi macro→micro audit, Fix #7 / §3.3): retired
          // the uppercase kicker on this header cell; canonical table
          // headers are sm-medium normal-case (page-family-canonical
          // §6). Now matches the sibling ColumnSortHeader treatment.
          <span className="text-sm font-medium text-text-secondary">
            <Trans>Owner</Trans>
          </span>
        ),
        cell: ({ row }) => (
          <ClientAssigneeAvatar
            name={row.original.assigneeName}
            currentUserName={currentUserName}
          />
        ),
        meta: {
          headerClassName: 'w-[80px]',
          cellClassName: 'w-[80px]',
        },
      },
      {
        // 2026-05-23: abbreviated header from "Opportunities" → "Opp."
        // per design mock. Full label preserved in the cell's tooltip
        // (via ClientOpportunityCountBadge) and the column-toggle UI.
        // Tighter header frees room for the new ENTITY + DONE columns
        // without overflowing the 1100px page cap.
        id: 'opportunities',
        header: t`Opp.`,
        cell: ({ row }) => {
          const count = opportunityCountByClient.get(row.original.id) ?? 0
          if (count === 0) {
            return <EmptyCellMark label={t`No opportunities tracked`} />
          }
          return <ClientOpportunityCountBadge count={count} />
        },
        meta: {
          headerClassName: 'w-[80px]',
          cellClassName: 'w-[80px]',
        },
      },
      {
        // 2026-05-26 (Stripe Phase B — per-row ⋯): canonical row-action
        // menu lives at the trailing edge of every row, mirroring how
        // Stripe's Transactions table exposes per-row affordances.
        // Hidden until row-hover so the table reads clean at rest;
        // becomes visible (and tab-focusable) the moment the user
        // gestures at the row. Stops propagation to the row's
        // open-detail click handler so the ⋯ surface is its own
        // unambiguous interaction.
        id: 'rowActions',
        header: () => <span className="sr-only">{t`Row actions`}</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const client = row.original
          const detailPath = clientDetailPath(client)
          const items: RowActionsMenuItem[] = [
            {
              label: t`Open detail`,
              icon: ExternalLinkIcon,
              onSelect: () => handleOpenClientDetail(client.id),
            },
            {
              label: t`Quick peek`,
              icon: EyeIcon,
              onSelect: () => openClientDrawer(client.id),
            },
            {
              label: t`Copy link`,
              icon: LinkIcon,
              onSelect: () => {
                if (typeof window === 'undefined') return
                try {
                  const url = `${window.location.origin}${detailPath}`
                  void window.navigator.clipboard?.writeText(url)
                } catch {
                  // Clipboard can throw in sandboxed iframes. Silent
                  // fail is acceptable here — the action is non-critical
                  // and the user can fall back to the address bar.
                }
              },
            },
          ]
          return <RowActionsMenu label={t`Actions for ${client.name}`} items={items} />
        },
        meta: {
          headerClassName: 'w-10',
          cellClassName: 'w-10 text-right',
        },
      },
    ],
    [
      currentUserName,
      entityLabels,
      factsModel.readinessById,
      handleOpenClientDetail,
      obligationSummariesByClient,
      openClientDrawer,
      opportunityCountByClient,
      pulseMatchesByClient,
      t,
    ],
  )

  // 2026-05-26 (Yuqi /clients directory pivot brief): the local
  // `atRiskActive`/`waitingActive` state + the `visibleClients`
  // narrowing memo were driven by the StatTile strip toggle. The
  // strip retired (triage signals belong on /today + /deadlines);
  // the local narrowing it powered also retires. The table now
  // consumes `filteredClients` directly — URL-backed filters
  // (states / entity / owner / search) are the only narrowing
  // controls on /clients.

  // 2026-05-23: column sort state for the new sort-arrow indicators
  // (CLIENT / STATES / ENTITY / NEXT DUE / OPEN / FILED). Default sort
  // is unset so rows render in the API's `due_asc` order — clicking
  // a header opts in. Stored locally because sort feels transient (a
  // "show me by ___" gesture) rather than something to deep-link.
  const [sorting, setSorting] = useState<SortingState>([])
  // 2026-05-26 (Yuqi macro→micro audit, Fix #6 / §3.4): responsive
  // page-size — the table-card observes its own clientHeight via
  // ResizeObserver, then `table.setPageSize` consumes the result on
  // every change so the page-count UI stays accurate as the viewport
  // changes. Mirrors the /deadlines hook + setter pair.
  const [responsivePageSize, setTableCardElement] = useClientsResponsivePageSize()
  const table = useReactTable({
    data: filteredClients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (client) => client.id,
    // Lower-frequency columns start hidden and stay available through
    // the column-toggle UI. The default directory view should stay
    // focused on find-and-open plus live work state.
    initialState: {
      columnVisibility: {
        // Browser follow-up: this is a useful historical count, but
        // not a default directory scan dimension. Keep it available
        // for CPAs who opt into filed/completed volume review.
        doneObligations: false,
        // 2026-05-26 (Yuqi /clients directory pivot brief): `Opp.`
        // demoted to hidden-by-default. The directory's primary job
        // is find-and-open; an opportunity count earns its visual
        // weight only when surfaced via the column-toggle UI for
        // the rare CPA who actively triages opportunities here.
        opportunities: false,
        // `servicesCount` stays hidden by default per its prior
        // behavior — the cell renders "—" for typical firms that
        // haven't fully populated filing profiles, but the column
        // is restored (Yuqi follow-up — "bring back services") so
        // it's available via the column-toggle UI for any CPA who
        // tracks scope-of-work here.
        servicesCount: false,
      },
      pagination: {
        // 2026-05-26: pageSize seeded from the responsive-page-size
        // hook's floor (CLIENTS_PAGE_SIZE_MIN). The hook overrides on
        // mount via useEffect below once the table-card measures its
        // own clientHeight.
        pageIndex: 0,
        pageSize: CLIENTS_PAGE_SIZE_MIN,
      },
    },
  })
  // Sync the responsive measurement into the table's pagination
  // state. table.setPageSize is the official React-Table API for
  // this; doing it from an effect keeps the table source-of-truth
  // for state while letting the hook own measurement.
  useEffect(() => {
    table.setPageSize(responsivePageSize)
  }, [responsivePageSize, table])

  // L-2: Fix-now banner now opens an inline batch sheet
  // (FixNeedsFactsSheet) instead of narrowing the table to a
  // needs-facts filter. Filter-then-drill was the previous behavior —
  // CPA still had to open every row, drill, edit, save, back. Batch
  // sheet skips that loop.
  const [fixNeedsFactsOpen, setFixNeedsFactsOpen] = useState(false)

  return (
    <>
      <ClientsActionStrip
        isLoading={isLoading}
        needsFactsCount={factsModel.summary.needsFacts}
        onFixNeedsFacts={() => setFixNeedsFactsOpen(true)}
      />

      <FixNeedsFactsSheet
        open={fixNeedsFactsOpen}
        onOpenChange={setFixNeedsFactsOpen}
        clients={clients}
      />

      {/* 2026-05-25 (Yuqi /clients #8): toolbar filter row above the
          table — same rhythm as /rules/pulse, where the filter
          dropdowns live in their own row above the alert list. Was
          previously inline funnel icons on each column header (one
          per filter), which read as random table chrome rather than
          a deliberate filter band. The toolbar version surfaces all
          four filters in one scannable strip; column headers keep
          only the sort arrow. A Reset button on the right clears
          every filter at once. */}
      <ClientsFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        clientOptions={clientOptions}
        clientFilter={clientFilter}
        onClientFilterChange={onClientFilterChange}
        stateOptions={stateOptions}
        stateFilter={stateFilter}
        onStateFilterChange={onStateFilterChange}
        entityOptions={entityOptions}
        entityFilter={entityFilter}
        onEntityFilterChange={onEntityFilterChange}
        ownerOptions={ownerOptions}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={onOwnerFilterChange}
      />

      {/* 2026-05-26 (Yuqi macro→micro audit, Fix #6 / §3.4): table
          re-framed in the canonical bordered card with `flex-1
          min-h-0` rows-area + pinned pagination footer. Mirrors
          /deadlines so /clients renders identically. Outer container
          in routes/clients.tsx is height-constrained at xl so this
          flex-1 has somewhere to grow into.

          On small viewports / when there are zero clients, the empty
          state replaces the card-frame entirely so the dashed
          ClientTableEmptyRow doesn't sit inside a doubly-bordered
          shell. */}
      {clients.length === 0 && !isLoading ? (
        <EmptyState
          icon={UsersRoundIcon}
          title={<Trans>No clients yet</Trans>}
          description={<Trans>Import a CSV or create the first manual client record.</Trans>}
          cta={
            <Button size="sm" onClick={onImport} disabled={!canImport}>
              <Trans>Import clients</Trans>
            </Button>
          }
        />
      ) : (
        // 2026-05-26 (Yuqi cross-table chrome unify): canonical
        // workbench-table card frame. Same recipe as /deadlines +
        // /rules/library — `rounded-md border border-divider-subtle
        // overflow-hidden bg-background-default/50`. The inner div
        // is just for the flex split between the Table block and
        // the Pagination footer; the rounded card frame lives here
        // on the outer wrapper so it spans both.
        <div
          ref={setTableCardElement}
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-divider-subtle"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {isLoading ? (
              <ClientTableSkeleton />
            ) : (
              // 2026-05-26 (Yuqi cross-page audit — align /clients to
              // the canonical workbench-table chrome shared with
              // /rules/library + /deadlines):
              //   - Card chrome (rounded-md + border + bg) moved DOWN
              //     to `data-slot="table-container"` via Tailwind
              //     arbitrary-selector chain. Eliminates the nested-
              //     wrapper layer mismatch that caused rounded-corner
              //     slivers when the thead had a different bg.
              //   - TableHeader override → `!bg-background-default-dimmed`
              //     to match the same dimmed gray Deadlines + Rule
              //     library use. The primitive default
              //     (`bg-background-subtle`) reads lighter and broke
              //     the family.
              <Table
                // 2026-05-26 (Yuqi cross-table chrome unify): the
                // table-container chrome overrides (rounded-md +
                // border) moved UP to the outer card wrapper, where
                // they wrap Table + Pagination together as one
                // cohesive rounded card. Only `table-fixed` stays
                // here as a table-layout concern.
                className="table-fixed"
              >
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={header.column.columnDef.meta?.headerClassName}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                {/* 2026-05-25 (GitHub-density pass): row padding py-3 → py-2.
                    /clients is a long list — saves ~8px per row, ~136px
                    per viewport at 17 rows. Multi-line names still get
                    room via the table's line-height; cells visibly tighter
                    without losing legibility. */}
                <TableBody className="[&_tr]:border-b-0 [&_td]:py-2">
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        aria-label={t`Open client detail for ${row.original.name}`}
                        className="group/row h-14 cursor-pointer outline-none hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset"
                        onClick={(event) => {
                          // ⌘-click (macOS) / Ctrl-click (Win/Linux) opens
                          // the read-only drawer for a quick glance without
                          // leaving the list — power-user shortcut that
                          // mirrors browsers' "open in new tab" muscle
                          // memory. Plain click commits to the full page.
                          if (event.metaKey || event.ctrlKey) {
                            event.preventDefault()
                            openClientDrawer(row.original.id)
                            return
                          }
                          handleOpenClientDetail(row.original.id)
                        }}
                        onKeyDown={(event) =>
                          handleClientRowKeyDown(event, row.original.id, handleOpenClientDetail)
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cell.column.columnDef.meta?.cellClassName}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <ClientTableEmptyRow colSpan={table.getAllLeafColumns().length} />
                  )}
                </TableBody>
              </Table>
            )}
          </div>
          {/* Pagination footer inside the card frame, separated by a
              top border. Always rendered when there's >1 page; the
              flex-shrink-0 keeps it pinned at the bottom of the card
              while the rows-area scrolls.
              2026-05-26 (Yuqi feedback — "polish everything in
              table-container"): aligned padding to canonical (§6
              `--space-pagination-y` = py-6, `--space-cell-x` = px-2)
              so /clients matches /deadlines exactly. Was `px-3 py-2`
              (slim toolbar feel); now `px-2 py-6` (deliberate card
              footer with breathing room). */}
          {table.getPageCount() > 1 ? (
            <div className="flex shrink-0 items-center justify-between border-t border-divider-subtle bg-background-default px-2 py-6 text-xs text-text-tertiary">
              <span>
                <Plural
                  value={table.getFilteredRowModel().rows.length}
                  one="# client"
                  other="# clients"
                />
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t`Previous page`}
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  <ChevronLeftIcon className="size-4" aria-hidden />
                </Button>
                <span className="px-2 tabular-nums">
                  <Trans>
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </Trans>
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t`Next page`}
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  <ChevronRightIcon className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  )
}

function handleClientRowKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  clientId: string,
  onOpenDetail: (clientId: string) => void,
) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  onOpenDetail(clientId)
}

/**
 * 2026-05-25 (Yuqi /clients #8): toolbar filter row above the
 * /clients table. Lifts the four column-header funnel filters
 * (Client / States / Entity / Owner) into one scannable strip,
 * matching the /rules/pulse rhythm. Each filter is a toolbar-
 * trigger TableHeaderMultiFilter (wide outline button with the
 * label inline + a count chip when active). Reset on the right
 * clears every filter at once.
 */
function ClientsFilterToolbar({
  searchQuery,
  onSearchChange,
  clientOptions,
  clientFilter,
  onClientFilterChange,
  stateOptions,
  stateFilter,
  onStateFilterChange,
  entityOptions,
  entityFilter,
  onEntityFilterChange,
  ownerOptions,
  ownerFilter,
  onOwnerFilterChange,
}: {
  searchQuery: string
  onSearchChange: (next: string) => void
  clientOptions: TableFilterOption[]
  clientFilter: readonly string[]
  onClientFilterChange: (next: string[]) => void
  stateOptions: TableFilterOption[]
  stateFilter: readonly string[]
  onStateFilterChange: (next: string[]) => void
  entityOptions: TableFilterOption[]
  entityFilter: readonly string[]
  onEntityFilterChange: (next: string[]) => void
  ownerOptions: TableFilterOption[]
  ownerFilter: readonly string[]
  onOwnerFilterChange: (next: string[]) => void
}) {
  const { t } = useLingui()
  const filtersActive =
    searchQuery.length > 0 ||
    clientFilter.length > 0 ||
    stateFilter.length > 0 ||
    entityFilter.length > 0 ||
    ownerFilter.length > 0

  // 2026-05-26 (Yuqi cross-table drift #5 — "fix search affordances"):
  // /clients now uses the canonical collapsible-search pattern shared
  // with /deadlines (`ObligationQueueSearchControl`) and /rules/library
  // (`RuleSearchControl`). Ghost-icon at rest, expands inline into the
  // canonical `SearchInput` on click OR on `/` hotkey. The `useEffect`
  // window-keydown wiring is gone — `useAppHotkey` (registered inside
  // `ClientsSearchControl`) drives the global `/` shortcut + surfaces
  // it in the keyboard-help overlay.
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  // 2026-05-26 (Yuqi /clients feedback #1 — "search at the right
  // end"): toolbar layout split into two clusters separated by
  // `flex-1` spacer.
  //   • LEFT: filter dropdowns (Client / States / Entity / Owner) +
  //     Reset link — primary "narrow the directory" controls
  //   • RIGHT: collapsible search icon — moved here from the left to
  //     match the canonical "filters on the left, search on the right"
  //     reading order. The icon stays ghost-only at rest; expands
  //     into the input on click or `/` hotkey.
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TableHeaderMultiFilter
        trigger="toolbar"
        label={t`Client`}
        options={clientOptions}
        selected={clientFilter}
        emptyLabel={t`No clients`}
        searchable
        searchPlaceholder={t`Search clients`}
        onSelectedChange={onClientFilterChange}
      />
      <TableHeaderMultiFilter
        trigger="toolbar"
        label={t`States`}
        options={stateOptions}
        selected={stateFilter}
        emptyLabel={t`No states`}
        searchable
        searchPlaceholder={t`Search states`}
        onSelectedChange={onStateFilterChange}
      />
      <TableHeaderMultiFilter
        trigger="toolbar"
        label={t`Entity`}
        options={entityOptions}
        selected={entityFilter}
        emptyLabel={t`No entities`}
        onSelectedChange={onEntityFilterChange}
      />
      <TableHeaderMultiFilter
        trigger="toolbar"
        label={t`Owner`}
        options={ownerOptions}
        selected={ownerFilter}
        emptyLabel={t`No owners`}
        searchable
        searchPlaceholder={t`Search owners`}
        onSelectedChange={onOwnerFilterChange}
      />
      <Button
        variant="ghost"
        size="sm"
        disabled={!filtersActive}
        onClick={() => {
          // 2026-05-26 (Yuqi /clients directory pivot brief): Reset
          // clears search alongside the structural filters so the
          // CPA returns to the full directory in one click.
          onSearchChange('')
          onClientFilterChange([])
          onStateFilterChange([])
          onEntityFilterChange([])
          onOwnerFilterChange([])
        }}
      >
        <Trans>Reset</Trans>
      </Button>
      {/* Spacer pushes the search affordance to the right edge. */}
      <div className="ml-auto">
        <ClientsSearchControl
          inputRef={searchInputRef}
          value={searchQuery}
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onChange={onSearchChange}
        />
      </div>
    </div>
  )
}

// 2026-05-26 (Yuqi cross-table drift #5 — "fix search affordances"):
// collapsible search control for `/clients`. Renders as a ghost icon
// button at rest; expands inline into the canonical `SearchInput` on
// click or `/` hotkey. Open state is lifted to the parent so the `/`
// hotkey can expand → focus in one gesture. Mirrors /deadlines
// `ObligationQueueSearchControl` and /rules/library `RuleSearchControl`
// — three surfaces, one pattern.
function ClientsSearchControl({
  inputRef,
  value,
  open,
  onOpenChange,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  value: string
  open: boolean
  onOpenChange: (next: boolean) => void
  onChange: (next: string) => void
}) {
  const { t } = useLingui()
  // Stay open while a query is present — collapsing would hide
  // active filter state from the user.
  const isOpen = open || value.length > 0
  // `/` hotkey expands the collapsed control AND focuses the input
  // in one gesture. SearchInput's own `hotkey` prop can't drive this
  // path because when collapsed the input isn't mounted yet.
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  useAppHotkey(
    '/',
    () => {
      onOpenChange(true)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    },
    {
      enabled: !shortcutsBlocked,
      meta: {
        id: 'clients.focus-search',
        name: 'Filter clients',
        description: 'Focus the /clients filter input.',
        category: 'practice',
        scope: 'route',
      },
    },
  )
  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t`Filter clients`}
        title={t`Filter clients  ·  press / to focus`}
        onClick={() => {
          onOpenChange(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        className="shrink-0"
      >
        <SearchIcon className="size-4" aria-hidden />
      </Button>
    )
  }
  return (
    <div className="relative w-full md:w-56 md:flex-none">
      <SearchInput
        ref={inputRef}
        value={value}
        onChange={onChange}
        placeholder={t`Search by name or EIN`}
        ariaLabel={t`Search clients`}
        onFocus={() => onOpenChange(true)}
        onBlur={() => {
          if (value.length === 0) onOpenChange(false)
        }}
      />
    </div>
  )
}

/**
 * Top-of-page action strip for `/clients`. Replaces the older
 * four-tile configuration read-out ("Ready for rules · Needs facts ·
 * Imported · States covered") with signals that drive a same-day
 * action.
 *
 * See docs/Design/clients-list-summary-strip-redesign.md for the
 * design rationale. The strip renders nothing when every signal is
 * zero — quiet is the reward.
 *
 * Tiles render only when their count is > 0:
 *   - **At risk** — clients with ≥1 overdue obligation (destructive
 *     tone). Click -> `/deadlines?status=blocked` so the CPA lands
 *     on the actionable queue, not a filtered client list.
 *   - **Waiting on client** — clients with ≥1 `waiting_on_client`
 *     obligation (warning tone). Click -> `/deadlines?status=waiting_on_client`.
 *   - **Pulse hits** — clients matched by a recent Pulse alert
 *     (review tone). Click → applies the `pulse=affected` filter on
 *     the current list so the CPA can triage which of *their*
 *     clients are touched by the new source change.
 *
 * The **Needs facts** banner sits above the tiles and renders only
 * when `needsFactsCount > 0` — it's a pre-deadline-pressure setup
 * gap, not an in-flight workload signal, so it earns a distinct
 * treatment.
 */
function ClientsActionStrip({
  isLoading,
  needsFactsCount,
  onFixNeedsFacts,
}: {
  isLoading: boolean
  needsFactsCount: number
  onFixNeedsFacts: () => void
}) {
  // 2026-05-26 (Yuqi /clients directory pivot brief): the 3-tile
  // StatTile strip (At risk / Waiting on client / Pulse hits) is
  // retired. /clients is now a directory-first surface; the
  // triage signals belong on /today and /deadlines where
  // dollar-exposure context is also present. The needs-facts
  // banner stays — it's actionable setup work specific to the
  // directory itself, not a triage tile.
  const hasBanner = needsFactsCount > 0
  if (isLoading) return <ClientsActionStripSkeleton />
  if (!hasBanner) return null

  // 2026-05-26 (Yuqi follow-up — "Ugly banner. Fix now can be in red.
  // Remove the left stroke."): retired the `variant="warning"` Alert
  // primitive (which paints a full amber border that read as a
  // heavy/striped frame). The banner now renders as a slim flat strip
  // — neutral muted background, no border, no leading icon column.
  // The "Fix now" CTA explicitly red so the action reads as
  // destructive-toned ("there's a problem here, fix it").
  return (
    <div
      role="status"
      // Action-strip banner: white surface + subtle border + full pill.
      // White (`bg-background-default`) is required — `bg-background-subtle`
      // reads as page wallpaper and the strip disappears. Full pill
      // (rounded-full) signals "single-row status bar," visually distinct
      // from the table card below.
      className="flex flex-col gap-2 rounded-full border border-divider-subtle bg-background-default px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-2">
        <AlertTriangleIcon className="size-4 shrink-0 text-text-warning" aria-hidden />
        <p className="text-sm text-text-primary">
          <Plural
            value={needsFactsCount}
            one="# client is missing state or entity type — the rule library is skipping it."
            other="# clients are missing state or entity type — the rule library is skipping them."
          />
        </p>
      </div>
      <Button type="button" size="sm" variant="destructive-primary" onClick={onFixNeedsFacts}>
        <Trans>Fix now</Trans>
      </Button>
    </div>
  )
}

// 2026-05-26 (Yuqi /clients directory pivot brief): skeleton scoped
// to the needs-facts banner only. The 3-tile skeleton retired with
// the StatTile strip. `ClientsStatTile` + `ClientsStatTileSkeleton`
// also retired — they were only used by the strip.
function ClientsActionStripSkeleton() {
  return <Skeleton className="h-10 w-full" aria-busy="true" />
}

function ClientTableSkeleton() {
  const columns = [
    { id: 'client', className: 'w-[240px]', header: 'w-14', cell: 'w-32' },
    { id: 'states', className: 'w-[220px]', header: 'w-14', cell: 'w-24' },
    { id: 'entity', className: 'w-[110px]', header: 'w-12', cell: 'w-14' },
    { id: 'nextDue', className: 'w-[200px]', header: 'w-16', cell: 'w-28' },
    { id: 'open', className: 'w-[80px]', header: 'w-10', cell: 'w-4' },
    { id: 'done', className: 'w-[80px]', header: 'w-10', cell: 'w-4' },
    { id: 'owner', className: 'w-[80px]', header: 'w-12', cell: 'w-6 rounded-full' },
    { id: 'opp', className: 'w-[80px]', header: 'w-10', cell: 'w-8' },
  ] as const
  return (
    // 2026-05-26 (Yuqi cross-page audit): skeleton matches the live
    // table's chrome — card frame on table-container, dimmed-gray
    // header bg.
    <Table
      className={cn(
        'table-fixed',
        '[&_[data-slot=table-container]]:overflow-hidden',
        '[&_[data-slot=table-container]]:rounded-md',
        '[&_[data-slot=table-container]]:border',
        '[&_[data-slot=table-container]]:border-divider-subtle',
        '[&_[data-slot=table-container]]:bg-background-default',
      )}
      aria-busy="true"
    >
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id} className={column.className}>
              <Skeleton className={cn('h-3', column.header)} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className="[&_tr]:border-b-0 [&_td]:py-2">
        {[0, 1, 2, 3, 4].map((row) => (
          <TableRow key={row}>
            {columns.map((column) => (
              <TableCell key={column.id} className={column.className}>
                <Skeleton className={cn('h-5', column.cell)} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ClientTableEmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center">
        <div className="flex flex-col items-center justify-center gap-1 text-xs">
          <span className="font-medium text-text-primary">
            <Trans>No clients match these filters</Trans>
          </span>
          <span className="text-text-tertiary">
            <Trans>Clear search or filters to return to the full practice directory.</Trans>
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function ClientDetailWorkspace({
  client,
  entityLabels,
  readiness,
  firmTimezone,
  practiceAiEnabled,
}: {
  client: ClientPublic
  entityLabels: Record<ClientEntityType, string>
  readiness: ClientReadiness | undefined
  firmTimezone: string
  practiceAiEnabled: boolean
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const permission = useFirmPermission()
  const currentUserName = useCurrentUserName()
  // 2026-05-24: `filingJurisdictionsOpen` state retired with the
  // DetailSection collapsible. Sections are flat now, so the "scroll
  // me into view" callback just scrolls — no panel state to toggle.
  const canReadAudit = permission.can('audit.read')
  // Body is now a 4-tab structure (Work / Client info / Discover /
  // Activity) — see docs/Design/client-page-information-architecture.md
  // updated 2026-05-22. URL-bound so deep links land on the right tab.
  // Work is the daily driver (filing plan), Client info carries the
  // configuration surfaces (compliance posture + jurisdictions + risk +
  // onboarding + import source), Discover is reference-only (suggested
  // forms + future business cues), Activity is lazy-loaded history.
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsStringLiteral(['work', 'info', 'discover', 'activity'] as const).withDefault('work'),
  )
  // 2026-05-26 (Yuqi tab-body follow-ups, Task 1): wire 1/2/3/4 as
  // hotkeys for the four tabs. Mirrors the J/K cycle pattern in
  // ClientCycleArrows — uses `useAppHotkey` (the project's canonical
  // hotkey primitive), gates on `useKeyboardShortcutsBlocked` so the
  // shortcuts stay quiet inside text inputs / dialogs / drawers, and
  // registers `meta` so each shortcut shows up in the global
  // ShortcutHelpDialog (the `?` sheet — that's Task 4 satisfied for
  // free). No on-screen kbd hints yet — power users discover via `?`.
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  useAppHotkey('1', () => void setActiveTab('work'), {
    enabled: !shortcutsBlocked,
    meta: {
      id: 'clients.tab.work',
      name: 'Work tab',
      description: "Switch to the client's Work tab (filing plan).",
      category: 'navigate',
      scope: 'route',
    },
  })
  useAppHotkey('2', () => void setActiveTab('info'), {
    enabled: !shortcutsBlocked,
    meta: {
      id: 'clients.tab.info',
      name: 'Client info tab',
      description: 'Switch to the Client info tab (posture, jurisdictions, risk).',
      category: 'navigate',
      scope: 'route',
    },
  })
  useAppHotkey('3', () => void setActiveTab('discover'), {
    enabled: !shortcutsBlocked,
    meta: {
      id: 'clients.tab.discover',
      name: 'Opportunities tab',
      description: 'Switch to the Opportunities tab (suggested forms + cues).',
      category: 'navigate',
      scope: 'route',
    },
  })
  useAppHotkey('4', () => void setActiveTab('activity'), {
    enabled: !shortcutsBlocked,
    meta: {
      id: 'clients.tab.activity',
      name: 'Activity tab',
      description: 'Switch to the Activity tab (AI summary, notes, audit log).',
      category: 'navigate',
      scope: 'route',
    },
  })
  // Obligation drawer is rendered as an in-route page panel (NOT a
  // modal Sheet) when launched from the filing plan below. State
  // lives on the shared provider so any surface — this page, the
  // queue, the dashboard, the global Cmd+K — drives the same panel
  // when they share a layout owner. `ObligationDrawerProvider`
  // defers to this route via the `routeOwnsPanel` check; see
  // features/obligations/ObligationDrawerProvider.tsx.
  const {
    obligationId: activeObligationId,
    activeTab: obligationTab,
    setActiveTab: setObligationTab,
    closeDrawer: closeObligationPanel,
  } = useObligationDrawer()
  const riskSummaryQuery = useQuery(
    orpc.clients.getRiskSummary.queryOptions({ input: { clientId: client.id } }),
  )
  const obligationsQuery = useQuery(
    orpc.obligations.listByClient.queryOptions({ input: { clientId: client.id } }),
  )
  const pulseHistoryQuery = useQuery(orpc.pulse.listHistory.queryOptions({ input: { limit: 30 } }))
  const pulseDetailsQueries = useQueries({
    queries: (pulseHistoryQuery.data?.alerts ?? []).map((alert) =>
      orpc.pulse.getDetail.queryOptions({ input: { alertId: alert.id } }),
    ),
  })
  const auditQuery = useQuery({
    ...orpc.audit.list.queryOptions({
      input: { entityType: 'client', entityId: client.id, range: '30d', limit: 6 },
    }),
    enabled: canReadAudit,
  })
  const obligations = obligationsQuery.data ?? EMPTY_OBLIGATIONS
  const workPlan = useMemo(
    () => buildClientWorkPlanSummary(obligations, formatDate(new Date().toISOString())),
    [obligations],
  )
  const extensionPaymentMismatches = useMemo(
    () => findExtensionWithoutPaymentObligations(obligations),
    [obligations],
  )
  const pulseDetails = pulseDetailsQueries.flatMap((query) => (query.data ? [query.data] : []))
  const pulseMatches = buildClientPulseMatches(pulseDetails, client.id)
  const updateRiskProfileMutation = useMutation(
    orpc.clients.updateRiskProfile.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.clients.getRiskSummary.key() })
        toast.success(t`Risk profile saved`, { description: result.client.name })
      },
      onError: (err) => {
        toast.error(t`Couldn't save risk profile`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const replaceFilingProfilesMutation = useMutation(
    orpc.clients.replaceFilingProfiles.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.facets.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.clients.getRiskSummary.key() })
        toast.success(t`Filing jurisdictions saved`, { description: result.client.name })
      },
      onError: (err) => {
        toast.error(t`Couldn't save filing jurisdictions`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const updateSourceDetailsMutation = useMutation(
    orpc.clients.updateSourceDetails.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.get.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.clients.getRiskSummary.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        toast.success(t`Client details saved`, { description: result.client.name })
      },
      onError: (err) => {
        toast.error(t`Couldn't save client details`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const requestRiskSummaryMutation = useMutation(
    orpc.clients.requestRiskSummaryRefresh.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.getRiskSummary.key() })
        toast.success(t`Risk summary refresh queued`)
      },
      onError: (err) => {
        toast.error(t`Couldn't queue risk summary`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  // Owner reassignment (2026-05-24). Powers the H1 owner-pill
  // dropdown so clicking "Unassigned" / "M. Chen" opens a real
  // picker — previously the pill looked tappable but was a dead
  // <span>. Reuses the same `clients.bulkUpdateAssignee` procedure
  // the /clients list bulk-bar uses, with a single-id payload so
  // the audit-log breadcrumb stays consistent.
  const assignableMembersQuery = useQuery(
    orpc.members.listAssignable.queryOptions({ input: undefined }),
  )
  const assignableMembers = useMemo(
    () => assignableMembersQuery.data ?? [],
    [assignableMembersQuery.data],
  )
  const bulkAssigneeMutation = useMutation(
    orpc.clients.bulkUpdateAssignee.mutationOptions({
      onSuccess: (result, vars) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.get.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        toast.success(vars.assigneeId === null ? t`Owner cleared` : t`Owner updated`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't update owner`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const changeOwner = useCallback(
    (assigneeId: string | null) => {
      bulkAssigneeMutation.mutate({ clientIds: [client.id], assigneeId })
    },
    [bulkAssigneeMutation, client.id],
  )
  const missingFilingState = Boolean(readiness?.missingRequiredFacts.includes('state'))
  // "Add filing state" chip + jurisdiction-deep-link callback.
  // 2026-05-24: the chip lives on the Work tab header but the
  // jurisdiction form lives on the Client info tab. Scrolling
  // alone left the user on Work with nothing visibly changed.
  // Now switches the tab first, then RAFs the scroll so the
  // section is in the DOM before we try to align it.
  const openFilingJurisdictions = useCallback(() => {
    void setActiveTab('info')
    window.requestAnimationFrame(() => {
      document
        .getElementById('client-filing-jurisdictions')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [setActiveTab])

  // 2026-05-24 (shape — critique P1): the H1 "Add filing state" /
  // "Needs facts" chip opens the same inline batch sheet the
  // /clients list page uses, so the fix-state journey matches across
  // surfaces. Previously the detail-page chip just switched to the
  // Client info tab + scrolled to the jurisdiction form, which was
  // ~6 clicks vs the list page's 2.
  //
  // When `entityType` is missing (rare), the sheet's existing
  // fallback is a "Open client to fix" link — useless here because
  // we're already on the client detail page. For that case we keep
  // the old tab+scroll fallback. Detection: readiness.missing
  // includes 'entityType'.
  const [fixSheetOpen, setFixSheetOpen] = useState(false)
  const missingEntityType = Boolean(readiness?.missingRequiredFacts.includes('entityType'))
  const openMissingFacts = useCallback(() => {
    if (missingEntityType) {
      openFilingJurisdictions()
      return
    }
    setFixSheetOpen(true)
  }, [missingEntityType, openFilingJurisdictions])

  // Obligation status change — wired from the filing-plan rows
  // (D-6a/b). Same RPC the queue uses, same invalidation set, so
  // status changes made here propagate to the queue, dashboard, and
  // back into this client's filing-plan rows.
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const changeStatusMutation = useMutation(
    orpc.obligations.updateStatus.mutationOptions({
      onSuccess: (result, vars) => {
        void queryClient.invalidateQueries({
          queryKey: orpc.obligations.listByClient.key(),
        })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        toast.success(t`Status changed to ${v2StatusLabels[vars.status]}`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
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
  const handleChangeObligationStatus = useCallback(
    (id: string, status: ObligationStatus) => {
      changeStatusMutation.mutate({ id, status })
    },
    [changeStatusMutation],
  )

  // Archive (a.k.a. soft-delete) state + mutation. CPA compliance
  // requires soft-delete — `clients.delete` actually flips `deletedAt`
  // server-side, audit log retains everything. The UI surfaces the
  // action as "Archive" (the action verb a CPA would use) instead of
  // "Delete" (which implies irreversible). See critique L-10 for the
  // rationale on Archive vs Delete vocabulary.
  const [archiveOpen, setArchiveOpen] = useState(false)
  const archiveMutation = useMutation(
    orpc.clients.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        toast.success(t`Client archived`, { description: client.name })
        setArchiveOpen(false)
        void navigate('/clients')
      },
      onError: (err) => {
        toast.error(t`Couldn't archive client`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const showSourceFields =
    getClientSourceType(client) === 'imported' ||
    Boolean(client.externalClientId || client.sourceStatus)

  return (
    <>
      {/* 2026-05-26 (Yuqi feedback #11-#14 — "page scrolling mechanism
          should follow Deadline expanded"): outer container is now a
          flex column on small viewports and a flex row at xl+. The
          left column owns its OWN scroll container (PageHeader +
          metadata pinned, tab body scrolls); the right panel slides
          in motion-animated 0→600 when a filing row is clicked. The
          page-level scroll on the document body is gone — only the
          tab body scrolls. Mirrors /deadlines exactly. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row xl:items-stretch xl:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <PageHeader
            eyebrow={
              <Link
                to="/clients"
                // Eyebrow back-link styling overrides the eyebrow slot's
                // default uppercase / tracked / 11px tag treatment so the
                // back-nav reads as a friendly link, not as a section
                // label tag. The section labels inside tabs (`CONFIGURE`,
                // `NOTES`) keep that tracked-uppercase style — two
                // visually distinct typographic tiers for two different
                // semantic intents.
                className="inline-flex items-center gap-1 rounded-sm text-xs font-normal normal-case tracking-normal text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                <ChevronLeftIcon className="size-3.5" aria-hidden />
                <Trans>Clients</Trans>
              </Link>
            }
            // 2026-05-26 (Yuqi follow-up — "1/9 does not belong to
            // the client detail … should be in the frame of the
            // < Clients, space between far right"): the prev/next
            // pagination belongs on the BREADCRUMB row, not in the
            // H1 actions cluster. The < Clients back-link sits on
            // the left of the eyebrow row; 1/9 sits on the right of
            // the same row via the eyebrowAside slot, with the
            // PageHeader providing `justify-between`. Action cluster
            // (⋯ + Add deadline) stays in the title row — those
            // ARE page-level controls scoped to this client. */}
            eyebrowAside={<ClientCycleArrows currentClientId={client.id} />}
            title={
              // 2026-05-26 (Yuqi macro→micro audit, Fix #3 + #11 / §2.2,
              // §2.4): title cluster reduced to title + 1 readiness chip
              // per canonical (page-family-canonical §3 — title + ≤1
              // chip). Entity badge, owner pill, and filing-state chips
              // moved DOWN to ClientContactMetaRow so the H1 line reads
              // as identification, not a stat strip.
              // 2026-05-26 (Yuqi /clients/[id] header restructure —
              // "restructure the header section of the client-detail"):
              // chip moves to its OWN row BELOW the title (the title
              // span used to share a flex-wrap row with the chip; in
              // narrow layouts that pushed the chip onto a 2nd line
              // OR forced the title to wrap to 3 lines). New shape:
              //   • Row 1: ClientTitleSwitcher (truncates if narrow)
              //   • Row 2: optional readiness chip (only when status
              //            === 'needs_facts')
              // Both rows are `min-w-0` so they shrink gracefully when
              // the right panel opens and the H1 column collapses.
              <span className="flex min-w-0 flex-col items-start gap-y-2">
                <ClientTitleSwitcher client={client} />
                {readiness?.status === 'needs_facts' ? (
                  // 2026-05-26 (Fix #9 / §3.7): badge tone destructive
                  // → warning. "Add filing state" is incomplete
                  // configuration, not a destructive state; warning
                  // matches the needs-facts banner tone and the
                  // canonical color reservation (red is for late /
                  // hard errors / blocked).
                  <Badge
                    variant="warning"
                    className="cursor-pointer text-xs"
                    render={<button type="button" onClick={openMissingFacts} />}
                  >
                    <SettingsIcon className="size-3" aria-hidden />
                    <MissingFactsActionLabel readiness={readiness} />
                  </Badge>
                ) : null}
              </span>
            }
            // 2026-05-23: subtitle suppressed when readiness gap chip is
            // present in the H1 chip cluster. The "Missing filing state"
            // chip is itself the page-level signal; piling a workPlan
            // summary line on top creates two summary lines stacked
            // ("alert chip row" + "N open filings · …") and feels noisy.
            // Per Figma — when the alert chip is there, it owns the
            // sub-h1 slot; the workPlan summary returns once the gap
            // is resolved. Subtitle keeps rendering for every other
            // client so the at-a-glance state stays visible.
            description={
              readiness?.status === 'needs_facts'
                ? null
                : renderClientHeaderSubLine({
                    workPlan,
                    entityType: client.entityType,
                    taxClassification: client.taxClassification,
                  })
            }
            // 2026-05-23: dropped ClientCycleArrows entirely per
            // critique ("remove first"). The prev/next chevrons +
            // position counter took space on every client detail page
            // for a workflow CPAs rarely used. The component file
            // (./ClientCycleArrows.tsx) is left in place — keyboard
            // j/k cycling lives inside it, and we may reintroduce
            // the visual control later in a different surface (e.g.
            // a peek dropdown). Removing the import + render here is
            // enough to drop it from this header.
            actions={
              <>
                {/* 2026-05-26 (Yuqi follow-up — "1/9 does not belong
                    to the client detail"): ClientCycleArrows moved
                    OUT of the actions cluster up to the eyebrowAside
                    slot. Actions now only carry the page-level
                    controls scoped to this client (overflow ⋯ +
                    Add deadline). */}
                <ClientHeaderOverflowMenu
                  clientId={client.id}
                  clientName={client.name}
                  canReadAudit={canReadAudit}
                  onArchive={() => setArchiveOpen(true)}
                />
                <CreateObligationDialog defaultClientId={client.id} />
              </>
            }
          />

          {/* Body — client-context content. The outer xl:flex-row
            split (one wrapper above) already separates this from the
            right-rail obligation panel, so this section just renders
            the column-of-content inline. */}
          <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            {/* Provenance (Imported / Manual) lived here briefly during
                the D-2 transition. Dropped 2026-05-22 per design call —
                low-signal: most clients are Manual by default, and the
                Imported chip never changed a CPA's behavior. The
                migration history is still discoverable from the
                /clients header Import-history drawer. */}

            <ClientContactMetaRow
              client={client}
              entityLabel={entityLabels[client.entityType]}
              ownerSlot={
                <ClientOwnerHeaderPill
                  assigneeId={client.assigneeId ?? null}
                  name={client.assigneeName ?? null}
                  currentUserName={currentUserName}
                  assignableMembers={assignableMembers}
                  disabled={bulkAssigneeMutation.isPending}
                  onChange={changeOwner}
                />
              }
            />

            {/* 2026-05-26 (Stripe-bar /clarify pass — re-applied per
                Yuqi's "address all" direction): inline tip pairs the
                needs-facts signal with a dismissable CTA. The H1 chip
                still surfaces "Add filing state" but the banner gives
                CPAs an "act now / dismiss for later" path without
                leaving the chip looming. Per-client dismissKey keeps
                each client's tip independent. */}
            {readiness?.status === 'needs_facts' ? (
              <InfoBanner
                icon={LightbulbIcon}
                message={t`Add this client's filing state to start generating deadlines.`}
                cta={{ label: t`Add filing state`, onClick: openMissingFacts }}
                dismissKey={`client-${client.id}-needs-facts-tip`}
              />
            ) : null}

            {/* Active alerts + summary strip stay ABOVE the tabs —
                they're global signals about the client ("anything wrong
                with this client right now?") that apply regardless of
                which tab is open. */}
            <ClientActiveAlertsSection
              pulseMatches={pulseMatches}
              extensionPaymentMismatches={extensionPaymentMismatches}
            />

            <ClientSummaryStrip clientId={client.id} obligations={obligations} />

            {/* 4-tab body (2026-05-22). Replaces the V14 stacked-
                sections shape. Reasoning in
                docs/Design/client-page-information-architecture.md
                v2 + the dev-log for this commit. Short version:
                content grew past the point where a flat list of
                collapsibles reads cleanly, and "compliance posture"
                turned out to be client info (identity facts), not
                daily work. Tabs separate the four jobs cleanly:
                  • Work       — what do they owe right now?
                  • Client info — who is this client?
                  • Discover   — what else could they file?
                  • Activity   — what happened recently? (lazy) */}
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                if (
                  value === 'work' ||
                  value === 'info' ||
                  value === 'discover' ||
                  value === 'activity'
                ) {
                  void setActiveTab(value)
                }
              }}
              // 2026-05-26 (Yuqi feedback #12-14): Tabs root becomes
              // its own flex column inside the workspace. TabsList sits
              // shrink-0 at the top; the active TabsContent fills the
              // remaining height with its own overflow-y-auto. Without
              // this, the whole detail page scrolls as one (the bug
              // Yuqi flagged — "一整页一起滑动是不对的").
              className="flex min-h-0 flex-1 flex-col"
            >
              {/* 2026-05-26 (Yuqi feedback #6 + #7): tab bar matches
                  the /deadlines scope-tabs visual — left-aligned,
                  hug-content triggers (no flex-1), transparent
                  background, single hairline border. Drops the
                  background-default that Yuqi flagged ("why is there
                  a background?"). The primitive's `variant="line"`
                  already provides the underline-on-active treatment.
                  Triggers are overridden below to drop the
                  primitive's `flex-1` so each tab hugs its label
                  (matches /deadlines instead of spreading full-width). */}
              {/* 2026-05-26 (Yuqi follow-up — "Deadline's Status
                  scopes animation and interaction" applied to detail
                  tabs): retired the primitive's CSS-only
                  `data-active:after:` underline and replaced with a
                  single `<motion.span layoutId>` rendered inside
                  whichever trigger is active. Framer Motion smoothly
                  slides the underline between tabs on click (spring
                  500 / damping 38) — the same pattern that powers
                  /deadlines `ObligationQueueScopeTab`. Active text
                  swaps back to `text-text-primary` per the parallel
                  "revert titles to black" pass; the moving underline
                  carries the active signal. Inactive triggers gain a
                  transparent 2px bottom border that turns
                  `divider-deep` on hover so the row reads warm at
                  rest, matching /deadlines hover symmetry. */}
              {/* 2026-05-26 (Yuqi /clients/[id] feedback #8 — "double
                  underline"): dropped the `border-b border-divider-regular`
                  baseline on TabsList. The active tab's motion.span at
                  `-bottom-0.5` was painting an accent underline + the
                  list's 1px gray border-b right next to each other =
                  two visible lines stacked. Without the list border,
                  the active accent line is the only visible underline;
                  inactive tab hover still gets its own `border-b-2`
                  via `ClientDetailTabTrigger`. */}
              <TabsList
                variant="line"
                className="flex shrink-0 gap-1 bg-transparent px-0 text-base"
              >
                {/* 2026-05-26 (Yuqi feedback — "add icons for each
                    of them"): leading lucide glyph per tab. Matches
                    the deadline drawer's tab bar (paperclip /
                    calendar / file) and gives the row a stronger
                    "scan me" affordance — the icons help the CPA
                    recognize the destination before they read the
                    word.
                      • Work → ClipboardList (filing plan tasks)
                      • Client info → UserRound (the person itself)
                      • Opportunities → Sparkles (discover surface)
                      • Activity → Activity (timeline / pulse)
                    Sizes match the deadline drawer at `size-3.5` so
                    glyph weight stays consistent across surfaces. */}
                <ClientDetailTabTrigger value="work" activeTab={activeTab}>
                  <ClipboardListIcon className="size-3.5" aria-hidden />
                  <Trans>Work</Trans>
                </ClientDetailTabTrigger>
                <ClientDetailTabTrigger value="info" activeTab={activeTab}>
                  <UserRoundIcon className="size-3.5" aria-hidden />
                  <Trans>Client info</Trans>
                  {/* 2026-05-26 (Yuqi post-revamp critique P2 / §5):
                      dot → count chip. The dot signaled "something
                      is missing" but didn't say HOW MUCH. A count
                      bubble surfaces the magnitude at the tab bar
                      so the CPA can decide whether to switch tabs
                      before clicking through. Tone matches the
                      readiness chip (warning, not destructive) per
                      §3.7 canonical color reservation. */}
                  {readiness && readiness.missingRequiredFacts.length > 0 ? (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-state-warning-border bg-state-warning-hover px-1.5 text-[10px] font-medium leading-none tabular-nums text-text-warning">
                      {readiness.missingRequiredFacts.length}
                    </span>
                  ) : null}
                </ClientDetailTabTrigger>
                {/* 2026-05-26 (Yuqi post-revamp critique P1 / §5):
                    tab label renamed `Discover` → `Opportunities`.
                    URL key stays `discover` so deep links don't
                    break. */}
                <ClientDetailTabTrigger value="discover" activeTab={activeTab}>
                  <SparklesIcon className="size-3.5" aria-hidden />
                  <Trans>Opportunities</Trans>
                </ClientDetailTabTrigger>
                <ClientDetailTabTrigger value="activity" activeTab={activeTab}>
                  <ActivityIcon className="size-3.5" aria-hidden />
                  <Trans>Activity</Trans>
                </ClientDetailTabTrigger>
              </TabsList>

              {/* 2026-05-26 (Yuqi feedback #14): each TabsContent
                  owns its own overflow-y-auto so the tab body scrolls
                  INDEPENDENTLY of the rest of the page (PageHeader,
                  ContactMetaRow, alerts, summary, tab bar stay
                  pinned). Matches /deadlines's "queue column scrolls,
                  surrounding chrome stays put" mechanism. The bottom
                  padding gives the last row breathing room from the
                  viewport edge. */}
              <TabsContent
                value="work"
                className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-4 pb-6"
              >
                <ClientWorkPlanPanel
                  obligations={obligations}
                  isLoading={obligationsQuery.isLoading}
                  summary={workPlan}
                  clientName={client.name}
                  onChangeStatus={handleChangeObligationStatus}
                  isStatusChangePending={changeStatusMutation.isPending}
                />
              </TabsContent>

              {/* 2026-05-24: every tab below uses <TabSection> for its
                  section heading so all four tabs share one visual
                  language (h2 + subtitle, no disclosure, no nested
                  card frame around the section block itself). The
                  DetailSection collapsible pattern + the ad-hoc
                  SectionFrame "Notes" block both retired here. */}
              <TabsContent
                value="info"
                className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-4 pb-6"
              >
                {/* Compliance posture — EIN + tax year + owners +
                    activity-scope flags. Client identity facts, not
                    "work" in progress; the CPA edits / verifies these
                    quarterly, not daily. Panel renders its own grid
                    inside; TabSection owns the section heading. */}
                <TabSection
                  title={t`Compliance posture`}
                  summary={t`Identity facts that drive the deadline generator`}
                >
                  <ClientCompliancePosturePanel client={client} />
                </TabSection>

                <TabSection
                  title={t`Filing jurisdictions`}
                  summary={formatJurisdictionSummary(client)}
                >
                  <div
                    id="client-filing-jurisdictions"
                    className={cn(
                      'scroll-mt-20 rounded-md border bg-background-default p-4',
                      missingFilingState
                        ? 'border-components-badge-bg-warning-soft'
                        : 'border-divider-regular',
                    )}
                  >
                    <ClientJurisdictionPanel
                      key={`${client.id}:jurisdiction`}
                      client={client}
                      isSaving={replaceFilingProfilesMutation.isPending}
                      onSave={(input) => replaceFilingProfilesMutation.mutate(input)}
                    />
                  </div>
                </TabSection>

                <TabSection
                  title={t`Risk profile`}
                  titleAccessory={<RiskProfileSmartPriorityHelp />}
                  summary={t`Penalty exposure and tax-attribute flags`}
                >
                  <div className="rounded-md border border-divider-regular bg-background-default p-4">
                    <ClientRiskInputsPanel
                      key={`${client.id}:risk`}
                      client={client}
                      isSaving={updateRiskProfileMutation.isPending}
                      onSave={(input) => updateRiskProfileMutation.mutate(input)}
                    />
                  </div>
                </TabSection>

                <TabSection
                  title={t`Onboarding state`}
                  summary={
                    readiness && readiness.missingRequiredFacts.length > 0
                      ? t`${readiness.missingRequiredFacts.length} required fact(s) missing`
                      : t`All required facts present`
                  }
                >
                  <div className="rounded-md border border-divider-regular bg-background-default p-4">
                    <ClientFactChecklist client={client} readiness={readiness} />
                  </div>
                </TabSection>

                <TabSection
                  title={showSourceFields ? t`Import source` : t`Contact details`}
                  summary={formatImportSourceSummary(client)}
                >
                  <div className="rounded-md border border-divider-regular bg-background-default p-4">
                    <ClientSourceDetailsPanel
                      key={`${client.id}:source-details`}
                      client={client}
                      showSourceFields={showSourceFields}
                      isSaving={updateSourceDetailsMutation.isPending}
                      onSave={(input) => updateSourceDetailsMutation.mutate(input)}
                    />
                  </div>
                </TabSection>
              </TabsContent>

              <TabsContent
                value="discover"
                className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-4 pb-6"
              >
                <TabSection
                  title={t`Suggested forms`}
                  summary={t`Forms the rule library can add without a new deadline`}
                >
                  {/* 2026-05-26 (Yuqi tab-body follow-ups, Task 3):
                      drop the wrapper frame here — SuggestedFormsCatalogPanel
                      renders its own canonical-shape frame plus its own
                      "Forms catalog · N applicable" header bar, so the
                      outer p-4 wrapper double-framed and added wasted
                      padding. Matches how Future business cues below
                      lets ClientOpportunitiesCard stand alone. */}
                  <SuggestedFormsCatalogPanel client={client} existingObligations={obligations} />
                </TabSection>

                <TabSection
                  title={t`Future business cues`}
                  summary={t`Advisory, scope, and retention opportunities`}
                >
                  {/* ClientOpportunitiesCard renders its own <Card>
                      chrome (frame + internal title). We let it stand
                      alone — wrapping it in another frame doubled the
                      border + duplicated the heading. */}
                  <ClientOpportunitiesCard clientId={client.id} />
                </TabSection>
              </TabsContent>

              <TabsContent
                value="activity"
                className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-4 pb-6"
              >
                {/* Activity content only renders when the tab is the
                    active one — the surrounding TabsContent gates the
                    AI summary + audit log queries that fire inside. */}
                <TabSection
                  title={t`Client summary (AI)`}
                  summary={
                    riskSummaryQuery.data?.generatedAt
                      ? t`Refreshed ${formatDateTimeWithTimezone(riskSummaryQuery.data.generatedAt, firmTimezone)}`
                      : t`No summary yet`
                  }
                  // 2026-05-26 (Yuqi /clients/[id] feedback #6+#7 —
                  // "pull this out and put with the Client Summary
                  // title, then the bar can be removed"): the AI
                  // status badge + Refresh button cluster used to
                  // live as its own right-aligned bar INSIDE the
                  // panel body. Hoisted up to the TabSection's
                  // `actions` slot so the badge + Refresh sit on
                  // the same row as the section title; the redundant
                  // inner bar is dropped (see
                  // `ClientRiskSummaryPanel` below — it no longer
                  // renders that header strip).
                  actions={
                    <>
                      {riskSummaryQuery.data ? (
                        <InsightStatusBadge status={riskSummaryQuery.data.status} />
                      ) : null}
                      {practiceAiEnabled ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={requestRiskSummaryMutation.isPending}
                          onClick={() => requestRiskSummaryMutation.mutate({ clientId: client.id })}
                        >
                          <RefreshCwIcon data-icon="inline-start" />
                          {requestRiskSummaryMutation.isPending ? (
                            <Trans>Queued</Trans>
                          ) : (
                            <Trans>Refresh</Trans>
                          )}
                        </Button>
                      ) : (
                        <UpgradeCtaButton />
                      )}
                    </>
                  }
                >
                  <div className="rounded-md border border-divider-regular bg-background-default p-4">
                    <ClientRiskSummaryPanel
                      insight={riskSummaryQuery.data ?? null}
                      isLoading={riskSummaryQuery.isLoading}
                      canRefresh={practiceAiEnabled}
                    />
                  </div>
                </TabSection>

                <TabSection title={t`Notes`}>
                  {/* 2026-05-26 (Yuqi tab-body follow-ups, Task 2 /
                      Fix #10): when there are no notes, render the
                      canonical EmptyState (dashed border + icon +
                      title + description) instead of an italic
                      "No notes." inside a solid frame. The italic
                      pattern was a one-off — every other empty state
                      on this page (Work plan, suggested forms,
                      audit log) uses EmptyState, so Notes now joins.
                      When notes ARE present, the solid frame stays
                      because the content is body text the CPA
                      authored, not a "nothing here" surface. */}
                  {client.notes ? (
                    <div className="rounded-md border border-divider-regular bg-background-default px-4 py-3 text-sm text-text-secondary">
                      {client.notes}
                    </div>
                  ) : (
                    <EmptyState
                      icon={ScrollTextIcon}
                      title={<Trans>No notes yet</Trans>}
                      description={
                        <Trans>
                          Capture context (preferred call window, sensitivities, history) so the
                          next preparer doesn't start from scratch.
                        </Trans>
                      }
                    />
                  )}
                </TabSection>

                <TabSection
                  title={t`Activity log`}
                  summary={t`Recent audited changes for this client record`}
                >
                  {/* 2026-05-26 (Yuqi tab-body follow-ups, Task 3):
                      ClientActivityPanel now owns its own canonical
                      outer frame internally (one frame, divide-y
                      rows), matching the AI summary + Notes section
                      treatment on this tab. No extra wrapper needed
                      here — would double-frame. */}
                  <ClientActivityPanel
                    events={auditQuery.data?.events ?? []}
                    canReadAudit={canReadAudit}
                    isLoading={auditQuery.isLoading}
                    firmTimezone={firmTimezone}
                  />
                </TabSection>
              </TabsContent>
            </Tabs>
          </section>
        </div>
        {/* Obligation page panel — replaces the modal Sheet on this
            route. Width is fixed 600px on xl+, full-width stacked
            below the entire client surface at narrower viewports.
            Now a sibling of the left column wrapper (was nested
            inside the body) so opening an obligation pushes the
            PageHeader, summary strip, alerts, AND the filing plan
            all left at once. */}
        {/* 2026-05-26: CSS-only slide-in. Earlier in this session we
            tried AnimatePresence + motion.div animating width 0→600
            but the interaction with this flex-row + items-stretch
            parent settled at stuck intermediate widths under React
            19's concurrent renders — the entry-animation never
            reliably reached the 600px target. We rolled back to a
            snap-mount, then brought the slide-in back via a native
            CSS transition on `width` (no motion library involved).
            Shape:
              • At xl+: aside is ALWAYS mounted (so the width
                transition has a stable element to animate). Width
                starts at 0 and animates to 600px when an obligation
                is selected. A negative `mr` cancels the parent's
                xl:gap-6 while the aside is closed so there's no
                phantom 24px void to the right of the left column;
                margin animates back to 0 alongside the width.
              • Below xl: parent is flex-col, so the aside renders
                as a conditional full-width block below the rest of
                the page (current behavior — no width animation
                because it isn't the dominant axis here).
            CSS sidesteps React 19's reconciliation entirely and is
            stable across renders. */}
        <aside
          data-slot="obligation-detail-panel"
          data-open={activeObligationId ? 'true' : 'false'}
          className={cn(
            'min-w-0 shrink-0 self-stretch overflow-hidden',
            // Below xl: simple conditional show / hide (no animation —
            // the parent is flex-col, width transitions aren't the
            // right shape for a vertical stack).
            activeObligationId ? 'flex w-full' : 'hidden',
            // xl+: always present as a flex slot, width-animated.
            'xl:flex xl:h-full xl:min-h-0',
            'xl:transition-[width,margin-right] xl:duration-300 xl:ease-[cubic-bezier(0.32,0.72,0,1)]',
            // Closed: 0 width AND a negative right margin equal to
            // the parent's xl:gap-6 so the unused gap doesn't show
            // up as a void on the right edge.
            'xl:w-0 xl:-mr-6',
            // Open: real width + reset the negative margin so the
            // gap reappears between left column and panel.
            activeObligationId && 'xl:w-[600px] xl:mr-0',
          )}
        >
          {activeObligationId ? (
            <ObligationPanelDispatcher
              obligationId={activeObligationId}
              activeTab={obligationTab}
              onTabChange={setObligationTab}
              onClose={closeObligationPanel}
              onNeedsInput={() => {
                // Penalty-input dialog is route-local to /deadlines;
                // not wired here. CPAs can deep-link to the queue
                // for that flow.
              }}
              practiceAiEnabled={practiceAiEnabled}
              blockerCandidates={[]}
            />
          ) : null}
        </aside>
      </div>

      {/* Archive confirmation. `clients.delete` is a soft-delete server-
          side (sets `deletedAt` + writes an audit row) — see commit
          b925449. We surface it as "Archive" because that's the CPA's
          mental model: hide from daily views, retain for audit /
          historical record. Critique L-10. */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Archive {client.name}?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                The client will be hidden from the active list and dashboards. All audit history,
                filings, and deadlines stay retained. You can restore from the archived view if you
                change your mind.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate({ id: client.id })}
            >
              <ArchiveIcon data-icon="inline-start" />
              <Trans>Archive client</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Inline batch flow for the "Needs facts" / "Add filing
          state" chip — same sheet the /clients list page mounts,
          scoped to this client only. Opens when the H1 chip is
          clicked and the missing fact is `state` (the 90% case).
          When `entityType` is missing, openMissingFacts falls back
          to tab+scroll instead because the sheet's entityType
          fallback is a link button that would loop back here. */}
      <FixNeedsFactsSheet open={fixSheetOpen} onOpenChange={setFixSheetOpen} clients={[client]} />
    </>
  )
}

type FilingPlanYearGroup = {
  year: number | 'unknown'
  isCurrent: boolean
  obligations: readonly ObligationInstancePublic[]
  openCount: number
  extendedCount: number
}

// Group obligations into tax-year buckets so the client page reads as a
// filing plan (matching reference CPA workbenches), not a flat queue. The
// current tax year (latest year present, or calendar year if no data) sits
// at the top with a "Current tax year" chip; prior years follow descending.
function groupObligationsByTaxYear(
  obligations: readonly ObligationInstancePublic[],
): FilingPlanYearGroup[] {
  const buckets = new Map<number | 'unknown', ObligationInstancePublic[]>()
  for (const obligation of obligations) {
    const key: number | 'unknown' = obligation.taxYear ?? 'unknown'
    const list = buckets.get(key)
    if (list) list.push(obligation)
    else buckets.set(key, [obligation])
  }
  const knownYears = [...buckets.keys()]
    .filter((k): k is number => typeof k === 'number')
    .toSorted((a, b) => b - a)
  const currentYear = knownYears[0] ?? null
  const groups: FilingPlanYearGroup[] = knownYears.map((year) => {
    const list = buckets.get(year) ?? []
    return {
      year,
      isCurrent: year === currentYear,
      obligations: list,
      openCount: list.filter((o) => OPEN_FILING_PLAN_STATUSES.has(o.status)).length,
      extendedCount: list.filter((o) => o.status === 'extended').length,
    }
  })
  if (buckets.has('unknown')) {
    const list = buckets.get('unknown') ?? []
    groups.push({
      year: 'unknown',
      isCurrent: false,
      obligations: list,
      openCount: list.filter((o) => OPEN_FILING_PLAN_STATUSES.has(o.status)).length,
      extendedCount: list.filter((o) => o.status === 'extended').length,
    })
  }
  return groups
}

// "Open" for filing-plan summary purposes: any non-terminal status. We
// don't try to be precise about prep stage here — that's drawer territory.
const OPEN_FILING_PLAN_STATUSES = new Set([
  'pending',
  'in_progress',
  'waiting_on_client',
  'review',
  'blocked',
  'done',
])

// 2026-05-24 (shape — critique P2): filing-plan column sort state.
// `null` field means "natural order" — each year section's obligations
// stay in whatever order the API returned. `internal` and `official`
// are the most common sort axes (per CPA Sarah's testing). `form` is a
// stable secondary key. `status` orders by the lifecycle enum.
type FilingPlanSortField = 'form' | 'internal' | 'official' | 'status' | 'estimate' | null
type FilingPlanSortDir = 'asc' | 'desc'
type FilingPlanSort = { field: FilingPlanSortField; dir: FilingPlanSortDir }

// Canonical status ordering — matches the V2 lifecycle. We sort by
// index so "Not started" sorts before "Filed" rather than alphabetic.
const STATUS_SORT_INDEX: Record<string, number> = {
  not_started: 0,
  in_progress: 1,
  waiting_on_client: 2,
  review: 3,
  blocked: 4,
  done: 5,
  filed: 6,
  paid: 7,
  completed: 8,
  extended: 9,
  not_applicable: 10,
}

// Inline sort-header button. Renders the label + a sort indicator
// chevron when active. Click cycles asc → desc → null (handled by
// the panel's `cycleSort`). When inactive, label is uppercase
// tertiary; when active, label promotes to primary text with the
// chevron next to it. Keeps the rest of the header row visually
// quiet so it doesn't compete with the rows below.
function FilingPlanSortHeader({
  className,
  active,
  dir,
  alignRight,
  title,
  onClick,
  children,
}: {
  className?: string
  active: boolean
  dir: FilingPlanSortDir
  alignRight?: boolean
  title?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    // 2026-05-26 (Yuqi /clients/[id] feedback #9 — "确认 header
    // 样式"): brought into line with the canonical workbench-table
    // header (TableHead primitive: `text-sm font-medium normal-case
    // text-text-secondary`). Was `text-xs font-medium uppercase
    // text-text-tertiary` — uppercase eyebrow style read as a meta
    // label, not a column header. Now matches /deadlines + /clients
    // + /rules/library table headers across the family.
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium leading-5 outline-none focus-visible:text-text-primary',
        alignRight ? 'justify-end' : 'text-left',
        active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
        className,
      )}
    >
      <span>{children}</span>
      {active ? (
        dir === 'asc' ? (
          <ChevronUpIcon className="size-3" aria-hidden />
        ) : (
          <ChevronDownIcon className="size-3" aria-hidden />
        )
      ) : null}
    </button>
  )
}

function sortObligations(
  list: readonly ObligationInstancePublic[],
  sort: FilingPlanSort,
): readonly ObligationInstancePublic[] {
  if (sort.field === null) return list
  const sign = sort.dir === 'asc' ? 1 : -1
  const cmp = (a: ObligationInstancePublic, b: ObligationInstancePublic): number => {
    switch (sort.field) {
      case 'form':
        return a.taxType.localeCompare(b.taxType) * sign
      case 'internal': {
        const av = Date.parse(a.currentDueDate)
        const bv = Date.parse(b.currentDueDate)
        return ((av || 0) - (bv || 0)) * sign
      }
      case 'official': {
        const av = Date.parse(a.filingDueDate ?? a.currentDueDate)
        const bv = Date.parse(b.filingDueDate ?? b.currentDueDate)
        return ((av || 0) - (bv || 0)) * sign
      }
      case 'status': {
        const av = STATUS_SORT_INDEX[a.status] ?? 99
        const bv = STATUS_SORT_INDEX[b.status] ?? 99
        return (av - bv) * sign
      }
      case 'estimate': {
        const av = a.estimatedTaxDueCents ?? -1
        const bv = b.estimatedTaxDueCents ?? -1
        return (av - bv) * sign
      }
      default:
        return 0
    }
  }
  return list.toSorted(cmp)
}

type ClientDetailTabKey = 'work' | 'info' | 'discover' | 'activity'

// ClientDetailTabTrigger — adopts the canonical /deadlines
// ObligationQueueScopeTab visual contract for the four detail-page
// tabs (Work / Client info / Opportunities / Activity).
//   - text-base label, px-3 py-1.5 padding
//   - Active = `font-medium text-text-primary`; underline carries the
//     active signal (no accent-purple text)
//   - Inactive = transparent 2px bottom border that turns
//     `divider-deep` on hover
//   - The active underline is a single `<motion.span layoutId>` —
//     Framer Motion slides it between tabs as `activeTab` changes,
//     same spring tuning as the Deadlines tab band
//   - Still nested inside `<TabsList>` so Base UI Tabs root keeps
//     wiring the controlled `value`/`onValueChange` panel-switch
//     machinery
function ClientDetailTabTrigger({
  value,
  activeTab,
  children,
}: {
  value: ClientDetailTabKey
  activeTab: ClientDetailTabKey
  children: ReactNode
}) {
  const active = activeTab === value
  return (
    <TabsTrigger
      value={value}
      // 2026-05-26 (Yuqi /clients/[id] feedback — "still having this
      // double line"): the underlying TabsTrigger primitive carries
      // pill-segmented defaults (`data-active:bg-…`,
      // `data-active:shadow-xs`, `rounded-md border border-transparent`,
      // plus an `::after` pseudo-element underline at `bottom-[-5px]`
      // gated on `variant=line`). Even though this consumer wants a
      // pure underline-style tab, those defaults kept painting — the
      // active "Work" tab was showing the motion.span accent line
      // AND a second line below it from the primitive's after-pseudo
      // shadow leakage. Adding explicit `!bg-transparent !shadow-none
      // !rounded-none after:!opacity-0` strips ALL primitive active
      // chrome so only the motion.span underline (and the bold text)
      // remain.
      className={cn(
        'relative -mb-px !flex-none shrink-0 items-center gap-1.5 !rounded-none !border-0 !bg-transparent px-3 py-1.5 text-base whitespace-nowrap !shadow-none transition-colors after:!opacity-0',
        active
          ? 'font-medium text-text-primary'
          : 'border-b-2 border-transparent text-text-secondary hover:border-divider-deep hover:text-text-primary',
      )}
    >
      {children}
      {active ? (
        <motion.span
          layoutId="client-detail-tab-underline"
          aria-hidden
          className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-accent-default"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      ) : null}
    </TabsTrigger>
  )
}

function ClientWorkPlanPanel({
  obligations,
  isLoading,
  summary: _summary,
  clientName,
  onChangeStatus,
  isStatusChangePending,
}: {
  obligations: readonly ObligationInstancePublic[]
  isLoading: boolean
  // Kept on the props contract for now; the per-summary counts that
  // used to render here as warning/outline chips were retired (see
  // header below). The page-level subtitle already carries the
  // overdue / on-track signal in tone-coded form.
  summary: ClientWorkPlanSummary
  // Threaded down to FilingPlanYearSection so each row can render the
  // canonical status picker (D-6b) and a forward-action button
  // (D-6a). `clientName` is what ObligationQueueStatusControl uses
  // for its aria-label so the picker reads "Change status for
  // Riverbend Draft Client".
  clientName: string
  onChangeStatus: (id: string, status: ObligationStatus) => void
  isStatusChangePending: boolean
}) {
  const { openDrawer: openObligationDrawer } = useObligationDrawer()
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const yearGroups = useMemo(() => groupObligationsByTaxYear(obligations), [obligations])

  // 2026-05-24 (shape — critique P2 power-user pass): sort state
  // lives at the panel level so all year sections share the same
  // sort. Click a header → toggle (asc → desc → null). Default
  // (`field === null`) keeps the API order.
  const [sort, setSort] = useState<FilingPlanSort>({ field: null, dir: 'asc' })
  const cycleSort = useCallback((field: Exclude<FilingPlanSortField, null>) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc') return { field, dir: 'desc' }
      return { field: null, dir: 'asc' }
    })
  }, [])

  // Multi-select state — a Set of obligation ids selected across all
  // year sections. The floating bulk action bar appears when
  // `selectedIds.size > 0`. `selectAllInYear` / `clearSelection`
  // helpers keep year-level controls clean.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const setYearSelection = useCallback((ids: readonly string[], on: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (on) for (const id of ids) next.add(id)
      else for (const id of ids) next.delete(id)
      return next
    })
  }, [])
  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  // Bulk status mutation — same RPC the queue's bulk bar uses, same
  // invalidation set so changes propagate to the queue, dashboard,
  // and this client's filing plan rows.
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const bulkStatusMutation = useMutation(
    orpc.obligations.bulkUpdateStatus.mutationOptions({
      onSuccess: (result, vars) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        toast.success(
          vars.ids.length === 1
            ? t`Status changed to ${v2StatusLabels[vars.status]}`
            : t`${result.updatedCount} deadlines moved to ${v2StatusLabels[vars.status]}`,
        )
        clearSelection()
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
  // 2026-05-24 (re-critique): the filing-plan bulk bar used to fire
  // the status mutation directly on dropdown pick — so a stray year-
  // level checkbox + status click could move dozens of deadlines with
  // zero pre-action signal. Stage the change behind a confirm with
  // the actual count + target status. Reversible, but the click is
  // cheap insurance against accidental cascades.
  const [pendingBulkStatus, setPendingBulkStatus] = useState<{
    status: ObligationStatus
    ids: string[]
  } | null>(null)
  const bulkApplyStatus = useCallback(
    (status: ObligationStatus) => {
      if (selectedIds.size === 0) return
      setPendingBulkStatus({ status, ids: [...selectedIds] })
    },
    [selectedIds],
  )
  // 2026-05-24: the Filing plan heading went through TabSection so it
  // sits on the same h2 / subtitle baseline as every other section
  // header on this client detail page. Subtitle stays factual
  // ("N deadlines across N tax years") — same wording as the sidebar
  // and the Deadlines page so it reads as a year-grouped slice of the
  // same primitive, not a separate concept.
  const subtitle = (
    <>
      <Plural value={obligations.length} one="# deadline" other="# deadlines" />{' '}
      <Trans>across</Trans>{' '}
      <Plural value={yearGroups.length} one="# tax year" other="# tax years" />
    </>
  )
  return (
    <TabSection title={t`Filing plan`} summary={subtitle}>
      {/* 2026-05-26 (Yuqi tab-body follow-ups, Task 3): each year
          section is wrapped in its own framed block using the
          canonical `rounded-md border-divider-regular
          bg-background-default` shape. The column header bar lives
          INSIDE the frame, paired with the rows it legends. This
          replaces the earlier single-column-header-above-all-years
          shape. Trade-off: column legend repeats per year, but each
          section now reads as a self-contained year card and
          scanning year-by-year is much easier when there are 3+
          years of history. (Prior 2026-05-24 Figma-replica pass
          used `bg-background-soft rounded-xl border-subtle`; that
          was the only divergent frame on the page and got snapped
          to canonical 2026-05-26 — see the comment on the year
          section wrapper at FilingPlanYearSection.) */}
      {isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : obligations.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title={<Trans>No deadlines yet</Trans>}
          description={
            <Trans>Run migration or generate rules before this client has due-date work.</Trans>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {yearGroups.map((group) => (
              <FilingPlanYearSection
                key={group.year}
                group={group}
                clientName={clientName}
                sort={sort}
                onCycleSort={cycleSort}
                selectedIds={selectedIds}
                onToggleRow={toggleRow}
                onSetYearSelection={setYearSelection}
                onOpen={(obligationId) => openObligationDrawer(obligationId)}
                onChangeStatus={onChangeStatus}
                isStatusChangePending={isStatusChangePending}
              />
            ))}
          </div>
          {/* Floating bulk-status bar — appears when ≥1 row is selected
              across any year section. Same pattern the queue uses:
              count badge, status picker, clear button. Mounts at the
              bottom of the viewport via fixed positioning so it
              doesn't push the filing plan around when it appears. */}
          {selectedIds.size > 0 ? (
            <FilingPlanBulkBar
              count={selectedIds.size}
              statuses={LIFECYCLE_V2_STATUSES}
              statusLabels={v2StatusLabels}
              isPending={bulkStatusMutation.isPending}
              onApplyStatus={bulkApplyStatus}
              onClear={clearSelection}
            />
          ) : null}
        </>
      )}

      <AlertDialog
        open={pendingBulkStatus !== null}
        onOpenChange={(open) => {
          if (!open) setPendingBulkStatus(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBulkStatus && pendingBulkStatus.ids.length === 1 ? (
                <Trans>Move this deadline to {v2StatusLabels[pendingBulkStatus.status]}?</Trans>
              ) : pendingBulkStatus ? (
                <Trans>
                  Move {pendingBulkStatus.ids.length} deadlines to{' '}
                  {v2StatusLabels[pendingBulkStatus.status]}?
                </Trans>
              ) : null}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                Each row will receive a status-change audit entry. You can move them back through
                the same control if this wasn't intended.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkStatusMutation.isPending || !pendingBulkStatus}
              onClick={() => {
                if (pendingBulkStatus) {
                  bulkStatusMutation.mutate(
                    { ids: pendingBulkStatus.ids, status: pendingBulkStatus.status },
                    {
                      onSettled: () => setPendingBulkStatus(null),
                    },
                  )
                }
              }}
            >
              {bulkStatusMutation.isPending ? (
                <Trans>Moving…</Trans>
              ) : pendingBulkStatus && pendingBulkStatus.ids.length === 1 ? (
                <Trans>Move deadline</Trans>
              ) : (
                <Trans>Move deadlines</Trans>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TabSection>
  )
}

/**
 * Floating bulk-action bar shown when ≥1 filing-plan row is selected.
 *
 * Modelled after the obligations queue's bulk bar — fixed-position at
 * the bottom centre of the viewport, count badge on the left, status
 * picker in the middle, clear button on the right. Renders nothing
 * when count === 0 (caller gates).
 */
function FilingPlanBulkBar({
  count,
  statuses,
  statusLabels,
  isPending,
  onApplyStatus,
  onClear,
}: {
  count: number
  statuses: readonly ObligationStatus[]
  statusLabels: Record<ObligationStatus, string>
  isPending: boolean
  onApplyStatus: (status: ObligationStatus) => void
  onClear: () => void
}) {
  const { t } = useLingui()
  return (
    <div
      role="region"
      aria-label={t`Bulk actions`}
      className="pointer-events-none fixed inset-x-0 bottom-10 z-30 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-divider-regular bg-background-default px-3 py-1.5 shadow-lg">
        <span className="text-xs font-medium tabular-nums text-text-primary">
          <Plural value={count} one="# selected" other="# selected" />
        </span>
        <span className="h-4 w-px bg-divider-regular" aria-hidden />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" disabled={isPending}>
                <Trans>Move to status</Trans>
                <ChevronDownIcon className="size-3.5" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="center" className="min-w-[200px]">
            {statuses.map((status) => (
              <DropdownMenuItem key={status} onClick={() => onApplyStatus(status)}>
                {statusLabels[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="h-4 w-px bg-divider-regular" aria-hidden />
        <Button variant="ghost" size="sm" onClick={onClear}>
          <Trans>Clear</Trans>
        </Button>
      </div>
    </div>
  )
}

// Per-tax-year section in the Filing plan panel. Rendered once per year
// bucket; current tax year sits at the top with a CURRENT TAX YEAR chip.
//
// 2026-05-22 hierarchy pass:
//  - Year number reads as a clear section heading (text-base, tabular)
//  - Chip + counts cluster CLOSE to the year, not pushed to the far
//    edge with `ml-auto`. Wide-screen content shouldn't be split at the
//    two ends of a row — that orphans the heading.
function FilingPlanYearSection({
  group,
  clientName,
  sort,
  onCycleSort,
  selectedIds,
  onToggleRow,
  onSetYearSelection,
  onOpen,
  onChangeStatus,
  isStatusChangePending,
}: {
  group: FilingPlanYearGroup
  clientName: string
  sort: FilingPlanSort
  onCycleSort: (field: Exclude<FilingPlanSortField, null>) => void
  selectedIds: Set<string>
  onToggleRow: (id: string) => void
  onSetYearSelection: (ids: readonly string[], on: boolean) => void
  onOpen: (obligationId: string) => void
  onChangeStatus: (id: string, status: ObligationStatus) => void
  isStatusChangePending: boolean
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const statusPickerLabels = useLifecycleV2StatusLabels()
  // Apply panel-level sort to this year's obligations. When sort is
  // null (default), order matches whatever the API returned.
  const sortedObligations = useMemo(
    () => sortObligations(group.obligations, sort),
    [group.obligations, sort],
  )
  // Year-level selection state — derives directly from the panel's
  // Set so check / partial / unchecked stays in sync. `partial` means
  // some but not all rows in this year are selected.
  const yearIds = useMemo(() => group.obligations.map((o) => o.id), [group.obligations])
  const yearSelectedCount = useMemo(
    () => yearIds.filter((id) => selectedIds.has(id)).length,
    [yearIds, selectedIds],
  )
  const yearAllSelected = yearSelectedCount === yearIds.length && yearIds.length > 0
  const yearSomeSelected = yearSelectedCount > 0 && !yearAllSelected
  const toggleYear = useCallback(() => {
    onSetYearSelection(yearIds, !yearAllSelected)
  }, [onSetYearSelection, yearIds, yearAllSelected])
  // 2026-05-24 (Figma replica pass): year section originally snapped
  // to the pixel-exact frame from the Figma Make export
  // (`bg-background-soft` + `rounded-xl` + inset hairline).
  // 2026-05-26 (Yuqi post-revamp critique P1 / §3.5 — tab section-
  // frame unification): frame swapped to the canonical
  // `bg-background-default rounded-md border-divider-regular` so
  // the Work tab's year panels read identically to the section
  // frames in Client info, Discover, and Activity. The previous
  // `rounded-xl bg-background-soft border-subtle` was the only
  // divergent frame on the page — left over from the pre-canonical
  // pixel-replica pass. Inset-surface canonical (rounded-md +
  // bg-default) is the system-level rule; per-page Figma replicas
  // should respect it.
  //   - Year header row: year + `· current year` italic marker +
  //     the "N open filing" badge. Same row paddings (`px-3 py-3`)
  //     as the original.
  //   - Column header bar: still bg-gray-soft inside the frame so
  //     it reads as the section's legend.
  //   - Row cells: 12px text + rule pill unchanged.
  const isUnknown = group.year === 'unknown'
  return (
    <div className="overflow-hidden rounded-md border border-divider-regular bg-background-default">
      {/* Year header bar.
          2026-05-26 (Yuqi feedback #9 + #10 — "感觉很难发现 / 没有看出
          来这是 header"): bumped the year-section header from
          text-sm to text-base font-semibold + soft section tint
          (bg-background-subtle) + border-b to set it apart from the
          rows below. Reads now as a real section header / group
          banner rather than as the first row of the table. Matches
          the section-heading scale used by the TabSection primitive
          (page-family-canonical §9). */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-divider-subtle bg-background-subtle px-3 py-2.5">
        <span className="text-base font-semibold leading-6 tabular-nums text-text-primary">
          {isUnknown ? <Trans>No tax year</Trans> : group.year}
        </span>
        {group.isCurrent ? (
          <span className="text-xs leading-4 text-text-tertiary">
            <Trans>· current year</Trans>
          </span>
        ) : null}
        {group.openCount > 0 ? (
          // 2026-05-24 (design-system audit): the current-year pill used
          // a raw `bg-[var(--color-util-colors-blue-100,#dbeafe)]` arbitrary
          // value with a hex fallback — bypassing the design tokens. The
          // `components-badge-bg-blue-soft` + `text-text-accent` pair is
          // the same color treatment the Badge `info` variant uses;
          // routing through it means a theme-level blue change updates
          // here too. Square-corner shape preserved (Badge defaults to
          // fully rounded, this stays a soft-corner tag for visual
          // distinction from the filing-plan row pills above).
          <span
            className={cn(
              'inline-flex items-center rounded px-2 py-0.5 text-xs leading-4',
              group.isCurrent
                ? 'bg-components-badge-bg-blue-soft text-text-accent'
                : 'bg-background-default text-text-tertiary',
            )}
          >
            <Plural value={group.openCount} one="# open filing" other="# open filings" />
          </span>
        ) : null}
        {group.extendedCount > 0 ? (
          <span className="text-xs leading-4 text-text-tertiary">
            <Trans>{group.extendedCount} extended</Trans>
          </span>
        ) : null}
      </div>
      {/* Column header bar — sits flush against the rows so the
          header looks like the table's legend, not a separate
          frame inside the year section.

          2026-05-24 (clarify — critique): added `title` tooltips to
          Internal vs Official so first-timer CPAs don't have to guess
          which is which. (Many firms use both terms but with different
          meanings — explicit tooltip > assumed convention.)

          2026-05-24 (shape — critique): header cells are now real
          sort buttons. Click cycles asc → desc → no sort. Active
          sort surfaces a small chevron. The leading slot is now a
          year-level select-all checkbox. */}
      {/* 2026-05-26 (Yuqi /clients/[id] feedback #9): column-header
          band uses the canonical workbench-table head treatment —
          `bg-background-subtle` + `text-sm` + `text-text-secondary`
          so it reads as a real column-header band, not a quiet
          eyebrow row. Matches the TableHeader primitive's defaults. */}
      <div className="flex items-center gap-2 border-y border-divider-subtle bg-background-subtle px-3 py-2 text-sm font-medium leading-5 text-text-secondary">
        <span className="w-5 shrink-0">
          <Checkbox
            checked={yearAllSelected}
            indeterminate={yearSomeSelected}
            onCheckedChange={toggleYear}
            aria-label={t`Select all deadlines in this year`}
            className="size-4"
          />
        </span>
        <FilingPlanSortHeader
          className="flex-1"
          active={sort.field === 'form'}
          dir={sort.dir}
          onClick={() => onCycleSort('form')}
        >
          <Trans>Form</Trans>
        </FilingPlanSortHeader>
        <FilingPlanSortHeader
          className="w-[120px]"
          active={sort.field === 'internal'}
          dir={sort.dir}
          title={t`The firm-side soft target — when this filing should be ready internally for the deadline window`}
          onClick={() => onCycleSort('internal')}
        >
          <Trans>Internal deadline</Trans>
        </FilingPlanSortHeader>
        <FilingPlanSortHeader
          className="w-[120px]"
          active={sort.field === 'official'}
          dir={sort.dir}
          title={t`The IRS / state statutory due date — the hard deadline the filing must be submitted by`}
          onClick={() => onCycleSort('official')}
        >
          <Trans>Official deadline</Trans>
        </FilingPlanSortHeader>
        <FilingPlanSortHeader
          className="w-[120px]"
          active={sort.field === 'status'}
          dir={sort.dir}
          // 2026-05-26 (Yuqi /clients/[id] feedback #3 — "where does
          // this status come from?"): hover title explains the data
          // source. The status is the deadline's lifecycle state
          // (Not started / In review / Filed / etc.) stored on each
          // obligation row — the same pill drives /deadlines table +
          // the obligation drawer header. Clicking the pill in any
          // row picks a new status; the change writes back to that
          // single obligation.
          title={t`The deadline's lifecycle state. Click any row's pill to change its status — the same control as on /deadlines and inside the obligation drawer.`}
          onClick={() => onCycleSort('status')}
        >
          <Trans>Status</Trans>
        </FilingPlanSortHeader>
        {/* 2026-05-26 (Yuqi feedback #8 — "右边panel展开时 form
            看不见了。可以不显示 estimated tax"): Estimated Tax column
            retired from the filing-plan view. When the right panel
            opens, the left column shrinks to ~430px; with 5 columns
            (Form / Internal / Official / Status / Estimated Tax) the
            FORM cell gets squeezed below readable width. The
            estimated-tax figure is still available inside the
            obligation drawer's Summary tab; the table view stays as a
            quick-scan grid. */}
        {/* 2026-05-26 (Stripe Phase B per-row ⋯): trailing slot for
            the per-row actions menu. Width matches the size-7 trigger
            below so the column header line stays aligned. */}
        <span className="w-7 shrink-0" aria-hidden />
      </div>
      {/* Rows — flat list against the section frame, each separated
          by a `#f3f4f6` hairline. Last row has no border-b.

          2026-05-24 (shape — critique): rows now use `sortedObligations`
          (panel-level sort applied). The leading "N" badge was
          replaced with a per-row selection checkbox so the same slot
          carries the multi-select affordance the bulk bar reads from. */}
      <div className="bg-background-default">
        {sortedObligations.map((obligation, rowIndex) => {
          // `hasEstimate` retired with the Estimated Tax column (Yuqi feedback #8).
          const isLast = rowIndex === sortedObligations.length - 1
          const isSelected = selectedIds.has(obligation.id)
          return (
            // 2026-05-24 (audit — critique P2 a11y): row dropped
            // `role="link"` + `tabIndex={0}` + `onKeyDown`. The
            // previous shape made the row a focusable link AND
            // nested two real buttons inside it (checkbox + status
            // pill) — a nested-interactive violation that screen
            // readers can't render sensibly. The keyboard-activation
            // path moved to the form-code cell (now a real <button>)
            // so SRs get one unambiguous "Open 1120-S" target
            // without removing the mouse click-anywhere ergonomic.
            <div
              key={obligation.id}
              className={cn(
                // 2026-05-26 (Stripe Phase A — /bolder): bumped row
                // height from py-2 (~36px) to min-h-14 (56px) so the
                // filing-plan grid carries the same generous row scan
                // density Stripe's transaction tables use. The
                // tap-target and visual rhythm match the /clients
                // list (h-14) and /rules/library (h-14) rows.
                'group/row flex min-h-14 cursor-pointer items-center gap-2 px-3 py-2 transition-colors hover:bg-state-base-hover',
                isSelected && 'bg-state-accent-hover-alt',
                !isLast && 'border-b border-divider-subtle',
              )}
              onClick={() => onOpen(obligation.id)}
            >
              {/* Per-row selection checkbox. Click stops propagation
                  so toggling selection doesn't also open the drawer.
                  The leading "N" row index was retired here — its
                  visual weight read like a priority signal it didn't
                  actually carry, and the row already has the form
                  code as its anchor. */}
              <span
                className="w-5 shrink-0"
                onClick={(event) => event.stopPropagation()}
                // 2026-05-24 (interaction audit): Escape MUST bubble to
                // the parent Dialog/Sheet close handler. The previous
                // shape stopped every key including Escape, so users
                // hitting Esc inside a checkbox-focused row couldn't
                // close the drawer above it.
                onKeyDown={(event) => {
                  if (event.key === 'Escape') return
                  event.stopPropagation()
                }}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleRow(obligation.id)}
                  aria-label={t`Select ${formatTaxCode(obligation.taxType)}`}
                  className="size-4"
                />
              </span>
              {/* Form code cell is the row's keyboard-focusable
                  open-row target. Tab brings the user here; Enter /
                  Space opens the drawer. Mouse users still click
                  anywhere on the row (the parent div's onClick). */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onOpen(obligation.id)
                }}
                aria-label={t`Open ${formatTaxCode(obligation.taxType)} due ${formatDate(obligation.currentDueDate)}`}
                // 2026-05-26 (Yuqi /clients/[id] feedback #5 — "is
                // this the correct size, as we have the title in the
                // table on Deadlines?"): bumped form-code from
                // `text-xs` → `text-sm`. The filing-plan row IS the
                // primary identity anchor in this nested table, same
                // role the /deadlines row title plays in the queue.
                // text-sm reads as a real row title (not a footnote)
                // while still sitting one notch below the page-level
                // /deadlines canonical (`text-base`) since this lives
                // inside a tab body, not a top-level workbench surface.
                className="min-w-0 flex-1 truncate rounded-sm text-left text-sm font-medium leading-5 text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                {/* 2026-05-26: plain label here. The filing-plan row is
                    already the interactive target, so the tax-code help
                    tooltip/cursor reads as a stray hover affordance. */}
                <TaxCodeLabel code={obligation.taxType} tooltip={false} />
              </button>
              <span className="flex w-[120px] items-baseline gap-1.5 text-xs leading-4 tabular-nums text-text-primary">
                {formatDate(obligation.currentDueDate)}
                {/* 2026-05-24 (critique /polish — clarify): when an
                    extension is on file, the row's Internal/Current
                    deadline legitimately lands AFTER the Official one
                    (the row was extended). Add a tiny "ext." chip so
                    a CPA scanning the column understands the date
                    ordering without having to read the section-level
                    "N extended" badge and infer which row it points
                    at. Tooltip carries the verbose explanation. */}
                {obligation.extensionState === 'filed' ||
                obligation.extensionState === 'accepted' ? (
                  <span
                    title={t`This row's deadline has been extended. The Official Deadline column shows the original statutory date; the Internal Deadline reflects the new post-extension target.`}
                    className="rounded-sm bg-components-badge-bg-blue-soft px-1 py-0 text-caption-xs font-medium leading-4 text-text-accent"
                  >
                    ext.
                  </span>
                ) : null}
              </span>
              <span className="w-[120px] text-xs leading-4 tabular-nums text-text-primary">
                {formatDate(obligation.filingDueDate ?? obligation.currentDueDate)}
              </span>
              <span className="w-[120px]">
                <ObligationQueueStatusControl
                  row={{ id: obligation.id, status: obligation.status, clientName }}
                  labels={statusPickerLabels}
                  statuses={LIFECYCLE_V2_STATUSES}
                  disabled={isStatusChangePending}
                  onChange={onChangeStatus}
                />
              </span>
              {/* 2026-05-26 (Yuqi feedback #8): Estimated Tax cell
                  dropped with the column. Inline tax figure now
                  surfaces only in the obligation drawer (Summary tab). */}
              {/* 2026-05-26 (Stripe Phase B per-row ⋯): canonical
                  row-action menu. Hover-revealed so the row reads
                  clean at rest. Exposes obligation-level actions that
                  aren't already first-class controls on the row
                  (the status pill + form-code button already cover
                  the primary actions). */}
              <RowActionsMenu
                label={t`Actions for ${formatTaxCode(obligation.taxType)}`}
                items={[
                  {
                    label: t`Open obligation`,
                    icon: EyeIcon,
                    onSelect: () => onOpen(obligation.id),
                  },
                  {
                    label: t`View in Deadlines`,
                    icon: ExternalLinkIcon,
                    onSelect: () => {
                      void navigate(`/deadlines?obligation=${obligation.id}`)
                    },
                  },
                  {
                    label: t`Copy obligation ID`,
                    icon: LinkIcon,
                    onSelect: () => {
                      if (typeof window === 'undefined') return
                      try {
                        void window.navigator.clipboard?.writeText(obligation.id)
                      } catch {
                        // Clipboard can throw in sandboxed iframes.
                        // Silent fail — the action is non-critical.
                      }
                    },
                  },
                ]}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Active alerts affecting this specific client. Pulse matches +
 * extension-without-payment warnings live here. The old
 * `ClientAlertsBand` lumped these together with missing-facts into a
 * single warning strip — D-3 split them apart:
 *
 *  - **Missing facts** (page setup gap) → inline chip in the header
 *    (rendered next to identity chips). It's a *configuration*
 *    problem, not an *in-flight* alert.
 *  - **Active alerts** (this component) → a labeled section with a
 *    count, individual cards per alert. These are in-flight signals
 *    the CPA needs to act on right now.
 *
 * The visual treatment matches the reference design Yuqi shared
 * (`📢 ACTIVE ALERTS FOR THIS CLIENT · N` + per-alert cards). When
 * nothing is active, the whole section disappears.
 */
function ClientActiveAlertsSection({
  pulseMatches,
  extensionPaymentMismatches,
}: {
  pulseMatches: readonly ClientPulseMatch[]
  extensionPaymentMismatches: readonly ObligationInstancePublic[]
}) {
  const totalCount = pulseMatches.length + extensionPaymentMismatches.length
  if (totalCount === 0) return null
  return (
    <section
      aria-label="Active alerts for this client"
      className="rounded-md border border-divider-regular bg-background-default p-4"
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-divider-subtle bg-components-badge-bg-warning-soft/40 px-4 py-2.5">
        {/* 2026-05-26 (Yuqi macro→micro audit, Fix #7 / §3.3): retired
            uppercase kicker; canonical section heading is sm-semibold
            sentence-case (page-family-canonical §9). */}
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-text-warning">
          <MegaphoneIcon className="size-3.5" aria-hidden />
          <Trans>Active alerts for this client</Trans>
        </h3>
        <span className="text-xs tabular-nums text-text-tertiary">{totalCount}</span>
      </header>
      <ul className="divide-y divide-divider-subtle">
        {pulseMatches.map((match) => (
          <li key={match.alertId}>
            <ClientActiveAlertsPulseCard match={match} />
          </li>
        ))}
        {extensionPaymentMismatches.length > 0 ? (
          <li>
            <ClientActiveAlertsExtensionCard obligations={extensionPaymentMismatches} />
          </li>
        ) : null}
      </ul>
    </section>
  )
}

function ClientActiveAlertsPulseCard({ match }: { match: ClientPulseMatch }) {
  // `ClientPulseMatch` doesn't carry a jurisdiction code today (the
  // server-side model returns `source` as a free-text label like
  // "Pennsylvania Department of Revenue"). Show the tax code as the
  // leading chip so the CPA sees what kind of filing is affected;
  // source goes on the secondary line. If a future schema iteration
  // adds a jurisdiction column, the chip becomes the 2-letter state.
  return (
    <div className="flex flex-wrap items-start gap-3 px-4 py-3">
      <Badge variant="secondary" className="rounded-sm uppercase">
        {formatTaxCode(match.taxType)}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{match.title}</p>
        <p className="mt-0.5 text-xs text-text-tertiary">{match.source}</p>
      </div>
      <Button variant="ghost" size="sm" render={<Link to="/rules/pulse" />}>
        <Trans>Review</Trans>
        <ChevronRightIcon data-icon="inline-end" aria-hidden />
      </Button>
    </div>
  )
}

function ClientActiveAlertsExtensionCard({
  obligations,
}: {
  obligations: readonly ObligationInstancePublic[]
}) {
  const taxTypes = Array.from(new Set(obligations.map((row) => formatTaxCode(row.taxType)))).slice(
    0,
    3,
  )
  return (
    <div className="flex flex-wrap items-start gap-3 px-4 py-3">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-text-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">
          {obligations.length === 1 ? (
            <Trans>1 filing extended — payment is NOT extended</Trans>
          ) : (
            <Trans>{obligations.length} filings extended — payment is NOT extended</Trans>
          )}
        </p>
        <p className="mt-0.5 text-xs text-text-tertiary">{taxTypes.join(' · ')}</p>
      </div>
    </div>
  )
}

/**
 * Overflow menu (`···`) in the header action cluster. Hosts the
 * lower-priority actions that don't belong on the primary button row.
 *
 * Today there's one real action: **View audit log** (routes to
 * `/audit` filtered by this client). Previously the menu also listed
 * **Pin to sidebar**, **Download client PDF**, and **Edit client
 * info** as "coming soon" toasts — Yuqi flagged those as dead
 * affordances on 2026-05-24 ("don't put nonworking things"). They've
 * been removed until the real implementations land.
 *
 * If the user can't read audit logs the whole dropdown collapses
 * (returns `null`) so we don't render an empty `···` button.
 */
function ClientHeaderOverflowMenu({
  clientId,
  clientName,
  canReadAudit,
  onArchive,
}: {
  clientId: string
  clientName: string
  canReadAudit: boolean
  onArchive: () => void
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  // 2026-05-26 (Yuqi macro→micro audit, Fix #4 / §2.3): Archive moved
  // INSIDE the ⋯ overflow per canonical (≤2 outline buttons + no
  // destructive in the visible cluster). The menu used to gate on
  // `canReadAudit` and disappear entirely when the user lacked audit
  // — now Archive is always available so the menu renders, with the
  // audit-log entry conditionally shown.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          // 2026-05-26 (Yuqi feedback #2 — "icon button 怎么不是正方形"):
          // switched from size="sm" (which sets h-8 with horizontal padding,
          // producing a rectangle) to size="icon-sm" (h-8 w-8, true square).
          <Button variant="outline" size="icon-sm" aria-label={t`More client actions`}>
            <MoreHorizontalIcon className="size-4" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[220px]">
        {canReadAudit ? (
          <DropdownMenuItem
            onClick={() => void navigate(`/audit?entityId=${clientId}&entityType=client`)}
          >
            <ScrollTextIcon className="size-4" aria-hidden />
            <Trans>View audit log</Trans>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={onArchive}
          aria-label={t`Archive ${clientName}`}
          className="text-state-warning-text"
        >
          <ArchiveIcon className="size-4" aria-hidden />
          <Trans>Archive client</Trans>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ClientActivityPanel({
  events,
  canReadAudit,
  isLoading,
  firmTimezone,
}: {
  events: readonly AuditEventPublic[]
  canReadAudit: boolean
  isLoading: boolean
  firmTimezone: string
}) {
  const actionLabels = useAuditActionLabels()

  if (!canReadAudit) {
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title={<Trans>Audit access is role-gated</Trans>}
        description={<Trans>Owners, managers, and preparers can inspect client activity.</Trans>}
      />
    )
  }
  if (isLoading) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }
  if (events.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title={<Trans>No audited client changes yet</Trans>}
        description={
          <Trans>Future edits to facts, risk profile, or deletion will appear here.</Trans>
        }
      />
    )
  }
  // 2026-05-26 (Yuqi tab-body follow-ups, Task 3 — Activity tab
  // section-frame unification): rows used to be individual
  // `rounded-md border bg-background-section` cards inside a grid
  // gap. That gave the Activity log a third visual dialect on the
  // Activity tab (vs AI summary's outer-frame + Notes' outer-frame).
  // Snapped to the canonical pattern: ONE outer canonical frame
  // (`rounded-md border-divider-regular bg-background-default`)
  // with `divide-y` between rows. Now matches the AI summary +
  // Notes treatment on the same tab, and the page-family-canonical
  // §9 rule (one section, one frame).
  return (
    <div className="overflow-hidden rounded-md border border-divider-regular bg-background-default">
      <ul className="divide-y divide-divider-subtle">
        {events.map((event) => (
          <li key={event.id} className="grid gap-1 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-text-primary">
                {formatAuditActionLabel(event.action, actionLabels)}
              </span>
              <span className="text-xs tabular-nums text-text-tertiary">
                {formatDateTimeWithTimezone(event.createdAt, firmTimezone)}
              </span>
            </div>
            <p className="text-xs text-text-tertiary">
              {event.actorLabel ?? event.actorId ?? 'System'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function importanceLabel(value: number): ReactNode {
  if (value === 3) return <Trans>High</Trans>
  if (value === 1) return <Trans>Low</Trans>
  return <Trans>Medium</Trans>
}

function importanceSelectValue(value: number): '1' | '2' | '3' {
  if (value === 1) return '1'
  if (value === 3) return '3'
  return '2'
}

function ClientJurisdictionPanel({
  client,
  isSaving,
  onSave,
}: {
  client: ClientPublic
  isSaving: boolean
  onSave: (input: ClientFilingProfilesReplaceInput) => void
}) {
  const { t } = useLingui()
  const primaryProfile =
    client.filingProfiles.find((profile) => profile.isPrimary) ?? client.filingProfiles[0] ?? null
  const [statesText, setStatesText] = useState(getClientFilingStates(client).join(', '))
  const [countiesText, setCountiesText] = useState(
    (primaryProfile?.counties ?? (client.county ? [client.county] : [])).join(', '),
  )
  const normalizedStates = Array.from(
    new Set(
      statesText
        .split(/[;,|]/)
        .map((state) => state.trim().toUpperCase())
        .filter(Boolean),
    ),
  )
  const normalizedCounties = Array.from(
    new Set(
      countiesText
        .split(/[;,|]/)
        .map((county) => county.trim())
        .filter(Boolean),
    ),
  )
  const stateInvalid = normalizedStates.some((state) => !STATE_CODE_RE.test(state))
  const countyInvalid = normalizedCounties.some((county) => county.length > 120)
  const profileByState = new Map(client.filingProfiles.map((profile) => [profile.state, profile]))
  const nextProfiles = normalizedStates.map((state, index) => {
    const existing = profileByState.get(state)
    return {
      state,
      counties: index === 0 ? normalizedCounties : (existing?.counties ?? []),
      taxTypes: existing?.taxTypes ?? [],
      isPrimary: index === 0,
      source: 'manual' as const,
    }
  })
  const currentSignature = JSON.stringify(
    client.filingProfiles
      .map((profile) => ({
        state: profile.state,
        counties: profile.counties,
        taxTypes: profile.taxTypes,
        isPrimary: profile.isPrimary,
      }))
      .toSorted((a, b) => a.state.localeCompare(b.state)),
  )
  const nextSignature = JSON.stringify(
    nextProfiles
      .map((profile) => ({
        state: profile.state,
        counties: profile.counties,
        taxTypes: profile.taxTypes,
        isPrimary: profile.isPrimary,
      }))
      .toSorted((a, b) => a.state.localeCompare(b.state)),
  )
  const hasChanges = currentSignature !== nextSignature

  const cancelEdit = () => {
    setStatesText(getClientFilingStates(client).join(', '))
    setCountiesText((primaryProfile?.counties ?? (client.county ? [client.county] : [])).join(', '))
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3">
        <Field>
          <FieldLabel htmlFor="client-jurisdiction-states">
            <Trans>Filing states</Trans>
          </FieldLabel>
          <Input
            id="client-jurisdiction-states"
            className="uppercase tabular-nums"
            placeholder="WA, CA"
            value={statesText}
            aria-invalid={stateInvalid}
            onChange={(event) => setStatesText(event.target.value.toUpperCase())}
          />
          {stateInvalid ? <FieldError>{t`Use 2-letter state codes`}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="client-jurisdiction-counties">
            <Trans>Primary counties</Trans>
          </FieldLabel>
          <Input
            id="client-jurisdiction-counties"
            value={countiesText}
            aria-invalid={countyInvalid}
            onChange={(event) => setCountiesText(event.target.value)}
          />
          {countyInvalid ? (
            <FieldError>{t`Each county must be 120 characters or fewer`}</FieldError>
          ) : null}
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!hasChanges || stateInvalid || countyInvalid || isSaving}
          onClick={() => {
            onSave({
              id: client.id,
              profiles: nextProfiles,
              reason: 'Fact profile filing jurisdiction edit',
            })
          }}
        >
          {isSaving ? t`Saving…` : t`Save`}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} disabled={isSaving}>
          <Trans>Cancel</Trans>
        </Button>
      </div>
    </div>
  )
}

function ClientRiskInputsPanel({
  client,
  isSaving,
  onSave,
}: {
  client: ClientPublic
  isSaving: boolean
  onSave: (input: { id: string; importanceWeight: number; lateFilingCountLast12mo: number }) => void
}) {
  const { t } = useLingui()
  const [importanceWeight, setImportanceWeight] = useState<'1' | '2' | '3'>(
    importanceSelectValue(client.importanceWeight),
  )
  const [lateFilingCount, setLateFilingCount] = useState(String(client.lateFilingCountLast12mo))
  const lateFilingNumber = Number(lateFilingCount)
  const lateFilingInvalid =
    !/^\d+$/.test(lateFilingCount.trim()) || lateFilingNumber < 0 || lateFilingNumber > 99
  const hasChanges =
    Number(importanceWeight) !== client.importanceWeight ||
    lateFilingNumber !== client.lateFilingCountLast12mo

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel>
            <Trans>Importance</Trans>
          </FieldLabel>
          <Select
            value={importanceWeight}
            onValueChange={(value) => {
              if (value === '1' || value === '2' || value === '3') setImportanceWeight(value)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{importanceLabel(Number(importanceWeight))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="1">
                  <Trans>Low</Trans>
                </SelectItem>
                <SelectItem value="2">
                  <Trans>Medium</Trans>
                </SelectItem>
                <SelectItem value="3">
                  <Trans>High</Trans>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="risk-late-filing-count">
            <Trans>Late filings, 12mo</Trans>
          </FieldLabel>
          <Input
            id="risk-late-filing-count"
            type="number"
            min={0}
            max={99}
            className="tabular-nums"
            value={lateFilingCount}
            aria-invalid={lateFilingInvalid}
            onChange={(event) => setLateFilingCount(event.target.value)}
          />
          {lateFilingInvalid ? <FieldError>{t`Use a whole number from 0 to 99`}</FieldError> : null}
        </Field>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={!hasChanges || lateFilingInvalid || isSaving}
        onClick={() =>
          onSave({
            id: client.id,
            importanceWeight: Number(importanceWeight),
            lateFilingCountLast12mo: lateFilingNumber,
          })
        }
      >
        {isSaving ? t`Saving…` : t`Save risk profile`}
      </Button>
    </div>
  )
}

function ClientRiskSummaryPanel({
  insight,
  isLoading,
  canRefresh,
}: {
  insight: AiInsightPublic | null
  isLoading: boolean
  canRefresh: boolean
}) {
  // 2026-05-26 (Yuqi /clients/[id] feedback #6+#7 — "pull the
  // badge + Refresh out to the TabSection title row; drop the bar"):
  // panel signature trimmed. The status badge + Refresh button + the
  // standalone header bar that hosted them are gone from this body;
  // the parent TabSection's `actions` slot now renders them next to
  // the section title.
  return (
    <div className="grid gap-3">
      {isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : insight ? (
        // 2026-05-26 (Yuqi feedback #6+#7): inline "Refreshed [date]"
        // line dropped — the parent TabSection's `summary` slot already
        // shows that same timestamp next to the section title.
        <div className="grid gap-3">
          {insight.sections.map((section) => (
            <InsightSection key={section.key} section={section} insight={insight} />
          ))}
        </div>
      ) : (
        // 2026-05-26 (Yuqi tab-body follow-ups, Task 2 / Fix #10):
        // canonical EmptyState replaces a silent `null` return. The
        // panel used to render the refresh button + nothing else when
        // no insight existed yet, which left the section looking
        // broken. Empty state explains the surface and tells the user
        // what to expect.
        <EmptyState
          icon={SparklesIcon}
          title={<Trans>No client summary yet</Trans>}
          description={
            canRefresh ? (
              <Trans>
                Run the AI summary to surface penalty exposure, recent activity, and tax-attribute
                flags in one paragraph.
              </Trans>
            ) : (
              <Trans>Upgrade to Practice AI to surface a one-paragraph client summary.</Trans>
            )
          }
        />
      )}
    </div>
  )
}

function InsightStatusBadge({ status }: { status: AiInsightPublic['status'] }) {
  if (status === 'ready') {
    return (
      <Badge variant="success" className="text-xs">
        <Trans>Ready</Trans>
      </Badge>
    )
  }
  if (status === 'failed') {
    return (
      <Badge variant="warning" className="text-xs">
        <Trans>Failed</Trans>
      </Badge>
    )
  }
  if (status === 'stale') {
    return (
      <Badge variant="info" className="text-xs">
        <Trans>Stale</Trans>
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-xs">
      <Trans>Pending</Trans>
    </Badge>
  )
}

function InsightSection({
  section,
  insight,
}: {
  section: AiInsightPublic['sections'][number]
  insight: AiInsightPublic
}) {
  const citations = insight.citations.filter((citation) =>
    section.citationRefs.includes(citation.ref),
  )
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-text-primary">{section.label}</p>
      <p className="text-sm text-text-secondary">{section.text}</p>
      {citations.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {citations.map((citation) => (
            <InsightSourceChip key={citation.ref} citation={citation} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function InsightSourceChip({ citation }: { citation: AiInsightPublic['citations'][number] }) {
  const label = citation.evidence?.sourceId ?? citation.evidence?.sourceType ?? `#${citation.ref}`
  const chip = (
    <Badge variant="outline" className="max-w-full truncate text-xs">
      [{citation.ref}] {label}
    </Badge>
  )
  return citation.evidence?.sourceUrl ? (
    <a href={citation.evidence.sourceUrl} target="_blank" rel="noreferrer" className="max-w-full">
      {chip}
    </a>
  ) : (
    chip
  )
}

function ClientFactChecklist({
  client,
  readiness,
}: {
  client: ClientPublic
  readiness: ClientReadiness | undefined
}) {
  return (
    <div className="grid gap-2">
      <FactCheckRow
        isComplete={!readiness?.missingRequiredFacts.includes('state')}
        label={<Trans>Filing jurisdiction</Trans>}
        detail={<Trans>Required for rules and Pulse matching.</Trans>}
      />
      <FactCheckRow
        isComplete={!readiness?.missingRequiredFacts.includes('entityType')}
        label={<Trans>Entity type</Trans>}
        detail={<Trans>Required for rule applicability.</Trans>}
      />
      <FactCheckRow
        isComplete={Boolean(client.ein)}
        label={<Trans>EIN</Trans>}
        detail={<Trans>Improves identity matching and audit review.</Trans>}
      />
      <FactCheckRow
        isComplete={Boolean(client.assigneeName)}
        label={<Trans>Owner</Trans>}
        detail={<Trans>Keeps deadline follow-up accountable.</Trans>}
      />
    </div>
  )
}

function ClientSourceDetailsPanel({
  client,
  showSourceFields,
  isSaving,
  onSave,
}: {
  client: ClientPublic
  showSourceFields: boolean
  isSaving: boolean
  onSave: (input: ClientSourceDetailsUpdateInput) => void
}) {
  const [externalClientId, setExternalClientId] = useState(client.externalClientId ?? '')
  const [sourceStatus, setSourceStatus] = useState(client.sourceStatus ?? '')
  const [addressLine1, setAddressLine1] = useState(client.addressLine1 ?? '')
  const [city, setCity] = useState(client.city ?? '')
  const [postalCode, setPostalCode] = useState(client.postalCode ?? '')
  const [primaryPhone, setPrimaryPhone] = useState(client.primaryPhone ?? '')
  const currentValues = {
    externalClientId: client.externalClientId ?? '',
    sourceStatus: client.sourceStatus ?? '',
    addressLine1: client.addressLine1 ?? '',
    city: client.city ?? '',
    postalCode: client.postalCode ?? '',
    primaryPhone: client.primaryPhone ?? '',
  }
  const nextValues = {
    externalClientId,
    sourceStatus,
    addressLine1,
    city,
    postalCode,
    primaryPhone,
  }
  const hasChanges =
    nextValues.externalClientId.trim() !== currentValues.externalClientId ||
    nextValues.sourceStatus.trim() !== currentValues.sourceStatus ||
    nextValues.addressLine1.trim() !== currentValues.addressLine1 ||
    nextValues.city.trim() !== currentValues.city ||
    nextValues.postalCode.trim() !== currentValues.postalCode ||
    nextValues.primaryPhone.trim() !== currentValues.primaryPhone
  const reset = () => {
    setExternalClientId(currentValues.externalClientId)
    setSourceStatus(currentValues.sourceStatus)
    setAddressLine1(currentValues.addressLine1)
    setCity(currentValues.city)
    setPostalCode(currentValues.postalCode)
    setPrimaryPhone(currentValues.primaryPhone)
  }
  const save = () => {
    onSave({
      id: client.id,
      ...(showSourceFields
        ? {
            externalClientId: nullableTrim(externalClientId),
            sourceStatus: nullableTrim(sourceStatus),
          }
        : {}),
      addressLine1: nullableTrim(addressLine1),
      city: nullableTrim(city),
      postalCode: nullableTrim(postalCode),
      primaryPhone: nullableTrim(primaryPhone),
      reason: 'Client info source and contact details edit',
    })
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {showSourceFields ? (
          <>
            <ClientSourceDetailsField
              id="client-source-external-id"
              label={<Trans>External client ID</Trans>}
              value={externalClientId}
              onChange={setExternalClientId}
            />
            <ClientSourceDetailsField
              id="client-source-status"
              label={<Trans>Source status</Trans>}
              value={sourceStatus}
              onChange={setSourceStatus}
            />
          </>
        ) : null}
        <ClientSourceDetailsField
          id="client-source-address-line-1"
          label={<Trans>Address line 1</Trans>}
          value={addressLine1}
          onChange={setAddressLine1}
        />
        <ClientSourceDetailsField
          id="client-source-city"
          label={<Trans>City</Trans>}
          value={city}
          onChange={setCity}
        />
        <ClientSourceDetailsField
          id="client-source-postal-code"
          label={<Trans>ZIP / postal code</Trans>}
          value={postalCode}
          onChange={setPostalCode}
        />
        <ClientSourceDetailsField
          id="client-source-primary-phone"
          label={<Trans>Primary phone</Trans>}
          value={primaryPhone}
          onChange={setPrimaryPhone}
          type="tel"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!hasChanges || isSaving} onClick={save}>
          {isSaving ? <Trans>Saving…</Trans> : <Trans>Save client details</Trans>}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={reset} disabled={isSaving}>
          <Trans>Cancel</Trans>
        </Button>
      </div>
    </div>
  )
}

function nullableTrim(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function ClientSourceDetailsField({
  id,
  label,
  value,
  onChange,
  type = 'text',
}: {
  id: string
  label: ReactNode
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'tel'
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

function FactCheckRow({
  isComplete,
  label,
  detail,
}: {
  isComplete: boolean
  label: ReactNode
  detail: ReactNode
}) {
  return (
    <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-2">
      {isComplete ? (
        <CheckCircle2Icon className="mt-0.5 size-4 text-text-success" aria-hidden />
      ) : (
        <AlertTriangleIcon className="mt-0.5 size-4 text-text-warning" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-tertiary">{detail}</p>
      </div>
    </div>
  )
}

/**
 * Owner avatar for the client table — mirrors the obligations queue
 * pattern (`routes/obligations.tsx`'s `AssigneeAvatar`) so a CPA's
 * "is this mine?" scan reads the same shape across both surfaces.
 * 24px circle with uppercase initials; accent background when the
 * row belongs to the current user; dashed outline when unassigned.
 */
function ClientAssigneeAvatar({
  name,
  currentUserName,
}: {
  name: string | null
  currentUserName: string | null
}) {
  const { t } = useLingui()
  if (!name) {
    // 2026-05-23: empty-silhouette circle replaces the dashed "?" badge.
    // The "?" read as a status indicator (suggesting *something is
    // missing*); the silhouette reads as "no person assigned here yet"
    // and matches the muted treatment in the design mock. Title stays
    // explicit for screen readers and tooltip discovery.
    return (
      // 2026-05-26 (Yuqi cross-table drift #10): unassigned silhouette
      // bumped from size-6 → size-8 to match the assigned avatar size
      // canonical (/deadlines AssigneeAvatar). Icon inside stays at
      // size-3.5 so the silhouette still reads as "icon in a chip,"
      // not "icon at full disc."
      <span
        aria-label={t`Unassigned`}
        title={t`Unassigned`}
        className="inline-flex size-8 items-center justify-center rounded-full bg-background-subtle text-text-tertiary"
      >
        <UserRoundIcon className="size-3.5" aria-hidden />
      </span>
    )
  }
  const isMine =
    currentUserName !== null && name.trim().toLowerCase() === currentUserName.toLowerCase()
  const title = isMine ? t`Assigned to you (${name})` : name
  // Stable color hash so "AR" and "KP" look visually distinct even
  // though they're both gray-on-gray badges otherwise. Hash the
  // assignee name to a 6-bucket palette of background + text colors
  // that all read as muted/quiet (no high-saturation accent colors —
  // these are avatars, not status). `isMine` overrides with the
  // accent palette to keep the "yours" signal louder than the
  // identity-distinction signal.
  // 2026-05-26 (Yuqi cross-table drift #10 — "Owner/Assignee avatar
  // size + initials hash consistency"): bumped size-6 → size-8 and
  // text-caption-xs → text-sm to match /deadlines AssigneeAvatar (the
  // canonical "owner column" avatar, sized to match the Today dashboard
  // owner pill). The /clients owner column is `w-[80px]` so size-8
  // (32px) fits comfortably; the initials no longer read as cramped
  // beside the surrounding text-sm meta.
  const tint = getAssigneeTint(name)
  return (
    <span
      aria-label={title}
      title={title}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold uppercase tracking-tight',
        isMine ? 'bg-state-accent-hover-alt text-text-accent' : tint,
      )}
    >
      {initialsFromName(name)}
    </span>
  )
}

// ClientOwnerHeaderPill (2026-05-23, rewired 2026-05-24).
// Inline chip variant of the assignee avatar — paired with the
// assignee's name so the H1 chip cluster can answer "whose client?"
// without a separate Team tile in the summary strip.
//
// 2026-05-24 (Yuqi caught a dead affordance): the pill is now a
// real DropdownMenu trigger that picks an assignee from the firm's
// assignable members + an "Unassigned" option. Clicking the pill
// opens the list; selecting fires `clients.bulkUpdateAssignee` with
// `[client.id]` and an `assigneeId` (or `null` for unassigned).
// Previously the pill rendered as a non-interactive `<span>` that
// LOOKED tappable but did nothing — pure UI lie. Now every
// affordance does what the user expects.
function ClientOwnerHeaderPill({
  assigneeId,
  name,
  currentUserName,
  assignableMembers,
  disabled,
  onChange,
}: {
  assigneeId: string | null
  name: string | null
  currentUserName: string | null
  assignableMembers: readonly MemberAssigneeOption[]
  disabled: boolean
  onChange: (assigneeId: string | null) => void
}) {
  const { t } = useLingui()
  const isMine =
    name !== null &&
    currentUserName !== null &&
    name.trim().toLowerCase() === currentUserName.toLowerCase()
  const tint = name === null ? null : getAssigneeTint(name)
  const triggerLabel =
    name === null
      ? t`Change owner — currently unassigned`
      : isMine
        ? t`Change owner — currently you (${name})`
        : t`Change owner — currently ${name}`
  // 2026-05-24: use the client's `assigneeId` directly instead of
  // reverse-looking up by name. The H1 pill renders an abbreviated
  // name ("A. Rivera") while assignableMembers returns full names
  // ("Avery Patel"), so the previous name-based match always failed
  // and the radio group fell back to "Unassigned" — making the
  // trigger and the checked item disagree. Looking up by id is the
  // source of truth.
  //
  // If the current assigneeId isn't in the assignable list (e.g.,
  // the member left the firm but the row still references them),
  // the radio group's `value` still tracks the id correctly — the
  // user just sees no in-list highlight, which matches reality.
  const currentAssigneeId = assigneeId
  const currentAssigneeInList = currentAssigneeId
    ? assignableMembers.some((member) => member.assigneeId === currentAssigneeId)
    : true
  const showStaleAssigneeRow = currentAssigneeId !== null && !currentAssigneeInList
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          // 2026-05-26 (Yuqi feedback #5 — "可以更大，现在点击 area 太小"):
          // pill expanded to a real click target. Was a tiny chip
          // (px-2 py-0.5, text-xs, 4×4px avatar, 3×3px chevron). Now
          // h-7 (28px) + px-2.5 + size-5 avatar + size-3.5 chevron.
          // Same shape rules as other owner pills used in /deadlines
          // queue cells so the picker reads as a real interactive
          // control.
          <button
            type="button"
            aria-label={triggerLabel}
            title={triggerLabel}
            disabled={disabled}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full border border-divider-regular bg-background-default px-2.5 text-xs outline-none transition-colors hover:border-divider-deep hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50',
              name === null ? 'text-text-secondary' : 'text-text-primary',
            )}
          >
            {name === null ? (
              <>
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-background-subtle text-text-tertiary">
                  <UserRoundIcon className="size-3.5" aria-hidden />
                </span>
                <Trans>Unassigned</Trans>
              </>
            ) : (
              <>
                <span
                  className={cn(
                    'inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-tight',
                    isMine ? 'bg-state-accent-hover-alt text-text-accent' : tint,
                  )}
                >
                  {initialsFromName(name)}
                </span>
                <span className="truncate">{name}</span>
              </>
            )}
            <ChevronDownIcon className="size-3.5 text-text-tertiary" aria-hidden />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuRadioGroup
          value={currentAssigneeId ?? '__unassigned__'}
          onValueChange={(value) => {
            const next = value === '__unassigned__' ? null : value
            if (next === currentAssigneeId) return
            onChange(next)
          }}
        >
          <DropdownMenuRadioItem value="__unassigned__">
            {/* Avatar slot — kept at the same size-5 the member rows
                use so all rows share a single visual rhythm. Previously
                the Unassigned circle was size-4 while members were
                size-5, which made the first row sit visually lower
                than the rest. */}
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-background-subtle text-text-tertiary">
              <UserRoundIcon className="size-3" aria-hidden />
            </span>
            <span>
              <Trans>Unassigned</Trans>
            </span>
          </DropdownMenuRadioItem>
          {/* Stale-assignee row: the client references a member who
              is no longer in the assignable list (e.g., they left the
              firm). Surface it explicitly so the picker doesn't lie
              about who's currently assigned. Selecting it is a no-op
              (already current); the user picks Unassigned or someone
              else to change it. */}
          {showStaleAssigneeRow && currentAssigneeId !== null ? (
            <DropdownMenuRadioItem
              value={currentAssigneeId}
              disabled
              title={t`This member is no longer on the team`}
            >
              <span
                className={cn(
                  'inline-flex size-5 items-center justify-center rounded-full text-caption-xs font-semibold uppercase tracking-tight',
                  tint ?? 'bg-background-subtle text-text-tertiary',
                )}
              >
                {name ? initialsFromName(name) : '?'}
              </span>
              <span className="truncate text-text-tertiary">
                {name ?? <Trans>Former teammate</Trans>}
                <span className="ml-1 text-xs italic">
                  <Trans>(no longer on team)</Trans>
                </span>
              </span>
            </DropdownMenuRadioItem>
          ) : null}
          {assignableMembers.length > 0 ? <DropdownMenuSeparator /> : null}
          {assignableMembers.length === 0 ? (
            // Empty-state row. Disabled + muted so it doesn't read as
            // a tappable option, but with enough context that the user
            // knows why the list is empty + where to fix it. Without
            // the hint the row reads as "0 results" with no path
            // forward.
            <DropdownMenuItem
              disabled
              title={t`Invite teammates from Settings → Members to assign work`}
            >
              <span className="text-text-tertiary">
                <Trans>No teammates yet — invite from Settings</Trans>
              </span>
            </DropdownMenuItem>
          ) : (
            assignableMembers.map((member) => {
              const memberTint = getAssigneeTint(member.name)
              const isCurrentUser =
                currentUserName !== null &&
                member.name.trim().toLowerCase() === currentUserName.toLowerCase()
              return (
                <DropdownMenuRadioItem key={member.assigneeId} value={member.assigneeId}>
                  <span
                    className={cn(
                      'inline-flex size-5 items-center justify-center rounded-full text-caption-xs font-semibold uppercase tracking-tight',
                      isCurrentUser ? 'bg-state-accent-hover-alt text-text-accent' : memberTint,
                    )}
                  >
                    {initialsFromName(member.name)}
                  </span>
                  <span className="truncate">{member.name}</span>
                </DropdownMenuRadioItem>
              )
            })
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// 2026-05-26 (Yuqi cross-table drift #10 — "Owner/Assignee avatar
// size + initials hash consistency"): the ASSIGNEE_TINTS palette + FNV
// hash that used to live inline here moved to `@/lib/assignee-tint` so
// /deadlines AssigneeAvatar can resolve the same per-name tint. Same
// person, same color, on every surface.

function ClientReadinessBadge({
  readiness,
  compact,
}: {
  readiness: ClientReadiness | undefined
  compact: boolean
}) {
  // 2026-05-25 (status-pill audit #4): dropped the inner
  // `BadgeStatusDot`. Chip fill already carries the tone (warning
  // amber / success green); the leading dot doubled the signal
  // and broke the canonical "filled chip → no dot" rule from the
  // status-pill audit §3.3.
  if (readiness?.status === 'needs_facts') {
    return (
      <Badge variant="warning" className="text-xs">
        {compact ? <Trans>Needs facts</Trans> : <MissingFactsLabel readiness={readiness} />}
      </Badge>
    )
  }

  return (
    <Badge variant="success" className="text-xs">
      <Trans>Ready for rules</Trans>
    </Badge>
  )
}

function MissingFactsLabel({ readiness }: { readiness: ClientReadiness }) {
  if (readiness.missingRequiredFacts.includes('state')) {
    return <Trans>Needs filing state</Trans>
  }
  return <Trans>Needs facts</Trans>
}

/**
 * Imperative variant of `MissingFactsLabel`. Used on the detail
 * header's destructive Badge where the chip is itself an action
 * (clicking opens the Fix-now sheet). "Add filing state" reads as a
 * call-to-action; "Needs filing state" reads as a status descriptor
 * and was being mis-parsed as an obligation status by users.
 */
function MissingFactsActionLabel({ readiness }: { readiness: ClientReadiness }) {
  if (readiness.missingRequiredFacts.includes('state')) {
    return <Trans>Add filing state</Trans>
  }
  return <Trans>Add client facts</Trans>
}

function ClientContactMetaRow({
  client,
  entityLabel,
  ownerSlot,
}: {
  client: ClientPublic
  entityLabel: string
  ownerSlot: ReactNode
}) {
  // 2026-05-26 (Yuqi macro→micro audit, Fix #11 / §2.4): the row now
  // also carries the identity chips that used to clutter the title
  // cluster — entity badge, owner pill, filing-state chips. They
  // were 4-5 elements jammed into the H1 row; per canonical the
  // title gets 1 chip max, the rest of the identity moves here.
  //
  // 2026-05-26 (rebase): merged with main's `buildClientHeaderContactItems`
  // builder pattern. The builder pre-resolves contact / email /
  // phone / address items (filtering out malformed migration data
  // like the literal `primary_phone` column name). We render the
  // identity chips FIRST (badge → owner → states), then the
  // builder-produced contact items. Row is unconditionally
  // rendered now (was hidden when items.length === 0) because the
  // entity badge always has content.
  const items = buildClientHeaderContactItems(client)
  return (
    <div className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-text-tertiary">
      {/* 2026-05-26 (Yuqi follow-up — "LLC and the assignee are
          weirdly positioned and put together"): the entity badge
          was rendering at the default Badge size (h-5 / 20px tall,
          rounded-full but very thin), sitting next to the owner
          pill which is h-7 (28px). The 8px height delta made them
          look mismatched in scale even though they shared
          rounded-full chrome. Bumped the entity badge to a
          custom shape that matches the owner pill exactly —
          h-7, px-3, same border + bg + text size — so the two
          pills read as one coherent meta row. Gap tightened
          gap-x-3 → gap-x-2 since the pills are now visually
          related siblings rather than two ill-matched chips. */}
      <span
        className="inline-flex h-7 items-center rounded-full border border-divider-regular bg-background-default px-3 text-xs text-text-secondary"
        aria-label={`Entity type: ${entityLabel}`}
      >
        {entityLabel}
      </span>
      {ownerSlot}
      <ClientFilingStateChips client={client} />
      {items.map((item) => (
        <ClientContactMetaItem key={`${item.kind}:${item.value}`} item={item} />
      ))}
    </div>
  )
}

function ClientContactMetaItem({ item }: { item: ClientHeaderContactItem }) {
  const content = (
    <>
      {item.kind === 'contact' ? <UserRoundIcon className="size-3.5 shrink-0" aria-hidden /> : null}
      {item.kind === 'email' ? <MailIcon className="size-3.5 shrink-0" aria-hidden /> : null}
      {item.kind === 'phone' ? <PhoneIcon className="size-3.5 shrink-0" aria-hidden /> : null}
      {item.kind === 'address' ? <MapPinIcon className="size-3.5 shrink-0" aria-hidden /> : null}
      <span className="min-w-0 truncate">{item.value}</span>
    </>
  )

  if (item.kind === 'email') {
    return (
      <a
        href={`mailto:${item.value}`}
        className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm outline-none hover:text-text-primary focus-visible:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        {content}
      </a>
    )
  }

  if (item.kind === 'phone') {
    return (
      <a
        href={`tel:${item.value}`}
        className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm tabular-nums outline-none hover:text-text-primary focus-visible:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        {content}
      </a>
    )
  }

  return <span className="inline-flex min-w-0 max-w-full items-center gap-1">{content}</span>
}

function ClientOpportunityCountBadge({ count }: { count: number }) {
  const { t } = useLingui()
  return (
    <Badge variant="secondary" className="text-xs" aria-label={t`${count} opportunity match(es)`}>
      <SparklesIcon data-icon="inline-start" aria-hidden />
      {count}
    </Badge>
  )
}

function ClientRadarBadge({ matches }: { matches: readonly ClientPulseMatch[] }) {
  const { t } = useLingui()
  const count = matches.length
  const titles = matches
    .slice(0, 3)
    .map((match) => match.title)
    .join('\n')
  const tooltip = count > 3 ? `${titles}\n+${count - 3} more` : titles
  const label =
    count > 1
      ? t`Pulse · ${count}`
      : matches[0]?.taxType
        ? t`Pulse · ${formatTaxCode(matches[0].taxType)}`
        : t`Pulse`
  return (
    <Badge
      variant="warning"
      className="shrink-0"
      title={tooltip}
      aria-label={t`Pulse alert: ${tooltip}`}
    >
      <ActivityIcon data-icon="inline-start" aria-hidden />
      {label}
    </Badge>
  )
}

// ─── Suggested-forms catalog (wired to rule catalog) ──────────────────
// PDF §3.3 "Classification": what could this client owe that we haven't
// scheduled yet? We query `rules.listRules` for all active firm rules,
// filter to those whose entityApplicability matches the client's
// entityType and whose jurisdiction matches federal-or-client-state, and
// subtract anything the client already has a generated obligation for
// (matched by ruleId). The "+ Add deadline" button calls
// `obligations.createFromRule`; the server resolves the selected rule into
// concrete due dates and rejects review-only rules instead of accepting
// client-side placeholder dates.
type SuggestedRule = {
  rule: ObligationRule
}

// Map our client.entityType to the rule's EntityApplicability vocabulary.
// The rule schema uses 'any_business', 'any_entity', etc. as wildcards;
// our client.entityType uses concrete values. A rule matches a client if
// its applicability set contains the client's entityType OR a wildcard.
function ruleAppliesToEntity(
  rule: ObligationRule,
  clientEntityType: ClientPublic['entityType'],
): boolean {
  return rule.entityApplicability.some((a) => a === clientEntityType || a === 'any_business')
}

function ruleAppliesToJurisdiction(rule: ObligationRule, clientStates: Set<string>): boolean {
  // Rule jurisdiction is 'FED' for federal, or a state code for state rules.
  if (rule.jurisdiction === 'FED') return true
  return clientStates.has(rule.jurisdiction)
}

function suggestedRulesForClient(
  allRules: readonly ObligationRule[],
  client: ClientPublic,
  existingObligations: readonly ObligationInstancePublic[],
): SuggestedRule[] {
  const clientStates = new Set<string>(client.filingProfiles.map((p) => p.state))
  const scheduledRuleIds = new Set(existingObligations.flatMap((o) => (o.ruleId ? [o.ruleId] : [])))
  return allRules
    .filter((rule) => rule.status === 'active')
    .filter((rule) => !scheduledRuleIds.has(rule.id))
    .filter((rule) => ruleAppliesToJurisdiction(rule, clientStates))
    .filter((rule) => ruleAppliesToEntity(rule, client.entityType))
    .map((rule) => ({ rule }))
}

function SuggestedFormsCatalogPanel({
  client,
  existingObligations,
}: {
  client: ClientPublic
  existingObligations: readonly ObligationInstancePublic[]
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [hidden, setHidden] = useState(false)
  const [pendingRuleId, setPendingRuleId] = useState<string | null>(null)

  const rulesQuery = useQuery(orpc.rules.listRules.queryOptions({ input: { status: 'active' } }))
  const createMutation = useMutation(
    orpc.obligations.createFromRule.mutationOptions({
      onMutate: (variables) => {
        setPendingRuleId(variables.ruleId)
      },
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        toast.success(t`Deadline added`, {
          description: t`${result.obligations.length} deadline created from the rule catalog.`,
        })
        setPendingRuleId(null)
      },
      onError: (err) => {
        toast.error(t`Couldn't add deadline`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
        setPendingRuleId(null)
      },
    }),
  )

  const allRules = rulesQuery.data ?? EMPTY_RULES
  const applicable = useMemo(() => {
    const clientStates = new Set<string>(client.filingProfiles.map((p) => p.state))
    return allRules.filter(
      (rule) =>
        rule.status === 'active' &&
        ruleAppliesToJurisdiction(rule, clientStates) &&
        ruleAppliesToEntity(rule, client.entityType),
    )
  }, [allRules, client.entityType, client.filingProfiles])
  const suggested = useMemo(
    () => suggestedRulesForClient(allRules, client, existingObligations),
    [allRules, client, existingObligations],
  )

  if (rulesQuery.isLoading) {
    // 2026-05-26 (Yuqi tab-body follow-ups, Task 3): loading
    // skeleton frame snapped to canonical `border-divider-regular`
    // so it reads at the same weight as the panel's resolved frame
    // below.
    return (
      <div className="rounded-md border border-divider-regular bg-background-default p-4">
        <Skeleton className="mb-2 h-4 w-40" />
        <Skeleton className="h-3 w-72" />
      </div>
    )
  }
  if (applicable.length === 0) {
    // 2026-05-26 (Yuqi tab-body follow-ups, Task 2 / Fix #10):
    // previously `return null` left the surrounding TabSection
    // ("Suggested forms") with no body — the heading floated alone
    // and a CPA couldn't tell whether the panel was loading, broken,
    // or genuinely empty. Now we render the canonical EmptyState so
    // the section reads cleanly as "nothing here yet, here's why."
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title={<Trans>No applicable forms for this client</Trans>}
        description={
          <Trans>
            No active rule in the catalog matches this client's entity type and filing jurisdiction.
            Add a jurisdiction or check back after rule updates.
          </Trans>
        }
      />
    )
  }

  function addDeadline(suggestion: SuggestedRule) {
    createMutation.mutate({
      clientId: client.id,
      ruleId: suggestion.rule.id,
    })
  }

  return (
    // 2026-05-26 (Yuqi tab-body follow-ups, Task 3): outer frame
    // border snapped from `border-divider-subtle` to the canonical
    // `border-divider-regular` so the panel reads at the same
    // tonal weight as the other section frames on this page
    // (Filing plan year sections, Compliance posture, Risk profile,
    // AI summary). page-family-canonical §9.
    <div className="rounded-md border border-divider-regular bg-background-default">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-text-primary">
            <Trans>Forms catalog</Trans>
          </span>
          <span className="inline-flex items-center gap-2 truncate text-xs text-text-tertiary">
            <span>
              <Plural value={applicable.length} one="# applicable" other="# applicable" /> ·{' '}
              {client.name}
            </span>
            {/* D-6e (2026-05-23): the gap count is now a tooltip-
                anchored chip. Hover reveals the actual form list so
                the CPA can scan what's missing without opening the
                accordion. Inert (no click target) — Tooltip is the
                right primitive per Dify's overlay rules. */}
            {suggested.length > 0 ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    // 2026-05-26 (Yuqi macro→micro audit, Fix #7 /
                    // §3.3): retired uppercase kicker on the badge.
                    <Badge variant="warning" className="cursor-default rounded-sm text-xs">
                      <Plural value={suggested.length} one="# gap" other="# gap" />
                    </Badge>
                  }
                />
                <TooltipContent className="max-w-sm whitespace-normal text-left">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-secondary">
                      <Trans>Missing from this client</Trans>
                    </span>
                    <ul className="flex flex-col gap-0.5">
                      {suggested.slice(0, 6).map((s) => (
                        <li key={s.rule.id} className="flex items-baseline gap-1.5">
                          <span className="font-mono uppercase tabular-nums opacity-70">
                            {s.rule.jurisdiction}
                          </span>
                          <span className="truncate">{s.rule.formName}</span>
                        </li>
                      ))}
                      {suggested.length > 6 ? (
                        <li className="opacity-70">
                          <Trans>+ {suggested.length - 6} more</Trans>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setHidden((v) => !v)}>
          {hidden ? <Trans>Show</Trans> : <Trans>Hide</Trans>}
        </Button>
      </div>
      {hidden ? null : suggested.length === 0 ? (
        <div className="border-t border-divider-subtle px-4 py-3">
          <EmptyState
            icon={CheckCircle2Icon}
            title={<Trans>All applicable rules scheduled</Trans>}
            description={
              <Trans>
                Every active rule the catalog matches to this client already has a generated
                deadline.
              </Trans>
            }
          />
        </div>
      ) : (
        <>
          <div className="border-t border-state-warning-border bg-state-warning-hover/50 px-4 py-2">
            {/* 2026-05-26 (Yuqi macro→micro audit, Fix #7 / §3.3):
                retired uppercase kicker; sentence-case sm-semibold
                matches the canonical section-heading scale. */}
            <p className="text-sm font-semibold text-text-warning">
              <Trans>Suggested</Trans>
              {' · '}
              <Plural value={suggested.length} one="# rule" other="# rules" />
            </p>
            <p className="mt-0.5 text-caption font-normal tracking-normal text-text-secondary normal-case">
              <Trans>Applicable rules with no deadline scheduled yet.</Trans>
            </p>
          </div>
          <div className="grid divide-y divide-divider-subtle">
            {suggested.map((suggestion) => {
              const isPending = pendingRuleId === suggestion.rule.id && createMutation.isPending
              const needsRuleReview =
                suggestion.rule.dueDateLogic.kind === 'source_defined_calendar'
              return (
                <div
                  key={suggestion.rule.id}
                  className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-sm font-medium text-text-primary">
                        {suggestion.rule.formName}
                      </p>
                      <span className="text-xs font-medium tracking-eyebrow text-text-tertiary uppercase">
                        {suggestion.rule.jurisdiction}
                      </span>
                    </div>
                    <p className="text-xs leading-snug text-text-tertiary">
                      {suggestion.rule.title}
                      {needsRuleReview ? (
                        <>
                          {' · '}
                          <Trans>Rule review required before this can create a deadline.</Trans>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addDeadline(suggestion)}
                    disabled={createMutation.isPending || needsRuleReview}
                  >
                    {needsRuleReview ? (
                      <AlertTriangleIcon data-icon="inline-start" />
                    ) : isPending ? (
                      <RefreshCwIcon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <PlusIcon data-icon="inline-start" />
                    )}
                    {needsRuleReview ? (
                      <Trans>Rule review required</Trans>
                    ) : (
                      <Trans>Add deadline</Trans>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const EMPTY_RULES: readonly ObligationRule[] = []

// Mailbox tab — and its supporting ClientMailboxPanel /
// mailboxAddressForClient — were removed when the tab itself was
// dropped. The Phase 2 forwarding-address widget will return once the
// inbound-email infrastructure ships; see git history for the prior
// implementation.
