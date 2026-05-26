import { Link, useNavigate } from 'react-router'
import type { ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import type { FirmBillingCheckoutConfig } from '@duedatehq/contracts'
import { useQueryStates } from 'nuqs'
import {
  AlertCircleIcon,
  ArrowRightIcon,
  Building2Icon,
  CheckIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  LockIcon,
  ShieldCheckIcon,
  UsersIcon,
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
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'
import { hasFirmPermission } from '@duedatehq/core/permissions'

import { PageHeader } from '@/components/patterns/page-header'
import { formatDollarPrice } from '@/lib/utils'
import { createCheckout } from '@/features/billing/api'
import {
  billingPlanMonthlyEquivalent,
  billingSearchParamsParsers,
  isSelfServeBillingPlan,
  serializeBillingQuery,
  subscriptionBillingIntervalToUi,
  type BillingInterval,
  type BillingPlan,
} from '@/features/billing/model'
import {
  useBillingCheckoutConfig,
  useBillingSubscriptions,
  useCurrentFirm,
} from '@/features/billing/use-billing-data'
import { PermissionGate } from '@/features/permissions/permission-gate'

type PlanView = {
  label: string
  price: string
  priceSuffix: string
  priceNote: string
  seatLimit: number
  firmLimit: string
  summary: string
  bullets: string[]
  selfServe: boolean
}

function usePlanView(plan: BillingPlan, interval: BillingInterval): PlanView {
  const { t } = useLingui()
  const price = formatDollarPrice(billingPlanMonthlyEquivalent(plan, interval))

  function intervalNote(): string {
    if (plan === 'firm') {
      return interval === 'yearly' ? t`Annual contract · From $3,828/year` : t`Custom agreement`
    }
    if (interval === 'monthly') return t`Monthly billing`
    if (plan === 'solo') return t`Billed yearly · Save $96/year`
    if (plan === 'pro') return t`Billed yearly · Save $192/year`
    if (plan === 'team') return t`Billed yearly · Save $360/year`
    return t`Billed yearly`
  }

  if (plan === 'solo') {
    return {
      label: t`Solo`,
      price,
      priceSuffix: t`/ mo`,
      priceNote: intervalNote(),
      seatLimit: 1,
      firmLimit: t`1 active practice`,
      summary: t`For solo owners running one practice workspace.`,
      bullets: [t`1 active practice`, t`1 owner seat`, t`Source-backed evidence`],
      selfServe: true,
    }
  }

  if (plan === 'pro') {
    return {
      label: t`Pro`,
      price,
      priceSuffix: t`/ mo`,
      priceNote: intervalNote(),
      seatLimit: 3,
      firmLimit: t`1 active practice`,
      summary: t`For small practices that need shared deadline operations.`,
      bullets: [t`1 active practice`, t`3 seats included`, t`Shared deadline operations`],
      selfServe: true,
    }
  }

  if (plan === 'team') {
    return {
      label: t`Team`,
      price,
      priceSuffix: t`/ mo`,
      priceNote: intervalNote(),
      seatLimit: 10,
      firmLimit: t`1 active practice`,
      summary: t`For practices coordinating a larger operations team.`,
      bullets: [t`1 active practice`, t`10 seats included`, t`Team workload and shared triage`],
      selfServe: true,
    }
  }

  return {
    label: t`Enterprise`,
    price: interval === 'yearly' ? t`From $319` : t`From $399`,
    priceSuffix: t`/ mo`,
    priceNote: intervalNote(),
    seatLimit: 10,
    firmLimit: t`Multiple practices/offices`,
    summary: t`For multi-practice operations, API access, and custom coverage.`,
    bullets: [t`Multiple practices/offices`, t`10+ seats`, t`API access by contract`],
    selfServe: false,
  }
}

function checkoutUrl(path: string, plan: BillingPlan, interval: BillingInterval): string {
  return new URL(serializeBillingQuery(path, { plan, interval }), window.location.origin).toString()
}

function checkoutConfiguredFor(
  config: FirmBillingCheckoutConfig | undefined,
  plan: BillingPlan,
  interval: BillingInterval,
): boolean {
  if (!config || !isSelfServeBillingPlan(plan)) return false
  return config.plans[plan][interval]
}

export function BillingCheckoutRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const [{ plan, interval }] = useQueryStates(billingSearchParamsParsers)
  const view = usePlanView(plan, interval)
  const { firmsQuery, currentFirm } = useCurrentFirm()
  const canReadBilling = hasFirmPermission({
    role: currentFirm?.role,
    permission: 'billing.read',
    coordinatorCanSeeDollars: currentFirm?.coordinatorCanSeeDollars,
  })
  const subscriptionsQuery = useBillingSubscriptions(currentFirm, false, canReadBilling)
  const checkoutConfigQuery = useBillingCheckoutConfig(Boolean(currentFirm) && canReadBilling)
  const activeSubscription = subscriptionsQuery.data?.find((subscription) =>
    ['active', 'trialing', 'past_due', 'paused'].includes(subscription.status),
  )
  const activeSubscriptionInterval = subscriptionBillingIntervalToUi(
    activeSubscription?.billingInterval,
  )
  const subscriptionsReady = !subscriptionsQuery.isPending && !subscriptionsQuery.isError
  const checkoutConfigured = checkoutConfiguredFor(checkoutConfigQuery.data, plan, interval)
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!currentFirm) throw new Error(t`No active practice is selected.`)
      if (!subscriptionsReady) throw new Error(t`Billing status is not ready yet.`)
      if (!isSelfServeBillingPlan(plan))
        throw new Error(t`Enterprise plan changes require sales support.`)
      if (checkoutConfigQuery.isPending)
        throw new Error(t`Checkout configuration is not ready yet.`)
      if (checkoutConfigQuery.isError) throw new Error(t`Checkout configuration couldn't load.`)
      if (!checkoutConfiguredFor(checkoutConfigQuery.data, plan, interval))
        throw new Error(t`Checkout is temporarily unavailable for this plan. Contact support.`)
      return createCheckout({
        plan,
        annual: interval === 'yearly',
        referenceId: currentFirm.id,
        seats: view.seatLimit,
        subscriptionId: activeSubscription?.stripeSubscriptionId ?? undefined,
        successUrl: checkoutUrl('/billing/success', plan, interval),
        cancelUrl: checkoutUrl('/billing/cancel', plan, interval),
        returnUrl: new URL('/billing', window.location.origin).toString(),
      })
    },
    onSuccess: (url) => {
      window.location.assign(url)
    },
  })

  if (firmsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!currentFirm) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>No practice selected</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>Create or select a practice before starting checkout.</Trans>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const owner = hasFirmPermission({
    role: currentFirm.role,
    permission: 'billing.update',
    coordinatorCanSeeDollars: currentFirm.coordinatorCanSeeDollars,
  })
  const alreadyOnPlan =
    activeSubscription?.plan === plan &&
    currentFirm.plan === plan &&
    activeSubscriptionInterval === interval
  const selfServe = view.selfServe && isSelfServeBillingPlan(plan)
  const checkoutUnavailable = selfServe && checkoutConfigQuery.isSuccess && !checkoutConfigured
  const currentPlanLabel =
    currentFirm.plan === 'firm'
      ? t`Enterprise`
      : currentFirm.plan === 'team'
        ? t`Team`
        : currentFirm.plan === 'pro'
          ? t`Pro`
          : t`Solo`

  if (!canReadBilling) {
    return (
      <PermissionGate
        permission="billing.read"
        firm={currentFirm}
        description={
          <Trans>
            Billing checkout is available only after you have billing access for this practice.
            Contact the practice owner if you need access.
          </Trans>
        }
        secondaryAction={{ label: <Trans>Back to billing</Trans>, to: '/billing' }}
      >
        <div />
      </PermissionGate>
    )
  }

  return (
    // 2026-05-26 (86th pass, audit §16.1 P1): migrated custom
    // `<header>` (Back-link + branded icon + h1 + Badge cluster) to
    // canonical `<PageHeader>` with a breadcrumb back to `/billing`.
    // Branded CreditCard icon stays inline with the title as a
    // leading flourish; "Secure checkout" Badge moves to actions.
    //
    // Also dropped `gap-5` → `gap-4` to align with §16.16 canonical
    // spacing scale (audit P2 swept here since the file was open).
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 py-6 md:px-6">
      <PageHeader
        breadcrumbs={[{ label: t`Billing`, to: '/billing' }, { label: t`Confirm checkout` }]}
        title={
          <span className="inline-flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-primary text-text-inverted"
            >
              <CreditCardIcon className="size-4" />
            </span>
            <span className="truncate">
              <Trans>Confirm checkout</Trans>
            </span>
          </span>
        }
        description={
          <Trans>Review the practice subscription before opening secure checkout.</Trans>
        }
        actions={
          // 2026-05-26 (Step 7 F8-02): "Secure checkout" badge gets a
          // LockIcon + gap-1.5 so it reads as a trust signal, not as
          // a routine info chip. Kept inside `PageHeader.actions` —
          // Step 7's branch had refactored out of PageHeader entirely,
          // but the shared primitive is the canonical wrapper.
          <Badge variant="info" className="gap-1.5">
            <LockIcon className="size-3" aria-hidden />
            <Trans>Secure checkout</Trans>
          </Badge>
        }
      />

      {!owner ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Owner permission required</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>Only the practice owner can start or change a subscription.</Trans>
          </AlertDescription>
        </Alert>
      ) : null}

      {subscriptionsQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Billing status couldn't load</Trans>
          </AlertTitle>
          <AlertDescription>{subscriptionsQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {checkoutConfigQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Checkout configuration couldn't load</Trans>
          </AlertTitle>
          <AlertDescription>{checkoutConfigQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {checkoutUnavailable ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Checkout is not configured</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>Checkout is temporarily unavailable for this plan. Contact support.</Trans>
          </AlertDescription>
        </Alert>
      ) : null}

      {checkoutMutation.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Checkout couldn't start</Trans>
          </AlertTitle>
          <AlertDescription>{checkoutMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans>Plan summary</Trans>
            </CardTitle>
            <CardDescription>{view.summary}</CardDescription>
            <CardAction>
              <Badge variant="outline">
                {interval === 'yearly' ? <Trans>Yearly</Trans> : <Trans>Monthly</Trans>}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-lg border border-divider-regular bg-background-subtle p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-text-tertiary">
                    <Trans>Selected plan</Trans>
                  </p>
                  <p className="mt-1 text-xl font-semibold text-text-primary">{view.label}</p>
                </div>
                <div className="text-left md:text-right">
                  <div className="flex items-baseline gap-2 md:justify-end">
                    <span className="text-2xl font-semibold tabular-nums text-text-primary">
                      {view.price}
                    </span>
                    <span className="text-lg font-semibold tabular-nums text-text-primary">
                      {view.priceSuffix}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{view.priceNote}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {view.bullets.map((bullet) => (
                <div
                  key={bullet}
                  className="flex min-h-16 items-start gap-2.5 rounded-lg border border-divider-regular bg-background-default p-3 text-sm text-text-secondary"
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm bg-background-subtle text-text-accent">
                    <CheckIcon className="size-3.5" aria-hidden />
                  </span>
                  <span className="leading-5">{bullet}</span>
                </div>
              ))}
            </div>

            <div className="grid gap-3 rounded-lg border border-divider-regular bg-background-default p-4 text-sm text-text-secondary">
              <CheckoutNote
                icon={<ShieldCheckIcon className="size-4" aria-hidden />}
                title={<Trans>Owner approval required</Trans>}
                description={
                  <Trans>Only practice owners can start or change a subscription.</Trans>
                }
              />
              <CheckoutNote
                icon={<CreditCardIcon className="size-4" aria-hidden />}
                title={<Trans>Payment details stay with the processor</Trans>}
                description={
                  <Trans>DueDateHQ does not store card numbers or invoice payment data.</Trans>
                }
              />
            </div>
          </CardContent>
          <CardFooter className="flex-wrap gap-2 border-t border-divider-regular">
            <Button
              disabled={
                !owner ||
                !subscriptionsReady ||
                checkoutMutation.isPending ||
                checkoutConfigQuery.isPending ||
                checkoutConfigQuery.isError ||
                subscriptionsQuery.isFetching ||
                alreadyOnPlan ||
                !selfServe ||
                checkoutUnavailable
              }
              onClick={() => checkoutMutation.mutate()}
            >
              <CreditCardIcon data-icon="inline-start" />
              {checkoutMutation.isPending ? (
                <Trans>Opening checkout…</Trans>
              ) : (
                <Trans>Continue to secure checkout</Trans>
              )}
            </Button>
            <Button variant="outline" onClick={() => void navigate('/billing')}>
              <Trans>Choose another plan</Trans>
            </Button>
            {/* 2026-05-26 (Step 7 onboarding audit F8-06): the
                primary CTA opens Stripe via `window.location.assign`,
                but the button copy didn't disclose the redirect.
                Added an inline note so the user expects to leave
                the app and land on Stripe. Standard pattern for
                external-handoff buttons. */}
            <p className="flex w-full items-center gap-1.5 text-xs text-text-tertiary">
              <ExternalLinkIcon className="size-3" aria-hidden />
              <Trans>You'll be redirected to Stripe to enter payment details.</Trans>
            </p>
            {!selfServe ? (
              <span className="text-sm text-text-tertiary">
                <Trans>
                  Enterprise is a sales-assisted plan for multiple practices or offices. Contact
                  sales from Billing.
                </Trans>
              </span>
            ) : null}
          </CardFooter>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>
              <Trans>Practice context</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                Solo, Pro, and Team each apply to one active practice. Enterprise covers multiple
                practices by contract.
              </Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <CheckoutFact
              icon={<Building2Icon className="size-4" aria-hidden />}
              label={<Trans>Practice</Trans>}
              value={currentFirm.name}
            />
            <CheckoutFact
              icon={<CreditCardIcon className="size-4" aria-hidden />}
              label={<Trans>Current plan</Trans>}
              value={currentPlanLabel}
            />
            <CheckoutFact
              icon={<UsersIcon className="size-4" aria-hidden />}
              label={<Trans>New seat limit</Trans>}
              value={String(view.seatLimit)}
            />
            <CheckoutFact
              icon={<Building2Icon className="size-4" aria-hidden />}
              label={<Trans>Practice limit</Trans>}
              value={view.firmLimit}
            />
            {alreadyOnPlan ? (
              <Alert>
                <AlertCircleIcon />
                <AlertTitle>
                  <Trans>Already active</Trans>
                </AlertTitle>
                <AlertDescription>
                  <Trans>This practice already has the selected plan.</Trans>
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
          <CardFooter>
            <Link
              to="/billing"
              className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'px-0')}
            >
              <Trans>View billing</Trans>
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </CardFooter>
        </Card>
      </section>
    </div>
  )
}

function CheckoutFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: ReactNode
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-divider-regular bg-background-default p-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-background-subtle text-text-accent">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-text-tertiary">{label}</p>
        <p className="mt-1 truncate font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  )
}

function CheckoutNote({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: ReactNode
  description: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-background-subtle text-text-accent">
        {icon}
      </span>
      <div>
        <p className="font-medium text-text-primary">{title}</p>
        <p className="mt-1 leading-5">{description}</p>
      </div>
    </div>
  )
}
