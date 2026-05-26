# All 601 findings — master index (auto-generated 2026-05-27)

Generated from the 6 audit dev-logs in `docs/dev-log/`. Each section preserves the source dev-log's finding format. Cross-reference the dev-log for full context (location, why, proposed fix, status).

---

## Step 1-5 reaudit (60 findings) — `2026-05-26-step-1-5-reaudit.md`

### F-01 — Three names for 11px text (`text-xs` / `text-caption` / `text-badge`)

### F-02 — Two names for 10px text (`text-2xs` / `text-caption-xs`)

### F-03 — Two names for 14px text (`text-base` / `text-md`)

### F-04 — `--text-description` (13px) overlaps the `text-sm` (12px) / `text-base` (14px) tiers without a clear semantic carve-out

### F-05 — `--tracking-eyebrow-tight` (0.06em) sweep was incomplete

### F-06 — Marketing `.astro` files were declared swept for tracking but contain 30+ arbitrary `tracking-[0.15em]/[0.16em]/[0.18em]/[0.13em]/[0.04em]` values

### F-07 — Three overlapping color namespaces (`state-*` / `status-*` / `severity-*`) with no documented hierarchy

### F-08 — `bg-bg-*` and `border-border-default` legacy aliases still used in legacy paths

### F-09 — Inline avatar shapes still scattered (incomplete `AssigneeAvatar` extraction)

### F-10 — Six sites use bare `className="underline"` for retry/affordance buttons

### F-11 — `Couldn't load X` error pattern has TWO competing implementations

### F-12 — Hand-rolled destructive section in `Step4Preview.tsx`

### F-13 — Hand-rolled modal backdrop in `obligations.tsx:10917`

### F-14 — Stale `focus-visible:ring-ring` in `Step1Intake.tsx:499`

### F-15 — Arbitrary text sizes in marketing `.astro` files (54 sites)

### F-16 — Arbitrary leading values in marketing `.astro` (58 sites)

### F-17 — `login.tsx:146` uses `text-[26px]` and `onboarding.tsx:118` uses `text-[28px]` for page titles

### F-18 — `account-security-two-factor-setup.tsx:42` has raw `bg-white p-3 shadow-sm` (QR container)

### F-19 — Raw `cubic-bezier(0.2, 0, 0, 1)` in `preset.css:39,43` (sidebar-rail-content-in animation)

### F-20 — Six duration values (`100/150/200/240/300/500`) with no token discipline

### F-21 — `rgb(247 144 9 / 0.35),rgb(247 144 9 / 0.36)` hardcoded shadow in `upgrade-cta-button.tsx:37`

### F-22 — `before:bg-white/35` in `upgrade-cta-button.tsx:36` for shimmer sweep

### F-23 — Inline `bg-white/20` in `billing.tsx:634` for yearly-toggle active state

### F-24 — `_entry-layout` legacy primitive surface uses legacy tokens consistently

### F-25 — Z-index ladder is ad-hoc (`z-0`, `z-10`, `z-20`, `z-30`, `z-40`, `z-50`, `z-[70]`)

### F-26 — Marketing footer pricing tag `tracking-[0.04em]` is sub-canonical

### F-27 — No tokens for `min-w-[Npx]` of fixed UI columns

### F-28 — Marketing arbitrary letter-spacing `tracking-[0.06em]` in `Footer.astro` matches token but isn't using token

### F-29 — Marketing `text-[15px]` / `text-[17px]` describe missing tier (body-medium / body-large)

### F-30 — Round 5 introduced `text-description: 13px` without auditing whether it overlaps existing tokens

### F-31 — Round 6 swept `tracking-[0.12em]` → `tracking-eyebrow` but the visual delta is non-trivial

### F-32 — Round-2 segmented-control migration changed `text-xs` (11px) → `text-sm` (12px) implicitly via Tabs primitive baseline

### F-33 — The "audit converged" commit (`0e876252`, round 4) declared a clean state but the deferred-gaps commit (`8c79f212`) two hours later contradicted that claim

### F-34 — `tidy-3` extracted `AssigneeAvatar` but the primitive is at 2-site adoption

### F-35 — `--container-page-expanded: 1440px` was added in preset.css, not primitives.css, breaking placement convention

### F-36 — `tidy-4a` resolved `EmptyState` (3x) and `KbdHint` (2x) name collisions but the new primitive in `packages/ui/src/components/ui/...` was not added

### F-37 to F-50 — `text-[Npx]` arbitrary sizes in `apps/app/src` (audit pass)

### F-51 — `obligations.tsx:8463` uses `text-[11px]` for a uppercase eyebrow

### F-52 — Marketing `font-mono` usage discipline

### F-53 — `before:bg-white/35` shimmer + raw `rgb(...)` shadow stacking in `upgrade-cta-button.tsx`

### F-54 — `bg-state-warning-active` ring color is only used once

### F-55 — `aria-pressed` is used in 14 sites for toggle-button feedback but with inconsistent styling

### F-56 — `prefers-reduced-motion` coverage is selective

### F-57 — `text-[11px]` in `obligations.tsx:8463` (same as F-51)

### F-58 — Inline-style usage outside dynamic-only-needs is clean

### F-59 — TypeScript discipline is clean

### F-60 — `text-md` legacy alias should be deprecated

### F-61 — Marketing site missing system-default sidebar (n/a — different surface)

### F-62 — `EmptyState` name collision was renamed but the primitive in `packages/ui/...` doesn't exist

### F-63 — `text-[10px]` in `audit-log-table.tsx:175` (avatar) AND in `ClientFactsWorkspace.tsx:4928` (avatar)

### F-64 — `tracking-tight` (Tailwind default -0.025em) used on avatar initials inconsistently

### F-65 — `bg-components-badge-bg-blue-soft` is used 1 site, `bg-components-badge-bg-green-soft` is used by Badge primitive

### F-66 — `data-icon="inline-start"` is a convention used in `upgrade-cta-button.tsx` and elsewhere — is it documented?

### F-67 — Marketing has `bg-white` at `Pricing.astro` and `Hero.astro` directly

### F-68 — Marketing has `border-divider-regular` AND `border-border-default` mixed

### F-69 — `apps/app/src/features/permissions/permission-gate.tsx:244-248` has `bg-state-destructive-hover/85` arbitrary alpha

### F-70 — Two-factor route uses `bg-bg-panel` (legacy) inside a destructive context

### F-71 — `--text-badge--line-height: 1.333` is declared in primitives.css:30 but never used as `text-badge` (the badge primitive uses `text-xs` for line-height)

### F-72 — `--opacity-2: 0.02` and `--opacity-8: 0.08` are defined but Tailwind v4 already has the `/N` syntax for opacity utilities

### F-73 — `--animate-spin-slow: spin 2s linear infinite` token exists but caller count is unverified

---

## Step 6 first pass — UX flows (221 findings) — `2026-05-26-step-6-ux-flows-audit.md`

Findings numbered PER section (A1, A2, B1, C1 …). Format: section heading then `N · description.`

## A. Auth + entry-layout surfaces

**### A1 — `routes/login.tsx`**

- 1 · Hardcoded inline color values in welcome SVG.
- 2 · Subhead jargon: "evidence-backed recommendations".
- 3 · Hardcoded font sizes (`text-[26px]`, `text-[13px]`, `text-[12px]`) instead of canonical scale.
- 4 · "Encrypted · 7-day session · SSO-ready" status row uses `bg-status-done` (green dot) before the user even signs in.
- 5 · Google One-Tap fires silently via `useQuery` side effect — no user feedback that a One-Tap prompt is being attempted.
- 6 · No keyboard hint that pressing Enter on the email field will submit.
- 7 · "Trouble signing in? Email support@duedatehq.com" buried in 12px muted-text legal block.
- 8 · Submit-button label changes to "Redirecting to Google…" while disabled — but the SSO redirect typically resolves outside the SPA. The label is announced once and then the page unloads.

**### A2 — `routes/accept-invite.tsx`**

