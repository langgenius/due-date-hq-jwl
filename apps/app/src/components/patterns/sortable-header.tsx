import type { ReactNode } from 'react'
import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * SortableHeader — the ONE canonical "click a column header to sort" affordance.
 *
 * 2026-06-16 (audit): /clients and /deadlines each hand-rolled this with
 * different icon vocabularies and idle policies — clients used up/down ARROWS
 * with no idle icon; deadlines used CHEVRONS + a faint idle dual-chevron. This
 * unifies on the deadlines treatment (it's the better-designed one):
 *   - idle  → faint `ChevronsUpDownIcon` at 40% so "this is sortable" is always
 *             visible and resolves into a hint on hover (clients used to look
 *             inert until clicked).
 *   - asc   → `ChevronUpIcon` in the accent color.
 *   - desc  → `ChevronDownIcon` in the accent color.
 * Chevrons (not arrows) match the app's chevron vocabulary (dropdowns,
 * breadcrumbs, drawer triggers).
 *
 * a11y: the BUTTON exposes `aria-pressed`; the OWNING `<th>` must additionally
 * set `aria-sort` ("ascending" | "descending" | "none") — pass it via the table
 * column, not here (a header cell, not the button, carries sort state for AT).
 *
 * `children` renders OUTSIDE the sort button (e.g. a per-column filter trigger)
 * so we never nest an interactive control inside the button.
 */
export type SortDirection = 'asc' | 'desc' | false

export function SortableHeader({
  label,
  direction,
  onToggle,
  align = 'left',
  sortLabel,
  className,
  children,
}: {
  label: ReactNode
  direction: SortDirection
  onToggle: () => void
  align?: 'left' | 'right'
  /** Full accessible label, e.g. `Sort by Client name`. */
  sortLabel: string
  className?: string
  children?: ReactNode
}) {
  const SortIcon =
    direction === 'asc' ? ChevronUpIcon : direction === 'desc' ? ChevronDownIcon : null

  return (
    <span
      className={cn(
        'group/sort -mx-1 inline-flex min-w-0 items-center gap-0.5',
        align === 'right' && 'w-full justify-end',
        className,
      )}
    >
      <button
        type="button"
        aria-label={sortLabel}
        title={sortLabel}
        aria-pressed={direction !== false}
        data-active={direction !== false ? true : undefined}
        onClick={onToggle}
        className={cn(
          'inline-flex min-w-0 cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 text-sm font-medium normal-case tracking-normal text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt data-[active=true]:text-text-primary',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        <span className="truncate">{label}</span>
        {SortIcon ? (
          <SortIcon className="size-3 shrink-0 text-text-accent" aria-hidden />
        ) : (
          <ChevronsUpDownIcon
            className="size-3 shrink-0 text-text-tertiary/40 transition-colors group-hover/sort:text-text-tertiary"
            aria-hidden
          />
        )}
      </button>
      {children}
    </span>
  )
}
