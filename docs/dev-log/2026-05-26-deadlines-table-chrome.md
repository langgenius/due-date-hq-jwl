# /deadlines table chrome — final canonical

**Date:** 2026-05-26
**Branch:** `design/inset-surface-system`
**Scope:** Table layering, row hover, pagination footer pinning

Yuqi's canonical for the queue table:

- `<Table>` itself has **no background** — it sits transparent on the page's inset gray surface.
- `<TableHeader>` renders on `bg-background-default-dimmed` (= `state-base-hover-alt`, a light blue-tinted gray) instead of the primitive's `bg-background-subtle`. This is the new design-system canonical for "header band that sits one step above white."
- `<TableBody>` is `bg-background-default` (white). Rows themselves carry the white surface; the table wrapper does not.
- Row hover state = `bg-state-accent-hover` (`#eff4ff`, the same accent tint the right detail panel uses when a row is selected). Hovering previews where the panel will paint when you click.

## Why this matters

The previous setup applied `bg-background-default` to the outer `<Table>`, which painted white across the full table footprint including the rounded corners + outer padding. That created a "white card on gray inset" look that Yuqi flagged as a redundant chrome layer (the scroll column already provides framing).

Splitting the surface paint:

- Outer `<Table>` transparent → page inset gray surrounds the body
- `<TableBody>` white → the data rows are the white surface, no extra white card around them
- `<TableHeader>` dimmed → the header band reads as a labeled cap above the body, not a separate stripe

## Pagination footer

`mt-auto` re-instated so the row always pins to the bottom of the scroll column regardless of how many rows render. `bg-background-default` dropped — the footer is now a transparent strip with just a top hairline (`border-t border-divider-subtle`), reading as a continuation of the table instead of a separate chrome layer.

## Hover-as-preview

`hover:bg-state-accent-hover` on every TableRow paints the hovered row in the same accent tint the right-side detail panel uses for the active alert/row. This gives a strong "hover = preview of selection" signal: when you hover a row and the next interaction would open the panel, the row tints toward the panel's color before the click happens.

## Tokens used

| Token                         | Value                                             | Role           |
| ----------------------------- | ------------------------------------------------- | -------------- |
| `--background-default`        | `#ffffff`                                         | TableBody rows |
| `--background-default-dimmed` | `state-base-hover-alt` (`rgb(200 206 218 / 0.4)`) | TableHeader    |
| `--state-accent-hover`        | `#eff4ff`                                         | Row hover      |

## Verification

- `tsc` clean
- `vp lint` 0 errors, 8 pre-existing warnings
