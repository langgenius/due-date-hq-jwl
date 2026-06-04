import { useLingui } from '@lingui/react/macro'

import { cn } from '@duedatehq/ui/lib/utils'

import { RelativeTime } from '@/components/primitives/relative-time'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'

// Canonical "source · timestamp" meta row for Pulse alert cards.
//
// Per Pencil VVMj9 / xxNFC: the meta row sits BELOW the title (not
// above), uses text-tertiary, and renders the source label + a
// middot separator + a relative timestamp. The Pencil layout insets
// the row by `[0, 34]` so it lines up with the title text's start
// — that inset is the caller's responsibility (apply `pl-[34px]`
// or equivalent on the wrapper).
//
// The source label is wrapped in a span so a future caller can
// promote it to a real link without changing this primitive's
// signature. RelativeTime carries its own `<time dateTime title>`
// chrome — no a11y plumbing required here.
function PulseSourceMeta({
  source,
  publishedAt,
  className,
}: {
  source: string
  publishedAt?: string | null
  className?: string
}) {
  const { t } = useLingui()
  // Firm timezone resolved locally so callers don't have to plumb
  // it. The hook is cheap (single React Query cache hit after the
  // first render) and keeps this primitive self-contained.
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)
  return (
    <div
      // 2026-06-04 round 43 (Yuqi /today polish — "same size as
      // the alert page's alert? smaller — make them align and both
      // smaller"): bumped DOWN from `text-sm` (14px in project's
      // Tailwind scale = 12px) to a pinned `text-[13px]` so the
      // source + timestamp on /today match the /alerts PulseAlertCard
      // source row exactly (also 13px). Both surfaces now read with
      // the same source-meta type weight.
      className={cn(
        'flex min-w-0 items-center gap-2 text-[13px] text-text-tertiary',
        className,
      )}
      aria-label={t`Alert source`}
    >
      <span className="truncate font-medium text-text-tertiary">{source}</span>
      {publishedAt ? (
        <>
          <span aria-hidden className="text-text-tertiary">
            ·
          </span>
          <RelativeTime
            value={publishedAt}
            timeZone={firmTimezone}
            className="shrink-0 tabular-nums"
          />
        </>
      ) : null}
    </div>
  )
}

export { PulseSourceMeta }
