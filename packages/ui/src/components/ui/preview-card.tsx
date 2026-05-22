import * as React from 'react'
import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card'

import { cn } from '@duedatehq/ui/lib/utils'
import {
  overlayPopupAnimationClassName,
  overlayPopupBaseClassName,
} from '@duedatehq/ui/lib/overlay'

/**
 * Hover-driven peek card. Base UI's PreviewCard primitive (separate
 * from Popover, which is click-driven) — opens on pointer hover and
 * keyboard focus, stays open as the cursor moves into the card so
 * action buttons inside remain clickable.
 *
 * API mirrors the project's Popover wrapper for consistency:
 *
 *   <PreviewCard>
 *     <PreviewCardTrigger render={<button>…</button>} />
 *     <PreviewCardContent side="bottom" align="start">
 *       …
 *     </PreviewCardContent>
 *   </PreviewCard>
 *
 * `delay` and `closeDelay` (open/close hover timings) go on the
 * Trigger, not the Root — same as Base UI's underlying API.
 */

function PreviewCard({ ...props }: PreviewCardPrimitive.Root.Props) {
  return <PreviewCardPrimitive.Root data-slot="preview-card" {...props} />
}

function PreviewCardTrigger({ ...props }: PreviewCardPrimitive.Trigger.Props) {
  return <PreviewCardPrimitive.Trigger data-slot="preview-card-trigger" {...props} />
}

function PreviewCardContent({
  className,
  align = 'center',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 6,
  ...props
}: PreviewCardPrimitive.Popup.Props &
  Pick<PreviewCardPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return (
    <PreviewCardPrimitive.Portal>
      <PreviewCardPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PreviewCardPrimitive.Popup
          data-slot="preview-card-content"
          className={cn(
            overlayPopupBaseClassName,
            overlayPopupAnimationClassName,
            'flex flex-col gap-3 p-4 text-text-primary',
            className,
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  )
}

export { PreviewCard, PreviewCardContent, PreviewCardTrigger }
