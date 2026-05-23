# 2026-05-24 · Rule Library review advance flicker

Fixed a review-workspace flicker where accepting a rule could briefly show the just-accepted rule
again before settling on the next rule.

- `RuleDetailCompact` now waits for the parent `onActionComplete` navigation to finish before
  invalidating rules/audit/obligation queries.
- The review workspace keeps an optimistic selected rule id in React state, so the panel switches to
  the next rule immediately while the URL query param catches up.
- Concrete draft cache entries are retained for the review session, so a rules/query refetch cannot
  briefly clear the next rule's AI draft and flash the "draft not ready" state.
- Active source-defined rules no longer render the candidate review form. After accept, the previous
  rule can briefly exist in refreshed data as active, but it should not show candidate-only AI draft
  readiness copy.
- While the concrete-draft query is refetching, the detail panel shows the draft loading state
  instead of flashing the red not-ready state.
- `/rules/library` batch review now defers query invalidation while the modal is open. Accept/Reject
  advances the local batch queue immediately; live rule/audit/obligation data refreshes once when
  the batch closes or finishes.
- Batch review refresh is targeted to rule/review-task/audit/obligation outputs instead of broad
  `orpc.rules.key()`, so Coverage, Sources, and concrete drafts are not refetched on every accept.
- Reject follows the same order: advance the review cursor first, then refresh live rule data.
- This keeps the selected rule id and refreshed rule data from briefly disagreeing during review
  sessions.
