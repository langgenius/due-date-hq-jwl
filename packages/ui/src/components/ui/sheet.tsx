import * as React from 'react'
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'
import { overlayBackdropClassName } from '@duedatehq/ui/lib/overlay'
import { Button } from '@duedatehq/ui/components/ui/button'

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(overlayBackdropClassName, className)}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  flush = false,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: 'top' | 'right' | 'bottom' | 'left'
  showCloseButton?: boolean
  flush?: boolean
}) {
  // 2026-06-01: `flush` variant codifies the canonical "sectioned drawer"
  // shape (gap-0 overflow-hidden p-0). FixNeedsFactsSheet,
  // ImportHistoryDrawer, and EvidenceDrawerProvider all override
  // SheetContent with the same recipe; this drops the override and
  // lets the header/body/footer own their own padding + dividers.
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        data-flush={flush ? 'true' : undefined}
        className={cn(
          'fixed z-50 flex flex-col gap-4 border-components-panel-border bg-components-panel-bg bg-clip-padding text-sm text-text-primary shadow-xl transition duration-300 ease-apple',
          flush && 'gap-0 overflow-hidden p-0',
          // Entry/exit animation: opacity-only fade. The previous
          // `translate-x-[2.5rem]` + `opacity-0` starting/ending state
          // was getting stuck (Base UI didn't always clear
          // `data-starting-style` after first paint), shifting the
          // popup 40px past the viewport and clipping the close
          // button. Opacity alone is robust to the stuck state — the
          // worst case is no fade animation, not a broken layout.
          'data-ending-style:opacity-0',
          // 12px inside-edge radius per DESIGN.md §3.3 (`rounded.lg` is
          // reserved for drawers, modals, command palette). The drawer
          // is flush to the viewport on its outer edge, so radius only
          // applies to the corners that meet the dimmed backdrop.
          'data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:rounded-t-lg data-[side=bottom]:border-t',
          'data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:rounded-r-lg data-[side=left]:border-r',
          'data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:rounded-l-lg data-[side=right]:border-l',
          'data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:rounded-b-lg data-[side=top]:border-b',
          'sm:data-[side=left]:max-w-sm sm:data-[side=right]:max-w-sm',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={<Button variant="ghost" className="absolute top-4 right-4" size="icon-sm" />}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 px-6 py-5', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  // 2026-05-26 (Yuqi feedback — "more bottom padding. also apply
  // universally to this kind of element/component"): bumped the
  // bottom padding from 16px → 24px. The top stays at 16px so the
  // footer reads as a "settles into the viewport edge" zone, not a
  // floating bar. Consumers that override `className` inherit the
  // asymmetry — the obligation drawer panel-mode footer + Pulse
  // drawer SheetFooter override are updated in lockstep.
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 px-6 pt-4 pb-6', className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-semibold text-text-primary', className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-text-tertiary', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
