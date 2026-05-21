# Audit log — per-surface requirements

**Status:** spec / shopping list. Drafted 2026-05-20 from the PDF guide
(`美国小型会计事务所报税种类、流程与规则产品指南.pdf`) plus the existing
`audit_events` schema. Use this when picking which audit panels to
build next.

The schema is fine — `AuditEventPublicSchema` already carries
`firmId / actorId / actorLabel / entityType / entityId / action /
beforeJson / afterJson / reason / createdAt`. Categories supported:
`client / obligation / migration / rules / auth / team / pulse /
export / ai / system`. The work is **(a) writing the right events**
and **(b) building surface-specific panels to read them.**

`[gap]` below = event class that doesn't get written today.

---

## 1. Obligation — what its log must contain

A CPA opens an obligation expecting "what happened on this filing, in
order."

### Lifecycle / status

- Created (which rule, which generation source: `migration` / `manual` /
  `annual_rollover` / `pulse`).
- Owner assigned / changed / unassigned.
- Status transition through `pending → in_progress →
waiting_on_client → blocked → review → filed → extended →
completed`.
- `[gap]` Sub-state transitions per PDF guide §3.4 (the 18-state
  model): prep stage / review stage / payment state. We need
  finer-grain audit if we add these.
- Due date adjusted — old → new, who, why.
- Tax year / tax period changed.
- Internal vs statutory deadline divergence.

### Evidence + source

- Source attached / detached / replaced.
- Source re-verified (with verifier + timestamp).
- AI-prepared draft generated / regenerated (model + prompt version).
- `[gap]` `verified_at` change history.

### Extension / payment

- Extension decision recorded (form, original due, extended due).
- `[gap]` Extension form filed (4868 / 7004) — confirmed by IRS.
- `[gap]` Payment estimate, payment scheduled, payment confirmed.
- `[gap]` Override of "payment-due-not-extended" warning, with reason.

### Risk / penalty

- Exposure status change (`needs_input → ready / unsupported`).
- Penalty rule applied / changed.
- Accrued penalty recalculation (delta from prior reading).

### Client + Pulse touches

- Readiness checklist sent / regenerated.
- Client portal submission against this obligation.
- Reminder sent (template, delivery status, bounce/opened).
- Pulse alert applied to this obligation (which alert, what changed,
  reason).
- Pulse revert.

### Bulk + system

- Annual rollover (from which prior obligation).
- Mass status update (which actor, which batch).

---

## 2. Client / client detail — what its log must contain

A CPA opens a client expecting "what's changed about this client and
what we've done for them."

### Identity / classification

- Legal name change, DBA change.
- EIN / SSN updated (value **masked in audit**).
- Entity type change (e.g. LLC → S-corp election, with effective date).
- Tax classification change (separate axis from entity type per PDF 2
  §2).
- Fiscal year-end set / changed.
- `[gap]` Tax-year override per the new tax-year-profile schema.

### Profile / facts (the tax-profile fields from PDF 2)

- Filing jurisdictions added / removed (state, county).
- Tax types added / removed.
- Owner / shareholder / partner count change.
- Payroll flag toggle.
- Sales tax flag toggle.
- 1099 issuer flag toggle.
- K-1 expected toggle.
- Foreign reporting flags toggle.
- Primary contact updated (who, when, by whom).
- Client action recipient changed.

### Engagement / assignment

- Engagement letter sent / signed.
- Engagement period changed.
- Partner / manager assigned / reassigned.
- Escalation events (promoted to partner / owner attention) — per
  PDF 1 §Preparer-3 "internal escalation."
- Client portal access granted / revoked.
- Migration: created from which import batch — so a CPA can trace
  back to the original spreadsheet.

### K-1 dependency

- This client identified as K-1 _source_ (entity return that issues
  K-1).
- This client identified as K-1 _recipient_ (individual that's blocked
  by upstream).
- Dependency edge created / removed.

### Communications

- Reminders sent (template, channel, delivery status, bounce, opened).
- Client portal submissions logged.
- Documents received (link to which obligation).

### Risk events

- Exposure threshold crossings.
- Escalation triggered.

---

## 3. Radar (Rules) — what its log must contain

Three logical streams here — keep them separate so it's clear what
changed.

### Rule library

- Rule created / activated / **deprecated** (PDF 2 §10).
- Rule version bump v1 → v2 — with diff of due-date logic, extension
  rule, payment rule, evidence requirement.
- Reviewer accepted / rejected (with note).
- Effective date set / changed.
- Jurisdiction adjustments (added / removed states).
- Entity applicability changes.
- Notification channels changed.
- Last-reviewed date updated; review cadence changed.
- Bulk rule import (annual rollover, BOI refresh, etc.).
- Coverage gap auto-detected (which client / which jurisdiction has
  no matching rule).

### Pulse source health

- Source registered / paused / removed.
- Watch transition (`healthy/watched ↔ paused`).
- Internal diagnostic failure counters or parser errors when surfaced to ops tooling.
- Manual retry / refresh.
- Authority role updated (T1/T2/T3).
- Source URL changed (old → new).
- Cadence / acquisition method changed.

### Pulse alert lifecycle

- Source signal arrived (raw, before AI classification).
- Signal linked to alert (which AI run, confidence).
- Signal reviewed / dismissed.
- Alert AI summary generated / regenerated.
- Matched clients computed / recomputed.
- Review queue: `requested → reviewed → applied / dismissed /
snoozed / reverted` — each with `reason` (now required, per
  the 2026-05-20 ship).
- **Apply to N clients**: which obligations affected, what fields
  changed, reason if override.
- Revert event (which alert, what got undone).

### Cross-surface

- Annual rollover events (rule → obligations bulk-create).
- Destructive change preview accepted / rejected.

---

## Surfaces that need an audit panel

| Surface                | What's needed                                                                                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Obligation drawer**  | New "History" tab. Reverse-chronological events filtered by category (status / extension / payment / evidence / Pulse / client touch).                                                                                       |
| **Client detail**      | Already has an audit panel ([apps/app/src/features/clients/ClientFactsWorkspace.tsx:1146](../../apps/app/src/features/clients/ClientFactsWorkspace.tsx)). Add categorization filters + the new tax-profile field categories. |
| **Rule library row**   | Per-rule "Version history" tab — diff between versions, who reviewed, when.                                                                                                                                                  |
| **Pulse alert drawer** | "Activity" tab — signal arrival → review → apply chain.                                                                                                                                                                      |
| **Pulse source row**   | Per-source signal trail — drill in from the page-level signal panel that just shipped.                                                                                                                                       |

---

## Engineering pointers

- Schema: `packages/contracts/src/audit.ts` (AuditActionCategorySchema, AuditEventPublicSchema)
- Server write helpers: `apps/server/src/procedures/_audit.ts` (if it exists), otherwise inline in each handler
- Existing UI surfaces:
  - `/audit` (firm-wide) — `apps/app/src/features/audit/audit-log-page.tsx`
  - Per-client embed — `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  - Per-obligation timeline — `apps/app/src/features/obligations/timeline.tsx`
  - Audit event drawer — `apps/app/src/features/audit/audit-event-drawer.tsx`
- Pulse source signals (just wired): `apps/app/src/features/rules/sources-tab.tsx`
  `SourceSignalsPanel`

## When you come back

1. Pick a row from the "Surfaces" table — that defines scope.
2. For each event class on its list, check repo to see whether
   `audit_events` is already getting written; the `[gap]` items are the
   ones that need new write paths.
3. Build the surface panel against `orpc.audit.list` filtered by
   `entityType` + `entityId`.
