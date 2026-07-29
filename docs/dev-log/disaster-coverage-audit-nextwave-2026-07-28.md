# Disaster/coverage audit — next-wave remediation (parallel agents)

2026-07-28

## Why

Second remediation pass over the disaster / state-coverage / geo content family, after the
factual-P0 pass (`disaster-coverage-audit-remediation-2026-07-28.md`). Implemented by four
file-disjoint parallel agents (one per package) so the work didn't clobber itself or the
concurrent site-wide CTR copy pass. Unified `pnpm -F @duedatehq/marketing build` = 231 pages,
clean.

## Fixed

**Hub (`irs-disaster-relief/index.astro`, `disaster-notices.ts`):**

- State `<select>` now offers all 50 states + DC (+ notice territories), so uncovered states
  (TX/CA/FL) reach the previously-dead empty-state CTA instead of a dead end.
- Notice cards show a county COUNT + leaf link instead of a truncated county wall; added
  verified `affectedAreaShort` to MI (37) and WI (21) — counted by exact enumeration.
- Added a "Verified against irs.gov as of {reviewedOn}" freshness line.

**State pages (`StateDetailPage.astro`, `StateCoveragePage.astro`, `seo-content.ts`):**

- KEY DATES (`.std-kd`) suppressed on English pages (the "Verified filing deadlines" table
  already carries per-entity dates) — kills the duplicate flagship-deadline module; kept as
  the sole module on zh-CN / no-table states.
- Added one restrained hero CTA (was: no action until the page bottom).
- "primary filing deadline" C-corp mislabel → "business entity filing deadline" (accurate
  across income + non-income-tax states).
- De-boilerplated the 46 generated state pages: sourceTypes/coveredSignals/limitations 3→2
  cards each, removed the generic filler FAQ — keeping per-state specificity. (~−96 lines.)
- StateCoveragePage roster copy corrected (all 51 have pages) + cartogram ~300px floor.

**seo-content rule pages:** rule/guide hero answer-first ("… — when is it due?", lead opens
with the date) instead of "…as source-backed deadline work"; per-state hero normalized to
"…watched at the {agency} source" (banned "routed through evidence review" / "deadline
operations" from the generated set); rule-body boilerplate collapsed (9 generic cards → 1
section).

**Geo template + disaster leaf (`GeoResourcePage.astro`, `DisasterNoticePage.astro`):**

- Hardcoded "(11 active)/(206)" counts → derived from `DISASTER_NOTICES.length` + archive.
- Removed duplicated eyebrow + "a source on every date" trust line; a11y peek label now
  carries the deadline value.
- Disaster leaf: hero lead trimmed (deadline no longer repeated 3×), "Start free" demoted so
  the alert opt-in is the single primary action, stale `aria-live` dropped, source link gets
  a new-tab SR cue.

**Hardcoded state heroes (`i18n/en.ts`, `zh-CN.ts`):** NY hero "routed through evidence
review" → "watched at the DTF source" (EN + zh parity).

## Deferred (with reason)

- **`std-*` / `dnp-*` primitive unification** — pure CSS/markup de-dup, no user-facing change;
  the functional redundancy the audit cared about is already gone (KEY DATES suppression).
  A blind CSS refactor across two live components is unsafe while the preview pane is
  collapsed (0-height viewport) — do it with the pane open.
- **Broader "deadline operations" jargon** in the 5 hardcoded state pages' leads/FAQs — folded
  into the parallel session's active site-wide CTR/copy audit to avoid editing the same i18n
  copy twice.
- **AZ per-slug key in `content-metadata.ts`** still has the `…-apache-tribe-…` typo (same bug
  as the playbook) — that file is being rewritten by the parallel copy pass; flagged for them.

## Next

Deploy needed to make all of this (plus the earlier Samish/24-count fix) live — prod still
serves the pre-fix pages the WA outreach is driving CPAs to.
