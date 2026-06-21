# Deferred-tail motion — StatusRing arc / audit KPI bump / collapsible-search width

**Date:** 2026-06-22
**Surface:** `primitives/status-ring`, `patterns/stat-band`,
`features/audit/audit-log-page`, `primitives/collapsible-search`,
`app/styles/globals.css`

Three deferred motion-catalog items, all honoring the `@/lib/motion` grammar
(`EASE_APPLE`, `MOTION_DURATION`) and the global `<MotionConfig
reducedMotion="user">` (no per-call reduced-motion guards for `motion/react`).
The one raw CSS keyframe is guarded explicitly with `motion-reduce:animate-none`.

## StatusRing — animated arc fill + completed entrance

The product's central status primitive (`StatusMark` app-wide). It's a pure
presentational SVG with props (no memo, no shared mutation), so a mount
animation is safe — it plays once when the mark mounts, not on parent scroll.

- **Partial-fill arc** (`in_review` / `filed`) → the fill `<circle>` is now a
  `motion.circle` animating `strokeDasharray` from `0 ${C}` to the filled
  length, `MOTION_DURATION.enter` / `EASE_APPLE`. Reuses the file's existing
  `RING_CIRCUMFERENCE = 37.7` (r=6); nothing hardcoded anew.
- **`completed`** → the solid disc + check are wrapped in a `motion.g` with
  `initial scale 0.6 / opacity 0 → 1`, `transformOrigin: '8px 8px'` (the disc
  center; SVG needs an explicit origin or it scales from the viewBox corner).
  Grouped so disc + check scale in as one unit.

## Audit KPI bump — pulse on filter change

- **New keyframe** `ddhq-stat-bump` (`0/100% opacity 1, 50% 0.45`) + class
  `.animate-stat-bump` (`150ms ease-out 1`) in `globals.css`, next to the other
  app-feature keyframes. Opacity-only → no layout shift in the numeric band.
  Applied by class name (matching the codebase's `.pulse-strip-breathing`
  pattern), not a registered Tailwind utility; verified it survives tree-shaking
  in the prod CSS bundle.
- **`StatBand`** gains an optional `bumpKey` prop — when it changes, each value
  span remounts (via `key`) and replays the single pulse, with
  `motion-reduce:animate-none`. Omitted by every other StatBand surface → static
  as before; only the audit strip opts in.
- **Audit page** threads the active-filter signature
  (`q | category | range | action | actor | entityType`) as `bumpKey`, so the
  KPI counts pulse once each time the loaded-window recompute fires.

## CollapsibleSearch — width transition (icon ↔ input)

The wrapper is now always `inline-flex` with `transition-[width] duration-200
ease-apple motion-reduce:transition-none`, switching between an explicit
collapsed width (the magnifier button footprint — `w-8`/`w-9` by `size`) and the
caller's `expandedWidthClassName`. Concrete widths on both ends let the swap
ease instead of jump. The conditional input mount is preserved (so the
focus-on-reveal effect still fires); the expanded `SearchInput` gets
`w-full min-w-0` to fill the flex wrapper as it grows. Keyboard/hover/blur/`/`
behavior is unchanged.
