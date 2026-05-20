import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from 'react-router'

import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatCents } from '@/lib/utils'

// Dashboard v2 "This week's exposure" strip — a single horizontal
// hairline-separated row that answers Morgan's (the manager
// persona) question "where's the firm's exposure today?" without
// scanning rows. Each segment is a deep-link chip into Obligations
// with the matching filter. Zero-count segments drop.
//
// Per docs/Design/dashboard-actions-design-brief.md §4 / §6.

type Segment = {
  value: string
  label: string
  href: string
  tone: 'neutral' | 'warning' | 'destructive'
}

function ExposureSegment({ segment }: { segment: Segment }) {
  // KPI mini-tile: big number / label below. Reads as a workbench
  // summary, not as a font-mono chip. The number carries the load
  // (T1); the label is supporting context.
  return (
    <Link
      to={segment.href}
      className={cn(
        'flex min-w-[140px] flex-col gap-0.5 rounded-md border border-divider-subtle bg-background-default px-3 py-2 transition-colors hover:border-divider-regular hover:bg-background-default-hover',
      )}
    >
      <span
        className={cn(
          'font-mono text-base font-semibold tabular-nums',
          segment.tone === 'destructive' && 'text-text-destructive',
          segment.tone === 'warning' && 'text-text-warning',
          segment.tone === 'neutral' && 'text-text-primary',
        )}
      >
        {segment.value}
      </span>
      <span className="text-xs text-text-tertiary">{segment.label}</span>
    </Link>
  )
}

function ExposureStrip({
  needDecisionCount,
  totalExposureCents,
  blockedCount,
  waitingOnClientCount,
  canSeeDollars,
  isLoading,
}: {
  needDecisionCount: number
  totalExposureCents: number
  blockedCount: number
  waitingOnClientCount: number
  canSeeDollars: boolean
  isLoading: boolean
}) {
  const { t } = useLingui()

  if (isLoading) {
    return (
      <section aria-label={t`This week's exposure`} className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-text-primary">
          <Trans>This week's exposure</Trans>
        </h2>
        <Skeleton className="h-4 w-3/5" />
      </section>
    )
  }

  // Build segments — drop zero-count entries (per brief §7).
  // Tone discipline: only `blocked` uses destructive (it's the one
  // genuinely-stuck signal). Everything else is neutral text so the
  // dashboard stops feeling like a fire alarm. Per design call
  // 2026-05-19 ("too much use of red").
  const segments: Segment[] = []
  if (needDecisionCount > 0) {
    segments.push({
      value: String(needDecisionCount),
      label: t`Need your decision`,
      href: '/obligations?status=review',
      tone: 'neutral',
    })
  }
  if (canSeeDollars && totalExposureCents > 0) {
    segments.push({
      value: formatCents(totalExposureCents),
      label: t`At risk`,
      href: '/obligations?sort=exposure-desc',
      tone: 'neutral',
    })
  }
  if (blockedCount > 0) {
    segments.push({
      value: String(blockedCount),
      label: t`Blocked`,
      href: '/obligations?status=blocked',
      tone: 'destructive',
    })
  }
  if (waitingOnClientCount > 0) {
    segments.push({
      value: String(waitingOnClientCount),
      label: t`Waiting on client`,
      href: '/obligations?status=waiting_on_client',
      tone: 'neutral',
    })
  }

  // Nothing to show — render nothing rather than empty chrome.
  if (segments.length === 0) return null

  return (
    <section aria-label={t`This week's exposure`} className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-text-primary">
        <Trans>This week's exposure</Trans>
      </h2>
      <div className="flex flex-wrap gap-2">
        {segments.map((segment) => (
          <ExposureSegment key={segment.href} segment={segment} />
        ))}
      </div>
    </section>
  )
}

export { ExposureStrip }
