# 2026-05-24 — Drop "N open filings" duplicate from H1 subtitle (distill)

## Why

Critique P0: the page had **three near-identical "open filings"
counts** above the fold —

1. H1 subtitle: "12 open filings · next due May 6 · 1 late"
2. Open Filing summary tile: `12`
3. Year-section header badge: "3 open filings" (per-year scope)

A CPA scanning the page couldn't tell whether they were seeing one
number, two, or three. They had to compute the relationship instead
of just reading.

The Open Filing summary tile (now at 20px after the typeset pass) is
the canonical all-years count. The year-section badge is per-year
and contextually obvious from sitting inside "2025 · current year".
So the H1 subtitle's count is pure duplication.

## What changed

`apps/app/src/features/clients/ClientFactsWorkspace.tsx` —
`renderClientHeaderSubLine`:

- Dropped the `open` segment that rendered "N open filing(s)".
- Subtitle now carries only: tax classification (when LLC) → next
  due date → late count or "All on track" badge.

Subtitle reads as ~25% shorter — the CPA's eye flows past it
faster to the tile strip, which is where the canonical numbers
live.

## Verification

- tsc clean
- lint 0/0

## Caveat

If a client has zero open filings AND zero next-due date, the
subtitle now collapses to just the tax classification (or nothing
for non-LLCs). That's correct — when the page has nothing urgent,
the subtitle should be quiet.
