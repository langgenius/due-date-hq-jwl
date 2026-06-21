import type { ReactNode } from 'react'
import { CheckIcon, ChevronRightIcon } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
import { cn } from '@duedatehq/ui/lib/utils'
import type { StepIndex } from './state'

/**
 * 4-step horizontal Stepper per [02-ux §2.2].
 *
 * Display-only — clicking does NOT jump steps (avoids data pollution).
 *
 * Step labels are sentence-case `text-sm` (no `font-mono` / `uppercase`,
 * which read as code rather than wizard navigation), matching the body type
 * elsewhere in the app.
 */
// Labels are user OUTCOMES, not ETL stage names (2026-06-12 critique): the
// pipeline words "Intake / Mapping / Normalize / Dry run" have no CPA mental
// model — "Normalize" is opaque and "Dry run" reads as risky. The body copy
// was already plain ("Ready to import"); these labels now match it. Each is
// distinct from the others (Check values ≠ the final Confirm).
const STEP_LABELS: ReadonlyArray<{ index: StepIndex; key: string; label: ReactNode }> = [
  { index: 1, key: 'intake', label: <Trans>Upload</Trans> },
  { index: 2, key: 'mapping', label: <Trans>Match columns</Trans> },
  { index: 3, key: 'normalize', label: <Trans>Check values</Trans> },
  { index: 4, key: 'dry_run', label: <Trans>Confirm</Trans> },
]

export function Stepper({ current }: { current: StepIndex }) {
  const { t } = useLingui()
  return (
    <ol
      role="list"
      // Routed through `t\`` so the aria-label translates with the rest of
      // the wizard.
      aria-label={t`Wizard steps`}
      // No `border-b`: the wizard header (above) already carries one border-b
      // separating the title from progress; a second rule between the Stepper
      // and body content reads as "boxes inside boxes." The Stepper flows into
      // the body, and the body's px-4 padding (in WizardShell) keeps the
      // active step pill, the header title, and the dropzone on the same left
      // edge.
      //
      // Rounded-full pills with numbered circles + ChevronRight separators.
      // Active = filled accent pill; completed = green-tint pill with a check;
      // pending = quiet hairline pill. Display-only (no click-to-jump).
      className="flex h-12 items-center gap-2 px-4"
    >
      {STEP_LABELS.map((step, idx) => {
        const isDone = step.index < current
        const isActive = step.index === current

        const pillTone = isActive
          ? 'bg-state-accent-solid text-text-primary-on-surface'
          : isDone
            ? 'border border-state-success-border bg-state-success-hover text-text-success'
            : 'border border-divider-subtle bg-components-panel-bg text-text-secondary'

        const circleTone = isActive
          ? 'bg-white/20 text-text-primary-on-surface'
          : isDone
            ? 'bg-state-success-solid text-text-primary-on-surface'
            : 'bg-background-section text-text-tertiary'

        return (
          <li
            key={step.key}
            className="flex items-center gap-2"
            aria-current={isActive ? 'step' : undefined}
          >
            <div
              className={cn(
                'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm transition-colors',
                isActive ? 'font-medium' : null,
                pillTone,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums',
                  circleTone,
                )}
              >
                {isDone ? (
                  // The check pops in (zoom 50%→100%) when a step completes — a
                  // small "done" beat that pairs with the SuccessModal check.
                  <CheckIcon
                    className="size-3 animate-in zoom-in-50 duration-200 motion-reduce:animate-none"
                    aria-hidden
                  />
                ) : (
                  step.index
                )}
              </span>
              <span>{step.label}</span>
            </div>
            {idx < STEP_LABELS.length - 1 ? (
              <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 text-text-tertiary" />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
