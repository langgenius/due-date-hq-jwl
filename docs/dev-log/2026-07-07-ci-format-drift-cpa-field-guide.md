# CI format drift for CPA Field Guide deploy package

**Date:** 2026-07-07
**Surface:** `vp check`, CPA Field Guide static deploy artifacts, outreach state

## Context

GitHub Actions `CI #1721` failed on commit `e5ce4093` in the `ci` job before tests or builds ran.
The failing step was `vp run ci`, which stopped at `vp check` with formatting issues in five files:

- `docs/dev-log/outreach-touch1-light-template-2026-07-07.md`
- `docs/integrations/cpa-tools/cpa-tools-directory.html`
- `docs/integrations/cpa-tools/deploy/DEPLOY.md`
- `docs/integrations/cpa-tools/deploy/index.html`
- `outreach-kit/.outreach-state.json`

The same commit's Lingui Catalog Drift and E2E workflows were already green, so the repair scope was
limited to formatter drift.

## Change

Ran `pnpm check:fix` from the repo root. The formatter normalized the flagged markdown, HTML, and
JSON files without changing the CI pipeline or product/runtime behavior.

## Docs and Design Alignment

No `DESIGN.md` or `docs/dev-file/` update was needed. The existing DevOps docs already state that
`vp check` is the first blocking layer of `vp run ci` and that format failures can mask later test or
build failures.
