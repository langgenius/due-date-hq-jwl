import {
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ActivityIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  FileInputIcon,
  FileSearchIcon,
  MapPinnedIcon,
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
} from '@duedatehq/contracts'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@duedatehq/ui/components/ui/collapsible'
import { Card, CardContent, CardHeader } from '@duedatehq/ui/components/ui/card'
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
import { formatCents, formatDate, formatDateTimeWithTimezone } from '@/lib/utils'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatTaxCode } from '@/lib/tax-codes'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { UpgradeCtaButton } from '@/features/billing/upgrade-cta-button'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { ClientOpportunitiesCard } from '@/features/opportunities/client-opportunities-card'

import {
  CLIENT_ENTITY_TYPES,
  CLIENT_PULSE_FILTERS,
  CLIENT_READINESS_FILTERS,
  CLIENT_SOURCE_FILTERS,
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

type ClientMetric = {
  label: string
  value: string
  detail: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  tone: 'ready' | 'attention' | 'neutral'
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

const metricToneClassName = {
  ready: 'bg-components-badge-bg-green-soft text-text-success',
  attention: 'bg-components-badge-bg-warning-soft text-text-warning',
  neutral: 'bg-background-section text-text-secondary',
} satisfies Record<ClientMetric['tone'], string>
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
    <Collapsible
      id={id}
      {...collapsibleStateProps}
      className={cn(
        'scroll-mt-20 rounded-md border bg-background-default',
        attention
          ? 'border-components-badge-bg-warning-soft bg-components-badge-bg-warning-soft/40'
          : 'border-divider-subtle',
      )}
    >
      <CollapsibleTrigger
        className={cn(
          'group flex w-full items-center justify-between gap-3 rounded-md px-4 py-3 text-left hover:bg-state-base-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-state-accent-active-alt',
          attention && 'hover:bg-components-badge-bg-warning-soft/70',
        )}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-text-primary">{title}</span>
          {summary ? <span className="truncate text-xs text-text-tertiary">{summary}</span> : null}
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
  )
}

