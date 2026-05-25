import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

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
