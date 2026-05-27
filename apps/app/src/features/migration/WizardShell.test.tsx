import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import { I18nProvider } from '@lingui/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { activateLocale, i18n } from '../../i18n/i18n'
import { WizardShell } from './WizardShell'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  activateLocale('en')
})

afterEach(() => {
  if (root) {
    act(() => root?.unmount())
  }
  container?.remove()
  root = null
  container = null
  document.body.replaceChildren()
})

function renderShell(confirmOnClose: boolean, onClose = vi.fn()) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <HotkeysProvider>
        <I18nProvider i18n={i18n}>
          <WizardShell
            open
            step={1}
            busy={false}
            canContinue={false}
            onContinue={() => {}}
            onClose={onClose}
            confirmOnClose={confirmOnClose}
          >
            <div>Step body</div>
          </WizardShell>
        </I18nProvider>
      </HotkeysProvider>,
    )
  })

  return { onClose }
}

function getCloseButton(): HTMLButtonElement {
  const button = document.querySelector('button[aria-label="Close wizard"]')
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('Expected Migration Wizard close button to render.')
  }
  return button
}

describe('Migration WizardShell close confirmation', () => {
  it('closes immediately when there is no discardable wizard work', () => {
    const { onClose } = renderShell(false)

    act(() => getCloseButton().click())

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).not.toContain('Leave without importing?')
  })

  it('opens the discard confirmation when wizard work exists', () => {
    const { onClose } = renderShell(true)

    act(() => getCloseButton().click())

    expect(onClose).not.toHaveBeenCalled()
    // 2026-05-26 (Step 7 onboarding audit F6-23): dialog title
    // was renamed from "Discard import?" to "Leave without
    // importing?" — the user hasn't yet imported anything,
    // so "discard" implied destruction of work that wasn't
    // there. Test follows the new title.
    expect(document.body.textContent).toContain('Leave without importing?')
  })
})
