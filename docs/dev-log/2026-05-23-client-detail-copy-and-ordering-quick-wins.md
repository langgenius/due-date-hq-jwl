---
title: 'Client detail copy + ordering quick wins (items 1, 4, 5, 9, 11, 12 from 16-item critique)'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Six quick wins from the 16-item /clients/[id] critique

Yuqi pulled apart `/clients/[id]` and dropped 16 specific feedback
items. This commit handles the six that are clear, low-risk, and
mostly copy/ordering. The other ten (filing-plan structural rethink,
entity-badge consistency audit, date-format audit, summary tile
count, obligation drawer cleanup) need their own thinking and split
into later commits.

## #1 — Contact meta row guards against raw field-name values

Before: when the seed / migration mapping leaves the literal string
`"primary_phone"` in `client.primaryPhone`, the workbench header
rendered it verbatim. Critique called this out directly ("should be
user facing text").

Added two small predicates:

- `looksLikePhone(value)` — at least 3 digits after stripping
  non-digit characters. Catches `"primary_phone"`, `"unknown"`,
  empty placeholders.
- `looksLikeEmail(value)` — basic `.+@.+\..+` shape. Catches
  `"primary_contact_email"` and other source-column-name leaks.

If a value fails the guard the contact link doesn't render. The
underlying data still needs fixing in those cases (separate task) —
but the workbench should never render a snake_case token to a CPA.

## #4 — Filing plan count uses "deadlines", not invented "filings"

Before:

```
Filing plan   3 filings across 2 tax years
```

After:

```
Filing plan   3 deadlines across 2 tax years
```

The X-1 copy audit unified everything user-facing onto "deadline" as
the noun for the canonical primitive. The filing-plan subtitle was
the last place still saying "filing" — same concept, different word,
confusing. The panel keeps the title "Filing plan" because the
year-grouped view IS a different surface from `/obligations` (which
is a flat queue across all clients) — the title names the surface,
the count names the items.

## #5 — Column legend lives above the year heading

The "Filing plan" legend (`FORM · DUE · STATUS · EST. TAX`) was
rendered inside the first year's `<Table>` as a `<TableHeader>`. It
landed visually UNDER the "2026 current year 2 open" year heading,
which inverts the expected "legend above content" reading order.
Critique flagged it directly ("header should be above the year?").

Moved the legend up to the panel-body level — a flex row between the
panel header and the `divide-y` year sections. Widths mirror the
TableCell widths in the rows below (`flex-1 / 132 / 160 / 110 / 140`
with matching `px-3` inner padding) so it lines up close to the
table-fixed columns even though it isn't itself inside a `<table>`.
Pixel-perfect alignment isn't required since it's an orientation cue,
not a real column header.

Dropped `isFirstSection` from `FilingPlanYearSection` and removed the
in-Table `<TableHeader>` block — the legend's job is now panel-wide,
not year-section-local.

## #9 — Summary tile label moves above the value

Before, `TileShell` rendered `value` (large bold) then `label` (small
secondary) below. Critique: "if it is a title, it should be on top of
the form."

After: label renders first (small uppercase tracked tertiary tag),
value renders second (the large primary). Matches the standard
metric-card pattern across the rest of the product (Rule library
StatsBar, Coverage scoreboard, etc.) — label-above-value is the
read order users already expect from this layout.

## #11 — Contact row drops "Since {Mon YYYY}"

Before: contact meta row showed `email · phone · Since May 2026`.
Critique: "is this important? can you group it somewhere else?"

Dropped. The created-at date isn't useful for daily workflow and was
visually noisy alongside the live contact links. Still discoverable
via the Activity tab / Audit log. The `useMemo` for `sinceLabel` came
out with it.

## #12 — Cycle arrows move out of the action cluster

Before: `← 3/12 →` cycle arrows sat in the right-edge `actions` slot
alongside `Archive` / overflow menu / `Add deadline`. Critique:
"this should not be at the same level as the other Client actions,
it should be a page level thing."

Right call — the cycle arrows are page-level navigation (move
between clients in the filtered list); the action cluster is for
actions on the page subject (archive THIS client, add a deadline
to THIS client). Mixing the two made the action cluster feel busy
and gave the chevrons accidental visual weight.

`PageHeader` gained a new `eyebrowAside` slot: optional content
rendered on the right side of the eyebrow / breadcrumb row.
`ClientCycleArrows` now mounts there.

To make this work I also changed `PageHeader`'s eyebrow wrapper from
`<p>` to `<div>` — the eyebrow can now host non-inline children like
button groups without producing invalid HTML. The 11px / uppercase /
tracked / tertiary styling still applies to plain-text children
(class inheritance cascades); `eyebrowAside` content provides its
own treatment so the chevrons / position counter don't pick up the
uppercase tag look.

## i18n

`# deadline / # deadlines` plural extracted to en + zh-CN catalogs.
zh-CN translation: `# 个截止事项` (singular/plural identical in zh).

## Files touched

- `apps/app/src/components/patterns/page-header.tsx` — new
  `eyebrowAside` slot, `<p>` → `<div>` wrapper for the eyebrow row.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — contact
  row guards + "Since" drop; filing plan column legend hoisted to
  panel-body level + "filings → deadlines"; cycle arrows move from
  `actions` to `eyebrowAside`.
- `apps/app/src/features/clients/ClientSummaryStrip.tsx` — TileShell
  renders label above value.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — new plural
  string + Chinese translation.
