import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent } from '@duedatehq/ui/components/ui/card'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * KpiStat — the canonical "at-a-glance count" cell used at the top of list
 * pages (Members, Workload, Opportunities, Reminders, Clients).
 *
 * Visual contract:
 *   - uppercase tracking-[0.08em] text-tertiary label (top)
 *   - text-2xl tabular-nums font-semibold value (middle)
 *   - text-xs text-text-muted caption (bottom, optional)
 *   - optional icon top-right (28px square)
 *   - optional intent color on the value (neutral · critical · warning)
 *
 * Use this everywhere a list page surfaces summary counts. Don't roll your
 * own — five inline variants is what we're collapsing here.
 */

export type KpiIntent = 'neutral' | 'critical' | 'warning'

export type KpiStatProps = {
  label: ReactNode
  value: ReactNode
  caption?: ReactNode
  icon?: LucideIcon
  intent?: KpiIntent
  isLoading?: boolean
}

export function KpiStat({
  label,
  value,
  caption,
  icon: Icon,
  intent = 'neutral',
  isLoading = false,
}: KpiStatProps) {
  return (
    <Card>
      <CardContent className="flex min-h-[96px] items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
            {label}
          </span>
          {isLoading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <span
              className={cn(
                'text-2xl leading-tight font-semibold tabular-nums text-text-primary',
                intent === 'critical' && 'text-text-destructive',
                intent === 'warning' && 'text-text-warning',
              )}
            >
              {value}
            </span>
          )}
          {caption ? <span className="text-xs leading-5 text-text-muted">{caption}</span> : null}
        </div>
        {Icon ? (
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-md bg-background-subtle text-text-tertiary"
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  )
}
