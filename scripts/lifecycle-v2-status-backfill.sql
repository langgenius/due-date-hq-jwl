-- Lifecycle v2 status backfill — MANUAL, ONE-TIME, REVIEW BEFORE RUN.
--
-- Per docs/PRD/obligation-row-PRD.md §7.1 Must + docs/Design/
-- obligation-lifecycle-design-brief.md, the queue migrates from today's
-- 8-state enum to a 6-state target. This script collapses the legacy
-- values into the v2 taxonomy. It is NOT placed in packages/db/migrations/
-- because it's a one-time data migration that should run after the team
-- explicitly cuts over to v2 (parallel-session-safe).
--
-- Mapping (from project memory `project_status_taxonomy.md` + PRD §5):
--   pending           → pending          (already maps to "Not started" in v2 label)
--   in_progress       → review           (preparer work in flight = "In review")
--   review            → review           (no change; label "In review")
--   waiting_on_client → waiting_on_client (no change)
--   done              → done             (no change; label "Filed")
--   paid              → completed        (payment-type rows fold into completed)
--   extended          → pending          (extension is a deadline mutation, not a status —
--                                          the row reverts to pending with mutated dates)
--   not_applicable    → not_applicable   (unchanged; suppression flag, not queue state)
--   blocked, completed                   (v2 additions; already correct)
--
-- HOW TO RUN (local, after coordinating with team):
--   pnpm dlx wrangler d1 execute due-date-hq-staging --local --file=scripts/lifecycle-v2-status-backfill.sql
--
-- HOW TO RUN (remote, only after release):
--   pnpm dlx wrangler d1 execute due-date-hq-staging --remote --file=scripts/lifecycle-v2-status-backfill.sql
--
-- The script is idempotent — re-running it after a clean run is a no-op.

BEGIN TRANSACTION;

-- in_progress → review. Preparer work in flight is most-naturally "In review"
-- under v2; the deeper prep-vs-review distinction lives in prepStage/reviewStage.
UPDATE obligation_instance
SET status = 'review',
    updated_at = CAST(unixepoch('subsecond') * 1000 AS INTEGER)
WHERE status = 'in_progress';

-- extended → pending. Extension is a deadline mutation, not a status.
-- The current_due_date on these rows already reflects the post-extension
-- date; status reverts so the row reappears as actionable work.
UPDATE obligation_instance
SET status = 'pending',
    updated_at = CAST(unixepoch('subsecond') * 1000 AS INTEGER)
WHERE status = 'extended';

-- paid → completed. Payment obligations fold into completed; the
-- obligation_type discriminates payment from filing.
UPDATE obligation_instance
SET status = 'completed',
    updated_at = CAST(unixepoch('subsecond') * 1000 AS INTEGER)
WHERE status = 'paid';

-- All other values (pending, waiting_on_client, review, done, blocked,
-- completed, not_applicable) are correct under v2 — no UPDATE needed.

COMMIT;

-- Verification — should return 0 rows:
SELECT id, status, updated_at FROM obligation_instance
WHERE status IN ('in_progress', 'extended', 'paid');
