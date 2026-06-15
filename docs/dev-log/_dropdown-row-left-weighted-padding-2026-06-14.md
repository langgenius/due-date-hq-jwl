# Dropdown buttons — left-weighted horizontal padding

**Date:** 2026-06-14
**Surface:** `apps/app/src/components/patterns/filter-trigger.tsx` (`FilterTrigger`)
+ `packages/ui/src/lib/overlay.ts` (`overlayRowClassName`)

Yuqi: "all dropdown buttons should have left padding more than right padding."

## Triggers (the pills that open a dropdown) — the actual target

First pass only touched the menu-item rows (below); Yuqi clarified with a
screenshot of the **trigger** pills (Type / Modified / Effective / Severity),
where the left padding hadn't visibly moved. `FilterTrigger` is the canonical
dropdown/popover trigger chrome (filter rows on /deadlines, /alerts, /clients,
/rules), so fixing it is the high-leverage central change.

`FilterTrigger`: symmetric `px-3` (12/12) → **`pl-4 pr-3`** (16px / 12px). The
leading label gets the generous inset; the trailing chevron — which carries its
own visual mass + the `gap-1.5` before it — tucks tighter on the right, so the
pill reads balanced rather than chevron-heavy. (Also corrected a stale docstring
that still claimed `h-10 / px-4 / rounded-xl`; the live chrome is
`h-9 / rounded-full`.)

The Select trigger (`pl-3 pr-2`) was already left-weighted; ad-hoc
`DropdownMenuTrigger` buttons (e.g. the settings Language/Date selects at
`px-3`) are per-call-site and not centralized — flag if those need sweeping too.

## Menu-item rows (inside the open dropdown)

`overlayRowClassName` is the shared highlightable-row class behind every
dropdown menu item (`DropdownMenuItem`, `DropdownMenuSubTrigger`) and select
option. It was symmetric `px-2` (8px / 8px). Changed to **`pl-3 pr-2`** (12px /
8px) — the leading label/icon gets the generous inset; a trailing chevron or
`ml-auto` check/indicator sits tighter on the right.

This is the same asymmetry the Select **trigger** already uses (`pl-3 pr-2`), so
triggers and the rows they open now read with one consistent left-weighted
rhythm.

## Scope / exceptions

- One centralized edit covers all generic dropdown + submenu items app-wide.
- **Checkbox items** (`pl-7 pr-2`) already satisfy left>right (the left slot
  holds the check) — untouched.
- **Radio items** (`pr-8 pl-2`) and **select items with an end indicator** keep
  their right-side check slot — the one structural exception to left>right,
  since the indicator lives on the right by design.
- Select **options** override pl/pr per indicator position, so they were already
  asymmetric and are unaffected by the base change.

## Verification

Live: opened the settings Language dropdown — items render `pl 12px / pr 8px`
(computed). No layout regression on trailing checks/chevrons. `pnpm check` clean
for this file.
