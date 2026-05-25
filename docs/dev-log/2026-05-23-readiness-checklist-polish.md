---
title: 'Readiness checklist polish — overview spacing + checklist row affordance (items 5, 6, 7, 8)'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Four-item polish pass on the readiness checklist

All four critique items live inside the obligation drawer's
Readiness tab — `ReadinessOverview` header + `ChecklistItemRow`
list. Treating them as one unit because the fixes interlock.

## #5 — ChecklistItemRow vertical padding

Was `px-3 py-2`. The Input + chevron Button + chip cluster all
have their own intrinsic heights, so `py-2` was layering padding on
top of components that were already sized. Tightened to `py-1.5`.
Visible result: 4px less vertical breathing on every row, ~24px
saved across a 6-item checklist. Reads tighter without crowding.

## #6 — "Is this a note?" on description text

The optional `item.description` (client-facing detail like "Year-end
trial balance, general ledger detail…") rendered as a paragraph
with `border-t border-divider-subtle px-3 py-1.5 text-[11px]
text-text-tertiary` — quiet but visually indistinguishable from a
"note row." Critique was direct: "is this note?"

Two changes to disambiguate:

- Italic styling — descriptions read as informational/secondary,
  not as a separate content tier.
- `InfoIcon` prefix — small i-in-circle anchors the line as "what
  this document is" helper context. Cue is generic-info, not
  document-specific.

This separates it cleanly from the internal `note` field (which
only renders in the expanded body, never collapsed here).

## #7 — "Mark received" affordance more obvious

The collapsed row had two affordances doing the same job: a
Checkbox on the left, and a clickable status Badge (`Received` /
`Missing` / `Needs review`) further right. Both toggled
received↔missing. Neither said "Mark received" in plain language;
the chip looked like a passive status label, the checkbox was
small. Critique: "wish it is more obvious — like mark received."

Split the dual-affordance pattern into explicit action vs. passive
status:

- `missing` → outline `Button` "Mark received" with a check icon.
  Real-button shape, real-button hit target, real verb. Primary
  affordance on the right side of the row.
- `received` → success `Badge` "Received" with a check icon.
  Passive label, not interactive.
- `needs_review` → destructive `Badge` "Needs review". Same
  passive label pattern.

The Checkbox at the leading edge stays for keyboard quick-toggle
and as the visual "this row is checked" indicator — same dual-
purpose role checkboxes always play. The difference now is the
pointer-friendly affordance is unambiguous: "Mark received" reads
as an action; the chip reads as state.

Tradeoff: the previous chip-as-button let a CPA flip received →
missing with one click. Now that path requires unchecking the
checkbox. Acceptable: missing → received is the common operation
(checklists fill up over time), missing → re-missing is rare and
the checkbox still does it.

## #8 — ReadinessOverview spacing

`ReadinessOverview` was the headline+subline block at the top of
the Readiness tab — `flex items-start gap-3 py-2` with a 24px
`size-6` circular icon. Critique: "you can same more space with
this?"

Tightened:

- Dropped outer `py-2` (parent grid supplies vertical rhythm).
- Icon shrunk `size-6` → `size-5` with smaller inner `size-3` glyph.
- Gap `gap-3` → `gap-2`.
- Removed icon's `mt-1` nudge — alignment reads cleaner without it.
- Headline shrunk `text-base` → `text-sm` + `leading-tight` (still
  reads as the section's primary text; smaller because it sits one
  click below the drawer's H1).
- `responseCount` line `mt-1` → `mt-0.5`.

Net: ~12px saved at the top of the Readiness tab. Less drawer
vertical real estate going to chrome.

## i18n

1 new string: `Mark received` → `标记已收到`.

## Files touched

- `apps/app/src/routes/obligations.tsx`:
  - `ReadinessOverview` — outer padding + icon + headline tightened.
  - `ChecklistItemRow` — `py-2` → `py-1.5`; chip toggle split into
    button (missing) + passive badge (received/needs_review);
    description line gets italic + InfoIcon.
  - `InfoIcon` added to lucide imports.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 1 new
  string + zh-CN translation.
