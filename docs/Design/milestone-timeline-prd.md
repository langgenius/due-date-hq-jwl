# Milestone Timeline — Product Requirements

_Owner: Yuqi · v1 · 2026-05-21_

The milestone timeline is the most important affordance on the obligation panel. It answers, at a glance, **"Where is this filing right now, when did it get there, and what's left?"** Everything else in the panel — the dates, the readiness tab, the evidence — supports the timeline.

---

## 1 · Purpose

A CPA opens an obligation drawer to answer one of three questions:

1. **"What state is this row in right now?"** (workflow / status)
2. **"How did it get here?"** (audit-defense story — _when_ did each stage start/end, who moved it)
3. **"What's left until close?"** (forward-looking, due-date risk)

The milestone timeline answers all three in **one visual surface**. Every other tab in the drawer is detail for one of these questions.

It also serves a secondary purpose: **operational acceleration**. A senior CPA scanning the queue should be able to glance at a milestone and instantly know whether to delegate, review, or escalate — without opening the panel. (See §6: queue-table integration.)

---

## 2 · Stages (canonical lifecycle vocabulary)

Six stages, matching the obligation status taxonomy:

| #   | Stage           | Maps from data status(es)           | Meaning                                                                   |
| --- | --------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| 1   | **Not started** | `pending`, `not_applicable`         | Nothing has happened yet on this row                                      |
| 2   | **Waiting**     | `waiting_on_client`                 | Paused on the client (docs, signature, confirmation, payment auth)        |
| 3   | **Blocked**     | `blocked`                           | Externally blocked (K-1 upstream, corrected 1099, authority system down)  |
| 4   | **In review**   | `in_progress`, `review`, `extended` | The team is actively working (prep, review hierarchy, extension drafting) |
| 5   | **Filed**       | `done`, `paid`                      | Submitted to authority; **may still be awaiting acceptance** (see §3.3)   |
| 6   | **Completed**   | `completed`                         | Accepted by authority, final copy delivered, archived — truly closed      |

### 2.1 Why a linear strip when the lifecycle isn't strictly linear

In reality, rows ping-pong: a row can move from `in_review` → `blocked` (corrected 1099 needed) → back to `in_review`. We **don't** show the loops. The strip displays the canonical forward path; the actual history (with cycles and back-steps) lives in the audit timestamps shown beneath each stage.

A "Blocked" stage that has a date stamp means the row visited blocked at least once. The strip is a **state machine snapshot**, not a Gantt chart.

### 2.2 Sub-statuses (deferred — see milestone-substatus-roadmap.md)

The first two sub-status investments will be:

1. **`filed` → submitted vs accepted** — derivable today from `efileAcceptedAt` / `efileRejectedAt`. Renders as a small annotation on the active stage (e.g., _Filed · awaiting IRS acceptance_).
2. **`in_review` → review level** (self → preparer cross-review → manager → partner) — needs a schema field. Ship after `filed` sub-status validates.

`waiting_on_client.reason` and `blocked.reason` are deferred until users ask.

---

## 3 · Information per stage

Each stage shows **three lines** stacked beneath its circle:

