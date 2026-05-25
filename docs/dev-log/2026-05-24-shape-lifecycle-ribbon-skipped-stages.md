---
title: 'Lifecycle ribbon tells the truth about skipped stages (shape)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: obligations
---

# Ribbon stops claiming a history that didn't happen (critique P1 — shape)

## Why

Critique P1: the milestone strip inside the obligation drawer
rendered every stage _before_ the current one as a green-tick "done"
circle. So a row that went `Not started → Filed` directly — never
sat in Waiting, Blocked, or In review — showed all six stages with
the first five looking _completed_. The ribbon was claiming a four-
stage history that didn't exist.

The data was already there to tell the truth.
`mineTimelineTimestamps` walks the audit-event log and returns
`null` for stages the row never entered. The render code just wasn't
consulting it for the visual state — only for the displayed date.

Per the canonical 6-state taxonomy:

> "States are alternatives, not phases. A row can go Not started →
> In review directly with no waiting or blocking."
> — `memory:project_status_taxonomy.md`

The ribbon should reflect that.

## What changed

### `apps/app/src/routes/obligations.tsx` — `PathToFilingSummary`

Replaced the index-based state computation:

```ts
// Was:
const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'upcoming'

// Now:
const state =
  i === currentIndex
    ? 'active'
    : i < currentIndex
      ? stamps[i] !== null || i === 0 // i === 0 = Not started, implicitly entered
        ? 'done'
        : 'skipped'
      : 'upcoming'
```

A fourth state, `skipped`, joins the existing three. Stage 0
(`Not started`) is special-cased — every row is born there, so a
missing stamp is fine.

**Visual:**

| State         | Circle                           | Inner                | Color                      |
| ------------- | -------------------------------- | -------------------- | -------------------------- |
| `done`        | solid border, success-hover fill | white check on green | green                      |
| `active`      | accent ring                      | empty                | accent (or red if overdue) |
| **`skipped`** | **dashed border, default fill**  | **tiny muted dot**   | **muted gray**             |
| `upcoming`    | solid border, default fill       | empty                | muted gray                 |

Reads cleanly: filled = entered, dashed = didn't enter, empty
ring = not yet.

### Connectors

Both the left and right connectors were rewritten to consult both
endpoint states. An edge between stages i and i+1 only renders in
the success tone when BOTH stages were genuinely entered (or
active). Skipped stages on either end keep the edge muted. So a
row's path through the ribbon now lights up only the segments it
actually traveled.

### Date display

The existing logic `(state === 'done' || state === 'active' ||
isExpected) && stamp` was already correct — `stamps[i]` is null for
skipped stages, so no date renders under them. No change needed.

## How to verify

`/obligations` with the demo seed, open any row in `done` (UI
"Filed") status with no audit-log Waiting/Blocked/In review
transitions (e.g. **Bright Studio S-Corp · Form 1120-S**):

| Stage       | Was                 | Is                              |
| ----------- | ------------------- | ------------------------------- |
| Not started | ✓ green tick + date | ✓ green tick + date (unchanged) |
| Waiting     | ✓ green tick (lie)  | ⊙ muted dashed dot (truthful)   |
| Blocked     | ✓ green tick (lie)  | ⊙ muted dashed dot (truthful)   |
| In review   | ✓ green tick (lie)  | ⊙ muted dashed dot (truthful)   |
| Filed       | active accent ring  | active accent ring (unchanged)  |
| Completed   | empty upcoming ring | empty upcoming ring (unchanged) |

Connectors between consecutive skipped stages are now muted gray
instead of success-green.

For rows that DID traverse the full path (e.g. a `completed` row
with all five upstream audit events on file), all stages still
render as `done` and the connectors stay green — the change is
purely additive truthfulness, no regression on the happy path.

## What was considered and not done

### Replace the ribbon with a single state pill

The critique offered an alternative: replace the ribbon entirely
with one bright "current state" pill + the full history on the
Activity tab. That would also fix the lie — but loses the at-a-
glance "where is this row in its lifecycle?" answer that the strip
provides. Keeping the strip and making it truthful preserves the
glance value without inventing history. Two-line change instead of
two-week refactor.

### A separate `entered` boolean alongside `state`

Could have kept `state` as the existing three values and added a
new `entered: boolean` to differentiate done-real vs done-implied.
Rejected — the visual treatment for "skipped" is meaningfully
different from "done," so promoting it to a first-class state value
makes the rendering code clearer and keeps the visual states
disjoint.

## Files touched

- M `apps/app/src/routes/obligations.tsx`
