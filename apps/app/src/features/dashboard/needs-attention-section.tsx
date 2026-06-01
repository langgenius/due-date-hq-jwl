import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CircleCheckIcon, CircleSlashIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import type { PulseSourceHealth } from '@duedatehq/contracts'
import { MVP_RULE_JURISDICTIONS } from '@duedatehq/core/rules'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

import { TextLink } from '@duedatehq/ui/components/ui/text-link'

import { usePulseDrawer } from '@/features/pulse/DrawerProvider'
import {
  usePulseListAlertsQueryOptions,
  usePulseSourceHealthQueryOptions,
} from '@/features/pulse/api'
import { PulsingDot } from '@/features/pulse/components/PulsingDot'
import { StatusBanner } from '@/components/patterns/status-banner'

// 2026-05-31 (Yuqi Pencil Sq0EX): NeedsAttentionOverflowCard is no
// longer used in this section — the "View all" section link below
// the grid replaces the per-card overflow tile. The export is
// retained from the card module for any future callers.
import { NeedsAttentionCard } from './needs-attention-card'

// Dashboard "Needs attention" section — top surface that promotes
// Pulse alerts from a first-class card row.

// 2026-05-31 (Yuqi Pencil Sq0EX): grid widened from 2 to 3 cards
// in the wide-viewport row so the Today alerts surface mirrors the
// 3-card composition in the design. Overflow continues to expose
// the View all link below the grid; the per-card overflow column
// is dropped (the Pencil design uses a section-level link).
const VISIBLE_ALERTS = 3
const NATIONAL_MONITORING_JURISDICTION_COUNT = 52

// 2026-05-24 (critique P0): aligned with the sidebar's
// `SIDEBAR_PULSE_LIMIT` so this page and the sidebar Alerts badge
// share a single React Query cache entry. Previously this section
// fetched 5 and the sidebar fetched the unified-inbox count from a
// different endpoint — three surfaces, three numbers.
const TODAY_ALERTS_LIMIT = 50

function NeedsAttentionSection() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { openDrawer: openAlert } = usePulseDrawer()

  const alertsQuery = useQuery(usePulseListAlertsQueryOptions(TODAY_ALERTS_LIMIT))
  // 2026-05-26 (Yuqi Today #3): also pull source-health so we can
  // surface "are we even receiving signal from the monitored
  // jurisdictions?" alongside the alert count. Without this, an
  // empty alerts list could mean either "all good" or "feed
  // broken" — same UI, opposite meaning.
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())
  const alerts = alertsQuery.data?.alerts ?? []
  const sources = sourceHealthQuery.data?.sources ?? []
  const visibleAlerts = alerts.slice(0, VISIBLE_ALERTS)
  const overflowCount = Math.max(alerts.length - VISIBLE_ALERTS, 0)
  const totalAlertCount = alerts.length
  // 2026-05-28 (national policy watch): this chip describes
  // jurisdiction coverage, not raw source/adapter count. Hidden
  // policy-watch adapters can grow without making the Today header
  // read as "monitoring 150 sources."
  const hasNationalMonitoringCoverage =
    MVP_RULE_JURISDICTIONS.length === NATIONAL_MONITORING_JURISDICTION_COUNT

  return (
    // 2026-05-25 (Yuqi review #4): Alerts is the most important
    // section on Today, but the previous flat layout made it sit at
    // the same visual weight as the work tiles below. Frame it with
    // a soft destructive tint + 12px padding so the eye lands on it
    // first. The frame also lets the section breathe inside its own
    // container instead of leaning on the page's outer gap.
    //
    // 2026-05-25 (Yuqi Today #4): bumped from `rounded-md` (6px) to
    // `rounded-2xl` (16px). On a section this large (full content
    // width × ~140px tall) the smaller radius read as a button
    // frame, not a card. 16px reads as a content surface — the same
    // family as the Pulse drawer's outer corners and the dashboard's
    // own NeedsAttentionCard tiles.
    // 2026-05-25 (GitHub-density pass): rounded-2xl → rounded-xl,
    // p-4 → p-3, inner gap-3 → gap-2.5. Reads as one tighter
    // information block rather than a generous tile. The tinted
    // bg still anchors the section visually without claiming a
    // large vertical share of the page.
    // 2026-05-25 (Yuqi Today #11): section tint stepped slightly
    // darker and the border dropped. The previous treatment
    // (`bg-state-destructive-hover/15` + soft border) sat too
    // close to the page bg to anchor the section. The new bg
    // (`/25`) reads as a clearly-tinted block without claiming
    // it's an alert in its own right.
    // 2026-05-26 (Yuqi Today #2): in the no-alerts case the
    // section used to unmount entirely (`return null`). That
    // hid a meaningful signal — "we're monitoring N sources
    // and nothing is wrong". Now the section ALWAYS renders;
    // the content adapts (alert cards vs "all clear" panel)
    // and the bg tone steps down to neutral when there's
    // nothing to act on.
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
                <NeedsAttentionCard alert={alert} onReview={() => openAlert(alert.id)} />
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
                onClick={() => void navigate('/rules/pulse')}
                aria-label={t`View all ${alerts.length} alerts`}
              >
                <Trans>View all</Trans>
              </TextLink>
            </div>
          ) : null}
        </>
      ) : (
        // 2026-05-26 (Yuqi Today #2 + #3): empty-state body. Two
        // signals stacked:
        //   1. "no alerts right now" — confirms the absence is
        //      intentional, not a missing render.
        //   2. Source health edge cases — the healthy-state signal
        //      lives in the heading chip as jurisdiction coverage,
        //      while paused/zero-source states remain in the body.
        <AlertsEmptyState sources={sources} loading={sourceHealthQuery.isLoading} />
      )}
    </section>
  )
}

