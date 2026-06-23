import { forwardRef, useRef, type ChangeEvent, type KeyboardEvent, type Ref } from 'react'
import { type RegisterableHotkey } from '@tanstack/react-hotkeys'
import { SearchIcon, XIcon } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'

import { Input } from '@duedatehq/ui/components/ui/input'
import { cn } from '@duedatehq/ui/lib/utils'

import type { ShortcutCategory, ShortcutScope } from '@/components/patterns/keyboard-shell'
import { useAppHotkey } from '@/components/patterns/keyboard-shell'
import { Kbd } from '@/components/patterns/kbd'

/**
 * Canonical search bar for page-level table filtering.
 *
 * One source of truth across `/rules/library`, `/deadlines`, and
 * `/clients` so a CPA's muscle memory for "press /" or "click the X
 * to clear" works identically everywhere.
 *
 * Behavior:
 *  - h-9 (36px) with the SearchIcon at left-2.5 and an inline `X` clear
 *    button on the right when there's a value. (36px so they sit at the
 *    same height as the h-9 FilterTrigger pills they share toolbar rows
 *    with.)
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
    variant = 'default',
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
    /**
     * `default` — the bordered h-9 page/toolbar field.
     * `compact` — borderless h-7 field for sidebar rails (transparent at
     *   rest, `state-base-hover` fill on hover/focus, no ring). Shares every
     *   other behavior (placeholder, clear-X, Escape) so a rail search is the
     *   SAME control as a page search, just denser chrome.
     */
    variant?: 'default' | 'compact'
    autoFocus?: boolean
    onFocus?: () => void
    onBlur?: () => void
    /**
     * Optional `/` (or any) hotkey to focus this input + render a
     * discoverable kbd hint chip inside the input on the right when the
     * value is empty. Slack / Linear / GitHub all use `/` for "focus the
     * page filter"; standardising it here lets every consumer opt in with
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
      <div className={cn('group relative', className)}>
        <SearchIcon
          aria-hidden
          className={cn(
            // 2026-06-14 (Yuqi "microinteraction for search"): the icon is the
            // anchor that says "search", so it acknowledges interaction. Rest =
            // tertiary; focus-within OR a typed value promotes it to secondary
            // via transition-colors. For the flat `compact` rail (no border/ring
            // focus chrome) this is the ONLY focus affordance — a quiet darkening
            // rather than a fill, so the bar stays clean. Collapses to instant
            // under prefers-reduced-motion (global transition-duration override).
            'pointer-events-none absolute top-1/2 -translate-y-1/2 transition-colors duration-150 group-focus-within:text-text-secondary',
            value ? 'text-text-secondary' : 'text-text-tertiary',
            // 2026-06-11 (Yuqi rail feedback): compact icon sits flush at the
            // left so the search reads as a clean inline bar, not an inset field.
            variant === 'compact' ? 'left-0 size-3.5' : 'left-2.5 size-4',
          )}
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
          className={cn(
            'placeholder:text-text-secondary',
            // 2026-06-11 (Yuqi rail feedback "clean search bar"): the compact
            // (sidebar-rail) search is flat — transparent at rest AND on
            // hover/focus (no fill), no border, no ring, and flush horizontal
            // padding (icon at the left edge). Reads as a quiet inline filter
            // line rather than a chip.
            // 2026-06-16 (Yuqi NrQaI "clean borderless search bar — icon + text
            // only"): also zero the base Input's `py-1` so the compact rail
            // search is truly icon-+-text on a transparent line, no residual
            // vertical padding box. The base field's `px-3 py-1`, `bg-*`,
            // hover/focus fill, border + ring are ALL neutralised below.
            variant === 'compact'
              ? // Dimmed at rest (Yuqi 2026-06-23: an empty, unfocused rail filter
                // shouldn't read as active) — placeholder tertiary until the group
                // gains focus, then it brightens to secondary alongside the icon.
                'h-7 border-transparent bg-transparent px-0 py-0 pl-6 pr-6 placeholder:text-text-tertiary group-focus-within:placeholder:text-text-secondary hover:bg-transparent focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0'
              : 'h-9 bg-background-default pl-9 pr-9',
          )}
        />
        {value ? (
          <button
            type="button"
            aria-label={t`Clear`}
            onClick={() => onChange('')}
            className={cn(
              'absolute top-1/2 inline-flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-text-tertiary transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
              // 2026-06-14 (Yuqi "microinteraction for search"): the clear button
              // used to pop in the instant a character landed. Fade + 95% zoom-in
              // on mount so it arrives, rather than blinks. ~150ms (Doherty/sidebar
              // cadence). No exit animation — clearing should feel instant.
              'animate-in fade-in zoom-in-95 duration-150 ease-out',
              variant === 'compact' ? 'right-0 size-5' : 'right-2 size-6',
            )}
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
          <span
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-in fade-in duration-150"
          >
            {/* 2026-06-11 (keyboard-focus audit): hand-rolled <kbd> recipe
                converged on the canonical Kbd pattern — one keycap look
                across hint chips, panel headers, and the shortcut dialog. */}
            <Kbd>{typeof hotkey === 'string' ? hotkey : hotkey.key}</Kbd>
          </span>
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
