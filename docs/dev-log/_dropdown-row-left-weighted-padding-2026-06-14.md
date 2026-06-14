# Dropdown rows — left-weighted horizontal padding

**Date:** 2026-06-14
**Surface:** `packages/ui/src/lib/overlay.ts` (`overlayRowClassName`)

Yuqi: "all dropdown buttons should have left padding more than right padding."

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
