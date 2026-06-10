# Dev log — Daily Brief v2: "Yesterday / Today" (2026-06-10)

Yuqi: CPA 打开 Today 应一目了然看到「昨天工作的总结」和「今天工作的安排」。
The brief previously only narrated current risks (duplicating the Priority
Actions table below it) and said nothing about what happened while you were
away.

## Shape

```
DAILY BRIEF                                ● 7:05 AM  ↻  ×
YESTERDAY  2 completed (1 filed · 1 paid) · 2 new alerts · 1 due date moved
TODAY      <one AI sentence: focus + start-here [n]>
           2 overdue · 1 waiting on client · 2 due this week
```

- **Yesterday is deterministic** (audit-ledger counts), never AI: completed
  (filed/paid split), new alerts (→ /alerts link), due-date moves, reminders
  sent. Renders instantly and survives AI failures — the failed AI state is
  now an inline "Regenerate" on the Today row, not a card-replacing banner.
- **Today = one AI sentence + scoped count chips.** The per-item AI prose is
  gone; the plan's detail IS the Priority Actions table below. brief@v1
  (body-only edit) now returns headline + exactly ONE start-here item, with
  the citation marker in the headline. Old multi-item briefs degrade to
  headline + first item's citation chips.
- Both rows follow the page scope (obligation-linked counts use the
  effective-assignee rule); alert counts stay firm-wide.

## The recap window ("自上次访问以来")

- Anchor = the viewer's most recent EARLIER-day visit. `user_dashboard_visit`
  gains `previous_visit_at` (migration 0076): the first stamp of a new day
  rolls the old `last_visit_at` into it, so the anchor survives today's own
  stamp (the splash gate stamps at first open — without the rollover the
  brief's window would collapse to "since 30 seconds ago").
- `dashboard.load` self-stamps the first view of each day (`recapUserId`,
  same-day reloads write nothing), so the window works even where the splash
  isn't in the path.
- Recap failures degrade to null (logged) — e.g. a deploy where the worker
  briefly outruns migration 0076 — never failing the dashboard load.
- Pure helpers `isSameUtcDay` / `resolveRecapAnchor` are unit-tested; UTC
  day-compare documented as acceptable at tz-midnight edges.

## Verified

Full worktree stack (own D1 + migrations + demo seed + injected audit
events): splash recap → stamp rollover → brief Yesterday row on the same
anchor; filed/paid split, alerts link, due-date moves; Everyone-scope counts
switch; AI-failed inline retry with the deterministic rows intact.
