# Deadlines detail — hero / footer / banner aligned to alert detail

**Date:** 2026-06-23
**Surface:** `features/obligations/queue/ObligationQueueDetailDrawer.tsx`

A focused parity pass bringing the /deadlines detail page's hero, footer, and
status banner in line with the /alerts detail page (`AlertDetailDrawer.tsx`),
plus standardizing the tab count chips. One file touched.

## Hero — form representation reads below the headline (#2)

The hero `<h2>` previously crammed both the form code and its description into
one string (`"Form 1040 — Individual income tax return"`). Mirroring the alert
hero's title → dek stack, the **human description** is now the headline and the
**form code** ("Form 1040") renders as its own quiet 14/500 sub-identity line
directly beneath — the alert hero's dek slot. The sub-line is hidden once the
hero collapses on scroll (pinned header stays compact). The crumb leaf + the
`<h2>` `title` attr keep the combined `"{label} — {description}"` for the path
read. When a code has no description, the headline IS the label and no
duplicate sub-line renders.

## Standard count badge (#6)

The Materials / Record / Audit tab count chips were rendered via the bespoke
`sectionDataChip` mono data-pill recipe ("not a standard number badge"). They
now use the canonical `Badge` primitive at `size="sm"` (the documented
tab-count bubble shape) so a count reads as a standard number badge across the
app. Materials keeps its "N left" meaning; Record/Audit show the bare count.
The Extension "Filed ✓" chip stays on `sectionDataChip` — it's a boolean STATE,
not a count. (Side effect: extract removed the now-unused `{evidenceCount}` /
`{auditCount}` bare-number msgids — raw numbers aren't translatable.)

## Footer aligned to alert detail (#4)

The panel/page footer container now mirrors `AlertDetailDrawer`'s docking
footer grammar — gray `bg-background-section` committed-decision surface (was
white `bg-background-default`) at `py-4` (was `py-3`). The action SET is
unchanged: Last updated · Request input · Copy link on the left; Assign ·
Snooze · Mark as filed on the right. Only the surface/spacing grammar aligns.

## Status banner left-edge alignment (#4b)

The shared `DetailStatusBanner` ships its own `px-6 xl:px-12` content inset
(tuned for the alert detail's roomier px-12 margin), so on /deadlines the
"Past deadline · 42d late" text sat indented past the "Deadlines" header
title's "D". A consuming-side wrapper (`[&>div]:!px-5`) overrides the band's
inner inline padding to `px-5` so the banner left edge aligns to the crumb
bar / header content edge. (The shared component takes no className, and the
brief scoped edits to this file only.)

## Slightly darker Workflow band (#2b)

The `-mx-5` "Workflow" header band bumped one step darker — from
`bg-background-subtle` (gray-100) to `bg-background-section-burn` (the
canonical darker neutral surface) — so the strip reads a touch more defined
against the white card without becoming a loud fill.

## Verification

`pnpm -F @duedatehq/app exec tsgo --noEmit` clean (exit 0). `i18n:extract`
clean (no NEW strings; 2 obsolete bare-number msgids removed). `i18n:compile
--strict` clean. Tokens-only, fixed radius scale, no raw hex.
