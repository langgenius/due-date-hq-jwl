# Engineering brief — Workflow status v1 + v2 ship plan

**Date:** 2026-06-09
**Audience:** Implementation
**Companion docs:** `docs/product-design/deadlines/eng-brief-2026-06-09-status-bus-and-integrations.md`, `docs/product-design/deadlines/active-card-states-spec-2026-06-09.md`, `docs/product-design/deadlines/position-2026-06-09-milestone-strip.md`, `docs/product-design/deadlines/eng-brief-2026-06-09-record-tab-storage-gap.md`

## User direction

Ship **v1 and v2 all** (no trimming on the core feature set), with these scenarios explicitly cut per 2026-06-09 direction: snoozed state, concurrent edit banner, audit bundle generating state, permission variants (read-only viewer / partner role / reassignment in flight).

## Scope summary

| Phase    | What                                                                                               | Sprint weeks |
| -------- | -------------------------------------------------------------------------------------------------- | ------------ |
| **v1.0** | Status bus foundation + 6 stage variants + 6 P0 integration surfaces + 4 ship-blocking edge states | 5            |
| **v1.5** | Action stack expansion + 8 P1 derivation surfaces                                                  | 2            |
| **v2**   | 2 P2 surfaces + time-in-stage analytics + notifications digest + e-signature                       | 4            |

Total: **11 sprint weeks for a 2-engineer team**. Add 1 backend engineer for the storage primitive + bulk mutations and it drops to ~7.

## v1.0 — Foundation + happy paths + P0 (weeks 1–5)

### Week 1: Status bus foundation

1. `useObligationStatus(id)` hook with TanStack Query subscription key `obligation:{id}:status`
2. `<ObligationStatusBadge id, variant?>` with 4 variants (pill, dot, mini-stripe, segment)
3. `useUpdateObligationStatus()` mutation wrapper with `source` field
4. Event emitter on server: `status.changed{id, from, to, at}` to Redis pub-sub
5. Client SSE/poll layer relaying events (poll-only acceptable; SSE deferred)
6. Migrate existing status displays to use the new badge — no visible changes

### Weeks 2-3: 6 stage variant builds

Build each per `docs/product-design/deadlines/active-card-states-spec-2026-06-09.md` per-state content matrix:

1. Not started — `Start preparing` primary CTA
2. Waiting on client — `Send reminder` primary CTA (MWhnh design locked)
3. Blocked — `Resolve blocker` primary CTA (destructive)
4. In review — `Approve & file` primary CTA (composite mutation)
5. Filed — `Mark complete on ACK` primary CTA (manual until webhook)
6. Completed — `Open record` primary CTA (navigation only)

All 6 share the same shell. Content swaps per state. Primary CTA only in v1; ActionStack ghosts deferred to v1.5.

### Week 4: 4 edge states (ship-blocking)

- **Empty state** (new obligation, nothing tracked yet) — muted shell + "Start preparing" only
- **Loading state** (subscription warming) — skeleton placeholders + spinner
- **Error state** (mutation failed) — destructive pill + error code chip + `Retry` button
- **Rejected-and-reverted** (Filed→In review unwind via IRS webhook) — destructive pill + auto-revert message + `Fix and resubmit` CTA

### Week 5: 6 P0 cross-page surfaces (the daily loops)

From the propagation eng brief:

1. `/alerts/[id]` Affects-status band (DERIVE) — banner showing predicted transitions
2. `/alerts/[id]` Linked-deadline row pill (READ) — `<ObligationStatusBadge>` per row
3. `/alerts/[id]` Resolve action (WRITE) — fires multi-obligation transitions
4. `/today` Stage heatmap drill-through (DERIVE+READ) — 6 clickable bars
5. `/today` "Needs you" hero strip (DERIVE) — count + click-through
6. `/deadlines` Filter-bar aggregate stripe (DERIVE) — 6-pill distribution band

**v1.0 gate**: Partners complete the alert-resolve → status-propagate loop without scrolling between pages. Time-to-action measurably reduced.

## v1.5 — Action expansion + P1 (weeks 6–7)

### Week 6: Action stack expansion

- Add Ghost CTAs to each stage's ActionStack (e.g. `Mark received`, `Open Materials`, `More` kebab)
- The kebab `⋯ More` menu houses rare admin overrides (manual status change, rollback) per `feedback_status_is_observed_not_chosen`

### Week 7: 8 P1 derivation surfaces

1. `/deadlines` row mini-stripe column (READ)
2. `/deadlines/[id]` tab badges (DERIVE) — per-tab subtitle + count
3. `/clients/[id]` split-blocked rollup (DERIVE) — needs `/clients/[id]` page first
4. `/clients/[id]` churn-risk chip (DERIVE)
5. `/opportunities` closed-deadline suppression (DERIVE) — default filter
6. `/audit-log` status-transition facet (READ)
7. `/audit-log` stage timeline modal (DERIVE) — virtualized vertical timeline per obligation
8. `/deadlines/[id]` auto-unblock banner (DERIVE) — already exists, verify subscription wired

