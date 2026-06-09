import { forwardRef, useRef, type ChangeEvent, type KeyboardEvent, type Ref } from 'react'
import { type RegisterableHotkey } from '@tanstack/react-hotkeys'
import { SearchIcon, XIcon } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'

import { Input } from '@duedatehq/ui/components/ui/input'
import { cn } from '@duedatehq/ui/lib/utils'

import type { ShortcutCategory, ShortcutScope } from '@/components/patterns/keyboard-shell'
import { useAppHotkey } from '@/components/patterns/keyboard-shell'

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
 *  - h-9 (36px) with the SearchIcon at left-2.5 and an inline `X` clear
 *    button on the right when there's a value. (2026-06-09 Yuqi settled on
 *    "all search bars 36px" — they sit at the same height as the delicate
 *    h-9 FilterTrigger pills they share toolbar rows with.)
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
    hotkey,
    hotkeyMeta,
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
    /**
     * 2026-05-26 (Yuqi cross-product search audit, Phase 1): optional
     * `/` (or any) hotkey to focus this input + render a discoverable
     * kbd hint chip inside the input on the right when the value is
     * empty. Slack / Linear / GitHub all use `/` for "focus the page
     * filter"; standardising it here lets every consumer opt in with
     * one prop instead of hand-rolling the hotkey + the hint.
     *
     * Pass `hotkeyMeta` so the global shortcut help dialog can list
     * it under the route's category (id + name + category + scope).
     * Without `hotkeyMeta`, the hotkey wires but doesn't appear in
     * the help overlay — fine for ad-hoc surfaces, but list pages
     * should always pass meta.
     */
    hotkey?: RegisterableHotkey
    hotkeyMeta?: {
      id: string
      name: string
      description: string
      category: ShortcutCategory
      scope: ShortcutScope
    }
  },
  ref: Ref<HTMLInputElement>,
) {
  const { t } = useLingui()
  // Local ref kept in sync with the consumer's forwarded ref so the
  // hotkey can focus the input even when the consumer doesn't pass a
  // ref. When the consumer DOES pass a ref, both point at the same
  // element via the ref-merging callback below.
  const localRef = useRef<HTMLInputElement | null>(null)
  const setRef = (node: HTMLInputElement | null) => {
    localRef.current = node
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }

  return (
    <>
      {/* Hotkey wiring — opt-in via `hotkey` prop, mounted as a
          sibling so the useAppHotkey hook only runs when a hotkey
          is actually set. Can't conditionally call hooks at the
          parent level (Rules of Hooks), so the sub-component
          pattern keeps the call unconditional from its own POV. */}
      {hotkey ? (
        <SearchInputHotkey
          hotkey={hotkey}
          {...(hotkeyMeta ? { hotkeyMeta } : {})}
          onTrigger={() => {
            localRef.current?.focus()
            localRef.current?.select()
          }}
        />
      ) : null}
      <div className={cn('relative', className)}>
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
        />
        <Input
          ref={setRef}
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
            className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-text-tertiary hover:bg-state-base-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <XIcon className="size-3.5" aria-hidden />
          </button>
        ) : hotkey ? (
          // kbd hint chip — only when input is empty AND a hotkey is
          // wired. Disappears the moment the user types so the X clear
          // button can take its place. Renders the key glyph; modifier
          // combos (cmd+K etc) are intentionally NOT shown here — those
          // are global, this slot is for page-level shortcuts where a
          // single character ('/') is the convention.
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-divider-regular bg-background-subtle px-1.5 font-sans text-caption-xs tabular-nums text-text-tertiary"
          >
            {typeof hotkey === 'string' ? hotkey : hotkey.key}
          </kbd>
        ) : null}
      </div>
    </>
  )
})

// Internal sub-component — only mounted when the parent passes a
// `hotkey` prop. Lets us call useAppHotkey unconditionally from this
// component's POV while keeping the parent's call site optional.
function SearchInputHotkey({
  hotkey,
  hotkeyMeta,
  onTrigger,
}: {
  hotkey: RegisterableHotkey
  hotkeyMeta?: {
    id: string
    name: string
    description: string
    category: ShortcutCategory
    scope: ShortcutScope
  }
  onTrigger: () => void
}) {
  useAppHotkey(
    hotkey,
    (event) => {
      event.preventDefault()
      onTrigger()
    },
    {
      requireReset: true,
      ...(hotkeyMeta ? { meta: hotkeyMeta } : {}),
    },
  )
  return null
}
