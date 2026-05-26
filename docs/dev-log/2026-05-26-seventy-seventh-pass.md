# Seventy-seventh pass — 9-item cross-page feedback sweep

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** 9 items reported in a single feedback burst across the
sidebar, /today, /deadlines, the obligation drawer, and the bulk
actions bar. All landed.

## 1. Sidebar collapse toggle rendering outside the sidebar

**Bug:** The `SidebarCollapseToggle` (the rectangle/panel icon) was
floating in the gray page area to the right of the sidebar boundary
instead of sitting beside the firm switcher inside the sidebar.

**Root cause:** `FirmSwitcherTrigger` renders its content inside
`<SidebarHeader>` (a `flex flex-col` wrapper with no grow). The
app-shell composes the header row as:

```
<div className="flex w-full items-center gap-1">
  <FirmSwitcherTrigger />   // <SidebarHeader> with no flex-1
  <SidebarCollapseToggle /> // size-8 button
</div>
```

Without `flex-1` on the SidebarHeader, the wrapper stayed at its
content's natural width and the toggle got pushed past the sidebar's
right edge into the page content area.

**Fix:** `app-shell-nav.tsx` — added `min-w-0 flex-1` to the
SidebarHeader inside FirmSwitcherTrigger (with a collapsed-mode
override that reverts to `w-auto flex-none` so the trigger snaps
back to size-8 in icons-only mode).

## 2. /today — "… N more in the queue" removed

`actions-list.tsx`: the caption footer below the action rows was
duplicate-pointing to the same destination as the "View all
deadlines" link in the SectionHeader. Removed the `<p>… N more in
the queue</p>` block and the now-unused `overflow` variable. The
truncation is communicated implicitly via the count in the section
header.

## 3. /today — row borders dropped

`actions-list.tsx`: the `<li>` between each `<ActionRow>` had
`border-b border-divider-subtle last:border-b-0`. Yuqi flagged the
hairlines as reading like a table-frame inside a borderless-card
section. Dropped the border; the `gap-0.5` + per-row hover-bg gives
enough visual rhythm without chrome.

## 4. /today — ease-in-out hover animation

`actions-list.tsx` `ActionRow`: the hover transition was the
default `transition-colors` (150ms ease). Changed to
`transition-colors duration-200 ease-in-out` so the hover feels
intentional and symmetric — important on a dashboard surface where
the entire row IS the affordance.

## 5. Sidebar Alerts badge "3" vs page list count

**Bug:** Sidebar said "Alerts 3" but the user counted more alerts
visible on /rules/pulse.

**Root cause:** Sidebar used `pulse.activeCount` (open alerts only),
while /rules/pulse renders `pulse.listHistory` (open + applied +
dismissed). Active count and rendered list disagreed by design.

**Fix:** `app-shell-nav.tsx` `useActivePulseAlertCount` now uses
the same `pulse.listHistory(50)` query the page uses and counts
`alerts.length`. The two numbers always agree now. Documented the
trade-off (sidebar count now includes dismissed/applied) in the
comment above the function.

## 6. /deadlines — "Sort by Client" restored

`obligations.tsx`: the `client` radio option had been dropped per
earlier feedback, but Yuqi re-requested it — per-client clustering
is useful on /deadlines for portfolio reviews (work one client's
full set without jumping to /clients/[id]). The sort logic for
`group === 'client'` was still wired up in `useMemo` for `sorting`;
only the dropdown option was missing. Re-added the radio item and
expanded the trigger label to render `Client` when `group ===
'client'`.

## 7. /deadlines — "Sort by Status" actually sorts by status priority

**Bug:** "Sort by Status does not work."

**Root cause:** It was sorting, but alphabetically — blocked,
completed, done, extended, in_progress, in_review, not_applicable,
not_started, paid, pending, review, waiting_on_client. That order
matched no task-flow logic.

**Fix:** Added a custom `sortingFn` on the `status` column that
sorts by urgency-then-workflow priority:

```
not_started → blocked → waiting_on_client → review →
in_progress → in_review → done → filed → paid → completed →
extended → not_applicable
```

So "Sort by Status" now surfaces what to work on next at the top.

## 8. FloatingActionBar — beige tone

`floating-action-bar.tsx`: per Yuqi "let have a beige action bar."

```diff
- border-text-primary/40 bg-text-primary text-text-inverted
+ border-state-warning-border bg-state-warning-hover-alt text-text-primary
```

Surface uses the warning-100 semantic token (a warm peach-cream
~#ffe4dd) with dark text + a slightly deeper border on top. Button
text reverts to `text-text-primary` so ghost buttons read normally
against the beige bg. Shape + bottom-12 position + shadow envelope
unchanged.

## 9. /deadlines — Filing-deadline trio compressed

`obligations.tsx` `DeadlineTile`: Yuqi: "why is the filing deadline
three card so big? they are ugly."

```diff
- px-3 py-2 (12/8px padding)            + px-2.5 py-1.5 (10/6px)
- text-caption-xs uppercase             + text-[11px] sentence-case
  tracking-[0.08em]                       (one line, no shouting)
- text-base font-semibold (16px date)   + text-sm font-semibold (14px)
- rounded-lg                            + rounded-md
```

Net: ~30% shorter tile, labels no longer wrap to 2 lines in narrow
columns ("Filing deadline" fits on one line), the trio reads as a
date strip rather than three poster cards.

## 10. /deadlines — table horizontal scroll + last row covered

Two related table-chrome issues:

- "Table is slightly scrollable" — `overflow-x-auto` was
  triggering on negligible (1-2px) overflow, producing a phantom
  horizontal scrollbar. Switched to `overflow-x-hidden`. Cells
  already use `whitespace-normal break-words` so genuinely-wide
  content wraps instead of forcing scroll.
- "Last row of the table is covered by the pagination bar" —
  pagination is `sticky bottom-[60px]`, so the bottom 60px of
  the scroll area is always overlaid. Added `xl:pb-32` (128px)
  to the scroll container so the last row clears the sticky
  footer + breathing room.

## 11. /deadlines — fixed row height (avatar vs `?` placeholder)

`obligations.tsx` `TableRow`: rows with avatars and rows showing
the `?` unassigned-picker had subtly different heights because the
table auto-sized to tallest cell content per row. Added `h-12`
(48px fixed) to every data row so all rows render uniformly
regardless of which assignee state they're in.

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).

## Result

Sidebar / /today / /deadlines / obligation drawer / floating action
bar all picked up the 9 fixes. The bulk action bar is now beige
instead of dark navy; the filing deadline trio shrinks; sidebar
and page counts agree; status sort actually sorts by workflow
priority; Sort by Client restored; row heights uniform; sticky
pagination no longer eats the last row; the sidebar collapse
toggle stays inside the sidebar.
