import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, MegaphoneIcon, SlidersHorizontalIcon } from 'lucide-react'
import { Link } from 'react-router'

import { MVP_RULE_JURISDICTIONS } from '@duedatehq/core/rules'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { useAlertDrawer } from '@/features/alerts/DrawerProvider'
import {
  useActiveAlertCount,
  useAlertsAffectedClients,
  useAlertsListQueryOptions,
  useAlertSourceHealthQueryOptions,
} from '@/features/alerts/api'
import { MonitoringChip } from '@/features/alerts/components/MonitoringChip'

import { NeedsAttentionCard, NeedsAttentionQuietRow } from './needs-attention-card'

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

  // Visibility contract (verified 2026-06-12 — Yuqi: "what is the showing
  // mechanism?"): pulse.listAlerts returns only OPEN alerts — server filters
  // to firmAlert.status IN ('matched','partially_applied') on an approved
  // pulse, minus expired (packages/db repo pulse/scoped.ts). Mark reviewed /
  // dismiss / apply / revert all set a closing status, so the mutation's
  // invalidation drops the card from /today immediately and the alert moves
  // to /alerts/history. Nothing here re-filters by handled-state.
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
  // Impact-weighted ordering (critique): more affected clients = louder alert,
  // so it leads the row. The sort key is EXACTLY the number the card displays —
  // `matchedCount + needsReviewCount` (the card's `impacted`) — so the row
  // never reads unsorted. Pure row data: synchronous, no reorder-on-load.
  // `toSorted` is stable — ties keep the feed's recency order.
  const visibleAlerts = shownAlerts
    .toSorted((a, b) => b.matchedCount + b.needsReviewCount - (a.matchedCount + a.needsReviewCount))
    .slice(0, VISIBLE_ALERTS)
  // A card earns its ~150px height only when clients are affected (critique:
  // three bold no-impact cards were the loudest block on the page while their
  // own footer said "No client impact"). Zero-impact alerts demote to quiet
  // one-line rows in the same section — the fact survives, the volume drops.
  const cardAlerts = visibleAlerts.filter(
    (alert) => alert.matchedCount + alert.needsReviewCount > 0,
  )
  const quietAlerts = visibleAlerts.filter(
    (alert) => alert.matchedCount + alert.needsReviewCount === 0,
  )
  // One batched detail request for the visible cards instead of one
  // `getDetail` per card — the cards only need affected-client names.
  const affectedByAlert = useAlertsAffectedClients(cardAlerts.map((alert) => alert.id))
  const totalAlertCount = shownAlerts.length
  // "View all N" must quote the DESTINATION's total (the canonical active
  // count the /alerts page + sidebar badge use), not the count of cards this
  // section happens to show. They disagreed — nav said "9 active alerts"
  // while this read "View all 4" yet linked to a page with 9 (re-critique).
  // One number, one source. (totalAlertCount stays the section's own
  // stream length, which drives the caught-up empty state below.)
  const viewAllCount = useActiveAlertCount()
  // Describes jurisdiction coverage, not raw adapter count, so hidden
  // policy-watch adapters can grow without the header reading
  // "monitoring 150 sources."
  const hasNationalMonitoringCoverage =
    MVP_RULE_JURISDICTIONS.length === NATIONAL_MONITORING_JURISDICTION_COUNT

  // ── Loading → card-shaped skeletons. Without this branch the zero count
  //    masquerades as the "caught up" empty state for a beat on every load. ──
  if (alertsQuery.isLoading) {
    return (
      <section aria-label={t`Alerts`} aria-busy className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-region-title text-text-primary">
            <Trans>Alerts</Trans>
          </h2>
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Skeleton mirrors the loaded grid's breakpoints so the page
            doesn't reflow column-count when cards land. */}
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[150px] rounded-xl" />
          ))}
        </div>
      </section>
    )
  }

  // ── Calm feed → centered "caught up" empty state (Yuqi: match the mockup).
  //    The calm state earns a real illustration block now, not a thin line. ──
  if (totalAlertCount === 0) {
    const enabledSources = sources.filter((source) => source.enabled)
    const watchedSources = enabledSources.filter((source) => source.healthStatus !== 'paused')
    // No watched sources is only a real state once the health query has loaded
    // — during load we don't flash "no sources monitored".
    const noSources = !sourceHealthQuery.isLoading && watchedSources.length === 0
    // Real "last check" — the most recent poll across watched sources. Stays
    // null (line hidden) until a source has actually been checked: no
    // fabricated date.
    const lastCheckedIso = watchedSources
      .map((source) => source.lastCheckedAt)
      .filter((value): value is string => Boolean(value))
      .toSorted()
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
              <Trans>No alerts right now</Trans>
            )}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {noSources ? (
              <Trans>Turn on a monitored source and policy changes will show up here.</Trans>
            ) : exampleA && exampleB ? (
              <Trans>
                When {exampleA}, {exampleB}, or another monitored source publishes a change, it will
                land here.
              </Trans>
            ) : exampleA ? (
              <Trans>
                When {exampleA} or another monitored source publishes a change, it will land here.
              </Trans>
            ) : (
              <Trans>When a monitored source publishes a change, it will land here.</Trans>
            )}
            {lastCheckedLabel ? (
              <span className="text-text-tertiary">
                {' '}
                <Trans>Last checked {lastCheckedLabel}.</Trans>
              </span>
            ) : null}
          </p>
        </div>
        <TextLink
          variant="accent"
          size="sm"
          render={<Link to="/rules/sources" />}
          className="gap-1.5"
        >
          <SlidersHorizontalIcon className="size-4" aria-hidden />
          <Trans>Configure sources</Trans>
        </TextLink>
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
        {/* /today section titles share ONE voice — text-xl/600/dark ink
            (Priorities, Daily Brief, Alerts). 18px, one step above the 16px
            card headlines inside the section — the audit caught region anchor
            and item title colliding at the same size. See
            docs/Design/section-header-style.md. */}
        <h2 className="flex items-center gap-2 text-region-title text-text-primary">
          {/* The title word links to /alerts; the count badge + MonitoringChip
              stay as non-link siblings. */}
          <Link
            to="/alerts"
            className="rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Alerts</Trans>
          </Link>
          {/* No count chip beside the title (critique: two chips on one h2 is
              chip-soup; LIVE earns its slot, the count duplicates "View all").
              The count now rides inside the View-all link on the right. */}
          {hasNationalMonitoringCoverage ? (
            // Shared `<MonitoringChip>` so /today + /alerts render
            // identically. The passive (no `to`) variant keeps the
            // cursor-help + "National policy watch" explainer tooltip.
            <MonitoringChip />
          ) : null}
        </h2>
        {/* "View all N" link — opens the full /alerts surface from the section
            header; it carries the section count (demoted from the old title
            chip) so the number keeps one home. Canonical `<TextLink>` (the
            primitive this exact pattern exists for — the hand-rolled Link
            was a vocabulary violation), accent variant so the section's one
            navigation affordance reads as a link, not gray meta. */}
        <TextLink variant="accent" render={<Link to="/alerts" />} className="group shrink-0">
          <span className="tabular-nums">
            <Trans>View all {viewAllCount}</Trans>
          </span>
          {/* Micro-detail: the arrow nudges forward on hover — motion carried
              by the glyph, not the surface (no lifts/shadows). */}
          <ArrowRightIcon
            className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </TextLink>
      </div>

      {cardAlerts.length > 0 ? (
        // Horizontal grid: up to 3 alert cards sit as equal-width
        // parallel tiles like the rest of the dashboard surfaces.
        // Overflow surfaces via the section-level "View all" link.
        <div
          className={cn(
            // No `px-3` on the cards grid so card left edges align with
            // the section header above, the page H1, and the
            // ActionsTable wrapper below.
            // Responsive: a hard-coded 3-up squeezed cards to ~200px at
            // tablet widths (titles cut mid-word, source links truncated
            // to a bare ↗). Stack at base, pair at md, 3-up only ≥xl —
            // same xl baseline the /alerts surfaces use.
            'grid grid-cols-1 items-stretch gap-3',
            cardAlerts.length === 2 && 'md:grid-cols-2',
            cardAlerts.length >= 3 && 'md:grid-cols-2 xl:grid-cols-3',
          )}
        >
          {cardAlerts.map((alert) => (
            <div key={alert.id} className="h-full min-w-0">
              <NeedsAttentionCard
                alert={alert}
                affectedClients={affectedByAlert.get(alert.id) ?? []}
                onReview={() => openAlert(alert.id)}
              />
            </div>
          ))}
        </div>
      ) : null}

      {quietAlerts.length > 0 ? (
        // No-impact alerts — one quiet line each, not a 150px card. The
        // monitor still reports what changed; it just stops shouting about
        // changes that touch zero clients (critique: cards earn their height
        // only when clients are affected).
        <div className="flex flex-col">
          {quietAlerts.map((alert) => (
            <NeedsAttentionQuietRow
              key={alert.id}
              alert={alert}
              onReview={() => openAlert(alert.id)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export { NeedsAttentionSection }
