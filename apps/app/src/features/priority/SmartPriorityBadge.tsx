import { Trans } from '@lingui/react/macro'
import { GaugeIcon } from 'lucide-react'

import type { SmartPriorityBreakdown } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@duedatehq/ui/components/ui/popover'

function scoreTone(score: number): 'destructive' | 'warning' | 'info' | 'outline' {
  if (score >= 70) return 'destructive'
  if (score >= 45) return 'warning'
  if (score >= 25) return 'info'
  return 'outline'
}

export function SmartPriorityBadge({
  smartPriority,
  align = 'start',
}: {
  smartPriority: SmartPriorityBreakdown
  align?: 'start' | 'center' | 'end'
}) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={0}
        closeDelay={120}
        render={
          <button
            type="button"
            className="inline-flex max-w-full cursor-pointer items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          />
        }
      >
        <Badge variant={scoreTone(smartPriority.score)} className="text-xs">
          <GaugeIcon className="size-3" aria-hidden />
          <span className="tabular-nums">{smartPriority.score.toFixed(1)}</span>
          {smartPriority.rank ? <span className="tabular-nums">#{smartPriority.rank}</span> : null}
        </Badge>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-80 gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>
            <Trans>Smart Priority</Trans>
          </PopoverTitle>
        </PopoverHeader>
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-text-secondary">
              <Trans>Score</Trans>
            </span>
            <span className="text-lg font-semibold tabular-nums text-text-primary">
              {smartPriority.score.toFixed(1)}
            </span>
          </div>
          <div className="grid gap-2">
            {smartPriority.factors.length === 0 ? (
              <div className="rounded-md border border-divider-subtle bg-background-section px-3 py-2 text-xs text-text-secondary">
                <Trans>Hidden by role</Trans>
              </div>
            ) : null}
            {smartPriority.factors.map((factor) => (
              <div key={factor.key} className="grid gap-1">
                <div className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary">{factor.label}</p>
                    <p className="truncate text-text-tertiary">
                      {factor.rawValue} · {factor.sourceLabel}
                    </p>
                  </div>
                  <span className="tabular-nums text-text-secondary">
                    {Math.round(factor.weight * 100)}% · +{factor.contribution.toFixed(1)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-background-section">
                  <div
                    className="h-full rounded-full bg-state-accent-solid"
                    style={{ width: `${Math.max(4, factor.normalized * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
