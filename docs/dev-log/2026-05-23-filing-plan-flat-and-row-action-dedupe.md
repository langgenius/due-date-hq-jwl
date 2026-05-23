---
title: 'Filing plan goes flat + row-level Start-prep removed (items 6, 13, 14)'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Drop the panel frame, kill the duplicate Start-prep affordance

Two items from the 16-item critique that share a root cause: the
Work tab was over-chromed. A bordered card sitting alone inside a
tab body, then ANOTHER per-row button doing the same job the drawer
already does, all in one view. Trim both.

## #6 — Filing plan panel loses its frame

Before: `ClientWorkPlanPanel` rendered as a `rounded-md border
border-divider-regular bg-background-default` card with a tinted
header band and a fenced-in body. That treatment was right when the
Work tab held multiple sections — the chrome separated them. After
the IA refactor (D-IA) the Work tab contains ONLY the filing plan,
so the card frame is "card inside a tab body inside a page" —
chrome-on-chrome with nothing meaningful to delineate.

After: panel chrome is gone. The structure is:

```
<h2>Filing plan</h2>  <count subtitle>
─────────────────────────────────────
FORM    DUE    STATUS    EST. TAX
─────────────────────────────────────
2026  current year  2 open
[row]
[row]
2025  3 open
[row]
```

Type hierarchy carries the structure. The `h2` heading (was an `sm`
span inside a tinted header) now anchors the section. The column
legend's underline (bumped to `divider-regular` since it's now the
primary horizontal separator) acts as the visual transition between
header text and rows. Year section headings continue to do their job
of grouping the rows underneath.

Wrapper changed from `<div className="overflow-hidden rounded-md
border ...">` to `<div className="grid gap-3">` — gap-3 carries the
internal rhythm.

## #13 + #14 — Drop the per-row Start-prep button

Before: every filing-plan row showed a hover-revealed forward-action
button (`Start prep` / `Docs received` / `Mark unblocked` / `Mark
filed` depending on status). Originally added as D-6a to give CPAs a
queue-style forward affordance without opening the drawer.

In practice this created a bad ambiguity. Clicking the row opens the
drawer; the drawer's stage card has its OWN `Start prep` button.
Hover-revealing a `Start prep` ALSO on the row means the user sees
two `Start prep` buttons that do "the same thing but maybe slightly
different" — same vocabulary, same target status, different
locations. Critique called this out directly: "there are multiple
start preparation buttons in there. very confusing as there is no
clarity."

The status chip on the row is still interactive — it's a real status
picker (D-6b), opens an inline dropdown with the canonical status
labels and `stopPropagation`s away from the row-click. That's the
quick-flip affordance for status work that doesn't need drawer
context. The forward button was redundant.

Removed:

- `FilingPlanRowQuickAction` component (~80 lines, all the per-status
  forward-target switch logic).
- The 5th TableCell `<TableCell className="w-[140px] text-right">`
  that housed it.
- The 5th column slot in the panel-level column legend (now 4
  columns: FORM / DUE / STATUS / EST. TAX).
- 13 user-facing strings (button labels + tooltips for each forward
  transition) — caught automatically by `pnpm i18n:extract --clean`.

Single source of truth for forward-action work: open the drawer,
take action there. The drawer is also the only place that surfaces
penalty input, due-date math, dependency chains, etc. — moving to
the drawer for the _action_ keeps the user near the _context_ the
action needs.

## Followups still on the list

- #2 entity badge consistency, #3 Needs-filing-state ambiguity, #8
  date format, #10 third summary tile — going into Commit E.
- #15 + #16 obligation drawer cleanup — going into Commit F.

## Files touched

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`:
  - `ClientWorkPlanPanel` wrapper goes `border + rounded-md` →
    `grid gap-3`; title row becomes a flat `<h2>` + count subtitle;
    body wrapper loses its inner padding (was nested inside the
    panel padding, which is gone).
  - Per-row `FilingPlanRowQuickAction` `<TableCell>` removed;
    component definition deleted (~80 LOC).
  - Column legend drops the 5th hidden slot for the action column.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 13 obsolete
  strings cleaned by extraction.
