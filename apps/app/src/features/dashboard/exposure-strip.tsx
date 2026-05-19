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
  label: string
  href: string
  tone: 'neutral' | 'warning' | 'destructive'
}

function ExposureSegment({ segment, isFirst }: { segment: Segment; isFirst: boolean }) {
  return (
    <>
      {isFirst ? null : (
        <span aria-hidden className="text-text-tertiary">
          ·
        </span>
      )}
      <Link
        to={segment.href}
        className={cn(
          'inline-flex items-center font-mono text-xs tabular-nums transition-colors hover:text-text-primary',
          segment.tone === 'destructive' && 'text-text-destructive',
          segment.tone === 'warning' && 'text-text-warning',
          segment.tone === 'neutral' && 'text-text-secondary',
        )}
      >
        {segment.label}
      </Link>
    </>
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
      <section
        aria-label={t`This week's exposure`}
        className="flex flex-col gap-2 rounded-md border border-divider-subtle bg-background-subtle px-4 py-3"
      >
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
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
      label: t`${needDecisionCount} need your decision`,
      href: '/obligations?status=review',
      tone: 'neutral',
    })
  }
  if (canSeeDollars && totalExposureCents > 0) {
    segments.push({
      label: t`${formatCents(totalExposureCents)} at risk`,
      href: '/obligations?sort=exposure-desc',
      tone: 'neutral',
    })
  }
  if (blockedCount > 0) {
    segments.push({
      label: t`${blockedCount} blocked`,
      href: '/obligations?status=blocked',
      tone: 'destructive',
    })
  }
  if (waitingOnClientCount > 0) {
    segments.push({
      label: t`${waitingOnClientCount} waiting on client`,
      href: '/obligations?status=waiting_on_client',
      tone: 'neutral',
    })
  }

  // Nothing to show — render nothing rather than empty chrome.
  if (segments.length === 0) return null

  return (
    <section
      aria-label={t`This week's exposure`}
      className="flex flex-col gap-2 rounded-md border border-divider-subtle bg-background-subtle px-4 py-3"
    >
      <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
        <Trans>This week's exposure</Trans>
      </h2>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {segments.map((segment, index) => (
          <ExposureSegment key={segment.href} segment={segment} isFirst={index === 0} />
        ))}
      </div>
    </section>
  )
}

export { ExposureStrip }
