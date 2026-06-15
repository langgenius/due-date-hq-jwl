import { Trans, useLingui } from '@lingui/react/macro'
import { XIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@duedatehq/ui/components/ui/button'

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
 */
export function DeadlineCrumbBar({
  position,
  onClose,
}: {
  /** 1-based-on-render position read-out across the rail list. */
  position: { index: number; total: number } | null
  onClose: () => void
}) {
  const { t } = useLingui()

  return (
    // Full-bleed CHROME band (px-5, no document cap): the crumb hugs the left
    // edge and the close ✕ the right — exactly like AlertDetailDrawer's top bar.
    <div className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-divider-subtle px-5">
      <Link
        to="/deadlines"
        className="shrink-0 rounded-sm text-sm text-text-tertiary outline-none transition-colors hover:text-text-secondary focus-visible:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        <Trans>Deadlines</Trans>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        {position && position.total > 0 ? (
          <span className="text-sm text-text-muted tabular-nums">
            {t`${position.index + 1} of ${position.total}`}
          </span>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label={t`Close deadline detail`}
          className="text-text-tertiary"
        >
          <XIcon className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
