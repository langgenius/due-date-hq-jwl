# Wave: warm-palette finish · fixed-width filter pills · alerts map-view trim

**Date:** 2026-06-23
**Surfaces:**
- `packages/ui/src/styles/tokens/{primitives,semantic-light,semantic-dark}.css`,
  `tokens/preset.css`; `apps/app/src/features/dashboard/{SetupProgressCard,
  sidebar-setup-card,merged-brief-card}.tsx` — palette finish.
- `apps/app/src/components/patterns/{filter-trigger,single-select-filter}.tsx`,
  `features/obligations/detail/DeadlineNavigatorRail.tsx`, `routes/obligations.tsx`
  — fixed-width pills.
- `apps/app/src/features/alerts/{components/PulseAlertRow,AlertsListPage}.tsx`
  — map-view trim + affects-N-clients.

Three independent streams landed together (two via worktree agents, palette by
hand). All on the new navy/stone/lime palette. Canon doc:
`docs/Design/color-palette-2026-06-23.md` (gained a Warm-surfaces section).

## 1. Palette finish — stone wells + lime celebration

The warm half of the reference palette was designed in the retune but not yet
wired. Minted three tokens (light + dark + `@theme`) and applied **by exception**:

- `--background-well-warm` (stone `#F1F4EC` / dark `#232420`) + `--divider-warm`
  (`#C8D0B9`) → the two setup nudges (`SetupProgressCard`, `sidebar-setup-card`).
  Onboarding is a resting/invitational moment, so the cool gray section fill gave
  way to a warm well.
- `--highlight-celebrate` (lime `#E6FBA3` / dark `#36441B`) → the `/today`
  all-clear coffee disc. Lime is the one sanctioned celebration home; dark navy
  glyph on the light fill, never white text (mirrors the brand-highlight rule).

Tokens are consumed, so they emit (built CSS: `f1f4ec` ×1, `e6fba3` ×1,
`c8d0b9` ×2; utilities `background-well-warm` / `divider-warm` /
`highlight-celebrate` present).

## 2. Fixed-width filter pills (Yuqi: dropdowns shouldn't resize on select)

`FilterTrigger` gained `valueOptions?: ReactNode[]`. When present, the value slot
becomes a single-cell CSS **grid stack**: one invisible ghost span per option +
the live value, all at `col-start-1 row-start-1`, so the column auto-sizes to the
widest option. No JS measuring, SSR-safe. `SingleSelectFilter` computes
`valueOptions` from its own `options` (`triggerLabel ?? label`) and passes it —
so every status / sort / scope / time-range pill across /deadlines, /alerts,
/rules, /audit is fixed-width automatically. Two direct callers wired by hand
(DeadlineNavigatorRail status filter, /deadlines status scope). Count-badge
triggers are unaffected (fixed-width is the text-value path only). Verified live:
the /deadlines Status pill carries 7 ghost twins and holds 244px across
selections.

## 3. Alerts map-view first-row trim + affects-N-clients

The map view's `~460px` navigator rail crammed line one. Added a dedicated
`narrow` prop (the existing `compact` is also true on the open wide list, so it
couldn't be reused) threaded `AlertsListPage → PulseAlertList → PulseAlertRow`,
set only by the map instance. In narrow mode line one keeps the severity pill
(the row's lone red), jurisdiction chip, due/lateness tag, relative time and the
Why? toggle; it **demotes** (not deletes) the high-impact chip, form-code badge,
change-kind, low-confidence pill and source link — all still in the detail
drawer. The "Affects N clients" line (real: `matchedCount + needsReviewCount`)
moves to a quiet `text-text-secondary` line two in narrow only; the wide list is
byte-for-byte unchanged.

## Verify

`tsgo` ui + app clean; `vp run @duedatehq/app#build` clean (pre-existing
chunk-size/dynamic-import warnings only); `i18n:extract` → 0 missing, no catalog
drift (no new strings). Live: no console errors; grid-stack confirmed in DOM.

## Git note

Integrated on a detached HEAD at `origin/main` (the shared tree was checked out
on the parallel session's unpushed `claude/cross-page-connections` branch — its 4
"connections" commits were deliberately left out of this push; all files are
disjoint). Pushed `origin HEAD:main`, then restored the working tree to the
parallel branch.
