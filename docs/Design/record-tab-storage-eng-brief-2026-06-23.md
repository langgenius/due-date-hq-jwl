# Record-tab file storage — engineering brief

**Date:** 2026-06-23 · **Status:** deferred (backend build, not started)
**Why this doc:** the Record tab on `/deadlines/[id]` is the one remaining
"deferred item" in the UX backlog that is a **backend gap, not a UX fix**. The
UI is already honest (empty states, no fake upload affordances); what's missing
is the storage layer behind it. This brief is what eng needs to unblock the real
Record tab. Grounded in current code (verified 2026-06-23).

## Current reality (verified)

**Real today** — safe to render, already wired:
- E-file lifecycle timestamps + form: `obligation.efileSubmittedAt /
  efileAcceptedAt / efileRejectedAt / efileAuthorizationForm`
  (`packages/contracts/src/obligation-instance.ts`).
- The full audit trail (`AuditEventPublic`, `packages/contracts/src/audit.ts`).
- Materials received-state: `ReadinessDocumentChecklistItem.{status, receivedAt,
  receivedByUserId}` (`packages/contracts/src/readiness.ts`) — a timestamp of
  "marked received", NOT a stored file.
- The audit-bundle compliance export pipeline is REAL: pdf-lib + fflate + R2,
  SHA-256 sealed (`apps/server/src/jobs/audit/package.ts`).

**Fiction — correctly NOT rendered** (no schema, no storage):
- `obligation.attachments[]` / `workpapers[]` / `authorityResponses[]` — none
  exist in `packages/contracts`.
- Signed 8879 PDF — no e-signature integration, no storage.
- Any upload / "View PDF" / "Download original" affordance — no presigned URL,
  no multipart endpoint, no R2 put path for per-obligation files.

The Record tab today shows the honest empty state ("No workpapers attached to
this deadline yet" — `ObligationQueueDetailDrawer.tsx`) + the e-file card +
audit trail. Nothing fictional renders. **No UX change is needed; this is purely
the backend build that would let the empty sections fill.**

## What engineering must ship (in sequence)

1. **Storage primitive.** A new R2 bucket for obligation attachments (separate
   from the audit-bundle bucket). Presigned upload + download URLs. Object-key
   scheme `{firmId}/{obligationId}/{uuid}/{filename}`. Enforce per-firm
   isolation in the key + the presign authz.
2. **Schema** (`packages/contracts`):
   - `obligation.attachments[]: { id, kind: 'workpaper' | 'signed_8879' |
     'authority_response' | 'other', filename, sizeBytes, contentType,
     uploadedAt, uploadedByUserId, r2Key, downloadUrlExpiresAt }`
   - `obligationMarkFiledRejected.authorityResponseAttachmentId?: string` — link
     a rejection event to its letter PDF.
3. **Endpoints** (oRPC, audit-writing):
   - `obligations.attachments.requestUpload(obligationId, filename, contentType,
     kind)` → presigned URL + attachmentId
   - `obligations.attachments.complete(attachmentId)` → finalize + audit row
   - `obligations.attachments.list(obligationId)` → paginated read
   - `obligations.attachments.requestDownload(attachmentId)` → presigned read URL
   - `obligations.attachments.delete(attachmentId)` → soft-delete + audit
   - Gate writes on the existing `OBLIGATION_STATUS_WRITE_ROLES`.
4. **E-signature integration** — separate workstream, needs a vendor decision
   (DocuSign / Adobe Sign / internal-only). Out of scope until the storage
   primitive lands.

## UI work once unblocked (small)

The Record sections already have their honest empty states; turning them on is
mostly: a real upload control in the Workpapers section, a download affordance on
received-material rows, and binding the rejection event to its
`authorityResponseAttachmentId`. No redesign — the layout already anticipates the
data.

## Recommendation

This is a feature build (R2 + schema + 5 endpoints + e-sign vendor decision), not
a polish item — it should be scoped as its own backend ticket with product
sign-off on the e-signature vendor. Until then the Record tab stays honest as-is.
