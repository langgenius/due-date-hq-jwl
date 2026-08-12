# X tracked link moved to the first reply

**Date:** 2026-08-12 · Social distribution / X / Worker

## Outcome

DueDateHQ X Alert publishing now creates a link-free main Post and publishes the tracked
`/alerts?ref=...` acquisition URL in the first reply. Newly generated copy points readers to the
first reply, while the publishing boundary also recognizes the prior frozen template and removes
its trailing URL so already-approved backlog items do not regress to link-in-body publishing.

## Durable two-step publishing

- The first X create writes the main `xPostId` to `social_publish_run` before any reply call.
- That checkpoint returns the run to `queued`; the next `sending` lease represents only the reply
  attempt. A delivery interrupted after the checkpoint can therefore resume the reply without
  recreating the main Post.
- The successful terminal write stores both `x_post_id` and `x_reply_post_id` on the run and outbox
  Post. Existing historical single-Post rows remain valid with a null reply ID.
- Any failure after the main checkpoint becomes `unknown` and emits the existing ops alert. It
  cannot use the `failed/not_published -> draft` path, which would allow a duplicate main Post.
- Migration `0083_social_x_link_reply.sql` adds only the reply ID columns and unique index. It does
  not rewrite the active queue before the new Worker is deployed; review/publish projections adapt
  legacy frozen suffixes at their boundaries, and the next approval freezes the new template.

## Review and operations

The token-gated Social Ops review payload now derives a narrow `replyText` from the frozen target
URL. The public GitHub review mirror displays the exact main and first-reply copy in separate code
blocks, so approval still covers the full X thread without exposing raw queue, Pulse, tenant, or
credential fields.

For a partial thread, an operator must inspect the DueDateHQ X account, add the tracked reply
manually if it is missing, and reconcile using the main Post ID. `not_published` is invalid after a
main ID has been checkpointed.

## Validation

- Server social content, X client, and consumer: 3 files / 87 tests passed.
- Social Ops route: 1 file / 22 tests passed.
- GitHub review mirror: 21 tests passed.
- DB social repository and schema: 2 files / 41 tests passed.
- All migrations from `0000` through `0083` applied successfully to an isolated temporary local D1;
  a follow-up schema query confirmed both reply-ID columns and the reply-ID unique index.
- `pnpm ready` completed formatting/type checks, generated and i18n checks, automation tests, all
  workspace tests, and all builds. Existing repository-wide lint warnings remain outside this
  social change.
