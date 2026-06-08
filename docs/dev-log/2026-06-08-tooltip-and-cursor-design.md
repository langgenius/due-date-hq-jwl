# Tooltip + cursor — more designed (Yuqi)

Date: 2026-06-08

`packages/ui/src/components/ui/tooltip.tsx` — shared primitive, so this lifts
every tooltip in the product at once.

## Cursor
`TooltipTrigger` now defaults to `cursor-help` (the question-mark caret) so a
hoverable explanation is discoverable on approach. Merged via `cn` so interactive
triggers (Button / links, which carry their own `cursor-pointer`) keep the
pointer cursor. Verified computed `cursor: help` on an info trigger.

## Tooltip box
Refined the content surface to read as an intentional floating chip instead of a
flat label:
- radius `rounded-md` → `rounded-lg`
- padding `px-2 py-1` → `px-2.5 py-1.5`
- type → `font-medium leading-snug` (was plain `text-xs`)
- shadow `shadow-md` → `shadow-lg`; blur `[5px]` → `[6px]`
- border `panel-border-subtle` → `panel-border` (a touch more defined)
Arrow + entrance animation unchanged.

## Verify
tsgo clean; trigger cursor computes `help`. (Couldn't auto-open the popup for a
screenshot — Base UI tracks real pointer/focus and the info trigger is a
non-focusable span — but the box change is deterministic CSS.)
