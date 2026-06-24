# Marketing — drop-shadow sweep (2026-06-24)

Yuqi: "avoid drop shadow." Removed every outer drop shadow across the marketing
site; cards/panels now lift with **border + background contrast** alone (the
restrained-shadows canon), and hover states that used a shadow now lift with a
border-color change + a 1px translate instead.

## Removed (13 files)

- **Home:** `Hero.astro` `.panel` (alerts preview), `SurfaceDeep.astro` `.frame`,
  `Close.astro` `.rcpt` (receipt), `LoopDeep.astro` `.lstep__icon` (base + hover),
  `Surfaces.astro` `.bench`.
- **Chrome:** `TopNav.astro` `.nav__sheet` (the scrim already separates the mobile
  menu from the page).
- **Pages:** `Pricing.astro` `.pr__card--rec` + `.pr__ribbon`, `how-it-works.astro`
  (+ zh) `.fstage:hover`, `StateDetailPage.astro` `.std-src:hover`,
  `GeoResourcePage.astro` `.geo-peek` + `.geo-card:hover`, `TrustPage.astro`
  `.trustpg__card:hover`.
- **Global:** `marketing.css` `.m-cta--primary` micro-shadow → flat button.

Where the shadow was the only thing a `transition` animated, the `box-shadow`
transition entry was dropped too.

## Kept (these are NOT drop shadows)

- Focus rings (`box-shadow: 0 0 0 3px …`) — accessibility.
- Inset borders (`inset 0 0 0 1px/1.5px`) — Notice tabs, pricing card ring.
- The live "synced" pulse animation on `Sources.astro`.
- One cyan glow on the dark Close finale (`0 0 18px`, a centered halo, not a
  downward drop shadow) — a deliberate single delight accent. Flagged for Yuqi.

## Verified

After clearing the worktree's Vite cache (the global `marketing.css` button-shadow
edit was briefly stale in dev — file was already correct), the live DOM computes
`box-shadow: none` on `.panel`, `.bench`, and `.m-cta--primary`. Production build
unaffected.
