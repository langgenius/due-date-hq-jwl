import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CircleAlertIcon, HistoryIcon, LightbulbIcon } from 'lucide-react'
import { useQueryStates } from 'nuqs'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import type { ClientCreateInput, ClientPublic, ObligationStatus } from '@duedatehq/contracts'
import type { ClientTaxClassification } from '@duedatehq/contracts/shared/enums'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { InfoBanner } from '@/components/patterns/info-banner'
import { ShortcutHintChip } from '@/components/patterns/kbd'
import { PageHeader } from '@/components/patterns/page-header'
import { CountPill } from '@/components/primitives/count-pill'
import { ClientFactsWorkspace } from '@/features/clients/ClientFactsWorkspace'
import { CreateClientDialog } from '@/features/clients/CreateClientDialog'
import { clientDetailPath } from '@/features/clients/client-url'
import { ClientsCreateSplitButton } from '@/features/clients/ClientsCreateSplitButton'
import {
  buildClientObligationListSummaries,
  buildAlertMatchesByClient,
} from '@/features/clients/client-detail-model'
import {
  CLIENT_LIST_LIMIT,
  clientsSearchParamsParsers,
  normalizeClientOwnerFilters,
  normalizeClientStateFilters,
  normalizeClientsQueryFilters,
  nullableQueryArray,
} from '@/features/clients/client-query-state'
import { queryInputUrlUpdateRateLimit } from '@/lib/query-rate-limit'
import {
  buildClientFactsModel,
  filterClients,
  isClientEntityType,
  type ClientEntityType,
} from '@/features/clients/client-readiness'
import { ImportHistoryDrawer } from '@/features/migration/ImportHistoryDrawer'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

const EMPTY_CLIENTS: ClientPublic[] = []
const EMPTY_AFFECTED_CLIENT_IDS: ReadonlySet<string> = new Set()
const ALERT_HISTORY_LIMIT = 50
const OBLIGATION_LIST_LIMIT = 100
const OPEN_OBLIGATION_STATUSES: ObligationStatus[] = [
  'pending',
  'in_progress',
  'extended',
  'waiting_on_client',
  'review',
]
// The list query includes terminal-state rows
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
const ALERT_HISTORY_INPUT = { limit: ALERT_HISTORY_LIMIT }
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

