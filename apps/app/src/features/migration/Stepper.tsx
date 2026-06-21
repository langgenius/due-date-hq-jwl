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

/**
 * Total step count — kept in sync with STEP_LABELS so the vertical rail can
 * render a "Step N of 4" caption without re-deriving the length at each call
 * site.
 */
export const STEP_COUNT = STEP_LABELS.length

export function Stepper({
  current,
  orientation = 'horizontal',
}: {
  current: StepIndex
  /**
   * `horizontal` (default) = the 4-step top progress row (pills + chevrons).
   * `vertical` = the left-rail variant: a stacked list with the same
   * numbered→check + active-pill states plus a "Step N of 4" caption. The
   * vertical form reuses the identical STEP_LABELS data and tone logic so the
   * two layouts can never drift.
   */
  orientation?: 'horizontal' | 'vertical'
}) {
  if (orientation === 'vertical') return <VerticalStepper current={current} />
  return <HorizontalStepper current={current} />
}

function HorizontalStepper({ current }: { current: StepIndex }) {
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

/**
 * Vertical left-rail variant. Same numbered→check + active-pill states as the
 * horizontal Stepper, stacked top-to-bottom with a leading "Step N of 4"
 * caption above the list. Display-only, like the horizontal form.
 *
 * The rail uses a connector line between markers (replacing the horizontal
 * ChevronRight separators) so the vertical reading order is unambiguous, and
 * the active row stays a filled accent pill while completed rows show the
 * green-tint check — identical token choices to keep the two orientations from
 * drifting.
 */
function VerticalStepper({ current }: { current: StepIndex }) {
  const { t } = useLingui()
  return (
    <div className="flex flex-col gap-3">
      {/* Progress caption — urgency-free secondary text. Uses <Trans> (not a
          Plural string prop) so the {current}/{count} variables interpolate. */}
      <p className="text-xs font-medium tabular-nums text-text-tertiary">
        <Trans>
          Step {current} of {STEP_COUNT}
        </Trans>
      </p>
      <ol role="list" aria-label={t`Wizard steps`} className="flex flex-col gap-1">
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
              className="flex flex-col"
              aria-current={isActive ? 'step' : undefined}
            >
              <div
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors',
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
                    <CheckIcon
                      className="size-3 animate-in zoom-in-50 duration-200 motion-reduce:animate-none"
                      aria-hidden
                    />
                  ) : (
                    step.index
                  )}
                </span>
                <span className="truncate">{step.label}</span>
              </div>
              {idx < STEP_LABELS.length - 1 ? (
                // Short connector between markers. The pill's leading circle
                // sits at px-3 + half the size-4 circle = ~20px from the rail
                // edge, so the connector is nudged to ml-[1.25rem] to line up
                // under the circle centers.
                <span aria-hidden className="ml-[1.25rem] h-2 w-px bg-divider-subtle" />
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
