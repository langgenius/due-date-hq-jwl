# Page family — canonical patterns

**Type:** design guideline (companion to `DueDateHQ-DESIGN.md`)
**Source:** consolidated from /today + /alerts + /deadlines through
the 66th–80th passes.
**Audience:** designers + engineers landing a new list/index page.
**Authority:** prescriptive. Token references override raw values.

The three reference pages converged on a shared vocabulary. This
doc captures it as design intent + tokens, not as code. Engineers
copy the **tokens**; if implementations diverge from these
guidelines, the doc is right.

---

## §1. Direction

These pages are **scan surfaces**. The CPA arrives to triage
work, not to read. Design intent is therefore:

- **Density over hero.** Surface as many actionable rows / cards
  as the viewport can fit. No oversized titles, no decorative
  hero band, no "marketing-page" empty top half.
- **Filters precede content.** Scope tabs + chip row come
  BEFORE the data so the user narrows before scanning.
- **One card per page.** The data surface is a single bordered
  frame, not a sequence of nested cards. Multiple cards =
  decision fatigue.
- **Pagination is structural, not decorative.** Always inside
  the data frame, always at the same position, always
  navigable by keyboard.
- **Color is reserved for urgency.** Status pills, late-day
  copy, and selected rows are the only places color appears
  by default.

The shared aesthetic is **Ramp × Linear, Light Workbench** (per
`DueDateHQ-DESIGN.md` §0). Nothing in this doc overrides that
positioning; everything refines it for list-page application.

---

## §2. Page-level layout

### Intent

Top-down rhythm: PageHeader → filter scope → filter chips →
data card. No sidebar inside the page, no inset wrappers, no
extra borders around the content area.

### Tokens

| Slot              | Token                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| Outer padding (X) | `--space-page-x` (`px-4 md:px-6`)                                                |
| Outer padding (Y) | `--space-page-y-top` / `--space-page-y-bottom` (`pt-6 md:pt-8` / `pb-4 md:pb-6`) |
| Vertical rhythm   | `--space-section-gap` (`gap-6`); sticky-footer variant uses `gap-4`.             |
| Max width         | `--max-w-page-wide`                                                              |
| Background        | `--background-page` (inherits inset surface canonical)                           |

### Restrictions

- ❌ Do not nest a second `<div className="rounded-md border">`
  wrapper around the content area. The data card below IS the
  visible frame.
- ❌ Do not introduce per-page `max-w` overrides. Use
  `--max-w-page-wide` so all family pages share one column.
- ❌ Do not add `bg-*` to the outer container. It should
  inherit the inset surface tint.

### Two variants

| Variant       | Use when                                                                            | Differences                                                                          |
| ------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Regular       | /today, /alerts, /rules/library, /opportunities                                     | `gap-6`, `pb-4/6`. Content can grow past viewport.                                   |
| Sticky-footer | /deadlines, /clients (and any page where the data card pins to the viewport bottom) | `gap-4`, `pb-0`, `xl:h-screen xl:overflow-hidden`. Inner card uses `flex-1 min-h-0`. |

Pick exactly one; do not mix.

---

## §3. PageHeader

### Intent

Identify the page and qualify it with one number. Surface the
1-2 primary cross-page actions to the right. Nothing else
belongs in the header — no search, no filters, no metrics.

### Tokens

| Slot                | Token                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| Title type          | `--text-page-title` (`text-2xl leading-7 font-semibold`, `text-text-primary`)    |
| Count chip bg       | `--state-base-hover`                                                             |
| Count chip text     | `--text-secondary`                                                               |
| Count chip type     | `--text-caption` (`text-xs font-medium tabular-nums`)                            |
| Count chip shape    | `--radius-full` + `--space-chip-x` (`px-2`) + `--space-chip-y` (`py-0.5`)        |
| Description         | `--text-body-small` (`text-[13px] leading-5`, `text-text-secondary`, max-w 1080) |
| Actions cluster gap | `--space-cluster-gap` (`gap-2`)                                                  |

### Direction

