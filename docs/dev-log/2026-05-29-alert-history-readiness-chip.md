# Alert history readiness chip

## Context

Alert history rows can include already-applied or already-reviewed Pulse alerts.
The card footer still rendered the readiness chip, so an applied history row
could show both `Applied` and `Ready to apply`.

## Change

- Added a `showReadiness` prop to `PulseAlertCard`.
- Hid readiness chips in `/rules/pulse/history`.
- Guarded readiness chips to matched/open alerts only, so already-actioned rows
  do not show action readiness.
- Guarded the drawer readiness notice the same way, so deep-linked history
  alerts do not show `Ready to apply` after opening the panel.

## Validation

- Added component coverage for history-hidden readiness and applied alerts.
- No DESIGN.md update needed: this is a status-signal cleanup within the
  existing Alert history layout.
