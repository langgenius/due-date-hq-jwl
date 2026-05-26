# Step 6 — UX Flow Audit (Continuation, 70% the prev pass deferred)

**Date:** 2026-05-26
**Branch:** `feat/step-6-ux-flows-audit-cont`
**Auditor:** Claude Opus 4.7 (1M context), acting as senior product-design auditor at Yuqi's direction
**Charter:** Pick up where the previous audit left off. Walk the surfaces the previous agent admitted to skimming-and-deferring — the queue (`obligations.tsx` 11.5K lines), rule library, the seven feature pages, mobile breakpoint behavior, hotkey discoverability.

> Yuqi's instruction (still standing): "Be critical, be harsh, be advanced, be aggressive. AUDIT EVERYTHING."

## Severity legend

| Sev | Meaning |
|-----|---------|
| **P0** | Blocks a primary flow / breaks accessibility / produces wrong data / dead-end CTA |
| **P1** | Hurts conversion or trust in a daily-driven flow — a CPA would notice within their first hour |
| **P2** | Polish gap — visible drift, missing affordance, missing default, jargon |
| **P3** | Nit — typographic, micro-spacing, single-pixel hit-target |

## Status legend

- shipped — fix committed on this branch
- deferred — fix deferred (reason given)
- not drift — investigated, judged intentional or acceptable
- needs-discussion — recommendation requires Yuqi's call

---

# Findings

## Q. The Queue — `routes/obligations.tsx` (11.5K lines, deep walk)

### Q1 — list/error/loading states

