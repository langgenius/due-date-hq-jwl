# /rules/library overview — drop the duplicated "Pending review" stat

**Date:** 2026-06-29
**Files:** `apps/app/src/routes/rules.library.tsx`

## Why

Yuqi: the overview "looks messy". A big driver was number repetition — "456" appeared four times in
the upper zone before any action: the rail header ("456 to review"), the "Needs review 456" tab, the
review banner/pill ("456 rules need your review"), and the "PENDING REVIEW 456" stat directly below the
banner. The banner and the stat stacked the same figure.

## What changed

Dropped the **Pending review** stat from the overview `StatBand`. The review banner — and its
collapsed pill — ALWAYS print "N rules need review" right above it, so the stat was pure echo. The
band is now **High-severity · Coverage · Total**. The backlog's staleness still reads in "Where to
start"'s per-jurisdiction "Nd waiting", so the dropped "oldest Nd" sub isn't missed (its now-unused
`oldestReviewRelative` memo was removed).

Left the parallel session's recent "Where to start" tiering + rail high-severity flags untouched.

## Verification

Live-verified: stat row is 3 stats, no "PENDING REVIEW" echo. `vp check` clean (format + lint + types).