The title is a noun (`Deadlines`, `Alerts`, `Clients`). The
count chip immediately to its right qualifies what the user is
looking at (`17 open`, `3 ongoing`, `9 Clients`). Read order:
noun → number → done.

### Restrictions

- ❌ Title in title-case (e.g. `Deadlines View`). Use a single
  noun.
- ❌ Count chip without `tabular-nums`. Digits must align across
  pages and across loading states.
- ❌ Actions cluster of more than 2 buttons. If three, the
  third belongs in a dropdown.
- ❌ `<Button variant="default">` (solid) in the actions slot.
  Use `variant="outline"` — these are secondary actions, not
  the page's primary CTA.
- ❌ `DownloadIcon` for "Export" buttons. Export = data leaving
  the app = `ArrowUpRightIcon` (matches Linear / Notion / Figma).
- ❌ Description longer than one sentence. If two are needed,
  the second is doing the count chip's job — drop it.

### When to omit the description

When the count chip + filter tabs below already qualify the
page (e.g. /deadlines shows `17 open` + scope tabs that count
each status). Adding a description on top of those is
redundant chrome.

---

## §4. Filter scope tabs

### Intent

A segmented row of mutually-exclusive scopes — the primary axis
on which the user splits the data. Examples:

- /deadlines: All / Not started / Waiting on client / Blocked / In review / Filed / Completed
- /alerts: Ongoing / Applied / Dismissed / All
- /clients: usually omitted (only one scope = "all clients")

### Tokens

| Slot             | Token                                                   |
| ---------------- | ------------------------------------------------------- |
| Tab type         | `--text-tab` (`text-sm font-medium`)                    |
| Tab icon size    | `--size-icon-sm` (`size-4`)                             |
| Tab count type   | `--text-caption` + `tabular-nums`, `text-text-tertiary` |
| Active indicator | 2px `--state-accent-solid` underline                    |
| Tab gap          | `--space-cluster-gap`                                   |

### Restrictions

- ❌ More than 7 tabs. If you'd have 8+, fold the rarest into
  an "Other" tab.
- ❌ Tabs without counts when counts are knowable. A scope tab
  without a count is a guess about whether to click it.
- ❌ Custom active-state colors. The 2px accent underline is
  the family signature.

---

## §5. Filter chip row

### Intent

Below the scope tabs. Carries two kinds of controls:

1. **Pre-set filter chips** — pill buttons that toggle common
   filter combinations (`Past due`, `Due this week`,
   `Needs evidence`).
2. **Filter dropdowns** — `FilterTrigger` for selections that
   have many options (`Sort by`, `State`, `Source`, etc.).

### Tokens

| Slot                       | Token                                                           |
| -------------------------- | --------------------------------------------------------------- |
| Pre-set chip — bg          | `--background-default`                                          |
| Pre-set chip — bg (hover)  | `--state-base-hover`                                            |
| Pre-set chip — bg (active) | `--state-accent-hover`                                          |
| Pre-set chip — border      | `--divider-regular` (inactive); `--state-accent-solid` (active) |
| Pre-set chip — text        | `--text-secondary` (inactive); `--text-accent` (active)         |
| Pre-set chip — shape       | `--radius-full`, `px-3 py-1`                                    |
| Filter dropdown trigger    | `FilterTrigger` primitive                                       |

**Filter dropdown trigger — Stripe S4 visual (2026-05-26):**

| Slot                                        | Token                                                             |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `FilterTrigger` — rest border               | `--divider-subtle` (dashed)                                       |
| `FilterTrigger` — rest bg                   | `transparent`                                                     |
| `FilterTrigger` — rest text                 | `--text-secondary`                                                |
| `FilterTrigger` — rest leading icon         | lucide `PlusIcon` size-3.5 @ opacity-70                           |
| `FilterTrigger` — hover border / bg / text  | `--divider-regular` / `--state-base-hover` / `--text-primary`     |
| `FilterTrigger` — active border / bg / text | `--state-accent-solid` / `--state-accent-hover` / `--text-accent` |
| `FilterTrigger` — active leading affordance | caller-provided count badge (the `+` is suppressed)               |

