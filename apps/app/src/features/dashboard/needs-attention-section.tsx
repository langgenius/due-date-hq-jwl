import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, MegaphoneIcon, SlidersHorizontalIcon } from 'lucide-react'
import { Link } from 'react-router'

import { MVP_RULE_JURISDICTIONS } from '@duedatehq/core/rules'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

import { useAlertDrawer } from '@/features/alerts/DrawerProvider'
import {
  useAlertsAffectedClients,
  useAlertsListQueryOptions,
  useAlertSourceHealthQueryOptions,
} from '@/features/alerts/api'
import { MonitoringChip } from '@/features/alerts/components/MonitoringChip'

import { NeedsAttentionCard } from './needs-attention-card'

// Dashboard "Alerts" section — promotes state-policy Alerts (the
// product's wedge: "a rule changed → here are the affected clients")
// to a first-class row.
//
// The section has two clearly different weights. When alerts are live
// it is the page's loudest block — a destructive-tinted hero card row.
// When the feed is calm it collapses to a single quiet status line (no
// tinted box), so an empty alerts state stops claiming hero real estate
// it hasn't earned.

// Grid is 3 cards wide in the wide-viewport row so the Today alerts
// surface mirrors the 3-card composition in the design. Overflow
// surfaces via the View all link below the grid (the design uses a
// section-level link rather than a per-card overflow column).
const VISIBLE_ALERTS = 3
const NATIONAL_MONITORING_JURISDICTION_COUNT = 52

// Aligned with the sidebar's `TODAY_ALERTS_LIMIT` so this page and the
// sidebar Alerts badge share a single React Query cache entry.
const TODAY_ALERTS_LIMIT = 50

