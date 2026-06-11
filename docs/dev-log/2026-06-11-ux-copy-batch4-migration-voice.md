# UX copy batch 4 — migration wizard voice (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md, §2.7 + S3.

The import wizard is the trust-building moment (`.impeccable.md`): a committed-but-skeptical CPA under tax-season pressure. It was speaking engineering ("rows", "data", "cleanup") and apologizing ("Please"). Fixes:

## rows → clients (the user imports clients, not rows)

- "That file has no data rows. Add a header and at least one row, then re-upload." → "That file is empty. Include column names and at least one client, then re-upload."
- "We found a header, but no data rows. Add at least one client row to continue." → "We found column names but no clients. Add at least one client to continue."
- "up to 1,000 rows · 5 MB" → "up to 1,000 clients · 5 MB"

## Voice

- Paste placeholder "Paste here — any shape, we'll figure it out…" (shrug) → "Paste your client list — any format. Include column names if you have them."
- "File is larger than 5 MB. Please trim or split the export." → no "Please": "…Trim or split the export, then re-upload."
- Step 2 fallback "…Please map columns manually before continuing." → "…Map your columns below to continue."
- Step 3 "clean draft" / "No values needed cleanup" (implies dirty data) → "standardized version" / "No values needed changes".
- WizardShell discard dialogs ×2: "…will be lost." → "…will be discarded."

## Success / preview framing

- SuccessModal "Nothing will email a client until you turn the matching rule on." (double negative at the success moment) → "No emails go out until you turn the matching rule on — you control every send."
- "Confirm state calendars before their deadlines fan out" → "…before their deadlines generate" (S3 jargon).
- Step4Preview "This import can be undone for 24 hours and keeps an audit record" → "Undo this import for 24 hours — the audit log records every change"; "Audit log captures every AI decision" (anthropomorphic) → "The audit log records every mapping and value change".

Step4Preview test assertion updated to the batch-2 rule-review copy it asserts; full migration test suite passes (66/66). Catalog regen deferred to the end-of-series catalogs commit.
