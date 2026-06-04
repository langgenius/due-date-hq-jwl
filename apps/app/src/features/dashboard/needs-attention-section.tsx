import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CircleCheckIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { MVP_RULE_JURISDICTIONS } from '@duedatehq/core/rules'
import { cn } from '@duedatehq/ui/lib/utils'

import { useAlertDrawer } from '@/features/alerts/DrawerProvider'
import {
  useAlertsAffectedClients,
  useAlertsListQueryOptions,
  useAlertSourceHealthQueryOptions,
} from '@/features/alerts/api'
import { PulsingDot } from '@/features/alerts/components/PulsingDot'

import { NeedsAttentionCard, NeedsAttentionOverflowCard } from './needs-attention-card'

// Dashboard "Alerts" section — promotes state-policy Alerts (the
// product's wedge: "a rule changed → here are the affected clients")
// to a first-class row.
//
// 2026-06-03 (Yuqi B): the section now has two clearly different
// weights. When alerts are live it is the page's loudest block — a
// destructive-tinted hero card row. When the feed is calm it collapses
// to a single quiet status line (no tinted box), so an empty alerts
// state stops claiming hero real estate it hasn't earned. Previously
// the empty state rendered the same large tinted panel + dashed
// "No active alerts" banner as the live state, which read as the most
// important thing on the page even when nothing needed review.

const VISIBLE_ALERTS = 2
const NATIONAL_MONITORING_JURISDICTION_COUNT = 52

// 2026-05-24 (critique P0): aligned with the sidebar's
// `TODAY_ALERTS_LIMIT` so this page and the sidebar Alerts badge share
// a single React Query cache entry.
const TODAY_ALERTS_LIMIT = 50

function NeedsAttentionSection() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { openDrawer: openAlert } = useAlertDrawer()

  const alertsQuery = useQuery(useAlertsListQueryOptions(TODAY_ALERTS_LIMIT))
  // Source-health rides alongside the alert count so an empty list can
  // distinguish "all good" from "feed paused / broken" — same UI,
  // opposite meaning.
  const sourceHealthQuery = useQuery(useAlertSourceHealthQueryOptions())
  const alerts = alertsQuery.data?.alerts ?? []
  const sources = sourceHealthQuery.data?.sources ?? []
  const visibleAlerts = alerts.slice(0, VISIBLE_ALERTS)
  const overflowCount = Math.max(alerts.length - VISIBLE_ALERTS, 0)
  // One batched detail request for the visible cards instead of one
  // `getDetail` per card — the cards only need affected-client names.
  const affectedByAlert = useAlertsAffectedClients(visibleAlerts.map((alert) => alert.id))
  const totalAlertCount = alerts.length
  // Describes jurisdiction coverage, not raw adapter count, so hidden
  // policy-watch adapters can grow without the header reading
  // "monitoring 150 sources."
  const hasNationalMonitoringCoverage =
    MVP_RULE_JURISDICTIONS.length === NATIONAL_MONITORING_JURISDICTION_COUNT

  // ── Calm feed → thin single line, no tinted box ──
  if (totalAlertCount === 0) {
    const watchedCount = sources.filter(
      (source) => source.enabled && source.healthStatus !== 'paused',
    ).length
    const pausedCount = sources.filter(
      (source) => source.enabled && source.healthStatus === 'paused',
    ).length

    return (
      <section
        aria-label={t`Alerts`}
        className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 py-0.5 text-xs text-text-tertiary"
      >
        <CircleCheckIcon className="size-3.5 shrink-0 text-text-success" aria-hidden />
        <span className="font-medium text-text-secondary">
          <Trans>Alerts</Trans>
        </span>
        {hasNationalMonitoringCoverage ? (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <PulsingDot tone="success" active />
              <Trans>Monitoring Federal + 50 states + DC</Trans>
            </span>
          </>
        ) : null}
        <span aria-hidden>·</span>
        {sourceHealthQuery.isLoading ? (
          <span>
            <Trans>checking sources…</Trans>
          </span>
        ) : watchedCount === 0 ? (
          <span className="text-text-warning">
            <Trans>no sources monitored</Trans>
          </span>
        ) : pausedCount > 0 ? (
          <span className="inline-flex items-center gap-2">
            <span className="text-text-warning">
              <Plural value={pausedCount} one="# source paused" other="# sources paused" />
            </span>
            <Link
              to="/rules/sources"
              className="underline-offset-2 hover:text-text-secondary hover:underline"
            >
              <Trans>View</Trans>
            </Link>
          </span>
        ) : (
          <span>
            <Trans>nothing needs your review</Trans>
          </span>
        )}
      </section>
    )
  }

  // ── Live alerts → hero card row ──
  return (
    <section
      aria-label={t`Alerts`}
      className="flex flex-col gap-3 rounded-xl bg-state-destructive-hover p-3"
    >
      <div className="flex items-center gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-text-primary">
          <Trans>
            <Plural value={totalAlertCount} one="# Alert" other="# Alerts" />
          </Trans>
          {hasNationalMonitoringCoverage ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-state-base-hover px-2 py-1.5 text-xs font-medium tabular-nums text-text-secondary">
              <PulsingDot tone="success" active />
              <Trans>Monitoring Federal + 50 states + DC</Trans>
            </span>
          ) : null}
        </h2>
      </div>

      {/* Two alert cards sit side-by-side with a fixed 160px overflow
          column when there are extra alerts. */}
      <div
        className={cn(
          'grid items-stretch gap-3',
          alerts.length === 1 && 'grid-cols-1',
          alerts.length === 2 && 'grid-cols-2',
          overflowCount > 0 && 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]',
        )}
      >
        {visibleAlerts.map((alert) => (
          <div key={alert.id} className="h-full min-w-0">
            <NeedsAttentionCard
              alert={alert}
              affectedClients={affectedByAlert.get(alert.id) ?? []}
              onReview={() => openAlert(alert.id)}
            />
          </div>
        ))}
        {overflowCount > 0 ? (
          <NeedsAttentionOverflowCard count={overflowCount} onOpen={() => void navigate('/alerts')} />
        ) : null}
      </div>
    </section>
  )
}

export { NeedsAttentionSection }
