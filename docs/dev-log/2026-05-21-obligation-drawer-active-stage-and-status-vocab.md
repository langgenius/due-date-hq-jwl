# Obligation drawer — Active-stage card, status vocabulary collapse, queue polish

_2026-05-21 · design pass_

A multi-iteration overhaul of the obligation drawer and queue, driven by
designer feedback over the course of one session. Splits into four threads:

1. **Active-stage detail card** — new surface that sits below the milestone
   strip and shows sub-status + canonical "what's next" + audit trail for
   the current stage.
2. **Status vocabulary collapse** — V2 label map now folds 10 raw status
   values into 6 canonical pill labels everywhere they render (queue,
   drawer, dashboard, audit log).
3. **Dates panel rework** — year-strip timeline + flat list of every date
   on the row (replaces the earlier status-aware variant which hid dates
   per stage).
4. **Queue list hygiene** — default columns trimmed to 6, same-client
   cluster left rail, floating bulk-action bar, shift-click client name
   selects group, header / first-row backgrounds unified.

---

## 1 · Active-stage detail card

New component `ActiveStageDetailCard`. Renders below the milestone strip
(`PathToFilingSummary`) and above the dates panel. Three zones:

**Header.** Stage name (NOT STARTED / WAITING / BLOCKED / IN REVIEW /
FILED / COMPLETED) + sub-status descriptor derived inline from
`prepStage` / `reviewStage` / `efileState` / `paymentState`. Sub-status
logic was previously a standalone helper that took `t` as a parameter
— Lingui's macro doesn't transform `t\`...\``patterns when`t`
arrives as a parameter, so the descriptor rendered empty. Logic pulled
inline so the macro picks it up.

**Steps / What's next.** For Filed (`done` / `paid`) the section is a
vertical **sub-status pipeline** — every canonical sub-status renders
as a row with one of three states:

- `done` → green check icon + tertiary text
- `current` → accent ringed dot + bold label + actions indented below
- `upcoming` → empty circle + tertiary text at 70% opacity

E-file pipeline (6 steps): `authorization_requested` → `authorization_signed`
→ `ready_to_submit` → `submitted` → `accepted` → `final_package_delivered`.
Branch states (`rejected`, `corrected_resubmitted`, `paper_filed`)
collapse into the linear strip — they re-route through the same nodes.

Payment pipeline (4 steps): `estimate_needed` → `client_approval_needed`
→ `scheduled` → `confirmed`.

