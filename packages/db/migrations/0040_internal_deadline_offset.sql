ALTER TABLE `firm_profile` ADD `internal_deadline_offset_days` integer DEFAULT 14 NOT NULL;
--> statement-breakpoint
UPDATE `obligation_instance`
SET `current_due_date` = `base_due_date` - (14 * 86400000)
WHERE `current_due_date` = `base_due_date`;
