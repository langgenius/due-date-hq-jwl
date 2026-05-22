---
title: '2026-05-04 · Smart Priority field help copy'
date: 2026-05-04
author: 'Codex'
---

# Smart Priority field help copy

## Background

Practice profile used the generic Smart Priority concept tooltip for multiple Smart Priority
settings, so field-level help repeated the same explanation instead of explaining the current
setting.

## Changes

- Added field-specific concept help for `Legacy penalty estimate cap`, `Urgency window`, and
  `Late filing cap`.
- Pointed the Practice profile Smart Priority field icons at those specific concepts.
- Refreshed Lingui catalogs and generated messages.

## Verification

- `pnpm --filter @duedatehq/app i18n:compile`
