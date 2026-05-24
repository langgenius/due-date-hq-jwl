import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertCircleIcon } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { ClientDetailWorkspace } from '@/features/clients/ClientFactsWorkspace'
import { getClientReadiness } from '@/features/clients/client-readiness'
import { paidPlanActive } from '@/features/billing/model'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

import { useEntityLabels } from './clients'

export function ClientDetailRoute() {
  const { t } = useLingui()
  const { clientId = '' } = useParams<{ clientId: string }>()
  const entityLabels = useEntityLabels()
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)
  const practiceAiEnabled = paidPlanActive(currentFirm)

  const clientQuery = useQuery({
    ...orpc.clients.get.queryOptions({ input: { id: clientId } }),
    enabled: clientId.length > 0,
  })

  const client = clientQuery.data ?? null

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {clientQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : clientQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Couldn't load this client</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(clientQuery.error) ??
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
