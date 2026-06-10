# Engineering brief — Deadline detail tabs, 2026-06-09

Pre-build brief for the three highest-impact items on the deadline-detail surface. Companion to `docs/product-design/deadlines/spec-cluster2-detail-tabs.md` (existing-tabs implementation spec) and `~/.claude/projects/-Users-yuqi-dev-due-date-hq-jwl/memory/reference_deadline_tab_additions_spec.md` (full 18+2 item content contract).

## Item 1 — Resolve the 5 `TODO(data)` contract additions

Five `TODO(data)` markers in `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx` are gating real UI. All five are pure backend-add-then-wire problems; no UI is fabricated.

### 1.1 Expected refund (Summary tab — L2140)

**Contract addition** on `obligation` row:

```ts
expectedRefund: {
  totalCents: number // net (negative if balance owed)
  reconciledAt: string | null // ISO; null = estimate-only
  components: Array<{
    label: string // 'W-2 withholding (box 2)' / '1099-INT federal' / etc.
    cents: number // signed
    source: 'preparer_entered' | 'imported_w2' | 'imported_1099' | 'calc'
    sourceArtifactId?: string // FK to source doc if imported
  }>
}
```

**Compute boundary:** preparer-entered components persist; calc components recompute on every save. UI shows total + 5 components; if any component lacks a source artifact, sub-line carries `unreconciled` indicator.

### 1.2 Source-document attachments (Summary tab — L2185)

**Contract addition** on `obligation` row:

```ts
sourceDocs: Array<{
  id: string
  filename: string
  sizeBytes: number
  contentType: string // 'application/pdf' | 'image/jpeg' | ...
  uploadedAt: string // ISO
  uploaderId: string // memberId | 'client' | 'system_import'
  downloadUrl: string // signed S3
  thumbnailUrl?: string // for image types
}>
```

**Upload path:** existing materials upload endpoint should accept an optional `attachToObligationId` arg; when set, persists into `sourceDocs` instead of `materialsRequestArtifacts`. Empty state already handled in UI.

### 1.3 Prior-year extension/filing history (Extension tab — L3366)

**Contract addition** on `obligation` row:

```ts
priorYearObligations: Array<{
  taxYear: number // 2024, 2023, 2022, ...
  obligationId: string // FK to the prior obligation row
  extensionFiled: boolean
  extensionForm: string | null // 'IRS-4868' / 'IRS-7004' / 'CA-FTB-3519' / null
  filedAt: string | null // ISO; null if never filed
  daysLateOrEarly: number // signed; negative = late
  penaltyPaidCents: number // 0 if none
  reviewerId: string | null
}>
```

**Sourcing:** derived view; build it as a materialized query against the `obligation` table grouped by `clientId + obligationType + jurisdictionCode`. Refresh on any obligation status transition.

### 1.4/1.5 Prior-year filing date (Evidence tab — L3653 + L3684)

Already satisfied by 1.3's `priorYearObligations[0].filedAt`. The two TODO sites both consume the same datum.

**Estimated effort:** Backend M (single migration + 3 derived views) · UI S each (≤2h per consumer). Total: 1 sprint week with a backend pair.

---

## Item 2 — Risk tab (new)

Net-new `<TabsContent value="risk">` panel. Spec: `reference_deadline_tab_additions_spec.md` Risk section. Pencil ref: `s0YOE` (in flight from designer agent at time of writing).

### Data model — net-new

```ts
// Per-obligation, computed server-side, cached
obligationRisk: {
  asOf: string                              // ISO; recompute on status transition or daily cron
  penaltyToday: { cents: number; capCents: number; formula: string }
  penaltyAt30d: { cents: number; capCents: number }
  penaltyAt60d: { cents: number; capCents: number }
  breakdown: Array<{
    component: 'failure_to_file' | 'failure_to_pay' | 'interest'
    statutoryCitation: string               // '§6651(a)(1)' / '§6651(a)(2)' / '§6621'
    formula: string                         // human-readable
    cents: number
  }>
  mitigation: {
    firstTimeAbatementEligible: boolean
    firstTimeAbatementBlockedReasons: string[]
    reasonableCauseEligibleDraftId: string | null
  }
  auditRiskScore: number                    // 0-100
  auditRiskTier: 'low' | 'moderate' | 'high'
  auditRiskSignals: Array<{
    code: 'refund_over_5k' | 'schedule_c_losses' | 'late_filing' | ...
    severity: 'info' | 'warning' | 'flag'
    note: string
  }>
  paymentMethodCosts: Array<{
    method: 'check' | 'ach' | 'credit_card'
    feeCents: number
    note?: string
  }>
}
```

