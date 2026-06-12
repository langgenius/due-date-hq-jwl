# /today critique fixes — monitor stops shouting, work leads (2026-06-12)

Yuqi's section-by-section critique of /today: "the eye lands on the three bold
alert-card titles — not on the overdue work. The monitor is shouting; the work
is whispering." Five fixes, all in the dashboard feature:

## 1. Alerts h2 chip-soup → one chip max

`needs-attention-section.tsx` — the h2 carried a count `<Badge>` AND the LIVE
`<MonitoringChip>`. LIVE earns its slot (it's a status, not a number); the
count duplicated "View all". The count chip is gone and the right-aligned link
now reads **"View all 4 →"** — the number keeps one home (demote, don't
delete).

## 2. Alert-card titles 16/600 → 14/600 (`text-row-anchor`)

`needs-attention-card.tsx` — three 16px-semibold, 2-line news headlines were
the heaviest text mass on the page while the Priorities client names (the
actual work) sat at 14px. The /today card h3 drops to `text-row-anchor`
(14/600) so the monitor matches the work's voice. `text-item-title` (16/600)
stays the item-headline tier on /alerts, where alerts ARE the work. Doc:
`alert-card-design.md` divergence table + `section-header-style.md` ramp note.

## 3. Zero-impact alerts: card → quiet one-line row

New `NeedsAttentionQuietRow` in `needs-attention-card.tsx`; the section splits
`visibleAlerts` into `cardAlerts` (impacted > 0) and `quietAlerts`
(impacted === 0). A ~150px card whose own footer says "No client impact"
hasn't earned card height — the row keeps jurisdiction + title + relative time
+ the canonical "No client impact" phrase at one line of quiet type and opens
the same drawer. (Current demo data has all visible alerts impacting clients,
so the rows branch shows only for no-impact feeds — e.g. fresh firms.)

## 4. Daily Brief "empty blue billboard" → one muted line

`daily-brief-card.tsx` — a FAILED brief with an all-quiet recap spent the
page's one accent-tinted band + 18px title on three lines, two of them
apologies. When AI text failed AND recap has no activity AND no catch-up rows
(catchup query hoisted from `CatchupLine` to decide this), the card demotes to
a single muted line: "No changes since your last visit. Brief unavailable —
we'll retry shortly." A regenerated brief restores the full card on its own.
Doc: `brief-banner-language.md` new section.

## 5. Priorities: one lateness story per row

`merged-brief-card.tsx` — one row fired "Overdue" badge + red "7d late" (DUE)
+ gray "Pay 7d late" (STATUS): three signals, one fact. The Pay chip now
renders only when payment lateness differs from the filing countdown (filing
not late, or late by a different day count) — the "two obligations, two homes"
rule survives exactly when the two obligations actually tell different
stories. Doc: `today-actions-table-style.md` two-color discipline.

## 6. Timestamp contrast AA fix

Card meta dates ("May 1", "In effect · act by …") were `text-text-muted`
(#98a2b2) — measured **2.47:1** on the card's gray fill, an AA failure at
12px. Now `text-text-tertiary` (#676f83) — measured **4.81:1**, passes.

## Verified

tsgo clean; preview screenshot on :5173 confirms all five visible changes
(header reads "Alerts · LIVE … View all 4 →"; 14px card titles; quiet
brief line replaces the blue band; Pay chips gone from both overdue rows;
darker timestamps). Console clean.

## Deliberately NOT done this round

The structural move — Daily Brief out of the page flow into a right insight
panel + folder tab, collapsing /today to Monitor (Alerts) → Work (Priorities)
— is Yuqi's decided direction but needs its own design pass (panel anatomy,
tab affordance, responsive contract). The quiet-line demotion above already
removes the worst symptom (the failure-state billboard) in the meantime.
