import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRightIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { getClientReadiness } from '@/features/clients/client-readiness'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDate } from '@/lib/utils'

import { ClientAlertsBand } from './ClientFactsWorkspace'
import { ClientCompliancePosturePanel } from './ClientCompliancePosturePanel'
import { ClientSummaryStrip } from './ClientSummaryStrip'
import {
  buildClientPulseMatches,
  buildClientWorkPlanSummary,
  findExtensionWithoutPaymentObligations,
} from './client-detail-model'
import { useEntityLabels } from '@/routes/clients'

/**
 * `ClientDetailDrawer` — the glance form of the client detail page,
 * rendered as a Sheet over whatever surface the user came from.
 *
 * The full page at `/clients/[id]` is the deep-work form (tabs, edit
 * panels, audit log, AI summary). The drawer is the read-only "what's
 * the state of this client right now?" answer:
 *
 *  - Sheet header with name, entity badge, action cluster
 *    (Open full page, View all obligations)
 *  - Identity strip (filing state, source/readiness badges)
 *  - ClientSummaryStrip (Next due / At risk / Team)
 *  - ClientAlertsBand (Pulse + extension mismatch + missing facts)
 *  - ClientCompliancePosturePanel (EIN, tax year, owners,
 *    activity-scope chips)
 *
 * No tabs, no edit panels. If the CPA needs to do anything beyond
 * "look + click into an obligation," the "Open full page" link takes
 * them to the canonical workspace.
 *
 * Mounted by `<ClientDrawerProvider>` once at the app shell.
 */

interface ClientDetailDrawerProps {
  clientId: string | null
  onClose: () => void
}

export function ClientDetailDrawer({ clientId, onClose }: ClientDetailDrawerProps) {
  const open = clientId !== null
  const isQueryEnabled = clientId !== null

  const clientQuery = useQuery({
    ...orpc.clients.get.queryOptions({ input: { id: clientId ?? '' } }),
    enabled: isQueryEnabled && clientId.length > 0,
  })
  const obligationsQuery = useQuery({
    ...orpc.obligations.listByClient.queryOptions({ input: { clientId: clientId ?? '' } }),
    enabled: isQueryEnabled && clientId.length > 0,
  })
  // Pulse history feeds the alerts band. Match the page-level
  // workspace's 30-alert window so the matches feel consistent.
  const pulseHistoryQuery = useQuery({
    ...orpc.pulse.listHistory.queryOptions({ input: { limit: 30 } }),
    enabled: isQueryEnabled,
  })
  const pulseDetailsQueries = useQueries({
    queries: (pulseHistoryQuery.data?.alerts ?? []).map((alert) =>
      orpc.pulse.getDetail.queryOptions({ input: { alertId: alert.id } }),
    ),
  })

  const client = clientQuery.data ?? null
  // Memoize the obligations array so downstream useMemos don't see a
  // fresh `[]` literal each render and re-fire their dep checks.
  const obligations = useMemo(() => obligationsQuery.data ?? [], [obligationsQuery.data])
  const readiness = useMemo(() => (client ? getClientReadiness(client) : undefined), [client])
  const workPlan = useMemo(
    () => buildClientWorkPlanSummary(obligations, formatDate(new Date().toISOString())),
    [obligations],
  )
  const extensionPaymentMismatches = useMemo(
    () => findExtensionWithoutPaymentObligations(obligations),
    [obligations],
  )
  const pulseDetails = pulseDetailsQueries.flatMap((query) => (query.data ? [query.data] : []))
  const pulseMatches = useMemo(
    () => (clientId ? buildClientPulseMatches(pulseDetails, clientId) : []),
    [pulseDetails, clientId],
  )

  const entityLabels = useEntityLabels()
  const { t } = useLingui()

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent className="flex flex-col gap-4 overflow-y-auto data-[side=right]:w-full data-[side=right]:max-w-[100vw] sm:data-[side=right]:w-[min(560px,calc(100vw-1rem))] md:data-[side=right]:w-[min(640px,calc(100vw-1.5rem))]">
        {client ? (
          <>
            <header className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <SheetTitle className="truncate text-xl font-semibold text-text-primary">
                    {client.name}
                  </SheetTitle>
                  <SheetDescription className="text-sm text-text-secondary">
                    <Trans>
                      {entityLabels[client.entityType]} ·{' '}
                      {workPlan.openCount === 0
                        ? t`No open obligations`
                        : t`${workPlan.openCount} open obligations`}
                    </Trans>
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  render={<Link to={`/clients/${client.id}`} />}
                  onClick={onClose}
                >
                  <Trans>Open full page</Trans>
                  <ArrowUpRightIcon data-icon="inline-end" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link to={`/obligations?client=${client.id}`} />}
                  onClick={onClose}
                >
                  <Trans>View all obligations</Trans>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {entityLabels[client.entityType]}
                </Badge>
                {client.state ? (
                  <Badge variant="outline" className="text-xs">
                    {client.state}
                  </Badge>
                ) : null}
                {readiness?.status ? (
                  <Badge
                    variant={
                      readiness.status === 'ready'
                        ? 'success'
                        : readiness.status === 'needs_facts'
                          ? 'warning'
                          : 'outline'
                    }
                    className="text-xs"
                  >
                    {readiness.status === 'ready' ? (
                      <Trans>Ready for rules</Trans>
                    ) : readiness.status === 'needs_facts' ? (
                      <Trans>Needs facts</Trans>
                    ) : (
                      <Trans>Setup</Trans>
                    )}
                  </Badge>
                ) : null}
              </div>
            </header>

            <ClientSummaryStrip clientId={client.id} obligations={obligations} />

            <ClientAlertsBand
              pulseMatches={pulseMatches}
              readiness={readiness}
              extensionPaymentMismatches={extensionPaymentMismatches}
              onAddFacts={() => {
                // From the drawer, "add facts" can't open an inline
                // edit (no jurisdiction panel here) — promote to the
                // full page where the facts editor lives.
                window.location.assign(`/clients/${client.id}`)
              }}
            />

            <ClientCompliancePosturePanel client={client} />
          </>
        ) : clientQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>
              <Trans>Couldn't load this client</Trans>
            </AlertTitle>
            <AlertDescription>
              {rpcErrorMessage(clientQuery.error) ?? t`Please try again.`}
            </AlertDescription>
          </Alert>
        ) : (
          // Loading skeleton — three blocks roughly matching the
          // hero / summary strip / posture panel that will mount.
          <div className="flex flex-col gap-4">
            <SheetTitle className="sr-only">
              <Trans>Loading client</Trans>
            </SheetTitle>
            <SheetDescription className="sr-only">
              <Trans>Fetching client detail.</Trans>
            </SheetDescription>
            <Skeleton className="h-10 w-1/2 rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-40 w-full rounded-md" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
