import { useLingui } from '@lingui/react/macro'

import type { PulseFirmAlertStatus } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

import { ALERT_STATUS_ICON, ALERT_STATUS_VARIANT } from './AlertStatusBadge'

/**
 * `AlertStatusChip` — the lifecycle status pill for a firm alert with an
 * optional pre-formatted timestamp suffix — "Awaiting decision · 2h",
 * "Applied · Mar 4". `matched` reads as **"Awaiting decision"** (a
 * display-only rename; the DB status stays `matched`, no migration).
 *
 * Built ON the Badge primitive with the shared `ALERT_STATUS_VARIANT` +
 * `ALERT_STATUS_ICON` maps from `AlertStatusBadge`, so the drawer hero
 * chip and the card-footer pill paint the same status the same way.
 * (Previously a hand-rolled span with its own warning/success/muted tone
 * map — `matched` read amber here and outline on the card, the exact
 * per-surface remapping the §4.10 tone ladder bans.)
 */
/** Status → human label. Exported so list rows / filters can reuse it. */
export function useAlertStatusLabels(): Record<PulseFirmAlertStatus, string> {
  const { t } = useLingui()
  return {
    matched: t`Awaiting decision`,
    applied: t`Applied`,
    partially_applied: t`Partially applied`,
    reviewed: t`Reviewed`,
    reverted: t`Reverted`,
    dismissed: t`Dismissed`,
  }
}

export function AlertStatusChip({
  status,
  timestamp,
  className,
}: {
  status: PulseFirmAlertStatus
  /** Pre-formatted suffix, e.g. "2h" or "Mar 4" — rendered after a "·". */
  timestamp?: string
  className?: string
}) {
  const labels = useAlertStatusLabels()
  const Icon = ALERT_STATUS_ICON[status]
  return (
    <Badge variant={ALERT_STATUS_VARIANT[status]} className={cn('whitespace-nowrap', className)}>
      <Icon aria-hidden />
      <span>
        {labels[status]}
        {timestamp ? ` · ${timestamp}` : ''}
      </span>
    </Badge>
  )
}
