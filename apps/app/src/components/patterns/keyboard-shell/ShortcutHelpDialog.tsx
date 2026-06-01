import { useMemo } from 'react'
import { useHotkeyRegistrations } from '@tanstack/react-hotkeys'
import { Trans } from '@lingui/react/macro'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

import { Kbd } from '@/components/patterns/kbd'

import {
  RESERVED_SHORTCUTS,
  type AppHotkeyMeta,
  type ShortcutCategory,
  type ShortcutScope,
} from './types'
import { formatShortcutForDisplay, formatShortcutSequenceForDisplay } from './display'

interface ShortcutHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShortcutHelpItem {
  id: string
  keys: string
  name: string
  description: string
  category: ShortcutCategory
  scope: ShortcutScope
  disabledReason?: string | undefined
}

interface ShortcutHelpGroup {
  category: ShortcutCategory
  label: string
  items: ShortcutHelpItem[]
}

const CATEGORY_ORDER: ShortcutCategory[] = [
  'global',
  'navigate',
  'practice',
  'clients',
  'obligations',
  'rules',
  'wizard',
  'reserved',
]

const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  global: 'Global',
  navigate: 'Navigate',
  practice: 'Practice',
  clients: 'Clients',
  obligations: 'Deadlines',
  rules: 'Rules',
  wizard: 'Wizard',
  reserved: 'Reserved',
}

