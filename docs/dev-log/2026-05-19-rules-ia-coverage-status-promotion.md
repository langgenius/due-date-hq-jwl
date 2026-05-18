---
title: 'Rules IA v4: Coverage status promoted to sidebar; Library cleaned'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Rules IA v4: Coverage status promoted to sidebar; Library cleaned

## Context

After three rounds of polish on the merged Library page
(see [2026-05-18-rules-library-merge.md](2026-05-18-rules-library-merge.md),
[2026-05-18-rules-library-critique-fixes.md](2026-05-18-rules-library-critique-fixes.md),
[2026-05-18-rules-library-summary-strips.md](2026-05-18-rules-library-summary-strips.md),
and [2026-05-18-rules-library-polish-v2.md](2026-05-18-rules-library-polish-v2.md)),
the Library page was a single action surface with two compact context
strips (Coverage / Sources) sitting on top.

That shape worked but the strips kept earning their own follow-up
critiques — they were still mixing _two jobs_ on one page. Users
arriving at Library to accept a pending rule were getting a "look up
top first" prompt. Users arriving with a coverage question were
hitting a Library page that's mostly _not_ about coverage.

The honest read: Coverage status is its own primary destination, not
context-for-Library. Promote it to the sidebar; let Library be Library.

Sources stays a standalone page at `/rules/sources` but does **not**
earn a sidebar slot — it's incident-driven sysops, not daily-use. It's
surfaced via inline pointers from Coverage status header, Radar
attention callouts, and ⌘K.

## Change

### Sidebar — RULES group gains a second entry

`apps/app/src/components/patterns/app-shell-nav.tsx`:

```
Before                              After

OPERATIONS                          OPERATIONS
  Dashboard                           Dashboard
  Obligations                         Obligations
  Radar                               Radar
CLIENTS                             CLIENTS
  Clients                             Clients
  Opportunities                       Opportunities
RULES                               RULES
  Rule library                        Coverage status   ← new
                                      Rule library
──── footer ────                    ──── footer ────
  Settings                            Settings
```

Coverage status uses `MapIcon` (lucide) — reads as "jurisdictional
coverage map" and is distinct from `LibraryIcon`. Direct entry under
RULES at `/rules/coverage`.

The comment block in `useNavItems` codifies the rule for future
contributors: Coverage status and Rule library are both first-class;
Sources is intentionally not a sidebar destination.

### `/rules/library` — strips removed, single action surface

`apps/app/src/routes/rules.library.tsx` collapses from 368 lines to 36.
Dropped: `CoverageSummaryStrip`, `SourcesSummaryStrip`, `SummaryStrip`,
`SummaryNumber`, `SummarySeparator`, the `aggregateCoverageStrip`
helper, and the `drillIntoLibrary` callback. Page now renders just
`<RuleLibraryTab />` inside the shell.

Description updated:

> Catalog of practice rules. Review pending templates, activate them
> into production, and inspect rejected or archived evidence. Source
> citations appear on every row — click to open the official document.

The new last sentence is a promissory note about source provenance
surfacing on each row — coming in a follow-up pass where the Library
table grows a Source column / inline citation.

### `/rules/coverage` — relabeled as Coverage status

`apps/app/src/routes/rules.coverage.tsx`:

- Title: `t\`Coverage\``→`t\`Coverage status\``
- Description rewritten to lead with the user's question
  ("Do we have rules where clients file?") and end with a source-of-truth
  promise ("every count traces back to the official federal, state, or DC
  document")
- Drill-in handler simplified: dropped the `#library` anchor from the
  navigate URL since Library no longer has a section above the table

`apps/app/src/routes/route-summary.ts`: `rulesCoverage` title aligned to
`Coverage status` so the eyebrow + document title match.

## Why these changes stay durable

1. **Two jobs, two pages.** Library = catalog action surface (accept /
   activate / reject / archive). Coverage status = situational read
   ("do we have rules where we need them?"). Mixing produced the
   strip-vs-table tension that three critique rounds couldn't fully
   resolve.
2. **Sources is intentionally not a sidebar slot.** Codified in the
   `useNavItems` comment. It's incident-driven and only earns visit
   time when a degraded watcher pages someone or a CPA wants to verify
   provenance.
3. **Source citations as first-class data.** The new Library description
   commits to per-row citations (next pass). Coverage status description
   commits to "every count traces back" — the source-of-truth chain is
   never one click away, it's _always visible_.

## What's deferred (intentionally)

These are explicit follow-ups, not omissions:

- **Coverage status build-out**: the page currently renders the legacy
  `CoverageTab` (per-jurisdiction matrix). Next pass adds: snapshot line
  ("3 active · 123 pending · 11 sources degraded"), sources-health
  pointer in the page header, sortable per-jurisdiction table with
  click-to-drill, expandable entity rows with Business/Personal/All
  toggle, matrix distill for low-signal jurisdictions.
- **Source citations on Library rows**: the description promises them;
  the table doesn't yet show them. Follow-up adds a Source column with
  document name + inline link.
- **Radar "Applied" filter**: folds Temporary rules into Radar via
  status filter. Temporary stays reachable at `/rules/temporary` until
  the unified view ships.

## Validation

- `pnpm check` — 1048 files formatted, 576 typechecked, clean
- `pnpm test` — 203/203 tests passing
- Browser: Coverage status visible as second-to-last sidebar entry under
  RULES, lands on /rules/coverage; Library page shows just the table; no
  regression in Radar / Dashboard / Obligations / Clients
