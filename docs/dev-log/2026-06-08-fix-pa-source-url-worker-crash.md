# Fix — worker crashed at boot from a source missing `url` (PA)

Date: 2026-06-08

## Symptom

`/today` (and every page) stuck on the auth bootstrap splash; `/api/auth/get-session`
returned 502 / hung. The backend worker **failed to start**:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'includes')
  at resolveAnnouncementYearUrl → fetchUrlForAdapterId → uniqueByFetchUrl
The Workers runtime failed to start.
```

## Root cause

`packages/core/src/rules/index.ts` — the `pa.temporary_announcements` source
(added in the `relief_or_disaster_signal` backfill) was **missing its `url`**,
which the source type requires (tsgo also flagged it: `Property 'url' is missing`).
`resolveAnnouncementYearUrl` reads `url.includes(...)`, so the undefined `url`
threw at module-eval time and crashed the whole worker on boot. The worker had
been warm from before the source landed, so it only surfaced on a restart.

## Fix

Added the canonical PA DOR Newsroom URL
(`https://www.pa.gov/agencies/revenue/newsroom.html`) — same pa.gov/revenue path
scheme as the other PA revenue sources in the file, and the same `newsroom.html`
convention as the sibling `ok.temporary_announcements`.

## Note

The dev environment had also accumulated **two backends for this repo** (the
`vp run -r dev` orchestrator's worker on 8787 + a second app on 5177) contending
for the same local D1 — that masked the real cause as a "D1 lock." Restarting to
a single app (5177) + worker (8787) plus this code fix restored the app.

## Verify

tsgo clean; `server-8787` boots without the crash; `GET /api/auth/get-session`
→ 200; `/today` renders at 1512×861 with no console errors.
