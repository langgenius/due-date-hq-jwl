# Alerts State Filter Cursor Affordance

## Scope

- Browser feedback on `/alerts?alert=...`: clickable state/FED tiles and the Clear action in the
  state filter popover should show a pointer cursor on hover.

## Change

- Added `cursor-pointer` to clickable jurisdiction tiles in `StateTilegram`; disabled zero-count
  tiles still use `cursor-not-allowed`.
- Added `cursor-pointer` to the state filter popover's Clear action.

## Validation

- Confirmed this is a visual affordance-only change; no DESIGN.md update was needed.
