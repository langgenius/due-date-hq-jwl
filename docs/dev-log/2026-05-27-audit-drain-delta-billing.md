# 2026-05-27 — Audit drain (Agent δ — billing / practice / members)

Branch: `design/audit-drain-delta-billing` (off batch-1 commit `c583b334`).
Scope: billing (non-checkout), practice settings, members. Hard cap 10 shipped findings.

## Context

Master findings index pass batched the high-volume drain work across four parallel agents. δ owns the billing-tail + practice + members slice. `billing.checkout.tsx` is locked (batch 1 touched the H1/PageHeader block) and is skipped entirely here. Most member-page findings (F6.1-F6.4) verified as already-shipped during a quick read pass; only F6.5 (per-role description in the invite Select) was the new mechanical opportunity.

## Shipped (10)

### `apps/app/src/features/members/members-page.tsx`

- **F6.5 — Role Select gained per-role descriptions.** The MANAGED*ROLES SelectItem list used to render only `roleLabel(item)`. The user changing the invite role saw no inline scope summary; the page-level helper text below the picker described all roles generically. Now each `<SelectItem>` is a two-line stack (label + scope summary) so the user sees WHICH role does WHAT at the moment of choice. Helper text below the picker reduced to the one fact the dropdown can't carry: "Owner stays read-only and can't be invited from here." New helper `inviteRoleDescription(role, i18n)` uses `msg` + `i18n.*()`(parameterized`t` inside helpers bypasses the macro extractor).

### `apps/app/src/routes/practice.tsx`

- **#108 — Practice-name validation copy.** Was `"Please enter at least 2 characters."` (form-validation boilerplate). Now `"Practice name needs at least 2 characters — this is your firm's display name across DueDateHQ."` — CPA-tuned framing that anchors the user in why the name matters.
- **#109 — Smart Priority weight total spells out the delta.** When `weightTotal !== 100` the previous shape only showed the destructive-color "Total NNN%" pill, leaving the user to guess by how much to nudge. Now a second line spells out the delta + direction: `"Reduce factors by 5% to balance"` or `"Add 5% across factors to balance"`. Branches on `> 100` vs `< 100`.
- **#110 — Preview button now explains BOTH disabled reasons.** Was: tooltip only fired for `openObligationCount === 0`. The `!priorityValid` branch silently disabled the button with no tooltip. Now `previewDisabledReason` is a precedence cascade: invalid weights message takes priority (the user just changed it), then no-deadlines message, then `null`. Invalid case reads: `"Fix the Smart Priority inputs above before previewing — weights must total 100% and ranges must be valid."`
- **#112 — VERIFIED (already shipped).** `currentRole` badge dropped `tabular-nums`. Comment in source confirms the previous pass; current className is `"font-mono text-xs"`.
- **#113 — Internal-deadline helper now says it's one-way.** Added a second helper paragraph in `text-text-warning` color: `"Note: changes can't be reverted automatically — adjusting this back later won't restore prior deadline dates. Historical audit entries stay intact."` The second sentence reassures CPAs that the audit log isn't lost.
- **#107 — Delete-practice typed confirmation.** Added a `deleteConfirmName` state, an `<Input id="delete-practice-confirm">` that displays the firm name inline (mono font for copy-confirmation), and gated the `AlertDialogAction.disabled` so the destructive primary requires `deleteConfirmName.trim() === firm.name`. Dialog `onOpenChange` clears the input on close so a re-open never starts pre-confirmed. Matches the GitHub / Linear / Vercel pattern.

### `apps/app/src/routes/billing.cancel.tsx`

- **#123 — Restart-checkout fallback.** Was: if the query had no `plan` (bookmarked cancel URL or stripped params), the link still routed to `/billing/checkout` — a dead end. Now `hasPlanSelection = Boolean(plan)` branches the destination: with a plan → `/billing/checkout?plan=…&interval=…` ("Restart checkout"); without → `/billing` plan-picker ("Choose a plan"). The CardContent copy switches to match.

### `apps/app/src/routes/billing.success.tsx`

