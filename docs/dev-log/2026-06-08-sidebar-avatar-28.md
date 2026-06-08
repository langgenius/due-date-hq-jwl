# Sidebar — firm avatar 28px (follow-up)

Date: 2026-06-08

Yuqi follow-up to the Phase 2 sidebar pass: firm avatar should be **28px**, not
32px. `AssigneeAvatar size="md"` (32px) → `size="sm"` (28px) in `app-shell-nav.tsx`.
This also matches the collapsed-rail tile size (size-7), so the brand tile no
longer resizes between expanded and collapsed states. Nav text stays text-[15px].

## Also (env, not code)

`/alerts` was throwing "Couldn't load alerts / Internal server error": the local
D1 dev DB was behind on migrations (0066–0069), so `pulse.listAlerts` queried the
new `protective_action_deadline` column from `0069` which didn't exist locally.
Fixed by `pnpm db:migrate:local`. Migration is already committed upstream; this
was local DB drift, no code change.
