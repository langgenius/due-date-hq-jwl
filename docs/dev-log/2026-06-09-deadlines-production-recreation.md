# Deadlines production recreation (list + detail) — 2026-06-09

A design-polish pass that lands the production Pencil mocks for the
`/deadlines` list (`duedatehq_work.pen` §`MF9jE`), the toolbar View/Actions
menu (§`XKiKR`), and the deadline detail panel (§`rzzww`) on top of the
existing coded design. Mostly chrome + a few additive sections; one small
data plumb (client entity type) feeds a new cell subtitle.

Driven by Yuqi (designer). Builds on top of the current implementation
rather than replacing it — the existing queue table, status timeline,
materials checklist, etc. all stay; the design touches arrange/restyle them
and add the rail + activity sections.

## Data — client entity type on the queue row

`clients.entity_type` is now surfaced on `ObligationQueueRow` end-to-end so
the CLIENT cell can render the "Sole Prop · California" identity subtitle.

- `packages/contracts/src/obligation-queue.ts` — `clientEntityType` enum
  added to `ObligationQueueRowSchema`.
- `packages/db/src/repo/obligation-queue.ts` — `ObligationQueueListRow` +
  the internal raw-joined row narrow `clientEntityType` to the enum (the
  select already projected `client.entityType`).
- `packages/ports/src/obligation-queue.ts` — port row type kept in sync.
- `apps/server/src/procedures/obligation-queue/index.ts` — `RawRow` +
  `toRow` pass the field through.
- Test fixtures updated: `obligation-queue.test.ts` (repo `FakeRow` +
  `makeRow`), `client-detail-model.test.ts` (`queueRow` factory).

## List page (`apps/app/src/routes/obligations.tsx`)

- **Sync status bar** in the PageHeader eyebrow: `● ↻ Synced just now ·
N deadlines tracked` (live scope total; the mock's "≈3h focus" phrase is
  dropped — no backing data).
- **Narrative banner** replaces the three at-a-glance tiles
  (`DeadlinesAtAGlance` import removed): eyebrow date + `CLOSING THE WEEK`,
  a derived headline (`N overdue, M filing today — …`), and a metric line
  (`N active filings · across M entities · $X penalty exposure`). Derived
  from the loaded glance page + the client facet.
- **Consolidated single-line toolbar**: Search (`Search client, form, or
assignee`) · `All Status N` dropdown (replaces the scope-tab strip, writes
  the same `status` param) · `Quick filters` (the relocated
  `ObligationFiltersPopover`, relabeled) …… **kebab** · (columns folded into
  the kebab). The old scope-tab `<nav>` (`ObligationQueueScopeTab`
  component) and the separate Group-by / Filters / Columns row are removed.
- **Table columns** reordered to `FORM · CLIENT(+entity·state subtitle) ·
TAX · STATE(authority + code) · INTERNAL DUE(flame + days late) · OFFICIAL
DUE(prose date) · ASSIGNEE · EXPOSURE · STATUS`. New derived **TAX
  category** column (`taxCategoryLabel`); STATE prefixes the filing
  authority (`shortFilingAuthority` → IRS / FinCEN); OFFICIAL DUE switched
  to `formatDatePretty(…, { alwaysShowYear: true })`; `DueDaysPill` leads
  overdue rows with a flame glyph.
- **Default grouping = urgency bands** (`DEFAULT_GROUP`), so the queue opens
  on `● OVERDUE · N DEADLINES … ≈Xd avg · N of TOTAL` band headers (group
  header restyled with a tone dot + uppercase label + right-side meta;
  `avgAbsDays` added to the header model).
- **Footer hint** row under the table; **Add deadline** is now a split
  button (`CreateObligationDialog` gained optional controlled `open`) with a
  caret dropdown: `Add one deadline` (N) / `Add several deadlines` (Bulk →
  migration wizard) / "Pulse-generated drafts live in Projected".

## Toolbar View/Actions menu — Pencil `XKiKR`

The kebab is the consolidated menu:

- **VIEW** — `Columns` (count + submenu checklist), `Group by` (submenu,
  shows current), `Density` (submenu, wired to the existing `density` URL
  param).
- **ACTIONS** — `Export visible rows` (CSV), `Save current view`,
  `Reset filters` (destructive, disabled when no filters active).

## Detail panel — Pencil `rzzww` (`ObligationQueueDetailDrawer.tsx`)

The Status (Summary) tab is now a **two-column read**:

- Left: the existing milestone timeline + What's-left + Expected-refund +
  authority/stage cards, plus a new **Recent activity** card sourced from
  `detail.auditEvents` (humanized via `useAuditActionLabels`, relative
  timestamps, `View all in Timeline →`).
- Right rail: **Ownership** (assignee avatar + name + a `Change` dropdown
  reusing the assign mutation) and **Linked from** (client profile link +
  `TY {year-1}` prior return).

### Intentionally not done in this pass

- The mock's **penalty-exposure** §6651 derivation table — that's a
  data-modeling feature, out of scope for a polish pass.
- The detail **tab set** stays `Summary · Materials · Extension · Evidence`
  rather than the mock's `Status · Materials · Record · Audit`; the 4-tab
  canonical is explicitly locked (see prior oscillation), so it isn't
  relitigated here.

## Verification

`pnpm check` clean (format + lint + types). List page, kebab, Add-deadline
split, and the detail two-column rail verified in the browser preview.
