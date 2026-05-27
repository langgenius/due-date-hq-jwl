import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertCircleIcon } from 'lucide-react'
import { Link, Navigate, useLocation, useParams } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { ClientDetailWorkspace } from '@/features/clients/ClientFactsWorkspace'
import { getClientReadiness } from '@/features/clients/client-readiness'
import {
  clientIdFromRouteKey,
  clientDetailPath,
  findClientByRouteKey,
} from '@/features/clients/client-url'
import { paidPlanActive } from '@/features/billing/model'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

import { useEntityLabels } from './clients'

const CLIENTS_LIST_INPUT = { limit: 500 } as const
const EMPTY_CLIENTS = [] as const

export function ClientDetailRoute() {
  const { t } = useLingui()
  const { clientKey = '' } = useParams<{ clientKey: string }>()
  const location = useLocation()
  const entityLabels = useEntityLabels()
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)
  const practiceAiEnabled = paidPlanActive(currentFirm)
  const routeClientId = clientIdFromRouteKey(clientKey)
  const needsSlugLookup = clientKey.length > 0 && !routeClientId
  const clientsQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: CLIENTS_LIST_INPUT }),
    enabled: needsSlugLookup,
  })
  const slugClient = needsSlugLookup
    ? findClientByRouteKey(clientsQuery.data ?? EMPTY_CLIENTS, clientKey)
    : null
  const resolvedClientId = routeClientId ?? slugClient?.id ?? ''

  const clientQuery = useQuery({
    ...orpc.clients.get.queryOptions({ input: { id: resolvedClientId } }),
    enabled: resolvedClientId.length > 0,
  })

  const client = clientQuery.data ?? null
  const routeKeyHasClientId = routeClientId !== null
  const isLoading = routeKeyHasClientId
    ? clientQuery.isLoading
    : clientsQuery.isLoading || (resolvedClientId.length > 0 && clientQuery.isLoading)
  const isError = routeKeyHasClientId
    ? clientQuery.isError
    : clientsQuery.isError || clientQuery.isError
  const error = routeKeyHasClientId ? clientQuery.error : (clientsQuery.error ?? clientQuery.error)

  if (client) {
    const canonicalPath = clientDetailPath(client)
    if (location.pathname !== canonicalPath) {
      return <Navigate to={`${canonicalPath}${location.search}${location.hash}`} replace />
    }
  }

  return (
    // 2026-05-26 (Yuqi feedback #11-#14 — "scrolling mechanism should
    // follow Deadline expanded"): outer container moves to the
    // canonical sticky-footer variant (matches /deadlines + /clients
    // list). At xl+ the page IS the viewport — `h-screen
    // overflow-hidden` — so the workspace can host its own scroll
    // container internally. Below xl, the page falls back to natural
    // content-driven scrolling (the workspace stays usable on mobile
    // / tablet without locked viewport math).
    //
    // 2026-05-26 (Yuqi follow-up — "reference the responsive and
    // width to Deadline's expanded right panel"): dropped the
    // `mx-auto max-w-page-wide` 1100px cap. With the 600px right
    // panel open + a 24px gap, the left column would shrink to
    // ~480px on the cap and the H1 ("Riverbend Draft Client")
    // would wrap onto 3 lines. /deadlines doesn't cap — it uses
    // the full available width minus the sidebar — and at a
    // 1920px viewport the left column lands at ~1240px when the
    // panel is open. Matching that contract: container is now
    // `flex w-full flex-col` with horizontal padding only.
    <div
      className={cn(
        'mx-auto flex w-full max-w-page-expanded flex-col gap-4 px-4 pt-6 pb-0 md:px-6 md:pt-8 md:pb-0',
        'xl:h-screen xl:overflow-hidden',
      )}
    >
      {isLoading ? (
        // 2026-05-27 (Step 6 UX audit #71): loading state used to be a
        // generic stack of three blocks (8/40/64) that read the same
        // as the dashboard loader. Domain-specific skeleton mirrors
        // the real client-detail shape — title + caption + identity
        // chips, then the summary tile row, then the body workspace.
        // Reduces the visual jolt when the real layout paints.
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-64 rounded-md" />
            <Skeleton className="h-4 w-40 rounded-md" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-20 flex-1 min-w-44 rounded-md" />
            <Skeleton className="h-20 flex-1 min-w-44 rounded-md" />
            <Skeleton className="h-20 flex-1 min-w-44 rounded-md" />
          </div>
          <Skeleton className="h-72 w-full rounded-md" />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Couldn't load this client</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(error) ??
              t`Check your network and try again. If this keeps happening, contact support.`}
          </AlertDescription>
        </Alert>
      ) : !client ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Client not found</Trans>
          </AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>
              <Trans>This client may have been deleted or you may not have access.</Trans>
            </span>
            {/* 2026-05-27 (Step 6 UX audit #68): "Client not found" used
                to only offer "Back to clients" — a one-way exit. If
                the absence is a transient (stale cache, network blip)
                the CPA had to navigate away and back to retry.
                Refresh re-runs the same query; Back-to-clients stays
                as the navigational escape hatch. */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void clientQuery.refetch()
                  if (needsSlugLookup) void clientsQuery.refetch()
                }}
              >
                <Trans>Try again</Trans>
              </Button>
              <Button variant="ghost" size="sm" render={<Link to="/clients" />}>
                <Trans>Back to clients</Trans>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <ClientDetailWorkspace
          client={client}
          entityLabels={entityLabels}
          readiness={getClientReadiness(client)}
          firmTimezone={firmTimezone}
          practiceAiEnabled={practiceAiEnabled}
        />
      )}
    </div>
  )
}
