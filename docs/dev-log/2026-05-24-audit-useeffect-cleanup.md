---
title: 'useEffect cleanup — six call sites → zero (audit)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: meta
---

# AGENTS.md no-useEffect rule fully enforced (audit)

## Why

`AGENTS.md` prohibits `useEffect` in app/package code. Despite that,
six call sites had drifted in over time. The rule exists for good
reason — useEffect is a frequent foot-gun (stale closures, double-
fires, derived-state ping-pong) and each one we leave erodes the
norm.

## What changed

All six call sites converted; the project-wide grep for `useEffect(`
in `apps/app/src/` and `packages/ui/src/` is now empty (excluding
test files, which keep their own rules).

| #   | File                                        | Before                                                                                                                           | After                                                                                                                                            |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `features/clients/ClientCycleArrows.tsx:51` | useState + useEffect snapshotting sessionStorage on every `currentClientId` change                                               | Drop both. `readClientCycleList()` is cheap; call inline inside the `useMemo` that derives `neighbors`.                                          |
| 2   | `features/clients/ClientCycleArrows.tsx:84` | Hand-rolled `window.addEventListener('keydown')` for J/K cycling                                                                 | Two `useAppHotkey('J' \| 'K', …)` registrations. The wrapper handles editable-target ignoring + cleanup.                                         |
| 3   | `routes/clients.tsx:192`                    | Wrote the cycle list to sessionStorage every time `filteredClients` changed                                                      | Moved the write into the row-click handler inside `ClientFactsWorkspace.tsx`. Now persists only on actual navigation intent.                     |
| 4   | `routes/obligations.tsx:3287`               | URL-tab fallback — if the URL pins a tab that's invalid for the current obligation type, bounce to the first valid tab           | Render-time adjustment (React docs "adjusting state when a prop changes" pattern). `onTabChange` is idempotent so calling during render is safe. |
| 5   | `routes/obligations.tsx:8178`               | Window-style focus listener on the search input ref, syncing `setOpen(true)` when `/` global hotkey externally focuses the input | Pass `onFocus={() => setOpen(true)}` directly on the `<Input>`.                                                                                  |
| 6   | `routes/rules.library.tsx:2235`             | Window keydown listener for ArrowLeft/ArrowRight/A/R inside the rule-review modal                                                | Four `useAppHotkey(...)` registrations.                                                                                                          |

Each replacement is documented inline with a `(useEffect audit)`
comment explaining the swap.

## Where the conversions improved behavior, not just code

- **`clients.tsx:192` → row-click write.** The previous shape wrote
  sessionStorage on every `filteredClients` change — including
  filter-only edits the user never intended to act on. Moving
  the write to the row-click handler means the cycle list reflects
  exactly what was visible at navigation time.
- **`obligations.tsx:8178` → onFocus prop.** Direct prop-binding
  removes a subtle race: the previous useEffect attached the focus
  listener AFTER mount, so a `/` hotkey that focused the input
  inside the same render frame could miss the open-on-focus signal.

The other four are behavior-preserving — same semantics, smaller
surface, fewer reactivity rules to keep in mind.

## Where I kept useEffect (none)

Zero remaining call sites. The previous `PulseDetailDrawer.tsx`
comment about "useEffect, per project rule. Render-time setState
bails out after one update" was already in place from an earlier
pass — its comment stays, just for the future reader who sees the
word `useEffect` in a comment and wonders why no call site appears.

## Verification

- `grep -rn 'useEffect(' apps/app/src packages/ui/src | grep -v test` → no
  matches.
- `pnpm check` → 1379 files formatted, 654 lint+type clean.
- `pnpm test` → all green across workspaces.
- Manual smoke: opened `/clients`, clicked into Lakeview, confirmed
  the cycle list persisted to `sessionStorage['clientCycleList:v1']`
  with 9 entries. (The visible prev/next arrows were intentionally
  removed by an earlier commit; the cycle list write is dead code
  in production right now but the wiring is correct for future
  re-introduction.)

## Files touched

- M `apps/app/src/features/clients/ClientCycleArrows.tsx`
- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- M `apps/app/src/routes/clients.tsx`
- M `apps/app/src/routes/obligations.tsx`
- M `apps/app/src/routes/rules.library.tsx`
