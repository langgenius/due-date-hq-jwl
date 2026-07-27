# 2026-07-27 · Category-definition GEO pillar pages (deadline / rule-change monitoring)

## Context

Follow-on to the same-day GEO entity hardening (see `2026-07-27-marketing-geo-entity-hardening.md`).
Live engine tests showed the category DueDateHQ owns — active monitoring of IRS/state/FEMA sources — is
**unclaimed**: for "software that monitors IRS deadline changes," competitors and Thomson Reuters ONESOURCE
win the answer while DueDateHQ is absent. GEO citation needs a canonical page an engine can quote for the
category term. Decision (Yuqi): ship the term as a **linked pair**, distinct scopes (not name-swaps, per
`dev-file/13` §5 thin-content rule).

## What shipped

Two new EN + zh-CN category-definition pages (4 routes), each with `WebPage` + `DefinedTerm` + `FAQPage` +
`BreadcrumbList` JSON-LD:

- **`/what-is-deadline-monitoring`** — the *dates* axis: active monitoring vs passive due-date **tracking**.
  Carries a monitoring-vs-tracking comparison table. Owns "monitors IRS deadline changes."
- **`/what-is-rule-change-monitoring`** — the *rules* superset: a moved deadline is one kind of rule change
  (also new/retired forms, thresholds, conformity/eligibility, disaster relief). Source-first framing. Owns
  "IRS / state filing change alerts."

They cross-link (deadlines = the most common rule change) and each links out to how-it-works,
works-with-your-stack / state-coverage, and irs-disaster-relief.

### Files

- `src/lib/category-explainer.ts` — bilingual content for both pages (getter `getCategoryContent`).
- `src/lib/category-explainer-structured-data.ts` — self-contained JSON-LD builder, kept OUT of the shared
  `structured-data.ts` (co-edited by parallel work — same pattern as `stack-structured-data.ts`); references
  the shared `#website`/`#software` entity by `@id` string so the `DefinedTerm` resolves to DueDateHQ.
- `src/components/CategoryExplainer.astro` — shared renderer on the `.m-*` content kit + tokens; scoped CSS
  only for the definition callout, comparison table, cross-link, related list.
- `src/pages/what-is-deadline-monitoring.astro`, `.../what-is-rule-change-monitoring.astro` + `/zh-CN` mirrors.
- `src/lib/content-metadata.ts` — freshness entries (2026-07-27) for sitemap lastmod.
- `src/pages/llms.txt.ts` — both pages added to `corePages` (EN) + `zhMirror` (zh-CN).

## Honesty / guardrails

Within `dev-file/13` §1.2: monitoring across all 50 states + DC (true, leaned in); deep multi-agency in
CA/NY/TX/FL/WA/MA; source-backed changes require human review before reminder-ready; add-on layer, never a
replacement; tool names only in complement framing. No dollars-at-risk, no integration/API/mobile-push
claims, no "AI", no "radar". Each page has ~500+ words of distinct content (passes thin-content gate).

## Verification

`astro check` 0 errors (101 files); marketing tests 24/24; production build renders all 4 routes + JSON-LD
(`DefinedTerm`/`FAQPage`/`WebPage`), canonical, en↔zh hreflang, and 4 `llms.txt` entries. Visual check on the
dev server: hero + definition callout on-brand; comparison table (tinted active column), FAQ, related links
all render.

## Not done (next)

- **Inbound internal links** — pages are discoverable via sitemap + llms.txt + cross-links, but no existing
  page links *in* yet. Add to footer / resources / nav (deferred to avoid racing the parallel session's
  shared-component edits).
- **Dedicated OG art** — currently reuse `how-it-works.{lang}.png`; per-page-type OG is a Phase-2 task.
- **`sameAs`** — still gated on Yuqi creating the off-repo company profiles.
