import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { Link } from 'react-router'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { PulsingDot } from '@/features/alerts/components/PulsingDot'

/**
 * MonitoringChip — the "Monitoring: Federal · 50 States · DC" status chip.
 *
 * 2026-06-09 (Yuqi /alerts #2 "should be the same as you have on today page"):
 * extracted so `/today` (NeedsAttentionSection header) and `/alerts` (page
 * header title row) render the SAME chip — same dot + label + ghost-badge
 * treatment — instead of two hand-rolled variants that had drifted (the
 * /alerts copy was a bigger 13px Link with a trailing chevron; /today was a
 * 10px passive Badge). One component → no future drift.
 *
 * Variants:
 *   • passive (default, `/today`): non-interactive Badge, `cursor-help`,
 *     the "National policy watch" explainer tooltip.
 *   • navigating (`to` set, `/alerts`): same visual, rendered as a `<Link>`
 *     (cursor-pointer + hover deepen) so it doubles as the Sources affordance.
 *     NO trailing chevron — the nav cue is purely tonal, matching /today's look.
 *
 * `tooltip` overrides the tooltip body (e.g. `/alerts` passes live source-health
 * status) while keeping the chip itself identical across pages.
 */
const NATIONAL_POLICY_WATCH_TOOLTIP = (
  <div className="flex max-w-[280px] flex-col gap-1 text-left">
    <span className="font-semibold">
      <Trans>National policy watch</Trans>
    </span>
    <span>
      <Trans>
        Daily sweep of IRS + 50 states + DC tax authority sources for new rules, extended deadlines,
        rate changes, and form revisions. Matches against your clients' obligations and surfaces
        what actually affects you.
      </Trans>
    </span>
  </div>
)

export function MonitoringChip({
  to,
  tooltip,
  ariaLabel,
  className,
}: {
  to?: string
  tooltip?: ReactNode
  ariaLabel?: string
  className?: string
}) {
  const label = (
    <>
      <PulsingDot tone="success" active />
      <Trans>Monitoring: Federal · 50 States · DC</Trans>
    </>
  )
  const badgeClass = cn(
    'px-0 text-text-secondary',
    to ? 'cursor-pointer transition-colors hover:text-text-primary' : 'cursor-help',
    className,
  )
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) =>
          to ? (
            <Badge
              variant="ghost"
              size="sm"
              className={badgeClass}
              aria-label={ariaLabel}
              render={<Link to={to} />}
              {...props}
            >
              {label}
            </Badge>
          ) : (
            <Badge
              variant="ghost"
              size="sm"
              className={badgeClass}
              aria-label={ariaLabel}
              {...props}
            >
              {label}
            </Badge>
          )
        }
      />
      <TooltipContent>{tooltip ?? NATIONAL_POLICY_WATCH_TOOLTIP}</TooltipContent>
    </Tooltip>
  )
}
