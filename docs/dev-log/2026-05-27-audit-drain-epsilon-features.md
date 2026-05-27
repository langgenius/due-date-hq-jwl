# 2026-05-27 — Audit drain (epsilon-features): F1-F7 + F9-02 + cross-section #147

**Branch:** `design/audit-drain-epsilon-features`
**Scope:** thin-wrapper feature pages — notifications, workload, opportunities, audit, reminders, calendar
**Reference catalogs:** `docs/dev-log/2026-05-26-step-6-ux-flows-audit-cont.md` (section F) · `docs/dev-log/2026-05-26-step-7-onboarding-audit.md` (F9 cluster) · `docs/dev-log/2026-05-27-findings-master-index.md`

This is the epsilon-features pass over the six thin-wrapper feature pages
(plus the audit-log surface). The bulk of the F1-F7 catalog had already
shipped in previous batches — this pass adds two genuinely new shipped
findings on top of the existing work, plus a cross-section sweep.

## Shipped (3 net-new)

### F3.1 · Opportunity dismiss/snooze toast now carries Undo

- **Location:** `apps/app/src/features/opportunities/opportunities-page.tsx`
- **Catalog status before:** deferred (toast primitive audit).
- **Verification:** Sonner already supports `toast.success(text, { action: { label, onClick } })`,
  and the pattern is in active use in `PulseDetailDrawer`, `Migration/Wizard`, and
  `routes/obligations.tsx` (four call sites). The "primitive audit" the original
  defer cited has effectively already happened — Sonner action support is canonical
  in the codebase. F3.1 is mechanical.
- **Change:** Both `dismissMutation` and `snoozeMutation` `onSuccess` toasts now
  carry an `action: { label: t\`Undo\`, onClick: () => restoreFromToast.mutate(...) }`.
  The restore mutation invalidates both `opportunities.list` and
  `opportunities.listDismissed` keys, so the row reappears in the live queue and
  drops out of the "Recently dismissed" disclosure immediately.
- **Why it matters:** Dismiss is one click away. The only previous recovery path
  was scrolling to the bottom of the page, expanding the "Recently dismissed"
  disclosure, finding the row, and clicking Restore. An inline Undo on the toast
  cuts that to one click — matching every other dismiss/snooze action in the app.

### F9-02 (chrome upgrade) · Audit log empty state migrated to canonical EmptyState

- **Location:** `apps/app/src/features/audit/audit-log-page.tsx`
- **Catalog status before:** marked "shipped in batch 1" — but the previous fix
  was a *copy* fix (added description line). The chrome was still an ad-hoc
  `<div className="grid gap-2 rounded-lg border border-divider-subtle p-6 text-center">`
  with bespoke typography, missing the canonical dashed border, icon-on-top, and
  shared `EmptyState` cta slot.
- **Change:** Switched to `<EmptyState icon={ScrollTextIcon}>`, preserving both
  the empty-and-filtered and empty-and-unfiltered copy variants. Added a
  `<Button variant="outline">Clear filters</Button>` CTA when filters are active
  — same affordance the toolbar carries above, just available inline so the user
  doesn't have to scroll back up.
- **Why it matters:** Visual consistency across empty states. The audit log was
  the lone outlier — `/notifications`, `/workload`, `/opportunities`, `/reminders`
  all use the shared `EmptyState`. The CTA also gives the filtered case a recovery
  path that doesn't depend on muscle memory.

### #147 cross-section · Reminders overview error uses canonical Alert

- **Location:** `apps/app/src/features/reminders/reminders-page.tsx`
- **Catalog finding (#147):** "Couldn't load X" pattern repeats 50+ times.
  Some surfaces still use raw `<Card>` + `<CardContent>` + `text-text-destructive`
  instead of the canonical `<Alert variant="destructive">`.
- **Sweep result:** The five other owned files (`notifications-page`,
  `workload-page`, `opportunities-page`, `audit-log-page`, `calendar-page`)
  already use the canonical `<Alert variant="destructive">` pattern. The
  reminders overview error was the lone outlier — a `<Card>` shell with
  the raw RPC message as plain destructive text.
- **Change:** Replaced with `<Alert variant="destructive">` carrying a clear
  `<AlertTitle>` and a description that falls back to the standard
  "Check your network and try again" copy when the RPC error message is null.
  Same shape as every other error surface across the workbench.

## Verified shipped (already in main, content unchanged)

| ID | Surface | Note |
| --- | --- | --- |
| F1.2 | Notifications — read/unread visual | Left-accent border on unread rows |
| F1.3 | Notifications — loading state | Skeleton rows w/ aria-live |
| F1.4 | Notifications — markAllRead empty disable | Explicit `hasUnread` check |
| F1.6 | Notifications — `<article>` aria-label | Read/Unread prefix per item |
| F9-05 | Notifications — empty description | "Mentions, assignment changes…" copy |
| F2.1-F2.5 | Workload — loading/error/refresh/metric chrome | All five shipped previously |
| F9-03 | Workload — empty state | `<EmptyState>` with `ClipboardListIcon` |
| F4.1-F4.3 | Audit — Cancel ghost / Download aria-busy / Request aria-busy | All three shipped |
| F4 (#131) | Audit — filter by action/category/actor/entityType | `AuditFilterSelect` + category Select live |
| F4 (#132) | Audit — export | `AuditExportButton` renders an evidence-package dialog |
| F5.1-F5.3 | Reminders — Cancel ghost / no font-mono / Save spinner | All three shipped |
| F7.2 | Calendar — Unicode arrow | `→` replaces ASCII `->` |
| F7.3-F7.4 | Calendar — Regenerate / Disable spinner | Both shipped |

## Skipped (with reason)

- **F1.1** — Filter tabs (unread/all/by-type): needs design call on tab vocab + URL state.
- **F1.5** — Pagination 50 cap: requires cursor-based server pagination contract change.
- **F2.6** — Uppercase kicker on manager-insight: deferred per dev-log; matches
  the rest of the metric-grid kicker treatment in workload.
- **F3.2** — Snooze duration picker: feature work (popover with date picker), not
  mechanical drift.
- **F3.3** — Action column 3 buttons: design call on which to demote / hide.
- **F5.4** — Loading suppressions text: minor — list section is below the fold.
- **F5.5** — Subject/Body label `htmlFor`: the existing `<label>` wraps the
  input, which is *semantically valid* HTML — the implicit association works for
  screen readers. Reviewed against `FieldLabel htmlFor=…` pattern used elsewhere,
  but converting these two would touch the `Input` / `Textarea` import shape
  without an accessibility-correctness gain. Skip with reason.
- **F7.1** — Calendar page is iCal-feed management, not the deadline grid the
  audit prompt implied: out of scope (architectural).
- **F9-01** — `/calendar` empty state: investigated. The page renders a
  `CalendarSubscriptionCard` for the "My deadlines" scope with a clear "Not
  enabled" badge + "Enable redacted feed" / "Enable full feed" CTAs when there
  is no subscription. The card *is* the empty state for this surface — adding a
  `SharedEmptyState` above it would be redundant. Skip with reason.
- **#148** — Skeleton size matching: no single-file egregious case in owned files.
- **#149** — Toast description format: too cross-cutting for this pass.

## Quality gates

- **TSC:** clean (`pnpm exec tsc --noEmit`, exit 0).
- **Lingui extract:** zero missing zh-CN translations. No new `msgid`s required —
  the only po-file diffs are reference annotations for the existing `"Undo"`
  msgid (now also referenced from `opportunities-page.tsx`).
- **Lingui compile:** strict pass (`pnpm i18n:compile --strict`, exit 0).
