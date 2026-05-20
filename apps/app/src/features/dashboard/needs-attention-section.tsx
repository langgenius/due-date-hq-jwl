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

// Dashboard "Needs attention" section — top surface that promotes
// Pulse alerts from a thin banner to first-class cards.
// Surfaces up to 2 active alerts inline; remaining alerts collapse
// into a "+N" tile that opens the Radar page.
//
// Per 2026-05-20 redesign:
//  - Section title at h2 weight (text-xl semibold).
//  - When sources need attention, the warning sits inside the group
//    (tight gap), not as an orphan banner above the cards.
//  - Review carries primary weight; Hide is ghosted as the lesser
//    action.

const VISIBLE_ALERTS = 2

function SourceNeedsAttentionRow({
  sources,
  onReview,
  onHide,
}: {
  sources: { sourceId: string; label: string }[]
  onReview: () => void
  onHide: () => void
}) {
  const visible = sources.slice(0, 2)
  const overflow = Math.max(sources.length - visible.length, 0)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-state-warning-hover px-4 py-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        <AlertTriangleIcon className="size-4 shrink-0 text-text-warning" aria-hidden />
        <span className="text-text-primary">
          <Trans>
            <span className="tabular-nums">{sources.length}</span> source needs attention
          </Trans>
        </span>
        <span className="flex flex-wrap items-center gap-1">
          {visible.map((source) => (
            <span
              key={source.sourceId}
              className="inline-flex items-center rounded-sm border border-divider-subtle bg-background-default px-1.5 py-0.5 text-xs text-text-secondary"
            >
              {source.label}
            </span>
          ))}
          {overflow > 0 ? (
            <span className="text-xs text-text-tertiary">
              <Trans>+{overflow} more</Trans>
            </span>
          ) : null}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onHide}>
          <Trans>Hide</Trans>
        </Button>
        <Button variant="primary" size="sm" onClick={onReview}>
          <Trans>Review</Trans>
          <ArrowUpRightIcon data-icon="inline-end" className="size-3.5" />
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
    // Tight inner gap so header → source warning → cards reads as
    // one group instead of three orphan elements.
    <section aria-label={t`Pulse alerts`} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-baseline gap-2 text-xl font-semibold tracking-tight text-text-primary">
          <Trans>Pulse alerts</Trans>
          {totalAlertCount > 0 ? (
            <span className="text-base font-normal tabular-nums text-text-tertiary">
              {totalAlertCount}
            </span>
          ) : null}
        </h2>
        <Link
          to="/rules/pulse"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <Trans>View all</Trans>
          <ArrowUpRightIcon className="size-3.5" aria-hidden />
        </Link>
      </div>

      {showSourceBanner ? (
        <SourceNeedsAttentionRow
          sources={attentionSources}
          onReview={() => void navigate('/rules/pulse?sourceReview=1#pulse-source-health')}
          onHide={() => setBannerHidden(true)}
        />
      ) : null}

      {alerts.length > 0 ? (
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
