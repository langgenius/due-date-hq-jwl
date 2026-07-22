---
title: 'Claude CI submission guardrails'
date: 2026-07-22
area: devops
status: implemented
---

# Claude CI submission guardrails

## Outcome

Claude Code now receives a root-level completion contract that distinguishes focused checks,
repository CI, push state, and hosted checks. A tracked Vite+ pre-push hook runs the same local CI
contract before any push, so a missing or bypassed staged-file formatter is caught again against the
complete checked-out tree.

The CPA Field Guide generator also supports an isolated output directory. `pnpm generated:check`
rebuilds its generated HTML/text/XML in a temporary directory, compares the result byte-for-byte
with committed output, rejects stale generated pages, and verifies canonical serialization of the
append-only outreach state. Extracted plain-text descriptions normalize source-formatting
whitespace, so formatter line wrapping does not alter machine-readable text or JSON-LD. The check
runs in `pnpm run ci` and therefore in pre-push and hosted CI.

## Root cause addressed

Recent red-main incidents repeatedly treated a successful feature build as sufficient submission
evidence, while formatting failures and generator drift remained undiscovered until the push CI
run. Local pre-commit protection was also installation- and invocation-dependent. The new layers
make the repository-wide contract explicit to Claude and repeat it immediately before push.

The existing Claude skills were also audited for submission relevance. The root agreement now
points Claude to a small task-specific set, and `distill-devfile` no longer instructs agents to push
directly to `main` by default. Claude bridge entries for the canonical Lingui and Playwright skills
are tracked symlinks, keeping their reference libraries in one source while the canonical skills
add DueDateHQ-specific commands and constraints. The existing `frontend-ui-engineering` skill now
explicitly defers to the repository's no-`useEffect` rule.

## Validation

- `node --check docs/integrations/cpa-tools/deploy/build.mjs`
- `node --check scripts/check-generated-artifacts.mjs`
- `node --check scripts/check-outreach-state.mjs`
- `pnpm generated:check`
- `pnpm run ci`
- `pnpm run prepush`
- `git diff --check`