**v1.5 gate**: Sidebar shows accurate counts. All P1 surfaces subscribe to the status bus and re-render on `status.changed`.

## Scope explicitly cut from v1.5 (per user direction 2026-06-09)

These were considered but removed:

- ~~Snoozed state~~ — defer
- ~~Concurrent edit banner~~ — defer
- ~~Audit bundle generating state~~ — defer
- ~~Read-only viewer variant~~ — defer
- ~~Partner role variant~~ — defer
- ~~Reassignment in flight variant~~ — defer

These are real product needs but not v1.5 ship-blockers. If a multi-user firm hits a concurrent-edit conflict in production before these ship, the backend's last-write-wins behavior will apply silently — acceptable for early users, will revisit if support escalations rise.

## v2 — Analytics + notifications + e-signature (weeks 9–12)

### Week 9: 2 P2 surfaces + sidebar dots

1. Sidebar Deadlines "needs you" red dot (DERIVE) — same query as `/today` Needs you
2. Sidebar Alerts red dot (DERIVE) — unresolved alerts touching my deadlines
3. Verify `/deadlines/[id]` Hero status pill subscribes via `useObligationStatus` (sanity)
4. Verify `/deadlines/[id]` workflow card primary CTAs route through `useUpdateObligationStatus` (sanity)

### Week 10: Time-in-stage analytics

- Compute from `auditEvents.filter(event.type === 'status.changed')` per obligation
- New endpoint `obligations.timeInStageAnalytics({ obligationTypeId?, slice: 'avg' | 'p50' | 'p95' })`
- New surface: `/audit-log` or `/reports` page with time-in-stage chart per stage per obligation type
- Render comparison vs industry benchmark (firm setting, default 14d for waiting-on-client)

### Week 11: Notifications + digest

- Server-side: weekly cron `obligations.weeklyDigest()` aggregates `status.changed` events per user
- Email rendering using the `reference_transition_row_pattern` row anatomy
- Each row: ASCII arrow + mono enum + source chip + audit shield, like bqUOC
- Optional Slack integration: post compact transition cards to firm-wide channel on critical transitions (Blocked, IRS rejection, Completed)
- Firm setting: notification channels, frequency, severity threshold

### Week 12: E-signature workstream (separate decision)

- Required by In review stage's `Send to client for signature` ghost
- Vendor decision: DocuSign vs Adobe Sign vs internal
- Webhook for signed-status updates
- PDF rendering of completed signature
- Integration: signed 8879 → auto-route to e-file submission

**v2 gate**: Time-in-stage analytics show "your 1040s spend 14 days in Waiting on client; benchmark is 9 — here are 12 that exceeded 21 days." Firms can act on the data.

## What this brief includes (full coverage)

### 10 active card variants

- 6 stage happy paths (v1.0)
- Empty, Loading, Error, Rejected-and-reverted (v1.0)

### 18 cross-page integration surfaces

- 6 P0 (v1.0)
- 8 P1 (v1.5)
- 2 P2 + 2 sanity (v2)

### Plus

- Status bus foundation (v1.0 week 1)
- Time-in-stage analytics (v2 week 10)
- Notifications digest + Slack (v2 week 11)
- E-signature integration (v2 week 12)

## What this brief does NOT cover

- File storage primitive (covered in `docs/product-design/deadlines/eng-brief-2026-06-09-record-tab-storage-gap.md`) — required prerequisite for `/Record tab` work + Filed state's `View e-file receipt` ghost
- Status taxonomy 10→6 migration — required prerequisite per `project_status_taxonomy`
- Tab structure changes — locked at 4 per `project_tab_count_locked`
- Penalty engine — out of scope; documented in `docs/product-design/deadlines/eng-brief-2026-06-09-deadline-detail-tabs.md`

## New mutations engineering must ship across v1+v2

Listed in priority order:

1. `useUpdateObligationStatus()` client wrapper (v1.0)
2. `markAllReceivedForObligation(obligationId)` bulk mutation (v1.5 for Mark received ghost on Waiting on client)
3. `markWaivedForObligation(obligationId)` (v1.5 for Mark waived ghost on Blocked)
4. `obligations.timeInStageAnalytics()` endpoint (v2)
5. `obligations.weeklyDigest()` cron (v2)
6. IRS ACK webhook receiver (v2 — auto-completes Filed → Completed)
7. IRS submission ID storage (`efileSubmissionId` field, v2 — needed for Filed sub copy)
8. E-signature integration mutation surface (v2 — TBD on vendor)

