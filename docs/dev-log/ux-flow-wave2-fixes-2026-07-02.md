# UX flow remediation — wave 2 (6 parallel fix clusters)

**Date:** 2026-07-02 · follows docs/Design/ux-flow-audit-2026-07-02.md and
docs/dev-log/ux-flow-wave1-fixes-2026-07-02.md

Wave 2 takes on the systemic themes wave 1 deferred (S1 failure-as-empty, S3
back/close semantics, S4 count drift) plus the snoozed-row visibility and client
rename gaps. Six agents fixed overlapping file clusters; orchestrator verified
(tsgo clean contracts+db+app+server, 553 app + 595 server + 187 db unit tests
pass, lingui strict compile with 37 new zh-CN translations) and ran a live
key-page regression gate (Playwright against the running demo stack — /today,
/alerts, /deadlines, /rules/library all render healthy with zero console errors;
drawer push-on-open + back-closes-drawer confirmed at runtime). Committed in
coherent non-overlapping groups (clusters interleave the same files, so strict
per-cluster staging wasn't possible without partial hunks).

## Shared query-error primitive — S1 (components/patterns + 12 surfaces)
- New `QueryErrorState` (block + inline sizes): warning glyph + "Couldn't load
  {what}" + the server's message (when short) + **Retry wired to the query's
  `refetch`**. Sibling to `EmptyState` so a failed load can never again
  masquerade as an empty/skeleton pane. Canon: one quiet frame, destructive tone
  on the glyph only, lingui throughout.
- Wired into every surface the audit caught faking empty on failure: deadlines
  rail + table + detail pane, members, rules library (rail + table), jurisdiction
  rail, audit events, notifications inbox + preferences, command palette client
  search, alerts list. Each now branches `isLoading→skeleton`,
  `isError→QueryErrorState`, else empty/content. Count strips show no confident
  zeros while loading/failed.

## Back / close semantics — S3 (drawer providers, rules.library, client detail)
- Alert `DrawerProvider`, rule drawer (`?rule`), and the client-detail obligation
  drawer (`?obligation`) all switch to **push-on-first-open / replace-on-switch**:
  browser Back now closes the panel instead of skipping past the page; paging
  alert-to-alert stays `replace` so one Back always closes, a second leaves.
- Client-detail obligation drawer became URL-addressable (`?obligation=`) and
  gained Esc-to-close (it had violated the app's own close policy).

## Count reconciliation — S4 (obligations, dashboard, app-shell)
- /deadlines: when any filter is active the header pill + StatBand cells swap to
  the **filtered** count ("N matching" / scopeTotal "tracked in total"); the rail
  chip is relabeled "N in list" so it names its real source instead of implying
  it counts the same thing as the sidebar badge.
- Sidebar badge gains a tooltip naming its scope: "N open deadlines (not counting
  filed or extended)" — the naked number stops drifting against the page header.
- Dashboard scope ("My work"/"Everyone") threaded into the brief cards: the
  waiting-on-client pill and "See all N" links carry `?assignee=` when scope=me
  (documented residual: unassigned rows are counted but can't yet filter
  "mine OR unassigned").
- Overdue chip excludes terminal statuses (paid/completed rows stopped reading
  "overdue").

## Snoozed-row visibility + client rename (obligations, clients backend+UI)
- Repo `listQueue` gains an opt-in mode (default hide / `only` / `include`);
  port + contract + procedure updated to match; new repo test asserts snoozed
  rows appear only when opted in (incl. lapsed snoozes). /deadlines shows a quiet
  "N deadlines snoozed until later — Show" row with per-row **Unsnooze**
  (`obligations.snooze({ snoozedUntil: null })`, gated by write permission) —
  closing wave 1's snooze-black-hole from the other end (they were findable in
  the URL but not the list).
- **Client rename** restored: the backend chain (port `updateName` → repo →
  contract `rename` → role-gated, audit-logged procedure mirroring `updateNotes`)
  originally shipped 2026-06-30 on the never-merged `claude/polish-wave-3`
  branch; re-added here. Client detail gains a "Rename client" overflow action +
  dialog (toast + cache invalidation across denormalized surfaces). The one core
  identity field whose only neighbor was Delete now has a safe edit path.

## Settings / dirty-form closure — C (lib guard, practice, settings, 2FA, prefs)
- New `useUnsavedChangesGuard` (react-router `useBlocker` + AlertDialog +
  `beforeunload`): editing a form then clicking a sidebar link now prompts
  "Discard changes? / Keep editing" instead of silently dropping edits. Wired to
  /practice and the Smart Priority tuner; excludes the delete mutation and
  autosave surfaces (never "dirty" in the discard sense).
- 2FA enrollment gains a **Cancel** (resets state + mutations, no server call);
  notification preferences show "Saving… / Saved" (aria-live) so autosave stops
  being silent; role change confirms with a toast naming member + new role.

## Misc closure batch — F (alert history, sources, naming, migration)
- Alert history groups/sorts by the **handled** date, not publish date: pulse
  `listHistory` now selects the lifecycle timestamps (`dismissedAt`/`appliedAt`)
  so a just-dismissed alert files under "this week", not its months-old publish
  month.
- Sources tab rows are no longer whole-row clickable (removed the phantom
  `role="link"` + cursor) — only the explicit title/external/"Feeds N rules"
  links act.
- "Inbox" naming unified: notifications page heading + settings breadcrumb +
  command palette all agree (was Inbox/Notifications split).
- Migration wizard Back falls back to "/" for direct loads (was `about:blank`);
  Step2Mapping's nested `<button>` (real DOM error) → `<div role="button">` with
  a target-guard so the nested trigger doesn't toggle the row.

## Excluded from these commits
`.claude/launch.json` (local dev-server scaffolding) and
`outreach-kit/send-newsletter-test.mjs` (unrelated outreach track) left
uncommitted by design.

## Deferred (wave 3 — needs product/backend decisions, tracked in the audit doc)
J3 retroactive rule application (rules never apply to later-created clients —
core promise gap), alert Apply 600ms auto-close pacing, affected-clients list on
review-only alerts, rollover Missing-rule unlock path, zh-CN marketing 404,
client archive flow, login "creates your account" copy.
