import { useCallback, useMemo } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertCircleIcon, HistoryIcon, LightbulbIcon } from 'lucide-react'
import { useQueryStates } from 'nuqs'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import type { ClientCreateInput, ClientPublic, ObligationStatus } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { InfoBanner } from '@/components/patterns/info-banner'
import { ShortcutHintChip } from '@/components/patterns/kbd'
import { PageHeader } from '@/components/patterns/page-header'
import { ClientFactsWorkspace } from '@/features/clients/ClientFactsWorkspace'
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
      q: searchQuery,
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
  const pulseDetailsLoading = pulseDetailsQueries.some((query) => query.isLoading)
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
        q: searchQuery,
        clients: clientFilter,
        entity: entityFilter,
        state: stateFilter,
        readiness: readinessFilter,
        source: sourceFilter,
        owner: ownerFilter,
        pulse: pulseFilter,
      }),
    [
      searchQuery,
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
  const clientWorkspaceLoading =
    clientsQuery.isLoading ||
    obligationsListQuery.isLoading ||
    opportunitiesQuery.isLoading ||
    pulseHistoryQuery.isLoading ||
    pulseDetailsLoading

  // 2026-05-24 (useEffect audit): cycle-list write moved into the
  // row-click handler inside ClientFactsWorkspace. That writes
  // sessionStorage only on actual navigation intent rather than on
  // every filteredClients change, and removes one of the app's
  // useEffect violations per the AGENTS.md rule.
  const createMutation = useMutation(
    orpc.clients.create.mutationOptions({
      onSuccess: (client) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        toast.success(t`Client created`, { description: client.name })
        void navigate(clientDetailPath(client))
      },
      onError: (err) => {
        toast.error(t`Couldn't create client`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )

  // 2026-05-26 (Yuqi /clients directory pivot brief): inline search
  // handler. The `q` URL param flows through normalizeClientsQueryFilters
  // → filters.search → filterClients haystack. Passing `null` when the
  // value is empty clears the param entirely so shared URLs don't carry
  // dangling `?q=` suffixes.
  const handleSearchChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      void setClientsQuery({ q: trimmed.length > 0 ? next : null })
    },
    [setClientsQuery],
  )

  const handleClientFilterChange = useCallback(
    (values: string[]) => {
      const clientIds = normalizeClientIdFilters(values)
      void setClientsQuery({
        clients: nullableQueryArray(clientIds),
      })
    },
    [setClientsQuery],
  )

  const handleEntityFilterChange = useCallback(
    (values: string[]) => {
      const typedEntities = values.filter(isClientEntityType)
      void setClientsQuery({
        entity: nullableQueryArray(typedEntities),
      })
    },
    [setClientsQuery],
  )

  const handleStateFilterChange = useCallback(
    (values: string[]) => {
      const states = normalizeClientStateFilters(values)
      void setClientsQuery({
        state: nullableQueryArray(states),
      })
    },
    [setClientsQuery],
  )

  const handleSourceFilterChange = useCallback(
    (values: string[]) => {
      const typedSources = values.filter(isClientSourceType)
      void setClientsQuery({
        source: nullableQueryArray(typedSources),
      })
    },
    [setClientsQuery],
  )

  const handleOwnerFilterChange = useCallback(
    (values: string[]) => {
      const owners = normalizeClientOwnerFilters(values)
      void setClientsQuery({
        owner: nullableQueryArray(owners),
      })
    },
    [setClientsQuery],
  )

  const handlePulseFilterChange = useCallback(
    (values: string[]) => {
      const typedPulse = values.filter(isClientPulseFilter)
      void setClientsQuery({
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
    // 2026-05-26 (Yuqi macro→micro audit, Fix #1 + Fix #6 / §2.1):
    // /clients adopts the sticky-footer variant of the canonical
    // outer container — same shape as /deadlines. Required by Phase 7
    // (table-card frame + responsive page-size, §6) which assumes the
    // parent column has a defined viewport-driven height so the inner
    // card's `flex-1 min-h-0` rows-area can actually flex. Was Regular
    // (`gap-6 pb-4 md:pb-6`); now Sticky-footer (`gap-4 pb-0
    // xl:h-screen xl:overflow-hidden`).
    <div
      className={cn(
        'mx-auto flex w-full max-w-page-wide flex-col gap-4 px-4 pt-6 pb-0 md:px-6 md:pt-8 md:pb-0',
        'xl:h-screen xl:overflow-hidden',
      )}
    >
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Trans>Clients</Trans>
            {/* 2026-05-23: count chip next to the title gives a one-glance
                "how many clients does this firm manage?" signal.
                2026-05-26 (Yuqi /clients directory pivot brief): chip
                copy drops the word "Client(s)" — the title already
                says "Clients", a chip saying "47 Clients" reads as
                repetitive. Matches the canonical title-chip pattern
                (page-family-canonical §3) where the chip carries a
                qualifier number only ("47") or noun+number when the
                noun differs from the title (e.g. "17 open" on
                /deadlines). */}
            <span className="rounded-full bg-state-base-hover px-2 py-0.5 text-xs font-medium text-text-secondary tabular-nums">
              {clients.length}
            </span>
          </span>
        }
        actions={
          <>
            {/* 2026-05-27 (Step 6 UX flows audit H2.7): keyboard
                shortcut chip — same as /today and /alerts.
                Discoverability for `?` without forcing users to
                guess which key opens the help dialog. */}
            <ShortcutHintChip className="hidden md:inline-flex" />
            {/* 2026-05-25 (Yuqi /clients #2): the button opens migration
                import history, not client archival. Keep the visible label
                aligned with the drawer title so "Archive" does not read as
                a destructive client action. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleImportHistoryOpenChange(true)}
              aria-label={t`Import history`}
              title={t`Import history`}
            >
              <HistoryIcon data-icon="inline-start" />
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

      {/* 2026-05-26 (Stripe-bar /clarify pass — re-applied per Yuqi's
          "address all" direction): inline tip surfaces when the firm
          has fewer than 5 clients. Once the firm exceeds the
          threshold the banner self-suppresses; if the CPA dismisses
          it sooner the localStorage key keeps it hidden across
          sessions. CTA is gated on canRunMigration so the link never
          noops. */}
      {clients.length < 5 ? (
        <InfoBanner
          icon={LightbulbIcon}
          message={t`Import clients from CSV to populate the directory faster.`}
          cta={canRunMigration ? { label: t`Import`, onClick: openWizard } : undefined}
          dismissKey="clients-list-import-tip"
        />
      ) : null}

      {clientsQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Couldn't load clients</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(clientsQuery.error) ??
              t`Check your network and try again. If this keeps happening, contact support.`}{' '}
            {/* 2026-05-26 (Step 6 UX audit #64): retry uses the canonical
                `<Button variant="link">` instead of an ad-hoc
                `<button className="underline">`. Same fix as the
                dashboard error-alert in /today (Step 6 #30). */}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 align-baseline"
              onClick={() => void clientsQuery.refetch()}
            >
              <Trans>Retry</Trans>
            </Button>
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
        isLoading={clientWorkspaceLoading}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
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
