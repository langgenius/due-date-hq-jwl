import { Link } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, CheckCircle2Icon, ClockIcon } from 'lucide-react'
import { useQueryStates } from 'nuqs'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { billingSearchParamsParsers } from '@/features/billing/model'
import { useBillingSubscriptions, useCurrentFirm } from '@/features/billing/use-billing-data'

export function BillingSuccessRoute() {
  const { t } = useLingui()
  const [{ plan: expectedPlan }] = useQueryStates(billingSearchParamsParsers)
  const { firmsQuery, currentFirm } = useCurrentFirm({ poll: true })
  const subscriptionsQuery = useBillingSubscriptions(currentFirm, true)
  const activeSubscription = subscriptionsQuery.data?.find((subscription) =>
    ['active', 'trialing'].includes(subscription.status),
  )
  const activated = currentFirm?.plan === expectedPlan && activeSubscription?.plan === expectedPlan
  const statusError = firmsQuery.isError || subscriptionsQuery.isError
  const expectedPlanName =
    expectedPlan === 'firm'
      ? t`Enterprise`
      : expectedPlan === 'team'
        ? t`Team`
        : expectedPlan === 'pro'
          ? t`Pro`
          : t`Solo`
  const activePlanName =
    activeSubscription?.plan === 'firm'
      ? t`Enterprise`
      : activeSubscription?.plan === 'team'
        ? t`Team`
        : activeSubscription?.plan === 'pro'
          ? t`Pro`
          : activeSubscription?.plan

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-normal text-text-primary">
          <Trans>Payment confirmation</Trans>
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          <Trans>
            The secure checkout has redirected back to DueDateHQ. We are confirming the
            subscription.
          </Trans>
        </p>
      </header>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            {activated ? (
              <Trans>Subscription active</Trans>
            ) : (
              <Trans>Confirming subscription</Trans>
            )}
          </CardTitle>
          <CardDescription>
            {activated ? (
              <Trans>Your practice plan is ready.</Trans>
            ) : (
              <Trans>Payment confirmation can take a few seconds.</Trans>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {statusError ? (
            <Alert>
              <ClockIcon />
              <AlertTitle>
                <Trans>Still waiting on confirmation</Trans>
              </AlertTitle>
              <AlertDescription>
                <Trans>We couldn't refresh billing status yet. This page will keep checking.</Trans>
              </AlertDescription>
            </Alert>
          ) : firmsQuery.isLoading || subscriptionsQuery.isLoading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-2/3" />
            </>
          ) : activated ? (
            <Alert>
              <CheckCircle2Icon />
              <AlertTitle>
                <Trans>
                  {currentFirm?.name} is on {expectedPlanName}
                </Trans>
              </AlertTitle>
              <AlertDescription>
                <Trans>Your subscription is confirmed and the plan is active.</Trans>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <ClockIcon />
              <AlertTitle>
                <Trans>Still waiting on confirmation</Trans>
              </AlertTitle>
              <AlertDescription>
                <Trans>
                  This page will keep checking. You can also return to Billing and refresh later.
                </Trans>
              </AlertDescription>
            </Alert>
          )}
          {activeSubscription ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{activeSubscription.status}</Badge>
              <Badge variant="outline">{activePlanName}</Badge>
              {activeSubscription.billingInterval ? (
                <Badge variant="outline">{activeSubscription.billingInterval}</Badge>
              ) : null}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="gap-2 border-t border-divider-regular">
          <Button render={<Link to="/billing" />}>
            <Trans>Open Billing</Trans>
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button variant="outline" render={<Link to="/" />}>
            <Trans>Go to Today</Trans>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
