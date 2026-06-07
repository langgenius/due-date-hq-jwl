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
  footer,
  className,
  density = 'default',
  variant = 'default',
}: {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  cta?: ReactNode
  // 2026-06-07: optional content below the CTA — e.g. the "what gets recorded"
  // chip strip on the /alerts/history empty state. Prominent variant only.
  footer?: ReactNode
  className?: string
  density?: 'default' | 'compact'
  // 2026-06-07 (design replication): `variant="prominent"` is the full-surface
  // empty state from the canvas — a solid-border card with a tinted icon-circle,
  // a larger title, wider supporting copy, and room for one or more CTAs. Used
  // when the empty state OWNS the surface (e.g. an empty /deadlines or /alerts
  // list). `default` stays the quiet inline treatment used app-wide; `compact`
  // drops the card chrome for table-cell / drawer embeds.
  variant?: 'default' | 'prominent'
}) {
  const isCompact = density === 'compact'
  const isProminent = variant === 'prominent'
  return (
    <div
      data-density={density}
      data-variant={variant}
      className={cn(
        'flex flex-col items-center text-center',
        isCompact && 'gap-3 px-4 py-10',
        !isCompact &&
          !isProminent &&
          'gap-3 rounded-lg border border-dashed border-divider-regular bg-background-default px-6 py-10',
        isProminent &&
          'gap-6 rounded-xl border border-divider-regular bg-background-default px-10 py-20',
        className,
      )}
    >
      {Icon ? (
        isProminent ? (
          <div className="flex size-[88px] items-center justify-center rounded-full bg-state-accent-hover">
            <Icon className="size-9 text-text-accent" aria-hidden />
          </div>
        ) : (
          <Icon className="size-5 text-text-tertiary" aria-hidden />
        )
      ) : null}
      <p
        className={cn(
          'font-semibold text-text-primary',
          isProminent ? 'text-xl tracking-tight' : 'text-sm',
        )}
      >
        {title}
      </p>
      {description ? (
        <p
          className={cn(
            'text-text-secondary',
            isProminent
              ? 'max-w-[520px] text-sm leading-relaxed'
              : 'max-w-[42ch] text-description leading-5',
          )}
        >
          {description}
        </p>
      ) : null}
      {cta ? <div className={isProminent ? 'mt-2' : 'mt-1'}>{cta}</div> : null}
      {footer && isProminent ? <div className="mt-2">{footer}</div> : null}
    </div>
  )
}
