# Page-padding canon — 2026-05-26

Closes audit P0 #2 — "Page-header padding + outer gap inconsistent
across 5 routes (5 different values)."

## The actual landscape at ship time

The audit (written 2026-05-25) catalogued 5 different padding shapes
across the workbench routes. By the time this commit started, Yuqi's
"seventy-fourth pass" (2026-05-26, earlier this day) had already
converged 7 of 8 workbench surfaces onto two deliberate patterns.
This commit fixes the last outlier (`/opportunities`) and codifies
the 2-pattern model in DESIGN.md so future routes don't drift.

## The two patterns

The decision is **not subjective**. It's driven by one question:
_does this page end in a sticky footer (pagination, bulk-action bar,
filing-plan footer)?_

### Pattern A — Scroll page (header-heavy, natural scroll-to-end)

```
mx-auto flex w-full max-w-page-wide flex-col
gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6
```

Used by: `/` dashboard, `/rules/pulse`, `/rules/library`, `/opportunities`.

- `gap-6` (24 px) gives multi-section h2 surfaces room to breathe.
- `md:pb-6` keeps the last section 24 px clear of the viewport bottom.

### Pattern B — Sticky-footer table page (footer pinned to viewport)

```
mx-auto flex w-full max-w-page-wide flex-col
gap-4 px-4 pt-6 pb-0 md:px-6 md:pt-8 md:pb-0
```

Used by: `/deadlines`, `/clients`, `/clients/[id]`.

- `gap-4` (16 px) is the GitHub-density rhythm — dense tables want
  the page-level gap tight so the table itself gets the visual budget.
- `pb-0` lets the table's pagination strip (or the floating bulk-action
  bar) ride flush to the viewport bottom — any extra `pb-*` would
  leave dead space below the pinned bar.

## What shipped in this commit

### 1 · `/opportunities` snapped to Pattern A

`apps/app/src/features/opportunities/opportunities-page.tsx:54`

```diff
- <div className="mx-auto flex w-full max-w-page-wide flex-col gap-4 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-5">
+ <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6">
```

Two changes:

- **`gap-4` → `gap-6`** — Opportunities is a _header-heavy scroll_
  page (PageHeader → stat tiles → list → dismissed disclosure), not a
  dense table. It belongs in Pattern A. The 2026-05-25 pass that set
  `gap-4` misread it as a table page.
- **`md:pb-5` → `md:pb-6`** — `md:pb-5` (20 px) was the audit's
  singleton off-canon value. Snapped to the Pattern A 24 px.

### 2 · DESIGN.md §5.5 — "Page padding canon"

New section under §5 Layout Principles. Contents:

- Both pattern class strings with the canonical line breaks
- Which routes use which (concrete lookup table)
- Decision tree (the sticky-footer question)
- Banned values (`md:pb-5`, `gap-5` on workbench, etc.)
- Other page families that DON'T use these patterns (billing,
  entry-shell, settings, fallback) so future authors don't apply
  the canon where it doesn't belong

This is the doc the next contributor reaches for when adding a new
route — saves the "what padding should I use?" question from
re-litigation.

### 3 · Audit P0 #2 annotation

Top-10 row now carries a "Shipped 2026-05-26" status with the
2-pattern model summary.

## What didn't change

- **No PageHeader changes.** The padding being unified lives on the
  _page-level container_ (the `<div>` outside `PageHeader`), not on
  the primitive itself. PageHeader's API is unchanged.
- **No other route touched.** 7 of 8 workbench surfaces were already
  on the canonical patterns before this commit; touching them would
  be churn-only.
- **No max-width unification.** Audit P0 #10 is a separate finding
  about `/rules/pulse` switching `max-w-page-wide` ↔ `max-w-[1440px]`
  when the panel opens. That's out of scope here and still open.

## Verification

```bash
CI=true pnpm exec vp check
# Expected: 0 errors, pre-existing warnings unchanged
```

Visual: with the dashboard h1 fix (audit T1, still open), the
3-section workbench routes (dashboard / opportunities / rule library
/ pulse) should all read at the same vertical rhythm. Currently they
do EXCEPT the dashboard h1 sits at 20 px instead of 24 px — that's
T1's job, not this commit's.

## Out-of-scope follow-ups

- **Audit T1** (dashboard h1 routes through PageHeader). Now that the
  page-level canon is locked, T1 is the last piece for full
  workbench parity.
- **Audit P0 #10** (`/rules/pulse` max-width switch). Separate
  finding — fix is to pick one container width and let the panel
  column grow, instead of swapping between `max-w-page-wide` and
  `max-w-[1440px]`.
- **`/rules/library` `wide` prop** is currently a one-route opt-in
  (rule library has 7 entity columns + jurisdiction + tier and
  benefits from 1440 px). Worth promoting to a Pattern A.wide
  variant if a second route needs it.
