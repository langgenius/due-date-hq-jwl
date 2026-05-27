# Pill Padding + Checkbox Indeterminate Glyph

## Context

Two Yuqi feedback items from the Today / Pulse review pass:

1. The ad-hoc header pills (Monitoring 4 sources, 476 rules, 4 active
   …) read as too short next to the h2 — `py-0.5` gave them only 4px
   of vertical breathing room while the heading sat at ~28px.
2. The select-all checkbox in `/rules/library` section headers
   looked identical to a fully-checked checkbox even when only some
   rules in the section were selected. Base UI's `indeterminate`
   prop was wired through, but the Indicator always rendered the
   same CheckIcon, so the user had no visual cue for the partial
   state.

## Change

- **Pill padding (`py-0.5` → `py-1.5`)** at every ad-hoc pill site
  in the app shell:
  - `apps/app/src/features/dashboard/needs-attention-section.tsx:155`
    — Today: "Monitoring N sources" chip.
  - `apps/app/src/features/pulse/AlertsListPage.tsx:341` — Alerts
    list page count chip.
  - `apps/app/src/routes/obligations.tsx:2964` — `/deadlines` total
    count chip.
  - `apps/app/src/routes/rules.library.tsx:1531` — Rule library
    rule-count chip.
  - `apps/app/src/routes/rules.pulse.tsx:87, 95` — Pulse: Monitoring
    chip + "N active" destructive chip.
  - `apps/app/src/routes/clients.tsx:375` — Clients count chip.
  - The `Badge` primitive (`packages/ui/src/components/ui/badge.tsx`)
    was deliberately NOT changed — its fixed `h-5` (20px) would clip
    text at `py-1.5`. A separate primitive-level bump would be
    needed to grow Badge.
- **PulsingDot size override removed** at
  `apps/app/src/routes/rules.pulse.tsx:88` — the `className="size-1.5"`
  prop overrode the canonical `size-2` inner dot. Dropped so the
  Pulse header dot matches every other PulsingDot in the app.
- **Checkbox indeterminate glyph swap**
  (`packages/ui/src/components/ui/checkbox.tsx`):
  - Added `group/checkbox` to the Root so descendant icons can react
    to Base UI's `data-indeterminate` attribute via
    `group-data-[indeterminate]/checkbox:` variants.
  - Added `data-indeterminate:` paint rules so the box gets the same
    accent fill as `data-checked:` (Base UI does NOT also set
    `data-checked` when indeterminate, so the previous unchecked
    paint was bleeding through).
  - Rendered both `CheckIcon` and `MinusIcon` inside the Indicator,
    toggled via the group variant. Three visually distinct states
    now: empty (no fill), accent-fill + minus (some), accent-fill +
    check (all).

## Validation

- Preview at `http://localhost:5183/`. Verified:
  - Today + /rules/pulse headers: pills now render at 26.66px tall
    (`paddingTop/Bottom: 6px`) vs ~20px before. Computed style
    confirmed via `preview_eval`.
  - Pulse "Monitoring 4 sources" pill: PulsingDot inner+outer both
    `size-2` (8px). The earlier `size-1.5` override is gone.
  - `/rules/library` section-header select-all: when forced into
    `data-indeterminate` state, computed style shows CheckIcon
    `display: none` and MinusIcon `display: block`. Root background
    paints the accent blue (`rgb(21, 90, 239)`).
- No console errors after preview reload.
