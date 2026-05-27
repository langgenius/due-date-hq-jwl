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

## Follow-up batch (same session)

After the first commit landed, Yuqi flagged three more refinements
that ship in the same branch:

### Chip moved to the RIGHT of the progress bar

> progress bar 因为左边是绿色 active，右边是 need review, 所以这个
> need review 的数字应该写在右边

The chip first landed LEFT of the progress bar. But the bar paints
active (green) on the LEFT → review on the RIGHT, so anchoring the
review count on the LEFT side of the bar was spatially backwards.
Swapped the cluster order so the right-aligned `<div>` now reads:
gap chip → progress bar → review chip. The count now sits next to
the bar segment it actually counts.

### Bordered pill border bumped to `divider-deep`

First pass used `border-divider-subtle` (4% alpha) — Yuqi feedback
was "看不见呀" (can't see it). Bumped to `border-divider-deep` (14%
alpha) so the pill actually reads as a contained chip instead of
floating tokens.

### Brown unification of "needs review" color

> 上面的大进度条用红色来表示 need review,而其他所有的地方都是用
> 蓝色。需要统一,我觉得可以用棕色?

The page had two conflicting tones for the same concept:

- **Top stat bar** — `bg-state-warning-hover` + `text-text-warning`
  (coral/red — read as "alarm")
- **Everywhere else** — `bg-accent-default` + `text-text-accent`
  (blue — read as "info")

Unified on a **brown** tone: sienna text (`yellow-700` = `#a15c07`)
on cream backgrounds (`yellow-50/100` = `#fefbe8`/`#fef7c3`), mustard
solid fills (`yellow-600` = `#ca8504`) for dots and bar segments.
Brown sits between blue (informational) and red (alarm) — reads as
"attention needed, not urgent." Five surfaces switched in one
sweep:

1. `RuleReviewProgressBar` `pending_review` segment — cream tint +
   sienna text
2. "456 rules need review" callout chip — sienna pill on cream bg
3. `RuleStatusBar` per-row review segment + tooltip dot — mustard
   solid
4. `EntityStateCell` "1/5" pending count — sienna text on the
   bright digit
5. Per-row chip in the Tier cell — mustard dot + sienna number
6. `EntityApplicabilityCell` per-rule dot when `tone === 'review'`
   — mustard
7. Needs-review row background tint (`bg-state-warning-hover/40` →
   `bg-yellow-50/60`)
8. Status-section header text (`NEEDS REVIEW 3`) — sienna
9. `RuleStatusKicker` for `pending_review` / `candidate` rules —
   sienna icon + text

Kept blue for surfaces that are NOT a "needs review" indicator: the
"Start review N" primary CTA button (primary action, not status),
the scope-tab active underline (navigation chrome), the "verified"
progress segment (different status).

The brown classes are held as `REVIEW_*_CLS` consts at module top
rather than as new semantic tokens (`--state-review-*`). Promotion
to semantic tokens can happen once other pages adopt the same tone
— for now the rollout is contained to this one surface.

## Related docs

- [`2026-05-27-audit-drain-x2-rule-library-ux.md`](2026-05-27-audit-drain-x2-rule-library-ux.md)
  — the original rework that added the column; this entry reverses
  that specific decision and keeps the rest (infinite scroll,
  tooltip).
- `docs/Design/rules-library-critique-2026-05-26.md` — section §8
  shipped patches; added a follow-up bullet noting the column
  collapse so the canonical critique stays current.
