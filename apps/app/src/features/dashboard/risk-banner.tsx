import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

export interface RiskBannerProps {
  title: ReactNode
  detail?: ReactNode
  source?: ReactNode
  action?: ReactNode
  className?: string
}

export function RiskBanner({ title, detail, source, action, className }: RiskBannerProps) {
  return (
    <div
      className={cn(
        'grid gap-1 rounded-md border border-divider-regular bg-components-badge-bg-warning-soft p-4 text-text-primary',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-md font-medium">{title}</span>
        {source ? <span className="shrink-0">{source}</span> : null}
      </div>
      {detail ? <span className="text-md text-text-secondary">{detail}</span> : null}
      {action ? <div className="flex justify-end">{action}</div> : null}
    </div>
  )
}
