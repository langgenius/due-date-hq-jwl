import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@duedatehq/ui/lib/utils'

const badgeVariants = cva(
  cn(
    'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent text-badge font-medium whitespace-nowrap transition-colors',
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
        // 2026-05-26 (Yuqi follow-up — "Filed status can be more
        // subtle, after filed it doesn't need this much attention"):
        // reverted from the Stripe S9 solid-green chip back to a
        // soft green-tint pill. Filed / Paid / Completed are
        // terminal lifecycle states — they belong in the muted
        // visual register so the eye scans past them and lands on
        // rows that still need work. The check-mark glyph from
        // callers (FileCheck / CircleCheck) carries the positive
        // signal without the chip itself competing for attention.
        success: 'bg-components-badge-bg-green-soft text-text-success',
        warning: 'bg-components-badge-bg-warning-soft text-text-warning',
        info: 'bg-components-badge-bg-blue-soft text-text-accent',
        destructive: 'bg-components-badge-bg-red-soft text-text-destructive',
        outline: 'border-divider-regular text-text-secondary hover:[a]:bg-state-base-hover',
        ghost: 'text-text-secondary hover:bg-state-base-hover',
        link: 'text-text-accent underline-offset-4 hover:underline',
      },
      // 2026-06-01: `size` axis added so the same Badge primitive covers
      // both inline-text usage (default h-5) and PageHeader title-row
      // count pills (lg h-6). Five+ call-sites hand-roll the h-6 +
      // px-2 py-1.5 + tabular-nums pill next to a title; this lets them
      // write <Badge variant="secondary" size="lg">{n}</Badge>.
      //
      // 2026-06-01: `sm` and `circle` sizes added to absorb 7+ override
      // sites that hand-rolled h-4/h-[18px]/size-6 micro-chips and
      // single-digit count circles. `sm` is the micro-chip used by
      // tab-count bubbles, ext./paid-late chips, and AI-assisted
      // provenance chips. `circle` is the equal-axis count circle
      // used by SourceCountBadge coverage indicators, single-digit
      // tab counts, and the rules legend 'S' glyph.
      size: {
        default: 'h-5 px-2 py-0.5 text-xs',
        sm: 'h-4 min-w-4 px-1.5 text-caption-xs leading-none',
        lg: 'h-6 px-2 py-1.5 text-xs',
        circle: 'size-6 px-0 justify-center tabular-nums',
      },
      // 2026-06-01: `shape` axis adds the square-corner uppercase
      // "eyebrow" treatment used for AI provenance chips, jurisdiction
      // kickers, and timeline phase labels. Default keeps the existing
      // full-pill rounding; `square` swaps to rounded-sm + uppercase +
      // tracking-wide so callers pair it with any color variant.
      // 2026-06-04 (Yuqi Pencil qSR9p — "client name frame does
      // not need to be always full rounded corners"): added a
      // `rounded` shape variant (rounded-lg = 8px corner radius,
      // matching Pencil's qSR9p frame cornerRadius). Sits between
      // `pill` (full-radius, info-density chips) and `square`
      // (sharp-radius, eyebrow micro-chips). Use for content
      // chips like client-name affordances where the pill read
      // is too aggressive for a multi-word identifier.
      shape: {
        pill: 'rounded-full',
        rounded: 'rounded-lg',
        square: 'rounded-sm font-semibold uppercase tracking-wide',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'pill',
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
  size = 'default',
  shape = 'pill',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant, size, shape }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
      size,
      shape,
    },
  })
}

export { Badge, BadgeStatusDot, badgeVariants }
