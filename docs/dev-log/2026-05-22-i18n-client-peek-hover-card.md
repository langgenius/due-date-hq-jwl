---
title: 'Sync i18n catalog for client peek hover card'
date: 2026-05-22
area: i18n
---

## Context

GitHub Actions run `26280664567` failed in the `Lingui Catalog Drift` workflow during the
`Sync Lingui catalogs` step. The hover-triggered client peek card introduced one new error-state
message without a `zh-CN` translation.

## Changes

- Ran Lingui extraction after merging the latest PR head into the local branch.
- Added the missing `zh-CN` translation for `Couldn't load this client.`.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`

## Docs and Design Alignment

No `DESIGN.md` update was needed: this only syncs translated catalog output for an existing hover
card error state.
