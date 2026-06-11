# UX copy batch 6 — alerts engineering jargon (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md, S3 + §2.3 + gap-pass §2.12.

The backend's vocabulary was visible in the alert decision toasts and error descriptors. CPAs don't write, commit, or queue — they apply, undo, and get told what happens.

| File | Before | After |
|---|---|---|
| AlertDetailDrawer ×2 | "Audit + evidence written. Undo within 24h." | "Recorded in the audit log. Undo within 24 hours." |
| AlertDetailDrawer | "After that, the change is committed." | "After that, it can't be undone." |
| AlertDetailDrawer | "Notifications queued for {roles}." | "Review request sent to {roles}." |
| AlertDetailDrawer | toast "Confirm the new date…" (collides with the Confirm button) | "Complete the new date and deadlines before applying" |
| error-mapping.ts | "…can apply alert changes." | "…can apply alerts." |
| error-mapping.ts | "The 24h undo window has expired for this alert." | "The 24-hour undo period has passed for this alert." |
| error-mapping.ts | "This Alert is closed and cannot be sent for review." (mid-sentence capital) | "This alert is closed and can't be sent for review." |
| error-mapping.ts | "This alert is review-only and does not apply due-date overlays." | "This alert is review-only — no due date will change." |
| needs-attention-card.tsx | "{n}% conf" (no column header on /today to define the abbreviation) | "{n}% confidence" — the /alerts row keeps the short form, where its meter context defines it |

Alerts + dashboard suites pass (103). Note: "The change couldn't be written." was already fixed by the parallel detail-drawer de-dup pass (af50c0bc) before this batch reached it.
