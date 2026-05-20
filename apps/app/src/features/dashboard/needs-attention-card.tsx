import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, ChevronRightIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { usePulseDetailQueryOptions } from '@/features/pulse/api'
import { PulsingDot } from '@/features/pulse/components/PulsingDot'

// Dashboard variant of the Pulse alert card. Tuned for the dashboard's
// "scan-and-act" mode:
// - The whole card is the action target — no separate Review button.
// - AI confidence hidden unless low enough to need review.
// - Affected client names listed inline; tail collapses to "+N more".
//
// Per 2026-05-20 redesign: bigger title (text-base font-medium beats
// text-sm font-semibold for readability), sans-serif numerals
// throughout, source eyebrow demoted to small tertiary label.

const LOW_CONFIDENCE_THRESHOLD = 0.7
const VISIBLE_CLIENT_NAMES = 2

function useUniqueAffectedClientNames(alertId: string): {
  names: string[]
  hasMore: number
  isLoading: boolean
} {
  const detailQuery = useQuery(usePulseDetailQueryOptions(alertId))
  const affected = detailQuery.data?.affectedClients ?? []
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const row of affected) {
    if (!seen.has(row.clientName)) {
      seen.add(row.clientName)
      ordered.push(row.clientName)
    }
  }
  return {
    names: ordered.slice(0, VISIBLE_CLIENT_NAMES),
    hasMore: Math.max(ordered.length - VISIBLE_CLIENT_NAMES, 0),
    isLoading: detailQuery.isLoading,
  }
}

function NeedsAttentionCard({
  alert,
  onReview,
}: {
  alert: PulseAlertPublic
  onReview: () => void
}) {
  const { t } = useLingui()
  const impacted = alert.matchedCount + alert.needsReviewCount
  const tone = impacted === 0 ? 'success' : 'warning'
  const lowConfidence = alert.confidence < LOW_CONFIDENCE_THRESHOLD
  const { names, hasMore, isLoading: clientsLoading } = useUniqueAffectedClientNames(alert.id)

  return (
    <button
      type="button"
      onClick={onReview}
      aria-label={t`Review Pulse alert: ${alert.title}`}
      className="group flex h-full min-w-0 cursor-pointer flex-col gap-2.5 rounded-md border border-divider-subtle bg-background-default p-3.5 text-left transition-colors hover:border-divider-regular focus-visible:border-state-accent-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      data-tone={tone}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <PulsingDot tone={tone} active />
          <span className="text-base text-text-tertiary">{alert.source}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lowConfidence ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-state-warning-hover px-1.5 py-0.5 text-xs uppercase tracking-wide text-text-warning">
              <AlertTriangleIcon className="size-3" aria-hidden />
              <Trans>Low confidence</Trans>
            </span>
          ) : null}
          <ChevronRightIcon
            className="size-4 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary"
            aria-hidden
          />
        </div>
      </header>

      {/* Title block has a fixed 2-line min-height so card heights
          stay uniform across the row even when one title is short.
          line-clamp-2 caps the upper bound. */}
      <p className="line-clamp-2 min-h-10 text-md font-medium leading-snug text-text-primary">
        {alert.title}
      </p>

      {impacted > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm text-text-tertiary">
            <Plural
              value={impacted}
              one="# client may be affected"
              other="# clients may be affected"
            />
          </p>
          {!clientsLoading && names.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-1.5">
              {names.map((name) => (
                <li
                  key={name}
                  className={cn(
                    'inline-flex rounded-sm border border-divider-subtle bg-background-subtle px-2 py-0.5 text-base text-text-secondary',
                  )}
                  title={name}
                >
                  {name}
                </li>
              ))}
              {hasMore > 0 ? (
                <li className="inline-flex text-base text-text-tertiary">+{hasMore}</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-base text-text-tertiary">
          <Trans>No matching clients in this practice.</Trans>
        </p>
      )}
    </button>
  )
}

function NeedsAttentionOverflowCard({ count, onOpen }: { count: number; onOpen: () => void }) {
  const { t } = useLingui()
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t`Open ${count} more Pulse alert${count === 1 ? '' : 's'}`}
      className="flex h-full w-full shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-divider-subtle text-text-secondary transition-colors hover:border-divider-regular hover:bg-background-default-hover hover:text-text-primary"
    >
      <span className="text-2xl font-semibold tabular-nums tracking-tight">+{count}</span>
      <span className="text-sm uppercase tracking-[0.08em] text-text-tertiary">
        <Trans>alerts</Trans>
      </span>
    </button>
  )
}

export { NeedsAttentionCard, NeedsAttentionOverflowCard }