### Compute boundary

- Penalty calc lives in `packages/core/src/penalty/` (does not exist yet — create).
- Tax-code citations are _spec-driven_ (`§6651` is hard-coded; not data-driven).
- Audit-risk signals are derived from obligation + return-data signals; the score is the weighted sum (weights config'd in `core/src/penalty/audit-risk.ts`).
- Payment-method costs come from a static fee table (config'd, not user-data).

### State surface

Read-only for users. Compute triggers: (a) any status transition on the obligation; (b) daily cron at 06:00 firm-TZ; (c) on-demand "Refresh" button hidden behind feature flag.

### UI sections

Five sections per the spec. The Pencil design is the source of truth for layout; tokens follow the canonical contract.

### Empty state

Status `not_started` and within filing window → show _projection_ (`If filed late, your exposure starts at $X`). Status `filed` or `completed` → hide the tab entirely (filter out from `tabsForObligationType`).

**Estimated effort:** Backend L (penalty engine new from scratch; audit-risk signals scaffold) · UI M (5 sections, all data-driven). Total: 2-3 sprint weeks.

---

## Item 3 — Audit tab (new)

Net-new `<TabsContent value="audit">` panel. Spec: `reference_deadline_tab_additions_spec.md` Audit section. Pencil ref: `K4Go6X` (in flight).

### Data model — derives from existing

The `auditEvents` payload already flows to the drawer (`detail.auditEvents`). What's missing for this tab:

- **No filter API on the server.** Currently the drawer receives all events. Need a `listAuditEvents(obligationId, { eventTypes, actorIds, dateRange, query, cursor })` endpoint.
- **No event-type categorization in the model.** Today events are heterogeneous typed objects; need a canonical `eventType` enum: `STATUS_CHANGE | ASSIGNMENT | DOCUMENT | COMMUNICATION | SYSTEM | EXTERNAL_RESPONSE | REVIEW_TRANSITION | PAYMENT`.
- **No permalink IDs.** Events need stable IDs (UUID v7 already in the database, just need to expose them as `#audit-{id}` URL fragments).
- **No PDF export.** New endpoint `generateAuditBundle(obligationId)` → returns signed URL to a cryptographically-sealed PDF.

### Compute boundary

- Filter logic server-side; client just paginates.
- Export bundle: server enqueues a job, returns job ID; client polls; downloads when ready. PDF generation lives in `packages/pdf/audit-bundle/`.
- Cryptographic seal: SHA-256 of event payloads, signed with firm's audit key.

### UI sections

Three sections per the spec.

- Filter toolbar: all controls are client-state-driving server-fetch.
- Timeline: virtualized list (`@tanstack/react-virtual`); day markers inserted as separator rows.
- Compliance bundle footer: button triggers job, status pill shows queued/processing/ready/failed.

### Permission gate

View: any team member. Export bundle: roles `partner` and `compliance_officer` only.

**Estimated effort:** Backend M (filter endpoint + event-type migration + bundle generation) · UI M (virtualization + filter UI). Total: 1.5-2 sprint weeks.

---

## Cross-cutting prereqs

1. **6-component extraction** from `docs/product-design/deadlines/spec-cluster2-detail-tabs.md`. These compose into the new tabs above; build them first so Risk/Audit can stand on consistent primitives.
2. **Status taxonomy migration 8 → 6** (per `project_status_taxonomy` memory). Several spec items above assume the 6-state model; building Risk/Audit against the 8-state model and re-migrating later is wasted work.

## Order

1. Status taxonomy migration (foundation)
2. 6-component extraction (foundation)
3. The 5 `TODO(data)` resolutions (parallel-safe; can split across 2 backend engineers)
4. Risk tab
5. Audit tab

Estimated cumulative: ~5-7 sprint weeks for a 2-eng team. Sequencing keeps Risk/Audit on top of clean primitives.

## Out of scope (deliberately deferred)

- 18-item additions S1-V5 (the "additions to existing tabs" set). Spec'd in memory; implement after 1-5 above are stable.
- Quick filters dropdown — separate workstream on `/deadlines` list page.
- HuYeb table parity polish — separate workstream on `/deadlines` list page; tracked in `project_deadlines_design_parity` and its worktree.

## Owner / next step

This brief sits in `docs/dev-log/`. Next step: assign owners + put items 1-2 into the backlog with story points; items 3-5 stay queued until 1-2 land.
