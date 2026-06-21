# Rule Library Sidebar Pending Count

Fixed the Rule Library sidebar badge to show the number of rules pending review.

The coverage endpoint still emits `candidateCount` for legacy callers, but it is
currently the same value as `pendingReviewCount`. The sidebar had started adding
both fields together, so a firm with 451 pending-review rules showed 902.

`app-shell-nav` now aggregates through a pure helper that prefers
`pendingReviewCount` and only falls back to `candidateCount` for older coverage
payloads. Added a focused unit test to lock that behavior.
