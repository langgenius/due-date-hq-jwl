# /today — Actions-this-week table style

Canonical style reference for the **Actions this week** table on `/today`
(`apps/app/src/features/dashboard/actions-list.tsx`). Noted down at Yuqi's
request (2026-06-09 #12 "have you note down this table style? please do") so the
treatment is reusable and doesn't drift.

This is the **white work table** — the focal surface on the dashboard. It reads
as "your work," deliberately distinct from the gray **alert cards** above it
(`bg-background-section`). Different surface colors split the two regions.

## Container

| Property | Value                                                     | Token / class                  |
| -------- | --------------------------------------------------------- | ------------------------------ |
| Surface  | White                                                     | `bg-background-default`        |
| Radius   | 14px                                                      | `rounded-[14px]`               |
| Border   | 1px subtle hairline                                       | `border border-divider-subtle` |
| Clipping | `overflow-hidden` (so group-header fills meet the radius) |

Built on the shared `<Table>` primitive. **No `<TableHeader>`** — column-label
header row is intentionally dropped (Pencil VmcdD: "make it more like ACTIONS").
Scanning relies on consistent column positions + the group rows, not a header.

```
<div className="overflow-hidden rounded-[14px] border border-divider-subtle bg-background-default">
  <Table className="[&_td]:py-2.5 [&_tbody_tr]:even:bg-transparent">
```

- **No zebra striping** — `even:bg-transparent` cancels the primitive's default.
- Rows are grouped: severity **tiers** (Critical / High / Upcoming) at the
  section level, and **status groups** (NOT STARTED / IN REVIEW / …) as in-table
  separator rows.

## Group-separator row

A full-width `<TableRow>` acting as a quiet band:

```
bg-background-subtle px-[18px] py-1
text-[11px] font-semibold tracking-[0.5px] text-text-secondary uppercase
```

## Data row

```
group cursor-pointer
hover:!bg-background-subtle focus-visible:bg-background-subtle focus-visible:outline-none
[&_td]:py-3
```

- Whole row is the click target → opens the obligation drawer.
- Hover/focus fill: `bg-background-subtle`. No per-cell hover.
- Row vertical rhythm: `py-3` (data), `py-1` (group bands).

## Columns (left → right)

| #   | Column        | Content                                                             | Key classes                                                                                                                                                    |
| --- | ------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Rank**      | Smart-Priority rank + accent sparkle; tooltip lists why-now factors | `pr-2 pl-[18px]` · `font-mono text-[11px] font-semibold tabular-nums text-text-tertiary` · `<SparklesIcon className="size-2.5 text-text-accent">`              |
| 2   | **Client**    | Client name (quiet)                                                 | `text-xs text-text-tertiary`                                                                                                                                   |
| 3   | **Action**    | Verb prompt + WHY-NOW subline                                       | prompt: `text-sm font-normal text-text-secondary group-hover:font-medium group-hover:text-text-primary` · subline: corner glyph + `text-xs text-text-tertiary` |
| 4   | **Filing**    | Form code chip                                                      | `<TaxCodeBadge>` — mono code chip (`bg-background-subtle font-mono`)                                                                                           |
| 5   | **Readiness** | Docs x/y indicator                                                  | `<ReadinessIndicator>`                                                                                                                                         |
| 6   | **Status**    | Status pill (+ extension chip)                                      | `<ObligationStatusReadBadge className="h-6 text-xs">`                                                                                                          |
| 7   | **Due**       | Due label + date; red on payment-late                               | `pr-[18px] text-right` · date: `text-xs font-medium tabular-nums text-text-tertiary`                                                                           |

### WHY-NOW subline (column 3)

- **Hidden at rest on every row**; fades in on row hover / focus
  (`opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100`). The
  `opacity-0` reserves row height so the reveal doesn't jitter the table.
  (2026-06-09 — unified; the earlier always-on treatment for Critical rows was
  dropped so the corner + reason reveal the same way on every row.)
- Leads with the **corner glyph** — the filled 9×9 quarter-turn corner
  (`text-text-muted`), signalling a follow-on reason for the prompt above:
  ```
  <svg viewBox="0 0 9 9" className="size-[7px] text-text-muted" fill="none">
    <path d="M0 2V0H1V2C1 5.03757 3.46243 7.5 6.5 7.5H8.5V8.5H6.5C2.91015 8.5 0 5.58985 0 2Z" fill="currentColor" />
  </svg>
  ```
- Copy: `Why now: <factor · factor · …>`.

## Two-color discipline

The table is **neutral by default**. Chromatic accent is rationed:

- **Red** is carried **once per row** — by the DUE cell's payment-late branch
  (`Payment N days late`). Status pills stay neutral so red isn't double-spent.
- **Accent (Dify blue)** appears only on the **Smart Priority** marks — the
  sparkle in the rank cell and the header's sparkle/tooltip trigger.
- Everything else (client, prompt, form chip, readiness, dates) lives in the
  gray text ramp (`text-text-secondary` / `text-text-tertiary`).

## Type & number conventions

- **Mono + tabular-nums** for codes and counts: rank, form code, doc counts,
  dates. (Form codes are mono everywhere — same treatment as the /alerts table.)
- Prompt is the one body-weight read; it darkens + medium-weights on row hover
  to confirm the row is the click target.

## Section header (above the table)

`ACTIONS THIS WEEK` — **Register A** section title (see
`section-header-style.md`): `text-[14px] font-semibold tracking-[0.4px]
text-text-primary uppercase`. Both /today section titles (this + Alerts) share
this primary-ink eyebrow. Trailed by an accent `<SparklesIcon>` that doubles as
the "what's in this list" tooltip trigger. Subtitle: `text-sm text-text-tertiary`
"Curated by Smart Priority…".
