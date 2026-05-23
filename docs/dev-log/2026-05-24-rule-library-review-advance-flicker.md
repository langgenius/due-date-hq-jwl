# 2026-05-24 · Rule Library review advance flicker

Fixed a review-workspace flicker where accepting a rule could briefly show the just-accepted rule
again before settling on the next rule.

- `RuleDetailCompact` now waits for the parent `onActionComplete` navigation to finish before
  invalidating rules/audit/obligation queries.
- Reject follows the same order: advance the review cursor first, then refresh live rule data.
- This keeps the selected rule id and refreshed rule data from briefly disagreeing during review
  sessions.
