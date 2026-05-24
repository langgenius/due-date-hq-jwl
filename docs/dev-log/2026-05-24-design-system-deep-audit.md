---
title: 'Deep design-system audit — spacing, radius, headers'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: audit
---

# Deep design-system audit — spacing, radius, headers

## Why

You asked specifically about paddings, margins, gaps, rounded
corners, borders, layouts, forms, tables, header rows, and clip.
I ran a structured pass through each category against `apps/app/src`.

## Audit results

| Category                                | Findings                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Arbitrary padding** (`p-[Npx]`)       | **2 sites**, both intentional table-cell indent overrides in `rules.library.tsx` — heavily commented, explains why `!pl-[34px]` / `!pl-[10px]` rather than the primitive's `p-3`. Stays.                                                                                                                                                                                        |
| **Arbitrary margin** (`m-[Npx]`)        | **Zero.**                                                                                                                                                                                                                                                                                                                                                                       |
| **Arbitrary gap** (`gap-[Npx]`)         | **Zero.** All on Tailwind scale (gap-1/2/3/4/5/6 dominate; 996 uses across the app).                                                                                                                                                                                                                                                                                            |
| **Arbitrary rounded** (`rounded-[Npx]`) | **2 sites — fixed in this commit.**                                                                                                                                                                                                                                                                                                                                             |
| **Arbitrary border-width**              | **Zero.**                                                                                                                                                                                                                                                                                                                                                                       |
| **Border colors**                       | Uniform — 146× `border-divider-regular`, 128× `border-divider-subtle`, then state/status tokens for emphasis.                                                                                                                                                                                                                                                                   |
| **Rounded scale distribution**          | Healthy semantic hierarchy: `rounded-md` (170×, most common — buttons, inputs, popovers) > `rounded-full` (78×, badges/avatars) > `rounded-lg` (68×, cards) > `rounded-sm` (65×, small chips) > `rounded` (32×) > `rounded-xl` (10×, large modals).                                                                                                                             |
| **Tables**                              | **13 files use the shared Table primitive. Zero raw `<thead>` / `<th>` tags. 93× `<TableHead>` usage.** Clean.                                                                                                                                                                                                                                                                  |
| **Forms**                               | 29 `<form>` elements across the app. 11 raw `<label>` tags vs 8 files importing the Label primitive — but inspection shows raw labels are intentional flex/grid wrappers around toggles/checkboxes (settings rows, choice lists). Not bypasses.                                                                                                                                 |
| **Page heros**                          | **Fixed in this commit.** 7 ad-hoc h1 patterns; 2 were real migrations (account.security, billing), 5 were intentional exemptions (dashboard intentionally larger per PageHeader docstring; AlertsListPage has a PulsingDot prefix; practice has a Building2 icon adornment; readiness is a public portal with its own layout; Wizard.tsx was a font-mono stat, not a heading). |
| **Overflow / clip**                     | Uniform — 42× `overflow-hidden`, 0× `overflow-clip`.                                                                                                                                                                                                                                                                                                                            |

## What changed

### 1. Two off-scale `rounded-[Npx]` → `rounded-sm`

`apps/app/src/features/migration/Step1Intake.tsx`

Both occurrences were on small file-format logo tiles (Excel/CSV
chip + the larger preset card icon). `rounded-[4px]` and
`rounded-[5px]` are off-scale; both collapse to `rounded-sm` (4px
in Tailwind v4), which is also the value used elsewhere in the app
for "small logo tile" treatments. Visually unchanged on the 4px
chip; the 5px card icon tightens by 1px. Inline comments explain
the choice.

### 2. Two page heros migrated to `<PageHeader>`

`apps/app/src/routes/account.security.tsx`,
`apps/app/src/routes/billing.tsx`

PageHeader's docstring is explicit: _"all of them route through this
single component"_ to keep typography, padding, eyebrow tracking,
and action-cluster placement in lockstep. Two pages had drifted
into ad-hoc `Breadcrumb + <h1>` + Badge layouts:

- **Security** (account → security): Breadcrumb + h1 + MFA status
  Badge. Now: `<PageHeader breadcrumbs={...} title={...} actions={<Badge>...} />`.
- **Billing** (settings → billing): Breadcrumb + h1 + description
  - current-plan Badge. Now: `<PageHeader breadcrumbs={...}
title={...} description={...} actions={<Badge>...} />`.

Browser smoke confirmed both pages now render the canonical
PageHeader shape (h1 classes `text-2xl leading-7 font-semibold
text-text-primary`, parent `flex min-w-0 flex-col gap-2`). Bonus:
billing's h1 line-height tightens from default `leading-tight` to
canonical `leading-7`, matching every other route.

## What I considered but skipped

- **Dashboard hero** — PageHeader docstring explicitly exempts it
  ("intentionally larger and lives outside this component").
- **AlertsListPage hero** — uses a custom `<PulsingDot>` prefix
  on the h1; would require extending PageHeader to support a
  `titleAdornment` slot. Not worth a one-off API expansion.
- **Practice profile hero** — has a `<Building2Icon>` tile to the
  left of the title and a role badge to the right. Same titleAdornment
  question. Stays custom.
- **Readiness portal** — public-facing magic-link page with its
  own layout (different background, different width cap). Not a
  signed-in route surface that PageHeader is designed for.
- **Members page max-w-[1172px], Billing's max-w-[1180px]** — same
  outliers I flagged in the previous design-system commit. Left
  for a design call rather than guessing.
- **Raw `<label>` tags** (11 occurrences) — every one inspected is
  intentional: wrapping a Checkbox/Switch/Radio with flex layout
  that the Label primitive (a thin text-styling wrapper) would not
  improve. Stays.
- **Table column widths in ClientFactsWorkspace** — 12 hardcoded
  values, but all local to one component's precise layout. Tokenizing
  would couple this table to others that don't share its intent.
  Stays local.

## Verification

- `pnpm check` → 1387 files formatted, 655 lint+type clean.
- `pnpm test` → 295/295 green.
- Browser smoke (`/billing`, `/account/security`): both h1s carry
  the canonical PageHeader classes (`text-2xl leading-7 font-semibold
text-text-primary`) and live in the canonical parent shape (`flex
min-w-0 flex-col gap-2`).

## Files touched

- M `apps/app/src/features/migration/Step1Intake.tsx`
- M `apps/app/src/routes/account.security.tsx`
- M `apps/app/src/routes/billing.tsx`
