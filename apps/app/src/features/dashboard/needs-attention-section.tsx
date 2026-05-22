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

function NeedsAttentionSection() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { openDrawer: openAlert } = usePulseDrawer()

  const alertsQuery = useQuery(usePulseListAlertsQueryOptions(5))
  const alerts = alertsQuery.data?.alerts ?? []
  const visibleAlerts = alerts.slice(0, VISIBLE_ALERTS)
  const overflowCount = Math.max(alerts.length - VISIBLE_ALERTS, 0)
  const totalAlertCount = alerts.length

  if (alerts.length === 0) return null

  return (
    <section aria-label={t`Alerts`} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-baseline gap-2 text-xl font-semibold tracking-tight text-text-primary">
          <Trans>Alerts</Trans>
          {totalAlertCount > 0 ? (
            <span className="text-base font-normal tabular-nums text-text-tertiary">
              {totalAlertCount}
            </span>
          ) : null}
        </h2>
        <Link
          to="/rules/pulse"
          className="inline-flex items-center gap-1 text-base text-text-secondary hover:text-text-primary"
        >
          <Trans>View all</Trans>
          <ArrowUpRightIcon className="size-3.5" aria-hidden />
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
