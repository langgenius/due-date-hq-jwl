# 2026-05-20 · Client detail upgrade + Path-to-filing chevron

## Summary

Lifts the Client detail page (`/clients/:clientId`) closer to the reference
CPA-workbench pattern: filing plan grouped by tax year, applicable-forms gap
analysis, per-client mailbox stub. In parallel, adds a 5-step Path-to-filing
chevron above the obligation drawer's tabs so each task's stage in the funnel
reads at a glance.

These changes complement (not replace) the drawer redesign and obligation
queue work in the previous three commits. The shared `ObligationQueueDetailDrawer`
auto-inherits the new chevron from wherever it's opened (queue · dashboard ·
client page).

## Shipped

### Filing plan with tax-year grouping ([ClientFactsWorkspace.tsx](../../apps/app/src/features/clients/ClientFactsWorkspace.tsx))

Before: a flat 8-row hardcoded table with columns Filing · Internal · Status ·
Projected risk · Tax due. No year context, no extension/open counts per year.

After: filings are grouped into per-tax-year sections. Each year section has:

- Year header (e.g. "2026") with a "CURRENT TAX YEAR" chip on the latest year
- Right-side summary: "1 extended · 2 open"
- Full table of that year's filings (no row cap)

Panel header now reads "Filing plan · 4 filings across 1 tax year" instead of
"Filings & deadlines." The existing badges (N overdue · N need review ·
N payment-linked) remain.

Helper: `groupObligationsByTaxYear` + `FilingPlanYearSection` component, both
in ClientFactsWorkspace.tsx.

### Forms catalog gap analysis (new `SuggestedFormsCatalogPanel`)

Mirrors the reference's "Federal forms catalog · 21 applicable · 20 gap" panel.

- Computes applicable forms from the client's `entityType` via a hardcoded
  `FORMS_BY_ENTITY_TYPE` map (individual / partnership / s_corp / c_corp / llc /
  trust / sole_prop). This is v1 — a follow-up wires the real rule-catalog query
  filtered by entity + jurisdictions + tax-classification.
- Subtracts forms already scheduled on this client (matched by `taxType`).
- Renders the "gap" forms under a "SUGGESTED — APPLICABLE BUT NO DEADLINE YET"
  amber section.
- Each suggested form has an `[+ Add deadline]` button (disabled with tooltip
  "Wire to rule catalog — coming in a follow-up").
- Hide/Show toggle on the header so power users can collapse it.

When every applicable form is already scheduled, the panel shows a tidy "All
applicable forms scheduled" empty state instead of disappearing.

### Per-client mailbox stub (new `ClientMailboxPanel`)

The reference shows a deterministic per-task forwarding address that ingests
client emails into the workflow. We don't have inbound email wired yet, so
this is a UI stub:

- Deterministic address derived from client name + ID:
  `lakeview-medical-par-100000@duedatehq.com`
- Copy-to-clipboard button with a 1.5s "Copied" confirmation
- `[Phase 2]` badge on the header so users know this is forward-looking

The intent is to show the UX shape now so Phase 2 (actual SMTP routing + AI
ingestion) lands into a familiar surface.

### Path-to-filing chevron in obligation drawer ([obligations.tsx](../../apps/app/src/routes/obligations.tsx))

A 5-step horizontal funnel above the drawer's tabs:

```
●─── Scope ───●─── Collecting ───●─── Preparing ───●─── Signature ───● Filed
✓             ✓                  ✓                  ✓                ◉
```

Each milestone is in one of three states:

- **done** — green-filled circle with checkmark
- **active** — accent-bordered circle with inner dot, label bumps to `font-medium`
- **upcoming** — outline circle, muted label

The mapping from PRD 6-state lifecycle to the 5-step funnel:

| Lifecycle status | Funnel stage |
|---|---|
| `pending` / `not_applicable` | 0 (Scope) |
| `waiting_on_client` / `blocked` / `extended` | 1 (Collecting) |
| `in_progress` / `review` | 2 (Preparing) |
| (no distinct status today) | 3 (Signature) — collapses into Preparing |
| `done` | 4 (Filed) |
| `completed` / `paid` | 5 (past Filed; all milestones marked done) |

The chevron is purely derived — no schema change. Stage 3 (Signature) is
currently collapsed because the product doesn't yet model the Form 8879
e-file-authorization checkpoint as a distinct status; that's a PRD §7.2
Should item.

## Type-check + verify

- `npx tsgo --noEmit` → exit 0
- Verified all four pieces visually on `/clients/<id>` and `/obligations?id=<id>`
- Lingui `t` template-tag must be called inside the component scope, not
  passed into helpers (Babel macro caveat — bit me once, fixed by inlining
  the labels array inside the chevron component)

## Deferred

- Wire `SuggestedFormsCatalogPanel` to the real rule catalog (RPC query
  filtered by client entity + jurisdictions). Currently hardcoded by entity
  type.
- `[+ Add deadline]` button click handler (today disabled). Will need a
  small obligation-create flow.
- Mailbox: actual inbound email infrastructure (Phase 2; explicit chip)
- Tab navigation on the client page (Work / Mailbox / Notes) — bigger IA
  decision; left for a separate pass.
- Signature stage in chevron — currently collapses into Preparing. Will
  separate when Form 8879 e-file authorization lands.
