# Rule Library Active State Auto Expand

## Context

When a CPA batch-reviewed every pending rule for a state, that state became fully active
and moved near the top of the Rule Library list after refresh. The row stayed collapsed,
so the newly completed state looked like it jumped without showing the rules that changed.

## Change

- Track rule IDs accepted during the current batch review session.
- On batch completion, detect jurisdictions where every previously pending rule was
  accepted and no entity gaps remain.
- Add those jurisdictions to the expanded set before refreshing the Rule Library data, so
  a state that moves into the fully active bucket opens automatically.
- Preserve that auto-expanded jurisdiction through the post-refresh jurisdiction reset. A
  completed state can move into the visible group window after the refresh; without carrying
  the state through that reset, the row opens briefly and then collapses again.
- Clear the preserved auto-expand state when the user manually toggles a jurisdiction,
  collapses all, or starts a new batch review.

## Verification

- Added route coverage for a state whose selected batch review activates all its rules.
- Reproduced the AK shape specifically: the pending AK rule starts outside the visible
  top group window, is accepted through batch review, moves ahead of the already-active
  state groups, and remains expanded after the refetch/reset.
