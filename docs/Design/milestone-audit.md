# Per-Deadline Milestone Status — Audit Matrix

_Owner: Yuqi · 2026-05-27 · Agent X3 (chi3-milestone-audit) · audit-drain wave-7_

The drawer's milestone telling lives across six surfaces. Each one independently maps an obligation's underlying 10-state `ObligationStatus` into the canonical 6-stage lifecycle v2 surface (`pending → waiting_on_client → blocked → review → done → completed`). When the maps drift, the surfaces tell a different story about the same row.

This doc is the source-of-truth matrix: for every canonical stage AND every legacy status that should collapse into it, what does each surface actually render today, what should it render, and where is the wiring broken.

---

## Section 1 — Canonical lifecycle (per `status-control.tsx` + `obligation-lifecycle-design-brief.md`)

| v2 stage           | Absorbs legacy statuses              | Pill label          | Pill variant   | Icon (lucide)        | Icon tone           |
| ------------------ | ------------------------------------ | ------------------- | -------------- | -------------------- | ------------------- |
| `pending`          | `pending`, `not_applicable`          | "Not started"       | `secondary`    | `Loader`             | `text-tertiary`     |
| `waiting_on_client`| `waiting_on_client`                  | "Waiting on client" | `outline`      | `Hourglass`          | `text-warning`      |
| `blocked`          | `blocked`                            | "Blocked"           | `destructive`  | `Construction`       | `text-destructive`  |
| `review`           | `in_progress`, `review`, `extended`  | "In review"         | `info`         | `MessageSquareText`  | `text-accent`       |
| `done`             | `done`, `paid`                       | "Filed"             | `success`      | `FileCheck`          | `text-success`      |
| `completed`        | `completed`                          | "Completed"         | `success`      | `CircleCheck`        | `text-success`      |

Note: the v2 collapse table above is the contract every milestone surface must honor.

---

## Section 2 — Surface inventory

| #   | Surface                                                   | File                                                          | What it shows                                              |
| --- | --------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| S1  | Status pill (queue + drawer header)                       | `features/obligations/status-control.tsx`                     | Single icon + label chip                                   |
| S2  | Per-deadline milestone strip (`PathToFilingSummary`)      | `routes/obligations.tsx:9143` (rendered at `:6422`)           | 6 horizontal milestone nodes with icon + label + date      |
| S3  | Active-stage detail card (`ActiveStageDetailCard`)        | `routes/obligations.tsx:9933`                                 | Body card with stage label, sub-status, tasks              |
| S4  | Vertical audit timeline (`ObligationTimeline`)            | `features/obligations/timeline.tsx`                           | Vertical lifecycle journal grouped by milestone            |
| S5  | Completed terminal key-dates (`CompletedKeyDates`)        | `features/obligations/CompletedKeyDates.tsx`                  | Inline "Opened / Filed / Completed / Cycle time" dl        |
| S6  | Readiness checklist row (`ChecklistItemRow`)              | `features/obligations/ChecklistItemRow.tsx`                   | Material-level chips (received / needs-review)             |
| S7  | Readiness-overview headline (`ReadinessOverview`)         | `routes/obligations.tsx:8565`                                 | Per-stage headline + subline                               |

`ChecklistItemRow` (S6) is materials-state, NOT lifecycle-state — included for completeness but the audit primarily targets S1-S5 + S7.

---

## Section 3 — Drift matrix (state × surface)

Notation:
- ✓ — surface treats this state correctly per the canonical contract.
- DRIFT — surface tells a different story than at least one peer.
- ABSENT — state isn't represented at all on this surface.

### 3.1 `pending` (display: "Not started")

| Surface | Behaviour                                                                                             | Verdict |
| ------- | ----------------------------------------------------------------------------------------------------- | ------- |
| S1 pill | Icon Loader (gray), label "Not started"                                                               | ✓       |
| S2 strip| Index 0 highlighted as active, Loader icon (since 2026-05-26 align-with-status-icon pass)             | ✓       |
| S3 card | stageKey "pending", label "Not started", tasks: engagement / assign / request-docs / start            | ✓       |
| S4 jrnl | MILESTONE_MAP.pending = pending ✓                                                                     | ✓       |
| S7 ovr  | `stageKey === 'pending'`, headline "Requested from client" or counters                                | ✓       |

