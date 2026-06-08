# 2026-06-08 — /deadlines detail: top actions (Assign/Snooze/Mark-as-filed), chip row, Extension card

Pencil design `HuYeb` (图3) parity for the deadline detail panel
(`ObligationQueueDetailDrawer`, rendered via `ObligationPanelDispatcher` on the
`/deadlines` route). Three header/tab segments, plus the two new backend
capabilities the top actions need.

## What shipped

### Backend — per-deadline assignee + snooze (new)

The mockup's **Assign** and **Snooze** top actions had no backend. Assignment
lived only on the client (`client.assignee_id`); there was no obligation-level
assignee and no snooze concept at all. Per Yuqi's call, both are now real,
per-deadline, audited mutations.

- **DB** (`packages/db/migrations/0069_obligation_assignee_snooze.sql`,
  `schema/obligations.ts`): two nullable columns on `obligation_instance` —
  `assignee_id` (FK `user.id`, `ON DELETE SET NULL`) and `snoozed_until`
  (timestamp). `assignee_id` **overrides** the client-level assignee; NULL
  inherits the client default. Applied to local D1 via `pnpm db:migrate:local`.
- **Contracts** (`packages/contracts`): `obligations.assign` +
  `obligations.snooze` procedures (reuse the status-update output shape);
  `assigneeId` + `snoozedUntil` on `ObligationInstancePublicSchema` (and so on
  `ObligationQueueRow`); audit actions `obligation.assignee.updated`,
  `obligation.snooze.set`, `obligation.snooze.cleared`. `assignee_id` uses
  `TenantIdSchema` (text), not `EntityIdSchema` (uuid) — `user.id` is a text id.
- **Service / repo** (`obligations/_service.ts`, `repo/obligations.ts`):
  `assignObligation` / `snoozeObligation` follow the read-before → write →
  read-after → audit invariant; repo setters `setAssignee` / `setSnoozedUntil`.
- **Resolver** (`repo/obligation-queue.ts`): the row's `assigneeName` now
  resolves the obligation-level assignee's display name (batched `loadUserNames`)
  and wins over `client.assigneeName`; `assigneeId` + `snoozedUntil` are
  threaded through the raw query → list-row type → server `toRow`.
- **List filter**: snoozed deadlines drop out of the default queue until the
  snooze instant passes. Deep-links (`listByIds`) are unaffected, so a snoozed
  row can still be opened directly.

Verified end-to-end against local D1: assign → 200 + persisted + audit;
snooze → 200 + hidden from list + audit; un-snooze → row reappears.

### Segment 1 — top actions

`DeadlineTopActions`: **Assign** (assignee-picker dropdown over
`members.listAssignable`, + Clear assignee), **Snooze** (relative presets:
tomorrow / 3 days / next week / 2 weeks, + Un-snooze), **Mark as filed**
(`changeStatus → 'done'`, disabled on terminal states). The header corner
cluster collapsed to the close X only; the deep-link copy stays in the footer.

### Segment 2 — chip row

Form title now sits on its own line. One chip row below it: a clickable
**client-household chip** (`UsersIcon` + client name, navigates to the client —
folds in the old standalone kicker link), the canonical
`ObligationStatusReadBadge` (subsumes the old waiting/blocked flag chips), the
input-requested flag, and the jurisdiction / tax-year / period meta. Date cards
unchanged (already matched the design).

### Segment 3 — Extension tab

Replaced the flat `DetailRow` list with a **rule card**: form name + "automatic
extension of time to file", authority · version citation line, an "Open rule"
link, the amber *defers-filing-not-payment* warning (with the estimated-tax
amount), a POLICY / FORM / LENGTH / ORIGINAL / EXTENDED / PAYMENT-STILL-DUE
facts grid, and RULE NOTES. Below it an **Apply extension** card (heading +
intent copy, internal-target + source + decision-memo fields wired to the
existing `decideExtension` mutation, the payment callout, and Cancel / File
extension actions). Form-code-aware: a 1040 correctly shows Form 4868, not the
mockup's 1065/7004. Existing extension-history table preserved.

## Verify

- Document never scrolls horizontally (`docHScroll = 0`) in panel open + closed.
- assign/snooze/mark-as-filed exercised against the running worktree server.
- `pnpm check` clean (format + lint + typecheck).

## Notes / follow-ups

- The `table-container` has internal horizontal scroll (~159px) when the panel
  is open at narrower widths — **pre-existing** route-layout behavior
  (`obligations.tsx`), not touched here; the page itself does not scroll.
- The mockup's Apply-extension fields (Filing channel "IRS MEF", Reason code
  "09") are illustrative and have no backend; the form keeps the real
  `decideExtension` inputs (internal target + memo required).
