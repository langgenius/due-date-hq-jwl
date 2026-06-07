# /splash welcome recap + once-a-day post-login trigger (Pencil QGZta)

Date: 2026-06-07

Backend data pass, item 5 (the largest). The /splash welcome screen was a
static, bookmarkable route. It now shows a real "since last visit" recap and
auto-triggers once per calendar day on the dashboard.

## Persistence (new table + migration)

- `packages/db/src/schema/dashboard.ts` — new app-owned `user_dashboard_visit`
  table (`userId`, `firmId`, `lastVisitAt`, unique on user+firm). App-owned on
  purpose: the better-auth `user` table is never hand-migrated.
- `packages/db/migrations/0068_user_dashboard_visit.sql` — hand-written (the repo
  applies migrations by folder via `wrangler d1 migrations apply`; drizzle's
  journal is unused at runtime). Applied with `pnpm db:migrate:local|remote`.

## Recap aggregate (real counts)

- `packages/db/src/repo/dashboard.ts` — `welcomeRecap({ userId, now, weekAheadDays })`
  reads the user's last-visit stamp and counts firm activity **since** then with
  created-since-window table counts (real numbers, not audit tallies):
  deadlines synced (`obligation_instance.createdAt`), new alerts
  (`pulse_firm_alert.createdAt`), reminders sent (`reminder` sent + `sentAt`),
  clients added (`client.createdAt`), plus due-this-week (open obligations in the
  7-day window). `recordDashboardVisit({ userId, now })` upserts the stamp.
- Ports: `DashboardRepo` gains both methods.

## Contract + handlers

- `packages/contracts/src/dashboard.ts` — `welcomeRecap` (read-only, returns
  `shouldShow` + counts + `userName` + `lastSignIn{At,Ip}`) and
  `recordDashboardVisit` (write). `shouldShow` = last visit was an earlier
  calendar day in the firm timezone.
- `apps/server/src/procedures/dashboard/index.ts` — handlers; `userName` from the
  session user, `lastSignIn*` from the current session row.

## Trigger + UI

- `apps/app/src/router.tsx` — `welcomeGateLoader` on the dashboard index calls
  `orpc.dashboard.welcomeRecap.call()` (the sanctioned loader-redirect pattern);
  if `shouldShow`, redirect to /splash before render (no flash). Read-only — the
  visit is recorded only when the user leaves via "Open dashboard", which breaks
  the redirect loop. Any failure (no tenant yet, network) falls through.
- `apps/app/src/routes/splash.tsx` — consumes `welcomeRecap`: real greeting name,
  today's date, conditional recap lines (only activity that happened),
  due-this-week strip, last-sign-in footer. "Open your dashboard" calls
  `recordDashboardVisit` then navigates to /today.

## Notes

- "Last sign-in" uses the current session's start + IP (better-auth exposes these
  on the session); a true prior-session lookup would need an auth-table query.

## Verify

- tsgo (app + server + db + contracts + ports) → 0
- contracts 29/29, server dashboard+procedures 271/271, db dashboard 5/5,
  app router 50/50, dashboard 14/15
- `vp check` → 0 errors
