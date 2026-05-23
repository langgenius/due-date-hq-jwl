---
title: 'P0 status journey — Blocked + Waiting stages get inline context'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Two stages stop being "ask the next tab"

Per the status-journey design doc landed earlier today
(`docs/Design/deadline-status-meaning-and-journey-2026-05-23.md`),
Blocked and Waiting were the two stages where the panel was lying
about what the CPA needed to do — the sub-status word was vague, the
real context lived behind a click.

## Blocked: inline blocker card

Before:

```
BLOCKED · Upstream obligation
Entered 2026-05-23
[Open blocking obligation ↗]   ← routing link, ID-only
[Mark unblocked]                ← primary
```

CPA could click through to the blocker but had no idea which one it
was without leaving the panel. "Upstream obligation" is a category
label, not an identity.

After:

```
BLOCKED · Upstream obligation
Entered 2026-05-23

┌─ BLOCKED BY ───────────────────────────┐
│ Form 1065  Acme Holdings LLC           │ ← whole card clickable
│ [Pending]  Due Apr 15, 2026            │
└────────────────────────────────────────┘

[Mark unblocked]
```

`BlockerContextCard` fetches the upstream row via
`orpc.obligations.getDetail` and renders form / client / status /
due-date. Whole card is the click target → opens that obligation in
the drawer using the same `useObligationDrawer` provider the queue

- client detail use. The data is the same cache the destination
  drawer will use, so the navigation is instant on hit.

Dropped the now-redundant "Open blocking obligation" routing task
from the StageActions list — the card replaces it with strictly
more information.

## Waiting: outstanding docs inline

Before:

```
WAITING · Documents from client
Entered 2026-05-23
[Send readiness request ↗]
[Mark docs received]              ← primary
Chase outstanding documents       ← reminder
```

To know what they were actually waiting on, the CPA had to switch
to the Readiness tab.

After:

```
WAITING · Documents from client
Entered 2026-05-23

┌─ 3 OUTSTANDING DOCUMENTS ──────────────┐
│ ○  W-2 — 2026                          │ ← whole card clickable
│ ○  1099-DIV                            │
│ ○  K-1 from partnership                │
│ +0 more in the Readiness tab           │
└────────────────────────────────────────┘

[Send readiness request ↗]
[Mark docs received]
Chase outstanding documents
```

`WaitingOutstandingDocs` reads the existing `readinessChecklist`
(already on the drawer's detail query — no extra network call) and
shows up to 3 outstanding item labels + a `+N more` overflow.
Whole card routes to the Readiness tab where the full editor lives.

Hidden when nothing is outstanding (or the row has no checklist at
all, e.g. a `payment` obligation using Waiting loosely).

## Plumbing changes

- `ActiveStageDetailCard` gains a `readinessChecklist` prop. The
  caller in `ObligationQueueDetailDrawer` already had this on
  `detail.readinessChecklist` from the existing detail query — just
  threaded through.
- New `BlockerContextCard` + `WaitingOutstandingDocs` components
  live in the same file as `ActiveStageDetailCard` for now (~150 LOC
  combined). If they earn reuse on other surfaces, they can move
  into a shared `obligations/` module later.
- Removed the `open-blocker` task from the `blocked` stage's
  StageTask list since the inline card replaces it. The
  `handleTaskClick` switch keeps the `open-blocker` case as
  defensive code (no current call site, but harmless).
- `STATUS_VARIANT` imported into `obligations.tsx` for the
  blocker's status badge variant lookup.
- `CircleIcon` lucide import added for the outstanding-docs list.

## Followups still on the list

- **In Review pipeline visualization** (P1) — prep ↔ review
  sub-states deserve a 6-step strip like the Filed stage gets.
- **Completed key-dates summary** (P1) — terminal stage should
  show filed + accepted + cycle-time inline.

Both going into the next commit.

## i18n

6 new strings + zh-CN translations:

- `Blocked by`
- `Loading blocker details`
- `Open blocking obligation: {0} for {1}`
- `Open the Readiness tab to review {0} outstanding documents`
- `{0, plural, one {# outstanding document} other {# outstanding documents}}`
- `+{overflow} more in the Readiness tab`

## Files touched

- `apps/app/src/routes/obligations.tsx`:
  - 2 new components (BlockerContextCard, WaitingOutstandingDocs).
  - ActiveStageDetailCard renders them conditionally on stage,
    above the StageActions / pipeline block.
  - Stage tasks for `blocked` dropped the routing duplicate.
  - Imports: `STATUS_VARIANT`, `CircleIcon`.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 6 strings.
