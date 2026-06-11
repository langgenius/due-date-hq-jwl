# UX copy batch 8 — broken and hand-rolled plurals (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md, S5.

Hardcoded English plurals read as bugs at n=1 and break zh (interpolated ternaries never reach the catalog). Per the lingui footgun note, everything goes through `<Plural>` in JSX, or two fully-translatable `t` branches where a plain string is required (title/aria/toast).

- **audit-log-table.tsx** — "{n} events" (wrong at 1) → `<Plural one="# event" other="# events">`.
- **members-page.tsx** — "{ownerCount} owner · {managedCount} managed" (wrong above 1) → two `<Plural>`s.
- **rule-review-prompt.tsx** — `jurisdiction{count === 1 ? '' : 's'} need…` (untranslatable, and "1 jurisdiction need" was broken grammar) → `<Plural one="# jurisdiction needs a quick review" other="# jurisdictions need a quick review">`.
- **PulseAlertsMap.tsx** — tile `title`/`aria-label` were raw untranslated template literals with ternary plurals → translated two-branch `t` strings (component gains the `useLingui` hook).
- **StateTilegram.tsx** — same pattern in `aria-label` → two-branch.
- **sources-tab.tsx** — toast "Surfaced {n} still-open alert(s)…" → two-branch.
- **generation-preview-tab.tsx** — "REMINDER READY — {n} deadline, will fire…" (singular/plural mismatch mid-sentence) → two-branch.

Deliberately kept: the inbox bell's "{n} unread" — "unread" is invariant as an elliptical count ("5 unread"), no plural error exists there.

Tests for all touched areas pass (46/46).