For non-Filed stages the section is just a flat action surface — sub-
statuses for those stages branch and re-enter (prepStage's `in_prep` /
`prepared` / `bookkeeping_cleanup`; reviewStage's `notes_open`), and a
list reads more honestly than a strip.

**Actions surface.** Earlier iterations rendered tasks as a mixed list of
square checkboxes (manual) and accent ringed dots (mutation primary).
The visual was chaotic — primary mutations looked like selected radio
items, manual reminders looked like clickable tasks, nothing read as a
clear CTA. Restructured into the `StageActions` component with three
visual tiers:

| Task flavour                 | Visual treatment                                 |
| ---------------------------- | ------------------------------------------------ |
| Primary mutation             | Solid `<Button>` — unmistakable CTA              |
| Secondary mutation / routing | Ghost `<Button>` with right-edge chevron / arrow |
| Manual reminder              | Single tertiary text line, items joined with `·` |

Manual tasks no longer render as checkboxes because they have no backing
schema — calling them out as reminders is more honest, and removes the
visual confusion of "can I check this off?"

**Done this stage.** Audit events whose `afterJson.status` maps to the
current stage. Shows the recent chronology (up to 4) so the CPA sees how
the row landed here without leaving the panel. Filtered against
`STAGE_STATUS_GROUPS` so e.g. "Filed" stage events match both `done` and
`paid` audit entries.

**Previous stages.** Compact collapsible list of every stage the row
visited BEFORE the active one. Each entry: stage label + duration days,
click-to-expand reveals the per-stage audit events. Single-expand-at-a-
time keeps the card height manageable. Computed via `computePastStageEntries`
which walks audit events chronologically and groups consecutive same-
stage events into spans.

### Task wiring (Option 1 of three proposed)

Mutation-flavored tasks fire the matching mutation on click:

| Task id                                                    | Mutation                    | Effect                  |
| ---------------------------------------------------------- | --------------------------- | ----------------------- |
| `start` / `received` / `resume` / `unblocked`              | `changeStatus('review')`    | Status → review         |
| `file`                                                     | `changeStatus('done')`      | Status → done           |
| `confirm` / `confirm-default` / `confirm-resubmit`         | `markAccepted`              | done → completed        |
| `record-rejection` / `unwind`                              | `markFiledRejected`         | done → review           |
| `complete` / `complete-paid`                               | `changeStatus('completed')` | Status → completed      |
| `deliver` / `deliver-paper` / `request-auth` / `sign-8879` | `onChangeTab('evidence')`   | Switch to Evidence tab  |
| `readiness`                                                | `onChangeTab('readiness')`  | Switch to Readiness tab |
| `open-blocker`                                             | toast placeholder           | Pending blocker UI      |

Sub-status mutations (Mark 8879 signed, Submit to authority, Mark client
approved, Confirm payment cleared, etc.) **stay passive with a toast
placeholder**. They require new RPC procedures:

- `orpc.obligations.updateEfileState`
- `orpc.obligations.updatePaymentState`
- `orpc.obligations.updatePrepStage`
- `orpc.obligations.updateReviewStage`

When those ship, swap the toast handler body for the mutation call — no
UI changes needed.

---

## 2 · Status vocabulary collapse

The V2 label map now folds 10 raw status values into 6 canonical labels:

| Raw status (DB)                     | V2 pill label         |
| ----------------------------------- | --------------------- |
| `pending`, `not_applicable`         | **Not started**       |
| `waiting_on_client`                 | **Waiting on client** |
| `blocked`                           | **Blocked**           |
| `in_progress`, `review`, `extended` | **In review**         |
| `done`, `paid`                      | **Filed**             |
| `completed`                         | **Completed**         |

Mutations still target the raw values (a payment obligation still writes
`status='paid'` to the DB), but the CPA sees one vocabulary across every
surface. Updated callers:

- `apps/app/src/routes/obligations.tsx` — queue pill, drawer pill, status
  filter dropdown (was iterating `ALL_STATUSES`), bulk-action "Set status"
  (same fix)
- `apps/app/src/features/dashboard/actions-list.tsx` — already used the
  V2 label map; gets the collapse automatically
- `apps/app/src/features/audit/audit-log-table.tsx` — was using legacy
  10-state labels; now V2-aware
- `apps/app/src/features/audit/audit-event-drawer.tsx` — same
- `apps/app/src/features/evidence/EvidenceDrawerProvider.tsx` — audit
  timeline inside the evidence drawer; same

Audit log still preserves the raw status values in `beforeJson` /
`afterJson` payloads for forensic reconstruction.

### Gaps flagged

When a user picks "Filed" from a dropdown under V2, the UI writes
`status='done'`. For payment obligations, the row should write
`status='paid'` instead. Two ways to handle:

1. **UI-side fan-out**: when "Filed" is picked, infer from
   `row.paymentDueDate` / obligation type whether to write `done` or `paid`.
2. **Backend alias**: backend recognizes that V2 "Filed" maps to
   `done|paid` and writes the right one server-side.

Same issue applies to filtering: filtering "Filed" only matches `done`
rows, not `paid` rows. Need to be addressed when sub-status mutation
RPCs are built.

### Forward-action buttons per status

The drawer header now surfaces a primary forward button for every
mutable status — not just `done`/`paid`. New `ObligationDrawerStatusActions`
component:

| Status                                      | Primary button                           | Recovery button                     |
| ------------------------------------------- | ---------------------------------------- | ----------------------------------- |
| Pending                                     | Start preparation → review               | —                                   |
| Waiting on client                           | Mark docs received → review              | —                                   |
| Blocked                                     | Mark unblocked → review                  | —                                   |
| In review (in_progress / review / extended) | Mark filed → done                        | —                                   |
| Done / Paid                                 | Confirm authority acceptance → completed | Record authority rejection → review |
| Completed                                   | — (terminal)                             | —                                   |
| Not applicable                              | — (terminal)                             | —                                   |

### Drawer status pill is now interactive

Replaced the static `<span>` pill in the drawer header with
`ObligationQueueStatusControl` (same component the queue rows use).
Clicking the pill opens a dropdown of legal transitions; illegal
transitions render as disabled items with a tooltip.

### Action label rework

`Mark accepted` → `Confirm authority acceptance`. `Reject` →
`Record authority rejection`. Both labels now name the actor (the tax
authority) AND the action being recorded. Tooltip on each spells out
the consequence. Confirm popover label updated to "Confirm rejection"
for English correctness.

---

## 3 · Dates panel

Final shape after four iterations:

**YearStripTimeline (Direction B).** Horizontal strip plotting every
date on the row. Today is a vertical accent line (red when overdue),
the operational deadline is a large primary dot, other dates render
as small muted dots with hover tooltips. Same-day dots cluster into
one marker.

Bounds: NOT the tax period (which excludes lifecycle dates — filings
happen AFTER the period ends). Instead the strip is bounded by the
actual min/max of every date on the row + today, with a 30-day minimum
span and 10% padding. The strip now always frames the obligation's
lifecycle.

Cursor caption: relative-time descriptor ("36 days past due" / "5 days
until due" / "due today") sits below the today marker.

**FlatDateList.** Every date the row carries, always visible:

```
Internal due    Apr 15, 2026   (primary, red if overdue)
Statutory       Apr 15, 2026
Filing          Apr 15, 2026
Payment         May 15, 2026
Submitted       Apr 14, 2026   (only if set)
Accepted        Apr 16, 2026   (only if set)
Rejected        ─              (only if set)
Tax period      2026
Created         Apr 1, 2026
Last touched    May 14, 2026
```

Definition list with a `max-content` label column on the left and tight
tabular-num values on the right. Earlier iteration (Direction F) hid
dates per stage; that confused CPAs into thinking dates were missing.
Listing every date always reduces cognitive load.

---

## 4 · Queue list hygiene

### Default columns trimmed to 6

Visible by default: Select · Client · Form · Status · Internal Due · Owner.
Hidden by default (opt-in via Columns menu): Priority · State · County ·
Due date (exact) · Days · Evidence. The queue still SORTS by Smart
Priority — hiding the cell doesn't kill the sort signal, just removes
the visual clutter.

### Same-client cluster left rail

Every row reserves a 2px transparent left-rail slot. Rows in a multi-row
client cluster get `border-l-divider-regular` — continuous vertical mark
spanning the whole group. Reads as a single rail down the cluster,
stronger grouping cue than the blank-continuation-cell trick alone.

### Floating bulk-action bar

Detached from sticky-top (which jumped the table down 50px when first
row was checked) → `fixed bottom-10 left-1/2 -translate-x-1/2` with
shadow + subtle backdrop blur. Viewport-anchored, doesn't reflow the
table.

### Shift+click client name → range-select group

Holding Shift while clicking a client name selects every row sharing
that `clientId`. Unshifted clicks pass through to the row handler and
open the drawer. Range anchor is updated so the existing checkbox shift-
click range pattern still composes.

### Header + first-row backgrounds

Header `bg-background-subtle` was making it read as a tinted stripe.
First row was also tinted because `activeRow` fell back to `rows[0]`
even with no panel open. Introduced `explicitActiveRowId` — only set
when the URL has `row=<id>` — and the visual highlight keys off this,
not the keyboard-cursor fallback. Header background dropped entirely;
typographic weight separates header from data.

### "Show all" columns bug

Each `column.toggleVisibility(true)` call ran through
`onColumnVisibilityChange` with a stale closure of `columnVisibility`
— six toggle calls produced six separate URL writes that clobbered
each other. Replaced with one `setObligationQueueQuery({ hide: null })`
that atomically clears the hidden set.

---

## Files touched

- `apps/app/src/routes/obligations.tsx` — biggest delta; new components, refactors, mutations
- `apps/app/src/features/obligations/status-control.tsx` — V2 label map collapse
- `apps/app/src/features/audit/audit-log-table.tsx` — V2 labels
- `apps/app/src/features/audit/audit-event-drawer.tsx` — V2 labels
- `apps/app/src/features/evidence/EvidenceDrawerProvider.tsx` — V2 labels
- `apps/app/src/components/patterns/app-shell.tsx` — page width 1440px (earlier)

## Verification

- `pnpm -F @duedatehq/app exec tsc --noEmit` — clean
- `pnpm -F @duedatehq/app test run` — 255/255 pass across 46 files
- `pnpm check:fix` — formatter applied

## Follow-ups

- Build the four sub-status mutation RPCs so the toast placeholders flip
  to real mutations.
- Decide on the `done` vs `paid` disambiguation strategy for V2 "Filed"
  dropdown selection.
- Wire `open-blocker` task to actually route to the blocking obligation
  once the blocker UI is back.
- Consider extending the "Steps" pipeline pattern to In review (it has
  a real sub-status chain via prepStage + reviewStage).
- Audit log timestamp display under V2 should also collapse the legacy
  vocabulary in the change diff text (e.g., "Paid → Completed" → "Filed
  → Completed"). Today the label is V2-aware but the change-view text
  may still read the raw value in some paths.
