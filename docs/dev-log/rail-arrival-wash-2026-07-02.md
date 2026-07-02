# Rail arrival wash — visual confirmation that you landed on the thing you clicked

**Date:** 2026-07-02 · app UX (cross-page arrival continuity)

## Problem (Yuqi)

Clicking into an alert from /today, or a Priority List row, landed you on the
detail surface with no visual link back to what you clicked — "不知道是真的去
到正确的地方了吗". Concretely:

- `DeadlineNavigatorRail` (/deadlines/:ref) never scrolled the selected row
  into view — arriving from /today (priority row, citation chip) or a shared
  URL, the row you opened was routinely **off-screen** in the rail
  (verified live: the target sat 1932px below the fold).
- `ObligationListRail` (/deadlines in-page master-detail) had the same gap.
- `AlertListRail` scrolled (2026-06-12) but nothing *confirmed* the row.

## Fix

One shared behavior, `useRailArrival(active)` in `patterns/list-rail.tsx`
(extracted from AlertListRail's scroll effect), now used by all three rails:

- **First paint as the selection** → `scrollIntoView({block:'start'})` (row
  leads the list) + a one-time **arrival wash**: `animate-arrival-wash`
  (globals.css) holds `--state-accent-active-alt` (the focus-ring 14% navy)
  for ~0.5s then eases into `--state-base-hover` — i.e. the wash resolves
  exactly into the steady selection fill, no jump. 1.4s total,
  `prefers-reduced-motion` → none.
- **Later activations** (in-rail clicks, ↑/↓ paging) → `'nearest'` scroll,
  never a wash. A click target was already visible and user-chosen;
  re-confirming it is noise.

Accent is acceptable here precisely because it is transient — the steady
selection stays the neutral fill (2026-06-14 "active bg is too dark" canon
unchanged).

## Verified live (dev server, 1440px)

- /today priority row "NY CT-3 · Meridian" → /deadlines/000000000018: rail
  scrolled 1932px, row 19/28 at top, wash animation running on exactly that
  row; hero echoes the same fields (NY CT-3, Meridian, 10d late, In review).
- /today alert card "WA gross receipts surtax" → /alerts?alert=…3012: washed
  rail item = that alert, in view.
- /deadlines table row → /deadlines/000000000026: scrolled 1807px + washed.
- In-rail hop on /alerts: new active row NOT washed. No console errors.
- `tsgo --noEmit` clean (apps/app); vitest 158 passed.

## Files

- `apps/app/src/components/patterns/list-rail.tsx` — `useRailArrival`
- `apps/app/src/styles/globals.css` — `ddhq-arrival-wash` keyframes
- `AlertListRail.tsx` / `DeadlineNavigatorRail.tsx` / `ObligationListRail.tsx`
  — wired (alerts rail's inline effect replaced by the hook)
- `docs/Design/DueDateHQ-DESIGN.md` §4.11 ListRail row updated
