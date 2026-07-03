# UX flow remediation — wave 3 (8 fix agents + completeness cross-check + journey QA)

**Date:** 2026-07-02 · follows docs/Design/ux-flow-audit-2026-07-02.md,
ux-flow-wave1-fixes-2026-07-02.md, ux-flow-wave2-fixes-2026-07-02.md

Wave 3 = the product/backend deferrals + a "do not miss anything" completeness
pass. Eight fix agents (A rules, B alerts, C client lifecycle, D boundary, E P2
sweep, G1+G2 residual batches) + a read-only critic that cross-referenced all 73
audit findings against waves 1–3 (25 shipped W1, 11 W2, rest here or explicitly
deferred; 10/10 spot-checked shipped claims verified at code level — no
regressions, no false claims). Verified: tsgo clean ×5 packages, 29 contracts +
195 db + 598 server + 555 app tests, lingui strict with ~66 new zh-CN
translations, and a five-journey live QA gate (below) against the running stack.

## Journey QA gate (5 live agents, post-fix)

J1 alert triage 7/8 · J2 deadline loop 8/8 · J3 rules coverage PASS (incl.
DB-level proof of the cascade) · J4 client lifecycle 9/9 · J5 settings/shell
10/10 — zero app console errors across all journeys. The gate caught two REAL
defects in the wave-3 work itself, both fixed + live re-verified before commit:

- **Review-scope deadlock (J1)**: the new `listReviewScopeAffectedRows` was
  gated on stored counts > 0 and the count heal only ran when counts were
  already positive — a 0/0 alert could never recover its affected-clients
  table even when matching obligations existed (demo K-3 alert proved it), and
  a stale positive count with an empty scan never healed down. Fixed: the scan
  always runs (the scan itself is the no-fiction guarantee) and the heal is
  bidirectional while the alert awaits a decision. Live re-verified: the
  deadlocked K-3 now lists Arbor & Vale with counts healed 0→1.
- **Accept-toast fiction (J3)**: "Rule activated — N deadlines generated" took
  N from `previewRuleImpact`'s ESTIMATE (matches on `client.state`) while
  generation iterates `client_filing_profile` rows — for profile-less clients
  the toast asserted 1 while the write was 0, and "View deadlines" landed on
  an empty filtered list. Fixed: `acceptTemplate`/`verifyCandidate` now return
  `generatedObligationCount` (the actual write), the toast reports it, and the
  View-deadlines action is dropped when nothing was written. Live re-verified:
  profile-less accept returns 0 and the toast stays honest.

## J3 retroactive rule application — the core promise gap (W3-A)

Root cause was two-layered: generation only ran at rule-accept time, AND
manually created clients got filing profiles with empty `taxTypes` (only the
migration wizard inferred them), so no cascade could ever have matched.

- Generation kernel extracted to `generateObligationsForClientList` (accept path
  delegates to it; same dedup-key seeding → idempotent by construction).
- Hooked into `clients.create`, `createBatch`, `updateJurisdiction`,
  `replaceFilingProfiles` — active rules now cover late-created/changed clients
  automatically, audit-logged (`obligation.batch_created` with the client
  trigger as reason). The update procedures' `recalculatedObligationCount = 0`
  placeholders now return the real count.
- `updateJurisdiction` no longer silently wipes curated taxTypes to `[]` on a
  same-state save; bare creates infer tax types via the same default matrix the
  wizard uses.
- Status canon: cascade rows land `pending` (or `review` where the rule requires
  CPA applicability confirmation).
- Deliberate non-coverage: profile REMOVALS never auto-delete deadlines
  (explicit reviewed action, per classification-recompute canon).

## Alert closure pacing (W3-B)

- Apply no longer auto-closes in 600ms: persistent in-panel success state —
  "Applied to N clients" (real count) + Copy client email draft (existing
  clipboard affordance) + **Review next alert** + Close. Next-alert pager is
  snapshotted at apply time (success invalidation would evaporate the live
  prop); focus lands on the primary via Base UI `finalFocus`; A/D hotkeys
  guarded during the success window.
- Review-only alerts finally list their affected clients — root cause was
  backend: `buildDetail` built rows only for apply-class alerts. New
  `listReviewScopeAffectedRows` (jurisdiction+form+entity scope match, all
  needs_review), gated to alerts whose stored counts claim impact (no fabricated
  lists); `getDetail` count self-heal extended so strip/timeline match the list.
- Affected-clients links open in a new tab (canonical ↗ affordance) — curated
  apply selection survives the side trip.

## Client lifecycle: archive/restore (W3-C)

- New `client.archived_at` column (migration 0081) — deliberately NOT reusing
  `deletedAt` (that's the PRD §8.1 purge path; conflating would make archived
  clients purge-eligible when the cron ships).
- Repo `archive()`/`restore()` (tenant-scoped, idempotent, blocked on deleted);
  every obligation surface that guarded deletedAt now also guards archivedAt
  (queue, dashboard ×3, calendar ICS, reminder + digest jobs) — every sentence
  of the confirm-dialog copy maps to a real guard.
