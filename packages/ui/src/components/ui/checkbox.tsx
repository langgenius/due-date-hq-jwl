'use client'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CheckIcon, MinusIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // 2026-05-27 (Yuqi feedback — "select all checkbox does not
        // look alright when one row is unselected"): added a named
        // `group/checkbox` so the icons inside the Indicator can
        // switch between Check and Minus via `group-data-[indeterminate]
        // /checkbox:` variants. Base UI sets `data-indeterminate` on
        // the Root when the `indeterminate` prop is true; previously
        // the Indicator always rendered the same CheckIcon, so the
        // tri-state caller (rules.library section header) couldn't
        // visually distinguish "all" from "some" selected.
        'group/checkbox peer relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-components-checkbox-border bg-components-checkbox-bg-unchecked outline-none transition-colors',
        'group-has-disabled/field:opacity-50',
        'after:absolute after:-inset-x-3 after:-inset-y-2',
        'hover:border-components-checkbox-border-hover hover:bg-components-checkbox-bg-unchecked-hover',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        'disabled:cursor-not-allowed disabled:border-components-checkbox-border-disabled disabled:bg-components-checkbox-bg-disabled',
        'aria-disabled:cursor-not-allowed aria-disabled:border-components-checkbox-border-disabled aria-disabled:bg-components-checkbox-bg-disabled',
        'data-disabled:cursor-not-allowed data-disabled:border-components-checkbox-border-disabled data-disabled:bg-components-checkbox-bg-disabled',
        'aria-invalid:border-state-destructive-border aria-invalid:ring-2 aria-invalid:ring-state-destructive-active aria-invalid:aria-checked:border-components-checkbox-bg',
        'data-checked:border-components-checkbox-bg data-checked:bg-components-checkbox-bg data-checked:text-components-checkbox-icon',
        'data-checked:hover:bg-components-checkbox-bg-hover data-checked:hover:border-components-checkbox-bg-hover',
        'data-checked:disabled:border-components-checkbox-bg-disabled-checked data-checked:disabled:bg-components-checkbox-bg-disabled-checked data-checked:disabled:text-components-checkbox-icon-disabled',
        'data-checked:aria-disabled:border-components-checkbox-bg-disabled-checked data-checked:aria-disabled:bg-components-checkbox-bg-disabled-checked data-checked:aria-disabled:text-components-checkbox-icon-disabled',
        'data-checked:data-disabled:border-components-checkbox-bg-disabled-checked data-checked:data-disabled:bg-components-checkbox-bg-disabled-checked data-checked:data-disabled:text-components-checkbox-icon-disabled',
        // Indeterminate state — paint the box the same accent fill as
        // "checked" so the row visibly differs from "none selected,"
        // but swap the inner glyph to a minus (see below). Without
        // these, an indeterminate checkbox renders identical to
        // unchecked because Base UI only adds data-indeterminate, it
        // doesn't add data-checked.
        'data-indeterminate:border-components-checkbox-bg data-indeterminate:bg-components-checkbox-bg data-indeterminate:text-components-checkbox-icon',
        'data-indeterminate:hover:border-components-checkbox-bg-hover data-indeterminate:hover:bg-components-checkbox-bg-hover',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        {/* 2026-05-27 (Yuqi feedback): MinusIcon shows in the
            indeterminate state (toggled via the Root's
            `group/checkbox` + `data-indeterminate`). CheckIcon
            shows otherwise (full-checked). One glyph rendered at a
            time so the box reads as three distinct states: empty,
            minus (some), check (all). */}
        <CheckIcon className="group-data-[indeterminate]/checkbox:hidden" />
        <MinusIcon className="hidden group-data-[indeterminate]/checkbox:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
