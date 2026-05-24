---
title: 'Opportunities page — align toast pattern with the rest of the app'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: typeset
---

# Opportunities page — toast + aria-label style consistency

## Why

The Opportunities page drifted from the rest of the app's conventions
on three small but cumulative details:

1. **Toast success titles had trailing periods.** Every other page
   in the app writes success toasts as terse labels with no period
   ("Calendar URL regenerated", "Alert dismissed", "Bulk status
   updated"). Opportunities had `"Opportunity dismissed."` /
   `"Opportunity restored."` / `"Snoozed for 14 days."` — 3
   outliers across 80+ matching toasts.

2. **Toast errors put raw RPC error text in the title.** The pattern
   was `toast.error(rpcErrorMessage(error) ?? t\`Couldn't restore\`)`which means when the network fails the user sees the raw error
message AS the title. Every other page uses`toast.error(t\`Couldn't [verb]\`, { description: rpcErrorMessage(error) })`
   — title stays human, raw detail goes in the description slot. 3
   sites fixed: restore / dismiss / snooze.

3. **Snooze button aria-label baked the plural form into English.**
   `t\`Snooze ${title} for ${DEFAULT_SNOOZE_DAYS} days\``—
"days" is hardcoded; doesn't survive non-English plurals. Now
uses`plural()`from`@lingui/core/macro`(same pattern I applied
to`NeedsAttentionOverflowCard` in the i18n-correctness commit).

## What changed

`apps/app/src/features/opportunities/opportunities-page.tsx`

### Toast success — drop trailing periods (3 sites)

| Before                                                      | After                                       |
| ----------------------------------------------------------- | ------------------------------------------- |
| `toast.success(t\`Opportunity restored.\`)`                 | `toast.success(t\`Opportunity restored\`)`  |
| `toast.success(t\`Already restored.\`)`(via`toast.message`) | `toast.message(t\`Already restored\`)`      |
| `toast.success(t\`Opportunity dismissed.\`)`                | `toast.success(t\`Opportunity dismissed\`)` |
| `toast.success(t\`Snoozed for ${N} days.\`)`                | `toast.success(t\`Snoozed for ${N} days\`)` |

### Toast error — proper title + description shape (3 sites)

```tsx
// before:
toast.error(rpcErrorMessage(error) ?? t`Couldn't dismiss this opportunity.`)

// after:
toast.error(t`Couldn't dismiss this opportunity`, {
  description: rpcErrorMessage(error) ?? undefined,
})
```

Applied to restore / dismiss / snooze. Now title stays a human
"Couldn't [verb] this opportunity"; raw RPC error (if any) goes
into the description slot exactly like calendar, members, pulse,
account.security all do.

### Snooze button aria-label uses `plural()`

```tsx
aria-label={i18n._(
  plural(DEFAULT_SNOOZE_DAYS, {
    one: `Snooze ${opportunity.title} for # day`,
    other: `Snooze ${opportunity.title} for # days`,
  }),
)}
```

Locales with more than two plural forms get every variant via the
catalog extractor.

## What I considered and intentionally left

- **No PageHeader description.** Other top-level pages split half/
  half on this (calendar/notifications/billing have one; audit/
  members/reminders don't). Adding one just for the sake of it
  would be arbitrary; the page title is already self-explanatory.
- **No confirm dialog on Dismiss/Snooze.** Both reversible via the
  bottom-of-page "Recently dismissed" disclosure. Adding a confirm
  was explicitly skipped in the earlier confirm-gates batch.
- **OpportunityRow uses `<article>` not `<Card>`** — rows-in-a-
  list inside a parent Card, so `<article>` is the right semantic.
  Other apps mostly use Card-per-row but that's a heavier visual
  treatment than the queue needs.

## Verification

- `pnpm check` → 1390 files formatted, 655 lint+type clean.
- `pnpm test` → 295/295 green.

## Files touched

- M `apps/app/src/features/opportunities/opportunities-page.tsx`
