import { type ComponentType, type ReactNode, type SVGProps } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { cn } from '@duedatehq/ui/lib/utils'

import { FilterTrigger } from './filter-trigger'

/**
 * `SingleSelectFilter` — canonical control for a ONE-VALUE filter or a sort
 * picker. It is the `FilterTrigger` pill + a `DropdownMenuRadioGroup` body,
 * extracted so every single-select narrows-the-list control reads identically
 * across surfaces (`/deadlines` Status + Sort, `/alerts` Sort, `/rules` Show,
 * `/audit` Category + Time range + the refine facets).
 *
 * Before this, the same `DropdownMenu → DropdownMenuTrigger render={<FilterTrigger
 * valueLabel=…>} → DropdownMenuRadioGroup` block was hand-rolled inline on each
 * surface, which let drift creep in (e.g. a stray `text-base` override making
 * one pill 14px while the canon is 13px, or `/audit` reaching for a native
 * `<Select>` form control instead of the pill entirely).
 *
 * The trigger speaks the `Label │ Value ⌄` two-tone grammar: the label says what
 * the control filters; the accent value says what's currently picked. Pass
 * concise option labels (or an explicit `triggerLabel`) so the value slot stays
 * short ("Newest", not "Newest first").
 */
export interface SingleSelectFilterOption<T extends string = string> {
  value: T
  /** Row label in the menu. */
  label: ReactNode
  /**
   * Short label for the trigger's value slot when this option is selected.
   * Defaults to `label`. Use when the menu row is longer than the pill value
   * (menu "Newest first" → pill value "Newest").
   */
  triggerLabel?: ReactNode
  /** Optional count, right-aligned in the menu row. */
  count?: number
  /** Optional pre-rendered icon (e.g. a `StatusMark`) left of the label. */
  icon?: ReactNode
  disabled?: boolean
}

interface SingleSelectFilterProps<T extends string = string> {
  /** The static label — WHAT this control filters ("Status", "Sort by"). */
  label: ReactNode
  value: T
  options: readonly SingleSelectFilterOption<T>[]
  onValueChange: (value: T) => void
  /**
   * Override the active (accent-fill) state. Defaults to "the selected value is
   * not the first option" — i.e. the first option is treated as the resting /
   * "all" default. Pass `active={false}` for sort pills that should always read
   * neutral, or `active` explicitly for custom defaults.
   */
  active?: boolean
  /**
   * Override the trigger value slot. Defaults to the selected option's
   * `triggerLabel ?? label`.
   */
  valueLabel?: ReactNode
  leadingIcon?: ComponentType<SVGProps<SVGSVGElement>>
  leadingIconColor?: string
  noLeadingIcon?: boolean
  /** Pill size — `sm` (h-7) for narrow rails. Defaults to the toolbar `default`. */
  size?: 'default' | 'sm'
  align?: 'start' | 'end'
  /** Menu width class. Defaults to `min-w-[200px]`. */
  menuClassName?: string
  /** Trigger className passthrough. */
  className?: string
  disabled?: boolean
  ariaLabel?: string
}

export function SingleSelectFilter<T extends string = string>({
  label,
  value,
  options,
  onValueChange,
  active,
  valueLabel,
  leadingIcon,
  leadingIconColor,
  noLeadingIcon,
  size = 'default',
  align = 'start',
  menuClassName,
  className,
  disabled,
  ariaLabel,
}: SingleSelectFilterProps<T>) {
  const selected = options.find((option) => option.value === value)
  const resolvedValueLabel = valueLabel ?? selected?.triggerLabel ?? selected?.label
  const resolvedActive = active ?? (options.length > 0 && value !== options[0]?.value)
  // Reserve the value slot to the widest option so the pill — and the controls
  // beside it — stop jumping when a different option is selected.
  const valueOptions = options.map((option) => option.triggerLabel ?? option.label)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          // Optional props are spread conditionally so we never pass `undefined`
          // into FilterTrigger's exact-optional props (exactOptionalPropertyTypes).
          <FilterTrigger
            active={resolvedActive}
            valueLabel={resolvedValueLabel}
            valueOptions={valueOptions}
            size={size}
            {...(leadingIcon ? { leadingIcon } : {})}
            {...(leadingIconColor ? { leadingIconColor } : {})}
            {...(noLeadingIcon ? { noLeadingIcon } : {})}
            {...(disabled ? { disabled } : {})}
            {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
            {...(className ? { className } : {})}
          >
            {label}
          </FilterTrigger>
        }
      />
      <DropdownMenuContent align={align} className={cn('min-w-[200px]', menuClassName)}>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            // Resolve back to the typed option value — no `as T` cast, and only
            // fires for a value that's actually in `options`.
            const match = options.find((option) => option.value === next)
            if (match) onValueChange(match.value)
          }}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              <span className="flex w-full items-center gap-2">
                {option.icon != null ? <span className="flex shrink-0">{option.icon}</span> : null}
                <span className="whitespace-nowrap">{option.label}</span>
                {option.count !== undefined ? (
                  <span className="ml-auto tabular-nums text-text-tertiary">{option.count}</span>
                ) : null}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
