# 2026-05-25 — Phase 8: status icons + pagination styling + quieter sort indicator

## Why

Three Yuqi follow-ups landed in one batch:

1. **Status as glyph**: Yuqi sketched the canonical lifecycle states
   with lucide icons (Loader, Hourglass, Construction,
   MessageSquareText, FileCheck, CircleCheck) and tinted colors.
   Replace the abstract status dot with a recognizable glyph
   wherever a status renders — pills, the deadline filter tabs,
   dropdowns.
2. **Sticky bottom pagination**: keep the row count + keyboard
   hints + pagination together at the bottom of the queue. The
   pagination chip should read as a bordered group ("← 2 / N →"),
   matching the screenshot.
3. **Quiet the sort arrow**: Yuqi flagged the column-header sort
   icon as "出戏" — the bold arrow / double-arrow button was
   reading as a navigation control on every column. Drop the
   unsorted-state icon, replace `Arrow*` glyphs with subtle
   chevrons, merge the icon button into the header label as one
   clickable region.

## Shipped

### Status icon map (`apps/app/src/features/obligations/status-control.tsx`)

New `STATUS_ICON: Record<ObligationStatus, LucideIcon>` and
`STATUS_ICON_COLOR: Record<ObligationStatus, string>` maps,
exported from the canonical status-control module:

| ObligationStatus                | Icon              | Color                 |
| ------------------------------- | ----------------- | --------------------- |
| pending / not_applicable        | Loader            | text-text-tertiary    |
| waiting_on_client               | Hourglass         | text-text-warning     |
| blocked                         | Construction      | text-text-destructive |
| in_progress / review / extended | MessageSquareText | text-text-accent      |
| done / paid                     | FileCheck         | text-text-success     |
| completed                       | CircleCheck       | text-text-success     |

Collapse mapping mirrors `useLifecycleV2StatusLabels` exactly
(every legacy 10-state value maps to the same canonical glyph
its v2 label collapses to).

`ObligationQueueStatusControl` (the interactive pill +
dropdown) and `ObligationStatusReadBadge` (the read-only pill)
both swap their `BadgeStatusDot` for the new icon. The dropdown
items also lead with the icon so the menu reads as a
glyph-ladder when scanned. `BadgeStatusDot` is no longer
imported here — the icon is the canonical mark now.

### Deadline filter tabs (`obligations.tsx`)

`ObligationQueueScopeTab` accepts new optional `icon` +
`iconColor` props. The 6 v2 scope tabs pass the same
`STATUS_ICON[status]` / `STATUS_ICON_COLOR[status]` used on the
row pills — so the filter tab and the row mark match
glyph-for-glyph. The "All" tab stays icon-less. Backward-compat:
`dotTone` still works as a fallback for any consumer that doesn't
provide an icon.

### Pagination as bordered group (`obligations.tsx`)

Footer pagination upgraded from a bare prev/page-text/next row to
a single bordered chip (`rounded-md border bg-background-default
px-1 py-0.5`) containing `← N / M →`. The chip reads as one
control rather than three loose buttons. Inner icon buttons
slimmed to `h-6 w-6` to fit the chip height. When the infinite
query has a next page beyond the loaded set, the count renders
as "1 / 5+" (the `+` cues "there are more, not yet loaded").

The whole bottom row was already `sticky bottom-0` — pagination,
count, keyboard hints all stay pinned to the viewport bottom of
the queue column. No structural change there, just the visual
grouping.

### Quieter column sort indicator (`obligations.tsx`)

`HeaderSortControl` rewired:

- Unsorted columns render NO icon. Just the label.
- Sorted columns render a small `ChevronUp` / `ChevronDown` (size-3,
  text-text-accent) inline next to the label.
- The wrapper became a single `<button>` carrying both label and
  chevron — one click target, hover affordance is the label
  changing color from tertiary → primary.
- Dropped the ghost `Button` wrapper, the `ArrowUpDownIcon`
  glyph, and the `ArrowUpIcon` / `ArrowDownIcon` imports (no
  longer used anywhere).

Net effect: column headers read as plain labels at rest. The
sorted-by column gets a quiet chevron in accent color. Clicking
the label cycles sort. Matches the chevron vocabulary used
elsewhere (dropdowns, breadcrumbs, drawer triggers) — no
"navigation control" glyph polluting every header.

## Verification

- `pnpm exec tsc --noEmit` (apps/app) clean
- `vp lint` 0/0 on `obligations.tsx` + `status-control.tsx`

## What's NOT in this commit

- Other status-pill consumers (audit log, dashboard actions,
  timeline, evidence drawer, client facts workspace) still use
  the legacy STATUS_DOT-driven pill. They'll pick up the icon
  automatically when they switch to `ObligationStatusReadBadge`
  (already does — the badge renders the icon now). Surfaces that
  still spell out their own pill markup (rare) will be updated
  in a follow-up sweep.
- The pagination jump-list ("1 2 3 4 ... 200") shown on the
  right side of Yuqi's screenshot is not implemented. The
  bordered "← N / M →" chip covers the typical 1-5 page case;
  the jump-list is a follow-on if alert / client volume grows
  large enough to justify it.

## Closes Yuqi follow-ups

- Status icon vocabulary across the lifecycle (today's screenshot)
- Sticky-bottom pagination styling
- Quieter column sort indicator ("出戏" arrows fix)
