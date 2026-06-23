# Color palette retune — navy accent, softer status triads, violet review

**Date:** 2026-06-23
**Surface:** `packages/ui/src/styles/tokens/primitives.css`,
`tokens/semantic-light.css`, `tokens/semantic-dark.css`; canon doc
`docs/Design/color-palette-2026-06-23.md`

Foundational token-layer change. No component files touched — every chromatic
family is re-pointed at the token level so the change ripples through all
existing consumers. Canonical record (triads, contrast, dark-mode relationship,
solid/ink/wash rule, navy-only-chrome discipline) is in the Design doc above.

## What changed

- **Accent → true navy blue.** Primary ramp recomputed at ~218°: solid
  `#22488C` (600), deep/pressed `#15315F` (800), mid border `#9DB2DA` (300),
  wash `#EAEFF7` (50). `--text-accent` = navy 600 (8.85:1 on white).
- **Status families re-hued into solid/wash/ink/border triads** (anchored on
  ramp stops 500/50/600/200):
  - success green — solid `#3FA86A`, ink `#1E7A47`, wash `#E8F5EC`, border `#9CD3B0`
  - warning — re-hued coral→**amber/ochre**: solid `#C0883A`, ink `#7A5320`,
    wash `#F4ECDE`, border `#E2C690`
  - destructive — softer brick: solid `#D2553F`, ink `#B23A28`, wash `#FBE9E4`,
    border `#EBA99B`
  - info/sky (blue-light ramp) — solid `#3AB3E0`, ink `#0E6E92`, wash `#E6F6FC`,
    border `#A9DCF0`
- **Cyan highlight → info/sky.** `--color-brand-highlight` `#14C5F6` → `#3AB3E0`
  (info solid), `-ink` → `#0E6E92`, `-soft` → `#E6F6FC`. "Live / monitoring /
  New" now reads as the same sky hue as the info status family.
- **Review violet retuned** (same `--status-review` semantic, new hue/lightness):
  solid `#7A5AF0` (500), ink `#4B3596` (700), wash `#EEEBFD` (50), border
  `#C7BAFB` (200).
- **Ink text tokens** (`--text-destructive/-warning/-success`,
  `--status-review-text`, `--color-brand-highlight-ink`) all land on the AA
  inks (≥4.5:1 on white *and* on their wash). Solids are fills only — white on
  any status solid fails AA by design.
- **Dark mode mirrored.** Util ramps are theme-invariant, so dark inherits the
  new hues; dark tokens keep pointing one/two stops brighter (400/500) per the
  house relationship. All alpha tint literals (state hovers, badge halos, soft
  badge bgs, severity tints, accent washes) re-derived from the new solids:
  navy `34 72 140`, destructive `210 85 63`, success `63 168 106`, warning
  `192 136 58`, info `58 179 224`, review `146 117 243`.

No new token names introduced — every triad maps onto existing ramp stops, so
`preset.css` `@theme` re-exports are unchanged.

## Verify

- `pnpm -F @duedatehq/ui exec tsgo --noEmit` → exit 0
- `pnpm -F @duedatehq/app exec tsgo --noEmit` → exit 0
- `pnpm exec vp run @duedatehq/app#build` → clean (`✓ built`)
- Built CSS (`apps/app/dist/assets/index-*.css`): `#22488c` ×19, `#d2553f` ×21,
  plus all other new solids/inks present; old `#2e368c` / `#14c5f6` / `#f25f4c`
  = 0. Tokens are consumed, not tree-shaken.
