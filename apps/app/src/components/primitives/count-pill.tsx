import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * CountPill — the calm destructive "N active / N overdue" status pill shared by
 * the alerts page header and the alert/deadline list-rail heads.
 *
 * The one canonical treatment — a soft `#fef3f2` fill, a red dot, destructive
 * text — so the same status reads identically wherever it shows. It is a STATUS
 * indicator, not a button (no hover/press affordance).
 */
export function CountPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        // `leading-none` so the pill keeps its own ~18px height instead of
        // inheriting the line-height of whatever title it sits beside — next to
        // the 28px page-header title the inherited 32px line-box made it 38px
        // tall.
        'inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[#fef3f2] px-2 text-sm leading-none font-medium text-text-destructive tabular-nums',
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-text-destructive" aria-hidden />
      {children}
    </span>
  )
}
