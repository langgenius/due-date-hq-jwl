# Roadmap — Deadlines workstreams, 2026-06-09

Snapshot of the 4 concurrent workstreams on `/deadlines`, what's done, what's queued, and the dependencies between them. Companion to `_eng-brief-2026-06-09-deadline-detail-tabs.md` and `_spec-cluster2-detail-tabs.md`.

## TL;DR

Four workstreams, currently entangled. The right order is taxonomy → list-page parity → detail-tab data → net-new tabs. The 18-item additions sit on top once primitives + data + parity are stable.

| #   | Workstream                                                                                         | State                                                                   | Owner                               | Ready?                                    |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------- |
| 1   | Status taxonomy 10 → 6                                                                             | Mid-flight (10 values in enum; 2 already added)                         | Backend                             | Spec'd, not started in code               |
| 2   | HuYeb list-page parity                                                                             | In progress on branch `design/deadlines-design-parity`                  | Yuqi worktree                       | 9 commits done, ~8 items left per HANDOFF |
| 3   | Detail-tab data (5 `TODO(data)`)                                                                   | Spec'd, not started                                                     | Backend + Frontend                  | Spec ready in `_eng-brief-2026-06-09`     |
| 4   | Risk **section** on Summary + Audit **section** on Evidence (NOT separate tabs — 4-tab model wins) | Pencil section refs `s0YOE` (Risk) + `K4Go6X` (Audit); code not started | Frontend + Backend (penalty engine) | Visual + engineering brief ready          |

Plus three queued-but-not-blocked extras:

| #   | Item                             | State                                                      | Ready? |
| --- | -------------------------------- | ---------------------------------------------------------- | ------ |
| 5   | Quick filters dropdown           | Spec'd in memory (`reference_quick_filters_spec`)          | Yes    |
| 6   | 18-item tab additions (S1–V5)    | Spec'd in memory (`reference_deadline_tab_additions_spec`) | Yes    |
| 7   | 6 reusable components extraction | Spec'd in `_spec-cluster2-detail-tabs.md`                  | Yes    |

## Workstream 1 · Status taxonomy 10 → 6

**Current state:** `ObligationStatusSchema` in `packages/contracts/src/shared/enums.ts` has 10 values. Two (`blocked`, `completed`) were added for the migration; the original 8 are still active.

**Target:** 6 states — `not_started · waiting_on_client · blocked · in_review · filed · completed`

**Migration:**

- ADD: `not_started`, `in_review`, `filed`
- REMOVE: `pending`, `in_progress`, `done`, `extended`, `paid`, `review`, `not_applicable`
- KEEP: `waiting_on_client`, `blocked`, `completed`

**Blast radius:** 53 files import `ObligationStatus`. Most are display/filter (low effort); ~5 carry state-machine logic (`status-control.tsx`, `use-lifecycle-v2.ts`, `Path*` panels, audit-event recording).

**Dependencies:** Foundation. Workstreams 3 + 4 should not implement against the 10-state model — build against the 6-state model with a translation shim while DB still carries old values.

**Effort:** Backend L (migration plan + data rewrites) + Frontend M (53 imports, but most are mechanical). Total: 1.5 sprint weeks.

**Reference:** `docs/Design/obligation-lifecycle-design-brief.md` (locked direction; produced 2026-05-19 by `/shape`). Memory: `project_status_taxonomy`.

---

## Workstream 2 · HuYeb list-page parity

**Current state:** Active on branch `design/deadlines-design-parity` (worktree at `/Users/yuqi/dev/ddhq-deadlines-parity`). 9 commits in. Handoff doc at `docs/dev-log/2026-06-08-deadlines-parity-HANDOFF.md`.

**Done (9 commits):**

- Exposure column (backend un-omit + resolver wire)
- Group-by Urgency
- Table no horizontal scroll
- Panel-open layout fix
- Rounded bordered table card
- `#f2f2f2` 3-col background (detail state)
- Detail title full form name
- Detail status line in header
- Per-deadline assign / snooze actions

