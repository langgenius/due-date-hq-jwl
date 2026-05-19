import {
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  FileInputIcon,
  FileSearchIcon,
  MailIcon,
  MapPinnedIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  SparklesIcon,
  Trash2Icon,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'
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

import {
  TableHeaderMultiFilter,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { formatCents, formatDate, formatDateTimeWithTimezone } from '@/lib/utils'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { paidPlanActive } from '@/features/billing/model'
import { UpgradeCtaButton } from '@/features/billing/upgrade-cta-button'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { ClientOpportunitiesCard } from '@/features/opportunities/client-opportunities-card'

import {
  CLIENT_ENTITY_TYPES,
  CLIENT_READINESS_FILTERS,
  CLIENT_SOURCE_FILTERS,
  CLIENT_UNASSIGNED_OWNER_FILTER,
  getClientFilingStates,
  getClientSourceType,
  type ClientEntityType,
  type ClientFactsModel,
  type ClientReadiness,
  type ClientReadinessStatus,
  type ClientSourceType,
} from './client-readiness'
import {
  buildClientContactPlan,
  buildClientPulseMatches,
  buildClientWorkPlanSummary,
  type ClientContactPlan,
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
  activeClient: ClientPublic | null
  selectedClient: ClientPublic | null
  factsModel: ClientFactsModel
  entityLabels: Record<ClientEntityType, string>
  isLoading: boolean
  clientFilter: readonly string[]
  entityFilter: readonly ClientEntityType[]
  stateFilter: readonly string[]
  readinessFilter: readonly ClientReadinessStatus[]
  sourceFilter: readonly ClientSourceType[]
  ownerFilter: readonly string[]
  onClientFilterChange: (value: string[]) => void
  onEntityFilterChange: (value: string[]) => void
  onStateFilterChange: (value: string[]) => void
  onReadinessFilterChange: (value: string[]) => void
  onSourceFilterChange: (value: string[]) => void
  onOwnerFilterChange: (value: string[]) => void
  onSelectClient: (clientId: string) => void
  onClearSelectedClient: () => void
  onImport: () => void
  canImport: boolean
  canDelete: boolean
  onClientDeleted: () => void
}

const metricToneClassName = {
  ready: 'bg-components-badge-bg-green-soft text-text-success',
  attention: 'bg-components-badge-bg-warning-soft text-text-warning',
  neutral: 'bg-background-section text-text-secondary',
} satisfies Record<ClientMetric['tone'], string>
const STATE_CODE_RE = /^[A-Z]{2}$/
const EMPTY_OBLIGATIONS: readonly ObligationInstancePublic[] = []

function formatFilingJurisdictions(client: ClientPublic): string {
  const states = getClientFilingStates(client)
  if (states.length === 0) return 'N/A'
  const primary = client.filingProfiles.find((profile) => profile.isPrimary)
  const primaryCounty = primary?.counties[0] ?? client.county
  const suffix = states.length > 1 ? ` +${states.length - 1}` : ''
  return [states[0], primaryCounty].filter(Boolean).join(' / ') + suffix
}

export function ClientFactsWorkspace({
  clients,
  filteredClients,
  activeClient,
  selectedClient,
  factsModel,
  entityLabels,
  isLoading,
  clientFilter,
  entityFilter,
  stateFilter,
  readinessFilter,
  sourceFilter,
  ownerFilter,
  onClientFilterChange,
  onEntityFilterChange,
  onStateFilterChange,
  onReadinessFilterChange,
  onSourceFilterChange,
  onOwnerFilterChange,
  onSelectClient,
  onClearSelectedClient,
  onImport,
  canImport,
  canDelete,
  onClientDeleted,
}: ClientFactsWorkspaceProps) {
  const { t } = useLingui()
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)
  const practiceAiEnabled = paidPlanActive(currentFirm)
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
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-medium text-text-primary">{row.original.name}</span>
            <span className="truncate text-xs text-text-tertiary">
              {row.original.email ?? t`No email`}
            </span>
          </div>
        ),
        meta: {
          headerClassName: 'w-[300px]',
          cellClassName: 'w-[300px] min-w-[260px]',
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
          headerClassName: 'w-[170px]',
          cellClassName: 'w-[170px]',
        },
      },
      {
        accessorKey: 'entityType',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Entity`}
            open={openHeaderFilter === 'entity'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('entity', nextOpen)}
            options={entityOptions}
            selected={entityFilter}
            emptyLabel={t`No entities`}
            onSelectedChange={onEntityFilterChange}
          />
        ),
        cell: (info) => entityLabels[info.getValue<ClientEntityType>()],
        meta: {
          headerClassName: 'w-[150px]',
          cellClassName: 'w-[150px]',
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
          headerClassName: 'w-[210px]',
          cellClassName: 'w-[210px]',
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
        cell: ({ row }) => <ClientSourceBadge client={row.original} />,
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
          headerClassName: 'w-[170px]',
          cellClassName: 'w-[170px]',
        },
      },
      {
        accessorKey: 'updatedAt',
        header: t`Updated`,
        cell: (info) => (
          <span className="tabular-nums">
            {formatDateTimeWithTimezone(info.getValue<string>(), firmTimezone)}
          </span>
        ),
        meta: {
          headerClassName: 'w-[230px]',
          cellClassName: 'w-[230px] whitespace-nowrap',
        },
      },
    ],
    [
      clientFilter,
      clientOptions,
      entityFilter,
      entityLabels,
      entityOptions,
      factsModel.readinessById,
      firmTimezone,
      onClientFilterChange,
      onEntityFilterChange,
      onOwnerFilterChange,
      onReadinessFilterChange,
      onSourceFilterChange,
      onStateFilterChange,
      openHeaderFilter,
      ownerFilter,
      ownerOptions,
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
      onSelectClient(clientId)
    },
    [onSelectClient],
  )

  if (selectedClient) {
    return (
      <ClientDetailWorkspace
        client={selectedClient}
        entityLabels={entityLabels}
        readiness={factsModel.readinessById.get(selectedClient.id)}
        firmTimezone={firmTimezone}
        practiceAiEnabled={practiceAiEnabled}
        canDelete={canDelete}
        onBack={onClearSelectedClient}
        onClientDeleted={onClientDeleted}
      />
    )
  }

  return (
    <>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? [0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full" />)
          : metrics.map((metric) => <ClientMetricCard key={metric.label} metric={metric} />)}
      </section>

      <section>
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <CardTitle>
                  <Trans>Client facts</Trans>
                </CardTitle>
                <CardDescription>
                  <Trans>
                    Search, segment, and inspect the filing facts that feed rules, risk, and Pulse
                    matching.
                  </Trans>
                </CardDescription>
              </div>
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 xl:w-auto xl:max-w-[880px] xl:shrink-0 xl:justify-end">
                <Badge variant="outline" className="tabular-nums">
                  {filteredClients.length}/{clients.length}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!activeClient}
                  onClick={() => {
                    if (activeClient) handleOpenClientDetail(activeClient.id)
                  }}
                >
                  <ClipboardListIcon data-icon="inline-start" />
                  <Trans>Client detail</Trans>
                </Button>
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ClientTableSkeleton />
            ) : clients.length > 0 ? (
              <div className="overflow-x-auto rounded-md border border-divider-regular">
                <Table className="min-w-[1280px] table-fixed">
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
                          data-state={activeClient?.id === row.original.id ? 'selected' : undefined}
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
  onSelectClient: (clientId: string) => void,
) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  onSelectClient(clientId)
}

function ClientMetricCard({ metric }: { metric: ClientMetric }) {
  const Icon = metric.icon
  return (
    <Card role="group" aria-label={metric.label}>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium text-text-secondary">{metric.label}</span>
          <span className="text-3xl font-semibold tabular-nums text-text-primary">
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

function ClientDetailWorkspace({
  client,
  entityLabels,
  readiness,
  firmTimezone,
  practiceAiEnabled,
  canDelete,
  onBack,
  onClientDeleted,
}: {
  client: ClientPublic
  entityLabels: Record<ClientEntityType, string>
  readiness: ClientReadiness | undefined
  firmTimezone: string
  practiceAiEnabled: boolean
  canDelete: boolean
  onBack: () => void
  onClientDeleted: () => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const permission = useFirmPermission()
  const canReadAudit = permission.can('audit.read')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
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
  const pulseDetails = pulseDetailsQueries.flatMap((query) => (query.data ? [query.data] : []))
  const pulseMatches = buildClientPulseMatches(pulseDetails, client.id)
  const contactPlan = buildClientContactPlan(client)
  const pulseLoading =
    pulseHistoryQuery.isLoading || pulseDetailsQueries.some((query) => query.isLoading)
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
  const deleteClientMutation = useMutation(
    orpc.clients.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.facets.key() })
        onClientDeleted()
        toast.success(t`Client deleted`)
      },
      onError: (err) => {
        toast.error(t`Couldn't delete client`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )

  return (
    <>
      <section className="flex min-h-0 flex-col gap-5">
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          <Trans>Back to clients</Trans>
        </Button>

        <header className="grid gap-4 rounded-md border border-divider-subtle bg-background-default p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <ClientSourceBadge client={client} />
              <ClientReadinessBadge readiness={readiness} compact={false} />
              <Badge variant="outline" className="tabular-nums">
                {formatFilingJurisdictions(client)}
              </Badge>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold text-text-primary">{client.name}</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {entityLabels[client.entityType]}
                {' / '}
                <Trans>Filing, payment, Pulse, contact, and audit context for this client.</Trans>
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-sm lg:min-w-[280px]">
            <DetailRow label={<Trans>EIN</Trans>} value={client.ein ?? 'N/A'} mono />
            <DetailRow label={<Trans>Email</Trans>} value={client.email ?? 'N/A'} />
            <DetailRow label={<Trans>Owner</Trans>} value={client.assigneeName ?? 'N/A'} />
            <DetailRow
              label={<Trans>Updated</Trans>}
              value={formatDateTimeWithTimezone(client.updatedAt, firmTimezone)}
              mono
            />
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ClientWorkMetric
            label={<Trans>Open work</Trans>}
            value={String(workPlan.openCount)}
            detail={
              workPlan.nextDueDate ? (
                <Trans>Next due {formatDate(workPlan.nextDueDate)}</Trans>
              ) : (
                <Trans>No open due dates</Trans>
              )
            }
            icon={ClipboardListIcon}
            tone={workPlan.overdueOpenCount > 0 ? 'attention' : 'neutral'}
          />
          <ClientWorkMetric
            label={<Trans>Projected risk</Trans>}
            value={formatCents(workPlan.projectedExposureCents)}
            detail={<Trans>{workPlan.exposureNeedsInputCount} need exposure inputs</Trans>}
            icon={ShieldAlertIcon}
            tone={workPlan.projectedExposureCents > 0 ? 'attention' : 'neutral'}
          />
          <ClientWorkMetric
            label={<Trans>Payment track</Trans>}
            value={formatCents(workPlan.estimatedTaxDueCents)}
            detail={<Trans>{workPlan.paymentTrackCount} obligations carry payment data</Trans>}
            icon={CalendarClockIcon}
            tone={workPlan.estimatedTaxDueCents > 0 ? 'attention' : 'neutral'}
          />
          <ClientWorkMetric
            label={<Trans>Pulse matches</Trans>}
            value={String(pulseMatches.length)}
            detail={<Trans>{workPlan.needsReviewCount} obligations need review</Trans>}
            icon={AlertTriangleIcon}
            tone={pulseMatches.length > 0 ? 'attention' : 'neutral'}
          />
        </section>

        <ClientPulsePanel matches={pulseMatches} isLoading={pulseLoading} />

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-5">
            <ClientWorkPlanPanel
              obligations={obligations}
              isLoading={obligationsQuery.isLoading}
              summary={workPlan}
            />
            <ClientJurisdictionPanel
              key={`${client.id}:jurisdiction`}
              client={client}
              isSaving={replaceFilingProfilesMutation.isPending}
              onSave={(input) => replaceFilingProfilesMutation.mutate(input)}
            />
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
            <ClientActivityPanel
              events={auditQuery.data?.events ?? []}
              canReadAudit={canReadAudit}
              isLoading={auditQuery.isLoading}
              firmTimezone={firmTimezone}
            />
          </div>

          <aside className="flex min-w-0 flex-col gap-5">
            <ClientContactPlanPanel plan={contactPlan} />
            <ClientOpportunitiesCard clientId={client.id} />
            <ClientRiskInputsPanel
              key={`${client.id}:risk`}
              client={client}
              isSaving={updateRiskProfileMutation.isPending}
              onSave={(input) => updateRiskProfileMutation.mutate(input)}
            />
            <ClientFactChecklist client={client} readiness={readiness} />
            <div className="rounded-md border border-divider-regular bg-background-section p-3">
              <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                <Trans>Notes</Trans>
              </span>
              <p className="mt-2 text-sm text-text-secondary">
                {client.notes || <Trans>No notes.</Trans>}
              </p>
            </div>
            <div className="rounded-md border border-state-destructive-hover-alt bg-state-destructive-hover p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-text-primary">
                    <Trans>Delete client record</Trans>
                  </span>
                  <p className="mt-1 text-sm text-text-destructive-secondary">
                    <Trans>
                      This removes the client from active practice views and records an audit event.
                    </Trans>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive-secondary"
                  disabled={!canDelete || deleteClientMutation.isPending}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2Icon data-icon="inline-start" />
                  <Trans>Delete</Trans>
                </Button>
              </div>
            </div>
          </aside>
        </section>
      </section>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Delete this client?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                This will remove {client?.name ?? 'this client'} from the active client directory,
                dashboard, and Obligations. The audit log will keep the deletion record.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm" disabled={deleteClientMutation.isPending}>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              variant="destructive-primary"
              disabled={!canDelete || deleteClientMutation.isPending}
              onClick={() => {
                deleteClientMutation.mutate({ id: client.id })
              }}
            >
              <Trash2Icon data-icon="inline-start" />
              <Trans>Delete client</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ClientWorkMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: ReactNode
  value: string
  detail: ReactNode
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  tone: ClientMetric['tone']
}) {
  return (
    <Card role="group" aria-label={typeof label === 'string' ? label : undefined}>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium text-text-secondary">{label}</span>
          <span className="truncate text-2xl font-semibold tabular-nums text-text-primary">
            {value}
          </span>
          <span className="truncate text-xs text-text-tertiary">{detail}</span>
        </div>
        <div
          className={`grid size-9 shrink-0 place-items-center rounded-md ${metricToneClassName[tone]}`}
        >
          <Icon className="size-4" aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
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
  const visible = obligations.slice(0, 8)
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Work plan</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>Filing and payment work tied to this client, ordered by due date.</Trans>
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <div className="flex flex-wrap gap-2">
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
            <div className="overflow-x-auto rounded-md border border-divider-subtle">
              <Table className="min-w-[760px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Trans>Filing</Trans>
                    </TableHead>
                    <TableHead className="w-[132px]">
                      <Trans>Due</Trans>
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
                  {visible.map((obligation) => (
                    <TableRow key={obligation.id}>
                      <TableCell>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-text-primary">
                            {obligation.taxType}
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
                  ))}
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
      </CardContent>
    </Card>
  )
}

