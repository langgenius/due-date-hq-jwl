import { type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { ArrowRightIcon, CircleCheckIcon, CircleDashedIcon, LoaderIcon, RocketIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { DuotoneIcon } from '@/components/primitives/duotone-icon'
import { TickProgress } from '@/components/primitives/tick-progress'

export interface SetupStep {
  key: string
  label: ReactNode
  done: boolean
  /** Destination for the CTA when this is the next incomplete step. */
  href: string
}

/**
 * SetupProgressCard — the "Almost there" onboarding nudge (Yuqi refs: the
 * tick-mark progress card + the Getting Started checklist). A soft rounded card
 * with a percent badge, the brand-gradient TickProgress bar, and a checklist
 * whose icons read at a glance: green check = done, spinning loader = the step
 * to do next, dashed circle = later. A single CTA jumps to the next step.
 *
 * Self-dismisses (renders nothing) once every step is done — a finished setup
 * earns no chrome. Every step is a REAL signal the caller derives from live
 * counts (clients / rules / …), never a fabricated checkbox.
 */
export function SetupProgressCard({
  steps,
  title,
  description,
  className,
}: {
  steps: SetupStep[]
  title?: ReactNode
  description?: ReactNode
  className?: string
}) {
  const doneCount = steps.filter((s) => s.done).length
  if (steps.length === 0 || doneCount === steps.length) return null
  const pct = Math.round((doneCount / steps.length) * 100)
  const next = steps.find((s) => !s.done)
  return (
    <section
      aria-label="Setup progress"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-divider-regular bg-background-default p-4 animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {/* Brand duotone glyph warms the onboarding moment (Yuqi duotone-icon
            aesthetic) — a launch cue that pairs with the cyan→navy TickProgress
            + the navy % badge. */}
        <DuotoneIcon icon={RocketIcon} tone="brand" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-text-primary">
            {title ?? <Trans>Almost there</Trans>}
          </h3>
          <p className="mt-0.5 text-sm text-text-secondary">
            {description ?? (
              <Trans>A few steps left before DueDateHQ starts watching your deadlines.</Trans>
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-ink px-2 py-0.5 text-xs font-semibold tabular-nums text-text-inverted">
          {pct}%
        </span>
      </div>

      <TickProgress value={pct} />

      <ul className="flex flex-col gap-2">
        {steps.map((step) => {
          const isNext = step === next
          return (
            <li key={step.key} className="flex items-center gap-2.5 text-sm">
              {step.done ? (
                <CircleCheckIcon className="size-4 shrink-0 text-text-success" aria-hidden />
              ) : isNext ? (
                <LoaderIcon
                  className="size-4 shrink-0 animate-spin text-text-accent motion-reduce:animate-none"
                  aria-hidden
                />
              ) : (
                <CircleDashedIcon className="size-4 shrink-0 text-text-tertiary" aria-hidden />
              )}
              <span
                className={cn(
                  'truncate',
                  step.done
                    ? 'text-text-tertiary'
                    : isNext
                      ? 'font-medium text-text-primary'
                      : 'text-text-secondary',
                )}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ul>

      {next ? (
        <Button size="sm" className="w-full" nativeButton={false} render={<Link to={next.href} />}>
          <Trans>Continue setup</Trans>
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      ) : null}
    </section>
  )
}