export function ShortcutHelpDialog({ open, onOpenChange }: ShortcutHelpDialogProps) {
  const { hotkeys, sequences } = useHotkeyRegistrations()

  const items = useMemo<ShortcutHelpItem[]>(() => {
    const registeredHotkeys = hotkeys
      .map((registration): ShortcutHelpItem | null => {
        const meta = registration.options.meta as AppHotkeyMeta | undefined
        if (!meta?.name) return null
        return {
          id: meta.id ?? registration.id,
          keys: meta.displayKeys ?? formatShortcutForDisplay(registration.hotkey),
          name: meta.name,
          description: meta.description ?? '',
          category: meta.category ?? 'global',
          scope: meta.scope ?? 'global',
          disabledReason: meta.disabledReason,
        }
      })
      .filter((item): item is ShortcutHelpItem => item !== null)

    const registeredSequences = sequences
      .map((registration): ShortcutHelpItem | null => {
        const meta = registration.options.meta as AppHotkeyMeta | undefined
        if (!meta?.name) return null
        return {
          id: meta.id ?? registration.id,
          keys: meta.displayKeys ?? registration.sequence.join(' then '),
          name: meta.name,
          description: meta.description ?? '',
          category: meta.category ?? 'navigate',
          scope: meta.scope ?? 'global',
          disabledReason: meta.disabledReason,
        }
      })
      .filter((item): item is ShortcutHelpItem => item !== null)

    const reserved = RESERVED_SHORTCUTS.map((shortcut) => ({
      id: shortcut.id,
      keys: formatShortcutSequenceForDisplay(shortcut.keys),
      name: shortcut.name,
      description: shortcut.description,
      category: shortcut.category,
      scope: shortcut.scope,
      disabledReason: shortcut.disabledReason,
    }))

    const seen = new Set<string>()
    return [...registeredHotkeys, ...registeredSequences, ...reserved].filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }, [hotkeys, sequences])

  const availableCount = items.reduce((count, item) => count + (item.disabledReason ? 0 : 1), 0)
  const reservedCount = items.length - availableCount
  const groups = useMemo<ShortcutHelpGroup[]>(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        items: items.filter((item) => item.category === category),
      })).filter((group) => group.items.length > 0),
    [items],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(820px,calc(100vh-2rem))] w-[min(1100px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden rounded-lg border border-components-panel-border bg-components-panel-bg p-0 shadow-overlay">
        {/* 2026-05-27 (Yuqi feedback "wider modal"): bumped from
            900 → 1100px and bumped max-h 760 → 820 so the shortcut
            descriptions fit on one line and the modal feels less
            cramped. Also dropping the redundant `Global` scope chip
            per-row (every row inside the GLOBAL section is already
            global — the section header carries that signal). The
            `Reserved` chip stays as it marks per-row state, not the
            section. */}
        {/* 2026-06-01: outer chrome (border-b, bg, padding) stays
            as a wrapper since DialogHeader is a plain flex stack and
            the dialog uses the gallery-style top-bar look. The title
            + description cluster now sits inside <DialogHeader> for
            the canonical gap-2 stack so consumers find the title via
            the semantic slot. */}
        <header className="flex shrink-0 flex-col gap-3 border-b border-divider-regular bg-background-default px-5 py-4 pr-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <DialogHeader className="gap-1">
              <DialogTitle>
                <Trans>Keyboard shortcuts</Trans>
              </DialogTitle>
              <DialogDescription>
                <Trans>Currently available shortcuts and reserved keyboard slots.</Trans>
              </DialogDescription>
            </DialogHeader>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Badge variant="secondary" className="font-mono tabular-nums">
                <Trans>{availableCount} available</Trans>
              </Badge>
              <Badge variant="outline" className="font-mono tabular-nums">
                <Trans>{reservedCount} reserved</Trans>
              </Badge>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 bg-background-body md:grid-cols-[184px_1fr]">
          <aside className="hidden border-r border-divider-regular bg-background-section p-3 md:block">
            <div className="grid gap-1">
              {groups.map((group) => {
                return (
                  <div
                    key={group.category}
                    className="flex min-h-9 items-center justify-between rounded-md px-2.5 text-sm"
                  >
                    <span className="font-medium text-text-secondary">{group.label}</span>
                    <span className="font-mono text-xs tabular-nums text-text-tertiary">
                      {group.items.length}
                    </span>
                  </div>
                )
              })}
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 md:px-5">
            <div className="grid gap-4">
              {groups.map((group) => {
                return (
                  <section key={group.category} className="grid gap-2">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-divider-subtle bg-background-body py-2">
                      <h3 className="text-xs font-semibold uppercase text-text-tertiary">
                        {group.label}
                      </h3>
                      <span className="font-mono text-xs tabular-nums text-text-tertiary">
                        {group.items.length}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-md border border-divider-regular bg-background-default">
                      {group.items.map((item) => (
                        <ShortcutRow key={item.id} item={item} />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ShortcutRow({ item }: { item: ShortcutHelpItem }) {
  // 2026-05-27 (Yuqi feedback): scope chip shown only when NOT global
  // — every visible row sits in a section that already names its
  // scope ("GLOBAL", "NAVIGATE", etc.), so the per-row 'Global' chip
  // was pure visual noise. Non-global scopes (e.g. "List") still
  // surface their chip to flag context-specific shortcuts.
  const showScopeChip = item.scope !== 'global'
  return (
    <div
      className={cn(
        'grid gap-3 border-b border-divider-subtle p-3 last:border-b-0 sm:grid-cols-[minmax(132px,168px)_1fr_auto] sm:items-center',
        item.disabledReason && 'bg-background-subtle',
      )}
    >
      <div className="flex flex-wrap items-center gap-1">
        {/* 2026-06-01: inline <kbd> elements routed through the
            Kbd primitive (now exported from patterns/kbd.tsx) so
            the help dialog shares the canonical keycap chrome with
            the inline KbdHint strips. */}
        {shortcutSegments(item.keys).map((segment) => (
          <span key={`${item.id}-${segment.id}`} className="contents">
            {!segment.first ? (
              <span className="px-0.5 text-xs text-text-tertiary">
                <Trans>then</Trans>
              </span>
            ) : null}
            <Kbd>{segment.key}</Kbd>
          </span>
        ))}
      </div>

      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-text-primary">{item.name}</span>
          {item.disabledReason ? (
            <Badge variant="outline">
              <Trans>Reserved</Trans>
            </Badge>
          ) : null}
        </div>
        <p className="break-words text-sm leading-5 text-text-secondary">
          {item.disabledReason ?? item.description}
        </p>
      </div>

      {showScopeChip ? (
        <Badge variant="outline" className="capitalize" translate="no">
          {item.scope}
        </Badge>
      ) : (
        <span aria-hidden />
      )}
    </div>
  )
}

function shortcutSegments(keys: string): Array<{ id: string; key: string; first: boolean }> {
  const counts = new Map<string, number>()
  const out: Array<{ id: string; key: string; first: boolean }> = []
  for (const key of keys.split(' then ')) {
    const count = (counts.get(key) ?? 0) + 1
    counts.set(key, count)
    out.push({ id: `${key}-${count}`, key, first: out.length === 0 })
  }
  return out
}
