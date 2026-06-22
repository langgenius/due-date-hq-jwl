import * as React from 'react'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'
import {
  overlayCheckboxIndicatorClassName,
  overlayLabelClassName,
  overlayPopupAnimationClassName,
  overlayPopupBaseClassName,
  overlayRowClassName,
  overlaySeparatorClassName,
} from '@duedatehq/ui/lib/overlay'

const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn('scroll-my-1 p-1', className)}
      {...props}
    />
  )
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn('flex flex-1 text-left', className)}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: 'sm' | 'default'
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        'flex w-fit cursor-pointer items-center justify-between gap-1.5 rounded-xl border border-divider-regular bg-components-input-bg-normal py-2 pr-2 pl-3 text-sm whitespace-nowrap text-text-primary transition-colors outline-none',
        'data-[size=default]:h-9 data-[size=sm]:h-8',
        'hover:bg-components-input-bg-hover',
        'focus-visible:border-components-input-border-active focus-visible:bg-components-input-bg-active focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2 focus-visible:ring-offset-background-default',
        'disabled:cursor-not-allowed disabled:bg-components-input-bg-disabled disabled:text-components-input-text-filled-disabled',
        'aria-invalid:border-components-input-border-destructive aria-invalid:bg-components-input-bg-destructive aria-invalid:ring-2 aria-invalid:ring-state-destructive-active aria-invalid:ring-offset-2',
        'data-placeholder:text-components-input-text-placeholder',
        '*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={<ChevronDownIcon className="pointer-events-none size-4 text-text-tertiary" />}
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = 'bottom',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset' | 'alignItemWithTrigger'
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            overlayPopupBaseClassName,
            overlayPopupAnimationClassName,
            'relative isolate w-max min-w-(--anchor-width) max-w-[calc(100vw-2rem)] data-[align-trigger=true]:transition-none',
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(overlayLabelClassName, className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  indicatorPosition = 'end',
  ...props
}: SelectPrimitive.Item.Props & {
  indicatorPosition?: 'start' | 'end'
}) {
  const indicatorAtStart = indicatorPosition === 'start'

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        overlayRowClassName,
        'relative',
        indicatorAtStart ? 'pr-2 pl-7' : 'pr-8 pl-2',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 items-center gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      {indicatorAtStart ? (
        <span
          // Selected check pops in once per selection (checkbox.tsx recipe).
          className={cn(
            overlayCheckboxIndicatorClassName,
            '[&>svg]:animate-in [&>svg]:fade-in [&>svg]:zoom-in-75 [&>svg]:duration-150 motion-reduce:[&>svg]:animate-none',
          )}
          data-slot="select-item-indicator"
        >
          <SelectPrimitive.ItemIndicator>
            <CheckIcon className="size-3" />
          </SelectPrimitive.ItemIndicator>
        </span>
      ) : (
        <SelectPrimitive.ItemIndicator
          render={
            <span className="pointer-events-none absolute top-1/2 right-2 flex size-4 -translate-y-1/2 items-center justify-center text-text-accent [&>svg]:animate-in [&>svg]:fade-in [&>svg]:zoom-in-75 [&>svg]:duration-150 motion-reduce:[&>svg]:animate-none" />
          }
        >
          <CheckIcon className="pointer-events-none" />
        </SelectPrimitive.ItemIndicator>
      )}
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(overlaySeparatorClassName, 'pointer-events-none', className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-components-panel-bg py-1 text-text-tertiary [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-components-panel-bg py-1 text-text-tertiary [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
