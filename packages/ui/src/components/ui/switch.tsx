import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { cn } from '@duedatehq/ui/lib/utils'

function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default'
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none',
        'after:absolute after:-inset-x-3 after:-inset-y-2',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        'aria-invalid:border-state-destructive-border aria-invalid:ring-2 aria-invalid:ring-state-destructive-active',
        'data-[size=default]:h-[18px] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6',
        'data-unchecked:bg-components-toggle-bg hover:data-unchecked:bg-components-toggle-bg-hover',
        'data-checked:bg-components-toggle-bg-checked hover:data-checked:bg-components-toggle-bg-checked-hover',
        'data-disabled:cursor-not-allowed data-disabled:data-unchecked:bg-components-toggle-bg-disabled data-disabled:data-checked:bg-components-toggle-bg-checked-disabled',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full bg-components-toggle-knob ring-0 transition-transform',
          'group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3',
          'group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)]',
          'group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0',
          'data-disabled:bg-components-toggle-knob-disabled',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
