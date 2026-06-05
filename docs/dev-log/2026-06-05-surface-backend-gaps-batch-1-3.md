# 2026-06-05 — Surface backend gaps: batches 1–3

Implementing the dispatch-ready prompts from
`docs/Design/placement-map-and-amendment-prompts-2026-06-05.md`. Per Yuqi's
direction, the 8-highest list dropped items 1/2/3/4/6 (exposure, brief [already
shipped], rule reject-edit-archive, saved views, priority triage); this lands
the kept items + the less-prioritised Part B ones, in verified batches.

All changes typecheck clean (`tsc -p apps/app` → 0 errors). Each is additive and
follows an existing in-repo pattern.

## Batch 1 — trivial additive wins

- **Calendar firm feed (B13)** — `features/calendar/calendar-page.tsx`. Added the
  `scope: 'firm'` "Practice deadlines" card (was hardcoded to `my` only). The
  card component already handles firm scope; `locked` is derived from
  `firm.calendar.manage` via `useFirmPermission`, so preparers see the redacted
  state and owners/managers/partners get the real feed.
- **Reminders hidden tiles (B14)** — `features/reminders/reminders-page.tsx`.
  Added `queuedTodayCount` + `failedLast7DaysCount` StatTiles (2 of 6 were
  hidden). StatTile gained a `tone` prop so the failed count renders destructive
  when > 0 (DESIGN.md §7). Grid → `xl:grid-cols-3` for a clean 3×2.
- **Workload window picker (B12)** — `features/workload/workload-page.tsx`.
  `windowDays` was hardcoded to 7; now a 7/14/30 segmented control in the header
  (input accepts 1–30).
- **Evidence model name (B16)** — `features/evidence/EvidenceDrawerProvider.tsx`.
  Footer now shows `EvidencePublic.model` (which AI model produced the value)
  next to the timestamp.

## Batch 2 — notifications (B15)

- **Accurate bell badge** — `components/patterns/alerts-notifications-bell.tsx`.
  Badge now reads `notifications.unreadCount` (server) instead of counting the
  loaded 20-item page (which undercounts); capped display "99+".
- **Type filter + pagination** — `features/notifications/notifications-page.tsx`.
  Added a server-side `type` filter (nuqs `?type=`) and switched the flat
  `useQuery(limit:50)` to `useInfiniteQuery` + a "Load more" keyset pager
  (older notifications past page 1 were previously unreachable). Client search
  unchanged (scans loaded pages); "Load more" hidden while searching.

## Batch 3 — client readiness portal (#5)

`routes/readiness.tsx` (the public client-facing portal):

- **Expiry banner** — "This link expires {date}" (was never shown → links died
  silently).
- **Per-item `sourceHint`** — "where to find this document" helper text under
  each item (the field existed on the portal payload but was dropped).
- **Post-submit confirmation** — a terminal "Thanks — {sender} at {firm} has been
  notified" screen (local `submitted` flag + server `responded` status), instead
  of leaving the client on the form after a toast.

## Batch 4 — source health + coverage (#7)

`features/rules/sources-tab.tsx` (the `/rules/sources` page reached from the
Alerts "Sources" button):

- **Re-check action** — wired the previously-unused `pulse.retrySourceHealth`.
  Rows whose watcher has a failure streak or a recorded `lastError` now show a
  "Re-check now" button (force a re-poll instead of waiting for `nextCheckAt`),
  and the health cell surfaces `lastError` on hover.
- **Coverage matrix** — new `SourceCoverageSection` wired to the previously-unused
  `pulse.listAlertSourceCoverage`: per-jurisdiction `coverageLevel` badge,
  covered/required role count, and missing-role chips (with `missingReason` on
  hover) — answers "are we watching everything for my states?"

## Batch 5 (partial) — migration resume (#8) + workload (B23)

- **Migration resume prompt (#8)** — `features/migration/Wizard.tsx`. Wired the
  unused `migration.getResumableImport`: when the wizard opens fresh (no explicit
  resume target, nothing started), a "Resume your in-progress import?" Alert shows
  the parked draft (`rawInputFileName` · rows · started-relative) with Resume
  (`HYDRATE`) / Start fresh. Recovery no longer requires digging through Import
  history.
- **Workload capacity score (B23)** — `features/workload/workload-page.tsx`. The
  Manager-operations "Capacity pressure" metric now includes `capacityLoadScore`
  ("… · 72% load"), which the schema carried but the UI dropped.

## Batch 6 (Part B continued)

- **5b — Readiness request history (drawer)** — `ObligationQueueDetailDrawer.tsx`. The
  drawer read only `readinessRequests[0]`; now the latest request shows its
  open/respond timestamps, and prior requests render as a compact history list
  (sent / opened / responded per request). Completes #5's CPA companion. Data was
  already in the payload.
- **B11 — Smart-priority "why this rank"** — `features/dashboard/actions-list.tsx`.
  The rank tooltip showed only factor labels; now each factor shows its `rawValue`
  ("Due in 3 days", "Importance: high"), top-4 by contribution.
- **B21 — Billing trial/cancel status** — `routes/billing.tsx`. Added a "Billing
  period" metric: Trial ends / Cancels {date} / Renews {date}, from the
  subscription's `trialEnd` / `cancelAtPeriodEnd` / `cancelAt` / `periodEnd`
  (all previously unrendered). Verified live.
- **B22 — Rule local facts** — `features/rules/rule-detail-drawer.tsx`. Local-
  jurisdiction rules now show their `localFactRequirements` (resident county,
  PSD code, …) as chips. (sourceAuthority/lastReviewedOn aren't on the rule type —
  they live on evidence, already shown — so only localFactRequirements applied.)
- **B17 (search half) — Audit server-side search** — `features/audit/audit-log-page.tsx`.
  The `q` term is now forwarded to `audit.list` so search matches across all rows,
  not just the loaded page. (The `actorType` segmented filter is the remaining half.)

All typecheck-clean; 151 area tests pass.

## Remaining (queued — see placement-map doc)

5b readiness request-history timeline (drawer), Part B: B1/B3/B4 (deadline flows),
B5/B6 (client edits), B9/B10/B11 (dashboard triage tabs / facet bar / priority
popover), B17/B18 (audit), B19 (rule coverage extras), B20 (dashboard accrued
tile), B21 (billing trial/cancel status), B22 (rule local-jurisdiction provenance
in rule detail), B24 (migration confidence), 3H (drawer extension/payment/efile
fields), plus the two contract-change items B7/B8.

## Verification note

Browser verification was blocked: the only running dev server on :5173 was
serving a _different_ git worktree (`.claude/worktrees/pedantic-borg-f3d96d`),
not this main tree, so its pages don't reflect these edits. Relied on the clean
`tsc` pass; full app+worker+auth smoke is a follow-up.
