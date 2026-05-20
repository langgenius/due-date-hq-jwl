import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from 'react-router'

import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatCents } from '@/lib/utils'

// Dashboard v2 "This week's exposure" — KPI mini-tiles that answer
// "where's the firm's exposure today?" without scanning rows. Each
// tile is a deep-link into Obligations with the matching filter.
// Zero-count segments drop.
//
// Per docs/Design/dashboard-actions-design-brief.md §4 / §6 and the
// 2026-05-20 redesign: bigger numerals, sans-serif (no mono), section
// title at h2 weight so it carries the row.

type Segment = {
  value: string
  label: string
  href: string
  tone: 'neutral' | 'critical'
}

function ExposureTile({ segment }: { segment: Segment }) {
  return (
    <Link
      to={segment.href}
      className={cn(
        'group flex min-w-[160px] flex-col gap-1 rounded-md border border-divider-subtle bg-background-default px-4 py-3 transition-colors hover:border-divider-regular hover:bg-background-default-hover',
      )}
    >
      <span
        className={cn(
          'text-2xl font-semibold leading-tight tabular-nums tracking-tight',
          segment.tone === 'critical' ? 'text-text-destructive' : 'text-text-primary',
        )}
      >
        {segment.value}
      </span>
      <span className="text-base text-text-secondary">{segment.label}</span>
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
      <section aria-label={t`This week's exposure`} className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">
          <Trans>This week's exposure</Trans>
        </h2>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-16 w-40" />
          <Skeleton className="h-16 w-40" />
          <Skeleton className="h-16 w-40" />
        </div>
      </section>
    )
  }

  // Build segments — drop zero-count entries.
  // Tone discipline: only `blocked` uses destructive — it's the one
  // genuinely-stuck signal. Everything else is neutral so the dashboard
  // stops feeling like a fire alarm.
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
      tone: 'critical',
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

  if (segments.length === 0) return null

  return (
    <section aria-label={t`This week's exposure`} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight text-text-primary">
        <Trans>This week's exposure</Trans>
      </h2>
      <div className="flex flex-wrap gap-3">
        {segments.map((segment) => (
          <ExposureTile key={segment.href} segment={segment} />
        ))}
      </div>
    </section>
  )
}

export { ExposureStrip }
