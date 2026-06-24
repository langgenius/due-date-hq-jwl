# Marketing home — kill the 4× repeated alert (2026-06-24)

The audit's biggest design finding: the same IRS "Apr 15 → Nov 3 · 8 clients"
disaster postponement appeared in Hero, Surfaces, Notice AND Close (4×), so the
middle of the page taught the reader nothing new. Fixed by giving each section a
DISTINCT change (data + role), per the audit. No new components — data only.

- **Notice** already had a 3-way toggle (Disaster / State extension / New
  requirement) but **defaulted to the disaster postponement** — the same change as
  the Hero. Reordered so it leads with **"New requirement"** (Texas Comptroller
  franchise tax, a brand-new obligation — structurally distinct from a date→date
  postponement). The disaster tab is still available, just not the default. EN + zh.
- **Close receipt** retargeted from the IRS Apr 15→Nov 3 (its 4th appearance) to a
  fresh change: **FL DOR sales-tax postponement, Oct 20 → Dec 2, 2026, 6 clients,
  floridarevenue.com** — established sample data (the Surfaces FL tab), and it shows
  breadth (a state + a different filing type) at the finale. EN + zh.
- **Surfaces ↔ Sources feed de-dup:** Surfaces' "recent activity" rows (CA FTB / NY
  DTF) overlapped the Sources monitoring feed; swapped to GA / AZ / OH / MA so the
  two feeds read as distinct.

Net: "Apr 15 → Nov 3" now appears 2× (Hero hook + the Surfaces workbench demo),
down from 4×; Notice and Close each show a different change. The page reads as
variety — IRS disaster (hero) → new state obligation (notice) → state sales-tax
move (close) — not the same card four times.

Verified: build clean (73 pages), `astro check` 0/0/0; live DOM confirms Notice
default tab = "New requirement" / TX franchise, Close receipt = Oct 20 → Dec 2 ·
floridarevenue.com.

Still open (the audit's secondary point, NOT done): the white-card visual
monotony — a non-card / display-serif moment to break the run of hairline cards.
