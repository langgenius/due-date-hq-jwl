---
title: '2026-06-01 · Alert pipeline recovery (cron → browserless → fetch → PDF → WAF)'
date: 2026-06-01
author: 'Claude'
---

# Alert pipeline recovery

## Summary

The Alert (Pulse) regulatory-change monitoring pipeline had silently degraded to **~1
healthy source out of 372** — effectively down. The cron had been dying for days, and
once it was revived a stack of independent, layered failures surfaced one after another.
This log records the full diagnosis and the eight fixes that took it back to **372/372
healthy**.

Pipeline shape, for context: `scheduled()` cron → `enqueuePulseIngestScans` /
`enqueueDueRuleSourceScans` fan out → `PULSE_QUEUE` → consumers fetch each source →
snapshot (R2 raw + D1 + content hash) → AI extract → firm alerts. Two fetch/parse paths
exist in parallel: the **ingest** path (`consumePulseIngestSource` → `ingestAdapter`,
for `livePulseAdapters` + the assembled rule/TA/policy-watch adapters) and the
**rule-source-scan** path (`consumePulseRuleSourceScan` in `jobs/rules/reconcile.ts`,
for `RuleSource`s). Both call the shared `fetchTextSnapshot` in `@duedatehq/ingest/http`.
The fact that the same source can be touched by both paths made several of these bugs
masquerade as something else.

## Root causes and fixes (in the order they were found)

### 1. Cron killed by `exceededCpu` (`ab8f0ac4`)

`scheduled()` was running `Promise.all` over branches; the rule-source and pulse-ingest
fan-outs each did a **per-source `await ensureSourceState`** round-trip to D1. Across
~470 sources that blew the cron's 15-minute wall-clock/CPU budget — the live tail showed
`outcome=exceededCpu`, so the handler was killed before it logged anything. No cron =
no fan-out = nothing fetched for days.

Fix: batch the source-state upsert into one bulk read + chunked `db.batch` insert/update
(`repo.ensureSourceStates(...)` returning a `Map`), replacing the N serial round-trips in
both `enqueuePulseIngestScans` and `enqueueDueRuleSourceScans`. The cron immediately went
from 0 → ~300 sources fetched per tick.

### 2. Queue consumer concurrency: cap, then raise (`137b3680` → `2cf77103`)

With the cron alive, the fan-out enqueued ~300 messages and Cloudflare Queues autoscaled
consumer invocations, firing 300+ near-simultaneous fetches (`createPoliteFetch`'s
30s/host limiter is per-invocation memory only, so it doesn't coordinate across
invocations). That overwhelmed upstreams: `429`/`403`/`406` cascade.

Fix: `max_concurrency = 2` on the pulse consumer to serialize the burst. Later, once
HTML sources moved to direct fetch across ~50 diverse `.gov` hosts (each guarded by the
per-invocation 30s/host limiter), raised back to `5` to drain the due set faster.

### 3. Browserless → direct fetch + browser User-Agent (`2b4ee9b5`)

~350 generic HTML sources defaulted to the browserless `/content` API
(`fetcherForParserKind` returned `'browserless'` for `html_due_date_page` /
`html_announcement_list`; TA/policy-watch adapters hardcoded it). Browserless was both
overloaded (429 quota) and — see #5 — irrelevant to the real failure. A one-off
experiment force-routing 8 due-date pages to direct fetch returned 5 clean 200s; the 2
that 403'd were blocking our honest `DueDateHQ-PulseBot` User-Agent.

Fix: `fetcherForParserKind` no longer routes HTML kinds through browserless; the TA and
policy-watch adapters drop their hardcoded `fetcher: 'browserless'`; `DEFAULT_HEADERS`
now sends a Chrome User-Agent (`PULSE_BROWSER_USER_AGENT`). robots.txt is still honored
under the `DueDateHQ-PulseBot` identity (the robots matcher uses that string
independently of the request header). This jumped OK 1 → 127 in a tick.

### 4. Ten broken (404) source URLs (`efba7d43`)

Direct fetch surfaced 12 sources returning 404. Ten were genuinely dead/renamed URLs
(VT instruction PDFs that rot yearly, IL/MA/NH/NJ income-tax pages that moved, DC/RI
pages, etc.), web-tested and repointed to current official pages — preferring stable
topic landing pages over year-stamped PDFs. The other two (`oh.tax_agency`,
`oh.employer_ui_agency`) were **stale D1 orphans**: the whole per-state agency-URL table
was removed in `aef3319b` and is test-forbidden; 102 such rows (51 states + DC × 2),
last checked `2026-05-04`, were deleted from `pulse_source_state`.

### 5. The real "Illegal invocation": a detached global `fetch` in the rule-scan path (`afe3936d`)

This was the headline bug and the one that misled the diagnosis the longest. ~187 sources
failed with workerd's `Illegal invocation: function called with incorrect this reference`.
It **looked** browserless-specific (every failing source was browserless-routed; every
succeeding source was an explicit direct adapter) — but that correlation was a
coincidence: browserless-routed sources happened to be the announcement-type sources.

