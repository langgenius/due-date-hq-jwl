# 2026-05-24 — Client detail: wire up Unassigned pill + Add filing state

## Why

Yuqi (product designer) flagged two dead-looking affordances on
`/clients/[id]`:

1. The owner pill in the H1 chip cluster ("Unassigned" or a member
   avatar + name) looked tappable but was a non-interactive `<span>`.
   Clicking did nothing — pure UI lie.
2. The "Add filing state" chip (rendered when readiness reports
   `state` missing) called a callback that only scrolled to the
   jurisdiction form. But that form lives on the **Client info** tab,
   so if the user was on Work, the callback scrolled nothing visible
   into view — the chip felt broken.

The rule (per Yuqi): _"Don't put nonworking things."_ Every clickable
chrome in the header has to perform the action it implies.

## What changed

`apps/app/src/features/clients/ClientFactsWorkspace.tsx`

### Owner pill → real DropdownMenu picker

- Added `assignableMembersQuery` (`orpc.members.listAssignable`) at the
  workspace level so we can populate the picker.
- Added `bulkAssigneeMutation` (`orpc.clients.bulkUpdateAssignee`) with
  the same success/error toast shape the queue uses. Single-id payload
  so the audit-log breadcrumb stays consistent with the bulk variant.
- `ClientOwnerHeaderPill` rewritten from a static `<span>` into a
  `<DropdownMenu>` + `<DropdownMenuRadioGroup>` containing an
  "Unassigned" option and the full list of assignable members.
- Selecting fires `changeOwner(assigneeId | null)` → mutation →
  toast + invalidates `clients.get`, `clients.listByFirm`, `audit`.
- Pill now has a `<ChevronDownIcon>` affordance and proper
  `aria-label` / `title` based on the current owner so its
  interactiveness is legible.
- Pending state disables the trigger (`disabled={mutation.isPending}`).

### "Add filing state" → switch tab then scroll

- `openFilingJurisdictions` now calls `setActiveTab('info')` first,
  then RAFs the scroll so the section is in the DOM before
  `scrollIntoView` runs. Previously the callback only scrolled and
  left the user on Work staring at an unchanged tab.
- `openMissingFacts` is now a thin alias that delegates to
  `openFilingJurisdictions` — same destination either way.

## Verification

- `pnpm exec tsc --noEmit` → clean.
- `vp lint` → 0 warnings / 0 errors, 650 files.
- `vp test apps/app/src/features/clients/` → 17/17 pass.
- Full `vp test` failures are pre-existing env issues (jsdom not
  configured for keyboard-shell tests, e2e/Playwright leakage) — none
  touched by this change.

## Follow-ups

The user said _"ensure everything you have the screen has good UX and
journey wired up."_ The two fixes above close the most visible dead
affordances, but a full pass would also audit:

- `ClientTitleSwitcher` chevron (already wired — switches between
  recent clients via dropdown).
- `ClientFilingStateChips` (decorative — currently not clickable;
  could be promoted to per-state filters on a later pass).
- Notification bell on the page header (handled by app shell).
- Per-row chevron / menu on filing plan rows (already wired in
  D-6a/b).

None of those look dead today; the two fixed here were the only ones
that clearly implied an action and delivered nothing.
