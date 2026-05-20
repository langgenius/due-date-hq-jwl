import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, ArrowUpRightIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { usePulseDrawer } from '@/features/pulse/DrawerProvider'
import {
  usePulseListAlertsQueryOptions,
  usePulseSourceHealthQueryOptions,
} from '@/features/pulse/api'
import { sourcesNeedingAttention } from '@/features/pulse/lib/source-health-labels'

import { NeedsAttentionCard, NeedsAttentionOverflowCard } from './needs-attention-card'

// Dashboard "Needs attention" section — top surface that promotes
// Pulse alerts from a first-class card row.
//
// Source-health warnings (a Pulse source can't be fetched) are
// **system-status** signals, not Pulse alerts — surfaced as a
// separate row above this section. See SystemStatusRow below.

const VISIBLE_ALERTS = 2

function SystemStatusRow() {
  const navigate = useNavigate()
  const [hidden, setHidden] = useState(false)
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())
  const sourceHealth = sourceHealthQuery.data?.sources ?? []
  const attentionSources = sourcesNeedingAttention(sourceHealth)
  if (hidden || attentionSources.length === 0) return null
  const visible = attentionSources.slice(0, 2)
  const overflow = Math.max(attentionSources.length - visible.length, 0)
  return (
    <section aria-label="System status" className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-tight text-text-primary">
        <Trans>System status</Trans>
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-state-warning-hover px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-base">
          <AlertTriangleIcon className="size-4 shrink-0 text-text-warning" aria-hidden />
          <span className="text-text-primary">
            <Trans>
              <span className="tabular-nums">{attentionSources.length}</span> source needs attention
            </Trans>
          </span>
          <span className="flex flex-wrap items-center gap-1">
            {visible.map((source) => (
              <span
                key={source.sourceId}
                className="inline-flex items-center rounded-sm border border-divider-subtle bg-background-default px-1.5 py-0.5 text-xs text-text-secondary"
              >
                {source.label}
              </span>
            ))}
            {overflow > 0 ? <span className="text-xs text-text-tertiary">+{overflow}</span> : null}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setHidden(true)}>
            <Trans>Hide</Trans>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void navigate('/rules/pulse?sourceReview=1#pulse-source-health')}
          >
            <Trans>Review</Trans>
          </Button>
        </div>
      </div>
    </section>
  )
}

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
    <section aria-label={t`Pulse alerts`} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-baseline gap-2 text-xl font-semibold tracking-tight text-text-primary">
          <Trans>Pulse alerts</Trans>
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

export { NeedsAttentionSection, SystemStatusRow }
