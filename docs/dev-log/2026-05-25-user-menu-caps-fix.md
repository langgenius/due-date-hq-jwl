# 2026-05-25 — User menu uppercase fix + practices popover avatar sizing

## Why

Yuqi spotted that the user-menu dropdown was rendering the
identity block in ALL CAPS — **SARAH MARTINEZ** as the name,
**SARAH.DEMO@DUEDATEHQ.TEST** as the email, and **OWNER AT
BRIGHTLINE DEMO CPA** as the role line. Emails should never
render uppercase; names and role lines shouldn't either inside
a content block.

Root cause: the identity block was wrapped in
`<DropdownMenuLabel>`, which applies
`overlayLabelClassName = 'px-3 pt-1 pb-0.5 text-2xs font-medium tracking-wider uppercase text-text-tertiary'`
via `packages/ui/src/lib/overlay.ts`. That class is the right
treatment for section kickers (the "PRACTICES" label in the
firm switcher, "Map column to…" in Step 2 mapping, etc.) — but
the user identity is content, not a section header. The inner
spans overrode `font-size` but `text-transform: uppercase`
cascades from the parent, so name + email + role all rendered
in caps.

Also noticed while in the same file: the practices popover's
dropdown rows used a 20px (`size-5`) brand-primary tile while
the firm-switcher trigger itself uses 32px (`size-8`). The
trigger's own JSDoc claimed size-8 was "the canonical avatar
size used in the dropdown's own list", but the list never
actually matched. The 20px tile read as a UI dot next to the
14px text instead of a workspace identity.

## Shipped

### User menu identity block

`apps/app/src/components/patterns/app-shell-user-menu.tsx:225-244`

- Replaced `<DropdownMenuLabel className="flex flex-col gap-0.5 text-left">`
  with a plain `<div className="flex flex-col gap-0.5 px-3 pt-1.5 pb-2 text-left">`
  inside the existing `DropdownMenuGroup`.
- Inner spans now render at their declared sizes:
  - Name: `text-sm font-medium text-text-primary` → "Sarah Martinez"
  - Email: `text-xs text-text-tertiary` → "sarah.demo@duedatehq.test"
  - Role line: `text-xs text-text-tertiary` → "Owner at Brightline Demo CPA"
- Added `truncate` on the name span (email + role already had it)
  so long display names don't blow out the 256px popover width.
- Dropped the now-unused `DropdownMenuLabel` import.
- Inline comment block at the change site documents why
  `DropdownMenuLabel` is the wrong primitive here, so a future
  reader doesn't put it back.

### Practices popover avatar sizing

`apps/app/src/components/patterns/app-shell-nav.tsx:252-291`

- Bumped row height `h-8` → `h-12` so the larger avatar +
  two-line text breathe.
- Padding tightened to `px-2 py-2` (was the primitive's
  default `mx-1 px-2 h-8` from overlayRowClassName, now
  explicit on the item).
- Avatar tile `size-5` (20px) → `size-7` (28px) with
  `rounded-md` (was `rounded-sm`) to match the visual weight
  of the 32px trigger tile. Not bumped to size-8 because the
  list rows shouldn't compete with the trigger's headline
  presence — 28px is the comfortable in-between.
- Inner gap nudged `gap-2` → `gap-2.5` so the avatar-text
  rhythm matches the trigger row.

## Files touched

- `apps/app/src/components/patterns/app-shell-user-menu.tsx`
- `apps/app/src/components/patterns/app-shell-nav.tsx`

## Verification

- `vp check` → 0 lint/type errors across 677 files
- Visual: the user popover now reads
  - "Sarah Martinez" (sentence case)
  - "sarah.demo@duedatehq.test" (lowercase)
  - "Owner at Brightline Demo CPA" (sentence case)
    …instead of the previous all-caps treatment.
- Practices popover rows now have a 28px brand tile that reads
  as the same family as the 32px trigger tile, without
  matching it pixel-for-pixel (intentional hierarchy: trigger
  is the headline, list items are siblings).

## What this teaches future readers

`DropdownMenuLabel` (and any primitive that uses
`overlayLabelClassName`) is for **section kickers** —
uppercase, tracking-wider, tiny type. If you find yourself
adding inner spans with bigger font sizes inside it, you're
using the wrong primitive. Use `DropdownMenuGroup` + a plain
`<div>` wrapper for content blocks (identity panels,
metadata strips, etc.) so children don't inherit the
uppercase transform.
