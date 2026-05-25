# 2026-05-25 — Rollover preview help: Tooltip → Popover

## Why

Follow-up to the info-icon audit
(`docs/Design/info-icon-audit-2026-05-25.md` §3.4). The audit
flagged the 13 help affordances on the Annual Rollover preview
(`generation-preview-tab.tsx`) as the last surface in the app
still using a Tooltip for glossary-grade copy.

The blurbs are 60-100+ chars — each one defines a concept like
"Will create" or "Skipped" or "Tax type". Tooltips are for
≤1 line; popovers are for paragraphs. Every other "what does
this term mean" affordance in the app already routes through
the ConceptHelp Popover shape (see
`features/concepts/concept-help.tsx`).

## Shipped

### `RolloverHelpTooltip` → `RolloverHelpPopover`

`apps/app/src/features/rules/generation-preview-tab.tsx:801-833`

- Surface: `Tooltip` + `TooltipContent` → `Popover` +
  `PopoverContent` with `PopoverHeader`, `PopoverTitle`,
  `PopoverDescription`.
- Trigger: matches ConceptHelp exactly.
  - Hit area `size-6` (was `size-4`) — meets the 24px tap-target
    standard.
  - Focus ring `focus-visible:ring-2 focus-visible:ring-state-accent-active-alt`
    (was outline-based).
  - Hover background `hover:bg-state-base-hover` (was
    `hover:bg-background-muted`).
  - `aria-label` reads `Explain {label}` (was `About {label}`),
    matching ConceptHelp wording.
- Behavior: `openOnHover` with `delay=150` / `closeDelay=80`,
  matching ConceptHelp.
- Surface size: `w-80 gap-2 p-3` with the label rendered as the
  `PopoverTitle` and the description as a
  `PopoverDescription` with `text-sm leading-relaxed
text-text-secondary`.
- Two call sites updated (`RolloverMetric`, `RolloverColumnHeader`).
- Dropped `Tooltip` / `TooltipContent` / `TooltipTrigger`
  imports — no other consumers in this file.

## Why not new ConceptHelp entries

The audit notes "ideally" route each rollover term through
`ConceptHelp` with new concept IDs like `rolloverWillCreate`
and `rolloverReview`. Skipped that route for two reasons:

1. The 13 labels are tightly coupled to a single screen.
   Adding 13 entries to the cross-surface concept dictionary
   would dilute it for cosmetic gain.
2. The `description` strings already live next to each
   `RolloverMetric` / `RolloverColumnHeader` call site, so the
   copy stays adjacent to the UI that explains it — which is
   actually easier to maintain for a single-screen glossary.

The visual treatment is now identical to ConceptHelp; only the
dictionary indirection is skipped. Future work can promote any
of these terms to the concept dictionary if they show up on
another surface.

## Files touched

- `apps/app/src/features/rules/generation-preview-tab.tsx`

## Verification

- `vp check` → 0 lint/type errors across 672 files
