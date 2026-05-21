# Design brief: Obligation status lifecycle (6 states + milestone notes)

> Produced by the `/shape` skill on 2026-05-19. Locks the design direction for the migration from today's 8-state enum to a 6-state queue model with per-state milestone notes. Hand off to `/impeccable craft` or implement directly.

**Anchor docs**

- Status taxonomy (memory): `~/.claude/projects/-Users-yuqi-dev-due-date-hq-jwl/memory/project_status_taxonomy.md`
- Product model (memory): `~/.claude/projects/-Users-yuqi-dev-due-date-hq-jwl/memory/project_product_model.md`
- Canonical schema today: [packages/contracts/src/shared/enums.ts:55-64](../../packages/contracts/src/shared/enums.ts)
- Canonical PDF: `/Users/yuqi/Desktop/desktop/DueDateHQ_dashboard/files/美国小型会计事务所报税种类、流程与规则产品指南.pdf`

## 1. Feature summary

Migrate the 8-state obligation status enum (`pending, in_progress, done, extended, paid, waiting_on_client, review, not_applicable`) to a 6-state queue model (`not_started, waiting_on_client, blocked, in_review, filed, completed`) plus per-state milestone notes. The queue becomes scannable at a glance — one of six states tells you exactly what's happening. The human nuance moves into a timeline of notes inside each obligation's drawer. This unblocks the product's "Filed ≠ Done" invariant and the K-1 dependency graph, both of which the current model can't express.

## 2. Primary user action

**A preparer or manager opens the Obligations queue and triages by status in under 10 seconds.** Every state change writes an audit row and a milestone note in the same call so the trail stays trustworthy (the current Obligations header tagline already promises this).

## 3. Design direction

Operational, calm, audit-trustworthy. Status is a tool, not a personality. Pills use the existing chip pattern — small, low-contrast tone, no animation. The timeline tab is **denser than a notification feed, lighter than a Gantt** — read like a git log: timestamp · author · state · note. No emoji, no progress bars. The queue stays "spreadsheet-fast"; the drawer is where the human story lives.

## 4. Layout strategy

**Queue surface (Obligations page):** add `Status` as a sortable column between `Tax Type` and `Due Date`. Keep the filter chips (`This week / Needs input / Needs evidence`) — they're orthogonal scopes, not status filters. Add status chips that match the 6 states as a secondary filter row when the user clicks the new "Status" sort header.

**Detail drawer (existing right-side panel):** the current `Evidence` tab is promoted to a **Timeline** tab and becomes the second tab after the summary. Timeline renders the 6 milestones vertically, current state highlighted, with notes hanging off each milestone in reverse-chronological order. Evidence files attach inline to the milestone where they were uploaded (e.g. W-2 file appears under `waiting_on_client`). System notes (auto-generated) and human notes interleave but are visually distinguished — system uses mono font, muted; human uses sans, default.

**Dashboard:** keep the existing `Status` column. The 6 states are simpler than today's 8, so labels become more predictable.

## 5. Key states

| State                 | What the user needs to see + feel                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `not_started`         | Neutral. "Nothing has happened yet." Slate/gray chip. No urgency cue from status alone — urgency comes from `Days` and `Legacy penalty estimate`.      |
| `waiting_on_client`   | Amber-tinted, suggesting external dependency. Drawer should surface "asked on X, last nudged Y."                                                       |
| `blocked`             | Red-tinted but not alarming. Cell shows `Blocked · #parent-1065` with the parent obligation as an inline link. Hover surfaces the parent's own status. |
| `in_review`           | Indigo/blue-tinted, suggesting internal work. Drawer surfaces the reviewer assignment.                                                                 |
| `filed`               | Green-tinted but pending. Subtle "awaiting acceptance" eyebrow. Distinct from `completed`.                                                             |
| `completed`           | Solid green, terminal. Row stays in the queue but de-emphasized (lower contrast). Filtered out by default after 30 days.                               |
| `rejected` (sub-flag) | Not a state. Red `Rejected` chip appears on a row that reverted from `filed` to `in_review`. The rejection reason is the most recent milestone note.   |

**Loading:** queue uses the existing skeleton rows. Drawer shows last-known status while fetching timeline.

**Empty (milestone notes):** `not_started` with no notes shows "No activity yet. The first transition will log a note here." Calm, not pushy.

**Error:** transition failure (e.g. server rejects an illegal state change like `filed → not_started`) shows an inline error in the drawer header, not a toast. Status doesn't change visually until confirmed.

**Edge cases:**

- Rejection unwinds `filed → in_review` and adds a `Rejected` chip.
- Parent completion auto-unblocks children (flip from `blocked` to `not_started` + system note `Unblocked by parent #X on YYYY-MM-DD`).
- `not_applicable` rows are hidden from the queue by default; surfaced only via an explicit filter toggle.

