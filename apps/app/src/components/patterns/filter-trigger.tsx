import { ChevronDownIcon } from 'lucide-react'
import { forwardRef, type ComponentType, type ReactNode, type SVGProps } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `FilterTrigger` — canonical button chrome for a dropdown / popover that
 * narrows the list under it.
 *
 * 2026-06-04 round 33 (Yuqi Pencil T3GhR — "update the filters and dropdown
 * (the functionalities and style). has to be 100% the same and recreated"):
 * trigger rebuilt to match T3GhR's `JlMSs`/`VSThR`/`iOxIZ`/`XVOni`/`vRYoE`
 * pill specs exactly.
 *
 * Visual contract:
 *   - h-10 (40px), padding [10, 16] (`px-4`)
 *   - rounded-xl (12px corner radius)
 *   - 1px border `divider-regular` (#10182814 = 8% alpha) — same color on
 *     active + inactive; the state-differential is bg, not border.
 *   - Font 13/500 `text-text-secondary` (#354052)
 *   - gap-1.5 between leading icon / label / value-counter / chevron
 *
 * State map:
 *   - **active**: bg `state-accent-hover` (#eff4ff). Pencil uses this for
 *     the "currently applied" filter (e.g. "Last 24 hours" with a leading
 *     blue clock icon).
 *   - **inactive**: bg transparent. Pencil disables the fill on `VSThR`/
 *     `iOxIZ`/`XVOni`, so the resting pill shows just the border on the
 *     page wash.
 *   - **savedView** (`variant="saved"`): bg `background-section` (#f9fafb,
 *     gray-50). Matches `vRYoE` "My morning sweep" — a distinct quiet
 *     tint that says "this is a saved configuration".
 *   - hover: deepens to `state-base-hover` (consistent across all states).
 *
 * New API:
 *   - `valueLabel` — optional Geist Mono 11/600 secondary text rendered
 *     after the main label, matching Pencil's "all"/"any" counters
 *     (`tk7tC`/`MHfb5` etc.).
 *   - `variant` — `'filter' | 'saved'`. Defaults to `'filter'`.
 *   - `leadingIconColor` — Tailwind text-color class for the leading
 *     icon. Pencil uses `text-text-accent` (#155aef blue) on active
 *     filters + saved views.
 */
type FilterTriggerVariant = 'filter' | 'saved'

type FilterTriggerProps = {
  active?: boolean
  className?: string
  children: ReactNode
  /** Hide the trailing chevron — useful for icon-only triggers in narrow rows. */
  hideChevron?: boolean
  /**
   * Optional secondary mono-text rendered after the label (Pencil's
   * `tk7tC`/`MHfb5` counter pattern). Renders in 11/600 Geist Mono
   * `text-text-muted` (#98a2b2). Typical values: "all", "any", or a
   * concrete count like "3".
   */
  valueLabel?: ReactNode
  /**
   * Leading icon. Pass any lucide component. The icon renders at size-3.5.
   * Use `leadingIconColor` to set its tint — default is `text-text-tertiary`,
   * but active filters / saved views use `text-text-accent` per Pencil.
   */
  leadingIcon?: ComponentType<SVGProps<SVGSVGElement>>
  /** Tailwind text-color class for the leading icon. */
  leadingIconColor?: string
  /**
   * Chrome variant.
   *   `filter` — default, bg toggles between transparent (inactive) and
   *     accent-hover (active).
   *   `saved`  — bg-background-section (gray-50) tint regardless of active.
   */
  variant?: FilterTriggerVariant
  /**
   * Legacy — explicit opt-out for the leading icon. Defers to `leadingIcon`
   * being undefined now, but kept to avoid breaking existing callers.
   */
  noLeadingIcon?: boolean
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export const FilterTrigger = forwardRef<HTMLButtonElement, FilterTriggerProps>(
  function FilterTrigger(
    {
      active,
      className,
      children,
      hideChevron,
      leadingIcon,
      leadingIconColor,
      noLeadingIcon,
      valueLabel,
      variant = 'filter',
      ...rest
    },
    ref,
  ) {
    const LeadingIcon = leadingIcon
    const showLeadingIcon = !!LeadingIcon && !noLeadingIcon
    const iconTone = leadingIconColor ?? (active ? 'text-text-accent' : 'text-text-tertiary')

    const variantBg =
      variant === 'saved'
        ? 'bg-background-section hover:bg-state-base-hover'
        : active
          ? 'bg-state-accent-hover hover:bg-state-accent-hover-alt data-[state=open]:bg-state-accent-hover-alt'
          : 'bg-transparent hover:bg-state-base-hover data-[state=open]:bg-state-base-hover'

    return (
      <button
        ref={ref}
        type="button"
        data-active={active ? 'true' : 'false'}
        className={cn(
          // Round 83 (Yuqi #16 "all of these can be slightly
          // smaller. just to be more delicate"): height 10 → 9,
          // horizontal pad 4 → 3, text 13 → 12. The filter row
          // reads as a quieter, more deliberate strip.
          'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-divider-regular px-3 text-[12px] font-medium whitespace-nowrap text-text-secondary outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
          variantBg,
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...rest}
      >
        {showLeadingIcon ? (
          <LeadingIcon className={cn('size-3.5 shrink-0', iconTone)} aria-hidden />
        ) : null}
        {children}
        {valueLabel != null ? (
          <span className="font-mono text-[11px] font-semibold text-text-muted">{valueLabel}</span>
        ) : null}
        {hideChevron ? null : (
          <ChevronDownIcon
            className="size-3.5 shrink-0 text-text-tertiary opacity-70"
            aria-hidden
          />
        )}
      </button>
    )
  },
)
