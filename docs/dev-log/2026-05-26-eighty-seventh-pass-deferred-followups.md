# 87th pass · Deferred follow-ups — tight-eyebrow token + marketing focus-visible

Date: 2026-05-26
Branch: `design/eighty-seventh-pass-cluster`

## What this pass closes

The Layer A+B+C combined commit (89702e6b) deferred two items so the
user could make explicit calls on them. Both are now resolved:

1. **`tracking-[0.06em]` scatter** — 8 sites (6 app, 2 marketing).
   Yuqi authorized adding a `--tracking-eyebrow-tight` token rather
   than collapsing these into `tracking-eyebrow` (which would have
   shifted micro-eyebrow rendering at 10–12px).
2. **Layer B2 focus-visible widening** — heuristic scan of
   `packages/ui` + `apps/marketing` returned **zero holes in
   packages/ui** (every primitive with a hover rule already had
   focus-visible) and **16 holes in marketing** (all `.astro` files).

## A-tight — `--tracking-eyebrow-tight: 0.06em`

New token in `packages/ui/src/styles/tokens/primitives.css`:

```css
--tracking-eyebrow: 0.08em;
--tracking-eyebrow-tight: 0.06em;
```

Tailwind v4 auto-generates the `tracking-eyebrow-tight` utility from
the `--tracking-{name}` namespace. Both apps inherit it via
`@import '@duedatehq/ui/styles/preset.css'`.

**8 sites swept from `tracking-[0.06em]` → `tracking-eyebrow-tight`:**

- `apps/app/src/features/rules/sources-tab.tsx:222` — LAST CHECKED column header
- `apps/app/src/features/rules/sources-tab.tsx:353` — source status pill
- `apps/app/src/features/rules/rule-detail-drawer.tsx:998` — rule authority badge
- `apps/app/src/components/primitives/tax-code-label.tsx:110` — jurisdiction subtext
- `apps/app/src/routes/obligations.tsx:5709` — drawer jurisdiction pill
- `apps/app/src/routes/obligations.tsx:8410` — deadline tile label
- `apps/marketing/src/components/Pricing.astro:153` — yearly-savings line
- `apps/marketing/src/components/Pricing.astro:158` — plan-seats line

## B2 wide — marketing focus-visible holes (16 sites)

Heuristic: for each `<button>` or `<a>` tag in `.astro` files, if the
className contains `hover:` but not `focus-visible:`, it's a hole.

`packages/ui`: **0 holes** — all interactive primitives (Button,
Tabs, Toggle, Tooltip, Popover, DropdownMenu, Dialog, Sheet, Select,
Combobox, etc.) already define `focus-visible:ring-2
focus-visible:ring-state-accent-active-alt` (or equivalent). The
audit primitive layer is internally consistent.

`apps/marketing`: **16 holes** patched with the canonical pattern:

```
outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt
```

(Same pattern the Layer B app patch used; no ring-offset because the
marketing surfaces don't have a guaranteed background-color match for
`ring-offset-bg-canvas`.)

Files + sites:

| File                                    | Hole                          |
| --------------------------------------- | ----------------------------- |
| `components/FinalCta.astro:29`          | Primary CTA — Start free      |
| `components/FinalCta.astro:37`          | Secondary CTA — mailto sales  |
| `components/Footer.astro:56`            | Footer column link            |
| `components/Hero.astro:32`              | Hero primary CTA              |
| `components/Hero.astro:40`              | Hero secondary CTA (anchor)   |
| `components/TopNav.astro:42`            | Nav inline link               |
| `components/TopNav.astro:51`            | TopNav CTA button             |
| `components/Pricing.astro:76`           | Billing-cycle toggle (yearly) |
| `components/StateCoveragePage.astro:51` | State-card link tile          |
| `components/StateDetailPage.astro:108`  | Official-source link          |
| `components/TrustPage.astro:80`         | Trust-page contact CTA        |
| `components/GeoResourcePage.astro:108`  | Resource page primary CTA     |
| `components/GeoResourcePage.astro:114`  | Resource page secondary CTA   |
| `pages/404.astro:49`                    | 404 — return home CTA         |
| `pages/404.astro:55`                    | 404 — pricing CTA             |
| `pages/404.astro:82`                    | 404 — route suggestion link   |

Keyboard users tabbing through any marketing page will now see the
accent ring land on every CTA + nav link + content link they hit.

## Verification

- `pnpm exec tsc --noEmit` clean for `apps/app` (server's pre-existing
  Cloudflare Workers-types errors are unrelated).
- Confirmation re-scans:
  - `grep tracking-\[0\.0[68]em\]` worktree-wide → only one match
    remaining, inside a `// comment` at
    `packages/ui/src/components/ui/table.tsx:85` (documentation).
  - Marketing focus-visible scan → 0 holes remaining.

## Cumulative tally (Layers A → C, deferred-cleared)

| Layer            | What snapped to a token / primitive  | Sites                                 |
| ---------------- | ------------------------------------ | ------------------------------------- |
| A (app)          | `tracking-eyebrow`                   | 33                                    |
| A (ui+marketing) | `tracking-eyebrow`                   | 4                                     |
| A-tight          | `tracking-eyebrow-tight` (new token) | 8                                     |
| B1 (app)         | `disabled:opacity-50`                | 4                                     |
| B1 (ui)          | `data-disabled:opacity-50`           | 1                                     |
| B2 (app)         | `focus-visible:ring-…`               | 7                                     |
| B2 (marketing)   | `focus-visible:ring-…`               | 16                                    |
| C1               | `PulseConfidencePill` (extracted)    | 2 files / 5 pill blocks               |
| **Total**        |                                      | **75 sites · 5 inline pills deduped** |
