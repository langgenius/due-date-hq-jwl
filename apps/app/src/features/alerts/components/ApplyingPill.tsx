import { Trans } from '@lingui/react/macro'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * ApplyingPill — the in-progress indicator for the alert one-click apply (the
 * product's core moment: an AI-read change being applied across affected
 * clients). A pill with a slowly-sweeping navy→cyan gradient BORDER (the brand
 * pair), white interior, no inner spinner — activity reads on the edge, calm
 * not flashy ("coffee, not confetti"). The conic gradient spins behind a 1px
 * inset white fill; `overflow-hidden` + `rounded-full` clip it to the pill.
 *
 * Shown only while the apply mutation is in-flight. Reduced-motion: the sweep
 * stops and it settles to a static gradient ring (still legible, no spinner).
 */
export function ApplyingPill({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex overflow-hidden rounded-full p-px', className)}>
      <span
        aria-hidden
        className="absolute inset-[-150%] animate-[spin_2.4s_linear_infinite] bg-[conic-gradient(from_0deg,var(--color-brand-ink),var(--color-brand-highlight),var(--color-brand-ink))] motion-reduce:animate-none"
      />
      <span className="relative inline-flex items-center gap-1.5 rounded-full bg-background-default px-3 py-1 text-xs font-medium text-text-secondary">
        <span className="size-1.5 shrink-0 rounded-full bg-brand-highlight" aria-hidden />
        <Trans>Applying…</Trans>
      </span>
    </span>
  )
}