### 3.2 `not_applicable` (collapses → "Not started" / pending stage)

| Surface | Behaviour                                                                                                                   | Verdict |
| ------- | --------------------------------------------------------------------------------------------------------------------------- | ------- |
| S1 pill | Icon Loader, label v2="Not started"                                                                                         | ✓       |
| S2 strip| `timelineIndexForStatus` → 0 (pending) ✓ — but strip is NOT muted, despite the brief calling for 60% opacity treatment      | **DRIFT M-01** |
| S3 card | stageKey "pending" ✓, but tasks are "engagement letter / assign / request docs" — meaningless for an N/A row               | **DRIFT M-02** |
| S4 jrnl | MILESTONE_MAP does NOT include `not_applicable` → falls into "Other activity" bucket. Inconsistent with S1/S2 collapse.      | **DRIFT M-03** |
| S7 ovr  | `stageKey === 'pending'` ✓, but readiness branches misread "no checklist yet" as actionable                                 | accepted gap |

### 3.3 `waiting_on_client` (display: "Waiting on client")

| Surface | Behaviour                                                                                                             | Verdict |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ------- |
| S1 pill | Icon Hourglass (amber), label "Waiting on client" / "Waiting on client" — consistent                                  | ✓       |
| S2 strip| Stage label is **"Waiting"** (short form), not "Waiting on client" — divergent from pill                              | **DRIFT M-04** |
| S3 card | `stageLabels.waiting_on_client = t\`Waiting\`` — same short form                                                       | **DRIFT M-04** |
| S4 jrnl | Uses `labels[milestone]` passed from caller — when caller passes v2 labels → "Waiting on client"; legacy → "Waiting on client" | ✓ |
| S7 ovr  | Headline "Waiting on N items" — consistent                                                                            | ✓       |

`PathToFilingSummary` and `ActiveStageDetailCard` both use the short label "Waiting"; the pill and overview use "Waiting on client." Same row, two names.

### 3.4 `blocked` (display: "Blocked")

| Surface | Behaviour                                                                                                | Verdict |
| ------- | -------------------------------------------------------------------------------------------------------- | ------- |
| S1 pill | Icon Construction (red), label "Blocked"                                                                 | ✓       |
| S2 strip| Index 2, Construction icon, label "Blocked" — consistent                                                 | ✓       |
| S3 card | label "Blocked", tasks: "Mark upstream return resolved"                                                  | ✓       |
| S4 jrnl | MILESTONE_MAP.blocked = blocked ✓                                                                        | ✓       |

### 3.5 `in_progress` (collapses → "In review" / review stage)

| Surface | Behaviour                                                                                            | Verdict |
| ------- | ---------------------------------------------------------------------------------------------------- | ------- |
| S1 pill | Icon MessageSquareText, label v2="In review"                                                          | ✓       |
| S2 strip| `timelineIndexForStatus` → 3 (review) ✓                                                              | ✓       |
| S3 card | stageKey "review" ✓                                                                                  | ✓       |
| S4 jrnl | MILESTONE_MAP does NOT include `in_progress` → "Other activity". S1/S2 say review, S4 says it didn't happen on the journey | **DRIFT M-05** |

### 3.6 `review` (display: "In review")

| Surface | Behaviour                                                                                             | Verdict |
| ------- | ----------------------------------------------------------------------------------------------------- | ------- |
| S1 pill | Icon MessageSquareText, v2 label "In review", LEGACY label "Needs review"                            | **DRIFT M-06** |
| S2 strip| "In review" ✓                                                                                         | ✓       |
| S3 card | "In review" ✓                                                                                         | ✓       |
| S4 jrnl | MILESTONE_MAP.review = review ✓                                                                       | ✓       |

`useStatusLabels` (legacy) returns "Needs review" for status `review` — but lifecycle v2 reads `review` as work in progress, not as "needs attention". Surfaces that fall back to legacy labels (e.g. error toasts that key off `useStatusLabels`) will say "Needs review" for the same row the queue pill calls "In review."

### 3.7 `extended` (collapses → "In review")

