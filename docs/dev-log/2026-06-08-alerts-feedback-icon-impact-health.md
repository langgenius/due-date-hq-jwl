# /alerts — page-feedback: source-health signal, unified Users icon, HIGH-only impact badge

Date: 2026-06-08

Three actionable items from an /alerts feedback pass (the rest were
positive notes — the pill-wrapped source link, the hover-only Review
button, and the "Needs Action" status copy — left as-is).

## #1 — Source-health signal on the Sources chip (`routes/alerts.tsx`)

Feedback: _"where is it showing it is all working?"_ — the `Sources ·
Federal + 50 states + DC` selector chip gave no sign that monitoring was
actually healthy.

- Added a **live health dot** to the chip: green when every enabled source
  reports `healthy`, amber when one or more is degraded/failing/paused,
  neutral gray while the health query is still loading (so it never falsely
  reads green). A tooltip carries the count — "All N monitored sources
  operational" / "K of N sources need attention".
- Data comes from the same `listSourceHealth` query the list page polls
  (React Query dedupes on the shared key), so there's no extra request.

## #4 — Unified Users icon on every affected-clients line

Feedback (on the AlertCard's `Users` icon): _"love this icon, apply to
all."_

- `PulseAlertRow` (the /alerts list rows) and the dashboard
  `NeedsAttentionCard` both used `Building2` on their "Affects N clients"
  line. Swapped both to `UsersIcon`, matching the AlertCard. One
  clients-affected glyph across all three surfaces now.

## #5 — HIGH-only impact badge on the form-revised card (`PulseFormRevisedCard.tsx`)

Feedback: _"give High Impact Alerts the HIGH IMPACT badge."_ — the card
always rendered an impact pill, so quiet form updates wore a noisy "LOW
IMPACT" badge.

- Gated the pill to `severity.id === 'high'` only, matching AlertCard's
  rule ("LOW / MEDIUM render nothing; absence IS the signal"). Only
  genuinely high-impact form alerts now carry the red HIGH IMPACT chip.

Note: the long-running 5177 dev server is serving a stale build of the
`/alerts` route (it still shows the pre-`1bf1939d` "Monitoring" header), so
these were verified by typecheck + source inspection rather than that
preview. The user's own browser is on the current build.