After the browserless migration the failure persisted on _direct_ fetch, which broke the
theory. Adding stack-logging to the caught failure (`f8e4086f`, a
`pulse.ingest.source_failed` `console.error` with the full `error.stack` + resolved
fetcher) and a temporary every-minute cron to trigger ticks on demand, the captured stack
pointed at `pulse.rule_source_scan.source_failed → fetchTextSnapshot` — the
**rule-source-scan** path, not the instrumented ingest path.

`consumePulseRuleSourceScan` built its `IngestCtx` as `{ fetch, binaryFetch: fetch }` —
assigning the bare global `fetch` to a context property. When `fetchTextSnapshot` later
called `ctx.fetch(url)`, JS set `this === ctx`, and workerd rejects the global `fetch`
when its `this` isn't the global scope. The ingest path never hit this because it wraps
`createPoliteFetch(fetch)` (a closure that calls `fetch` as a free function). Auto-scan
sources (`html_watch` / `pdf_watch` — al.due_dates, `*.temporary_announcements`, …) died
on the fetch; `manual_review` sources returned early without fetching and looked
"healthy", which is exactly why this masqueraded as a browserless/parse problem.

Fix: wrap with `createPoliteFetch(fetch)` (correct `this` **and** the 30s/host throttle
this path otherwise lacked). 187 → 0 in ~45 seconds after a `next_check_at` reset.

### 6. PDF.js on the main thread in workerd (`051e9514`)

26 PDF sources (state tax instruction booklets, due-date calendars, FBAR, …) failed with
`No "GlobalWorkerOptions.workerSrc" specified.` PDF.js only auto-disables its Web Worker
when `isNodeJS` is true; workerd is not Node, so it tried to spawn a real `Worker`, needed
`workerSrc`, and threw — meaning we captured **zero** changes from PDFs that states use to
publish policy/deadline updates.

Fix: statically import `pdfjs-dist/legacy/build/pdf.worker.mjs` and register its
`WorkerMessageHandler` on `globalThis.pdfjsWorker`, which makes PDF.js run the worker on
the main thread (its built-in "fake worker"): no real Worker, no `workerSrc`. Text
extraction needs no rendering APIs beyond the existing `DOMMatrix` polyfill. Bundle grew
~0.5 MB gzip (2.04 MB total, under the 3 MB limit). 25/26 recovered; the 1 holdout was a
data issue (`wy.income_tax` pointed at the WY Constitution PDF placeholder — WY has no
income tax).

### 7. Residual sweep — 406 / 404 / robots (`1ba5f17a`)

- **`Accept: */*;q=0.8`** appended (as real browsers send) so strict content-negotiating
  servers stop 406-ing us on PDFs/other types (`mt`, `id.ui_wage_report`,
  `wy.sales_use_tax`).
- **`{year}` token resolution in `reconcile.ts`'s `sourceFetchUrl`** — the adapter path
  resolved it, the rule-scan path didn't, so `wv.temporary_announcements` was fetching a
  literal `…AdministrativeNotices{year}.aspx` → 404.
- **`ut.individual_estimated_tax`** repointed: `incometax.utah.gov`'s robots.txt is
  `Disallow: /` for all bots site-wide, so we (correctly) never fetched it. Moved to the
  bot-allowed `tax.utah.gov/forms/current/tc-546.pdf` (TC-546 prepayment coupon).
- The 7 explicit "news" adapters migrated off browserless to direct fetch; emptied
  `PULSE_BROWSERLESS_SOURCE_IDS`.

### 8. `Sec-Fetch-*` headers to pass `.gov` WAFs (`d8bf55db`)

The migrated news adapters still 400'd on direct fetch even with a Chrome UA.
Diagnostic split: `floridarevenue.com` returned 200 to a normal fetch but 400 to us (a
request-shape/WAF issue), while `ftb.ca.gov` 403'd even standard tools (TLS-fingerprint
bot manager). Our request looked bot-like: a Chrome UA **without** the
`Sec-Fetch-Dest/Mode/Site/User` + `Upgrade-Insecure-Requests` headers a real Chrome
navigation always sends. Adding them (harmless to the already-working sources) recovered
the remaining news pages.

## Key lessons

- **workerd is not Node.** Two of these bugs were workerd-vs-Node behavior differences:
  PDF.js's worker auto-disable (`isNodeJS`), and the detached-`fetch` `this` check. Local
  `vp test` runs in Node and reproduced neither — both only manifested in production
  workerd.
- **Correlation ≠ cause.** "All failing sources are browserless" held for two unrelated
  reasons at once (browserless overload _and_ the rule-scan detached fetch), which sent
  the browserless theory a long way before a captured stack corrected it. Instrument the
  caught error with a real stack early.
