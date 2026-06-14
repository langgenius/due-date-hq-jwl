# 2026-06-14 — Alert detail header: declutter + colour the active jurisdiction

Yuqi: "header is so messy" + "give colour to the state badge when active" +
"the change chip — lower case, medium."

## Header declutter (the real mess)
The "Awaiting your decision" chip in the meta row DUPLICATED the lifecycle
strip's "Your decision" node added right below it — two status indicators, one
crowding the meta and forcing it to wrap to a second line. Removed the chip
(and its now-dead `AwaitingDecisionChip` helper). The meta is now one clean
line: identity (seal · code · name · change-kind) left, source · date right.

## Colour the active jurisdiction
`JurisdictionLabel` gains `active?: boolean` — when the alert is in the
actionable queue (`isActiveAlert`), the jurisdiction CODE reads in the accent
(a live colour cue beside the already-colour seal) instead of all-gray. Review
alerts + the deadline detail (default false) stay neutral.

## Change-kind chip → sentence-case medium
"DEADLINE SHIFTED" (tracked caps tertiary) → "Deadline shifted" (14/medium
secondary) — calmer, matches the jurisdiction name's weight on the same line.
(The label text was already sentence-case via changeKindLabel; dropped the
`uppercase`/tracking and lifted the tone.)

## Verify
tsgo clean. Live on 5173: header one line, FED in accent (active alert),
"Deadline shifted" sentence-case medium, no "Awaiting your decision" chip in
the meta.