**Q1.1 — `routes/obligations.tsx:3287-3290` Loading state is a dashed-border text block, not a skeleton.**
The queue uses `<div className="rounded-lg border border-dashed border-divider-regular py-8 text-center text-sm text-text-tertiary"><Trans>Loading deadlines…</Trans></div>` while every other list surface in the app (dashboard, clients, audit) uses `<Skeleton>` rows. A returning CPA who page-flips between Clients (skeleton rows) and Deadlines (dashed empty box) sees inconsistent loading rhythm — and the empty box looks like the queue ended up empty, NOT loading. Severity **P1**. Fix: replace with a 12-row skeleton block (matching the rest of the app's table-loading pattern). shipped.

**Q1.2 — `routes/obligations.tsx:3291-3297` Error block uses raw `<div>` + `<button class="underline">` instead of canonical `<Alert>` + `<Button variant="link">`.**
Same drift the previous agent fixed for `/clients` (#64 in prev audit) and `routes/dashboard.tsx`. The button has no focus ring, no disabled state during refetch, no `aria-busy` on the surrounding region. Severity **P1**. Fix: convert to `<Alert variant="destructive">` with description + `<Button variant="link" size="sm">Retry</Button>`. shipped.

**Q1.3 — `routes/obligations.tsx:3287-3290` Loading state has no `role="status"` or `aria-live="polite"`.**
A screen-reader user navigating to /deadlines hears nothing while the data fetches. Severity **P2**. Fix: add `role="status"` + `aria-live="polite"` to the skeleton wrapper. shipped (rolled into Q1.1).

### Q2 — hotkey gaps under lifecycle v2

**Q2.1 — `routes/obligations.tsx:2487-2587` Status hotkeys cover F/P/I/W only — no `B` for blocked, no `R` for in_review, no `N` for not_started.**
Lifecycle v2 has six canonical states. The keyboard cheat-sheet (ShortcutHelpDialog) advertises "Mark filed / paid / in progress / waiting" but a power user who reads the bottom-of-table kbd hint and the help dialog has NO keyboard path to the other half of the lifecycle. The drawer header status pill was removed (line 4603 comment), so mouse-only is the only way to mark blocked or in_review. Severity **P1**. Fix: register `B` for blocked, `R` for in_review (the most-common terminal-precursor state for review-heavy CPA work). ⏳ deferred — needs hotkey design call (each new binding eats a global key, and `R` collides with refresh in some users' muscle memory).

**Q2.2 — `routes/obligations.tsx:2398-2418` Forward-slash hotkey expands the collapsed search but doesn't open the on-screen keyboard hint.**
The kbd hint `<kbd>?</kbd> all` at line 3737-3748 advertises the ShortcutHelpDialog, but a user who presses `/` doesn't see ANY visual feedback that the hotkey "worked" beyond the input gaining focus. On a slow machine the RAF defer makes this read as "did anything happen?". Severity **P3**. ❌ acceptable — input focus IS the feedback.

**Q2.3 — `routes/obligations.tsx:2444-2462` Enter-to-open-detail handler swallows the event but doesn't announce the drawer-open transition via a live region.**
Screen-reader users hear nothing when pressing Enter on a row. The drawer eventually mounts and Radix's focus-trap moves focus into it, but there's a 200-400ms delay during the animation. Severity **P2**. ⏳ deferred — would require an aria-live announcer at the route level.

**Q2.4 — Hotkey kbd hints at the table footer (`routes/obligations.tsx:3727-3749`) only show J / K / Enter / ?.**
The `X` (select), `F` (filed), `P` (paid), `I` (in progress), `W` (waiting), `E` (evidence) hotkeys ARE registered, but a CPA looking at the queue has no idea about them unless they discover the `?` overlay. Severity **P2**. Fix: add a second row of kbd hints "F Filed · W Waiting · E Evidence" OR (better) compress to "press ? for shortcuts" — the discoverability is currently lopsided toward navigation, leaving action hotkeys orphaned. ⏳ deferred — needs design call on hint density.

### Q3 — export dialog (`routes/obligations.tsx:3906-4096`)

**Q3.1 — `routes/obligations.tsx:3914` "Export writes an audit event" — bureaucratic copy.**
A first-time user reads "Export writes an audit event" and processes it as "this is logged somewhere," which sounds anti-privacy. The user wants to know what file they get and where it lands — not the compliance footprint. Severity **P2**. Fix: change to "Pick a scope, format, and recipient." or drop the audit-event mention into a tooltip / footer note. shipped.

**Q3.2 — `routes/obligations.tsx:4064-4081` "Email to self" and "Email to teammate" are disabled with "Email delivery is not connected for deadline exports yet." copy.**
Two of the three recipient choices are nonfunctional. The list is 33% live. A CPA reading this thinks "is this product half-built?" Severity **P1**. Fix: until the email pipeline ships, HIDE the disabled options instead of showing them with apologetic disabled copy. shipped — hidden until pipeline lands.

**Q3.3 — `routes/obligations.tsx:4087` Cancel button is `variant="outline"`, Export is default solid — but the canonical Dialog pattern across the app uses `variant="ghost"` for Cancel.**
Inconsistency with the Request Input dialog at line 7310 which DOES use ghost. Severity **P3**. Fix: ghost. shipped.

**Q3.4 — Export client picker (`routes/obligations.tsx:3992-4027`) has no search.**
A CPA with 200 clients trying to export "for Joe LLC only" gets a 200-item dropdown with no filter. Severity **P1**. Fix: use a Combobox / searchable Select primitive. ⏳ deferred — needs new pattern.

**Q3.5 — `routes/obligations.tsx:3947-3975` Date range start/end pickers have no validation message when end < start.**
The `invalid` prop is set on the end IsoDatePicker when `diffIsoDateDays(start, end) < 0` but there's no visible explanation of WHY it's invalid. Severity **P2**. Fix: add a small `<p className="text-sm text-text-destructive">End must be on or after start</p>` below the pair when invalid. shipped.

**Q3.6 — Export button at `4088-4093` shows "Exporting…" but the dialog stays open with no progress indicator.**
A 5-client filtered ZIP export can take 8-15 seconds. The button label is the only signal that anything is happening. No spinner inside the button, no progress bar. Severity **P2**. Fix: add `<Loader2 className="animate-spin">` to the disabled-pending button. shipped.

### Q4 — bulk action toolbar (`routes/obligations.tsx:3161-3285`)

**Q4.1 — `routes/obligations.tsx:3178-3180` "# rows selected" still says "rows" — prev agent shipped a fix for the bulk-status toast but NOT for the counter on the floating bar.**
"Rows" is engineering-speak. CPAs say "deadlines." Severity **P2**. Fix: change Plural to "# deadline selected / # deadlines selected." shipped.

**Q4.2 — `routes/obligations.tsx:3257-3266` Disabled Snooze button has `title={t\`Snooze (coming soon)\`}` — but no visible "coming soon" tag on the button itself.**
A CPA hovers, sees the tooltip, but if they're keyboard-only they never see the disabled reason. Severity **P2**. Fix: append "(soon)" to the visible label OR add an icon-only `<Lock />` adjacent. ⏳ deferred — needs design call.

**Q4.3 — `routes/obligations.tsx:3192-3209` Assign-owner dropdown lists "Unassigned" then a separator then members, but no search.**
With 50+ members the list scrolls. Severity **P2**. Fix: searchable Combobox once member count > 10. ⏳ deferred — needs new pattern (same as Q3.4).

**Q4.4 — `routes/obligations.tsx:3221-3247` Set-status dropdown has no `aria-busy` while `bulkStatusMutation.isPending`.**
Hammering "Filed" twice on a 47-row selection during the first request → double mutation fires. The button isn't disabled because it's a DropdownMenuItem (which has no `disabled` state honored mid-mutation). Severity **P1**. ⏳ deferred — needs `disabled={bulkStatusMutation.isPending}` on each item OR a route-level mutation lock.

**Q4.5 — Bulk-extended Memo dialog (`routes/obligations.tsx:4097-4131`) has the Textarea with `placeholder` instead of a real `<label>`.**
A blind user opening the dialog hears "extension memo, edit text" but the dialog's description doesn't repeat the placeholder. Severity **P2**. Fix: add a visible `<label>` above the textarea. shipped.

**Q4.6 — Bulk-extended dialog "Mark extended" button stays enabled when memo is empty.**
The mutation still fires (memo is optional). The semantic confusion: if the description says "The memo is stored on the audit trail" then a user trying to comply will leave the memo empty and hit Mark — losing the audit trail entry. Severity **P2**. Fix: either require the memo (truthful description) OR change the description to "Add a memo to record the reason (optional)." shipped (copy fix).

### Q5 — penalty input dialog (`routes/obligations.tsx:11104-11188`)

**Q5.1 — Inputs use `placeholder` instead of `<label>`.**
"Estimated tax due" and "Owner count" appear ONLY as placeholders. As soon as the user types one character, the field has no on-screen label. Severity **P1**. Fix: add `<label>` above each input. shipped.

**Q5.2 — No input formatting hints.**
"Estimated tax due" accepts $1,234.56 but doesn't say so. "Owner count" accepts a positive integer but doesn't say so. The `parseMoneyCents` regex (line 11192) rejects "1234.567" silently. Severity **P2**. Fix: add helper text "Dollars and cents, e.g. 1,234.56" / "Positive whole number." shipped.

**Q5.3 — Save button stays enabled when both inputs are blank.**
`save()` parses both, and if both are `null` the mutation fires with NEITHER value, which the backend (`updatePenaltyInputs`) treats as a no-op but still writes an audit event with `reason: 'Deadline needs-input update'`. Pollutes the audit log. Severity **P2**. Fix: disable Save when `taxDue.trim() === '' && ownerCount.trim() === ''`. shipped.

**Q5.4 — Title "Penalty inputs" gives no context for what the user is editing.**
The DialogDescription shows `${row.clientName} - ${formatTaxCode(row.taxType)}` but the title is generic. Severity **P3**. Fix: title "Penalty inputs for {clientName}". ⏳ deferred — minor.

### Q6 — request-input dialog (`routes/obligations.tsx:7198-7321`)

**Q6.1 — `routes/obligations.tsx:7249-7251` Recipient label is a `<span>`, not a `<label htmlFor>`.**
The DropdownMenuTrigger button has no `aria-labelledby` pointing to the span. Screen-reader users hear only the truncated trigger text, not "Recipient: Joe Smith". Severity **P2**. Fix: convert span to `<label id="...">` and add `aria-labelledby` on the trigger button. shipped.

**Q6.2 — Submit "Send request" button has no `aria-busy` while submitting.**
The button disables but no other signal — no spinner inside it. Severity **P3**. Fix: add `<Loader2 className="animate-spin">` when `submitting`. shipped.

**Q6.3 — Recipient role labels (`routes/obligations.tsx:7224-7230`) map manager/preparer/coordinator → "Team member."**
This is misleading. A CPA reading "Joe — Team member" expects a generic role; instead Joe is specifically a Preparer. The roles ARE distinct in the rest of the app. Severity **P2**. Fix: keep role-specific labels. shipped.

### Q7 — drawer-header status pill (removed but residual)

**Q7.1 — `routes/obligations.tsx:4603-4608` Comment block notes the drawer-header status pill was removed but the computation is kept as `_statusDropdownOptions`.**
Dead code with `void _statusDropdownOptions`. The 6 lines of computation + a useMemo dependency are wasted. Severity **P3**. Fix: remove the computation and the `void` no-op. shipped.

### Q8 — calendar-sync popover (`routes/obligations.tsx:11549-11687`)

**Q8.1 — Hand-rolled `<div className="fixed inset-0 z-40 bg-black/30">` scrim above the Popover.**
The Popover primitive (Base UI) has its own backdrop/overlay system. The hand-rolled scrim DOUBLES the visual stack — clicking it closes the popover, but it also stops focus-trap behavior. A user pressing Tab inside the popover may escape into the scrim. Severity **P2**. Fix: remove the hand-rolled scrim, rely on the Popover primitive's outside-click. ⏳ deferred — verify outside-click closes the popover before stripping the scrim.

**Q8.2 — `routes/obligations.tsx:11655` "Regenerate" mutation fires immediately on click — no confirmation.**
Regenerating the feed URL INVALIDATES the user's existing calendar subscription. Anyone who has the old URL in Apple/Google/Outlook will silently stop getting updates. There's no confirmation dialog explaining this destructive consequence. Severity **P0**. Fix: open a confirmation dialog "Regenerate calendar URL? Your existing calendar will stop updating until you re-add the new URL." ⏳ deferred — adds a Dialog, needs design call.

**Q8.3 — `routes/obligations.tsx:11641-11646` Read-only Input has the calendar URL but no Copy-button-adjacent affordance to TEST it works.**
A CPA copies the URL, then has to leave the app, paste it into Google Calendar, and wait to see if events appear. Severity **P2**. Fix: link to a doc "How to add this URL to your calendar" with platform-specific 4-step guides. ⏳ deferred — content design.

**Q8.4 — `routes/obligations.tsx:11679` "Enable subscription" button has no `aria-busy`.**
Same pattern as Q3.6, Q6.2. Severity **P3**. Fix: add `<Loader2 className="animate-spin">` + `aria-busy`. shipped.

**Q8.5 — `routes/obligations.tsx:11622` Popover content is anchored align="end" but width is hardcoded `w-80` (320px).**
On a narrow viewport (sidebar collapsed on mobile-ish breakpoint), the popover can overflow off the right edge. Severity **P3**. ⏳ deferred — Base UI's Popover usually clamps to viewport but should verify on a 768px width.

### Q9 — filter chips + group-by toolbar

**Q9.1 — `routes/obligations.tsx:11472-11486` Active filter chip shows an inline `<XIcon>` to signal "click to remove" — but a hovered chip with no X looks identical to an inactive chip with no X.**
The visual difference (border-accent vs border-divider, bg-accent-tint vs bg-default) is the only signal. A user on a low-contrast monitor or with mild color-blindness may not see the difference. Severity **P2**. Fix: add a 2px ring or a leading `<CheckIcon>` when active. ⏳ deferred — needs design call.

**Q9.2 — Group-by dropdown (need to verify) only regroups via multi-column sort.**
Per the comment at 1044-1063, picking Client / Status sorts so same-group rows are adjacent. There's NO visible section-header dividing the groups (intentionally killed at 3454-3460). A user picking "group by Client" sees rows sorted by client name with no visible group break — visually identical to sorting by Client. Severity **P2**. Fix: either drop the Group-by dropdown entirely OR ship the section-header pattern (the ~200-line port comment references). ⏳ deferred — needs design call.

### Q10 — drawer status transitions (in_review / blocked / waiting_on_client)

**Q10.1 — Drawer body status-change UI is buried in `ObligationQueueStatusControl` (extracted, ~5000-line drawer body).**
Status changes during the drawer-open flow have to go through the drawer's status control (which is the only path now that the header pill is gone). For high-frequency transitions (Mark filed → next row), this means: open drawer → scroll to status section → pick status → wait for mutation → close drawer → J to next row. Mouse-only is 5 clicks; keyboard is 4 keystrokes IF the user knows F. Severity **P2**. Fix: surface the canonical 6-state status row at the TOP of the drawer body so it's always above the fold. ⏳ deferred — needs drawer-layout audit.

**Q10.2 — Blocked-by selection in the drawer — search for the component.**
Per the comment at 11497-11501 (`ObligationBlockerSection removed 2026-05-21 — the editor lived inside the Readiness tab on every drawer open, even on rows that weren't blocked`), the blocker editor was retired. So setting status=blocked has NO way to specify WHAT's blocking. Severity **P1**. Fix: re-introduce a blocked-by picker that only appears when status=blocked, OR allow free-text in the blocked-reason field. ⏳ deferred — needs Yuqi sign-off on the picker design.

---

## R. Rule library — `routes/rules.library.tsx` (2.8K lines) + `features/rules/coverage-tab.tsx` (2.5K lines)

### R1 — entity chip filter

**R1.1 — `routes/rules.library.tsx:1287-1295` "Clear filter" link appears ONLY when an entity is active — but the active chip itself can also clear by clicking.**
Two redundant clear paths. A new user staring at "FILTERING: LLC … Clear filter" link on the left + a filled LLC chip in the right group doesn't know they can also click LLC. Severity **P3**. Fix: remove the explicit Clear link; the canonical "click active chip again to clear" pattern is enough (and matches /deadlines + /alerts per the comment at 1276). shipped.

**R1.2 — `routes/rules.library.tsx:1310-1314` `title` attribute is the only place where the gap-count detail lives ("9 jurisdictions missing a rule").**
Keyboard / touch-screen users never see this. Severity **P2**. Fix: render the gap detail as visible text under the chip or in an `<sr-only>` block that screen readers read. shipped — added screen-reader text via `<span class="sr-only">`.

**R1.3 — `routes/rules.library.tsx:1304-1374` Chips have no fixed width — chip widths vary based on label + count + gap.**
On a row with "LLC 12 · 9 missing" and "Partnership 1" next to each other, the eye has to re-anchor for each chip. Severity **P3**. ⏳ deferred — needs design call on whether equal-width or content-width is the desired feel.

### R2 — pending/active queue mode toggle (`features/rules/coverage-tab.tsx:1936-1988`)

**R2.1 — `features/rules/coverage-tab.tsx:1958, 1974` Tab disabled when count=0 — but the user may BE on that tab.**
If `pendingCount===0` and `mode==='pending'`, the user's currently-selected tab is disabled. They can switch off it (clicking Active) but if they click back to "Pending" (curiosity, or via keyboard tab order), it's disabled. Severity **P1**. Fix: remove `disabled` when the mode IS the currently-selected tab — let the user see "0 pending" as a confirming empty state, not a disabled control. shipped.

**R2.2 — `features/rules/coverage-tab.tsx:1949-1953` Wrapping div is `role="tablist"` but there's no `role="tabpanel"` linking the buttons to the queue table below.**
SR users hear "Pending tab selected" and then have no association between that and the table content. Severity **P2**. Fix: add `aria-controls="rule-queue-panel"` on each tab + `id="rule-queue-panel"` + `role="tabpanel"` on the wrapping element. ⏳ deferred — needs careful audit of which container owns the panel.

### R3 — bulk review bar + modal

**R3.1 — `routes/rules.library.tsx:2351-2357` "Clear" affordance is a `<button class="text-xs underline">` — not a Button primitive.**
Same drift pattern. The button has no proper hover state visible, no consistent height with neighbors. Severity **P2**. Fix: convert to `<Button variant="link" size="sm">`. shipped.

**R3.2 — `routes/rules.library.tsx:2418-2419` Accept hotkey uses `querySelector('[data-rule-action="accept"]').click()`.**
Fragile coupling — the keyboard hotkey is finding a DOM node by data-attribute and triggering a programmatic click. If `RuleDetailCompact` ever stops rendering that data attribute, the hotkey silently no-ops with no error. Severity **P2**. ⏳ deferred — needs refactor to expose an explicit `onAccept` ref/callback.

**R3.3 — `routes/rules.library.tsx:2569-2580` KeyboardHints hidden below `sm` breakpoint (`hidden ... sm:flex`).**
On a 640px-wide review modal (mobile), the user sees Prev/Skip but NO kbd hints. The whole point of the modal is reviewing rules faster via keyboard — hiding the hints on the form factor where the kbd hint matters MOST (visitors who don't know the shortcuts) is backwards. Severity **P2**. Fix: keep the hints visible at all breakpoints; let them wrap into a 2nd row if needed. ⏳ deferred — narrow footer needs design call.

**R3.4 — `routes/rules.library.tsx:2554-2557` "Skip" / "Finish" outline button — but Skip moves forward without acting (passive), and "Finish" closes the modal (terminal). Semantically distinct, visually same.**
A user reaching the last card and seeing the same outline button just relabelled "Finish" doesn't know whether finishing skips or commits. Severity **P2**. Fix: when `isLast`, give Finish a primary fill (and rename to "Done"). shipped.

**R3.5 — `routes/rules.library.tsx:2559` `<span class="sr-only">{t\`Press Escape to close the review queue.\`}</span>` sits at the BOTTOM of the dialog.**
SR users hear this LAST — by which point they've already navigated through 400+ chars of dialog content. Severity **P3**. Fix: move the sr-only escape hint to the top of the DialogContent, right after the title. ⏳ deferred — minor.

### R4 — rule table rows

**R4.1 — `routes/rules.library.tsx:1832-1833` `<TableRow class="group cursor-pointer">` opens detail on click, but there's no visible affordance until hover.**
The chevron at the end of the row is `opacity-0 group-hover:opacity-100` (line 1892). Keyboard users navigating to the row via Tab get no visible hint that Enter opens the detail. Severity **P2**. Fix: render the chevron at low opacity always (`opacity-30`) so a keyboard user sees the affordance. shipped.

**R4.2 — `routes/rules.library.tsx:1863` Title underline is `group-hover:underline` — but on focus (keyboard navigation), the title doesn't underline.**
Keyboard navigation gives the row focus-ring but the title text doesn't react. Severity **P2**. Fix: add `group-focus-within:underline` so focus-visible matches hover behavior. shipped.

**R4.3 — `routes/rules.library.tsx:1851-1854` Checkbox's `<span onClick stopPropagation>` wrapper uses `onPointerDown` + `onClick` to stop row-open.**
Two event types blocking is brittle — `keyboard` Enter on the checkbox could still bubble (though Checkbox primitive likely prevents this). Severity **P3**. ❌ acceptable — defensive but correct.

### R5 — new rule modal (`routes/rules.library.tsx:2607-2823`)

**R5.1 — `routes/rules.library.tsx:2816-2818` Submit button shows "Creating…" but no spinner.**
Same pattern as Q3.6 / Q6.2. Severity **P3**. Fix: add Loader2 + aria-busy. shipped.

**R5.2 — `routes/rules.library.tsx:2733-2738` Empty-pickers branch ("Custom rules currently need to be created from a missing-rule row…").**
A user reaches this modal from the header "New rule" button and sees this dead-end copy. They have to close the dialog and find a gap row. Severity **P1**. Fix: either disable the header "New rule" button when no gap rows exist OR inline a jurisdiction + entity picker in the dialog so it actually works from any entry. ⏳ deferred — feature work.

**R5.3 — `routes/rules.library.tsx:2785-2787` "Tax type" input is a free-form text with placeholder "e.g. income, sales, payroll".**
A user typing "Income tax" or "Salary tax" creates an unstandardized tax_type that breaks downstream filtering on the queue. Severity **P1**. Fix: replace Input with a Combobox seeded by the existing tax-type set + free-text fallback. ⏳ deferred — needs new pattern.

**R5.4 — `routes/rules.library.tsx:2790-2807` "When is it due?" Textarea is plain English description with no calendar-logic preview.**
The user describes "Quarterly, 15th of the month after each quarter" and the server stores it as `kind: source_defined_calendar` with the user's English text. The rule is effectively a TODO until someone refines the calendar logic. Severity **P2**. Fix: clarify at submit "We'll calendar-ize this later" copy. ⏳ deferred — feature flow.

### R6 — coverage tab additional (`features/rules/coverage-tab.tsx`)

**R6.1 — `features/rules/coverage-tab.tsx:1011-1014` `ActiveFilterChip` labels are HARDCODED strings, not wrapped in `<Trans>`.**
The chip reads "Showing jurisdictions with pending rules" — but on a Spanish-locale firm it stays English. Severity **P1**. Fix: wrap with `<Trans>` / use `t\`\``. shipped.

**R6.2 — `features/rules/coverage-tab.tsx:1021, 1024` Clear button has `aria-label="Clear filter"` AND a visible "Clear" text — both hardcoded.**
Same i18n drift. Severity **P1**. shipped.

**R6.3 — `features/rules/coverage-tab.tsx:1036-1079` EntityCoverageLegend uses `uppercase tracking-[0.08em]` on "Legend" eyebrow.**
This survived the seventy-third pass which retired the "FILTER BY ENTITY" eyebrow on the chip row. Inconsistent legend treatment. Severity **P3**. Fix: tone the eyebrow to a plain `text-xs font-medium`. ⏳ deferred — different surface, may warrant the eyebrow.

---

## F. Seven thin-wrapper feature pages

### F1 — `features/notifications/notifications-page.tsx` (168 lines)

**F1.1 — No filter tabs (unread / all / by-type).**
The audit prompt mentioned "inbox + filter tabs" but there are NONE. List uses `status: 'all'` and limit 50 — no per-type filter, no unread-only view. A power-user with 50 mixed notifications has no way to see only Pulse alerts. Severity **P2**. Fix: add a Tabs primitive at the top: "All / Unread / Pulse / Deadlines / System." ⏳ deferred — needs design call on the tab set.

**F1.2 — Read vs unread visual differentiation is nonexistent.**
`notifications-page.tsx:104-106` Every notification renders with the same `bg-background-default border-divider-subtle`. The "Mark read" button at line 149-159 is the only signal an item is unread. Severity **P1**. Fix: add a left bar/dot or a subtle bg-state-accent-tint when `!item.readAt`. shipped.

**F1.3 — Loading state shows NOTHING.**
`notificationsQuery.isLoading` is checked at line 99 only for "show empty state if false AND length===0". During loading the user sees a blank Card. Severity **P1**. Fix: render 4-5 Skeleton article cards. shipped.

**F1.4 — `notifications-page.tsx:73` `markAllRead` disabled when "every item is read" — but ALSO disabled when the list is empty (every of [] returns true).**
Quirk of `Array.every` on []. The button looks disabled with no explanation. Severity **P3**. Fix: explicit check `notifications.length > 0 && notifications.some(item => !item.readAt)`. shipped.

**F1.5 — List has no pagination — hardcoded limit 50.**
At 51 notifications the user is silently truncated. Severity **P2**. ⏳ deferred — needs cursor-paginated server.

**F1.6 — `notifications-page.tsx:104-105` `<article>` has no `aria-label` and the unread/read state isn't surfaced to assistive tech.**
SR users tabbing through can't tell which items are unread. Severity **P2**. Fix: add `aria-label={item.readAt ? t\`Read: ${title}\` : t\`Unread: ${title}\``. shipped.

### F2 — `features/workload/workload-page.tsx` (407 lines)

**F2.1 — `workload-page.tsx:155-158` Loading state uses bordered text block, not Skeleton.**
Same drift as Q1.1. Severity **P1**. Fix: replace with skeleton rows. shipped.

**F2.2 — `workload-page.tsx:106-118` Error state uses Card + CardTitle + CardDescription instead of canonical `<Alert variant="destructive">`.**
Drift from notifications-page.tsx (which uses Alert correctly). Severity **P2**. Fix: convert to Alert primitive. shipped.

**F2.3 — `workload-page.tsx:51-66` Firms loading state ALSO renders a Card with text — not skeletons.**
Same drift pattern. Severity **P2**. Fix: skeleton card. shipped (rolled in with F2.1).

**F2.4 — `workload-page.tsx:94-102` Refresh button has no `aria-busy`.**
Pattern same as Q3.6. Severity **P3**. Fix: aria-busy + Loader2 spinner. shipped.

**F2.5 — `workload-page.tsx:262-287` MetricCard shows "—" when value is undefined (loading).**
Loading state is presented as data ("—") rather than as a loading skeleton. A user might think their workload has em-dashes. Severity **P2**. Fix: show skeleton during loading. shipped.

**F2.6 — `workload-page.tsx:256` `<p className="text-xs font-medium uppercase text-text-tertiary">` on manager-insight metric label.**
Uppercase kicker drift. The eightieth-pass commits retired most uppercase kickers. Severity **P3**. ⏳ deferred — uppercase here may be intentional differentiator.

### F3 — `features/opportunities/opportunities-page.tsx` (458 lines)

**F3.1 — Dismiss action has no undo affordance in the toast.**
`opportunities-page.tsx:336-350` Dismiss mutation succeeds → "Opportunity dismissed" toast → NO undo. The user has to scroll to the "Dismissed opportunities" disclosure at the bottom of the page and click Restore. Severity **P1**. Fix: add toast action `{ label: 'Undo', onClick: () => restore() }`. ⏳ deferred — toast primitive needs callback support audit.

**F3.2 — Snooze defaults to 14 days with no per-action duration picker.**
`opportunities-page.tsx:326-327` A user wanting to snooze for 7 days or 30 days has to wait the 14-day default then re-dismiss. Severity **P2**. Fix: convert Snooze button to a DropdownMenu with 7d / 14d / 30d / 90d items. ⏳ deferred — feature work.

**F3.3 — Action column always shows 3 buttons vertically.**
`opportunities-page.tsx:415-454` Open / Snooze / Dismiss. On a 10-opportunity list that's 30 buttons — visual noise. Severity **P3**. Fix: collapse Snooze + Dismiss into a `⋯` menu, keep Open as the primary. ⏳ deferred — needs design call.

### F4 — `features/audit/audit-log-page.tsx` (793 lines)

**F4.1 — `audit-log-page.tsx:412` Export-dialog Cancel button uses `variant="outline"` instead of canonical ghost.**
Same drift as Q3.3. Severity **P3**. Fix: ghost. shipped.

**F4.2 — `audit-log-page.tsx:416-422` "Download latest" button has no `aria-busy` while `createDownloadUrl.isPending`.**
Severity **P3**. Fix: add aria-busy + Loader2. shipped.

**F4.3 — `audit-log-page.tsx:424-429` "Request export" button has no `aria-busy` while `requestPackage.isPending`.**
Severity **P3**. shipped.

### F5 — `features/reminders/reminders-page.tsx` (666 lines)

**F5.1 — `reminders-page.tsx:655` Template-dialog Cancel uses `variant="outline"` — drift from canonical ghost.**
Severity **P3**. shipped.

**F5.2 — `reminders-page.tsx:638` Template-body Textarea has `font-mono`.**
Drift from the recent font-mono purge passes (audit-86-batch6/7/8). Email-template body is regular prose, not a code surface. Severity **P2**. Fix: drop `font-mono`. shipped.

**F5.3 — `reminders-page.tsx:658-660` "Save template" button shows no spinner, no "Saving…" label.**
Severity **P2**. Fix: aria-busy + Loader2. shipped.

**F5.4 — `reminders-page.tsx:544-551` "Loading suppressions…" + empty-state are plain `<p>` text in bordered boxes.**
Inconsistent with the skeleton pattern used elsewhere on the page (templatesQuery uses Skeleton via the `loading` prop). Severity **P3**. ⏳ deferred — minor.

**F5.5 — `reminders-page.tsx:625-630, 631-640` Subject / Body inputs use `<label>` wrapping `<Input>` without `htmlFor`.**
Technically valid HTML (label wrapping an input implicitly associates them), but the `<span>` inside the label is decorative — a SR user navigating by tab hears nothing. Severity **P3**. ⏳ deferred — accessibility verification on Base UI Input's label discovery.

### F6 — `features/members/members-page.tsx` (1198 lines)

**F6.1 — `members-page.tsx:1085-1093` Invite mutation onSuccess does NOT toast.**
The dialog just closes silently. The user has no confirmation the invite was sent. They'd have to navigate to the Pending Invites section and verify the row appeared. Severity **P1**. Fix: `toast.success(t\`Invite sent to ${email}\`)`. shipped.

**F6.2 — `members-page.tsx:1169` Cancel button uses `variant="outline"` — drift.**
Severity **P3**. Fix: ghost. shipped.

**F6.3 — `members-page.tsx:1172-1174` "Send invite" button label changes to "Sending…" but no spinner.**
Severity **P3**. Fix: aria-busy + Loader2. shipped.

**F6.4 — `members-page.tsx:1158-1162` Error display is a raw `<p role="alert" class="text-sm text-text-destructive">` with `inviteMutation.error.message`.**
Drift from the canonical Alert primitive. The error message comes from the RPC and may be unreadable to a CPA ("VALIDATION_ERROR: email must be unique"). Severity **P2**. Fix: use Alert primitive + run through `rpcErrorMessage()`. shipped.

**F6.5 — `members-page.tsx:1131-1150` Role Select shows MANAGED_ROLES inline list — but no description per role.**
The page-level helper text below ("Owner stays read-only. Managers can review work; preparers and coordinators have scoped access.") is divorced from the actual picker — a user changing the role doesn't see WHICH role does WHAT. Severity **P2**. Fix: add a second line per SelectItem with the role's permission summary. ⏳ deferred — needs content design.

### F7 — `features/calendar/calendar-page.tsx` (616 lines)

**F7.1 — Calendar page is subscription-management, not the "calendar grid" the audit prompt implied.**
The audit prompt mentioned "calendar grid, month nav, filter sidebar, event hover" but the file is only iCal-feed management. The product doesn't have an in-app month calendar view. Severity **P2** if Yuqi wanted a month grid; otherwise ❌ not drift. needs-discussion.

**F7.2 — `calendar-page.tsx:357-359` IntegrationNote body uses string-literal copy that's English-only ("Other calendars -> From URL").**
The arrow `->` is ASCII — should be unicode `→`. Severity **P3**. Fix: replace ASCII arrows with `→`. shipped.

**F7.3 — `calendar-page.tsx:272-274` Regenerate button shows "Regenerating…" label but no Loader2 spinner.**
Pattern. Severity **P3**. shipped.

**F7.4 — `calendar-page.tsx:338` "Disable feed" disabled-button shows "Disabling…" label but no Loader2 spinner.**
Same pattern. Severity **P3**. shipped.

