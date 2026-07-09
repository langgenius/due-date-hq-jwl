# CPA Field Guide deploy CI formatting repair

**Date:** 2026-07-09
**Area:** `docs/integrations/cpa-tools/deploy`

## Why

The `docs(integrations): CPA Field Guide - alternatives + statistics pages`
change left the checked-in deploy pages in a format that failed `vp check`.
The CI failure reproduced locally as formatting issues across the generated CPA
Field Guide deploy HTML files.

## Change

- Ran the project formatter over the committed deploy output so `vp check` can
  pass on the generated HTML.
- Cleaned the companion `build.mjs` generator lint issues that surfaced after
  formatting: renamed the underscore-prefixed asset helpers, removed two unused
  category maps, and moved the comparison-row helper out of `vsPage()`.

## Verification

- `pnpm check:fix`

## Follow-up

The later `docs(integrations): CPA Field Guide design overhaul` commit reintroduced the same
formatter drift across the checked-in guide and deploy HTML output. Re-ran `pnpm check:fix`, cleaned
the generator lint issues that came with that drift, and verified the full local CI command.

## Follow-up verification

- `pnpm check`
- `pnpm run ci`