## 6. Interaction model

**Manual transitions (hybrid baseline):** status column cell is a dropdown. Clicking opens a popover with the 6 states + an optional reason field. Submit creates a milestone note automatically: `<author> set status to <state> · <optional reason>`. Empty reason is fine — the transition itself is the note.

**Auto-transitions (hybrid event layer):** four events flip status without user click, each writing a system milestone note:

1. Readiness checklist enters "K-1 missing from #N" → status flips to `blocked` with `blocked_by` pointer.
2. E-file submission event lands → status flips to `filed`.
3. Acceptance event (manually confirmed for v1) → status flips to `completed`.
4. Parent obligation completes → children flip from `blocked` to `not_started`.

User can override an auto-transition the same way as a manual one — the override writes its own note explaining the override.

**Bulk operations:** existing bulk-select gets a status changer. Constrained transitions only (can't bulk-move 50 rows to `completed` unless all 50 are `filed`). Mismatched rows in a bulk operation show a per-row error and are skipped.

**Keyboard:** status dropdown opens with `S` when a row is focused. Number keys `1-6` pick the state in display order. `Esc` cancels.

## 7. Content requirements

**Status pill labels (UI, sentence case):**
`Not started · Waiting on client · Blocked · In review · Filed · Completed`

**Milestone note formats:**

- Human note: `<author> · <relative time> · <free text>`
- System note: `<system> · <relative time> · <event description>` in muted mono
- Rejection note: `IRS · <date> · Rejected — <reason from preparer>` in red

**Microcopy for transitions:**

- Manual transition popover header: `Update status`
- Reason placeholder: `Why? (optional — written to the audit trail)`
- Bulk error: `<N> rows skipped — illegal status transition`
- Unblock auto-note: `Unblocked by parent <#obligation-id> · <YYYY-MM-DD>`

**Empty state:** `No activity yet. The first transition will log a note here.`

**Extension migration banner** (one-time, for `extended` rows post-migration): small inline chip on the row: `Migrated from extended status — review original date`. Hover shows the pre-extension status and the audit-log entry that recorded the extension.

## 8. Recommended references

- `interaction-design.md` for the dropdown + popover transition flow and the bulk-select constraint UI.
- `spatial-design.md` for the Timeline tab's vertical rhythm (milestones as anchors, notes as branches).
- `motion-design.md` only sparingly — status pill color crossfade on transition (~120ms), no skeuomorphic motion.
- The existing app's chip + drawer pattern (see Obligations queue, Radar alert cards) — match these directly.

## 9. Open questions for implementation

1. **Per-state role permissions.** Who can move `in_review → filed`? Recommendation: preparer can, but the audit note flags it if a preparer self-promotes their own work without a manager review. Confirm.
2. **`completed` retention in queue.** Proposed: de-emphasized, filtered out after 30 days. How configurable — per-firm setting or global?
3. **Bulk legal transitions table.** Assumed: only `→ same-or-forward state, no backward bulk`. Need an explicit matrix (which row-state → which target-state is legal in bulk).
4. **Visual encoding of `rejected` sub-flag.** Red chip is decided; does the chip also appear on the Dashboard's status column, or only in Obligations + drawer?
5. **Acceptance confirmation surface.** v1 is manual — should the "Mark accepted" affordance live in the drawer header (primary CTA when status is `filed`) or in the status dropdown alongside other transitions?
6. **Migration plan for the four legacy statuses** (`pending → not_started`, `in_progress → split`, `done → completed`, `extended → audit-log replay`): one-time script vs lazy migrate on read?

## 10. Decision log (from the discovery interview, 2026-05-19)

| Question                           | Decision                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `in_progress` split mechanism      | Hybrid — manual dropdown is baseline; four events auto-transition (readiness flag, e-file submission, acceptance, parent completion) |
| Fate of `paid`                     | Fold into `completed`; `obligation_type='payment'` differentiates. One state machine for all types                                   |
| `filed → completed` trigger        | Manual confirmation only for v1. Webhook integrations out of scope                                                                   |
| Status column on Obligations queue | Add as a sortable column between Tax Type and Due Date. Filter chips remain orthogonal                                               |
| Milestone notes location           | Drawer Evidence tab → promote to a Timeline tab; one surface                                                                         |
| Auto-unblock when parent completes | Child flips from `blocked → not_started` + system note                                                                               |
| Rejection UI                       | Status reverts `filed → in_review`; red `Rejected` chip on the row                                                                   |
| `extended` migration target        | Replay each row's pre-extension state from the audit log                                                                             |
