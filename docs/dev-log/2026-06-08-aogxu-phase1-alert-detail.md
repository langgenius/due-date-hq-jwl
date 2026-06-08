# Alert detail → Aogxu parity, Phase 1 (UI, real data only)

Date: 2026-06-08

Pencil node Aogxu parity for the alert detail. Phase 1 = everything the existing
contract data already supports; NO migration, NO fabricated facts. (Phase 2 =
Team notes full-stack + migration; Phase 3 = AI extraction for relief/deadline-
types/opt-in/penalty.)

## Changes (apps/app/src/features/alerts/)
- **"What this means for your practice"** — new `PracticeImpactSection` in
  AlertDetailDrawer.tsx, rendered after Extracted facts; gated to
  `due_date_overlay` + both dates + `matchedCount > 0`. Two REAL-data bullets:
  (A) "{N} clients gain ~{months} months of breathing room" (matchedCount +
  newDueDate−originalDueDate, gated to a forward shift); (B) "Audit-safe: relief
  is automatic for {county/jurisdiction} addresses — no opt-in form needed". The
  payments/penalties bullet is intentionally omitted (Phase 3 data).
- **Affected-clients OLD/NEW columns** (AffectedClientsTable.tsx): split the
  stacked due-date cell into "Old deadline" (line-through) + "New deadline"
  columns; checkbox/batch/Confirm untouched.
- **Extracted-facts subtitle**: header now shows "AI parsed these from the source
  — verify before Apply" inline; removed the Astroid AI badge here AND from the
  DeadlineChangeCard hero (Aogxu has no badge there). Deleted the now-unused
  AiExtractedSignal helper.
- **Confidence section** renamed "How confident we are · where this came from"
  with the Aogxu 2-col layout (tier % + explanation left; source/published/audit
  right). Real confidence/source/publishedAt.

## Verify
tsgo clean; lingui extract validated; no console errors. Visible parts confirmed
on /alerts?alert=…3001. The matched-client sections (What this means / affected
table) are correctly hidden for alerts with no matched clients.
