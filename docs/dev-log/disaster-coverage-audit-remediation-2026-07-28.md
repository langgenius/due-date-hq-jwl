# Disaster/coverage content audit — P0/P1 remediation

2026-07-28

## Why

A 4-agent quality audit of the IRS-disaster / state-coverage / geo content-page family
(the surfaces the WA outreach drives to) turned up real defects — the pages were NOT
"fine" as an earlier pass had assumed. This commit lands the confirmed factual P0s and the
safe high-value P1s. Bigger refactors and one claim needing product verification are tracked
below, not done here.

## Fixed

**P0 — factual (CPA-facing), verified against the cited irs.gov release:**

- **"Samish" was listed among Washington's covered COUNTIES.** It is the Samish Indian
  Nation — one of the 25 covered tribal nations — and WA has no Samish County. The release
  covers **24 counties + 25 tribal nations**, not 25 counties. Samish was rendering 5–6× on
  the WA leaf (card, expander, both FAQ answers, Article + FAQPage JSON-LD) and in the digest.
  Removed from the county enumeration in `apps/marketing/src/lib/disaster-notices.ts` and
  `outreach-kit/disaster-notices.json`; `affectedAreaShort` corrected to "24 … counties and
  25 tribal nations"; the file's dev-note math reconciled.
- **`cpa-response-playbook.astro` used a wrong AZ slug** (`…-apache-tribe-…`), so the tribal
  worked example silently fell through to filler and Georgia was repeated 3×. Slug fixed.

**P1 — quality:**

- **`getNoticeMeta` / `getNoticeFaq` lower-cased the whole `event` string**, mangling proper
  nouns ("tropical storm arthur", "san carlos apache tribe") in FAQ questions, meta
  descriptions, and the FAQPage rich-result JSON-LD. Now render the event verbatim (matches
  the hero-lead fix shipped earlier today).
- **Hub roster sorted deadline-descending**, so the most-urgent notice (WA, Aug 5) rendered
  last. Now ascending — soonest deadline leads, matching the page's "by when?" promise.
- **"Last reviewed" was 2026-07-06**, older than the 07-27/07-28 data corrections it fronts.
  Bumped `irs-disaster-relief` reviewedOn to 2026-07-28.

## Tracked, NOT done here

- **P0-if-false: the uniform "IRS + all 50 states + DC + FEMA, watched 24/7, the same way"
  claim** (`StateCoveragePage`, per-state badges, `Sources.astro`, `structured-data.ts`,
  `DisasterNoticePage` "around the clock") vs the site's own honest qualifier
  (`category-explainer.ts`: baseline everywhere, deeper in CA/NY/TX/FL/WA/MA). Needs
  verification of what monitoring actually ships for all 51 jurisdictions — a product-truth
  call, not a copy edit. Escalated to Yuqi.
- Rule/guide heroes are product-speak, not answer-first (`seo-content.ts`); 51 state leaves
  and 14 rule leaves are ~50% templated boilerplate below KEY DATES; state KEY DATES module
  duplicates the Verified table row; hub `<select>` offers only covered states (uncovered =
  dead end, empty-state CTA is dead code); county-list cards are a truncated wall (need a
  count field); `std-*`/`dnp-*` are forked primitives; hardcoded "(11 active)/(206)" counts
  will drift. These are the next wave.
