# 2026-05-27 — Rule library: collapse Needs-review column + pill jurisdiction badge

Branch: `design/audit-drain-pass-1`

## Yuqi's ask

Two follow-ups on the [audit-drain x2 rework](2026-05-27-audit-drain-x2-rule-library-ux.md):

> 你看现在的working code. 为什么这个要写x need review? 直接写数字
> 不行吗？

and

> 或者只写数字，和后一个column的progressbar写在一起。这个 badge 用
> 第二张图的样式

Two concerns:

1. The freshly-added Needs-review column was redundant — every row's
   chip just repeated the column header ("9 need review") in plain
   English. The number was the only signal carrying information.
2. The naked `StateBadge` + 2-letter code at the start of each group
   header read as two loose elements; should be one contained pill.

## What shipped

### 1. Folded Needs-review back into the Tier cell

`apps/app/src/routes/rules.library.tsx`

- Dropped the dedicated `<TableHead>` "Needs review" + its sort
  button and the matching `<TableCell>` on `GroupHeaderRow`. Dropped
  the per-rule em-dash placeholder cell on `RuleTableRow`.
- Moved the `pendingReviewCount` chip into the Tier cell, sitting
  LEFT of the existing gap chip + `RuleStatusBar`. New cluster reads
  left-to-right: **review queue → missing → overall status**.
- The chip is now number-only (`• 9`) instead of `• 9 need review`.
  Accent dot still carries the "this is review work" tone signal;
  verbal label moved to a `title` attribute on the inner span so
  hover tooltip + assistive tech still get "9 need review".
- `RULES_TABLE_COLUMN_COUNT` decremented from `4 + ENTITY_KEYS.length`
  to `3 + ENTITY_KEYS.length`. All `colSpan` arithmetic that
  references the constant (loading skeletons, missing-rule row, status
  section headers) follows automatically.

### 2. Dropped the column-level sort

Removed `needsReviewSort` state, `toggleNeedsReviewSort` callback,
`sortedFilteredGroups` memo, prop drilling, and the sort affordance
on the column header (now gone). The "Needs review 456" scope tab
above the table already filters to jurisdictions with review work,
which covers the same intent at the navigation level.

If a sort surface is wanted later it can live as a dropdown next to
the scope tabs rather than a column-header click target.

### 3. Bordered pill jurisdiction badge

The group header's flag-svg + 2-letter code used to sit naked:

```tsx
<span className="inline-flex items-center gap-1.5">
  <StateBadge code={group.jurisdiction} size="xs" .../>
  <span>{group.jurisdiction}</span>
</span>
```

Wrapped in a contained pill (`rounded-md border border-divider-subtle
bg-background-subtle px-1.5 py-0.5`) so the flag + code reads as one
chip, matching the visual treatment Yuqi pasted in the brief. Same
hairline border + faint background recipe as other inline pills
across the workbench tables — consistent without re-learning.

## Tests

`apps/app/src/routes/rules.library.test.tsx`

The loading-state assertion previously waited on the literal string
`"1 needs review"` to confirm the count rendered. With the chip
number-only that text no longer exists. Switched to a CSS-attribute
selector (`[title="1 need review"]`) which keys off the verbal label
preserved on the inner span. Added a small `waitForSelector` helper
mirroring the existing `waitForText` / `waitForButton` polling
pattern.

14/14 suite tests still pass.

## Verification

- `pnpm --filter=app exec tsc --noEmit` — clean
- `pnpm --filter=app test -- src/routes/rules.library.test.tsx` —
  14/14 pass
- Manual: dev server on :5190, `/rules/library` renders group rows
  with `[🇺🇸 FED]` bordered pills, Tier cell shows `• N` chip + gap
  chip + progress bar in one right-aligned cluster, expand still
  paints rule rows with correct column alignment

## Why

The audit-drain x2 rework added the column on Yuqi's ask ("Put a
Needs Review number in a new column"). After living with it, the
column had two problems:

1. **Repeated copy** — every row said "N need review" right under a
   header that said "Needs review". Eye-scanning a column of plural
   strings is slower than scanning a column of right-aligned numbers,
   and the column header already told you what the number meant.
2. **Wasted real estate** — the column carried one chip plus an
   em-dash placeholder for every per-rule row. The em-dash row added
   visual noise to make the matrix look "complete" but the rule's
   own status section ("Needs review" vs "Active") already encoded
   that signal one row up.

Folding back into the Tier cell trades the column-level sort (rarely
used given the scope tab) for a cleaner table that scans
identity → applicability → workload → classification in 9 columns
instead of 10.

## Related docs

- [`2026-05-27-audit-drain-x2-rule-library-ux.md`](2026-05-27-audit-drain-x2-rule-library-ux.md)
  — the original rework that added the column; this entry reverses
  that specific decision and keeps the rest (infinite scroll,
  tooltip).
- `docs/Design/rules-library-critique-2026-05-26.md` — section §8
  shipped patches; added a follow-up bullet noting the column
  collapse so the canonical critique stays current.
