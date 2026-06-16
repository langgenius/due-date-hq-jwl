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
export type DetailBannerTone = 'danger' | 'success' | 'warning' | 'pending'

const TONE: Record<DetailBannerTone, { band: string; text: string }> = {
  danger: { band: 'bg-state-destructive-hover', text: 'text-text-destructive' },
  success: { band: 'bg-components-badge-bg-green-soft', text: 'text-text-success' },
  warning: { band: 'bg-state-warning-hover', text: 'text-text-warning' },
  // 2026-06-12 (Yuqi detail critique — too many hot signals; then "white,
  // gray, white, gray is so bad UI"): "awaiting your decision" is OPEN WORK,
  // not danger — a plain white status LINE (the border-b carries the edge),
  // keeping the panel one continuous surface and the one hot cue for the
  // actual deadline countdown.
  pending: { band: 'bg-background-default', text: 'text-text-secondary' },
}

export function DetailStatusBanner({
  tone,
  icon: Icon,
  title,
  description,
  action,
  note,
  compact = false,
  subtle = false,
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
  /**
   * Drop the colored band, keeping only the tone's icon + text color on a
   * plain white surface (the border-b carries the edge). Urgency reads from
   * the colored text/icon, not a loud full-bleed bar — the same calm
   * treatment the `pending` tone already uses. Use on surfaces that want one
   * continuous surface with color as a text cue, not a stripe (Yuqi: quieter
   * overdue banner + white panel).
   */
  subtle?: boolean
}) {
  const c = TONE[tone]
  const band = subtle ? 'bg-background-default' : c.band

  if (compact) {
    return (
      // h-[52px] — the same row height as the detail panel's top bar and
      // the list rail's head/toggle rows, so the horizontal bands align
      // across the rail ⟷ detail columns (Yuqi: banner should sit at the
      // toggle's height, not a shorter stripe).
      <div
        className={cn(
          'flex h-[52px] w-full items-center gap-2.5 border-b border-divider-subtle px-6 xl:px-12',
          band,
        )}
      >
        <Icon className={cn('size-4 shrink-0', c.text)} aria-hidden />
        {/* #20: title sized down (was text-base).
            2026-06-16 (Yuqi "太粗了"): font-semibold → font-medium. On the
            colored danger/warning bands, red + bold was a double-highlight
            (banned: urgency = colour OR weight, not both). The tone colour +
            the icon carry the urgency; the label stays a calm 500. */}
        <span className={cn('text-sm font-medium', c.text)}>{title}</span>
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
        'flex w-full flex-wrap items-start gap-3 border-b border-divider-subtle px-6 py-3 xl:px-12',
        band,
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', c.text)} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('text-base font-semibold', c.text)}>{title}</span>
        {description ? <span className="text-sm text-text-tertiary">{description}</span> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
