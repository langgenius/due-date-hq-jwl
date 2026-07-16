# Arkansas DFA News RSS Ingest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ar.temporary_announcements` ingest the official Arkansas DFA news feed without
Browser Rendering and prevent page navigation links from becoming announcement candidates.

**Architecture:** Keep the human-facing source URL on the DFA News page, but route automated
fetches through DFA's official WordPress custom-post RSS feed. Add an AR-only article-path filter
as a defensive parser boundary; retain the shared tax-relevance predicate for content filtering.

**Tech Stack:** TypeScript ESM, Vitest, Cloudflare Workers, `@duedatehq/core`,
`@duedatehq/ingest`.

## Global Constraints

- Work directly on `main`; produce one Conventional Commit and push it to `origin/main`.
- Do not change the global announcement keyword vocabulary or other jurisdictions.
- Do not use React `useEffect`.
- Update the dated dev log and keep current-truth docs aligned.

---

### Task 1: Add failing AR source and parser regressions

**Files:**

- Modify: `packages/core/src/rules/index.test.ts`
- Modify: `packages/ingest/src/ingest.test.ts`

**Interfaces:**

- Consumes: `RULE_SOURCES`, `announcementItemsFromSnapshot()`.
- Produces: Regression coverage for the AR RSS route and `/news/<slug>` parser boundary.

- [x] **Step 1: Assert the AR source uses the official custom-post RSS feed**

  Add an expectation for `ar.temporary_announcements` with:

  ```ts
  {
    acquisitionMethod: 'api_watch',
    adapterKind: 'rss_or_announcement_list',
    feedUrl: 'https://www.dfa.arkansas.gov/feed/?post_type=news',
  }
  ```

- [x] **Step 2: Assert AR page chrome is excluded while a relevant news article survives**

  Parse inline HTML containing a `Sales & Use Tax` navigation link, an unrelated `/news/` link,
  and a relevant `/news/` filing-relief article. Expect only the relevant article.

- [x] **Step 3: Run the focused tests and verify RED**

  Run:

  ```bash
  pnpm --filter @duedatehq/core test -- src/rules/index.test.ts --run
  pnpm --filter @duedatehq/ingest test -- src/ingest.test.ts --run
  ```

  Expected: the core test reports the current `html_watch` configuration and the ingest test
  includes the `Sales & Use Tax` navigation item.

### Task 2: Route AR through RSS and add the parser boundary

**Files:**

- Modify: `packages/core/src/rules/index.ts`
- Modify: `packages/ingest/src/announcements.ts`
- Modify: `apps/server/wrangler.toml`

**Interfaces:**

- Consumes: `ruleSourceFetchUrl()` and `defaultLinkFilterForSource()`.
- Produces: `ar.temporary_announcements` fetching the RSS URL directly and accepting only
  same-origin `/news/<slug>` article links.

- [x] **Step 1: Configure the source as an RSS API watch**

  Preserve `url: 'https://www.dfa.arkansas.gov/about/news/'` and add:

  ```ts
  acquisitionMethod: 'api_watch',
  adapterKind: 'rss_or_announcement_list',
  feedUrl: 'https://www.dfa.arkansas.gov/feed/?post_type=news',
  ```

- [x] **Step 2: Add an AR-only link filter**

  For `ar.temporary_announcements`, require origin `https://www.dfa.arkansas.gov` and pathname
  matching `^/news/[^/]+/?$`. Continue applying `linkLooksTaxAnnouncementRelevant()` afterward.

- [x] **Step 3: Remove AR from `PULSE_BROWSERLESS_SOURCE_IDS`**

  Update the adjacent comments to record that the official RSS feed replaces the rendered HTML
  path and no longer consumes Browser Rendering.

- [x] **Step 4: Run focused tests and verify GREEN**

  Run:

  ```bash
  pnpm --filter @duedatehq/core test -- src/rules/index.test.ts --run
  pnpm --filter @duedatehq/ingest test -- src/ingest.test.ts --run
  pnpm --filter @duedatehq/server test -- src/jobs/pulse/rule-source-adapters.test.ts --run
  ```

  Expected: all focused suites pass with zero failures.

### Task 3: Document, verify, review, and land

**Files:**

- Create: `docs/dev-log/2026-07-10-arkansas-dfa-news-rss-ingest.md`
- Review: all modified files

**Interfaces:**

- Consumes: completed implementation and test evidence.
- Produces: current operational history, reviewed diff, one pushed `main` commit.

- [x] **Step 1: Add the dev log**

  Record the stale alert, the confirmed HTML navigation false positive, the official RSS route,
  the Browser Rendering removal, and exact validation commands.

- [x] **Step 2: Run repository verification**

  Run focused suites, `pnpm check`, `pnpm format`, and `pnpm build`. Inspect full output and fix
  any failures before proceeding.

- [x] **Step 3: Request an independent code review**

  Review the working-tree diff against this plan. Resolve every Critical or Important finding.

- [x] **Step 4: Stage and inspect**

  Run `git diff --check`, stage only task files, then inspect `git diff --cached --stat` and the
  full staged diff.

- [ ] **Step 5: Commit and push**

  ```bash
  git commit -m "fix(pulse): ingest Arkansas news from official RSS"
  git push origin main
  ```

  Confirm local `HEAD` equals `origin/main` after the push.
