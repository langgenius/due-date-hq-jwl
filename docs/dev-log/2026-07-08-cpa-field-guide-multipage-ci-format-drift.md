# CPA Field Guide multipage CI format drift

**Date:** 2026-07-08
**Surface:** `vp check`, CPA Field Guide static deploy package

## Context

GitHub Actions `CI #1727` failed on commit `02f50652` in the `ci` job before tests or builds ran.
The failing step was `vp run ci`, which stopped at `vp check` with formatting issues in the CPA
Field Guide source, generated multipage deploy artifacts, the deploy generator, and the outreach
state snapshot:

- `docs/integrations/cpa-tools/cpa-tools-directory.html`
- `docs/integrations/cpa-tools/deploy/DEPLOY.md`
- `docs/integrations/cpa-tools/deploy/accounting-software.html`
- `docs/integrations/cpa-tools/deploy/build.mjs`
- `docs/integrations/cpa-tools/deploy/deadline-monitoring-software.html`
- `docs/integrations/cpa-tools/deploy/index.html`
- `docs/integrations/cpa-tools/deploy/practice-management-software.html`
- `docs/integrations/cpa-tools/deploy/tax-preparation-software.html`
- `outreach-kit/.outreach-state.json`

## Change

Ran `pnpm check:fix` from the repo root to normalize the flagged HTML, markdown, JavaScript, and
JSON files. The fix also removed two unused lookup variables from
`docs/integrations/cpa-tools/deploy/build.mjs` after the formatter exposed `no-unused-vars` errors.

## Docs and Design Alignment

No `DESIGN.md` or `docs/dev-file/` update was needed. This repair only restored CI formatting and
lint parity for the static CPA Field Guide package; it did not change the application architecture,
runtime contracts, or product design guidance.
