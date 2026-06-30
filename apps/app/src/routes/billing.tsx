import { Link } from 'react-router'
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  CircleAlertIcon,
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button, buttonVariants } from '@duedatehq/ui/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { createBillingPortal } from '@/features/billing/api'
import { orpc } from '@/lib/rpc'
import { formatDate, formatDollarPrice } from '@/lib/utils'
import { requiredRolesLabel } from '@/lib/required-roles-label'
import {
  activeFirmEntitlementLimit,
  billingPlanMonthlyEquivalent,
  billingPlanHref,
  ownedActiveFirms,
  paidPlanActive,
  subscriptionBillingIntervalToUi,
  type BillingInterval,
  type BillingPlan,
} from '@/features/billing/model'
import { useBillingSubscriptions, useCurrentFirm } from '@/features/billing/use-billing-data'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { hasFirmPermission } from '@duedatehq/core/permissions'
import { PageHeader } from '@/components/patterns/page-header'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { PermissionGate } from '@/features/permissions/permission-gate'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

type PlanCard = {
  id: BillingPlan
  name: string
  price: string
  priceSuffix?: string
  priceKind?: 'numeric' | 'text'
  cadence: string
  savings: string | undefined
  seats: string
  firms: string
  clients: string
  description: string
  features: string[]
  cta: string
  badge?: string
  href?: string
  disabled?: boolean
}

function usePlanCards(interval: BillingInterval): PlanCard[] {
  const { t } = useLingui()
  const monthly = interval === 'monthly'
  const cadence = monthly ? t`Monthly billing` : t`Billed yearly`

  function price(plan: BillingPlan): string {
    return formatDollarPrice(billingPlanMonthlyEquivalent(plan, interval))
  }

  function savings(plan: BillingPlan): string | undefined {
    if (monthly) return undefined
    if (plan === 'free') return undefined
    if (plan === 'solo') return t`Save $96/year`
    if (plan === 'pro') return t`Save $192/year`
    if (plan === 'team') return t`Save $360/year`
    return t`Save from $960/year`
  }

  return [
    {
      id: 'free',
      name: t`Free`,
      price: price('free'),
      priceSuffix: t`/ mo`,
      cadence,
      savings: savings('free'),
      seats: t`1 seat`,
      firms: t`1 practice workspace`,
      clients: t`Up to 10 clients`,
      description: t`Starter monitoring for one owner.`,
      features: [
        t`Alert: live alerts and source rules`,
        t`History: 30-day alert window`,
        t`Workflow: one-seat manual review`,
        t`Controls: manual changes only`,
      ],
      cta: t`Get started`,
    },
    {
      id: 'solo',
      name: t`Solo`,
      price: price('solo'),
      priceSuffix: t`/ mo`,
      cadence,
      savings: savings('solo'),
      seats: t`1 owner seat`,
      firms: t`1 practice workspace`,
      clients: t`Up to 100 clients`,
      description: t`Full-history monitoring for one owner.`,
      features: [
        t`Alert: live alerts and source rules`,
        t`History: full alert record`,
        t`Workflow: one-owner review`,
        t`Controls: migration preview`,
      ],
      cta: t`Start Solo`,
      href: billingPlanHref('solo', interval),
    },
    {
      id: 'pro',
      name: t`Pro`,
      price: price('pro'),
      priceSuffix: t`/ mo`,
      cadence,
      savings: savings('pro'),
      seats: t`3 seats included`,
      firms: t`1 production practice`,
      clients: t`Up to 300 clients`,
      description: t`Shared operations for a small team.`,
      features: [
        t`Alert: bulk alert actions`,
        t`History: full alert record`,
        t`Workflow: shared deadline work`,
        t`Controls: guided production imports`,
      ],
      cta: t`Upgrade to Pro`,
      badge: t`Recommended`,
      href: billingPlanHref('pro', interval),
    },
    {
      id: 'team',
      name: t`Team`,
      price: price('team'),
      priceSuffix: t`/ mo`,
      cadence,
      savings: savings('team'),
      seats: t`10 seats included`,
      firms: t`1 production practice`,
      clients: t`Up to 1,000 clients`,
      description: t`Manager controls for a larger team.`,
      features: [
        t`Alert: priority alert review`,
        t`History: full alert record`,
        t`Workflow: manager workload insights`,
        t`Controls: migration review + audit exports`,
      ],
      cta: t`Upgrade to Team`,
      href: billingPlanHref('team', interval),
    },
    {
      id: 'firm',
      name: t`Enterprise`,
      price: interval === 'yearly' ? t`From $319` : t`From $399`,
      priceKind: 'text',
      priceSuffix: t`/ mo`,
      cadence: interval === 'yearly' ? t`Annual contract` : t`Custom agreement`,
      savings: savings('firm'),
      seats: t`10+ seats`,
      firms: t`Multiple practices/offices`,
      clients: t`Unlimited clients`,
      description: t`For multi-practice operations, API access, and custom coverage.`,
      features: [
        t`Multiple practices/offices`,
        t`API access by contract`,
        t`SSO and custom coverage`,
        t`Priority onboarding and audit exports`,
      ],
      cta: t`Contact sales`,
      href: billingPlanHref('firm', interval),
    },
  ]
}

