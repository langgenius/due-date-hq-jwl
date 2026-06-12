# /today feedback batch — brief tab, header affordances, wiring audit (2026-06-12, round 5)

Yuqi's numbered page-feedback list + "should we use the right panel design
for the daily brief?" Work split three ways: new design, corrections, and
verify-already-wired.

## Decided: page tab, not right panel (feedback #4 + the panel question)

The brief is 1–3 lines of editorial — a persistent right panel is layout
machinery it hasn't earned, competes with the obligation/alert drawer
pattern, and dies at <xl. Implemented Yuqi's own sketch instead: a **tab on
the page**. `daily-brief-card.tsx` now has two states in one slot:

- Expanded accent band; ✕ = "Collapse brief" (never deletes).
- Collapsed tab chip (freshness dot + "Daily Brief" + chevron), accent
  tinted, click to expand. Pref persisted (`ddhq:dashboard:brief-collapsed`)
  keyed to generation stamp → a fresh brief auto-expands.
- Failed + all-quiet recap + no catchup → defaults collapsed with the
  deterministic "All quiet —…" line inline (no failure apology; answers
  feedback #7 "is this the best place for that sentence" — it has no place).

Route simplification: `dashboard.tsx` lost the dismissed-key state entirely.
Verified live: expand → band, ✕ → tab, pref persists. Doc:
`brief-banner-language.md` (tab section replaces quiet-line section).

## Corrections

- **Never double-highlight** ("red + bold… tooooo strong"): late countdown
  drops `font-semibold` → 16px / weight-500 / red. Measured 16/500
  rgb(217,45,32). Docs + type-weight memory updated with the principle.
- **Import clients** (feedback #1): canonical `<Button variant="primary"
  size="icon-sm">` round icon button + tooltip — collapsed by default, in
  primary colours, replacing the hand-rolled labeled pill.
- **Scope toggle** (feedback #2): tooltip on the Segmented spelling out
  My work (assigned to you + unassigned) vs Everyone (whole firm).
- **Card micro-interactions** (feedback #3): `active:scale-[0.99]` press +
  hover-revealed ↗ open-affordance top-right (diagonal nudge), both
  motion-reduce-guarded. No shadows (restrained-shadows rule).

## Verified already wired (no code needed)

- **Card click → detail** (feedback): DrawerProvider navigates to
  `/alerts?alert=<id>` from /today; AlertsListPage auto-syncs Review/Active
  to the opened alert's queue; AlertListRail `scrollIntoView('start')` on
  first paint. Clicked a live card: landed on Active tab, selection visible.
- **Mark reviewed mechanism**: pulse.listAlerts filters to
  `status IN ('matched','partially_applied')` + approved + not expired
  (packages/db repo pulse/scoped.ts); markReviewed sets `reviewed` →
  invalidation drops the /today card instantly, alert moves to history.
  Contract documented at the query site in needs-attention-section.tsx.
- **Stale items**: Priorities title↔lede spacing (fixed this morning),
  table header band py-2 app-wide (4f199932), failure caption (superseded
  by the tab).

## Deliberately deferred (not /today scope)

/alerts-page items: Review/Active differentiation beyond pills, the Active
pill's logic in its own tab, search input design. These need an /alerts
design pass, not a /today patch.

Catalogs regenerated; zh-CN filled for 14 strings (4 mine, 10 from the
parallel session's committed copy). tsgo + strict compile clean. Console
shows HMR errors from the parallel session's in-flight
AlertStructuredFields.tsx edit — not this change.
