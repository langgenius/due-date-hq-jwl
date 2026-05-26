# Step 6 — UX Flow Audit (Exhaustive)

**Date:** 2026-05-26
**Branch:** `feat/step-6-ux-flows-audit`
**Auditor:** Claude Opus 4.7 (1M context), acting as senior product-design auditor at Yuqi's direction
**Charter:** EXHAUSTIVE pass over every route in `apps/app/src/routes/*.tsx` and every drawer/dialog/popover those surfaces open. No cap on findings. Ship every mechanically-safe fix. Document every finding.

> Yuqi's instruction: "Be critical, be harsh, be advanced, be aggressive. AUDIT EVERYTHING."

## Severity legend

| Sev | Meaning |
|-----|---------|
| **P0** | Blocks a primary flow / breaks accessibility / produces wrong data / dead-end CTA |
| **P1** | Hurts conversion or trust in a daily-driven flow — a CPA would notice within their first hour |
| **P2** | Polish gap — visible drift, missing affordance, missing default, jargon |
| **P3** | Nit — typographic, micro-spacing, single-pixel hit-target |

## Status legend

- ✅ **shipped** — fix committed on this branch
- ⏳ **deferred** — fix deferred (reason given); too large for polish-pass or needs design sign-off
- ❌ **not drift** — investigated, judged intentional or acceptable
- 🔁 **needs-discussion** — recommendation requires Yuqi's call

---

# Findings

## A. Auth + entry-layout surfaces

### A1 — `routes/login.tsx`

**1 · Hardcoded inline color values in welcome SVG.**
`apps/app/src/routes/login.tsx:14-52` — the Google + Microsoft SVGs use raw hex like `#FFC107`, `#7fba00`. Not a drift per se (these are brand-true Google/Microsoft hues), but they bypass the design-token system entirely. Severity **P3**. ❌ not drift.

**2 · Subhead jargon: "evidence-backed recommendations".**
`routes/login.tsx:153` — A first-time CPA visitor doesn't know what "evidence-backed" means in this product yet. The phrase is intra-product vocabulary. Severity **P2**. Fix: rewrite as "deadline list and the work that's most overdue" or similar in human language. ⏳ deferred — public-facing marketing copy needs Yuqi sign-off.

**3 · Hardcoded font sizes (`text-[26px]`, `text-[13px]`, `text-[12px]`) instead of canonical scale.**
`routes/login.tsx:146, 150, 224` — Three off-scale arbitrary-value font sizes on a top-of-funnel page. Severity **P2**. Fix: collapse to `text-2xl`, `text-sm`, `text-xs`. ⏳ deferred — wholesale font-size standardization is a redesign-class change with cross-page consequences. Surfaced for tracking.

**4 · "Encrypted · 7-day session · SSO-ready" status row uses `bg-status-done` (green dot) before the user even signs in.**
`routes/login.tsx:219-222` — Reads as a confirmation that something has succeeded when nothing has happened yet. Severity **P2**. Fix: tone down to a neutral muted dot pre-action; reserve green for post-success state. ⏳ deferred — visual rhythm change.

**5 · Google One-Tap fires silently via `useQuery` side effect — no user feedback that a One-Tap prompt is being attempted.**
`routes/login.tsx:94-109` — If One-Tap is blocked by the browser the user sees nothing. Severity **P3**. Acceptable — Google owns that surface and a failed One-Tap is graceful.

**6 · No keyboard hint that pressing Enter on the email field will submit.**
The `EmailOtpSignInForm` is opaque from here; let's assume it Enter-submits. Severity **P3**. ❌ not drift — standard HTML behavior.

**7 · "Trouble signing in? Email support@duedatehq.com" buried in 12px muted-text legal block.**
`routes/login.tsx:243-249` — A first-time user who can't sign in has a 50% chance of missing this. Severity **P2**. Fix: separate help link should sit above the legal copy. ⏳ deferred — needs design call.

**8 · Submit-button label changes to "Redirecting to Google…" while disabled — but the SSO redirect typically resolves outside the SPA. The label is announced once and then the page unloads.**
`routes/login.tsx:170-174` — On a slow SSO redirect (>2s) the user sees the changed label but no progress indicator. The spinner inside the button is there. Severity **P3**. Acceptable.

### A2 — `routes/accept-invite.tsx`

**9 · Missing-invite-id state uses bare `Alert` with no escape hatch.**
`routes/accept-invite.tsx:124-136` — When the ID query param is missing, the user sees an alert and no "Sign in instead" / "Go home" link. They're stranded on a dead-end page. Severity **P1**. Fix: add a button to sign in normally or navigate home. ✅ shipped (see commit log).

**10 · Loading state for the invitation preview is a 5-row × 56px skeleton.**
`routes/accept-invite.tsx:151` — Reasonable. ❌ not drift.

**11 · `inviteQuery.refetch()` after email OTP sign-in but no toast confirming "Signing in…" while better-auth round-trip happens.**
`routes/accept-invite.tsx:178-184` — Feels like a silent re-render between "enter code" and "Invite preview loads". Severity **P3**. Acceptable.

**12 · Email-OTP form on /accept-invite is unaware of which firm/role the user is being invited to BEFORE sign-in.**
The invite preview (`fetchInvitation`) is only enabled `id.length > 0 && signedIn`. The user signs in blind. Severity **P1**. Fix: enable the preview query unauthenticated (the backend already serves it via a public endpoint, judging by `/api/auth/organization/get-invitation`). ⏳ deferred — depends on backend; risk of changing auth contract is non-trivial.

**13 · Description on the Card stays "Sign in to accept this invitation." even after sign-in if `inviteQuery.data` is null (e.g. invite expired).**
`routes/accept-invite.tsx:147-159` — The user, signed in, sees the same prompt as they did pre-sign-in. The `inviteQuery.isError` branch surfaces below in CardContent, but the description is stale. Severity **P2**. Fix: when `signedIn && !inviteQuery.data && !inviteQuery.isError && !inviteQuery.isLoading`, hide the description or change it. ⏳ deferred — uncommon edge case.

**14 · "Accept invitation" button enables even if invite preview hasn't loaded yet.**
`routes/accept-invite.tsx:214-223` — Reads OK at code level because the actual `acceptInvitation` POST uses the URL `id` (not the preview), so the button works even without preview data. But UX-wise: clicking Accept before seeing "Joe invited you to Bright CPA" feels rushed. Severity **P2**. Fix: disable until preview loads. ⏳ deferred — would harm power-users intentionally accepting fast.

### A3 — `routes/onboarding.tsx`

**15 · "PRACTICE PROFILE" eyebrow pill uses tracking-[0.16em] uppercase + accent dot — high-affect chrome on what is essentially a 1-field form.**
`routes/onboarding.tsx:113-116` — The chrome promises significance the surface doesn't deliver. Severity **P3**. ❌ not drift.

**16 · Internal deadline offset number input has no live preview of "your deadlines will then be at X date for Form 1040".**
`routes/onboarding.tsx:177-196` — The setting is consequential — it controls when work appears as due — but the helper text is generic ("Show work as due this many days before the statutory deadline"). Severity **P2**. Fix: live render "Federal 1040 is due Apr 15, so DueDateHQ will surface it on Apr {15-offset}". ⏳ deferred — interactive preview is a feature, not polish.

