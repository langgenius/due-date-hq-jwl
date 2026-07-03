# UX flow remediation — wave 1 (5 parallel fix clusters)

**Date:** 2026-07-02 · follows docs/Design/ux-flow-audit-2026-07-02.md

Five agents fixed disjoint file clusters; orchestrator verified (tsgo clean app+db,
552 app + 186 db unit tests pass, lingui strict compile with 42 new zh-CN
translations) and committed per cluster. All fixes live-verified with Playwright
against the demo stack before commit.

## Alert action closure (features/alerts + db pulse repo)

- Dismiss / Mark-reviewed toasts now carry **Undo**; history drawer gains
  **Restore to queue**. Root fix: `pulse.reactivate`'s repo guard only allowed
  `reverted`, so NO restore path (incl. the list row's existing Undo) worked —
  guard extended to dismissed/reviewed, audit-logged as before.
- Held-key `D` auto-repeat fired duplicate dismiss RPCs (two audit events in the
  same second) — `event.repeat` guard added.
- History bulk checkboxes + zero-action bulk bar deleted (dead chrome); test
  guards against return.
- Review-only alerts: "verify before Apply" copy → "verify before marking
  reviewed" (no Apply exists there).
- "N of M" pager gains real ▲/▼ buttons reusing the rail's prev/next.

## /today handoffs (features/dashboard, routes/dashboard)

- Source chip on alert cards: `{...props}` spread AFTER custom handlers let Base
  UI overwrite onClick — chip navigated to the alert instead of opening the
  source. Spread reordered; card click still opens the alert (stopPropagation).
- Inline dismiss restored (regressed in PR #87's card rewrite): div role=button
  card + hover ✕ + pulse.dismiss/reactivate Undo pair (per 31116bb8).
- "See all N deadlines" now carries its bucket (`?due=overdue` /
  `?dueWithin=7|30`); empty-window hints became real bucket-switch controls.
- `CreateObligationDialog.onCreated` wired (was wired nowhere): first-run create
  now lands on the new deadline (arrival wash confirms).
- Sync button: quiet "Synced just now" toast on explicit click.
- aria plural fix ("1 deadline waiting…").

## Deadline flow closure (features/obligations, routes)

- **Snooze P0**: page-mode snooze navigated into its own "not found" pane. Now
  returns to the filtered queue; toast names the return date + working Undo
  (`obligations.snooze` already accepted `snoozedUntil: null`). A "Snoozed"
  list filter was NOT added — the repo query excludes snoozed rows
  unconditionally (obligation-queue.ts:884); candidate for wave 2.
- Crumb "Deadlines" + not-found CTA carry `cleanDeadlineDetailSearch` (filters
  survive the product's own way back, matching browser Back).
- Malformed ref (non-hex) → recoverable not-found card (was a blank pane).
- "Leave note for preparer" now opens a protectInput dialog and records the note
  as the audit `reason` (280 chars, renders in Activity) — the verb stopped lying.
- Bulk "Confirm projected": applicability computed from `row.confirmed`;
  disabled+reason at 0 applicable; live count in the label; no-op no longer
  clears selection.
- Extension: inline first-unmet-requirement caption beside the disabled button.
- **Create-notes P0**: internal notes typed in Add-deadline no longer vanish —
  draft parked in sessionStorage keyed by the new obligation id
  (deadline-note-draft.ts), toast gains "Open deadline", Status tab shows a
  recoverable copy/dismiss callout. No fake persistence: there is no note
  endpoint yet.

## Global shell (patterns, auth, main)

- status.duedatehq.com (NO DNS record) → https://duedatehq.com/status on
  auth-chrome + entry-layout (onboarding/2FA/invite/migration/readiness).
- `refetchOnWindowFocus: true` (multi-user: second viewer no longer stale ≤60s;
  staleTime kept).
- Command palette: dead Deadlines/Alerts/Rules pills removed (no search source
  behind them — honesty over chrome).
- Console warnings fixed at root: bell popover `Button render={<Link/>}` needed
  `nativeButton={false}`; StatBand's conditional `key` spread → `key={bumpKey ??
undefined}`.
- Investigations: notification "wrong id" P0 disproven (target was QA-snoozed —
  collapses into snooze P0); practice-save revert is demo-only
  (`ensureDemoIdentities` resets demo firms on every demo-login).

## Rules review closure (features/rules, rules.library)

- Accept success: toast "Rule activated — N deadlines generated" (real impact
  count) + **Review next** action (current filtered order, wraps).
- "Start review" bulk modal preselects a cap-sized batch (100, accept-ready
  first) — primary button enabled on open (was 454 selected > 100 cap =
  disabled).
- Review list gains a Readiness column ("Ready" chip vs "Needs AI draft") from
  the same structural gate as the drawer's accept lock.
- Active-rule drawer's empty YOUR-DECISION rail now renders the recorded
  decision (who/when) + audit link + deadlines/affected-clients links (the
  split-rail modal had been missing ApplicabilitySection's links).
- Orphan pages reachable: Overview header "Tools" menu → Annual rollover
  (/rules/preview) + Temporary rules (/rules/temporary).

## Deferred (wave 2+, tracked in the audit doc)

Drawer back semantics (replaceState), shared query-error/retry state (S1),
settings dirty-form guard, count reconciliation (S4), snoozed-rows filter,
client rename reachability + archive, J3 retroactive rule application, alert
Apply pacing, zh-CN marketing 404.
