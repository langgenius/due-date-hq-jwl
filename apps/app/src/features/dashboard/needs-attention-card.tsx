import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowUpRightIcon,
  AlertTriangleIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { usePulseDetailQueryOptions } from '@/features/pulse/api'
import { PulsingDot } from '@/features/pulse/components/PulsingDot'

// Dashboard variant of the Pulse alert card. Reuses PulseAlertCard's
// visual hierarchy (pulsing dot, source label, title, affected
// clients) but tuned for the dashboard's "scan-and-act" mode:
// - The whole card is the action target — no separate Review button.
// - AI confidence is hidden by default; surfaced only as a small
//   warning chip when it's low enough to warrant manual review.
//   Bare "96%" was confusing per design call 2026-05-19.
// - Affected client names are listed inline (via detail fetch),
//   collapsing the tail into "+N more" when space runs out.

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
      aria-label={t`Review Radar alert: ${alert.title}`}
      className="group flex h-full min-w-0 cursor-pointer flex-col gap-3 rounded-md border border-divider-subtle bg-background-default p-4 text-left transition-colors hover:border-divider-regular focus-visible:border-state-accent-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      data-tone={tone}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <PulsingDot tone={tone} active />
          <span className="text-sm font-medium text-text-secondary">{alert.source}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lowConfidence ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-state-warning-hover px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-warning">
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

      {/* Title is the primary visual anchor — bigger, semibold, primary
          text — per design call 2026-05-19. Source label above is the
          eyebrow context, no longer competing for emphasis. */}
      <p className="line-clamp-2 text-base font-semibold leading-snug text-text-primary">
        {alert.title}
      </p>

      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-xs text-text-tertiary">
          {impacted === 0 ? (
            <Trans>No matching clients in this practice.</Trans>
          ) : (
            <Plural
              value={impacted}
              one="# client may be affected"
              other="# clients may be affected"
            />
          )}
        </p>
        {impacted > 0 && !clientsLoading && names.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-1.5">
            {names.map((name) => (
              <li
                key={name}
                className={cn(
                  'inline-flex max-w-[160px] truncate rounded-sm border border-divider-subtle bg-background-subtle px-1.5 py-0.5 text-xs text-text-secondary',
                )}
                title={name}
              >
                {name}
              </li>
            ))}
            {hasMore > 0 ? (
              <li className="inline-flex text-xs text-text-tertiary">
                <Trans>+{hasMore} more</Trans>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <footer className="mt-auto flex items-center pt-1">
        <a
          href={alert.sourceUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex min-w-0 items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary"
        >
          <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            <Trans>Source: {alert.source}</Trans>
          </span>
          <ArrowUpRightIcon className="size-3 shrink-0 opacity-60" aria-hidden />
        </a>
      </footer>
    </button>
  )
}

function NeedsAttentionOverflowCard({ count, onOpen }: { count: number; onOpen: () => void }) {
  const { t } = useLingui()
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t`Open ${count} more Radar alert${count === 1 ? '' : 's'}`}
      // Square-ish tile fixed to a narrower width so the inline alert
      // cards keep the visual weight. The "+N alerts" label
      // disambiguates from the "+N more" client-overflow chip on the
      // alert cards themselves (different meanings, same notation).
      className="flex aspect-square h-full w-full shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-divider-regular bg-background-subtle text-text-secondary transition-colors hover:border-divider-regular hover:bg-background-default hover:text-text-primary"
    >
      <span className="text-2xl font-medium tracking-tight">+{count}</span>
      <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
        <Trans>alerts</Trans>
      </span>
    </button>
  )
}

export { NeedsAttentionCard, NeedsAttentionOverflowCard }
