# ToggleChip primitive — unify the filter/toggle chips

Date: 2026-06-10

The last thread from the raw-button audit's Cluster D: the multi-select
"filter / pick-one" chip was hand-rolled in several places with divergent chrome
(rounded-full vs rounded-lg, bordered vs not, `state-accent-hover` vs
`-hover-alt` active, focus ring present/absent).

Built **`ToggleChip`** (`apps/app/src/components/primitives/toggle-chip.tsx`) —
one canonical "engaged filter" pill:

- active = accent **tint** (`state-accent-hover-alt`) + `state-accent-solid`
  border + accent text + medium weight (the "this filter is engaged" look, NOT
  a solid fill that reads as "primary action"). Mirrors the chip filters on
  /deadlines + /clients.
- `aria-pressed={selected}` (it's a toggle, not a link); optional leading lucide
  icon; `sm` (h-7/text-xs, default) / `md` (h-8/text-sm); label + any trailing
  count/sub-figure passed as children.

Adopted the rules-library entity chip's exact treatment as the canonical (its
inline comment already declared that treatment the design-system standard), so
its migration is near-lossless and the simpler chips snap up to it.

Migrated:

- **rules-library entity filter** chip — `<ToggleChip>`, label/count/"N missing"
  gap figure kept as children.
- **command-palette scope pills** — gained the canonical border + focus ring
  (were borderless `bg-background-subtle`, no ring).
- **states-rail "Needs review"** toggle — rounded-lg → the canonical pill; icon
  via the `icon` prop.

Left bespoke (correctly): `PresetChip` (brand-logo tiles + scale animation) and
the deadlines filter-popover track pills (segmented-in-a-track, the sensitive
deadlines area). The obligations quick-filter chips originally named are already
gone (folded into the filter popover).

Added a `/preview#toggle-chip` gallery section.

Verify: tsgo 0 errors; `vp check` clean on all touched files (the command-palette
`cn` import became unused and was removed).
