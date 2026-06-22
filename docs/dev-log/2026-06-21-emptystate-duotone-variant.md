# EmptyState `visual="duotone"` variant

_2026-06-21 · "build both" — the opt-in duotone mode for empty states_

Added a third visual to the shared `EmptyState` primitive: `visual="duotone"`
renders the `DuotoneIcon` two-tone chip (rounded tinted square + accent glyph) in
place of the tinted icon-circle, with `duotoneTone` to pick the tint. Works in both
prominent and default sizes (lg / md). The Yuqi delight-glyph aesthetic for warm
onboarding / first-run empties.

**Real consumer:** the rules-library first-run empty state (`_RulesLibraryEmptyState`)
now uses `visual="duotone" duotoneTone="brand"` — a warm brand chip on "Your rule
catalog is empty." (chosen because it's a genuine first-run moment, not a
data-absent error). Other empties keep their deliberate circle / integration-strip
treatments; duotone is opt-in, not a global swap.

## "Tags" status-chip reference

The soft-tint status tags (Pending / In progress / Submitted / In review / Success
/ Failed / Expired — pastel bg + matching icon + matching label) are already our
`ObligationStatusReadBadge` + `SeverityChip` family (soft `--severity-*` tint +
StatusRing glyph + tone-matched label). No new chip family built — same call as the
earlier "copy this status" / "love the colours" refs.

## Verification

tsgo 0 · build green · no new i18n. DuotoneIcon itself verified live on /preview
earlier; the EmptyState branch is a clean conditional render reusing it.
