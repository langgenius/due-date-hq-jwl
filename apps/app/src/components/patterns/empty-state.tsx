import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * EmptyState — the shared "nothing here yet" surface.
 *
 * Three orthogonal variants live in one component because their chrome is
 * identical (dashed-border card, centered column, optional icon, heading,
 * description, single CTA):
 *
 *  - `empty`     → the data source is genuinely empty. CTA usually unblocks
 *                  the user with a workspace action (Import / Connect / etc).
 *  - `filtered`  → data exists but the active filter excludes it. CTA is
 *                  always "Clear filters" (or equivalent reset).
 *  - `error`     → query failed. CTA is "Retry".
 *
 * Routes were previously rolling their own — dashboard had `EmptyDashboard`,
 * obligations had a private `EmptyState`, opportunities embedded one inline,
 * pulse named its `EmptyState` / `FilteredEmptyState`. This component
 * collapses them all to one chrome so future tone / typography / spacing
 * tweaks land in one place.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  className,
  density = 'default',
}: {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  cta?: ReactNode
  className?: string
  density?: 'default' | 'compact'
}) {
  // 2026-06-01: `density="compact"` drops the section-frame chrome
  // (dashed border, lg radius, default padding) so the empty state
  // can be embedded inside a TableCell colSpan or a drawer slot.
  // Used by sources-tab/temporary-rules-tab empty rows and
  // ImportHistoryDrawer. Keeps icon + title + optional description so
  // the message hierarchy stays the same.
  const isCompact = density === 'compact'
  return (
    <div
      data-density={density}
      className={cn(
        'flex flex-col items-center gap-3 text-center',
        isCompact
          ? 'px-4 py-10'
          : 'rounded-lg border border-dashed border-divider-regular bg-background-default px-6 py-10',
        className,
      )}
    >
      {Icon ? <Icon className="size-5 text-text-tertiary" aria-hidden /> : null}
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description ? (
        <p className="max-w-[42ch] text-description leading-5 text-text-secondary">{description}</p>
      ) : null}
      {cta ? <div className="mt-1">{cta}</div> : null}
    </div>
  )
}
