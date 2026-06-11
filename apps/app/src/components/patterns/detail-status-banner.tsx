import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * DetailStatusBanner — the colored top-of-panel status band shared by the alert
 * detail (DecisionBanners) and the deadline detail. One band, picked from real
 * state, sitting flush at the top of the panel under the page header.
 *
 * The single implementation both panels share — the deadline detail's
 * overdue/done/pending banner and the alert detail's error/applied/pending
 * banners are otherwise four near-identical inline divs.
 *
 * Two layouts:
 *   • compact — the h-10 single-line form (title left, optional `note` right).
 *     Used for the steady-state "pending review" / "past deadline" bands.
 *   • stacked (default) — icon + title + `description`, with an optional
 *     right-side `action` (e.g. Retry / Undo). Used for the richer error /
 *     applied states.
 */
export type DetailBannerTone = 'danger' | 'success' | 'warning'

const TONE: Record<DetailBannerTone, { band: string; text: string }> = {
  danger: { band: 'bg-state-destructive-hover', text: 'text-text-destructive' },
  success: { band: 'bg-components-badge-bg-green-soft', text: 'text-text-success' },
  warning: { band: 'bg-state-warning-hover', text: 'text-text-warning' },
}

export function DetailStatusBanner({
  tone,
  icon: Icon,
  title,
  description,
  action,
  note,
  compact = false,
}: {
  tone: DetailBannerTone
  icon: LucideIcon
  title: ReactNode
  /** Second line in the stacked layout (ignored when `compact`). */
  description?: ReactNode
  /** Right-side control in the stacked layout, e.g. a Retry/Undo button. */
  action?: ReactNode
  /** Right-side meta in the compact layout, e.g. "conf 94% · due in 8 days". */
  note?: ReactNode
  compact?: boolean
}) {
  const c = TONE[tone]

  if (compact) {
    return (
      // h-[52px] — the same row height as the detail panel's top bar and
      // the list rail's head/toggle rows, so the horizontal bands align
      // across the rail ⟷ detail columns (Yuqi: banner should sit at the
      // toggle's height, not a shorter stripe).
      <div
        className={cn(
          'flex h-[52px] w-full items-center gap-2.5 border-b border-divider-subtle px-12',
          c.band,
        )}
      >
        <Icon className={cn('size-4 shrink-0', c.text)} aria-hidden />
        {/* #20: title sized down (was text-base). */}
        <span className={cn('text-sm font-semibold', c.text)}>{title}</span>
        {note ? (
          // #21: note flows right after the status text (was `ml-auto`, which
          // shoved it to the far edge).
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-tertiary tabular-nums">
            {note}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-start gap-3 border-b border-divider-subtle px-12 py-3',
        c.band,
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', c.text)} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('text-base font-semibold', c.text)}>{title}</span>
        {description ? (
          <span className="text-sm text-text-tertiary">{description}</span>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
