# 2026-06-05 — Dev mode auto-signs into the demo workspace

Yuqi: "i don't want to login, to see the demo space."

When you boot the app fresh in development, hitting any protected route
used to bounce you to `/login` where you had to type an email and pick
up a magic-link code. For someone reviewing UI work locally, that
detour adds nothing — the demo seed already ships a Pro Plan firm
(`mock_firm_plan_pro`) with 10 clients, 15 deadlines, a real Pulse
alert, and a populated rule library that's the entire point of looking
at the local server.

## Change

`apps/app/src/router.tsx` — `protectedLoader`:

When `import.meta.env.DEV` is true AND there's no session, we now do a
full browser navigation to the server's existing demo-login endpoint
instead of routing to `/login`:

```ts
window.location.assign(
  `/api/e2e/demo-login?account=plan-pro&redirectTo=${encodeURIComponent(target)}`
)
```

The `/api/e2e/demo-login` route (server-side, dev-only via
`hasE2ESeedAccess` — `c.env.ENV === 'development'` short-circuits the
gate) signs you in as the Pro Plan demo CPA, sets the session cookie,
and bounces back to `redirectTo`. `redirectTo` defaults to `/` (which
is where Today lives — *not* `/today`, that route doesn't exist).

In production (`!import.meta.env.DEV`), nothing changes. The original
`/login` redirect path runs untouched, so real users still get the
real auth flow.

## Why `window.location.assign` instead of React Router's `redirect()`

`redirect()` from React Router treats the target as an internal route
match — it never actually navigates the browser. `/api/e2e/demo-login`
isn't a React route; it's a server endpoint that returns Set-Cookie +
HTML auto-redirect, which only works if we do a real navigation. We
follow the assign with `await new Promise(() => {})` so the loader
stays pending until the browser-level nav lands, then a `throw
redirect(demoLoginUrl)` as a defensive fall-through for the type
system.

## Verified

Live preview at `localhost:5173/` on a fresh browser session — page
renders /today populated with Pro Plan demo data, sidebar shows
"Priya Pro" account chip, "Pro Plan Demo CPA" practice chip. No
login screen, no click required.
