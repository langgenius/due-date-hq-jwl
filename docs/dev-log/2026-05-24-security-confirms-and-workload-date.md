---
title: 'Security action confirms + Workload date format'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: audit
---

# Security action confirms + Workload date format

## Why

Continuing the re-critique surface-by-surface walk, the agent
checked Workload, Risk dashboard, Onboarding, Migration, top-level
Rules, and Settings sub-pages. Most were clean. The findings:

- **Three destructive security actions had no confirm** — Disable
  MFA, Sign out other sessions, and per-session Revoke. All three
  are the kind of action where a slip-of-the-click costs real time
  to recover from (re-setup MFA, re-login on every device, lose
  current session and bounce to /login).
- **Workload header date** rendered as `As of 2026-05-24` in
  `font-mono` — read as machine output, not the prose it actually
  is.

## What changed

### Three security confirms (`account.security.tsx`)

All three follow the established `AlertDialog` pattern from
member-remove / role-downgrade. Same `destructive-primary` CTA
variant, same on-settled-close shape.

- **Disable MFA**: copy points out that owners need MFA before
  sensitive production actions, so disabling actively blocks those
  flows. Cancel reads "Keep enabled" (the positive choice).
- **Sign out other sessions**: copy is explicit that EVERY signed-in
  browser except the current one will lose access immediately and
  need to re-authenticate. The CTA mirrors the trigger ("Sign out
  other sessions").
- **Per-session Revoke**: the dialog title scales — if the session
  being revoked is the user's current one, the title becomes
  "Revoke this session and sign out?" and the description warns
  that they'll land on /login. For non-current sessions, the
  language is about the OTHER user losing access. The dialog also
  shows a `DestructiveChangePreview`-style metadata strip with the
  session's user-agent + IP + created-at so the admin can confirm
  they're killing the right device.

The mutation `onSuccess` handlers close their dialogs explicitly
(rather than relying on `onSettled` shrinkage) so the success
flow keeps the existing toast behavior unchanged. Error stays a
toast; the dialog remains open so the user can retry without
losing context.

### Workload header date (`workload-page.tsx`)

The PageHeader description had a subtitle line:

```tsx
<span className="mt-1 block font-mono text-[11px] tabular-nums text-text-muted">
  <Trans>
    As of {asOfDate} · next {windowDays} days
  </Trans>
</span>
```

That rendered as `As of 2026-05-24 · next 60 days` in monospace —
reads as a debug timestamp, not the prose it actually is. Now:

```tsx
<span className="mt-1 block text-[11px] text-text-muted">
  <Trans>
    As of {formatDatePretty(asOfDate)} · next {windowDays} days
  </Trans>
</span>
```

Reads as "As of May 24 · next 60 days" in the description's body
font. `formatDatePretty()` also drops the year when it matches the
current one, so the line stays scannably short.

## What the agent walked and found clean

- **Workload page** — only the header date issue.
- **Risk / readiness dashboard** (`readiness.tsx`) — clean.
- **Onboarding agent flow** (`features/onboarding/`) — clean.
- **Migration flow** (`features/migration/`) — agent confirmed the
  existing "Revert batch" + "Reject import" paths already go
  through proper confirmation patterns.
- **Top-level Rules pages** (`rules.tsx`, `rules.library.tsx`,
  `rules.sources.tsx`) — clean (the review-modal hotkeys at
  `rules.library.tsx:2220-2315` were audited earlier in the
  useEffect-cleanup commit).
- **Other settings sub-pages** (`settings.tsx`,
  `notifications.preferences.tsx`, `practice.tsx`, `two-factor.tsx`)
  — clean.

## Verification

- `pnpm check` → 1384 files formatted, 655 lint+type clean.
- `pnpm --filter @duedatehq/app test` → 295/295 green.
- Manual smoke (deferred): open /account/security and try each of
  the three destructive actions — confirm each opens an
  AlertDialog with appropriate copy, that Cancel dismisses cleanly,
  and that revoking your current session sends you to /login.

## Files touched

- M `apps/app/src/routes/account.security.tsx`
- M `apps/app/src/features/workload/workload-page.tsx`
