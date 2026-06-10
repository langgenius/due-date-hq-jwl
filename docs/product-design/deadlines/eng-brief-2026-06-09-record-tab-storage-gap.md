# Engineering brief — Record tab depends on a storage primitive we haven't shipped, 2026-06-09

Companion to:

- `docs/product-design/deadlines/eng-brief-2026-06-09-three-tab-migration.md` (defines the 4-tab structure)
- `docs/product-design/deadlines/eng-brief-2026-06-09-deadline-detail-tabs.md` (defines the 18-item tab additions)
- Memory: `reference_record_tab_storage_gap`

## TL;DR

The Record tab visual designs assume we can store and render PDFs (workpapers, signed 8879s, IRS letters). **We can't.** No `attachments[]` schema, no upload endpoint, no e-signature integration. The Materials tab's "uploaded Apr 02" text is `receivedAt` timestamp metadata — the file behind it does not exist.

Three options for engineering, in increasing scope:

1. **Ship the Record tab with audit-trail + timestamps only.** Honest empty-state bar at top. Receipt ledger replaces Workpapers. Sign-offs ledger pulls from audit events. Authority response is a single rejection event row. Ships in ~3 days.
2. **Ship the storage primitive first**, then the Record tab as designed. Adds R2 bucket, `attachments[]` schema, 5 endpoints. ~2 sprint weeks before any Record tab work.
3. **Defer the Record tab entirely** until file storage exists. Less honest about the product gap.

Recommend **Option 1** for the immediate ship and **Option 2** as the queued storage workstream.

## What's real vs fiction

| Item                                                   | Backend                                                                         | Render today? |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------- |
| `obligation.efileSubmittedAt/AcceptedAt/RejectedAt`    | Real, in `obligation-instance.ts`                                               | ✅            |
| `obligation.efileAuthorizationForm` (e.g. 'Form 8879') | Real, same file                                                                 | ✅            |
| `AuditEventPublic` rows                                | Real, `audit.ts` — every state mutation captured                                | ✅            |
| `ReadinessDocumentChecklistItem.receivedAt`            | Real, `readiness.ts`                                                            | ✅            |
| `ReadinessDocumentChecklistItem.receivedByUserId`      | Real, same                                                                      | ✅            |
| `ReadinessDocumentChecklistItem.status` enum           | Real, same                                                                      | ✅            |
| Audit-bundle compliance export                         | Real, `apps/server/src/jobs/audit/package.ts` — pdf-lib + fflate + R2 + SHA-256 | ✅            |
| `obligation.workpapers[]`                              | **DOES NOT EXIST**                                                              | ❌            |
| `obligation.attachments[]`                             | **DOES NOT EXIST**                                                              | ❌            |
| `obligation.authorityResponses[]`                      | **DOES NOT EXIST**                                                              | ❌            |
| Signed 8879 PDF storage                                | No e-signature integration                                                      | ❌            |
| File upload endpoint                                   | None — no presigned URLs, no multipart, no R2 put path for obligation files     | ❌            |
| File download / preview / thumbnail                    | No file means no render                                                         | ❌            |

## Option 1 — Ship with current data (recommended)

### Sections to ship as-is

**E-file confirmation card**

- Source: `obligation.efileAcceptedAt`, `obligation.efileAuthorizationForm`, `obligation.efileRejectedAt`
- States: Accepted (success-soft) · Rejected (destructive) · Pending (warning, awaiting ACK)
- NO link to a submitted PDF

**Receipt ledger** (replaces Workpapers section)

- Source: `readiness.checklist[].filter(item => item.receivedAt != null)`
- Columns: Material name · `receivedAt` · received-by user · status
- NO Download button, NO thumbnail, NO View action

**Sign-off ledger**

- Source: `AuditEventPublic` rows filtered to status transitions and review-stage transitions
- Each row = `actor` + timestamp + `humanizeAuditAction()` label
- NO signed PDF preview

**Authority response row** (singular, not a strip)

- Source: `efileRejectedAt` + `ObligationMarkFiledRejectedInput.authority` + `.reference`
- Render as a single event row, NOT a document gallery

**Generate compliance bundle CTA**

