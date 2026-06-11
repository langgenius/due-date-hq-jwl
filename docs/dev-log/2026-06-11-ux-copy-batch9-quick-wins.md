# UX copy batch 9 — auth/settings/admin quick wins (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md, §2.1/§2.9/§2.10.

| File | Before | After |
|---|---|---|
| login.tsx ×2 | "Redirecting to Google/Microsoft…" (plumbing narration) | "Signing in with Google/Microsoft…" |
| onboarding.tsx | "Please enter at least 2 characters." | "Practice name needs at least 2 characters." |
| onboarding.tsx | "A few details the engine needs before it can schedule anything." | "A few details so DueDateHQ can schedule your deadlines." |
| settings.profile + account.security ×4 | "sensitive production actions" (ops-speak) | "to change rules and firm settings" |
| settings.profile | Preferences subtitle "How the product feels for you" (poetic filler) | "Language, date, time, and week-start formats" |
| billing.tsx | "Provider hosted" | "Handled by Stripe" |
| billing.success.tsx | "The payment provider hasn't confirmed… This usually clears within a minute." | "Stripe is still confirming the subscription — this typically takes under a minute." |
| members-page.tsx | role note "owner read-only · self read-only" | "You can't change the owner's role or your own." |
| members-page.tsx | confirm button "Remove from practice (1)" (mystery count) | "Remove from practice" |
| audit-log-page.tsx | search placeholder "Search actor, entity, action, reason" | "Search by person, item, action, or reason" |
| audit-log-page.tsx | card title "Event stream" (collides with the page's own name) | "Events" |
| workload-page.tsx | "No open deadlines match the workload window." + hardcoded "next 7 days" body (window is 7/14/30) | "No deadlines due in the selected window." + "Workload updates as deadlines approach. Add clients, or widen the window above." |

Affected tests pass (24/24).