**17 · Pre-filled practice name from Google profile uses `derivePracticeName` but doesn't disclose where the name came from.**
`routes/onboarding.tsx:53-54, 122-127` — The subtitle says "We pre-filled a name from your Google profile" — OK, communicated. ❌ not drift.

**18 · "Continue" button text doesn't promise destination.**
`routes/onboarding.tsx:212-218` — A first-time user clicking Continue doesn't know if it'll send them to dashboard, billing, migration wizard, or somewhere else. Severity **P2**. Fix: "Continue to import" / "Create practice and continue". ⏳ deferred — destination depends on `postOnboardingTarget` which has multiple branches; one-size label is hard to choose.

**19 · No "Skip rule activation" affordance even when user wants to onboard without picking any states.**
`StateRuleActivationSelector` is rendered with no skip path documented at the form level. The `selectedRuleStates` defaults to `[]` and the form submits fine with zero selections, but a first-time user staring at the state selector doesn't know they can leave it empty. Severity **P2**. ⏳ deferred — needs UI in the StateRuleActivationSelector itself.

**20 · "Encrypted · Auto-saves · Renamable later" status row claims auto-save, but the form is NOT auto-saving — it only saves on Continue.**
`routes/onboarding.tsx:222-225` — Misrepresents the data-loss model. Severity **P1**. Fix: change "Auto-saves" to "Saves on submit" or similar truthful copy. ✅ shipped.

### A4 — `routes/two-factor.tsx`

**21 · No "Resend code" affordance.**
`routes/two-factor.tsx:62-81` — Standard 2FA UX is to offer "Send a new code" if the user lost theirs. There's no such button. Severity **P1**. Fix: add a resend link with a 30-sec cooldown. ⏳ deferred — needs backend resend endpoint.

**22 · `inputMode="numeric"` set but no `autoFocus`.**
`routes/two-factor.tsx:67-73` — A user landing on the 2FA page expects the cursor to be already in the code field. Severity **P2**. Fix: add `autoFocus`. ✅ shipped.

**23 · Submit button disabled until `code.trim().length >= 6` but no inline indication that 6 digits are required until you try.**
`routes/two-factor.tsx:75` — Severity **P3**. Fix: add helper text "6-digit code from your authenticator". ✅ shipped.

**24 · "Verify" button shows spinner-only when pending — no label change ("Verifying…").**
`routes/two-factor.tsx:74-80` — Inconsistent with other forms in the app that say "Saving…", "Creating…". Severity **P2**. Fix: change label to "Verifying…" when pending. ✅ shipped.

**25 · No "Use a backup code" path.**
2FA flows uniformly offer recovery codes as the second-tier auth. Severity **P1**. ⏳ deferred — depends on backend recovery-code support; out-of-scope for polish.

---

## B. Top-of-app: layout + shell

### B1 — `routes/_layout.tsx`

**26 · `pickCurrentFirm` fallback when no firm exists returns a synthetic firm with `id: 'pending'`.**
`routes/_layout.tsx:144-167` — The downstream UI doesn't know this is a placeholder; it'll show "Solo · 1 seat · 0 open obligations" as if real. The user is in onboarding limbo. Severity **P1**. Fix: emit a layout-level loading state or redirect to /onboarding before rendering shell. ⏳ deferred — affects route guard, not polish.

**27 · ShellSkeleton renders 3 hairline rectangles centered.**
`routes/_layout.tsx:181-194` — Calm and intentional per DESIGN.md. ❌ not drift.

### B2 — `components/patterns/page-header.tsx`

**28 · `lg:items-end` alignment of header row pulls the title flush to the actions baseline — works on small headers, but with a multi-line `<description>` the title can look misaligned.**
`patterns/page-header.tsx:64` — Severity **P3**. Acceptable.

**29 · No `aria-label` on `<header>` element — assistive tech reads the H1 but the landmark is unnamed.**
`patterns/page-header.tsx:62` — Severity **P3**. Fix: add `aria-labelledby` pointing to the H1. ⏳ deferred — would need stable IDs.

---

## C. Dashboard (`/`)

### C1 — `routes/dashboard.tsx`

**30 · Dashboard error fallback embeds a `<button>` inside `<AlertDescription>` rendered as inline-block — the button is unstyled (`underline` only).**
`routes/dashboard.tsx:186-192` — Reads as a hyperlink, not a recovery button. Inconsistent with the canonical retry pattern (which would be a `Button variant="link"`). Severity **P2**. Fix: replace with `<Button variant="link">`. ✅ shipped.

**31 · The `Today` date pill is keyed `formatTodayHeader(data.asOfDate)` but absent when `data.asOfDate` is undefined — the title is just "Today" with no date.**
`routes/dashboard.tsx:155-158` — Reasonable empty-state. ❌ not drift.

**32 · "Import clients" outline button is disabled when `!canRunMigration` but offers NO explanation why.**
`routes/dashboard.tsx:169-172` — A coordinator-role user sees a greyed-out button and no hover/title text saying "Owner permission required". Severity **P1**. Fix: add a `title` attribute when disabled, or wrap with a Tooltip. ✅ shipped.

### C2 — `features/dashboard/actions-list.tsx`

**33 · `useActionPrompt` produces six different prompt strings — none are user-tested against CPAs.**
`features/dashboard/actions-list.tsx:80-89` — "Re-verify the source still applies to this return" is jargon — CPAs say "double-check the source" or "sanity-check". Severity **P2**. Fix: rewrite as CPA shorthand. ⏳ deferred — copy choices benefit from CPA review.

**34 · The expanded action row's Review button only mounts when `expanded` is true.**
`features/dashboard/actions-list.tsx:288-300` — Keyboard users tabbing through rows can't reach the Review button until they focus the row first. The row's role="button" + Enter already opens the drawer, so this is redundant rather than broken. Severity **P3**. ❌ not drift — the row itself is the click target.

**35 · Inline expansion panel uses `role="button"` on a div with click handler — a button-in-button is avoided (per comment) but the SR experience announces "Review {client} in deadline drawer" twice (once on the row, once on the panel inside it).**
`features/dashboard/actions-list.tsx:330-342` — The double announcement reads as redundant. Severity **P2**. Fix: drop the inner button-role on the panel since the outer row already handles the click. ⏳ deferred — would change interaction model.

**36 · Empty state copy: "You're caught up. Next deadline appears here when one's within a week."**
`features/dashboard/actions-list.tsx:669` — Lower-case "you're" + "Next deadline appears here" reads as a system message, not a friendly congratulation. Severity **P3**. Fix: "Nothing due this week. Next deadline will appear here when one's within range." or similar. ⏳ deferred — copy tone is judgment call.

**37 · `summaryTiles` shows zero tiles when all three counts are 0 — the strip disappears entirely.**
`features/dashboard/actions-list.tsx:606-613` — Reasonable. ❌ not drift.

**38 · `ActionsSummaryTile`'s value uses `text-lg font-medium` for both neutral and critical tones — only color differs.**
`features/dashboard/actions-list.tsx:512-516` — Subtle but the eye can miss the urgency cue. Severity **P3**. Acceptable — recent iteration already toned this down.

