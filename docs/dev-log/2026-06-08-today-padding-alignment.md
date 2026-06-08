# /today — align surface content padding to 18px (Yuqi "padding 都不一样")

Date: 2026-06-08

Yuqi caught that the left content edges didn't line up down the page. Measured in
preview: the Daily Brief title and alert-card content sit at an 18px inset, but
the Actions table used the Table primitive's default `px-5` (20px) cells with the
rank cell overridden to `px-3` (12px) — three different left paddings (12 / 18 /
20), so the table's content didn't align with the surfaces above.

## Fix (`actions-list.tsx`) — one 18px content inset

- **Rank cell**: `px-3 text-center` → `pl-[18px] pr-2 text-left`. The leading rank
  now starts at the same x (271px) as the brief + alert titles.
- **Status divider header**: `px-5` → `px-[18px]`.
- **Due cell (last column)**: added `pr-[18px]` so the table's right content edge
  matches the brief + alert-card right edge.

Net: brief, alert cards, and the Actions table all share an 18px content inset on
both sides — content lines up in one column down the page. Verified in preview:
`brief.title` / `alert.title` / `table.rank01` all at 271px.

## Verify

- tsgo 0; `vp check` 0 warnings/errors; dashboard tests 10/10.
