# /deadlines page-feedback pass (15 items), 2026-06-09

**Who/why:** Yuqi — annotated page feedback on `/deadlines` (the obligation
queue) at 1512×861. 15 items spanning the page header, the at-a-glance banner,
the toolbar, the table header, the group bands, individual cells, and the bulk
action bar. All changes live in `apps/app/src/routes/obligations.tsx` (plus the
`columnLabels` map in the same file).

## What shipped

1. **Sync stamp matches /today (#15).** Dropped the leading green status dot
   and moved the refresh glyph to _after_ "Synced just now", so the eyebrow
   reads `Synced just now ↻ · N deadlines tracked` — the same flat-tertiary
   stamp /today uses. Freshness is informational, not a success state, so the
   green dot was over-claiming. The scope count stays (Today has no equivalent).

2. **Sortable header colour unified (#2).** The sorted column ("Internal due")
   sat at `text-secondary` and jumped to near-black `text-primary` when active,
   so it read as a _different colour_ than every plain header (all
   `text-tertiary`). Sortable labels now sit at `text-tertiary` at rest and only
   nudge to `text-secondary` on hover — the accent-coloured sort chevron is the
   real "this column is sorted" signal, so the label no longer needs to shout.

3. **At-a-glance banner tightened (#4/#14).** `px-6 py-5` + `gap-2` + `text-xl`
   headline → `px-5 py-3.5` + `gap-1` + `text-lg`. The three short lines were
   eating hero-sized vertical budget; now they read as one compact editorial
   block.

4. **Group band cleanup (#3, #6).**
   - The "N late" signal was a filled destructive Badge — the same red pill as
     the row-level Payment chip — so the band looked like yet another red
     badge. It's now plain destructive-tinted text in the count cluster
     (`· 6 late`), and the right-aligned `≈Xd avg · N of TOTAL` meta is dropped
     (avg was derived noise; "N of TOTAL" duplicated the count).
   - The tone dot now aligns with the **Form** column: the chevron lives in a
     `w-10` slot matching the leading select column, and the dot + label start
     where the form chips do, instead of floating at the band's left edge.

5. **"State" → "Jurisdiction" (#7, #8).** The header said "State" but the cell
   leads with the filing **authority** ("IRS" / "FinCEN") for federal forms — a
   federal agency under a "State" label is a category error ("what does IRS
   mean?"). Renamed to **Jurisdiction** (both the header and the `columnLabels`
   entry). The state code was a lone outline Badge while the authority was plain
   text, so "IRS" and "NY" looked like two different classes of thing; both are
   now the same plain uppercase tertiary text, middot-separated (`IRS`, `NY`,
   `IRS · NY`).

6. **Fire icon removed (#9).** The leading flame glyph on overdue
   `N days late` cells is gone — the tinted red text already carries the
   urgency; the flame was a redundant second marker on the same axis.

7. **Payment-late de-escalated (#10).** Was a filled red destructive badge with
   the exact day count, repeated on every overdue row — a wall of red competing
   with the Status pill and the Internal-due lateness. Now a quiet **outline**
   chip with a `$` glyph reading just "Payment due"; the precise `Nd late` lives
   in the detail panel + tooltip.

8. **Toolbar "View" button (#12, #13).** The anonymous `⋯` kebab actually held
   the column organiser (plus group-by / density / export), so it read as
   useless _and_ the column control looked missing. It's now a labelled
   **View** button with the columns glyph — same menu, discoverable affordance.

9. **Primary CTA (#5).** Export / Calendar sync / Add deadline were three
   identical outline buttons — no primary. Promoted the "Add deadline" split
   button to the filled `primary` variant (matching /today's single filled
   affordance); Export + Calendar sync stay outline as the secondary cluster.

10. **Bulk action bar polish (#1).** The dark command bar was flat: the counter
    ran as one weight and two of the action buttons ("Assign owner", "Set
    status") lacked the leading icons the others had. The count now leads in
    semibold with the "deadlines selected" label at 70% opacity, and every
    action carries a leading icon so the cluster scans as one consistent row.

11. **Header rounded corners (#11).** Yuqi's call (2026-06-09): round the
    header band's top corners only, not a full card. The header bg is moved off
    the `<thead>` onto the `<th>` cells so its top-left/top-right corners can
    round (`rounded-t[lr]-[14px]`), giving the data region a rounded top while
    the rows stay frameless.

> **Why not a full card.** A full frame (border + radius around the whole
> table) was _deliberately removed_ on 2026-06-05 (Yuqi page-feedback #11)
> because a short/filtered result set left a tall empty bordered rectangle
> below the last row, and `overflow-hidden` on the wrapper breaks the
> page-level sticky header in full-page mode. The header-corners-only approach
> sidesteps both: no side/bottom border (no empty-rectangle) and no
> overflow-hidden (sticky header preserved).
