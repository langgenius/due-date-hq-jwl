# 2026-06-14 — Alerts: change-kind consistency + readable grid + tighter rhythm

Yuqi: "Protective claim window is different on list vs detail … change details
still ugly and hard to read … TOO LOOSE."

- **Change-kind consistency**: list row + rail now render the change-kind
  sentence-case medium secondary ("Deadline shifted"), matching the detail
  hero exactly. One treatment across all three surfaces (was tracked-caps
  muted on list/rail).
- **Fact grid readable**: 4-col → **2-col**. At the pane width 4 cols squeezed
  values to ~190px, wrapping "COVID disaster relief postponements" to ragged
  2-line cells; 2 cols give each value a single line → clean key→value pairs.
  Filler-cell math updated to mod-2.
- **Less shattered**: inter-section rhythm 40px → **32px** (gap-8) — 40px of
  pure whitespace floated as islands. Legal-uncertainty drops its left rule →
  a quiet inline caption, so Change details reads as ONE section (accent
  action → gray data → quiet caveat) instead of three differently-styled
  fragments.

Verify: tsgo clean; live on 5173 — grid 2-col, change-kind tt:none everywhere.

(Scroll-unify — the dead-zone over the non-scrolling hero — is the next,
separate commit.)
