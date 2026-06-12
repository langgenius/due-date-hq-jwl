# 2026-06-12 — /alerts: 1040px feed column + day-band select-all

Yuqi round: "is it because it is too wide — attack or defend" / day date "too
obvious" / "better section organise" / "should a day have a select all".

## Width: attack, structurally (#2)

The 72ch title cap fixed line LENGTH but the row still stretched into a sparse
L at the page's full 1366px — title left, source pinned ~600px away, dead
middle. The alerts list is a reading FEED, not a data table: the list column
(toolbar + rows) now caps at **1040px, left-pinned**, so the page title,
toolbar, and rows share one left rail and each row sits in a single eye-span.
Map view keeps the full width (a map earns the span); the rail+detail layout
is untouched.

## Day bands: quieter date + real section heads (#3, #4, select-all)

- Date register 13/600 primary → **13/500 secondary** ("too obvious" — it was
  competing with the 16/600 row titles). Weekday stays quiet beside it.
- **Day select-all**: a tri-state checkbox in the band (checked = whole day,
  indeterminate = partial) toggling every alert in the group via the existing
  functional-update selection handlers. It occupies the same slot as the row
  checkboxes — band cb x=134 == row cb x=134 — which keeps the date on the
  content grid for free.
- **"N alerts" count right-pinned** — each band now reads as a real section
  head: [select] [date · weekday] ……… [size].

History mode renders bands without checkboxes (selectable is list-mode-only);
map view list rail unaffected.

## Verify

tsgo clean. Instance 5189: list column 1040px; band date 13/500
rgb(53,64,82); count renders ("2 alerts" on May 15); band checkbox click
selects the day's rows (verified live); checkbox alignment exact.
