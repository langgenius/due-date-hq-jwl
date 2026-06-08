# Critique fixes — Rule library consistency

Date: 2026-06-08

From the `/critique` audit, rules cluster.

- **Dead "Export" button → real CSV.** `rules.library.tsx` `handleExport` was a
  no-op `navigate('#export-coverage')`. Now downloads a real CSV of the loaded
  rules (Jurisdiction, Rule/Form, Status, Tier, Entities, Version), mirroring the
  `/alerts/history` export pattern; disabled at zero rows.
- **Toggles → shared `<Segmented>`.** The scope tabs (dropped the motion-underline)
  and the `FilterChips` primitive (`rules-console-primitives.tsx`) now use the
  shared flat Segmented. (Entity chips left as-is — toggle-to-clear + per-chip
  badges don't fit single-select Segmented.)
- **Card radius unified** to `rounded-xl` (12px): OverviewActionHero (was 2xl) and
  `SectionFrame` (was md) — the overview cards now share one corner.
- **states-rail:** hand-rolled `<input type="search">` → shared `SearchInput`;
  review-only toggle hit-box 22px → 24px.
- **mono restraint:** removed `font-mono` from the rule-detail authority-role label
  and the rail count numbers (kept on rule IDs / versions / dates).

Verify: tsgo clean; `/rules/library` renders with the Segmented scope tabs + real Export; no console errors.