function NeedsAttentionSection() {
  const { t } = useLingui()
  const { openDrawer: openAlert } = useAlertDrawer()

  const alertsQuery = useQuery(useAlertsListQueryOptions(TODAY_ALERTS_LIMIT))
  // Source-health rides alongside the alert count so an empty list can
  // distinguish "all good" from "feed paused / broken" — same UI,
  // opposite meaning.
  const sourceHealthQuery = useQuery(useAlertSourceHealthQueryOptions())
  const alerts = alertsQuery.data?.alerts ?? []
  const sources = sourceHealthQuery.data?.sources ?? []
  // Client-affecting first (Yuqi): an alert earns the Today slot only when it
  // matched a client's obligation — those are the ones that can move a deadline.
  // If nothing matched, fall back to the raw monitoring stream so the section
  // still shows what's being watched rather than going empty.
  const affectingAlerts = alerts.filter((alert) => alert.matchedCount > 0)
  const shownAlerts = affectingAlerts.length > 0 ? affectingAlerts : alerts
  const visibleAlerts = shownAlerts.slice(0, VISIBLE_ALERTS)
  // One batched detail request for the visible cards instead of one
  // `getDetail` per card — the cards only need affected-client names.
  const affectedByAlert = useAlertsAffectedClients(visibleAlerts.map((alert) => alert.id))
  const totalAlertCount = shownAlerts.length
  // Describes jurisdiction coverage, not raw adapter count, so hidden
  // policy-watch adapters can grow without the header reading
  // "monitoring 150 sources."
  const hasNationalMonitoringCoverage =
    MVP_RULE_JURISDICTIONS.length === NATIONAL_MONITORING_JURISDICTION_COUNT

  // ── Calm feed → centered "caught up" empty state (Yuqi: match the mockup).
  //    The calm state earns a real illustration block now, not a thin line. ──
  if (totalAlertCount === 0) {
    const enabledSources = sources.filter((source) => source.enabled)
    const watchedSources = enabledSources.filter((source) => source.healthStatus !== 'paused')
    const pausedCount = enabledSources.length - watchedSources.length
    // No watched sources is only a real state once the health query has loaded
    // — during load we don't flash "no sources monitored".
    const noSources = !sourceHealthQuery.isLoading && watchedSources.length === 0
    // Real "last check" — the most recent poll across watched sources. Stays
    // null (line hidden) until a source has actually been checked: no
    // fabricated date.
    const lastCheckedIso = watchedSources
      .map((source) => source.lastCheckedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1)
    const lastCheckedLabel = lastCheckedIso
      ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
          new Date(lastCheckedIso),
        )
      : null
    // Two real source labels make the "when X, Y… publishes" line concrete.
    const exampleA = watchedSources[0]?.label
    const exampleB = watchedSources[1]?.label

    return (
      <section
        aria-label={t`Alerts`}
        className="flex flex-col items-center justify-center gap-5 px-6 py-14 text-center"
      >
        {/* Megaphone in a light-accent disc — the alerts mark. Accent lives in
            the container + icon, not the text (no coloured text on calm bg). */}
        <span
          className="flex size-16 items-center justify-center rounded-full bg-state-accent-hover"
          aria-hidden
        >
          <MegaphoneIcon className="size-7 text-text-accent" strokeWidth={1.75} />
        </span>
        <div className="flex max-w-md flex-col gap-2">
          <h2 className="text-lg font-semibold text-text-primary">
            {noSources ? (
              <Trans>No sources monitored yet</Trans>
            ) : (
              <Trans>No alerts — you're caught up</Trans>
            )}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {noSources ? (
              <Trans>Turn on a monitored source and policy changes will show up here.</Trans>
            ) : exampleA && exampleB ? (
              <Trans>
                When {exampleA}, {exampleB}, or another monitored source publishes a change,
                it will land here.
              </Trans>
            ) : exampleA ? (
              <Trans>
                When {exampleA} or another monitored source publishes a change, it will land
                here.
              </Trans>
            ) : (
              <Trans>When a monitored source publishes a change, it will land here.</Trans>
            )}
            {lastCheckedLabel ? (
              <span className="text-text-tertiary">
                {' '}
                <Trans>Last check: {lastCheckedLabel}.</Trans>
              </span>
            ) : null}
          </p>
          {pausedCount > 0 ? (
            <p className="text-sm font-medium text-text-warning">
              <Plural
                value={pausedCount}
                one="# monitored source is paused"
                other="# monitored sources are paused"
              />
            </p>
          ) : null}
        </div>
        <Link
          to="/rules/sources"
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-text-accent underline-offset-2 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <SlidersHorizontalIcon className="size-4" aria-hidden />
          <Trans>Configure sources</Trans>
        </Link>
      </section>
    )
  }

  // ── Live alerts → hero card row ──
  return (
    <section
      aria-label={t`Alerts`}
      // No section-level destructive wash: painting the whole section
      // red whenever any alert is present is a section-level urgency
      // signal the design system has no pattern for (Card is per-block,
      // not per-section), and it's inconsistent with the un-washed
      // Actions-this-week section below. Per-alert urgency lives on the
      // individual `<NeedsAttentionCard>` chrome (the LowConfidenceBadge,
      // the source-link icon, the card's hover state) — the section
      // reads as a regular gap-rhythm section like every other one on
      // /today.
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        {/* /today section titles share ONE voice — text-lg/600/dark ink
            (Priorities, Daily Brief, Alerts) — replacing the old demoted
            eyebrow treatment (Yuqi: the page read lofi/weak; proper titles).
            See docs/Design/section-header-style.md. */}
        <h2 className="flex items-center gap-2 text-lg leading-tight font-semibold tracking-[-0.01em] text-text-primary">
          {/* The title word links to /alerts; the count badge + MonitoringChip
              stay as non-link siblings. */}
          <Link
            to="/alerts"
            className="rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Alerts</Trans>
          </Link>
          {totalAlertCount > 0 ? (
            // Bare count in a gray `outline` chip: the number is a scope
            // signal, not an urgency one — the PulsingDot + card chrome
            // already carry the alarm semantics.
            <Badge variant="outline" className="tabular-nums">
              <span>{totalAlertCount}</span>
            </Badge>
          ) : null}
          {hasNationalMonitoringCoverage ? (
            // Shared `<MonitoringChip>` so /today + /alerts render
            // identically. The passive (no `to`) variant keeps the
            // cursor-help + "National policy watch" explainer tooltip.
            <MonitoringChip />
          ) : null}
        </h2>
        {/* "View all" link — opens the full /alerts surface from the section
            header. */}
        <Link
          to="/alerts"
          className="inline-flex shrink-0 items-center gap-1 rounded-sm text-xs font-medium text-text-tertiary underline-offset-2 outline-none transition-colors hover:text-text-secondary hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <Trans>View all</Trans>
          <ArrowRightIcon className="size-3.5" aria-hidden />
        </Link>
      </div>

      {totalAlertCount > 0 ? (
        // Horizontal grid: up to 3 alert cards sit as equal-width
        // parallel tiles like the rest of the dashboard surfaces.
        // Overflow surfaces via the section-level "View all" link.
        <>
          <div
            className={cn(
              // No `px-3` on the cards grid so card left edges align with
              // the section header above, the page H1, and the
              // ActionsTable wrapper below.
              'grid items-stretch gap-3',
              alerts.length === 1 && 'grid-cols-1',
              alerts.length === 2 && 'grid-cols-2',
              alerts.length >= 3 && 'grid-cols-3',
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
          </div>
        </>
      ) : null}
    </section>
  )
}

export { NeedsAttentionSection }
