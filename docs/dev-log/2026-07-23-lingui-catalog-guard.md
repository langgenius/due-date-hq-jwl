---
title: 'Lingui catalog repair and Claude commit guard'
date: 2026-07-23
area: devops
status: implemented
---

# Lingui catalog repair and Claude commit guard

## Incident

GitHub Actions run `29978517516` failed at `Lingui Catalog Drift` for main commit `7e4ef3d39`.
`lingui extract --clean` found 4,083 messages and nine missing `zh-CN` translations; the following
`lingui compile --strict` step correctly stopped the workflow.

The missing entries came from recent deadline-surface copy changes. One alert tooltip also
interpolated the raw English branches `days sooner` / `days later` inside `<Trans>`, so the outer
message could be translated while the inserted direction remained English.

## Repair

- Extracted the current catalogs and translated all nine missing `zh-CN` messages.
- Translated the alert tooltip's day-direction branch with the existing Lingui `t` macro.
- Regenerated both source and compiled English / Chinese catalogs.

## Prevention

- `pnpm run i18n:check` is now part of the root CI contract.
- pre-push checks that strict extraction/compilation did not leave catalog drift.
- Claude's root agreement and Lingui skill prohibit empty or placeholder translations and raw
  English interpolation inside translated messages.
- Claude's Lingui PreToolUse guard runs the strict contract before relevant commits and rejects
  missing translations or catalog output that has not been staged.

## Validation

- `pnpm run i18n:check` — 4,083 messages, `zh-CN Missing 0`
- `pnpm run ci`
- `git diff --check`
