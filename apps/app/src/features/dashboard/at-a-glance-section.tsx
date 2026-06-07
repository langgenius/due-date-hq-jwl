import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CalendarClockIcon, CircleAlertIcon, RadioIcon, TriangleAlertIcon } from 'lucide-react'

import type { DashboardSummary } from '@duedatehq/contracts'

import { formatCents } from '@/lib/utils'
import { useAlertsListQueryOptions } from '@/features/alerts/api'

import { GlanceTile } from './glance-tile'

// Shared cap with NeedsAttentionSection / the sidebar Alerts badge so
// the MORNING SWEEP count reads from the same React Query cache entry
// (no extra round-trip — the page already loads this list).
const TODAY_ALERTS_LIMIT = 50

/**
 * DashboardAtAGlance — the "AT A GLANCE" tile row from Pencil node
 * `bAULB` (/today). Four equal-width tiles summarising the day:
 *
 *   1. AT RISK — total accrued penalty exposure (money headline) +
 *      a "N ready · N need inputs" breakdown.
 *   2. TODAY — count of deadlines due today that still need work.
 *   3. MORNING SWEEP — high-impact regulatory alerts from the Pulse
 *      feed (count of active alerts).
 *   4. NEEDS YOU — items awaiting the CPA's review (rejections,
 *      e-sign, evidence sign-off).
 *
 * Each tile drills into the matching filtered surface. The row wraps
 * to a 2×2 grid on tablet and a single column on phones so the tiles
 * never clip.
 *
 * All figures come from the existing `dashboard.load` summary (no
 * contract change) except the alert count, which is passed in from
 * the alerts query the page already runs.
 */
export function DashboardAtAGlance({
  summary,
  dueTodayCount,
  isLoading,
}: {
  summary: DashboardSummary | undefined
  /** Deadlines due today that still need work (derived from topRows). */
  dueTodayCount: number | undefined
  isLoading: boolean
}) {
  const { t } = useLingui()
  const alertsQuery = useQuery(useAlertsListQueryOptions(TODAY_ALERTS_LIMIT))
  const activeAlertCount = alertsQuery.data?.alerts.length
  const loading = isLoading || !summary

  const atRiskValue = loading ? undefined : formatCents(summary.totalAccruedPenaltyCents)
  const readyCount = summary?.accruedPenaltyReadyCount ?? 0
  const needInputCount = summary?.accruedPenaltyNeedsInputCount ?? 0

  return (
    <section aria-label={t`At a glance`} className="flex flex-col gap-2">
      <span className="text-[10px] font-bold tracking-[1px] text-text-muted uppercase">
        <Trans>At a glance</Trans>
      </span>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <GlanceTile
          icon={TriangleAlertIcon}
          tone="warning"
          emphasis
          label={<Trans>At risk</Trans>}
          value={atRiskValue}
          sub={
            <Trans>
              {readyCount} ready · {needInputCount} need inputs
            </Trans>
          }
          href="/deadlines?status=blocked"
          ariaLabel={t`View at-risk deadlines`}
        />
        <GlanceTile
          icon={CalendarClockIcon}
          tone="neutral"
          label={<Trans>Today</Trans>}
          value={
            loading ? undefined : (
              <Plural value={dueTodayCount ?? 0} one="# deadline" other="# deadlines" />
            )
          }
          sub={<Trans>that need your attention before EOD</Trans>}
          href="/deadlines"
          ariaLabel={t`View deadlines due today`}
        />
        <GlanceTile
          icon={RadioIcon}
          tone="neutral"
          label={<Trans>Morning sweep</Trans>}
          value={
            activeAlertCount === undefined ? undefined : (
              <Plural
                value={activeAlertCount}
                one="# regulatory change"
                other="# regulatory changes"
              />
            )
          }
          sub={<Trans>matched against your clients today</Trans>}
          href="/alerts"
          ariaLabel={t`Review today's regulatory changes`}
        />
        <GlanceTile
          icon={CircleAlertIcon}
          tone="accent"
          label={<Trans>Needs you</Trans>}
          value={
            loading ? undefined : (
              <Plural
                value={summary.needsReviewCount}
                one="# item awaiting you"
                other="# items awaiting you"
              />
            )
          }
          sub={
            <Plural
              value={summary?.evidenceGapCount ?? 0}
              one="# with an evidence gap"
              other="# with evidence gaps"
            />
          }
          href="/deadlines?status=review"
          ariaLabel={t`View items needing your review`}
        />
      </div>
    </section>
  )
}
