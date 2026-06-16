'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'
import { overlayBackdropClassName, overlayPopupAnimationClassName } from '@duedatehq/ui/lib/overlay'
import { Button } from '@duedatehq/ui/components/ui/button'

function Dialog({
  protectInput = false,
  onOpenChange,
  ...props
}: DialogPrimitive.Root.Props & {
  /**
   * "Protect input" modals — ones carrying unsaved text the user is composing
   * (a note, an email draft, a create-form) — must not vanish on a STRAY click
   * in the backdrop. With this set, an outside-press is cancelled; Esc, the ✕,
   * and an explicit Cancel still close (those are deliberate). Default off, so
   * simple/read-only modals keep the standard click-outside-to-dismiss.
   * (2026-06-16 close-interaction policy: "Smart — protect input".)
   */
  protectInput?: boolean
}) {
  return (
    <DialogPrimitive.Root
      data-slot="dialog"
      onOpenChange={(open, eventDetails) => {
        if (protectInput && !open && eventDetails.reason === 'outside-press') {
          eventDetails.cancel()
          return
        }
        onOpenChange?.(open, eventDetails)
      }}
      {...props}
    />
  )
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      // `isolate` keeps the close-button button-shadow stack above the backdrop.
      className={cn(overlayBackdropClassName, 'isolate', className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-lg border border-components-panel-border bg-components-panel-bg p-6 text-sm text-text-primary shadow-overlay outline-none',
          overlayPopupAnimationClassName,
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          // 2026-05-25 (Yuqi #45): close button moved from top-6
          // right-6 (24px from each edge — inside the padded area)
          // to top-3 right-3 (12px). At top-6/right-6 the X was
          // visually clustered with the title (both at the same y),
          // which read as "title chrome" rather than a window
          // close. At top-3/right-3 the X sits in the corner where
          // close affordances live by convention (Notion / Linear /
          // shadcn dialogs all park it at the corner edge). The
          // title now owns the top-left content slot cleanly.
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="dialog-header" className={cn('flex flex-col gap-2', className)} {...props} />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>Close</DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-medium text-text-primary', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-sm text-text-tertiary *:[a]:underline *:[a]:underline-offset-3 hover:*:[a]:text-text-accent',
        className,
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