The `+` prefix reads as "click to ADD a filter to your view"
rather than "this is a permanent filter chip" — borrowed from
the Stripe dashboard filter-row language. Active treatment
(accent border + accent bg + count badge) is unchanged.

### Direction

- Pre-set chips on the left, filter dropdowns on the right.
- Within each cluster, ordered by frequency of use.
- Always-visible row — even when no filter is active. Empty
  state of the row would hide the affordance.

### Restrictions

- ❌ Show pre-set chips only when ≥2 are active. The threshold
  is **1** active filter — the row should never sit empty just
  because exactly one chip is on.
- ❌ Bespoke filter trigger chrome. Always use the
  `FilterTrigger` primitive so the active/hover/open states
  agree across the product.
- ❌ Stacking multiple rows of chips. If you need more, the
  set is too long — promote some to a Settings dialog.

---

## §6. Data card (table-card frame)

### Intent

A single bordered surface that contains the table AND the
pagination. Reads as one frame. Owns its own height contract
(flex-1 inside the page) so the page-size hook can measure it
directly. Pagination is pinned to the bottom of the frame
regardless of how many rows are on the current page.

### Tokens

| Slot                  | Token                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Card border           | `--divider-subtle`                                                                            |
| Card radius           | `--radius-md`                                                                                 |
| Card bg               | inherits via rows-area (`--background-default`)                                               |
| Rows-area bg          | `--background-default`                                                                        |
| TableHeader bg        | `--background-default-dimmed` (light blue-tinted gray)                                        |
| TableHeader type      | `--text-tablehead` (`text-sm font-medium normal-case tracking-normal`), `text-text-secondary` |
| Row height            | `--row-height-table` (`h-12` = 48px)                                                          |
| Row hover bg          | `--state-base-hover`                                                                          |
| Row selected bg       | `--state-accent-hover`                                                                        |
| Row left-rail (group) | 2px `--divider-regular`                                                                       |
| Cell type             | `--text-body` (`text-sm`)                                                                     |
| Cell padding (X)      | `--space-cell-x` (`px-2`)                                                                     |
| Pagination border-top | `--divider-subtle`                                                                            |
| Pagination padding    | `--space-pagination-y` (`py-6`) + `--space-cell-x` (`px-2`)                                   |

### Direction

- The data card is the ONLY card on the page. No additional
  bordered surfaces.
- Inside the card, TableHeader is the dimmed band at the top;
  rows below sit on white; pagination is a hairline-separated
  footer at the bottom.
- The rows-area is **flex-1** so it elastically fills whatever
  height remains after pagination. On a partial page (e.g. 3
  rows on page 2), rows sit at the top, the rest of the
  rows-area is white whitespace, pagination still at the
  bottom. **Pagination position is stable across pages.**

### Responsive page-size

The number of rows per page is **derived from the card's
measured height**, not configured. Direction:

- Measure the card (the slot where rows live), not the page or
  the queue column. Filter bars are NOT in the budget.
- Use a callback ref so measurement fires on mount even when
  the card is rendered conditionally (inside a loading ternary).
- Subtract a stable chrome value (TableHeader + Pagination +
  borders ≈ 96px) and divide by row height (48px).
- Clamp between 8 and 40 rows so the page never collapses to
  nothing or balloons past scan readability.

Tokens: `--page-size-min` (8), `--page-size-max` (40),
`--row-height-table` (48), `--inside-chrome-budget` (96).

### Restrictions

- ❌ `position: sticky` on the pagination strip. The flex-1
  rows-area pattern is simpler and works on every row count.
- ❌ A "table only" card without the pagination inside. The
  two read as one.
- ❌ Custom row heights. Use `--row-height-table`. Long
  content wraps via `whitespace-normal break-words`; never
  variable row heights.
- ❌ Per-column `min-w-*` thresholds that force horizontal
  scroll. The data must fit the card width via wrapping.
- ❌ Uppercase kicker labels on TableHeader. Use
  `--text-tablehead` sentence-case.
- ❌ A magic-number `INSIDE_CHROME_PX` based on the queue
  column. Measure the card directly.

### Limitations

