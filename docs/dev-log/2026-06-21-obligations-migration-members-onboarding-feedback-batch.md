# Audited feedback batch: obligations / migration / members / onboarding / error

_2026-06-21_

A curated batch of pre-vetted P2/P3 design fixes across the obligations queue,
the migration wizard, the members page, onboarding, and the route error
boundary. Two themes: **in-flight protection** on async confirm/send buttons
(spinner + disabled so a double-click can't refire) and **blame-free, jargon-free
copy**.

## In-flight protection (P2 feedback)

- **`obligations.tsx` — `SignatureReminderDialog`**: the Send button already
  baked `!sending` into `canSend` but showed no spinner. Added the canonical
  `Loader2Icon animate-spin` + `aria-busy` + a "Sending…" label so the pending
  state reads.
- **`obligations.tsx` — `BulkExtensionDialog`**: same treatment on the confirm
  button (`aria-busy` + spinner + "Setting…" label).
- **`migration/Wizard.tsx` — "Undo import" confirm**: the destructive
  `AlertDialogAction` was already `disabled` while reverting (and the
  `onOpenChange` guard keeps the dialog open during the mutation), but it had no
  spinner. Added `Loader2Icon` + `aria-busy` + "Undoing…" (and the lucide import
  the file lacked).
- **`members/members-page.tsx`**: the four named destructive mutations. The
  confirm dialogs (remove / downgrade / suspend) were already `disabled` while
  pending. The two *direct-apply* paths — `reactivate` (menu item, no confirm)
  and a non-downgrade `updateRole` (the `RoleControl` select) — only relied on
  the table's `busy` prop, which lags a render. Added explicit
  `if (mutation.isPending) return` guards at both call sites so a fast second
  click can't refire before the disable lands.

## Copy (P2 / P3)

- **`members/members-page.tsx`** error titles, now active + blame-free + with a
  next step: "Members couldn't load" → **"We couldn't load your team. Retry."**;
  "Member action failed" → **"That change didn't go through. Try again."**
- **`obligations.tsx`** extension verb de-jargoned and made consistent across the
  three user-facing sites (More-menu item, dialog title, confirm button):
  "Decide extension" / "Decide extensions" → **"Set extension date"**.
- **`obligations.tsx`** empty-state title dropped its trailing period to match
  the other titles: "No deadlines match these filters." → **"No deadlines match
  these filters"**.
- **`onboarding.tsx`** field hints de-jargoned: "ISO date" → **"watch deadlines
  from"**; "drives alert + digest timing" → **"when reminders send"**.
- **`error.tsx`** route error boundary: "Route failed" (×3) → **"Something went
  wrong"** with a blame-free description ("We couldn't load this page. Try again,
  or head back home.") and a new **Try again** button (reload) alongside the
  existing Return home.

## Skipped (false positive / out of scope)

- **`MaterialsRequestPreviewDialog`** — the batch attributed this to
  `obligations.tsx`, but no such dialog exists there; it lives in
  `features/obligations/queue/dialogs.tsx`, outside this batch's file scope.
  Skipped.
- **`BulkConfirmDialog`** — not imported in `obligations.tsx` (it's a
  `components/patterns` primitive used by alerts), so the conditional in the
  brief ("if it's imported here; else skip") resolves to skip.

## i18n

New/changed strings extracted, 12 zh-CN translations added, compiled
`--strict` clean.

## Verify

`tsgo --noEmit` rc 0 · `vp run @duedatehq/app#build` success · i18n compile
`--strict` clean.
