import { lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import {
  HotkeysProvider,
  type HotkeysProviderOptions,
  type RegisterableHotkey,
} from '@tanstack/react-hotkeys'

import type { ThemePreference } from '@duedatehq/ui/theme'

import { useMigrationWizard } from '@/features/migration/WizardProvider'

import { COMMAND_PALETTE_HOTKEY } from './display'
import {
  useAppHotkey,
  useAppHotkeySequence,
  useKeyboardShell,
  useKeyboardShortcutsBlocked,
} from './hooks'
import { NAVIGATION_SHORTCUTS, type NavigationShortcut } from './navigation-shortcuts'
import { KeyboardShellContext } from './state'

const CommandPalette = lazy(() =>
  import('./CommandPalette').then((module) => ({ default: module.CommandPalette })),
)
const ShortcutHelpDialog = lazy(() =>
  import('./ShortcutHelpDialog').then((module) => ({ default: module.ShortcutHelpDialog })),
)

const QUESTION_MARK_HOTKEY = { key: '/', shift: true } satisfies RegisterableHotkey

const HOTKEY_DEFAULTS: HotkeysProviderOptions = {
  hotkey: {
    conflictBehavior: 'warn',
    preventDefault: true,
    stopPropagation: true,
  },
  hotkeySequence: {
    conflictBehavior: 'warn',
    preventDefault: true,
    stopPropagation: true,
    timeout: 1500,
  },
}

interface KeyboardProviderProps {
  children: ReactNode
  themePreference: ThemePreference
  switchThemePreference: (next: ThemePreference) => void
}

export function KeyboardProvider({
  children,
  themePreference,
  switchThemePreference,
}: KeyboardProviderProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const { open: wizardOpen } = useMigrationWizard()

  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), [])
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), [])
  const openShortcutHelp = useCallback(() => setShortcutHelpOpen(true), [])
  const closeShortcutHelp = useCallback(() => setShortcutHelpOpen(false), [])
  const shortcutsBlocked = wizardOpen || commandPaletteOpen || shortcutHelpOpen

  const value = useMemo(
    () => ({
      commandPaletteOpen,
      shortcutHelpOpen,
      shortcutsBlocked,
      openCommandPalette,
      closeCommandPalette,
      openShortcutHelp,
      closeShortcutHelp,
    }),
    [
      closeCommandPalette,
      closeShortcutHelp,
      commandPaletteOpen,
      openCommandPalette,
      openShortcutHelp,
      shortcutHelpOpen,
      shortcutsBlocked,
    ],
  )

  return (
    <HotkeysProvider defaultOptions={HOTKEY_DEFAULTS}>
      <KeyboardShellContext.Provider value={value}>
        <GlobalKeyboardBindings
          themePreference={themePreference}
          switchThemePreference={switchThemePreference}
        />
        {children}
        {shortcutHelpOpen ? (
          <Suspense fallback={null}>
            <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
          </Suspense>
        ) : null}
        {commandPaletteOpen ? (
          <Suspense fallback={null}>
            <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
          </Suspense>
        ) : null}
      </KeyboardShellContext.Provider>
    </HotkeysProvider>
  )
}

function GlobalKeyboardBindings({
  themePreference,
  switchThemePreference,
}: {
  themePreference: ThemePreference
  switchThemePreference: (next: ThemePreference) => void
}) {
  const { openCommandPalette, closeCommandPalette, commandPaletteOpen, openShortcutHelp } =
    useKeyboardShell()

  useAppHotkey(
    COMMAND_PALETTE_HOTKEY,
    () => {
      if (commandPaletteOpen) closeCommandPalette()
      else openCommandPalette()
    },
    {
      requireReset: true,
      ignoreInputs: false,
      meta: {
        id: 'command.open',
        name: 'Command palette',
        // 2026-05-24 (critique P2 — clarify): drop "ask" — the
        // assistant group was removed but the copy hadn't.
        description: 'Search or navigate.',
        category: 'global',
        scope: 'global',
      },
    },
  )

  useAppHotkey(QUESTION_MARK_HOTKEY, () => openShortcutHelp(), {
    requireReset: true,
    ignoreInputs: true,
    meta: {
      id: 'shortcuts.open',
      name: 'Keyboard shortcuts',
      description: 'Show all available keyboard shortcuts.',
      category: 'global',
      scope: 'global',
      displayKeys: '?',
    },
  })

  useAppHotkey(
    'Mod+Shift+D',
    () => {
      switchThemePreference(themePreference === 'dark' ? 'light' : 'dark')
    },
    {
      requireReset: true,
      meta: {
        id: 'theme.toggle',
        name: 'Toggle dark mode',
        description: 'Switch between light and dark mode.',
        category: 'global',
        scope: 'global',
      },
    },
  )

  return (
    <>
      {NAVIGATION_SHORTCUTS.map((shortcut) => (
        <NavigationHotkeyBinding key={shortcut.id} shortcut={shortcut} />
      ))}
    </>
  )
}

function NavigationHotkeyBinding({ shortcut }: { shortcut: NavigationShortcut }) {
  const navigate = useNavigate()
  const shortcutsBlocked = useKeyboardShortcutsBlocked()

  useAppHotkeySequence(shortcut.sequence, () => void navigate(shortcut.path), {
    enabled: !shortcutsBlocked,
    meta: {
      id: shortcut.id,
      name: shortcut.name,
      description: shortcut.description,
      category: 'navigate',
      scope: 'global',
      displayKeys: shortcut.displayKeys,
    },
  })

  return null
}
