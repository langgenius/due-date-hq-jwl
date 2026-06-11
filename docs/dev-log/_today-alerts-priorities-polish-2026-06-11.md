# /today — alerts body + caught-up empty state, Priorities hybrid + CPA buckets

**Date:** 2026-06-11
**Surface:** `/today` — `apps/app/src/features/dashboard/{needs-attention-section,needs-attention-card,merged-brief-card}.tsx`, `apps/app/src/routes/dashboard.tsx`; backend `packages/contracts/src/pulse.ts`, `packages/ports/src/pulse.ts`, `packages/db/src/repo/pulse/shared.ts`, `apps/server/src/procedures/pulse/index.ts`

A batch of Yuqi page-feedback rounds on the dashboard.

## Alert cards

- **Titles bigger** (`text-base → text-lg`) and card padding `p-4 → p-5`.
- **Hover micro-interaction tried, then reverted.** A `-translate-y-0.5` lift +
  soft shadow was added, then pulled ("hate the floating shadow interaction").
  Back to the plain bg-step hover — consistent with the restrained-shadows rule
  (cards default to no outer shadow; border + bg contrast does the lift).
- **Body text restored — via the verbatim quote, not `summary`.** The card was
  title-only. The catch: `PulseAlertPublic.title` and `.summary` both derive
  from the pulse `ai_summary` column (see `toAlert` in `repo/pulse/shared.ts`),
  so they're byte-identical — restoring the old `{alert.summary}` body just
  echoed the title, which is why it was cut. The genuinely distinct body is the
  source's **`verbatim_quote`** ("Affected taxpayers in LA County have until
  June 16, 2026…"), which wasn't surfaced on the list row. Plumbed
  `verbatimQuote` through: ports `PulseAlertRow`, db `shared.PulseAlertRow` +
  `toAlert` (the scoped queries already `SELECT pulse.verbatimQuote`),
  `toAlertPublic`, and the public contract (`.nullish()` so existing alert test
  fixtures don't all need updating). The card renders it as a 2-line clamped
  body, guarded against echoing the title.

## Alerts empty state — centered "caught up" block

Replaced the old thin one-line status with a centered illustration block
matching the provided mockup: a `Megaphone` in a `size-16` light-accent disc,
**"No alerts — you're caught up"**, a subtext, and a **Configure sources** link.

No fiction: the subtext names the two leading **real** monitored-source labels
("When IRS Disaster Relief, IRS Newsroom, or another monitored source
publishes a change…") and the most-recent **real** `source.lastCheckedAt`
("Last check: May 1.", hidden until a source has actually been checked).
Degraded states preserved — "No sources monitored yet" when none are watched,
and an "N monitored sources are paused" warning line. This reverses the earlier
"a calm feed shouldn't claim hero space" thin-line rationale at Yuqi's
direction. Dropped the now-unused `PulsingDot` + `CircleCheckIcon` imports.

## Priorities (MergedBriefCard) — hybrid + CPA buckets

- **"Combine the previous table"** → a **hybrid**: kept the brief header
  (sparkles + title + segmented selector + summary lede) and added a labeled
  column header (`FORM · CLIENT · STATUS · DUE`) above the rows so they read as
  a table.
- **CPA-aligned buckets.** Dropped "ending today" (doesn't match how CPAs frame
  work). Buckets re-cut to **This week (0–7d) · This month (8–30d) · Overdue
  (<0)**, selector in that order. Counts wired from facets (this week =
  `today` + `next_7_days`; this month = `next_30_days`). Restored full width
  (a merge had re-added the `max-w-4xl` cap) and the status-column width +
  uniform `text-xs` badge the merge had reverted.

## Note

The local D1 was re-seeded from `mock/demo.sql` mid-session — the dev DB held
stale alert rows where `verbatim_quote` predated the distinct demo bodies.
