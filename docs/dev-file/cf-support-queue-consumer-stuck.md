# Cloudflare Support Ticket — Queue consumer stuck on an old Worker version

**Product:** Workers / Queues
**Account ID:** `305dbc7da819eb47bb3f3f3bc8927046`
**Worker (script):** `due-date-hq-app-staging`
**Queue:** `due-date-hq-pulse-staging` (consumer = the same Worker)
**Date:** 2026-06-23

## Summary

A single Worker handles `fetch`, `scheduled` (cron `*/30 * * * *`), and `queue`
consumers. After several deployments, the **queue-consumer execution path is still
running an old (pre-deploy) Worker version** — it reads stale environment-variable
(plain-text `[vars]`) values and routes work using an old config — while the
**active deployment is the new version**. The cron enqueues messages; the queue
consumer processes them on the stale code.

This is NOT a code/config bug on our side: the active deployment's bindings are
correct (verified via the REST API and dashboard). The consumer simply is not
adopting the latest deployed version.

## Evidence that the consumer runs an OLD version

- **Active deployment version:** `6e6fae35-4ab3-4e2d-9f5e-e6e8f6e84751`, created
  `2026-06-23T07:51:48Z`, 100% traffic. Its bindings (via
  `GET /accounts/{acct}/workers/scripts/due-date-hq-app-staging/versions/{id}` and
  the dashboard → Variables) include:
  - `PULSE_BROWSERLESS_URL = https://api.cloudflare.com/client/v4/accounts/305dbc7da819eb47bb3f3f3bc8927046/browser-rendering/content`
  - `PULSE_BROWSERLESS_SOURCE_IDS` = a list that **does NOT contain `mt.temporary_announcements`**
- **Observed runtime behaviour (queue consumer):** processing the source
  `mt.temporary_announcements` results in an HTTP request to the OLD endpoint
  `https://production-sfo.browserless.io/...` (the error body is browserless.io's
  "units usage limit" 401). For that to happen, the consumer must be using BOTH
  (a) the old `PULSE_BROWSERLESS_URL` (browserless.io) and (b) an old
  `PULSE_BROWSERLESS_SOURCE_IDS` that still contains `mt` — i.e. a Worker version
  from **before** the current deployment. The current version would route `mt` to
  a direct fetch and never contact browserless.io.
- It is a **partial/mixed** state: in the same cron tick, ~3 of ~12 sources are
  processed on the NEW version (they hit the correct CF endpoint and succeed),
  while the rest are processed on the OLD version (browserless.io). The split is
  stable across many cron ticks.
- The `fetch`/HTTP path appears to use the correct (new) version; only the
  `scheduled` + `queue` execution is affected.

## Things already tried (none cycled the consumer)

1. **Multiple deployments** of new code via `wrangler deploy` (deployments at
   `06:38`, `07:05`, `07:51` UTC on 2026-06-23). The active deployment updates,
   but the queue consumer keeps running the old version.
2. **Full consumer remove + re-add:**
   `wrangler queues consumer worker remove due-date-hq-pulse-staging due-date-hq-app-staging`
   then `... add ...` with identical settings. No effect on the running version.
3. **Queue purge:** `wrangler queues purge due-date-hq-pulse-staging --force`. No
   effect — fresh post-purge messages are still processed on the old version.

## Questions for support

1. How can we force the `queue` (and `scheduled`) consumer to adopt the latest
   deployed Worker version? Is there a stuck/pinned consumer version on this
   queue/Worker?
2. Is there a known issue where `scheduled`/`queue` handlers continue running an
   old version after `wrangler deploy` while `fetch` uses the new one?
3. Can you force-restart / re-pin the consumer for queue
   `due-date-hq-pulse-staging` on Worker `due-date-hq-app-staging` to version
   `6e6fae35-4ab3-4e2d-9f5e-e6e8f6e84751`?

## Impact

Low urgency / no data loss. The affected sources were already failing before this
(an unrelated browserless.io free-tier exhaustion); the migration to Cloudflare
Browser Rendering is otherwise working on the new version. We just need the queue
consumer to run the current deployment.
