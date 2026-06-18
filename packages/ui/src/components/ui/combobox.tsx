'use client'

import * as React from 'react'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@duedatehq/ui/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'

// SearchableCombobox — wave-2 audit-drain F-CB01 / Q3.4 / Q4.3 / R5.3
// ----------------------------------------------------------------------
//
// Why this primitive exists
// -------------------------
// Three drain-pass audits independently surfaced the same shape: a
// `<DropdownMenu>` or free-form `<Input>` used as a long-list picker
// (export client picker, bulk Assign-owner, new-rule tax type). Each
// site had to scroll-hunt because there was no typeahead. The only
// surface that already had typeahead was `ClientCombobox`, which had
// re-implemented the Popover + cmdk recipe inline.
//
// `SearchableCombobox` extracts that recipe into a shared primitive.
// Callers pass the option list and render shape; the primitive owns
// the popover, the search input, the empty state, and the selection
// keyboard model. No re-implementing the dance for every new picker.
//
// What this primitive is NOT
// --------------------------
// - Not a replacement for `<Select>` (3-8 enum items, no search).
// - Not an async-loading picker (the caller owns data fetching; the
//   primitive only renders what it's given). Callers can pass
//   `loading` while their query is in flight so the empty state can
//   read "Loading…" instead of "No match".
// - Not a multi-select. Single value only. Multi-select would need a
//   different selection model and is deferred until a real use case.
//
// API stability
// -------------
// Adopt-site count drives stability. Wave-2 ships with 3 adopters
// (Export client picker, Assign-owner toolbar, New-rule tax-type) and
// `ClientCombobox` left in place as the reference implementation. If
// a fourth site lands cleanly we'll migrate `ClientCombobox` itself
// onto this primitive in a follow-up pass.

export type SearchableComboboxOption = {
  /** Stable identity used as the React key and the selected value. */
  value: string
  /** Visible label rendered in the row and (by default) the trigger. */
  label: string
  /**
   * Extra text the search input matches against — EIN, state, alias,
   * etc. The cmdk filter sees `label + ' ' + keywords.join(' ')`.
   * Optional; omit for pure label-match.
   */
  keywords?: readonly string[]
  /** Trailing meta rendered after the label (e.g. "CA · Partnership"). */
  meta?: string
  /** Disables the row but keeps it visible. */
  disabled?: boolean
}

export type SearchableComboboxProps = {
  /** Element id forwarded to the trigger button. */
  id?: string
  /** Selected option's `value`, or `null` for "nothing picked". */
  value: string | null
  /** Fires with the new value when an option is chosen. */
  onValueChange: (value: string) => void
  /** Visible options. Empty array → empty state inside the popover. */
  options: readonly SearchableComboboxOption[]
  /** Placeholder shown in the trigger when nothing is selected. */
  placeholder?: string
  /** Placeholder for the popover's search input. */
  searchPlaceholder?: string
  /**
   * Empty-state node shown when the search has no matches. Defaults to
   * a generic "No match." Tertiary-color body text.
   */
  emptyState?: React.ReactNode
  /**
   * If true, the empty state slot reads as the loading-shape (no
   * "create" affordance, neutral copy). Callers usually pair this
   * with `options=[]` while their `useQuery` resolves.
   */
  loading?: boolean
  /** Node rendered while loading=true and options=[]. */
  loadingState?: React.ReactNode
  /** Optional group heading rendered above the options list. */
  groupHeading?: string
  /** Aria label for the trigger button (default: derived from value). */
  ariaLabel?: string
  /** Disables the trigger. */
  disabled?: boolean
  /** Extra trigger className. */
  className?: string
  /** Constrains the popover height (default 280px to fit inside dialogs). */
  popoverMaxHeight?: number
  /**
   * Renders a custom label inside the trigger button. Receives the
   * selected option (or null) so callers can show extra meta. When
   * omitted the primitive renders `selected?.label ?? placeholder`.
   */
  renderTrigger?: (selected: SearchableComboboxOption | null) => React.ReactNode
}

