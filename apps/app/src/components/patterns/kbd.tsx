import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'

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
 * 2026-06-01: exported alongside `KbdHint` + `ShortcutHintChip` so the
 * three single-key inline-glyph call sites (email-otp-sign-in-form,
 * WizardShell esc hint, preview's GalleryKbd) stop hand-rolling the
 * same `<kbd>` recipe. Comment in preview.tsx already called out
 * that Kbd wasn't exported.
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
 *
 * 2026-05-27 (Step 6 UX flows audit H1.4 / H2.6 / H2.7).
 */
export function ShortcutHintChip({ className }: { className?: string }) {
  const { openShortcutHelp } = useKeyboardShell()
  // 2026-05-27 (Yuqi feedback round 2):
  //   • "not following the design system button" → use `<Button>` primitive
  //     with `variant="ghost" size="xs"` (h-7, text-xs)
  //   • "where's text? just be small text" → bring "for shortcuts" back,
  //     small. (Earlier I removed it entirely after the "too big" feedback;
  //     the right answer was smaller, not gone.)
  // 2026-06-09 (Yuqi #7 "hover — why no rounded corner?"): the xs Button's
  // 6px radius under `[corner-shape:squircle]` flattens the corners so the
  // ghost hover-fill read as a sharp rectangle. Bumped to `rounded-lg` (8px)
  // so the hover chip reads as a clearly-rounded affordance in the header
  // cluster.
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
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
