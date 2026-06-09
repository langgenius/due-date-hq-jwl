import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Base input. Visual baseline matches DESIGN.md: h-9, rounded-lg,
 * subtle filled surface, and a 1px **inset** focus-visible ring.
 *
 * 2026-05-28 (Yuqi /today polish — "高度不要改变"): the prior
 * `ring-2 ring-offset-2 ring-offset-background-default` combo
 * rendered the focus ring 2px OUTSIDE the input border at a 2px
 * offset, which grew the input's effective bounding box by 4px in
 * every direction on focus. Visible everywhere — toolbar search
 * collapse/expand felt jumpy on click, dense table-filter rows
 * shifted on tab. Inset ring keeps the focus indicator legible
 * (1px accent inner edge layered with the border-active recolor)
 * without changing the geometry. Aria-invalid follows the same
 * inset treatment.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'flex h-9 w-full min-w-0 items-center rounded-lg border border-divider-regular bg-components-input-bg-normal px-3 py-1 text-sm text-components-input-text-filled outline-none transition-colors',
        'placeholder:text-components-input-text-placeholder',
        'hover:bg-components-input-bg-hover',
        'focus-visible:border-components-input-border-active focus-visible:bg-components-input-bg-active focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-components-input-bg-disabled disabled:text-components-input-text-filled-disabled',
        'aria-invalid:border-components-input-border-destructive aria-invalid:bg-components-input-bg-destructive aria-invalid:ring-1 aria-invalid:ring-inset aria-invalid:ring-state-destructive-active',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
