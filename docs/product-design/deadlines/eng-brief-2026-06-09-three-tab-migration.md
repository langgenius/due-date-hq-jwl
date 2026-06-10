# Engineering brief — 3-tab migration, 2026-06-09

Companion to:

- `docs/product-design/deadlines/roadmap-2026-06-09-deadlines-workstreams.md` (overall sequence)
- `docs/product-design/deadlines/eng-brief-2026-06-09-deadline-detail-tabs.md` (data/content for items 1–3)
- `docs/product-design/deadlines/spec-cluster2-detail-tabs.md` (tab implementation against existing drawer)
- Memory `reference_deadline_tab_additions_spec` (full content contract)

This brief is the **structural migration** from today's 4-panel drawer (`summary` / `readiness` / `extension` / `evidence`) to the canonical 4-tab page (`status` / `materials` / `record` / `audit`). It supersedes any "6-tab" or "3-tab" claims in earlier docs.

**2026-06-09 rev 4 (LOCKED):** Tab count locked at **4** — Status · Materials · Record · Audit. Earlier revs oscillated 6 → 4 → 3 → 4 → 3 → 4; the user has now stated explicitly that 4 is the structure. Audit gets its own tab because its content (toolbar + 10+ event timeline + compliance bundle export) is substantial enough to be a peer, and folding it into Record buries the high-stakes compliance/forensic surface that partners and compliance officers need to find without scrolling. Risk and Extension still fold into Status.

Pencil visual references:

- **CANONICAL Materials tab → `rzzww`** (TabsBar `e4N1va` updated 2026-06-09 to the canonical 4-tab order: Status · Materials · Record · Audit)
- Older Materials rebuilds being aligned to rzzww → `HThur`, `DeZE3`, `g8Bna2`
- Status tab → `C96KdR`
- Record tab → `u3DRZA` (with body `WYh19`)
- Audit tab → `K4Go6X` (its own tab; rich toolbar + timeline + compliance bundle export content stays here)

The `s0YOE` (Risk section) is NOT a tab — it folds into Status.

---

## 1. Code changes — contracts package

### `packages/contracts/src/obligation-queue.ts`

`ObligationQueueDetailTabSchema` enum:

- REMOVE: `'summary' | 'readiness' | 'extension' | 'risk' | 'evidence'`
- ADD: `'status' | 'materials' | 'record'`
- KEEP: `'audit'` (own tab)

### `apps/app/src/features/obligations/obligation-type.ts`

`DEFAULT_TABS`:

- BEFORE: `['summary', 'readiness', 'extension', 'risk', 'evidence', 'audit']`
- AFTER: `['status', 'materials', 'record', 'audit']`

`TABS_BY_TYPE`:

- Collapse all 6 obligation-type variants to use the same 4-tab vocabulary. Default ordering: Status · Materials · Record · Audit.
- `filing` → `['status', 'materials', 'record', 'audit']`
- `payment` → `['status', 'record', 'audit']` (no materials checklist for payment obligations)
- `deposit` → `['status', 'record', 'audit']`
- `information` → `['status', 'materials', 'record', 'audit']`
- `client_action` → `['materials', 'audit']`
- `internal_review` → `['audit']` (audit-trail-only obligations land directly in Audit)

---

## 2. Code changes — drawer

### `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx`

`<TabsTrigger value="...">` mapping:

- `value="summary"` → `value="status"` (label `Status`)
- `value="readiness"` → `value="materials"` (label `Materials`)
- `value="evidence"` → `value="record"` (label `Record`)
- DELETE the `extension` trigger (folds into Status as widget)
- KEEP the `audit` trigger (own tab; rich audit content lives here)

`<TabsContent value="...">` panels: same rename. Add the folded sections:

- **Status panel** receives Risk content + Extension widget as new sections
- **Materials panel** unchanged structurally (rename only)
- **Record panel** for produced artifacts (e-file confirmation, materials receipt log, signoffs ledger, authority response)
- **Audit panel** keeps all audit content (filter toolbar + virtualized timeline + compliance bundle export)

### Component map — folding contracts

**Status tab body composition (top → bottom):**

1. `<PathToFilingSummary>` — keep (workflow strip)
2. `<PenaltyExposureCard>` — **NEW**, content per Risk spec
3. `<ExtensionStatusWidget>` — **NEW**, conditional render
4. `<WhatsLeftChecklist>` — **NEW** (currently inline; extract)
5. `<RecentActivityFeed>` — **NEW** (currently inline; extract; trims `auditEvents` to top 3 with "view all in Record" link)
6. `<InternalNotesCard>` — already exists in `ChecklistGroupCard` neighbourhood; reuse

