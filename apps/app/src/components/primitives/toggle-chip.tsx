import type { ComponentType, ReactNode, SVGProps } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `ToggleChip` — the canonical "engaged filter / pick-one scope" chip.
 *
 * One pill chrome for the toggle/filter chips that were hand-rolled in several
 * places (rules-library entity filter, command-palette scope pills, the
 * states-rail "needs review" toggle, …). The ACTIVE state uses the design
 * system's "engaged filter" treatment — an accent **tint** (`state-accent-
 * hover-alt`) + accent border + accent text + medium weight — NOT a solid fill
 * (a dark fill would read as "primary action" rather than "this filter is on").
 * Mirrors the chip-filter look on /deadlines + /clients.
 *
 * It is a toggle (`aria-pressed={selected}`), not a link. The label + any
 * trailing count/sub-figure are passed as `children` so richer chips (e.g. the
 * entity chip's "12 · 3 missing") keep their per-figure styling.
 *
 * Specialized chips are intentionally NOT forced through this: `PresetChip`
 * (brand-logo tiles + scale animation) and the deadlines filter-popover track
 * pills (segmented-in-a-track) keep their bespoke chrome.
 */
type ToggleChipProps = {
  /** Engaged/selected state — drives the accent treatment + `aria-pressed`. */
  selected: boolean
  onClick: () => void
  /** Optional leading lucide icon (rendered at size-3.5). */
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  /** `sm` = h-7 / text-xs (default); `md` = h-8 / text-sm. */
  size?: 'sm' | 'md'
  disabled?: boolean | undefined
  className?: string
  children: ReactNode
} & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title'>

export function ToggleChip({
  selected,
  onClick,
  icon: Icon,
  size = 'sm',
  disabled,
  className,
  children,
  ...rest
}: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        'group inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border font-medium whitespace-nowrap outline-none transition active:scale-[0.97] motion-reduce:active:scale-100',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-8 px-3.5 text-sm' : 'h-7 px-3 text-xs',
        selected
          ? 'border-state-accent-solid bg-state-accent-hover-alt text-text-accent'
          : 'border-divider-regular bg-background-default text-text-secondary hover:border-text-secondary hover:bg-state-base-hover hover:text-text-primary',
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  )
}
