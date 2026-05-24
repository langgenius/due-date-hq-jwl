import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertCircleIcon } from 'lucide-react'
import { Link, Navigate, useLocation, useParams } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { ClientDetailWorkspace } from '@/features/clients/ClientFactsWorkspace'
import { getClientReadiness } from '@/features/clients/client-readiness'
import {
  clientDetailPath,
  findClientByRouteKey,
  isClientIdRouteKey,
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
  const routeKeyIsClientId = isClientIdRouteKey(clientKey)
  const clientsQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: CLIENTS_LIST_INPUT }),
    enabled: clientKey.length > 0 && !routeKeyIsClientId,
  })
  const slugClient =
    clientKey.length > 0 && !routeKeyIsClientId
      ? findClientByRouteKey(clientsQuery.data ?? EMPTY_CLIENTS, clientKey)
      : null
  const resolvedClientId = routeKeyIsClientId ? clientKey : (slugClient?.id ?? '')

  const clientQuery = useQuery({
    ...orpc.clients.get.queryOptions({ input: { id: resolvedClientId } }),
    enabled: resolvedClientId.length > 0,
  })

  const client = clientQuery.data ?? null
  const isLoading = routeKeyIsClientId
    ? clientQuery.isLoading
    : clientsQuery.isLoading || (resolvedClientId.length > 0 && clientQuery.isLoading)
  const isError = routeKeyIsClientId
    ? clientQuery.isError
    : clientsQuery.isError || clientQuery.isError
  const error = routeKeyIsClientId ? clientQuery.error : (clientsQuery.error ?? clientQuery.error)

  if (client) {
    const canonicalPath = clientDetailPath(client)
    if (location.pathname !== canonicalPath) {
      return <Navigate to={`${canonicalPath}${location.search}${location.hash}`} replace />
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
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
            <Button variant="outline" size="sm" render={<Link to="/clients" />}>
              <Trans>Back to clients</Trans>
            </Button>
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
