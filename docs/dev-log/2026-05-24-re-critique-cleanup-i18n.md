---
title: 'Re-critique cleanup — i18n correctness + Suspend confirm + smells'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: audit
---

# Re-critique cleanup pass — i18n correctness, Suspend confirm, code smells

## Why

After the punch-list batch landed (re-critique fixes + four confirm
gates), six items remained on the cleanup list. Most are i18n
correctness fixes (strings bypassing Lingui's extractor) plus
a smaller code-quality batch (hoisted constant, dropped misleading
parameter). Plus one more confirm — Suspend access — that I
deferred earlier and reconsidered.

## What changed

### Suspend access confirm (members)

`apps/app/src/features/members/members-page.tsx`

Previously Suspend was a single dropdown-menu item that fired the
mutation immediately. Reactivate sits right next to it (so the
move is reversible) but the **suspended user** learns about it
from a confusing "your account doesn't have access" login screen,
not from an in-app notification. Wrong-person suspends turn into
Saturday-morning panic calls.

Added a small `AlertDialog` (no `DestructiveChangePreview` — same
tier as Cancel invitation, lower than Remove). The description
names the target by name and reminds the admin that Reactivate
access from this menu brings them back.

Reactivate stays direct — it's additive, no risk.

### `roleDowngradeImpact()` is now i18n-translatable

`apps/app/src/features/members/member-model.ts`,
`apps/app/src/features/members/member-model.test.ts`,
`apps/app/src/features/members/members-page.tsx`

The role-downgrade dialog headline + CTA were wrapped in `<Trans>`,
but the four impact-detail strings inside the
`DestructiveChangePreview` were hardcoded English bypassing Lingui.
A mixed-translation dialog reads as a bug to anyone running a
non-English locale.

**Shape:** `roleDowngradeImpact()` now takes an `i18n: I18n`
parameter and uses `i18n._(msg\`...\`)`for each variant. The
catalog extractor picks up every form. The caller in`members-page.tsx`already gets`i18n`via`useLingui()`. The test
sets up a no-catalog `setupI18n({ locale: 'en', messages: { en:
{} } })` — the default backend returns message ids (the English
source strings), which is what the assertions need.

I also extracted the `roleDowngradeImpact()` call out of the JSX
(was being called twice for `removes` and `keeps`) into a single
`(() => { const impact = ...; return <Preview ...> })()` IIFE.
Same shape elsewhere in the file.

### `NeedsAttentionOverflowCard` aria-label routes through `plural()`

`apps/app/src/features/dashboard/needs-attention-card.tsx`

Previously the aria-label was:

```tsx
aria-label={t`View ${count} more Pulse alert${count === 1 ? '' : 's'}`}
```

That `s`-suffix ternary doesn't survive non-English plurals — many
locales need wholly different forms, not just a trailing `s`. Now:

```tsx
const ariaLabel = i18n._(
  plural(count, {
    one: 'View # more Pulse alert',
    other: 'View # more Pulse alerts',
  }),
)
```

The `plural` macro comes from `@lingui/core/macro` (Lingui v6 split
the macros: `core/macro` for non-JSX contexts, `react/macro` for
JSX). The catalog extractor picks up both variants.

### Calendar privacy-mode metadata row hides pre-subscription

`apps/app/src/features/calendar/calendar-page.tsx`

The metadata strip always showed `Privacy mode: Redacted client
names` regardless of whether a subscription existed. Alongside
`Created: Not enabled` and `Last accessed: Never`, that gave a
contradictory reading: a privacy mode was set on a feed that didn't
exist yet. Now the privacy row only renders when `subscription !==
null`. The other two rows stay always-visible — their fallback copy
("Not enabled" / "Never") carries the right signal for them.

### Dismissed opportunity dates use the pretty-date helper

`apps/app/src/features/opportunities/opportunities-page.tsx`

`formatDismissalDate` rendered raw ISO (`2026-06-07`), which stood
out next to the rest of the app's pretty-printed dates ("May 24" /
"Jun 7, 2027"). Now uses `formatDatePretty()` — same helper the
filing-plan and obligations queue rows already use. Locale-aware,
drops the year when it matches the current one.

### Hoisted `TIMELINE_TERMINAL_STAGE_KEYS` to module scope

`apps/app/src/routes/obligations.tsx`

The Set was being allocated on every render of `PathToFilingSummary`
even though its membership never changes. Moved to module scope
alongside `DUE_DAYS_TERMINAL_STATUSES` (which was already there for
the same reason). Renamed from `TERMINAL_STAGE_KEYS` for clarity —
"timeline stage" disambiguates it from `DUE_DAYS_TERMINAL_STATUSES`
in the same file.

### Dropped misleading `stageKeys` parameter on `mineTimelineTimestamps`

`apps/app/src/routes/obligations.tsx`

The parameter looked like it controlled which audit-event statuses
got matched, but the matching was driven entirely by
`timelineIndexForStatus()`. The argument only sized the result
array. Now the function takes just the audit events; the result is
sized by a new `TIMELINE_STAGE_COUNT` module constant aligned with
the 6 stages in `timelineIndexForStatus`. Removes one source of
"why does this argument exist" friction for the next maintainer.

## What I considered but didn't change

- **`<Plural one="filed #d late" other="filed #d late" />` in
  `actions-list.tsx`** (RowMeta). The re-critique flagged these as
  "Plural macro no-ops" because the English `one` and `other` are
  identical. They're actually NOT no-ops — the macro extracts both
  forms so translators can override per-locale (some languages
  inflect at every plural form, English just happens to abbreviate
  `1d` / `5d` the same way). Removing the macro would strip
  translator capability. Skipped.

## Verification

- `pnpm check` → 1381 files formatted, 654 lint+type clean.
- `pnpm --filter @duedatehq/contracts --filter @duedatehq/app test` →
  26/26 + 295/295 green. The updated `roleDowngradeImpact` test
  passes with the no-catalog i18n instance (returns message ids =
  English source strings).

## Files touched

- M `apps/app/src/features/calendar/calendar-page.tsx`
- M `apps/app/src/features/dashboard/needs-attention-card.tsx`
- M `apps/app/src/features/members/member-model.test.ts`
- M `apps/app/src/features/members/member-model.ts`
- M `apps/app/src/features/members/members-page.tsx`
- M `apps/app/src/features/opportunities/opportunities-page.tsx`
- M `apps/app/src/routes/obligations.tsx`
