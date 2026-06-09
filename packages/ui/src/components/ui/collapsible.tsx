import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

import { cn } from '@duedatehq/ui/lib/utils'

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ className, ...props }: CollapsiblePrimitive.Trigger.Props) {
  // Base UI renders the trigger as a <button>; Tailwind v4 leaves bare
  // buttons on the default arrow cursor, so opt this clickable disclosure
  // into the pointer. Call-site classes still win via cn ordering.
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn('cursor-pointer', className)}
      {...props}
    />
  )
}

function CollapsiblePanel({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return <CollapsiblePrimitive.Panel data-slot="collapsible-panel" {...props} />
}

export { Collapsible, CollapsibleTrigger, CollapsiblePanel }