### Added 2026-06-09 from deadline-flow validity audit (round 2)

9. **`obligation.efile.rejected` event payload** — confirm `afterJson.rejectionCode` + `reason` land in `audit_event` so the rejection event row on the Audit tab (e.g. `ERR-0507`) renders honestly. 1-line schema confirmation, then expose the fields on `AuditEventPublic`. Without this, the rejection-event UI references payload shapes not contractually guaranteed.
10. **`obligations.remindMaterials(obligationId, materialIds?)` mutation + `reminder_log` table** — only required if the `Send reminder` ghost ever returns to the active card post-v1.5. Today the closest mutation is `readiness.sendRequest` (initial request) and `remindSignature` (8879 only). A first-class client-portal reminder for outstanding materials would need its own mutation + audit row + per-firm cadence setting. **Status**: deferred unless product re-prioritizes; in the meantime the Pencil active card omits the affordance.
11. **`obligations.aggregations({groupBy?, metric})` list-level endpoint** — required for any aggregate metric like `avg days outstanding` or `median time-in-stage by obligation type` that appears on `/deadlines` list footer or `/today` summary. Currently no list-level aggregation exists; counts are individual `obligations.list().filter().length`. Estimate: ~1 backend day per metric. **Status**: gated on first surface that needs it; Pencil designs currently avoid aggregate metrics on `/deadlines` list per the validity audit.

## How to read this with the other briefs

| For                                                   | Read                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **High-level architecture**                           | This brief (you're here)                                                            |
| **Status bus + cross-page propagation contract**      | `docs/product-design/deadlines/eng-brief-2026-06-09-status-bus-and-integrations.md` |
| **Per-stage UI content + backend wiring**             | `docs/product-design/deadlines/active-card-states-spec-2026-06-09.md`               |
| **Why the strip should be compact + integration map** | `docs/product-design/deadlines/position-2026-06-09-milestone-strip.md`              |
| **Record tab storage gap + new mutations needed**     | `docs/product-design/deadlines/eng-brief-2026-06-09-record-tab-storage-gap.md`      |
| **Tab structure constraint**                          | `project_tab_count_locked` memory                                                   |
| **Status-is-observed-not-chosen design principle**    | `feedback_status_is_observed_not_chosen` memory                                     |
| **Transition row pattern (audit/activity UI)**        | `reference_transition_row_pattern` memory                                           |

## Sprint-by-sprint commitment

| Sprint | Deliverable                                          | Demo at end                                                                                                                      |
| ------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1      | Status bus + ObligationStatusBadge                   | "Nothing visible changes; everything subscribes"                                                                                 |
| 2-3    | 6 stage happy paths                                  | "Open any deadline — see its current stage card render correctly"                                                                |
| 4      | 4 ship-blocking edge states                          | "Try to break it (empty, loading, error, rejection) — UI handles each"                                                           |
| 5      | 6 P0 integration surfaces                            | "Resolve an alert → 5 deadlines transition → /today heatmap recounts → /deadlines list re-distributes — all without page reload" |
| 6      | Action stack expansion                               | "Each stage shows primary CTA + 2 ghost CTAs + kebab. Kebab houses admin overrides."                                             |
| 7      | 8 P1 surfaces                                        | "Row mini-stripes, tab badges, opportunity suppression, audit facet — all wired"                                                 |
| 8      | 2 P2 + sanity check                                  | "Sidebar dots accurate, all primitives subscribing correctly"                                                                    |
| 9      | Time-in-stage analytics                              | "Show partners the chart, identify outliers"                                                                                     |
| 10     | Notifications + digest                               | "Weekly email lands, Slack cards posted for critical transitions"                                                                |
| 11     | E-signature integration (subject to vendor decision) | "Send 8879 to client portal → signature webhook → auto-advance"                                                                  |

## Why we're shipping this set (and what's cut)

The cut list is intentional — these are real product needs but not v1.5 ship-blockers:

- Snoozed state: backend's `snoozedUntil` exists; defer the UI
- Concurrent edit banner: backend is last-write-wins; will revisit if support escalates
- Audit bundle generating state: synchronous generation is fast enough for now
- Permission variants (viewer / partner / reassignment): all roles see the same UI; backend enforces actual permissions on mutation. UI sharpening defers to v1.5+

Total **11 sprint weeks** delivers: the daily-loop product partners use, the cross-page reactivity that makes monitoring real, and the analytics + notifications that make status changes visible outside the app.

v1 + v2 is the actually-shippable surface. Half-shipping is worse than shipping in full.

## End of brief

This is the ship plan. Engineering can read top-to-bottom and execute. Each sprint has a demo gate; if any gate fails, fix before moving on. Total cost: ~6 engineer-months. Defensibility unlocked: the product's tracking + monitoring promise becomes true across the whole app, not just on one card.
