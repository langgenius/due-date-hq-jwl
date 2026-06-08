# Rule Library — overview dashboard & review modal (canonical)

Date: 2026-06-08 · Owner: Yuqi · Pencil frames: `O0pyRO` (overview),
`G6P12y` (jurisdiction detail), `DvLC9` (rule detail + reject), `jpoZx`
(confirm impact), `xSv9n` (preview transition), `bf6Ni` (sources).

This is the canonical spec for the `/rules/library` surface as shipped.
Supersedes the layout notes in `rules-library-critique-2026-05-26.md`.

## Layout shell

Three columns, left → right:

1. **Global app sidebar** (shared AppShell).
2. **Jurisdiction rail** (`states-rail.tsx`) — hoisted OUT of the centered
   content container so it sits **flush against the global sidebar** as a
   full-height secondary sidebar. `hidden lg:flex` (≥1024px). Header top
   padding (`pt-6 md:pt-8`) aligns the "RULE LIBRARY" eyebrow with the page
   eyebrow.
3. **Main panel** — centered + width-capped (`mx-auto max-w-page-expanded`),
   like `/today`, so the overview reads as a focused dashboard, not an
   edge-to-edge wall. `gap-6`, `px-5 md:px-8`.

### Rail contents

Eyebrow + "Jurisdictions" + a **funnel toggle** (filters the list to
jurisdictions with `reviewCount > 0`). Search. Nav rows: **Overview**,
**Sources** (→ `/rules/sources`, green health dot + count), **Temporary
rules** (→ `/rules/temporary`, shown only when active temp rules exist).
Then FEDERAL + STATES jurisdiction rows (rule count + amber needs-review
dot). Footer "Showing N of M states".

## Overview (no jurisdiction selected)

Vertical stack inside the centered panel:

1. **ActionHero** banner (only when pending > 0, not snoozed) — count tile,
   "N rule changes waiting" + "oldest Nd", **risk subline** (high/med/low from
   `riskLevel`), "Open review queue" (→ batch review) + "Remind me Friday"
   (localStorage snooze until next Friday).
2. **KPI band** (`KpiStrip size="lg"`, 32px values) — Total rules /
   Jurisdictions / Changed 30d / Pending review. Derived from wired queries.
3. **Dashboard row** (`2xl:flex-row`, equal height; stacked below):
   - **Status coverage** (≈3fr) — segmented bar + per-status **breakdown**
     (Active / Awaiting review / Draft / Archived: dot · label · proportion
     bar · count).
   - **Recent changes** (≈2fr) — 5 most-recently-touched rules; row opens the
     detail; "View all" → review scope.
4. **Grouped rule matrix** (browse-all) below.

## Jurisdiction detail (`?jurisdiction=`)

Leaner header: title + status chips + **New rule** + **Start review N** only
(shortcut chip / ⋯ / Sources removed — Sources lives in the rail). KPI strip

- scoped progress + scope tabs + entity chips + the flat per-jurisdiction
  table. Table is `table-fixed` with rebalanced columns so the Rule column
  never collapses at narrow panes; the overview matrix hides Form (`<xl`) and
  Type (`<2xl`) when the pane is too narrow rather than clipping.

## Review modal (the rule "review action" is a modal popup)

Opened by clicking a rule (`?rule=`). Content: applicability, evidence,
due-date logic, extension, provenance, verification, version history.

- **Accept** → **Confirm impact** dialog (`jpoZx`, honest-aggregate): real
  `previewRuleImpact` data only — estimated deadlines + entity-type count +
  `entityCounts` breakdown, or "No client deadlines will be generated yet"
  when zero, or a "couldn't load preview, you can still accept" error state.
  **No per-client table** — that data (named clients, $ amounts, created/
  retired/conflict counts in the Pencil) does not exist in the API and is not
  fabricated. The per-client confirm + `Rrk1M` "applied & next" await a
  backend per-client impact API.
- **Reject** → **reason dialog** (`DvLC9`): preset reasons (Contains errors /
  Source or jurisdiction incorrect / Duplicate / Other-with-note) →
  `rejectTemplate` / `rejectCandidate`. Reject is **detail-panel only**; the
  batch queue stays accept/skip-only.
- Edge cases: reason required; accept/reject mutually locked while in-flight;
  version-conflict (409) surfaces via toast; modal closes after a decision.

## Data honesty

Everything is wired to real queries (`listRules`, `coverage`, `listSources`,
`listTemporaryRules`, `previewRuleImpact`). Where the Pencil shows data the
backend doesn't provide (per-client impact, "synced N min ago"), we render the
honest available subset rather than fabricate — consistent with the repo norm.

## Color note

Recent-change jurisdiction pills stay neutral grey (dark for FED) rather than
the Pencil's per-state colors: green/amber/red are **semantic** here
(success/warning/overdue), so decorative use would conflict with the meaning
system.
