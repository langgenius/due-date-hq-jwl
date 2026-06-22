import { Trans, useLingui } from '@lingui/react/macro'
import { XIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Button } from '@duedatehq/ui/components/ui/button'

import { fadeMotion } from '@/lib/motion'

/**
 * In-surface top bar atop the deadline detail PAGE — mirrors
 * AlertDetailDrawer's top bar: a 52px full-bleed `border-b` CHROME band
 * (px-5, breadcrumb hugs the left edge, "N of M" + close ✕ hug the right) with
 * a chevron-less slash-path "Deadlines" crumb at 13/tertiary. The left RAIL is
 * the primary navigator (▲▼ paging lives in the drawer), so no Prev/Next
 * buttons here — same as the alert top bar.
 *
 * 2026-06-16 (deadlines↔alerts parity): dropped the back-chevron, the 760px
 * content cap, and the 14px crumb. The alert top bar is full-width chrome with a
 * 13px slash-path crumb (the path IS the back affordance; a back-arrow on top of
 * it was a mixed signal), so this now reads identically.
 *
 * 2026-06-16 (Yuqi "这里不统一"): brought to exact alert-crumb parity — the crumb
 * is now a `<nav>` that REVEALS the deadline title (`Deadlines / {title}`) once
 * the hero has scrolled out of view, the right cluster uses `gap-3`, and the
 * close button drops its colour override (the ghost variant already styles it).
 */
export function DeadlineCrumbBar({
  position,
  onClose,
  title,
  heroScrolled = false,
}: {
  /** 1-based-on-render position read-out across the rail list. */
  position: { index: number; total: number } | null
  onClose: () => void
  /** The deadline's hero title — revealed in the crumb ONLY once the hero has
   * scrolled out of view (Yuqi "still show the title, smaller"), mirroring the
   * alert top bar. At the top the big hero title is visible, so repeating it
   * here would be redundant. */
  title?: ReactNode
  heroScrolled?: boolean
}) {
  const { t } = useLingui()

  return (
    // Full-bleed CHROME band (px-5, no document cap): the crumb hugs the left
    // edge and the close ✕ the right — exactly like AlertDetailDrawer's top bar.
    <div className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-divider-subtle px-5">
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link
          to="/deadlines"
          className="shrink-0 rounded-sm text-text-tertiary outline-none transition-colors hover:text-text-secondary focus-visible:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <Trans>Deadlines</Trans>
        </Link>
        {/* The `/ {title}` segment reveals once the hero title scrolls out of
            view. Fade it in/out (fadeMotion) instead of popping — keyed so
            AnimatePresence runs the exit when it scrolls back to the top. */}
        <AnimatePresence mode="wait">
          {title && heroScrolled ? (
            <motion.span key="title" {...fadeMotion} className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-text-muted" aria-hidden>
                /
              </span>
              <span className="max-w-[420px] truncate text-text-secondary">{title}</span>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </nav>
      <div className="flex shrink-0 items-center gap-3">
        {position && position.total > 0 ? (
          <span className="text-sm text-text-tertiary tabular-nums">
            {t`${position.index + 1} of ${position.total}`}
          </span>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label={t`Close deadline detail`}
        >
          <XIcon className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
