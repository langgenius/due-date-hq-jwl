# 2026-06-12 — Two-factor challenge helper layout

User feedback on `/two-factor`: the authenticator-app helper and recovery link
were squeezed into one horizontal row, causing the helper copy to wrap before
the "Lost your authenticator?" link.

## Changes

- Kept the helper copy unchanged, but made it a single non-wrapping line.
- Moved the recovery support link to its own line beneath the helper copy.
- Left the challenge behavior, auto-submit, support mailto, and copy unchanged.

## Verification

- `pnpm exec vp fmt --write apps/app/src/routes/two-factor.tsx docs/dev-log/2026-06-12-two-factor-helper-layout.md`
- `pnpm --filter @duedatehq/app build`
- Browser read-only layout check on `/two-factor`
