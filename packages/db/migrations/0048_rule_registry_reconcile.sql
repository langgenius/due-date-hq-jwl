CREATE TABLE `rule_registry_reconcile_run` (
  `id` text PRIMARY KEY NOT NULL,
  `week_key` text NOT NULL,
  `status` text DEFAULT 'running' NOT NULL,
  `triggered_by` text DEFAULT 'weekly_cron' NOT NULL,
  `started_at` integer NOT NULL,
  `completed_at` integer,
  `source_count` integer DEFAULT 0 NOT NULL,
  `checked_count` integer DEFAULT 0 NOT NULL,
  `unchanged_count` integer DEFAULT 0 NOT NULL,
  `changed_count` integer DEFAULT 0 NOT NULL,
  `proposal_count` integer DEFAULT 0 NOT NULL,
  `failure_count` integer DEFAULT 0 NOT NULL,
  `error_text` text,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_rule_registry_reconcile_run_week` ON `rule_registry_reconcile_run` (`week_key`);
--> statement-breakpoint
CREATE INDEX `idx_rule_registry_reconcile_run_status` ON `rule_registry_reconcile_run` (`status`,`started_at`);
--> statement-breakpoint
CREATE TABLE `rule_registry_change_proposal` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `source_id` text NOT NULL,
  `source_snapshot_id` text,
  `content_hash` text,
  `raw_r2_key` text,
  `proposal_type` text NOT NULL,
  `status` text DEFAULT 'open' NOT NULL,
  `affected_rule_ids_json` text DEFAULT '[]' NOT NULL,
  `proposed_rule_ids_json` text DEFAULT '[]' NOT NULL,
  `normalized_rule_json` text,
  `diff_summary` text,
  `ai_output_id` text,
  `failure_reason` text,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`run_id`) REFERENCES `rule_registry_reconcile_run`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_rule_registry_proposal_run` ON `rule_registry_change_proposal` (`run_id`);
--> statement-breakpoint
CREATE INDEX `idx_rule_registry_proposal_status` ON `rule_registry_change_proposal` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_rule_registry_proposal_source` ON `rule_registry_change_proposal` (`source_id`,`created_at`);
