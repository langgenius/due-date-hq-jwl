# Marketing v2 — Flinta-inspired decorative accent on the How-it-works header

**Date:** 2026-06-21 · `docs/marketing/design-explorations/production-v2.html` only.

User shared a Flinta reference (ref 140375) — "this is nice as well" — for its two-tone, squircle-trio decorative treatment beside a section title.

## What shipped

- **`.flow__head` → flex row** (title-block left, decorative accent right) instead of a single max-width column. The eyebrow + h2 stay in a left `<div>` (still capped at 640px); the accent floats top-right.
- **`.deco-tiles` squircle-trio** — three 38px rounded squares rotated 45° and overlapping −12px:
  - tile 1: white with a hairline outline,
  - tile 2: light `--surface` fill with a faint hairline,
  - tile 3 (`--fill`): navy `--accent` carrying a small `#14c5f6` cyan 4-point sparkle (counter-rotated −45° so it reads upright), with a soft navy shadow for a hint of lift.
- Stays on-brand: navy + a single cyan spark as a "delight surface" accent, no new colors, restrained shadow. **Hidden < 620px** so it never crowds the title on mobile.

## Notes

- File still embeds the **Agentation devtool** (localhost-gated, `?noagent` escape); strip before wiring into `apps/marketing`.
- `vp fmt --write` + `--check` clean (the file is prettier-managed on `origin/main`).
- Verified live at `:4599` — isolated the `#how` header and the product-surfaces section; both render as intended.
