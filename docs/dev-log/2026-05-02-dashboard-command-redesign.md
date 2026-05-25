---
title: 'Dashboard command redesign'
date: 2026-05-02
area: dashboard
---

## Context

Dashboard already had the right server aggregation: summary, top rows, triage tabs, facets,
evidence links, and the materialized AI brief. The UI placed the AI brief before the operational
risk picture and kept a `Today queue` card with permanent skeleton lines, so the page read like
stacked widgets instead of a weekly triage workbench.

## Changes

- Reframed the Dashboard route as a deadline risk workbench with a page title, as-of badge,
  Obligations CTA, and Migration Copilot CTA.
- Added a compact metric strip for open obligations, due-this-week pressure, evidence gaps, and
  deadline readiness.
- Kept AI Weekly Brief in the first screen as the explanation layer, ahead of the deterministic
  KPI strip.
- Replaced the separate Deadline Radar / Risk pulse / Today queue stack with a table-first
  `Next deadlines` panel, a compact inline penalty-readiness summary, and an operational closure
  panel.
- Made top risk rows evidence-actionable from the `Next deadlines` panel so evidence review is
  available before entering the full triage table.
- Preserved the existing server-first dashboard contract, URL-backed triage/filter state, status
  mutation invalidations, evidence drawer entry points, and brief refresh queue behavior.
- Added horizontal overflow protection to the dashboard triage table.
- Removed the broken per-row severity left border from dashboard table rows; severity is now
  expressed through row tint and badges instead of a discontinuous vertical rule.
- Reworked the first `Next deadlines` panel from a responsive CSS grid into a real fixed-layout
  table and moved Deadline Radar into a compact inline summary above it, avoiding overlapping columns
  and removing the unnecessary right-side card rail.
- Compressed AI Weekly Brief from a full card with a footer into a medium-density strip; refresh,
  status, and updated time now live in the strip header.
- Updated the marketing homepage product preview and workflow dashboard slice so static marketing
  surfaces now match the live dashboard's risk, AI brief, triage, status, severity, exposure, and
  evidence semantics without importing app React components.

## Design alignment

- No token or primitive contract changes were needed.
- The redesign stays on the existing dense, hairline-first UI system: `Card`, `Badge`, `Button`,
  `Table`, semantic background/divider/text tokens, mono tabular numbers, and restrained status
  tints.
- Marketing remains Astro-static and continues to use its own i18n dictionary.

## Validation

- `pnpm --filter @duedatehq/app test`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app build`
- `pnpm --filter @duedatehq/marketing check`
- `pnpm format`
- `pnpm check`
