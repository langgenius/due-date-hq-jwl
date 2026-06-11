import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  RefreshCwIcon,
} from 'lucide-react'
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

import { PageHeader } from '@/components/patterns/page-header'
import { billingSearchParamsParsers } from '@/features/billing/model'
import { useBillingSubscriptions, useCurrentFirm } from '@/features/billing/use-billing-data'

// Time-to-give-up-polling threshold. After this many milliseconds with no
// webhook activation we surface a "still confirming" state with a manual
// refresh + support hint so the user isn't stranded on an infinite spinner
// if a Stripe webhook silently dropped.
const ACTIVATION_TIMEOUT_MS = 60_000

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
  // Flip to "timed out" state after 60s of polling without confirmation.
  // The polling continues in the background — the timeout only changes the
  // messaging to give the user an explicit refresh CTA + support path.
  const [activationTimedOut, setActivationTimedOut] = useState(false)
  useEffect(() => {
    if (activated || statusError) return undefined
    const handle = window.setTimeout(() => {
      setActivationTimedOut(true)
    }, ACTIVATION_TIMEOUT_MS)
    return () => window.clearTimeout(handle)
  }, [activated, statusError])
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
    // Uses the canonical `<PageHeader>`. The billing family uses PageHeader
    // on `/billing`; the post-checkout confirmation pages match it for shared
    // family identity. Breadcrumb back to `/billing` so users have a clear
    // path out of the confirmation flow.
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        breadcrumbs={[{ label: t`Billing`, to: '/billing' }, { label: t`Payment confirmation` }]}
        title={<Trans>Payment confirmation</Trans>}
        description={
          <Trans>
            The secure checkout has redirected back to DueDateHQ. We are confirming the
            subscription.
          </Trans>
        }
      />

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
          ) : activationTimedOut ? (
            // After 60s with no activation, swap the friendly "still checking"
            // alert for a clearer "this is taking longer than usual" message
            // with a manual refresh CTA and a contact-support line. Polling
            // continues in the background.
            <Alert variant="warning">
              <AlertTriangleIcon />
              <AlertTitle>
                <Trans>Still confirming — taking longer than usual</Trans>
              </AlertTitle>
              <AlertDescription className="grid gap-3">
                <Trans>
                  Stripe is still confirming the subscription — this typically takes under a
                  minute. Refresh the page, or contact support if it persists.
                </Trans>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                    <RefreshCwIcon data-icon="inline-start" />
                    <Trans>Refresh now</Trans>
                  </Button>
                </div>
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
          {/* The post-checkout user wants to get back to work, not verify the
              line items — "Go to Today" is the primary CTA (filled), "Open
              billing" demotes to outline. The verification path stays one
              click away for anyone who lands here intentionally to inspect
              invoices. */}
          <Button render={<Link to="/" />}>
            <Trans>Go to Today</Trans>
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button variant="outline" render={<Link to="/billing" />}>
            <Trans>Open billing</Trans>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
