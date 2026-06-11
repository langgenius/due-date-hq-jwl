# UX copy batch 3 — terminology locks (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md, finding S6 (the consistency lock table).

One concept, one name. This batch applies the highest-traffic locks:

## practice (never "workspace")

- `route-summary.ts` — document title "Workspace settings | DueDateHQ" → **"Practice settings"** (this one lived in the browser tab).
- `settings.tsx` — hub description "Workspace configuration for this practice — …" → "Practice settings — …".
- `CommandPalette.tsx` — "Workspace configuration hub — Practice, team, billing, automation." → "Practice settings hub — team, billing, automation."
- `apps/server/src/i18n/messages.ts` — the zh invitation email subject said 工作区 ("workspace") → "加入 DueDateHQ 上的 {organizationName}", mirroring the EN subject's structure.

## The locked 4-tab contract (Status · Materials · Record · Audit)

`ObligationQueueDetailDrawer.tsx` — tab 1 said "Status" on the page but "Summary" in panel/sheet mode; tab 3 said "Record" on the page but "Evidence" in panel/sheet mode. Both forks removed — the labels are now mode-independent. (Internal `value="summary"` tab keys unchanged.)

## invitation link (never "magic link")

`members-page.tsx` ×3 (invitations note, cancel-invite dialog, send-invite helper) and `login.tsx` "Already have a magic link?" → "Already have a sign-in link?" (that one is the OTP sign-in link, not an invitation).

## Undo (the verb for time-boxed reversal)

- `SuccessModal.tsx` / `ImportHistoryDrawer.tsx` — "Revert batch" / "Revert batch ({n})" → **"Undo import"** / "Undo import ({n})"; toast "Import reverted" → "Import undone".
- `AlertsListPage.tsx` — dismiss-dialog "You can reopen them from the History tab." → **"Restore them from the History tab."** (Restore = bring back a dismissed alert.)

No tests or e2e selectors referenced the old strings (verified). Catalog regen deferred to the end-of-series catalogs commit.
