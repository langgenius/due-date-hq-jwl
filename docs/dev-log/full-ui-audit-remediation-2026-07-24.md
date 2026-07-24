# Full UI audit remediation — 2026-07-24

A fresh six-dimension audit (interaction states · state coverage · responsive ·
visual canon · accessibility · navigation/flow) ran across `apps/app/src`. The
app held up well — accessibility, nav/flow, and visual canon came back nearly
clean. The real cluster was the familiar one: **queries with no error branch
that render a confident "all-clear" on failure.** All P1–P3 findings fixed
below (two are deferred with rationale).

## P1 — correctness

- **Review gate silently opened on a failed check** — `features/alerts/AlertDetailDrawer.tsx` — `reverifyIncomplete` did `reverifyRulesQuery.data ?? []`, so a failed/pending re-verify load read as "complete" and let a `review_only` rule-change alert be marked reviewed while the rule was still stale. Now `isError`/`isPending` hold the gate closed (the shared ReverifyRulesSection shows the error + retry).
- **Client summary strip showed confident zeros on error** — `features/clients/ClientSummaryStrip.tsx` + `ClientDetailWorkspace.tsx` — added `isError`/`onRetry` to the strip; a failed obligations load now renders `QueryErrorState` instead of "0 overdue / 0 needs-review / 0 extension-due".

## P2 — false data / lockouts / touch

State coverage (all: add an honest error branch):
- `routes/clients.tsx` — non-blocking banner when the card-enrichment queries fail (was: every card silently 0 deadlines + no alert badge).
- `routes/dashboard.tsx` — first-run hero no longer stands in for a failed clients-probe (`clientsResolved` gates on `!isError`).
- `features/workload/workload-page.tsx` — a firm-list failure shows an error+retry, not the upgrade panel, so a paying user isn't told to upgrade.
- `features/audit/audit-log-page.tsx` — a firm-lookup failure shows `QueryErrorState`, not the "access denied" permission gate.
- `features/clients/ClientDetailDrawer.tsx` + `ClientPeekHoverCard.tsx` — "Deadlines unavailable" instead of "No open deadlines" on a deadline-load error.
- `features/rules/rule-detail-drawer.tsx` — "Couldn't load team notes — retry" instead of "No team notes yet".

Touch-unreachable actions (add `pointer-coarse:` fallback):
- `features/alerts/components/AlertCard.tsx` — Archive/Dismiss now reveal on touch.
- `features/alerts/AlertDetailDrawer.tsx` — the copy-source-excerpt button reveals on touch.

Responsive:
- `features/workload/workload-page.tsx` — the 8-column owner table scrolls inside its own frame (was: full-page horizontal scroll).
- `routes/rules.library.tsx` — the fixed-width jurisdiction rule table scrolls both axes instead of clipping Status + ⋯ off-screen.

Visual:
- `routes/login.tsx` — dropped `font-bold` double-highlight on the PRO badge + firm monogram (canon caps weight at 600).

## P3 — polish

- Reduced-motion guards: `panels.tsx` readiness bar, `rules.library.tsx` row caret.
- `role="button"` on clickable rows: `merged-brief-card.tsx`, `AlertHistoryView.tsx`.
- 28px action buttons given a ≥40px hit area via a `before:` hit-slop: `PulseAlertActionsRow.tsx`.
- `overflow-x-auto` wrappers / grid ladders: `temporary-rules-tab.tsx`, `sources-tab.tsx`, `AffectedClientsTable.tsx`, `generation-preview-tab.tsx` (7-up strip → `grid-cols-2 sm:4 lg:7`), `panels.tsx` milestone timeline.
- `rounded-2xl`→`rounded-xl` + `font-semibold`→`font-medium` on `fun-icon-button.tsx`; selection weight held constant (accent-only) on `states-rail.tsx`.
- `aria-live` on the migration import-count overlay (`Wizard.tsx`); `aria-haspopup="listbox"` on the combobox triggers (`timezone-select.tsx`, `CreateObligationDialog.tsx`); `role="status"`/`aria-busy` on the client-detail, readiness, and practice-profile loading skeletons.
- More error branches: `routes/alerts.tsx` monitoring-chip tooltip (no longer "Checking source health…" forever on error), `routes/obligations.tsx` calendar-sync popover (no "Enable subscription" on a failed load — duplicate risk), `ClientDetailWorkspace.tsx` activity panel.
- `AlertDetailDrawer.tsx` — the `NoAffectedClientsPrompt` fallback button says "View clients" (matches its `/clients` destination) instead of "Import clients".

## Deferred (with reason)

- **Assignee filter keyed on display name** (`/deadlines?assignee=<name>`) — keying on `assigneeId` is a data-contract change that would break existing bookmarked `?assignee=` links and touches the param parser + every emit site. Needs its own scoped change, not a mechanical edit inside a broad batch.
- **AlertsListPage source-error header chip** — surfacing "source health unknown" (vs. silently hiding the error-count chip) needs a deliberate indicator design; the primary monitoring chip on `/alerts` was fixed instead.

## Verification

- `apps/app` `tsgo --noEmit` → 0 errors (checked per tranche).
- `pnpm run i18n:check` → 0 missing `zh-CN` (13 new strings translated).
- Full `vp check` → 0 errors.
- Live at 390px: `/workload` + `/rules/library` have no page-level horizontal scroll (tables scroll in their frames); `/clients` and the client detail render clean with no console errors.
