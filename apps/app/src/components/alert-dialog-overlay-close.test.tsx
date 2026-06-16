import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@duedatehq/ui/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogTitle } from '@duedatehq/ui/components/ui/dialog'

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

function ControlledAlertDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = React.useState(true)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        onOpenChange(nextOpen)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard changes?</AlertDialogTitle>
          <AlertDialogDescription>This action can be cancelled.</AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function renderDialog(onOpenChange: (open: boolean) => void) {
  render(<ControlledAlertDialog onOpenChange={onOpenChange} />)
}

function renderNestedDialog(onOpenChange: (open: boolean) => void) {
  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Parent dialog</DialogTitle>
        <ControlledAlertDialog onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>,
  )
}

function render(children: React.ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(children)
  })
}

describe('Dialog protectInput (close-interaction policy)', () => {
  it('a normal Dialog still closes on overlay click', () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Plain dialog</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')
    expect(overlay).toBeInstanceOf(HTMLElement)
    act(() => {
      overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything())
  })

  it('a protectInput Dialog does NOT close on overlay click (unsaved input is safe)', () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog protectInput open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Form dialog</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')
    expect(overlay).toBeInstanceOf(HTMLElement)
    act(() => {
      overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    // The outside-press is cancelled, so the consumer is never asked to close.
    expect(onOpenChange).not.toHaveBeenCalledWith(false, expect.anything())
  })
})

describe('AlertDialog overlay dismissal', () => {
  it('closes the alert dialog when the overlay is clicked', () => {
    const onOpenChange = vi.fn()
    renderDialog(onOpenChange)

    const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]')
    expect(overlay).toBeInstanceOf(HTMLElement)

    act(() => {
      overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders a clickable alert dialog overlay when nested inside another dialog', () => {
    const onOpenChange = vi.fn()
    renderNestedDialog(onOpenChange)

    const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]')
    expect(overlay).toBeInstanceOf(HTMLElement)

    act(() => {
      overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
