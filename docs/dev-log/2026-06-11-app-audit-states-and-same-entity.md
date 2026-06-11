# 2026-06-11 — App audit: state completeness + same-entity-same-rendering

Yuqi's two audit dimensions, run across the app.

## Part 1 — State completeness

The quoted edge cases, verified one by one:

- **120-char hero fold** — alert hero clamps at 3 (fixed earlier today);
  deadline hero = recorded open fix (parallel-WIP file).
- **Alert without sourceUrl** — drawer band/meta already degraded
  gracefully, but THREE click-sites called `window.open(null)` (dead
  about:blank tab): rail item, /today card source. Both now render a plain
  non-interactive caption when no URL. (PulseAlertRow already guarded.)
- **0% / 100% confidence** — renders fine everywhere (no fixed-width slots,
  tabular-nums); 0% takes the low-tier destructive tone as designed.
- **Affected clients ×50** — `AffectedClientsTable` has NO row cap or
  scroll: 50 rows = a ~3000px card. RECOMMENDATION (not implemented —
  touches selection/bulk/E2E): collapsible-density pattern, first 8 rows +
  "Show all N", per the existing collapsible-density rule.
- **Drawer body while loading** — header had a skeleton, body was a bare
  gray wash; added three card-shaped Skeleton placeholders.
- **Feature-level coverage survey** (isError/EmptyState/Skeleton grep over
  every feature dir): all features carry skeletons; the one real gap was
  **/calendar — no error branch at all** (a failed query silently rendered
  every subscription card as "not connected"). Added the canonical
  Alert + Retry error state. members/billing "gaps" are non-issues
  (members can't be empty — you're always a member; billing handles state
  at the route level).

## Part 2 — Same-entity-same-rendering (alert × 4 surfaces)

Full side-by-side diff of /today card / /alerts row / rail item / drawer
header. Accidental drift fixed (HIGH IMPACT pill — 3 different chromes
incl. inline hexes in the drawer; form-chip radius row vs rail; "conf N%"
vs "N% conf"; zero-impact wording "No clients matched" vs "No client
impact"; /today source had no link glyph). Deliberate divergences
inventoried so they don't get "fixed" by accident. Contract recorded in
docs/Design/alert-card-design.md §4-surface rendering contract.

Verified: tsgo clean (the one ObligationQueueDetailDrawer error is the
parallel session's WIP); /today probed live — conf order, trailing ↗, all
unified.
