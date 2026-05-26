/**
 * Shared class strings for overlay primitives (popover, dialog, dropdown-menu,
 * select, tooltip, sheet). Centralised so all six surfaces share consistent
 * border / blur / animation tokens without duplicating long Tailwind strings.
 *
 * Adapted from Dify's @langgenius/dify-ui overlay-shared.ts and rewritten
 * against the local Dify-style token tree (bg-components-panel-bg-blur,
 * border-components-panel-border, state-*-hover, text-text-*).
 */

export type OverlayItemVariant = 'default' | 'destructive'

/* Highlightable row inside an overlay (menu item, select option). */
export const overlayRowClassName =
  'mx-1 flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 outline-hidden select-none data-highlighted:bg-state-base-hover data-disabled:cursor-not-allowed data-disabled:opacity-50'

/* Adds destructive variant styling on top of overlayRowClassName. */
export const overlayDestructiveClassName =
  'data-[variant=destructive]:text-text-destructive data-[variant=destructive]:data-highlighted:bg-state-destructive-hover'

/* Trailing indicator (check-mark, chevron) inside a row. */
export const overlayIndicatorClassName = 'ml-auto flex shrink-0 items-center text-text-accent'

/* Checkbox-style selected indicator used by header filters and filter selects. */
export const overlayCheckboxIndicatorClassName =
  'pointer-events-none absolute left-2 flex size-3.5 items-center justify-center rounded-[3px] border border-divider-regular bg-background-default text-text-accent'

/* Section label (group header) inside menus / selects. */
export const overlayLabelClassName =
  'px-3 pt-1 pb-0.5 text-2xs font-medium tracking-wider uppercase text-text-tertiary'

/* Inline separator between rows / groups. */
export const overlaySeparatorClassName = 'my-1 h-px bg-divider-subtle'

/* Floating panel surface (popover / dropdown / select / context-menu). */
export const overlayPopupBaseClassName =
  'max-h-(--available-height) overflow-x-hidden overflow-y-auto rounded-lg border border-components-panel-border bg-components-panel-bg-blur py-1 text-sm text-text-secondary shadow-md outline-hidden backdrop-blur-[5px] focus:outline-hidden focus-visible:outline-hidden'

/* Open / close transition for the floating surface. Pairs with Base UI's
 * `data-starting-style` / `data-ending-style` attributes. */
export const overlayPopupAnimationClassName =
  'origin-(--transform-origin) transition-[transform,scale,opacity] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none'

/* Backdrop for blocking overlays (alert-dialog, dialog, sheet). Picks up the
 * Dify-style background-overlay tint plus a soft blur where supported. */
export const overlayBackdropClassName =
  'fixed inset-0 z-50 bg-background-overlay transition-opacity duration-150 supports-backdrop-filter:backdrop-blur-xs data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none'
