# Status glyphs in the Status filter dropdown

_2026-06-21 · Yuqi refs: "the icons are cool" + the filter popover with status
icons + per-option counts_

The /deadlines Status filter dropdown listed each state as a plain colored dot +
label + count. Swapped the dot for the canonical **StatusRing glyph** (dashed
ring → filling arc → check disc) via `<StatusMark>` + `STATUS_ICON_COLOR`, so the
filter now reads the lifecycle progression at a glance — matching the reference
filter popovers (To-do ◌ / In Progress ◐ / Completed ✓, each with its count). The
per-option counts were already there (`scopeCount`).

No new strings (reuses `statusLabels`). Verified live: all 7 options render the
glyph + label + count ("Not started 9", "In review 10", "Filed 6", …).

## Held / skipped (with reasons)
- **Batch-bar "N of M selected"** (ref "3 of 200 selected") — reverted: the bar
  already matches the ref's essence (dark floating bar + count + bulk actions +
  the status submenu, which already got StatusMark glyphs). The only delta was the
  denominator, which added a new i18n string with awkward zh word order; not worth
  it for a marginal gain.
- **Colored-dot category chips** (ref: Department dot-chips) — skipped: directly
  violates §4.10 (JurisdictionChip / TaxCodeBadge are neutral reference tags,
  never tone-filled — confirmed in the earlier img-015 canon rejection).

## Note
`login.tsx` is mid-redesign in a parallel session with untranslated WIP strings;
catalogs were reset to HEAD to avoid committing that session's work. Verified:
tsgo 0, build green, i18n compile --strict clean.
