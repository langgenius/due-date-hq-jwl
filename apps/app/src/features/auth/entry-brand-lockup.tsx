import type { ReactNode } from 'react'

import brandMark from '@duedatehq/ui/assets/brand/brand-favicon.svg?url'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

interface EntryBrandLockupProps {
  /** Optional pill rendered under the brand mark (e.g. a beta tag). */
  pill?: ReactNode
  className?: string
}

// Shared brand lockup for the centered entry surfaces (/login, /accept-invite).
// Matches the canvas: a 56px dark rounded brand mark with a soft drop shadow,
// the wordmark, and an optional status pill below. Centered-column layout so it
// drops straight into the max-w entry container above the heading or card.
export function EntryBrandLockup({ pill, className }: EntryBrandLockupProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3.5', className)}>
      <img
        src={brandMark}
        alt=""
        aria-hidden
        width={56}
        height={56}
        className="size-14 rounded-xl shadow-md"
      />
      {pill}
    </div>
  )
}

// "PRIVATE BETA · JUN 2026"-style status pill used inside the brand lockup.
export function EntryBetaPill({ children }: { children: ReactNode }) {
  return (
    <Badge
      variant="info"
      className="gap-1.5 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide"
    >
      <span aria-hidden className="block size-1.5 rounded-full bg-status-done" />
      {children}
    </Badge>
  )
}
