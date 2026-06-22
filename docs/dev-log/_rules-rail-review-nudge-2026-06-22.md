# Rule library rail — review nudge over neutral filter (2026-06-22)

The rail header's needs-review control was a `FilterTrigger` **dropdown**
("Show │ Needs review ⌄") — a 2-click menu with a chevron for what is really a
binary on/off filter. Per Yuqi: the rail should *encourage* the CPA to review
pending rules, not offer a neutral filter.

`states-rail.tsx`: replaced the dropdown with an inviting **accent `Button`**
(canonical primitive) that only appears when jurisdictions have rules awaiting
review:
- queue dirty → `{N} to review` (accent, 1-click) — focuses the list on the
  jurisdictions needing review (`reviewOnly`).
- focused → `Show all` (ghost) to clear.
- queue clear → nothing renders (quiet = caught up).

`N` = jurisdictions with `reviewCount > 0`. Complements the overview's
"N rules need your review · Start review" banner + "Where to start" list — the
rail nudge is the persistent one (visible while drilled into a jurisdiction).

`tsgo` clean. (Local dev server was stale this session — verify after a refresh.)
