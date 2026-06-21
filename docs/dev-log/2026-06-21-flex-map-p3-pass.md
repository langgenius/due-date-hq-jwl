# Flex-map P3 + deferred second-pass — 2 more verified, the rest held

_2026-06-21 · "yes please" — finish the P3 pass + tackle the deferred-but-real ones_

## The second pass (12 items)

A 4-agent workflow re-verified the 10 un-checked P3 items **plus** the two
deferred-but-real ones (img-070, img-086) against the live code. Verdict spread:

| Verdict | Count |
|---|---|
| clean-buildable | **1** (img-123) |
| conflicts-decision | 4 (img-015, img-047, img-091, img-175) |
| lateral-churn | 3 (img-036, img-093, img-070) |
| fiction | 2 (img-053, img-149) |
| already-covered | 1 (img-019) |
| canon-risk | 1 (img-086) |

Same story as the P2 pass: against a mature codebase, deep verification collapses
"buildable" ideas. **1 of 12** survived clean.

## Built + verified live

- **img-123 — StatusMark glyphs in the bulk Set-status menu.** The
  `FloatingActionBar` Set-status dropdown listed the 6 states as bare text while
  the per-row scope dropdown already shows status marks. Added `<StatusMark>` +
  `STATUS_ICON_COLOR` (both already exported + imported) to each menu item —
  `STATUS_ICON_COLOR`'s own doc says it's "used on the menu surface (dropdown
  rows)", so this closes a consistency gap with the canonical primitive. Verified
  live: all 6 items now render a status glyph.
- **img-086 (safe slice) — future stages ghosted on the milestone strip.** The
  agent confirmed the *real* deficiency (the `PathToFilingSummary` strip is
  `grid-cols-6` equal-width, which the asymmetric-stage-attention canon refuses)
  but flagged the *proposed* fix as canon-risk: the full horizontal→vertical
  reorient is an unauthorized axis flip (no Pencil frame) bundled with a
  speculative trigger-phrase copy layer. The canon's "future ghosted at ~0.5
  opacity" clause, however, is directly applicable and safe: upcoming columns now
  carry `opacity-55` so the active + entered stages hold the visual weight —
  **without** column-width compression (which would truncate the full stage
  labels the strip deliberately shows). Verified live: active stage opacity 1,
  all 5 upcoming stages 0.55, labels intact. The width-asymmetry remainder is
  left for a Pencil-frame design pass, per the deadlines-responsive contract.

## Held (not built — with reasons)

- **img-070** (setup tick-bar) — *lateral-churn*: onboarding B/C/D (commit
  `4c9cc9bc`) is deliberately mutually-exclusive full-page states; a persistent
  coexisting tick-bar is additive churn that needs a new sourceCount fetch purely
  for decoration + fights one-purpose-per-panel.
- **img-015** jurisdiction tonal tiers — JurisdictionChip's JSDoc bans tone fills
  (§4.10: reference tags are neutral outline).
- **img-047** compact mobile row — conflicts the today-responsive overflow-x-auto
  contract.
- **img-091** auto-unblock hatching — the card is a calm system note; amber
  hatching raises urgency tone the state doesn't have.
- **img-175** checklist fraction on the strip — `PathToFilingSummary` takes no
  readiness props, and the fraction already lives in the Materials tab.
- **img-036** ValueDiff wire mode — no confirmed caller; inline/compact cover the
  real use cases.
- **img-093** sources two-card empty — needs a host-element restructure
  (TableCell → prominent surface) to use ghost-cards; not a drop-in.
- **img-053 / img-149** — fiction: no rule-id field on audit `reason`; no
  jurisdiction field on `DashboardTopRow`.
- **img-019** Focus mode / StatBand on client detail — already-covered
  (ClientSummaryStrip is the deliberate detail chrome).

## Running tally across both passes

124 high-value opps adjudicated + second-passed → **4 genuine builds shipped**
(img-018, img-051, img-123, img-086-slice). Everything else was already-built,
fiction, canon-conflicting, redundant, or a lateral change. The value was the
rigor, not the volume.

## Verification

tsgo 0 · build green · no new i18n (reuses existing labels; ghosting is CSS) ·
img-123 + img-086-slice both confirmed live on /deadlines.
