---
title: 'A-issues batch — helpful toast fallback + standardize page widths'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: clarify
---

# A-issues batch — toast description fallback + page-width standardization

## Why

Following the deferred-items list, you picked answers on the A
(editorial) decisions. This commit applies the mechanical work
that flows from those calls, and documents the ones that are
confirmations of existing standards.

## What you decided

| #   | Decision                                                    | Action                                                                        |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| A1  | Use a helpful description fallback on `toast.error()` calls | **Applied across the codebase — 59 sites**                                    |
| A2  | "Obligations" vs "Deadlines" naming                         | **Waiting for merge** — teammates' `929d78c4` rename will resolve this        |
| A3  | "Remove" vs "Delete" verb                                   | **Already the standard** — every destructive action uses "Remove"; documented |
| A4  | Pending-gerund per-action vs uniform "Saving…"              | **Already the standard** — per-action gerunds; documented                     |
| A5  | Per-user vs per-firm opportunity dismissals                 | **Per-firm (current)** — no code change                                       |
| A6  | Per-role custom downgrade copy                              | **Deferred** — current 4-tier shape stays                                     |
| A7  | Standardize members + billing outlier widths                | **Applied** — both now use `max-w-page-wide`                                  |
| A8  | `Smart Priority` / `Pulse` / `Apple Calendar` Title Case    | **Intentional brand/feature names** — documented                              |

## A1 — Helpful toast error fallback (59 sites)

The previous shape had three drift patterns for the "no specific
RPC error" fallback inside `toast.error({ description })`:

| Pattern                                                       | Count          |
| ------------------------------------------------------------- | -------------- |
| `?? t\`Please try again.\``                                   | 46 sites       |
| `?? undefined` (silent — toast had no description)            | 6 sites        |
| `?? err.message` (auth-flow tier)                             | 6 sites (kept) |
| AlertDescription inline `?? t\`Please try again.\``           | 4 sites        |
| `err instanceof Error ? err.message : t\`Please try again.\`` | 3 sites        |

All `t\`Please try again.\``and`?? undefined` paths now use:

```
t`Check your network and try again. If this keeps happening, contact support.`
```

The auth-flow sites (`account.security.tsx`, `two-factor.tsx`)
keep their `err.message` tier — Better Auth returns sensible
user-facing strings ("Invalid code", "Session expired") that
beat any generic fallback. The new shape there is three-tier:

```tsx
description: rpcErrorMessage(err) ?? err.message ?? t`Check your network…`
```

Lingui catalog dedupes identical source strings, so 59 inline uses
of the same fallback emit one catalog entry — no message-catalog
bloat. If we ever tweak the fallback wording, it's a single sed
across the codebase.

### Files touched (16)

- `apps/app/src/components/patterns/app-shell-nav.tsx`
- `apps/app/src/components/patterns/app-shell-user-menu.tsx`
- `apps/app/src/features/audit/audit-log-page.tsx`
- `apps/app/src/features/calendar/calendar-page.tsx`
- `apps/app/src/features/clients/ClientDetailDrawer.tsx`
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- `apps/app/src/features/clients/FixNeedsFactsSheet.tsx`
- `apps/app/src/features/migration/ImportHistoryDrawer.tsx`
- `apps/app/src/features/migration/Wizard.tsx`
- `apps/app/src/features/notifications/notification-preferences-page.tsx`
- `apps/app/src/features/notifications/notifications-page.tsx`
- `apps/app/src/features/obligations/CreateObligationDialog.tsx`
- `apps/app/src/features/opportunities/opportunities-page.tsx`
- `apps/app/src/features/pulse/AlertsListPage.tsx`
- `apps/app/src/features/reminders/reminders-page.tsx`
- `apps/app/src/features/workload/workload-page.tsx`
- `apps/app/src/routes/accept-invite.tsx`
- `apps/app/src/routes/clients.$clientId.tsx`
- `apps/app/src/routes/clients.tsx`
- `apps/app/src/routes/dashboard.tsx`
- `apps/app/src/routes/login.tsx`
- `apps/app/src/routes/obligations.tsx`
- `apps/app/src/routes/onboarding.tsx`
- `apps/app/src/routes/practice.tsx`

## A7 — Standardized members + billing widths

`members-page.tsx` (3 sites) and `billing.tsx` (2 sites): all
`max-w-[1172px]` / `max-w-[1180px]` → `max-w-page-wide` (1100px).

Visually: 72-80px narrower on wide screens, barely perceptible.
Wins: one less outlier token, future width changes apply to every
content-heavy page through a single CSS variable in `preset.css`.

## A3 — "Remove" is the standard

Audit verified: every destructive action uses "Remove" (firm-
centric, softer than "Delete"). "Delete" appears in zero user-
facing strings. Confirmed as the standard.

## A4 — Per-action gerunds are the standard

Confirmed as the standard. Examples in active use:
"Disabling…" / "Signing out…" / "Revoking…" / "Regenerating…" /
"Removing…" / "Downgrading…" / "Suspending…" / "Cancelling…" /
"Moving…" / "Creating…" / "Saving…".

The uniform-"Saving…" alternative was considered but rejected —
per-action verbs carry more information ("Disabling MFA" is
specifically about MFA, not generic save).

## A5 — Per-firm dismissals stay

Opportunity dismissals stay scoped per-firm: when a partner
dismisses an opportunity, the manager also stops seeing it. This
matches firm-level decision-making for the CPA workflow (the
dismissals are shared decisions, not personal annotations).

## A6 — Per-role downgrade copy deferred

`roleDowngradeImpact()` continues to use the 4-tier privilege-gap
shape (sign-off / member admin / billing / floor). Per-role
custom copy would mean a `(from, to)` matrix — 20 cells worth of
editorial text. Defer until real CPA feedback says the current
4-tier shape is too generic.

## A8 — Branded names stay Title Case

Confirmed: `Apple Calendar`, `Smart Priority`, `Pulse` are proper
nouns (brand / feature names) and stay capitalized. Every other
button / column header / dialog title stays sentence case per the
established voice.

## Verification

- `pnpm check` → 1391 files formatted, 655 lint+type clean.
- `pnpm test` → 295/295 green.

## Files touched

24 files total (mostly route + feature files for A1, plus
members-page.tsx + billing.tsx for A7). See the per-file list
above.
