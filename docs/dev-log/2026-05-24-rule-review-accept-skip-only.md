# 2026-05-24 - Rule review accept/skip only

Rule Library review no longer exposes a user-facing Reject action.

- Single-rule review now offers `Accept rule`; reviewers use `Skip`/next navigation when a rule
  should stay inactive for more review.
- `Accept rule` progress and success feedback now lives only in the global bottom-right toast
  surface: accepting uses the accent/info styling, success keeps the green confirmation.
- Batch review keeps the session snapshot behavior, but the modal shortcut hints are now `A`
  accept, previous, and skip only.
- Finishing a skipped batch review session now refreshes the Rule Library list before returning to
  the page, even when no accept mutation ran during that session.
- Historical `rejected` statuses and server-side reject procedures remain for existing audit data
  and non-customer-facing maintenance paths; they are not part of the practice review decision UI.
