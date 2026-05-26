import { type ComponentProps, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Trans } from '@lingui/react/macro'
import { Crown } from 'lucide-react'

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
        'relative isolate overflow-hidden border-state-warning-solid bg-state-warning-solid text-text-primary shadow-status-indicator-warning ring-1 ring-state-warning-hover-alt',
        'before:absolute before:inset-y-0 before:-left-1/2 before:w-1/2 before:skew-x-[-18deg] before:bg-white/35 before:content-[""] before:transition-transform before:duration-500',
        'hover:bg-text-warning-secondary hover:text-text-primary hover:shadow-[0_0_0_1px_rgb(247_144_9_/_0.35),0_12px_28px_rgb(247_144_9_/_0.36)] hover:before:translate-x-[320%]',
        'focus-visible:ring-state-warning-active',
        '[&_svg]:relative [&_svg]:z-10 [&_svg]:text-text-primary',
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
      <Crown data-icon="inline-start" />
      <span className="relative z-10">{children ?? <Trans>Upgrade to Pro</Trans>}</span>
    </Button>
  )
}
