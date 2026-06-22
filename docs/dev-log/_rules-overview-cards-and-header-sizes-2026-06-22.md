# Rule library: "Where to start" cards + header button-size standardization (2026-06-22)

Three Yuqi feedback items on /rules/library.

## 1. "Where to start" → card grid (was rows)

`OverviewReviewBreakdown` rendered the ranked review backlog as a bordered
hairline row list. Reworked into a responsive **card grid**
(`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Each card is its own click target
into that jurisdiction's review queue.

### Polish pass — cards echo the StatBand, stop clashing with it (same day)

Yuqi: "polish where to start cards, and ensure they do not clash with the top
stats rows." The first cut clashed with the borderless StatBand directly above:
boxed cards with an internal `border-t` divider (box-in-box) and a
`font-semibold text-text-warning` count (red + bold — the banned double-highlight
per the type-weight canon). Restructured each card to **mirror the StatBand's
grammar** so the two zones read as one family:

- **Identity → value → sub**, the band's label · value · sub order. Identity =
  seal + name + a quiet drill chevron (slides + turns accent on hover); the
  internal divider + the explicit "Review →" footer are gone.
- **Color budget = the band's.** Count is now NEUTRAL (`text-text-primary`),
  16px/500 `tabular-nums` (the canonical `ClientSummaryStrip` KPI numeral) —
  urgency from SIZE, not red+bold. The lone red flag is high-severity, so only
  the "review these first" jurisdictions (NY, CA) light up (von-Restorff),
  matching the band's red HIGH-SEVERITY column. Colorful state seals carry the
  rest; the sub is omitted when neither high-severity nor wait-age applies.

Verified live: cards now read as a per-jurisdiction echo of the summary band.

### "Ready to accept" quick-win signal (same day)
Yuqi asked what other important info the cards could carry. The card already
answered how-much (count), how-risky (high-severity), how-old (age) — the gap
was *how fast can I clear it*. Added a per-jurisdiction **ready-to-accept** count
(green flag, only when > 0), derived from the SAME AI-draft gate as
`draftGatedPendingCount` (a pending rule is ready when it has no source-defined
draft requirement, or a concrete draft already exists). No new backend — same
`concreteDraftByTarget`/`concreteDraftTargetForRule` plumbing.

- `topReviewJurisdictions` moved below `concreteDraftByTarget` (it now reads that
  map) and its meta loop accumulates `ready` alongside `high`/`oldest`.
- Card sub-line is now ordered segments — green `N ready to accept` · red
  `N high-severity` · muted `Nd waiting` — with dots interleaved only between the
  parts that render. At most one quick-win + one risk flag; both absent on the
  typical card (stays pure-gray), so von-Restorff holds at the grid level.
- Demo: NY "8 ready to accept", CA "5 ready to accept" (≈19 ready library-wide,
  matching the banner's 437/456 draft-gated) — the instant wins now jump out.

Held the two net-new ideas (affected-clients, deadline-proximity) — they need a
join/query this route doesn't load, and would re-bloat the card.

## 2 + 3. Header button size = default, matching Deadlines

Yuqi: the rule-library header buttons are the right size; other pages should
match, and the page should follow the Deadlines page's details. Confirmed both
the rule-library AND Deadlines headers use the **default** Button size (no `size`
prop, h-9). Standardized the outliers to default:

- `/alerts` (`AlertsListPage`): Sources + History header buttons were `size="sm"`.
- `/clients`: `ClientsCreateSplitButton` (New client + chevron) and the Remove-
  sample-data + Import-history header buttons were `size="sm"`.
- `/today`: header is an icon-only refresh + Segmented (no labeled action
  buttons) — left as-is.

`tsgo` clean across all touched files. (Local dev server was stale this session —
verify visually after a refresh.)
