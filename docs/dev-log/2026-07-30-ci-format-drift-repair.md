# CI formatting and lint repair

## Context

The `main` CI workflow failed continuously from commit `096f0e54` through
`e8b9dc64`. The `ci` job stopped in `vp run ci` before tests, builds, secret scanning, or
staging deployment could run.

## Root cause

`vp check` first reported formatting drift in 12 recently added or edited social-card,
caption, JSON, and outreach files. The first failing commit introduced compact CSS that
did not match the repository formatter, and later commits added more unformatted files
without clearing the existing gate.

After formatting passed, the same check exposed an unused `nearest` variable in
`outreach-kit/build-digest.mjs`. The formatting failure had previously stopped the check
before this lint error could be reported.

## Repair

Ran the repository formatter across the workspace and retained only the 12 files named
by `vp check`. Removed the unused digest variable. The repair does not change card data,
caption copy, or runtime behavior.

## Verification

- `pnpm run ci`
