# 2026-06-10 — Pull `origin/main`: conflict resolution + merge hygiene

Integrated `origin/main` (local had diverged 40 ahead / 17 behind). Five files
conflicted; on all five the remote side was the newer last-touch, so the merge
was resolved with `-X theirs`:

- `panels.tsx` — remote adds a `waived` readiness-count bucket (pure addition).
- `rules.library.tsx` — remote font token `text-base` → `text-[13px]` (cosmetic).
- `ClientDetailWorkspace.tsx` — comment-only reword of the Snapshot-card removal.
- `ObligationQueueDetailDrawer.tsx` — remote renders "What's left to do" as a
  `DetailSectionCard` (+ per-item `received {date}`) instead of an inline section.
- `daily-brief-card.tsx` — remote's full "Yesterday/Today" digest rewrite
  supersedes the old-design tweaks wholesale.

## Hygiene fixed after the auto-merge

1. **Broken drawer.** `-X theirs` interleaved local non-conflict context with
   remote's second (adjacent) hunk in `ObligationQueueDetailDrawer.tsx`,
   duplicating the `{isDone && item.receivedAt …}` block → syntax error.
   Resolved by taking origin/main's whole version of that one file
   (`git checkout origin/main -- …`), which is the side we'd chosen anyway.
2. **Format drift (26 files).** Local-branch formatting debt the merge surfaced;
   `vp check --fix` normalised it.
3. **Lint rule.** The merge pulled in a stricter `require-array-sort-compare`
   rule that flagged a bare `.toSorted()` in `scripts/check-token-discipline.mjs`
   (string sigs) → added an explicit `.localeCompare` comparator.

`vp check` → 0 errors (25 pre-existing non-blocking warnings remain).
