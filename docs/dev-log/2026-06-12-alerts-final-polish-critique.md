# 2026-06-12 — /alerts final polish critique: 7 findings, all fixed

Yuqi: "/design-critique again — ensure the page structure and UI design is
polished to its best, do not lose or skip any details." Full measurement sweep
on a dedicated preview instance (1512×861). Baseline was strong (uniform 36px
toolbar, 760px centered detail measure, consistent 168px rows); seven findings:

1. **`THRESHOLD_ADVISORY` leaked raw** (list + rail) — `changeKindLabel` was
   missing `threshold_advisory` AND `rule_source_drift`. Both mapped
   ("Threshold advisory", "Source drift"); the raw-`kind` fallback now only
   catches future enum additions.
2. **"9 open" pill was permanently red** — a standing count isn't an alarm.
   `tone="neutral"` at both call sites (page header + rail head); red stays
   reserved for URGENT pills + overdue countdowns.
3. **Day-band label off the content grid** — label x=134 vs time column x=162
   (checkbox indent). Band gets `pl-12` when rows are selectable; now 162==162.
4. **Row bottom meta failed AA** — text-muted (≈2.9:1 at 13px) → text-tertiary
   (≈4.8:1).
5. **Change-kind spoke two dialects** — list: quiet tracked caps; detail hero:
   blue mono chip. The hero now uses the list's quiet voice; accent stays
   reserved for action/selection semantics.
6. **Spy-nav → first card gap 12px vs 24px body rhythm** — the nav's `-my-3`
   over-trimmed; `-mt-3` only. Measured 24px after.
7. **Footer audit line permanently green** — standing reassurance ≠ success
   event. Text → tertiary, shield icon keeps the green.

Verify: tsgo clean; all seven measured live on instance 5189 (humanized label,
pill rgb(53,64,82), band/time both x=162, meta rgb(103,111,131), chip
transparent+sans, navToCard 24px, audit text tertiary / icon green).
