import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

import { useKeyboardShell } from './keyboard-shell'

/**
 * Kbd — inline keyboard shortcut hint.
 *
 * Smaller and quieter than the version in `ShortcutHelpDialog` (which
 * is a full keyboard reference). Sized to live inline in panel headers
 * next to the action it modifies: `j next · k prev · esc exit`.
 *
 * Wrap each key in its own `<Kbd>`. For multi-key hints render an
 * inline list rather than a single Kbd with a slash.
 */
function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      translate="no"
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-divider-regular bg-background-subtle px-1 font-mono text-caption-xs font-medium tabular-nums text-text-secondary',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

/**
 * ShortcutHintChip — small discoverability chip for page toolbars.
 *
 * Renders `<kbd>?</kbd> for shortcuts` as a clickable button that opens
 * the global ShortcutHelpDialog. Lives in the right-side of page
 * headers (dashboard, clients list, rules library, pulse alerts) so
 * keyboard-shortcut affordances are discoverable without having to
 * guess that `?` is a magic key.
 *
 * The chip is keyboard-accessible (Enter/Space activate via native
 * <button>), focus-visible-ringed, and quiet enough not to compete
 * with primary actions in the same cluster.
 *
 * 2026-05-27 (Step 6 UX flows audit H1.4 / H2.6 / H2.7).
 */
export function ShortcutHintChip({ className }: { className?: string }) {
  const { openShortcutHelp } = useKeyboardShell()
  // 2026-05-27 (Yuqi feedback: "shortcuts this button is toooooo big"):
  // dropped the visible "for shortcuts" copy — the discoverability is
  // now carried by the title tooltip + aria-label, while the chip
  // renders as just the `?` kbd glyph. Roughly 1/3 the width.
  return (
    <button
      type="button"
      onClick={() => openShortcutHelp()}
      title="Keyboard shortcuts"
      aria-label="Keyboard shortcuts"
      className={cn(
        'inline-flex items-center justify-center rounded-md p-1 text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        className,
      )}
    >
      <Kbd>?</Kbd>
    </button>
  )
}

/**
 * KbdHint — labeled keyboard shortcut row. Renders as
 * `[kbd] label · [kbd] label · …` with bullets between pairs.
 *
 * Use for the canonical hint strip that lives in panel/drawer headers
 * — gives users a one-glance reference for the hotkeys active on that
 * surface without forcing them into the full Help dialog.
 */
export function KbdHint({
  items,
  className,
}: {
  items: Array<{ keys: string[]; label: string }>
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center gap-1 text-caption text-text-tertiary',
        className,
      )}
    >
      {items.map((item, index) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          {index > 0 ? (
            <span aria-hidden className="mx-1 text-text-tertiary">
              ·
            </span>
          ) : null}
          {item.keys.map((key) => (
            <Kbd key={`${item.label}-${key}`}>{key}</Kbd>
          ))}
          <span>{item.label}</span>
        </span>
      ))}
    </span>
  )
}
