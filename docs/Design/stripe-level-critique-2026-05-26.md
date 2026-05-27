# Stripe-level critique — Rule Library + Clients + Client Detail

**Date:** 2026-05-26 (immediately after the Rule library structural P0 + Clients revamp)
**Surfaces:** `/rules/library`, `/clients`, `/clients/[id]`
**Reference bar:** Stripe Dashboard (Product catalogue · Coupons,
Transactions · Payments, Balances, Your overview).
**Method:** Stripe-bar pattern analysis → re-score each surface
against the new bar → per-surface fix list → shared action plan.

The previous critiques scored against the page-family canonical
(/deadlines + /alerts + /clients themselves). Today the bar moves
up: Stripe shows what world-class B2B dashboard UI looks like, and
the three surfaces here have a real gap to close.

---

## §1. The Stripe-bar pattern catalog

What Stripe does that we should adopt verbatim:

### S1. Tab nav with bold purple state

Active tab = brand-color text (purple, ~600 weight) + 2px brand
underline directly under the label. Inactive = gray text, no
underline. **Not** a thin gray hairline with a thin accent line
— a strong, confident purple bar that reads from across the page.

Our current state: text-base, accent underline 2px — close in
shape, but the WEIGHT of the active state is too quiet.

### S2. Status-card filter row

Instead of scope tabs, Stripe puts each scope into a **card**:
generous padding (`p-4`), label on top (`Succeeded`, `Refunded`),
big number below (`61`, `5`). Active card has a thicker purple
border. Inactive cards have a subtle border. Counts that are zero
still show as `0` (not hidden) so the negative space is
informative.

This works because each filter status carries a discrete number
you want to see at a glance. Trading 4 horizontal tabs for 5–6
status cards in a row gives every scope room to breathe AND
surfaces the count without the user clicking.

Our scope tabs (Rule library: All / Active / Needs review /
Missing) could become this card row.

### S3. Info banner with dismiss