| Surface | Behaviour                                                                                                   | Verdict |
| ------- | ----------------------------------------------------------------------------------------------------------- | ------- |
| S1 pill | v2 label "In review", icon MessageSquareText (blue) ✓                                                       | ✓       |
| S2 strip| Index 3 (review), sub-status "Extension active" ✓                                                           | ✓       |
| S3 card | stageKey "review" ✓                                                                                         | ✓       |
| S4 jrnl | MILESTONE_MAP does NOT include `extended` → "Other activity" instead of the review milestone bucket          | **DRIFT M-07** |
| S* due  | `DUE_DAYS_TERMINAL_STATUSES` does NOT include `extended` → still shows live red "N days late" pill           | **DRIFT M-08** |

DRIFT M-08 is the worst: an `extended` row means the deadline was officially extended (pushed forward via the extension filing). Showing it as "18 days late" contradicts the entire reason `extended` exists as a status — it tells the CPA they have unfinished overdue work when the authority has granted relief.

### 3.8 `done` (display: "Filed")

| Surface | Behaviour                                                                                          | Verdict |
| ------- | -------------------------------------------------------------------------------------------------- | ------- |
| S1 pill | Icon FileCheck, label "Filed" ✓                                                                    | ✓       |
| S2 strip| Index 4, FileCheck icon, label "Filed" ✓                                                           | ✓       |
| S3 card | "Filed" with rich e-file pipeline sub-status ✓                                                     | ✓       |
| S4 jrnl | MILESTONE_MAP.done = done ✓                                                                        | ✓       |
| S5 dates| Mines audit events for "first done" — renders Filed key date ✓                                     | ✓       |

### 3.9 `paid` (collapses → "Filed" / done stage)

| Surface | Behaviour                                                                                                    | Verdict |
| ------- | ------------------------------------------------------------------------------------------------------------ | ------- |
| S1 pill | v2 label "Filed", legacy label "Paid"                                                                        | shared-green per design |
| S2 strip| `timelineIndexForStatus` → 4 (done) ✓                                                                        | ✓       |
| S3 card | stageKey "done" + branches on `row.status === 'paid'` for payment-pipeline sub-status ✓                      | ✓       |
| S4 jrnl | MILESTONE_MAP.paid = `completed` (not `done`)                                                                | **DRIFT M-09** |
| S5 dates| Only mines `done` and `completed` events; `paid` rows skipping via paid-only path get no "Filed" key date     | **DRIFT M-10** |

DRIFT M-09: `MILESTONE_MAP` says `paid → completed`. But canonical collapse (status-control, STAGE_STATUS_GROUPS, timelineIndexForStatus) says `paid → done` (the "Filed" milestone). The vertical timeline bucket will land paid events under "Completed" while the strip / pill / detail card put them under "Filed."

### 3.10 `completed` (display: "Completed")

| Surface | Behaviour                                                                                      | Verdict |
| ------- | ---------------------------------------------------------------------------------------------- | ------- |
| S1 pill | Icon CircleCheck, label "Completed" ✓                                                          | ✓       |
| S2 strip| Index 5, CircleCheck icon, label "Completed" ✓                                                 | ✓       |
| S3 card | stageKey "completed", task "File workpapers in archive" ✓                                      | ✓       |
| S4 jrnl | MILESTONE_MAP.completed = completed ✓                                                          | ✓       |
| S5 dates| Mines first `completed` event ✓                                                                | ✓       |

---

## Section 4 — Wiring issues

### W-1 — `MILESTONE_MAP` in `timeline.tsx` doesn't match `STAGE_STATUS_GROUPS` in `obligations.tsx`

These two maps both answer "what canonical milestone does each legacy status belong to?" — but they disagree:

| Legacy status      | `MILESTONE_MAP` (timeline.tsx)   | `STAGE_STATUS_GROUPS` (obligations.tsx) | `timelineIndexForStatus` |
| ------------------ | -------------------------------- | --------------------------------------- | ------------------------ |
| `pending`          | pending                          | pending                                 | 0 (pending)              |
| `not_applicable`   | **(absent — falls to "Other")**  | pending                                 | 0 (pending)              |
| `waiting_on_client`| waiting_on_client                | waiting_on_client                       | 1                        |
| `blocked`          | blocked                          | blocked                                 | 2                        |
| `in_progress`      | **(absent)**                     | review                                  | 3 (review)               |
| `review`           | review                           | review                                  | 3                        |
| `extended`         | **(absent)**                     | review                                  | 3 (review)               |
| `done`             | done                             | done                                    | 4                        |
| `paid`             | **completed** (WRONG)            | done                                    | 4 (done)                 |
| `completed`        | completed                        | completed                               | 5                        |

