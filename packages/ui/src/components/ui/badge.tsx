import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@duedatehq/ui/lib/utils'

const badgeVariants = cva(
  cn(
    'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-badge font-medium whitespace-nowrap transition-colors text-xs',
    'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
    'has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
    'aria-invalid:border-state-destructive-border aria-invalid:ring-2 aria-invalid:ring-state-destructive-active',
    '[&>svg]:pointer-events-none [&>svg]:size-3!',
  ),
  {
    variants: {
      variant: {
        default: 'bg-state-accent-active-alt text-text-accent hover:[a]:bg-state-accent-active',
        secondary: 'bg-components-badge-bg-gray-soft text-text-secondary',
        success: 'bg-components-badge-bg-green-soft text-text-success',
        warning: 'bg-components-badge-bg-warning-soft text-text-warning',
        info: 'bg-components-badge-bg-blue-soft text-text-accent',
        destructive: 'bg-components-badge-bg-red-soft text-text-destructive',
        outline: 'border-divider-regular text-text-secondary hover:[a]:bg-state-base-hover',
        ghost: 'text-text-secondary hover:bg-state-base-hover',
        link: 'text-text-accent underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/**
 * Status indicator dot — flat colored circle.
 *
 * 2026-05-21: dropped the `shadow-status-indicator-{tone}` halo per
 * design call ("remove all of the dots' shadow"). The dot is meant to
 * read as a label color, not a live-status glow. The `PulsingDot`
 * component still renders the haloed treatment for genuinely
 * animated/live signals.
 *
 * Added `info` tone (violet) so the obligation lifecycle can
 * differentiate "Waiting on client" from "In review" — both used to
 * share warning/amber and were visually indistinguishable.
 */
function BadgeStatusDot({
  tone = 'success',
  className,
  ...props
}: React.ComponentProps<'span'> & {
  tone?: 'success' | 'warning' | 'error' | 'normal' | 'disabled' | 'info'
}) {
  const palette = {
    success: 'bg-components-badge-status-light-success-bg',
    warning: 'bg-components-badge-status-light-warning-bg',
    error: 'bg-components-badge-status-light-error-bg',
    normal: 'bg-components-badge-status-light-normal-bg',
    disabled: 'bg-components-badge-status-light-disabled-bg',
    // Violet — distinct from blue (`normal`, in-progress) and amber
    // (`warning`, needs-attention/review). Carries the "we're paused,
    // waiting on someone else" semantic for waiting-on-client.
    info: 'bg-violet-500',
  }[tone]

  return (
    <span
      data-slot="badge-status-dot"
      data-tone={tone}
      aria-hidden
      className={cn('inline-block size-2 shrink-0 rounded-full', palette, className)}
      {...props}
    />
  )
}

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  })
}

export { Badge, BadgeStatusDot, badgeVariants }
