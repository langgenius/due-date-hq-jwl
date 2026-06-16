# Deadline table subject weight + crumb parity (deadlines polish)

_2026-06-16_

Two cross-surface cohesion fixes from the alert↔deadline critique.

## Table: the client-name column is now a consistent subject anchor

`use-obligation-queue-columns.tsx` — the client name (the row's SUBJECT) was
`font-normal` until the row was active, so the deadline table's primary column
read _light_ by default, unlike the alert list's bold-anchor titles. Raised the
floor to `font-medium` always; the active row reads `font-semibold`. The row's
subject now reads as the subject the way the alert headline does — without
turning the table into a card-list (it stays a dense workbench).

(The bigger archetype question — dense table vs the alert card-list — is left as
a deliberate product decision, not silently changed.)

## Crumb: deadline top bar mirrors the alert top bar

`DeadlineCrumbBar.tsx` diverged from `AlertDetailDrawer`'s top bar: a
back-`ChevronLeft` + `text-base` crumb capped to a 760px measure. The alert top
bar is full-bleed `px-5` CHROME with a chevron-less `text-sm` slash-path crumb
(the path IS the back metaphor; a back-arrow on top of it was a mixed signal).
Rebuilt the crumb bar to match exactly: dropped the chevron + the 760px cap, crumb
→ `text-sm`/tertiary, band → full-width `px-5` justify-between. "N of M" + close ✕
unchanged (also dropped a stray `font-medium` on the position read-out to match
alerts).

Not changed: the deadline detail keeps the title visible on scroll via
hero-collapse (the alert reveals it in the crumb) — different mechanism, same
result; the crumb-title-reveal swap (#25) is a separate, lower-value follow-up.

## Verify

tsgo + vp clean. Live screenshot still blocked by the parallel session driving
the shared preview tab; both are low-risk token/structure changes.
