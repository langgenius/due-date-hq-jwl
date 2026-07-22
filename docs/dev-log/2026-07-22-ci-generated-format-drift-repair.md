---
title: 'CI generated-format drift repair'
date: 2026-07-22
area: devops
status: implemented
---

# CI generated-format drift repair

## Outcome

The repository's CI formatting command passes locally again without committing a mechanical rewrite
of the CPA Field Guide deployment output. The formatter now treats `deploy/**/*.html` as generated
output, matching the existing policy for generated Product Hunt HTML.

The remaining real drift was normalized in the CPA Field Guide dev log, the marketing messaging
canon, and the outreach state JSON. The outreach sender now writes a trailing newline so its tracked
state file remains formatter-stable after future sends. The repository-native autofix also replaced
two mutating `sort()` calls in the standalone X outreach script with `toSorted()`.

## Root cause

`docs/integrations/cpa-tools/deploy/build.mjs` deliberately emits compact static HTML. Running the
repository formatter over those generated pages expanded about 200,000 lines, while the next build
would immediately restore the compact representation. Treating those files as handwritten source
therefore made the formatting gate inherently unstable.

## Validation

- `pnpm run ci`
- `git diff --check`
- staged secret scan before commit