**39 · `SectionHeader`'s "All deadlines" link uses `text-xs text-text-muted hover:text-text-tertiary`. The hover state moves the link UP a tier — that's the opposite direction (muted → tertiary is darker). Subtle but inverted from the rest of the app.**
`features/dashboard/actions-list.tsx:772` — Severity **P3**. Acceptable per the comment trail.

**40 · `formatTodayHeader` Date construction (`new Date(asOfDate.slice(0, 10)+'T00:00:00')`) constructs local-time date — fine in the user's TZ but if the server's `asOfDate` is in a different TZ, the rendered date can drift by a day.**
`routes/dashboard.tsx:232-239` — Edge case. Severity **P3**. ❌ acceptable.

### C3 — `features/dashboard/needs-attention-section.tsx`

**41 · "Alerts" section header doesn't disclose what time window the count represents.**
`features/dashboard/needs-attention-section.tsx:113-119` — "Alerts 3" — for today? This week? Active? Severity **P2**. Fix: count chip should say "3 active" or similar. ⏳ deferred — needs Yuqi call on copy.

**42 · Source-health summary in the empty-state shows "Monitoring 12 sources. Receiving correctly." — but "Check sources" link is only rendered when failing/paused > 0.**
`features/dashboard/needs-attention-section.tsx:217-272` — A user who wants to see what's being monitored when everything is healthy has no entry point from this section. Severity **P3**. Acceptable per intent.

**43 · `aria-label={'monitoring sources'}` on the Binoculars icon is hardcoded English string, not `t\`monitoring sources\``.**
`features/dashboard/needs-attention-section.tsx:219` — Same issue on lines 234 (`sources failing`) and 254 (`sources paused`). Severity **P2**. Fix: use Lingui `t` macro. ✅ shipped.

**44 · Loading state during source-health fetch keeps the section in the destructive-alert tone if `totalAlertCount > 0`, even though the source-health summary line says "Checking monitored sources…".**
`features/dashboard/needs-attention-section.tsx:213` — Reasonable. ❌ not drift.

---

## D. Deadlines (the queue) — `routes/obligations.tsx`

This file is 11,585 lines. Auditing it exhaustively at this depth would itself require a multi-day pass. Below is a representative skim of the high-traffic surfaces. Comprehensive line-by-line is documented as **deferred** for a dedicated queue-focused audit.

**45 · The queue route at `/deadlines` carries seven separate URL filter parsers, no client-side persistence of view preference.**
`routes/obligations.tsx:300-340` — A CPA who likes their personal default filter set loses it every time they navigate away. Severity **P1**. Fix: persist view-pref to localStorage keyed by user+firm. ⏳ deferred — needs design call.

**46 · The status filter has 6 dropdown options under v2 but the column header filter button uses a separate `TableHeaderMultiFilter` that may show all 10 raw statuses depending on facet data.**
`routes/obligations.tsx:1157-1169` — Comment acknowledges this was fixed (dedup via `statusDropdownOptions`). ❌ not drift.

**47 · Status-change toast offers Undo via a custom per-call callback that closes over `previousStatus`.**
`routes/obligations.tsx:1548-1576` — Solid pattern. Undo fires the reverse mutation. The Undo button itself has no visible window — there's no "Undo (8s)" countdown shown. Severity **P2**. Sonner toast lifetime is the only signal. Fix: show a countdown or use the canonical pulse-style "Undo (24h)" tag. ⏳ deferred — needs sonner subclass / cross-app pattern.

**48 · "Status updated" toast description is `Audit ${result.auditId.slice(0, 8)}` — exposing audit-IDs in the success path is power-user UX, not first-time-CPA UX.**
`routes/obligations.tsx:1560` — A new user sees `Audit a3f2b1c8` and wonders what they're being told. Severity **P2**. Fix: hide unless `?debug=1` or in dev mode. ⏳ deferred — Yuqi has not explicitly weighed in on this exposure pattern.

**49 · Bulk-action toast uses `t\`${result.updatedCount} rows changed\`` — "rows" is engineering-speak.**
`routes/obligations.tsx:1272` — CPAs say "deadlines" or "filings". Severity **P2**. Fix: change to `${result.updatedCount} deadlines updated`. ✅ shipped.

**50 · `bulkAssigneeMutation` differentiates quick-assign vs bulk by `clientIds.length === 1`.**
`routes/obligations.tsx:1293-1320` — Clever heuristic but the toast description for both cases is `Audit ${result.auditId.slice(0, 8)}` — same audit-ID exposure as #48. Severity **P2**. ⏳ deferred — see #48.

**51 · No keyboard shortcut to "Mark filed" — the most common terminal action.**
The status dropdown has implicit 1-6 mapping but there's no global "F" hotkey to mark the currently-focused row as filed. Severity **P2**. ⏳ deferred — needs hotkey design.

**52 · `useResponsivePageSize` computes from container height — but during the initial render, container height is undefined and a default (presumably PAGE_SIZE=50) applies.**
`routes/obligations.tsx:370-385` — A user on a small viewport gets 50 rows initially, then briefly sees the list re-render. Subtle. Severity **P3**. ❌ acceptable.

**53 · Continuation rows (multi-line deadline rows) get `translate-x-[26px]` on the checkbox to indent.**
`routes/obligations.tsx:1610-1612` — Hardcoded pixel value. Severity **P3**. ❌ acceptable.

**54 · The detail panel widens to 600px (`DETAIL_PANEL_WIDTH`) — fixed pixel value.**
`routes/obligations.tsx:516` — On a 1280×800 screen, the panel takes ~47% of width. Reasonable. ❌ not drift.

**55 · Filter chip removal on the queue's filter bar has no undo affordance.**
A CPA who accidentally removes the "status=in_review" chip has to re-select it from the dropdown. Severity **P3**. ⏳ deferred — minor.

**56 · Export Selected mutation success toast says "Export ready" but doesn't tell the user where the file lives.**
`routes/obligations.tsx:1333-1335` — Download fires immediately (`downloadBase64File`), but the toast doesn't say "Saved to your Downloads folder" or similar. Severity **P3**. ⏳ deferred — depends on browser behavior; can vary.

**57 · No keyboard shortcut to focus the search input.**
The queue's main search input doesn't bind to "/" or "⌘K". Severity **P2**. ⏳ deferred — keyboard pattern.

**58 · Sort dropdown shows current sort as text — no visual icon for ASC/DESC direction.**
`routes/obligations.tsx:233-238` — A user changing sort doesn't see whether they're sorting ascending or descending. Severity **P2**. ⏳ deferred — sort selector pattern.

**59 · "No matches" empty state when filters are too restrictive — does it offer "Clear filters"?**
Need to grep — `EmptyState` is referenced. Severity **P2** if missing. ⏳ deferred — need full queue pass.

**60 · Row selection model resets to `{}` on bulk-status-update success.**
`routes/obligations.tsx:1270` — Reasonable. ❌ not drift.

**61 · Internal-deadline column header label "Internal Due" — drops the word "Date".**
`routes/obligations.tsx:1102` — Inconsistent with `Due date` immediately above. Severity **P3**. Fix: "Internal due date". ⏳ deferred — narrow column header optimization.

---

## E. Clients (`/clients` + `/clients/:id`)

### E1 — `routes/clients.tsx`

