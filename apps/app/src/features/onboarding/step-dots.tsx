import { type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'

import { cn } from '@duedatehq/ui/lib/utils'

// Step eyebrow + dots — the ONE shared progress affordance across the
// onboarding funnel (welcome → practice → import; the migration importer
// renders this same component, not a local copy). A real progress indicator,
// not decoration, so its states must be accurate (2026-07-31 Yuqi: "确保
// steps 和 substeps 的显示是准确和 user friendly 的"):
//
//  - completed dots = accent solid (round) — you can see how far you've come
//  - current dot    = accent solid, ELONGATED pill — where you are
//  - future dots    = quiet hairline — what's left
//
// The optional `label` names the moment inside the eyebrow ("STEP 2 OF 3 ·
// RULES CHECK") so a conditional interstitial (the rule review, which lives
// inside step 2 after the practice is created) reads as a named sub-step
// instead of a silent duplicate "Step 2".
export function StepDots({
  step,
  total,
  label,
  className,
}: {
  step: number
  total: number
  /** Short name for the current step/sub-step, shown after the count. */
  label?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3.5', className)}>
      <span className="text-caption font-semibold uppercase tracking-eyebrow text-text-tertiary">
        <Trans>
          Step {step} of {total}
        </Trans>
        {label ? (
          <>
            {' '}
            <span aria-hidden>·</span> {label}
          </>
        ) : null}
      </span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => index + 1).map((stepNumber) => (
          <span
            key={stepNumber}
            aria-hidden
            className={cn(
              'h-1.5 rounded-full transition-all',
              stepNumber === step
                ? 'w-4 bg-state-accent-solid'
                : stepNumber < step
                  ? 'w-1.5 bg-state-accent-solid'
                  : 'w-1.5 bg-divider-regular',
            )}
          />
        ))}
      </div>
    </div>
  )
}
