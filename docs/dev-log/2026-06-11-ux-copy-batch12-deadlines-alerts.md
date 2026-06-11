# UX copy batch 12 — deadlines & alerts remainder (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md §2.3 + §2.4 leftovers.

Deadlines (drawer + panels + dialogs + the obligations.tsx twins of the same panel code):
- "Mark filed" (row action) → "Mark as filed" (matches the drawer footer).
- Bare "Assign" hero button → "Assign owner".
- Materials headlines unified: "All {n} items in" / "All {n} items in workpapers" (3 sites + 2 twins) → "All {n} items received".
- Tense drift "Requested from client / Sent {n} items — awaiting client response." → "Awaiting client response / Requested {n} items from the client." (state first, action second; both files).
- "Loading deadline detail…" (2 sites) → "Loading…" (no process narration).
- Input-request dropdown empty item "No owner or partner available" no longer duplicates the warning description below it → "No eligible recipients".
- Validation "Reason is required." (3 sites) → "Add a reason."; badge "Email will be queued" → "Email queued".

Alerts:
- Bulk toast "Dismissed {n} · {m} couldn't be dismissed" → "Dismissed {n} — {m} couldn't be dismissed" (sentence, not metadata).
- Activity event meta "Apply, review, or dismiss to resolve." removed — it restated the three visible buttons.
- The "Pending your review"/"Awaiting your decision" consolidation was already done by a parallel pass; only a stale comment mentions the old label.

Error state "Couldn't load deadline detail." kept as-is — its inline Retry button is the recovery, so the audit's suggested extra sentence would be noise. Tests: obligations 55/55, alerts suites green.
