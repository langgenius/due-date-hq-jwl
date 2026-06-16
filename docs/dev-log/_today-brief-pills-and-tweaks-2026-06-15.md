# /today: brief action pills + three type tweaks (2026-06-15)

Yuqi (Pencil t9nO3 + notes): brief action pills, alert description to one
line, smaller priorities date, table-header CAPS −1px app-wide.

## 1. Daily Brief action pills (Pencil t9nO3)

New `BriefActionPills` in the expanded brief band — a row of quick-jump
chips (`icon + label + live count + →`, white / rounded-full / hairline
border / 11px), matching the design. **Every count is real** (no fiction):

- **Alerts** → /alerts, count = client-affecting alerts from the same
  `listAlerts` cache the page already warms (no extra request).
- **Waiting** → /deadlines, count = `todayCounts.waitingOnClientCount`.
- **Overdue** → /deadlines, count = `todayCounts.overdueCount`.
  Each pill renders only when its count > 0; the whole row hides when nothing
  is pending — so no empty/invented pills. The design's 4th "Sweep" pill is
  omitted until there's a cheap real change-count to back it (noted in code).
  Verified live: "Alerts 4" + "Overdue 2" render (Waiting hidden at 0).

## 2. Alert card description → one line

`needs-attention-card.tsx`: verbatim-quote `line-clamp-2` → `line-clamp-1`.
Verified live (all 3 cards truncate at one line).

## 3. Priorities date smaller

`merged-brief-card.tsx`: the absolute date under the countdown `text-xs`
(12) → `text-caption` (11). Verified live (11px).

## 4. Table header CAPS −1px, app-wide

`--text-column-label` token 12 → 11px (tokens/primitives.css) — every
`<TableHead>` follows. tsgo clean; the :root var reads 11px live and the
sibling `text-caption` token applies live, so the utility works. NOT
visually confirmed: the long-running dev server serves a STALE packages/ui
component build whose `TableHead` predates the `text-column-label` class
(the rendered `th` lacks it), so it still shows the inherited 13px. The
on-disk primitive uses the token; a fresh UI build will render 11px. Didn't
kill the shared dev process to force it.

## Verify

tsgo clean; console clean; zh-CN filled (6); strict compile green. 3 of 4
confirmed live; #4 is code-correct, blocked on a stale UI bundle.
