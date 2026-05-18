import { useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertCircleIcon, FileClockIcon, FileSearchIcon } from 'lucide-react'
import { useQueryStates } from 'nuqs'
import { toast } from 'sonner'

import type { ClientCreateInput, ClientPublic } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'

import { ClientFactsWorkspace } from '@/features/clients/ClientFactsWorkspace'
import { CreateClientDialog } from '@/features/clients/CreateClientDialog'
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

function useEntityLabels(): Record<ClientEntityType, string> {
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
  const queryClient = useQueryClient()
  const { openWizard } = useMigrationWizard()
  const permission = useFirmPermission()
  const canRunMigration = permission.can('migration.run')
  const canDeleteClients = permission.can('client.write')
  const entityLabels = useEntityLabels()
  const [
    {
      clients: clientFilter,
      entity: entityFilter,
      state: stateFilter,
      readiness: readinessFilter,
      source: sourceFilter,
      owner: ownerFilter,
      client: selectedClientId,
      importHistory,
    },
    setClientsQuery,
  ] = useQueryStates(clientsSearchParamsParsers)

  const clientsQuery = useQuery(
    orpc.clients.listByFirm.queryOptions({ input: { limit: CLIENT_LIST_LIMIT } }),
  )
  const clients = clientsQuery.data ?? EMPTY_CLIENTS
  const factsModel = useMemo(() => buildClientFactsModel(clients), [clients])
  const filters = useMemo(
    () =>
      normalizeClientsQueryFilters({
        clients: clientFilter,
        entity: entityFilter,
        state: stateFilter,
        readiness: readinessFilter,
        source: sourceFilter,
        owner: ownerFilter,
      }),
    [clientFilter, entityFilter, ownerFilter, readinessFilter, sourceFilter, stateFilter],
  )
  const filteredClients = useMemo(() => filterClients(clients, filters), [clients, filters])
  const selectedClient = selectedClientId
    ? (clients.find((client) => client.id === selectedClientId) ?? null)
    : null
  const activeClient = selectedClient ?? filteredClients[0] ?? null

  const createMutation = useMutation(
    orpc.clients.create.mutationOptions({
      onSuccess: (client) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void setClientsQuery({
          q: null,
          clients: null,
          entity: null,
          state: null,
          readiness: null,
          source: null,
          owner: null,
          client: client.id,
        })
        toast.success(t`Client created`, { description: client.name })
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
        client: null,
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
        client: null,
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
        client: null,
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
        client: null,
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
        client: null,
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
        client: null,
      })
    },
    [setClientsQuery],
  )

  const handleSelectClient = useCallback(
    (clientId: string) => {
      void setClientsQuery({ client: clientId })
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
      void setClientsQuery({
        q: null,
        clients: null,
        entity: null,
        state: null,
        readiness: null,
        source: null,
        owner: null,
        client: clientId,
        importHistory: null,
      })
    },
    [setClientsQuery],
  )

  const handleCreateClient = useCallback(
    (input: ClientCreateInput, callbacks: { onSuccess: () => void }) => {
      createMutation.mutate(input, callbacks)
    },
    [createMutation],
  )

  const handleClientDeleted = useCallback(() => {
    void setClientsQuery({ client: null, clients: null })
  }, [setClientsQuery])

  const handleClearSelectedClient = useCallback(() => {
    void setClientsQuery({ client: null })
  }, [setClientsQuery])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {selectedClient ? null : (
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl leading-tight font-semibold text-text-primary">
                <Trans>Clients</Trans>
              </h1>
              <p className="max-w-3xl text-sm leading-5 text-text-secondary">
                <Trans>
                  Validate the practice client facts that generate obligations, dashboard risk, and
                  Radar matches.
                </Trans>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => handleImportHistoryOpenChange(true)}>
              <FileClockIcon data-icon="inline-start" />
              <Trans>Import history</Trans>
            </Button>
            <Button variant="outline" onClick={openWizard} disabled={!canRunMigration}>
              <FileSearchIcon data-icon="inline-start" />
              <Trans>Import clients</Trans>
            </Button>
            <CreateClientDialog
              entityLabels={entityLabels}
              isPending={createMutation.isPending}
              onCreate={handleCreateClient}
            />
          </div>
        </header>
      )}

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
        activeClient={activeClient}
        selectedClient={selectedClient}
        factsModel={factsModel}
        entityLabels={entityLabels}
        isLoading={clientsQuery.isLoading}
        clientFilter={filters.clientFilters}
        entityFilter={filters.entityFilters}
        stateFilter={filters.stateFilters}
        readinessFilter={filters.readinessFilters}
        sourceFilter={filters.sourceFilters}
        ownerFilter={filters.ownerFilters}
        onClientFilterChange={handleClientFilterChange}
        onEntityFilterChange={handleEntityFilterChange}
        onStateFilterChange={handleStateFilterChange}
        onReadinessFilterChange={handleReadinessFilterChange}
        onSourceFilterChange={handleSourceFilterChange}
        onOwnerFilterChange={handleOwnerFilterChange}
        onSelectClient={handleSelectClient}
        onClearSelectedClient={handleClearSelectedClient}
        onImport={openWizard}
        canImport={canRunMigration}
        canDelete={canDeleteClients}
        onClientDeleted={handleClientDeleted}
      />
    </div>
  )
}