export function BillingRoute() {
  const { t } = useLingui()
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const planCards = usePlanCards(billingInterval).filter((plan) => plan.id !== 'firm')
  const { firmsQuery, currentFirm } = useCurrentFirm()
  useEffect(() => {
    track(ANALYTICS_EVENTS.billingViewed, { current_plan: currentFirm?.plan })
    // The plan-comparison grid ("Choose a workspace tier") is always rendered
    // on the billing page, so the page mount IS the grid being viewed.
    track(ANALYTICS_EVENTS.plansCompared)
    // Fire once on mount. `current_plan` is omitted by the PII guard if the
    // firm hasn't loaded yet; the plan is a stable enum, not a moving target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const firms = firmsQuery.data ?? (currentFirm ? [currentFirm] : [])
  const canReadBilling = hasFirmPermission({
    role: currentFirm?.role,
    permission: 'billing.read',
    coordinatorCanSeeDollars: currentFirm?.coordinatorCanSeeDollars,
  })
  const activeFirmCount = ownedActiveFirms(firms).length
  const activeFirmLimit = activeFirmEntitlementLimit(firms)
  const activeFirmLimitLabel = activeFirmLimit === null ? t`contract` : String(activeFirmLimit)
  // When the owner has more active practices than their plan permits (e.g.
  // 2 owned firms on a 1-practice Pro plan), a "2 of 1 active practices"
  // string reads as a bug. Flag the over-limit case explicitly so the user
  // sees what's going on.
  const activeFirmOverLimit = activeFirmLimit !== null && activeFirmCount > activeFirmLimit
  const activeFirmUsage = currentFirm
    ? activeFirmOverLimit
      ? t`${activeFirmCount} active · ${activeFirmLimitLabel} on this plan`
      : t`${activeFirmCount} of ${activeFirmLimitLabel} active practices`
    : '—'
  const subscriptionsQuery = useBillingSubscriptions(currentFirm, false, canReadBilling)
  const activeSubscription = subscriptionsQuery.data?.find((subscription) =>
    ['active', 'trialing', 'past_due', 'paused'].includes(subscription.status),
  )
  const activeSubscriptionInterval = subscriptionBillingIntervalToUi(
    activeSubscription?.billingInterval,
  )
  const owner = hasFirmPermission({
    role: currentFirm?.role,
    permission: 'billing.update',
    coordinatorCanSeeDollars: currentFirm?.coordinatorCanSeeDollars,
  })
  const currentPlanName = currentFirm
    ? currentFirm.plan === 'firm'
      ? t`Enterprise`
      : currentFirm.plan === 'team'
        ? t`Team`
        : currentFirm.plan === 'pro'
          ? t`Pro`
          : currentFirm.plan === 'solo'
            ? t`Solo`
            : t`Free`
    : '—'
  const seatLimit = currentFirm ? t`${currentFirm.seatLimit} seat limit` : '—'
  const clientUsageQuery = useQuery(orpc.clients.usage.queryOptions({ input: {} }))
  const clientUsage = clientUsageQuery.data
  const clientUsageValue = clientUsage
    ? clientUsage.clientLimit === null
      ? `${clientUsage.activeClients} / ∞`
      : `${clientUsage.activeClients} / ${clientUsage.clientLimit}`
    : '—'
  const clientOverLimit =
    !!clientUsage &&
    clientUsage.clientLimit !== null &&
    clientUsage.activeClients > clientUsage.clientLimit
  const subscriptionStatus = activeSubscription?.status ?? t`No paid subscription`
  // B21: surface trial / pending-cancellation / renewal context — these
  // fields are on the subscription but were never shown.
  const billingPeriodLabel = (() => {
    if (!activeSubscription) return null
    if (activeSubscription.cancelAtPeriodEnd) {
      const when = activeSubscription.cancelAt ?? activeSubscription.periodEnd
      return when ? t`Cancels ${formatDate(when)}` : t`Cancels at period end`
    }
    if (activeSubscription.status === 'trialing' && activeSubscription.trialEnd) {
      return t`Trial ends ${formatDate(activeSubscription.trialEnd)}`
    }
    if (activeSubscription.periodEnd) {
      return t`Renews ${formatDate(activeSubscription.periodEnd)}`
    }
    return null
  })()
  const portalMutation = useMutation({
    mutationFn: async () => {
      if (!currentFirm) throw new Error(t`No active practice is selected.`)
      return createBillingPortal({
        referenceId: currentFirm.id,
        returnUrl: new URL('/billing', window.location.origin).toString(),
      })
    },
    onSuccess: (url) => {
      track(ANALYTICS_EVENTS.billingPortalOpened)
      window.location.assign(url)
    },
  })

  if (firmsQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 pt-8 pb-12 md:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!canReadBilling) {
    return (
      <PermissionGate
        permission="billing.read"
        firm={currentFirm}
        description={
          // ROH-D11 — billing.read = owner-only today (helper-aware
          // so if scope changes we don't drift again).
          <Trans>
            Only {requiredRolesLabel('billing.read')} can view billing. Ask the practice owner for
            plan or invoice access.
          </Trans>
        }
        secondaryAction={{ label: <Trans>Open deadlines</Trans>, to: '/deadlines' }}
      >
        <div />
      </PermissionGate>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 py-6 md:px-6">
      {/* Uses the shared `<PageHeader>`: breadcrumb routes through the eyebrow
          slot; current plan Badge sits in the actions cluster. Outer page
          width is `max-w-page-wide`. */}
      <PageHeader
        breadcrumbs={[{ label: t`Settings`, to: '/settings' }, { label: t`Billing` }]}
        title={<Trans>Billing</Trans>}
        description={
          <Trans>
            Review the active practice plan, open billing controls, and choose the right workspace
            tier.
          </Trans>
        }
        actions={
          currentFirm ? (
            <Badge
              variant={paidPlanActive(currentFirm) ? 'success' : 'outline'}
              className="tabular-nums"
            >
              {currentPlanName}
            </Badge>
          ) : null
        }
      />

      {portalMutation.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            <Trans>Billing portal couldn't open</Trans>
          </AlertTitle>
          <AlertDescription>{portalMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {firmsQuery.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            <Trans>Practice context couldn't load</Trans>
          </AlertTitle>
          <AlertDescription>{firmsQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {subscriptionsQuery.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            <Trans>Billing status couldn't load</Trans>
          </AlertTitle>
          <AlertDescription>{subscriptionsQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans>Subscription overview</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                The payment provider manages checkout, invoices, and payment methods. DueDateHQ
                shows the active plan here.
              </Trans>
            </CardDescription>
            <CardAction>
              <Badge variant={billingStatusVariant(activeSubscription?.status)}>
                {subscriptionStatus}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4">
            {firmsQuery.isLoading ? (
              <div className="grid gap-3 md:grid-cols-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                <div className="flex flex-col justify-between gap-4 rounded-lg border border-divider-regular bg-background-subtle p-5 md:flex-row md:items-end">
                  <div className="min-w-0">
                    <p className="text-sm text-text-tertiary">
                      <Trans>Active practice</Trans>
                    </p>
                    <p className="mt-1 truncate text-xl font-medium text-text-primary">
                      {currentFirm?.name ?? '—'}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-2xl font-medium tabular-nums text-text-primary">
                      {currentPlanName}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {seatLimit} · {activeFirmUsage}
                    </p>
                  </div>
                </div>
                <div className="flex w-fit max-w-full flex-wrap gap-3">
                  {/* <Metric
                    label={<Trans>Plan</Trans>}
                    value={currentFirm?.plan ?? '—'}
                    name={`Plan: ${currentFirm?.plan ?? 'none'}`}
                  /> */}
                  <Metric
                    label={<Trans>Seat limit</Trans>}
                    value={String(currentFirm?.seatLimit ?? '—')}
                    name={`Seat limit: ${currentFirm?.seatLimit ?? 'none'}`}
                  />
                  <Metric
                    label={<Trans>Clients</Trans>}
                    value={clientUsageValue}
                    name={`Clients: ${clientUsageValue}`}
                  />
                  <Metric
                    label={<Trans>Practice workspaces</Trans>}
                    value={activeFirmUsage}
                    name={`Practice workspaces: ${activeFirmCount} of ${activeFirmLimitLabel}`}
                  />
                  <Metric
                    label={<Trans>Subscription status</Trans>}
                    value={subscriptionStatus}
                    name={`Subscription status: ${subscriptionStatus}`}
                  />
                  {billingPeriodLabel ? (
                    <Metric
                      label={<Trans>Billing period</Trans>}
                      value={billingPeriodLabel}
                      name={`Billing period: ${billingPeriodLabel}`}
                    />
                  ) : null}
                  <Metric
                    label={<Trans>Billing role</Trans>}
                    value={owner ? t`Owner` : t`Member`}
                    name={`Billing role: ${owner ? 'owner' : 'member'}`}
                  />
                </div>
                {clientOverLimit ? (
                  <Alert>
                    <CircleAlertIcon />
                    <AlertTitle>
                      <Trans>Over your client limit</Trans>
                    </AlertTitle>
                    <AlertDescription>
                      <Trans>
                        This practice monitors more clients than the plan includes. Existing clients
                        keep full monitoring — upgrade to add more.
                      </Trans>
                    </AlertDescription>
                  </Alert>
                ) : null}
              </>
            )}
          </CardContent>
          <CardFooter className="flex-wrap gap-2 border-t border-divider-regular">
            <Button
              disabled={
                !owner ||
                !activeSubscription ||
                subscriptionsQuery.isPending ||
                subscriptionsQuery.isError ||
                portalMutation.isPending
              }
              onClick={() => portalMutation.mutate()}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              {portalMutation.isPending ? <Trans>Opening…</Trans> : <Trans>Manage billing</Trans>}
            </Button>
            {!owner ? (
              <span className="text-sm text-text-tertiary">
                {/* ROH-D11 — billing.update is owner-only today, but route
                    via the helper so a future role-set change can't drift. */}
                <Trans>Only {requiredRolesLabel('billing.update')} can manage billing.</Trans>
              </span>
            ) : !activeSubscription ? (
              <span className="text-sm text-text-tertiary">
                <Trans>Choose Solo, Pro, or Team to start the hosted checkout flow.</Trans>
              </span>
            ) : (
              <span className="text-sm text-text-tertiary">
                <Trans>
                  The billing portal opens with the payment provider for invoices, payment methods,
                  and cancellation.
                </Trans>
              </span>
            )}
          </CardFooter>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>
              <Trans>Billing controls</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>Practice billing stays scoped to the selected practice.</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <ControlRow
              icon={<ShieldCheckIcon className="size-4" aria-hidden />}
              title={<Trans>Owner approved</Trans>}
              description={<Trans>Only practice owners can change plans or open the portal.</Trans>}
            />
            <ControlRow
              icon={<CreditCardIcon className="size-4" aria-hidden />}
              title={<Trans>Handled by Stripe</Trans>}
              description={
                <Trans>
                  Checkout, cards, invoices, and portal sessions stay with the processor.
                </Trans>
              }
            />
            <ControlRow
              icon={<CheckIcon className="size-4" aria-hidden />}
              title={<Trans>Payment confirmation received</Trans>}
              description={
                <Trans>Plan activation appears after the provider confirms the subscription.</Trans>
              }
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CapsFieldLabel as="span" variant="field">
              <Trans>Plan options</Trans>
            </CapsFieldLabel>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">
              <Trans>Choose a workspace tier</Trans>
            </h2>
          </div>
          <BillingIntervalToggle value={billingInterval} onChange={setBillingInterval} />
        </header>

        <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
          {planCards.map((plan) => (
            <PlanOption
              key={plan.id}
              plan={plan}
              interval={billingInterval}
              currentPlan={currentFirm?.plan}
              currentInterval={activeSubscriptionInterval}
              owner={owner}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card size="sm" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <Trans>Payment model</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>Checkout and portal sessions are hosted by the payment provider.</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid max-w-[680px] gap-2 text-sm leading-6 text-text-secondary">
            <p>
              <Trans>Paid subscriptions bill the practice, not an individual user.</Trans>
            </p>
            <p>
              <Trans>Success pages wait for webhook confirmation before showing activation.</Trans>
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>
              <Trans>What stays in DueDateHQ</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>We store the plan and seat limit needed for app permissions.</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-text-secondary">
            <p>
              <Trans>Card numbers and invoice payment details never enter the app database.</Trans>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function billingStatusVariant(status: string | undefined): BadgeVariant {
  if (!status) return 'outline'
  if (status === 'past_due') return 'warning'
  if (status === 'paused') return 'secondary'
  return 'info'
}

const PLAN_RANK: Record<BillingPlan, number> = {
  free: 0,
  solo: 1,
  pro: 2,
  team: 3,
  firm: 4,
}

function Metric({ label, value, name }: { label: ReactNode; value: string; name: string }) {
  return (
    <div
      role="group"
      aria-label={name}
      className="inline-flex min-w-0 max-w-full flex-none flex-col rounded-lg border border-divider-regular bg-background-default p-4"
    >
      <CapsFieldLabel as="span" variant="field">
        {label}
      </CapsFieldLabel>
      <p className="mt-2 truncate text-base font-semibold text-text-primary">{value}</p>
    </div>
  )
}

function ControlRow({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: ReactNode
  description: ReactNode
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background-subtle text-text-accent">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-text-primary">{title}</p>
        <p className="mt-1 leading-5 text-text-secondary">{description}</p>
      </div>
    </div>
  )
}

function BillingIntervalToggle({
  value,
  onChange,
}: {
  value: BillingInterval
  onChange: (value: BillingInterval) => void
}) {
  const { t } = useLingui()

  // The shared <Segmented> primitive (lg = h-8 / 14px) replaces a hand-rolled
  // h-11 track whose active state was a solid accent fill + shadow — the only
  // toggle in the product that didn't use the flat white-pill language.
  return (
    <Segmented<BillingInterval>
      size="lg"
      ariaLabel={t`Billing interval`}
      value={value}
      onValueChange={onChange}
      options={[
        { value: 'monthly', label: <Trans>Monthly</Trans> },
        {
          value: 'yearly',
          label: (
            <span className="inline-flex items-center gap-2">
              <Trans>Yearly</Trans>
              <Badge variant="success" className="text-caption-xs">
                <Trans>Save about 20%</Trans>
              </Badge>
            </span>
          ),
        },
      ]}
    />
  )
}

function PlanOption({
  plan,
  interval,
  currentPlan,
  currentInterval,
  owner,
}: {
  plan: PlanCard
  interval: BillingInterval
  currentPlan: BillingPlan | undefined
  currentInterval: BillingInterval
  owner: boolean
}) {
  const samePlan = plan.id === currentPlan
  const current = samePlan && interval === currentInterval
  const lowerThanCurrent = currentPlan ? PLAN_RANK[plan.id] < PLAN_RANK[currentPlan] : false
  const disabled = plan.disabled || current || lowerThanCurrent || !owner
  const highlighted = plan.id === 'pro'
  const priceKind = plan.priceKind ?? 'numeric'
  const actionLabel =
    samePlan && !current ? (
      interval === 'yearly' ? (
        <Trans>Switch to yearly</Trans>
      ) : (
        <Trans>Switch to monthly</Trans>
      )
    ) : (
      plan.cta
    )

  return (
    <Card
      className={cn(
        'relative h-full min-h-[660px]',
        highlighted && !current
          ? 'border-state-accent-active bg-background-default shadow-sm'
          : undefined,
        current ? 'border-state-accent-active-alt bg-accent-tint shadow-sm' : undefined,
      )}
    >
      <CardHeader className="min-h-[132px] content-start">
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription className="line-clamp-3 min-h-[72px] leading-6">
          {plan.description}
        </CardDescription>
        <CardAction>
          {/* Plain badge in the header slot — the diagonal rotated ribbon
              was the only rotated element in the product, a party trick on
              the calm-surface page where the owner decides about money. */}
          {current ? (
            <Badge variant="info">
              <Trans>Current plan</Trans>
            </Badge>
          ) : plan.badge ? (
            <Badge variant="info">{plan.badge}</Badge>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div
          className={cn(
            'grid content-start gap-3',
            plan.savings ? 'min-h-[156px]' : 'min-h-[116px]',
          )}
        >
          <div className="flex min-h-10 flex-wrap items-baseline gap-2">
            <span
              className={cn(
                'text-2xl font-semibold text-text-primary',
                priceKind === 'numeric' ? 'tabular-nums' : 'font-sans tracking-normal',
              )}
            >
              {plan.price}
            </span>
            {plan.priceSuffix ? (
              <span className="text-lg font-semibold tabular-nums text-text-primary">
                {plan.priceSuffix}
              </span>
            ) : null}
          </div>
          <div className="grid gap-2 text-sm text-text-secondary">
            <div className="flex flex-wrap items-center gap-2">
              <span>{plan.cadence}</span>
              {plan.savings ? (
                <Badge variant="success" className="text-caption-xs">
                  {plan.savings}
                </Badge>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <span className="font-medium text-text-primary">{plan.clients}</span>
              <span>{plan.firms}</span>
              <span className="inline-flex min-w-0 items-center gap-2">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-divider-deep" />
                <span className="min-w-0 truncate">{plan.seats}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="h-px w-full bg-divider-regular" aria-hidden />
        <ul className="grid min-h-[168px] content-start gap-3 text-sm leading-5 text-text-secondary">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm bg-background-subtle text-text-accent">
                <CheckIcon className="size-3.5" aria-hidden />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="min-h-[76px] flex-col items-stretch justify-center border-t border-divider-regular">
        {plan.href && !disabled ? (
          <Link
            to={plan.href}
            onClick={() =>
              track(ANALYTICS_EVENTS.planUpgradeClicked, {
                from_plan: currentPlan,
                to_plan: plan.id,
              })
            }
            className={cn(
              buttonVariants({ variant: highlighted ? 'accent' : 'default' }),
              'w-full',
            )}
          >
            <CreditCardIcon data-icon="inline-start" />
            {actionLabel}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        ) : (
          <Button disabled className="w-full" variant="secondary">
            {current ? <Trans>Current plan</Trans> : plan.cta}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
