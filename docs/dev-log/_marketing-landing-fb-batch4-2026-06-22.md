# Marketing — landing feedback batch 4 (simplify pass)

**Date:** 2026-06-22. 17 Agentation notes → simplify/clean-up. Multi-agent workflow
(one agent per component) + a direct Security revert + a direct Surfaces feed fill.
All `--m-*` tokens, EN+zh in sync.

- **Security (#17)** — reverted to the previous (cleaner) merged Trust+Security
  version; the Phase-1 rework (verification check-lines + extra eyebrows) is undone.
- **Surfaces (#1,2,5,6)** — removed the graph-paper grid background (plain surface);
  tightened panel padding + top-aligned; made "Apply & audit" self-explanatory (apply
  button + a "Logged" pill + plain-language trail); constrained the apply caption to
  ~2 lines. Then the lead "ALERT FEED" got a real recent-activity list (4 quiet rows)
  so the tall panel reads as a feed instead of an empty void.
- **ScrollRail (#3,4)** — removed the "NN / 07" counter; stripped the spine line, the
  always-on dots, the glow halo + scale. Now a calm flush list: quiet labels, one
  small accent dot + ink label on the active item.
- **Notice (#7,8)** — tabs → an obvious segmented control: a "See another example"
  cue + swap glyph, status dots per tab, a clean white selected pill on a recessed
  track. ARIA tablist (roles/aria-controls/roving tabindex/arrow keys) preserved.
- **Sources (#9-12)** — back to normal contained width (no full-bleed, no borders);
  the tilegram is now a calm coverage grid (light neutral tiles + one small cyan
  "live" dot each, no navy wall); the scan is a subtle breath; feed chips neutralised
  so navy/cyan are restrained accents only.
- **Compare (#13-16)** — lead trimmed 4→2 sentences; all 11 left-column labels cut to
  short scannable phrases; removed the ugly table top border (delineated by the header
  rule + whitespace).

Build 76 pages clean. Verified live: Sources contained + light tiles; Surfaces grid
gone + filled feed; Compare top-border 0 + short labels; Notice segmented; rail counter
gone. No horizontal overflow.
