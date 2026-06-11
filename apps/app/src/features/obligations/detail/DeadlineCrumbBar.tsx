import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronLeftIcon, XIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@duedatehq/ui/components/ui/button'

/**
 * In-surface top bar atop the deadline detail PAGE — rebuilt 2026-06-10
 * (Yuqi alert↔deadline parity #1) to mirror AlertDetailDrawer's top bar
 * exactly: a 52px full-bleed band with a `border-b`, content capped to
 * the same 760px document measure, carrying a "‹ Deadlines" crumb on the
 * left and a "N of M" position read-out + a close ✕ on the right.
 *
 * The left RAIL is the primary navigator (▲▼ keyboard paging lives in the
 * drawer), so this bar carries no Prev/Next buttons — just like the alert
 * top bar. Rendered INSIDE the drawer body (page mode) so it shares the
 * same scroll column + `mx-auto max-w-[760px]` measure as the header/body
 * /footer below it.
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
    // Full-width border-b (so the bar never looks cut off); content capped
    // to the same 760px `mx-auto` measure as the document below so it sits
    // centered over the same column the hero/body/footer share — matching
    // AlertDetailDrawer's top bar.
    <div className="flex h-[52px] shrink-0 items-center border-b border-divider-subtle px-12">
      <div className="mx-auto flex w-full max-w-[760px] items-center justify-between gap-3">
        <Link
          to="/deadlines"
          className="inline-flex items-center gap-1 rounded-sm text-base font-medium text-text-tertiary outline-none transition-colors hover:text-text-secondary focus-visible:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <ChevronLeftIcon className="size-4 shrink-0" aria-hidden />
          <Trans>Deadlines</Trans>
        </Link>
        <div className="flex items-center gap-2">
          {position && position.total > 0 ? (
            <span className="text-sm font-medium text-text-muted tabular-nums">
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
    </div>
  )
}
