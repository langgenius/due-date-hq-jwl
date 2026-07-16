# CPA Field Guide format CI fix

**Date:** 2026-07-08 · docs/integrations

The root CI check failed on formatting and lint issues introduced by the CPA
Field Guide static export files.

## What changed

- Ran `pnpm check:fix` to format the CPA Field Guide source/export HTML and the
  outreach-state guard script that `vp check` reported.
- Cleaned `docs/integrations/cpa-tools/deploy/build.mjs` by renaming the asset
  helper state from `_logos`, `_shots`, and `_slug`, then removing unused
  category slug maps.

## Why

`pnpm check` stopped before tests/build because the recently added CPA Field
Guide files were not in the repo's expected formatting style. After formatting,
the same check surfaced unused/shadowed variables in the export builder; those
were lint-only issues and did not require content or routing changes.

## Verification

- `pnpm check`
- `pnpm ready`

`pnpm ci` was attempted first but failed locally because the sandbox could not
reach the npm registry after removing `node_modules`. `pnpm install` restored
the workspace before `pnpm ready` was run.