**Materials tab body composition:**

1. `<MaterialsProgressHeader>` — keep
2. `<BulkChaseHeaderBar>` — **NEW** (spec M1)
3. `<ReadinessReceivedSection>` — keep
4. `<ReadinessOutstandingSection>` — keep, augment with M3 (last-reminder timestamp) and M4 (pending-validation sub-state)
5. `<ReadinessWaivedSection>` — keep
6. Right rail: `<OwnershipCard>` + `<LinkedFromCard>` — keep

**Record tab body composition (collapsible sections, top → bottom):**

1. Backend honesty banner (no chevron — banner, not section)
2. `<EFileConfirmationCard>` — **NEW** (spec V2; 3-state preview + status chip)
3. `<MaterialsReceiptLog>` — **NEW** (`receivedAt` timestamp ledger; replaces never-shipped Workpapers UI per `reference_record_tab_storage_gap`)
4. `<SignOffsLedger>` — **NEW** (audit-event derived rows, no signed PDF preview)
5. `<AuthorityResponseStrip>` — **NEW** (spec V5; bound to `efileRejectedAt` + `ObligationMarkFiledRejectedInput`)

Each is collapsible via the convention in `WYh19` (20×20 chevron-down icon wrap at the far right of each section header).

**Audit tab body composition (its own tab):**

1. `<AuditFilterToolbar>` — **NEW** (search + event-type + actor + date range + Export PDF)
2. `<AuditEventTimeline>` — **NEW** (virtualized timeline with day markers, event-type dots, expand-on-row chevron)
3. `<AuditComplianceBundleFooter>` — **NEW** (generate sealed PDF bundle CTA; permission gate: partner/compliance only)

### Extension widget render condition

`<ExtensionStatusWidget>` renders only when:

- `obligation.status ∈ {'not_started', 'waiting_on_client', 'in_review'}` AND `obligation.extensionWindow.openUntil > now`
- OR `obligation.extension.filed === true` (then renders as "Extension filed · new deadline: …" confirmation row)

Otherwise: no element, no whitespace.

---

## 3. Code changes — URL routing

### `deadline-detail-url.ts`

Backward-compat redirect table for all old tab values (handle in route loader):

| Old `?tab=` | New URL                             |
| ----------- | ----------------------------------- |
| `summary`   | `?tab=status`                       |
| `readiness` | `?tab=materials`                    |
| `extension` | `?tab=status&section=extension`     |
| `evidence`  | `?tab=record`                       |
| `risk`      | `?tab=status&section=risk`          |
| `audit`     | `?tab=audit` (own tab, no redirect) |

`section=` is a new optional query param; when present, scroll to the matching anchor inside the resolved tab on mount. Implementation: `useEffect(() => sectionAnchor && document.getElementById(sectionAnchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), [sectionAnchor])`.

### Type changes

```ts
// in deadline-detail-url.ts
export interface DeadlineDetailUrlOpts {
  obligationId: string
  tab?: ObligationQueueDetailTab // 'status' | 'materials' | 'record'
  section?: 'extension' | 'risk' | 'audit' // anchor within tab
}
```

---

## 4. Tests to update

Files that hard-code the old tab values:

- `obligation-type.ts` tests (collapse to 3-tab assertions)
- `deadline-detail-url.test.ts` (add redirect-table coverage)
- `ObligationQueueDetailDrawer.tsx` test imports of `ObligationQueueDetailTab` literal
- Any Playwright E2E that clicks `[data-tab="readiness"]` etc.

Grep target: `'summary' | 'readiness' | 'extension' | 'risk' | 'evidence' | 'audit'` — every match needs review.

Estimated test churn: 8–12 file edits, mechanical.

---

## 5. Data model — what's still missing (cross-references)

Same `TODO(data)` set as in the original engineering brief — none of this changes with the tab restructure:

