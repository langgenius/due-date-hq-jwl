# Table canonical style

> **Source of truth**: `packages/ui/src/components/ui/table.tsx`
> **Visual reference**: `/today` ActionsTable
> **Established**: 2026-06-04 (Yuqi "ensure all of the tables in this app are having the same style")

Every table across DueDateHQ should look the same. This doc captures the canonical recipe — what the primitive provides automatically, and what callsites need to add.

## What the primitive provides automatically

The `<Table>` family (`packages/ui/components/ui/table.tsx`) ships these defaults — no override needed at the callsite:

| Element                      | Style                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `<TableHeader>`              | `bg-background-section` (gray-50, light inset) + `border-b border-divider-subtle`                                              |
| `<TableHead>` (column label) | `text-[11px] font-semibold tracking-[0.5px] uppercase text-text-tertiary` + `px-5 py-3 text-left align-middle`                 |
| `<TableBody>`                | `bg-background-default` (white)                                                                                                |
| `<TableRow>`                 | `border-b border-divider-subtle` + `even:bg-background-section/40` (zebra) + `hover:bg-state-base-hover` + `transition-colors` |
| `<TableCell>`                | `px-5 py-4 align-middle`                                                                                                       |
| `<TableFooter>`              | `border-t border-divider-subtle bg-background-section font-medium`                                                             |

## What the callsite owns

The OUTER wrapper around `<Table>` is callsite-controlled so each surface can opt into the right framing (regular bordered card, tier-accented Critical band, full-bleed under a page header, etc.).

The canonical "wrap me in a rounded card" recipe:

```tsx
<div className="overflow-hidden rounded-[12px] border border-divider-regular bg-background-default">
  <Table>
    <TableHeader>…</TableHeader>
    <TableBody>…</TableBody>
  </Table>
</div>
```

Variants:

- **Tier-accent** (multi-tier sections like /today's Critical / High / Upcoming):

  ```tsx
  <div className="overflow-hidden rounded-[12px] border border-divider-regular bg-background-default border-l-4 border-l-state-destructive-solid">
  ```

- **Header-dropped** (when the table reads as an "actions list", e.g. /today's ActionsTable):

  ```tsx
  <Table>
    {/* No <TableHeader> — rows speak for themselves */}
    <TableBody>…</TableBody>
  </Table>
  ```

- **Page-sticky header** (when the column header uses page-level `position: sticky`, e.g. /deadlines full-page queue): use `overflow-clip` instead of `overflow-hidden` on the wrapper.

  ```tsx
  <div className="overflow-clip rounded-[12px] border border-divider-regular bg-background-default">
  ```

  Why: a plain `overflow-hidden` ancestor establishes a scroll container and re-scopes the sticky header to the card (so it stops pinning to the page). `overflow: clip` clips the rounded corners identically but is **not** a scroll container, so the page-sticky header is preserved. Do NOT round the `<th>`s manually to fake the corners — a 12px th arc nested 1px inside the card's border (11px inner arc) leaves a hairline doubled corner; let the wrapper's clip do it.

## Cell content conventions

Per-cell content tone scales used in the row:

| Use                                  | Style                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| Row anchor (Action verb / row title) | `text-base font-medium text-text-primary`                                            |
| Supporting subject (Client name)     | `text-base font-medium text-text-secondary`                                          |
| Meta (dates, counts, codes)          | `text-sm font-medium tabular-nums` + tone-appropriate color                          |
| Caption / sublabel                   | `text-xs text-text-tertiary`                                                         |
| Form code chip                       | `<TaxCodeBadge>` (mono `text-[11px] font-medium bg-background-subtle rounded-[5px]`) |
| Status pill                          | `<ObligationStatusReadBadge>` (canonical Badge primitive)                            |

## Behavior

- **Row click**: callsite adds `onClick` + `cursor-pointer` + `tabIndex={0}` + `onKeyDown` for Enter/Space. The primitive's `hover:bg-state-base-hover` makes the interactivity visible automatically.
- **Subgroup divider rows** (e.g. "READY TO WORK / WAITING ON CLIENT"): `cursor-default` + `hover:!bg-background-section/40` overrides the default hover-bg so labels don't read as interactive.
- **Zebra striping**: built into `<TableRow>`. Adjacent rows separate visually even when content is short. Hover overlays cleanly.

## When to deviate

Callsites SHOULD NOT override the inherited defaults except for:

- Adding `cursor-pointer` on clickable rows
- Adding a tier-accent border on the outer wrapper
- Hiding `<TableHeader>` entirely when the table reads as a list (rare)
- Custom column widths via `w-[NNNpx]` on `<TableHead>`

Callsites SHOULD NOT change:

- Header bg tone (`bg-background-section` is canonical)
- Head label typography (11/600 uppercase tracking)
- Cell padding (`px-5 py-4`)
- Body bg (`bg-background-default`)
- Row hover tone (`bg-state-base-hover`)
- Zebra striping

If a surface has a strong reason to deviate, document it in code and reference this doc.

## Documented deviations

- **/deadlines queue urgency expression** (2026-06-22, `obligations.tsx`):
  - Per-row **urgency left-stripe** on the 2px left rail (red `destructive` /
    coral `warning` by `dueDaysTone(days).variant`), suppressed on
    filed/completed rows via `isDueDaysSuppressedForStatus`. Reuses the rail
    slot that client-cluster grouping also uses; urgency is placed last in the
    row `cn()` so it wins.
  - Soft **urgency-band lane wash** (red-50 / warning-50) on the group-header
    **cell** — NOT the row. The TableRow primitive's
    `has-aria-expanded:bg-state-base-hover` always outranks a row-level bg when
    the header carries a collapse button, so a row-level wash silently no-ops.
  - **Every column gets an explicit `w-[NNNpx]`** (incl. Status) so
    `table-fixed` distributes wide-screen slack PROPORTIONALLY across the row.
    Leaving exactly one column width-less makes it the sole fill and it eats all
    the slack as dead space (Status was ~40% of the table before this).
