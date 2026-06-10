# Comment cleanup — features/obligations, 2026-06-10

**Who/why:** Yuqi — strip dated change-history comments that bloat source. The
narration ("2026-05-26 (Yuqi feedback #N): changed X → Y") belongs in git
history and the dev-log, not inline. Mixed comments were trimmed to present-tense
rationale (kept the WHY, dropped the date/attribution/"changed-from-X"); pure
narration was deleted outright. Comments only — no code, JSX, props, or copy
touched.

## Files touched

- `apps/app/src/features/obligations/queue/components/panels.tsx` — bulk of the
  work. ~6 pure-narration comments deleted (Figma-replica rebuild note, two
  "swapped pill for Badge" notes, retired-helper note, superseded label-sizing
  notes, mt-1.5→mt-1 tweak), ~22 mixed comments trimmed to rationale (timeline
  state map, connector logic, overdue banner, waiting-card layout, stage tasks,
  active-stage card chrome, step pipelines). 2 doc-path refs kept (attached to a
  WHY). Net: file shrank noticeably.
- `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx` — 1
  mixed comment trimmed (Audit-tab note). The remaining dated comments here were
  cleaned by a concurrent refactor of this same file that ran during the pass
  (see note below); 1 doc-path ref kept.
- `apps/app/src/features/obligations/detail/DeadlineNavigatorRail.tsx` — 1 mixed
  comment trimmed (responsive-contract rail note).
- `apps/app/src/features/obligations/queue/use-obligation-queue-columns.tsx` — 1
  mixed comment trimmed (owner-column rationale; dropped the dated audit-doc
  citation, kept the present-tense WHY).

## Note

`ObligationQueueDetailDrawer.tsx` was being heavily rewritten by another process
mid-pass (a ~950-line structural refactor that also removed the footer/aside
dated comments). Edits were applied only after the file stabilized. The two
remaining dated strings in scope are real doc-path references
(`...-2026-05-21.md`, `...-2026-05-23.md`) attached to WHY comments and were kept
intentionally.
