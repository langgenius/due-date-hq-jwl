import { useCallback, useEffect, useMemo } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AlertCircleIcon, ArchiveIcon } from 'lucide-react'
import { useQueryStates } from 'nuqs'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import type { ClientCreateInput, ClientPublic, ObligationStatus } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'

import { PageHeader } from '@/components/patterns/page-header'
import { ClientFactsWorkspace } from '@/features/clients/ClientFactsWorkspace'
import { writeClientCycleList } from '@/features/clients/client-cycle'
import { clientDetailPath } from '@/features/clients/client-url'
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
// 2026-05-23: widened the list query to include terminal-state rows
// so the /clients list can render a DONE count column alongside OPEN.
// Open rows still populate next-due tracking; done rows only bump the
// done count (the summary builder distinguishes by status). For larger
// firms this query should bound by filing year before scaling — done
// rows accumulate over time and the 100-row limit would silently drop
// older filings.
const CLIENTS_LIST_OBLIGATION_STATUSES: ObligationStatus[] = [
  ...OPEN_OBLIGATION_STATUSES,
  'done',
  'completed',
]
const OBLIGATIONS_LIST_INPUT = {
  status: CLIENTS_LIST_OBLIGATION_STATUSES,
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
        void navigate(clientDetailPath(client))
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
      const client = clients.find((candidate) => candidate.id === clientId)
      void setClientsQuery({ importHistory: null })
      void navigate(client ? clientDetailPath(client) : `/clients/${clientId}`)
    },
    [clients, navigate, setClientsQuery],
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
        title={
          <span className="inline-flex items-center gap-2">
            <Trans>Clients</Trans>
            {/* 2026-05-23: count chip next to the title gives a one-glance
                "how many clients does this firm manage?" signal. Reads the
                full unfiltered list (not the filtered subset) so it stays
                stable as the user toggles action-strip chips. */}
            <span className="rounded-full bg-state-base-hover px-2 py-0.5 text-xs font-medium text-text-secondary tabular-nums">
              <Plural value={clients.length} one="# Client" other="# Clients" />
            </span>
          </span>
        }
        actions={
          <>
            {/* 2026-05-23: compressed from text+icon to icon-only — saves
                header chrome and matches the boxed archive glyph in the
                design mock. Tooltip preserves the action name. */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleImportHistoryOpenChange(true)}
              aria-label={t`Import history`}
              title={t`Import history`}
            >
              <ArchiveIcon className="size-4" aria-hidden />
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
        onSourceFilterChange={handleSourceFilterChange}
        onOwnerFilterChange={handleOwnerFilterChange}
        onPulseFilterChange={handlePulseFilterChange}
        onImport={openWizard}
        canImport={canRunMigration}
      />
    </div>
  )
}
