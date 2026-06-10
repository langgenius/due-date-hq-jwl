# Local dev reminders contract startup

## Context

`localhost:5173` was unavailable because the Vite app dev server was not running. After starting
`@duedatehq/app`, the SPA responded, but the Worker on `localhost:8787` was stale and did not
respond to `/api/health`.

Restarting the Worker exposed a server bootstrap failure:

```txt
Cannot read properties of undefined (reading 'handler')
```

## Change

Aligned `apps/server/src/procedures/reminders` with the current reminders contract surface. The
contract now exposes only:

- `listTemplates`
- `updateTemplate`
- `listRecentSends`

The server no longer registers the removed `overview`, `listUpcoming`, or `listSuppressions`
handlers.

## Verification

- `pnpm --filter @duedatehq/app dev` serves `http://localhost:5173/`.
- `pnpm --filter @duedatehq/server dev` serves `http://localhost:8787/`.
- `curl -I -sS http://localhost:5173/` returns `200 OK`.
- `curl -sS http://localhost:8787/api/health` returns `{"status":"ok","env":"development",...}`.
