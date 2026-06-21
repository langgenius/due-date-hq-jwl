# Apply FunIconButton to two delight CTAs + tokenize its gradients (2026-06-21)

Item `funbutton-apply` (#6): the `FunIconButton` primitive existed but had zero
real call-sites — it only showed in its own `/preview` demo. Gave it two homes
on genuine DELIGHT surfaces (per canon: marquee CTAs only, NEVER the dense
workbench), and cleaned the raw-hex gradient stops out of the primitive.

## Applied to (delight surfaces only)

1. **Dashboard onboarding nudge** (`features/dashboard/SetupProgressCard.tsx`):
   the "Continue setup" CTA — the launch moment of the "Almost there" card —
   swapped from a plain full-width primary `Button` to a `FunIconButton` with a
   `RocketIcon` chip in `brand` tone. The rocket echoes the card's existing
   brand `DuotoneIcon` + the cyan→navy `TickProgress`, so the loud pill reads as
   the same launch cue, just dialed up. Dropped the trailing `ArrowRightIcon`
   (the leading rich chip now carries the affordance) and the now-unused
   `ArrowRightIcon` + bare `Button` imports.

2. **Rules-library first-run empty state** (`routes/rules.library.tsx`,
   `_RulesLibraryEmptyState`): the primary "Import from sources" jump swapped to
   a `FunIconButton` with a `DownloadIcon` chip in `brand` tone. The secondary
   "New rule" stays the quiet outline `Button` — only ONE loud action per
   surface (von-Restorff: the marquee CTA must be the lone standout).

Both render as real `<Link>`s (see passthrough below), so they keep href
semantics — cmd/right-click, open-in-new-tab — instead of a JS-only onClick.

## Primitive changes (`components/primitives/fun-icon-button.tsx`)

3. **Hex cleanup.** The per-tone chip gradients hardcoded raw hex stops. Now:
   - `brand` + `accent` wells → `linear-gradient(var(--color-brand-ink),
     var(--color-brand-ink-deep))` (lit navy → deep navy; the two tones stay
     distinct via their cyan vs accent-blue ring + glow, all container chroma).
   - `success` well → `color-mix` of `--color-text-success` toward black for
     both stops (no brand token home for green, but the chroma is now tokenized
     instead of literal hex). The only literal left is the `#000` mix base —
     a neutral, not a brand color.
   - `ink` already used `--color-util-colors-gray-700/900` tokens; untouched.

4. **`render` / `nativeButton` passthrough.** Added a polymorphic passthrough to
   the underlying Base UI `Button` so the pill can render as an anchor. Needed
   because a navigating CTA wrapped in `<a>` around a `<button>` is invalid HTML;
   now the pill IS the `<Link>`.

## Canon respected

- Calm-on-dense: no FunIconButton in any table/workbench — both homes are
  onboarding/empty-state delight surfaces.
- One loud action per surface (rules empty state keeps "New rule" quiet).
- No fiction: both CTAs reuse existing strings + existing real destinations
  (`/rules/sources`, the next incomplete setup step's href). No new strings, so
  no i18n extract/compile needed.
- Restrained shadows / fixed radius / no colored text on dark: all inherited
  unchanged from the primitive (chip lifts via border + gradient; glyph white on
  dark chrome; chroma in the ring/glow container).

## Verify

- `pnpm -F @duedatehq/app exec tsgo --noEmit` → rc 0
- `pnpm exec vp run @duedatehq/app#build` → success (1.99s; only pre-existing
  chunk-size / dynamic-import advisories)
- `rules.library.test.tsx:990` (asserts "Import from sources" absent when rules
  EXIST) unaffected — the empty-state CTA label text is unchanged.