function defaultTriggerLabel(
  selected: SearchableComboboxOption | null,
  placeholder: string | undefined,
): React.ReactNode {
  if (selected) return selected.label
  return placeholder ?? ''
}

/**
 * Searchable single-select combobox. See file header for the why.
 *
 * Typical adoption:
 *
 * ```tsx
 * <SearchableCombobox
 *   id="export-client"
 *   value={clientId}
 *   onValueChange={setClientId}
 *   options={clientOptions}
 *   placeholder={t`Select client`}
 *   searchPlaceholder={t`Search clients…`}
 *   emptyState={<Trans>No clients match.</Trans>}
 * />
 * ```
 */
export function SearchableCombobox({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyState,
  loading = false,
  loadingState,
  groupHeading,
  ariaLabel,
  disabled,
  className,
  popoverMaxHeight = 280,
  renderTrigger,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selected = React.useMemo(
    () => (value ? (options.find((option) => option.value === value) ?? null) : null),
    [options, value],
  )

  const triggerLabel =
    renderTrigger?.(selected) ?? defaultTriggerLabel(selected, placeholder) ?? placeholder

  const handleSelect = React.useCallback(
    (nextValue: string) => {
      onValueChange(nextValue)
      setOpen(false)
    },
    [onValueChange],
  )

  // Show loading copy only when we have no options to render — once
  // the query lands we drop into the normal empty / list state.
  const showLoading = loading && options.length === 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            disabled={disabled}
            className={cn(
              'flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-transparent bg-components-input-bg-normal py-2 pr-2 pl-3 text-sm text-text-primary transition-colors outline-none hover:bg-components-input-bg-hover focus-visible:border-components-input-border-active focus-visible:bg-components-input-bg-active focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:bg-components-input-bg-disabled disabled:text-components-input-text-filled-disabled',
              className,
            )}
          >
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-left',
                selected ? 'text-text-primary' : 'text-text-tertiary',
              )}
            >
              {triggerLabel}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-text-tertiary" aria-hidden />
          </button>
        }
      />
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-(--anchor-width) max-w-[calc(100vw-2rem)] overflow-hidden p-0"
      >
        <Command loop>
          <CommandInput autoFocus placeholder={searchPlaceholder} />
          <CommandList style={{ maxHeight: popoverMaxHeight }}>
            <CommandEmpty>{showLoading ? (loadingState ?? emptyState) : emptyState}</CommandEmpty>
            {options.length > 0 ? (
              <CommandGroup heading={groupHeading}>
                {options.map((option) => (
                  <SearchableComboboxRow
                    key={option.value}
                    option={option}
                    selected={option.value === value}
                    onSelect={() => {
                      if (option.disabled) return
                      handleSelect(option.value)
                    }}
                  />
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function SearchableComboboxRow({
  option,
  selected,
  onSelect,
}: {
  option: SearchableComboboxOption
  selected: boolean
  onSelect: () => void
}) {
  // cmdk's filter uses `value` as the haystack. Concat the label and
  // any caller-provided keywords so partial typing surfaces the row.
  const haystack = React.useMemo(
    () => [option.label, ...(option.keywords ?? [])].filter(Boolean).join(' '),
    [option.label, option.keywords],
  )
  return (
    <CommandItem
      value={haystack}
      // `disabled` only forwarded when truthy — Base UI + cmdk both
      // honor exactOptionalPropertyTypes, so passing `disabled={undefined}`
      // would be a type error rather than a no-op.
      {...(option.disabled ? { disabled: true } : {})}
      onSelect={onSelect}
      className="grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2"
    >
      <span className="min-w-0 truncate text-sm text-text-primary">{option.label}</span>
      {option.meta ? (
        <span className="shrink-0 text-xs text-text-tertiary tabular-nums">{option.meta}</span>
      ) : (
        <span aria-hidden />
      )}
      <CheckIcon
        className={cn('size-4 text-text-accent', selected ? 'opacity-100' : 'opacity-0')}
        aria-hidden
      />
    </CommandItem>
  )
}
