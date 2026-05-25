export type ShortcutCategory =
  | 'global'
  | 'navigate'
  | 'practice'
  | 'obligations'
  | 'rules'
  | 'wizard'
  | 'reserved'

export type ShortcutScope = 'global' | 'route' | 'overlay' | 'native'

export interface AppHotkeyMeta {
  name?: string
  description?: string
  id?: string
  category?: ShortcutCategory
  scope?: ShortcutScope
  displayKeys?: string
  reserved?: boolean
  disabledReason?: string
}

export interface ReservedShortcut {
  id: string
  keys: string
  name: string
  description: string
  category: ShortcutCategory
  scope: ShortcutScope
  disabledReason: string
}

export const RESERVED_SHORTCUTS: ReservedShortcut[] = [
  {
    id: 'ask.focus',
    keys: '/',
    name: 'Focus Ask DueDateHQ',
    description: 'Ask search lands with Phase 1.',
    category: 'reserved',
    scope: 'global',
    disabledReason: 'Ask DueDateHQ is not enabled in the Demo Sprint.',
  },
  {
    id: 'evidence.selected',
    keys: 'Mod+E',
    name: 'Evidence mode for selected',
    description: 'Open evidence for the current selection.',
    category: 'reserved',
    scope: 'global',
    disabledReason: 'Evidence drawer selection wiring lands in Day 6.',
  },
]

export function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === 'textarea' || tag === 'select') return true
  if (tag === 'input') {
    const type = target.getAttribute('type')?.toLowerCase() ?? 'text'
    return !['button', 'checkbox', 'radio', 'reset', 'submit'].includes(type)
  }
  return target.isContentEditable
}

export function isInteractiveEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (isEditableEventTarget(target)) return true
  return Boolean(
    target.closest(
      'button,a[href],[role="button"],[role="menuitem"],[role="option"],[role="tab"],[data-radix-collection-item]',
    ),
  )
}
