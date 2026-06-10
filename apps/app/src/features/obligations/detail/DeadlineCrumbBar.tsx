import { Trans } from '@lingui/react/macro'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Link } from 'react-router'
import type { ObligationQueueRow } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { describeTaxCode } from '@/lib/tax-codes'

/**
 * Breadcrumb + Prev/Next bar atop the deadline detail page (Pencil
 * rzzww `Xdimj`). "‹ Deadlines / {client} · {form}" on the left,
 * Prev/Next deadline nav on the right. Lives at the route level so it
 * sits above the reused detail body.
 */
export function DeadlineCrumbBar({
  row,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  row: ObligationQueueRow | null
  onPrev: () => void
  onNext: () => void
  prevDisabled: boolean
  nextDisabled: boolean
}) {
  const formLabel = row ? (row.formName ?? describeTaxCode(row.taxType).label) : null
  const current = row ? `${row.clientName} · ${formLabel}` : ''

  return (
    // Full-width border-b, content centered at the same ~1100px max width +
    // px-12 gutters as the hero/body so the breadcrumb aligns with the page.
    <div className="flex h-14 items-center border-b border-divider-subtle bg-background-default px-12">
      <div className="mx-auto flex w-full max-w-[1100px] items-center gap-2">
        <Link
          to="/deadlines"
          className="inline-flex items-center gap-1 text-base font-medium text-text-tertiary outline-none transition-colors hover:text-text-secondary focus-visible:text-text-secondary"
        >
          <ChevronLeftIcon className="size-3.5 shrink-0" aria-hidden />
          <Trans>Deadlines</Trans>
        </Link>
        {current ? (
          <>
            <span className="text-base font-medium text-text-muted" aria-hidden>
              /
            </span>
            <span className="truncate text-base font-semibold text-text-primary">{current}</span>
          </>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          <CrumbNavButton direction="prev" onClick={onPrev} disabled={prevDisabled} />
          <CrumbNavButton direction="next" onClick={onNext} disabled={nextDisabled} />
        </div>
      </div>
    </div>
  )
}

function CrumbNavButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  disabled: boolean
}) {
  const Icon = direction === 'prev' ? ChevronLeftIcon : ChevronRightIcon
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-base font-medium text-text-secondary outline-none transition-colors',
        'hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        'disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent',
      )}
    >
      {direction === 'prev' ? (
        <>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <Trans>Prev</Trans>
        </>
      ) : (
        <>
          <Trans>Next deadline</Trans>
          <Icon className="size-3.5 shrink-0" aria-hidden />
        </>
      )}
    </button>
  )
}
