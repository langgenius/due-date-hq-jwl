# Auth — sign-out was broken (empty-body 500 + untrusted dev-port 403)

**Date:** 2026-06-29
**Files:**

- `apps/server/src/routes/auth.ts` (normalize empty-body auth POSTs)
- `packages/auth/src/index.ts` (`trustedOrigins`: trust `localhost:*` in dev only)

## Why

Yuqi (login/onboarding QA): _"sign out does not work."_

Reproduced against the local Worker and found **two stacked causes** — the first
is a real production bug, the second a dev-only artifact of running the app on a
non-default port.

### 1) Empty-body POST → 500 (production bug)

better-auth's request router (`better-call` `getBody`) calls `request.json()`
whenever `Content-Type: application/json` is set — and `JSON.parse('')` throws
`SyntaxError: Unexpected end of JSON input` on an **empty** body. The better-auth
browser client posts input-less endpoints like `/sign-out` with a JSON
content-type and no body, so the endpoint **500s and never clears the session** —
sign-out silently does nothing. Confirmed via `wrangler dev` stack trace:

```
[Better Auth]: SyntaxError: Unexpected end of JSON input
  at async getBody (better-call/src/utils.ts:42)
  ...
POST /api/auth/sign-out 500 Internal Server Error
```

### 2) Dev port not a trusted origin → 403

`trustedOrigins` was only `AUTH_URL` (`:8787`) + `APP_URL` (`:5173`). Local dev
cycles many ports via `.claude/launch.json` (5173/5177/5188/5193/5199/…); on any
other port the origin-guarded sign-out POST **403s** even once the body is valid.

## What changed

- **`auth.ts` — `withParseableAuthBody`:** for body-bearing methods that arrive
  empty, backfill `Content-Type: application/json` + body `{}` before handing the
  request to `auth.handler`. Requests that already carry a body pass through
  untouched. Fixes the 500 for all clients.
- **`packages/auth/index.ts` — `trustedOrigins`:** when `env.ENV === 'development'`,
  also trust `http://localhost:*`. Staging/production stay pinned to
  `AUTH_URL` + `APP_URL`. (Wildcard verified to match an arbitrary localhost port.)

## Verification

Reproduced the exact browser scenario (empty body + `Origin: http://localhost:5199`)
end-to-end through the real `:5199 → vite proxy → :8787` path:

- Before: `500` (then `403` after the body fix alone), session persists.
- After both fixes: **`200`**, `Set-Cookie: …session_token=; Max-Age=0`,
  `get-session → null`.

`tsgo --noEmit` clean for `apps/server` and `packages/auth`.
