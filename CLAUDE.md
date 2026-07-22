# DueDateHQ Claude working agreement

Read `AGENTS.md` before changing this repository. It is the canonical source for architecture,
commands, testing, documentation, and commit conventions. The rules below are the mandatory
completion contract for Claude Code.

## Before editing

- Start from a clean tree and sync with `origin/main`. Do not stack new work on a red `main`.
- Inspect the relevant implementation, nearby tests, and current `docs/dev-file/` truth before
  changing code.
- Keep concurrent or unrelated work out of the commit.

## While working

- Run focused tests for the files or workspace being changed.
- Add or update the dated `docs/dev-log/` entry required by `AGENTS.md`, and update
  `docs/dev-file/` when an implementation changes current architectural truth.
- Treat checked-in generated files as generator-owned. Change the generator or source inputs,
  regenerate, and run `pnpm generated:check`; do not hand-format generated output.

## Before committing or pushing

1. Run `pnpm run ci`. A successful `build` alone is not CI verification.
2. Run `pnpm generated:check` and `git diff --check`.
3. Review `git status --short` and the staged diff so only intended files are included.
4. Commit normally so `.vite-hooks/pre-commit` runs. Never use `--no-verify`, `-n`,
   `VITE_GIT_HOOKS=0`, or another hook bypass.
5. Before pushing, commit every intended change and leave the worktree clean. The tracked pre-push
   hook rejects a dirty tree because uncommitted fixes could otherwise hide a broken commit.
6. Let `.vite-hooks/pre-push` finish successfully. Do not report a push as successful until the
   remote checks for that exact commit are green.

If a check fails, fix the cause and rerun the full command. Do not describe a partial build,
focused test, commit, push, merge, or deployment as if it proved a later stage.

## Git workflow

- Prefer `feat/<scope>/<short>` plus a pull request. Push directly to `main` only when the user
  explicitly requests it.
- Never force-push shared branches or discard another session's changes.
- If `node_modules` is missing in a worktree, restore dependencies or use the documented worktree
  symlink recipe; do not bypass hooks to make the commit succeed.

## Useful existing skills

Use the smallest relevant project skill for the task. Skills improve implementation quality but do
not replace the repository completion contract above.

- React changes: `react-doctor`; add `frontend-ui-engineering` only for end-to-end UI work.
- Lingui messages, catalogs, or locales: `lingui-best-practices`.
- Browser workflows and E2E coverage: `playwright-best-practices`.
- Accessibility changes: `audit-and-fix`.
- Marketing metadata and SEO: `fixing-metadata`; use `web-quality-audit` for pre-launch review.
- UI edge cases, loading, failure, and localization states: `harden`.
- Documentation maintenance: `distill-devfile`.
- When uncertain which UI skill applies: start with `ui-skills-root` and select at most one or two
  focused skills.

React Doctor, accessibility, SEO, or design audits are additional focused checks; `pnpm run ci` and
the git hooks remain required.
