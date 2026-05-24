import { type KeyboardEvent, type ReactNode, useCallback, useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
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
  ArrowUpDownIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  EyeIcon,
  FileSearchIcon,
  MailIcon,
  MegaphoneIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  PlusIcon,
  RefreshCwIcon,
  ScrollTextIcon,
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
  MemberAssigneeOption,
  ObligationInstancePublic,
  ObligationRule,
} from '@duedatehq/contracts'
import { Alert, AlertDescription } from '@duedatehq/ui/components/ui/alert'
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
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
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
import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { formatCents, formatDate, formatDatePretty, formatDateTimeWithTimezone } from '@/lib/utils'
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
import { SurfaceSummaryStrip } from '@/features/_surface-vocabulary'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { ClientOpportunitiesCard } from '@/features/opportunities/client-opportunities-card'
// `SectionFrame` + `SectionLabel` imports retired 2026-05-24 with the
// switch to <TabSection>. They're still exported from
// rules-console-primitives for any rules-console caller that wants
// them.

import { ClientTitleSwitcher } from './ClientTitleSwitcher'
import { ClientCompliancePosturePanel } from './ClientCompliancePosturePanel'
import { useClientDrawer } from './ClientDrawerProvider'
import { ClientPeekHoverCard } from './ClientPeekHoverCard'
import { FixNeedsFactsSheet } from './FixNeedsFactsSheet'
import { ClientSummaryStrip } from './ClientSummaryStrip'

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
  buildClientPulseMatches,
  buildClientWorkPlanSummary,
  findExtensionWithoutPaymentObligations,
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
  summary,
  actions,
  children,
}: {
  title: ReactNode
  summary?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          {summary ? <span className="text-xs text-text-tertiary">{summary}</span> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
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
  if (days < 0) {
    const late = Math.abs(days)
    return (
      <span className="whitespace-nowrap font-medium text-text-destructive tabular-nums">
        <Trans>{late}d late</Trans>
      </span>
    )
  }
  if (days === 0) {
    return (
      <span className="whitespace-nowrap font-medium text-text-warning">
        <Trans>Today</Trans>
      </span>
    )
  }
  if (days <= 7) {
    return (
      <span className="whitespace-nowrap text-text-warning tabular-nums">
        <Trans>in {days}d</Trans>
      </span>
    )
  }
  return <span className="whitespace-nowrap text-text-primary">{formatDatePretty(iso)}</span>
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
      {overflow > 0 ? (
        <span className="font-mono tabular-nums text-text-tertiary">+{overflow}</span>
      ) : null}
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
}: {
  label: string
  sortState: false | 'asc' | 'desc'
  onToggle: () => void
  align?: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Sort by ${label}`}
      title={`Sort by ${label}`}
      data-active={sortState !== false ? true : undefined}
      className={cn(
        '-mx-1 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1 text-xs font-medium tracking-wider whitespace-nowrap text-text-tertiary uppercase outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt data-[active=true]:text-text-primary',
        align === 'right' && 'justify-end',
      )}
    >
      <span className="truncate">{label}</span>
      {sortState === 'asc' ? (
        <ArrowUpIcon className="size-3 shrink-0" aria-hidden />
      ) : sortState === 'desc' ? (
        <ArrowDownIcon className="size-3 shrink-0" aria-hidden />
      ) : (
        <ArrowUpDownIcon className="size-3 shrink-0 opacity-60" aria-hidden />
      )}
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
  onPulseFilterChange,
  onImport,
  canImport,
}: ClientFactsWorkspaceProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const currentUserName = useCurrentUserName()
  const { openDrawer: openClientDrawer } = useClientDrawer()
  const [openHeaderFilter, setOpenHeaderFilter] = useState<string | null>(null)
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
  const setHeaderFilterOpen = useCallback((filterId: string, nextOpen: boolean) => {
    setOpenHeaderFilter((current) => (nextOpen ? filterId : current === filterId ? null : current))
  }, [])

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
        // 2026-05-23: filter and sort split into distinct click targets.
        // Label + sort arrow on the LEFT (clicking anywhere on the
        // label cycles sort); funnel icon on the RIGHT (opens the
        // filter dropdown). Per Yuqi's audit — filter should never be
        // mistaken for sort and vice versa.
        header: ({ column }) => (
          <div className="flex items-center justify-between gap-1">
            <ColumnSortHeader
              label={t`Client`}
              sortState={column.getIsSorted()}
              onToggle={() => column.toggleSorting()}
            />
            <TableHeaderMultiFilter
              trigger="icon"
              label={t`Client`}
              open={openHeaderFilter === 'client'}
              onOpenChange={(nextOpen) => setHeaderFilterOpen('client', nextOpen)}
              options={clientOptions}
              selected={clientFilter}
              emptyLabel={t`No clients`}
              searchable
              searchPlaceholder={t`Search clients`}
              onSelectedChange={onClientFilterChange}
            />
          </div>
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
                <span className="truncate font-medium text-text-primary">{row.original.name}</span>
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
          <div className="flex items-center justify-between gap-1">
            <ColumnSortHeader
              label={t`States`}
              sortState={column.getIsSorted()}
              onToggle={() => column.toggleSorting()}
            />
            <TableHeaderMultiFilter
              trigger="icon"
              label={t`States`}
              open={openHeaderFilter === 'state'}
              onOpenChange={(nextOpen) => setHeaderFilterOpen('state', nextOpen)}
              options={stateOptions}
              selected={stateFilter}
              emptyLabel={t`No states`}
              onSelectedChange={onStateFilterChange}
            />
          </div>
        ),
        // Render primary state and any additional filing states inline:
        // primary state = filled secondary badge, additional states =
        // outline badges. Replaces the earlier `otherStates` column —
        // primary + others are the same scan signal ("which states does
        // this client file in?") and splitting them across two columns
        // duplicated header space + forced the user's eye to track both.
        // See `docs/Design/clients-list-and-detail-critique-2026-05-22.md`
        // L-7 for the rationale.
        cell: ({ row }) => {
          const primary = getPrimaryFilingState(row.original)
          if (!primary) {
            return <span className="text-text-tertiary">—</span>
          }
          const others = getOtherFilingStates(row.original)
          const visibleOthers = others.slice(0, 2)
          const overflow = others.length - visibleOthers.length
          return (
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant="secondary" className="rounded-sm font-mono uppercase tabular-nums">
                {primary}
              </Badge>
              {visibleOthers.map((state) => (
                <Badge
                  key={state}
                  variant="outline"
                  className="rounded-sm font-mono uppercase tabular-nums"
                >
                  {state}
                </Badge>
              ))}
              {overflow > 0 ? (
                <span
                  className="font-mono text-[11px] tabular-nums text-text-tertiary"
                  title={others.slice(2).join(', ')}
                >
                  +{overflow}
                </span>
              ) : null}
            </div>
          )
        },
        meta: {
          headerClassName: 'w-[160px]',
          cellClassName: 'w-[160px]',
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
          <div className="flex items-center justify-between gap-1">
            <ColumnSortHeader
              label={t`Entity`}
              sortState={column.getIsSorted()}
              onToggle={() => column.toggleSorting()}
            />
            <TableHeaderMultiFilter
              trigger="icon"
              label={t`Entity`}
              open={openHeaderFilter === 'entity'}
              onOpenChange={(nextOpen) => setHeaderFilterOpen('entity', nextOpen)}
              options={entityOptions}
              selected={entityFilter}
              emptyLabel={t`No entities`}
              onSelectedChange={onEntityFilterChange}
            />
          </div>
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="rounded-sm font-normal tabular-nums">
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
            return <span className="text-text-tertiary">—</span>
          }
          return (
            <div className="flex min-w-0 flex-col gap-0.5">
              <NextDueRelativeLabel iso={summary.nextDueDate} />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] tabular-nums text-text-tertiary">
                  {summary.nextDueDate}
                </span>
                {summary.nextDueStatus ? (
                  <ObligationStatusReadBadge
                    status={summary.nextDueStatus}
                    className="px-1.5 py-0 text-[10px] font-normal"
                  />
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
      {
        id: 'servicesCount',
        header: () => <span className="block text-right">{t`Services`}</span>,
        cell: ({ row }) => {
          const count = getClientServicesCount(row.original)
          if (count === 0) {
            return <span className="block text-right text-text-tertiary tabular-nums">—</span>
          }
          // Plain count — sum of unique tax types across filing
          // profiles. No deep-link here because the destination is
          // ambiguous (rules library? filing plan tab?); the row's
          // own click handler opens the client detail, which is the
          // right place to see services in context.
          return (
            <span
              className="block text-right font-mono tabular-nums text-text-primary"
              title={t`${count} tax-type services managed for this client`}
            >
              {count}
            </span>
          )
        },
        meta: {
          headerClassName: 'w-[90px] text-right',
          cellClassName: 'w-[90px] text-right',
        },
      },
      {
        id: 'openObligations',
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`Open`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
            align="right"
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
            return <span className="block text-right text-text-tertiary tabular-nums">0</span>
          }
          // Count becomes a deep link into the queue pre-filtered to
          // this client — the inverse of the drawer's "Open client
          // detail" jump and the most-traversed cross-page hop.
          // Stop click propagation so the row's "open client" click
          // handler doesn't swallow the navigation.
          return (
            <Link
              to={`/obligations?client=${row.original.id}`}
              onClick={(event) => event.stopPropagation()}
              className="block text-right tabular-nums text-text-primary outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt rounded-sm"
              aria-label={t`View ${count} open deadlines for this client`}
            >
              {count}
            </Link>
          )
        },
        meta: {
          headerClassName: 'w-[80px] text-right',
          cellClassName: 'w-[80px] text-right',
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
        id: 'doneObligations',
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`Done`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
            align="right"
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
          if (count === 0) {
            return <span className="block text-right text-text-tertiary tabular-nums">0</span>
          }
          return (
            <span
              className="block text-right tabular-nums text-text-secondary"
              title={t`${count} filed or closed-out obligations for this client`}
            >
              {count}
            </span>
          )
        },
        meta: {
          headerClassName: 'w-[80px] text-right',
          cellClassName: 'w-[80px] text-right',
        },
      },
      {
        accessorKey: 'assigneeName',
        // Owner has filter but no sort in the mock — render the label
        // as static text and the funnel icon as the only click target.
        header: () => (
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium tracking-wider uppercase text-text-tertiary">
              <Trans>Owner</Trans>
            </span>
            <TableHeaderMultiFilter
              trigger="icon"
              label={t`Owner`}
              open={openHeaderFilter === 'owner'}
              onOpenChange={(nextOpen) => setHeaderFilterOpen('owner', nextOpen)}
              options={ownerOptions}
              selected={ownerFilter}
              emptyLabel={t`No owners`}
              searchable
              searchPlaceholder={t`Search owners`}
              onSelectedChange={onOwnerFilterChange}
            />
          </div>
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
            return <span className="text-text-tertiary tabular-nums">—</span>
          }
          return <ClientOpportunityCountBadge count={count} />
        },
        meta: {
          headerClassName: 'w-[80px]',
          cellClassName: 'w-[80px]',
        },
      },
    ],
    [
      clientFilter,
      clientOptions,
      currentUserName,
      entityFilter,
      entityLabels,
      entityOptions,
      factsModel.readinessById,
      obligationSummariesByClient,
      onClientFilterChange,
      onEntityFilterChange,
      onOwnerFilterChange,
      onStateFilterChange,
      openHeaderFilter,
      opportunityCountByClient,
      ownerFilter,
      ownerOptions,
      pulseMatchesByClient,
      setHeaderFilterOpen,
      stateFilter,
      stateOptions,
      t,
    ],
  )

  // Action-strip chip filters — local to this surface so they're not
  // entangled with the URL state. Click "8 at risk" / "1 waiting on
  // client" to narrow the table; click again to clear. The chips
  // render with `active` state so the CPA sees which filter is on.
  // Pulse hits + missing facts still route through the URL-backed
  // parent filters (onPulseFilterChange / onReadinessFilterChange) so
  // deep links continue to work for those.
  const [atRiskActive, setAtRiskActive] = useState(false)
  const [waitingActive, setWaitingActive] = useState(false)

  const visibleClients = useMemo(() => {
    if (!atRiskActive && !waitingActive) return filteredClients
    return filteredClients.filter((client) => {
      const summary = obligationSummariesByClient.get(client.id)
      if (!summary) return false
      if (atRiskActive && summary.overdueCount === 0) return false
      if (waitingActive && summary.waitingOnClientCount === 0) return false
      return true
    })
  }, [filteredClients, atRiskActive, waitingActive, obligationSummariesByClient])

  // 2026-05-23: column sort state for the new sort-arrow indicators
  // (CLIENT / STATES / ENTITY / NEXT DUE / OPEN / DONE). Default sort
  // is unset so rows render in the API's `due_asc` order — clicking
  // a header opts in. Stored locally because sort feels transient (a
  // "show me by ___" gesture) rather than something to deep-link.
  const [sorting, setSorting] = useState<SortingState>([])
  const table = useReactTable({
    data: visibleClients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (client) => client.id,
    // OTHER STATES + SERVICES start hidden because they're empty for
    // the typical single-state, no-services-managed firm shape (the
    // seeded demo's nine clients all show "—" in both columns). They
    // become useful once a firm starts tracking multiple states or
    // tax-type services — at which point a column-toggle UI can
    // surface them. Until then, keeping them off-screen kills two
    // wasted columns that otherwise train the eye to scan past data.
    initialState: {
      columnVisibility: {
        servicesCount: false,
      },
      pagination: {
        // 25-row pages — covers single-page rendering for most small/
        // mid firms (the typical seeded demo has ~10 clients) while
        // keeping the buffer reasonable for firms with 200+ clients.
        // The pagination footer only renders when total > 25 so small
        // firms don't see empty controls.
        pageIndex: 0,
        pageSize: 25,
      },
    },
  })
  const handleOpenClientDetail = useCallback(
    (clientId: string) => {
      // 2026-05-24 (useEffect audit): persist the currently-visible
      // client order to sessionStorage at navigation time so the
      // detail page can offer prev/next cycling across the same
      // filter subset. The previous shape ran this inside a route-
      // level useEffect that fired on every filteredClients change;
      // moving it here means we only pay the sessionStorage write
      // on actual navigation intent, AND it removes one of the
      // app's useEffect violations per the AGENTS.md rule.
      writeClientCycleList(filteredClients.map((client) => client.id))
      void navigate(`/clients/${clientId}`)
    },
    [filteredClients, navigate],
  )

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
        obligationSummariesByClient={obligationSummariesByClient}
        pulseHitCount={pulseMatchesByClient.size}
        atRiskActive={atRiskActive}
        waitingActive={waitingActive}
        onFixNeedsFacts={() => setFixNeedsFactsOpen(true)}
        onToggleAtRisk={() => setAtRiskActive((prev) => !prev)}
        onToggleWaiting={() => setWaitingActive((prev) => !prev)}
        onOpenPulseHits={() => onPulseFilterChange(['affected'])}
      />

      <FixNeedsFactsSheet
        open={fixNeedsFactsOpen}
        onOpenChange={setFixNeedsFactsOpen}
        clients={clients}
      />

      {/* Column-header filters are the only filter pattern on this
          surface — Client, Jurisdiction, and Owner each carry their
          own filter trigger in the column header. The standalone
          chip row that used to sit here is gone (Entity and Pulse
          filters lose their UI; the URL params still drive the
          filter pipeline for deep links). Pulse filtering also
          lives on the action strip's "Pulse hits" tile, so removing
          the chip doesn't lose user-facing functionality. */}

      {/* Frameless table — Card / CardHeader / CardContent + inner
          rounded border removed per the 2026-05-21 design pass. The
          data sits directly on the page background, matching the
          Obligations queue and Rule library treatments. */}
      {isLoading ? (
        <ClientTableSkeleton />
      ) : clients.length > 0 ? (
        <Table className="table-fixed">
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
          <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  aria-label={t`Open client detail for ${row.original.name}`}
                  className="group cursor-pointer outline-none hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset"
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
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
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
      ) : (
        <EmptyState
          icon={UsersRoundIcon}
          title={<Trans>No clients yet</Trans>}
          description={<Trans>Import a CSV or create the first manual client record.</Trans>}
          cta={
            <Button variant="outline" onClick={onImport} disabled={!canImport}>
              <FileSearchIcon data-icon="inline-start" />
              <Trans>Run migration</Trans>
            </Button>
          }
        />
      )}

      {/* Pagination footer — renders only when the filtered client
          set spans more than one page so small firms / empty filters
          don't see vestigial controls. Same shape + icons as the
          Obligations queue footer (sticky bottom-of-table block).
          Page count uses `getFilteredRowModel`/`getRowCount` semantics
          via `table.getPageCount()`. */}
      {table.getPageCount() > 1 ? (
        <div className="flex items-center justify-between border-t border-divider-subtle pt-3 text-xs text-text-tertiary">
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
 *     tone). Click → `/obligations?status=blocked` so the CPA lands
 *     on the actionable queue, not a filtered client list.
 *   - **Waiting on client** — clients with ≥1 `waiting_on_client`
 *     obligation (warning tone). Click → `/obligations?status=waiting_on_client`.
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
  obligationSummariesByClient,
  pulseHitCount,
  atRiskActive,
  waitingActive,
  onFixNeedsFacts,
  onToggleAtRisk,
  onToggleWaiting,
  onOpenPulseHits,
}: {
  isLoading: boolean
  needsFactsCount: number
  obligationSummariesByClient: ReadonlyMap<string, ClientObligationListSummary>
  pulseHitCount: number
  atRiskActive: boolean
  waitingActive: boolean
  onFixNeedsFacts: () => void
  onToggleAtRisk: () => void
  onToggleWaiting: () => void
  onOpenPulseHits: () => void
}) {
  const { t } = useLingui()
  const { atRiskCount, waitingOnClientCount } = useMemo(() => {
    let atRisk = 0
    let waiting = 0
    for (const summary of obligationSummariesByClient.values()) {
      if (summary.overdueCount > 0) atRisk += 1
      if (summary.waitingOnClientCount > 0) waiting += 1
    }
    return { atRiskCount: atRisk, waitingOnClientCount: waiting }
  }, [obligationSummariesByClient])

  // 2026-05-22: 3-tile grid retired in favor of the shared
  // SurfaceSummaryStrip. Banner stays — it's the only place that
  // carries the "Fix now" CTA, and Yuqi explicitly asked for it to
  // remain when needsFactsCount > 0 (see unified-table-surface-
  // vocabulary.md Part 6 risk #2 — keeping banner + strip is the
  // discoverability path for missing facts).
  const hasBanner = needsFactsCount > 0
  const hasAnyMetric =
    atRiskCount > 0 || waitingOnClientCount > 0 || pulseHitCount > 0 || needsFactsCount > 0
  if (!hasBanner && !hasAnyMetric && !isLoading) return null

  return (
    <div className="flex flex-col gap-3">
      {hasBanner ? (
        <Alert
          variant="warning"
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertTriangleIcon className="size-4 shrink-0 text-severity-medium" aria-hidden />
            <AlertDescription>
              {/* 2026-05-23: the message itself is now a clickable link that
                  fires the same Fix-now action — gives the CPA a second
                  hit target with stronger reading-affordance. The explicit
                  "Fix now" button stays on the right for users who scan
                  the banner from the action edge first. */}
              <button
                type="button"
                onClick={onFixNeedsFacts}
                className="text-left underline decoration-dotted underline-offset-2 outline-none hover:decoration-solid focus-visible:ring-2 focus-visible:ring-state-accent-active-alt rounded-sm"
              >
                <Plural
                  value={needsFactsCount}
                  one="# client is missing state or entity type — the rule library is skipping it."
                  other="# clients are missing state or entity type — the rule library is skipping them."
                />
              </button>
            </AlertDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onFixNeedsFacts}>
            <Trans>Fix now</Trans>
          </Button>
        </Alert>
      ) : null}
      <SurfaceSummaryStrip
        label={t`Clients`}
        loading={isLoading}
        items={[
          {
            key: 'at-risk',
            value: atRiskCount,
            label: t`at risk`,
            tone: atRiskCount > 0 ? 'destructive' : 'muted',
            active: atRiskActive,
            // Clickable when there's something to filter OR when the
            // filter is already active (so the user can toggle it off
            // even if a different filter brought the count to 0).
            ...(atRiskCount > 0 || atRiskActive ? { onClick: onToggleAtRisk } : {}),
          },
          {
            key: 'waiting',
            value: waitingOnClientCount,
            label: t`waiting on client`,
            tone: waitingOnClientCount > 0 ? 'warning' : 'muted',
            active: waitingActive,
            ...(waitingOnClientCount > 0 || waitingActive ? { onClick: onToggleWaiting } : {}),
          },
          {
            // 2026-05-23: relabeled per design mock from "Pulse hits" →
            // "Pass file". Wiring is preserved (Pulse-match filter
            // surfacing clients flagged by recent rule-library alerts).
            // If the intent was a different filter, swap the data
            // source — the label change alone is safe.
            key: 'pulse',
            value: pulseHitCount,
            label: t`Pass file`,
            tone: pulseHitCount > 0 ? 'review' : 'muted',
            ...(pulseHitCount > 0 ? { onClick: onOpenPulseHits } : {}),
          },
          {
            key: 'missing-facts',
            value: needsFactsCount,
            label: t`missing facts`,
            tone: needsFactsCount > 0 ? 'warning' : 'muted',
            ...(needsFactsCount > 0 ? { onClick: onFixNeedsFacts } : {}),
          },
        ]}
      />
    </div>
  )
}

function ClientTableSkeleton() {
  return (
    <div className="grid gap-2">
      {[0, 1, 2, 3, 4].map((item) => (
        <Skeleton key={item} className="h-12 w-full" />
      ))}
    </div>
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
          description: rpcErrorMessage(err) ?? t`Please try again.`,
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
          description: rpcErrorMessage(err) ?? t`Please try again.`,
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
          description: rpcErrorMessage(err) ?? t`Please try again.`,
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
          description: rpcErrorMessage(err) ?? t`Please try again.`,
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
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        toast.success(t`Status changed to ${v2StatusLabels[vars.status]}`, {
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
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        toast.success(t`Client archived`, { description: client.name })
        setArchiveOpen(false)
        void navigate('/clients')
      },
      onError: (err) => {
        toast.error(t`Couldn't archive client`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )

  return (
    <>
      {/* 2026-05-23 (critique #9): the obligation panel splits the
          ENTIRE page now, not just the body underneath the
          PageHeader. Previously only the body section flexed
          left/right when a filing-plan row was selected — the
          PageHeader stayed full-width above and got visually
          truncated by the panel's right rail.

          New shape: a top-level xl:flex-row split. The left column
          (`<div flex-1 min-w-0>`) holds BOTH the PageHeader and the
          body. The aside panel becomes a true full-page right rail
          when an obligation is open. PageHeader's own flex layout
          (title left, actions right) keeps working inside the
          narrower left column. */}
      <div className="flex min-h-0 flex-col gap-6 xl:flex-row xl:items-start">
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-6',
            // No extra width math needed — the aside below has fixed
            // xl:w-[480px] + xl:shrink-0, so flex-1 fills the rest.
          )}
        >
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
            title={
              // 2026-05-23: relaxed the inline-with-h1 breakpoint from
              // xl (1280px) down to md (768px). At lg/xl viewports the
              // chips fit comfortably next to the title — the wrap-to-
              // a-second-row treatment shown in the prior commit was
              // the wrong tradeoff for typical desktop widths, where
              // the Figma keeps Trust + owner + state inline with the
              // h1. Still stacks vertically on tablet/mobile where the
              // chip set would otherwise collide with the title.
              <span className="flex flex-col items-start gap-y-2 md:flex-row md:flex-wrap md:items-center md:gap-x-3">
                <ClientTitleSwitcher client={client} />
                {/* Identity chips inline with the title (D-2). Entity badge
                  + filing-state chips read the client's shape in one
                  scan. The readiness chip is **conditional**: only
                  renders when something needs the CPA's attention — no
                  ghost slot when ready. Replaces the standalone
                  identity strip that lived below the header. */}
                <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
                  {/* Entity badge uses the same `outline` style as
                    every other place that surfaces entity type
                    (ClientPeekHoverCard, ClientDetailDrawer,
                    obligations queue, Create-client dialog). The
                    `info` variant the H1 row was using was the only
                    blue-tinted entity chip in the whole app — it
                    drew attention as a signal, but entity type is
                    a static identity fact, not a status. Quieted to
                    match. */}
                  <Badge variant="outline" className="text-xs">
                    {entityLabels[client.entityType]}
                  </Badge>
                  {/* Owner pill (2026-05-23). Inline chip showing who
                      this client is assigned to — was previously only
                      surfaced inside the Team tile in the summary
                      strip. Pulling it into the H1 chip cluster keeps
                      "whose client?" answerable in the same scan as
                      the entity type and filing state, so the third
                      summary tile can be repurposed for Open Filing.
                      Unassigned state uses a person silhouette icon
                      + the literal word; assigned state shows a tiny
                      stable-hashed avatar + the name. */}
                  <ClientOwnerHeaderPill
                    assigneeId={client.assigneeId ?? null}
                    name={client.assigneeName ?? null}
                    currentUserName={currentUserName}
                    assignableMembers={assignableMembers}
                    disabled={bulkAssigneeMutation.isPending}
                    onChange={changeOwner}
                  />
                  <ClientFilingStateChips client={client} />
                  {readiness?.status === 'needs_facts' ? (
                    // Badge's `render` prop swaps in a <button> as the
                    // root element so the chip itself is the click
                    // target — no wrapping <button> nested in the <h1>
                    // (which caused nested-interactive DOM + an
                    // inconsistent click area in the earlier revision).
                    //
                    // 2026-05-23: label reframed from "Needs filing
                    // state" (which read as an obligation status) to
                    // "Add filing state" (imperative — clearly an
                    // action the CPA needs to take on the client's
                    // setup). SettingsIcon prefix visually anchors
                    // it as configuration, not in-flight work.
                    <Badge
                      variant="destructive"
                      className="cursor-pointer text-xs"
                      render={<button type="button" onClick={openMissingFacts} />}
                    >
                      <SettingsIcon className="size-3" aria-hidden />
                      <MissingFactsActionLabel readiness={readiness} />
                    </Badge>
                  ) : null}
                </span>
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
                <ClientHeaderOverflowMenu clientId={client.id} canReadAudit={canReadAudit} />
                {/* 2026-05-23: archive button collapsed to icon-only per
                    Figma. The verb is unambiguous from the icon (file-
                    cabinet glyph) and the action is rarely the daily-
                    driver task — the +Add deadline button next to it
                    deserves the only labeled CTA in the cluster. */}
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={t`Archive ${client.name}`}
                  title={t`Archive client`}
                  onClick={() => setArchiveOpen(true)}
                >
                  <ArchiveIcon aria-hidden />
                </Button>
                <CreateObligationDialog defaultClientId={client.id} />
              </>
            }
          />

          {/* Body — client-context content. The outer xl:flex-row
            split (one wrapper above) already separates this from the
            right-rail obligation panel, so this section just renders
            the column-of-content inline. */}
          <section className="flex min-w-0 flex-col gap-6">
            {/* Provenance (Imported / Manual) lived here briefly during
                the D-2 transition. Dropped 2026-05-22 per design call —
                low-signal: most clients are Manual by default, and the
                Imported chip never changed a CPA's behavior. The
                migration history is still discoverable from the
                /clients header Import-history drawer. */}

            <ClientContactMetaRow client={client} />

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
            >
              {/* Tab underline: `divider-regular` (8%) not `subtle` (4%).
                  The tabs are the primary navigation inside the
                  detail body — a 4% line vanished against
                  `background-default` and tabs felt like floating
                  triggers instead of a real tabbar. */}
              <TabsList variant="line" className="border-b border-divider-regular">
                <TabsTrigger value="work">
                  <Trans>Work</Trans>
                </TabsTrigger>
                <TabsTrigger value="info">
                  <Trans>Client info</Trans>
                  {missingFilingState ? <BadgeStatusDot tone="error" className="ml-1.5" /> : null}
                </TabsTrigger>
                <TabsTrigger value="discover">
                  <Trans>Discover</Trans>
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Trans>Activity</Trans>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="work" className="flex flex-col gap-6 pt-4">
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
              <TabsContent value="info" className="flex flex-col gap-6 pt-4">
                {/* Compliance posture — EIN + tax year + owners +
                    activity-scope flags. Client identity facts, not
                    "work" in progress; the CPA edits / verifies these
                    quarterly, not daily. Panel renders its own grid
                    inside; TabSection owns the section heading. */}
                <TabSection
                  title={t`Compliance posture`}
                  summary={t`Identity facts that drive the obligation generator`}
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

                <TabSection title={t`Import source`} summary={formatImportSourceSummary(client)}>
                  <div className="rounded-md border border-divider-regular bg-background-default p-4">
                    <ClientImportSourcePanel client={client} />
                  </div>
                </TabSection>
              </TabsContent>

              <TabsContent value="discover" className="flex flex-col gap-6 pt-4">
                <TabSection
                  title={t`Suggested forms`}
                  summary={t`Forms the rule library can add without a new deadline`}
                >
                  <div className="rounded-md border border-divider-regular bg-background-default p-4">
                    <SuggestedFormsCatalogPanel client={client} existingObligations={obligations} />
                  </div>
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

              <TabsContent value="activity" className="flex flex-col gap-6 pt-4">
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
                >
                  <div className="rounded-md border border-divider-regular bg-background-default p-4">
                    <ClientRiskSummaryPanel
                      insight={riskSummaryQuery.data ?? null}
                      isLoading={riskSummaryQuery.isLoading}
                      isRefreshing={requestRiskSummaryMutation.isPending}
                      canRefresh={practiceAiEnabled}
                      firmTimezone={firmTimezone}
                      onRefresh={() =>
                        requestRiskSummaryMutation.mutate({
                          clientId: client.id,
                        })
                      }
                    />
                  </div>
                </TabSection>

                <TabSection title={t`Notes`}>
                  <div className="rounded-md border border-divider-regular bg-background-default px-4 py-3 text-sm text-text-secondary">
                    {client.notes || (
                      <span className="text-text-tertiary italic">
                        <Trans>No notes.</Trans>
                      </span>
                    )}
                  </div>
                </TabSection>

                <TabSection
                  title={t`Activity log`}
                  summary={t`Recent audited changes for this client record`}
                >
                  {/* ClientActivityPanel renders each audit event as
                      its own bordered row. No outer wrapper — would
                      stack a frame around the per-row frames. */}
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
            route. Width is fixed 480px on xl+, full-width stacked
            below the entire client surface at narrower viewports.
            Now a sibling of the left column wrapper (was nested
            inside the body) so opening an obligation pushes the
            PageHeader, summary strip, alerts, AND the filing plan
            all left at once. */}
        {activeObligationId ? (
          <aside className="w-full min-w-0 xl:w-[480px] xl:shrink-0">
            <ObligationPanelDispatcher
              obligationId={activeObligationId}
              activeTab={obligationTab}
              onTabChange={setObligationTab}
              onClose={closeObligationPanel}
              onNeedsInput={() => {
                // Penalty-input dialog is route-local to /obligations;
                // not wired here. CPAs can deep-link to the queue
                // for that flow.
              }}
              practiceAiEnabled={practiceAiEnabled}
              blockerCandidates={[]}
            />
          </aside>
        ) : null}
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
                filings, and obligations stay retained. You can restore from the archived view if
                you change your mind.
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
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium leading-4 uppercase outline-none focus-visible:text-text-primary',
        alignRight ? 'justify-end' : 'text-left',
        active ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary',
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
          description: rpcErrorMessage(err) ?? t`Please try again.`,
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
      {/* 2026-05-24 (Figma replica): each year section is now wrapped
          in its own framed block — `bg-background-soft` (#f9fafb) +
          `rounded-xl` (12px) + a faint inset border. The column
          header bar lives INSIDE the frame, paired with the rows it
          legends. This replaces the prior single-column-header-above-
          all-years shape. Trade-off: column legend repeats per year
          (which the Figma accepts as the cost of self-contained
          year cards) — but each section now reads as a self-
          contained year card and scanning year-by-year is much
          easier when there are 3+ years of history. */}
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
  // 2026-05-24 (Figma replica pass): year section snapped to the
  // pixel-exact frame from the Figma Make export.
  //   - Outer frame: `bg-background-soft` (#f9fafb) + `rounded-xl`
  //     (12px) + an inset `border-divider-subtle` hairline.
  //   - Year header row: year + `· current year` italic marker +
  //     the "N open filing" badge — bg-accent-soft + text-accent for
  //     the current year, bg-gray-soft + text-tertiary for any
  //     prior year. Padding `px-3 py-3`.
  //   - Column header bar: bg-gray-soft inside the frame (not
  //     bg-white) so it reads as the section's legend. Padding
  //     `px-3 py-2`, text 12px medium tertiary.
  //   - Row cells: 12px text. Form name medium, dates regular,
  //     status as the pill from ObligationQueueStatusControl,
  //     estimate right-aligned regular. Row padding `px-3 py-2`,
  //     border-b `#f3f4f6` hairline between rows.
  //   - Leading "N" badge: pl-3 on the row, badge bg-gray-soft
  //     rounded-full w-5 (20px), 12px medium tertiary text.
  const isUnknown = group.year === 'unknown'
  return (
    <div className="overflow-hidden rounded-xl border border-divider-subtle bg-background-soft">
      {/* Year header bar */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-3">
        <span className="text-sm font-medium leading-5 tabular-nums text-text-primary">
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
      <div className="flex items-center gap-2 border-y border-divider-subtle px-3 py-2 text-xs font-medium leading-4 text-text-tertiary">
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
          <Trans>FORM</Trans>
        </FilingPlanSortHeader>
        <FilingPlanSortHeader
          className="w-[120px]"
          active={sort.field === 'internal'}
          dir={sort.dir}
          title={t`The firm-side soft target — when this filing should be ready internally for the deadline window`}
          onClick={() => onCycleSort('internal')}
        >
          <Trans>Internal Deadline</Trans>
        </FilingPlanSortHeader>
        <FilingPlanSortHeader
          className="w-[120px]"
          active={sort.field === 'official'}
          dir={sort.dir}
          title={t`The IRS / state statutory due date — the hard deadline the filing must be submitted by`}
          onClick={() => onCycleSort('official')}
        >
          <Trans>Official Deadline</Trans>
        </FilingPlanSortHeader>
        <FilingPlanSortHeader
          className="w-[120px]"
          active={sort.field === 'status'}
          dir={sort.dir}
          onClick={() => onCycleSort('status')}
        >
          <Trans>Status</Trans>
        </FilingPlanSortHeader>
        <FilingPlanSortHeader
          className="w-[120px] justify-end"
          active={sort.field === 'estimate'}
          dir={sort.dir}
          onClick={() => onCycleSort('estimate')}
          alignRight
        >
          <Trans>Estimated tax</Trans>
        </FilingPlanSortHeader>
      </div>
      {/* Rows — flat list against the section frame, each separated
          by a `#f3f4f6` hairline. Last row has no border-b.

          2026-05-24 (shape — critique): rows now use `sortedObligations`
          (panel-level sort applied). The leading "N" badge was
          replaced with a per-row selection checkbox so the same slot
          carries the multi-select affordance the bulk bar reads from. */}
      <div className="bg-background-default">
        {sortedObligations.map((obligation, rowIndex) => {
          const hasEstimate = obligation.estimatedTaxDueCents !== null
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
                'group/row flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors hover:bg-state-base-hover',
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
                className="min-w-0 flex-1 truncate rounded-sm text-left text-xs font-medium leading-4 text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                {/* 2026-05-24 (re-critique smoke-test): the previous
                    shape wrapped `<TaxCodeLabel>` (which renders a
                    `<TooltipTrigger>` button) inside this outer
                    button — invalid HTML (`<button>` inside
                    `<button>`) that fired a hydration error on every
                    filing-plan render. `asChild` switches the
                    tooltip trigger to a `<span>` so the row button
                    stays a single button. The tooltip still fires
                    via the trigger's pointer handlers on the span. */}
                <TaxCodeLabel code={obligation.taxType} asChild />
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
                    className="rounded-sm bg-components-badge-bg-blue-soft px-1 py-0 text-[10px] font-medium leading-4 text-text-accent"
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
              <span className="w-[120px] text-right text-xs leading-4 tabular-nums text-text-primary">
                {hasEstimate ? formatCents(obligation.estimatedTaxDueCents ?? 0) : ''}
              </span>
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
        <h3 className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-text-warning">
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
  canReadAudit,
}: {
  clientId: string
  canReadAudit: boolean
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  if (!canReadAudit) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" aria-label={t`More client actions`}>
            <MoreHorizontalIcon className="size-4" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuItem
          onClick={() => void navigate(`/audit?entityId=${clientId}&entityType=client`)}
        >
          <ScrollTextIcon className="size-4" aria-hidden />
          <Trans>View audit log</Trans>
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
  return (
    <div className="grid gap-2">
      {events.map((event) => (
        <div
          key={event.id}
          className="grid gap-1 rounded-md border border-divider-subtle bg-background-section p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-text-primary">{event.action}</span>
            <span className="text-xs tabular-nums text-text-tertiary">
              {formatDateTimeWithTimezone(event.createdAt, firmTimezone)}
            </span>
          </div>
          <p className="text-xs text-text-tertiary">
            {event.actorLabel ?? event.actorId ?? 'System'}
          </p>
        </div>
      ))}
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
          {isSaving ? t`Saving...` : t`Save`}
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
        {isSaving ? t`Saving...` : t`Save risk profile`}
      </Button>
    </div>
  )
}

function ClientRiskSummaryPanel({
  insight,
  isLoading,
  isRefreshing,
  canRefresh,
  firmTimezone,
  onRefresh,
}: {
  insight: AiInsightPublic | null
  isLoading: boolean
  isRefreshing: boolean
  canRefresh: boolean
  firmTimezone: string
  onRefresh: () => void
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-end gap-2">
        <div className="flex shrink-0 items-center gap-2">
          {insight ? <InsightStatusBadge status={insight.status} /> : null}
          {canRefresh ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              onClick={onRefresh}
            >
              <RefreshCwIcon data-icon="inline-start" />
              {isRefreshing ? <Trans>Queued</Trans> : <Trans>Refresh</Trans>}
            </Button>
          ) : (
            <UpgradeCtaButton />
          )}
        </div>
      </div>
      {isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : insight ? (
        <div className="grid gap-3">
          {insight.sections.map((section) => (
            <InsightSection key={section.key} section={section} insight={insight} />
          ))}
          <span className="text-xs text-text-tertiary">
            {insight.generatedAt ? (
              formatDateTimeWithTimezone(insight.generatedAt, firmTimezone)
            ) : (
              <Trans>Pending</Trans>
            )}
          </span>
        </div>
      ) : null}
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

function ClientImportSourcePanel({ client }: { client: ClientPublic }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <ClientImportSourceField
        label={<Trans>External client ID</Trans>}
        value={client.externalClientId}
      />
      <ClientImportSourceField label={<Trans>Source status</Trans>} value={client.sourceStatus} />
      <ClientImportSourceField label={<Trans>Address line 1</Trans>} value={client.addressLine1} />
      <ClientImportSourceField label={<Trans>City</Trans>} value={client.city} />
      <ClientImportSourceField label={<Trans>ZIP / postal code</Trans>} value={client.postalCode} />
      <ClientImportSourceField label={<Trans>Primary phone</Trans>} value={client.primaryPhone} />
    </dl>
  )
}

function ClientImportSourceField({ label, value }: { label: ReactNode; value: string | null }) {
  return (
    <div className="min-w-0 rounded-md border border-divider-subtle bg-background-base px-3 py-2">
      <dt className="text-xs font-medium text-text-tertiary">{label}</dt>
      <dd className="mt-1 truncate text-sm text-text-primary">
        {value ? value : <span className="text-text-tertiary">N/A</span>}
      </dd>
    </div>
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
      <span
        aria-label={t`Unassigned`}
        title={t`Unassigned`}
        className="inline-flex size-6 items-center justify-center rounded-full bg-background-subtle text-text-tertiary"
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
  const tint = ASSIGNEE_TINTS[hashStringToBucket(name, ASSIGNEE_TINTS.length)]
  return (
    <span
      aria-label={title}
      title={title}
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-tight',
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
  const tint =
    name === null ? null : ASSIGNEE_TINTS[hashStringToBucket(name, ASSIGNEE_TINTS.length)]
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
          <button
            type="button"
            aria-label={triggerLabel}
            title={triggerLabel}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-divider-regular bg-background-default px-2 py-0.5 text-xs outline-none transition-colors hover:border-divider-deep hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50',
              name === null ? 'text-text-secondary' : 'text-text-primary',
            )}
          >
            {name === null ? (
              <>
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-background-subtle text-text-tertiary">
                  <UserRoundIcon className="size-3" aria-hidden />
                </span>
                <Trans>Unassigned</Trans>
              </>
            ) : (
              <>
                <span
                  className={cn(
                    'inline-flex size-4 items-center justify-center rounded-full text-[9px] font-semibold uppercase tracking-tight',
                    isMine ? 'bg-state-accent-hover-alt text-text-accent' : tint,
                  )}
                >
                  {initialsFromName(name)}
                </span>
                <span className="truncate">{name}</span>
              </>
            )}
            <ChevronDownIcon className="size-3 text-text-tertiary" aria-hidden />
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
                  'inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-tight',
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
              const memberTint =
                ASSIGNEE_TINTS[hashStringToBucket(member.name, ASSIGNEE_TINTS.length)]
              const isCurrentUser =
                currentUserName !== null &&
                member.name.trim().toLowerCase() === currentUserName.toLowerCase()
              return (
                <DropdownMenuRadioItem key={member.assigneeId} value={member.assigneeId}>
                  <span
                    className={cn(
                      'inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-tight',
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

// Six muted background+text pairings. Picked to feel like assignee
// avatars (low chroma, distinguishable) without competing with the
// status / readiness palette which carries semantic meaning.
const ASSIGNEE_TINTS = [
  'bg-state-base-hover-alt text-text-secondary',
  'bg-state-warning-hover text-text-primary',
  'bg-state-success-hover text-text-primary',
  'bg-state-destructive-hover text-text-primary',
  'bg-state-accent-hover-alt text-text-accent',
  'bg-background-subtle text-text-tertiary',
] as const

function hashStringToBucket(value: string, buckets: number): number {
  // FNV-1a-ish. Pure, stable per input — same name always lands in
  // the same bucket so the same person looks the same across the app.
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = (hash * 16777619) >>> 0
  }
  return hash % buckets
}

function ClientReadinessBadge({
  readiness,
  compact,
}: {
  readiness: ClientReadiness | undefined
  compact: boolean
}) {
  if (readiness?.status === 'needs_facts') {
    return (
      <Badge variant="warning" className="text-xs">
        <BadgeStatusDot tone="warning" />
        {compact ? <Trans>Needs facts</Trans> : <MissingFactsLabel readiness={readiness} />}
      </Badge>
    )
  }

  return (
    <Badge variant="success" className="text-xs">
      <BadgeStatusDot tone="success" />
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

/**
 * D-extra (2026-05-23): quiet metadata row under the client title.
 * Reads `✉ email · ☎ phone · Since Mar 2023` — only the fields the
 * schema has on this client, hidden entirely when nothing's there.
 *
 * Email + phone are real action links (`mailto:` / `tel:`) so a CPA
 * can act without leaving the page. "Since" is derived from
 * `client.createdAt` via the same Intl format the Compliance posture
 * panel uses (Mar 2023 / Apr 2024).
 *
 * Stays muted (`text-text-tertiary text-xs`) — it's reference info,
 * not a status signal. Doesn't compete with the identity chips above
 * or the active-alerts section below.
 */
/**
 * UI guards against malformed `client.primary*` values bleeding
 * through from demo / migration / import data. Real-world cases that
 * have shown up:
 *  - phone field carrying the literal source column name
 *    (`"primary_phone"`) when a migration mapping wasn't fully
 *    resolved at commit time;
 *  - email field similarly carrying `"primary_contact_email"`.
 * If the value clearly isn't a phone (no digits) or an email (no @),
 * we treat it as absent rather than print the raw token on the
 * header. The underlying data still needs fixing in those cases —
 * but the workbench header should never render `primary_phone` to a
 * CPA in the meantime.
 */
function looksLikePhone(value: string | null | undefined): value is string {
  if (!value) return false
  const digits = value.replace(/\D/g, '')
  return digits.length >= 3
}

function looksLikeEmail(value: string | null | undefined): value is string {
  if (!value) return false
  return /.+@.+\..+/.test(value)
}

function ClientContactMetaRow({ client }: { client: ClientPublic }) {
  // 2026-05-23: dropped the "Since {Mon YYYY}" tag from this row.
  // It was the third entry alongside email + phone and didn't help
  // the daily workflow — the CPA already knows when they took this
  // client on, and the precise import/created date is discoverable
  // via the Activity tab / Audit log when needed. Critique flagged
  // it as "is this important? can you group it somewhere else?"
  const showEmail = looksLikeEmail(client.primaryContactEmail)
  const showPhone = looksLikePhone(client.primaryPhone)
  if (!showEmail && !showPhone) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
      {showEmail ? (
        <a
          href={`mailto:${client.primaryContactEmail}`}
          className="inline-flex items-center gap-1 rounded-sm outline-none hover:text-text-primary focus-visible:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <MailIcon className="size-3.5" aria-hidden />
          <span className="truncate">{client.primaryContactEmail}</span>
        </a>
      ) : null}
      {showPhone ? (
        <a
          href={`tel:${client.primaryPhone}`}
          className="inline-flex items-center gap-1 rounded-sm font-mono outline-none hover:text-text-primary focus-visible:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <PhoneIcon className="size-3.5" aria-hidden />
          <span>{client.primaryPhone}</span>
        </a>
      ) : null}
    </div>
  )
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
// `obligations.createBatch` with the rule's identifiers; the server
// resolves the dueDateLogic into a concrete baseDueDate.
type SuggestedRule = {
  rule: ObligationRule
  // Computed default date for the Add-deadline form. Heuristic — see
  // computeDefaultDueDateFromRule.
  defaultBaseDueDate: string
}

function computeDefaultDueDateFromRule(rule: ObligationRule): string {
  // Best-effort: handle the simple kinds. For period_table and
  // source_defined_calendar, fall back to today + 30 days as a
  // placeholder — the user can adjust before saving.
  const logic = rule.dueDateLogic
  if (logic.kind === 'fixed_date') return logic.date
  if (logic.kind === 'nth_day_after_tax_year_end') {
    // Assume calendar year — tax year ends Dec 31 of (applicableYear - 1)
    const year = rule.applicableYear
    const month = String(logic.monthOffset).padStart(2, '0')
    const day = String(logic.day).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  if (logic.kind === 'nth_day_after_tax_year_begin') {
    const year = rule.applicableYear
    const month = String(logic.monthOffset).padStart(2, '0')
    const day = String(logic.day).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const fallback = new Date()
  fallback.setDate(fallback.getDate() + 30)
  return fallback.toISOString().slice(0, 10)
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
    .map((rule) => ({ rule, defaultBaseDueDate: computeDefaultDueDateFromRule(rule) }))
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
    orpc.obligations.createBatch.mutationOptions({
      onMutate: (variables) => {
        const first = variables.obligations[0]
        if (first?.ruleId) setPendingRuleId(first.ruleId)
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
          description: rpcErrorMessage(err) ?? t`Please try again.`,
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
    return (
      <div className="rounded-md border border-divider-subtle bg-background-default p-4">
        <Skeleton className="mb-2 h-4 w-40" />
        <Skeleton className="h-3 w-72" />
      </div>
    )
  }
  if (applicable.length === 0) return null

  function addDeadline(suggestion: SuggestedRule) {
    createMutation.mutate({
      obligations: [
        {
          clientId: client.id,
          taxType: suggestion.rule.taxType,
          taxYear: suggestion.rule.applicableYear,
          ruleId: suggestion.rule.id,
          ruleVersion: suggestion.rule.version,
          generationSource: 'manual',
          jurisdiction: suggestion.rule.jurisdiction,
          formName: suggestion.rule.formName,
          obligationType: suggestion.rule.obligationType,
          baseDueDate: suggestion.defaultBaseDueDate,
        },
      ],
    })
  }

  return (
    <div className="rounded-md border border-divider-subtle bg-background-default">
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
                    <Badge
                      variant="warning"
                      className="cursor-default rounded-sm text-[10px] uppercase tracking-wide"
                    >
                      <Plural value={suggested.length} one="# gap" other="# gap" />
                    </Badge>
                  }
                />
                <TooltipContent className="max-w-sm whitespace-normal text-left">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
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
                obligation.
              </Trans>
            }
          />
        </div>
      ) : (
        <>
          <div className="border-t border-state-warning-border bg-state-warning-hover/50 px-4 py-2">
            <p className="text-xs font-medium tracking-[0.08em] text-text-warning uppercase">
              <Trans>Suggested</Trans>
              {' · '}
              <Plural value={suggested.length} one="# rule" other="# rules" />
            </p>
            <p className="mt-0.5 text-[11px] font-normal tracking-normal text-text-secondary normal-case">
              <Trans>Applicable rules with no deadline scheduled yet.</Trans>
            </p>
          </div>
          <div className="grid divide-y divide-divider-subtle">
            {suggested.map((suggestion) => {
              const isPending = pendingRuleId === suggestion.rule.id && createMutation.isPending
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
                      <span className="text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
                        {suggestion.rule.jurisdiction}
                      </span>
                    </div>
                    <p className="text-xs leading-snug text-text-tertiary">
                      {suggestion.rule.title} ·{' '}
                      <Trans>default due {formatDatePretty(suggestion.defaultBaseDueDate)}</Trans>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addDeadline(suggestion)}
                    disabled={createMutation.isPending}
                  >
                    {isPending ? (
                      <RefreshCwIcon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <PlusIcon data-icon="inline-start" />
                    )}
                    <Trans>Add deadline</Trans>
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
