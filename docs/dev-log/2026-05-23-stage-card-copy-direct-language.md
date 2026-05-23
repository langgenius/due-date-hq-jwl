---
title: 'Stage card copy pass — actor + object on every label'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Names the actor + the object, drops the casual shorthand

Yuqi's critique: "In Review, Ready for prep for what? mark filed?
preparer in progress? all of the language you used is too casual and
indirect."

Right. Every label below was answering a "what" with a generic verb
and forcing the CPA to fill in the object in their head:

| Before                             | After                                          |
| ---------------------------------- | ---------------------------------------------- |
| Ready for prep                     | Ready to draft the return                      |
| Preparer in progress               | Preparer drafting the return                   |
| Prepared — handing off             | Draft complete — sent to reviewer              |
| Ready for review                   | Ready for reviewer sign-off                    |
| In review                          | Reviewer checking the return                   |
| Approved — ready to file           | Reviewer approved — ready to file              |
| Mark filed                         | Mark return submitted to authority             |
| Start preparation                  | Start drafting the return                      |
| Mark unblocked                     | Mark upstream return resolved                  |
| Mark docs received                 | Mark client docs received                      |
| Submit return to the tax authority | E-file the return with the tax authority       |
| Confirm authority acceptance       | Confirm the authority accepted the return      |
| Record authority rejection         | Record the authority rejected the return       |
| Mark obligation complete           | Close out this return / Close out this payment |
| Archive workpapers                 | File the workpapers in the archive             |
| Unwind to In review                | Reopen the return for drafting                 |
| Upstream obligation                | Waiting on upstream return to file             |
| Documents from client              | Waiting on client to send docs                 |
| Third-party docs                   | Waiting on third party for K-1 / 1099          |
| Bookkeeping cleanup                | Cleaning up client's books                     |
| 8879 sent to client                | 8879 sent to client for signature              |
| Submitted, awaiting acceptance     | E-filed — awaiting authority acceptance        |
| Accepted by authority              | Authority accepted the return                  |
| Final package delivered            | Final package sent to client                   |

Same rewrite applied across:

- **Stage sub-status text** (the line next to the stage label —
  e.g. `IN REVIEW · Reviewer checking the return`).
- **Pipeline step labels** (the 6-step In Review strip + the 6-step
  e-file strip + the 4-step payment strip).
- **Task button labels** (the canonical forward-action buttons + the
  manual reminders + the routing links).
- **Routing hints** (the small tooltip text on routing tasks).

## What I left alone

- **Stage labels themselves** (`Not started` / `Waiting` / `Blocked`
  / `In review` / `Filed` / `Completed`). These are the canonical
  lifecycle taxonomy — short by design, used as badges and chip
  text across the whole app. Changing them would ripple beyond
  this surface. Sub-status text below the label now does the
  disambiguation work.
- **Field names + button labels outside the obligation drawer**
  (e.g. "Mark docs received" buttons elsewhere). Scoped this pass
  to the stage-detail card to keep the diff reviewable; a broader
  copy audit across the app is its own task.

## Rule of thumb going forward

Every user-facing label should answer two questions: **who is
doing it**, and **what is being done to**. "Ready for prep" answers
neither; "Ready to draft the return" answers both. When the actor
is obvious (the CPA themselves), the object is the only missing
piece — keep it short, but name it.

## i18n

68 new English strings + zh-CN translations. The Lingui extraction
picked them up automatically (msgids include placeholder counts so
plural-aware strings stay covered).

## Files touched

- `apps/app/src/routes/obligations.tsx` — `stageLabels` left alone;
  sub-status switch, `reviewPipelineLabels`, `efilePipelineLabels`,
  `paymentPipelineLabels`, every StageTask label across the 6
  stages + sub-states all rewritten.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 68 strings.
