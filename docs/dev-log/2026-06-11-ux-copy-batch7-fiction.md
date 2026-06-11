# UX copy batch 7 — fiction removals (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md, S4 (no fiction in copy).

Copy must describe only behavior that exists:

- **reminder-template-editor-page.tsx** — the Body field's "· supports markdown" hint claimed a capability the presentational (disabled) toolbar doesn't deliver. Hint removed; the TODO(data) comment for wiring the toolbar stays.
- **notification-preferences-page.tsx** — Push row's hardcoded "DueDateHQ for iOS · 2 devices registered" → "Mobile push is not available yet." (the row is disabled; the copy now says why). Slack row's "Connect your Slack workspace to receive @mentions and digests there." (integration not modeled) → "Slack integration is coming soon."
- **reminder-templates-page.tsx** — "Edit per tax type or per client tier." promised fields that don't exist on the contract → "Customize the subject and body."
- **splash.tsx** — the dead "Quick tour (90 sec)" / "What's new in 6.7" ghost buttons (wired to nothing) are removed, with a comment to restore them only when real destinations exist.

Deliberately deferred: the disabled "Insert variable" chip and "Request export" button — both are affordance-level design decisions (hide vs. explain), better taken in a design pass than a copy sweep.

Reminders + notifications tests pass (6/6). The 10 rules.library test failures observed during this batch pre-date it — they come from in-flight rules WIP in the working tree (missing `listReviewTasks` mock), untouched by this commit.
