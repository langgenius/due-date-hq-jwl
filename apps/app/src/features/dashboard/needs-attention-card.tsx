import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, ExternalLinkIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { PulsingDot } from '@/features/pulse/components/PulsingDot'

// Dashboard variant of the Pulse alert card. Same visual hierarchy as
// PulseAlertCard on the Radar page, but with a fixed two-column
// header (source · confidence) and a compact footer suited to the
// 2-up grid on the dashboard. The full PulseAlertCard remains the
// canonical Radar-page surface.
//
// "Same style, same hierarchy, just less information" — per the
// 2026-05-19 design call.

function tonalConfidence(value: number): 'success' | 'warning' | 'error' {
  if (value >= 0.8) return 'success'
  if (value >= 0.5) return 'warning'
  return 'error'
}

function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`
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
  const confidenceTone = tonalConfidence(alert.confidence)

  return (
    <article
      role="region"
      aria-label={t`Radar alert: ${alert.title}`}
      className="flex h-full min-w-0 flex-col gap-3 rounded-lg border border-divider-subtle bg-background-default p-4 transition-colors hover:border-divider-regular"
      data-tone={tone}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <PulsingDot tone={tone} active />
          <span className="font-medium text-text-primary">{alert.source}</span>
        </div>
        <span
          className={cn(
            'shrink-0 font-mono text-sm tabular-nums',
            confidenceTone === 'success' && 'text-text-success',
            confidenceTone === 'warning' && 'text-text-warning',
            confidenceTone === 'error' && 'text-text-destructive',
          )}
        >
          {formatConfidence(alert.confidence)}
        </span>
      </header>

      <p className="line-clamp-2 text-sm text-text-secondary">{alert.title}</p>

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

      <footer className="mt-auto flex items-center justify-between gap-2 pt-1">
        <a
          href={alert.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary"
        >
          <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            <Trans>Source: {alert.source}</Trans>
          </span>
        </a>
        <Button size="sm" variant="outline" onClick={onReview}>
          <Trans>Review</Trans>
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </footer>
    </article>
  )
}

function NeedsAttentionOverflowCard({ count, onOpen }: { count: number; onOpen: () => void }) {
  const { t } = useLingui()
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t`Open ${count} more Radar alert${count === 1 ? '' : 's'}`}
      className="flex h-full min-w-0 items-center justify-center rounded-lg border border-dashed border-divider-regular bg-background-subtle text-text-secondary transition-colors hover:border-divider-regular hover:bg-background-default hover:text-text-primary"
    >
      <span className="text-2xl font-medium tracking-tight">+{count}</span>
    </button>
  )
}

export { NeedsAttentionCard, NeedsAttentionOverflowCard }
