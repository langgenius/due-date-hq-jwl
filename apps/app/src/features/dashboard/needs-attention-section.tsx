import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, ArrowUpRightIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { usePulseDrawer } from '@/features/pulse/DrawerProvider'
import {
  usePulseListAlertsQueryOptions,
  usePulseSourceHealthQueryOptions,
} from '@/features/pulse/api'
import { sourcesNeedingAttention } from '@/features/pulse/lib/source-health-labels'

import { NeedsAttentionCard, NeedsAttentionOverflowCard } from './needs-attention-card'

// Dashboard "Needs attention" section — the new top surface that
// promotes Pulse alerts from a thin banner to first-class cards.
// Surfaces up to 2 active alerts inline; remaining alerts collapse
// into a "+N" tile that opens the Radar page. A thin
// "Source needs attention" banner sits above the cards when any
// monitored source is unhealthy.

const VISIBLE_ALERTS = 2

function SourceNeedsAttentionBanner({
  count,
  onReview,
  onHide,
}: {
  count: number
  onReview: () => void
  onHide: () => void
}) {
  return (
    // Banner: keep the warning-tinted bg (T4 allows banner tints) but
    // soften the chrome — drop the visible border, calmer typography
    // — per Q1 "no amber as a primary tone."
    <div className="flex items-center justify-between gap-3 rounded-md bg-state-warning-hover px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangleIcon className="size-4 shrink-0 text-text-warning" aria-hidden />
        <span className="font-medium text-text-primary">
          <Trans>Source needs attention</Trans>
        </span>
        <span className="text-xs tabular-nums text-text-tertiary">
          <Trans>{count} source</Trans>
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onReview}>
          <Trans>Review</Trans>
        </Button>
        <Button variant="ghost" size="sm" onClick={onHide}>
          <Trans>Hide</Trans>
        </Button>
      </div>
    </div>
  )
}

function NeedsAttentionSection() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { openDrawer: openAlert } = usePulseDrawer()
  const [bannerHidden, setBannerHidden] = useState(false)

  const alertsQuery = useQuery(usePulseListAlertsQueryOptions(5))
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())

  const alerts = alertsQuery.data?.alerts ?? []
  const sourceHealth = sourceHealthQuery.data?.sources ?? []
  const attentionSources = sourcesNeedingAttention(sourceHealth)
  const showSourceBanner = !bannerHidden && attentionSources.length > 0

  const visibleAlerts = alerts.slice(0, VISIBLE_ALERTS)
  const overflowCount = Math.max(alerts.length - VISIBLE_ALERTS, 0)
  const totalAlertCount = alerts.length
  const hasContent = showSourceBanner || alerts.length > 0

  if (!hasContent) return null

  return (
    <section aria-label={t`Pulse alerts`} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-text-primary">
          <Trans>Pulse alerts</Trans>
          {totalAlertCount > 0 ? (
            <span className="ml-2 font-mono text-sm font-normal tabular-nums text-text-tertiary">
              {totalAlertCount}
            </span>
          ) : null}
        </h2>
        <Link
          to="/rules/pulse"
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          <Trans>View all</Trans>
          <ArrowUpRightIcon className="size-3" aria-hidden />
        </Link>
      </div>

      {showSourceBanner ? (
        <SourceNeedsAttentionBanner
          count={attentionSources.length}
          onReview={() => void navigate('/rules/pulse?sourceReview=1#pulse-source-health')}
          onHide={() => setBannerHidden(true)}
        />
      ) : null}

      {alerts.length > 0 ? (
        // Cards fill the full content width. The +N overflow tile sits
        // as a third equal-width column so the row reads as three peers,
        // not "two cards plus a stub" — per the calm density register.
        <div
          className={cn(
            'grid items-stretch gap-3',
            alerts.length === 1 && 'grid-cols-1',
            alerts.length === 2 && 'grid-cols-2',
            overflowCount > 0 && 'grid-cols-3',
          )}
        >
          {visibleAlerts.map((alert) => (
            <div key={alert.id} className="h-full min-w-0">
              <NeedsAttentionCard alert={alert} onReview={() => openAlert(alert.id)} />
            </div>
          ))}
          {overflowCount > 0 ? (
            <NeedsAttentionOverflowCard
              count={overflowCount}
              onOpen={() => void navigate('/rules/pulse')}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export { NeedsAttentionSection }