function formatFilingJurisdictions(client: ClientPublic): string {
  const states = getClientFilingStates(client)
  if (states.length === 0) return 'N/A'
  const primary = client.filingProfiles.find((profile) => profile.isPrimary)
  const primaryCounty = primary?.counties[0] ?? client.county
  const suffix = states.length > 1 ? ` +${states.length - 1}` : ''
  return [states[0], primaryCounty].filter(Boolean).join(' / ') + suffix
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
          className="rounded-sm font-mono text-[11px] uppercase tabular-nums"
        >
          {state}
        </Badge>
      ))}
      {overflow > 0 ? (
        <Badge variant="outline" className="rounded-sm font-mono text-[11px] tabular-nums">
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

export function ClientFactsWorkspace({
  clients,
  filteredClients,
  factsModel,
  entityLabels,
  isLoading,
  clientFilter,
  entityFilter,
  stateFilter,
  readinessFilter,
  sourceFilter,
  ownerFilter,
  pulseFilter,
  pulseMatchesByClient,
  obligationSummariesByClient,
  opportunityCountByClient,
  onClientFilterChange,
  onEntityFilterChange,
  onStateFilterChange,
  onReadinessFilterChange,
  onSourceFilterChange,
  onOwnerFilterChange,
  onPulseFilterChange,
  onImport,
  canImport,
}: ClientFactsWorkspaceProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)
  const [openHeaderFilter, setOpenHeaderFilter] = useState<string | null>(null)
  const metrics = useMemo<ClientMetric[]>(
    () => [
      {
        label: t`Ready for rules`,
        value: String(factsModel.summary.readyForRules),
        detail: t`have jurisdiction facts`,
        icon: ClipboardCheckIcon,
        tone: 'ready',
      },
      {
        label: t`Needs facts`,
        value: String(factsModel.summary.needsFacts),
        detail: t`missing rule inputs`,
        icon: AlertTriangleIcon,
        tone: factsModel.summary.needsFacts > 0 ? 'attention' : 'neutral',
      },
      {
        label: t`Imported`,
        value: String(factsModel.summary.imported),
        detail: t`${factsModel.summary.manual} manual records`,
        icon: FileInputIcon,
        tone: 'neutral',
      },
      {
        label: t`States covered`,
        value: String(factsModel.summary.statesCovered),
        detail: t`for Pulse matching`,
        icon: MapPinnedIcon,
        tone: 'neutral',
      },
    ],
    [factsModel.summary, t],
  )
  const readinessLabels = useMemo<Record<ClientReadinessStatus, string>>(
    () => ({
      ready: t`Ready for rules`,
      needs_facts: t`Needs facts`,
    }),
    [t],
  )
  const sourceLabels = useMemo<Record<ClientSourceType, string>>(
    () => ({
      imported: t`Imported`,
      manual: t`Manual`,
    }),
    [t],
  )
  const pulseLabels = useMemo<Record<ClientPulseFilter, string>>(
    () => ({
      affected: t`Has Pulse alert`,
      clear: t`No Pulse alert`,
    }),
    [t],
  )
  const clientOptions = useMemo<FilterOption[]>(
    () =>
      clients
        .map((client) => ({ value: client.id, label: client.name }))
        .toSorted((a, b) => a.label.localeCompare(b.label)),
    [clients],
  )
  const readinessOptions = useMemo<FilterOption[]>(
    () =>
      CLIENT_READINESS_FILTERS.map((status) => ({
        value: status,
        label: readinessLabels[status],
        count:
          status === 'ready' ? factsModel.summary.readyForRules : factsModel.summary.needsFacts,
      })).filter((option) => option.count > 0),
    [factsModel.summary.needsFacts, factsModel.summary.readyForRules, readinessLabels],
  )
  const entityOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<ClientEntityType, number>()
    for (const client of clients) {
      counts.set(client.entityType, (counts.get(client.entityType) ?? 0) + 1)
    }
    return CLIENT_ENTITY_TYPES.map((entityType) => ({
      value: entityType,
      label: entityLabels[entityType],
      count: counts.get(entityType) ?? 0,
    })).filter((option) => option.count > 0)
  }, [clients, entityLabels])
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
  const sourceOptions = useMemo<FilterOption[]>(
    () =>
      CLIENT_SOURCE_FILTERS.map((source) => ({
        value: source,
        label: sourceLabels[source],
        count: source === 'imported' ? factsModel.summary.imported : factsModel.summary.manual,
      })).filter((option) => option.count > 0),
    [factsModel.summary.imported, factsModel.summary.manual, sourceLabels],
  )
  const pulseOptions = useMemo<FilterOption[]>(() => {
    const affectedCount = pulseMatchesByClient.size
    const clearCount = Math.max(clients.length - affectedCount, 0)
    return CLIENT_PULSE_FILTERS.map((value) => ({
      value,
      label: pulseLabels[value],
      count: value === 'affected' ? affectedCount : clearCount,
    })).filter((option) => option.count > 0)
  }, [clients.length, pulseLabels, pulseMatchesByClient])
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

  const columns = useMemo<ColumnDef<ClientPublic>[]>(
    () => [
      {
        accessorKey: 'name',
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
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-text-primary">{row.original.name}</span>
                {matches && matches.length > 0 ? <ClientRadarBadge matches={matches} /> : null}
              </div>
              <span className="truncate text-xs text-text-tertiary">
                {entityLabels[row.original.entityType]}
              </span>
            </div>
          )
        },
        meta: {
          headerClassName: 'w-[260px]',
          cellClassName: 'w-[260px]',
        },
      },
      {
        id: 'readiness',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Readiness`}
            open={openHeaderFilter === 'readiness'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('readiness', nextOpen)}
            options={readinessOptions}
            selected={readinessFilter}
            emptyLabel={t`No readiness states`}
            onSelectedChange={onReadinessFilterChange}
          />
        ),
        cell: ({ row }) => (
          <ClientReadinessBadge
            readiness={factsModel.readinessById.get(row.original.id)}
            compact={false}
          />
        ),
        meta: {
          headerClassName: 'w-[160px]',
          cellClassName: 'w-[160px]',
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
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatFilingJurisdictions(row.original)}
          </span>
        ),
        meta: {
          headerClassName: 'w-[190px]',
          cellClassName: 'w-[190px]',
        },
      },
      {
        id: 'nextDue',
        header: t`Next due`,
        cell: ({ row }) => {
          const summary = obligationSummariesByClient.get(row.original.id)
          if (!summary || !summary.nextDueDate) {
            return <span className="text-text-tertiary">—</span>
          }
          return (
            <div className="flex min-w-0 flex-col">
              <span className="whitespace-nowrap tabular-nums text-text-primary">
                {formatDate(summary.nextDueDate)}
              </span>
              {summary.nextTaxType ? (
                <span className="truncate text-xs text-text-tertiary">
                  <TaxCodeLabel code={summary.nextTaxType} />
                </span>
              ) : null}
            </div>
          )
        },
        meta: {
          headerClassName: 'w-[170px]',
          cellClassName: 'w-[170px]',
        },
      },
      {
        id: 'openObligations',
        header: t`Open`,
        cell: ({ row }) => {
          const summary = obligationSummariesByClient.get(row.original.id)
          const count = summary?.openCount ?? 0
          if (count === 0) {
            return <span className="text-text-tertiary tabular-nums">0</span>
          }
          return <span className="tabular-nums text-text-primary">{count}</span>
        },
        meta: {
          headerClassName: 'w-[80px] text-right',
          cellClassName: 'w-[80px] text-right',
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
          headerClassName: 'w-[130px]',
          cellClassName: 'w-[130px]',
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
        cell: (info) => info.getValue<string | null>() ?? t`Unassigned`,
        meta: {
          headerClassName: 'w-[160px]',
          cellClassName: 'w-[160px]',
        },
      },
      {
        accessorKey: 'migrationBatchId',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Source`}
            open={openHeaderFilter === 'source'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('source', nextOpen)}
            options={sourceOptions}
            selected={sourceFilter}
            emptyLabel={t`No source types`}
            onSelectedChange={onSourceFilterChange}
          />
        ),
        cell: ({ row }) => <ClientSourceCell client={row.original} firmTimezone={firmTimezone} />,
        meta: {
          headerClassName: 'w-[200px]',
          cellClassName: 'w-[200px]',
        },
      },
    ],
    [
      clientFilter,
      clientOptions,
      entityLabels,
      factsModel.readinessById,
      firmTimezone,
      obligationSummariesByClient,
      onClientFilterChange,
      onOwnerFilterChange,
      onReadinessFilterChange,
      onSourceFilterChange,
      onStateFilterChange,
      openHeaderFilter,
      opportunityCountByClient,
      ownerFilter,
      ownerOptions,
      pulseMatchesByClient,
      readinessFilter,
      readinessOptions,
      setHeaderFilterOpen,
      sourceFilter,
      sourceOptions,
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
  })
  const handleOpenClientDetail = useCallback(
    (clientId: string) => {
      void navigate(`/clients/${clientId}`)
    },
    [navigate],
  )

  return (
    <>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? [0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full" />)
          : metrics.map((metric) => <ClientMetricCard key={metric.label} metric={metric} />)}
      </section>

      <section>
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <Badge variant="outline" className="tabular-nums">
                <Trans>
                  {filteredClients.length} of {clients.length}
                </Trans>
              </Badge>
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 xl:w-auto xl:max-w-[880px] xl:shrink-0 xl:justify-end">
                <TableHeaderMultiFilter
                  label={t`Client`}
                  options={clientOptions}
                  selected={clientFilter}
                  disabled={isLoading}
                  emptyLabel={t`No clients`}
                  searchable
                  searchPlaceholder={t`Search clients`}
                  onSelectedChange={onClientFilterChange}
                />
                <TableHeaderMultiFilter
                  label={t`Entity`}
                  options={entityOptions}
                  selected={entityFilter}
                  disabled={isLoading}
                  emptyLabel={t`No entities`}
                  onSelectedChange={onEntityFilterChange}
                />
                <TableHeaderMultiFilter
                  label={t`State`}
                  options={stateOptions}
                  selected={stateFilter}
                  disabled={isLoading}
                  emptyLabel={t`No states`}
                  onSelectedChange={onStateFilterChange}
                />
                <TableHeaderMultiFilter
                  label={t`Pulse`}
                  options={pulseOptions}
                  selected={pulseFilter}
                  disabled={isLoading || pulseOptions.length === 0}
                  emptyLabel={t`No Pulse alerts`}
                  onSelectedChange={onPulseFilterChange}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ClientTableSkeleton />
            ) : clients.length > 0 ? (
              <div className="rounded-md border border-divider-regular">
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
                          className="cursor-pointer outline-none hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset"
                          onClick={() => handleOpenClientDetail(row.original.id)}
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
              </div>
            ) : (
              <ClientEmptyState hasClients={false} onImport={onImport} canImport={canImport} />
            )}
          </CardContent>
        </Card>
      </section>
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