**Still to do (per HANDOFF, list page only):**

- Top eyebrow `Synced just now · N tracked · ≈Nh focus`
- 14-day forecast band
- All / **Active** / Filed 3-tab grouping (currently 7 status tabs)
- "From Pulse" / rollover source chip below client name
- Tax column added
- State double-badge (IRS/FinCEN + state code)
- Exposure penalty subline (`≈$X penalty`)
- Default OVERDUE grouped band with `≈12D avg · ≈$N penalty exposure` summary

**Done in Pencil but not yet implemented:**

- Mono dates on all date columns
- `flame` icon + Geist 500 "X days late" treatment
- Jurisdiction badge `cornerRadius:6`
- StatusTabs pill conversion (no bottom border)
- Status pill warning palette (per state)
- Row-1 not faking "selected" with accent bar
- OVERDUE band rebalance (no penalty mention, no destructive caps)

**Dependencies:** Some items (status pills) depend on Workstream 1. Most can ship independently.

**Effort:** Frontend M, mostly Tailwind + component swaps. ~1 sprint week.

**Reference:** Pencil frame `HuYeb`. Worktree HANDOFF doc. Memory: `project_deadlines_design_parity`.

---

## Workstream 3 · Detail-tab data (5 `TODO(data)`)

**Current state:** 5 `TODO(data)` markers in `ObligationQueueDetailDrawer.tsx`. UI shows placeholders.

**Markers:**

- L2140 — Summary: Expected refund
- L2185 — Summary: Source-document attachments
- L3366 — Extension: Prior-year extension/filing history
- L3653 + L3684 — Evidence: Prior-year filing date

**Contract additions (from `_eng-brief-2026-06-09`):**

- `obligation.expectedRefund: { totalCents, reconciledAt, components: [...] }`
- `obligation.sourceDocs[]: { id, filename, sizeBytes, contentType, uploadedAt, uploaderId, downloadUrl, thumbnailUrl? }`
- `obligation.priorYearObligations[]: { taxYear, obligationId, extensionFiled, extensionForm, filedAt, daysLateOrEarly, penaltyPaidCents, reviewerId }`

**Dependencies:** None — these are pure contract additions. Can parallelize across 2 backend engineers.

**Effort:** Backend M (1 migration, 3 derived views), Frontend S (each consumer ≤2h). Total: 1 sprint week with a backend pair.

**Reference:** `_eng-brief-2026-06-09-deadline-detail-tabs.md` Item 1.

---

## Workstream 4 · Risk fold + Extension widget + Audit as own tab (4-tab model)

**2026-06-09 update (rev 2, final):** Tab count finalized at **4** — Status · Materials · Record · Audit. The 3-tab attempt folded Audit into Record but the content was too substantial; Audit gets its own tab. Risk + Extension still fold:

- Risk → `Penalty exposure` card on Status
- Extension → conditional `Extension status` widget on Status (only when in-window or filed)
- Audit → own tab (NOT folded)

**Current state:** Pencil references complete — `s0YOE` (Risk section), `VZlY8` body (Extension widget reference), `K4Go6X` (Audit tab content, full page). Engineering brief written. No code.

**Schema delta** required in `obligation-type.ts` + contracts:

- `DEFAULT_TABS`: 6 → **4**: `['status', 'materials', 'record', 'audit']`
- `ObligationQueueDetailTab` enum: same delta
- `TABS_BY_TYPE` map: collapse all 6 type variants to use 4-tab vocabulary
- URL redirects: `?tab=summary` → `?tab=status`, `?tab=readiness` → `?tab=materials`, `?tab=evidence` → `?tab=record`, `?tab=extension` → `?tab=status&section=extension`, `?tab=risk` → `?tab=status&section=risk`, `?tab=audit` → `?tab=audit` (own tab, no redirect)

**Risk tab requires:**

- Penalty engine new at `packages/core/src/penalty/` (does not exist)
- `obligationRisk` model: `penaltyToday/At30d/At60d` + statutory breakdown (`§6651`) + mitigation + audit-risk score + payment-method costs

