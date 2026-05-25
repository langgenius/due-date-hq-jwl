---
title: 'Penalty Evidence Migration Triage Closure'
date: 2026-04-30
author: 'Codex'
---

# Penalty Evidence Migration Triage Closure

## Context

Post-activation still had four visible gaps: deadline readiness was not computable, evidence was
written but not explorable, Migration review did not show exposure readiness, and Dashboard /
Obligations triage still centered on counts instead of actionable risk.

## Change

- Added the MVP penalty engine in `packages/core/penalty` and persisted exposure fields on clients
  and obligation instances, with `ready / needs_input / unsupported` instead of fake `$0`.
- Recomputed exposure on Migration apply, penalty input update, Pulse apply/revert, and manual
  due-date update.
- Added app-level Evidence drawer wiring for Obligations `E`, row actions, Dashboard top rows, and
  Brief citations.
- Added Migration import readiness preview, Live Genesis, reduced-motion fallback, Dashboard/Obligations
  cache preheat, and preset fixture golden tests.
- Added Dashboard Deadline Radar and Obligations triage polish: exposure pills, needs-input editor,
  evidence counts, quick filters, and detail drawer entry.

## Why

The Demo needs to show real risk without inventing money. The implementation keeps calculation in
pure core logic, persists explainable formula metadata, and leaves missing inputs explicit so CPA
users can fix the data rather than trusting a silent zero.

## Validation

- `pnpm check`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm ready`
- `pnpm secrets:scan` was run and reported three pre-existing local `.dev.vars` findings. The
  report was reviewed in redacted form; no finding was in source, docs, fixtures, or generated code.

## Follow-Up

- Consider narrowing the local secrets scan script so developer-only `.dev.vars` is handled without
  blocking handoff while still protecting committed files.