function ClientMetricCard({ metric }: { metric: ClientMetric }) {
  const Icon = metric.icon
  return (
    <Card role="group" aria-label={metric.label}>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium text-text-secondary">{metric.label}</span>
          <span className="text-2xl font-semibold tabular-nums text-text-primary">
            {metric.value}
          </span>
          <span className="truncate text-xs text-text-tertiary">{metric.detail}</span>
        </div>
        <div
          className={`grid size-9 shrink-0 place-items-center rounded-md ${metricToneClassName[metric.tone]}`}
        >
          <Icon className="size-4" aria-hidden />
        </div>
      </CardContent>
    </Card>
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

function ClientEmptyState({
  hasClients,
  onImport,
  canImport,
}: {
  hasClients: boolean
  onImport: () => void
  canImport: boolean
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-divider-regular p-6 text-center">
      <div className="grid size-10 place-items-center rounded-md bg-background-section text-text-secondary">
        <UsersRoundIcon className="size-5" aria-hidden />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-medium text-text-primary">
          {hasClients ? (
            <Trans>No clients match these filters</Trans>
          ) : (
            <Trans>No clients yet</Trans>
          )}
        </p>
        <p className="text-sm text-text-tertiary">
          {hasClients ? (
            <Trans>Clear search or filters to return to the full practice directory.</Trans>
          ) : (
            <Trans>Import a CSV or create the first manual client record.</Trans>
          )}
        </p>
      </div>
      {!hasClients ? (
        <Button variant="outline" onClick={onImport} disabled={!canImport}>
          <FileSearchIcon data-icon="inline-start" />
          <Trans>Run migration</Trans>
        </Button>
      ) : null}
    </div>
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
        toast.success(t`Risk inputs saved`, { description: result.client.name })
      },
      onError: (err) => {
        toast.error(t`Couldn't save risk inputs`, {
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
      <section className="flex min-h-0 flex-col gap-5">
        <header className="flex flex-col gap-3 rounded-md border border-divider-subtle bg-background-default p-4">
          <div className="flex flex-wrap items-center gap-2">
            <ClientSourceBadge client={client} />
            <ClientReadinessBadge readiness={readiness} compact={false} />
            {pulseMatches.length > 0 ? <ClientRadarBadge matches={pulseMatches} /> : null}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="truncate text-2xl font-semibold text-text-primary">{client.name}</h2>
            <Badge variant="info" className="text-xs uppercase tracking-wider">
              {entityLabels[client.entityType]}
            </Badge>
            <ClientFilingStateChips client={client} />
          </div>
          <p className="text-sm text-text-secondary">
            {formatClientIdentitySubLine({
              workPlan,
              entityType: client.entityType,
              taxClassification: client.taxClassification,
            })}
          </p>
        </header>

        <ClientAlertsBand
          pulseMatches={pulseMatches}
          readiness={readiness}
          extensionPaymentMismatches={extensionPaymentMismatches}
          onAddFacts={openMissingFacts}
        />

        <ClientWorkPlanPanel
          obligations={obligations}
          isLoading={obligationsQuery.isLoading}
          summary={workPlan}
        />

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

        <DetailSection title={t`Risk inputs`} summary={t`Penalty inputs and tax-attribute flags`}>
          <ClientRiskInputsPanel
            key={`${client.id}:risk`}
            client={client}
            isSaving={updateRiskProfileMutation.isPending}
            onSave={(input) => updateRiskProfileMutation.mutate(input)}
          />
        </DetailSection>

        <DetailSection
          title={t`Fact readiness`}
          summary={
            readiness && readiness.missingRequiredFacts.length > 0
              ? t`${readiness.missingRequiredFacts.length} required fact(s) missing`
              : t`All required facts present`
          }
        >
          <ClientFactChecklist client={client} readiness={readiness} />
        </DetailSection>

        <DetailSection
          title={t`Future business cues`}
          summary={t`Advisory, scope, and retention opportunities`}
        >
          <ClientOpportunitiesCard clientId={client.id} />
        </DetailSection>

        <div className="rounded-md border border-divider-regular bg-background-section p-3">
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Notes</Trans>
          </span>
          <p className="mt-2 text-sm text-text-secondary">
            {client.notes || <Trans>No notes.</Trans>}
          </p>
        </div>

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
      </section>
    </>
  )
}

function obligationDrawerHref(obligationId: string): string {
  const params = new URLSearchParams({ id: obligationId, drawer: 'obligation' })
  return `/obligations?${params.toString()}`
}

function ClientWorkPlanPanel({
  obligations,
  isLoading,
  summary,
}: {
  obligations: readonly ObligationInstancePublic[]
  isLoading: boolean
  summary: ClientWorkPlanSummary
}) {
  const navigate = useNavigate()
  const visible = obligations.slice(0, 8)
  return (
    <div className="rounded-md border border-divider-subtle bg-background-default">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-text-primary">
            <Trans>Filings &amp; deadlines</Trans>
          </span>
          <span className="truncate text-xs text-text-tertiary">
            {`${summary.openCount} open · ${summary.overdueOpenCount} overdue · ${summary.needsReviewCount} need review`}
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
          <PanelEmptyState
            icon={ClipboardListIcon}
            title={<Trans>No obligations yet</Trans>}
            detail={
              <Trans>Run migration or generate rules before this client has due-date work.</Trans>
            }
          />
        ) : (
          <div className="grid gap-3">
            <div className="rounded-md border border-divider-subtle">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Trans>Filing</Trans>
                    </TableHead>
                    <TableHead className="w-[132px]">
                      <Trans>Internal</Trans>
                    </TableHead>
                    <TableHead className="w-[132px]">
                      <Trans>Status</Trans>
                    </TableHead>
                    <TableHead className="w-[140px] text-right">
                      <Trans>Projected risk</Trans>
                    </TableHead>
                    <TableHead className="w-[140px] text-right">
                      <Trans>Tax due</Trans>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
                  {visible.map((obligation) => {
                    const href = obligationDrawerHref(obligation.id)
                    const open = () => void navigate(href)
                    return (
                      <TableRow
                        key={obligation.id}
                        tabIndex={0}
                        role="link"
                        aria-label={`${formatTaxCode(obligation.taxType)} — ${formatDate(obligation.currentDueDate)}`}
                        className="cursor-pointer hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:outline-none"
                        onClick={open}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            open()
                          }
                        }}
                      >
                        <TableCell>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium text-text-primary">
                              <TaxCodeLabel code={obligation.taxType} />
                            </span>
                            <span className="truncate font-mono text-xs text-text-tertiary">
                              {obligation.jurisdiction ?? obligation.generationSource ?? 'manual'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatDate(obligation.currentDueDate)}
                        </TableCell>
                        <TableCell>
                          <ObligationStatusBadge obligation={obligation} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {obligation.estimatedExposureCents !== null
                            ? formatCents(obligation.estimatedExposureCents)
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {obligation.estimatedTaxDueCents !== null
                            ? formatCents(obligation.estimatedTaxDueCents)
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {obligations.length > visible.length ? (
              <p className="text-xs text-text-tertiary">
                <Trans>Showing the next 8 obligations for this client.</Trans>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

function ClientAlertsBand({
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
      <a
        href="/rules/pulse"
        className="inline-flex items-center gap-1 text-xs font-medium text-text-accent hover:underline"
      >
        <Trans>View on Radar</Trans>
        <ExternalLinkIcon className="size-3" aria-hidden />
      </a>
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
      <button
        type="button"
        onClick={onAddFacts}
        className="inline-flex items-center gap-1 text-xs font-medium text-text-accent hover:underline"
      >
        <Trans>Add facts</Trans>
      </button>
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
      <PanelEmptyState
        icon={ClipboardCheckIcon}
        title={<Trans>Audit access is role-gated</Trans>}
        detail={<Trans>Owners, managers, and preparers can inspect client activity.</Trans>}
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
      <PanelEmptyState
        icon={ClipboardCheckIcon}
        title={<Trans>No audited client changes yet</Trans>}
        detail={<Trans>Future edits to facts, risk inputs, or deletion will appear here.</Trans>}
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

function PanelEmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  title: ReactNode
  detail: ReactNode
}) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-divider-regular p-5 text-center">
      <div className="grid size-9 place-items-center rounded-md bg-background-section text-text-secondary">
        <Icon className="size-4" aria-hidden />
      </div>
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="max-w-md text-sm text-text-tertiary">{detail}</p>
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
  return <Badge variant="outline">{obligation.status.replaceAll('_', ' ')}</Badge>
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
        {isSaving ? t`Saving...` : t`Save risk inputs`}
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
  return getClientSourceType(client) === 'imported' ? (
    <Badge variant="info" className="text-xs">
      <BadgeStatusDot tone="normal" />
      <Trans>Imported</Trans>
    </Badge>
  ) : (
    <Badge variant="outline" className="text-xs">
      <Trans>Manual</Trans>
    </Badge>
  )
}

function ClientSourceCell({
  client,
  firmTimezone,
}: {
  client: ClientPublic
  firmTimezone: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <ClientSourceBadge client={client} />
      {getClientSourceType(client) === 'imported' ? (
        <span className="truncate text-xs text-text-tertiary tabular-nums">
          <Trans>Synced {formatDateTimeWithTimezone(client.updatedAt, firmTimezone)}</Trans>
        </span>
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
