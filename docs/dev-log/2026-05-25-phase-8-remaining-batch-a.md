# 2026-05-25 — Phase 8 remaining batch A: viewport + designed-as-is fixes

## Why

Closing the viewport-replay + designed-as-is cluster from the
89-item review.

## Shipped (6 items)

### Today #45 — Dialog close button position

`packages/ui/src/components/ui/dialog.tsx`

Close X moved from `top-6 right-6` (24px from each edge — inside
the padded area, visually clustered with the title row) to
`top-3 right-3` (12px — at the corner edge). At 24px the X read
as "title-cluster chrome"; at 12px it reads as window-close,
matching the Notion / Linear / shadcn convention.

Applies globally to every Dialog callsite. WizardShell uses
`showCloseButton={false}` so wizard chrome is unaffected.

### Wizard #40 — Step 1 copy audit

`apps/app/src/features/migration/Step1Intake.tsx`

Tightened the lead-in paragraph. Before:

> "We'll figure out the shape — paste or upload, your call.
> Columns named Estimated tax due, Estimated tax liability,
> Owner count, or Owners help prepare payment and penalty
> context."

After:

> "Paste or upload — we'll figure out the shape. Columns like
> Estimated tax due, Owner count, or Owners give us a head start
> on payment and penalty context."

Leads with the action verb, drops "your call" filler, drops the
redundant "Estimated tax liability" (already covered by "Estimated
tax due"), and reframes the column hint as a positive ("give us a
head start") instead of a vague "help".

### Wizard #41 — Paste + Upload side-by-side at comfortable density

`apps/app/src/features/migration/Step1Intake.tsx`

Paste and upload were stacked vertically with a horizontal "or"
rule between them. Promoted to a 1fr / divider / 1fr horizontal
row at comfortable density so the step reads as "two equal entry
paths" matching the page headline "paste or upload, your call".
The "or" divider rotated to vertical orientation. Compact density
still stacks (single column, no divider) because the wizard's
narrow viewport doesn't fit two halves.

The preset chips ("I'm coming from…") were a sibling of paste +
upload in the column stack; promoted out to a separate full-width
row below so they don't compete for the same horizontal space.

### Deadlines #16 — Drawer alignment

`apps/app/src/routes/obligations.tsx`

Added explicit `xl:h-full` to the panel wrapper. The wrapper was
relying on `xl:items-stretch` alone, which created a transient
"drawer sits short" gap at the panel's bottom edge during initial
load and during row-switch (when the body had no content yet, the
aside's `h-full` claimed only the loading-state height instead of
filling the row). With `h-full` on the outer wrapper too, the
shape is locked from outside-in.

### Deadlines #23 / #24 / #25 — PathToFilingSummary empty cells

`apps/app/src/routes/obligations.tsx`

Yuqi flagged that blank date cells for skipped + non-Filed
upcoming stages looked like missing-data bugs. The design is
intentional — we don't fabricate projections we can't justify —
but the rationale wasn't visible to users.

Added a `title` attribute on every date span that surfaces the
policy in plain language on hover:

- **Skipped** stage → "This stage was skipped — no date applies."
- **Upcoming non-Filed** → "This stage hasn't been reached yet.
  We only project the Filed date (using the internal due date)."
- **Filed upcoming** → no hint (the projected date is visible).
- **Done / Active** → no hint (the real stamp is visible).

Also updated the inline date-resolution policy block to reflect
the actual behavior (blank cells, not em-dash placeholders — the
em-dash was dropped in the 2026-05-24 cleanup pass).

## Verification

- `pnpm exec tsc --noEmit` (apps/app) clean
- `vp lint` 0/0 on all changed files

## Closes Yuqi review items

- Today (dialog): **#45** (close-button position)
- Wizard: **#40** (Step 1 copy), **#41** (xx-or-xx layout)
- Deadlines: **#16** (drawer alignment), **#23, #24, #25**
  (PathToFilingSummary hint copy)

Yuqi review: **75 / 89** closed.

## Still open

- Alerts: **#9** (US map filter — Cluster C build)
- Deadlines: **#6** (multi-deadline grouping — stretch feature),
  **#30** (Summary tab — Cluster C build)
