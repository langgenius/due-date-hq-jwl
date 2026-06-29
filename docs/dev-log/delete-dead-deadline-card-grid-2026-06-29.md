# Delete dead DeadlineCardGrid (the removed /deadlines card view)

**Date:** 2026-06-29
**Files:** `apps/app/src/features/obligations/queue/DeadlineCardGrid.tsx` (deleted) + comment/doc updates

## Why

The `/deadlines` signature card view + its toggle were removed 2026-06-24 (Yuqi); `DeadlineCardGrid.tsx`
has been **dead code** since — no import or render anywhere (confirmed: only comments + auto-generated
i18n source-refs reference it). Yuqi asked to delete it.

## What changed

- Deleted `DeadlineCardGrid.tsx` (`git rm`). Restore from git history if the card view is ever wanted.
- Updated the now-stale comments in `routes/obligations.tsx` and `queue/helpers.ts` (the `urgencyBandOf`
  doc — the table is now its **sole** consumer; the P1 dedup history is kept as past-tense context).
- Updated `docs/Design/page-signature-views.md` (was "retained but unused" → deleted).
- Left the lingui `.po` source-refs (`#: …/DeadlineCardGrid.tsx`) as-is — harmless stale comments. Did
  NOT run `lingui extract --clean` to avoid sweeping the parallel session's untracked strings into this
  commit; a future intentional extract will clear them.

## Verification

`tsgo` clean (nothing imported it).
