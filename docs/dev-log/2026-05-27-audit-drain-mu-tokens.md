# Audit drain — agent mu (design tokens) — 2026-05-27

Branch: `design/audit-drain-mu-tokens`
Wave: 2 (token / design-system drain)

## Mission recap

Wave-1 + Step 1-5 reaudit flagged 60 design-system / token-discipline
findings. Agent mu drained the mechanical token-namespace fixes inside
the territory carved out for "design tokens, primitives, marketing
typography, billing CTA shadow," skipping the cross-namespace
consolidations that need a designer eyeball.

Hard cap was 12 shipped findings. This pass landed 9 (under cap),
hewing to the rule that any sweep touching > a single namespace's worth
of arbitraries gets deferred for design alignment rather than risk
mass-renaming intentional marketing typography.

## Shipped (9)

### F-21 — `upgrade-cta-button.tsx:37` hardcoded `rgb(247 144 9)` shadow

Promoted to `--shadow-upgrade-cta-hover` defined in
`semantic-light.css` + `semantic-dark.css`. The previous shadow baked
`#f79009` — a hue **not in the palette** — into an arbitrary
`shadow-[]`. The new token uses `rgb(from var(--state-warning-solid) r g b / N)`
so the bloom inherits from the button's actual fill color (warning-500
coral in light; auto-resolved in dark via the standard token chain).
Dark mode gets slightly higher alpha (0.4 / 0.42 vs 0.35 / 0.36) to
match dark-mode shadow conventions in the existing token tree.

### F-72 — `--opacity-2` / `--opacity-8` redundant primitives removed

Both tokens had zero call-sites at removal time (grep'd
`apps/app/src`, `packages/ui/src`, `apps/marketing/src`). Tailwind v4's
`/N` syntax (e.g. `bg-text-primary/8`, `border-text-tertiary/2`)
supersedes them. Replaced the block with a deprecation comment so the
intent is captured in the file.

### F-73 — `--animate-spin-slow` dead animation token removed

Zero call-sites at removal time. Replaced with a deprecation comment.
If a future surface needs a slow spinner, re-introduce alongside its
caller.

### F-26 — `tracking-[0.04em]` in `Pricing.astro:115,164` (sub-canonical)

Swapped both occurrences to `tracking-eyebrow-tight` (= 0.06em). The
0.04em values were sub-canonical drift not present anywhere else.
0.06em (canonical eyebrow-tight) is the closest existing token and
maintains the same dense-pill feel.

### F-15 (bounded) — marketing arbitrary `text-[Npx]` swaps to canonical tokens

Bounded sweep across the smaller marketing components, only where
the arbitrary px size has a direct existing token equivalent
(text-xs=11, text-sm=12, text-description=13, text-base=14, text-lg=16,
text-xl=18):

- `Hero.astro` — `text-[12px]` → `text-sm` (eyebrow + trust strip);
  `text-[16px]` → `text-lg` (description)
- `Problem.astro` — `text-[12px]` → `text-sm` (footnote);
  `text-[13px]` → `text-description` (card body)
- `FinalCta.astro` — three `text-[12px]` → `text-sm`
- `Footer.astro` — `text-[14px]` → `text-base` (tagline);
  `text-[12px]` → `text-sm` (audience + column titles);
  `text-[14px]` → `text-base` (column links);
  `text-[13px]` → `text-description` (copyright row)
- `Proof.astro` — `text-[12px]` → `text-sm` (footnote + stat labels);
  `text-[13px]` → `text-description` (stat body)
- `SlaStrip.astro` — `text-[12px]` → `text-sm`; `text-[16px]` → `text-lg`;
  `text-[13px]` → `text-description`
- `Security.astro` — `text-[12px]` → `text-sm`; `text-[13px]` →
  `text-description`
- `WorkflowStep.astro` — `text-[12px]` → `text-sm` (tag);
  `text-[14px]` → `text-base` (body copy)
- `PreferenceSwitcher.astro` — `text-[12px]` → `text-sm`
- `primitives/KbdHint.astro` — `text-[11px]` → `text-xs`