- 9 · Missing-invite-id state uses bare `Alert` with no escape hatch.
- 10 · Loading state for the invitation preview is a 5-row × 56px skeleton.
- 11 · `inviteQuery.refetch()` after email OTP sign-in but no toast confirming "Signing in…" while better-auth round-trip happens.
- 12 · Email-OTP form on /accept-invite is unaware of which firm/role the user is being invited to BEFORE sign-in.
- 13 · Description on the Card stays "Sign in to accept this invitation." even after sign-in if `inviteQuery.data` is null (e.g. invite expired).
- 14 · "Accept invitation" button enables even if invite preview hasn't loaded yet.

**### A3 — `routes/onboarding.tsx`**

- 15 · "PRACTICE PROFILE" eyebrow pill uses tracking-[0.16em] uppercase + accent dot — high-affect chrome on what is essentially a 1-field form.
- 16 · Internal deadline offset number input has no live preview of "your deadlines will then be at X date for Form 1040".
- 17 · Pre-filled practice name from Google profile uses `derivePracticeName` but doesn't disclose where the name came from.
- 18 · "Continue" button text doesn't promise destination.
- 19 · No "Skip rule activation" affordance even when user wants to onboard without picking any states.
- 20 · "Encrypted · Auto-saves · Renamable later" status row claims auto-save, but the form is NOT auto-saving — it only saves on Continue.

**### A4 — `routes/two-factor.tsx`**

- 21 · No "Resend code" affordance.
- 22 · `inputMode="numeric"` set but no `autoFocus`.
- 23 · Submit button disabled until `code.trim().length >= 6` but no inline indication that 6 digits are required until you try.
- 24 · "Verify" button shows spinner-only when pending — no label change ("Verifying…").
- 25 · No "Use a backup code" path.

## B. Top-of-app: layout + shell

**### B1 — `routes/_layout.tsx`**

- 26 · `pickCurrentFirm` fallback when no firm exists returns a synthetic firm with `id: 'pending'`.
- 27 · ShellSkeleton renders 3 hairline rectangles centered.

**### B2 — `components/patterns/page-header.tsx`**

- 28 · `lg:items-end` alignment of header row pulls the title flush to the actions baseline — works on small headers, but with a multi-line `<description>` the title can look misaligned.
- 29 · No `aria-label` on `<header>` element — assistive tech reads the H1 but the landmark is unnamed.

## C. Dashboard (`/`)

**### C1 — `routes/dashboard.tsx`**

- 30 · Dashboard error fallback embeds a `<button>` inside `<AlertDescription>` rendered as inline-block — the button is unstyled (`underline` only).
- 31 · The `Today` date pill is keyed `formatTodayHeader(data.asOfDate)` but absent when `data.asOfDate` is undefined — the title is just "Today" with no date.
- 32 · "Import clients" outline button is disabled when `!canRunMigration` but offers NO explanation why.

**### C2 — `features/dashboard/actions-list.tsx`**

- 33 · `useActionPrompt` produces six different prompt strings — none are user-tested against CPAs.
- 34 · The expanded action row's Review button only mounts when `expanded` is true.
- 35 · Inline expansion panel uses `role="button"` on a div with click handler — a button-in-button is avoided (per comment) but the SR experience announces "Review {client} in deadline drawer" twice (once on the row, once on the panel inside it).
- 36 · Empty state copy: "You're caught up. Next deadline appears here when one's within a week."
- 37 · `summaryTiles` shows zero tiles when all three counts are 0 — the strip disappears entirely.
- 38 · `ActionsSummaryTile`'s value uses `text-lg font-medium` for both neutral and critical tones — only color differs.
- 39 · `SectionHeader`'s "All deadlines" link uses `text-xs text-text-muted hover:text-text-tertiary`. The hover state moves the link UP a tier — that's the opposite direction (muted → tertiary is darker). Subtle but inverted from the rest of the app.
- 40 · `formatTodayHeader` Date construction (`new Date(asOfDate.slice(0, 10)+'T00:00:00')`) constructs local-time date — fine in the user's TZ but if the server's `asOfDate` is in a different TZ, the rendered date can drift by a day.

**### C3 — `features/dashboard/needs-attention-section.tsx`**

- 41 · "Alerts" section header doesn't disclose what time window the count represents.
- 42 · Source-health summary in the empty-state shows "Monitoring 12 sources. Receiving correctly." — but "Check sources" link is only rendered when failing/paused > 0.
- 43 · `aria-label={'monitoring sources'}` on the Binoculars icon is hardcoded English string, not `t\`monitoring sources\``.
- 44 · Loading state during source-health fetch keeps the section in the destructive-alert tone if `totalAlertCount > 0`, even though the source-health summary line says "Checking monitored sources…".

## D. Deadlines (the queue) — `routes/obligations.tsx`

- 45 · The queue route at `/deadlines` carries seven separate URL filter parsers, no client-side persistence of view preference.
- 46 · The status filter has 6 dropdown options under v2 but the column header filter button uses a separate `TableHeaderMultiFilter` that may show all 10 raw statuses depending on facet data.
- 47 · Status-change toast offers Undo via a custom per-call callback that closes over `previousStatus`.
- 48 · "Status updated" toast description is `Audit ${result.auditId.slice(0, 8)}` — exposing audit-IDs in the success path is power-user UX, not first-time-CPA UX.
- 49 · Bulk-action toast uses `t\`${result.updatedCount} rows changed\`` — "rows" is engineering-speak.
- 50 · `bulkAssigneeMutation` differentiates quick-assign vs bulk by `clientIds.length === 1`.
- 51 · No keyboard shortcut to "Mark filed" — the most common terminal action.
- 52 · `useResponsivePageSize` computes from container height — but during the initial render, container height is undefined and a default (presumably PAGE_SIZE=50) applies.
- 53 · Continuation rows (multi-line deadline rows) get `translate-x-[26px]` on the checkbox to indent.
- 54 · The detail panel widens to 600px (`DETAIL_PANEL_WIDTH`) — fixed pixel value.
- 55 · Filter chip removal on the queue's filter bar has no undo affordance.
- 56 · Export Selected mutation success toast says "Export ready" but doesn't tell the user where the file lives.
- 57 · No keyboard shortcut to focus the search input.
- 58 · Sort dropdown shows current sort as text — no visual icon for ASC/DESC direction.
- 59 · "No matches" empty state when filters are too restrictive — does it offer "Clear filters"?
- 60 · Row selection model resets to `{}` on bulk-status-update success.
- 61 · Internal-deadline column header label "Internal Due" — drops the word "Date".

## E. Clients (`/clients` + `/clients/:id`)

**### E1 — `routes/clients.tsx`**

- 62 · Count chip says `{clients.length}` — uses the unfiltered total, not the filtered length.
- 63 · `Import history` button has both `aria-label` and `title` set to "Import history".
- 64 · The error alert offers a `<button>` (not `<Button>`) with `underline` class for retry.
- 65 · `ClientsCreateSplitButton` is a split-button between "New client" + "Import clients" — the import path is hidden in the dropdown.
- 66 · `ClientFactsWorkspace` mounts on every render — no memo barrier for the props.
- 67 · Client filter changes write to URL with `replace` history mode — back-button doesn't undo a filter selection.

**### E2 — `routes/clients.$clientId.tsx`**

- 68 · The "Client not found" alert offers a "Back to clients" button but no "Try again" / refresh.
- 69 · Canonical-path redirect on `client.id === routeKey` is via `<Navigate replace />`.
- 70 · `isLoading` boolean for the route picks `routeKeyHasClientId ? clientQuery.isLoading : clientsQuery.isLoading || (resolvedClientId.length > 0 && clientQuery.isLoading)` — slug lookup path shows loading for as long as the list query is pending PLUS the individual query.
- 71 · Loading skeleton is a 3-block stack (8 + 40 + 64).

**### E3 — `features/clients/CreateClientDialog.tsx`**

- 72 · No client-name uniqueness check on submit — the user can create "Acme LLC" twice.
- 73 · Dialog title "Create client" + description "Add a manual client record to the active practice directory." — "directory" word feels formal vs the rest of the product.
- 74 · EIN field placeholder is `12-3456789` (looks like a real EIN format).
- 75 · State field uppercase via CSS `uppercase` but the form value is the raw input (`field.handleChange(event.target.value)`).
- 76 · "Late filings, 12mo" max is 99 — a client with 100+ late filings can't be recorded.
- 77 · Cancel button uses `variant="outline"` while Submit uses default — but on a Confirmation dialog elsewhere (`AlertDialog`), the pattern is `Cancel` button = `variant="secondary"`. Inconsistent cross-dialog.
- 78 · Submit button label is `t\`Creating…\``when pending and`t\`Create client\`` when idle — no spinner icon.
- 79 · `assignees.find` doesn't gracefully degrade if the assignees query errors.
- 80 · Notes textarea has no character count display.
- 81 · No autofocus on the first field (Client name).

