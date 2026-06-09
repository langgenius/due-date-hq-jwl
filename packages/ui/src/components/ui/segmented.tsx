import type { LucideIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Segmented — a flat, panel-less pill toggle for mutually-exclusive 2–3
 * option selectors (Firm / Me, List / Map, density, scope, …).
 *
 * Why a dedicated primitive and not `Tabs`: `Tabs` (Base UI) is a full
 * tab system bound to content panels and carries a `shadow-xs` active
 * state. These toggles just flip a piece of state with no panel, and the
 * 2026-06-08 button rework moved the product to a FLAT language. This
 * control consolidates the several hand-rolled `aria-pressed` pill
 * toggles (`BriefScopeToggle`, the alerts List/Map switch re-implemented
 * inline twice, etc.) into one shape so every toggle in the product reads
 * the same: a subtle segmented track, an active item that lifts via a
 * white fill + hairline border (no shadow).
 *
 * Uses the shared `--components-segmented-*` tokens.
 */
export type SegmentedOption<T extends string> = {
  value: T
  label: React.ReactNode
  /** Optional leading icon (rendered at size-3.5). */
  icon?: LucideIcon
  /** Accessible label when `label` is icon-only or needs elaboration. */
  ariaLabel?: string
}

export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  size = 'md',
  className,
  ariaLabel,
}: {
  value: T
  onValueChange: (value: T) => void
  options: ReadonlyArray<SegmentedOption<T>>
  /** `md` = h-7 items (toolbar default); `sm` = h-6 (dense rows). */
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-fit items-center gap-0.5 rounded-lg bg-components-segmented-bg p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            aria-pressed={active}
            aria-label={option.ariaLabel}
            className={cn(
              'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-lg font-medium whitespace-nowrap transition-colors outline-none',
              'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
              size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-xs',
              active
                ? 'border border-divider-subtle bg-components-segmented-item-bg-active text-components-segmented-text-active'
                : 'border border-transparent text-components-segmented-text hover:text-components-segmented-text-active',
            )}
          >
            {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
