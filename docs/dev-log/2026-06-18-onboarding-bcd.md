# Onboarding gaps B / C / D

_2026-06-18 · Yuqi approved · from the onboarding-design audit_

The remaining three onboarding gaps after proposal A (first-run /today) shipped.

## B — "No deadlines yet" nudge on /today (gap #2)

A firm that imported clients but never activated rules generates no deadlines, so
`/today` read a misleading "all clear." Added a third first-run branch: when
clients exist but `rules.coverage` sums to **zero active rules**, `/today` shows a
prominent `EmptyState` — "No deadlines yet · Activate rules … DueDateHQ generates
every deadline automatically" → "Set up rules" (`/rules/library`).

- Signal is **precise, not a proxy**: `activeRuleCount` summed across coverage
  rows distinguishes "never set up rules" from a genuinely-done firm (which HAS
  rules) — so no dismiss is needed and it self-resolves the instant the first
  rule generates a deadline. `rules.coverage` shares the sidebar's cache (no
  extra fetch). Three-way branch: no clients → A hero · clients-but-no-rules → B
  · otherwise → the normal sections.

## C — forward-looking next step on /splash (gap #4)

The once-a-day welcome-back recap only looked backward. Added a cheap clients
probe (limit:1, shared cache); when the firm still has no clients, an accent
"Next: import your clients to start tracking deadlines" strip points forward. The
action itself lives on `/today` (proposal A's hero), reached via the existing
"Go to Today" button — splash just signals it. (Splash is standalone, outside the
wizard provider, so it points rather than opens.)

## D — honest sample data (gap #3)

Investigated: the mechanism was **already honest** — `clients.seedSample` is a
real mutation, sample rows render a `Badge "Sample"` per row, and "Remove sample
data" already exists. The only dishonest bit was the chip copy: "Try a 30-second
tour with sample data" promised a guided _tour_ it doesn't deliver. Changed to
"Explore with sample data" — accurate to what happens (loads removable, badged
sample clients). No mechanism change needed.

## Verification

- `tsgo` 0; `vp check` clean; 543 app tests pass; build green; 4 new strings
  translated to zh-CN; `compile --strict` ok.
- B uses the proven `EmptyState` prominent variant; C uses the existing
  accent-strip pattern; D is a one-string copy change to the proven
  `ClientsEmptyState`.
- Live routes (/today, /splash, /clients first-run) need a no-clients firm + the
  local Worker (demo-login 502 here) — not visually verified in-context, same
  limitation as the other gated surfaces; flagged for a real-backend check.

Onboarding audit status: proposals **A, B, C, D all shipped**; the measurement
funnel (instrument activation rate / time-to-activation / drop-off) remains as
analytics work.