- The flex-1 rows-area assumes the parent column has a defined
  height (via the sticky-footer variant or via the regular
  variant + adequate content above). On a short empty state,
  the card might not look "filled" — that's expected; show an
  empty state inside the rows-area.

---

## §7. FloatingActionBar

### Intent

A bottom-pinned bar that appears when ≥1 row is selected. It
indicates batch-mode and surfaces the batch actions. Visually
distinct from the page so the user feels they're in a
different mode.

### Tokens

| Slot         | Token                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Bar bg       | `--state-warning-hover-alt` (a warm peach-cream `#ffe4dd`)               |
| Bar border   | `--state-warning-border`                                                 |
| Bar text     | `--text-primary`                                                         |
| Bar shape    | `--radius-xl`                                                            |
| Bar shadow   | `--shadow-floating` (16px y-offset, 48px blur, 18% black)                |
| Bar position | `fixed bottom-12 left-1/2 -translate-x-1/2` (40px above viewport bottom) |
| Bar z-index  | `--z-floating` (40) — above sticky table footers, below toasts           |
| Button hover | `bg-black/5` (5% black tint)                                             |

### Direction

- Beige, not dark navy. The previous dark-navy bar felt
  alarmist; beige reads as "different mode" without slamming
  the page.
- Centered horizontally so it doesn't anchor to either side.
- 40px above the viewport bottom (not flush) so it reads as a
  floating control surface, not a sticky footer.

### Restrictions

- ❌ Multiple FloatingActionBars on one page. Single bar; if
  more actions are needed, fold into a dropdown inside it.
- ❌ Solid color buttons inside. Use `variant="ghost"` so they
  inherit text-primary against the beige.
- ❌ Toast-style auto-dismiss. The bar stays as long as the
  selection does.

---

## §8. Sidebar surface (cross-cutting)

### Intent

The sidebar is shared chrome across all family pages. Two
contracts that the family relies on:

1. **Notification badge counts** must agree between the
   sidebar and the destination page.
2. **Collapse / expand transitions** must never let content
   visibly leak outside the painted sidebar.

### Tokens

| Slot                      | Token                                   |
| ------------------------- | --------------------------------------- |
| Sidebar width (expanded)  | `--sidebar-width` (220px)               |
| Sidebar width (collapsed) | `--sidebar-width-collapsed` (56px)      |
| Width transition          | `--transition-sidebar` (300ms swiftOut) |
| Badge bg                  | `--state-base-hover-alt`                |
| Badge text                | `--text-tertiary`                       |
| Badge shape               | `--radius-full`                         |

### Direction

- Badge counts come from the SAME query the destination page
  uses. For /rules/pulse the badge uses `pulse.listHistory`
  (page = all alerts including dismissed/applied),
  NOT `pulse.activeCount` (which excludes those).
- Layout flip (`data-collapsed`) is **asymmetric**: immediate
  on collapse (so the layout shrinks before the width does),
  delayed on expand (so the expanded layout never paints
  inside a too-narrow footprint).
- Inner overlay has `overflow: hidden` as a belt-and-
  suspenders clip — if timing ever drifts, content stays
  inside the painted boundary.

### Restrictions

- ❌ Different badge sources between sidebar and page. The
  numbers must always agree.
- ❌ Symmetric collapse/expand timing. The asymmetry is what
  prevents visible overflow during the width animation.

---

## §9. Section heading scale

When you need section headings inside a card, panel, or
section group:

| Level          | Token                                                           | Use for                                                                        |
| -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Page title h1  | `--text-page-title`                                             | Owned by `PageHeader`. Do not roll your own.                                   |
| Section h2     | `--text-section-title` (`text-lg font-semibold tracking-tight`) | Major page sections — "Alerts", "Actions this week" on /today.                 |
| Sub-section h4 | `--text-subsection-title` (`text-sm font-semibold`)             | Clusters inside a panel — "Applicability", "Due date", "Evidence" in a drawer. |

### Restrictions

- ❌ Uppercase kicker eyebrows (`text-caption uppercase
tracking-wider`). The family retired this style. Use
  `--text-subsection-title` instead.
