# Marketing — clear the 6 pre-existing type errors (2026-06-24)

`astro check` was shipping 6 errors (not gated by the build). Fixed all → 0
errors / 0 warnings. Minimal, behaviour-preserving except one real bug:

- **Surfaces.astro** — `t.cards.alerts.affectPre` doesn't exist (`affectPre` is on
  `t`, not the card), so it rendered `undefined` → the alert mini was **missing its
  "Affects " label**. Fixed to `t.affectPre`. (Real rendering bug, EN + zh.)
- **Sources.astro** — `t.statusLabels[r.dot]` indexed by `string` → cast `r.dot as
keyof typeof t.statusLabels`.
- **ScrollRail.astro** — `getAttribute('href')!.slice(1)` (href always present);
  captured `const s = secs[i]` so the null-guard narrows.
- **SurfaceDeep.astro** — `(s.rows ?? []).map(...)` (rows is optional per surface).
- **GeoResourcePage.astro** — `page.keyDates?.sourceLabel` (keyDates optional).

Build clean (73 pages); `astro check` 0/0/0.
