---
title: 'Rule library polish: tone-vs-affordance, View pills, chip rail tidy'
date: 2026-05-18
author: 'Claude'
area: rules
---

# Rule library polish: tone-vs-affordance, View pills, chip rail tidy

## Context

Second-pass critique of the summary-strip rewrite
(see [2026-05-18-rules-library-summary-strips.md](2026-05-18-rules-library-summary-strips.md))
gave the page 33/40 (up from 20/40 in v1). The strip composition worked
but flagged five smaller issues:

- **[P1]** Same orange tone on both clickable and non-clickable strip
  numbers — color was overloaded as both severity signal and affordance
  signal
- **[P1]** Blue `123` number competed visually with the `View coverage
map →` link in the strip, even though the link is the page's actual
  escape hatch
- **[P1]** "Applicability review 100" and "Exception 1" chips duplicated
  the Tier column, saturating one axis with 100/123 of the same value
- **[P2]** Description copy leaked UI mechanics (_"click numbers to
  filter"_) — a tell that the affordance wasn't self-evident
- **[P2]** `w-[80px]` fixed-width label gutter on each strip read as a
  settings form row instead of a newspaper kicker

## Change

### Tone vs affordance (B1) — codified in `SummaryNumber`

Added a doc comment to `SummaryNumber` in
`apps/app/src/routes/rules.library.tsx` establishing the rule
explicitly:

> `tone` signals _severity_ — the data is bad / needs attention. Color
> tokens are pulled from DESIGN.md (text-status-review, text-severity-medium,
> text-text-destructive, text-text-muted, text-text-primary).
>
> `onClick` / `href` signal _affordance_ — this count is actionable.
> Hover state (underline + focus ring) is the universal teacher.
>
> Don't use a warning tone on a count that isn't actionable — that
> conflates "this is bad" with "click me to fix it" and the user learns
> the wrong rule.

Applied to `jurisdictions with gaps`: dropped `tone="warning"` →
`tone="muted"`. The count is informational coverage data, not an
actionable warning. Color now reads as `text-text-muted` (gray) instead
of `text-severity-medium` (orange). The full gap matrix is still one
click away on `/rules/coverage` via the "View coverage map →" pill.

If a future DESIGN.md update changes the severity color stack, the
tone-to-class map is in one place — every Coverage / Sources / future
strip updates together.

### View link prominence (B2) — pill treatment

The trailing "View →" link in each strip used to render as a plain
`text-text-accent` link, visually subordinate to the colored number
adjacent. Now wears a small bordered pill (`h-6` · `border` ·
`bg-background-subtle` · `8px` padding) that _outweighs_ any individual
count number in the row. Affordance > data density.

Hover state lifts the pill: border picks up the accent color,
background flips to default, chevron slides right 0.5px. Standard
escape-hatch motion language consistent with the rest of the app.

### Strip label gutter (C2) — inline kicker

Dropped the `w-[80px]` fixed-width leading label. Label now sits
inline with a `·` separator before the first stat. Reads as
_"Coverage · 3 active · 123 needs review · 52 jurisdictions with
gaps [View coverage map →]"_ — newspaper kicker rhythm, not
settings-form rhythm.

### Description copy (C1)

`Practice rule catalog — review pending rule templates, activate them
into production, and inspect rejected or archived evidence. Coverage
and source-watcher health summarized above; click numbers to filter.`

→

`Catalog of practice rules. Review pending templates, activate them
into production, and inspect rejected or archived evidence.`

The meta-instruction is gone. The strips teach themselves now.

### Chip rail tidy (B3)

`apps/app/src/features/rules/rule-library-tab.tsx`:

```
Before: Needs review · Active · All · Rejected · Archived ·
        Applicability review · Exception            (7 chips)

After:  Needs review · Active · All · Rejected · Archived
                                                  (5 chips)
```

`Applicability review` and `Exception` are _tier_ axes — they live in
the TIER header filter (which already exists) where users can combine
them with other tier values. Promoting them to the chip rail created
the redundant-axes problem: at `Needs review`, 100/123 rows had the
"Applicability review" badge, so the chip filter was information
without signal. Code comment added next to the filterOptions definition
explains the rule for future reviewers.

## Why these changes stay easy to update from DESIGN.md

Three durable patterns:

1. **Color tokens, never hex.** Every tone-class branch in
   `SummaryNumber` maps to a Tailwind/DESIGN.md token. A DESIGN.md
   update to the severity scale changes one mapping, not 12 call sites.
2. **Tone ≠ affordance.** Documented in the component, so a future
   contributor doesn't accidentally re-introduce a warning-tone
   non-clickable count.
3. **Filter rail = status only.** Comment block above `filterOptions`
   in `rule-library-tab.tsx` codifies that the rail is for cross-cutting
   catalog _status_ — tier filtering lives in the header filter.

## Validation

- `pnpm check` — 1047 files formatted, 576 typechecked, clean
- `pnpm test` — 203/203 tests passing
- Browser verified: description trimmed, strips render as inline
  kickers, `52 with gaps` is gray (was orange), "View …" links are
  pills, chip rail shows 5 chips

## Deferred (not in this pass)

From the critique:

- **Sarah's "why" context** — _"Source watchers ingested N candidate
  rules in the last 7 days — bulk review recommended"_ requires a new
  data query; not blocking polish, defer to a separate ingest-summary
  feature pass
- **Jennifer's "my jurisdictions" filter** — account-level filter
  token that scopes all three rows; this is an account-prefs feature,
  bigger than a polish pass
- **Breadcrumb back from `/rules/coverage` filtered view** — when a
  user drilled in via a strip click, the back-path is browser back;
  could add a breadcrumb pill on the detail page later
