# /alerts — full-page detail layout + g5kKJQ/ibEoz fidelity pass

Date: 2026-06-08

A long iterative pass bringing the Alerts surface to the Pencil designs
(`g5kKJQ` list + header, `ibEoz`/`FvHji`/`Aogxu` detail, `hFOEo` history). The
biggest correction was structural: the alert detail is a **full-page layout with
the alert list as a secondary sidebar**, not a list page with a slide-over panel.

## List page (`g5kKJQ`)

- Row pixel-match already largely in place; added the **conf pill** (`WZi5X`,
  tier-toned), and fixed a compact-column wrap bug where the bottom-meta broke
  mid-unit (`Affects 2 / clients`, `94% / conf`) — now `flex-wrap` + `whitespace-nowrap`.
- **Header chrome** → design: red destructive count chip + the blue
  `Sources · Federal + 50 states + DC` **selector chip** (db icon + chevron →
  `/rules/sources`), dropping the standalone Sources action button. Morning sweep
  stays (it IS in the design — earlier read was wrong).
- **Filter row**: `flex-nowrap overflow-x-auto` → `flex-wrap` so it never scrolls
  horizontally (one line when it fits, reflows when it doesn't).

## Detail (`ibEoz` / `FvHji` / `Aogxu`)

- **Full-page three-pane layout**: collapsed icon nav · fixed **380px compact
  alert rail** (`AlertListRail` — own head/`All·Unresolved`/search, compact items,
  left-accent on the open one) · detail pane filling the rest. Wired in
  `AlertsListPage`'s panel-open branch; `alerts.tsx` passes `compact={panelOpen}`
  to drop the shell header and go flush.
- **Decision banner**: one full-bleed band at the very top (above the header
  meta + title) — amber Pending / red Couldn't-apply / green Applied, picked from
  the real state. No more rounded padded block in the body.
- **`BackStrip`** top bar: `‹ Alerts · N of M · ▲▼ · ✕`, paging threaded from the
  sorted list order.
- **Unified `Aogxu` panel**: every section now lives in ONE bordered `rounded-12`
  white panel with internal `divide-y` separators (KeyChange w/ 3px red left
  accent, Extracted facts, Affected clients, Source extract, Provenance, Activity)
  — replacing the prior set of individually-rounded floating cards. The inner
  facts **grid** and clients **table** keep their own `radius-8` 1px border (per
  `noWOa`/`fphOa`); the sections themselves are borderless.
- Fixed the history sheet scroll trap: the unified panel is now `shrink-0`, so
  the drawer body keeps the scroll height and the Provenance/Activity tail is not
  clipped by the panel's `overflow-hidden` or the sticky action shelf.
- Removed the stray **`DeadlineDetailsPanel`** ("Confirm deadline change") form —
  it isn't in the design and read as an empty box; the affected-clients table is
  the confirmation surface, so it always renders for due-date alerts now. Deleted
  the dead function + `reviewDueDateDetailsMutation` + the unused `Input` import.
- Header meta → `HIGH IMPACT` pill + flag `CA California`; facts grid recomposed
  to the flat `2×4` (real fields, no fabricated cells); Source extract moved to
  the bottom of the flow; Activity timeline derived from real lifecycle stamps.

## History (`hFOEo`)

- New `AlertHistoryView`: derived stats row, `All/Applied/Dismissed/Snoozed/Reverted`
  tabs + search, month-grouped (`THIS WEEK` band) `DATE/JURIS/ALERT/STATUS` table
  with tone-coded status pills. ACTOR + avg-review-time omitted (no backing field).

## Seed

- Seeded the empty `pulse_priority_review` table (preparer-requested on a few
  alerts) so the smart-priority `Why?` inset + URGENT/HIGH level pills have real
  data — gated behind `SHOW_PRIORITY_REVIEW_UI` (off) + Team plan.

Lesson: when a reference shows a detail "page," check whether the surrounding
list is a **secondary sidebar** before assuming a slide-over panel — and read the
actual Pencil section frames (`get` via MCP) for which element owns the border,
rather than guessing radii.
