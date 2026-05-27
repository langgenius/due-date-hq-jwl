# 2026-05-27 — Audit drain pass 1, batch 1 (4 findings: Q8.2, F4-01, F4-04, F8-01)

## Why

The Step 6-cont + Step 7 audits surfaced four unshipped findings — three rated
P0 — that share a common shape: pure-UI/JSX fixes, single-file scope, no
server contract or schema change. Bundling them as the first drain-pass batch
verifies the audit-drain workflow before tackling deeper findings (cross-route
consistency sweep, permission-state matrix, AI-checklist provenance).

All four landed in the post-PR-30 main branch as still-open per the master
findings index (`docs/dev-log/2026-05-27-findings-master-index.md`). The Q8.2
line numbers in the source dev-log were stale (the file shrunk ~370 lines
since the audit was written) but the popover itself was unchanged; the bug
was live.

## What

### Q8.2 — Calendar URL Regenerate confirmation (P0)

`apps/app/src/routes/obligations.tsx` — `CalendarSyncPopover`. The in-queue
Calendar-sync popover's Regenerate button fired the mutation immediately.
Regenerating invalidates the user's iCal feed URL on every device — Apple
Calendar, Google Calendar, Outlook subscriptions silently stop syncing — and
the only signal is a success toast. A user accidentally clicking Regenerate
loses all calendar sync until they re-share the new URL.

Mirrored the canonical pattern from
`apps/app/src/features/calendar/calendar-page.tsx:215-286` (the dedicated
`/calendar` route, which already gates Regenerate behind an `AlertDialog`):

- Added `regenerateConfirmOpen` local state.
- Regenerate button now opens the confirmation dialog instead of firing.
- The `AlertDialog` carries `<DestructiveChangePreview>` with the same
  three-line invalidates/issues/keeps preview as `/calendar`, so the two
  surfaces feel like the same product behavior.
- `destructive-primary` action button with `Loader2` spinner during pending.
- All copy reused from `calendar-page.tsx` source strings where applicable
  (so msgid de-dupe minimizes the translation surface).

Imports added: `AlertDialog` family from `@duedatehq/ui` and
`DestructiveChangePreview` from `@/components/patterns/destructive-change-preview`.

Did NOT touch the hand-rolled scrim (Q8.1) — that needs verification that
the Popover primitive's outside-click closes correctly before stripping the
backdrop. Out of scope for this batch.

### F4-01 — TOTP recovery codes acknowledgement gate (P0)

`apps/app/src/routes/account-security-two-factor-setup.tsx` —
`TwoFactorSetupPanel`. Recovery codes are displayed once during setup. The
"Verify and enable" CTA was enabled the moment 6 TOTP digits were entered
— the user could finish 2FA setup without ever copying or writing down the
recovery codes. When their phone breaks weeks later they discover the
lockout. This is the most-regretted UX in 2FA enrollment across the
industry.

Added:

- `acknowledgedCodes` local state on the panel.
- A `Checkbox` + `Label` below the recovery codes block:
  "I've saved these recovery codes somewhere safe. I know they won't be
  shown again."
- `disabled={verifyPending || code.trim().length < 6 || !acknowledgedCodes}`
  on the Verify CTA.

Local state on the panel was the right home — the parent component just
needs the verify event. No parent-component changes required.

### F4-04 — Copy URI / recovery-codes inline feedback (P1, same file)

Same file as F4-01. The Copy URI and Copy buttons both relied on the
parent's toast for feedback. Toast is the canonical confirmation across
the app but for a Copy button next to the value being copied, inline
"Copied" feedback on the button itself is the user-expected pattern
(matches Stripe, Linear, GitHub).

Added:

- `copiedField: 'uri' | 'codes' | null` local state.
- Wrapped the two existing parent callbacks (`onCopySetupUri`,
  `onCopyBackupCodes`) so the panel can swap the button label after
  invoking them.
- `useEffect` 2-second timer resets the field.
- On success the button label swaps to `CheckIcon + "Copied"` for 2s,
  then reverts to the original label.

The parent already toasts on failure, so if `navigator.clipboard.writeText`
throws, the user sees correct feedback via toast (and the inline "Copied"
is a mild false-positive — acceptable trade for the simpler code path).

### F8-01 — Billing checkout headline names the plan (P0)

`apps/app/src/routes/billing.checkout.tsx`. The H1 read "Confirm checkout"
generically; the user had to scan down to the Plan summary card to see
which plan they were about to confirm. First-impression failure on a
payment-confirmation surface.

Promoted `view.label` + `interval` into the title:

- Yearly: "Confirm {Plan} yearly checkout"
- Monthly: "Confirm {Plan} monthly checkout"

Branched two `<Trans>` strings instead of one with a parens interval —
both forms read more naturally to translators and the rendered UI is
cleaner ("Confirm Pro yearly checkout" vs "Confirm Pro (yearly) checkout").

Breadcrumb still reads "Confirm checkout" (location is location; the title
carries the detail).

## i18n

Five new zh-CN translations added to
`apps/app/src/i18n/locales/zh-CN/messages.po`:

| msgid | zh-CN |
| ----- | ----- |
| `Confirm {0} monthly checkout` | `确认 {0} 月付支付` |
| `Confirm {0} yearly checkout` | `确认 {0} 年付支付` |
| `Copied` | `已复制` |
| `Every device subscribed to the current URL will silently stop syncing. You'll need to share the new URL with everyone who had the old one.` | `所有订阅当前 URL 的设备都会停止同步。你需要把新的 URL 分享给持有旧 URL 的人员。` |
| `I've saved these recovery codes somewhere safe. I know they won't be shown again.` | `我已将这些恢复代码保存在安全的地方。我知道它们不会再次显示。` |

The other Q8.2 strings (`Regenerate calendar URL?`, the three
`DestructiveChangePreview` lines, `Regenerate URL`, `Regenerating…`,
`Cancel`) are msgid-identical to `calendar-page.tsx`'s shipped translations
and de-dupe automatically through Lingui's catalog. `pnpm i18n:compile`
passes in `--strict` mode.

## Verification

- `cd apps/app && pnpm exec tsc --noEmit` — clean.
- `pnpm i18n:extract` — 5 new msgids; all 5 translated.
- `pnpm i18n:compile` — strict-mode pass.
- Browser verification of each surface — pending (next step before commit).

## What's NOT in this batch

- F9-01 (`/calendar` empty state) — deferred. Step 6-cont's F7.1 walked the
  actual file and noted `features/calendar/calendar-page.tsx` is iCal-feed
  management, not a deadline grid. F9-01's premise ("empty calendar grid")
  is partially mis-framed; the fix needs investigation of which surface a
  zero-deadline user actually sees on `/calendar` before dropping in a
  `SharedEmptyState`.
- F-008 / F-035 (AI provenance, audit-log AI actor) — both need DB
  migration + RPC handler + contracts work. Deserve their own dedicated
  batch.
- #144 (2FA backup-codes investigation) — verification work, not a fix.

Next batch will likely combine more Step 6-cont mechanical P0/P1 items
plus an exploratory pass on the permission-state matrix.
