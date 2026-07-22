'use client'

import * as React from 'react'
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'

import { Button } from '@duedatehq/ui/components/ui/button'
import { overlayBackdropClassName, overlayModalAnimationClassName } from '@duedatehq/ui/lib/overlay'
import { cn } from '@duedatehq/ui/lib/utils'

type AlertDialogActionsRef = React.RefObject<AlertDialogPrimitive.Root.Actions | null>

const AlertDialogActionsContext = React.createContext<AlertDialogActionsRef | null>(null)

function AlertDialog({ actionsRef: actionsRefProp, ...props }: AlertDialogPrimitive.Root.Props) {
  const internalActionsRef = React.useRef<AlertDialogPrimitive.Root.Actions | null>(null)
  const actionsRef = actionsRefProp ?? internalActionsRef

  return (
    <AlertDialogActionsContext.Provider value={actionsRef}>
      <AlertDialogPrimitive.Root data-slot="alert-dialog" actionsRef={actionsRef} {...props} />
    </AlertDialogActionsContext.Provider>
  )
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

type AlertDialogOverlayClickEvent = Parameters<
  NonNullable<AlertDialogPrimitive.Backdrop.Props['onClick']>
>[0]

function AlertDialogOverlay({
  className,
  forceRender = true,
  onClick,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  const actionsRef = React.useContext(AlertDialogActionsContext)

  function handleClick(event: AlertDialogOverlayClickEvent) {
    onClick?.(event)

    if (event.defaultPrevented) {
      return
    }

    actionsRef?.current?.close()
  }

  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      // Same asymmetric fade timing as the dialog backdrop (see dialog.tsx).
      className={cn(
        overlayBackdropClassName,
        'isolate duration-250 data-ending-style:duration-150',
        className,
      )}
      forceRender={forceRender}
      onClick={handleClick}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  size = 'default',
  ...props
}: AlertDialogPrimitive.Popup.Props & {
  size?: 'default' | 'sm'
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-lg border border-components-panel-border bg-components-panel-bg p-6 text-sm text-text-primary shadow-overlay outline-none data-[size=sm]:max-w-[min(400px,calc(100vw-2rem))]',
          overlayModalAnimationClassName,
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2 text-left', className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn('text-lg leading-none font-medium text-text-primary', className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn('text-sm text-pretty text-text-tertiary', className)}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-action"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  variant = 'outline',
  size = 'default',
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
