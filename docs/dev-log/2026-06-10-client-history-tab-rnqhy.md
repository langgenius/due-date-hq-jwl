# Client detail — History tab → rNqhy card chrome

**Date:** 2026-06-10

Pencil `rNqhy` reframes the History tab as two bordered cards, each with a gray
heading-row (title · sub · actions): **Activity summary** (AI recap) and
**Activity log** (audit trail). Built a shared local `HistoryCard` (rounded-xl
border + `bg-background-section` heading row + optional footer) and restructured
both sections from the `TabSection`-above-a-panel pattern into it — aligning the
History tab's chrome with the deadline + alert detail surfaces.

- `ClientActivityPanel` is now frameless (the card provides the frame); the
  count chip moved into the heading row.
- `ClientRiskSummaryPanel` was already frameless; its old `rounded-lg` wrapper is
  gone.
- **Affordances (Yuqi: "remove email, add to brief and flag for v1"):** only the
  **Copy recap** footer chip is wired (`CopyRecapButton` copies the insight
  sections' label+text). Email partner / Add to brief / Flag inaccuracy / Export
  were omitted — no backends (no-fiction).

All design-system tokens, no hex. tsgo clean; verified live.

**Deferred to v2** (rNqhy audit-log affordances, additive): date-grouped timeline
(TODAY / YESTERDAY / …), search, Filter/Year dropdowns, Export, "Showing N of M"
pagination. The current flat divide-y list + count chip stands in until then.