Sizes with no direct token (10, 15, 17, 20, 22, 24, 26, 28, 40, 42,
44, 48, 54, 64 px) intentionally left alone — they're outside the
canonical type scale and likely intentional for marketing display
copy. Touching them requires a designer call (which is exactly what
the Step 1-5 reaudit flagged as F-29 / F-30 — DEFERRED).

The larger surface-heavy files (`GeoResourcePage`, `StateDetailPage`,
`StateCoveragePage`, `TrustPage`, `Pricing`, `Workflow` table sections,
`HeroSurface`, `[trustPage]`, `[guide]`, `[state]`, `[comparison]`,
`[rule]`) are NOT swept — they have 50+ arbitrary sizes each and
deserve a designer pairing pass rather than mechanical drain.

## Deferred (skipped with reason)

- **F-05 (`tracking-[0.06em]` sweep)** — zero hardcoded `0.06em`
  remained in owned files; sweep already complete by earlier waves.
- **F-06 (marketing tracking values broadly)** — 18 × `0.15em`, 6 ×
  `0.16em`, 5 × `0.18em` across surfaces. Three distinct values with
  three distinct visual feels (font size + color combinations
  differ). Mechanical unification would homogenize intentional
  differentiation. Needs design call.
- **F-16 (marketing leading values)** — nine distinct leading values
  (1.1 / 1.2 / 1.25 / 1.3 / 1.4 / 1.5 / 1.6 / 1.65 / 1.7) across display
  copy. Each one tuned to its specific font-size + line context.
  Mechanical fix risks regressing carefully tuned marketing
  typography. Needs design call.
- **F-20 (six duration values)** — only three duration values fall in
  mu-owned files (`upgrade-cta-button.tsx:36` = 500;
  `pulse-notifications-bell.tsx:126` = 150; `app-shell.tsx:265` = 300).
  Introducing global `--duration-quick/standard/slow` tokens for three
  sweeps risks creating a token namespace that other agents wouldn't
  adopt consistently. Needs cross-agent decision.
- **F-22 (`before:bg-white/35` shimmer)** — single-use literal,
  semantically correct (white IS the highlight gleam). Already
  classified `NOT DRIFT` in the original audit. No change.
- **F-25 (z-index ladder)** — values used at 0/10/20/30/40/50/70. Each
  site has implicit semantic meaning (sidebar / content / sticky /
  dropdown / modal / toast / tooltip) that can't be inferred without
  reading the call site. Cross-cutting; needs design call.
- **F-27 (`min-w-[Npx]`)** — too broad, brief said skip.
- **F-28 (`tracking-[0.06em]` already matches token)** — no
  occurrences found in owned files at the time of pass.
- **F-29 (`text-[15px]` / `text-[17px]` missing tier)** — would
  require adding new tokens to the type scale, which is a designer
  call.
- **F-31 (0.12em → 0.08em sweep)** — needs designer eyeball; brief
  said skip.
- **F-37–F-50 (text-[Npx] in apps/app/src)** — all 14 flagged sites
  live in files owned by other agents (clients/pulse/rules/dashboard/
  obligations/login/onboarding). The only one in mu-owned territory
  is `table-header-filter.tsx:243`'s `text-[8px]` — no token at 8px,
  intentional micro-badge.
- **F-54** (single-use ring color) — brief said skip.
- **F-67** (marketing `bg-white`) — brief said skip.
- **F-68 (`border-divider-regular` vs `border-border-default` in
  marketing)** — 8 × divider-regular + 50 × border-default. The 8
  divider-regular calls are all on inner-surface borders (table cells,
  pill badges inside HeroSurface, WorkflowStep menu chrome) — those
  are functionally different from outer page borders. Not pure drift.
  Needs design call.

## New tokens defined

- `--shadow-upgrade-cta-hover` — light + dark, exposed via `preset.css`

## Tokens removed

- `--opacity-2` — zero callers
- `--opacity-8` — zero callers
- `--animate-spin-slow` — zero callers

## TSC

`apps/app && pnpm exec tsc --noEmit` → clean.
`apps/marketing && pnpm exec astro check` → 0 errors / 0 warnings.
`apps/marketing && pnpm build` → 71 pages built clean.

## Lingui

No new strings introduced.
