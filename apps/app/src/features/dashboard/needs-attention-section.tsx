import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRightIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { cn } from '@duedatehq/ui/lib/utils'

import { usePulseDrawer } from '@/features/pulse/DrawerProvider'
import { usePulseListAlertsQueryOptions } from '@/features/pulse/api'

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
  const alerts = alertsQuery.data?.alerts ?? []
  const visibleAlerts = alerts.slice(0, VISIBLE_ALERTS)
  const overflowCount = Math.max(alerts.length - VISIBLE_ALERTS, 0)
  const totalAlertCount = alerts.length

  if (alerts.length === 0) return null

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
    <section
      aria-label={t`Alerts`}
      className="flex flex-col gap-3 rounded-2xl border border-components-badge-bg-warning-soft bg-state-destructive-hover/15 p-4"
    >
      {/* 2026-05-25 (Yuqi Today #35): h2 visually centered. Yuqi
          flagged the previous left/right justify-between as
          asymmetric — the eye lands on "Alerts" off-axis from the
          centered Today page below. Grid 1fr/auto/1fr keeps the title
          in the optical center while preserving the right-side
          "View all alerts" link in the rightmost slot. The leftmost
          slot is an invisible spacer so the title slot stays at
          true mid-page. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
        <span aria-hidden />
        <h2 className="flex items-baseline justify-center gap-2 text-xl font-semibold tracking-tight text-text-primary">
          <Trans>Alerts</Trans>
          {totalAlertCount > 0 ? (
            <span className="text-base font-normal tabular-nums text-text-tertiary">
              {totalAlertCount}
            </span>
          ) : null}
        </h2>
        {/* 2026-05-25 (Yuqi #3): copy clarified — was "View all"
            which was ambiguous next to the overflow card "View N
            more" (same destination, no obvious relation). Both
            now anchor on the same noun ("alerts"). #7: the icon
            rotates 45° on hover so the up-right arrow points
            straight right — a tactile "follow me" cue. */}
        <Link
          to="/rules/pulse"
          className="group/all inline-flex items-center justify-self-end gap-1 text-base text-text-secondary hover:text-text-primary"
        >
          <Trans>View all alerts</Trans>
          <ArrowUpRightIcon
            className="size-3.5 transition-transform duration-200 group-hover/all:rotate-45"
            aria-hidden
          />
        </Link>
      </div>

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
    </section>
  )
}

export { NeedsAttentionSection }
