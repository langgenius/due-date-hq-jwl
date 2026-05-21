import { Link } from 'react-router'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
  SparklesIcon,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { createBillingPortal } from '@/features/billing/api'
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
import { hasFirmPermission } from '@duedatehq/core/permissions'
import { Breadcrumb } from '@/components/patterns/breadcrumb'
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
  aiLabel: string
  aiDescription: string
  aiFeatures: string[]
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
    return `$${billingPlanMonthlyEquivalent(plan, interval).toLocaleString('en-US')}`
  }

  function savings(plan: BillingPlan): string | undefined {
    if (monthly) return undefined
    if (plan === 'solo') return t`Save $96/year`
    if (plan === 'pro') return t`Save $192/year`
    if (plan === 'team') return t`Save $360/year`
    return t`Save from $960/year`
  }

  return [
    {
      id: 'solo',
      name: t`Solo`,
      price: price('solo'),
      priceSuffix: t`/ mo`,
      cadence,
      savings: savings('solo'),
      seats: t`1 owner seat`,
      firms: t`1 practice workspace`,
      aiLabel: t`Basic AI`,
      aiDescription: t`Source-backed previews and lightweight migration help for one owner.`,
      aiFeatures: [t`Preview-only AI assistance`, t`Source-constrained summaries`],
      description: t`For solo owners running one practice workspace.`,
      features: [
        t`1 practice workspace`,
        t`1 owner seat`,
        t`Source-backed evidence`,
        t`Migration and rules preview`,
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
      aiLabel: t`Practice AI included`,
      aiDescription: t`Today briefs, Pulse summaries, client risk summaries, and guided import AI for live client data.`,
      aiFeatures: [t`Full practice AI workflows`, t`Same AI capability as Team`],
      description: t`For small practices that need shared deadline operations.`,
      features: [
        t`1 production practice`,
        t`3 seats included`,
        t`Pulse and Obligations access`,
        t`Shared deadline operations`,
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
      aiLabel: t`Same Practice AI as Pro`,
      aiDescription: t`The same practice AI functionality as Pro, paired with team-scale management and review workflows.`,
      aiFeatures: [t`Same AI capability as Pro`, t`Team-scale fair-use protection`],
      description: t`For practices coordinating a larger operations team.`,
      features: [
        t`1 production practice`,
        t`10 seats included`,
        t`Team workload and shared triage`,
        t`Manager-ready practice operations`,
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
      aiLabel: t`Custom AI and coverage by contract`,
      aiDescription: t`Contract-level model routing, custom coverage, and audit-grade AI controls.`,
      aiFeatures: [t`Custom AI routing`, t`Contract coverage and audit controls`],
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
  const firms = firmsQuery.data ?? (currentFirm ? [currentFirm] : [])
  const canReadBilling = hasFirmPermission({
    role: currentFirm?.role,
    permission: 'billing.read',
    coordinatorCanSeeDollars: currentFirm?.coordinatorCanSeeDollars,
  })
  const activeFirmCount = ownedActiveFirms(firms).length
  const activeFirmLimit = activeFirmEntitlementLimit(firms)
  const activeFirmLimitLabel = activeFirmLimit === null ? t`contract` : String(activeFirmLimit)
  const activeFirmUsage = currentFirm
    ? t`${activeFirmCount} of ${activeFirmLimitLabel} active practices`
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
          : t`Solo`
    : '—'
  const seatLimit = currentFirm ? t`${currentFirm.seatLimit} seat limit` : '—'
  const subscriptionStatus = activeSubscription?.status ?? t`No paid subscription`
  const portalMutation = useMutation({
    mutationFn: async () => {
      if (!currentFirm) throw new Error(t`No active practice is selected.`)
      return createBillingPortal({
        referenceId: currentFirm.id,
        returnUrl: new URL('/billing', window.location.origin).toString(),
      })
    },
    onSuccess: (url) => {
      window.location.assign(url)
    },
  })

  if (firmsQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 py-6 md:px-6">
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
          <Trans>
            Billing overview is available to owners and managers. Contact the practice owner if you
            need plan or invoice access.
          </Trans>
        }
        secondaryAction={{ label: <Trans>Open Obligations</Trans>, to: '/obligations' }}
      >
        <div />
      </PermissionGate>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 py-6 md:px-6">
      <Breadcrumb items={[{ label: t`Settings`, to: '/settings' }, { label: t`Billing` }]} />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-text-primary">
              <Trans>Billing</Trans>
            </h1>
            <p className="mt-1 max-w-[680px] text-sm leading-6 text-text-secondary">
              <Trans>
                Review the active practice plan, open billing controls, and choose the right
                workspace tier.
              </Trans>
            </p>
          </div>
        </div>
        {currentFirm ? (
          <Badge
            variant={paidPlanActive(currentFirm) ? 'success' : 'outline'}
            className="font-mono tabular-nums"
          >
            {currentPlanName}
          </Badge>
        ) : null}
      </header>

      {portalMutation.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Billing portal couldn't open</Trans>
          </AlertTitle>
          <AlertDescription>{portalMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {firmsQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Practice context couldn't load</Trans>
          </AlertTitle>
          <AlertDescription>{firmsQuery.error.message}</AlertDescription>
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
          <CardContent className="grid gap-5">
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
                    <p className="mt-1 truncate text-xl font-semibold text-text-primary">
                      {currentFirm?.name ?? '—'}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="font-mono text-2xl font-semibold tabular-nums text-text-primary">
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
                    label={<Trans>Practice workspaces</Trans>}
                    value={activeFirmUsage}
                    name={`Practice workspaces: ${activeFirmCount} of ${activeFirmLimitLabel}`}
                  />
                  <Metric
                    label={<Trans>Subscription status</Trans>}
                    value={subscriptionStatus}
                    name={`Subscription status: ${subscriptionStatus}`}
                  />
                  <Metric
                    label={<Trans>Billing role</Trans>}
                    value={owner ? t`Owner` : t`Member`}
                    name={`Billing role: ${owner ? 'owner' : 'member'}`}
                  />
                </div>
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
                <Trans>Only owners can manage billing.</Trans>
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
              title={<Trans>Provider hosted</Trans>}
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
            <span className="text-xs font-medium uppercase text-text-tertiary">
              <Trans>Plan options</Trans>
            </span>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">
              <Trans>Choose a workspace tier</Trans>
            </h2>
          </div>
          <BillingIntervalToggle value={billingInterval} onChange={setBillingInterval} />
        </header>

        <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
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
  solo: 0,
  pro: 1,
  team: 2,
  firm: 3,
}

function Metric({ label, value, name }: { label: ReactNode; value: string; name: string }) {
  return (
    <div
      role="group"
      aria-label={name}
      className="inline-flex min-w-0 max-w-full flex-none flex-col rounded-lg border border-divider-regular bg-background-default p-4"
    >
      <span className="text-xs font-medium uppercase text-text-tertiary">{label}</span>
      <p className="mt-2 truncate text-md font-semibold text-text-primary">{value}</p>
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
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-background-subtle text-text-accent">
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

  return (
    <div
      role="group"
      aria-label={t`Billing interval`}
      className="inline-flex h-11 w-fit max-w-full items-center rounded-lg border border-divider-regular bg-background-default p-1"
    >
      <button
        type="button"
        aria-pressed={value === 'monthly'}
        onClick={() => onChange('monthly')}
        className={cn(
          'inline-flex h-9 min-w-24 items-center justify-center rounded-md px-3 text-sm font-medium text-text-secondary transition-colors',
          value === 'monthly'
            ? 'bg-accent-default text-primary-foreground shadow-sm'
            : 'hover:bg-state-base-hover hover:text-text-primary',
        )}
      >
        <Trans>Monthly</Trans>
      </button>
      <button
        type="button"
        aria-pressed={value === 'yearly'}
        onClick={() => onChange('yearly')}
        className={cn(
          'inline-flex h-9 min-w-40 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-text-secondary transition-colors',
          value === 'yearly'
            ? 'bg-accent-default text-primary-foreground shadow-sm'
            : 'hover:bg-state-base-hover hover:text-text-primary',
        )}
      >
        <span>
          <Trans>Yearly</Trans>
        </span>
        <Badge
          variant="success"
          className={cn(
            'font-mono text-[10px]',
            value === 'yearly' && 'bg-white/20 text-primary-foreground',
          )}
        >
          <Trans>Save about 20%</Trans>
        </Badge>
      </button>
    </div>
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
      {current ? <CurrentPlanRibbon /> : null}
      <CardHeader className={cn('min-h-[132px] content-start', current ? 'pr-28' : undefined)}>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription className="line-clamp-3 min-h-[72px] leading-6">
          {plan.description}
        </CardDescription>
        <CardAction>
          {!current && plan.badge ? <Badge variant="info">{plan.badge}</Badge> : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
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
                priceKind === 'numeric' ? 'font-mono tabular-nums' : 'font-sans tracking-normal',
              )}
            >
              {plan.price}
            </span>
            {plan.priceSuffix ? (
              <span className="font-mono text-lg font-semibold tabular-nums text-text-primary">
                {plan.priceSuffix}
              </span>
            ) : null}
          </div>
          <div className="grid gap-2 text-sm text-text-secondary">
            <div className="flex flex-wrap items-center gap-2">
              <span>{plan.cadence}</span>
              {plan.savings ? (
                <Badge variant="success" className="font-mono text-[10px]">
                  {plan.savings}
                </Badge>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <span>{plan.firms}</span>
              <span className="inline-flex min-w-0 items-center gap-2">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-divider-deep" />
                <span className="min-w-0 truncate">{plan.seats}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="grid h-[180px] grid-rows-[1fr_auto] gap-3 overflow-hidden rounded-lg border border-state-accent-active-alt bg-components-panel-bg p-3 shadow-xs">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-state-accent-hover-alt text-text-accent">
              <SparklesIcon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <TooltipText className="line-clamp-2 text-sm leading-5 font-semibold text-text-primary">
                {plan.aiLabel}
              </TooltipText>
              <TooltipText className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">
                {plan.aiDescription}
              </TooltipText>
            </div>
          </div>
          <ul className="flex flex-wrap gap-1.5 text-[11px] leading-4 text-text-secondary">
            {plan.aiFeatures.map((feature) => (
              <li
                key={feature}
                className="inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-sm border border-divider-regular bg-background-default px-2 py-1"
              >
                <CheckIcon className="size-3 shrink-0 text-text-accent" aria-hidden />
                <TooltipText className="min-w-0 truncate">{feature}</TooltipText>
              </li>
            ))}
          </ul>
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
          <Button disabled className="w-full" variant="outline">
            {current ? <Trans>Current plan</Trans> : plan.cta}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function TooltipText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={className}>{children}</span>} />
      <TooltipContent className="block max-w-[280px] whitespace-normal text-left leading-5">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

function CurrentPlanRibbon() {
  return (
    <div className="pointer-events-none absolute -top-2 -right-2 z-10 h-28 w-28" aria-hidden="true">
      <span className="absolute top-8 -right-10 flex h-8 w-40 rotate-45 items-center justify-center bg-accent-default text-[10px] leading-none font-bold text-primary-foreground uppercase shadow-sm">
        <Trans>current</Trans>
      </span>
    </div>
  )
}