- Source: the existing `apps/server/src/jobs/audit/package.ts` pipeline
- Copy: "PDF bundle of audit events for this obligation. Stored with SHA-256 seal."
- Permission gate: partner / compliance role

### Honest empty-state bar at top of Body

A single muted bar above the first section:

```
$ddhq-bg-subtle fill · $ddhq-text-tertiary 12pt · cornerRadius 8 · padding [10,14]
Content: "Record tab currently shows audit-trail and timestamps. File storage for
workpapers and signed documents is on the roadmap."
```

### What to remove from earlier Pencil designs

Any of these affordances in the existing Record tab visuals MUST be deleted or hidden behind a feature flag for Option 1:

- "Upload workpaper" button
- "Drop files here" dashed-border zone
- "Attach" CTA
- File thumbnail tiles
- "Download original" / "View PDF" row actions
- "Preview signed 8879" links

The designer agent currently working on `u3DRZA` is removing these.

### Estimated effort

Backend: 0 (everything already exists). Frontend: 3 days to bind to existing endpoints, render the 5 sections above, and ship the empty-state bar.

## Option 2 — Ship storage primitive first

In sequence:

1. **R2 bucket for obligation attachments** — separate from the existing audit-bundle bucket. Object key: `{firmId}/{obligationId}/{uuid}/{filename}`.
2. **Schema additions** in `packages/contracts`:
   ```ts
   obligation.attachments[]: {
     id: string;
     kind: 'workpaper' | 'signed_8879' | 'authority_response' | 'other';
     filename: string;
     sizeBytes: number;
     contentType: string;
     uploadedAt: string;
     uploadedByUserId: string;
     r2Key: string;
     downloadUrlExpiresAt?: string;
   }
   ```
   Also: `obligationMarkFiledRejected.authorityResponseAttachmentId?: string` so a rejection event can link to the IRS letter.
3. **5 endpoints** in `obligations.attachments.*`:
   - `requestUpload(obligationId, filename, contentType, kind)` → `{ presignedUrl, attachmentId }`
   - `complete(attachmentId)` → marks finalized, writes audit row
   - `list(obligationId)` → paginated read
   - `requestDownload(attachmentId)` → presigned read URL, short TTL
   - `delete(attachmentId)` → soft-delete with audit
4. **Frontend uploader component** — drag-drop zone, retry on 5xx, progress, error states. Reusable across Record tab and Materials tab Outstanding rows ("Replace file" overflow action).
5. **Then** ship the Record tab visuals as originally designed.

### Estimated effort

Backend: ~6 days for R2 plumbing + 5 endpoints + audit wiring + per-firm quota. Frontend: ~4 days for uploader + integration on Record tab. ~2 sprint weeks total.

## Option 3 — Defer Record tab

Don't ship a Record tab at all until storage exists. Reduces the deadline detail to 3 tabs (Status · Materials · Audit). Less honest about the product gap; users will ask "where do my workpapers go?" and we point at the roadmap.

Not recommended — Option 1 ships the affordances we can deliver without lying.

## E-signature workstream (separate)

The signed 8879 use case is **not** unblocked by Option 2 alone. It also requires:

- Vendor decision (DocuSign, Adobe Sign, AssureSign, or internal)
- Webhook for signed-status updates
- PDF rendering of completed signature
- Workflow integration: which status transitions require signature first

Treat as a separate ~3 sprint week workstream after storage primitive lands.

## Where each visual reference lives

| Asset                                    | Location                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Pencil Record tab REBUILD (being scoped) | `duedatehq_work.pen` frame `u3DRZA`                                                                    |
| Pencil Materials tab REBUILD             | `duedatehq_work.pen` frame `HThur` (receipt timestamps are honest as long as no Download CTA is shown) |
| Memory: storage gap                      | `reference_record_tab_storage_gap`                                                                     |
| Memory: tab additions spec               | `reference_deadline_tab_additions_spec`                                                                |
| Memory: workflow cascade                 | `reference_workflow_state_cascade`                                                                     |

## Decision needed from product

- Option 1 vs Option 2 prioritization — does file storage block the Record tab ship, or do we ship the audit-trail Record tab now and add files later?
- Per-firm storage quota and pricing tier impact
- E-signature vendor selection (separate workstream)

This brief should be enough for engineering to scope a ticket without re-deriving the gap.
