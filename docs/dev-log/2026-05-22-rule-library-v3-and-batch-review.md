---
title: 'Rule library V3: grouped layout, stats scoreboard, floating batch review modal, custom rule creation'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: rules
---

# Rule library V3 + batch review modal + New rule modal

## What shipped

This commit folds in a long design arc on `/rules/library` into a
single working shape. Three threads land together:

1. **Grouped library V3** — `rules.library.tsx` is now a state-grouped
   table with collapsible sections, a quiet stats scoreboard
   (active / needs-review progress bar + tally + sources link), a
   horizontal-lollipop "By entity" filter row, gap rows highlighted
   as a distinct band, and an active-filter banner above the table.
   The matrix/list toggle was retired in favor of a single grouped
   view that handles both jobs.
2. **Floating batch review modal** — when ≥1 needs-review rule is
   checked, a floating action bar pins to the bottom of the viewport
   with "Review N · Select all M · Clear." Clicking Review opens a
   centered Dialog (max 640px × 85vh) that walks the user through
   each selected rule one card at a time, dating-app style. Keyboard
   shortcuts: `←` previous · `→` skip · `A` accept · `R` reject.
   Hints are visible in the footer.
3. **New rule modal** — opens from the page header "New rule" button
   and from each gap row's "+ Add rule" button (pre-fills jurisdiction
   - entity). Captures the four fields a CPA minimally needs
     (Title, Form name, Tax type, Due-date description) and stubs the
     rest of the `ObligationRule` contract with sensible defaults.
     `createCustomRule` activates the rule immediately on submit.

## Supporting changes

- **`rule-detail-drawer.tsx`** — `CandidateReviewForm` now tags its
  Accept/Reject buttons with `data-rule-action="accept|reject"` so
  the batch modal's `A`/`R` shortcuts can dispatch synthetic clicks
  without lifting the mutation logic out of the form.
- **`router.tsx` + `rules.library-v2.tsx`** — adds a
  `/rules/library-v2` preview route that was used during the V2↔V3
  design comparison. Kept in place for the design call; will be
  retired in a follow-up once V3 is fully ratified.
- **`use-current-user-name.ts`** — minor cleanup, drops a redundant
  type cast on `useRouteLoaderData`.

## Why one big commit

The library shell, the batch flow, and the create flow share state
through the same route component (`?rule=` for detail, selection set
for batch, gap-row pre-fill seed for create). Splitting them across
commits would either produce broken intermediate states or require
synthetic adapters that immediately get deleted. Shipping the working
shape together is the lower-cost path.

## Test plan

- `/rules/library` loads with grouped table + stats bar; collapse/
  expand sections; verify entity chip filter narrows the list.
- Check ≥2 needs-review rules; verify the floating action bar
  appears; click Review; verify the modal opens at card 1/N.
- In the modal: press `→` to skip, `A` to accept, `R` to reject;
  verify each action invalidates the rules cache and advances the
  card; press `Esc` to exit.
- Click "+ Add rule" on a gap row; verify the modal opens with
  jurisdiction + entity pre-filled.
- Click "New rule" in the page header; verify the modal opens empty
  and creates an active rule on submit.
