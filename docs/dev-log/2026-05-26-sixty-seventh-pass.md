# Sixty-seventh pass — panel width audit + overdue context + step indicator

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Three concrete Yuqi reports: (1) the detail panel "width
always changed," (2) the In review step indicator looked like a
selected radio button, (3) the OVERDUE label was unexplained — the
In review section never mentioned what was overdue.

## 1. Panel width audit (`the width of the panel always changed`)

### Findings

The outer panel `motion.div` had three risk vectors:

- `animate={{ width: 600, transition: {...} }}` was a fresh object
  literal on every parent render. Framer Motion DOES diff target
  values, but inline object identity churn invites surprises.
- The wrapper className had `min-w-0` (allow shrinking) AND
  `xl:shrink-0` (prevent shrinking) — contradictory at the xl
  breakpoint. Below xl, `xl:shrink-0` doesn't apply and the panel
  could be flex-shrunk by neighbour growth.
- No explicit `flex-grow: 0`. Standard CSS default is 0, but in a
  flex-row container with a `flex-1` sibling and any browser
  rounding, a 600px target could surface as 600.5 / 599.x.

### Fix

Single-source-of-truth width contract via module-scope constants:

```ts
const DETAIL_PANEL_WIDTH = 600
const DETAIL_PANEL_OPEN_ANIM = {
  width: DETAIL_PANEL_WIDTH,
  transition: { duration: 0.3, ease: DETAIL_SWIFT_EASE },
} as const
```

Animation configs are stable references — Framer Motion sees the
same object identity across renders, never re-fires the width
animation.

Wrapper className tightened:

```diff
- "min-w-0 self-stretch overflow-hidden xl:h-full xl:shrink-0 xl:min-h-0"
+ "self-stretch overflow-hidden flex-none xl:h-full xl:min-h-0"
```

`flex-none` = `flex: none` = `grow:0 shrink:0 basis:auto`. The
panel cannot shrink, cannot grow, no matter what the parent flex
row does. The inline `style.width` from motion is the only width
source.

Added `data-slot="obligation-detail-panel"` so the slot is
greppable in DevTools — future width audits can grab it by
attribute rather than DOM path.

## 2. Row-switch panel content animation

The user's other note: "switch between row when expanded, the right
panel stays there, no animation." The fix from the sixty-sixth
pass (stable key) stopped the table jump, but the side-effect was
the panel content swapped instantly — no feedback that something
changed.

Nested an inner `<AnimatePresence mode="wait">` keyed by
`activeDetailId`. When the row changes:

- OUTER motion.div: stays mounted, width stays at 600 (no table
  reflow)
- INNER motion.div (paper rise): stays mounted, opacity stays at 1
- INNERMOST motion.div: KEY changes, AnimatePresence runs an
  exit/enter cycle (opacity + 6px x-slide) so the content swaps
  with a visible-but-quick crossfade (≈ 140ms exit + 200ms enter)

Result: table holds geometry AND the panel shows clear "I updated"
feedback on row switch.

## 3. "looks like a radio checkbox" — current step indicator

The In review steps list rendered the current step as
`border-2 border-accent-default` with an inner filled disc. That's
the textbook visual of a selected radio button — readers tried to
click it expecting a form input.

Replaced with a solid filled bullet (no ring):

```diff
- <span className="grid size-3.5 rounded-full border-2 border-accent-default">
-   <span className="size-1.5 rounded-full bg-accent-default" />
- </span>
+ <span className="size-2.5 rounded-full bg-accent-default" />
```

Reads as a status marker ("you are here") instead of a form
control. Applied to both pipeline branches in
`ActiveStageDetailCard` (the `replace_all` swap covered the In
review pipeline AND the e-file pipeline below it).

## 4. OVERDUE context — "what is overdue?"

Two surfaces fixed:

**Milestone strip label.** The bare word "Overdue" answered "is
this late?" but not "late vs what?" Renamed to "Past deadline"
(names the noun) + added a hover tooltip that names the date and
days-late count:

```tsx
title={t`Filing was due ${formatDate(row.currentDueDate)} ·
        ${Math.abs(row.daysUntilDue)} days past deadline.`}
```

**Stage card body.** The card under the strip never mentioned
overdue at all — a CPA reading "In review" had to infer urgency
from the strip's red ring above. Added a destructive-tone banner
inside the card body, shown only on non-terminal stages
(`!TIMELINE_TERMINAL_STAGE_KEYS.has(stageKey)`) when the row is
past internal due:

> ⚠ **Filing was due 2026-05-04 — 21 days past deadline.**
> Submit the return now, or file an extension if eligible.

The banner names the date, names the days-late count, and names
the two valid actions. Terminal stages (Filed / Completed) don't
get the banner — by then the work is closed and lateness is a
quality stat, not a call-to-action.

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).
