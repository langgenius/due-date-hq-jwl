# Finishing the deferred items

**Date:** 2026-06-23

Closing out the loose ends accumulated across the session's polish waves.

## Done

- **i18n** — the one string left "for the next batch" by the rules-review-panel
  work ("Generate the AI draft above to unlock Accept.") is now extracted +
  translated to zh-CN (先生成上方的 AI 草稿以解锁"接受"。) + compiled. Catalog
  back to **0 missing**, `compile --strict` clean.
- **Daily Brief height** — shipped separately (`cffb0fd8`): `py-4 → py-2.5`,
  `gap-1.5 → gap-1`, masthead `text-base → text-sm` (96 → 79px).
- **Record-tab storage** — written up as an engineering brief
  (`docs/Design/record-tab-storage-eng-brief-2026-06-23.md`). It is a backend
  build (R2 bucket + attachments schema + 5 endpoints + an e-signature vendor
  decision), not a polish item; the UI is already honest (empty states, no fake
  upload affordances). Scoped for a dedicated backend ticket.

## Deliberately left (with reasons)

- **Visual-regression snapshots** (the `e2e/tests/visual-regression.spec.ts`
  baselines for /deadlines, /rules, etc.) are stale after this session's many UI
  changes (palette, transitions, card defaults, brief, pin removal). NOT
  regenerated ad-hoc: the local demo backend is degraded (the daily brief is in
  its "couldn't update" state), so an `--update-snapshots` run now would bake
  transient/error states into the baselines. This belongs in CI / a maintainer
  run against a clean E2E env once the UI has settled. Flagged here so it isn't
  forgotten.
- **Daily-brief failed-state footnote** ("Brief unavailable — we'll retry
  shortly") — kept, not removed. It's the honest system-error reassurance
  (interfaces-that-feel: own the error, offer a path) in the one state with no
  lead sentence; the height was already cut via padding/gap/title, so brevity
  didn't require dropping the explanation.
- **Rules review "decision rail be more different"** — held: vague direction,
  needs a visual pass + Yuqi's eye on the specific lever (the item-6 commit
  prominence already shifted weight to the rail). Surfaced for a future pass.
- **`/rules` overview ⇄ table view transition** — N/A: /rules has no card/table
  view toggle (only a scope `Segmented`), so there's nothing analogous to
  crossfade. The view-toggle sweep is complete with the three real surfaces
  (deadlines, clients, alerts).

## Verify

`tsgo` app clean; `vp run @duedatehq/app#build` clean; i18n 0-missing /
`compile --strict` passes.
