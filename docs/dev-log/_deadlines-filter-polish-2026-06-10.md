# Deadlines faceted Filter → trigger prominence + sheet polish

**Date:** 2026-06-10

Feedback (Yuqi, /deadlines toolbar): "filter dropdown can be more obvious.
polish the filter's content and design."

Visual/UX polish only on the faceted Filter built in `b956b74d`
(`routes/obligations.tsx`). No change to the URL filter-param contract or the
staged → Apply commit logic — purely the trigger chrome + sheet styling,
refined toward the Pencil "B · Minimal" canon (`a7BILH` toolbar, `MdCKL` sheet:
`M5RWL` header / `aUMDG` tab strip / `sX6JK` body / `ZAciP` footer).

## 1 · Trigger is now obviously engaged

`ObligationFiltersPopover`'s `PopoverTrigger` (still the shared `FilterTrigger`,
untouched as a component):

- The active count rides in a **filled accent pill** (`bg-state-accent-active`,
  `text-text-inverted`, mono tabular) instead of the quiet muted-mono
  `valueLabel`. Reads as a real badge from across the toolbar.
- When ≥1 filter is committed: accent border (`border-state-accent-border`),
  accent leading icon (`text-text-accent`), and the label goes
  `font-semibold` — on top of `FilterTrigger`'s own `active` bg tint. The
  "filters are on" state is unmistakable.
- Resting (no filters) state is unchanged — quiet, consistent with the other
  toolbar controls.

## 2 · Sheet content + design polish (toward `MdCKL`)

- **Header** (`M5RWL`): staged-count badge changed from a bare number to a
  rounded-full subtle pill reading "N applied" (`<Plural>`); title pinned to
  `text-text-primary`.
- **Tab strip** (`aUMDG`/`xrMoD`): active tab's 2px rule sits flush on the
  strip hairline (`-mb-px`); count pill gets `py-px` for canon balance;
  inset focus ring so it doesn't clip.
- **Facet search list** (`sX6JK` left col): added a dimension meta strip —
  "N selected · M options" + a per-dimension **Clear** affordance (canon's
  "3 of 24" / Clear). Selected rows now carry a subtle wash and bolder label
  so current picks read above the rest; unchecked checkbox border warms on row
  hover. Loading state is a richer ghost (search box + 3 rows); the no-options
  state gets a search glyph.
- **Footer** (`ZAciP`/`IruSl`): **Apply** is the clear dark primary with a
  trailing `arrow-right` (canon); left summary clarified to "N filter(s)
  staged" with tabular nums.

## Constraints honored

Fixed radius scale (rounded-full pills, rounded-sm checkbox, rounded-lg rows);
restrained shadows (only the popover's allowed blur-24 lift); tokens only
(`state-accent-*`, `text-text-*`, `divider-*`, `background-*`); i18n via
`<Trans>`/`<Plural>`; reused the existing cmdk `Command` primitive.

## Couldn't fully match from canon

- Canon's left column groups rows into **SELECTED / MATCHING / FREQUENTLY USED**
  eyebrow sections. The live list is a single cmdk typeahead (the facets RPC
  returns a flat option list with counts, not a frequency ranking) — selection
  is instead surfaced via the per-row wash + the meta strip's "N selected"
  count rather than a separate SELECTED group. No new RPC was in scope.
- Canon shows **PRESETS as a persistent right column**; the live sheet keeps
  presets on their own "Saved views" tab (the existing structure) rather than
  splitting the body into two columns, to avoid restructuring the staged-Apply
  body wiring during a visual pass.

## Verify

- `tsgo --noEmit` — obligations.tsx clean.
- `vp test run obligations.test` — 55/55 pass.
- Formatted with `vp fmt --write`.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
