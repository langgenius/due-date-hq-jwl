import { describe, expect, it } from 'vitest'

import { formatCompactShortcutForDisplay, formatShortcutSequenceForDisplay } from './display'
import { NAVIGATION_SHORTCUTS } from './navigation-shortcuts'
import { isEditableEventTarget, isInteractiveEventTarget, RESERVED_SHORTCUTS } from './types'

describe('keyboard shell utilities', () => {
  it('treats text controls and contenteditable as editable targets', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const editable = document.createElement('div')
    editable.contentEditable = 'true'

    expect(isEditableEventTarget(input)).toBe(true)
    expect(isEditableEventTarget(textarea)).toBe(true)
    expect(isEditableEventTarget(select)).toBe(true)
    expect(isEditableEventTarget(editable)).toBe(true)
  })

  it('does not treat button-like controls as editable targets', () => {
    const buttonInput = document.createElement('input')
    buttonInput.type = 'button'
    const button = document.createElement('button')

    expect(isEditableEventTarget(buttonInput)).toBe(false)
    expect(isEditableEventTarget(button)).toBe(false)
  })

  it('treats buttons and menu items as interactive shortcut targets', () => {
    const button = document.createElement('button')
    const item = document.createElement('div')
    item.setAttribute('role', 'menuitem')

    expect(isInteractiveEventTarget(button)).toBe(true)
    expect(isInteractiveEventTarget(item)).toBe(true)
  })

  it('keeps disabled PRD shortcut slots visible for help surfaces', () => {
    expect(RESERVED_SHORTCUTS.map((shortcut) => shortcut.id)).toEqual([
      'ask.focus',
      'evidence.selected',
    ])
  })

  it('formats display labels through the shared hotkey formatter', () => {
    expect(formatShortcutSequenceForDisplay('Mod+Shift+O')).not.toContain('Mod')
    expect(formatShortcutSequenceForDisplay('G then D')).toBe('G then D')
    expect(formatCompactShortcutForDisplay('Mod+K')).not.toContain(' ')
  })

  it('keeps operations navigation shortcuts explicit', () => {
    expect(
      NAVIGATION_SHORTCUTS.map((shortcut) => [shortcut.id, shortcut.path, shortcut.displayKeys]),
    ).toEqual([
      ['nav.dashboard', '/', 'G then D'],
      ['nav.obligations', '/obligations', 'G then W'],
      ['nav.inbox', '/notifications', 'G then I'],
      ['nav.clients', '/clients', 'G then C'],
      ['nav.workload', '/workload', 'G then T'],
    ])
  })
})
