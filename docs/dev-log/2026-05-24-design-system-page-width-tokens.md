---
title: 'Design-system audit + page-width tokens'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: audit
---

# Design-system consistency audit + page-width tokens

## Why

You asked me to make sure the app's design system is used
consistently so future updates land in one place, not fifty.

I ran a structured audit across all `apps/app/src/` against the
DueDateHQ design tokens (semantic-light.css / preset.css) and the
shadcn / Base UI primitives in `packages/ui`. Verdict: **the
codebase is well-disciplined.**

- **CLEAN**: raw Tailwind palette colors (`text-gray-*` / `bg-red-*`)
  — zero in source.
- **CLEAN**: ad-hoc Badge / Card / Dialog / Alert replacements —
  every surface uses the primitive.
- **CLEAN**: hardcoded transitions / cubic-beziers — all use
  Tailwind defaults.
- **CLEAN**: `<button>` re-implementing primary/secondary styling —
  every styled button uses the Button primitive.
- **CLEAN**: `font-mono` usage — all on legitimate tabular numbers,
  IDs, codes, hotkey hints (no prose in mono).
- **3 inline hex cases**: all intentional (Google + Microsoft OAuth
  logo SVGs, opacity overlays like `bg-black/30`).

Two real findings worth a focused commit:

1. **One inline-hex bypass on a pill** — `ClientFactsWorkspace.tsx`
   used `bg-[var(--color-util-colors-blue-100,#dbeafe)] text-[var(--color-util-colors-blue-700,#1447e6)]`
   (arbitrary-value Tailwind with hex fallback) for the
   current-year "open filings" pill, reaching past the semantic
   layer for a raw primitive.
2. **Page-width caps were inlined as magic pixel values** —
   `max-w-[1100px]` (7×), `max-w-[920px]` (3×), `max-w-[880px]`
   (4×) across 14 page containers. Bumping the content width from
   1100 to 1200 would have meant editing 7 files; now it's one
   line.

## What changed

### Page-width tokens

`packages/ui/src/styles/preset.css`

Added three `--container-*` tokens inside the existing
`@theme inline` block. Tailwind v4 exposes these automatically as
`max-w-page-wide` / `max-w-page-medium` / `max-w-page-narrow`
utility classes.

```css
--container-page-wide: 1100px; /* content-heavy lists & details */
--container-page-medium: 920px; /* form-density side-metadata */
--container-page-narrow: 880px; /* focused single-column */
```

Token mapping documented inline in the CSS so the next person who
adds a page knows which width tier to pick.

### 14 call sites migrated

`max-w-[1100px]` → `max-w-page-wide` in:

- `features/opportunities/opportunities-page.tsx`
- `features/pulse/AlertsListPage.tsx`
- `features/audit/audit-log-page.tsx` (2×)
- `routes/settings.tsx`
- `routes/dashboard.tsx`
- `routes/clients.tsx`

`max-w-[920px]` → `max-w-page-medium` in:

- `routes/account.security.tsx` (3× — same component, different states)

`max-w-[880px]` → `max-w-page-narrow` in:

- `routes/practice.tsx` (4× — same component, different states)

### Inline-hex pill fix (ClientFactsWorkspace)

The current-year "open filings" pill at the year-section header now
uses the same color treatment the Badge `info` variant exposes
(`bg-components-badge-bg-blue-soft text-text-accent`) instead of
reaching past the semantic layer to a raw primitive token. The
square-corner shape is preserved (Badge defaults to fully rounded;
this stays a soft-corner tag for visual distinction from the
fully-rounded row pills above it).

## What I considered but deferred

- **Members page (1172px) and Billing page (1180px)** use their own
  widths, slightly larger than 1100. These look like drift to me —
  probably should standardize on the wide token — but the choice
  is small enough that I left them for a design call rather than
  guessing.
- **PageHeader subtitle's `max-w-[1080px]`** is a typography
  constraint (line length for description copy), not a page
  container. Kept as-is.
- **ClientFactsWorkspace table column widths** (`w-[80px]`,
  `w-[120px]`, etc. — 12 hardcoded values in one file) — these are
  intentional precise column layout. Tokenizing them would couple
  this table's design to other components that don't share the
  same layout intent. Stays local.
- **Micro-typography sizes** (`text-[10px]`, `text-[11px]` —
  scattered across rules + auth surfaces) — likely deliberate
  caption / label sizes, not drift. Don't standardize yet.
- **Opacity overlays** (`bg-black/30` for popover backdrops,
  `bg-white/20` for badge overlays) — clear pattern, acceptable.
  Could be tokenized to `bg-overlay-dark` / `bg-overlay-light` if
  brand adopts opacity layers formally.

## Verification

- `pnpm check` → 1386 files formatted, 655 lint+type clean.
- `pnpm test` → 295/295 green.
- Browser smoke: visited `/clients`, queried the page container's
  computed `maxWidth` → resolved to `1100px`. Theme variable
  pipeline working end-to-end.

## Files touched

- M `packages/ui/src/styles/preset.css`
- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- M `apps/app/src/features/opportunities/opportunities-page.tsx`
- M `apps/app/src/features/pulse/AlertsListPage.tsx`
- M `apps/app/src/features/audit/audit-log-page.tsx`
- M `apps/app/src/routes/settings.tsx`
- M `apps/app/src/routes/dashboard.tsx`
- M `apps/app/src/routes/clients.tsx`
- M `apps/app/src/routes/practice.tsx`
- M `apps/app/src/routes/account.security.tsx`
