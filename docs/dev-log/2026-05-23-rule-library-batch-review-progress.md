---
title: '2026-05-23 · Rule library batch review progress'
date: 2026-05-23
author: 'Codex'
---

# Rule library batch review progress

## Change

- Batch review now snapshots the ordered rule ids when the modal opens.
- The modal progress denominator stays tied to that opened queue, so accepting or rejecting a rule
  no longer changes `1 / 15` into a smaller live-pending count.
- The table, stats bar, and header `Start review` count still reflect the live pending backlog after
  rules are accepted or rejected.
- Accept completion now advances the modal before refreshing rule queries, so the old card does not
  briefly re-render during the transition to the next rule.

## Validation

- `pnpm --filter @duedatehq/app test -- src/routes/rules.library.test.tsx`
