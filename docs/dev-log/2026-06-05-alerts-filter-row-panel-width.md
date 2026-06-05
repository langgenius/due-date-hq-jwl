# Alerts Filter Row Panel Width

## Scope

- Browser feedback on `/alerts?alert=...`: opening alert detail shrinks the left alert list, but
  the filter row kept its old one-line width.

## Change

- Let the alert filter strip wrap in the detail-open split layout, and constrain it to the left
  list column with `w-full min-w-0`.
- This removes the left pane's horizontal overflow so the filter row width tracks the alert list
  width when the detail panel is open.
- Kept the trailing flex spacer only for the full-width list view. In detail-open split view,
  `Sort by` now follows the state filter directly and the wrapped row uses a tighter gap.

## Validation

- Confirmed this is a layout affordance fix inside the existing Alerts surface; no DESIGN.md update
  was needed.
