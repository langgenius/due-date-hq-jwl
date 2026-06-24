import { Trans } from '@lingui/react/macro'

import { cn } from '@duedatehq/ui/lib/utils'

// Step eyebrow + dots — the shared progress affordance across the onboarding
// funnel (welcome → practice → import). The active dot is the accent navy; the
// rest are quiet hairline dots. Steps 2/3 live in onboarding.tsx + the migration
// importer, so this is a real progress indicator, not decoration.
export function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="text-caption font-semibold uppercase tracking-[0.08em] text-text-tertiary">
        <Trans>
          Step {step} of {total}
        </Trans>
      </span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => index + 1).map((stepNumber) => (
          <span
            key={stepNumber}
            aria-hidden
            className={cn(
              'size-1.5 rounded-full transition-colors',
              stepNumber === step ? 'bg-state-accent-solid' : 'bg-divider-regular',
            )}
          />
        ))}
      </div>
    </div>
  )
}
