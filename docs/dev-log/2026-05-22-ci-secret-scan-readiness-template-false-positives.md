---
title: 'CI secret scan readiness-template false positives'
date: 2026-05-22
area: ci
---

## Context

GitHub Actions CI run `26280351705` for PR `10` passed `vp run ci` but failed the `Secret
scan` step. The job metadata showed the failing step was `gitleaks detect --source . --no-git
--redact`.

## Changes

- Added Gitleaks allowlist fingerprints for deterministic readiness document template identifiers
  used in unit test snapshots.
- Left local `apps/server/.dev.vars` findings unallowlisted because that file is not tracked and
  should remain private to each developer machine.

## Validation

- `gitleaks detect --source . --no-git --redact --verbose` reproduced the CI-relevant findings in
  `packages/core/src/readiness-documents/index.test.ts` and `packages/db/src/repo/readiness.test.ts`.
- `gitleaks detect --source /tmp/duedatehq-ci-source --no-git --redact --verbose` passed against a
  clean tracked-file copy of the repository.

## Docs and Design Alignment

No `DESIGN.md` update was needed: this only allowlists secret-scan false positives in test
snapshots.
