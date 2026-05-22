import { useCallback, useEffect, useMemo } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertCircleIcon, FileClockIcon } from 'lucide-react'
import { useQueryStates } from 'nuqs'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import type { ClientCreateInput, ClientPublic, ObligationStatus } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'

import { PageHeader } from '@/components/patterns/page-header'
import { ClientFactsWorkspace } from '@/features/clients/ClientFactsWorkspace'
import { writeClientCycleList } from '@/features/clients/client-cycle'
import { ClientsCreateSplitButton } from '@/features/clients/ClientsCreateSplitButton'
import {
  buildClientObligationListSummaries,
  buildOpportunityCountByClient,
  buildPulseMatchesByClient,
} from '@/features/clients/client-detail-model'
import {
  CLIENT_LIST_LIMIT,
  clientsSearchParamsParsers,
  normalizeClientIdFilters,
  normalizeClientOwnerFilters,
  normalizeClientStateFilters,
  normalizeClientsQueryFilters,
  nullableQueryArray,
} from '@/features/clients/client-query-state'
import {
  buildClientFactsModel,
  filterClients,
  isClientEntityType,
  isClientPulseFilter,
  isClientReadinessStatus,
  isClientSourceType,
  type ClientEntityType,
} from '@/features/clients/client-readiness'
import { ImportHistoryDrawer } from '@/features/migration/ImportHistoryDrawer'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

const EMPTY_CLIENTS: ClientPublic[] = []
const EMPTY_AFFECTED_CLIENT_IDS: ReadonlySet<string> = new Set()
const PULSE_HISTORY_LIMIT = 50
const OBLIGATION_LIST_LIMIT = 100
const OPPORTUNITY_LIST_LIMIT = 50
const OPEN_OBLIGATION_STATUSES: ObligationStatus[] = [
  'pending',
  'in_progress',
  'extended',
  'waiting_on_client',
  'review',
]
const OBLIGATIONS_LIST_INPUT = {
  status: OPEN_OBLIGATION_STATUSES,
  sort: 'due_asc' as const,
  limit: OBLIGATION_LIST_LIMIT,
}
const OPPORTUNITIES_LIST_INPUT = { limit: OPPORTUNITY_LIST_LIMIT }
const PULSE_HISTORY_INPUT = { limit: PULSE_HISTORY_LIMIT }
const CLIENTS_LIST_INPUT = { limit: CLIENT_LIST_LIMIT }

export function useEntityLabels(): Record<ClientEntityType, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      llc: t`LLC`,
      s_corp: t`S corp`,
      partnership: t`Partnership`,
      c_corp: t`C corp`,
      sole_prop: t`Sole prop`,
      trust: t`Trust`,
      individual: t`Individual`,
      other: t`Other`,
    }),
    [t],
  )
}

