# 2026-07-17 — CI format drift repair

GitHub Actions run `29514247119` failed in `CI / ci` while running `vp run ci` on
`main` at `4778a0c8c`.

## Root cause

`vp check` found format drift in ten JSON and Markdown files added or updated by
the disaster archive, state filing deadline, launch runbook, society outreach,
widget promotion, and outreach state work. The check exited before workspace
tests, builds, the secret scan, and staging deployment could run.

## Repair

- Applied the repository formatter to the ten files reported by `vp check`.
- Kept the underlying data and documentation content unchanged; the JSON diff is
  the formatter's expanded object layout.

## Validation

- `pnpm check:fix`
- `pnpm run ci`
- `git diff --check`

No `DESIGN.md` or `docs/dev-file/` update was needed because this repair restores
the existing CI formatting contract without changing product behavior or
architecture.
