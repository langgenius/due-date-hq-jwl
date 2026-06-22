# RichHelpTooltip adopted on Internal-target vs. filing deadline — 2026-06-21

## Why

The `RichHelpTooltip` primitive (the bold, dark sibling of `ConceptHelp`,
with a VISUAL preview area) existed but was only demoed on `/preview`. It
had never been adopted on a real surface. The internal-target vs. filing
deadline distinction is one of the product's genuinely-confusing concepts:
both read as "the deadline," and the existing `meta` line ("N days before
filing") only explains the gap once you already grasp the two-date model.
It earns the richer surface with a spatial schematic over a flat paragraph.

## What

- **`apps/app/src/features/obligations/queue/components/panels.tsx`**
  - New `InternalVsFilingSchematic` presentation component: two date chips
    (Internal → Filing) joined by a `ChevronRightIcon`, with the real day
    buffer labelled on the connector. Collapses to a single "Same date"
    chip when the two dates coincide (buffer ≤ 0) — never fabricates a gap.
  - `DeadlineDateCard` gained an optional `labelHelp?: ReactNode` slot that
    renders inline after the card label (used only by Internal target).
  - In `PrimaryDeadlineStrip` `variant="cards"`, the Internal-target card
    now carries a `RichHelpTooltip` (brand-tinted preview, `side="bottom"`)
    whose schematic is fed REAL row-derived data: the two chip dates are
    the same ISO strings the cards render, and the buffer is
    `daysBetween(internalIso, filingIso)`. Mounts only when BOTH dates are
    real. No fiction — every datum traces to a row field.

## Canon respected

- Reused the canonical `RichHelpTooltip` primitive (no hand-rolled popover).
- No coloured text on the dark tooltip surface: chroma rides the chip
  CONTAINERS (brand tint for internal, neutral white wash for filing); copy
  stays white. Inner blocks wrapped in `<Trans>`.
- Fixed-radius scale; restrained shadows inherited from the primitive.
- `ConceptHelp` untouched — `RichHelpTooltip` is the opt-in richer surface.

## i18n

Six new strings extracted + translated to zh-CN; `Internal` / `Filing`
chip labels reused existing catalog entries. `i18n:compile --strict` passes.

## Verify

- `pnpm -F @duedatehq/app exec tsgo --noEmit` → rc 0
- `pnpm exec vp run @duedatehq/app#build` → success
