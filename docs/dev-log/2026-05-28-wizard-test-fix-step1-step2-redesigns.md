# 2026-05-28 — Migration Wizard test catches up with Step 1 + Step 2 redesigns

## What broke

Three tests in `apps/app/src/features/migration/Wizard.test.tsx` were red on
`design/audit-drain-pass-1`:

- `continues from Step 1 to Step 4 without manual edits and preserves RPC order`
- `keeps the all-ignore fallback from continuing out of Step 2`
- `repairs return-type mapping and normalizer misses before Step 3 is shown`

All three failed at the same call site — `pasteRows()` couldn't find
`textarea[aria-label="Paste client data"]`. The first test additionally
asserted on stale Step 2 copy (`"Review column details"`).

## Root cause

Two design changes shipped without updating this smoke test:

1. **Step 1 bold-IA redesign** (commit `cba906e3`, `Step1Intake.tsx:509`):
   paste mode is now opt-in. Step 1 shows a full-bleed file dropzone by
   default; users click "Paste a list instead →" to swap in the textarea.
   The test assumed the textarea was always in the DOM.

2. **Step 2 banner-row redesign** (`Step2Mapping.tsx:75`): the
   "Review column details" toggle is gone — every mapping row is its own
   review affordance now. The test still asserted the old header copy.

## Fix

`apps/app/src/features/migration/Wizard.test.tsx`:

- `pasteRows()` helper now reveals the textarea first if it's not in the
  DOM (clicks "Paste a list instead"), matching the real user flow.
- Replaced the `'Review column details'` assertion with `'columns mapped'`,
  the new summary-header copy introduced by the banner-row redesign.

Both edits include 2026-05-27 comments pointing back to the redesigns that
caused the drift, so the next person to touch the test sees the trail.

## Verification

- `pnpm --filter=app test -- src/features/migration/Wizard.test.tsx --run`
  → 3/3 pass
- `pnpm --filter=app test -- src/features/migration --run`
  → 60/60 pass across 9 files (no regressions in sibling step tests)

## Out of scope

No product code changed. This is purely catching the test suite up to the
shipped design.
