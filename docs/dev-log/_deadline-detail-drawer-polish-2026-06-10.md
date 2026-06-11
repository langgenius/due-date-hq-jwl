# /deadlines detail (page mode) polish batch — 2026-06-10

Single-file polish pass on `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx`.
All layout-affecting changes are gated behind `isPageMode` so the `panel` (/clients)
and `sheet` (dashboard/pulse) presentations are untouched. Tokens / radii / i18n
(`<Trans>` / `<Plural>`, never `plural()`+`i18n._`) rules preserved.

Driven by Yuqi's numbered design notes (original Chinese in quotes).

## Items

- **#1 — Form badge in hero meta chip row ("不用显示form badge，下面已经显示了form").**
  No change made. There is no `TaxCodeBadge`/form chip in the hero meta chip row of
  this file — the form code ("Form 1040 — Individual income tax return") appears only
  once, in the H2 title. Nothing to remove; the complaint is already satisfied by the
  current structure.

- **#3 / #17 — body top padding ("移除top padding").** Dropped the page-mode body
  container's `pt-6`. The sticky tab bar's own `pt-3/pb-3` now carries the breathing
  room, so the tab bar sits tight under the date strip above.

- **#6 — inter-tab gap ("gap小").** `TabsList` gap `gap-6` (24px) → `gap-4` (16px) in
  page mode; panel/sheet keep `gap-6`.

- **#7 — per-tab content top padding ("remove top padding").** Each `TabsContent`
  `motion.div` (`pt-6`) drops to no top padding in page mode (`cn(isPageMode ? '' : 'pt-6')`);
  panel/sheet keep `pt-6`. Applied to all five tab panels (Status/Materials/Extension/
  Record/Audit).

- **#14 — completed-item strikethrough too faint ("划掉太浅了").** `What's left to do`
  checklist: `decoration-text-tertiary/40` → solid `decoration-text-secondary` so the
  line-through reads clearly. (Color-legibility fix, applied in all modes — same
  checklist component, defect everywhere.)

- **#15 — checklist checkbox too big ("checkbox太大").** Box `size-[18px]` → `size-4`
  (16px); check glyph unchanged (`size-3`).

- **#16 — list row flatter ("更扁").** Recent-activity rows in the `DetailSectionCard`:
  vertical padding `py-3.5` → `py-2.5` so the list reads shorter/denser.

- **#18 / #19 — remove two cards ("不要" ×2).** Removed (page-mode only) the trailing
  footer 2-up: the **Ownership** card and the **Linked from** card (both
  `DetailSectionCard`, both `overflow-hidden` via the shared card chrome). Rationale:
  Ownership duplicates the footer **Assign** action; Linked-from's "Client profile" row
  duplicates the hero client chip (which already navigates to the client). Gated behind
  `!isPageMode`, so panel/sheet still render both cards intact.

- **#20 / #21 — DetailStatusBanner text size + note gap ("字好大" / "和前面的字更近").**
  NOT changed. Both live in the shared `@/components/patterns/detail-status-banner.tsx`
  (`compact` layout: `text-base` title, `ml-auto` note), which is also consumed by the
  Alert detail. The component exposes no className/size override, so the only way to
  satisfy these is to edit the shared component — which is out of the "edit only
  ObligationQueueDetailDrawer.tsx" scope AND would change the alert detail too (can't be
  `isPageMode`-gated). Deferred — needs a follow-up that either adds a size prop to
  `DetailStatusBanner` or accepts the cross-surface change.

## Verification

- `vp check --no-fmt`: zero issues in the target file (3 pre-existing errors live in
  other untouched files: `deadline-detail.tsx`, `jurisdiction-rule-table.tsx`,
  `check-rule-sources.ts`).
- `vp test run obligations` (from `apps/app`): 7 files / 89 tests pass. (Root-level run
  shows alias-resolution failures `Cannot find package '@/i18n/bootstrap'` and orphan
  `.claude/worktrees/*` deps — environment artifacts, not regressions.)
- `vp fmt --write` applied to the file.