function ClientPulsePanel({
  matches,
  isLoading,
}: {
  matches: readonly ClientPulseMatch[]
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Pulse impact</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>Official-source changes from Pulse that touch this client.</Trans>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : matches.length === 0 ? (
          <PanelEmptyState
            icon={AlertTriangleIcon}
            title={<Trans>No matching Pulse changes</Trans>}
            detail={<Trans>This client is clear of the current practice-scoped Pulse queue.</Trans>}
          />
        ) : (
          <div className="grid gap-2">
            {matches.slice(0, 6).map((match) => (
              <div
                key={`${match.alertId}:${match.taxType}:${match.currentDueDate}`}
                className="rounded-md border border-divider-subtle bg-background-section p-3"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{match.title}</p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {match.source}
                      {' / '}
                      {formatDate(match.publishedAt)}
                    </p>
                  </div>
                  <PulseMatchBadge status={match.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="tabular-nums">
                    {match.taxType}
                  </Badge>
                  <span className="tabular-nums text-text-secondary">
                    {formatDate(match.currentDueDate)} -&gt; {formatDate(match.newDueDate)}
                  </span>
                  <span className="text-text-tertiary">
                    <Trans>Confidence {Math.round(match.confidence * 100)}%</Trans>
                  </span>
                  <a
                    href={match.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-text-accent hover:underline"
                  >
                    <ExternalLinkIcon className="size-3" aria-hidden />
                    <Trans>Source</Trans>
                  </a>
                </div>
                {match.reason ? (
                  <p className="mt-2 text-xs text-text-tertiary">{match.reason}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ClientContactPlanPanel({ plan }: { plan: ClientContactPlan }) {
  return (
    <div className="grid gap-3 rounded-md border border-divider-regular p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          <Trans>Contact chain</Trans>
        </span>
        <MailIcon className="size-4 text-text-tertiary" aria-hidden />
      </div>
      <FactCheckRow
        isComplete={Boolean(plan.primaryContact)}
        label={<Trans>Primary client contact</Trans>}
        detail={
          plan.primaryContact ?? <Trans>Add an email before client notification drafts.</Trans>
        }
      />
      <FactCheckRow
        isComplete={Boolean(plan.internalOwner)}
        label={<Trans>Internal owner</Trans>}
        detail={
          plan.internalOwner ?? <Trans>Assign a team member for follow-up accountability.</Trans>
        }
      />
      <FactCheckRow
        isComplete={!plan.missing.includes('fallback_contact')}
        label={<Trans>Fallback contact</Trans>}
        detail={
          <Trans>Not modeled yet. Keep escalation in notes until the contact schema expands.</Trans>
        }
      />
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Activity log</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>Recent audited changes for this client record.</Trans>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!canReadAudit ? (
          <PanelEmptyState
            icon={ClipboardCheckIcon}
            title={<Trans>Audit access is role-gated</Trans>}
            detail={<Trans>Owners, managers, and preparers can inspect client activity.</Trans>}
          />
        ) : isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : events.length === 0 ? (
          <PanelEmptyState
            icon={ClipboardCheckIcon}
            title={<Trans>No audited client changes yet</Trans>}
            detail={
              <Trans>Future edits to facts, risk inputs, or deletion will appear here.</Trans>
            }
          />
        ) : (
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
        )}
      </CardContent>
    </Card>
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

function PulseMatchBadge({ status }: { status: ClientPulseMatch['status'] }) {
  if (status === 'eligible') {
    return (
      <Badge variant="success">
        <Trans>Eligible</Trans>
      </Badge>
    )
  }
  if (status === 'needs_review') {
    return (
      <Badge variant="warning">
        <Trans>Needs review</Trans>
      </Badge>
    )
  }
  if (status === 'already_applied') {
    return (
      <Badge variant="secondary">
        <Trans>Already applied</Trans>
      </Badge>
    )
  }
  return (
    <Badge variant="outline">
      <Trans>Reverted</Trans>
    </Badge>
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

  return (
    <div className="grid gap-3 rounded-md border border-divider-regular p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          <Trans>Filing jurisdictions</Trans>
        </span>
        <MapPinnedIcon className="size-4 text-text-tertiary" aria-hidden />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {client.filingProfiles.length > 0 ? (
          client.filingProfiles.map((profile) => (
            <Badge key={profile.id} variant={profile.isPrimary ? 'default' : 'outline'}>
              {profile.state}
              {profile.isPrimary ? ` ${t`primary`}` : ''}
            </Badge>
          ))
        ) : (
          <Badge variant="outline">
            <Trans>Needs filing state</Trans>
          </Badge>
        )}
      </div>
      {client.filingProfiles.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-divider-subtle">
          <Table className="min-w-[520px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[92px]">
                  <Trans>State</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Counties</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Tax types</Trans>
                </TableHead>
                <TableHead className="w-[132px]">
                  <Trans>Status</Trans>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
              {client.filingProfiles
                .toSorted(
                  (a, b) =>
                    Number(b.isPrimary) - Number(a.isPrimary) || a.state.localeCompare(b.state),
                )
                .map((profile) => {
                  const sourceLabel =
                    profile.source === 'imported'
                      ? t`Imported`
                      : profile.source === 'demo_seed'
                        ? t`Demo seed`
                        : profile.source === 'backfill'
                          ? t`Backfilled`
                          : t`Manual`
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <span className="tabular-nums">{profile.state}</span>
                      </TableCell>
                      <TableCell className="truncate">
                        {profile.counties.length > 0 ? profile.counties.join(', ') : t`Any county`}
                      </TableCell>
                      <TableCell className="truncate">
                        {profile.taxTypes.length > 0
                          ? profile.taxTypes.join(', ')
                          : t`Needs tax type review`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={profile.taxTypes.length > 0 ? 'outline' : 'warning'}>
                          {sourceLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </div>
      ) : null}
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
      <Button
        type="button"
        size="sm"
        disabled={!hasChanges || stateInvalid || countyInvalid || isSaving}
        onClick={() =>
          onSave({
            id: client.id,
            profiles: nextProfiles,
            reason: 'Fact profile filing jurisdiction edit',
          })
        }
      >
        {isSaving ? t`Saving...` : t`Save filing jurisdictions`}
      </Button>
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
    <div className="grid gap-3 rounded-md border border-divider-regular p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          <Trans>Risk inputs</Trans>
        </span>
        <ShieldAlertIcon className="size-4 text-text-tertiary" aria-hidden />
      </div>
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
    <div className="grid gap-3 rounded-md border border-divider-regular bg-background-section p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <SparklesIcon className="size-4 text-text-secondary" aria-hidden />
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Client Risk Summary</Trans>
          </span>
        </div>
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
    <div className="grid gap-2 rounded-md border border-divider-regular p-3">
      <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
        <Trans>Fact readiness</Trans>
      </span>
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

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: ReactNode
  value: string
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 text-sm">
      <span className="text-text-tertiary">{label}</span>
      <span className={mono ? 'tabular-nums text-text-primary' : 'text-text-primary'}>{value}</span>
    </div>
  )
}