// Localized labels for the client's federal tax classification — the
// "how is this entity taxed?" axis that drives which federal forms the
// deadline generator emits (1040 / 1065 / 1120 / 1120-S …). Kept next
// to useEntityLabels so the classification recompute panel + impact
// dialog share one label source, the same way entity labels are shared
// across the create dialog, the directory table, and the header pill.
export function useTaxClassificationLabels(): Record<ClientTaxClassification, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      individual: t`Individual`,
      disregarded_entity: t`Disregarded entity`,
      partnership: t`Partnership`,
      s_corp: t`S corp`,
      c_corp: t`C corp`,
      trust: t`Trust`,
      estate: t`Estate`,
      nonprofit: t`Nonprofit`,
      foreign_reporting_company: t`Foreign reporting company`,
      unknown: t`Unknown`,
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
  // Gate the "+ New client" split button so coordinator (read-only)
  // sees disabled + tooltip instead of a dialog that 403s on submit.
  // Server already enforces the mutation; this is the UI affordance.
  const canCreateClient = permission.can('client.write')
  // The empty-state hero's "Add one manually" CTA opens the create
  // dialog programmatically (hidden trigger). Controlled here so the
  // hero can drive it.
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const entityLabels = useEntityLabels()
  const [
    {
      q: searchQuery,
      clients: clientFilter,
      entity: entityFilter,
      state: stateFilter,
      readiness: readinessFilter,
      source: sourceFilter,
      pulse: alertFilter,
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
  const alertHistoryQuery = useQuery(
    orpc.pulse.listHistory.queryOptions({ input: ALERT_HISTORY_INPUT }),
  )
  // Audit P1-4: replaced the N+1 useQueries fan-out (one
  // `pulse.getDetail` request per alert) with a single
  // `pulse.getDetailsBatch` round-trip. With ~50 alerts in history
  // this collapses 50 requests into 1 and ends a slow-to-mutate
  // refetch cascade when the history list changes.
  const alertIds = useMemo(
    () => (alertHistoryQuery.data?.alerts ?? []).map((alert) => alert.id),
    [alertHistoryQuery.data?.alerts],
  )
  const alertDetailsBatchQuery = useQuery({
    ...orpc.pulse.getDetailsBatch.queryOptions({ input: { alertIds: alertIds } }),
    enabled: alertIds.length > 0,
  })
  const alertDetailsLoading = alertIds.length > 0 && alertDetailsBatchQuery.isLoading
  const alertDetails = alertDetailsBatchQuery.data?.details ?? []
  const alertDetailsKey = alertDetails.map((detail) => detail.alert.id).join('|')
  const alertMatchesByClient = useMemo(
    () => buildAlertMatchesByClient(alertDetails),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alertDetailsKey],
  )
  const affectedClientIds = useMemo<ReadonlySet<string>>(() => {
    if (alertMatchesByClient.size === 0) return EMPTY_AFFECTED_CLIENT_IDS
    return new Set(alertMatchesByClient.keys())
  }, [alertMatchesByClient])
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
        pulse: alertFilter,
      }),
    [
      searchQuery,
      clientFilter,
      entityFilter,
      ownerFilter,
      alertFilter,
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
    alertHistoryQuery.isLoading ||
    alertDetailsLoading

  // Page-view analytics. Fires once after the clients query first settles so
  // `client_count` reflects real data (not the loading-state zero). The ref
  // guards against re-firing on later refetches/filter changes.
  const clientsViewedTrackedRef = useRef(false)
  useEffect(() => {
    if (clientsViewedTrackedRef.current || clientsQuery.isLoading) return
    clientsViewedTrackedRef.current = true
    const filterCount =
      (searchQuery ? 1 : 0) +
      (clientFilter.length > 0 ? 1 : 0) +
      (entityFilter.length > 0 ? 1 : 0) +
      (stateFilter.length > 0 ? 1 : 0) +
      (ownerFilter.length > 0 ? 1 : 0) +
      (readinessFilter.length > 0 ? 1 : 0) +
      (sourceFilter.length > 0 ? 1 : 0) +
      (alertFilter.length > 0 ? 1 : 0)
    track(ANALYTICS_EVENTS.clientsViewed, {
      client_count: clients.length,
      filter_count: filterCount,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientsQuery.isLoading])

  // The cycle-list write lives in the row-click handler inside
  // ClientFactsWorkspace, so it writes sessionStorage only on actual
  // navigation intent rather than on every filteredClients change (and
  // avoids a useEffect per the AGENTS.md rule).
  const createMutation = useMutation(
    orpc.clients.create.mutationOptions({
      onSuccess: (client) => {
        // Best-effort "first client" detection: the loaded directory list was
        // empty before this create. `clients` is the live query data captured
        // at render; the manual dialog is the only path through here, so
        // method is always 'manual'.
        const wasFirstClient = clients.length === 0
        track(ANALYTICS_EVENTS.clientCreated, {
          entity_type: client.entityType,
          tax_classification: client.taxClassification,
          surface: 'directory',
        })
        if (wasFirstClient) {
          track(ANALYTICS_EVENTS.firstClientCreated, {
            entity_type: client.entityType,
            tax_classification: client.taxClassification,
            method: 'manual',
          })
        }
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        toast.success(t`Client created`, { description: client.name })
        void navigate(clientDetailPath(client))
      },
      onError: (err) => {
        toast.error(t`Couldn't create client`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )

  const seedSampleMutation = useMutation(
    orpc.clients.seedSample.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        toast.success(t`Sample data loaded`)
      },
      onError: (err) => {
        toast.error(t`Couldn't load sample data`, {
          description: rpcErrorMessage(err) ?? t`Try again in a moment.`,
        })
      },
    }),
  )

  const removeSampleMutation = useMutation(
    orpc.clients.removeSample.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        toast.success(t`Sample data removed`)
      },
      onError: (err) => {
        toast.error(t`Couldn't remove sample data`, {
          description: rpcErrorMessage(err) ?? t`Try again in a moment.`,
        })
      },
    }),
  )

  const hasSampleClients = clients.some((c) => c.isSample)

  // Inline search handler. The `q` URL param flows through
  // normalizeClientsQueryFilters → filters.search → filterClients
  // haystack. Passing `null` when the value is empty clears the param
  // entirely so shared URLs don't carry dangling `?q=` suffixes.
  // Rate-limit the URL write the same way /deadlines does: otherwise
  // every keystroke rewrites the address bar AND grows the
  // history-replace stack on each character. Rate-limiting batches the
  // URL to settle ~350ms after the user stops typing. The SearchInput `value`
  // still binds to the URL-backed `searchQuery` (nuqs returns the
  // pending value optimistically during the rate-limit window — see
  // https://nuqs.dev/docs/options#limitUrlUpdates), so the visible
  // text keeps repainting on every keystroke and the address bar
  // catches up after the user stops. Clearing (empty value) skips
  // the rate-limit so the cleared state appears immediately on
  // Escape / X-click.
  const handleSearchChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      void setClientsQuery(
        { q: trimmed.length > 0 ? next : null },
        trimmed.length === 0 ? undefined : { limitUrlUpdates: queryInputUrlUpdateRateLimit },
      )
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

  const handleOwnerFilterChange = useCallback(
    (values: string[]) => {
      const owners = normalizeClientOwnerFilters(values)
      void setClientsQuery({
        owner: nullableQueryArray(owners),
      })
    },
    [setClientsQuery],
  )

  // 2026-06-16 (audit): the readiness/source/pulse filters are deep-link-only
  // (nothing in the UI writes them anymore — the triage tiles that set
  // `pulse=affected` were removed). They still narrow the list + drive the
  // "N of M" count chip, but the toolbar's "Clear filters" never reset them and
  // there's no chip — a stale bookmark could pin the directory to a subset with
  // NO way out but editing the URL. This flags them as active and gives the
  // Clear a complete reset across all filter params.
  const extraClientFiltersActive =
    readinessFilter.length > 0 || sourceFilter.length > 0 || alertFilter.length > 0
  const handleClearAllFilters = useCallback(() => {
    void setClientsQuery({
      q: null,
      clients: null,
      entity: null,
      state: null,
      readiness: null,
      source: null,
      pulse: null,
      owner: null,
    })
  }, [setClientsQuery])

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
    // /clients uses the sticky-footer variant of the canonical outer
    // container — same shape as /deadlines. The table-card frame +
    // responsive page-size assumes the parent column has a defined
    // viewport-driven height so the inner card's `flex-1 min-h-0`
    // rows-area can actually flex.
    <div
      className={cn(
        'mx-auto flex w-full max-w-page-expanded flex-col gap-8 px-4 pt-8 pb-0 md:px-8 md:pb-0',
        'xl:h-screen xl:overflow-hidden',
      )}
    >
      <PageHeader
        // Scope eyebrow above the title — the /clients equivalent of
        // /deadlines' "Synced just now · N deadlines tracked" context line,
        // so the list pages share one header rhythm. Calm tertiary, normal-
        // case (overriding the eyebrow slot's default uppercase), and phrased
        // "N clients · M jurisdictions" to also match /rules/library's
        // "N rules across M jurisdictions" scope line. Suppressed on the
        // empty-state surface (no clients yet).
        eyebrow={
          clients.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-text-tertiary">
              <span className="tabular-nums">
                <Plural value={clients.length} one="# client" other="# clients" />
              </span>
              <span aria-hidden>·</span>
              <span className="tabular-nums">
                <Plural
                  value={factsModel.summary.statesCovered}
                  one="# jurisdiction"
                  other="# jurisdictions"
                />
              </span>
            </span>
          ) : undefined
        }
        title={
          <span className="inline-flex items-center gap-2">
            <Trans>Clients</Trans>
            {/* Count chip next to the title gives a one-glance "how many
                clients does this firm manage?" signal. The chip drops the
                word "Client(s)" — the title already says "Clients", so a
                chip saying "47 Clients" would read as repetitive. Matches
                the canonical title-chip pattern (page-family-canonical §3)
                where the chip carries a qualifier number only ("47") or
                noun+number when the noun differs from the title (e.g. "17
                open" on /deadlines). When any filter is active the chip
                shows "N of M" so the CPA sees both the filtered subset AND
                the total at a glance — keeping the unfiltered total would
                make the chip lie about the visible list. */}
            {/* CountPill (tone="neutral") — the canonical PageHeader-title
                count chip, shared with /deadlines. Neutral = a plain total
                (no status dot). */}
            <CountPill tone="neutral">
              {filteredClients.length === clients.length
                ? clients.length
                : t`${filteredClients.length} of ${clients.length}`}
            </CountPill>
          </span>
        }
        actions={
          <>
            {/* Keyboard shortcut chip — same as /today and /alerts.
                Discoverability for `?` without forcing users to
                guess which key opens the help dialog. */}
            <ShortcutHintChip className="hidden md:inline-flex" />
            {hasSampleClients && canCreateClient ? (
              <Button
                variant="secondary"
                onClick={() => removeSampleMutation.mutate({})}
                disabled={removeSampleMutation.isPending}
              >
                <Trans>Remove sample data</Trans>
              </Button>
            ) : null}
            {/* The button opens migration import history, not client
                archival. Keep the visible label aligned with the drawer
                title so "Archive" does not read as a destructive client
                action. No `title` tooltip (it would just repeat the
                visible "Import history" label); `aria-label` stays for AT
                users if the visible label ever becomes icon-only. */}
            <Button
              variant="secondary"
              onClick={() => handleImportHistoryOpenChange(true)}
              aria-label={t`Import history`}
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
              canCreate={canCreateClient}
            />
          </>
        }
      />

      {/* Inline import tip — only for a PARTIALLY populated directory (1–4
          clients). At 0 clients the full-surface empty-state hero already owns
          the import prompt, so showing this banner too was a redundant second
          import CTA (Yuqi 2026-06-29). Above the threshold it self-suppresses;
          a manual dismiss persists via localStorage. CTA gated on
          canRunMigration so the link never noops. */}
      {clients.length > 0 && clients.length < 5 ? (
        <InfoBanner
          icon={LightbulbIcon}
          message={t`Import clients from CSV to populate the directory faster.`}
          cta={canRunMigration ? { label: t`Import`, onClick: openWizard } : undefined}
          dismissKey="clients-list-import-tip"
        />
      ) : null}

      {clientsQuery.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            <Trans>Couldn't load clients</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(clientsQuery.error) ??
              t`Try again in a moment. If it keeps failing, contact support.`}{' '}
            {/* Retry uses the canonical `<Button variant="link">`
                instead of an ad-hoc `<button className="underline">` —
                same as the dashboard error-alert in /today. */}
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
        entityFilter={filters.entityFilters}
        stateFilter={filters.stateFilters}
        ownerFilter={filters.ownerFilters}
        alertMatchesByClient={alertMatchesByClient}
        obligationSummariesByClient={obligationSummariesByClient}
        onEntityFilterChange={handleEntityFilterChange}
        onStateFilterChange={handleStateFilterChange}
        onOwnerFilterChange={handleOwnerFilterChange}
        extraFiltersActive={extraClientFiltersActive}
        onClearAllFilters={handleClearAllFilters}
        onImport={openWizard}
        canImport={canRunMigration}
        onCreateClient={canCreateClient ? () => setCreateDialogOpen(true) : undefined}
        canCreate={canCreateClient}
        onSampleData={canCreateClient ? () => seedSampleMutation.mutate({}) : undefined}
        sampleDataPending={seedSampleMutation.isPending}
      />

      {/* Controlled create dialog driven by the empty-state hero's
          "Add one manually" CTA. Trigger is hidden —
          the directory's primary "+ New client" affordance still lives in
          the ClientsCreateSplitButton in the page header. */}
      <CreateClientDialog
        entityLabels={entityLabels}
        isPending={createMutation.isPending}
        onCreate={handleCreateClient}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        hideTrigger
      />
    </div>
  )
}
