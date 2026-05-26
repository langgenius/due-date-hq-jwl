# 87th pass · Layer A/B widening — packages/ui + apps/marketing

Date: 2026-05-26
Branch: `design/eighty-seventh-pass-cluster`

## Why this pass exists

Layers A (tracking-eyebrow), B1 (`disabled:opacity-50`), and B2
(`focus-visible:ring-…`) were originally scoped to `apps/app/src/`
only. Yuqi caught the gap: the monorepo has two more relevant trees:

- `packages/ui/src/` — 27 design-system primitive files
- `apps/marketing/src/` — 24 `.astro` files for the marketing site,
  which imports `@duedatehq/ui/styles/preset.css` and therefore shares
  the same Tailwind token vocabulary as the app

A full grep confirmed real drift in both. This pass closes the gap for
the two parts that are pure sweeps (A + B1). B2 (focus-visible) is
deferred — the marketing site's interactive surface is mostly anchor
links, where a separate focus-style decision belongs.

## Sweeps shipped

### Layer A (tracking-eyebrow) — 4 sites swept

`tracking-[0.08em]` literals snapped to `tracking-eyebrow`:

- `packages/ui/src/components/ui/sidebar.tsx:536` — sidebar group label
- `apps/marketing/src/components/Problem.astro:42` — problem-card severity badge
- `apps/marketing/src/components/HeroSurface.astro:60` — hero metric eyebrow
- `apps/marketing/src/components/StateCoveragePage.astro:59` — state-status pill

One `tracking-[0.08em]` reference inside a comment block at
`packages/ui/src/components/ui/table.tsx:85` was left alone — it's
documentation of the prior pattern, not live styling.

### Layer B1 (`data-disabled:opacity`) — 1 site swept

`data-disabled:opacity-40` → `data-disabled:opacity-50` in
`packages/ui/src/lib/overlay.ts:15`. This is the shared
`overlayRowClassName` used by Dropdown / Popover / Select / Tooltip /
Dialog / Sheet — so the canonical opacity-50 now reaches _every_
disabled menu item across the app via the centralized class string.

## What about `tracking-[0.06em]`?

Inventory across all three trees found 8 sites using
`tracking-[0.06em]` (6 in app, 2 in marketing). These are a _different_
token-gap question — we have `--tracking-eyebrow: 0.08em` but no
canonical for the tighter 0.06em used on micro-eyebrows. Not drift
within the existing token vocabulary; needs a design call before
adding `--tracking-eyebrow-tight` or similar. **Deferred.**

## What about focus-visible in marketing?

Marketing is mostly anchor links + a few buttons in TopNav / Footer.
Audit checked the `hover:` vs `focus-visible:` ratio at a glance — 27
hover rules / 14 focus-visible rules in `packages/ui`. Most of the
unmatched hover rules are on non-interactive surfaces (group hovers,
data-row hovers). Marketing's anchor links default to the browser
focus ring + a custom focus-visible from `globals.css`. **Deferred
pending a focused marketing-site critique.**

## Verification

- `pnpm exec tsc --noEmit` clean for `apps/app`.
- Tailwind v4 auto-generates `tracking-eyebrow` from the `--tracking-eyebrow`
  token in `packages/ui/src/styles/tokens/primitives.css`; marketing's
  `globals.css` imports `@duedatehq/ui/styles/preset.css` so the utility
  is available in `.astro` files too. Confirmed via the preset chain.

## Cumulative tally (Layers A → C, scope-widened)

| Layer     | What snapped to a token / primitive | Sites                                 |
| --------- | ----------------------------------- | ------------------------------------- |
| A         | `tracking-eyebrow` (app)            | 33                                    |
| A wide    | `tracking-eyebrow` (ui + marketing) | 4                                     |
| B1        | `disabled:opacity-50` (app)         | 4                                     |
| B1 wide   | `data-disabled:opacity-50` (ui)     | 1                                     |
| B2        | `focus-visible:ring-…` (app)        | 7                                     |
| C1        | `PulseConfidencePill` (extracted)   | 2 (5 pill blocks)                     |
| **Total** |                                     | **51 sites · 5 inline pills deduped** |
