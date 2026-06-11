# UX copy batch 14 — settings/calendar/audit + gap-pass alerts + migration leftovers (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md §2.7 leftovers + §2.9–§2.12.

- practice.tsx: validation shortened to the canonical "Practice name needs at least 2 characters."; "Note:" officialese dropped from the offset warning.
- settings.profile: leave-practice consequence → "Your practice's data is kept for 30 days, then permanently deleted. This can't be undone." (was "permanently destroyed").
- billing/audit permission gates → the canonical gate shape: "Only {roles} can…" + one ask-the-owner sentence.
- calendar: "will silently stop syncing" → "will disconnect — the old URL stops working."; bare "Disable" → "Disable feed".
- audit KPI captions de-shorthanded ("filed or e-filed", "logins and exports", "auto-recorded and manual decisions", …).
- low-confidence badge tooltip: 3 hedging sentences → "AI extraction confidence below 50%. Verify the extracted details against the source before applying."
- AlertReadinessStatus: "Needs deadline selection" → "Select deadlines before applying"; "…before Apply is enabled" → "Confirm the due date and select deadlines to apply." AffectedClientsTable missing-date "Unknown" → "Not yet set".
- Migration leftovers: SSN notice tightened to 3 sentences; Step 2 heuristic fallback drops "by their names…look off"; "~5 minutes" → "About 5 minutes"; readiness portal error → "This link is no longer active. Ask your CPA to send a new one."

Deliberately skipped: the app-shell system-status conditional frame (design decision, not copy) and the 2FA card's "Disable" (its confirm dialog already names the action). Tests: 99 passing across all touched areas.
