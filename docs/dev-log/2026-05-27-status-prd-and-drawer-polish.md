# 2026-05-27 · Status PRD + cross-surface drawer polish

## What shipped

Two threads landed in this commit: the canonical status PRD with a
shipped-vs-deferred audit, and a batch of UX polish on the obligation
drawer + status surfaces.

### Status work

- **Canonical PRD** at `docs/Design/status-changes-prd.md` — 17
  sections covering the 6 lifecycle states, sub-states, transition
  matrix, permission gates, surface contract, side effects,
  validation, cross-row dependencies, and a §0 implementation audit
  with ✅ / ⚠️ / 🟡 tags per claim.
- **Cycle detection on blocker assignment** in
  `updateObligationBlockedBy` — server walks the blocker chain
  (depth 32) and rejects assignments that would create A→B→A loops.
- **Auto-unblock context banner** on the Not Started stage card —
  reads the latest audit event and surfaces "Resumed from blocked
  on {date} after the upstream deadline was completed" so the
  assignee knows why the row moved.
- **`readiness.materials_received` audit companion event** fires on
  every `waiting_on_client → review` transition, in addition to the
  primary `obligation.status.updated` row.
- **Skip-ahead confirmation toast** — clicking "Skip ahead to
  drafting" from Not Started now requires explicit confirmation
  ("The audit trail will show no checklist items were ticked")
  before committing.
- **Coordinator read-only status dropdown** — `readOnly` prop on
  `ObligationQueueStatusControl` opens the menu with all items
  disabled and shows "Coordinators can view status but can't change
  it." Wired on both the `/deadlines` queue and the `/clients/[id]`
  filing plan.
- **Bulk transition error attribution** — server now names the
  failing row by client + tax type ("Bright Studio S-Corp · Form
  1120-S") instead of a raw UUID.

### Drawer polish

- Drawer header gets a status pill (icon + text) via
  `ObligationStatusReadBadge` so the state reads at a glance.
- Materials tab: title bigger (text-base), duplicate "13" chip on
  the heading dropped (Materials tab pill already shows count),
  italic description moved below the title, Outstanding/Archived
  subheaders use plain tertiary numbers (visually distinct from
  the rounded accent chip on the tab).
- Deadline tiles now render the days-overdue / payment-late label
  inline as a pill inside the tile — title and date stay neutral
  so only the pill carries the urgency.
- Compact-mode chips on the queue Status column when the drawer is
  open: payment-late becomes a gray `CircleDollarSign` icon,
  rejected becomes a red `X` icon, the status pill itself collapses
  to icon-only.
- Scope-tab strip stays sticky to the top of the drawer's scroll
  container; underline alignment fixed (all tabs forced to h-9 so
  the active tab doesn't sit 2px taller than the icon-only tabs).
- Authority response merged into the Completed card header (no
  separate green banner above).
- "Past deadline" banner in the Active Stage card toned down —
  border neutral, title text neutral, dropped the alert triangle.
- Tax type column widened to `min-w-[200px]` when the drawer is
  open so "Form 1120-S" stops wrapping to two lines.
- Selected row now uses `bg-state-accent-hover-alt` so it's
  visually distinct from the table header.

### Sundries

- Default tab on `/deadlines/{ref}` is now `summary` (was
  `readiness`). Bare-ref URL `/deadlines/000000000013` lands on
  Summary instead of Materials.
- Step1Intake dropzone + paste textarea heights matched at
  140/160px (both shorter so the wizard step fits more)
- CreateObligationDialog's "Don't see your client?" link now
  left-aligned via dropping `w-fit`.
- "File the workpapers in the archive" no-op task removed from
  the Completed stage card.

### What's deliberately deferred (in PRD §0.3)

Concurrency guard (`STALE_WRITE`), optimistic UI rollback, sub-state
RPC pipelines, e-file watcher (external vendor), PostHog analytics
wiring, `firm.autoUnblockChildren` opt-out flag, Restore-from-
Completed admin path, `relatedObligationId` schema + UI. Each is
estimated at 0.5–2 engineer-day slices and called out individually
in the PRD with rationale.

## Test plan

- Coordinator role: queue status dropdown opens but every option is
  disabled with the banner copy; `/clients/[id]` filing plan
  matches.
- Preparer role: Skip ahead to drafting → toast confirm; click
  "Skip to drafting" → row flips to In review with audit event.
- Set `A.blockedBy=B`, `B.blockedBy=A` → server rejects with
  "Cannot create a cycle".
- Mark a parent K-1 Completed → children flip to Not Started + the
  Not Started card shows the auto-unblock context banner.
- Open `/deadlines/{ref}` (no tab segment) → Summary loads, not
  Materials.
- Tab strip stays pinned while scrolling the drawer body.
