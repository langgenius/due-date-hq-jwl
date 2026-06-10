# Deadline detail — white-top reorg + crumb height (2026-06-10)

Yuqi (page feedback on /deadlines/000000000003): "截图的这部分都要白色背景"
(crumb + hero + date cards must all be white), crumb header bar "和左边 sidebar
header 一样高度", plus a 12-item polish batch. This pass does the **structural
reorg**; component polish (stepper invert, bolder active card, thinner activity
rows, smaller avatar, rail icon states, footer prominence) follows separately.

## White top region / gray content (Qn4nX split)

Qn4nX's hero (incl. date cards) and tab bar are white paper; only the tab
*content* sits on the gray wash. Implemented without moving the date strip:

- **Hero header** → `bg-background-default` (page mode).
- **Date strip** → full-bleed white band (`-mx-12 bg-background-default px-12
  pb-5`) that abuts the header (was `mb-2` on the gray body).
- **Sticky tab bar** → full-bleed white (`-mx-12 bg-background-default px-12`)
  with symmetric `pt-3 pb-3` (addresses #1 "no bottom padding"); its `border-b`
  hands off to the gray content below.
- Outer aside stays `bg-background-subtle` → it's now the backdrop for the tab
  content only.

## Crumb bar height (#B)

`DeadlineCrumbBar`: `py-4` → fixed `h-14` (56px) `flex items-center`, matching
the app sidebar header height so the two top bars line up.

## Tab content padding (#3)

All tab panels `pt-6` → `pt-4` (less top padding under the tab bar).

## Verified

`tsgo --noEmit` clean. Live: crumb/hero/date-cards/tab-bar all white, gray
starts at tab content; crumb bar 56px; 4-tab structure intact.

## Tracked follow-ups (same batch)

#4 content↔stepper padding align · #5 stepper inverted (no white bg/border) · #6
bolder active card · #7 thinner activity rows · #8 smaller avatar · #10 rail
status icon (expand label when active) · #12 footer more prominent.
