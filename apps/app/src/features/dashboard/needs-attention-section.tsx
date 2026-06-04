import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CircleCheckIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { MVP_RULE_JURISDICTIONS } from '@duedatehq/core/rules'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

import { TextLink } from '@duedatehq/ui/components/ui/text-link'

import { useAlertDrawer } from '@/features/alerts/DrawerProvider'
import {
  useAlertsAffectedClients,
  useAlertsListQueryOptions,
  useAlertSourceHealthQueryOptions,
} from '@/features/alerts/api'
import { PulsingDot } from '@/features/alerts/components/PulsingDot'

// 2026-05-31 (Yuqi Pencil Sq0EX): NeedsAttentionOverflowCard is no
// longer used in this section — the "View all" section link below
// the grid replaces the per-card overflow tile. The export is
// retained from the card module for any future callers.
import { NeedsAttentionCard } from './needs-attention-card'

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

// 2026-05-31 (Yuqi Pencil Sq0EX): grid widened from 2 to 3 cards
// in the wide-viewport row so the Today alerts surface mirrors the
// 3-card composition in the design. Overflow continues to expose
// the View all link below the grid; the per-card overflow column
// is dropped (the Pencil design uses a section-level link).
const VISIBLE_ALERTS = 3
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
      // 2026-05-26 (Yuqi sixty-ninth pass — "背景太浅了，看不出"):
      // alert-state background bumped from `/25` (basically
      // invisible) to a real solid `bg-state-destructive-hover`
      // + a destructive border so the panel actually reads as
      // "this is the alerts zone." Empty-state keeps the
      // neutral tint but adds a subtle border so the section
      // still has a shape on the page.
      // 2026-05-26 (Yuqi follow-up — "remove the border"): dropped
      // `border` + border-color rules. The destructive bg-tint
      // (when alerts are live) and the section bg (when empty)
      // already give the panel its shape against the page wash;
      // the explicit border was just doubling the boundary.
      // 2026-05-27 (audit-drain X1 D18 + Yuqi cross-route consistency):
      // empty-state and alerts-loaded paths now have different
      // outer styling. Alerts-loaded keeps the destructive-tinted
      // padded box (`p-3` + `gap-2.5` + `bg-state-destructive-hover`)
      // because the urgent rows earn that weight. Empty state drops
      // ALL outer styling — the inner `StatusBanner` primitive
      // provides its own dashed border, bg, and padding (matching
      // /rules/pulse and /clients), so wrapping it in a second
      // tinted padded box was double chrome. This compresses the
      // empty section more aggressively than D18's `gap-2 px-3 py-2`
      // while also unifying with the canonical StatusBanner shape.
      // 2026-05-28 (Yuqi /today polish): always set `gap-4` so the
      // section heading + body have the same rhythm as Actions this
      // 2026-05-31 (Yuqi DS-first revision): destructive-toned
      // panel wash dropped. The previous `bg-state-destructive-hover
      // p-3 rounded-xl` painted the entire section red whenever
      // any alert was present — even for low-severity informational
      // alerts. That's a section-level urgency signal that the
      // design system doesn't have a pattern for (Card primitive
      // is per-block, not per-section), and it inconsistent with
      // the un-washed Actions-this-week section below.
      //
      // Per-alert urgency now lives where it belongs — on the
      // individual `<NeedsAttentionCard>` chrome (the
      // LowConfidenceBadge, the source-link icon, the card's
      // hover state) — and the section reads as a regular
      // gap-rhythm section like every other one on /today.
      className="flex flex-col gap-3"
    >
      {/* 2026-05-31 (Yuqi DS-first revision): `px-3` now applied
          unconditionally — the outer destructive-toned wash was
          dropped, so the conditional padding compensation for the
          alerts-present case is no longer needed. The h2 left
          edge aligns with Actions-this-week's h2 in both states. */}
      <div className="flex items-center gap-3 px-3">
        {/* 2026-05-25 (Yuqi Today #1 — second pass): h2 stepped
            down text-xl → text-lg, matching the parallel change
            on Actions-this-week's h2. The page was reading as
            "too much bold and medium text" again — keeping
            `font-semibold` (anchor) but stepping a scale tier
            quieter so the section heading doesn't shout against
            the lighter row body. Count chip also drops from
            text-base → text-sm so the size hierarchy stays
            proportional.
            2026-05-27 (Yuqi header unification pass): chips now
            use the canonical pill (rounded-full bg + font-medium)
            instead of bare tertiary text, matching /clients,
            /deadlines, /today, /rules/pulse. Two chips when both
            signals are meaningful: monitoring (always when sources
            exist) + alert count (when > 0, destructive-toned). */}
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-text-primary">
          {/* 2026-05-31 (Yuqi Pencil Sq0EX): count peeled off the
              heading and into a separate `<Badge variant="destructive">`.
              Sticking to the canonical Badge primitive so tone
              tweaks in `badge.tsx` (or its underlying tokens)
              propagate here automatically — no hand-rolled pill
              styling. */}
          <Trans>Alerts</Trans>
          {totalAlertCount > 0 ? (
            <Badge variant="destructive" className="tabular-nums">
              {totalAlertCount}
            </Badge>
          ) : null}
          {/* 2026-05-31 (Yuqi Pencil Sq0EX): monitoring chip uses
              the canonical `<Badge variant="outline">` primitive
              (border-divider-regular + text-text-secondary +
              rounded-full) with `<PulsingDot tone="success" />`
              for the live signal. Stays inside the design system
              — no bespoke "white-bg pill" styling. */}
          {hasNationalMonitoringCoverage ? (
            <Badge variant="outline">
              <PulsingDot tone="success" active />
              <Trans>Monitoring Federal + 50 states + DC</Trans>
            </Badge>
          ) : null}
        </h2>
      </div>

      {totalAlertCount > 0 ? (
        // 2026-05-27 (Yuqi — "怎么会变成这样vertical"): restored
        // the horizontal grid layout. Two alert cards sit side-by-side
        // with a fixed 160px overflow column when there are extra
        // alerts. The full-width vertical stack read as a cramped
        // mini-inbox; the grid lets Today's alerts sit as parallel
        // tiles like the rest of the dashboard surfaces.
        // 2026-05-28 (cherry-pick conflict resolve): kept Yuqi's
        // deterministic grid over the earlier flex-wrap try — the
        // grid + 160px overflow column is the authored intent.
        // 2026-05-31 (Yuqi Pencil Sq0EX): grid bumped to support
        // 3 cards side by side. The overflow column previously
        // sat as a 160px sibling column; now overflow surfaces via
        // a section-level "View all" link below the grid (see
        // below) so all three card slots stay equal-width. The
        // fragment groups the grid + view-all link as siblings
        // under the same ternary branch.
        // 2026-05-31 (Yuqi DS-first revision): both the cards grid
        // and the view-all link now carry `px-3` since the outer
        // panel wash + its compensating padding were removed. Same
        // gutter rhythm as Actions-this-week below — sections look
        // consistent across the page.
        <>
          <div
            className={cn(
              'grid items-stretch gap-3 px-3',
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
          {overflowCount > 0 ? (
            <div className="flex justify-end px-3">
              {/* 2026-05-31 (Yuqi DS-first revision): now uses the
                  canonical `<TextLink>` primitive instead of a
                  hand-rolled `<button>` with text-muted/hover/focus
                  classes. Same canonical muted-inline-link shape
                  used by the "All deadlines" link on the Actions
                  section header. */}
              <TextLink
                onClick={() => void navigate('/alerts')}
                aria-label={t`View all ${alerts.length} alerts`}
              >
                <Trans>View all</Trans>
              </TextLink>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

export { NeedsAttentionSection }
