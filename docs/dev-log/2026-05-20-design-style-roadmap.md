---
title: 'Design-style roadmap: apply Mercury/Sana/Oku register to every page'
date: 2026-05-20
author: 'Claude'
area: design
---

# Design-style roadmap

## Context

The user pointed to a reference DESIGN.md captured from a related DueDateHQ
dashboard concept (Mercury / Sana AI / Oku-aligned register) and asked that
the same style be applied to every page consistently. The reference is 1613
lines of opinionated principles and tokens; applying it fully across our
codebase is multi-session work.

This commit lands the **spec-level merge** and the **most-impactful global
token shift**. Per-page polish is queued.

## What landed in this commit

1. **DESIGN.md** — merged with the reference's principles:
   - Added a Reference inheritance table (Mercury / Sana / Oku / Linear).
   - Added taste principles T1–T8 verbatim — these become the bar every
     new screen has to clear.
   - Added the 3-tier scan rule (T1 Hero / T2 Support / T3 Background) with
     failure modes documented.
   - Replaced the one-paragraph Do's/Don'ts with a structured list that
     incorporates the reference's stricter rules (no status row tints, no
     emojis, no horizontal table scroll, etc.).

2. **`packages/ui/src/styles/tokens/primitives.css`** — switched the default
   sans font from `'Inter', -apple-system, …` to system-first
   (`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', …`). Apple
   system on macOS / iOS, Segoe UI on Windows, Inter as a hosted fallback.
   This change cascades to every text element in the product instantly.

## What's queued (page-by-page)

Each block below is its own follow-up turn / commit. Listed roughly in
order of impact.

### 1. Dashboard (`/` — `apps/app/src/routes/dashboard.tsx`)

The visible target. Match the reference screenshot's register:

- Page title is the only display-weight element; everything else
  demotes to `text-base font-semibold` for section headers.
- Drop any remaining bordered frames around supporting sections
  (`This week's exposure` already lost its frame this session).
- Action queue rows: client name + `Send N reminder · Confirm M
inbound` line + meta (`across F-1120 (FL corporate) · last sent
21d ago`) + right-aligned action button. Match the reference's
  collapsible-row pattern.
- "Alerts to act on today" with subtle `14 PAST 48H` / `2 NEW`
  counters per the reference. Our current Needs Attention cards
  may consolidate into this list.

### 2. Obligations (`apps/app/src/routes/obligations.tsx`)

Largest single file. Specific violations to fix:

- **Risk-row tinting**: legacy `risk-row-critical` / `-high` /
  `-upcoming` row backgrounds violate T4. New direction: rows stay
  neutral; the priority cell renders a single tinted pill. Tokens
  `risk-row-{tone}` + `risk-row-{tone}-bar` should be deprecated.
- Table header: drop tracked-wider uppercase styling on column
  headers (already a soft hint, but currently still uses
  `tracking-wider` in places).
- Row hover: switch from row-tint to a thin left-edge indicator if
  any indicator is needed at all (or just `bg-state-base-hover`).
- Bulk action bar (landed in C): keep the sticky pattern but verify
  spacing/typography matches the new principles.

### 3. Clients workspace (`apps/app/src/features/clients/ClientFactsWorkspace.tsx`)

This file is dense with chrome. Polish needs:

- Reduce nested cards (anti-pattern per the principles).
- Filing jurisdictions panel: confirm it reads as a single bordered
  surface, not a nested card-in-card.
- Pulse match badges: confirm they use the inline label style, not
  bordered tiles.
- Heading typography: route page-header text is "Client facts" while
  the workspace card title is "Clients" — pick one and apply
  everywhere.

### 4. Rule library (`apps/app/src/features/rules/rule-library-tab.tsx`)

- Row click goes to `/rules/coverage?rule=…` (landed in B). Verify
  the redirect feels native, not detour-like.
- Confirm the table follows the new neutral-row rule.

### 5. Coverage (`apps/app/src/features/rules/coverage-tab.tsx`)

- Page title typography to match the dashboard.
- Inline rule detail panel: confirm it doesn't use a full-card
  border (should be a region inside the surface, not nested).

### 6. Pulse (`apps/app/src/features/pulse/...`)

- Source health pill: confirm it sits as the section header's right
  accessory, not as a separate card.
- Affected clients table: same neutral-row rule.
- Alert detail drawer: typography to match obligation drawer.

### 7. Notifications + Reminders + Audit log (Settings sub-pages)

- All currently use the shared `PageHeader` (landed via D's UIUX
  audit). Confirm consistency.
- Empty states use the shared `EmptyState` component.

### 8. Settings hub itself

- One-line page title + simple grouped sub-page list. Avoid the
  cards-of-cards pattern.

### 9. Global sweeps

- **Remove emoji from any UI surface that still has them** (per the
  new Don't rule). Migration / billing flows are the likely spots.
- **Replace horizontal scrolling tables** with column drops at
  breakpoints. The Obligations table is the main offender at narrow
  widths.
- **Replace any remaining `display-hero` / `display-large` /
  `section-title` / `hero-metric` usages in product surfaces** with
  the standard `text-2xl` page header. Marketing pages may keep the
  larger sizes.
- **Audit `bg-severity-*-tint` usages** across the codebase and
  reduce to pill-only.

## Notes on the merge

The reference DESIGN.md has project-specific content that doesn't apply
to our IA (the "four alert surfaces", "Mode A-F" vocabulary, certain
named components). I kept the principles + tokens + Do's/Don'ts and
adapted the component contract section to match our existing codebase
(Dify-style 3-layer token tree, Pulse / Coverage / Obligations nouns).

The legacy section is preserved under "## Direction (legacy)" — the
content is still load-bearing for things like the Migration Copilot
spec, command-palette behavior, and shadcn primitive contracts.

Where principles conflict (new "no display face > 24px in product"
versus existing 54/36/32 typography tokens), the new principle wins
for **new product work**; the legacy tokens remain for marketing
surfaces only.
