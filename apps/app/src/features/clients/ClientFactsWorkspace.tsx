import { type KeyboardEvent, type ReactNode, useCallback, useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { parseAsStringLiteral, useQueryState } from 'nuqs'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  EyeIcon,
  ExternalLinkIcon,
  FileSearchIcon,
  PlusIcon,
  RefreshCwIcon,
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
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
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
import { cn } from '@duedatehq/ui/lib/utils'

import {
  TableHeaderMultiFilter,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { formatCents, formatDate, formatDateTimeWithTimezone } from '@/lib/utils'
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
import { SurfaceSummaryStrip } from '@/features/_surface-vocabulary'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { ClientOpportunitiesCard } from '@/features/opportunities/client-opportunities-card'
import { SectionFrame, SectionLabel } from '@/features/rules/rules-console-primitives'

import { ClientBreadcrumbSwitcher } from './ClientBreadcrumbSwitcher'
import { ClientCompliancePosturePanel } from './ClientCompliancePosturePanel'
import { ClientCycleArrows } from './ClientCycleArrows'
import { useClientDrawer } from './ClientDrawerProvider'
import { ClientPeekHoverCard } from './ClientPeekHoverCard'
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
  type RequiredClientFact,
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
  onReadinessFilterChange: (value: string[]) => void
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
 * jurisdiction. Used by the standalone "Other states" column so the
 * primary state column stays a clean single-token.
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

function formatClientIdentitySubLine({
  workPlan,
  entityType,
  taxClassification,
}: {
  workPlan: ClientWorkPlanSummary
  entityType: ClientPublic['entityType']
  taxClassification: ClientPublic['taxClassification']
}): string {
  const parts: string[] = []
  const taxLabel = entityType === 'llc' ? taxClassificationLabel(taxClassification) : null
  if (taxLabel) parts.push(taxLabel)
  parts.push(workPlan.openCount === 1 ? '1 open filing' : `${workPlan.openCount} open filings`)
  if (workPlan.nextDueDate) {
    parts.push(`next due ${formatDate(workPlan.nextDueDate)}`)
  }
  if (workPlan.overdueOpenCount > 0) {
    parts.push(workPlan.overdueOpenCount === 1 ? '1 late' : `${workPlan.overdueOpenCount} late`)
  } else if (workPlan.openCount > 0) {
    parts.push('all on track')
  }
  return parts.join(' · ')
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
  pulseMatchesByClient,
  obligationSummariesByClient,
  opportunityCountByClient,
  onClientFilterChange,
  onStateFilterChange,
  onReadinessFilterChange,
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

  // Column order per the 2026-05-21 product review:
  //
  //   Client · Jurisdiction · Next due (date + form + readiness) ·
  //   Other states · # Services · # Open · Owner (avatar) · Opportunities
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
          return (
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-text-primary">
                    {row.original.name}
                  </span>
                  {matches && matches.length > 0 ? <ClientRadarBadge matches={matches} /> : null}
                </div>
                <span className="truncate text-xs text-text-tertiary">
                  {entityLabels[row.original.entityType]}
                </span>
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
            label={t`Jurisdiction`}
            open={openHeaderFilter === 'state'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('state', nextOpen)}
            options={stateOptions}
            selected={stateFilter}
            emptyLabel={t`No states`}
            onSelectedChange={onStateFilterChange}
          />
        ),
        cell: ({ row }) => {
          const primary = getPrimaryFilingState(row.original)
          if (!primary) {
            return <span className="text-text-tertiary">—</span>
          }
          return (
            <Badge variant="secondary" className="rounded-sm font-mono uppercase tabular-nums">
              {primary}
            </Badge>
          )
        },
        meta: {
          headerClassName: 'w-[110px]',
          cellClassName: 'w-[110px]',
        },
      },
      {
        id: 'nextDue',
        header: t`Next due`,
        cell: ({ row }) => {
          const summary = obligationSummariesByClient.get(row.original.id)
          const readiness = factsModel.readinessById.get(row.original.id)
          const hasNextDue = Boolean(summary?.nextDueDate)
          if (!hasNextDue && !readiness) {
            return <span className="text-text-tertiary">—</span>
          }
          return (
            <div className="flex min-w-0 flex-col gap-1">
              {summary?.nextDueDate ? (
                <span className="whitespace-nowrap tabular-nums text-text-primary">
                  {formatDate(summary.nextDueDate)}
                </span>
              ) : (
                <span className="text-text-tertiary">—</span>
              )}
              {summary?.nextTaxType ? (
                <span className="truncate text-xs text-text-tertiary">
                  <TaxCodeLabel code={summary.nextTaxType} />
                </span>
              ) : null}
              {readiness ? <ClientReadinessBadge readiness={readiness} compact /> : null}
            </div>
          )
        },
        meta: {
          headerClassName: 'w-[200px]',
          cellClassName: 'w-[200px]',
        },
      },
      {
        id: 'otherStates',
        header: t`Other states`,
        cell: ({ row }) => {
          const others = getOtherFilingStates(row.original)
          if (others.length === 0) {
            return <span className="text-text-tertiary">—</span>
          }
          const visible = others.slice(0, 3)
          const overflow = others.length - visible.length
          return (
            <div className="flex flex-wrap items-center gap-1">
              {visible.map((state) => (
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
                  title={others.slice(3).join(', ')}
                >
                  +{overflow}
                </span>
              ) : null}
            </div>
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
              aria-label={t`View ${count} open obligations for this client`}
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
      entityLabels,
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

  const table = useReactTable({
    data: filteredClients,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
        otherStates: false,
        servicesCount: false,
      },
    },
  })
  const handleOpenClientDetail = useCallback(
    (clientId: string) => {
      void navigate(`/clients/${clientId}`)
    },
    [navigate],
  )

  return (
    <>
      <ClientsActionStrip
        isLoading={isLoading}
        needsFactsCount={factsModel.summary.needsFacts}
        obligationSummariesByClient={obligationSummariesByClient}
        pulseHitCount={pulseMatchesByClient.size}
        onFixNeedsFacts={() => onReadinessFilterChange(['needs_facts'])}
        onOpenAtRisk={() => navigate('/obligations?status=blocked')}
        onOpenWaitingOnClient={() => navigate('/obligations?status=waiting_on_client')}
        onOpenPulseHits={() => onPulseFilterChange(['affected'])}
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
  onFixNeedsFacts,
  onOpenAtRisk,
  onOpenWaitingOnClient,
  onOpenPulseHits,
}: {
  isLoading: boolean
  needsFactsCount: number
  obligationSummariesByClient: ReadonlyMap<string, ClientObligationListSummary>
  pulseHitCount: number
  onFixNeedsFacts: () => void
  onOpenAtRisk: () => void
  onOpenWaitingOnClient: () => void
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
            ...(atRiskCount > 0 ? { onClick: onOpenAtRisk } : {}),
          },
          {
            key: 'waiting',
            value: waitingOnClientCount,
            label: t`waiting on client`,
            tone: waitingOnClientCount > 0 ? 'warning' : 'muted',
            ...(waitingOnClientCount > 0 ? { onClick: onOpenWaitingOnClient } : {}),
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
  const permission = useFirmPermission()
  const [filingJurisdictionsOpen, setFilingJurisdictionsOpen] = useState(false)
  const canReadAudit = permission.can('audit.read')
  // V14 sections-not-tabs (2026-05-22). Work/Activity were Tabs; now
  // they're stacked collapsible sections with URL-bound open/closed
  // state. Work opens by default (daily-driver content); Activity is
  // collapsed so the heavier AI summary + audit log queries don't
  // fire on every navigation — opens on demand.
  const [workOpenParam, setWorkOpenParam] = useQueryState(
    'work',
    parseAsStringLiteral(['open', 'closed'] as const).withDefault('open'),
  )
  const [activityOpenParam, setActivityOpenParam] = useQueryState(
    'activity',
    parseAsStringLiteral(['open', 'closed'] as const).withDefault('closed'),
  )
  const isWorkOpen = workOpenParam === 'open'
  const isActivityOpen = activityOpenParam === 'open'
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

  return (
    <>
      <div className="flex min-h-0 flex-col gap-6">
        <PageHeader
          breadcrumbs={[
            {
              label: t`Clients`,
              to: '/clients',
              render: <ClientBreadcrumbSwitcher currentClientId={client.id} />,
            },
            { label: client.name },
          ]}
          title={client.name}
          description={formatClientIdentitySubLine({
            workPlan,
            entityType: client.entityType,
            taxClassification: client.taxClassification,
          })}
          actions={
            <>
              <ClientCycleArrows currentClientId={client.id} />
              <CreateObligationDialog defaultClientId={client.id} />
              <Button
                variant="outline"
                size="sm"
                render={<Link to={`/obligations?client=${client.id}`} />}
              >
                <Trans>View all obligations</Trans>
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
              {canReadAudit ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link to={`/audit?entityId=${client.id}&entityType=client`} />}
                >
                  <Trans>View audit log</Trans>
                </Button>
              ) : null}
            </>
          }
        />

        {/* Body — split into the client-context column (left) and an
            optional obligation page panel (right) when a row in the
            filing plan is selected. The panel replaces the modal
            Sheet that used to overlay on top of the client page; the
            ObligationDrawerProvider defers to this route via the
            `routeOwnsPanel` check. PageHeader stays full-width above
            so prev/next arrows, breadcrumb switcher, and action
            cluster remain anchored regardless of panel state. */}
        <div className="flex min-h-0 flex-col gap-6 xl:flex-row xl:items-start">
          <section className="flex min-w-0 flex-1 flex-col gap-6">
            {/* Identity strip — small horizontal badge row carrying
                entity type, filing-state chips, source / readiness /
                Pulse-radar badges so the user can read the client's
                shape in one scan. */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info" className="text-xs">
                {entityLabels[client.entityType]}
              </Badge>
              <ClientFilingStateChips client={client} />
              <ClientSourceBadge client={client} />
              <ClientReadinessBadge readiness={readiness} compact={false} />
              {pulseMatches.length > 0 ? <ClientRadarBadge matches={pulseMatches} /> : null}
            </div>

            <ClientAlertsBand
              pulseMatches={pulseMatches}
              readiness={readiness}
              extensionPaymentMismatches={extensionPaymentMismatches}
              onAddFacts={openMissingFacts}
            />

            <ClientSummaryStrip clientId={client.id} obligations={obligations} />

            {/* V14 sections-not-tabs (2026-05-22): Work + Activity are
                now stacked collapsible sections instead of Tabs. URL
                params `?work=open` / `?activity=open` persist the
                expansion state so deep links land on the right shape.

                Work content order follows the four canonical questions
                from docs/Design/client-page-information-architecture.md:
                  1. "Where are we?" (alerts + summary above)
                  2. "What do they owe?" → ClientWorkPlanPanel
                  3. "What's their compliance posture?" → ClientCompliancePosturePanel
                followed by two demoted groups:
                  CONFIGURE — editable surfaces visited during onboarding + quarterly
                  DISCOVER — reference / future-business surfaces. */}
            <DetailSection
              title={t`Work`}
              open={isWorkOpen}
              onOpenChange={(open) => void setWorkOpenParam(open ? 'open' : 'closed')}
            >
              <div className="grid gap-4">
                <ClientWorkPlanPanel
                  obligations={obligations}
                  isLoading={obligationsQuery.isLoading}
                  summary={workPlan}
                />

                {/* Compliance posture — surfaces the EIN value, tax-year
              type + fiscal year end, owner counts, engagement date,
              and the five filing-activity booleans. The booleans
              drive obligation generation server-side but were
              previously invisible to the CPA. Read-only for now;
              edit flow deferred until a generic clients.update
              mutation lands. See docs/Design/client-page-information-architecture.md. */}
                <ClientCompliancePosturePanel client={client} />

                <div className="flex flex-col gap-3 pt-2">
                  <SectionLabel>
                    <Trans>CONFIGURE</Trans>
                  </SectionLabel>

                  <DetailSection
                    title={t`Import source`}
                    summary={formatImportSourceSummary(client)}
                  >
                    <ClientImportSourcePanel client={client} />
                  </DetailSection>

                  <SuggestedFormsCatalogPanel client={client} existingObligations={obligations} />

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
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <SectionLabel>
                    <Trans>DISCOVER</Trans>
                  </SectionLabel>

                  <DetailSection
                    title={t`Suggested forms`}
                    summary={t`Forms the rule library can add without a new obligation`}
                  >
                    <SuggestedFormsCatalogPanel client={client} existingObligations={obligations} />
                  </DetailSection>

                  <DetailSection
                    title={t`Future business cues`}
                    summary={t`Advisory, scope, and retention opportunities`}
                  >
                    <ClientOpportunitiesCard clientId={client.id} />
                  </DetailSection>
                </div>
              </div>
            </DetailSection>

            {/* Mailbox tab removed — was tagged "Phase 2" and surfacing it
              as a peer top-level tab implied parity it doesn't have. The
              forwarding-address widget and AI inbound-thread story will
              return once the infrastructure ships. ClientMailboxPanel
              remains in this file for that resurrection. */}

            {/* Activity section — AI narrative, free-text client notes,
              audit log. Lazy-loaded behind the collapsible header so
              the heavier AI + audit queries only fire when opened.
              Renamed from "Notes" per the 2026-05-21 IA pass: audit
              log content dominates and "Notes" undersold it. The
              static notes block keeps the SectionLabel "NOTES" since
              that section IS the freeform notes record. */}
            <DetailSection
              title={t`Activity`}
              summary={t`AI summary, notes, and audit log`}
              open={isActivityOpen}
              onOpenChange={(open) => void setActivityOpenParam(open ? 'open' : 'closed')}
            >
              <div className="grid gap-4">
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
              </div>
            </DetailSection>
          </section>

          {/* Obligation page panel — replaces the modal Sheet on this
              route. Width is fixed 480px on xl+, full-width stacked
              below the client content at narrower viewports. The
              ObligationDrawerProvider defers to this mount when
              `pathname.startsWith('/clients/')`. The panel reads
              obligationId + activeTab from the same provider state
              that the filing plan rows write, so cross-tab navigation
              stays coherent. */}
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
      </div>
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
  summary,
}: {
  obligations: readonly ObligationInstancePublic[]
  isLoading: boolean
  summary: ClientWorkPlanSummary
}) {
  const { openDrawer: openObligationDrawer } = useObligationDrawer()
  const yearGroups = useMemo(() => groupObligationsByTaxYear(obligations), [obligations])
  return (
    <div className="rounded-md border border-divider-subtle bg-background-default">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-text-primary">
            <Trans>Filing plan</Trans>
          </span>
          <span className="truncate text-xs text-text-tertiary">
            <Plural value={obligations.length} one="# filing" other="# filings" />{' '}
            <Trans>across</Trans>{' '}
            <Plural value={yearGroups.length} one="# tax year" other="# tax years" />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={summary.overdueOpenCount > 0 ? 'warning' : 'outline'}>
            <Trans>{summary.overdueOpenCount} overdue</Trans>
          </Badge>
          <Badge variant={summary.needsReviewCount > 0 ? 'warning' : 'outline'}>
            <Trans>{summary.needsReviewCount} need review</Trans>
          </Badge>
          <Badge variant="outline">
            <Trans>{summary.paymentTrackCount} payment-linked</Trans>
          </Badge>
        </div>
      </div>
      <div className="border-t border-divider-subtle px-4 py-3">
        {isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : obligations.length === 0 ? (
          <EmptyState
            icon={ClipboardListIcon}
            title={<Trans>No obligations yet</Trans>}
            description={
              <Trans>Run migration or generate rules before this client has due-date work.</Trans>
            }
          />
        ) : (
          <div className="grid gap-4">
            {yearGroups.map((group) => (
              <FilingPlanYearSection
                key={group.year}
                group={group}
                onOpen={(obligationId) => openObligationDrawer(obligationId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Per-tax-year section in the Filing plan panel. Rendered once per year
// bucket; current tax year sits at the top with a CURRENT TAX YEAR chip.
function FilingPlanYearSection({
  group,
  onOpen,
}: {
  group: FilingPlanYearGroup
  onOpen: (obligationId: string) => void
}) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-baseline gap-2 px-1">
        <span className="text-sm font-medium tabular-nums text-text-primary">
          {group.year === 'unknown' ? <Trans>No tax year</Trans> : group.year}
        </span>
        {group.isCurrent ? (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            <Trans>Current tax year</Trans>
          </Badge>
        ) : null}
        <span className="ml-auto text-xs text-text-tertiary">
          {group.extendedCount > 0 ? (
            <>
              <Trans>{group.extendedCount} extended</Trans>
              <span aria-hidden className="mx-1">
                ·
              </span>
            </>
          ) : null}
          <Trans>{group.openCount} open</Trans>
        </span>
      </div>
      <div className="rounded-md border border-divider-subtle">
        <Table className="table-fixed">
          <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
            {group.obligations.map((obligation) => (
              <TableRow
                key={obligation.id}
                tabIndex={0}
                role="link"
                aria-label={`${formatTaxCode(obligation.taxType)} — ${formatDate(obligation.currentDueDate)}`}
                className="cursor-pointer hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:outline-none"
                onClick={() => onOpen(obligation.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onOpen(obligation.id)
                  }
                }}
              >
                <TableCell>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-text-primary">
                      <TaxCodeLabel code={obligation.taxType} />
                    </span>
                    <span className="truncate text-xs text-text-tertiary">
                      {obligation.jurisdiction ?? obligation.generationSource ?? 'manual'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="w-[132px] tabular-nums">
                  {formatDate(obligation.currentDueDate)}
                </TableCell>
                <TableCell className="w-[140px]">
                  <ObligationStatusBadge obligation={obligation} />
                </TableCell>
                <TableCell className="w-[140px] text-right tabular-nums">
                  {obligation.estimatedTaxDueCents !== null
                    ? formatCents(obligation.estimatedTaxDueCents)
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function ClientAlertsBand({
  pulseMatches,
  readiness,
  extensionPaymentMismatches,
  onAddFacts,
}: {
  pulseMatches: readonly ClientPulseMatch[]
  readiness: ClientReadiness | undefined
  extensionPaymentMismatches: readonly ObligationInstancePublic[]
  onAddFacts: () => void
}) {
  const radarCount = pulseMatches.length
  const missingFacts = readiness?.missingRequiredFacts ?? []
  const extensionMismatchCount = extensionPaymentMismatches.length
  if (radarCount === 0 && missingFacts.length === 0 && extensionMismatchCount === 0) {
    return null
  }
  return (
    <div className="grid gap-2.5 rounded-md border border-components-badge-bg-warning-soft bg-components-badge-bg-warning-soft/60 p-3">
      {radarCount > 0 ? <ClientAlertsBandRadarRow matches={pulseMatches} /> : null}
      {extensionMismatchCount > 0 ? (
        <ClientAlertsBandExtensionRow obligations={extensionPaymentMismatches} />
      ) : null}
      {missingFacts.length > 0 ? (
        <ClientAlertsBandMissingFactsRow missing={missingFacts} onAddFacts={onAddFacts} />
      ) : null}
    </div>
  )
}

function ClientAlertsBandRadarRow({ matches }: { matches: readonly ClientPulseMatch[] }) {
  const taxTypes = Array.from(new Set(matches.map((match) => formatTaxCode(match.taxType)))).slice(
    0,
    3,
  )
  return (
    <div className="flex flex-wrap items-start gap-3">
      <ActivityIcon className="mt-0.5 size-4 shrink-0 text-text-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">
          {matches.length === 1 ? (
            <Trans>1 Pulse alert affecting this client</Trans>
          ) : (
            <Trans>{matches.length} Pulse alerts affecting this client</Trans>
          )}
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">{taxTypes.join(' · ')}</p>
      </div>
      <Button variant="ghost" size="sm" render={<Link to="/rules/pulse" />}>
        <Trans>View on Radar</Trans>
        <ExternalLinkIcon data-icon="inline-end" aria-hidden />
      </Button>
    </div>
  )
}

function ClientAlertsBandExtensionRow({
  obligations,
}: {
  obligations: readonly ObligationInstancePublic[]
}) {
  const taxTypes = Array.from(new Set(obligations.map((row) => formatTaxCode(row.taxType)))).slice(
    0,
    3,
  )
  return (
    <div className="flex flex-wrap items-start gap-3">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-text-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">
          {obligations.length === 1 ? (
            <Trans>1 filing extended — payment is NOT extended</Trans>
          ) : (
            <Trans>{obligations.length} filings extended — payment is NOT extended</Trans>
          )}
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">{taxTypes.join(' · ')}</p>
      </div>
    </div>
  )
}

function ClientAlertsBandMissingFactsRow({
  missing,
  onAddFacts,
}: {
  missing: readonly RequiredClientFact[]
  onAddFacts: () => void
}) {
  const labels = missing.map((fact) => {
    if (fact === 'state') return 'filing state'
    return 'entity type'
  })
  return (
    <div className="flex flex-wrap items-start gap-3">
      <ClipboardListIcon className="mt-0.5 size-4 shrink-0 text-text-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">
          <Trans>Missing required facts</Trans>
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">{labels.join(' · ')}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onAddFacts}>
        <Trans>Add facts</Trans>
      </Button>
    </div>
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

function ObligationStatusBadge({ obligation }: { obligation: ObligationInstancePublic }) {
  if (obligation.status === 'done' || obligation.status === 'paid') {
    return (
      <Badge variant="success">
        <Trans>Complete</Trans>
      </Badge>
    )
  }
  if (obligation.status === 'review' || obligation.readiness === 'needs_review') {
    return (
      <Badge variant="warning">
        <Trans>Needs review</Trans>
      </Badge>
    )
  }
  if (obligation.status === 'waiting_on_client') {
    return (
      <Badge variant="info">
        <Trans>Waiting</Trans>
      </Badge>
    )
  }
  // Fallback case: render the raw status name with title-case first
  // letter so "blocked" / "pending" read as "Blocked" / "Pending" —
  // matches the case of the explicit branches above (Complete, Needs
  // review, Waiting) and avoids the lowercase-in-a-Badge mismatch.
  const raw = obligation.status.replaceAll('_', ' ')
  const label = raw.charAt(0).toUpperCase() + raw.slice(1)
  return <Badge variant="outline">{label}</Badge>
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
        detail={<Trans>Keeps obligation follow-up accountable.</Trans>}
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
  return (
    <span
      aria-label={title}
      title={title}
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-tight',
        isMine
          ? 'bg-state-accent-hover-alt text-text-accent'
          : 'bg-background-subtle text-text-secondary',
      )}
    >
      {initialsFromName(name)}
    </span>
  )
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

function ClientSourceBadge({ client }: { client: ClientPublic }) {
  // Both variants render as quiet outline chips — provenance ("how
  // did this client get into the system") is metadata, not a status
  // the CPA needs to act on. The previous `variant="info"` blue made
  // Imported compete with entity-type and readiness for visual
  // priority in the identity row.
  return getClientSourceType(client) === 'imported' ? (
    <Badge variant="outline" className="text-xs text-text-tertiary">
      <Trans>Imported</Trans>
    </Badge>
  ) : (
    <Badge variant="outline" className="text-xs text-text-tertiary">
      <Trans>Manual</Trans>
    </Badge>
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
          description: t`${result.obligations.length} obligation created from the rule catalog.`,
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
          <span className="truncate text-xs text-text-tertiary">
            <Plural value={applicable.length} one="# applicable" other="# applicable" /> ·{' '}
            {client.name}
            {suggested.length > 0 ? (
              <>
                {' '}
                ·{' '}
                <span className="text-text-warning">
                  <Plural value={suggested.length} one="# gap" other="# gap" />
                </span>
              </>
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
                      <Trans>default due {formatDate(suggestion.defaultBaseDueDate)}</Trans>
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