1. **Stage name** (semibold for active, secondary text for done, tertiary for upcoming).
2. **Date** — _when did the row enter this stage_:
   - **Done** stages: date from audit events (`afterJson.status === <stage>`, earliest hit).
   - **Active** stage: date the row entered the current status.
   - **Upcoming** stages: **the expected date** if we can compute it:
     - `Filed` upcoming → `row.currentDueDate` (the internal deadline = when we expect to file).
     - All others upcoming → no projected date (we don't predict when waiting will end).
   - **Stage 1 ("Not started")**: falls back to `row.createdAt` if no audit event exists (the row was born here).
3. **State word**: `DONE` / `ACTIVE` / `OVERDUE` / `EXPECTED` / blank.
   - `OVERDUE` shows when the **active** stage's date is past `currentDueDate`.
   - `EXPECTED` shows for upcoming stages that have a projected date (today, only "Filed").

### 3.1 Why every stage shows a date

Even upcoming stages — leaving them blank reads as "we don't know" and the eye misses the timeline's structure. Showing an expected date for "Filed" turns the timeline into a forward-looking commitment ("we're going to file by Apr 15"). Stages with no projection show a single em-dash placeholder so the vertical rhythm holds.

### 3.2 Active-stage emphasis

The active stage gets:

- Larger ring (size-5, others size-4)
- Bold border (`border-2` in the canonical accent color)
- Date in **primary text color**, not tertiary
- A small "annotation slot" below the state word, used for sub-status surfacing (e.g., _awaiting IRS acceptance_)

### 3.3 Filed sub-status annotation (derived, no schema change)

When stage 5 (Filed) is active:

- If `efileAcceptedAt` is set → annotation: _"Accepted {date}"_ — visually, the circle keeps its filled treatment but the ring also turns green.
- If `efileRejectedAt` is set → annotation: _"Rejected — back to In review"_ (the row's status will have flipped back to `review` so this is a transient state).
- Otherwise → annotation: _"Awaiting acceptance"_ — pale text below the state word.

---

## 4 · Visual design

### 4.1 Layout

- **Horizontal strip**, 6 columns, equal width.
- Renders inside a card with **subtle border + transparent background** (no `bg-section` elevation — the panel itself already has the tinted surface).
- Total height ≈ 110px (circle + 3 text lines + comfortable padding).

### 4.2 Circle states

| State            | Border                                    | Fill                     | Inner glyph       |
| ---------------- | ----------------------------------------- | ------------------------ | ----------------- |
| Done             | `border-state-success-solid`              | `bg-state-success-solid` | white check       |
| Active (on time) | `border-accent-default border-2`          | `bg-background-default`  | blue dot (accent) |
| Active (overdue) | `border-state-destructive-solid border-2` | `bg-background-default`  | red dot           |
| Upcoming         | `border-divider-regular`                  | `bg-background-default`  | none              |

### 4.3 Connector lines

- **Always solid, 2px height** (was 1px; user noted thin lines read as "dashed" perceptually).
- **Color**:
  - Between two Done stages: `bg-state-success-solid` (green).
  - From Done to Active: `bg-state-success-solid` (the path-so-far stays green).
  - From Active to Upcoming: `bg-divider-regular` (slightly darker than `divider-subtle` for visibility).
  - Between two Upcoming stages: `bg-divider-regular`.

### 4.4 Typography

- Stage name: 11px, leading-tight, weight matches state (semibold active, regular done/upcoming).
- Date stamp: 10px tabular-nums.
- State word: 10px uppercase, tracking-wide, leading-tight.
- Active state-word color: accent for "ACTIVE", destructive for "OVERDUE", success for "DONE".

### 4.5 Spacing rhythm

- 12px vertical gap between circle and labels.
- 4px between each label line.
- 2px line height for connectors so they read as continuous, not dashed.

---

## 5 · Functionality

### 5.1 Read-only by default

The timeline **does not** allow status changes by clicking a circle. Status is the source of truth and is controlled via:

- The status pill in the panel header (drives the canonical mutation).
- The status dropdown in the queue row.
- Lifecycle transition buttons (e.g., "Mark accepted") on the panel header.

Clicking a milestone circle is a no-op (no menu, no edit). The timeline is a **read** surface — actions live elsewhere.

### 5.2 Optional: click an Active stage to scroll to relevant tab content

E.g., clicking the active `In review` circle could scroll the right panel to the readiness section, or open the relevant tab. Defer until we see if users want it; adds complexity.

### 5.3 Hover affordances

- **Hover any circle**: tooltip shows the canonical status label + full timestamp (e.g., "Filed — submitted 2026-04-15 09:47 PDT").
- **Hover the entire timeline strip**: cursor stays `default` (not pointer) since it's not interactive.

---

## 6 · Connection to other surfaces

### 6.1 Queue table — hover Status badge → mini-timeline

A senior CPA scanning the queue needs to know "is this row stuck somewhere I should escalate?" without opening every drawer.

**Pattern**: hover the Status pill in a queue row → a small popover anchored to the badge shows a **compact horizontal mini-timeline**. Same 6 stages, smaller circles (no labels — labels would make the popover too wide), state coloring same as the panel. Hovering each circle in the popover reveals the stage + date in a nested tooltip.

The popover takes ~300px wide × 90px tall. Opens on a 500ms hover delay (avoids accidental opens).

Doesn't render at all if the row's status is `pending` (no progression to show yet).

### 6.2 Drawer header

The header's status pill (e.g., `● Filed`) carries the canonical status name. The timeline's active stage label matches it exactly. **One vocabulary across the drawer.**

When `filed` sub-status (`accepted` / `awaiting acceptance`) is active, the header pill stays as `Filed` (matches the queue row's pill) and the sub-status appears only on the timeline active-stage annotation. Avoids pill text expansion.

### 6.3 Audit tab / Timeline tab (currently removed)

Earlier audit pass removed the dedicated Audit/Timeline tab. The milestone timeline carries the role of "summarized lifecycle history." Raw audit events (status changes, who did it, system notes) belong on a different surface — e.g., an "Activity" disclosure inside the panel footer or a future Audit tab restoration. **Don't conflate the two.** The milestone timeline is a _lifecycle_ view; an audit log is an _event_ view.

### 6.4 Client detail page

When the client page surfaces a list of obligations for that client, each row could render its milestone timeline inline (collapsed to icon-only circles, no labels, ~150px wide). Defer until the client page redesign.

### 6.5 Dashboard "Actions this week"

The dashboard already shows a row's stage indirectly (via the status pill). No need for the full timeline in the dashboard — it would crowd the row. But hovering the status pill on the dashboard row could open the same mini-timeline popover from §6.1.

---

## 7 · Edge cases

| Case                                                                             | Behavior                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Row with zero audit events (just created)                                        | All stages upcoming except "Not started" (active, stamped with `row.createdAt`).                                                                                                                                                          |
| Row at `paid` status (payment-type obligation)                                   | Maps to "Filed" stage with stage label still "Filed" — payment obligations conceptually file the payment. If we want a payment-specific label, requires future PRD.                                                                       |
| Row at `extended`                                                                | Maps to "In review" — the team is actively drafting an extension. The Extension tab carries the detail.                                                                                                                                   |
| Row at `not_applicable`                                                          | Maps to "Not started" but visually muted (entire timeline rendered at 60% opacity?). Defer.                                                                                                                                               |
| Row went `filed → rejected → review`                                             | Status flips back to `review`. Timeline now shows Filed as Done (with a stamp), In review as Active. The audit log inside (future) carries the rejection note. RejectionChip on queue row signals it.                                     |
| Row skipped a stage (e.g., never went through Waiting because docs were on hand) | The "Waiting" stage shows as Upcoming with no date stamp. Connector lines stay green for stages that WERE visited; gray for skipped ones. _Or:_ skip with a dashed line through that stage to signal "bypassed." Defer the visual nuance. |

---

## 8 · Implementation phasing

**Phase 1 — Ship now**

- Solid 2px connector lines.
- Date on every stage (use expected `currentDueDate` for upcoming Filed; em-dash for other upcoming).
- Larger active-stage circle (border-2, slightly bigger ring).
- Hover popover on queue Status badge (§6.1).

**Phase 2 — Soon**

- `filed` sub-status annotation (derived from `efileAcceptedAt` / `efileRejectedAt`).
- Tooltip on each circle with status label + ISO timestamp.

**Phase 3 — Plan**

- `in_review` sub-status (schema field `review_level`).
- Click active stage → scroll to relevant tab content.
- Inline mini-timeline on client detail page rows.

---

## 9 · Things this PRD intentionally does NOT cover

- Status state machine validity (which transitions are legal). Already in `@duedatehq/core/obligation-workflow`.
- The Readiness, Extension, Evidence tabs. They're support detail; the timeline is the spine.
- Bulk operations (selecting multiple rows from the queue and bulk-changing status). Out of scope.

---

## 10 · Success criteria

- A CPA glances at a row's timeline and knows the workflow state in <500ms (no reading required for done/active stages).
- The timeline is the same vocabulary across queue, panel header, dashboard — no mental translation.
- Audit-defense story is visible without opening any extra tab.
- Senior CPA can scan the queue with hover-only and identify stuck rows without opening drawers.