- ❌ Section h2 inside a card frame. Cards already carry their
  own framing — adding an h2 inside doubles the chrome.

---

## §10. Tone + color reservation

Color usage on family pages follows `DueDateHQ-DESIGN.md` §7.
The page-level summary:

| Token color             | Reserved for                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `--state-destructive-*` | Late dates, hard errors, blocked status                       |
| `--state-warning-*`     | Due-soon dates, FloatingActionBar surface, soft warnings      |
| `--state-accent-*`      | Selected rows, primary CTA hover, "filter applied" affordance |
| `--state-success-*`     | Filed / completed / paid statuses, "all clear" empty states   |
| `--text-tertiary`       | Caption-tier copy, kicker labels (when truly secondary)       |
| `--text-secondary`      | Body-tier copy, header text                                   |

### Restrictions

- ❌ Red for "draft is not ready" — that's a pending state,
  not an error. Use `--text-tertiary`.
- ❌ Accent (blue) for status pills that aren't selected.
  Status color comes from the status itself (success, warning,
  destructive), not from accent.
- ❌ Hex values. Always reference a token. If no token exists
  for the shade you need, add one to the design system FIRST,
  then reference it.

---

## §11. Empty states

Two shapes — match the surface:

### Section-internal empty

For an empty card-inside-a-page (e.g. /today's Alerts section
with no alerts). Token contract:

| Slot    | Token                                 |
| ------- | ------------------------------------- |
| Border  | `border-dashed` `--divider-regular`   |
| Padding | `py-8`                                |
| Type    | `--text-body-small` `--text-tertiary` |
| Radius  | `--radius-md`                         |

### Page-level empty

For an entire page with zero content (e.g. /clients with no
clients). Use the shared `SharedEmptyState` primitive — it
carries the canonical illustration + headline + CTA.

### Restrictions

- ❌ Custom empty-state illustrations per page. The shared
  primitive is the source.
- ❌ Empty states without a CTA. Every empty state must offer
  a way out — import, create, or change filter.

---

## §12. When to apply

Any new page that:

- Renders a list / grid / table of N items as primary content,
- Has filters (scope tabs and/or chip row) above the data,
- Needs pagination, batch select, or row hover affordances.

Examples where this should land next: /opportunities, future
inbox-style surfaces, any new index page in /settings.

For non-list surfaces (e.g. a single-entity detail page like
/clients/[id]), refer to `clients-list-and-detail-critique-
2026-05-22.md` and `inset-surface-design-system.md` instead.

---

## §13. Verification checklist

Before shipping a new page in the family, verify each:

- [ ] Outer container uses the regular OR sticky-footer
      variant — not a custom hybrid.
- [ ] PageHeader has noun title + count chip; description
      omitted if redundant; ≤2 outline actions.
- [ ] Filter scope tabs (if present) carry icon + label + count.
- [ ] Filter chip row uses `FilterTrigger` for dropdowns;
      always-visible.
- [ ] Data card is a single bordered frame containing the
      table AND pagination.
- [ ] Pagination position is the SAME on every page (verify
      by paging to a partial page).
- [ ] Row count adjusts with viewport height (verify by
      shrinking the window).
- [ ] No `position: sticky` on the pagination strip.
- [ ] FloatingActionBar (if used) is beige, ghost buttons,
      bottom-12.
- [ ] Sidebar badge for this page matches the page's own
      count chip.
- [ ] No uppercase kicker labels.
- [ ] All colors via tokens; no inline hex values.

---

## Related docs

- `DueDateHQ-DESIGN.md` — visual system, color tokens,
  typography scale (this doc layers on top of it).
- `inset-surface-design-system.md` — inset page background +
  paper-rises drawer canonical.
- `pulse-vocabulary.md` — Pulse alert severity + change-kind.
- `obligation-status-icon-vocabulary.md` — status pill tone +
  icon per state.
- `filter-vs-badge-contract.md` — when to show a filter chip
  vs a passive badge.
- `docs/dev-log/2026-05-26-{sixty-sixth..eightieth}-pass.md` —
  the per-iteration decisions that produced these patterns.
