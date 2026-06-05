# Alerts FED State Filter Option

## Scope

- Browser feedback on `/alerts?alert=...`: the Filter by state popover did not offer FED even
  though Federal alerts use `jurisdiction: 'FED'`.

## Change

- Added FED as a compact tile in the alerts state filter, positioned next to HI.
- The FED tile uses the same active/disabled/count behavior as state tiles and calls the same
  jurisdiction filter handler with `FED`.

## Validation

- Confirmed this is a UI selector fix for an existing jurisdiction value; no DESIGN.md update was
  needed.
