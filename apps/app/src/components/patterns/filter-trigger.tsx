import { ChevronDownIcon } from 'lucide-react'
import { forwardRef, type ComponentType, type ReactNode, type SVGProps } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `FilterTrigger` — canonical button chrome for a dropdown / popover that
 * narrows the list under it.
 *
 * Visual contract:
 *   - h-9 (36px), left-weighted padding `pl-4 pr-3` (16px / 12px) — the label
 *     gets the generous left inset; the trailing chevron tucks tighter right
 *   - rounded-full (pill)
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
 *   - `valueLabel` — optional CURRENT-VALUE text rendered after the label
 *     behind a hairline vertical divider, in the accent tone — the
 *     `Label │ Value ⌄` two-tone pill (2026-06-12, Yuqi's Stripe
 *     reference: "Date range │ All time ⌄"). The label says what the
 *     control filters; the accent value says what's currently applied.
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
   * The control's CURRENT value, rendered after the label behind a
   * hairline divider in the accent tone (`Label │ Value ⌄`). Typical
   * values: "All time", "Newest", a state code, or a count. Omit when
   * the control is at rest with nothing applied — the pill then reads
   * as a quiet label-only trigger.
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
    // The CURRENT-VALUE accent is a VIVID blue (util-colors-blue-600 #1570ef),
    // not the brand navy `text-text-accent` (#2e368c). Navy sits right next to
    // the gray label (`text-text-secondary` #354052), so the two-tone
    // `Label │ Value ⌄` read collapsed — the value didn't register as "the
    // applied, colored part." The brighter blue separates cleanly from the
    // label and is unmistakably an accent (2026-06-21, Yuqi: "why is this not
    // accent colour? other places got it accent"). Brand navy stays the accent
    // for chrome (buttons, borders); this vivid blue is reserved for the
    // scannable applied-filter value.
    const valueAccent = 'text-(--color-util-colors-blue-600)'
    const iconTone = leadingIconColor ?? (active ? valueAccent : 'text-text-tertiary')

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
          // 2026-06-12 (Yuqi — Stripe pill reference "Date range │ All
          // time ⌄"): the trigger is a full PILL (rounded-full = the 999
          // step of the radius scale) so the filter row reads as a strip
          // of pills, distinct from the rectangular buttons around it.
          // Height stays h-9 / 13px-500 from the round-83 sizing.
          // 2026-06-14 (Yuqi "dropdown buttons should have left padding more
          // than right padding"): left-weighted `pl-4 pr-3` (16px / 12px)
          // instead of symmetric px-3. The leading label gets the generous
          // inset; the trailing chevron — which carries its own visual mass
          // plus the gap-1.5 before it — tucks tighter on the right, so the
          // pill reads balanced rather than chevron-heavy.
          'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-divider-regular pl-4 pr-3 text-sm font-medium whitespace-nowrap text-text-secondary outline-none transition-colors',
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
          // The Stripe two-tone read: hairline divider, then the current
          // value in the accent. The label stays gray (what this filters);
          // the value is the colored, scannable part (what's applied).
          <>
            <span className="h-3.5 w-px shrink-0 bg-divider-regular" aria-hidden />
            <span className={cn('font-medium tabular-nums', valueAccent)}>{valueLabel}</span>
          </>
        ) : null}
        {hideChevron ? null : (
          <ChevronDownIcon
            className={cn(
              'size-3.5 shrink-0',
              // Chevron follows the value: accent when a value is applied,
              // quiet tertiary at rest.
              valueLabel != null || active ? valueAccent : 'text-text-tertiary opacity-70',
            )}
            aria-hidden
          />
        )}
      </button>
    )
  },
)
