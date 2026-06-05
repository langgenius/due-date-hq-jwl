-- Canonical de-duplication key for AI-extracted regulatory pulse alerts.
--
-- Closes two duplicate-leak paths discovered in production: (1) a check-then-
-- insert race — concurrent extraction of sibling snapshots (queue
-- max_concurrency) each saw "no duplicate" and all inserted (e.g. 6 identical
-- LITC grant alerts); (2) a brittle multi-field signature that missed the same
-- event arriving across feeds (irs.disaster / fed.irs_disaster_relief) or with
-- a drifting form list / re-classified change kind.
--
-- The column is NULL for existing rows and for deterministic alerts
-- (threshold_advisory / rule_source_drift). SQLite treats NULLs as mutually
-- distinct in a UNIQUE index, so a plain (non-partial) unique index permits the
-- many NULLs while enforcing one row per real-world event key. New AI extracts
-- insert with ON CONFLICT(dedupe_key) DO NOTHING, so a lost race collapses onto
-- the winner instead of creating a duplicate.
ALTER TABLE `pulse` ADD `dedupe_key` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_pulse_dedupe_key` ON `pulse` (`dedupe_key`);
