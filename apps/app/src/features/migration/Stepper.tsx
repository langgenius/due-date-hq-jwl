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
      // 2026-05-29 (R4 migration polish #7): the stepper used to be
      // `justify-center gap-2` with `w-6` fixed connector lines —
      // the steps clustered in the middle of the wizard frame and
      // the connectors became decorative ticks rather than a real
      // progress rail. Now `justify-between gap-3` lets each step
      // anchor to its column and the connectors flex to fill the
      // remaining space. The track now reads as one continuous
      // path across the full width.
      //
      // 2026-05-29 (R4 follow-up #1 + #5): dropped the `border-b`. The
      // wizard header (above) already carries one border-b separating
      // the title from progress; stacking a second rule between the
      // Stepper and body content read as "boxes inside boxes." The
      // Stepper now flows into the body, and the body's horizontal
      // padding was retuned to `px-4` (in WizardShell) so the active
      // step pill, the header title, and the dropzone all share the
      // same left edge — see feedback #5 ("alignment between the
      // title, the progress bar, and the drop zone").
      // 2026-06-07 (Cluster 3 — pill stepper, design SLw8Q/dCUv7): the
      // bordered rounded-md chips + flex connector rail were restyled
      // to rounded-full pills with numbered circles + ChevronRight
      // separators, matching the canvas. Active = filled accent pill;
      // completed = green-tint pill with a check; pending = quiet
      // hairline pill. Still display-only (no click-to-jump).
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
          <li key={step.key} className="flex items-center gap-2" aria-current={isActive ? 'step' : undefined}>
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
                  'grid size-4 shrink-0 place-items-center rounded-full text-[11px] font-medium tabular-nums',
                  circleTone,
                )}
              >
                {isDone ? <CheckIcon className="size-3" aria-hidden /> : step.index}
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
