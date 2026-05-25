import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@duedatehq/ui/components/ui/alert-dialog'

// Why this test exists
// --------------------
// Every destructive AlertDialog in the app has a Cancel (safe) and a
// destructive Action (Confirm / Delete / Disable / etc.). WAI-ARIA
// + WCAG guidance: when an alert dialog opens, focus should NOT
// land on the destructive button — accidental Enter would commit
// the action the user is being asked to reconsider.
//
// What this test catches in jsdom:
//   - A regression where someone adds `autoFocus` to the destructive
//     AlertDialogAction. React respects autoFocus in jsdom, so the
//     destructive button would become document.activeElement on
//     mount and these assertions fire.
//
// What this test does NOT catch (and why):
//   - Markup-inversion regressions (Action rendered before Cancel)
//     would change which button Base UI's focus-trap lands on in a
//     real browser, but jsdom doesn't run the focus-trap, so the
//     test can't see the difference. The destructive-confirms e2e
//     spec catches that case in Playwright/Chromium where the trap
//     actually runs.
//
// So this is the cheap-and-fast tier (jsdom autoFocus regression
// guard), and e2e covers the rest. Together they are the safety
// net for the 10 destructive confirms.

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

afterEach(() => {
  if (root) {
    act(() => root?.unmount())
  }
  container?.remove()
  root = null
  container = null
  document.body.replaceChildren()
})

function render(children: React.ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(children)
  })
}

/**
 * Returns the focused element's data-slot. Useful for asserting
 * which AlertDialog slot has focus without binding to button text.
 */
function activeSlot(): string | null {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return null
  return active.dataset.slot ?? null
}

describe('AlertDialog focus landing', () => {
  it('does not focus the destructive Action button when the dialog opens (Cancel-first markup)', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              Sign-in will only require your password until you re-enable MFA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep enabled</AlertDialogCancel>
            <AlertDialogAction variant="destructive-primary">Disable MFA</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    )

    // The destructive Action button must NOT have focus. We check
    // both the slot (defense against text-based assertions breaking
    // when copy changes) and the text label (defense against the
    // slot being renamed).
    expect(activeSlot()).not.toBe('alert-dialog-action')
    expect(document.activeElement?.textContent).not.toBe('Disable MFA')
  })

  it('does not focus the destructive Action button even when the dialog has a DestructiveChangePreview between header and footer', () => {
    // Mirrors the shape of the Downgrade-role dialog and the
    // Disable / Regenerate calendar confirms, which slot a preview
    // strip between the description and the footer. The preview
    // adds extra non-focusable DOM between Title and the buttons —
    // this test guards against a regression where that extra DOM
    // somehow shifts which button is "first focusable".
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downgrade member?</AlertDialogTitle>
            <AlertDialogDescription>
              Alex Mendez will drop from Preparer to Coordinator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div data-testid="impact-preview" className="text-xs">
            <p>Removes: assign deadlines to teammates</p>
            <p>Keeps: view all firm deadlines</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive-primary">Downgrade role</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    )

    expect(activeSlot()).not.toBe('alert-dialog-action')
    expect(document.activeElement?.textContent).not.toBe('Downgrade role')
  })

  it('does not focus an outside button when an AlertDialog opens nearby', () => {
    // Sibling regression case: an outside button shouldn't end up
    // focused after an AlertDialog opens. (If Base UI's focus trap
    // ran in jsdom, the outside button would also fail the "inside
    // the dialog" check; even without the trap running, we want
    // confidence that nothing in our wrapper layer pulls focus to
    // the outside trigger.)
    render(
      <>
        <button type="button">Outside trigger</button>
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove member?</AlertDialogTitle>
              <AlertDialogDescription>This action is permanent.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive-primary">Remove member</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>,
    )

    expect(document.activeElement?.textContent).not.toBe('Outside trigger')
    expect(activeSlot()).not.toBe('alert-dialog-action')
  })
})
