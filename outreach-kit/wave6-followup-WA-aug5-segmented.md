# WA Aug-5 follow-up — segmented variants (READY, pending Yuqi send)

The single permitted follow-up to the WA-189 first alert (sent 07-28). Send window:
**Jul 30 – Aug 1** (before the Aug. 5 deadline). Suppress anyone who replied or signed up.
Segment lists: `segments-wa/segment-*.csv` (dedupe against each other in priority order
payroll > ea-solo > bookkeeping > generic so nobody gets two variants; audit/nonprofit/niche
fold into generic this round). Log sends with a `seg` field.

**Verified facts (IRS.gov, WA-2025-03 page, checked 2026-07-28):**

- Update banner: deadline moved **May 1, 2026 → Aug. 5, 2026** (page URL still says may-1 —
  the known update-banner trap).
- Verbatim: "Penalties on payroll and excise tax deposits due on or after **Dec. 9, 2025, and
  before Dec. 29, 2025**, will be abated as long as the tax deposits are made by **Dec. 29,
  2025**."
- Verbatim: "The May 1, 2026, deadline also applies to affected **quarterly payroll and certain
  excise tax returns** normally due on Jan. 31, 2026, and April 30, 2026." (now Aug. 5 per
  banner)
- Estimated payments normally due Jan. 15 and Apr. 15, 2026 are covered.

Source: <https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-flooding-landslides-and-mudslides-in-the-state-of-washington-various-deadlines-postponed-to-may-1-2026>

---

## Variant `generic` (141)

Subject: WA storm relief deadline is next week — Aug. 5, not May 1

One heads-up before the WA disaster-relief window closes: postponed federal deadlines for the
covered counties land on **Tuesday, Aug. 5, 2026**.

Worth knowing: the IRS page's URL and body still say "May 1, 2026" — the Aug. 5 date lives in
an update banner added 5/1/26. If anyone on your team bookmarked the page early, their notes
may be three months stale.

Covered through Aug. 5: individual and business returns in the postponement window, the
Jan. 15 and Apr. 15 estimated payments, and the Jan. 31 / Apr. 30 quarterly payroll returns.

Official notice: [link above]

— [name], DueDateHQ. We monitor IRS and state sources for changes like this; this alert is
from that monitoring. Nothing to buy — if it's useful, it did its job.

## Variant `payroll` (15)

Subject: Aug. 5 WA relief — 941 returns yes, deposits no

Before the WA relief window closes Tuesday, one distinction that catches payroll-heavy firms:

**Covered by Aug. 5:** the quarterly payroll returns (941s) normally due Jan. 31 and Apr. 30.

**Not covered:** payroll tax **deposits**. The deposit abatement only ran Dec. 9–29, 2025
(deposits made by Dec. 29). Every deposit since then has been on the normal schedule — a
client who assumed "everything moved to Aug. 5" may have quietly accrued deposit penalties.

IRS wording, verbatim: "Penalties on payroll and excise tax deposits due on or after Dec. 9,
2025, and before Dec. 29, 2025, will be abated as long as the tax deposits are made by
Dec. 29, 2025."

Official notice: [link above]

— [name], DueDateHQ. We track exactly this kind of returns-vs-deposits split per notice.

## Variant `ea-solo` (14)

Same body as `generic`, plus one closing line:

P.S. — solo practices told us tracking these by hand is the worst part; DueDateHQ is free
during beta if you want the watching done for you.

## Not sending this round

- `audit` (8) / `nonprofit` (6) / `industry-niche` (1): fold into `generic`. The 990-series
  angle stays ⚠ un-fact-checked for this notice — do not improvise it.
