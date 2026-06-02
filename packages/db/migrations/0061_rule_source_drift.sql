ALTER TABLE `pulse` ADD `reverify_rule_ids_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
CREATE TABLE `rule_source_drift_state` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_id` text NOT NULL,
	`source_id` text NOT NULL,
	`snapshot_id` text,
	`pulse_id` text,
	`content_hash` text NOT NULL,
	`excerpt_matched` integer DEFAULT false NOT NULL,
	`detected_at` integer NOT NULL,
	`cleared_at` integer,
	`cleared_by` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `pulse_source_snapshot`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`pulse_id`) REFERENCES `pulse`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cleared_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_rsds_rule_source` ON `rule_source_drift_state` (`rule_id`,`source_id`);
--> statement-breakpoint
CREATE INDEX `idx_rsds_rule_cleared` ON `rule_source_drift_state` (`rule_id`,`cleared_at`);
--> statement-breakpoint
CREATE INDEX `idx_rsds_source` ON `rule_source_drift_state` (`source_id`);
