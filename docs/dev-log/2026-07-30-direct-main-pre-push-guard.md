---
title: 'Direct-main pre-push guard installation'
date: 2026-07-30
area: devops
status: implemented
---

# Direct-main pre-push guard installation

## Outcome

Normal dependency installation now points the clone-local `core.hooksPath` directly at the
tracked `.vite-hooks/` directory. After the one-time install for a clone, every ordinary commit and
push runs the repository hooks automatically. The pre-push hook continues to run the complete
`pnpm run prepush` contract and rejects the push when formatting, lint, type checks, generated
artifacts, tests, builds, catalog drift, or committed whitespace fail.

The installer verifies that both tracked hooks exist and are executable. A focused Node test
proves that it writes local Git configuration and refuses an incomplete hook set.

## Why

The previous `prepare` script delegated hook installation to Vite+. Its generated dispatcher was
clone-local and could be skipped with `VITE_GIT_HOOKS=0`, so a tracked pre-push script did not prove
that each collaborator's Git process would invoke it. Directly registering the tracked directory
makes normal setup deterministic and leaves `pnpm hooks:install` as an explicit repair command for
an existing clone.

## Boundary

Client-side Git hooks are automation, not a server-side security boundary. Git still allows
`git push --no-verify`, and dependency lifecycle scripts can be skipped. With direct pushes to
`main` intentionally allowed, GitHub Actions runs after the commit is accepted and cannot guarantee
that `main` is always green. A server-side guarantee would require the commit to receive required
checks on another ref before updating `main`.

## Validation

- `node --test scripts/install-git-hooks.test.mjs`
- `pnpm run prepare`
- `pnpm run ci`
- `pnpm run prepush`
- `git diff --check`