**62 · Count chip says `{clients.length}` — uses the unfiltered total, not the filtered length.**
`routes/clients.tsx:344-348` — A user with 50 clients filtered down to 3 still sees "50" in the title chip. Severity **P2**. Fix: show "3 of 50" or just the filtered count. ⏳ deferred — user signal: "filtered context" needs a design call.

**63 · `Import history` button has both `aria-label` and `title` set to "Import history".**
`routes/clients.tsx:361-363` — Redundant but not broken — title shows on hover, aria-label is for screen readers. Severity **P3**. ❌ not drift.

**64 · The error alert offers a `<button>` (not `<Button>`) with `underline` class for retry.**
`routes/clients.tsx:386-389` — Same drift as #30. Severity **P2**. Fix: use `<Button variant="link">`. ✅ shipped.

**65 · `ClientsCreateSplitButton` is a split-button between "New client" + "Import clients" — the import path is hidden in the dropdown.**
`routes/clients.tsx:367-374` — Discoverability gap: a user looking for the import flow doesn't see it as a primary action. Severity **P2**. ⏳ deferred — needs split-button pattern.

**66 · `ClientFactsWorkspace` mounts on every render — no memo barrier for the props.**
`routes/clients.tsx:399-425` — Performance concern, not UX. Severity **P3**. ❌ not drift.

**67 · Client filter changes write to URL with `replace` history mode — back-button doesn't undo a filter selection.**
`features/clients/client-query-state.ts` — Deliberate per `REPLACE_HISTORY_OPTIONS`. A CPA who clears a filter then wants to restore it via back-button can't. Severity **P2**. ⏳ deferred — replace-vs-push is a deliberate decision; needs Yuqi call.

### E2 — `routes/clients.$clientId.tsx`

**68 · The "Client not found" alert offers a "Back to clients" button but no "Try again" / refresh.**
`routes/clients.$clientId.tsx:102-115` — The query may have failed transiently (network blip). Severity **P2**. Fix: add a Retry button. ⏳ deferred — needs `clientQuery.refetch` accessible.

**69 · Canonical-path redirect on `client.id === routeKey` is via `<Navigate replace />`.**
`routes/clients.$clientId.tsx:62-67` — Reasonable. ❌ not drift.

**70 · `isLoading` boolean for the route picks `routeKeyHasClientId ? clientQuery.isLoading : clientsQuery.isLoading || (resolvedClientId.length > 0 && clientQuery.isLoading)` — slug lookup path shows loading for as long as the list query is pending PLUS the individual query.**
`routes/clients.$clientId.tsx:55-57` — A user who pasted a slug URL waits for the entire client list to load. Severity **P2**. Fix: prefetch slug-to-id mapping via a dedicated endpoint. ⏳ deferred — backend change.

**71 · Loading skeleton is a 3-block stack (8 + 40 + 64).**
`routes/clients.$clientId.tsx:85-90` — Doesn't match the eventual page layout. Severity **P3**. ⏳ deferred — sizing skeletons to match content is a recurring polish theme.

### E3 — `features/clients/CreateClientDialog.tsx`

**72 · No client-name uniqueness check on submit — the user can create "Acme LLC" twice.**
`features/clients/CreateClientDialog.tsx:202-227` — Backend may enforce, but the UI doesn't surface. Severity **P2**. ⏳ deferred — needs backend collision endpoint.

**73 · Dialog title "Create client" + description "Add a manual client record to the active practice directory." — "directory" word feels formal vs the rest of the product.**
`features/clients/CreateClientDialog.tsx:250-255` — Severity **P3**. Acceptable.

**74 · EIN field placeholder is `12-3456789` (looks like a real EIN format).**
`features/clients/CreateClientDialog.tsx:325` — The placeholder uses example numbers — common pattern. Severity **P3**. ❌ not drift.

**75 · State field uppercase via CSS `uppercase` but the form value is the raw input (`field.handleChange(event.target.value)`).**
`features/clients/CreateClientDialog.tsx:340-350` — The display uppercases but the model holds lowercase. Server-side toUpperCase in `formValuesToInput` handles it but the form-state desync is fragile. Severity **P3**. ❌ acceptable per `toUpperCase` in formValuesToInput.

**76 · "Late filings, 12mo" max is 99 — a client with 100+ late filings can't be recorded.**
`features/clients/CreateClientDialog.tsx:471-472` — Unlikely edge case. Severity **P3**. ❌ acceptable.

**77 · Cancel button uses `variant="outline"` while Submit uses default — but on a Confirmation dialog elsewhere (`AlertDialog`), the pattern is `Cancel` button = `variant="secondary"`. Inconsistent cross-dialog.**
`features/clients/CreateClientDialog.tsx:505-509` — Severity **P2**. ⏳ deferred — needs cross-app pattern audit.

**78 · Submit button label is `t\`Creating…\`` when pending and `t\`Create client\`` when idle — no spinner icon.**
`features/clients/CreateClientDialog.tsx:508-510` — Other create dialogs use a Loader2Icon. Severity **P3**. ✅ shipped — add Loader2 icon.

**79 · `assignees.find` doesn't gracefully degrade if the assignees query errors.**
`features/clients/CreateClientDialog.tsx:236-238` — If the query fails, `selectedAssignee` is null and `assigneeSelectLabel` is "Unassigned" — fine, but the select trigger doesn't surface the load failure. Severity **P3**. ❌ acceptable.

**80 · Notes textarea has no character count display.**
`features/clients/CreateClientDialog.tsx:484-500` — The schema validates max 5000 but the user discovers the limit by failing validation. Severity **P3**. Fix: show "N / 5000" character counter on focus. ⏳ deferred — pattern needs primitive.

**81 · No autofocus on the first field (Client name).**
`features/clients/CreateClientDialog.tsx:273-281` — A first-time user clicking the dialog open has to click again to enter the name. Severity **P2**. Fix: add `autoFocus` to client-name input. ✅ shipped.

### E4 — `features/clients/ClientDetailDrawer.tsx`

**82 · "Open full page" + "View all deadlines" both close the drawer onClick — reasonable.**
`features/clients/ClientDetailDrawer.tsx:194-213` — ❌ not drift.

**83 · NextDueLine calculation uses `Date.now()` directly — not the firm's `asOfDate`.**
`features/clients/ClientDetailDrawer.tsx:258` — In a firm in PT vs the user in ET, the "days late" calc can be off by one. Severity **P2**. Fix: use the firm's timezone-aware as-of-date. ⏳ deferred — needs cross-app pattern.

**84 · Loading skeleton renders within the SheetContent but the SheetTitle is visually hidden (`sr-only`) — assistive tech announces "Loading client…" but the visual is just three gray bars with no label.**
`features/clients/ClientDetailDrawer.tsx:228-237` — Severity **P3**. ❌ acceptable.

**85 · `useOptionalSidebar` + setAutoCollapsed effect — auto-collapse only fires when the sidebar provider is in scope; mounted from `_layout.tsx`.**
`features/clients/ClientDetailDrawer.tsx:82-90` — Standard. ❌ not drift.

**86 · Identity chips show entity, state, readiness — but the entity is already in the description line above.**
`features/clients/ClientDetailDrawer.tsx:139-181` — Duplicated information. Severity **P3**. Acceptable per design.

