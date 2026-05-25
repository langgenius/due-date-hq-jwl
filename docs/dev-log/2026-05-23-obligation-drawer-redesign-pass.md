---
title: 'Obligation drawer redesign pass — header flip + key-dates strip + pill tabs + materials multi-select'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# What changed

Yuqi sketched a new drawer layout that rebalanced the hierarchy and
introduced batch actions on the materials list. This pass implements
it across six surfaces of the obligation detail drawer.

## 1. Header — form code is the primary noun, client is the kicker

Before, the client name was the h2 and the form code lived in a
tertiary metadata line below the status pill. Reading order was
**WHOSE → WHAT → WORKFLOW** — which works on the clients list
(where the user already knows whose row they're on) but inverts the
identity question on the drawer (where the user just clicked _into_
a per-obligation surface). The user opened this drawer to answer
"what about Form 1040?" — not "who is the client?".

New shape:

- **Line 1** — client name as small clickable kicker (still opens
  the client drawer, still has the ArrowUpRight affordance)
- **Line 2** — `<TaxCodeLabel code={row.taxType}>` as the h2 +
  status pill inline on the same row. The obligation identity +
  workflow state read as one header unit.
- **Line 3** — `TY 2025 · CA` compact secondary meta

## 2. PrimaryDeadlineStrip — three columns above the milestones

The three dates the CPA reaches for first (**Internal · Filing ·
Payment**) were buried inside `<dl>` "Reference dates" at the
bottom of the drawer (which also included Statutory, Tax period,
Created, Last touched, e-file timestamps). Two costs:

- Hard to see at a glance which is which.
- Status indicators (red-tinted "Missed") only triggered on the
  Internal due value, while the visually identical Filing / Payment
  rows stayed neutral even when past — confusing on payments rows
  that were also overdue.

New strip: 3-column grid, each column with `LABEL / date / Missed?`.
A column whose date is in the past shows a small uppercase "MISSED"
tag in destructive color; otherwise the third row is a non-breaking
space placeholder to preserve column height. Internal due is
typographically primary (its value tints red when past, matching
the established pattern).

The FlatDateList at the bottom now carries _only_ the secondary
dates — no more duplication.

## 3. Tabs become a real pill segmented control

The TabsList variant was already `'default'` (which is the
segmented pill bg in our primitive), but the wrapper above it
applied `border-t border-divider-regular pt-3` and flex-wrap, which
visually grouped the tabs with the snapshot block above (a card
ceiling line) instead of with the TabsContent below (which they
control). Pulling the `border-t` and tightening to `pt-1` lets the
pill bg do the visual grouping work — the tabs read as the top of
the tab content, not the bottom of the snapshot.

## 4. Stage card — title-case + "Check Materials"

The stage label was rendered as `uppercase tracking-wider
text-text-tertiary text-xs font-medium` which made it read as a
section tag (like "Reference dates"), not as a heading. Switched
to `text-sm font-semibold` + title-case so "Waiting" / "Blocked" /
"In review" read as honest noun phrases matching the milestone
strip labels above.

Inline signal verb also moved from "Open Materials" to "Check
Materials". "Open" reads as "open the tab"; "Check" reads as "go
review what's outstanding" — closer to the CPA's actual intent
when the count is non-zero.

## 5. Materials checklist — multi-select + floating action bar

Per-row interactions stay (the right-side `Mark received` button
still handles the single-item case in one click). On top of that:

- **Leading checkbox** now tracks **selection**, not received-state.
  Selecting items adds them to a `Set<itemId>` held at the drawer
  level (keyed by `obligationId` so it clears on row change).
- **Floating action bar** mounts between the scrolling body and
  the persistent footer when `selection.size > 0` on the Materials
  tab. Shows the count + Deselect + a primary "Mark received"
  button.
- **Selected style** — the item card carries an accent border +
  faint ring so selected rows are visible at a glance.

The batch handler calls the existing `updateChecklistItem` RPC
once per selected id (skipping any item already received, so we
don't emit no-op audit events). No new server procedure needed.

Why split the leading-checkbox semantics off the received-state
toggle? Two reasons:

1. **Affordance honesty.** A checkbox that toggled state when you
   clicked it was indistinguishable from a checkbox used for
   batch selection. Now the checkbox always means "include this
   in the next action", and status is communicated through the
   right-side Badge / Button column.
2. **Batch ergonomics.** Bulk-marking 8 of 12 received was 8
   clicks before. Now it's 8 selects + 1 Mark received = 9
   clicks for the most-common case, but you get visual
   confirmation of what you're about to touch and a single Undo
   if you change your mind. (Single-item case still 1 click via
   the right-side button.)

## Files touched

- `apps/app/src/routes/obligations.tsx` — header restructure;
  `PrimaryDeadlineStrip` component; tabs wrapper styling; stage
  card label casing + inline verb; `ChecklistItemRow`
  selection/toggle props; drawer-level selection state + batch
  handler; floating action bar; FlatDateList simplified.

## Trade-offs and follow-ups

- The PrimaryDeadlineStrip uses `row.baseDueDate` as the fallback
  for both filing and payment when those nullables are null. That
  matches the existing FlatDateList behavior but means a payment-
  less obligation still renders a "Payment" column. Acceptable
  for now — the column reads as a structural slot, not a claim
  that a payment exists.
- The multi-select model doesn't surface a header "Select all
  outstanding" affordance yet. Easy to add (one checkbox in the
  list header that flips between none/all) but I want to see if
  the per-row pattern alone covers the workflow before adding
  another control.
- The floating action bar currently lives in the readiness tab
  only. If we add batch actions to Evidence or Extension later,
  the bar shape can generalize — for now keeping it scoped.
