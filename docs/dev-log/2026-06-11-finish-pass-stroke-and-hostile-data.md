# 2026-06-11 — Finish-quality pass: icon stroke canon + hostile-data audit

Yuqi asked what ELSE produces high-finish UI beyond de-duplication /
type discipline / alignment, and green-lit the two highest-ROI levers:
a rendering-crispness sweep and a hostile-data pass on /alerts.

## Icon stroke canon

The same lucide glyph rendered at strokeWidth 1.5 in the /alerts rows +
rail but 2 (default) in the drawer — adjacent icons with mismatched stroke
weight. Canon (now in docs/Design/icon-sizing.md): **lucide default 2,
never pass strokeWidth**; hand-drawn inline svgs (the ACTION elbow) keep
their own stroke as part of the drawing. Swept the 1.5 overrides out of
PulseAlertRow + AlertListRail. Live-verified: every `svg.lucide` on the
page reports stroke-width "2" — one value.

## Hostile-data audit (250-char titles, 100-char source names)

Injected hostile strings into: list-row title + source, rail-item title +
source, breadcrumb leaf, drawer hero title, header meta source link, fact
grid Authority value. Results:

- PASS: list-row title clamps at 2; rail title clamps at 2; rail source
  truncates; breadcrumb leaf holds its 360px cap; fact value clamps at 2;
  header meta truncates; zero page-level or panel-level x-overflow.
- PASS (by design): AffectedClientsTable client names wrap
  (`whitespace-normal` in a table cell), they don't break layout.
- **FAIL → fixed:** the drawer hero title had NO clamp in the expanded
  state — a 250-char title ran 4+ lines at 22px and pushed the extracted
  facts below the fold. Now `line-clamp-3` expanded (1 collapsed), full
  text on the `title` attr. Re-verified: hostile title renders exactly 3
  lines.

Note: tsgo shows an unrelated error in ObligationQueueDetailDrawer.tsx —
that's the parallel session's WIP file, not touched here.

## App-wide extension (same day)

Yuqi asked whether the pass covered the whole application or just /alerts —
it was alerts-only, so it was extended:

- **Stroke, app-wide:** only 3 `strokeWidth` sites existed outside alerts.
  Triage per the canon: `destructive-change-preview` (hand-drawn svg —
  exception 1, kept), /today's Megaphone hero at 1.75 (display-size
  decorative — codified as exception 2: `size-6`+ heroes may thin to
  1.5–1.75 for optical balance), and `rejection-chip`'s XIcon at 2.5 —
  removed (the destructive color carries prominence, not a bolder stroke).
- **Overflow smoke test, app-wide:** hidden-iframe sweep of 9 main routes
  (/, /deadlines, /clients, /rules/library, /rules/sources,
  /alerts/history, /calendar, /workload, /members) at 1512px with real
  data — zero horizontal overflow everywhere.
- The full hostile-data INJECTION methodology (long titles into clamps)
  has only been applied to /alerts surfaces; other detail surfaces
  (deadline detail, client detail) are candidates for the same pass.

## Full-app hostile-data sweep (same day, all 32 surfaces)

Yuqi: "不要错过任何细节和页面" — the injection methodology was generalized
into an automated iframe auditor (per route: icon-size-vs-text check,
tabular-nums check, then 250-char injection into every truncate/line-clamp
element + every h1–h3, then x-overflow / clamp-violation / unclamped-heading
measurement) and run across every authenticated route, including the
deadline detail's four tabs and the client detail.

**Real findings (2):**

- `reminder-templates-page.tsx` — template names are USER-editable and
  rendered in an unclamped card `<h2>`; a long name stacked the card header
  4 lines. Fixed: `line-clamp-2 min-w-0` + `title` attr. Re-verified: 2
  lines under a hostile name.
- `ObligationQueueDetailDrawer.tsx` — the deadline detail hero `<h2>` has
  no clamp (4+ lines on all four tabs with a long obligation title). NOT
  fixed here: the file is a parallel session's WIP. Recorded as an open
  fix (memory + this log); the cure is the alert-hero pattern
  (`line-clamp-3` + title attr).

**Triaged as non-issues:** unclamped PageHeader h1s ("Rules", "Settings",
"Billing"… — app-authored copy, bounded); the /deadlines + /obligations
editorial-banner h2 (app-authored); Button-primitive 16px icons beside
12px labels (primitive-enforced per icon-sizing.md); 18px icons inside
size-9 decorative discs (icon-in-disc pattern). tabular-nums: zero
violations app-wide against the `N% / N of M / N/M` patterns.

Zero x-overflow and zero clamp violations everywhere else — the truncation
infrastructure across the app held up under injection.
