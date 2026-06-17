# Make the batch push green for `vp check` (format + 2 lint fixes)

_2026-06-17_

Post-push audit caught that the `CI` job's first gate — `vp check` (format + lint,
inside `vp run ci`) — would fail on the batch. Causes, all in files the push
touched:

- **Formatting drift** in 28 tracked files. Two sources: (a) earlier-session
  commits that were committed without a `vp fmt` pass, and (b) the brand docs
  (`brand-book.md` / `.zh.md` / `logo-rationale.zh.md` /
  `2026-06-16-brand-color-refinements.md`) — the merge/rebase kept the parallel
  session's content but dropped the CI commit's markdown reformatting, so they
  needed re-formatting. Ran `vp fmt`; the brand docs are now parallel-content +
  prettier-formatting (no content change).
- **2 lint errors** (`no-unused-vars`): an unused `cn` import in
  `notifications-page.tsx` (left over from a brand-commit change) and an unused
  `event` param in `ClientFactsWorkspace.tsx`'s row `onClick` (dropped to `() =>`).

Verified: repo-wide `vp check` now flags only the parallel session's **untracked**
`docs/sharing/*.md` (which CI never checks out), zero tracked files; typecheck 0;
full suite 544 pass / 2 skipped.
