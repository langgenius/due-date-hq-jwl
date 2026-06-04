-- Annual-rollover lifecycle gate: projected (0) vs confirmed (1).
--
-- Existing rows are real, CPA-managed deadlines, so they backfill to confirmed (1)
-- via the column default. Rolled-forward / auto-projected / pulse-generated
-- next-year deadlines are inserted with confirmed=0 so they appear in
-- dashboards/calendar for planning but are withheld from the client + internal
-- reminder pipeline until a CPA confirms them.
ALTER TABLE `obligation_instance` ADD `confirmed` integer DEFAULT 1 NOT NULL;
