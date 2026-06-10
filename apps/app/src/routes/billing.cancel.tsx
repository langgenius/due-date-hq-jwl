import { Link } from 'react-router'
import { Trans } from '@lingui/react/macro'
import { ArrowLeftIcon, CreditCardIcon } from 'lucide-react'
import { useQueryStates } from 'nuqs'

import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'

import { billingSearchParamsParsers, serializeBillingQuery } from '@/features/billing/model'

export function BillingCancelRoute() {
  const [{ plan, interval }] = useQueryStates(billingSearchParamsParsers)
  // If the user lands here with no plan/interval in the query (e.g. opened a
  // bookmarked cancel URL, or the upstream link dropped its params), routing
  // "Restart checkout" to `/billing/checkout` with no plan selection is a dead
  // end. When we have no plan signal, route the primary CTA to the `/billing`
  // plan-picker instead and re-label it to match.
  const hasPlanSelection = Boolean(plan)
  const restartHref = hasPlanSelection
    ? serializeBillingQuery('/billing/checkout', { plan, interval })
    : '/billing'

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle role="heading" aria-level={1}>
            <Trans>Checkout canceled</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>No subscription changes were made. You can restart checkout when ready.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            {hasPlanSelection ? (
              <Trans>The selected plan is still available from Billing.</Trans>
            ) : (
              <Trans>No plan was selected — choose one from Billing to start checkout.</Trans>
            )}
          </p>
        </CardContent>
        <CardFooter className="gap-2 border-t border-divider-regular">
          <Button render={<Link to={restartHref} />}>
            <CreditCardIcon data-icon="inline-start" />
            {hasPlanSelection ? <Trans>Restart checkout</Trans> : <Trans>Choose a plan</Trans>}
          </Button>
          <Button variant="outline" render={<Link to="/billing" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            <Trans>Back to Billing</Trans>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
