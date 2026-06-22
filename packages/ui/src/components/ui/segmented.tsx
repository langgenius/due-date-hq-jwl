import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
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
  label: ReactNode
  /** Optional leading icon (rendered at size-3.5). */
  icon?: LucideIcon
  /**
   * Optional leading status dot — pass a `bg-*` (or `text-*` + bg-current)
   * colour class. Renders a `size-1.5` dot before the label so scope/bucket
   * selectors (status colour + label + count) use this primitive instead of
   * a hand-rolled `rounded-full` pill track.
   */
  dot?: string
  /** Optional trailing count, rendered muted + tabular after the label. */
  count?: number
  /**
   * Fade an INACTIVE option to 60% opacity — for bucket/scope selectors where
   * an empty bucket (e.g. "This week 0") should read as a low-priority,
   * near-dead-end choice without being disabled. No effect on the active
   * option. (2026-06-16: added so /today's Priorities selector can adopt this
   * primitive without losing its empty-bucket dim.)
   */
  dimmed?: boolean
  /** Accessible label when `label` is icon-only or needs elaboration. */
  ariaLabel?: string
}

export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  size = 'md',
  disabled = false,
  className,
  ariaLabel,
}: {
  value: T
  onValueChange: (value: T) => void
  options: ReadonlyArray<SegmentedOption<T>>
  /**
   * `md` = h-7 items (toolbar default); `sm` = h-6 (dense rows);
   * `lg` = h-8 items with `text-base` — for toolbars whose neighboring
   * controls set a 14px text scale (the 11–12px default reads undersized
   * next to them). Use the size prop, never `[&>button]` overrides.
   */
  size?: 'sm' | 'md' | 'lg'
  /** Disable the whole control (e.g. a not-yet-wired setting). */
  disabled?: boolean
  className?: string
  ariaLabel?: string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)
  const activeIndex = options.findIndex((option) => option.value === value)

  // Slide the active fill between options instead of snapping it. Measure the
  // active button's box and position an absolute indicator that transitions its
  // left/width. CSS-only (packages/ui carries no motion lib); a ResizeObserver
  // re-measures when a label/count change shifts the active button's width.
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || activeIndex < 0) {
      setIndicator(null)
      return
    }
    const measure = () => {
      const btn = list.querySelector<HTMLElement>(`[data-segment-index="${activeIndex}"]`)
      if (btn) setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [activeIndex, size])

  return (
    <div
      role="group"
      ref={listRef}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={cn(
        'relative inline-flex w-fit items-center gap-0.5 rounded-lg bg-components-segmented-bg p-0.5',
        disabled && 'opacity-50',
        className,
      )}
    >
      {/* Sliding active indicator — slides between options on change instead of
          the white fill snapping. Renders only once measured + when an option is
          active; the buttons sit above it via `relative z-10`. */}
      {indicator ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0.5 bottom-0.5 rounded-lg border border-divider-subtle bg-components-segmented-item-bg-active transition-[left,width] duration-200 ease-out motion-reduce:transition-none"
          style={{ left: indicator.left, width: indicator.width }}
        />
      ) : null}
      {options.map((option, index) => {
        const active = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            data-segment-index={index}
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
            aria-pressed={active}
            aria-label={option.ariaLabel}
            className={cn(
              // `border border-transparent` on every item keeps the box size
              // identical active-or-not — the visible border + white fill now
              // ride on the sliding indicator behind the items (relative z-10).
              'relative z-10 inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-lg border border-transparent font-medium whitespace-nowrap transition outline-none active:scale-[0.97] motion-reduce:active:scale-100',
              'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
              'disabled:cursor-not-allowed',
              size === 'sm'
                ? 'h-6 px-2 text-xs'
                : size === 'lg'
                  ? 'h-8 px-3 text-base'
                  : 'h-7 px-2.5 text-xs',
              active
                ? 'text-components-segmented-text-active'
                : 'text-components-segmented-text hover:text-components-segmented-text-active',
              option.dimmed && !active && 'opacity-60',
            )}
          >
            {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
            {option.dot ? (
              <span className={cn('size-1.5 shrink-0 rounded-full', option.dot)} aria-hidden />
            ) : null}
            {option.label}
            {option.count !== undefined ? (
              <span className="tabular-nums text-text-tertiary">{option.count}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