- `obligation.expectedRefund` (Status — Refund block per S1)
- `obligation.sourceDocs[]` (Status — S2 OR Record — V3-adjacent; decide on assignment)
- `obligation.priorYearObligations[]` (Extension widget + Record's prior-year ACK link)

Plus net-new for the folded sections:

- `obligationRisk` (Penalty exposure card)
- `auditEvents` already exists; needs `eventType` enum + `permalinkId`; new `listAuditEvents(obligationId, filters)` server endpoint
- `obligation.efileSubmission` (Record — V2 e-file confirmation card)
- `obligation.signOffLedger[]` (Record — sign-offs ledger)
- `obligation.authorityResponses[]` (Record — Authority response strip)

---

## 6. Ship sequence

1. **Schema rename** in `obligation-queue.ts` + `obligation-type.ts` — single PR, mechanical. Includes URL redirect middleware. ~½ day.
2. **Drawer renames** + `<TabsTrigger>` rename + remove `extension` panel. ~½ day. Existing extension content moves into `<ExtensionStatusWidget>` extracted component, rendered conditionally on Status.
3. **`<PenaltyExposureCard>`** built from spec; lands on Status tab. Requires `obligationRisk` contract from prior engineering brief. ~3 days (incl. penalty engine).
4. **`<AuditTrailSection>`** built from spec; lands on Record tab. Requires `listAuditEvents` endpoint + event-type migration. ~3 days.
5. **Materials augmentation** (M1 bulk chase + M3 last-reminder + M4 pending-validation). ~2 days.
6. **Record augmentation** (V2 e-file confirmation + V3 signed PDF + V5 authority response). ~3 days, gated on contract additions.
7. **Status augmentation** (S1 expected refund + S2 source docs + S3 reviewer queue + S4 recent activity trim). ~2 days, gated on contract additions.

Total: ~2–3 sprint weeks for the migration + folding, parallel with the data-contract work tracked in the original engineering brief.

---

## 7. Responsive + sidebar

### Sidebar collapsibility

Already built in `apps/app/src/components/patterns/app-shell.tsx`. The `SidebarCollapseToggle` + `useSidebar` are wired. Pencil frames at 56px and 280px are two STATES of one collapsible component — no architectural drift, no new work needed. If a stakeholder asks whether the sidebar can be collapsed, the answer is yes; this brief does not add or modify that.

### Breakpoint contract

Pencil frames are authored at the **xl baseline (≥1440px)**. The shrink contract for smaller widths is the responsibility of engineering implementation. Detailed table in memory `reference_deadlines_responsive.md`. Summary of per-tab behavior at the four breakpoints (`xl ≥1440 · lg 1024–1440 · md 768–1024 · sm <768`):

- **Hero metric cards (3)** — 3-col → 3-col tighter → 2+1 layout → vertical stack
- **Action cluster** — Assign · Snooze · Start preparing all visible → secondary actions to overflow → bottom-fixed primary CTA + drawer for secondary
- **Workflow strip (6 stages)** — full horizontal → labels shrink → scroll-snap → compact pill + disclosure
- **TabsBar** — all 4 tabs inline → all 4 inline → all 4 inline (still fits) → segmented dropdown selector
- **Materials right rail** — 340px → 280px → stacks below main → stacks below main
- **Penalty exposure 3 numbers** — row → row tighter → 1-col stack → 1-col stack with accordion mitigation
- **Audit toolbar** — single row → single row → 2 rows → search full-width + `Filters ▾` consolidator

Implementation: Tailwind responsive utilities or CSS container queries. No per-breakpoint Pencil authoring.

## 8. What this brief does NOT cover

- The list-page parity workstream on `design/deadlines-design-parity` branch — separate ticket, separate worktree.
- Quick filters dropdown — separate, has its own spec.
- Status taxonomy 10→6 — separate, but should land BEFORE this migration so the new Status tab doesn't render 10 old enum values in its workflow strip.

Sequencing: Status taxonomy migration → THIS migration → data-contract additions → augmentation features.

---

## Where each visual reference lives

| Tab                          | Pencil frame                                                                | Status                    |
| ---------------------------- | --------------------------------------------------------------------------- | ------------------------- |
| Status                       | `C96KdR`                                                                    | rebuild in flight (agent) |
| Materials                    | `HThur`                                                                     | rebuild in flight (agent) |
| Record                       | `u3DRZA`                                                                    | rebuild in flight (agent) |
| Penalty exposure section ref | `s0YOE`                                                                     | done (was Risk tab)       |
| Audit trail section ref      | `K4Go6X`                                                                    | done (was Audit tab)      |
| Extension widget ref         | `VZlY8` body content (the extension-tab body, repurposed as widget content) | done                      |

When agents finish the 3 rebuilds, you have full visual contract for the new tab structure plus the section refs for the folded content. Attach to engineering tickets per the sequence in §6.
