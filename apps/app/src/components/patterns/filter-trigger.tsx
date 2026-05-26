import { ChevronDownIcon } from 'lucide-react'
import { forwardRef, type ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `FilterTrigger` — canonical button chrome for a dropdown / popover that
 * narrows the list under it.
 *
 * Pulls /deadlines' Sort-by dropdown, /alerts' three Select triggers, and
 * /alerts' two Popover triggers into one shape so "filter applied" reads
 * identically on every list page in the product.
 *
 * Visual contract:
 *   - 32px tall (`h-8`), inline-flex row
 *   - `border-divider-strong bg-background-default` at rest
 *   - hover: `bg-state-base-hover`
 *   - active (filter actually applied): `border-state-accent-solid
 *     bg-state-accent-hover text-text-accent` — same accent state every
 *     list page uses to communicate "this column has a filter"
 *   - data-state="open": same bg-state-base-hover as hover so the popup +
 *     trigger read as one connected surface
 *   - Trailing `ChevronDownIcon size-3.5` so the affordance reads
 *     unambiguously as "click for menu"
 *
 * Usage:
 *   <DropdownMenuTrigger render={<FilterTrigger active={hasFilter}>Sort by…</FilterTrigger>} />
 *   <PopoverTrigger render={<FilterTrigger active={hasStateFilter}>State…</FilterTrigger>} />
 *
 * The `render` prop on the underlying Base UI trigger forwards the
 * `data-state` attribute + the ref + the click handler into this button.
 *
 * `active` is the only state input. The component does NOT manage open
 * state — that belongs to the parent DropdownMenu / Popover.
 *
 * 2026-05-26 (Yuqi seventy-fourth pass): single filter-trigger primitive
 * across the product, retiring three previously-divergent shapes.
 */
type FilterTriggerProps = {
  active?: boolean
  className?: string
  children: ReactNode
  /** Hide the trailing chevron — useful for icon-only triggers in narrow rows. */
  hideChevron?: boolean
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export const FilterTrigger = forwardRef<HTMLButtonElement, FilterTriggerProps>(
  function FilterTrigger({ active, className, children, hideChevron, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        data-active={active ? 'true' : 'false'}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-sm whitespace-nowrap outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
          active
            ? 'border-state-accent-solid bg-state-accent-hover text-text-accent hover:bg-state-accent-hover-alt data-[state=open]:bg-state-accent-hover-alt'
            : 'border-divider-strong bg-background-default text-text-primary hover:bg-state-base-hover data-[state=open]:bg-state-base-hover',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...rest}
      >
        {children}
        {hideChevron ? null : (
          <ChevronDownIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
        )}
      </button>
    )
  },
)
