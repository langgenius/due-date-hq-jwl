# Rule library pixel-pass — deferred surfaces completed

Date: 2026-06-07

Completes the Rule library pixel pass for the surfaces a prior pass
deferred. The earlier pass restyled the jurisdiction rail + KPI strip; this
pass takes the Overview right pane, the Sources view, and the rule-detail
drawer to their Pencil canvases. Purely an additive visual restyle — every
wired query, handler, and behavior (infinite scroll, batch review, gap rows,
source filters/retry, accept/reject/edit) is preserved.

## Overview right pane (Pencil O0pyRO)

`apps/app/src/routes/rules.library.tsx` — three summary blocks now render
ABOVE the wired `GroupedRulesTable` on the "All jurisdictions" overview
(gated on `!selectedGroup && !isSearching && !statsLoading`):

- `OverviewActionHero` — blue review-queue callout (count tile + "oldest Nd"
  chip + "Open review queue" CTA wired to `startReviewAll`); shown only when
  rules await review.
- `OverviewStatusCoverageCard` — segmented active/review/draft bar + chips,
  from the catalog-wide `statusCounts`.
- `OverviewRecentChangesCard` — the 5 most-recently-touched rules (by
  `reviewedAt` → `verifiedAt`) with jurisdiction pill, change-kind pill, and
  relative timestamp; each row opens the rule via the same `?rule=`
  deep-link the table uses.

All read from the same wired `rules` payload the table consumes. The meta
line shows only `reviewedByName` (never the raw `verifiedBy` seed slug the
library deliberately hides — verified by the existing seed-placeholder
tests). The grouped table's behavior is untouched.

## Sources view (Pencil bf6Ni)

`apps/app/src/features/rules/sources-tab.tsx` —

- `SourcesKpiStrip` — 4-stat band (Feeds monitored · Rules derived ·
  Fetched last 24h · Failed fetches), mono values, hairline dividers,
  tone-colored failed value. Derived from the wired source + health
  payloads + a (warm-cache) `listRules` count.
- Jurisdiction cell → accent-tinted mono pill; source type → subtle pill.

TODO(data): `RuleSource` has no per-source derived-rule count, so "Rules
derived" falls back to the total rule-catalog size.

## Rule-detail drawer (Pencil DvLC9)

`apps/app/src/routes/rules.library.tsx` (`RuleDetailPanel`) — kept the
Dialog container, restyled the content to the 960px canvas:

- Widened 640 → 960px (responsive cap at viewport width).
- `RuleEffectiveBanner` — amber "Effective in N days" callout when
  `verifiedAt` is still future.
- Header meta row gains the canvas pills: jurisdiction pill + risk-level
  `RuleImpactPill`.
- Review footer gains a "Decisions are logged to the audit ledger" eyebrow
  above the preserved `CandidateReviewSection`.

## Alaska selected / detail (Pencil G6P12y / oJL8o)

Substantially covered by the prior pass's per-jurisdiction work
(`JurisdictionKpiStrip` + `JurisdictionRuleTable` + `JurisdictionStatusChips`
in the PageHeader) plus the shared `ScopeTabBand`. The canvas's
segmented-pill status filter + extra Type/Modified/Effective/Severity filter
chips were NOT adopted: `ScopeTabBand` is a deliberate canonical pattern
shared with /deadlines and the overview, and swapping it (plus adding new
filter axes) would be a behavior change beyond a visual restyle.

## Test changes

- `rules.library.test.tsx` "defaults to all jurisdiction groups collapsed":
  scoped the form-code negative assertion to the table body, since the new
  Recent Changes card legitimately surfaces the form code in its meta line.

## Verify

- `tsgo --noEmit -p apps/app` → 0
- `pnpm --dir apps/app test -- src/features/rules src/routes/rules --run`
  → 42/42
- `vp check` → 0 errors (47 pre-existing warnings, none in touched files)
