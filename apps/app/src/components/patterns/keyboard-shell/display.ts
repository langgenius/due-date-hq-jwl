import { formatForDisplay, type RegisterableHotkey } from '@tanstack/react-hotkeys'

export const COMMAND_PALETTE_HOTKEY = 'Mod+K'
export const SIDEBAR_TOGGLE_HOTKEY = 'Mod+B'

export function formatShortcutForDisplay(hotkey: RegisterableHotkey | (string & {})): string {
  return formatForDisplay(hotkey)
}

export function formatCompactShortcutForDisplay(
  hotkey: RegisterableHotkey | (string & {}),
): string {
  return formatShortcutForDisplay(hotkey).replace(/\s+/g, '\u202f')
}

export function formatShortcutSequenceForDisplay(keys: string): string {
  return keys
    .split(' then ')
    .map((key) => formatShortcutForDisplay(key))
    .join(' then ')
}
