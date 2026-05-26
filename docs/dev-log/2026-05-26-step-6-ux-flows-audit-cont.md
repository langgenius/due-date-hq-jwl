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

