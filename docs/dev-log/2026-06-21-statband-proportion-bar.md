# Feature: StatBand proportion bar (portfolio mix echo on /deadlines)

_2026-06-21 · ref Toloka "Tolokers completing tasks" accepted/rejected/unreviewed bar_

The /deadlines StatBand now carries an optional thin segmented proportion bar
below the stat columns — a quiet visual echo of the same real counts the columns
already label (Toloka-style seamless segments, no legend).

## What shipped

- `StatBand` (`apps/app/src/components/patterns/stat-band.tsx`) gains two
  OPTIONAL, non-breaking props:
  - `proportionBar?: { key; value; toneClass; label }[]` — renders a full-width
    `h-2 rounded-full` segmented bar inside the band, below the columns, above
    the bottom hairline (`mt-4`, inset `px-5` to align with column content).
    Each segment width = `value / sum(values)`; zero-value segments render
    nothing; an all-zero set renders no bar at all. Track is `bg-divider-subtle`.
  - `proportionBarLabel?: string` — the bar's `role="img"` aria-label. Supplied
    by the caller so the translatable string stays where `t` lives; the shared
    band stays i18n-free.
  - Bands without the prop render byte-for-byte as before (the section keeps its
    grid/flex layout directly; only when a bar is present does it stack a
    column-row over the bar).

- Wired on /deadlines (`apps/app/src/routes/obligations.tsx`, new
  `statBandProportion` memo + the `<StatBand>` render). Restrained 3-tone
  register only:
  - `filed` (green, `bg-state-success-solid`) = `LIFECYCLE_V2_STATUS_SETS.done`
    sum — the SAME value as the Filed cell.
  - `overdue` (red, `bg-state-destructive-solid`) = `deadlinesNarrative.overdue`
    — the SAME value as the Overdue cell; the band's only red, the genuine risk.
  - in-flight (neutral gray, `bg-state-base-handle`) = `scopeTotal − filed −
    overdue` (clamped ≥ 0) — not-started + waiting + blocked + in-review +
    due-this-week, rolled into one quiet lane. NOT five chromatic segments
    (StatBand color budget).
  - Guard: `scopeTotal <= 0` → no `proportionBar` prop (the band already handles
    the empty case).

## No fiction

No trend chips, no "+N% vs last period", no sparkline. There is no
period-over-period / time-series data for these metrics, so the bar shows ONLY
the present mix from real counts. Every segment value traces to an aggregate
already computed and displayed in the cells above.

## i18n

New strings (`filed`, `overdue`, `in progress`, and the `Portfolio mix: …`
aria-label) extracted + zh-CN translated + compiled `--strict` clean.

## Verify

- `pnpm -F @duedatehq/app exec tsgo --noEmit` → rc 0
- `pnpm exec vp run @duedatehq/app#build` → success
