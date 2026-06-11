import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@duedatehq/ui/lib/utils'

// 2026-06-01: NEW primitive — Progress bar with tone + size variants.
// Five+ sites re-roll the same outer-bg / inner-fill / width-style
// recipe (workload-page rows, members-page SeatStat hairline bar,
// rules.library coverage bar, rules.library sticky review bar,
// ClientCompliancePosturePanel). One primitive for all of them.
//
// Surface:
//   <Progress value={42} />                     // default tone=accent, size=default
//   <Progress value={80} tone="warning" />       // warning tone
//   <Progress value={20} size="hairline" />      // hairline (2px) for in-tile mini bar
//
// Inner fill width is driven by inline `style.width` so callers can
// pass a precomputed percentage without worrying about a runtime
// arbitrary-class workaround.

const progressTrackVariants = cva('w-full overflow-hidden bg-background-subtle', {
  variants: {
    size: {
      default: 'h-2 rounded-sm',
      hairline: 'h-0.5 rounded-full',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

const progressFillVariants = cva('h-full transition-[width] duration-300 ease-apple', {
  variants: {
    tone: {
      accent: 'bg-state-accent-solid',
      destructive: 'bg-state-destructive-solid',
      warning: 'bg-state-warning-solid',
      disabled: 'bg-divider-regular',
    },
  },
  defaultVariants: {
    tone: 'accent',
  },
})

type ProgressProps = React.ComponentProps<'div'> &
  VariantProps<typeof progressTrackVariants> &
  VariantProps<typeof progressFillVariants> & {
    /** 0–100 percentage. Values are clamped to that range. */
    value: number
    /** Accessible label (announced by screen readers as the progress meaning). */
    'aria-label'?: string
  }

function Progress({
  className,
  value,
  size = 'default',
  tone = 'accent',
  ...props
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn(progressTrackVariants({ size }), className)}
      {...props}
    >
      <div
        data-slot="progress-fill"
        data-tone={tone}
        className={cn(progressFillVariants({ tone }))}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export { Progress, progressTrackVariants, progressFillVariants }