- **#121 — Primary CTA reordered.** Was: filled "Open billing" first, outline "Go to Today" second. The post-checkout user wants to get back to work, not verify line items. Now filled "Go to Today" (with `ArrowRightIcon` end-aligned) is the primary; outline "Open billing" is the secondary path for anyone who landed here intentionally to inspect invoices.
- **#119 — 60-second activation timeout.** Was: `useCurrentFirm({ poll: true })` polled forever; if a Stripe webhook silently dropped, the user sat on "Confirming subscription" indefinitely. Added `ACTIVATION_TIMEOUT_MS = 60_000` + `activationTimedOut` state managed by a `useEffect` that fires once `activated || statusError` is still false at the deadline. After timeout, the alert swaps to `variant="warning"` with `AlertTriangleIcon`, a clearer headline ("Still confirming — taking longer than usual"), an explanation pointing to refresh + support, and a "Refresh now" button that does `window.location.reload()`. Polling continues in the background — the timeout only changes messaging.

## Verified-shipped (5) — pre-existing, no new edit

- **F7-02** (`practice.tsx`) — Internal-deadline helper carries the recalculation warning. Confirmed line 478-479 already shows "Changing this recalculates current deadline dates."
- **F6.1** (`members-page.tsx`) — Invite onSuccess fires `toast.success(t\`Invite sent to ${sentTo}\`)`. Confirmed line ~1102.
- **F6.2** (`members-page.tsx`) — Cancel button is `variant="ghost"`. Confirmed line ~1198.
- **F6.3** (`members-page.tsx`) — Send invite has `aria-busy={inviteMutation.isPending}` + `<Loader2 className="animate-spin" />`. Confirmed line ~1205.
- **F6.4** (`members-page.tsx`) — Error display uses canonical `<Alert variant="destructive">` + `rpcErrorMessage()`. Confirmed line ~1179.

## Skipped — and why

- **F7-01** — Onboarding vs practice label style fork. Cross-page; risky alignment, needs Yuqi call.
- **F7-04** — Smart Priority preview empty state in two places. Token extraction is feature-shaped, not mechanical.
- **#114** — Subscription overview duplicated tiles. Needs IA pass, not safe inline.
- **#115** — "Manage billing" stacked disabled reasons. Existing cascade is reasonable; reshaping risks UX regression.
- **#116** — Enterprise dropped from plan cards. Intentional (surfaced elsewhere).
- **#117** — Pro "Recommended" static. Requires usage-data intelligence.
- **#118** — USD hardcoded. i18n infra work.
- **#120** — `aria-level={2}` heading. Already acceptable per audit.
- **`billing.checkout.tsx`** — Locked file (batch 1 territory).

## New zh-CN translations (16 msgids)

All filled with CPA-vocabulary translations: 截止日期 (deadline), 事务所 (practice/firm), 客户 (client), 审计 (audit), 套餐 (plan/tier), AI kept as-is. New strings:

- `Add {0}% across factors to balance. Weights must total 100%.`
- `Choose a plan`
- `Fix the Smart Priority inputs above before previewing — weights must total 100% and ranges must be valid.`
- `No plan was selected — choose one from Billing to start checkout.`
- `Note: changes can't be reverted automatically — adjusting this back later won't restore prior deadline dates. Historical audit entries stay intact.`
- `Owner stays read-only and can't be invited from here.`
- `Practice name needs at least 2 characters — this is your firm's display name across DueDateHQ.`
- `Principal authority — billing, members, full sign-off.`
- `Reduce factors by {0}% to balance. Weights must total 100%.`
- `Refresh now`
- `Reviews work and signs off on prepared filings.`
- `Schedules work and handles client intake — no preparation rights.`
- `Still confirming — taking longer than usual`
- `The payment provider hasn't confirmed the subscription yet. This usually clears within a minute. Refresh the page, or contact support if it persists.`
- `Type <0>{0}</0> to confirm`
- `Works assigned client deadlines and prepares filings.`

## Static checks

- `pnpm exec tsc --noEmit` — clean.
- `pnpm i18n:extract` — 2761 / 2761 translated.
- `pnpm i18n:compile --strict` — pass.
