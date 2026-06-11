import { Trans } from '@lingui/react/macro'

import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'

/**
 * ActiveQueueChip — the green "Active" queue flag on due-date-overlay
 * alerts. One implementation shared by the /alerts row, the alert list
 * rail, and the detail drawer header.
 *
 * Chrome: outline Badge + success status dot. §4.10's ornament rule
 * bans filled-chip + dot (the fill already carries the tone, so the dot
 * is redundant); the dot IS this flag's identity — "live, actionable
 * queue" — so the chip goes outline and the dot carries the green.
 * Same recipe as AuthStatusPill / HealthBadge / the members rows.
 */
export function ActiveQueueChip() {
  return (
    <Badge variant="outline">
      <BadgeStatusDot tone="success" />
      <Trans>Active</Trans>
    </Badge>
  )
}
