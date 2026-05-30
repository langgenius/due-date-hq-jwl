import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CircleCheckIcon, CircleSlashIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import type { PulseSourceHealth } from '@duedatehq/contracts'
import { MVP_RULE_JURISDICTIONS } from '@duedatehq/core/rules'
import { cn } from '@duedatehq/ui/lib/utils'

import { useAlertDrawer } from '@/features/alerts/DrawerProvider'
import { useAlertsListQueryOptions, useAlertSourceHealthQueryOptions } from '@/features/alerts/api'
import { PulsingDot } from '@/features/alerts/components/PulsingDot'
import { StatusBanner } from '@/components/patterns/status-banner'

import { NeedsAttentionCard, NeedsAttentionOverflowCard } from './needs-attention-card'

// Dashboard "Needs attention" section — top surface that promotes
// Alerts from a first-class card row.

const VISIBLE_ALERTS = 2
const NATIONAL_MONITORING_JURISDICTION_COUNT = 52

// 2026-05-24 (critique P0): aligned with the sidebar's
// `TODAY_ALERTS_LIMIT` so this page and the sidebar Alerts badge
// share a single React Query cache entry. Previously this section
// fetched 5 and the sidebar fetched the unified-inbox count from a
// different endpoint — three surfaces, three numbers.
const TODAY_ALERTS_LIMIT = 50

function NeedsAttentionSection() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { openDrawer: openAlert } = useAlertDrawer()

  const alertsQuery = useQuery(useAlertsListQueryOptions(TODAY_ALERTS_LIMIT))
  // 2026-05-26 (Yuqi Today #3): also pull source-health so we can
  // surface "are we even receiving signal from the monitored
  // jurisdictions?" alongside the alert count. Without this, an
  // empty alerts list could mean either "all good" or "feed
  // broken" — same UI, opposite meaning.
  const sourceHealthQuery = useQuery(useAlertSourceHealthQueryOptions())
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
    // family as the alert drawer's outer corners and the dashboard's
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
      // /alerts and /clients), so wrapping it in a second
      // tinted padded box was double chrome. This compresses the
      // empty section more aggressively than D18's `gap-2 px-3 py-2`
      // while also unifying with the canonical StatusBanner shape.
      // 2026-05-28 (Yuqi /today polish): always set `gap-4` so the
      // section heading + body have the same rhythm as Actions this
      // week. Previously empty state had 0 gap (heading sat flush
      // against the dashed StatusBanner), while alerts-present had
      // gap-2.5. Now both states match the dashboard's section gap.
      // 2026-05-29 (Yuqi /today follow-up): inter-section gap tightened
      // gap-4 → gap-3 to match Actions this week's new internal
      // rhythm. Universal "gap smaller — apply to everywhere" pass.
      //
      // 2026-05-29 (Yuqi /today round 4): the destructive bg-tint +
      // p-3 now ALWAYS render, regardless of alert count. Empty state
      // used to drop the bg entirely, which made the section read as
      // "no section, just a heading" instead of "the alerts zone is
      // calm right now." Keeping the frame consistent across both
      // states gives Today a stable left-column rhythm — the
      // alerts-tint anchors the section even when nothing's wrong,
      // and the StatusBanner inside still uses success tone so
      // urgency is signalled by CONTENT, not chrome.
      className="flex flex-col gap-3 rounded-xl bg-state-destructive-hover p-3"
    >
      {/* 2026-05-27 (Yuqi feedback: "去掉view all alerts. 点击+2 more
          就是去viewall"): the trailing "View all alerts" link was
          dropped because the `+ N more` overflow tile already
          navigates to the same /alerts destination. With one
          remaining child, the flex justify-between scaffolding is
          unnecessary — the h2 sits alone on its row.

          2026-05-29 (Yuqi /today round 4 — "no left padding when it is
          encapsulated inside another frame"): h2 row drops its
          internal `px-3` since the outer section now always carries
          `p-3` (see comment above). Double-padding was making the
          heading sit visually inset from the bg-tint frame; flush
          alignment with the panel edge is cleaner. */}
      <div className="flex items-center gap-3">
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
            /deadlines, /today, /alerts. Two chips when both
            signals are meaningful: monitoring (always when sources
            exist) + alert count (when > 0, destructive-toned). */}
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-text-primary">
          {/* 2026-05-27 (Yuqi feedback: "the numbers are part of the
              title. write 4 Alerts"): count + noun read as one phrase
              at the heading type-style. Number prefix matches the
              "10 Actions this week" pattern. When no alerts exist,
              the heading collapses to the bare noun. */}
          {totalAlertCount > 0 ? (
            <Trans>
              <Plural value={totalAlertCount} one="# Alert" other="# Alerts" />
            </Trans>
          ) : (
            <Trans>Alerts</Trans>
          )}
          {hasNationalMonitoringCoverage ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-state-base-hover px-2 py-1.5 text-xs font-medium tabular-nums text-text-secondary">
              <PulsingDot tone="success" active />
              <Trans>Monitoring Federal + 50 states + DC</Trans>
            </span>
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
              <NeedsAttentionCard alert={alert} onReview={() => openAlert(alert.id)} />
            </div>
          ))}
          {overflowCount > 0 ? (
            <NeedsAttentionOverflowCard
              count={overflowCount}
              onOpen={() => void navigate('/alerts')}
            />
          ) : null}
        </div>
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
      <Link
        to="/rules/sources"
        className="underline-offset-2 hover:text-text-secondary hover:underline"
      >
        <Trans>View sources</Trans>
      </Link>
    </>
  ) : null

  // 2026-05-28 (Yuqi /today polish — "信息重复了"): when the section
  // is healthy AND the supporting line carries no substantive issue
  // we used to drop the banner entirely. That left the Alerts section
  // with only the h2 row — no body, no gap, the eye saw a stacked
  // pair of headings instead of a section with content.
  //
  // 2026-05-29 (Yuqi /today round 3 — "no gap here? follow the gap"):
  // restored a single-line affirmation in the healthy empty state so
  // the section consistently renders body content (h2 + body), giving
  // the section the same "header → gap-3 → body" rhythm as Actions
  // this week. The supporting line is folded inline only when it
  // carries non-redundant signal (paused / loading / zero-sources).
  return (
    <StatusBanner indicator={<CircleCheckIcon className="size-4 text-text-success" aria-hidden />}>
      <span className="flex flex-col gap-1">
        <span className="text-sm text-text-secondary">
          <Trans>No active alerts — nothing needs your review right now.</Trans>
        </span>
        {supportingLine ? (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
            {supportingLine}
          </span>
        ) : null}
      </span>
    </StatusBanner>
  )
}

export { NeedsAttentionSection }
