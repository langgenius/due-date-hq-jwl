# Comment cleanup — routes/obligations.tsx, 2026-06-10

**Who/why:** Yuqi (product designer) — trim verbose dated change-history narration from the ~14k-line `apps/app/src/routes/obligations.tsx`, keeping only the durable "why" (constraints, footguns, non-obvious reasons) and stripping date/attribution/"changed-from-X" narration. Comments-only pass; no code, JSX, props, className strings, or logic touched.

## Summary

Worked through every dated comment (`grep -nE '20[0-9]{2}-[0-9]{2}-[0-9]{2}'`) and classified each:

- **Deleted (pure narration):** ~25 comments that only recorded a past change/removal/rename on a date or per feedback#N with no durable reason — e.g. the row-density padding-bump chain, the swapped-pill `Badge variant` notes, the footer-hint-row removal node, the cross-route audit "outline → ghost straggler" note, the "Show all is broken" fix note. JSX `{/* … */}` narration nodes were removed whole (no dangling `{}`).
- **Trimmed to the WHY (mixed):** ~95 comments rewritten to present tense, dropping the date/attribution/"used-to" narration but keeping the constraint or reason — e.g. the milestone-timeline state-map (`done`/`skipped`/`active`/`upcoming`) logic, the `not_applicable`/`paid` payment-tile gating, the scrollbar-gutter:stable footgun, the Base-UI `useMenuGroupRootContext` crash note, the iCal-Regenerate AlertDialog rationale, the responsive-page-size measurement reasoning, the drawer/panel paper-document layout decisions.
- **Left untouched:** the four `docs/Design/*-2026-05-21.md` / `*-2026-05-23.md` references whose dates are part of real filenames and are attached to a kept WHY (Owner-column "is this mine?" triage, destructive-move safety net, stage-specific context branch).

Net: file shrank ~1,180 lines, all from comment text. Remaining dated lines after the pass: **4**, all legitimate docs-Design filename references (not narration).

## Verification

- `git diff` confirmed comment-only: stripped all comment forms from HEAD and the working tree and diffed the remaining code — every reported difference is comment prose; no JSX/props/className/logic changed.
- Ran `pnpm exec vp fmt --write` on the file.
- tsgo not run per instructions; not staged/committed.