**Audit tab requires:**

- `listAuditEvents(obligationId, filters)` endpoint (current model sends all events)
- Event-type categorization migration: enum `STATUS_CHANGE | ASSIGNMENT | DOCUMENT | COMMUNICATION | SYSTEM | EXTERNAL_RESPONSE | REVIEW_TRANSITION | PAYMENT`
- Permalink IDs exposed on events
- PDF export job pipeline: `packages/pdf/audit-bundle/`
- Cryptographic seal (SHA-256 of payloads + firm key signature)
- Permission gate: View = anyone; Export = `partner` / `compliance_officer` only

**Dependencies:** Workstream 1 (build against 6-state taxonomy, not 10-state).

**Effort:**

- Risk: Backend L (penalty engine + audit-risk scaffold) + Frontend M. 2–3 sprint weeks.
- Audit: Backend M (filter endpoint + bundle generation) + Frontend M (virtualization + filters). 1.5–2 sprint weeks.

**Reference:** `_eng-brief-2026-06-09-deadline-detail-tabs.md` Items 2 + 3. Memory: `reference_deadline_tab_additions_spec`.

---

## Recommended ship order (dependency-aware)

1. **Workstream 1 — Status taxonomy 10 → 6.** Foundation. Blocks #4 and parts of #2 / #3.
2. **Workstream 2 — HuYeb list-page parity** (finish the ~8 remaining items). Highest user-facing visibility. Mostly independent of #1 except status pill colors.
3. **Workstream 3 — 5 `TODO(data)` resolutions.** Parallel-safe. Unblocks 4 distinct UI features simultaneously.
4. **6-component extraction** from `_spec-cluster2`. Foundation for tab implementations.
5. **Workstream 4a — Audit tab.** Smaller scope than Risk; permissions + filter API + virtualized timeline.
6. **Workstream 4b — Risk tab.** Largest scope; penalty engine is net-new.
7. **18-item additions (S1–V5)** from `reference_deadline_tab_additions_spec`. Lands on top of primitives + data + new tabs.
8. **Quick filters dropdown** on `/deadlines` list. Smaller scope, independent.

Cumulative: ~6–9 sprint weeks for a 2-eng team.

## What's NOT blocking — can pick up anytime

- Quick filters dropdown (`reference_quick_filters_spec`)
- 18 tab additions (`reference_deadline_tab_additions_spec`)
- 6-component extraction (`_spec-cluster2-detail-tabs.md` final section)

## Out-of-scope explicit deferrals

- Drawer → page promotion debate (current: drawer; Pencil: full page). Live-tabs implementation in `_spec-cluster2-detail-tabs.md` explicitly maps tab body content onto existing drawer; full-page rebuild deferred.
- Bulk-select multi-obligation extension flow (M3 in spec). Single-deadline view doesn't surface this; will require alerts ↔ deadlines integration which is a separate workstream.

## Where each spec lives

| Source                    | Location                                                       |
| ------------------------- | -------------------------------------------------------------- |
| Lifecycle migration brief | `docs/Design/obligation-lifecycle-design-brief.md`             |
| Tab implementation spec   | `docs/dev-log/_spec-cluster2-detail-tabs.md`                   |
| Engineering brief (top 3) | `docs/dev-log/_eng-brief-2026-06-09-deadline-detail-tabs.md`   |
| 18-item tab additions     | memory `reference_deadline_tab_additions_spec`                 |
| Quick filters dropdown    | memory `reference_quick_filters_spec`                          |
| Status taxonomy contract  | memory `project_status_taxonomy`                               |
| HuYeb parity work         | worktree `/Users/yuqi/dev/ddhq-deadlines-parity` + HANDOFF doc |
| Pencil Risk tab           | `duedatehq_work.pen` frame `s0YOE`                             |
| Pencil Audit tab          | `duedatehq_work.pen` frame `K4Go6X`                            |

This doc is the single map. When in doubt, start here.
