# Alert tax-code tooltip copy

Date: 2026-06-08

Yuqi flagged the `/alerts` tax-code badge tooltip because the hover content
showed internal canonical IDs like `ny_it204`. The badge itself already renders
the human label (`NY IT-204`), so the tooltip now repeats that human label and
adds only jurisdiction + plain-English description.

Implementation:

- Updated the shared `TaxCodeBadge` / `TaxCodeLabel` tooltip body in
  `apps/app/src/components/primitives/tax-code-label.tsx`.
- Removed raw canonical code display from the tooltip surface; no alert row,
  rail, or dashboard tax-code badge should show snake_case IDs on hover.

Validation:

- Target: `/alerts`, hover the `NY IT-204` badge on the NY DTF alert row.
