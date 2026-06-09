import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Button — Dify visual language with backward-compat variant/size keys.
 *
 * New variants (Dify naming): primary, secondary, tertiary, ghost,
 * destructive-primary, destructive-secondary, destructive-tertiary,
 * destructive-ghost, accent, link.
 *
 * Backward-compat keys (callers prior to migration): default → primary,
 * outline → secondary, destructive → destructive-secondary.
 *
 * Sizes match DESIGN.md's shadcn base-vega contract: default 36px,
 * sm 32px, xs 28px, and square icon controls on the same scale.
 */
const buttonVariants = cva(
  cn(
    // 2026-05-31 (Yuqi /preview round): bumped corner radius scale up
    // (was uniform rounded-md → 6px) and switched to iOS-style
    // continuous corners via CSS `corner-shape: squircle`. The bigger
    // border-radius does most of the work in every browser; the
    // squircle keyword adds Apple's superellipse smoothing in
    // browsers that ship the CSS Backgrounds & Borders L4 property
    // (Chromium 142+, WebKit experimental). Unsupported browsers
    // ignore it gracefully and just see the rounder corners.
    'group/button inline-flex shrink-0 cursor-pointer items-center justify-center border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-colors outline-none select-none',
    '[corner-shape:squircle]',
    'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2 focus-visible:ring-offset-background-default',
    'disabled:pointer-events-none disabled:cursor-not-allowed data-[disabled]:cursor-not-allowed',
    'aria-invalid:border-state-destructive-border aria-invalid:ring-2 aria-invalid:ring-state-destructive-active aria-invalid:ring-offset-2',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
  {
    variants: {
      variant: {
        primary: cn(
          'border-components-button-primary-border bg-components-button-primary-bg text-components-button-primary-text',
          'hover:border-components-button-primary-border-hover hover:bg-components-button-primary-bg-hover',
          'aria-expanded:bg-components-button-primary-bg-hover',
          'disabled:border-components-button-primary-border-disabled disabled:bg-components-button-primary-bg-disabled disabled:text-components-button-primary-text-disabled',
        ),
        secondary: cn(
          'border-components-button-secondary-border bg-components-button-secondary-bg text-components-button-secondary-text',
          'hover:border-components-button-secondary-border-hover hover:bg-components-button-secondary-bg-hover',
          'aria-expanded:border-components-button-secondary-border-hover aria-expanded:bg-components-button-secondary-bg-hover',
          'disabled:border-components-button-secondary-border-disabled disabled:bg-components-button-secondary-bg-disabled disabled:text-components-button-secondary-text-disabled',
        ),
        tertiary: cn(
          'border-components-button-tertiary-border bg-components-button-tertiary-bg text-components-button-tertiary-text',
          'hover:bg-components-button-tertiary-bg-hover',
          'aria-expanded:bg-components-button-tertiary-bg-hover',
          'disabled:bg-components-button-tertiary-bg-disabled disabled:text-components-button-tertiary-text-disabled',
        ),
        ghost: cn(
          'text-components-button-ghost-text',
          'hover:bg-components-button-ghost-bg-hover',
          'aria-expanded:bg-components-button-ghost-bg-hover',
          'disabled:text-components-button-ghost-text-disabled',
        ),
        accent: cn(
          'border-components-button-accent-border bg-components-button-accent-bg text-components-button-accent-text',
          'hover:bg-components-button-accent-bg-hover',
          'aria-expanded:bg-components-button-accent-bg-hover',
          'disabled:bg-components-button-accent-bg-disabled disabled:text-components-button-accent-text-disabled',
        ),
        'destructive-primary': cn(
          'border-components-button-destructive-primary-border bg-components-button-destructive-primary-bg text-components-button-destructive-primary-text',
          'hover:border-components-button-destructive-primary-border-hover hover:bg-components-button-destructive-primary-bg-hover',
          'disabled:bg-components-button-destructive-primary-bg-disabled disabled:text-components-button-destructive-primary-text-disabled',
        ),
        'destructive-secondary': cn(
          'border-components-button-destructive-secondary-border bg-components-button-destructive-secondary-bg text-components-button-destructive-secondary-text',
          'hover:border-components-button-destructive-secondary-border-hover hover:bg-components-button-destructive-secondary-bg-hover',
          'disabled:bg-components-button-destructive-secondary-bg-disabled disabled:text-components-button-destructive-secondary-text-disabled',
        ),
        'destructive-tertiary': cn(
          'bg-components-button-destructive-tertiary-bg text-components-button-destructive-tertiary-text',
          'hover:bg-components-button-destructive-tertiary-bg-hover',
          'disabled:text-components-button-destructive-tertiary-text-disabled',
        ),
        'destructive-ghost': cn(
          'text-components-button-destructive-ghost-text',
          'hover:bg-components-button-destructive-ghost-bg-hover',
        ),
        link: 'text-text-accent underline-offset-4 hover:underline',
        // inverted-ghost — the quiet control for DARK CHROME surfaces
        // (the alerts bulk-action bar, future command bars). These sit on
        // an explicitly dark `bg-text-primary` chrome, so they use fixed
        // white-alpha values rather than theme tokens: that is the whole
        // point of "inverted" — it does not flip with the theme, it always
        // reads as light-on-dark. Consolidates the hand-rolled
        // `text-white/70 hover:bg-white/10` buttons that were duplicated
        // inline across the bulk bar (2026-06-09 button-differentiation).
        'inverted-ghost': cn(
          'text-white/70',
          'hover:bg-white/10 hover:text-white',
          'aria-expanded:bg-white/10',
          'focus-visible:ring-white/40 focus-visible:ring-offset-0',
          'disabled:text-white/30',
        ),
        // Legacy aliases — preserved so existing call-sites keep working.
        // These are intentionally NOT exported via type narrowing; they alias
        // onto the Dify-style variants above.
        default: cn(
          'border-components-button-primary-border bg-components-button-primary-bg text-components-button-primary-text',
          'hover:border-components-button-primary-border-hover hover:bg-components-button-primary-bg-hover',
          'disabled:border-components-button-primary-border-disabled disabled:bg-components-button-primary-bg-disabled disabled:text-components-button-primary-text-disabled',
        ),
        outline: cn(
          'border-components-button-secondary-border bg-components-button-secondary-bg text-components-button-secondary-text',
          'hover:border-components-button-secondary-border-hover hover:bg-components-button-secondary-bg-hover',
          'aria-expanded:bg-components-button-secondary-bg-hover',
          'disabled:bg-components-button-secondary-bg-disabled disabled:text-components-button-secondary-text-disabled',
        ),
        destructive: cn(
          'border-components-button-destructive-secondary-border bg-components-button-destructive-secondary-bg text-components-button-destructive-secondary-text',
          'hover:border-components-button-destructive-secondary-border-hover hover:bg-components-button-destructive-secondary-bg-hover',
          'disabled:bg-components-button-destructive-secondary-bg-disabled disabled:text-components-button-destructive-secondary-text-disabled',
        ),
      },
      size: {
        // 2026-06-08 (Yuqi product-wide rework — "buttons look ugly and
        // coarse, flatter & quieter"): radius scale stepped DOWN one tier
        // across every size — xs 10→6, sm 12→8, default 16→10, lg 18→12.
        // The earlier rounds kept bumping radii UP until the chips read as
        // chunky/coarse; this returns to crisper proportions. The iOS-HIG
        // continuous-corner shape (`[corner-shape:squircle]` on the base
        // class) is kept — it does the smoothing; the radius just stops
        // shouting. Shadows are dropped per-variant below for a flat look.
        default:
          'h-9 gap-1.5 rounded-[10px] px-2.5 text-sm in-data-[slot=button-group]:rounded-[10px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-7 gap-1 rounded-md px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        lg: 'h-10 gap-1.5 rounded-xl px-3 text-base font-semibold has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        icon: 'size-9 rounded-[10px] in-data-[slot=button-group]:rounded-[10px]',
        'icon-xs':
          "size-7 rounded-md in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8 rounded-lg in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-10 rounded-xl in-data-[slot=button-group]:rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