// 2026-05-26 (Yuqi Today #2 + #3): displayed in the Alerts section
// when there are zero active alerts. The first line tells the user
// nothing needs their attention; a second line surfaces source-health
// status only when it carries non-redundant signal.
//
// 2026-05-27 (Yuqi header unification pass): the healthy-state
// "Monitoring N sources. New matches will appear here. · View sources"
// paragraph was dropped; the h2 now carries jurisdiction coverage
// instead of raw source count, so a second restatement would be
// redundant chrome.
// The paused-state warning and the "no sources monitored at all"
// branch were retained because the chip does NOT surface those
// states; they remain meaningful here. The loading branch was
// also retained so users see "checking…" before the chip flickers in.
function AlertsEmptyState({
  sources,
  loading,
}: {
  sources: readonly PulseSourceHealth[]
  loading: boolean
}) {
  // 2026-05-26 (Step 6 UX audit #43): aria-labels below were
  // hardcoded English strings — 'sources paused'. Lifted to `t`
  // macro so non-English assistive-tech users get a localized
  // announcement.
  const { t } = useLingui()
  const watchedCount = sources.filter(
    (source) => source.enabled && source.healthStatus !== 'paused',
  ).length
  const pausedCount = sources.filter(
    (source) => source.enabled && source.healthStatus === 'paused',
  ).length

  const supportingLine = loading ? (
    <Trans>Checking monitored sources…</Trans>
  ) : watchedCount === 0 ? (
    <Trans>No sources are currently being monitored.</Trans>
  ) : pausedCount > 0 ? (
    <>
      <CircleSlashIcon className="size-3.5 text-text-tertiary" aria-label={t`sources paused`} />
      <span>
        <Plural value={pausedCount} one="# paused" other="# paused" />
      </span>
      <span aria-hidden className="text-text-tertiary">
        ·
      </span>
      {/* 2026-05-31 (Yuqi DS-first revision): hand-rolled inline
          link replaced with the canonical `<TextLink>` primitive.
          The parent span is `text-xs`, so the default size (text-xs)
          matches the surrounding text density. */}
      <TextLink
        variant="muted"
        size="default"
        className="underline-offset-2 hover:underline"
        render={<Link to="/rules/sources" />}
      >
        <Trans>View sources</Trans>
      </TextLink>
    </>
  ) : null

  // 2026-05-28 (Yuqi /today polish — "信息重复了"): when the section
  // is healthy AND the supporting line carries no substantive issue
  // (no paused sources / no loading / sources monitored > 0), the
  // dashed StatusBanner body just restates what the h2 + green
  // "Monitoring N jurisdictions" chip already said — "we're watching,
  // nothing to act on." Drop the banner in that case; the header row
  // is the full empty state. The banner only renders when it carries
  // non-redundant signal (paused / loading / zero-sources), where the
  // chip alone wouldn't tell the story.
  if (!supportingLine) {
    return null
  }
  return (
    <StatusBanner indicator={<CircleCheckIcon className="size-4 text-text-success" aria-hidden />}>
      <span className="flex flex-col gap-1">
        <span className="text-sm text-text-secondary">
          <Trans>No active alerts — nothing needs your review right now.</Trans>
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
          {supportingLine}
        </span>
      </span>
    </StatusBanner>
  )
}

export { NeedsAttentionSection }
