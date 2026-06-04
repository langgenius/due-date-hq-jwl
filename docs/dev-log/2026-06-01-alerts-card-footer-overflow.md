# Alerts Card Footer Overflow

## Change

- Fixed the split-view Alerts list so long footer badge rows wrap inside each alert card instead of widening the list column.
- Added horizontal overflow containment to the alert-list scroll column.
- Clamped long official-source badges with truncation so demo/test source names cannot push status or confidence chips outside the card.
- Let the split-view filter row wrap as needed; this keeps the list from gaining an x-axis scroller when the detail panel is open.

## Verification

- Target route: `/alerts?alert=41000000-0000-4000-8000-00000000d103`.
- DESIGN.md/docs remain aligned: this is a containment bug fix inside the existing Alerts split-view pattern, not a design-system change.
