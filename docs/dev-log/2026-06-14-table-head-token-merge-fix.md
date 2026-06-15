# 2026-06-14 — Every table `<th>` rendered 13px/700 (silent token drop)

Found by the design-system cohesion sweep (Yuqi: "ensure no out-of-design-system
things … check padding, gaps, colours"). Live-computed `<th>` on /deadlines and
/today read **fontSize 13px, fontWeight 700, uppercase** — not the canonical
**12px / 600 / +0.5px** the `TableHead` primitive intends.

## Root cause

`TableHead` (`packages/ui/src/components/ui/table.tsx:133`) sets
`text-column-label text-text-tertiary` — a custom font-SIZE token next to a
custom text-COLOR. `cn()` (tailwind-merge) didn't know `text-column-label` is a
font-size, so it grouped it with the `text-text-tertiary` color, treated them as
conflicting `text-*`, and **dropped the size class**. The `<th>` then fell back
to the browser default (13px + bold `th`). Confirmed live: rendered className had
`text-column-label` stripped (`hasColumnLabel: false`).

The cn config already registered `caption`/`caption-xs` for this exact reason
(2026-06-10) but never the rest of the family.

## Change

`packages/ui/src/lib/utils.ts` — register the FULL custom font-size family
(`column-label`, `region-title`, `section-title`, `surface-title`, `stat-value`,
`item-title`, `row-anchor`, `row-name`, `badge`, `chip-label`, `description`,
`hero`, `display-*`, `micro`, `nav`) in the tailwind-merge `font-size` class
group. Any custom size token now survives a merge with a color.

## Impact / verify

- Fixes EVERY table column header app-wide (deadlines, clients, rules, audit,
  members, alerts-history) in one place — and removes the 700-weight type-rule
  violation (`600 max, titles only`) everywhere a th appeared.
- Also protects every other custom size token from the same silent drop.
- `tsgo --noEmit -p apps/app` clean.
- Live (/deadlines, after HMR): `<th>` now `fontSize 12px / fontWeight 600 /
  letterSpacing 0.5px`, `text-column-label` present.
