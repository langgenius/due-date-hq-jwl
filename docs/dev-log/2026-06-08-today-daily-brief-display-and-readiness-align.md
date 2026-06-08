# /today — restore the Daily Brief + align the readiness column

Date: 2026-06-08

Two Yuqi /today fixes after the At-a-glance removal.

## "Where is the daily digest?" — Daily Brief was vanishing

The Daily Brief card (`daily-brief-card.tsx`) renders `null` when `data.brief`
is null. It was null in the demo (and in real use after an overnight roll-over)
because the repo's `load` fetched the brief via `findLatestBrief`, which
**exact-matches `asOfDate`**. The dashboard loads with _today's_ date, but the
seeded/persisted brief carries the date it was generated (e.g. `2026-06-02`), so
the equality never held and the card disappeared.

`findLatestBrief`'s exact match is correct for the **refresh** path (it wants
_today's_ pending/ready brief), so that was left untouched. Added a separate
display lookup, `findBriefForDisplay`, that returns the most recent brief
generated **on or before** `asOfDate` (`lte(asOfDate)`, ordered `asOfDate desc`).
A daily brief should persist and surface its own staleness via the freshness chip
("Outdated") rather than blink out at midnight. `load` now uses it.

- `packages/db/src/repo/dashboard.ts`: new `findBriefForDisplay`; `load` calls it
  instead of `findLatestBrief`. Refresh procedure unchanged.
- Verified in preview: the brief now shows with the "Outdated" chip + Regenerate.

## Readiness column misalignment

The `ReadinessIndicator` dots are one-per-expected-doc, so a 3-doc filing pushed
its "Docs 0/3" label further right than a 1-doc payment's "Docs 0/1" — the counts
formed a ragged left edge down the Actions column.

Fixed: the dots sit in a fixed-width box (`w-[1.625rem]` = 3 dots @ 6px + 2 gaps
@ 4px = 26px, the column's max denominator), left-aligned. The "Docs N/M" count
now starts at the same x on every row regardless of doc count.

- `apps/app/src/components/primitives/readiness-indicator.tsx`.
- Verified in preview: every count label measures `left: 1053px` (was 1053/1059
  split by dot count). Shared with /deadlines, so the alignment carries there too.

## Verify

- tsgo 0 (app + db); db dashboard repo tests 5/5; readiness tests 11/11.