**### E4 — `features/clients/ClientDetailDrawer.tsx`**

- 82 · "Open full page" + "View all deadlines" both close the drawer onClick — reasonable.
- 83 · NextDueLine calculation uses `Date.now()` directly — not the firm's `asOfDate`.
- 84 · Loading skeleton renders within the SheetContent but the SheetTitle is visually hidden (`sr-only`) — assistive tech announces "Loading client…" but the visual is just three gray bars with no label.
- 85 · `useOptionalSidebar` + setAutoCollapsed effect — auto-collapse only fires when the sidebar provider is in scope; mounted from `_layout.tsx`.
- 86 · Identity chips show entity, state, readiness — but the entity is already in the description line above.
- 87 · No close button explicit — Sheet relies on click-outside / Esc.

## F. Rule Library (`/rules/library`)

**### F1 — `routes/rules.library.tsx` (2,824 lines)**

- 88 · Rule library uses jurisdiction grouping with chevron expand — all groups start collapsed.
- 89 · Coverage gaps render as rows inside jurisdiction groups — but the "[+ Add rule]" CTA color/styling is consistent with rule rows, easy to miss.
- 90 · Search collapses groups into flat list — but URL state for "flat-mode" isn't a separate param; it's inferred from `q.length > 0`.
- 91 · Bulk review of pending-review rules requires individual click into each rule for accept/reject — no inline checkbox + bulk-accept like the queue has.
- 92 · "Pending review" library filter is reachable via `?library=pending_review` — but the page chrome doesn't surface a count of pending rules.

**### F2 — `routes/rules.pulse.tsx`**

- 93 · The Pulse alerts page is 125 lines — small surface — let's audit:

## G. Pulse alerts + bell

**### G1 — `features/pulse/PulseDetailDrawer.tsx`**

- 94 · "Apply to N clients" success toast offers Undo via revert mutation; Undo window is 24h surfaced via description copy.
- 95 · Snooze / Dismiss / Mark reviewed all share `setReasonAction(null) + setReasonText('')` — reasonable.
- 96 · `requestReviewMutation` success toast description: "Owner and manager notifications and emails will be sent."
- 97 · `applyReviewedMutation` and `applyMutation` BOTH onClose after success — but the toast Undo callback needs the drawer state to fire the revert mutation. If the drawer is closed, the revert still fires from the sonner toast scope.
- 98 · "Couldn't apply Pulse" error includes a Refresh action when the conflict is detected.
- 99 · `reviewPriorityMutation` success says "Manager review saved" but the toast description "The reviewed client set is ready to apply." — assumes the user knows what "client set" means.
- 100 · No way to bulk-dismiss multiple alerts from the queue page (`/rules/pulse`).

## H. Settings + practice setup

**### H1 — `routes/settings.tsx`**

- 101 · Settings home is a sectioned list of 4 categories with sub-rows. Each row has icon + label + description + chevron.
- 102 · Sections are NOT searchable — a CPA looking for "internal deadline" has to scan all 8 rows.
- 103 · "Calendar sync" row routes to `/deadlines/calendar` — but the calendar route in `routes/calendar.tsx` mounts `CalendarPage`, not a sync page.
- 104 · No way to know which settings have been customized vs defaults — every row reads the same.
- 105 · "Members" row says "Invite teammates and manage roles." — but the description doesn't tell you that on the Solo plan members are unavailable.

**### H2 — `routes/practice.tsx`**

- 106 · "Save changes" button on the General card disables when `!dirty` — so a user who edits a value and reverts it sees the button disable again. Good UX.
- 107 · "Delete practice" alert dialog has a destructive primary action but no typed confirmation requirement.
- 108 · "Practice name" error message: "Please enter at least 2 characters." — `t` macro renders OK but the message reads as form-validation boilerplate, not a CPA-tuned message.
- 109 · Smart Priority weight total error shown as `Total 105%` in destructive color — but no specific guidance on which factor to reduce.
- 110 · "Calculate preview" disabled tooltip says "No open deadlines available for preview." — but the button is also disabled when `!priorityValid` — no tooltip explains that.
- 111 · "Save Smart Priority" button position is to the right of "Calculate preview" — but if the user calculates preview, then saves, the saved-flag pattern (`priorityDirty`) resets correctly.
- 112 · `currentRole` badge in the header uses `font-mono tabular-nums` — but role names ("Owner", "Manager", "Coordinator") aren't numeric; tabular-nums has no effect.
- 113 · "Internal deadline" helper says "Changing this recalculates current deadline dates." — but it does NOT undo cleanly. The user might not realize this is a one-way operation.

**### H3 — `routes/billing.tsx`**

- 114 · Subscription overview shows Active practice + plan + seat limit, then a second flex with 4-5 Metric tiles repeating some of that info.
- 115 · "Manage billing" button disabled state surfaces a separate sentence below — but there are multiple reasons it can be disabled (no owner role, no subscription, etc.) and only the first matched reason is shown.
- 116 · Plan cards: only Solo / Pro / Team rendered — Enterprise dropped via `.filter(plan => plan.id !== 'firm')`.
- 117 · Plan card "Pro" tagged `Recommended` — static recommendation; doesn't adapt to the firm's actual usage.
- 118 · Billing currency assumption — all prices in USD with `$` prefix, no localization.

**### H4 — `routes/billing.success.tsx`**

- 119 · `useCurrentFirm({ poll: true })` polls until activation confirmed — but if the webhook never fires (Stripe outage), the page sits at "Confirming subscription" forever.
- 120 · "Confirming subscription" card title heading-level is `aria-level={2}` but the H1 above is "Payment confirmation" — `<header>` has no role. Acceptable IA.
- 121 · "Go to Today" outline button text + "Open billing" filled button — but a user just confirming a subscription probably wants to land where they were before checkout (deadlines, dashboard, etc.). The Open billing destination assumes the user wants to verify; many will just want to proceed.

**### H5 — `routes/billing.cancel.tsx`**

- 122 · "Checkout canceled" card surfaces "No subscription changes were made." — clear copy.
- 123 · "Restart checkout" button — but the checkoutHref includes `plan` and `interval` query params; if those weren't set, the link goes to `/billing/checkout` with no plan selection.

## I. Calendar + workload + opportunities + audit + reminders + notifications

**### I1 — `routes/calendar.tsx`**

- 124 · Without reading the calendar source: needs verification that drag-to-reschedule offers undo.
- 125 · Need to verify the calendar handles `prefers-reduced-motion` for drag animations.
- 126 · No keyboard navigation between calendar cells documented from the wrapper.

**### I2 — `routes/workload.tsx`**

- 127 · Workload distribution view — needs verification of empty-state for "no team members yet" (Solo plan).
- 128 · Need to verify load-balance reassignment supports drag-and-drop OR explicit "Reassign" button — the legacy expectation in workload tools is one or the other.

**### I3 — `routes/opportunities.tsx`**

- 129 · Opportunities feed: needs verification that dismissed opportunities can be restored (the "undo dismiss" path).
- 130 · Filter affordances on opportunities page — need verification of count chips and consistency with /clients filter bar.

**### I4 — `routes/audit.tsx`**

- 131 · Audit log search/filter affordances — need verification that user can filter by event type (status change, assignment, import, etc.).
- 132 · Audit log export — need verification of CSV/PDF export path for compliance evidence.

**### I5 — `routes/reminders.tsx`**

- 133 · Reminders page — verify the firm can preview the actual email/SMS content before scheduling.
- 134 · Reminders pause / resume — verify the granularity (per-client? per-reminder-type? all reminders?).

**### I6 — `routes/notifications.tsx` + `routes/notifications.preferences.tsx`**

- 135 · Notifications: verify mark-all-read affordance.
- 136 · Notification preferences: verify per-event-type granularity (status change, alert, import done, etc.).

