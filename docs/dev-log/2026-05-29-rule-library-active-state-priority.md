# 2026-05-29 · Rule Library active-state priority

Yuqi flagged that after a jurisdiction's rules are all accepted, that state dropped to the
bottom of `/rules/library` because the sorter prioritized jurisdictions with pending review or
missing coverage.

## Change

- Added an explicit fully-active jurisdiction bucket in `rules.library.tsx`.
- Kept Federal first.
- Sorted fully-active states immediately after Federal, before jurisdictions that still have
  needs-review or missing-rule work.
- Preserved alphabetical order inside each bucket.

## Validation

- `pnpm --filter @duedatehq/app test -- src/routes/rules.library.test.tsx` — 15/15 passed.
- `pnpm --filter @duedatehq/app exec tsc --noEmit` — blocked by unrelated dirty Pulse work:
  `src/features/pulse/components/PulseReadinessStatus.tsx` imports missing
  `PulseApplyReadiness` from `@duedatehq/contracts`.

`docs/Design/DueDateHQ-DESIGN.md` remains aligned because this is a Rule Library row-order
semantics change, not a token, layout, or component-spec change.

## Follow-up

The Tier-cell progress bars now reserve a fixed trailing review-count slot, so `1` vs `10`
review-count labels no longer shift the bar horizontally. This keeps the progress bars visually
right-aligned while preserving the count on the right side of the bar.

Fully-active jurisdiction rows now use the same trailing slot for a green active count, so rows like
Alaska show `• 3` in success tone instead of leaving the right edge blank.