Light gray background + lightbulb icon + helpful tip ("Analyze
payment method usage..." / "Use automated email reminders...") +
inline CTA + small × to dismiss. Slim (one row tall), removable,
contextual.

We have nothing like this. Could surface: "Set up sources to keep
the rule library updated automatically" on /rules/library, "Import
clients from CSV to populate the directory faster" on /clients
when count < 5, etc.

### S4. Filter chip row with `+` prefix

Stripe's Transactions page: `+ Date and time`, `+ Amount`,
`+ Currency`, `+ Status`, `+ Payment method`, `+ More filters`.
The `+` makes it clear these are chips you ADD (not select-and-go
dropdowns). Visually lighter than our `FilterTrigger`.

We use `FilterTrigger` with full pill chrome. The Stripe variant
is a ghost-pill with `+` prefix — quieter, more "compose your
filter."

### S5. Right rail for related panels

Balances page: main column = balance summary + recent activity.
Right rail = Payouts card + Automatic payouts CTA + Reports link.
The right rail carries **secondary** content — related actions
and reports that don't interrupt the primary flow.

We currently use right rails ONLY for the obligation detail
panel (/clients/[id], /deadlines). We don't use them for related
content / actions.

### S6. Stat card with bar visualization

"Your overview" stat cards: label (info icon) + big number + thin
horizontal bar showing the breakdown. Distinct from our TileShell
(label + number + subline phrase). The bar adds an immediate
visual proportion read.

We have something like this on /alerts (the progress bar) and
/rules/library (the new RuleReviewProgressBar). But on /clients

- /clients/[id], the TileShell carries a subline phrase, not a
  visualization.

### S7. Hyperlink color for clickable references

Stripe coupon names ("BUNDLE-20", "INSTA30") render in purple.
Customer emails on Transactions render in dark gray with a hover
underline. **Two distinct shades** for two distinct affordances:
"this opens a new view" (purple) vs "this is a contact action"
(gray + hover).

We render most clickable rows in dark gray + hover bg-state-base
shift. No color signal for "this opens detail."

### S8. Generous whitespace

Stripe row heights are ~52-60px. Cell padding is generous. Tables
breathe.

Our row heights are tight (h-12 = 48px). On /clients/[id] filing
plan they're even tighter (py-2). Tighter = denser, but at the
cost of readability and "premium feel."

### S9. Status pills with icon + green-tint

Stripe "Succeeded" = green pill + green checkmark icon. "Paid" =
green pill, no icon. Clean, immediately readable.

We have status pills but the visual is more muted (less green
saturation, no leading icon on most pills).

### S10. Em-dash for empty cells

Stripe never leaves a cell blank — `—` (em-dash) signals "no
value." Tells the eye "this column was checked and had nothing"
vs leaving a blank that might read as "missing data."

We use blanks in many places (/clients table Open / Filed YTD
columns when count is 0, etc.).

### S11. Right-aligned ⋯ overflow on each row

Stripe Transactions row: cells left to right, then `⋯` icon-only
on the right edge. On hover the icon reveals; on click opens a
small menu (View · Refund · Dispute · ...). One-click access to
per-row actions without surfacing them as columns.

We have none of this on /clients / /rules/library rows. The user
clicks the row to open detail.

### S12. Header action cluster with shortcut hint

Stripe "Create coupon" button has an `N` keyboard-shortcut hint
inset in the corner. Tells power users "press N to create" without
adding a separate help panel.

We have hotkeys but no inline hints.

### S13. Title + inline metadata

Stripe "Balances £525.30" — the metric IS part of the title, with
an info icon. Tells you the page's primary value at a glance.

Our titles are noun + count chip ("Clients 9", "Rule library 476
rules"). Same idea but the chip styling is quieter than Stripe's
inline metric.

### S14. Multi-color stacked progress bar in stat cards

"Your overview" Payments stat card: a horizontal bar split into
purple/teal/red segments showing payment method distribution.

We have two-segment bars (active/needs-review). No multi-color
distribution yet.

---

## §2. Re-scoring against the Stripe-level bar

### Rule Library — was 23/40 (post-structural-pass ~28/40)

Scoring **against the new bar**:

| #     | Heuristic                      | Score       | Gap vs Stripe                                                                                              |
| ----- | ------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------- |
| 1     | Visibility of system status    | 3.0         | Progress bar good. Scope tabs read but lack the card-row weight of Stripe's filter row.                    |
| 2     | Match system / real world      | 3.0         | "Filter rules…" placeholder is generic. Jurisdiction codes still abbreviated.                              |
| 3     | User control & freedom         | 2.0         | No J/K nav, no ⋯ per-row actions, no `N` hotkey hint.                                                      |
| 4     | Consistency and standards      | 3.5         | Sticky-footer + table-card + scope tabs just landed. Good. But tab visual weight is lighter than Stripe's. |
| 5     | Error prevention               | 3.0         | Rule edit + batch modals are well-gated.                                                                   |
| 6     | Recognition rather than recall | 2.5         | 7-entity column matrix still on state rows. No `—` for empty cells.                                        |
| 7     | Flexibility & efficiency       | 2.0         | No keyboard nav, no per-row ⋯, no inline filter chips with `+`.                                            |
| 8     | Aesthetic / minimalist         | 2.5         | Tighter row heights, less whitespace than Stripe. State row still busy.                                    |
| 9     | Error recovery                 | 2.5         | Batch review has undo via re-open. No undo on entity filter (chip click).                                  |
| 10    | Help & documentation           | 2.0         | No inline tip banner. No tooltips on Tier badge.                                                           |
| Total |                                | **26.0/40** | Up from 23 baseline by the structural-pass +3. Stripe bar = ~34/40 to feel like a sibling surface.         |

### /clients (list) — was 28/40

Scoring **against the new bar**:

| #     | Heuristic                      | Score       | Gap vs Stripe                                                                                |
| ----- | ------------------------------ | ----------- | -------------------------------------------------------------------------------------------- |
| 1     | Visibility of system status    | 3.0         | "Needs facts" badge on rows is good. No "X clients flagged this week" tip banner.            |
| 2     | Match system / real world      | 3.0         | Owner avatar uses initials. Filing-state column reads naturally.                             |
| 3     | User control & freedom         | 2.5         | No row-level ⋯ overflow. No J/K row nav. Search has `/` hotkey ✓.                            |
| 4     | Consistency and standards      | 3.5         | Table-card + sticky-footer + FilterTrigger toolbar all landed. Tabs (none on this page) n/a. |
| 5     | Error prevention               | 3.0         | Filter Reset / clearing search are well-wired.                                               |
| 6     | Recognition rather than recall | 3.0         | Client names + entity + state read at a glance. Owner avatar color-coded.                    |
| 7     | Flexibility & efficiency       | 2.0         | No ⋯ per row. No keyboard shortcut hint on + New client.                                     |
| 8     | Aesthetic / minimalist         | 2.5         | Row height h-12 tighter than Stripe ~60px. No multi-color progress in the action strip.      |
| 9     | Error recovery                 | 3.0         | Bulk action bar persistent (Stripe-style).                                                   |
| 10    | Help & documentation           | 2.0         | No inline tip banner. No help on the FilterTrigger labels.                                   |
| Total |                                | **27.5/40** | Stripe bar ≈ 34/40.                                                                          |

### /clients/[id] (detail) — was 29.5/40 post-revamp

Scoring **against the new bar**:

| #     | Heuristic                      | Score       | Gap vs Stripe                                                                                                          |
| ----- | ------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1     | Visibility of system status    | 3.5         | Readiness chip surfaces "needs facts." Tab dot → count chip ✓. Active tab purple needs more weight.                    |
| 2     | Match system / real world      | 3.0         | Tab labels in CPA-natural language. "Opportunities" rename ✓.                                                          |
| 3     | User control & freedom         | 2.5         | Cycle arrows j/k visible ✓. No Cmd+K. No ⋯ per row in filing plan.                                                     |
| 4     | Consistency and standards      | 3.5         | Sticky-footer + tabbar + table-card all landed. Tab visual weight lighter than Stripe.                                 |
| 5     | Error prevention               | 3.0         | Archive in ⋯ ✓. Warning tone on filing state ✓.                                                                        |
| 6     | Recognition rather than recall | 3.5         | ContactMetaRow strong.                                                                                                 |
| 7     | Flexibility & efficiency       | 2.5         | J/K cycle ✓. No tab keys 1-4. No row ⋯.                                                                                |
| 8     | Aesthetic / minimalist         | 3.0         | TileShell now canonical card chrome ✓. Filing plan year section has soft bg ✓. Right panel motion-snap (not slide-in). |
| 9     | Error recovery                 | 2.5         | Archive in ⋯ confirm. No undo on tile-click-leads-elsewhere.                                                           |
| 10    | Help & documentation           | 2.0         | No inline tip banner. No tooltip on Compliance posture label.                                                          |
| Total |                                | **29.0/40** | Stripe bar ≈ 34/40.                                                                                                    |

---

## §3. Priority issues — shared across all three surfaces

Stripe-bar gaps that cut across all three (one fix touches multiple
surfaces):

### [P0] Tab nav visual weight

**Where:** /clients/[id] tab bar, /rules/library scope tabs.

**What's wrong:** Active tab is text-secondary → text-primary with a
2px accent underline. The active state reads as quiet, not
confident.

**Stripe target:** Active = brand-color text (text-text-accent or
similar) at font-medium AND a thick (2-3px) brand underline.
Inactive = text-secondary (no underline). When the user scans, the
active state should pop.

**Fix:** Bump active tab text to `text-text-accent font-medium`,
underline to 3px `bg-accent-default rounded-full` (per Stripe).
Inactive stays `text-text-secondary`.

**Surfaces:** `ScopeTabBand` (rules/library), TabsList on
`/clients/[id]`.

**Suggested command:** `/bolder`

### [P0] Status-card filter row (replace scope tabs on /rules/library)

**Where:** /rules/library scope tabs (just shipped) feel light.

**What's wrong:** Tabs are thin. Stripe's equivalent is a row of
**cards**, each with label + count, active card with brand border.

**Stripe target (Transactions page):**

```
[All 78]  [Succeeded 61]  [Refunded 5]  [Disputed 1]  [Failed 7]  [Uncaptured 0]
```

Each is a card (~120px wide, p-4, border-divider-subtle). Active
card = 2px border-accent-default. Cards are clickable.

**Fix:** Replace `ScopeTabBand` with `ScopeCardRow` on /rules/library.
Could also add to /clients if we surface scope filtering there
(currently only entity + state filters).

**Suggested command:** `/shape`

### [P0] Per-row ⋯ overflow

**Where:** /clients rows, /clients/[id] filing-plan rows,
/rules/library rule rows.

**What's wrong:** Clicking a row OPENS detail. No way to do
per-row actions without opening detail first (archive client,
open in new tab, copy ID, mark needs-review, etc.).

**Stripe target:** Right-aligned `⋯` icon-only, hover-revealed (or
always-visible), opens menu with View / Refund / Dispute /
Duplicate-style options.

**Fix:** Add a sticky `⋯` cell at the end of each row that opens
a small DropdownMenu. Hover shows the icon; click opens the menu.
Stops propagation so it doesn't bubble to the row click.

**Suggested command:** `/adapt`

### [P0] Info banner pattern

**Where:** All three surfaces lack helpful inline tips.

**What's wrong:** First-timers see no inline guidance. No moment
where the product tells the user "here's what you can do here."

**Stripe target:** Light gray bg (bg-background-subtle), lightbulb
icon, one-sentence tip, optional CTA link, × to dismiss. Slim
(~48px tall). Dismissed per user (persists via localStorage).

**Fix:** Build `InfoBannerPrimitive` in
`@/components/patterns/info-banner.tsx`. Surfaces:

- `/clients`: when count < 5 → "Import clients from CSV to populate
  the directory faster" + Import CTA.
- `/clients/[id]`: when readiness has needs_facts → "Add this
  client's filing state to start generating deadlines" + Add CTA.
- `/rules/library`: persistent (until dismissed) → "Set up
  sources to keep the rule library updated automatically" + Sources
  CTA.

**Suggested command:** `/clarify`

### [P1] Hyperlink color discipline

**Where:** Clickable row references everywhere.

**What's wrong:** Clickable identifiers (client name, rule form
name, obligation form code) render in `text-text-primary` (dark
gray). No color signal that "this opens detail."

**Stripe target:** Primary clickable identifier = `text-text-accent`
(purple) with hover-underline. Secondary (email, phone) = dark gray
with hover-underline-only.

**Fix:** Update row identifier classes. Could be done at the
primitive level if we have a shared `RowIdentifier` component, or
inline in each list table.

**Suggested command:** `/colorize`

### [P1] Em-dash for empty cells

**Where:** /clients "Open" + "Filed YTD" columns when 0.
/rules/library entity-count columns when 0.

**What's wrong:** Blank cells read as "missing data" or visual
gaps in the row.

**Stripe target:** `—` (em-dash) consistently for "checked and
nothing."

**Fix:** Wrap empty-value renders in a shared `EmptyCellMark`
component (renders `—` text-text-tertiary). Apply across tables.

**Suggested command:** `/clarify` + `/polish`

### [P1] Whitespace pass

**Where:** All three surfaces have h-12 (48px) row heights and
tight cell padding.

**What's wrong:** Reads as dense. Stripe ~52-60px reads as
premium-feeling.

**Fix:** Bump table row height from `h-12` to `h-14` (56px) on
/clients + /clients/[id] filing plan + /rules/library. Or use
`--row-height-table-comfortable` token if we add one.

**Suggested command:** `/polish`

### [P2] Right-rail panels for secondary content

**Where:** /clients (no right rail), /rules/library (no right
rail), /clients/[id] (only used for obligation detail).

**What's wrong:** Some related content + actions could live in a
right rail to lighten the main column.

**Stripe target (Balances page):** Right rail with Payouts /
Automatic payouts / Reports cards.

**Fix:** Identify each surface's "secondary panel" candidates:

- /clients: "Imports this month" + "Quick stats" cards.
- /clients/[id]: when obligation panel is closed → "Open
  deadlines" mini-list + "Recent activity" digest.
- /rules/library: "Sources health" + "Recent rule edits".

**Suggested command:** `/shape`

### [P2] Keyboard shortcut hints inline in primary CTAs

**Where:** All three pages have keyboard hotkeys but no inline
hints on the buttons.

**What's wrong:** Power users can't discover hotkeys visually.

**Stripe target:** Inline `N` chip inside the "Create coupon"
button — small, sub-pixel, doesn't compete with the label.

**Fix:** Add `kbd` chip slot to `Button` primitive. Render on
hover (or always) when `hotkey` prop is set.

**Suggested command:** `/adapt`

---

## §4. Per-surface priorities

### /rules/library (was 23 → now ~26)

Most impactful next 3:

1. **ScopeCardRow** (replace ScopeTabBand) — `/shape`
2. **Drop 7-entity matrix from state rows** (already deferred) — `/distill`
3. **Tab/scope active state bolder purple** — `/bolder`

### /clients (was 28 → now ~27.5 against Stripe)

Most impactful next 3:

1. **Per-row ⋯ overflow** — `/adapt`
2. **Hyperlink color on client name** — `/colorize`
3. **Whitespace bump (h-12 → h-14)** — `/polish`

### /clients/[id] (was 29.5 → now ~29 against Stripe)

Most impactful next 3:

1. **Tab active state bolder purple** — `/bolder`
2. **Right panel slide-in motion (return)** — defer to followup
3. **Per-row ⋯ overflow on filing plan** — `/adapt`

---

## §5. Recommended action plan

A two-phase plan:

### Phase A — Stripe-level chrome (4-6 hours, applies to all three)

1. **`/bolder`**: tab + scope active state bolder (`text-text-accent
font-medium` + 3px underline). Affects /clients/[id] tabs,
   /rules/library ScopeTabBand.
2. **`/clarify`**: build `InfoBannerPrimitive` + drop in three
   surfaces.
3. **`/colorize`**: hyperlink color for row identifiers (client
   name, rule form name).
4. **`/clarify`**: `—` for empty cells. Build `EmptyCellMark`
   primitive.
5. **`/polish`**: row height bump h-12 → h-14 across the family.

### Phase B — Surface-specific big rocks (4-6 hours)

1. **/rules/library**: ScopeCardRow (replace ScopeTabBand). Drop
   7-entity matrix from state rows. `/shape` + `/distill`.
2. **/clients + /clients/[id]**: per-row ⋯ overflow. `/adapt`.
3. **/clients/[id]**: bring back motion slide-in on the obligation
   panel. Already documented as a follow-up.

### Re-critique after each phase

After Phase A: target ≥31/40 on each surface.
After Phase B: target ≥34/40 — same neighborhood as Stripe.

---

## §6. Stripe references

Screenshots referenced (from the user):

- **Product catalogue · Coupons** — tab nav weight, pagination, hyperlink color.
- **Coupons tab closeup** — active-tab visual weight.
- **Transactions · Payments** — status-card filter row, filter chips with `+`, per-row ⋯, status pill, em-dash, info banner.
- **Balances** — right rail, action cluster, stacked bar, recent-activity sub-tabs.
- **Your overview** — stat cards with bar visualization, date range pill, + Add / Edit action cluster.

The pattern catalog in §1 captures what we can / should adopt
verbatim. Not everything Stripe does is right for our CPA workbench
— but the chrome-level patterns (tabs, cards, banners, hyperlinks,
whitespace) translate directly.

---

## §7. Related docs

- `rules-library-critique-2026-05-26.md` — prior /rules/library
  critique against the page-family canonical.
- `clients-family-critique-2026-05-26.md` — prior /clients critique.
- `clients-detail-critique-2026-05-26-post-revamp.md` — prior
  /clients/[id] critique.
- `clients-family-macro-micro-audit-2026-05-26.md` — macro→micro audit.
- `page-family-canonical.md` — internal canonical, now superseded
  by Stripe-bar for visual-hierarchy decisions.
