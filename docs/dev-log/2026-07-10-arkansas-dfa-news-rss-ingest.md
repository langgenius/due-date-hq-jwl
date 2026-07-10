# 2026-07-10 · Arkansas DFA news RSS ingest

## What happened

The daily source-health digest reported one source with no successful fetch for more than 48 hours:
`ar.temporary_announcements`. The current registry forced that source through Cloudflare Browser
Rendering because Arkansas DFA had previously rejected datacenter/browserless traffic.

The exact latest production `last_error` could not be retrieved during diagnosis because the local
Wrangler OAuth session had expired. Two independently reproducible risks were confirmed instead:

- Arkansas DFA's public news HTML is roughly 986 KB and includes tax-topic navigation links that
  the generic announcement parser could admit as apparent announcements.
- Arkansas DFA publishes the same news custom post type through an official, lightweight WordPress
  RSS endpoint that responds successfully without browser rendering.

## Change

- Changed `ar.temporary_announcements` from HTML watch to the official
  `https://www.dfa.arkansas.gov/feed/?post_type=news` feed.
- Removed the source from `PULSE_BROWSERLESS_SOURCE_IDS`; Utah remains on Browser Rendering.
- Added an Arkansas-specific defensive link filter that accepts only same-origin
  `/news/<slug>` entries before the existing tax-relevance filter runs.
- Kept the human-facing source URL at `https://www.dfa.arkansas.gov/about/news/`.
- Added regression coverage for the registry route and for excluding navigation/unrelated-news
  links while retaining a relevant tax-relief article.

No `docs/dev-file` contract was replaced. The source catalog now records Arkansas's structured-feed
route and its source-specific filtering constraint.

## Focused validation

- RED: the registry test observed the old `html_watch` configuration.
- RED: the ingest regression admitted `Sales & Use Tax` navigation chrome.
- GREEN: `@duedatehq/core` rule registry test — 69 passed.
- GREEN: `@duedatehq/ingest` announcement tests — 38 passed.
- GREEN: `@duedatehq/server` rule-source adapter tests — 14 passed.

Commands:

```bash
pnpm --filter @duedatehq/core test -- src/rules/index.test.ts --run
pnpm --filter @duedatehq/ingest test -- src/ingest.test.ts --run
pnpm --filter @duedatehq/server test -- src/jobs/pulse/rule-source-adapters.test.ts --run
```

## Full validation

- `pnpm format` passed across 2,837 files after applying the repository formatter.
- `pnpm ready` passed: static/type checks, all nine workspace test tasks, and all three production
  builds completed successfully.
- A live fetch of the official Arkansas feed returned HTTP 200 with a 10,704-byte RSS document.
  The project parser recognized 10 RSS items, all item links matched the same-origin
  `/news/<slug>` contract, and the current feed correctly produced zero tax-relevant candidates.
- The whole-worktree `pnpm secrets:scan` found nine pre-existing matches under ignored local env
  files and `.claude/worktrees`; none of those paths is part of this change. A staged-only scan
  then passed with no leaks found.

An independent review found no Critical or Important issues. Its two Low suggestions were applied:
the tests now lock the RSS same-origin boundary with a cross-origin high-relevance item, and the
WAF history now correctly distinguishes failed datacenter/browserless fetches from the previously
successful Cloudflare Browser Rendering workaround.

Commands:

```bash
pnpm format
pnpm ready
pnpm secrets:scan
```
