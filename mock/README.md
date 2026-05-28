# Demo Mock Data

This folder contains the local live-demo seed for DueDateHQ.

## Use It

```bash
pnpm db:migrate:local
pnpm db:seed:demo
pnpm dev
```

For a local no-OAuth walkthrough, open:

```text
http://localhost:8787/api/e2e/demo-login
```

That development-only helper signs in as `Sarah Martinez` and activates
`Brightline Demo CPA`, then returns a 200 handoff page that sends the browser to
`APP_URL` from `apps/server/.dev.vars` (usually `http://localhost:5173`). API
callers receive 200 JSON instead. The endpoint self-heals the minimum demo
identity rows required to sign in; run the seed first for the full clients,
deadlines, Pulse, billing, audit, and notification dataset.

## Archive Solo Pulse Supplement

`Archive Solo Practice` is intentionally blank in the main demo seed for import walkthroughs.
To turn that practice into a Pulse demo workspace, run:

```bash
pnpm --dir apps/server exec wrangler d1 execute DB --local --config wrangler.toml --file ../../mock/archive-solo-pulse-demo.sql
```

The supplement is repeatable. It creates five Archive Solo clients and obligations plus four
active Pulse changes covering `AI 96%`, `AI 82%`, `AI 63%`, and `AI 46%`; each Pulse affects at
least one client, and the CA Pulse includes one missing-county row that requires review.

## Coverage

- Dashboard: open obligations, due-this-week counts, exposure states, evidence gaps, and an AI brief.
- Obligations: pending, in-progress, review, waiting, done, overdue, unassigned, and missing-evidence rows.
- Team workload: Pro-plan firm with assigned and unassigned owner load.
- Alerts/Pulse: one apply-ready IRS alert, one applied CA FTB overlay, one low-confidence NY DTF
  advisory, one sub-50% FL DOR bulletin, source health, and snapshots. The seeded alerts
  cover the `AI XX%` badge tones plus a very-low-confidence example.
- Clients: manual, imported, ready, incomplete, multi-state, and missing-contact records.
- Imports: applied and reverted migration batches with mapper, normalizer, and validation rows.
- Members: owner, manager, preparer, coordinator, and pending invitations.
- Billing: active Pro subscription for the primary demo firm.
- Audit/Notifications: cross-category audit events, a ready evidence package, reminders, email outbox, and in-app notifications.
- Plan accounts: Sofia Solo, Priya Pro, and Taylor Team each have plan-specific clients,
  obligations, dashboard briefs, imports, evidence, audit events, notifications, readiness
  requests, calendar subscriptions, saved Obligations views, and Pulse alert matches.
