import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@duedatehq/ui/lib/utils'

// 2026-06-07: NEW primitive — single-thumb Slider built on Base UI.
// Introduced for the /practice Smart Priority "Factor weights" tuner
// (Pencil H1YSCd), which trades the old number inputs for draggable
// weight sliders. Track + indicator tones reuse the same tokens as
// Progress (bg-background-subtle track, bg-state-accent-solid fill)
// so the two primitives read consistently.
//
// Surface:
//   <Slider value={35} min={0} max={100} step={1}
//           onValueChange={(v) => setWeight(v)} aria-label="Urgency" />
//
// Range (two-thumb) sliders are intentionally NOT supported here —
// callers pass a scalar `value`/`onValueChange`. Base UI's array form
// is hidden behind the scalar API to keep call sites simple.

function Slider({ className, ...props }: Omit<SliderPrimitive.Root.Props<number>, 'render'>) {
  return (
    <SliderPrimitive.Root data-slot="slider" className={cn('w-full', className)} {...props}>
      <SliderPrimitive.Control
        data-slot="slider-control"
        className="flex w-full touch-none items-center py-1.5 select-none"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="h-1.5 w-full rounded-full bg-background-subtle"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-indicator"
            className="rounded-full bg-state-accent-solid select-none data-disabled:bg-divider-regular"
          />
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            className={cn(
              'size-4 rounded-full border-2 border-state-accent-solid bg-background-default shadow-sm outline-none',
              'transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2 focus-visible:ring-offset-background-default',
              'data-disabled:cursor-not-allowed data-disabled:border-divider-regular',
            )}
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
