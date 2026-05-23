---
title: 'Client detail tonal weight pass + filing plan column legend'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Stop reading "pale and white"

Yuqi flagged twice in the same critique pass that `/clients/[id]`
"seems very pale and white" — once for the page overall, once
specifically for the Work tab body. Same root cause both times: the
detail page leans on `divider-subtle` (4% black) for chrome that's
actually supposed to anchor the eye, and every section sits on the
same flat `background-default`. The result reads like a long
unstructured form instead of a workbench with sections.

This commit + the filing-plan column legend land together because
they fight the same battle (legibility of structure on a dense page).

## 1. Filing plan: column legend instead of CURRENT TAX YEAR badge

Before:

```
2026  [CURRENT TAX YEAR]  3 open
[Form 1120]  [Mar 17 2026]  [Status]  [$12,500]
[Form 941]   [Apr 30 2026]  [Status]  [$3,200]
...
```

The `CURRENT TAX YEAR` outline chip introduced a third visual
vocabulary in a single section (next-due chip + status chips below +
this outline tag). It also re-stated information the year number was
already carrying — the latest known year is obviously the current
one in 99% of cases.

After:

```
2026  current year  3 open
FORM    DUE        STATUS       EST. TAX
1120    Mar 17     Pending      $12,500
941     Apr 30     Pending      $3,200
...
```

Changes inside `ClientFactsWorkspace.tsx`:

- Dropped the `Current tax year` outline `Badge`. Replaced with a
  small italic tertiary `current year` marker next to the year
  number. Reads as a footnote, doesn't compete with the row chips.
- Added a one-time column legend (`FORM · DUE · STATUS · EST. TAX`)
  rendered as a real `<TableHeader>` inside the first year's
  `<Table>`. Threaded `isFirstSection: boolean` through
  `FilingPlanYearSection` so only the topmost year shows the header
  — repeating it per year section would re-introduce the "table
  stack" look this panel was redesigned to avoid.
- The column legend uses the table primitives, so it lines up
  exactly with the `table-fixed` column widths below. No drift if
  the widths change later.

## 2. Tonal weight pass — fight "pale and white"

The pale feel is the cumulative effect of three places using too-light
chrome:

**a. `ClientWorkPlanPanel` (Filing plan panel)**

- Outer border: `divider-subtle` (4%) → `divider-regular` (8%).
  Matches `ClientActiveAlertsSection` directly above, so the two
  largest panels on the page now have the same chrome strength.
- Title row: added `bg-background-section` tint + `border-b
divider-subtle` so the header reads as a real section header, not
  as a label sitting on the same flat background as the rows below.
- Title weight: `font-medium` → `font-semibold`. Section titles are
  primary anchors on this page; they should pop.

**b. `ClientSummaryStrip` tiles**

- Tile border: `divider-subtle` (4%) → `divider-regular` (8%) at
  rest; hover bumps to `divider-deep` (14%) instead of `regular`.
  The previous 4% border + white body looked like the tiles were
  barely there; the 8% gives them real chrome.

**c. Tabs underline**

- `border-divider-subtle` → `border-divider-regular`. The tabs are
  the primary navigation inside the detail body — at 4% the line
  vanished against `background-default` and tabs felt like floating
  triggers instead of a real tabbar.

## Things deliberately NOT changed

- `DetailSection` chrome (Compliance posture, Filing jurisdictions,
  Risk profile, etc.) — already uses `SectionFrame` with
  `divider-regular`, so it already has the right weight.
- Internal row dividers (`divide-y divide-divider-subtle` between
  filing rows, between alert items): these are item separators
  inside a panel, not panel chrome. Bumping them too would make the
  filing plan read as a heavy grid instead of a flat list.
- Background of `background-default` panels — keeping body bg white
  is right; only the section _headers_ take the tint.

## i18n

`current year` + `Est. tax` translated for zh-CN (`当前年度`,
`预估税款`). All other strings (`Form`, `Due`, `Status`) already had
zh-CN catalog entries.

## Files touched

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` —
  Filing-plan panel chrome + title weight + tinted header; year
  section drops outline badge for italic marker; first year section
  renders column-legend `<TableHeader>`; Tabs underline bumped.
- `apps/app/src/features/clients/ClientSummaryStrip.tsx` — TileShell
  border tier promoted.
- `apps/app/src/i18n/locales/en/messages.po` +
  `apps/app/src/i18n/locales/zh-CN/messages.po` — extracted strings,
  added zh-CN translations for new entries.
