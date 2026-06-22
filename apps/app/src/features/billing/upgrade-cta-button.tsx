import { type ComponentProps, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Trans } from '@lingui/react/macro'
import { CrownIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { billingPlanHref, type BillingInterval, type BillingPlan } from './model'

type UpgradeCtaButtonProps = Omit<
  ComponentProps<typeof Button>,
  'children' | 'nativeButton' | 'render' | 'variant'
> & {
  children?: ReactNode
  interval?: BillingInterval
  plan?: BillingPlan
}

export function UpgradeCtaButton({
  children,
  className,
  interval = 'monthly',
  plan = 'pro',
  size = 'sm',
  ...props
}: UpgradeCtaButtonProps) {
  return (
    <Button
      {...props}
      nativeButton={false}
      size={size}
      variant="accent"
      className={cn(
        // `state-warning-solid` (coral #f25f4c) is fixed across themes, so the
        // ink must stay DARK in both — `text-text-primary` alone flips to
        // near-white in dark mode (≈3.2:1 on coral, fails AA). The `dark:`
        // override pins it back to the dark on-surface ink (≈6.6:1). Same for
        // the hover label + glyph below.
        'relative isolate overflow-hidden border-state-warning-solid bg-state-warning-solid text-text-primary shadow-status-indicator-warning ring-1 ring-state-warning-hover-alt dark:text-text-primary-on-surface',
        // `before:duration-500` is a DELIBERATE motion-grammar outlier (like
        // the 0.64s detail paper-rise): the slow hover shimmer-sweep is a
        // luxury "this is the upgrade" flourish, longer than the 150ms micro
        // tempo on purpose. Killed under reduced-motion via `before:hidden`.
        'before:absolute before:inset-y-0 before:-left-1/2 before:w-1/2 before:skew-x-[-18deg] before:bg-white/35 before:content-[""] before:transition-transform before:duration-500 motion-reduce:before:hidden',
        // Hover keeps the solid coral fill (a `bg` state token, not a text
        // token) and darkens it a touch via `brightness` — theme-safe, since
        // `state-warning-solid` and the old `text-warning-secondary` resolved to
        // the SAME coral in light mode (zero hover delta) and only a faint lift
        // in dark.
        'hover:bg-state-warning-solid hover:brightness-95 hover:text-text-primary hover:shadow-upgrade-cta-hover hover:before:translate-x-[320%] dark:hover:text-text-primary-on-surface',
        'focus-visible:ring-state-warning-active',
        '[&_svg]:relative [&_svg]:z-10 [&_svg]:text-text-primary dark:[&_svg]:text-text-primary-on-surface',
        className,
      )}
      render={<Link to={billingPlanHref(plan, interval)} />}
    >
      {/* 2026-05-26 (Step 9 AI Visibility Audit F-006): SparklesIcon
          replaced with Crown. Sparkles had been overloaded across
          billing (this upgrade CTA), opportunities, and per-value
          AI provenance — three meanings, one glyph, training the
          wrong mental model. Crown locks "premium / paid tier"
          semantics without bleeding into the AI iconography. */}
      <CrownIcon data-icon="inline-start" />
      <span className="relative z-10">{children ?? <Trans>Upgrade to Pro</Trans>}</span>
    </Button>
  )
}
