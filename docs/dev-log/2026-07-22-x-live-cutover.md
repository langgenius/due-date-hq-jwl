# 2026-07-22 — X live publishing cutover

## Context

The OAuth 1.0a credentials and Social Ops token were configured on the deployed Worker. Before the
cutover, the operator used the read-only `verify-account` control and confirmed that the credentials
resolve to the intended `@DuedateHQ` account. The immediate-publish control had already been deployed
with `X_POSTING_MODE=draft`, so that deployment could not create an X Post.

## Change

- Changed the Worker configuration source of truth from `X_POSTING_MODE=draft` to `live`.
- Kept the four OAuth values and `SOCIAL_OPS_TOKEN` in Cloudflare Worker secrets; no credential value
  was added to Git, D1, an ops request, or this log.
- Retained explicit approval, exact-Post claiming, the unique ET daily ledger, serialized Queue
  publishing, and `unknown` reconciliation as the posting gates.
- Recorded the pre-live Worker version `c45a4aa8-12b9-49cd-802a-f59b1c5dddef` as the emergency
  rollback target.

## Operator sequence

After deployment, the selected shadow draft must be approved again and sent with `publish-now`.
Changing the mode alone does not claim a Post or call X.
