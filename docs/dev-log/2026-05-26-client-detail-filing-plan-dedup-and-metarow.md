# Client detail: drop the duplicate Filing-plan count + add PageHeader metaRow primitive — 2026-05-26

Two unrelated-but-shipped-together changes from the `ui-audit-2026-05-25`
follow-up pass.

## Change 1 · D4 fix — Filing-plan h2 subtitle drops the count

### Audit reference

`docs/Design/ui-audit-2026-05-25.md` §3.2 finding **D4** (P0):

> `ClientSummaryStrip` "Open filing" tile + `ClientWorkPlanPanel`
> Filing-plan h2 subtitle restate the same count ~100 px apart.

The audit offered two paths:

- (a) drop the SummaryStrip tile and invent a new slot-3 signal
- (b) keep the tile and drop the count from the Filing-plan subtitle

This commit takes path **(b)**.

### Why path (b)

The SummaryStrip tile is **already canonical** for the open-filing
count. The 2026-05-24 distill pass (commit history on
`renderClientHeaderSubLine`, comment at line ~421 of
`ClientFactsWorkspace.tsx`) explicitly dropped "N open filings" from
the page-header workPlan summary to make the tile the single owner of
that number. The same rationale applies to the Filing-plan h2
subtitle — it was just a holdout from a pre-distill iteration.

The tile also carries interaction value: it's a click-target that
opens `/deadlines?client=<id>`. Dropping the tile would lose that
without an obvious replacement signal (the audit's suggestions of
"Last filing closed" / "Documents needed" are valid futures but each
requires its own design exercise). The subtitle, in contrast, was
decoration — easy to swap to a structural fact.

### Diff

`apps/app/src/features/clients/ClientFactsWorkspace.tsx` (one block,
inside `ClientWorkPlanPanel`):

```diff
-  const subtitle = (
-    <>
-      <Plural value={obligations.length} one="# deadline" other="# deadlines" />{' '}
-      <Trans>across</Trans>{' '}
-      <Plural value={yearGroups.length} one="# tax year" other="# tax years" />
-    </>
-  )
+  const subtitle =
+    yearGroups.length <= 1 ? (
+      <Trans>Latest first</Trans>
+    ) : (
+      <Trans>Grouped by tax year, newest first</Trans>
+    )
```

Before: `5 deadlines across 2 tax years`
After (1 year): `Latest first`
After (≥2 years): `Grouped by tax year, newest first`

The single-year branch matters because "grouped by tax year" reads
weirdly when there's only one. "Latest first" still describes the
sort behaviour without claiming structure that isn't there.

## Change 2 · `PageHeader.metaRow` slot (architectural primitive)

### Why now

The audit (and the strategic-themes doc that came out of it) repeatedly
calls out routes with overgrown h1 chip clusters: `/clients/[id]` was
the most egregious (audit D1) but `/rules/library` (audit R3) and the
members page also pack identity chips into the title baseline. PR #25
fixed `/clients/[id]` by routing those chips through a body-level
`ClientContactMetaRow` rendered just below the PageHeader — a working
solution but a _page-local_ one. Other routes that hit the same
pressure today have to either invent their own ContactMetaRow or
re-tangle the chips into the h1.

Adding an optional `metaRow` slot to the shared `PageHeader` primitive
gives those future cleanups a canonical place to land.

### Slot contract

Rendered as a `<div>` (not `<p>`, so it can host Badge / Pill /
DropdownMenu children) between the h1 and the description, with
typography baked in: `text-xs` / leading-5 / `text-text-secondary` /
`flex-wrap` / `gap-x-3 gap-y-1.5`.

Distinct from `description`:

| Slot          | Carries        | Example                                    |
| ------------- | -------------- | ------------------------------------------ |
| `metaRow`     | identity facts | LLC · Sarah K. · CA, NY · Add filing state |
| `description` | state prose    | 5 open · next due May 6                    |

### Why this doesn't immediately touch `/clients/[id]`

PR #25 already shipped audit D1 via `ClientContactMetaRow` rendered in
the page body. That route's chip cluster is now well-organised at the
existing 12-px/secondary tier. Migrating it onto the new `metaRow`
slot would be a churn-only change with no user-facing benefit — left
as future tidying when another reason to touch that header arises.

The slot is unused-yet by intent. First adoption likely candidates
(by audit overlap):

- `/rules/library` (audit R3) — the sticky header packs jurisdiction
  count + entity column count + Expand/Collapse link into the table
  header instead of the page header.
- `members-page` — `MemberStatusPill` and `InvitationStatusPill` in
  the page heading; the seat / invite count tiles below could fold up
  into a metaRow.

## Status updates

`docs/Design/ui-audit-2026-05-25.md`:

- D1 status: **Shipped via PR #25** (`design(clients): directory pivot
— phases 1-3`). Chips moved to `ClientContactMetaRow`. No further
  work in this commit.
- D4 status: **Shipped this commit.**

## What didn't change

- `ClientSummaryStrip` is untouched. The "Open filing" tile is the
  canonical owner of the count signal — that's the whole point of the
  D4 fix.
- The PageHeader change is purely additive; no existing consumers
  pass `metaRow`, so no rendered output changes anywhere.

## Verification

```bash
CI=true pnpm exec vp check
# Expected: 0 errors, pre-existing warnings unchanged
```

## Out-of-scope follow-ups

- **Adopt `metaRow` on `/rules/library` and members-page.** Plumb the
  identity-tier chips through the new slot when those routes get their
  own audit pass.
- **D5 (Filing-plan year-card frames)** is still open. The 2026-05-24
  Figma replica added `rounded-xl bg-background-soft` frames per year
  card; audit calls this "the only chunky tile on the page". Worth a
  dedicated commit.
- **Statistical-tile primitive extract** (audit cross-surface P0 #1)
  — five parallel implementations across `/clients`, `/clients/[id]`,
  `/opportunities`, `/rules/library`, and the dashboard
  `ActionsSummaryTile`. Next up in this audit sweep.
