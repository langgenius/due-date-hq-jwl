import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { CheckIcon, SkipForwardIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'

interface OnboardingSkipModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Confirmed skip → leave the importer for the dashboard. */
  onConfirmSkip: () => void
}

/**
 * Onboarding-only skip-confirmation modal — design iAJhJ.
 *
 * The generic wizard "Leave without importing?" alert is a single
 * destructive prompt; in the onboarding chain the design instead frames the
 * choice as a side-by-side comparison ("If you skip" vs "If you import now")
 * so a first-run user understands the trade before bailing to a sample
 * dashboard. Shown only when source=onboarding.
 */
export function OnboardingSkipModal({
  open,
  onOpenChange,
  onConfirmSkip,
}: OnboardingSkipModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] gap-0 p-0" showCloseButton={false}>
        <DialogHeader className="flex-row items-center gap-3.5 border-b border-divider-subtle px-6 py-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background-subtle text-text-secondary">
            <SkipForwardIcon className="size-4" aria-hidden />
          </span>
          <DialogTitle className="text-xl font-semibold text-text-primary">
            <Trans>Skip importing for now?</Trans>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <DialogDescription className="text-sm leading-relaxed text-text-secondary">
            <Trans>
              No problem — you can import your clients any time from Clients → Import. Here&apos;s
              what changes if you skip now:
            </Trans>
          </DialogDescription>

          <div className="flex flex-col gap-3">
            <CompareCard
              eyebrow={<Trans>If you skip</Trans>}
              tone="neutral"
              rows={[
                { key: 'skip-sample', node: <Trans>Sample data in your workspace</Trans> },
                {
                  key: 'skip-watching',
                  node: <Trans>Rules are watching but no deadlines yet</Trans>,
                },
                {
                  key: 'skip-return',
                  node: <Trans>Come back from Clients → Import any time</Trans>,
                },
              ]}
            />
            <CompareCard
              eyebrow={<Trans>If you import now</Trans>}
              tone="success"
              rows={[
                { key: 'import-clients', node: <Trans>Your real clients on day one</Trans> },
                {
                  key: 'import-digest',
                  node: <Trans>A morning summary of what&apos;s due, starting tomorrow</Trans>,
                },
                { key: 'import-time', node: <Trans>About 5 minutes of focused work</Trans> },
              ]}
            />
          </div>

          {/* 2026-06-16 (audit): removed "we'll send you a reminder" — no
              import-reminder pipeline exists (no-fiction rule). Kept the factual
              "import any time" reassurance. */}
          <p className="text-xs leading-relaxed text-text-tertiary">
            <Trans>You can import your clients any time from Clients → Import.</Trans>
          </p>
        </div>

        <DialogFooter className="flex-row items-center gap-2.5 border-t border-divider-subtle px-6 py-3.5 sm:justify-start">
          <span className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <Trans>Stay and import</Trans>
          </Button>
          <Button onClick={onConfirmSkip}>
            <Trans>Skip for now</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CompareCard({
  eyebrow,
  tone,
  rows,
}: {
  eyebrow: ReactNode
  tone: 'neutral' | 'success'
  rows: { key: string; node: ReactNode }[]
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-divider-regular p-3.5">
      <span className="inline-flex items-center gap-1.5 text-caption font-semibold tracking-eyebrow text-text-muted uppercase">
        {/* Both eyebrows carry a same-size icon square so the two cards read
            as balanced (2026-06-12 critique: the iconless neutral card looked
            broken next to the green success one). Tone still differentiates:
            green check = the encouraged path, gray skip = the lateral exit. */}
        {tone === 'success' ? (
          <span className="grid size-4 place-items-center rounded bg-state-success-solid text-text-primary-on-surface">
            <CheckIcon className="size-3" aria-hidden />
          </span>
        ) : (
          <span className="grid size-4 place-items-center rounded bg-background-subtle text-text-tertiary">
            <SkipForwardIcon className="size-3" aria-hidden />
          </span>
        )}
        {eyebrow}
      </span>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-start gap-2 text-base leading-relaxed text-text-secondary"
          >
            <span
              aria-hidden
              className={
                tone === 'success'
                  ? 'mt-1.5 size-1.5 shrink-0 rounded-full bg-state-success-solid'
                  : 'mt-1.5 size-1.5 shrink-0 rounded-full bg-text-muted'
              }
            />
            <span>{row.node}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
