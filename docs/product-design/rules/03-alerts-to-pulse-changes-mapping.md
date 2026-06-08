# Alerts to Pulse Changes Mapping

> **2026-05-30 update.** The decision surface is now the top-level **`/alerts`**
> route (it left the Rules subtree; `/rules/pulse[/history]` redirects to
> `/alerts[/history]`). References to `Rules > Pulse Changes` below mean `/alerts`.
> The **Dismiss / Snooze / Archive** actions were removed from the UI — `apply`,
> `mark reviewed`, `request review`, and `revert` remain; `mark reviewed` is the
> single clear-without-apply path. "Pulse" is now the engine name only (DB /
> contracts / RPC); the user/frontend word is "Alerts."
>
> **2026-06-08 update.** Alerts now include a low-frequency/high-value
> `protective_claim_window` kind for rights-preservation windows such as refund
> or protective-claim deadlines reopened by later legal developments. These
> alerts are always `review_only`: they surface the action window and official
> evidence for CPA review, but do not decide client eligibility, write due-date
> overlays, or auto-apply anything.

## Boundary

The reference `https://github.com/helloigig/DueDateHQ` Alerts surface is not a route or schema to
copy into this product. It is a product prototype for a broad state-announcement workbench: triage
feed, announcement archive, alert-type verbs, source confidence, client-specific action modals,
digest settings, and a modal first-land triage pattern.

This repository's canonical implementation is narrower and more operational:

1. `jobs/pulse/ingest` watches official sources and records watched/paused source state,
   internal diagnostics, snapshots, or T2/T3 signals.
2. `pulse.extract` turns T1 source snapshots into approved `pulse` records.
3. The DB repo fans approved records into firm-scoped `pulse_firm_alert` rows for every active
   firm, then derives each firm's impact from current open obligations.
4. `Rules > Pulse Changes` is the decision surface for apply, dismiss, snooze, re-open, and revert.
5. `pulse.apply` writes due-date overlays, audit, evidence, and email outbox rows in one server
   transaction.

## Product Mapping

| Reference Alerts capability                 | Current Pulse mapping                                                                                                       | Decision                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Affecting you` / resolved triage tabs      | Impact lanes in `Rules > Pulse Changes`: all impact, needs action, needs review, no matches, closed                         | Keep inside Rules; do not restore standalone `/alerts`.                                                   |
| All-announcement archive                    | Marketing / future public source archive, not app decision workflow                                                         | Do not mix non-firm announcements into firm apply UI.                                                     |
| Alert type taxonomy and type-specific verbs | Pulse supports due-date shifts plus review-only policy/source changes and protective claim windows                          | Keep non-overlay alerts review-only; do not add apply routers unless contracts and evidence support them. |
| Source authority and confidence chips       | Source context block, official-source link, source badge, source-status badge, confidence badge, source excerpt             | Retain as glass-box evidence in the drawer.                                                               |
| Structured alert metadata                   | Parsed scope block for jurisdiction, counties, forms, entity types, issued/effective dates, and due-date shift              | Show as review evidence; do not add a separate alert schema.                                              |
| Client-specific alert context               | `/clients?client=<id>` shows Pulse impact filtered to the selected client, with source link, confidence, and due-date delta | Keep apply/dismiss/revert in `Rules > Pulse Changes`; client detail is context and follow-up.             |
| Per-client exclusion and confirmation       | Existing affected-client table selection, needs-review confirmation, manager exclusion when priority review is enabled      | Keep rows obligation-scoped, not client-only.                                                             |
| Suggested actions / client communication    | Drawer suggested actions: apply selected obligations or copy a source-linked client draft                                   | Keep communication draft local until email outbox/send workflow is productized.                           |
| First-land blocking modal                   | Dashboard Pulse banner + deep link to `Rules > Pulse Changes`                                                               | Avoid blocking modals for regulatory changes.                                                             |
| Alert digest settings                       | Notification preferences and email outbox                                                                                   | No env change; delivery configuration remains server-owned.                                               |

## Current UX Contract

`Rules > Pulse Changes` presents impact first, then technical status and source filtering:

- **Needs action**: matched or partially applied firm alerts with at least one affected obligation.
- **Needs review**: alerts with obligations that require human applicability confirmation.
- **No matches**: source-backed due-date alerts with no matching open obligations for that firm;
  visible for review, but no Apply entry and no proactive notification.
- **Protective claim window**: review-only firm-level alert for a source-backed rights-preservation
  window. If the action deadline is still open, historical policy periods are not filtered out.
- **Closed**: applied, dismissed, or reverted alerts.

The drawer follows the same sequence for impacted firms: source context -> parsed scope -> affected
obligations -> suggested actions -> safety checklist. For no-match firms it stops at source/scope
review evidence plus Mark reviewed / Dismiss / Snooze / Request review, preserving visibility
without implying a due-date overlay is available.

This maps the reference Alerts product strength into the current architecture without reviving the
old standalone Alerts route or widening Pulse beyond source-backed due-date changes.
Protective-claim alerts are the explicit exception to the old "current due-date only" boundary:
they can be source-backed, old-policy alerts when the CPA action window is still open.