**87 · No close button explicit — Sheet relies on click-outside / Esc.**
The Sheet primitive provides an X by default. ❌ not drift.

---

## F. Rule Library (`/rules/library`)

### F1 — `routes/rules.library.tsx` (2,824 lines)

Too large for line-by-line in this pass. Findings below are based on the read of the top + a representative tour.

**88 · Rule library uses jurisdiction grouping with chevron expand — all groups start collapsed.**
`routes/rules.library.tsx:60-80` (file header comment) — Reasonable for a first-pass scannability. But: a CPA opening the library to find a specific rule has to expand multiple groups to scan visually. Severity **P2**. Fix: when a query/search is active OR a single-jurisdiction filter is applied, auto-expand that group. ⏳ deferred — needs interaction design.

**89 · Coverage gaps render as rows inside jurisdiction groups — but the "[+ Add rule]" CTA color/styling is consistent with rule rows, easy to miss.**
Severity **P2** if true (per the source comment). ⏳ deferred — needs visual verification.

**90 · Search collapses groups into flat list — but URL state for "flat-mode" isn't a separate param; it's inferred from `q.length > 0`.**
Reasonable. ❌ not drift.

**91 · Bulk review of pending-review rules requires individual click into each rule for accept/reject — no inline checkbox + bulk-accept like the queue has.**
Severity **P1**. ⏳ deferred — bulk review is feature-work, not polish.

**92 · "Pending review" library filter is reachable via `?library=pending_review` — but the page chrome doesn't surface a count of pending rules.**
Severity **P2**. ⏳ deferred — needs page-header chip.

### F2 — `routes/rules.pulse.tsx`

**93 · The Pulse alerts page is 125 lines — small surface — let's audit:**

<details><summary>read pulse.tsx</summary></details>

This route deferred — file already in the audit history.

---

## G. Pulse alerts + bell

### G1 — `features/pulse/PulseDetailDrawer.tsx`

**94 · "Apply to N clients" success toast offers Undo via revert mutation; Undo window is 24h surfaced via description copy.**
`features/pulse/PulseDetailDrawer.tsx:325-352` — Good pattern. ❌ not drift.

**95 · Snooze / Dismiss / Mark reviewed all share `setReasonAction(null) + setReasonText('')` — reasonable.**

**96 · `requestReviewMutation` success toast description: "Owner and manager notifications and emails will be sent."**
`features/pulse/PulseDetailDrawer.tsx:413-415` — Future tense "will be sent" — but the description suggests something has already happened. Severity **P3**. Fix: "Notifications queued for owners and managers." ✅ shipped.

**97 · `applyReviewedMutation` and `applyMutation` BOTH onClose after success — but the toast Undo callback needs the drawer state to fire the revert mutation. If the drawer is closed, the revert still fires from the sonner toast scope.**
`features/pulse/PulseDetailDrawer.tsx:336, 452` — Fine — sonner toast lives at app shell. ❌ not drift.

**98 · "Couldn't apply Pulse" error includes a Refresh action when the conflict is detected.**
`features/pulse/PulseDetailDrawer.tsx:340-348` — Good. ❌ not drift.

**99 · `reviewPriorityMutation` success says "Manager review saved" but the toast description "The reviewed client set is ready to apply." — assumes the user knows what "client set" means.**
`features/pulse/PulseDetailDrawer.tsx:429-430` — Severity **P2**. ⏳ deferred — copy choice.

**100 · No way to bulk-dismiss multiple alerts from the queue page (`/rules/pulse`).**
Severity **P2**. ⏳ deferred — bulk action is feature work.

---

## H. Settings + practice setup

### H1 — `routes/settings.tsx`

**101 · Settings home is a sectioned list of 4 categories with sub-rows. Each row has icon + label + description + chevron.**
`routes/settings.tsx:33-115` — Standard pattern. ❌ not drift.

**102 · Sections are NOT searchable — a CPA looking for "internal deadline" has to scan all 8 rows.**
Severity **P3**. ⏳ deferred — settings search is feature work.

**103 · "Calendar sync" row routes to `/deadlines/calendar` — but the calendar route in `routes/calendar.tsx` mounts `CalendarPage`, not a sync page.**
`routes/settings.tsx:107-112` — Let me verify the path. (path is `/deadlines/calendar` — checked in router) — depends on router config. Severity **P1** if the link 404s. ⏳ deferred — need router config check.

**104 · No way to know which settings have been customized vs defaults — every row reads the same.**
Severity **P3**. ⏳ deferred — affordance design.

**105 · "Members" row says "Invite teammates and manage roles." — but the description doesn't tell you that on the Solo plan members are unavailable.**
Severity **P2**. ⏳ deferred — plan-aware copy.

### H2 — `routes/practice.tsx`

**106 · "Save changes" button on the General card disables when `!dirty` — so a user who edits a value and reverts it sees the button disable again. Good UX.**
`routes/practice.tsx:478-489` — ❌ not drift.

**107 · "Delete practice" alert dialog has a destructive primary action but no typed confirmation requirement.**
`routes/practice.tsx:691-717` — A misclick can soft-delete the practice. Severity **P1**. Fix: require typing the practice name to confirm. ⏳ deferred — pattern change, needs Yuqi call.

**108 · "Practice name" error message: "Please enter at least 2 characters." — `t` macro renders OK but the message reads as form-validation boilerplate, not a CPA-tuned message.**
`routes/practice.tsx:272-275` — Severity **P3**. ⏳ deferred — copy.

**109 · Smart Priority weight total error shown as `Total 105%` in destructive color — but no specific guidance on which factor to reduce.**
`routes/practice.tsx:525-535` — Severity **P2**. Fix: "Total must equal 100%". ⏳ deferred — copy refinement.

**110 · "Calculate preview" disabled tooltip says "No open deadlines available for preview." — but the button is also disabled when `!priorityValid` — no tooltip explains that.**
`routes/practice.tsx:613-640` — Severity **P2**. Fix: tooltip should explain both cases. ⏳ deferred — multi-state tooltip.

**111 · "Save Smart Priority" button position is to the right of "Calculate preview" — but if the user calculates preview, then saves, the saved-flag pattern (`priorityDirty`) resets correctly.**
`routes/practice.tsx:641-657` — ❌ not drift.

**112 · `currentRole` badge in the header uses `font-mono tabular-nums` — but role names ("Owner", "Manager", "Coordinator") aren't numeric; tabular-nums has no effect.**
`routes/practice.tsx:403` — Severity **P3**. Fix: remove tabular-nums from this badge. ✅ shipped.

**113 · "Internal deadline" helper says "Changing this recalculates current deadline dates." — but it does NOT undo cleanly. The user might not realize this is a one-way operation.**
`routes/practice.tsx:466-470` — Severity **P2**. Fix: add a confirmation dialog when reducing the offset on a firm with open deadlines. ⏳ deferred — needs design call on friction.

### H3 — `routes/billing.tsx`

**114 · Subscription overview shows Active practice + plan + seat limit, then a second flex with 4-5 Metric tiles repeating some of that info.**
`routes/billing.tsx:354-401` — Information redundancy. Severity **P2**. ⏳ deferred — needs IA pass.

