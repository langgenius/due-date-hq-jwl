# Page family canonical patterns

**Date:** 2026-05-26
**Source:** consolidated from /today, /alerts, /deadlines through
the 66th–80th design passes (see `docs/dev-log/*-pass.md`).
**Audience:** anyone landing a new list/index page (e.g. /clients,
/rules/library, /opportunities, future surfaces) who wants the
result to read as part of the same product family without
re-deriving every decision.

This doc is **prescriptive**, not exploratory — copy the shapes
below verbatim, override only with a documented reason. Each
section ends with the exact class string or file path you can
paste in.

## Layout primitives

### 1. Outer container (page wrapper)

Two variants. Use the **regular** one unless the page has a
sticky pagination footer.

**Regular** (used by /today, /alerts, /clients, /rules/library):

```tsx
<div className="mx-auto flex max-w-page-wide flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6">
  <PageHeader ... />
  ...content...
</div>
```

**Sticky-footer variant** (used by /deadlines, anywhere with a
pagination strip pinned to the viewport bottom):

```tsx
<div className="flex flex-col gap-4 px-4 pt-6 pb-0 md:px-6 md:pt-8 md:pb-0 xl:h-screen xl:overflow-hidden">
  <PageHeader ... />
  ...content...
</div>
```

Key differences:

- `gap-4` (16px) vs `gap-6` (24px) — denser for the table-heavy
  case.
- `pb-0` vs `pb-4/6` — footer hugs the viewport bottom.
- `xl:h-screen xl:overflow-hidden` — required when an inner
  card needs `min-h-0 flex-1` to flex-fill the viewport height.

### 2. PageHeader

Canonical primitive: `@/components/patterns/page-header`. Three
slots — title, actions, description.

```tsx
<PageHeader
  title={
    <span className="inline-flex items-center gap-2">
      <Trans>Page name</Trans>
      <span className="rounded-full bg-state-base-hover px-2 py-0.5 text-xs font-medium tabular-nums text-text-secondary">
        <Trans>
          {count} {countNoun}
        </Trans>
      </span>
    </span>
  }
  description={t`Optional 1-line description.`}
  actions={
    <>
      <Button variant="outline" size="sm">
        …
      </Button>
      <Button variant="outline" size="sm">
        …
      </Button>
    </>
  }
/>
```

**Title typography:** the primitive renders `text-2xl leading-7
font-semibold text-text-primary` on an h1. Do not override.

**Count chip:** the rounded pill after the title is the canonical
qualifier ("17 open", "9 Clients", "3 ongoing"). Always use:

```
rounded-full bg-state-base-hover px-2 py-0.5
text-xs font-medium tabular-nums text-text-secondary
```

**Description:** optional. The primitive renders it as
`text-[13px] leading-5 text-text-secondary max-w-[1080px]`. Use
sentence case. Skip entirely when the count chip already
qualifies the page (e.g. /deadlines has chip + filter tabs, no
description).

**Actions:** right-aligned cluster of `<Button variant="outline"
size="sm">`. Outline (not solid) so they read as secondary
actions, not the page's primary CTA. Icon-prefixed via
`data-icon="inline-start"`. **Export** uses `ArrowUpRightIcon`
(data leaving the app); avoid `DownloadIcon` for export actions.

### 3. Filter scope tabs (segmented scope row)

For pages with scope tabs (status filters on /deadlines, ongoing/
applied/dismissed on /alerts), use the `Tabs` primitive with this
shape:

```tsx
<Tabs value={scope} onValueChange={setScope}>
  <TabsList>
    <TabsTrigger value="all">
      <Trans>All</Trans>
      <span className="ml-1 tabular-nums text-text-tertiary">{n}</span>
    </TabsTrigger>
    <TabsTrigger value="not_started">
      <NotStartedIcon className="size-4" />
      <Trans>Not started</Trans>
      <span className="ml-1 tabular-nums text-text-tertiary">{n}</span>
    </TabsTrigger>
    ...
  </TabsList>
</Tabs>
```

Each trigger: optional leading icon (size-4), label, trailing
tabular count. Active state has a 2px underline accent — the
`Tabs` primitive handles it; don't customize.

### 4. Filter chip row (secondary filters)

