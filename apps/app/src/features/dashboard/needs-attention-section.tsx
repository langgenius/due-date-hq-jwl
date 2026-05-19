import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, ChevronsDownUpIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useNavigate } from 'react-router'

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
    <div className="flex items-center justify-between gap-3 rounded-md border border-state-warning-border bg-state-warning-hover px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangleIcon className="size-4 shrink-0 text-text-warning" aria-hidden />
        <span className="font-medium text-text-primary">
          <Trans>Source needs attention</Trans>
        </span>
        <span className="font-mono text-xs tabular-nums text-text-secondary">
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
  // Section-level collapse. The toggle reveals on hover at the end of
  // the section header row — keeps the chrome quiet by default but
  // gives the user an explicit way to dismiss the row when they've
  // already triaged today's alerts. Per design call 2026-05-19.
  const [collapsed, setCollapsed] = useState(false)

  const alertsQuery = useQuery(usePulseListAlertsQueryOptions(5))
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())

  const alerts = alertsQuery.data?.alerts ?? []
  const sourceHealth = sourceHealthQuery.data?.sources ?? []
  const attentionSources = sourcesNeedingAttention(sourceHealth)
  const showSourceBanner = !bannerHidden && attentionSources.length > 0

  const visibleAlerts = alerts.slice(0, VISIBLE_ALERTS)
  const overflowCount = Math.max(alerts.length - VISIBLE_ALERTS, 0)
  const hasContent = showSourceBanner || alerts.length > 0

  if (!hasContent) return null

  const totalCount = alerts.length + (showSourceBanner ? attentionSources.length : 0)

  return (
    <section aria-label={t`Needs attention`} className="group/needsAttention flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {/* Bumped from `text-xs font-medium` to a heavier presence —
          a tiny uppercase-red label reads as muted at glance, even
          though the CSS color IS destructive-red. Section-level
          attention badges should land like a banner header, not an
          eyebrow. Added an alert icon for redundant color signal. */}
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-destructive">
          <AlertTriangleIcon aria-hidden className="size-4 shrink-0" />
          <Trans>Needs attention</Trans>
          {collapsed && totalCount > 0 ? (
            <span className="font-mono normal-case tracking-normal text-text-tertiary">
              ({totalCount})
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t`Expand needs attention` : t`Collapse needs attention`}
          className={cn(
            'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs text-text-tertiary transition-opacity hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
            // Hidden by default; appears on hover anywhere in the
            // section. Always visible when already collapsed so the
            // expand affordance isn't itself hidden.
            collapsed ? 'opacity-100' : 'opacity-0 group-hover/needsAttention:opacity-100',
          )}
        >
          {collapsed ? (
            <>
              <ChevronsUpDownIcon className="size-3.5" aria-hidden />
              <Trans>Expand</Trans>
            </>
          ) : (
            <>
              <ChevronsDownUpIcon className="size-3.5" aria-hidden />
              <Trans>Collapse</Trans>
            </>
          )}
        </button>
      </div>

      {collapsed ? null : (
        <>
          {showSourceBanner ? (
            <SourceNeedsAttentionBanner
              count={attentionSources.length}
              onReview={() => void navigate('/rules/pulse?sourceReview=1#pulse-source-health')}
              onHide={() => setBannerHidden(true)}
            />
          ) : null}

          {alerts.length > 0 ? (
            // Layout by count, with deterministic equal-width columns
            // for the visible cards (grid > flex here — chip content
            // length was making flex cards look slightly different
            // widths in practice):
            //  - 1 alert  → capped max-width so it doesn't span the row
            //  - 2 alerts → grid-cols-2, two equal cards
            //  - 3+       → two equal cards + a fixed-width "+N" tile
            <div
              className={cn(
                'grid items-stretch gap-3',
                alerts.length === 1 && 'grid-cols-1 max-w-[560px]',
                alerts.length === 2 && 'grid-cols-2',
                overflowCount > 0 && 'grid-cols-[1fr_1fr_160px]',
              )}
            >
              {visibleAlerts.map((alert) => (
                <div key={alert.id} className="min-w-0">
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
        </>
      )}
    </section>
  )
}

export { NeedsAttentionSection }