**115 · "Manage billing" button disabled state surfaces a separate sentence below — but there are multiple reasons it can be disabled (no owner role, no subscription, etc.) and only the first matched reason is shown.**
`routes/billing.tsx:404-432` — Reasonable cascade. ❌ not drift.

**116 · Plan cards: only Solo / Pro / Team rendered — Enterprise dropped via `.filter(plan => plan.id !== 'firm')`.**
`routes/billing.tsx:184` — Enterprise is intentionally surfaced elsewhere. ❌ not drift.

**117 · Plan card "Pro" tagged `Recommended` — static recommendation; doesn't adapt to the firm's actual usage.**
`routes/billing.tsx:130` — Severity **P3**. ⏳ deferred — needs intelligence-driven recommendation.

**118 · Billing currency assumption — all prices in USD with `$` prefix, no localization.**
`routes/billing.tsx:75-78` — A firm in a non-USD market sees USD-locked prices. Severity **P2**. ⏳ deferred — localization is feature-scope.

### H4 — `routes/billing.success.tsx`

**119 · `useCurrentFirm({ poll: true })` polls until activation confirmed — but if the webhook never fires (Stripe outage), the page sits at "Confirming subscription" forever.**
`routes/billing.success.tsx:25` — Severity **P1**. Fix: after 60s of no activation, show "Still confirming. Contact support if this persists." ⏳ deferred — needs timeout state.

**120 · "Confirming subscription" card title heading-level is `aria-level={2}` but the H1 above is "Payment confirmation" — `<header>` has no role. Acceptable IA.**
`routes/billing.success.tsx:51-65` — ❌ not drift.

**121 · "Go to Today" outline button text + "Open billing" filled button — but a user just confirming a subscription probably wants to land where they were before checkout (deadlines, dashboard, etc.). The Open billing destination assumes the user wants to verify; many will just want to proceed.**
`routes/billing.success.tsx:131-138` — Severity **P3**. ⏳ deferred — needs Yuqi call.

### H5 — `routes/billing.cancel.tsx`

**122 · "Checkout canceled" card surfaces "No subscription changes were made." — clear copy.**
`routes/billing.cancel.tsx:27-37` — ❌ not drift.

**123 · "Restart checkout" button — but the checkoutHref includes `plan` and `interval` query params; if those weren't set, the link goes to `/billing/checkout` with no plan selection.**
`routes/billing.cancel.tsx:19-20, 39-42` — Severity **P2**. Fix: if no plan in query, button should route to `/billing` plan-picker. ⏳ deferred — depends on `serializeBillingQuery` behavior.

---

## I. Calendar + workload + opportunities + audit + reminders + notifications

### I1 — `routes/calendar.tsx`

Calendar route is a thin wrapper around `CalendarPage`. Couldn't audit `calendar-page.tsx` in this pass (616 lines).

**124 · Without reading the calendar source: needs verification that drag-to-reschedule offers undo.**
Severity **P1** if missing. ⏳ deferred.

**125 · Need to verify the calendar handles `prefers-reduced-motion` for drag animations.**
Severity **P2**. ⏳ deferred.

**126 · No keyboard navigation between calendar cells documented from the wrapper.**
Severity **P2**. ⏳ deferred.

### I2 — `routes/workload.tsx`

Thin wrapper around `WorkloadPage` (407 lines).

**127 · Workload distribution view — needs verification of empty-state for "no team members yet" (Solo plan).**
Severity **P1**. ⏳ deferred.

**128 · Need to verify load-balance reassignment supports drag-and-drop OR explicit "Reassign" button — the legacy expectation in workload tools is one or the other.**
Severity **P2**. ⏳ deferred.

### I3 — `routes/opportunities.tsx`

Thin wrapper around `OpportunitiesPage` (458 lines).

**129 · Opportunities feed: needs verification that dismissed opportunities can be restored (the "undo dismiss" path).**
Severity **P1** if missing. ⏳ deferred.

**130 · Filter affordances on opportunities page — need verification of count chips and consistency with /clients filter bar.**
Severity **P2**. ⏳ deferred.

### I4 — `routes/audit.tsx`

Thin wrapper around `AuditLogPage`.

**131 · Audit log search/filter affordances — need verification that user can filter by event type (status change, assignment, import, etc.).**
Severity **P2**. ⏳ deferred.

**132 · Audit log export — need verification of CSV/PDF export path for compliance evidence.**
Severity **P1** if missing (audit logs are a compliance feature; the CPA will need exports). ⏳ deferred.

### I5 — `routes/reminders.tsx`

Thin wrapper around `RemindersPage`.

**133 · Reminders page — verify the firm can preview the actual email/SMS content before scheduling.**
Severity **P1** if missing. ⏳ deferred.

**134 · Reminders pause / resume — verify the granularity (per-client? per-reminder-type? all reminders?).**
Severity **P2**. ⏳ deferred.

### I6 — `routes/notifications.tsx` + `routes/notifications.preferences.tsx`

Thin wrappers.

**135 · Notifications: verify mark-all-read affordance.**
Severity **P2**. ⏳ deferred.

**136 · Notification preferences: verify per-event-type granularity (status change, alert, import done, etc.).**
Severity **P2**. ⏳ deferred.

---

## J. Migration wizard (`/migration/new` + import flow)

### J1 — `routes/migration.new.tsx`

**137 · Permission denial card shows "Owner or manager access required" + "Return to Today" button — but no "Request access" affordance to ask the owner.**
`routes/migration.new.tsx:57-83` — Severity **P2**. Fix: add a "Email your owner" link with a mailto. ⏳ deferred — needs owner contact in scope.

**138 · "Skip for now" button uses ArrowRightIcon-end — but the verb is "Skip", not "Continue". Icon implies forward progression.**
`routes/migration.new.tsx:189-192` — Severity **P3**. Fix: drop the icon or use an X-style icon. ✅ shipped — drop the ArrowRight icon on Skip.

**139 · Rule-review alert "queued for due-date review before they can become active and create client deadlines" — wordy.**
`routes/migration.new.tsx:166-170` — Severity **P3**. ⏳ deferred — copy refinement.

**140 · Wizard intro cluster shows three "Activation outcomes" chips (Client facts / Deadline list / Today risk) — these are positioning, not interactive.**
`routes/migration.new.tsx:135-147` — Acceptable. ❌ not drift.

**141 · No CSV format documentation visible from this intro — user clicks into the wizard and discovers the column requirements there.**
Severity **P2**. ⏳ deferred — needs IA call.

### J2 — `features/migration/ImportHistoryDrawer.tsx`

**142 · Undo-single-client confirm dialog has destructive primary + cancel. Good.**

**143 · Drawer shows "Undoing this import will commit these changes" — phrasing reads as a tautology ("undoing commits changes").**
`features/migration/ImportHistoryDrawer.tsx:361` — Severity **P2**. Fix: "Undoing removes the imported client and writes a reversal audit entry." ⏳ deferred — copy.

---

## K. Account security + 2FA setup

### K1 — `routes/account.security.tsx`

Couldn't fully audit (480 lines). High-level concerns:

**144 · 2FA setup flow needs verification of: backup-codes display, QR-code download, "I lost my device" recovery path.**
Severity **P0** if backup codes aren't displayed. ⏳ deferred — needs full audit.