- UI: kebab Archive/Restore, truthful confirm, persistent archived banner with
  inline Restore, `/clients` "Archived (N)" header button → drawer
  (`?archived=open`), delete dialog now says "no undo in the app" and offers
  **Archive instead** (recommended). Audit: `client.archived`/`client.restored`.
  Bonus: delete's analytics event no longer mislogs as "Client Archived".

## Boundary (W3-D)

- zh-CN marketing 404 (`zh-CN/404.astro`) consuming the pre-existing unused zh
  `notFound` i18n block; served in production via Cloudflare nearest-404
  (`not_found_handling = "404-page"`); astro dev doesn't simulate — direct-visit
  verified.
- Login reassurance line: "New here? Entering your email creates your account."
  (No source/offer param pipeline exists — none invented.)

## P2 sweep (W3-E)

- Materials tab: "Select all" aligned over the checkbox gutter + accent
  selection bar with count-first labeling — the gutter now reads as selection,
  not per-row "done" ticks.
- Billing: demo seed's stale `period_end` fixed (yearly, future) AND the UI
  hardened — past `periodEnd` renders "Period ended <date>", never "Renews
  <past>"; portal error keeps the server message + Try again + a non-portal
  path (support mailto).
- Audit KPI "SYSTEM" tile → "Other" ("decisions and system events") — it was
  the timeline-type catch-all colliding with the Category filter's
  action-prefix "System".
- Sidebar "Monitoring N jurisdictions" pill: green only when the newest sweep
  is <24h old; otherwise neutral dot + honest tooltip (stale is a fact, not an
  alarm).
- Deadlines sort affordance already existed but the lanes-view hover-resolve
  was dead (missing `group` class) — fixed (`group/sort`).
- Audit arrival banner names the scoped record ("Showing the full history of
  <name> (Type · id)").
- Sessions list: current-device-first, capped at 10, "Show all N sessions"
  expander.
- Per-item mark-UNREAD skipped: no `markUnread` endpoint exists (mark-read
  already shipped) — needs backend first.

## Residual batches (W3-G1 + W3-G2)

- Duplicate-create dead-end closed end-to-end: contract gains
  `duplicateObligationIds`, server returns the blocking rows, dialog's
  "Already tracked" toast gains **View deadline** → the existing row.
- Smart Priority "Why this rank?" used the raw UUID → blank pane; now
  `deadlineDetailPath` (resolves).
- First-run tour last step: primary CTA "Open Rule library" actually navigates.
- Workload/member assignee links centralized in `assigneeDeadlinesHref()`
  (still name-keyed — id-keyed filtering needs an obligation-queue contract
  change; wave-4 residual).
- Audit drawer "View Rule source" → `/rules/sources?source=<id>` (sources tab
  gains the param).
- Stale `?rule=` deep link: quiet "doesn't resolve" toast + param cleared.
- Rules Overview "View all changes" → `/audit?entityType=obligation_rule`.
- Bulk-review shared note survives opening a rule from the modal (state lifted
  to route level).
- Accept toast gains **View deadlines** (second action beside Review next).
- Deadline detail → list round trip restores scroll + arrival wash (`?row=`).
- Obligation rule filter chip resolves the rule title from cache (id fallback).
- Audit export dialog: "Preparing export…" busy CTA + 4s polling while
  pending/running (backend already exposed status).
- Notifications page rows clickable (Open logic reused; buttons keep their own
  behavior).
- Billing plan cards caption WHY they're disabled (role / lower tier / current).

## Orchestrator fix: rule deep-link filter was a no-op

`?rule=` was validated as `z.uuid()` at the contract and UUID-regexed in the
table + rail cleaners — but `obligation.rule_id` is a free-text catalog id
("ny.it204.return.2025") until the Phase-1 FK lands, so every rule deep link
(decision rail, accept toast) silently landed UNFILTERED. Contract now takes the
bounded-string filter schema; table + rail cleaners aligned. (Found by W3-G2,
verified + fixed at orchestration level.)

## Known wave-4 residuals (tracked)

Id-keyed assignee filtering (contract/repo + workload assigneeId);
`markUnread` endpoint; Phase-1 `rule_id` FK; "mine OR unassigned" dashboard
scope; demo-seed avatar/roster cosmetics. From journey QA:
`previewRuleImpact` still estimates from `client.state` (confirm dialog is
labeled an estimate, but aligning it to the profile basis — or backfilling
filing profiles for legacy clients — closes the gap for good); e2e `pulse`
seed has no review-only alerts and only one non-expired alert (dates are
absolute 2026 strings), so two journey steps aren't seed-testable; nuqs
`limitUrlUpdates` advisory warning on /deadlines + /clients (pre-existing
pattern); apply success toast overlaps the footer actions (cosmetic); rate-
limited count queries hide gated affordances silently (e.g. the "Archived
(N)" button vanishes under 429 — S1's failure-as-empty on visibility gates);
`RuleCoverageMap` tilegram is dead code (spun out as a follow-up task).
