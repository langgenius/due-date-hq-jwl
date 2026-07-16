# Main CI format and disaster metadata repair

GitHub Actions run `29479514412` failed in the `CI / ci` job while running `vp run ci` on
`main` at `4897ebf9c`.

## Root cause

- `vp check` found format drift in `apps/marketing/src/lib/disaster-notices.ts` and the disaster
  alert opt-in dev log.
- After applying the formatter, type checking exposed a missing required `issuedOn` value for
  `WA-2025-03`.

## Repair

- Applied the repository formatter to both files.
- Restored `WA-2025-03.issuedOn` as `Dec. 23, 2025`, using the official IRS page metadata rather
  than the Dec. 9 incident start date.

## Validation

- `pnpm run ci`
- `git diff --check`