The row below scope tabs. Pill-shaped pre-set filters ("Past
due", "Due this week", "Needs evidence") + filter dropdowns
("Sort by Date", state filter, etc.).

**Pre-set chips:**

```tsx
<button className="rounded-full border border-divider-regular bg-background-default px-3 py-1 text-xs font-medium text-text-secondary hover:bg-state-base-hover data-[active=true]:bg-state-accent-hover data-[active=true]:border-state-accent-solid data-[active=true]:text-text-accent">
  {label}
</button>
```

**Filter dropdowns:** use the canonical `FilterTrigger`
primitive (`@/components/patterns/filter-trigger`). It wraps a
DropdownMenu trigger with the right chrome:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger
    render={
      <FilterTrigger active={hasFilter}>
        <span className="text-text-tertiary">
          <Trans>Sort by</Trans>
        </span>
        <span>{currentValueLabel}</span>
      </FilterTrigger>
    }
  />
  <DropdownMenuContent align="end" className="min-w-[180px]">
    <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
      <DropdownMenuRadioItem value="…">…</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

`FilterTrigger` props:

- `active`: boolean — when true, picks up the accent-tinted bg
  - accent-solid border + accent text. Use for "filter
    currently applied."
- `hideChevron`: optional — suppress the trailing ChevronDown.

**Show filter chips at ≥1 active filter** (not ≥2). The chip
row should never sit empty just because exactly one filter is
active.

## Table-card frame (for any list with rows + pagination)

The shared pattern from /deadlines. The card owns the height
contract; rows fill the available space; pagination is pinned
to the card bottom regardless of how many rows are on the page.

### Frame

```tsx
<div
  ref={setTableCardElement}
  className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-divider-subtle"
>
  {/* Rows-area: flex-1 so it fills the card vertically */}
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background-default">
    <Table className="rounded-none border-0 [&_th]:!whitespace-normal [&_th]:!px-2 [&_td]:!whitespace-normal [&_td]:!px-2 [&_td]:!align-middle [&_td]:break-words">
      <TableHeader className="!bg-background-default-dimmed">
        ...
      </TableHeader>
      <TableBody>...</TableBody>
    </Table>
  </div>
  {/* Pagination: shrink-0 so it always sits at the card bottom */}
  <div className="flex shrink-0 items-center justify-between border-t border-divider-subtle bg-background-default px-2 py-6">
    <span className="text-xs text-text-tertiary">
      <Plural value={total} one="# deadline" other="# deadlines" />
    </span>
    <Pagination ... />
  </div>
</div>
```

**Why this shape:**

- Border + `rounded-md` on the **wrapper** clipped via
  `overflow-hidden` — Table and Pagination drop their own
  borders + radii. The corners just work.
- `flex-1 min-h-0` on the rows-area so it elastically fills
  the card. On a partial page (3 rows), the rows sit at the
  top, white space below, pagination at the bottom. Pagination
  position is **stable across pages**.
- `bg-background-default` on the rows-area so the empty space
  on partial pages reads as the same white surface as the rows
  above (not the page bg).
- `border-t` is the pagination's only border — separator
  hairline from the last data row.
- `py-6` (24px) on the pagination strip — reads as a
  deliberate card footer, not a squeezed toolbar.

### Responsive page size

Use the callback-ref hook `useResponsivePageSize()` (defined
locally in `obligations.tsx`; promote to a shared module when
the next consumer arrives). It returns `[pageSize, setElement]`:

```tsx
const [responsivePageSize, setTableCardElement] = useResponsivePageSize()
// Attach the setter to the table-card ref:
<div ref={setTableCardElement} className="...">
```

**Why callback ref, not `useRef`:** the table-card is rendered
conditionally (inside loading/success ternaries). A
`useRef<HTMLDivElement | null>(null)` would be `null` when the
effect first runs; the page size would stay at the MIN forever.
The callback ref re-fires when the element mounts later. See
the 80th-pass dev log for the diagnostic.

Constants tuned for the current row chrome:

- `CLIENT_PAGE_SIZE_MIN = 8`
- `CLIENT_PAGE_SIZE_MAX = 40`
- `CLIENT_ROW_HEIGHT_PX = 48` (the `h-12` row height)
- `INSIDE_CHROME_PX = 96` (TableHeader + Pagination + borders +
  buffer). Subtracted from the table-card's `clientHeight`.

### Row pattern

```tsx
<TableRow
  role="button"
  tabIndex={0}
  className="h-12 group cursor-pointer border-l-2 border-l-transparent hover:bg-state-base-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt data-[state=selected]:bg-state-accent-hover"
>
```

- **`h-12` fixed** (48px) — uniform row height regardless of
  cell content (avatar vs `?` placeholder).
- **`border-l-2 border-l-transparent`** — reserves a 2px left
  rail slot. Cluster-grouped rows (same client cluster) flip
  the color to `border-l-divider-regular` for a visible rail.
- **`group`** — enables per-cell affordances (e.g. peek icon
  fade-in on hover).
- **Hover:** `bg-state-base-hover`. **Selected:**
  `bg-state-accent-hover` via `data-state="selected"`.

### TableHeader pattern

```tsx
<TableHeader className="!bg-background-default-dimmed">
  <TableRow className="hover:bg-transparent">
    <TableHead className="text-sm font-medium normal-case tracking-normal text-text-secondary">
      Column name
    </TableHead>
    ...
  </TableRow>
</TableHeader>
```

- **Header bg:** `bg-background-default-dimmed` (a light blue-
  tinted gray) — sits a step above the white body rows without
  going full subtle-blue.
- **Header text:** `text-sm font-medium normal-case
tracking-normal text-text-secondary`. **NOT** uppercase, NOT
  caption-tier. Reads as column headers, not kicker labels.
- **Hover:** `hover:bg-transparent` on the header row — disables
  the default cell hover, which would otherwise paint the
  header on cursor pass.

### Cell content rules

- `whitespace-normal` + `break-words` on `<td>` so long client
  names wrap rather than force horizontal scroll.
- `align-middle` for vertical centering (the row is `h-12`,
  cells should pin to the middle).
- `px-2` (8px) horizontal padding on `<th>` and `<td>` — denser
  than the primitive's default to fit more columns at scan
  density.

### Avatar + assignee column

Use the canonical `AssigneeAvatar`/`AssigneeQuickPicker` pair.
Both render at `size-8` (32px circle). Unassigned state is a
dashed-outline circle with a `?` icon, doubling as a dropdown
trigger for quick-pick (assigns the CLIENT, not the obligation).

### Status pill column

Right-most column. The pill itself is a colored chip per
status — see `obligation-status-icon-vocabulary.md` for the
canonical tone + icon mapping. Adjunct chips (Blocked-by,
Rejected) appear inline next to the pill when relevant.

## FloatingActionBar (bulk-select bottom bar)

Canonical primitive: `@/components/patterns/floating-action-bar`.

```tsx
{
  selectedCount > 0 ? (
    <FloatingActionBar ariaLabel={t`Bulk actions`}>
      <span className="text-sm font-medium">
        <Plural value={selectedCount} one="# row selected" other="# rows selected" />
      </span>
      <Button variant="ghost">Action 1</Button>
      <Button variant="ghost">Action 2</Button>
      <Button variant="ghost">
        <XIcon /> Clear
      </Button>
    </FloatingActionBar>
  ) : null
}
```

**Visual:** beige (`bg-state-warning-hover-alt`, ~#ffe4dd) with
dark text. `bottom-12 left-1/2 -translate-x-1/2`. Soft shadow.
`z-40` — above table headers + sticky pagination, below toasts.
Child buttons should be `variant="ghost"` (the primitive scopes
text-primary to `[&_button]`).

## Sidebar

### Notification badge on nav items

For sidebar nav rows with a count (Alerts, Deadlines, Rule
library):

```tsx
{
  ...,
  badge: count > 0 ? String(count) : undefined,
  badgeTooltip: t`${count} active alerts`,
}
```

Badge source: pull from the SAME query the destination page
uses, so the sidebar count and the page chip always agree. For
Alerts: `pulse.listHistory(50).length`, NOT `pulse.activeCount`
(the latter excludes dismissed/applied which the page still
shows).

### Collapse / hover-expand contract

Two states — collapsed (56px rail, icons-only) and expanded
(220px, labels visible). Plus hover-expand: hovering a
collapsed sidebar floats an overlay to 220px wide without
shifting the page content.

**Width transition:** 300ms with Apple's `swiftOut` curve
`cubic-bezier(0.32, 0.72, 0, 1)`.

**Layout flip (data-collapsed):** asymmetric. Collapsing flips
the layout immediately (row goes vertical so content shrinks
before width does). Expanding flips the layout AFTER the
300ms width animation (so the horizontal row never paints in
a too-narrow footprint).

See `packages/ui/src/components/ui/sidebar.tsx` for the
implementation — `renderedCollapsed` (delayed on expand) drives
`data-collapsed`; `targetCollapsed` (immediate) drives the
inner overlay width.

## Section heading scale

When you need section headings inside a page or panel:

- **Page title (h1):** `text-2xl leading-7 font-semibold
text-text-primary` — owned by `PageHeader`.
- **Section title (h2):** `text-lg font-semibold tracking-tight
text-text-primary` — for major sections like "Alerts" or
  "Actions this week" on /today.
- **Sub-section (h4):** `text-sm font-semibold text-text-primary`
  — for clusters inside a panel (e.g. Applicability /
  Due date / Evidence on the Rule drawer). **Do not use**
  uppercase kicker labels (`text-caption uppercase
tracking-wider`) — that style is retired.

## Tone + status semantics

Refer to:

- `pulse-vocabulary.md` for alert severity + change-kind colors.
- `obligation-status-icon-vocabulary.md` for status pill tone +
  icon per state.
- `filter-vs-badge-contract.md` for when to show a filter chip
  vs a passive badge.
- `inset-surface-design-system.md` for the inset-page-background
  - paper-rises drawer canonical.

## Empty states

Two shapes — match the surface:

**Section-internal** (inside a page or panel, e.g. "no alerts
on /today"): `<div className="rounded-lg border
border-dashed border-divider-regular py-8 text-center text-sm
text-text-tertiary">...</div>`

**Page-level** (the entire page has no content): use
`SharedEmptyState` if the page expects content (e.g. "Import
clients to get started"), otherwise the section-internal
shape applies.

## What NOT to use

- ❌ Uppercase kicker labels (`text-caption uppercase
tracking-wider`) on section headings. Use `text-sm
font-semibold` instead.
- ❌ `bg-background-subtle` on TableHeader. Use
  `!bg-background-default-dimmed`.
- ❌ Solid red/destructive tone for "informational pending"
  states (e.g. "draft is not ready"). Use `text-text-tertiary`.
- ❌ `position: sticky` on pagination inside a table card —
  the `flex-1 min-h-0` rows-area pattern is simpler and works
  on every page count.
- ❌ Magic-number `INSIDE_CHROME_PX` based on the queue column.
  Measure the table-card directly (the slot where rows go),
  not a surrounding wrapper.
- ❌ `useRef` for the page-size element when it's rendered
  conditionally. Use a callback ref so the effect re-fires on
  attach.
- ❌ Dark navy `FloatingActionBar`. Use beige
  (`bg-state-warning-hover-alt`).
- ❌ `DownloadIcon` for "Export" actions. Use
  `ArrowUpRightIcon` (data leaving the app).

## When to apply

Any new page that:

- Renders a list/grid/table of N items as its primary content.
- Has filters (scope tabs and/or chip row) above the data.
- Needs pagination, batch select, or row hover affordances.

Examples where this should be applied next: /opportunities,
/settings (where applicable), any future inbox-style surface.

## Cross-references

- Implementation: `apps/app/src/routes/obligations.tsx`
  (/deadlines, the most complete reference)
- Implementation: `apps/app/src/routes/dashboard.tsx` (/today)
- Implementation: `apps/app/src/features/pulse/AlertsListPage.tsx`
  (/alerts)
- Primitives: `apps/app/src/components/patterns/filter-trigger.tsx`,
  `floating-action-bar.tsx`, `page-header.tsx`
- Dev logs: `docs/dev-log/2026-05-26-{sixty-sixth..eightieth}-pass.md`
  for the per-iteration decisions that produced these patterns.
