# 2026-05-25 — Rule library Vibma sweep (third pass): button tone, progress flip, column widths, dialog header

## Why

Yuqi sent a fresh 10-item Vibma annotation list on `/rules/library`
after the previous two passes. Most of the list was either already
landed (#1 section left-align) or needed design discussion (#6
entity state-badge consistency, #9 status visual audit). This
batch ships the seven items that were unambiguous code changes.

## Shipped (7 items)

### #4 — Progress bar re-flip (active LEFT, needs-review RIGHT)

The previous pass flipped the segments so the warning-amber
"needs review" tone anchored the left edge ("backlog meter"
reading). Yuqi reverted: "active 还是在左边" — back to the
canonical "progress fills as you complete work" direction so the
bar reads as a completion meter rather than a backlog meter.

Same two tones (success-green / warning-amber), same per-segment
inline counts, same hover tooltip — just back to active-on-left.
Renamed the local `pendingPct` → `activePct` and re-pointed the
label-fit conditionals so the success segment's label fits when
its own width is generous, not when the opposite side's is.

### #5 — Start review button: amber → primary blue

Yuqi flagged the amber treatment from the previous pass as
reading as "destructive" — the warning-tinted button looked like
a "delete N items" affordance, not a "review N items" one. Two
problems with amber:

1. Same tone as the inline alerts row and the obligation
   `attention` status — the page was leaning on amber too much,
   so the button lost its "this is the next step" cue.
2. Amber against a sentence with no other amber chrome read as a
   _warning state_, not an action affordance.

Switched back to the default primary button color and moved the
count into an inset chip inside the label:

```tsx
<Button size="sm" onClick={startReviewAll}>
  <Trans>Start review</Trans>
  <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-state-accent-active-alt/40 px-1.5 font-mono text-xs tabular-nums">
    {reviewCount}
  </span>
</Button>
```

The chip is `bg-state-accent-active-alt/40` — a translucent deeper
accent so it floats inside the button without competing with the
text. Tabular-nums + mono so the count column stays steady as the
number changes (456 → 12 → 0).

### #2 + #7 — Wider Rule column (34% → 42%)

Rule titles were truncating at ~24 characters on the default
viewport — long titles like "Form 8804 Foreign Partner
Withholding Information Return" lost the entity context to
ellipsis. Bumped the Rule column from `w-[34%]` to `w-[42%]`. The
8% comes from the Form column narrowing (#3 below) and the entity
dot columns absorbing the rest at their fixed `w-[56px]` widths.

### #3 — Narrower Form column (140 → 120px)

Form codes like "1120-S Final" / "7004 Extension" measure ~88px
in the table's font. The previous `w-[140px]` left ~52px of
trailing whitespace on every row. Tightened to `w-[120px]`:
short codes still breathe, longer codes ("1120-W Estimated Q4")
truncate cleanly. The 20px reclaimed goes to the Rule column.

### #8 — Dialog header: kicker / title gap

The detail dialog's `DialogHeader` had `gap-1` (4px) between the
`RuleDetailKicker` (form code + entity dots row) and the
`DialogTitle`. Yuqi flagged: "文字很混乱。也没有 section。加上
section" — the two lines were running together as one block.
Bumped to `gap-2` (8px) so the kicker and title separate
visually into kicker-row + title-row.

### #10 — Dialog title scale (text-base → text-lg)

Yuqi: "title 应该更大" — the rule title at `text-base` (16px) was
the same scale as the body fields below, so the dialog had no
typographic anchor. Bumped to `text-lg` (18px) and added
`leading-tight` so the larger size doesn't push the body content
down.

## Deferred (need design discussion)

### #6 — Entity state-badge consistency

Yuqi flagged the StateBadges used in the rule library don't match
the treatment used in the Pulse drawer (filled chip + mono code +
full state name). The library currently shows the SVG badge in a
hairline border with mono code — fine in isolation but
inconsistent across surfaces. Needs a design call on whether the
library should adopt the Pulse drawer's full-chip treatment or
whether Pulse should slim down to the library's hairline
treatment. Holding.

### #9 — Status visual consistency

Meta direction: do an audit across all status pills (rule status,
obligation status, alert status) and verify they share the same
shape / tone vocabulary. This is a multi-surface audit, not a
single-file code change. Captured for a separate sweep.

### #1 — Section header left-align (verify)

The previous pass landed this; Yuqi wants visual confirmation
that it landed correctly. Will verify on next screenshot pass.

## Files touched

- `apps/app/src/routes/rules.library.tsx`
  - `headerActions` Start Review button (lines ~923)
  - `StatsBar` progress bar (lines ~1145)
  - `GroupedRulesTable` column widths (lines ~1513, 1528)
  - `RuleDetailPanel` DialogHeader + DialogTitle (lines ~2203)

## Verification

- `vp lint apps/app/src/routes/rules.library.tsx` → 0 warnings, 0 errors
