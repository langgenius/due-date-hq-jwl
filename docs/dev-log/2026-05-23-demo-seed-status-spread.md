---
title: 'Demo seed — every brightline client showcases a different obligation status'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# One client per status, all visible from the /clients list

Yuqi: "ensure all of the clients in the list are having different
status so i can design them by looking at all status."

The brightline demo seed had 9 clients but their next-due
obligations clustered into 4 statuses (`pending` x4, `in_progress`
x2, `waiting_on_client` x2, `review` x1). To design every stage
card variant Yuqi has to manually flip rows in the UI — slow and
easy to forget combinations.

Spread fixed in `mock/demo.sql`: each client's earliest non-terminal
obligation now sits in a distinct status, with the matching
sub-status columns set so the stage card has something meaningful
to render.

## Status assignment

| Client                         | Status              | Sub-status detail                                              |
| ------------------------------ | ------------------- | -------------------------------------------------------------- |
| 0001 Arbor & Vale LLC          | `pending`           | No sub-state (Not started)                                     |
| 0002 Bright Studio S-Corp      | `waiting_on_client` | `prep_stage = 'waiting_on_client'` (Waiting on docs)           |
| 0003 Northstar Dental Group    | `blocked`           | `blocked_by_obligation_instance_id` → Lakeview's federal_1065  |
| 0004 Copperline Studios Inc.   | `review`            | `prep_stage='prepared'`, `review_stage='in_review'`            |
| 0005 Cascade Florist           | `in_progress`       | `prep_stage='in_prep'` (Preparer drafting)                     |
| 0006 Magnolia Family Trust     | `done`              | `efile_state='submitted'`, `efile_submitted_at` set (awaiting) |
| 0007 Lakeview Medical Partners | `extended`          | `extension_filed_at` + `current_due_date` pushed 6 months      |
| 0008 Orbit Design LLC          | `paid`              | `payment_state='confirmed'` (Authority confirmed payment)      |
| 0009 Riverbend Draft Client    | `completed`         | `efile_state='final_package_delivered'`, full date trail set   |

That covers all 6 canonical lifecycle statuses (Not started /
Waiting / Blocked / In review / Filed / Completed) plus the 3
secondary ones (in_progress, extended, paid). Opening any client
from /clients now drops Yuqi straight into a different stage card
variant.

## Notes on the choices

- **Northstar's blocker** is Lakeview's federal_1065 — a real K-1
  scenario (partnership return blocks partners' returns). The
  inline BlockerContextCard fetches the blocker via getDetail and
  renders its form / client / status / due-date. Real-world story.
- **Lakeview is `extended`**, which also means it's the blocker for
  Northstar. Slightly meta: Northstar is "blocked by Lakeview, and
  Lakeview's status is `extended`." Both stages visible on the same
  data, both grouped by the same partnership-K-1 relationship.
- **Magnolia already had a `done`/accepted row** (oblig 0007); the
  new flip is on oblig 0008 (the FL corp income row) which becomes
  the next-due. Trust now has a recently-filed e-file pending
  acceptance — fresh Filed-stage demo data.
- **Riverbend's `completed`** sets full efile_submitted_at +
  efile_accepted_at so the CompletedKeyDates card has dates to
  derive Filed / Completed / Cycle time from. (Audit events aren't
  written here, so the rolling "first time we entered stage X"
  derivation falls back to the row-level timestamps.)

## How to apply

```
pnpm db:seed:demo
```

The seed file is read directly from `mock/demo.sql` by
`packages/db/seed/demo.ts`. No app code changed — purely a data
seed update.

## Files touched

- `mock/demo.sql` — 1 file, ~130 added lines (the new status spread
  block + a few comment headers).
