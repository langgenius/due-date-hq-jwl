# CI Format Drift Fix

## Summary

- Reproduced the current `origin/main` CI failure locally after fast-forwarding to `35f5c09`.
- `pnpm check` failed on formatter drift in the CPA tools directory HTML, the hero polish dev log,
  and the wave-2 send plan.
- Ran `pnpm check:fix`, which normalized those files and applied Vite+ lint autofixes to the new
  disaster-relief marketing helpers.

## Validation

- `pnpm check`
- `pnpm test`
- `pnpm build`
- Clean-checkout-shaped `gitleaks detect --source . --no-git --redact --verbose`
