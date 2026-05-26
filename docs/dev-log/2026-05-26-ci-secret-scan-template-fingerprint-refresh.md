---
title: 'CI secret scan template fingerprint refresh'
date: 2026-05-26
area: ci
---

## Context

GitHub Actions CI run `26458909844` passed `vp run ci` but failed the `Secret scan` step.
The failing job ran `gitleaks detect --source . --no-git --redact` and reported four leaks in
the clean CI checkout.

## Changes

- Refreshed Gitleaks allowlist fingerprints for deterministic readiness checklist template keys
  whose test line numbers shifted.
- Added the same allowlist treatment for the deterministic `1120s.s_corporation_return.s_election`
  checklist template key asserted by the obligations procedure tests.
- Left local `apps/server/.dev.vars` findings unallowlisted because that file is not tracked and
  should remain private to each developer machine.

## Validation

- `gitleaks detect --source . --no-git --redact --verbose` reproduced the CI-relevant findings,
  plus local-only `.dev.vars` findings.

## Docs and Design Alignment

No `DESIGN.md` update was needed: this only refreshes secret-scan false-positive fingerprints in
test snapshots.
