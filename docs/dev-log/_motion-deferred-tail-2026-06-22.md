# Deferred-tail motion — finishing the 2026-06-20 catalog

**Date:** 2026-06-22

The [motion & micro-interaction catalog](../Design/motion-microinteraction-catalog-2026-06-20.md)
shipped its high-value, low/medium-risk findings in batches 1–4 (2026-06-20) but
deliberately **left a tail** in the catalog: the genuinely medium-risk
`AnimatePresence` exit/height + keyframe work, plus the in-drawer apply
celebration. Those wanted reliable live verification and were held back while the
preview harness was flaky on opening drawers. This pass finishes that tail — 12
items across four batches — all honoring the `@/lib/motion` grammar (`EASE_APPLE`,
`MOTION_DURATION`) and the global `<MotionConfig reducedMotion="user">` (no
per-call reduced-motion guards for `motion/react`; the one raw CSS keyframe is
guarded explicitly with `motion-reduce:animate-none`).

## Batch A — stagger entrances

- **RuleYearDiff field list** (`rules/rule-year-diff.tsx`) — each changed-field
  `<li>` is now a `motion.li` (`x:-4→0` + fade), `delay: Math.min(index,4)*0.04`
  so the first ~4 rows cascade and the rest land together (under the 700ms ceiling).
- **Splash recap list** (`routes/splash.tsx`) — the "while you were away" recap
  `<ul>` staggers its `CircleCheckIcon` rows in (`staggerChildren 0.04`, each
  `x:-8→0` + fade).
- **SuccessModal "What to do next"** (`migration/SuccessModal.tsx`) — the three
  NextStep rows stagger in (`delayChildren 0.08` so the hero check + imported
  counts, already animated in batch 1, land first).

## Batch B — exit + collapse (AnimatePresence)

- **Alerts bulk bar exit** (`alerts/AlertsListPage.tsx`) — the FloatingActionBar
  now slides out (`y:8` + fade) on selection-clear instead of popping. The
  `motion.div` owns the `fixed bottom-12 left-1/2` centering (with `x:'-50%'`
  baked into initial/animate/exit); the bar's own fixed positioning + slide-in
  keyframes are neutralized so they don't fight the wrapper.
- **Clear-filters width-collapse** (`alerts/AlertsListPage.tsx`) — the button
  grows/shrinks (`width 0↔auto`, `overflow-hidden`) in the toolbar row instead of
  hard-splicing.
- **Sources table-body crossfade** (`rules/sources-tab.tsx`) — switching the
  All/Watched/Paused filter crossfades the `motion.tbody` (keyed on the filter
  only, so pagination doesn't crossfade). Carries the TableBody's slot + classes.
- **Post-accept rule-row exit-slide** (`rules/jurisdiction-rule-table.tsx`) — in
  the **Review** scope only, an accepted rule's row slides off right (`x:12` +
  fade) as it leaves the queue, via `motion.create(TableRow)` so the styled `<tr>`
  keeps its full recipe. Every other scope renders the plain row unchanged.
- **Previous-stages height accordion** (`obligations/queue/components/panels.tsx`)
  — the audit-events `<ul>` expands/collapses with a `height 0↔auto` accordion
  instead of an instant cut (the chevron already rotated).

## Batch C — primitives + keyframe

- **StatusRing arc fill + completed entrance** (`primitives/status-ring.tsx`) —
  the product's central status mark. The partial-fill arc animates its
  `strokeDasharray` `0→filled` on mount (reuses `RING_CIRCUMFERENCE = 37.7`); the
  `completed` disc + check scale in as one `motion.g` (`scale 0.6→1`,
  `transformOrigin '8px 8px'`). Pure presentational SVG → plays once on mount, not
  on parent scroll.
- **Audit KPI bump** (`patterns/stat-band.tsx`, `audit/audit-log-page.tsx`,
  `styles/globals.css`) — new `ddhq-stat-bump` opacity keyframe; `StatBand` gains
  an opt-in `bumpKey` prop that remounts each value span to replay a single pulse
  (`motion-reduce:animate-none`); the audit page passes the active-filter
  signature so the counts pulse once per recompute. Opacity-only, no layout shift;
  every other StatBand surface stays static.
- **CollapsibleSearch width** (`primitives/collapsible-search.tsx`) — the wrapper
  is now always `inline-flex` with `transition-[width]`, easing between the
  collapsed magnifier footprint and `expandedWidthClassName` instead of jumping.
  Focus-on-reveal + keyboard/`/` behavior unchanged.

## Batch D — the win moment: in-drawer apply-success celebration

`alerts/AlertDetailDrawer.tsx`. The one-click **Apply** is the product's signature
moment but it used to close the drawer instantly with only a toast. On success the
footer now flips to a green **"Applied"** confirmation (fades in via `fadeMotion`)
and holds `APPLIED_CELEBRATION_MS` (600ms) before `onClose()`, so the firm-wide win
registers. Mechanics:

- `applied` state + a `setTimeout` ref; `setApplied(true)` then schedule the close.
- The timer is cleared on unmount (`useEffect` cleanup).
- `applied` is reset by the **existing render-time reset blocks** (the project's
  no-`useEffect`-setState pattern) on alert-change and on close — no new reset path.
- `DrawerActions` gains an `applied` prop; when true it early-returns the green
  confirmation in place of the whole action cluster. Default `false` → the normal
  footer is byte-for-byte unchanged.

## Verification

`tsgo` 0 · `i18n compile --strict` 0 (no new catalog strings — "Applied" already
existed, zh-CN Missing 0) · production build green · **app tests 550 passed / 2
skipped** (baseline). Live: `/alerts`, `/deadlines`, `/audit` render with a clean
console (no errors/warnings); `/deadlines` shows 88 StatusRing arcs intact in the
dense table. The time-based animations themselves (apply hold, exit slides,
KPI pulse) are build- + test- + pattern-verified rather than filmed — the preview
harness remains flaky at synthetically opening drawers, the same honest limitation
noted in batches 1–4. Every change is an exact application of an already-shipped
motion pattern (layoutId slides, `contentEnterMotion`, `fadeMotion`, the
ghost-deck/stagger recipes), and degrades gracefully if a layout/anim doesn't match
(the element simply appears without animating — no break).

## Catalog status

With this pass the catalog's deferred tail is **empty** — what remains recorded
there is only the explicitly *rejected* items (the `sheet.tsx` start-style bug, the
sources external-link hover-hide) and a couple of debatable delight beats, none
pending.
