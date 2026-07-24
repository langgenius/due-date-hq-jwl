# Settings matrices — mobile stacked layout + motion lint — 2026-07-24

Follow-up to the interaction-audit batch. Closes the one audit #6 item that was
left partial (the Permissions + Notification-types matrices only got a narrowed
scroll column, not a real phone layout) and clears the one lint warning that was
mine.

## Permission matrix + Notification-types matrix — stack on phones

Both surfaces are wide grids (Permissions: 6 scopes × 6 actions; Notification
types: 8 rows × Email/In-app/Cadence). The first pass kept them as one sideways-
scrolling table with a shrunken leading column — reachable, but every toggle sat
behind a horizontal scroll on a phone.

Now each renders two ways:

- **`< sm`** — one card per row. Permissions: scope header (icon · name ·
  description) over a two-up `label + pill` grid of the six actions. Notification
  types: type header over an `EMAIL [cell] · IN-APP [cell]` row with the cadence
  chip pushed right. No horizontal scroll.
- **`sm` and up** — the existing matrix table, unchanged. Dropped the phone
  `min-w-[520px]` / `min-w-[440px]` narrow hacks since the table now only renders
  at `sm`+ (kept `min-w-[760px]` / `min-w-[640px]` with `overflow-x-auto` for the
  small-tablet band).

Accessibility: the mobile Notification cells get their own visible `EMAIL` /
`IN-APP` label spans with ids and `aria-labelledby` (the desktop header ids sit
inside a `display:none` subtree at phone widths, so they can't label the mobile
control). No new catalog strings — the mobile labels reuse the existing
`<Trans>Email</Trans>` / `<Trans>In-app</Trans>` messages.

Verified live at 390px (both pages: stacked cards, `scrollWidth === innerWidth`,
no sideways scroll) and 1280px (matrix table visible, mobile cards hidden, no
scroll).

## motion.ts — drop the boolean-literal compare

`scrollIntoViewMotionSafe` gated on `…matches === true` (oxlint
`no-unnecessary-boolean-literal-compare`). Replaced with a `typeof
window.matchMedia === 'function'` feature-detect before the call — same
reduced-motion behaviour, runtime-safe where `matchMedia` is absent, no
boolean-literal compare.

## Verification

- `apps/app` `tsgo --noEmit` → 0 errors.
- `pnpm run i18n:check` → 0 missing `zh-CN`.
- Full `vp check` → clean (the earlier `motion.ts` warning is gone).