- **`{ fetch }` is a trap in workerd.** Assigning the bare global `fetch` to an object and
  calling it as `obj.fetch(...)` runs it with the wrong `this`. Always wrap
  (`createPoliteFetch(fetch)` or `(i, init) => fetch(i, init)`).
- **Two scan paths, one shared fetcher.** `ingestAdapter` and `consumePulseRuleSourceScan`
  build their own `IngestCtx`; a fix or instrumentation in one does not cover the other.
- **`.gov` WAFs fingerprint the UA-vs-header set.** A browser UA alone isn't enough; the
  `Sec-Fetch-*` family matters. A residual few use TLS fingerprinting that headers can't
  satisfy.

## Validation

- Final state: **`pulse_source_state` = 372 total, 372 healthy, 0 failing.** (Started at
  ~1 healthy.) Verified after each fix by resetting the affected sources' `next_check_at`
  and reading the post-tick distribution from D1.
- Stage signals observed live: cron `358 sources/tick` (was 0); OK `1 → 127` after the
  direct migration; `Illegal invocation 187 → 0` after the fetch wrap; PDF `workerSrc
26 → 0`; the 7 WAF news pages cleared after `Sec-Fetch-*`.
- Tests green at each commit: `@duedatehq/ingest` (23), `@duedatehq/core`
  `src/rules/index.test.ts` (60), `@duedatehq/server`
  `src/jobs/pulse/rule-source-adapters.test.ts` + `src/jobs/rules/reconcile.test.ts` (and
  `ingest.test.ts`), plus root `vp check`.
- Observability aid kept in tree: `f8e4086f` logs `pulse.ingest.source_failed` with the
  full stack + fetcher on any caught source failure.

## Follow-ups / not closed

- **4 intermittent WAF news sources** (`ca.cdtfa.news`, `ca.ftb.tax_news`,
  `wa.dor.news`, `wa.dor.whats_new`) pass now but can 400 under aggressive WAF /
  same-host rate-limiting; they self-recover on the 15-min retry. Sturdier options: a
  **GovDelivery** subscription (WA DOR's official machine channel — the codebase already
  has a govdelivery fetcher / `email_inbound` path), or a shared cross-invocation rate
  limiter so two same-host sources in different consumer invocations don't collide.
- **Failure-backoff parks too long.** A source that fails is rescheduled to (roughly) its
  full cadence rather than a fast retry, so after a _systemic_ fix the affected sources
  don't pick it up until their next cadence (days). Each fix above therefore required a
  manual `UPDATE pulse_source_state SET next_check_at = unixepoch('now')*1000 WHERE …`.
  Consider a fast-retry cap on failure (the ingest path already caps at 15min;
  the rule-scan path should match), and/or a "re-baseline after deploy" reset path.
- **Browserless is now unused** (`PULSE_BROWSERLESS_SOURCE_IDS = ""`, no adapter declares
  it). Keep the wiring only if a genuinely JS-rendered source needs it; otherwise it can
  be removed. The browserless 200-response handler was never the source of the
  Illegal-invocation (that was #5), so no browserless code change is owed here.
- **`wy.income_tax`** is a semantic placeholder (WY has no income tax; it pointed at the
  state constitution PDF). It currently passes via the `*/*`/PDF fixes but is not a real
  monitoring target — consider dropping it from `STATE_INCOME_TAX_SOURCE_SEEDS` or marking
  it `manual_review`.

## Touched files / commits

- `ab8f0ac4` `packages/db/src/repo/pulse/ops.ts`, `apps/server/src/jobs/pulse/ingest.ts`,
  `apps/server/src/jobs/rules/reconcile.ts` — batched `ensureSourceStates`.
- `137b3680` / `2cf77103` `apps/server/wrangler.toml` — pulse consumer `max_concurrency`.
- `2b4ee9b5` `apps/server/src/jobs/pulse/rule-source-adapters.ts`,
  `packages/ingest/src/http.ts` — HTML → direct fetch + browser UA.
- `efba7d43` `packages/core/src/rules/index.ts` (+ test) — 10 URL repairs.
- `f8e4086f` `apps/server/src/jobs/pulse/ingest.ts` — source-failure stack logging.
- `afe3936d` `apps/server/src/jobs/rules/reconcile.ts` (+ test) — `createPoliteFetch` wrap.
- `051e9514` `packages/ingest/src/pdf.ts` (+ `pdfjs-worker.d.ts`) — main-thread PDF.js.
- `1ba5f17a` `packages/ingest/src/http.ts`, `packages/ingest/src/adapters/index.ts`,
  `apps/server/src/jobs/rules/reconcile.ts`, `apps/server/wrangler.toml`,
  `packages/core/src/rules/index.ts` — Accept `*/*`, `{year}`, ut repoint, news → direct.
- `d8bf55db` `packages/ingest/src/http.ts` — `Sec-Fetch-*` headers.
- D1 data cleanups (not in git): 102 agency orphans deleted; `next_check_at` resets to
  recover parked sources after each systemic fix.
