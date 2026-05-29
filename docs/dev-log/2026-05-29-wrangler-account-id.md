---
title: 'Wrangler account id pin'
date: 2026-05-29
---

# Wrangler account id pin

## Context

Local remote D1 commands such as `wrangler d1 migrations list DB --remote --config
wrangler.toml` resolved the D1 `database_id` as the Cloudflare account id when no
`CLOUDFLARE_ACCOUNT_ID` was present in the shell.

The bad request path used the same UUID for both segments:

```text
/accounts/5d58a4e6-a5f0-483b-970d-9f0fcdee08e9/d1/database/5d58a4e6-a5f0-483b-970d-9f0fcdee08e9/query
```

## Change

Pinned the LangGenius OPC Cloudflare account id at the top level of
`apps/server/wrangler.toml`:

```toml
account_id = "8f7d374db5cb1f025b7f71e28b84c9bb"
```

This keeps local Wrangler remote commands aligned with CI, where
`CLOUDFLARE_ACCOUNT_ID` already points to the same account.

## Notes

- `database_id` remains the D1 database UUID for `due-date-hq-staging`.
- `AI_GATEWAY_ACCOUNT_ID` remains a Worker runtime variable and is not used by
  Wrangler CLI account selection.
- Validation with `wrangler d1 info due-date-hq-staging --config wrangler.toml
--json` now uses the correct API path:
  `/accounts/8f7d374db5cb1f025b7f71e28b84c9bb/d1/database/5d58a4e6-a5f0-483b-970d-9f0fcdee08e9`.
  The remaining local failure is auth scope/account access: the current Wrangler
  OAuth login is for `2cac986627bb431e6a07763cba19ce67`, not the pinned
  LangGenius account.
- `DESIGN.md` does not need a change because this is deployment configuration, not
  product UI or design behavior.
