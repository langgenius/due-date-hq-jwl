---
title: 'Obligation lifecycle v2: design brief locked (6 states + milestone notes)'
date: 2026-05-19
author: 'Claude'
area: obligations
---

# Obligation lifecycle v2: design brief locked (6 states + milestone notes)

## Context

After a `/critique` pass on the Obligations queue and Radar surfaces,
the PDF anti-pattern #3 ("Filed ≠ Done") and #4 ("K-1 dependency
graph") surfaced as structural model gaps the current 8-state enum
cannot express. The user proposed a 6-state simplification with
per-state milestone notes; we ran the `/shape` skill to lock the
design direction before any code lands.

## Decisions captured in the discovery interview

| Question                           | Decision                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `in_progress` split mechanism      | Hybrid — manual dropdown baseline; four auto-transitions (readiness flag, e-file submission, acceptance, parent completion) |
| Fate of `paid`                     | Fold into `completed`; `obligation_type='payment'` differentiates the row. One state machine for all types                  |
| `filed → completed` trigger        | Manual confirmation only for v1. Webhook integrations out of scope                                                          |
| Status column on Obligations queue | Add as a sortable column between Tax Type and Due Date. Filter chips remain orthogonal                                      |
| Milestone notes location           | Drawer Evidence tab → promote to a Timeline tab; one surface                                                                |
| Auto-unblock when parent completes | Child flips `blocked → not_started` + system note                                                                           |
| Rejection UI                       | Status reverts `filed → in_review`; red `Rejected` chip on the row                                                          |
| `extended` migration target        | Replay each row's pre-extension state from the audit log                                                                    |

Full brief: [docs/Design/obligation-lifecycle-design-brief.md](../Design/obligation-lifecycle-design-brief.md).

## Discovery: existing UI labels are already partially aligned

Inspecting [apps/app/src/features/obligations/status-control.tsx:64-79](../../apps/app/src/features/obligations/status-control.tsx), the live label set is:

| Schema key          | Current UI label    |
| ------------------- | ------------------- |
| `pending`           | "Not started"       |
| `in_progress`       | "In progress"       |
| `waiting_on_client` | "Waiting on client" |
| `review`            | "Needs review"      |
| `done`              | **"Filed"**         |
| `paid`              | "Paid"              |
| `extended`          | "Extended"          |
| `not_applicable`    | "Not applicable"    |

Three of the six target labels (`Not started`, `Waiting on client`, `Filed`) are already there. Two more are minor renames (`Needs review` → `In review`, `Filed`-as-done → `Filed`-as-distinct-state).

**Notable: `done` is labeled "Filed" today.** This is itself a live manifestation of PDF anti-pattern #3 — the UI says "filed" while the schema thinks the row is "done." There is currently no way to distinguish _submitted to IRS_ from _accepted by IRS/state_. Slice 1 of the migration needs to either split this or rename `done` semantically.

## What slice 1 actually requires (revised from initial scope)

Initial framing assumed slice 1 was "UI-only behind a flag." Discovery shows that's insufficient because **`blocked` and `completed` have no schema-level representation today**:

- `blocked` — there is no current value that represents "blocked on a parent obligation." Today's `in_progress` is the only stand-in, and it carries no `blocked_by` pointer.
- `completed` (in the new sense of "acceptance landed") — distinct from `done`-as-filed. The current `done` collapses both.

A meaningful preview behind a flag therefore needs at minimum:

1. Add `blocked` and `completed` to `ObligationStatusSchema` ([packages/contracts/src/shared/enums.ts:55-64](../../packages/contracts/src/shared/enums.ts)) as **non-breaking additions** (existing values stay valid).
2. ORPC contract additions to accept the new values on writes.
3. Drizzle migration for the column constraint (if column is constrained to enum at the DB layer).
4. Feature flag (URL param `?lifecycle=v2` proposed) that toggles the dropdown vocabulary.
5. UI work: `StatusPill` updated to render the 6 labels, mapping helper for legacy values, Status column on Obligations queue, Timeline tab scaffold in the drawer.

That's the revised slice 1. Slice 2 covers transitions + auto-transitions + blocked_by graph + rejection unwind. Slice 3 is the migration script.

## Next

Awaiting user confirmation on whether to land slice 1 (now including schema additions) in this branch, or split slice 1a (schema only) and 1b (UI) into two PRs.

## Memory updated

- `~/.claude/projects/-Users-yuqi-dev-due-date-hq-jwl/memory/project_status_taxonomy.md` — corrected 8→6 migration table; legacy enum captured verbatim
- `~/.claude/projects/-Users-yuqi-dev-due-date-hq-jwl/memory/MEMORY.md` — added index entry
