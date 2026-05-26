import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { Binoculars, CircleCheckIcon, CircleSlashIcon, TriangleAlertIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import type { PulseSourceHealth } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { usePulseDrawer } from '@/features/pulse/DrawerProvider'
import {
  usePulseListAlertsQueryOptions,
  usePulseSourceHealthQueryOptions,
} from '@/features/pulse/api'

import { NeedsAttentionCard, NeedsAttentionOverflowCard } from './needs-attention-card'

// Dashboard "Needs attention" section — top surface that promotes
// Pulse alerts from a first-class card row.

const VISIBLE_ALERTS = 2

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
      className={cn(
        'flex flex-col gap-2.5 rounded-xl border p-3',
        totalAlertCount > 0
          ? 'border-state-destructive-border bg-state-destructive-hover'
          : 'border-divider-subtle bg-background-section',
      )}
    >
      {/* 2026-05-25 (Yuqi Today follow-up — clarification): h2 is
          LEFT-aligned with "View all alerts" justify-between on the
          right. Earlier centring attempt (grid 1fr/auto/1fr) was
          misreading Yuqi's note — she meant the row should sit on
          the left, with the title + count sharing one visual midline
          (`items-center`). Matches the same correction made to the
          "Actions this week" h2 below. */}
      <div className="flex items-center justify-between gap-3">
        {/* 2026-05-25 (Yuqi Today #1 — second pass): h2 stepped
            down text-xl → text-lg, matching the parallel change
            on Actions-this-week's h2. The page was reading as
            "too much bold and medium text" again — keeping
            `font-semibold` (anchor) but stepping a scale tier
            quieter so the section heading doesn't shout against
            the lighter row body. Count chip also drops from
            text-base → text-sm so the size hierarchy stays
            proportional. */}
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-text-primary">
          <Trans>Alerts</Trans>
          {totalAlertCount > 0 ? (
            <span className="text-sm font-normal tabular-nums text-text-tertiary">
              {totalAlertCount}
            </span>
          ) : null}
        </h2>
        {/* 2026-05-25 (Yuqi Today #2 — second pass): "View all
            alerts" link demoted further — was text-sm text-tertiary
            (hover → secondary). Yuqi flagged it as still too
            prominent. Now text-xs text-muted (hover → tertiary)
            and the icon shrinks to size-3 so the affordance reads
            as quiet meta-text, not a sibling action to the h2.
            Click target preserved by the `inline-flex` block.
            2026-05-25 (Yuqi Today #3): trailing ArrowUpRight icon
            dropped — the rotation flourish on hover was novelty
            chrome that drew the eye to a navigation hint. Plain
            text "View all alerts" is enough. Same removal applied
            to the parallel "All deadlines" link in
            features/dashboard/actions-list.tsx. */}
        <Link
          to="/rules/pulse"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-tertiary"
        >
          <Trans>View all alerts</Trans>
        </Link>
      </div>

      {totalAlertCount > 0 ? (
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
              onOpen={() => void navigate('/rules/pulse')}
            />
          ) : null}
        </div>
      ) : (
        // 2026-05-26 (Yuqi Today #2 + #3): empty-state body. Two
        // signals stacked:
        //   1. "no alerts right now" — confirms the absence is
        //      intentional, not a missing render.
        //   2. Source health summary — tells the CPA whether the
        //      empty list means "monitored sources reporting
        //      clean" (good) or "feeds are degraded so absence
        //      is not informative" (bad).
        <AlertsEmptyState sources={sources} loading={sourceHealthQuery.isLoading} />
      )}
    </section>
  )
}

// 2026-05-26 (Yuqi Today #2 + #3): displayed in the Alerts section
// when there are zero active alerts. The first line tells the user
// nothing needs their attention; the second line gives a per-status
// rollup of the monitored regulatory sources so the CPA can tell
// "all quiet" from "feeds broken, we can't know."
function AlertsEmptyState({
  sources,
  loading,
}: {
  sources: readonly PulseSourceHealth[]
  loading: boolean
}) {
  const enabled = sources.filter((source) => source.enabled)
  const enabledCount = enabled.length
  const failingCount = enabled.filter(
    (source) => source.healthStatus === 'failing' || source.healthStatus === 'degraded',
  ).length
  const pausedCount = enabled.filter((source) => source.healthStatus === 'paused').length
  const allHealthy = enabledCount > 0 && failingCount === 0 && pausedCount === 0

  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <CircleCheckIcon className="size-4 text-text-success" aria-hidden />
        <Trans>No active alerts — nothing needs your review right now.</Trans>
      </p>
      {/* 2026-05-26 (Yuqi Today follow-up): the monitoring summary
          icon changed from CircleCheck → Binoculars. "Monitoring"
          is the meaningful state (watching N feeds for signal);
          CircleCheck made the line read as a second redundant
          "all good" confirmation when the line above already
          says nothing needs review. Binoculars conveys "watching
          / standing by," which is the actual semantic. CCTV was
          the alternative Yuqi suggested — binoculars feels less
          surveillance-y, more "regulatory feed scout." */}
      <p className="flex items-center gap-2 text-xs text-text-tertiary">
        {loading ? (
          <Trans>Checking monitored sources…</Trans>
        ) : enabledCount === 0 ? (
          <Trans>No sources are currently being monitored.</Trans>
        ) : allHealthy ? (
          <>
            <Binoculars className="size-3.5 text-text-tertiary" aria-label={'monitoring sources'} />
            <span>
              <Plural
                value={enabledCount}
                one="Monitoring # source. Receiving correctly."
                other="Monitoring # sources. Receiving correctly."
              />
            </span>
          </>
        ) : (
          <>
            {failingCount > 0 ? (
              <>
                <TriangleAlertIcon
                  className="size-3.5 text-text-warning"
                  aria-label={'sources failing'}
                />
                <span>
                  <Plural
                    value={failingCount}
                    one="# source not receiving correctly"
                    other="# sources not receiving correctly"
                  />
                </span>
              </>
            ) : null}
            {failingCount > 0 && pausedCount > 0 ? (
              <span aria-hidden className="text-text-tertiary">
                ·
              </span>
            ) : null}
            {pausedCount > 0 ? (
              <>
                <CircleSlashIcon
                  className="size-3.5 text-text-tertiary"
                  aria-label={'sources paused'}
                />
                <span>
                  <Plural value={pausedCount} one="# paused" other="# paused" />
                </span>
              </>
            ) : null}
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
            <Link
              to="/rules/pulse"
              className="underline-offset-2 hover:text-text-secondary hover:underline"
            >
              <Trans>Check sources</Trans>
            </Link>
          </>
        )}
      </p>
    </div>
  )
}

export { NeedsAttentionSection }
