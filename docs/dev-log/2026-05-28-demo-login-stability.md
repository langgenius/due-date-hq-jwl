# Demo login stability

## Context

`/api/e2e/demo-login` doubled as a browser sign-in shortcut and an API smoke target. Successful
browser calls returned HTTP 302 by design, while missing local demo identity rows returned 409 and
asked the developer to rerun `pnpm db:seed:demo`. That made quick local checks look flaky: the same
endpoint could report 302 when login succeeded or 409 when the D1 identity seed was absent.

## Change

- Replaced the success redirect with a 200 response:
  - Browser navigation gets a tiny no-cache HTML handoff page that calls `window.location.replace`.
  - JSON/API callers get 200 JSON with the account, firm, role, and target URL.
- Added dev/e2e-only identity self-healing for the demo accounts. The route now upserts the minimum
  `user`, `organization`, `member`, and `firm_profile` rows needed for login before creating the
  Better Auth session.
- Preserved `pnpm db:seed:demo` as the full product demo dataset path; self-healing only covers the
  authentication identity layer.
- Rewrote loopback `APP_URL` targets so a request made through `127.0.0.1` lands on
  `127.0.0.1:5173`, keeping the host-only session cookie attached across the handoff.

## Docs Check

No DESIGN.md change was needed. This is a development auth bootstrap behavior change, so the local
demo README and `.dev.vars.example` comments were updated.

## Validation

- `pnpm exec vp check apps/server/src/routes/e2e.ts apps/server/src/app.test.ts`
- `pnpm --filter @duedatehq/server test -- src/app.test.ts`
