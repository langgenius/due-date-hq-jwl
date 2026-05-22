---
title: 'FloatingActionBar primitive + checkbox propagation fix on Rule library'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: patterns
---

# FloatingActionBar primitive + Rule library checkbox propagation fix

## Two fixes in one commit

### 1. Bulk-action bar style drift between Obligations and Rule library

The Obligations queue's bulk-actions bar (`rounded-xl` + ambient lifted
shadow + `backdrop-blur-sm` + z-40) and the Rule library's bulk-review
bar (`rounded-full` + stock `shadow-lg` + no backdrop + z-30) had
drifted in shape, shadow, and stacking. Two surfaces, same role
("you've selected things, here's the next action"), different
recipes.

Extracted a shared primitive:
**`apps/app/src/components/patterns/floating-action-bar.tsx`**

The primitive bakes in the Obligations queue's pre-merge recipe (it
was the more refined of the two):

- Centered via `fixed left-1/2 -translate-x-1/2`.
- `bottom-10` (40px above viewport bottom).
- `rounded-xl` (12px) — accommodates multi-button clusters.
- Ambient lifted shadow `shadow-[0_12px_32px_-8px_rgb(0_0_0_/_0.18)]`.
- `backdrop-blur-sm` so the bar visually separates from the page
  beneath without an opaque background.
- `z-40` — above tables + sticky pagination, below toasts (z-50) and
  Dialog/Sheet portals (z-50+).
- `role="region"` with caller-provided `aria-label` for SR
  announcement.

Migrated both call sites:

- `apps/app/src/routes/obligations.tsx` — bulk-actions bar
- `apps/app/src/routes/rules.library.tsx` — `BulkReviewBar`

The next surface that grows batch actions (e.g. Clients list when its
bulk operations land) will use the same primitive — no fresh
hand-tuning.

### 2. Checkbox click leaking to row-click on Rule library rules

Reported: "select one and it pops the review panel open."

Cause: the rule row has `onClick={() => onClick(rule)}` to open the
single-rule detail Dialog. The row's checkbox had
`onClick={event => event.stopPropagation()}` to block that — but
Base UI's Checkbox primitive uses pointer events internally and the
`onClick` handler on the Checkbox root didn't reliably catch the
bubble (especially via the `after:-inset-x-3 after:-inset-y-2`
extended hit area).

Fixed by wrapping the Checkbox in a `<span>` with **dual-phase**
stop-propagation:

```tsx
<span
  onPointerDown={(event) => event.stopPropagation()}
  onClick={(event) => event.stopPropagation()}
  className="inline-flex items-center"
>
  <Checkbox ... />
</span>
```

`onPointerDown` catches the early pipeline (Base UI's internal
pointer dispatch); `onClick` catches the late synthetic-event
pipeline. Belt and suspenders, but the pattern is the standard React
solution for "stop a click on a primitive from triggering a parent's
onClick."

## On the design intent (clarifies what the user asked)

Two parallel patterns coexist on the Rule library, intentionally:

| Affordance                                   | Opens                                                   | Use case                                 |
| -------------------------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| **Click row** (any cell except the checkbox) | `RuleDetailPanel` (centered Dialog)                     | "I want to look at THIS rule and decide" |
| **Checkbox**                                 | Adds to selection set; no panel                         | "I want to power through a batch"        |
| **Bulk bar "Review N" button**               | `BatchReviewModal` (dating-app card stack with ←/→/A/R) | "Run the batch"                          |

The bug was just the checkbox-click leaking to the row-click — not a
confused interaction model.

## Test plan

- `/rules/library`, expand a state with `Needs review` rules.
- **Bug reproduction (before)**: clicking the checkbox briefly pops
  the single-rule Dialog.
- **After**: clicking the checkbox only toggles selection; the
  floating bar appears at the bottom; the Dialog does NOT open.
- Clicking the row body (title text, dots, tier) still opens the
  single-rule Dialog (unchanged).
- Compare the floating bar at `/obligations` (bulk-actions) and
  `/rules/library` (bulk-review): same shape, shadow, blur, height.
