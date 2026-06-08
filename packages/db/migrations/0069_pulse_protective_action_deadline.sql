-- Promote the protective-claim action deadline out of structured_change_json
-- into a queryable column.
--
-- review_only `protective_claim_window` alerts (e.g. the COVID disaster-period
-- refund-claim window, still actionable until 2026-07-10) carry their cutoff in
-- structured_change_json.actionDeadline, NOT in parsed_new_due_date /
-- parsed_effective_until (those are NULL for review_only). That hid the deadline
-- from the still-actionable / expiry predicate — which treats NULL as "never
-- expires", so these alerts never archived — and from any deadline-based sort.
-- This column surfaces it for SQL. It is NULL for every other change kind.
--
-- actionDeadline is a YYYY-MM-DD calendar date; the app stores it at UTC
-- midnight (timestamp_ms). strftime('%s', <date>) yields UTC-midnight seconds,
-- so * 1000 matches the Date the extractor would have written.
ALTER TABLE `pulse` ADD `protective_action_deadline` integer;
--> statement-breakpoint
UPDATE `pulse`
SET `protective_action_deadline` =
  CAST(strftime('%s', json_extract(`structured_change_json`, '$.actionDeadline')) AS INTEGER) * 1000
WHERE `change_kind` = 'protective_claim_window'
  AND json_extract(`structured_change_json`, '$.actionDeadline') IS NOT NULL;
