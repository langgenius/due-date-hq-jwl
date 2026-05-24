---
title: 'Interaction audit — pending labels, Escape bubble, motion-reduce'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: audit
---

# Interaction audit pass

## Why

You asked for an interaction review covering click targets, hover /
focus states, loading / disabled / empty states, animations,
optimistic UX, modal behavior, and keyboard handling. I ran a
structured audit (with an Explore agent for the analytical parts
and direct greps for the mechanical ones).

## Audit verdict

Most categories scored 7–9/10 — the codebase is well-disciplined
on the interaction layer.

| Category                            | Score                | Notes                                                                                                                                                        |
| ----------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pending button states               | 6/10 → 9/10 (fixed)  | Disabled-while-pending uniformly applied; **label changes were missing on the 9 new AlertDialog confirms I added in earlier batches** — fixed in this commit |
| Optimistic vs server roundtrip      | 7/10                 | All mutations use server-roundtrip pattern (no surprises); reason-capture dialogs could optimistically close on submit but acceptable as-is                  |
| Focus management on Dialogs         | 8/10                 | Base UI primitives handle focus + return-to-trigger automatically; no custom overrides bypass them                                                           |
| `focus-visible` ring consistency    | 9/10                 | 81/84 ring uses are the canonical `ring-2 + ring-state-accent-active-alt` pair; 3 outliers use warning-tone (intentional)                                    |
| Hover state consistency             | 8/10                 | All interactive elements use Button primitive or apply `hover:bg-state-base-hover` explicitly                                                                |
| Tooltip patterns                    | 7/10                 | One delay value (150ms in ConceptHelp) is the only delay set; consistent                                                                                     |
| Click handlers + stopPropagation    | 5/10 → 9/10 (fixed)  | **5 sites stopped Escape via `onKeyDown stopPropagation`** — fixed                                                                                           |
| Disabled visual treatment           | 9/10                 | Button primitive handles `disabled:opacity-50 disabled:cursor-not-allowed` automatically                                                                     |
| Form submit behavior                | 9/10                 | All forms preventDefault correctly; submit buttons use `type="submit"` for Enter                                                                             |
| Modal Escape behavior               | 9/10 → 10/10 (fixed) | Primitive defaults + the Escape-bubble fix close the last gap                                                                                                |
| Skeleton vs spinner usage           | 8/10                 | Skeleton for initial load, inline spinner for button state — used appropriately                                                                              |
| Animation duration consistency      | 8/10                 | Almost all use Tailwind defaults; one `animate-in` was unguarded for `motion-reduce` — fixed                                                                 |
| Click-outside on Popovers / Selects | 9/10                 | Primitive defaults intact; no overrides                                                                                                                      |

## What changed

### 1. `onKeyDown stopPropagation` now lets Escape bubble (5 sites)

`apps/app/src/features/clients/ClientFactsWorkspace.tsx`,
`apps/app/src/features/rules/coverage-tab.tsx`,
`apps/app/src/components/patterns/table-header-filter.tsx`,
`apps/app/src/routes/obligations.tsx` (2 sites)

**The bug:** every input or checkbox inside a row-clickable / dialog /
popover context had:

```tsx
onKeyDown={(event) => event.stopPropagation()}
```

This swallowed letter keys to keep global hotkeys (J/K navigation,
`/` to focus search, etc.) from firing while typing in an input.
But it ALSO swallowed Escape, which broke parent-close handlers —
a user focused inside a header filter's search input couldn't hit
Esc to close the dropdown. Same in dialog inputs and checkboxes.

**The fix:** let Escape bubble while still stopping typing keys:

```tsx
onKeyDown={(event) => {
  if (event.key === 'Escape') return
  event.stopPropagation()
}}
```

The `useAppHotkey` wrapper already calls `isEditableEventTarget()`
which filters keystrokes by editable target — so the
`stopPropagation` was always a defensive backstop. Letting Escape
bubble doesn't re-introduce the global-hotkey risk; it just restores
the close-on-Esc contract every dialog/popover expects.

### 2. Pending-label on 9 AlertDialog confirms

`apps/app/src/routes/account.security.tsx`,
`apps/app/src/features/calendar/calendar-page.tsx`,
`apps/app/src/features/members/members-page.tsx`,
`apps/app/src/features/clients/ClientFactsWorkspace.tsx`

The 9 confirm dialogs I added across the recent batches all
disabled their CTA during pending but **didn't change the label**.
A careful user clicks "Disable MFA", sees the button gray out, and
has no signal that the mutation is in flight. PulseReasonDialog
already shows the pattern ("Dismiss" → "Saving…"); now every
new confirm matches it:

| Dialog                  | Resting label              | Pending label   |
| ----------------------- | -------------------------- | --------------- |
| Disable MFA             | "Disable MFA"              | "Disabling…"    |
| Sign out other sessions | "Sign out other sessions"  | "Signing out…"  |
| Revoke session          | "Revoke session"           | "Revoking…"     |
| Regenerate calendar URL | "Regenerate URL"           | "Regenerating…" |
| Disable calendar feed   | "Disable feed"             | "Disabling…"    |
| Remove member           | "Remove from practice (1)" | "Removing…"     |
| Downgrade role          | "Downgrade role"           | "Downgrading…"  |
| Suspend access          | "Suspend access"           | "Suspending…"   |
| Cancel invitation       | "Cancel invitation"        | "Cancelling…"   |
| Bulk move deadlines     | "Move deadline(s)"         | "Moving…"       |

Consistent verbal feedback; matches the established
PulseReasonDialog pattern. The Cancel button stays "Cancel" (we
don't gray it out during pending — the user might want to abandon
mid-flight if the network hangs).

### 3. `motion-reduce` gate on the only unguarded entrance animation

`apps/app/src/features/rules/coverage-tab.tsx`

The rule-review pane uses `animate-in fade-in duration-150` keyed
by rule id so the body fades in fresh per rule. Added
`motion-reduce:animate-none` so users with `prefers-reduced-motion:
reduce` get an instant swap instead of a fade.

Audit also found 19 `animate-spin` (Loader2Icon) sites without
`motion-reduce` gating, but per WCAG 2.3.3 spinners are functional
process indicators (excluded from the "animation from interactions"
rule). Slowing them under reduced-motion is a preset-level decision
better made in the Tailwind config than at 19 call sites — deferred.

## Verification

- `pnpm check` → 1388 files formatted, 655 lint+type clean.
- `pnpm test` → 295/295 green.

## Files touched

- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- M `apps/app/src/features/rules/coverage-tab.tsx`
- M `apps/app/src/components/patterns/table-header-filter.tsx`
- M `apps/app/src/routes/obligations.tsx`
- M `apps/app/src/routes/account.security.tsx`
- M `apps/app/src/features/calendar/calendar-page.tsx`
- M `apps/app/src/features/members/members-page.tsx`