export function ClientsRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { openWizard } = useMigrationWizard()
  const permission = useFirmPermission()
  const canRunMigration = permission.can('migration.run')
  const entityLabels = useEntityLabels()
  const [
    {
      clients: clientFilter,
      entity: entityFilter,
      state: stateFilter,
      readiness: readinessFilter,
      source: sourceFilter,
      pulse: pulseFilter,
      owner: ownerFilter,
      importHistory,
    },
    setClientsQuery,
  ] = useQueryStates(clientsSearchParamsParsers)

  const clientsQuery = useQuery(orpc.clients.listByFirm.queryOptions({ input: CLIENTS_LIST_INPUT }))
  const clients = clientsQuery.data ?? EMPTY_CLIENTS
  const factsModel = useMemo(() => buildClientFactsModel(clients), [clients])
  const obligationsListQuery = useQuery(
    orpc.obligations.list.queryOptions({ input: OBLIGATIONS_LIST_INPUT }),
  )
  const obligationListRows = obligationsListQuery.data?.rows
  const obligationSummariesByClient = useMemo(
    () => buildClientObligationListSummaries(obligationListRows ?? []),
    [obligationListRows],
  )
  const opportunitiesQuery = useQuery(
    orpc.opportunities.list.queryOptions({ input: OPPORTUNITIES_LIST_INPUT }),
  )
  const opportunitiesList = opportunitiesQuery.data?.opportunities
  const opportunityCountByClient = useMemo(
    () => buildOpportunityCountByClient(opportunitiesList ?? []),
    [opportunitiesList],
  )
  const pulseHistoryQuery = useQuery(
    orpc.pulse.listHistory.queryOptions({ input: PULSE_HISTORY_INPUT }),
  )
  const pulseAlerts = pulseHistoryQuery.data?.alerts
  const pulseDetailsQueries = useQueries({
    queries: useMemo(
      () =>
        (pulseAlerts ?? []).map((alert) =>
          orpc.pulse.getDetail.queryOptions({ input: { alertId: alert.id } }),
        ),
      [pulseAlerts],
    ),
  })
  const pulseDetails = pulseDetailsQueries
    .map((query) => query.data)
    .filter((detail): detail is NonNullable<typeof detail> => Boolean(detail))
  const pulseDetailsKey = pulseDetails.map((detail) => detail.alert.id).join('|')
  const pulseMatchesByClient = useMemo(
    () => buildPulseMatchesByClient(pulseDetails),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pulseDetailsKey],
  )
  const affectedClientIds = useMemo<ReadonlySet<string>>(() => {
    if (pulseMatchesByClient.size === 0) return EMPTY_AFFECTED_CLIENT_IDS
    return new Set(pulseMatchesByClient.keys())
  }, [pulseMatchesByClient])
  const filters = useMemo(
    () =>
      normalizeClientsQueryFilters({
        clients: clientFilter,
        entity: entityFilter,
        state: stateFilter,
        readiness: readinessFilter,
        source: sourceFilter,
        owner: ownerFilter,
        pulse: pulseFilter,
      }),
    [
      clientFilter,
      entityFilter,
      ownerFilter,
      pulseFilter,
      readinessFilter,
      sourceFilter,
      stateFilter,
    ],
  )
  const filteredClients = useMemo(
    () => filterClients(clients, filters, { affectedClientIds }),
    [affectedClientIds, clients, filters],
  )

  // Persist the visible client order to sessionStorage so the detail
  // page can offer prev/next cycling across the current filter set.
  // See features/clients/client-cycle.ts and the PageHeader arrows on
  // ClientFactsWorkspace's detail render.
  useEffect(() => {
    writeClientCycleList(filteredClients.map((client) => client.id))
  }, [filteredClients])
  const createMutation = useMutation(
    orpc.clients.create.mutationOptions({
      onSuccess: (client) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        toast.success(t`Client created`, { description: client.name })
        void navigate(`/clients/${client.id}`)
      },
      onError: (err) => {
        toast.error(t`Couldn't create client`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )

  const handleClientFilterChange = useCallback(
    (values: string[]) => {
      const clientIds = normalizeClientIdFilters(values)
      void setClientsQuery({
        q: null,
        clients: nullableQueryArray(clientIds),
      })
    },
    [setClientsQuery],
  )

  const handleEntityFilterChange = useCallback(
    (values: string[]) => {
      const typedEntities = values.filter(isClientEntityType)
      void setClientsQuery({
        q: null,
        entity: nullableQueryArray(typedEntities),
      })
    },
    [setClientsQuery],
  )

  const handleStateFilterChange = useCallback(
    (values: string[]) => {
      const states = normalizeClientStateFilters(values)
      void setClientsQuery({
        q: null,
        state: nullableQueryArray(states),
      })
    },
    [setClientsQuery],
  )

  const handleReadinessFilterChange = useCallback(
    (values: string[]) => {
      const typedReadiness = values.filter(isClientReadinessStatus)
      void setClientsQuery({
        q: null,
        readiness: nullableQueryArray(typedReadiness),
      })
    },
    [setClientsQuery],
  )

  const handleSourceFilterChange = useCallback(
    (values: string[]) => {
      const typedSources = values.filter(isClientSourceType)
      void setClientsQuery({
        q: null,
        source: nullableQueryArray(typedSources),
      })
    },
    [setClientsQuery],
  )

  const handleOwnerFilterChange = useCallback(
    (values: string[]) => {
      const owners = normalizeClientOwnerFilters(values)
      void setClientsQuery({
        q: null,
        owner: nullableQueryArray(owners),
      })
    },
    [setClientsQuery],
  )

  const handlePulseFilterChange = useCallback(
    (values: string[]) => {
      const typedPulse = values.filter(isClientPulseFilter)
      void setClientsQuery({
        q: null,
        pulse: nullableQueryArray(typedPulse),
      })
    },
    [setClientsQuery],
  )

  const handleImportHistoryOpenChange = useCallback(
    (next: boolean) => {
      void setClientsQuery({ importHistory: next ? 'open' : null })
    },
    [setClientsQuery],
  )

  const handleViewImportedClient = useCallback(
    (clientId: string) => {
      void setClientsQuery({ importHistory: null })
      void navigate(`/clients/${clientId}`)
    },
    [navigate, setClientsQuery],
  )

  const handleCreateClient = useCallback(
    (input: ClientCreateInput, callbacks: { onSuccess: () => void }) => {
      createMutation.mutate(input, callbacks)
    },
    [createMutation],
  )

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={<Trans>Clients</Trans>}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => handleImportHistoryOpenChange(true)}>
              <FileClockIcon data-icon="inline-start" />
              <Trans>Import history</Trans>
            </Button>
            <ClientsCreateSplitButton
              entityLabels={entityLabels}
              isPending={createMutation.isPending}
              onCreate={handleCreateClient}
              onImport={openWizard}
              canImport={canRunMigration}
            />
          </>
        }
      />

      {clientsQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Couldn't load clients</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(clientsQuery.error) ?? t`Please try again.`}{' '}
            <button type="button" className="underline" onClick={() => void clientsQuery.refetch()}>
              <Trans>Retry</Trans>
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      <ImportHistoryDrawer
        open={importHistory === 'open'}
        onOpenChange={handleImportHistoryOpenChange}
        onViewClient={handleViewImportedClient}
      />
      <ClientFactsWorkspace
        clients={clients}
        filteredClients={filteredClients}
        factsModel={factsModel}
        entityLabels={entityLabels}
        isLoading={clientsQuery.isLoading}
        clientFilter={filters.clientFilters}
        entityFilter={filters.entityFilters}
        stateFilter={filters.stateFilters}
        readinessFilter={filters.readinessFilters}
        sourceFilter={filters.sourceFilters}
        ownerFilter={filters.ownerFilters}
        pulseFilter={filters.pulseFilters}
        pulseMatchesByClient={pulseMatchesByClient}
        obligationSummariesByClient={obligationSummariesByClient}
        opportunityCountByClient={opportunityCountByClient}
        onClientFilterChange={handleClientFilterChange}
        onEntityFilterChange={handleEntityFilterChange}
        onStateFilterChange={handleStateFilterChange}
        onReadinessFilterChange={handleReadinessFilterChange}
        onSourceFilterChange={handleSourceFilterChange}
        onOwnerFilterChange={handleOwnerFilterChange}
        onPulseFilterChange={handlePulseFilterChange}
        onImport={openWizard}
        canImport={canRunMigration}
      />
    </div>
  )
}
