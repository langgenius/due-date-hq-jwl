# 2026-05-20 · Rule Review Accept Tooltip

## Summary

Added a click-triggered tooltip to the single-rule `Accept rule` action in the Coverage review
workspace.

## Shipped

- Wrapped the `Accept rule` button in the shared Base UI tooltip primitive.
- The tooltip opens immediately on click with `Accepting rule...`, changes to `Rule accepted` after
  the accept mutation succeeds, and then advances the review queue after a short delay.
- Disabled both review actions during the accepted-tooltip state so the accepted rule cannot be
  double-submitted before the queue advances.
- Synced Lingui catalogs and added the new tooltip copy to the compiled locale bundles.

## Design / Docs Alignment

- No `DESIGN.md` update required: the change reuses the existing shared tooltip primitive and token
  styling already documented for overlays.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check` failed on pre-existing tax-period type errors outside this change, including
  `apps/server/src/procedures/obligations/_annual-rollover.ts`,
  `apps/server/src/procedures/rules/index.ts`, `packages/core/src/tax-periods/index.ts`, and
  `packages/core/src/rules/index.ts`.