## J. Migration wizard (`/migration/new` + import flow)

**### J1 — `routes/migration.new.tsx`**

- 137 · Permission denial card shows "Owner or manager access required" + "Return to Today" button — but no "Request access" affordance to ask the owner.
- 138 · "Skip for now" button uses ArrowRightIcon-end — but the verb is "Skip", not "Continue". Icon implies forward progression.
- 139 · Rule-review alert "queued for due-date review before they can become active and create client deadlines" — wordy.
- 140 · Wizard intro cluster shows three "Activation outcomes" chips (Client facts / Deadline list / Today risk) — these are positioning, not interactive.
- 141 · No CSV format documentation visible from this intro — user clicks into the wizard and discovers the column requirements there.

**### J2 — `features/migration/ImportHistoryDrawer.tsx`**

- 142 · Undo-single-client confirm dialog has destructive primary + cancel. Good.
- 143 · Drawer shows "Undoing this import will commit these changes" — phrasing reads as a tautology ("undoing commits changes").

## K. Account security + 2FA setup

**### K1 — `routes/account.security.tsx`**

- 144 · 2FA setup flow needs verification of: backup-codes display, QR-code download, "I lost my device" recovery path.
- 145 · Session management — verify sign-out from other devices is exposed.

**### K2 — `routes/account-security-two-factor-setup.tsx`**