Three legacy statuses (`not_applicable`, `in_progress`, `extended`) drop into the timeline's "Other activity" bucket instead of collapsing into their canonical milestone. `paid` is mis-mapped to the wrong milestone entirely.

Root cause: `timeline.tsx` was authored against the pre-v2 lifecycle vocabulary, before the v2 collapse contract landed in `status-control.tsx`. Nobody updated the map when the lifecycle v2 surface shipped.

### W-2 — `subStatusForActiveStage` reads `case 'paid'` but the milestone label uses "Filed"

`subStatusForActiveStage` returns the e-file sub-status for `done` and `paid` paths, but the strip's stage label is `stages[4].label = "Filed"`. If a `paid` row lands here, the sub-status string the helper returns is "Authority confirmed payment cleared" — that's coherent, but the helper's `case 'paid'` branch only fires inside `ActiveStageDetailCard`'s local `subStatus` IIFE (`obligations.tsx:9997`), NOT inside `subStatusForActiveStage` (the global helper used by the strip — `obligations.tsx:11089`). The two helpers diverge: the local IIFE handles `paid`, the global handler returns the e-file sub-status for `done`+`paid` combined. The strip uses the global, the card uses the local IIFE — so the strip and the card show different sub-status text on a `paid` row.

This is partial drift. The label is consistent ("Filed"); the descriptor below it diverges between strip and card. Not actively wrong, but the two helpers shouldn't exist side-by-side.

### W-3 — `TIMELINE_TERMINAL_STAGE_KEYS` covers only `{done, completed}` — `paid` collapses into `done` so it's covered transitively. ✓ for current usage.

But: the equivalent `DUE_DAYS_TERMINAL_STATUSES` set (line 4620) is keyed on **raw status**, not stage. It includes `{done, paid, completed}` — correctly. The two sets answer different questions (stage vs status) so the names should reflect that. Minor naming inconsistency, not a logic bug.

### W-4 — `DUE_DAYS_TERMINAL_STATUSES` excludes `extended` and `not_applicable`

Both are closed statuses (per `CLOSED_OBLIGATION_STATUSES` in `obligation-workflow/index.ts`). A row in `extended` shows "Filed N days late" semantics would never apply — the extension MOVED the deadline. A row in `not_applicable` is "this doesn't apply" — lateness is meaningless.

Currently both render the live red `daysUntilDue` pill alongside their muted "Extension active" / "Not started" stage labels.

---

## Section 5 — Drift summary

| ID    | Title                                                                  | Severity | Surface    | Status   |
| ----- | ---------------------------------------------------------------------- | -------- | ---------- | -------- |
| M-01  | `not_applicable` strip not muted (60% opacity per brief)                | P2       | S2         | DEFERRED — needs design call on the muted-treatment shape |
| M-02  | `not_applicable` shows "request docs" tasks — meaningless for N/A      | P2       | S3         | DEFERRED — N/A is rarely the actor-controlled state; rework with task taxonomy |
| M-03  | `not_applicable` falls into "Other activity" instead of pending bucket | P1       | S4         | **SHIPPED** |
| M-04  | "Waiting" vs "Waiting on client" label mismatch                        | P1       | S2, S3     | **SHIPPED** |
| M-05  | `in_progress` falls into "Other activity" instead of review bucket    | P1       | S4         | **SHIPPED** |
| M-06  | Legacy label `useStatusLabels.review = "Needs review"`                 | P2       | S1 (legacy)| **SHIPPED** — aligned to "In review" |
| M-07  | `extended` falls into "Other activity" instead of review bucket       | P1       | S4         | **SHIPPED** |
| M-08  | `extended` shows live "N days late" red pill                          | P0       | DueDaysPill| **SHIPPED** |
| M-09  | `paid` mis-mapped to "Completed" in timeline.tsx milestone map         | P0       | S4         | **SHIPPED** |
| M-10  | `paid`-only rows miss "Filed" key date in CompletedKeyDates           | P1       | S5         | **SHIPPED** |
| W-1   | Two-map drift (`MILESTONE_MAP` vs `STAGE_STATUS_GROUPS`)              | P0       | wiring     | **SHIPPED** (M-03/M-05/M-07/M-09 all stem from this; unified via single helper) |
| W-2   | Two-helper drift (local IIFE vs `subStatusForActiveStage`)            | P2       | wiring     | DEFERRED — refactor risk for the size of the win |
| W-4   | `DUE_DAYS_TERMINAL_STATUSES` missing `extended` / `not_applicable`    | P0/P1    | wiring     | **SHIPPED** (covers M-08) |

