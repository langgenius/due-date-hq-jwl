# Alert detail — source-health banner (Pencil c5ArV1)

_2026-06-15_

The `source_status` variant (Pencil c5ArV1, e.g. "TX Comptroller RSS feed
degraded") rendered through the generic path, but the degraded-feed signal
was buried as a quote at the bottom of the Source section. c5ArV1 makes the
monitoring-reliability state the hero concern.

## What

A warning-tone source-health banner at the TOP of the detail body (first
child, above the numbered Change section), for
`changeKind === 'source_status'` and `sourceStatus !== 'source_revoked'`:

- **Title** "Monitoring degraded — verify at the source" — a source*status
  alert has nothing to \_apply*; the action is to go check the source.
- **Body** names the real source + jurisdiction and says the automated feed
  is delayed, so recent changes may be uncaptured — check the source until
  monitoring recovers.
- **Re-verify line** reflects the REAL `reverifyRuleIds`: a `<Plural>` "N
  monitored rules cite this source — re-verify below" when there are any (the
  existing `ReverifyRulesSection` renders the list), or a plain "No monitored
  rules cite this source, so nothing needs re-verifying" when there are none.
  No fabricated counts (Yuqi: truthful banner, no fake rules) — the demo TX
  alert legitimately has 0 (the firm has no TX clients).
- **Primary action** `Open source` (AlertAction slot, top-right) → the real
  `sourceUrl`.

Tone is `warning`, deliberately distinct from the `destructive`
`source_revoked` banner (degraded = a watch state, not "no longer trusted").

## Verified

Live on alert 3011 (TX Comptroller): banner renders at the top with the real
source/jurisdiction, the truthful no-rules line, and the Open-source button.
`tsgo` clean · `vp check` clean · `lingui compile --strict` 0 missing (4 new
strings translated to zh-CN).