- 146 · 2FA setup verify input — verify autocomplete="one-time-code" is set (like #22 on `two-factor.tsx`).

## L. Cross-surface drift patterns

- 147 · "Couldn't load X" pattern repeats 50+ times across the app with slightly varied retry-handler shapes.
- 148 · `<Skeleton>` size matching to eventual content varies — some skeletons (clients $clientId) show 3 generic blocks; others (workload, calendar) show domain-specific shapes.
- 149 · Toast description format inconsistency: status changes expose `Audit ${id.slice(0, 8)}`; pulse mutations don't; export does.
- 150 · Hotkey discoverability — only the queue's J/K/Esc are advertised in the keyboard shell help. Cross-surface hotkeys (⌘K command palette, ⌘/ to focus search) aren't surfaced consistently.
- 151 · Date format inconsistency: `formatDate` vs `formatDatePretty` vs inline `Intl.DateTimeFormat`.
- 152 · Empty-state CTAs differ in tone: some say "Import clients", some say "Get started", some say "Add your first deadline".
- 153 · `aria-label` localization gap: several icon-only buttons use raw English strings (see #43 above for one example).
- 154 · Cancel button variant inconsistency: dialogs use `variant="outline"`; alert-dialogs use `<AlertDialogCancel>` (rendered as secondary?). Mixed.
- 155 · No visible page-load progress bar — pendingBar from app-shell is the only signal during route transitions.
- 156 · Status-change toasts ALL share the format `t\`Status updated\`` regardless of which status was selected. The detail (which deadline, which status) is in the description but a CPA changing 10 deadlines in a row sees 10 identical-looking toasts.
- 157 · No "Don't show this again" / dismissable hints surfaced anywhere — onboarding tooltips and feature-intro hints aren't part of the design system.
- 158 · Mobile breakpoint behavior: many pages declare `lg:` or `xl:` breakpoints but the actual sub-`lg` layouts haven't been audited.
- 159 · `data-icon="inline-start"` and `data-icon="inline-end"` is the canonical spacing primitive (45+ usages in routes/) — good consistency.
- 160 · `formatTaxCode` used in some places, raw `taxType` string in others — TaxCodeLabel component is the right canonical render but isn't used everywhere.

## M. Error / 404 / fallback

**### M1 — `routes/error.tsx`**

- 161 · 404 error shows "Page not found" with one "Return home" button — no contact-support link.
- 162 · 500-class error shows "Route failed" + raw `error.statusText` — exposes server-error vocabulary to end users.

**### M2 — `routes/not-found.tsx`**

- 163 · In-shell 404 — better than the bare RouteErrorBoundary 404. ❌ not drift.
- 164 · "404" eyebrow is uppercase text — but a CPA seeing this for the first time may not know that "404" is the conventional code for "not found". Acceptable.

**### M3 — `routes/fallback.tsx`**

- 165 · `EntryRouteHydrateFallback` renders a 240×400 invisible div.
- 166 · `RouteHydrateFallback` renders `<div className="flex flex-col gap-6 p-4 md:p-6" data-route-fallback />` — empty.

## N. Public/external surface

**### N1 — `routes/readiness.tsx`**

- 167 · Loading state is a Card with "Loading readiness check…" centered text — no spinner, no skeleton.
- 168 · "Link unavailable" error doesn't tell the client what to do next.
- 169 · Submit button is the only action — no save-draft path.
- 170 · Submitted state — what does the client see AFTER submit? `portalQuery.refetch()` re-renders the form with the saved values.
- 171 · Status pill at the top uses `<Badge variant="outline">{portal.status}</Badge>` — raw API enum string surfaced to the client.
- 172 · "Note" textarea has no character count, no placeholder beyond "Optional note".
- 173 · Submit button has spinner-less disabled-pending state.
- 174 · The "Need help" status doesn't open a contact dialog — the client picks it but there's no follow-up flow.
- 175 · `formatTaxCode` is used to render `portal.taxType` — good.
- 176 · Date format: `formatDate(portal.currentDueDate)` — good.
- 177 · No "powered by DueDateHQ" or branding — the client portal looks generic.

## O. Sidebar + global chrome

**### O1 — `components/patterns/app-shell.tsx` / nav / user-menu**

- 178 · Sidebar Alerts badge shares the `usePulseListAlertsQueryOptions(50)` cache key with the dashboard NeedsAttentionSection.
- 179 · Sidebar collapsed overflow & badge-dot — already audited per dev-log entry on 2026-05-26.

## P. Hotkeys + keyboard

- 180 · Keyboard shortcut help dialog: needs verification it's reachable from `⌘/` or `?`.
- 181 · Esc behavior on the obligation drawer panel — must close panel without affecting page state. Need verification.
- 182 · J/K row-navigation in the queue — needs verification it skips continuation rows or treats them as logical rows.

## Q. Final notes — non-functional

- 183 · Several routes are thin wrappers (`calendar.tsx`, `audit.tsx`, `workload.tsx`, etc.) — the actual UX lives in `features/*/feature-page.tsx`. Auditing those at line-level was out of scope for this pass; flagged comprehensively for follow-up.
- 184 · Test files exist for several routes (`accept-invite.test.tsx`, `login.test.tsx`, etc.) but the test surface is uneven — newer routes have richer tests than older ones.
- 185 · The dev-log has 80+ entries from 2026-05-25 alone — this is a heavily-iterated product. Many of the findings above are evidence of recent design churn, not bugs. The audit doc captures the current state regardless.

---

## Step 6 continuation — UX flows pass 2 (130 findings) — `2026-05-26-step-6-ux-flows-audit-cont.md`

## Q. The Queue — `routes/obligations.tsx` (11.5K lines, deep walk)

### Q1 — list/error/loading states

Q1.1 — `routes/obligations.tsx:3287-3290` Loading state is a dashed-border text block, not a skeleton.
Q1.2 — `routes/obligations.tsx:3291-3297` Error block uses raw `<div>` + `<button class="underline">` instead of canonical `<Alert>` + `<Button variant="link">`.
Q1.3 — `routes/obligations.tsx:3287-3290` Loading state has no `role="status"` or `aria-live="polite"`.

### Q2 — hotkey gaps under lifecycle v2

Q2.1 — `routes/obligations.tsx:2487-2587` Status hotkeys cover F/P/I/W only — no `B` for blocked, no `R` for in_review, no `N` for not_started.
Q2.2 — `routes/obligations.tsx:2398-2418` Forward-slash hotkey expands the collapsed search but doesn't open the on-screen keyboard hint.
Q2.3 — `routes/obligations.tsx:2444-2462` Enter-to-open-detail handler swallows the event but doesn't announce the drawer-open transition via a live region.
Q2.4 — Hotkey kbd hints at the table footer (`routes/obligations.tsx:3727-3749`) only show J / K / Enter / ?.

### Q3 — export dialog (`routes/obligations.tsx:3906-4096`)

Q3.1 — `routes/obligations.tsx:3914` "Export writes an audit event" — bureaucratic copy.
Q3.2 — `routes/obligations.tsx:4064-4081` "Email to self" and "Email to teammate" are disabled with "Email delivery is not connected for deadline exports yet." copy.
Q3.3 — `routes/obligations.tsx:4087` Cancel button is `variant="outline"`, Export is default solid — but the canonical Dialog pattern across the app uses `variant="ghost"` for Cancel.
Q3.4 — Export client picker (`routes/obligations.tsx:3992-4027`) has no search.
Q3.5 — `routes/obligations.tsx:3947-3975` Date range start/end pickers have no validation message when end < start.
Q3.6 — Export button at `4088-4093` shows "Exporting…" but the dialog stays open with no progress indicator.

### Q4 — bulk action toolbar (`routes/obligations.tsx:3161-3285`)

Q4.1 — `routes/obligations.tsx:3178-3180` "# rows selected" still says "rows" — prev agent shipped a fix for the bulk-status toast but NOT for the counter on the floating bar.
Q4.2 — `routes/obligations.tsx:3257-3266` Disabled Snooze button has `title={t\`Snooze (coming soon)\`}`— but no visible "coming soon" tag on the button itself.
Q4.3 —`routes/obligations.tsx:3192-3209`Assign-owner dropdown lists "Unassigned" then a separator then members, but no search.
Q4.4 —`routes/obligations.tsx:3221-3247`Set-status dropdown has no`aria-busy`while`bulkStatusMutation.isPending`.
Q4.5 — Bulk-extended Memo dialog (`routes/obligations.tsx:4097-4131`) has the Textarea with `placeholder`instead of a real`<label>`.
Q4.6 — Bulk-extended dialog "Mark extended" button stays enabled when memo is empty.

### Q5 — penalty input dialog (`routes/obligations.tsx:11104-11188`)

Q5.1 — Inputs use `placeholder` instead of `<label>`.
Q5.2 — No input formatting hints.
Q5.3 — Save button stays enabled when both inputs are blank.
Q5.4 — Title "Penalty inputs" gives no context for what the user is editing.

### Q6 — request-input dialog (`routes/obligations.tsx:7198-7321`)

Q6.1 — `routes/obligations.tsx:7249-7251` Recipient label is a `<span>`, not a `<label htmlFor>`.
Q6.2 — Submit "Send request" button has no `aria-busy` while submitting.
Q6.3 — Recipient role labels (`routes/obligations.tsx:7224-7230`) map manager/preparer/coordinator → "Team member."

### Q7 — drawer-header status pill (removed but residual)

Q7.1 — `routes/obligations.tsx:4603-4608` Comment block notes the drawer-header status pill was removed but the computation is kept as `_statusDropdownOptions`.

### Q8 — calendar-sync popover (`routes/obligations.tsx:11549-11687`)

Q8.1 — Hand-rolled `<div className="fixed inset-0 z-40 bg-black/30">` scrim above the Popover.
Q8.2 — `routes/obligations.tsx:11655` "Regenerate" mutation fires immediately on click — no confirmation.
Q8.3 — `routes/obligations.tsx:11641-11646` Read-only Input has the calendar URL but no Copy-button-adjacent affordance to TEST it works.
Q8.4 — `routes/obligations.tsx:11679` "Enable subscription" button has no `aria-busy`.
Q8.5 — `routes/obligations.tsx:11622` Popover content is anchored align="end" but width is hardcoded `w-80` (320px).

### Q9 — filter chips + group-by toolbar

Q9.1 — `routes/obligations.tsx:11472-11486` Active filter chip shows an inline `<XIcon>` to signal "click to remove" — but a hovered chip with no X looks identical to an inactive chip with no X.
Q9.2 — Group-by dropdown (need to verify) only regroups via multi-column sort.

### Q10 — drawer status transitions (in_review / blocked / waiting_on_client)

Q10.1 — Drawer body status-change UI is buried in `ObligationQueueStatusControl` (extracted, ~5000-line drawer body).
Q10.2 — Blocked-by selection in the drawer — search for the component.

## R. Rule library — `routes/rules.library.tsx` (2.8K lines) + `features/rules/coverage-tab.tsx` (2.5K lines)

### R1 — entity chip filter

R1.1 — `routes/rules.library.tsx:1287-1295` "Clear filter" link appears ONLY when an entity is active — but the active chip itself can also clear by clicking.
R1.2 — `routes/rules.library.tsx:1310-1314` `title` attribute is the only place where the gap-count detail lives ("9 jurisdictions missing a rule").
R1.3 — `routes/rules.library.tsx:1304-1374` Chips have no fixed width — chip widths vary based on label + count + gap.

### R2 — pending/active queue mode toggle (`features/rules/coverage-tab.tsx:1936-1988`)

R2.1 — `features/rules/coverage-tab.tsx:1958, 1974` Tab disabled when count=0 — but the user may BE on that tab.
R2.2 — `features/rules/coverage-tab.tsx:1949-1953` Wrapping div is `role="tablist"` but there's no `role="tabpanel"` linking the buttons to the queue table below.

### R3 — bulk review bar + modal

R3.1 — `routes/rules.library.tsx:2351-2357` "Clear" affordance is a `<button class="text-xs underline">` — not a Button primitive.
R3.2 — `routes/rules.library.tsx:2418-2419` Accept hotkey uses `querySelector('[data-rule-action="accept"]').click()`.
R3.3 — `routes/rules.library.tsx:2569-2580` KeyboardHints hidden below `sm` breakpoint (`hidden ... sm:flex`).
R3.4 — `routes/rules.library.tsx:2554-2557` "Skip" / "Finish" outline button — but Skip moves forward without acting (passive), and "Finish" closes the modal (terminal). Semantically distinct, visually same.
R3.5 — `routes/rules.library.tsx:2559` `<span class="sr-only">{t\`Press Escape to close the review queue.\`}</span>` sits at the BOTTOM of the dialog.

### R4 — rule table rows

R4.1 — `routes/rules.library.tsx:1832-1833` `<TableRow class="group cursor-pointer">` opens detail on click, but there's no visible affordance until hover.
R4.2 — `routes/rules.library.tsx:1863` Title underline is `group-hover:underline` — but on focus (keyboard navigation), the title doesn't underline.
R4.3 — `routes/rules.library.tsx:1851-1854` Checkbox's `<span onClick stopPropagation>` wrapper uses `onPointerDown` + `onClick` to stop row-open.

### R5 — new rule modal (`routes/rules.library.tsx:2607-2823`)

R5.1 — `routes/rules.library.tsx:2816-2818` Submit button shows "Creating…" but no spinner.
R5.2 — `routes/rules.library.tsx:2733-2738` Empty-pickers branch ("Custom rules currently need to be created from a missing-rule row…").
R5.3 — `routes/rules.library.tsx:2785-2787` "Tax type" input is a free-form text with placeholder "e.g. income, sales, payroll".
R5.4 — `routes/rules.library.tsx:2790-2807` "When is it due?" Textarea is plain English description with no calendar-logic preview.

### R6 — coverage tab additional (`features/rules/coverage-tab.tsx`)

R6.1 — `features/rules/coverage-tab.tsx:1011-1014` `ActiveFilterChip` labels are HARDCODED strings, not wrapped in `<Trans>`.
R6.2 — `features/rules/coverage-tab.tsx:1021, 1024` Clear button has `aria-label="Clear filter"` AND a visible "Clear" text — both hardcoded.
R6.3 — `features/rules/coverage-tab.tsx:1036-1079` EntityCoverageLegend uses `uppercase tracking-[0.08em]` on "Legend" eyebrow.

## F. Seven thin-wrapper feature pages

### F1 — `features/notifications/notifications-page.tsx` (168 lines)

F1.1 — No filter tabs (unread / all / by-type).
F1.2 — Read vs unread visual differentiation is nonexistent.
F1.3 — Loading state shows NOTHING.
F1.4 — `notifications-page.tsx:73` `markAllRead` disabled when "every item is read" — but ALSO disabled when the list is empty (every of [] returns true).
F1.5 — List has no pagination — hardcoded limit 50.
F1.6 — `notifications-page.tsx:104-105` `<article>` has no `aria-label` and the unread/read state isn't surfaced to assistive tech.

### F2 — `features/workload/workload-page.tsx` (407 lines)

F2.1 — `workload-page.tsx:155-158` Loading state uses bordered text block, not Skeleton.
F2.2 — `workload-page.tsx:106-118` Error state uses Card + CardTitle + CardDescription instead of canonical `<Alert variant="destructive">`.
F2.3 — `workload-page.tsx:51-66` Firms loading state ALSO renders a Card with text — not skeletons.
F2.4 — `workload-page.tsx:94-102` Refresh button has no `aria-busy`.
F2.5 — `workload-page.tsx:262-287` MetricCard shows "—" when value is undefined (loading).
F2.6 — `workload-page.tsx:256` `<p className="text-xs font-medium uppercase text-text-tertiary">` on manager-insight metric label.

### F3 — `features/opportunities/opportunities-page.tsx` (458 lines)

F3.1 — Dismiss action has no undo affordance in the toast.
F3.2 — Snooze defaults to 14 days with no per-action duration picker.
F3.3 — Action column always shows 3 buttons vertically.

### F4 — `features/audit/audit-log-page.tsx` (793 lines)

F4.1 — `audit-log-page.tsx:412` Export-dialog Cancel button uses `variant="outline"` instead of canonical ghost.
F4.2 — `audit-log-page.tsx:416-422` "Download latest" button has no `aria-busy` while `createDownloadUrl.isPending`.
F4.3 — `audit-log-page.tsx:424-429` "Request export" button has no `aria-busy` while `requestPackage.isPending`.

### F5 — `features/reminders/reminders-page.tsx` (666 lines)

F5.1 — `reminders-page.tsx:655` Template-dialog Cancel uses `variant="outline"` — drift from canonical ghost.
F5.2 — `reminders-page.tsx:638` Template-body Textarea has `font-mono`.
F5.3 — `reminders-page.tsx:658-660` "Save template" button shows no spinner, no "Saving…" label.
F5.4 — `reminders-page.tsx:544-551` "Loading suppressions…" + empty-state are plain `<p>` text in bordered boxes.
F5.5 — `reminders-page.tsx:625-630, 631-640` Subject / Body inputs use `<label>` wrapping `<Input>` without `htmlFor`.

### F6 — `features/members/members-page.tsx` (1198 lines)

F6.1 — `members-page.tsx:1085-1093` Invite mutation onSuccess does NOT toast.
F6.2 — `members-page.tsx:1169` Cancel button uses `variant="outline"` — drift.
F6.3 — `members-page.tsx:1172-1174` "Send invite" button label changes to "Sending…" but no spinner.
F6.4 — `members-page.tsx:1158-1162` Error display is a raw `<p role="alert" class="text-sm text-text-destructive">` with `inviteMutation.error.message`.
F6.5 — `members-page.tsx:1131-1150` Role Select shows MANAGED_ROLES inline list — but no description per role.

### F7 — `features/calendar/calendar-page.tsx` (616 lines)

F7.1 — Calendar page is subscription-management, not the "calendar grid" the audit prompt implied.
F7.2 — `calendar-page.tsx:357-359` IntegrationNote body uses string-literal copy that's English-only ("Other calendars -> From URL").
F7.3 — `calendar-page.tsx:272-274` Regenerate button shows "Regenerating…" label but no Loader2 spinner.
F7.4 — `calendar-page.tsx:338` "Disable feed" disabled-button shows "Disabling…" label but no Loader2 spinner.

## H. Hotkey discoverability

### H1 — Global hotkey help dialog (`components/patterns/keyboard-shell/ShortcutHelpDialog.tsx`)

H1.1 — `?` opens the help dialog.
H1.2 — `components/patterns/keyboard-shell/ShortcutHelpDialog.tsx:143-148` Available / Reserved counts use `font-mono`.
H1.3 — `ShortcutHelpDialog.tsx:177-184` Category headers in the dialog body use `text-xs font-semibold uppercase`.
H1.4 — No discoverability for hotkeys on a fresh load.

### H2 — Per-surface hotkeys

H2.1 — Queue hotkeys F/P/I/W cover only 4 of 6 lifecycle v2 states.
H2.2 — `routes/obligations.tsx:3727` Bottom-of-queue kbd hints advertise J/K/Enter/? but NOT F/P/I/W/X/E.
H2.3 — `components/patterns/keyboard-shell/display.ts:3` `COMMAND_PALETTE_HOTKEY = 'Mod+K'`.
H2.4 — `components/patterns/keyboard-shell/display.ts:5` `SIDEBAR_TOGGLE_HOTKEY = 'Mod+B'`.
H2.5 — `KeyboardProvider.tsx:155-170` `Mod+Shift+D` toggles dark mode.
H2.6 — Dashboard does NOT advertise the `?` hotkey anywhere.
H2.7 — No hotkey hint chips visible in the dashboard, /clients, /rules/library, or /alerts toolbars.

### H3 — Reserved-but-not-bound hotkeys

H3.1 — `RESERVED_SHORTCUTS` in `keyboard-shell/types.ts` documents intentionally-reserved keys.
H3.2 — Per-modal Escape handlers.

### H4 — Keyboard-only path through the queue

H4.1 — Tab order through the queue rows: is there a roving tabindex?
H4.2 — Focus management after drawer close.

---

## Step 7 onboarding (101 findings) — `2026-05-26-step-7-onboarding-audit.md`

## Flow 1 — `/login` (Email OTP + SSO)

### F1-01 · P1 · "Welcome to the workbench" doesn't say what the workbench is

### F1-02 · P2 · `data-t` attributes for analytics leak into A11y tree

### F1-03 · P1 · "Encrypted · 7-day session · SSO-ready" pill belongs above the CTA, not below

### F1-04 · P1 · `Trans>or</Trans>` divider is `font-mono` uppercase caption — too loud for a separator

### F1-05 · P2 · Email OTP placeholder is `you@firm.com`; should be `you@yourpractice.com`

### F1-06 · P2 · OTP form: code field is rendered as 1 input — no segmented OTP UI

### F1-07 · P1 · Verify code button enables before user types 6 digits (false-affordance)

### F1-08 · P2 · Code expiry copy says "5 minutes" but no countdown shown

### F1-09 · P3 · `displayNameFromEmail` is used to derive the user's name silently

### F1-10 · P2 · "Trouble signing in? Email support@..." has no severity differentiation from Terms

### F1-11 · P2 · `<h1>` font-size is `text-[26px]` — off-scale arbitrary value

### F1-12 · P2 · Brand mark in entry header has no semantic relation to the headline

## Flow 2 — `/accept-invite`

### F2-01 · P0 · "Invite link is missing" error message is dead-end

### F2-02 · P1 · Invite preview doesn't appear until after sign-in

### F2-03 · P2 · "or continue with SSO" separator is in `<FieldSeparator>`, which is otherwise unused in onboarding

### F2-04 · P3 · `acceptInvitation` swallows the `Error.cause`

### F2-05 · P1 · Loading state for the invite is a `Skeleton` inside `CardDescription` — no label

## Flow 3 — `/two-factor` (post-login challenge)

### F3-01 · P1 · 2FA challenge accepts trimmed code length 6+; recovery code is typically 8 chars

### F3-02 · P1 · No "I lost my authenticator" recovery path

### F3-03 · P2 · No `autoFocus` on code input

### F3-04 · P2 · No autosubmit on 6-digit completion

### F3-05 · P1 · "Verification code" label has no helper text

### F3-06 · P2 · CardDescription `"Enter the code from your authenticator app."` is the entire body

## Flow 4 — `/account/security/two-factor-setup` (TOTP enrollment)

### F4-01 · P0 · Recovery codes shown ONCE — no "I've stored these" checkbox

### F4-02 · P2 · QR code panel has a hard `bg-white` that breaks dark mode

### F4-03 · P2 · "Recovery codes" copy heading is `Label` (form-control element) but block has no input

### F4-04 · P1 · Copy URI / Copy recovery codes — no success feedback in the panel

## Flow 5 — `/onboarding` (first-run practice creation)

### F5-01 · P0 · `DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS` is set but no copy says what value the user is starting from

### F5-02 · P1 · "We pre-filled a name from your Google profile" — hardcoded "Google"

### F5-03 · P1 · Three fields, three different label patterns

### F5-04 · P1 · Internal deadline input has no unit ("days") suffix

### F5-05 · P1 · "Internal deadline" label is too abstract for a first-run user

### F5-06 · P2 · `Practice name` placeholder "e.g. Bright CPA Practice" — okay but no escape-from-default messaging

### F5-07 · P1 · State rule activation — no "skip for now" affordance

### F5-08 · P1 · Source-defined-calendar warning is technical jargon

### F5-09 · P2 · State grid: click target is `size-7` (28px) — below 44px touch target

### F5-10 · P2 · `Select all` button copy reads as "select all 50 states" but list has 51 (includes DC)

### F5-11 · P1 · "Continue" CTA disabled state has no explanation

### F5-12 · P2 · "Setting up your practice…" CTA copy could be more specific

### F5-13 · P1 · "Encrypted · Auto-saves · Renamable later" pill is below the CTA

## Flow 6 — `/migration/new` & the Migration Copilot Wizard

### F6-01 · P1 · Wizard intro: "Generate your first deadline list" — but "deadline list" is product-internal noun

### F6-02 · P2 · Three `ActivationOutcome` chips at top — order unclear

### F6-03 · P1 · "Skip for now" button — no explanation of what happens if skipped

### F6-04 · P2 · "Owner or manager access required" alert appears for unauthorized users

### F6-05 · P1 · Step 1 — "Paste rows" / "Upload file" — labels use `font-mono` uppercase caption again

### F6-06 · P1 · Step 1 — paste textarea has no row count indicator until parse succeeds

### F6-07 · P2 · Step 1 — `<Trans>I'm coming from… (optional)</Trans>` — the apostrophe (`'`) breaks Lingui extraction

### F6-08 · P1 · Step 1 — SSN-blocking alert headline reads "SSN-like columns blocked"

### F6-09 · P1 · Step 1 — Lock icon hint "We block SSN-like patterns before sending anything to the AI" is positioned BEFORE upload but AFTER paste

### F6-10 · P1 · Step 2 — Confidence labels `H / M / L` are jargon

### F6-11 · P1 · Step 2 — AI / Manual / Template badge uses `variant="destructive"` for ALL three states

### F6-12 · P2 · Step 2 — Help-icon tooltip uses `text-text-destructive` everywhere

### F6-13 · P1 · Step 2 — "AI prepared your columns" copy + summary metric "EIN: Found/Not found" — last metric is vague

### F6-14 · P1 · Step 2 — "Re-run AI with my overrides" button — copy is confusing when overrides exist but disabled

### F6-15 · P2 · Step 2 — Column details table — `→` arrow column has `aria-hidden` but no `<TableHead aria-hidden>` width column accessibility hint

### F6-16 · P1 · Step 3 — "AI cleaned your values" — describing AI as a verb

### F6-17 · P1 · Step 3 — Tax type defaults "needs review" badge has the same chrome as "Verified"

### F6-18 · P2 · Step 3 — "Use suggested filings" checkbox — copy doesn't tell user what happens if unchecked

### F6-19 · P1 · Step 4 — "You're about to create:" list is in `font-mono` — reads as a build log

### F6-20 · P1 · Step 4 — Safety section title "Safety" is too generic

### F6-21 · P1 · Step 4 — "This import can be undone for 24 hours" — but no timer / countdown shown

### F6-22 · P1 · Wizard footer — "Back" button stays present on Step 1 (disabled)

### F6-23 · P1 · Wizard route → "Skip for now" uses `confirmOnClose` to ask "Discard import?" — but the wizard hasn't started

### F6-24 · P1 · `LiveGenesisOverlay` shows obligation count + "deadlines created" but no client count animation

### F6-25 · P2 · Wizard sr-only Trans block is duplicated (sr-only inside frame + DialogTitle.sr-only at parent)

### F6-26 · P2 · Migration intro `Skip for now` is a `Button variant="outline" size="sm"` with `ArrowRightIcon` — but the icon implies "next step", not "exit"

### F6-27 · P1 · "Continue to secure checkout" appears in wizard footer Continue button at step 4 → no — actually that's only on `Step 4` it switches to "Import & Generate"

## Flow 7 — `/practice` (post-onboarding settings, but also reachable as first-time edit)

### F7-01 · P2 · Practice profile page uses sentence-case `<Label>` for the same fields the onboarding form uses uppercase-caption

### F7-02 · P2 · "Internal deadline" field — helper text repeats `Changing this recalculates current deadline dates.`

### F7-03 · P3 · Delete practice — "Audit history stays retained for compliance"

### F7-04 · P2 · "Smart Priority preview" — empty state "No open deadlines available for preview." renders in two places

## Flow 8 — `/billing/checkout` (first paid step)

### F8-01 · P0 · "Confirm checkout" headline doesn't say what plan they're about to confirm

### F8-02 · P1 · "Secure checkout" badge in top-right is `variant="info"` — color same as informational alerts elsewhere

### F8-03 · P2 · "Practice context" card title is vague

### F8-04 · P1 · No "What changes after upgrade" delta summary

### F8-05 · P2 · `<Link to="/billing">` "Back to billing" appears twice — header AND inside Practice context card footer

### F8-06 · P1 · "Continue to secure checkout" button — no clarification that this opens Stripe

## Flow 9 — Empty states across the app

### F9-01 · P0 · Calendar route has no empty state at all

### F9-02 · P1 · Audit log empty state has no CTA

### F9-03 · P1 · Workload empty state is a plain text line, not a styled empty state

### F9-04 · P1 · Opportunities empty state — verified consistent with shared pattern, no CTA fix needed

### F9-05 · P1 · Notifications empty state has no description

### F9-06 · P2 · Rules library empty state — "No rules and no coverage data yet." is technical

### F9-07 · P2 · Dashboard "No deadlines yet. Import clients to get started." copy — fine, but the CTA is the only path

### F9-08 · P1 · Dashboard caught-up state — "You're caught up. Next deadline appears here when one's within a week."

## Flow 10 — Cross-flow consistency

### F10-01 · P1 · Submit-button labels vary across surfaces

### F10-02 · P1 · "Encrypted · ..." trust pill present on `/login` and `/onboarding`, absent on `/accept-invite`, `/two-factor`, `/billing/checkout`

### F10-03 · P1 · Entry shell footer "All systems operational" — but no link to status page

### F10-04 · P1 · Onboarding form `PRACTICE PROFILE` eyebrow is uppercase tracked-caption; migration intro `PRACTICE ACTIVATION` is the same pattern. Login has no eyebrow.

### F10-05 · P2 · `<Trans>For US CPA practices</Trans>` in entry header — but `<Trans>For US CPA practices.</Trans>` is the marketing tagline. Period inconsistency.

### F10-06 · P1 · Practice / Firm / Organization vocab drift

### F10-07 · P1 · Deadline / Obligation / Filing vocab — `obligation` leaks into a few user-visible spots

### F10-08 · P2 · Toast error fallback "Check your network and try again. If this keeps happening, contact support." is identical across surfaces — good!

### F10-09 · P1 · No "Skip to content" link in entry layout

### F10-10 · P2 · `LocaleSwitcher` shown in entry header even when only one locale is configured

## Flow 11 — Error-recovery flows

### F11-01 · P1 · Login Google sign-in `USER_CANCELED` regex is `/cancel|popup|closed/i` — fragile

### F11-02 · P1 · Migration `Step1Intake` parse error "We couldn't read that file. Try exporting as CSV." — but the user uploaded a CSV

### F11-03 · P1 · Billing checkout — checkout failure shows error message but no "try again" button

### F11-04 · P1 · 2FA verify error in `verifyMutation` shows toast but stays on `/two-factor` — no path forward

### F11-05 · P1 · Migration wizard — Step 1 error states clear when user types new content, but state is reset silently

### F12-01 · P2 · `ConceptLabel` / `ConceptHelp` usage across onboarding inconsistent

---

## Step 8 data finding (31 findings) — `2026-05-26-step-8-data-finding-audit.md`

F-D01** — Sort-default-deletion convention is fragile
F-D02** — `assignee` (string) + `assignees` (array) are two URL params for one concept
F-D03** — `?lifecycle=v2` toggles sort default but not via the URL
F-C01** — Search has no debounce; every keystroke writes URL
F-C02** — `CLIENT_LIST_LIMIT = 500` is a silent ceiling
F-C03** — Search input height drift (`h-8` vs canonical `h-9`)
F-R01** — `entity` URL param is single, not multi
F-R02** — Legacy URL redirect path uses N>>1 params silently
F-CP01** — Placeholder "Navigate…" understates current scope (commands work too)
F-HF01** — `DEFAULT_MAX_SELECTIONS = 16` silently caps
F-HF02** — Popover search input has no clear-X
F-CB01** — `ClientCombobox` has its own search-popover (no shared primitive)
F-CB02** — `timezone-select` (firm) has no search affordance
F-DP01** — `iso-date-picker` uses native `<input type="date">`

### Cross-surface F-X findings (17, in addition to the 14 surface-specific above)

F-X01 — "Reset" vs "Clear filters" label split
F-X02 — `/clients` and `/clients/$id` filing plan hand-roll search input
F-X03 — `/clients` uses raw `addEventListener` for `/` hotkey
F-X04 — `/deadlines` `/` hotkey works but no kbd hint chip
F-X05 — `/deadlines` collapsed search button has mismatched aria-label / placeholder
F-X06 — `/audit` declares `q` URL param but never renders a search input
F-X07 — `/alerts` filters not URL-synced (cannot share filtered view)
F-X08 — Multi-filter popover search is raw `<Input>` (not canonical primitive)
F-X09 — `/clients/$id` filing-plan sort is local useState, not URL-synced
F-X10 — `/rules/library` expand/collapse state not URL-synced
F-X11 — `coverage-tab` ActiveFilterChip uses non-localized strings + "Clear"
F-X12 — `/clients/$id` panel filter-toolbar Reset clears too much
F-X13 — `/alerts` has no top-level search input
F-X14 — `/notifications` has zero find affordance
F-X15 — `/calendar`, `/workload`, `/members`, `/opportunities` have no find affordance
F-X16 — `keyboard-shell` `/` hotkey help label says "Focus search" — inconsistent verb
F-X17 — Pagination styles diverge across surfaces

---

## Step 9 AI visibility (58 findings) — `2026-05-26-step-9-ai-visibility-audit.md`

F-001 — Three AI icons in the product. P1.
F-002 — Five confidence threshold systems. P1.
F-003 — Six different words for "AI". P1.
F-004 — Smart Priority concept description is honest, but the surface naming is misleading. P2.
F-005 — Confidence label inconsistency. P2.
F-006 — Sparkles overload (false-positive AI signal). P1.
F-007 — Astroid icon's intended meaning ("AI / cosmic uncertainty") is documented but contradicts its use as a HIGH-confidence indicator. P2.
F-008 — AI-generated readiness checklist items have no provenance marker once stored. P0.
F-009 — Pulse structured fields render AI-extracted values with no "this was extracted" caveat. P0.
F-010 — Pulse alert summary on the card is AI-generated, but the card doesn't mark it. P1.
F-011 — Evidence drawer hides "AI" in source-type labels. P0.
F-012 — Migration Step 2 row-level override tracking exists in data but isn't surfaced in UI. P1.
F-013 — Rules AI draft confidence label uses raw percentage with no qualitative tier. P2.
F-014 — Rules AI draft uses SparklesIcon, not Astroid. P2.
F-015 — `_DeadlineTipPanel` is orphaned but its data pipeline runs. P1.
F-016 — `aiWeeklyBrief` concept defined, no consumer. P2.
F-017 — Migration `defaultMatrix` (Tax type suggestions) is DETERMINISTIC but rendered with AI-flavored copy. P2.
F-018 — `PulseConfidenceBadge` renders only at one consumer call site after dashboard alert card unified on qualitative. P2.
F-019 — "Low confidence" threshold inconsistency between LowConfidenceBadge consumers. P2.
F-020 — No "I'm not sure" state on the AI checklist generation. P1.
F-021 — InsightStatusBadge has a "Stale" tier but no UX-level definition of staleness. P3.
F-022 — No "AI marker drops when user edits" pattern anywhere. P1.
F-023 — No audit-log entry on AI override (per current UI). P1.
F-024 — Rules concrete-draft Accept doesn't preserve a "this was an AI draft" trace. P1.
F-025 — Pulse "AI confidence X% — review source" alert is the only explainability surface; no "why" trail. P1.
F-026 — Concept-help popover uses `CircleHelpIcon` for both AI and non-AI concepts. P3.
F-027 — Pulse source excerpt has no per-field highlight. P2.
F-028 — Readiness checklist Generate button doesn't show "Last refreshed". P2.
F-029 — Rules AI draft has no "Regenerate" button once a draft exists. P2.
F-030 — Deadline tip refresh button label is "Refresh" — good — but no relative time. P2.
F-031 — Pulse "Couldn't load this alert" doesn't distinguish AI-extraction failure from network failure. P3.
F-032 — Generate checklist error is a toast — disappears in 4s, no path to retry from the empty panel. P2.
F-033 — Migration Step 2 fallback to "preset" / "manual" mappings shows the fallback was AI-unavailable, but the row-level confidence still shows green if the preset matched. P2.
F-034 — Partial AI output not surfaced as "AI got first N of M" in any consumer. P2.
F-035 — Audit log has no AI actor type. P0.
F-036 — Audit log "System" fallback label loses AI specificity. P1.
F-037 — Audit drawer doesn't surface model / prompt / token-count for AI events. P1.
F-038 — Hover on a Pulse confidence pill shows only the tier word, not the underlying %. P3.
F-039 — Hover on AI checklist items: no provenance disclosure. P1.
F-040 — Hover on structured-fields values: no source-excerpt jump. P2.
F-041 — Pulse "Deadline shift: old → new" is the most consequential AI output and has no "verify against source" confirmation step. P0.
F-042 — `ApplySafetyChecklist` exists in the drawer (L869) — does it actually require verification? Audit. P1.
F-043 — AI-detected source change: "is the AI right that this changed?" requires opening the source URL in a new tab and manually diffing. P1.
F-044 — AI-suggested filing deadline → no "verify against state revenue department" prompt at the obligation level. P1.
F-045 — AI voice inconsistency in error messaging. P3.
F-046 — AI over-disclaim phrase "AI couldn't reach the model — manual fallback" doesn't appear in current generation paths. P3.
F-047 — "Smart" used in some places suggests AI (camera, autocomplete) but the only "Smart" surface (Smart Priority) is deterministic. P2.
F-048 — Confidence pill copy uses uppercase tracking for Low / Medium / High — distinct from numeric "AI XX%" lowercase pattern. P3.
F-049 — No client-visible "All AI activity for this firm" page. P2.
F-050 — Concept-help "AI weekly brief" exists in code but no surface to back it (F-016). Concept "deadlineTip" exists and orphaned (F-015). P2.
F-051 — `ai_output` / `llm_log` server tables exist but no admin-UI page surfaces them. P2.
F-052 — Migration intake confidence values are hard-coded in fixtures (0.98, 0.96, 0.92, ...). P3.
F-053 — Rules "Generate draft" button label drops to "Generating…" but the AI draft panel itself shows only a skeleton, no "AI is thinking" microcopy. P3.
F-054 — Insight citations chip cluster (`InsightCitationChips`) — links exist but doesn't open in a verifiable side-panel. P2.
F-055 — `concept-help.tsx` Evidence concept description includes "AI explanation" phrasing — good — but Evidence Gap description doesn't. P3.
F-056 — "Active practice rule" concept description doesn't mark whether the source is AI-derived. P3.
F-057 — `requiresReview` concept description doesn't say "the system found a possible deadline" comes from AI. P3.
F-058 — Pulse alert "AI confidence" Alert text says "The model extracted these fields with low confidence." — first place "the model" is named in the user's voice. P3.

---

## Total: 601 findings

Severity glossary (per Step 9 + Step 7 convention):

- **P0** — high-liability / blocking gap (security, data loss, account lockout, AI hallucination)
- **P1** — major UX / consistency / a11y issue worth scheduling
- **P2** — quality / polish; ship when nearby
- **P3** — backlog / nice-to-have
