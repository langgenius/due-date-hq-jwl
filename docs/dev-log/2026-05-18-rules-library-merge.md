---
title: 'Rules: merge Coverage + Sources + Library into one page'
date: 2026-05-18
author: 'Claude'
area: rules
---

# Rules: merge Coverage + Sources + Library into one page

## Context

After the [sidebar tidy](2026-05-18-sidebar-tidy-and-settings.md) reduced
the Rules workspace to a single sidebar entry (`Rule library`), the
catalog content was still split across three URLs: `/rules/coverage`
(situational map), `/rules/sources` (watcher health), `/rules/library`
(pending review + active rules table). To a CPA owner/manager doing
governance, these three are the same job at different zoom levels:

> _"Do we have rules where we need them (Coverage) · who's feeding those
> rules (Sources) · what's pending vs accepted in the catalog (Library)?"_

The canonical product spec
(`美国小型会计事务所报税种类、流程与规则产品指南.pdf` §10错误假设6)
also requires every rule to be `source-backed · versioned · human-reviewed
· auditable` — splitting that one mental model across three URLs makes
it harder to see the chain.

## Change

`/rules/library` now renders all three views stacked as labeled
sections with anchor IDs (`#coverage`, `#sources`, `#library`):

- The existing `CoverageTab`, `SourcesTab`, and `RuleLibraryTab`
  components are unchanged — they're composed inside the route as
  separate sections rather than rewritten. Each is self-contained
  content (no internal page shell), so composition is clean.
- The route uses `RulesPageShell` to provide the 24 px padding /
  single scroll region / page title — same shell every other Rules
  route uses.
- A new `MergedSection` helper wraps each block with a small
  uppercase `<h2>` and `scroll-mt-20` so anchor links land cleanly
  under the sticky route header rib.

The standalone routes `/rules/coverage` and `/rules/sources` remain
accessible — they still render the same tab components inside their
own `RulesPageShell` — so any caller that wants a focused single-view
URL (Pulse banner deep-links, external docs, engineering shortcuts)
keeps working.

The index loader (`rules.tsx`) now:

- Defaults bare `/rules` → `/rules/library` (was `/rules/coverage`)
- Maps legacy `?tab=coverage`, `?tab=sources`, `?tab=library` →
  `/rules/library#coverage`, `…#sources`, `…#library` respectively, so
  legacy bookmarks land on the right scroll position inside the merged
  page
- Maps `?tab=pulse` / `?tab=temporary` / `?tab=preview` unchanged

## Why this composition shape (and not a tabbed page)

We explicitly avoided putting a tab control on the merged page.
Reasons:

- We just _removed_ tabs from the Rules workspace. Re-introducing them
  on a single page would be inconsistent.
- Tabs hide the _connection_ between the three views — the CPA reads
  Coverage to spot gaps, then scrolls into Library to act. Stacked
  sections preserve that scan flow.
- Each section's contents are summarizable in a glance (KPI strip /
  health summary / filter chip bar) so the long-page concern is
  bounded.

## Out of scope (deferred)

- A future pass should fold the standalone `/rules/coverage` and
  `/rules/sources` routes into redirects (currently they still render
  full standalone pages). Kept live to avoid breaking deep links until
  the engineer confirms no internal links assume those routes are
  separate destinations.
- The "Sources health summary inline" treatment we discussed (one-line
  status badge at the top of Library) is not implemented yet; the full
  Sources table is rendered as its own section instead. That's safer
  for v1 — easier to compress later than to expand from a one-liner.
- Surfacing `source · version · reviewed-by · extension-type` columns
  on every rule row (the auditability anti-pattern from PDF §10错误假设6)
  is a separate piece of work.

## Validation

- `pnpm check`
- `pnpm test`
