import * as React from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Multi-line text input. Same token surface as Input but auto-sizing.
 */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'field-sizing-content flex min-h-16 w-full rounded-md border border-divider-regular bg-components-input-bg-normal px-3 py-2 text-sm text-components-input-text-filled outline-none transition-colors',
        'placeholder:text-components-input-text-placeholder',
        'hover:bg-components-input-bg-hover',
        'focus-visible:border-components-input-border-active focus-visible:bg-components-input-bg-active focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2 focus-visible:ring-offset-background-default',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-components-input-bg-disabled disabled:text-components-input-text-filled-disabled',
        'aria-invalid:border-components-input-border-destructive aria-invalid:bg-components-input-bg-destructive aria-invalid:ring-2 aria-invalid:ring-state-destructive-active aria-invalid:ring-offset-2',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
