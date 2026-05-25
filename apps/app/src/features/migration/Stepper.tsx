import type { ReactNode } from 'react'
import { CheckIcon } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
import { cn } from '@duedatehq/ui/lib/utils'
import type { StepIndex } from './state'

/**
 * 4-step horizontal Stepper per [02-ux §2.2].
 *
 * Display-only — clicking does NOT jump steps (avoids data pollution).
 *
 * 2026-05-25 (Yuqi #35, #36): dropped `font-mono` + `uppercase` from
 * step labels — those read as code, not as wizard navigation. Now
 * sentence-case `text-sm`, matching the body type elsewhere in the
 * app. Centered the row inside its track (was left-aligned), so
 * the visual rhythm matches the wizard's centered content area
 * below. "Dry-Run" → "Dry run" to match the sentence-case treatment.
 */
const STEP_LABELS: ReadonlyArray<{ index: StepIndex; key: string; label: ReactNode }> = [
  { index: 1, key: 'intake', label: <Trans>Intake</Trans> },
  { index: 2, key: 'mapping', label: <Trans>Mapping</Trans> },
  { index: 3, key: 'normalize', label: <Trans>Normalize</Trans> },
  { index: 4, key: 'dry_run', label: <Trans>Dry run</Trans> },
]

export function Stepper({ current }: { current: StepIndex }) {
  const { t } = useLingui()
  return (
    <ol
      role="list"
      // 2026-05-25 (Yuqi Wizard #40 — i18n bug fix): aria-label was
      // bare English "Wizard steps"; routed through `t\`` so it
      // translates with the rest of the wizard.
      aria-label={t`Wizard steps`}
      className="flex h-12 items-center justify-center gap-2 border-b border-divider-subtle px-4"
    >
      {STEP_LABELS.map((step, idx) => {
        const isDone = step.index < current
        const isActive = step.index === current
        const tone = isActive
          ? 'border-state-accent-active bg-state-accent-hover-alt text-text-accent'
          : isDone
            ? 'border-transparent bg-transparent text-text-success'
            : 'border-transparent bg-transparent text-text-tertiary'

        return (
          <li
            key={step.key}
            className="flex items-center gap-2"
            aria-current={isActive ? 'step' : undefined}
          >
            <div
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors',
                isActive && 'font-medium',
                tone,
              )}
            >
              <span className="tabular-nums">{step.index}</span>
              {isDone ? <CheckIcon className="size-3.5" aria-hidden /> : null}
              <span>{step.label}</span>
            </div>
            {idx < STEP_LABELS.length - 1 ? (
              <span aria-hidden className="h-px w-6 bg-divider-regular" />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
