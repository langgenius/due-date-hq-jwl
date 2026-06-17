import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertCircleIcon } from 'lucide-react'
import { Link, Navigate, useLocation, useParams } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { ClientDetailWorkspace } from '@/features/clients/ClientDetailWorkspace'
import { getClientReadiness } from '@/features/clients/client-readiness'
import {
  clientIdFromRouteKey,
  clientDetailPath,
  findClientByRouteKey,
} from '@/features/clients/client-url'
import { paidPlanActive } from '@/features/billing/model'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
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

  // Page-view analytics — fires once when the client detail route mounts.
  useEffect(() => {
    track(ANALYTICS_EVENTS.clientOpened, { surface: 'route' })
  }, [])

  if (client) {
    const canonicalPath = clientDetailPath(client)
    if (location.pathname !== canonicalPath) {
      return <Navigate to={`${canonicalPath}${location.search}${location.hash}`} replace />
    }
  }

  return (
    // The outer container uses the canonical sticky-footer variant (matches
    // /deadlines + /clients list). At xl+ the page IS the viewport — `h-screen
    // overflow-hidden` — so the workspace can host its own scroll container
    // internally. Below xl, the page falls back to natural content-driven
    // scrolling (the workspace stays usable on mobile / tablet without locked
    // viewport math).
    //
    // No `mx-auto max-w-page-wide` 1100px cap: with the 600px right panel open
    // + a 24px gap, the left column would shrink to ~480px on the cap and the
    // H1 ("Riverbend Draft Client") would wrap onto 3 lines. /deadlines doesn't
    // cap — it uses the full available width minus the sidebar — and at a
    // 1920px viewport the left column lands at ~1240px when the panel is open.
    // Matching that contract: container is `flex w-full flex-col` with
    // horizontal padding only.
    <div
      className={cn(
        // 2026-06-16 (Yuqi #3/#9): the section carries NO padding so the
        // obligation panel reaches the right edge (edge-to-edge master-detail).
        // Padding lives on the CONTENT — the workspace's left column + each
        // loading/error state below apply their own gutter + top space — not on
        // the whole section.
        'mx-auto flex w-full max-w-page-expanded flex-col pb-0',
        'xl:h-screen xl:overflow-hidden',
      )}
    >
      {isLoading ? (
        // Domain-specific skeleton mirrors the real client-detail shape —
        // title + caption + identity chips, then the summary tile row, then
        // the body workspace — rather than a generic stack of three blocks
        // (8/40/64) that reads the same as the dashboard loader. Reduces the
        // visual jolt when the real layout paints.
        <div className="flex flex-col gap-4 px-4 pt-5 md:px-8 md:pt-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-64 rounded-lg" />
            <Skeleton className="h-4 w-40 rounded-lg" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
          {/* Summary placeholder — matches the real fact-strip panel
              (rounded-xl, ~84px) so the skeleton→content paint doesn't reflow. */}
          <Skeleton className="h-[84px] w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <Alert variant="destructive" className="mx-4 mt-5 md:mx-8 md:mt-6">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Couldn't load this client</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(error) ??
              t`Try again in a moment. If it keeps failing, contact support.`}
          </AlertDescription>
        </Alert>
      ) : !client ? (
        <Alert className="mx-4 mt-5 md:mx-8 md:mt-6">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Client not found</Trans>
          </AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>
              <Trans>This client may have been deleted or you may not have access.</Trans>
            </span>
            {/* If the absence is transient (stale cache, network blip) the
                CPA needs a way to retry without navigating away and back.
                Refresh re-runs the same query; Back-to-clients stays as the
                navigational escape hatch. */}
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
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link to="/clients" />}
              >
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
