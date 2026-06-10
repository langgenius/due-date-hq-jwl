import type { ReactNode } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'

import { Button } from '@duedatehq/ui/components/ui/button'
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
 *
 * Exported alongside `KbdHint` + `ShortcutHintChip` so single-key
 * inline-glyph call sites (email-otp-sign-in-form, WizardShell esc hint,
 * preview's GalleryKbd) share one `<kbd>` recipe.
 */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
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
 */
export function ShortcutHintChip({
  className,
  compact = false,
}: {
  className?: string
  // `compact` drops the "for shortcuts"
  // label and renders just the `?` keycap (with an accessible name +
  // native tooltip), so a dense action cluster isn't carrying a sentence.
  compact?: boolean
}) {
  const { t } = useLingui()
  const { openShortcutHelp } = useKeyboardShell()
  // Uses the `<Button>` primitive with `variant="ghost" size="xs"` (h-7,
  // text-xs) and a small "for shortcuts" label.
  //
  // The xs Button's 6px radius under `[corner-shape:squircle]` flattens the
  // corners so the ghost hover-fill reads as a sharp rectangle. `rounded-lg`
  // (8px) makes the hover chip read as a clearly-rounded affordance in the
  // header cluster.
  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        // size="sm" → h-8, matching the toolbar's `+` import button and the
        // My-work/Everyone toggle it sits beside (Yuqi: same height as toggle
        // and +). The `?` keycap inside stays its own 18px glyph, centered.
        size="sm"
        onClick={() => openShortcutHelp()}
        aria-label={t`Keyboard shortcuts`}
        title={t`Keyboard shortcuts`}
        className={cn('rounded-lg px-2 text-text-tertiary hover:text-text-secondary', className)}
      >
        <Kbd>?</Kbd>
      </Button>
    )
  }
  return (
    <Button
      type="button"
      variant="ghost"
      // size="sm" → h-8, matching the toolbar's `+` import button and the
      // My-work/Everyone toggle (Yuqi: same height as toggle + `+`).
      size="sm"
      onClick={() => openShortcutHelp()}
      className={cn('rounded-lg text-text-tertiary hover:text-text-secondary', className)}
    >
      <Kbd>?</Kbd>
      <span>
        <Trans>for shortcuts</Trans>
      </span>
    </Button>
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