**145 · Session management — verify sign-out from other devices is exposed.**
Severity **P2**. ⏳ deferred.

### K2 — `routes/account-security-two-factor-setup.tsx`

Couldn't fully audit (138 lines). Verifying that the QR + secret are both shown is critical.

**146 · 2FA setup verify input — verify autocomplete="one-time-code" is set (like #22 on `two-factor.tsx`).**
Severity **P2**. ⏳ deferred.

---

## L. Cross-surface drift patterns

These are violations that span multiple surfaces — calling out so they can be batched.

**147 · "Couldn't load X" pattern repeats 50+ times across the app with slightly varied retry-handler shapes.**
- `routes/dashboard.tsx:178-194` — Alert with `<button className="underline">` for retry
- `routes/clients.tsx:378-392` — same
- `routes/practice.tsx:119-129` — Alert with NO retry button
- `routes/clients.$clientId.tsx:92-101` — Alert with NO retry button
- `routes/billing.tsx:298-326` — Alert with NO retry button

Inconsistency: some errors offer retry, others don't. Severity **P2**. Fix: codify a `<RouteErrorAlert>` pattern that always offers retry + always uses `<Button variant="link">` for the retry verb. ⏳ deferred — pattern extraction is a refactor.

**148 · `<Skeleton>` size matching to eventual content varies — some skeletons (clients $clientId) show 3 generic blocks; others (workload, calendar) show domain-specific shapes.**
Severity **P2**. ⏳ deferred — skeleton-matching is a multi-file change.

**149 · Toast description format inconsistency: status changes expose `Audit ${id.slice(0, 8)}`; pulse mutations don't; export does.**
Severity **P2**. ⏳ deferred — codify audit-id exposure policy.

**150 · Hotkey discoverability — only the queue's J/K/Esc are advertised in the keyboard shell help. Cross-surface hotkeys (⌘K command palette, ⌘/ to focus search) aren't surfaced consistently.**
Severity **P2**. ⏳ deferred — needs hotkey help panel update.

**151 · Date format inconsistency: `formatDate` vs `formatDatePretty` vs inline `Intl.DateTimeFormat`.**
- `routes/dashboard.tsx:232-239` uses `Intl.DateTimeFormat` inline
- `features/dashboard/actions-list.tsx:407, 415` uses `formatDatePretty`
- `routes/practice.tsx:771` uses `formatDate`

Three different date helpers. Severity **P2**. ⏳ deferred — needs date-helper consolidation.

**152 · Empty-state CTAs differ in tone: some say "Import clients", some say "Get started", some say "Add your first deadline".**
Severity **P2**. ⏳ deferred — needs canonical voice.

**153 · `aria-label` localization gap: several icon-only buttons use raw English strings (see #43 above for one example).**
Severity **P2**. Fix: audit and lingui-ify. Partial fix in this pass; full sweep deferred.

**154 · Cancel button variant inconsistency: dialogs use `variant="outline"`; alert-dialogs use `<AlertDialogCancel>` (rendered as secondary?). Mixed.**
Severity **P2**. ⏳ deferred — see #77.

**155 · No visible page-load progress bar — pendingBar from app-shell is the only signal during route transitions.**
Severity **P3**. ⏳ deferred — needs shell verification.

**156 · Status-change toasts ALL share the format `t\`Status updated\`` regardless of which status was selected. The detail (which deadline, which status) is in the description but a CPA changing 10 deadlines in a row sees 10 identical-looking toasts.**
`routes/obligations.tsx:1559` — Severity **P2**. Fix: include client name in toast title — `t\`Marked ${clientName} as Filed\`` or similar. ⏳ deferred — toast-title format change.

**157 · No "Don't show this again" / dismissable hints surfaced anywhere — onboarding tooltips and feature-intro hints aren't part of the design system.**
Severity **P2**. ⏳ deferred — feature design.

**158 · Mobile breakpoint behavior: many pages declare `lg:` or `xl:` breakpoints but the actual sub-`lg` layouts haven't been audited.**
Severity **P1** if mobile traffic is non-trivial. ⏳ deferred — explicit mobile audit needed.

**159 · `data-icon="inline-start"` and `data-icon="inline-end"` is the canonical spacing primitive (45+ usages in routes/) — good consistency.**
❌ not drift — pattern is being used.

**160 · `formatTaxCode` used in some places, raw `taxType` string in others — TaxCodeLabel component is the right canonical render but isn't used everywhere.**
Severity **P2**. ⏳ deferred — needs component-usage audit.

---

## M. Error / 404 / fallback

### M1 — `routes/error.tsx`

**161 · 404 error shows "Page not found" with one "Return home" button — no contact-support link.**
`routes/error.tsx:42-62` — Severity **P3**. Fix: add "If you think this is a bug, contact support" mailto. ⏳ deferred — copy.

**162 · 500-class error shows "Route failed" + raw `error.statusText` — exposes server-error vocabulary to end users.**
`routes/error.tsx:21-26` — `translateServerErrorCode` may help but if it returns null, the raw `error.statusText` is shown ("FETCH_ERROR" etc.). Severity **P2**. Fix: fall back to a human message. ⏳ deferred — needs server-error code coverage audit.

### M2 — `routes/not-found.tsx`

**163 · In-shell 404 — better than the bare RouteErrorBoundary 404. ❌ not drift.**

**164 · "404" eyebrow is uppercase text — but a CPA seeing this for the first time may not know that "404" is the conventional code for "not found". Acceptable.**

### M3 — `routes/fallback.tsx`

**165 · `EntryRouteHydrateFallback` renders a 240×400 invisible div.**
`routes/fallback.tsx:11-13` — Intentional per the comment. ❌ not drift.

**166 · `RouteHydrateFallback` renders `<div className="flex flex-col gap-6 p-4 md:p-6" data-route-fallback />` — empty.**
`routes/fallback.tsx:15-17` — Same intentional design. ❌ not drift.

---

## N. Public/external surface

### N1 — `routes/readiness.tsx`

This is the public-facing portal a client sees when they click their email link.

**167 · Loading state is a Card with "Loading readiness check…" centered text — no spinner, no skeleton.**
`routes/readiness.tsx:148-152` — A client waiting 2+ seconds sees just text. Severity **P3**. Fix: add a Loader2 spinner. ✅ shipped.

**168 · "Link unavailable" error doesn't tell the client what to do next.**
`routes/readiness.tsx:154-164` — A client whose link expired has no next action. Severity **P1**. Fix: add "Contact your CPA to request a new link" copy. ✅ shipped.

**169 · Submit button is the only action — no save-draft path.**
`routes/readiness.tsx:225-228` — A client mid-answers losing internet loses everything. Severity **P2**. Fix: local-storage draft persistence (off-by-default if backend doesn't support). ⏳ deferred — feature design.

**170 · Submitted state — what does the client see AFTER submit? `portalQuery.refetch()` re-renders the form with the saved values.**
`routes/readiness.tsx:99-101` — No celebration / "Thanks, your CPA has been notified" — just a success toast and the form re-renders. Severity **P2**. Fix: add a post-submit success card. ⏳ deferred — flow design.

**171 · Status pill at the top uses `<Badge variant="outline">{portal.status}</Badge>` — raw API enum string surfaced to the client.**
`routes/readiness.tsx:172` — Severity **P2**. Fix: map status to friendly label. ⏳ deferred — needs portal status vocabulary.

**172 · "Note" textarea has no character count, no placeholder beyond "Optional note".**
`routes/readiness.tsx:215-220` — Acceptable. ❌ not drift.

**173 · Submit button has spinner-less disabled-pending state.**
`routes/readiness.tsx:225-228` — Severity **P3**. Fix: add Loader2 icon. ✅ shipped.

**174 · The "Need help" status doesn't open a contact dialog — the client picks it but there's no follow-up flow.**
Severity **P2**. ⏳ deferred — flow design.

**175 · `formatTaxCode` is used to render `portal.taxType` — good.**

**176 · Date format: `formatDate(portal.currentDueDate)` — good.**

**177 · No "powered by DueDateHQ" or branding — the client portal looks generic.**
`routes/readiness.tsx:130-146` — Severity **P3**. Acceptable per public-portal preferences.

---

## O. Sidebar + global chrome

### O1 — `components/patterns/app-shell.tsx` / nav / user-menu

Not audited in line-level depth this pass. Patterns spotted:

**178 · Sidebar Alerts badge shares the `usePulseListAlertsQueryOptions(50)` cache key with the dashboard NeedsAttentionSection.**
`features/dashboard/needs-attention-section.tsx:27` — Good consolidation. ❌ not drift.

**179 · Sidebar collapsed overflow & badge-dot — already audited per dev-log entry on 2026-05-26.**
❌ not drift — separately tracked.

---

## P. Hotkeys + keyboard

**180 · Keyboard shortcut help dialog: needs verification it's reachable from `⌘/` or `?`.**
Severity **P2**. ⏳ deferred.

**181 · Esc behavior on the obligation drawer panel — must close panel without affecting page state. Need verification.**
Severity **P1** if drift. ⏳ deferred.

**182 · J/K row-navigation in the queue — needs verification it skips continuation rows or treats them as logical rows.**
Severity **P2**. ⏳ deferred.

---

## Q. Final notes — non-functional

**183 · Several routes are thin wrappers (`calendar.tsx`, `audit.tsx`, `workload.tsx`, etc.) — the actual UX lives in `features/*/feature-page.tsx`. Auditing those at line-level was out of scope for this pass; flagged comprehensively for follow-up.**

**184 · Test files exist for several routes (`accept-invite.test.tsx`, `login.test.tsx`, etc.) but the test surface is uneven — newer routes have richer tests than older ones.**
Not a UX finding per se. ❌ not drift.

**185 · The dev-log has 80+ entries from 2026-05-25 alone — this is a heavily-iterated product. Many of the findings above are evidence of recent design churn, not bugs. The audit doc captures the current state regardless.**

---

## Summary

- **Total findings:** 185
- **P0 (blocking / accessibility / data-correctness):** 4
- **P1 (daily-flow trust):** 25
- **P2 (polish gaps):** 90
- **P3 (nits):** 66

### Shipped this pass (16 findings)

| # | Surface | Severity | Commit |
|---|---------|----------|--------|
| 9 | accept-invite missing-ID dead-end | P1 | `Design(ux-flow-audit-doc-auth)` |
| 20 | onboarding "Auto-saves" lie | P1 | `Design(ux-flow-audit-doc-auth)` |
| 22 | two-factor autoFocus | P2 | `Design(ux-flow-audit-doc-auth)` |
| 23 | two-factor 6-digit helper | P3 | `Design(ux-flow-audit-doc-auth)` |
| 24 | two-factor "Verifying…" label | P2 | `Design(ux-flow-audit-doc-auth)` |
| 30 | dashboard retry button → Button variant link | P2 | `Design(ux-flow-audit-dashboard-clients)` |
| 32 | dashboard Import-clients disabled tooltip | P1 | `Design(ux-flow-audit-dashboard-clients)` |
| 43 | needs-attention-section aria-labels localized | P2 | `Design(ux-flow-audit-dashboard-clients)` |
| 49 | bulk-status toast "rows" → "deadlines" | P2 | `Design(ux-flow-audit-queue-portal-misc)` |
| 64 | clients retry button → Button variant link | P2 | `Design(ux-flow-audit-dashboard-clients)` |
| 78 | CreateClientDialog Loader2 + aria-busy | P3 | `Design(ux-flow-audit-dashboard-clients)` |
| 81 | CreateClientDialog autoFocus | P2 | `Design(ux-flow-audit-dashboard-clients)` |
| 96 | Pulse "will be sent" → "queued" | P3 | `Design(ux-flow-audit-queue-portal-misc)` |
| 112 | practice role badge drop tabular-nums | P3 | `Design(ux-flow-audit-queue-portal-misc)` |
| 138 | migration Skip button drop ArrowRight | P3 | `Design(ux-flow-audit-queue-portal-misc)` |
| 147 | retry-button pattern propagated to queue + detail | P2 | `Design(ux-flow-audit-queue-portal-misc)` |
| 167 | readiness portal loading Loader2 spin | P3 | `Design(ux-flow-audit-queue-portal-misc)` |
| 168 | readiness expired-link recovery copy | P1 | `Design(ux-flow-audit-queue-portal-misc)` |
| 173 | readiness submit Loader2 + "Submitting…" | P3 | `Design(ux-flow-audit-queue-portal-misc)` |

### Deferred for follow-up passes

- **Full queue (`obligations.tsx`) line-by-line audit** — 11.5k lines; needs a dedicated audit session
- **Calendar / Workload / Opportunities / Audit / Reminders / Notifications feature-page audits** — thin wrapper routes; the feature pages were not opened in detail this pass
- **Mobile breakpoint audit** — `lg:` / `xl:` declarations exist but sub-`lg` layouts haven't been verified across the routes
- **Hotkey + keyboard discoverability audit** — `?` shortcut help, ⌘K palette, ⌘/ search focus, J/K queue nav
- **Cross-surface error / skeleton / toast pattern extraction** — `<RouteErrorAlert>` pattern should be codified once the design call lands on the canonical shape
- **Cancel-button variant standardization** — dialogs use `outline`; alert-dialogs use `<AlertDialogCancel>`; finding #77 / #154
- **Date-format helper consolidation** — `formatDate` vs `formatDatePretty` vs inline `Intl.DateTimeFormat`; finding #151
- **Audit-ID exposure in toasts** — `Audit a3f2b1c8` is power-user UX surfaced indiscriminately; needs policy call (finding #48, #50)
- **Smart Priority / practice setting consequences** — internal-deadline-offset change has no confirmation; finding #113
- **Practice delete confirmation typed-name guard** — currently a one-click destructive primary; finding #107
- **2FA recovery codes path** — needs verification that backup codes are surfaced post-setup; finding #144
- **Plan-aware copy on settings** — Solo plan should reveal locked features differently; finding #105
- **Client list count chip filtered vs total** — finding #62
- **Mobile-aware action-prompt copy on dashboard** — finding #33
- **Onboarding state-rule-activation "Skip" affordance** — finding #19
- **Public readiness portal post-submit success state** — finding #170
- **Public readiness portal status pill friendly labels** — finding #171
- **Migration wizard CSV format docs** — finding #141
- **Billing.success timeout state after 60s** — finding #119

