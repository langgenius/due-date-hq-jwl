import { type KeyboardEvent, type ReactNode, useCallback, useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { parseAsStringLiteral, useQueryState } from 'nuqs'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArchiveIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  DownloadIcon,
  EyeIcon,
  FileSearchIcon,
  MailIcon,
  MegaphoneIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  PinIcon,
  PlusIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  SettingsIcon,
  SparklesIcon,
  UsersRoundIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  AiInsightPublic,
  AuditEventPublic,
  ClientFilingProfilesReplaceInput,
  ClientPublic,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@duedatehq/ui/components/ui/collapsible'
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
import { SectionFrame, SectionLabel } from '@/features/rules/rules-console-primitives'

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

function DetailSection({
  title,
  summary,
  defaultOpen = false,
  open,
  onOpenChange,
  attention = false,
  id,
  children,
}: {
  title: ReactNode
  summary?: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  attention?: boolean
  id?: string
  children: ReactNode
}) {
  const collapsibleStateProps = open === undefined ? { defaultOpen } : { open, onOpenChange }

  return (
    <SectionFrame
      className={cn(
        'scroll-mt-20',
        attention &&
          'border-components-badge-bg-warning-soft bg-components-badge-bg-warning-soft/40',
      )}
    >
      <Collapsible id={id} {...collapsibleStateProps}>
        <CollapsibleTrigger
          className={cn(
            'group flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-state-base-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-state-accent-active-alt',
            attention && 'hover:bg-components-badge-bg-warning-soft/70',
          )}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <SectionLabel>{title}</SectionLabel>
            {summary ? (
              <span className="truncate text-[13px] text-text-secondary">{summary}</span>
            ) : null}
          </div>
          <ChevronDownIcon
            className="size-4 shrink-0 text-text-tertiary transition-transform group-data-[panel-open]:rotate-180"
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsiblePanel className="border-t border-divider-subtle px-4 py-3">
          {children}
        </CollapsiblePanel>
      </Collapsible>
    </SectionFrame>
  )
}

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
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((state) => (
        <Badge
          key={state}
          variant="secondary"
          className="rounded-sm font-mono uppercase tabular-nums"
        >
          {state}
        </Badge>
      ))}
      {overflow > 0 ? (
        <Badge variant="outline" className="rounded-sm font-mono tabular-nums">
          +{overflow}
        </Badge>
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
  // (what kind of client → workload → urgency → tone).
  const parts: Array<{ id: string; node: ReactNode }> = []
  const taxLabel = entityType === 'llc' ? taxClassificationLabel(taxClassification) : null
  if (taxLabel) parts.push({ id: 'tax', node: <span>{taxLabel}</span> })
  parts.push({
    id: 'open',
    node: (
      <span>
        {workPlan.openCount === 1 ? '1 open filing' : `${workPlan.openCount} open filings`}
      </span>
    ),
  })
  if (workPlan.nextDueDate) {
    parts.push({
      id: 'due',
      node: <span>next due {formatDatePretty(workPlan.nextDueDate)}</span>,
    })
  }
  if (workPlan.overdueOpenCount > 0) {
    parts.push({
      id: 'late',
      node: (
        <span className="font-medium text-text-destructive">
          {workPlan.overdueOpenCount === 1 ? '1 late' : `${workPlan.overdueOpenCount} late`}
        </span>
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
  isLoading,
  clientFilter,
  stateFilter,
  ownerFilter,
  pulseMatchesByClient,
  obligationSummariesByClient,
  opportunityCountByClient,
  onClientFilterChange,
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
        // Header is just the filter trigger — the bare "9" count badge
        // that used to sit here was mysterious (sort order? sort dir?
        // filtered subset?) and competed visually with the column
        // label. The count belongs in the action strip / pagination
        // footer, not the column header.
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
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
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`States`}
            open={openHeaderFilter === 'state'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('state', nextOpen)}
            options={stateOptions}
            selected={stateFilter}
            emptyLabel={t`No states`}
            onSelectedChange={onStateFilterChange}
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
        // L-5 (2026-05-23): collapsed from a 3-line composite (date +
        // form + readiness chip) to a single tone-coded line. The
        // form/tax-type moved to the hover peek (already accessible
        // via the eye icon next to the client name) and the readiness
        // chip moved to the NAME column so the row reads in one scan.
        // Tone semantics: late = red, due today = amber, within 7d =
        // amber, beyond = neutral. Matches the obligations queue's
        // urgency vocabulary.
        id: 'nextDue',
        header: t`Next due`,
        cell: ({ row }) => {
          const summary = obligationSummariesByClient.get(row.original.id)
          if (!summary?.nextDueDate) {
            return <span className="text-text-tertiary">—</span>
          }
          return <NextDueRelativeLabel iso={summary.nextDueDate} />
        },
        meta: {
          headerClassName: 'w-[120px]',
          cellClassName: 'w-[120px]',
        },
      },
      {
        // 2026-05-23: surfaces the WORKFLOW phase of the row whose due
        // date populates the Next due cell. Answers the question
        // "Xd late — but why?" without forcing the CPA to open the
        // drawer. Same status pill the obligation drawer header uses
        // (`ObligationStatusReadBadge`) for visual continuity. When
        // the client has no open obligations, renders an em-dash to
        // stay aligned with the Next due cell's empty treatment.
        id: 'nextDueStatus',
        header: t`Status`,
        cell: ({ row }) => {
          const summary = obligationSummariesByClient.get(row.original.id)
          if (!summary?.nextDueStatus) {
            return <span className="text-text-tertiary">—</span>
          }
          return (
            <ObligationStatusReadBadge status={summary.nextDueStatus} className="font-normal" />
          )
        },
        meta: {
          headerClassName: 'w-[140px]',
          cellClassName: 'w-[140px]',
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
        header: () => <span className="block text-right">{t`Open`}</span>,
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
        accessorKey: 'assigneeName',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
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
        id: 'opportunities',
        header: t`Opportunities`,
        cell: ({ row }) => {
          const count = opportunityCountByClient.get(row.original.id) ?? 0
          if (count === 0) {
            return <span className="text-text-tertiary tabular-nums">—</span>
          }
          return <ClientOpportunityCountBadge count={count} />
        },
        meta: {
          // Was 120px → "OPPORTUNI…" truncated the header. Bump to
          // 140px so the full "Opportunities" label fits.
          headerClassName: 'w-[140px]',
          cellClassName: 'w-[140px]',
        },
      },
    ],
    [
      clientFilter,
      clientOptions,
      currentUserName,
      factsModel.readinessById,
      obligationSummariesByClient,
      onClientFilterChange,
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

  const table = useReactTable({
    data: visibleClients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
      void navigate(`/clients/${clientId}`)
    },
    [navigate],
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
              <Plural
                value={needsFactsCount}
                one="# client is missing state or entity type — the rule library is skipping it."
                other="# clients are missing state or entity type — the rule library is skipping them."
              />
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
            key: 'pulse',
            value: pulseHitCount,
            label: t`Pulse hits`,
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
  const [filingJurisdictionsOpen, setFilingJurisdictionsOpen] = useState(false)
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
  const missingFilingState = Boolean(readiness?.missingRequiredFacts.includes('state'))
  const openFilingJurisdictions = useCallback(() => {
    setFilingJurisdictionsOpen(true)
    window.requestAnimationFrame(() => {
      document
        .getElementById('client-filing-jurisdictions')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])
  const openMissingFacts = useCallback(() => {
    openFilingJurisdictions()
  }, [openFilingJurisdictions])

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
              // Stack title + identity chips vertically by default so the
              // chip cluster lives on its own row immediately under the
              // H1. On xl+ viewports they share one row — the previous
              // `flex-wrap` behavior at every breakpoint caused chips to
              // collide with the right-edge action cluster on 1100-1280px
              // viewports and the second line of chips left-aligned to
              // the page edge instead of under the H1.
              <span className="flex flex-col items-start gap-y-2 xl:flex-row xl:flex-wrap xl:items-center xl:gap-x-3">
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
            description={renderClientHeaderSubLine({
              workPlan,
              entityType: client.entityType,
              taxClassification: client.taxClassification,
            })}
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
                <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
                  <ArchiveIcon data-icon="inline-start" />
                  <Trans>Archive</Trans>
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

              <TabsContent value="work" className="flex flex-col gap-4 pt-4">
                <ClientWorkPlanPanel
                  obligations={obligations}
                  isLoading={obligationsQuery.isLoading}
                  summary={workPlan}
                  clientName={client.name}
                  onChangeStatus={handleChangeObligationStatus}
                  isStatusChangePending={changeStatusMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="info" className="flex flex-col gap-4 pt-4">
                {/* Compliance posture — moved here from the daily-driver
                    area. EIN + tax year + owners + activity-scope flags
                    are client identity facts, not "work" in progress.
                    The CPA edits / verifies these quarterly, not daily. */}
                <ClientCompliancePosturePanel client={client} />

                <DetailSection
                  id="client-filing-jurisdictions"
                  title={t`Filing jurisdictions`}
                  summary={formatJurisdictionSummary(client)}
                  open={filingJurisdictionsOpen}
                  onOpenChange={setFilingJurisdictionsOpen}
                  attention={missingFilingState}
                >
                  <ClientJurisdictionPanel
                    key={`${client.id}:jurisdiction`}
                    client={client}
                    isSaving={replaceFilingProfilesMutation.isPending}
                    onSave={(input) => replaceFilingProfilesMutation.mutate(input)}
                  />
                </DetailSection>

                <DetailSection
                  title={t`Risk profile`}
                  summary={t`Penalty exposure and tax-attribute flags`}
                >
                  <ClientRiskInputsPanel
                    key={`${client.id}:risk`}
                    client={client}
                    isSaving={updateRiskProfileMutation.isPending}
                    onSave={(input) => updateRiskProfileMutation.mutate(input)}
                  />
                </DetailSection>

                <DetailSection
                  title={t`Onboarding state`}
                  summary={
                    readiness && readiness.missingRequiredFacts.length > 0
                      ? t`${readiness.missingRequiredFacts.length} required fact(s) missing`
                      : t`All required facts present`
                  }
                >
                  <ClientFactChecklist client={client} readiness={readiness} />
                </DetailSection>

                <DetailSection title={t`Import source`} summary={formatImportSourceSummary(client)}>
                  <ClientImportSourcePanel client={client} />
                </DetailSection>
              </TabsContent>

              <TabsContent value="discover" className="flex flex-col gap-4 pt-4">
                <DetailSection
                  title={t`Suggested forms`}
                  summary={t`Forms the rule library can add without a new deadline`}
                  defaultOpen
                >
                  <SuggestedFormsCatalogPanel client={client} existingObligations={obligations} />
                </DetailSection>

                <DetailSection
                  title={t`Future business cues`}
                  summary={t`Advisory, scope, and retention opportunities`}
                >
                  <ClientOpportunitiesCard clientId={client.id} />
                </DetailSection>
              </TabsContent>

              <TabsContent value="activity" className="flex flex-col gap-4 pt-4">
                {/* Activity content only renders when the tab is the
                    active one — the surrounding TabsContent gates the
                    AI summary + audit log queries that fire inside. */}
                <DetailSection
                  title={t`Client summary (AI)`}
                  summary={
                    riskSummaryQuery.data?.generatedAt
                      ? t`Refreshed ${formatDateTimeWithTimezone(riskSummaryQuery.data.generatedAt, firmTimezone)}`
                      : t`No summary yet`
                  }
                  defaultOpen
                >
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
                </DetailSection>

                <SectionFrame className="bg-background-section p-3">
                  <SectionLabel>
                    <Trans>Notes</Trans>
                  </SectionLabel>
                  <p className="mt-2 text-sm text-text-secondary">
                    {client.notes || <Trans>No notes.</Trans>}
                  </p>
                </SectionFrame>

                <DetailSection
                  title={t`Activity log`}
                  summary={t`Recent audited changes for this client record`}
                >
                  <ClientActivityPanel
                    events={auditQuery.data?.events ?? []}
                    canReadAudit={canReadAudit}
                    isLoading={auditQuery.isLoading}
                    firmTimezone={firmTimezone}
                  />
                </DetailSection>
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
  const yearGroups = useMemo(() => groupObligationsByTaxYear(obligations), [obligations])
  return (
    // 2026-05-23: dropped the outer panel frame. The Work tab now
    // contains only this filing-plan view — wrapping it in a
    // bordered card created chrome-on-chrome ("card inside the tab
    // body, which is inside a section, which is inside a page").
    // Headings + legend + rows now live flat against the tab
    // background, with type hierarchy carrying the structure.
    <div className="grid gap-3">
      {/* Title + count line. Flat heading, no tinted band — the H2
          itself does the section-anchoring job that the bordered
          panel header used to do. */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h2 className="text-base font-semibold text-text-primary">
          <Trans>Filing plan</Trans>
        </h2>
        {/* Count subtitle uses the same word ("deadlines") as the
            sidebar / queue / Deadlines page so the CPA reads this as
            a year-grouped slice of the same primitive, not a
            separate concept. */}
        <span className="text-xs text-text-tertiary">
          <Plural value={obligations.length} one="# deadline" other="# deadlines" />{' '}
          <Trans>across</Trans>{' '}
          <Plural value={yearGroups.length} one="# tax year" other="# tax years" />
        </span>
      </div>
      {/* Column legend sits above all year sections so it reads as
          the table's column header for the whole filing plan — not
          just the first year. Widths mirror the per-row TableCells
          below (flex-1 / 132 / 160 / 110) with matching `px-3` inner
          padding. */}
      {!isLoading && obligations.length > 0 ? (
        <div className="flex items-center border-b border-divider-regular py-2 text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
          <div className="flex-1 px-3">
            <Trans>Form</Trans>
          </div>
          <div className="w-[132px] px-3">
            <Trans>Due</Trans>
          </div>
          <div className="w-[160px] px-3">
            <Trans>Status</Trans>
          </div>
          <div className="w-[110px] px-3 text-right">
            <Trans>Est. tax</Trans>
          </div>
        </div>
      ) : null}
      <div>
        {isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
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
          // Year sections separated by `divide-y` so each year has a
          // clear terminus — addresses the "no hierarchy / 视觉上没有
          // 终点" feedback. `pt-4` on the second-and-later sections
          // (via space-y/divide) gives breathing room without
          // re-introducing card chrome.
          <div className="divide-y divide-divider-subtle">
            {yearGroups.map((group, index) => (
              <div
                key={group.year}
                className={cn(index === 0 ? 'pb-2' : 'py-2 first:pt-0 last:pb-0')}
              >
                <FilingPlanYearSection
                  group={group}
                  clientName={clientName}
                  onOpen={(obligationId) => openObligationDrawer(obligationId)}
                  onChangeStatus={onChangeStatus}
                  isStatusChangePending={isStatusChangePending}
                />
              </div>
            ))}
          </div>
        )}
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
  onOpen,
  onChangeStatus,
  isStatusChangePending,
}: {
  group: FilingPlanYearGroup
  clientName: string
  onOpen: (obligationId: string) => void
  onChangeStatus: (id: string, status: ObligationStatus) => void
  isStatusChangePending: boolean
}) {
  const statusPickerLabels = useLifecycleV2StatusLabels()
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
        <span className="text-base font-semibold tabular-nums text-text-primary">
          {group.year === 'unknown' ? <Trans>No tax year</Trans> : group.year}
        </span>
        {/* 2026-05-23: replaced the outline `Current tax year` Badge
            with a quiet italic tertiary marker. The Badge competed
            for attention with the next-due chip and the row status
            chips below — three different visual vocabularies stacked
            in one section. Italic small-text reads as a footnote, not
            as a control; the year number is already the primary
            anchor so the marker only needs to disambiguate. */}
        {group.isCurrent ? (
          <span className="text-xs italic text-text-tertiary">
            <Trans>current year</Trans>
          </span>
        ) : null}
        <span className="text-xs text-text-tertiary">
          <Trans>{group.openCount} open</Trans>
          {group.extendedCount > 0 ? (
            <>
              <span aria-hidden className="mx-1">
                ·
              </span>
              <Trans>{group.extendedCount} extended</Trans>
            </>
          ) : null}
        </span>
      </div>
      {/* Filing plan row table: no inner border. The outer
          ClientWorkPlanPanel already carries `rounded-md border` —
          nesting a second border inside (the previous shape) gave a
          card-inside-a-card visual. Rows just live as a flat list
          inside the panel's content area, separated by light
          dividers. Cleaner read.

          2026-05-23: column header lives at the panel-body level
          (above all year sections) so it reads as a real legend, not
          as a row inside the first year. */}
      <Table className="table-fixed">
        <TableBody className="[&_tr]:border-b-divider-subtle [&_td]:py-3">
          {group.obligations.map((obligation) => {
            const hasEstimate = obligation.estimatedTaxDueCents !== null
            return (
              <TableRow
                key={obligation.id}
                tabIndex={0}
                role="link"
                aria-label={`${formatTaxCode(obligation.taxType)} — ${formatDatePretty(obligation.currentDueDate, { alwaysShowYear: true })}`}
                className="group/row cursor-pointer hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:outline-none"
                onClick={() => onOpen(obligation.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onOpen(obligation.id)
                  }
                }}
              >
                <TableCell>
                  <span className="truncate font-medium text-text-primary">
                    <TaxCodeLabel code={obligation.taxType} />
                  </span>
                </TableCell>
                <TableCell className="w-[132px]">
                  {formatDatePretty(obligation.currentDueDate, { alwaysShowYear: true })}
                </TableCell>
                <TableCell className="w-[160px]">
                  {/* D-6b: status chip is now a real picker dropdown.
                      Same canonical control as the obligations queue
                      uses, so the v2 lifecycle vocabulary (and the
                      illegal-transition guard) stays consistent. The
                      control internally `event.stopPropagation()`s so
                      opening the dropdown doesn't also trigger
                      row-click → in-page drawer. */}
                  <ObligationQueueStatusControl
                    row={{ id: obligation.id, status: obligation.status, clientName }}
                    labels={statusPickerLabels}
                    statuses={LIFECYCLE_V2_STATUSES}
                    disabled={isStatusChangePending}
                    onChange={onChangeStatus}
                  />
                </TableCell>
                <TableCell className="w-[110px] text-right tabular-nums text-text-tertiary">
                  {hasEstimate ? formatCents(obligation.estimatedTaxDueCents ?? 0) : ''}
                </TableCell>
                {/* 2026-05-23: dropped the per-row hover-revealed
                    `FilingPlanRowQuickAction` (D-6a, "Start prep" /
                    "Docs received" / "Mark filed" depending on
                    status). It duplicated work the drawer's stage
                    actions already do — clicking a row to open the
                    drawer, then having the SAME "Start prep" button
                    on the row AND in the drawer, was the source of
                    "very confusing as there is no clarity" feedback.
                    Single source of truth now: row click → drawer →
                    stage action there. Status chip on the row stays
                    interactive for quick status flips that don't
                    need the full drawer context. */}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
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
      className="overflow-hidden rounded-md border border-divider-regular bg-background-default"
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
 * lower-priority actions that don't belong on the primary button row:
 *
 *  - **Pin to sidebar** (planned — TODO note for follow-up commit)
 *  - **Download client PDF** (planned — TODO)
 *  - **Edit client info** (planned — TODO)
 *  - **View audit log** (real — routes to /audit with this client
 *    pre-filtered)
 *
 * The three pre-implementation items render a toast when clicked so
 * the affordance feels live during the design pass; replace each
 * `onClick` handler when the underlying feature lands. See sequencing
 * doc P2 backlog entries D-extra-* for the implementation order.
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
  const announceComingSoon = (label: string) => {
    toast(t`${label} is coming soon`, {
      description: t`Feature is on the roadmap — track in docs/Design/clients-list-and-detail-critique-2026-05-22.md`,
    })
  }
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
        <DropdownMenuItem onClick={() => announceComingSoon(t`Pin to sidebar`)}>
          <PinIcon className="size-4" aria-hidden />
          <Trans>Pin to sidebar</Trans>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => announceComingSoon(t`Download client PDF`)}>
          <DownloadIcon className="size-4" aria-hidden />
          <Trans>Download client PDF</Trans>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => announceComingSoon(t`Edit client info`)}>
          <PencilIcon className="size-4" aria-hidden />
          <Trans>Edit client info</Trans>
        </DropdownMenuItem>
        {canReadAudit ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void navigate(`/audit?entityId=${clientId}&entityType=client`)}
            >
              <ScrollTextIcon className="size-4" aria-hidden />
              <Trans>View audit log</Trans>
            </DropdownMenuItem>
          </>
        ) : null}
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
