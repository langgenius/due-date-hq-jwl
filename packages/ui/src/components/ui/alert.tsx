import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@duedatehq/ui/lib/utils'

const alertVariants = cva(
  cn(
    'group/alert relative grid w-full gap-0.5 rounded-lg border px-4 py-3 text-left text-sm',
    'has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18',
    'has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5',
    // 2026-05-25 (Yuqi Today #9): icon aligns with the title's first
    // line, not vertically-centered between title and description.
    // The previous `row-span-2` made the icon sit mid-way between
    // the two rows (centered across both), which on alerts with a
    // long title + short description left the icon visually below
    // the title's baseline — Yuqi flagged it as "doesn't align with
    // first text line". Now icon lives on row 1 (`row-start-1`) with
    // `self-start` + a 1px nudge down so the visual centroid of the
    // glyph aligns with the cap-height of the title text. Long
    // descriptions wrap freely on row 2 without the icon following.
    "*:[svg]:row-start-1 *:[svg]:self-start *:[svg]:mt-px *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  ),
  {
    variants: {
      variant: {
        default: 'border-divider-regular bg-components-card-bg text-text-primary',
        info: 'border-state-accent-hover-alt bg-state-accent-hover text-text-primary *:[svg]:text-text-accent',
        success:
          'border-state-success-hover-alt bg-state-success-hover text-text-primary *:[svg]:text-text-success',
        warning:
          'border-state-warning-hover-alt bg-state-warning-hover text-text-primary *:[svg]:text-text-warning',
        destructive:
          'border-state-destructive-hover-alt bg-state-destructive-hover text-text-primary *:[svg]:text-text-destructive *:data-[slot=alert-description]:text-text-destructive-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'font-medium text-text-primary group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 hover:[&_a]:text-text-accent',
        className,
      )}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        // 2026-05-26 (Yuqi sixteenth pass #5): description now snaps
        // to col-start-2 when the alert has a leading svg icon, so
        // it lines up under the title instead of slipping back to
        // col-start-1 (which made the description sit under the
        // icon — that was the broken layout Yuqi flagged).
        'group-has-[>svg]/alert:col-start-2',
        'text-sm text-balance text-text-tertiary md:text-pretty [&_a]:underline [&_a]:underline-offset-3 hover:[&_a]:text-text-accent [&_p:not(:last-child)]:mb-4',
        className,
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn('absolute top-2.5 right-3', className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