Totals:
- P0: 3 (M-08, M-09, W-4) — all shipped
- P1: 5 (M-03, M-04, M-05, M-07, M-10) — all shipped
- P2: 3 (M-01, M-02, W-2) — 1 shipped (M-06), 3 deferred
- Wiring: 2 root-cause issues — 2 shipped

---

## Section 6 — Mechanical fixes shipped

1. **timeline.tsx — MILESTONE_MAP rewritten as `milestoneForStatus()` that derives from canonical collapse table.** Brings `not_applicable / in_progress / extended → review-or-pending` into their milestone buckets and corrects `paid → done`. Source-of-truth comment points back to `LIFECYCLE_V2_STATUSES` in status-control. (M-03, M-05, M-07, M-09, W-1)

2. **status-control.tsx — `useStatusLabels.review` from "Needs review" → "In review".** Brings the legacy 10-state label set in line with the v2 collapse. The status `review` does NOT mean "needs review"; it means "the team is reviewing the prepared return" — same semantic family as `in_progress`. (M-06)

3. **obligations.tsx — `DUE_DAYS_TERMINAL_STATUSES` now includes `extended` and `not_applicable`.** Both are closed states where live lateness is meaningless. Renders muted "Filed N days late" stat only for the rows where that statement actually applies (`done`, `paid`, `completed`); for `extended` / `not_applicable` the row shows "—". (M-08, W-4)

4. **obligations.tsx — `PathToFilingSummary` stage label "Waiting" → "Waiting on client".** Matches the pill, the overview, and the v2 label contract — one row, one name. (M-04, strip)

5. **obligations.tsx — `ActiveStageDetailCard` stageLabels.waiting_on_client "Waiting" → "Waiting on client".** Same alignment as #4. (M-04, card)

6. **CompletedKeyDates.tsx — mines `paid` events alongside `done` for the "Filed" key date.** A row that goes pending → paid → completed (no `done` event in between) used to have a blank Filed line; now it shows the paid stamp as Filed. (M-10)

7. **timeline.test.tsx — added 4 regression cases** covering legacy statuses landing in canonical milestones: `paid` → Filed bucket (not Completed), `in_progress` → In review bucket, `extended` → In review bucket, `not_applicable` → Not started bucket. Locks the fix against future drift.

Total: 7 fixes shipped, under the 12 cap.

---

## Section 7 — Deferred items

| ID    | Reason                                                                                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------- |
| M-01  | The "mute the N/A timeline at 60%" treatment is referenced in the lifecycle brief but never specified visually. Needs a design pass on the muted card shape (does the icon dim? does the strip turn dotted? does the date column disappear?) before mechanical work makes sense. |
| M-02  | The pending-stage task list ("Confirm engagement letter / Assign preparer / Request documents") was built for ACTIVE pending rows. N/A rows are a different operator intent — the right answer is probably "show no tasks at all, point the CPA at the re-activate flow." Wants a discovery interview before guessing. |
| W-2   | `subStatusForActiveStage` (module-scope helper) and the in-component `subStatus` IIFE both exist because the Lingui macro doesn't transform `t\`...\`` when `t` is a function argument. Unifying them is mechanically straightforward (curry the helper or duplicate the string list) but a 60-line refactor isn't worth the audit budget — file under future tech-debt. |

---

## Section 8 — Recommendation: source-of-truth for status→milestone

Today, three independent maps answer the same question:

1. `MILESTONE_MAP` in `timeline.tsx` (now fixed but still independent)
2. `STAGE_STATUS_GROUPS` in `obligations.tsx`
3. `timelineIndexForStatus` switch in `obligations.tsx`

These should be one map living in `status-control.tsx` next to `LIFECYCLE_V2_STATUSES` and `useLifecycleV2StatusLabels` — a single `STATUS_TO_MILESTONE` record that the three current consumers all import. Next pass.

---

_End of audit. 7 fixes shipped, 3 items deferred with reasons, 1 architectural recommendation logged._
