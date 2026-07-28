# duedatehq: Ohio CAT quarterly schedule + state-page title exact-match

2026-07-28

## Why (GSC, 28d)

Striking-distance cluster: `oh cat due dates 2026` pos 8-16, `nebraska tax deadline` pos 9,
`north dakota tax deadline` pos 9; /states/ohio 88 imp at pos 34. State-page titles read
"Tax Deadline Monitoring" — query phrasing is "[state] tax deadline(s)".

## What

1. **Ohio CAT** (STATE_DEADLINES.ohio): full quarterly schedule — Q1 May 10 / Q2 Aug 10 /
   Q3 Nov 10 / Q4 Feb 10 — plus 2025+ $6M TGR threshold and annual-filing elimination
   (2024). Verified live on the Ohio DOT Due Dates page (CAT Q accordion, rendered via
   browser 2026-07-28); sourceHref now deep-links that page. llms-full.txt auto-syncs.
2. **All 51 state titles**: `{State} Tax Deadlines (2026) — Monitored at the Source |
DueDateHQ` + description rewritten to lead with the deadline promise. Exact-matches the
   query family across every state page (michigan pos 13.8 with a click already — the
   whole cluster benefits).

Verified: build OK, NE/ND/OH titles render, CAT dates EN+zh + source link, 24/24 tests.

## Queue (not this commit)

payroll cluster rebuild (344 imp — needs Pub 15 deposit-schedule fact-check), form-page
question-phrasing titles, weekend/holiday shift page.
