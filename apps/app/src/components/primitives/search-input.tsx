import { forwardRef, type ChangeEvent, type KeyboardEvent, type Ref } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'

import { Input } from '@duedatehq/ui/components/ui/input'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Canonical search bar for page-level table filtering.
 *
 * Extracted 2026-05-25 (Yuqi cross-surface directive: "ensure the
 * search pattern on each page is the same"). Before this primitive,
 * `/rules/library`, `/deadlines`, and `/clients` each rolled their
 * own search input — different heights (h-8 / h-9), different icon
 * sizes (size-3.5 / size-4), different padding (left-2.5 / left-3),
 * different clear affordance handling. Now there's one source of
 * truth so a CPA's muscle memory for "press /" or "click the X
 * to clear" works identically everywhere.
 *
 * Behavior:
 *  - h-9 with the SearchIcon at left-2.5 and an inline `X` clear
 *    button on the right when there's a value.
 *  - `Escape` clears the value (and blurs if the consumer wires the
 *    ref).
 *  - Placeholder styled as text-secondary (not tertiary) so it
 *    reads cleanly against the brighter `bg-background-default`.
 *  - Width is intentionally NOT clamped — callers pin the width via
 *    a wrapping container (`max-w-sm`, `md:w-56`, etc.) so each
 *    surface can decide its own footprint.
 */
export const SearchInput = forwardRef(function SearchInput(
  {
    value,
    onChange,
    placeholder,
    ariaLabel,
    className,
    autoFocus = false,
    onFocus,
    onBlur,
  }: {
    value: string
    onChange: (next: string) => void
    placeholder: string
    /** Accessible label — defaults to the placeholder text. */
    ariaLabel?: string
    className?: string
    autoFocus?: boolean
    onFocus?: () => void
    onBlur?: () => void
  },
  ref: Ref<HTMLInputElement>,
) {
  const { t } = useLingui()
  return (
    <div className={cn('relative', className)}>
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
      />
      <Input
        ref={ref}
        type="text"
        autoFocus={autoFocus}
        aria-label={ariaLabel ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Escape' && value.length > 0) {
            event.preventDefault()
            onChange('')
          }
        }}
        className="h-9 bg-background-default pl-9 pr-9 placeholder:text-text-secondary"
      />
      {value ? (
        <button
          type="button"
          aria-label={t`Clear search`}
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-text-tertiary hover:bg-state-base-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <XIcon className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  )
})
