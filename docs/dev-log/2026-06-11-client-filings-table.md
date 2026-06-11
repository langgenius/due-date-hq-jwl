# Client detail — Filings → fixed-column table (VtC73)

**Date:** 2026-06-11

Review #12: the Filings tab rendered `DeadlineRow` flex cards, not a table. Rebuilt
it to Pencil VtC73's fixed-column table — DEADLINE fills, STATUS / INTERNAL DUE /
OFFICIAL DUE / OWNER are fixed-width columns + an expand chevron.

- **Isolated to `mode="inline-expand"`** (the client Filings). `DeadlineRow`'s flex
  layout is unchanged for navigate/drawer surfaces (/today, /alerts) — the branch
  duplicates the wrapper, flex copied verbatim, so no regression there.
- **Header row** added in `FilingPlanYearSection` with a grid that matches the row
  exactly (`grid-cols-[minmax(0,1fr)_148px_124px_104px_132px_24px]`).
- **Due columns, real data (no-fiction):** the queue row has `baseDueDate`
  (statutory) + `currentDueDate` (working) + `daysUntilDue`, but **no firm
  internal-target field**. So INTERNAL DUE = `currentDueDate ?? baseDueDate` +
  the days countdown; OFFICIAL DUE = `baseDueDate`. When there's no buffer the two
  dates coincide (matches the /deadlines detail "no buffer — same as filing").
- §1b — active/open row shares one accent (`bg-state-accent-hover`, VtC73 #eff4ff).

tsgo clean. Verified live (preview was flaky from concurrent app-shell WIP).

**Still open:** OFFICIAL DUE year format; the expanded-row action redesign (harsh
critique); header/rail polish items from the review.
