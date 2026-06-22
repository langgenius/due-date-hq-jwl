import { useEffect, useRef, useState } from 'react'
import { type RegisterableHotkey } from '@tanstack/react-hotkeys'
import { SearchIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import type { ShortcutCategory, ShortcutScope } from '@/components/patterns/keyboard-shell'
import { useAppHotkey, useKeyboardShortcutsBlocked } from '@/components/patterns/keyboard-shell'

import { SearchInput } from './search-input'

/**
 * CollapsibleSearch — the ONE canonical collapsing toolbar search.
 *
 * 2026-06-16 (audit): /clients, /rules/library and /alerts each hand-rolled
 * the same "ghost magnifier at rest → expand into the canonical SearchInput"
 * control with subtly different triggers (some click-only, some click+`/`),
 * button variants (ghost vs outline) and retention rules. This consolidates
 * them into one self-managing primitive so every toolbar search behaves the
 * same:
 *   - REST    → a ghost magnifier icon button (toolbars are dense; the search
 *               shouldn't eat a 220px slot until it's wanted).
 *   - HOVER   → expands into the input (no focus steal — a mouse sweep must not
 *               hijack the keyboard; you still have to click to type).
 *   - CLICK / `/` hotkey → expands AND focuses + selects in one gesture.
 *   - STAYS open while focused OR while it carries a query (collapsing would
 *     hide active filter state).
 *   - COLLAPSES on mouse-leave only when empty AND unfocused.
 *
 * Page-level *lead* searches that are the primary affordance on their own row
 * (audit log, notifications, alert history) intentionally stay always-open —
 * this primitive is for searches that share a tight toolbar row with filters
 * and a sort control.
 */
export function CollapsibleSearch({
  value,
  onChange,
  placeholder,
  ariaLabel,
  collapsedLabel,
  hotkey,
  hotkeyMeta,
  size = 'icon-sm',
  expandedWidthClassName = 'w-full md:w-56 md:flex-none',
  className,
}: {
  value: string
  onChange: (next: string) => void
  /** Placeholder for the expanded field (carries the field hint). */
  placeholder: string
  /** Accessible label shared by the collapsed button AND expanded input so AT hears one control name. */
  ariaLabel: string
  /** Tooltip/title + aria-label for the collapsed magnifier (defaults to `ariaLabel`). */
  collapsedLabel?: string
  /** Optional `/` (or any) hotkey to expand → focus the input in one gesture. */
  hotkey?: RegisterableHotkey
  hotkeyMeta?: {
    id: string
    name: string
    description: string
    category: ShortcutCategory
    scope: ShortcutScope
  }
  /** Collapsed button size — `icon-sm` (h-8, default) or `icon` (h-9) to match the toolbar row. */
  size?: 'icon-sm' | 'icon'
  /** Width container for the expanded input. */
  expandedWidthClassName?: string
  /** Extra classes on the outer wrapper (e.g. `mb-1.5`, `ml-auto`). */
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  // `expanded` latches the hover/click/hotkey reveal; `focused` keeps it open
  // while the field has the caret. A live query also forces it open. Deriving
  // `isOpen` from all three means we never desync the button↔input swap.
  const [expanded, setExpanded] = useState(false)
  const [focused, setFocused] = useState(false)
  const isOpen = expanded || focused || value.length > 0

  // Click/hotkey reveals want to land the caret in the field, but the input
  // isn't mounted until `isOpen` flips. A bare rAF can fire before React
  // commits the input (concurrent render), so we latch the intent and focus
  // from a post-commit effect — guaranteed to run after the input exists.
  const pendingFocusRef = useRef(false)
  useEffect(() => {
    if (isOpen && pendingFocusRef.current) {
      pendingFocusRef.current = false
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isOpen])

  const reveal = (focus: boolean) => {
    if (focus) pendingFocusRef.current = true
    setExpanded(true)
  }

  const collapseLabel = collapsedLabel ?? ariaLabel

  // Collapsed width = the magnifier button's footprint (size-8 / size-9), so
  // the wrapper has a concrete width on BOTH ends and `transition-[width]` can
  // animate the icon↔input swap instead of jumping. The conditional mount of
  // the input is preserved (so the focus-on-reveal effect still fires); only
  // the wrapper width eases. ease-apple matches the sidebar's width grow.
  const collapsedWidthClassName = size === 'icon' ? 'w-9' : 'w-8'

  return (
    <div
      className={cn(
        'inline-flex transition-[width] duration-200 ease-apple motion-reduce:transition-none',
        isOpen ? expandedWidthClassName : `${collapsedWidthClassName} shrink-0`,
        className,
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        // Only retract a hover-revealed field; never yank one the user is
        // typing in or has a query in.
        if (!focused && value.length === 0) setExpanded(false)
      }}
    >
      {hotkey ? (
        <CollapsibleSearchHotkey
          hotkey={hotkey}
          {...(hotkeyMeta ? { hotkeyMeta } : {})}
          onTrigger={() => reveal(true)}
        />
      ) : null}
      {isOpen ? (
        <SearchInput
          ref={inputRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
          // Fill the (now always-inline-flex) wrapper so the field stretches to
          // the expanded width as the wrapper grows, instead of shrinking to
          // content. min-w-0 lets it shrink below its intrinsic width mid-grow.
          className="w-full min-w-0"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            if (value.length === 0) setExpanded(false)
          }}
        />
      ) : (
        <Button
          variant="ghost"
          size={size}
          aria-label={collapseLabel}
          title={hotkey ? `${collapseLabel}  ·  press / to focus` : collapseLabel}
          onClick={() => reveal(true)}
          className="shrink-0"
        >
          <SearchIcon className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  )
}

// Internal — only mounted when `hotkey` is set, so useAppHotkey stays
// unconditional from its own POV (Rules of Hooks) while the call site opts in.
function CollapsibleSearchHotkey({
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
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  useAppHotkey(
    hotkey,
    (event) => {
      event.preventDefault()
      onTrigger()
    },
    {
      enabled: !shortcutsBlocked,
      requireReset: true,
      ...(hotkeyMeta ? { meta: hotkeyMeta } : {}),
    },
  )
  return null
}
