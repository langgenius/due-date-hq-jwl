# Buttons — flatter & quieter (Phase 1)

Date: 2026-06-08

Yuqi: "the buttons — it looks ugly and coarse currently. rework them." Direction
chosen: **flatter & quieter**.

## Changes (`packages/ui/src/components/ui/button.tsx`)

- **Radius stepped down one tier** at every size (the earlier rounds kept bumping
  it UP until chips read chunky): `xs` 10→6 (`rounded-md`), `sm` 12→8
  (`rounded-lg`), `default` 16→10 (`rounded-[10px]`), `lg` 18→12 (`rounded-xl`);
  icon sizes mirror their text size. The iOS continuous-corner shape
  (`[corner-shape:squircle]` on the base class) is kept — it does the smoothing;
  the radius just stops shouting.
- **Shadows dropped** (`shadow-xs` + redundant `disabled:shadow-none`) from every
  filled/bordered variant — `primary`, `secondary`, `accent`,
  `destructive-primary`, `destructive-secondary`, and the legacy
  `default`/`outline`/`destructive` aliases. Flat fills now; primary actions
  read by color, secondary by a single hairline border.

`ghost`/`tertiary`/`link` were already shadow-less and quiet, so they stand
back further now that the heavier variants flattened.

## Verify

Preview @1512×861 `/alerts`: header buttons ("My morning sweep", "Alert
history") read as crisp hairline chips with no shadow; primary buttons render
flat. tsgo clean. (The Base-UI `nativeButton` console warnings are pre-existing,
from `render`-prop call-sites, unrelated to this className-only change.)
