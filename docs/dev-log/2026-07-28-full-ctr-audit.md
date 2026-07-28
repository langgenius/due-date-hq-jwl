# duedatehq: full-site CTR audit + snippet rewrite

2026-07-28 (fifth pass — Yuqi: "必须完成所有 CTR 的改动，全面 audit")

Programmatic audit of all 123 EN pages (title/description length, answer-first check).
Fixed by template + hand-authored batch:

- **Rules (15, EN+zh)**: descriptions now GIVE the date ("When is the partnership form 1065
  deadline? March 15 — …"), pulled from each spec's keyDates first row; titles drop the
  " Rule Reference" tail.
- **States (51, EN+zh)**: titles slimmed to "{State} Tax Deadlines (2026) — DueDateHQ";
  descriptions date-first (verified states) with tight caps; big-5 hand-authored states
  (CA/NY/TX/FL/WA) rewritten answer-first — TX carries the verified May 15 franchise date,
  WA carries the Aug. 5 storm-relief hook.
- **Alternatives (8) & vs (3), EN+zh**: titles ≤60, descriptions ≤160 keeping prices.
- **DDHQ-vs compares (8)**: EN description trimmed 201→~150.
- **Guides**: payroll desc now lists the 941 dates; holiday, quickbooks, multi-state,
  calendar, evidence descs trimmed to snippet length.

Result: desc>168 fell 58→39; every remaining over-length page is answer-first so SERP
truncation only eats the brand tail. Deliberately untouched: homepage/hero (messaging
canon), /rules + /security trust pages (brand surfaces), and all /irs-disaster-relief
copy (parallel session owns it; its 232–553-char descriptions are flagged here for that
session). Build OK, 24/24 tests, lint clean.
