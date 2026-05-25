DROP TABLE IF EXISTS `__obligation_exception_application_0051`;
--> statement-breakpoint
DROP TABLE IF EXISTS `__pulse_priority_review_0051`;
--> statement-breakpoint
DROP TABLE IF EXISTS `__pulse_application_0051`;
--> statement-breakpoint
DROP TABLE IF EXISTS `__pulse_firm_alert_0051`;
--> statement-breakpoint
DROP TABLE IF EXISTS `__pulse_source_signal_0051`;
--> statement-breakpoint
DROP TABLE IF EXISTS `__pulse_source_snapshot_0051`;
--> statement-breakpoint
DROP TABLE IF EXISTS `__exception_rule_0051`;
--> statement-breakpoint
DROP TABLE IF EXISTS `__pulse_0051`;
--> statement-breakpoint
CREATE TABLE `__obligation_exception_application_0051` AS SELECT * FROM `obligation_exception_application`;
--> statement-breakpoint
CREATE TABLE `__pulse_priority_review_0051` AS SELECT * FROM `pulse_priority_review`;
--> statement-breakpoint
CREATE TABLE `__pulse_application_0051` AS SELECT * FROM `pulse_application`;
--> statement-breakpoint
CREATE TABLE `__pulse_firm_alert_0051` AS SELECT * FROM `pulse_firm_alert`;
--> statement-breakpoint
CREATE TABLE `__pulse_source_signal_0051` AS SELECT * FROM `pulse_source_signal`;
--> statement-breakpoint
CREATE TABLE `__pulse_source_snapshot_0051` AS SELECT * FROM `pulse_source_snapshot`;
--> statement-breakpoint
CREATE TABLE `__exception_rule_0051` AS SELECT * FROM `exception_rule`;
--> statement-breakpoint
CREATE TABLE `__pulse_0051` AS SELECT * FROM `pulse`;
--> statement-breakpoint
DROP TABLE `obligation_exception_application`;
--> statement-breakpoint
DROP TABLE `pulse_priority_review`;
--> statement-breakpoint
DROP TABLE `pulse_application`;
--> statement-breakpoint
DROP TABLE `pulse_firm_alert`;
--> statement-breakpoint
DROP TABLE `pulse_source_signal`;
--> statement-breakpoint
DROP TABLE `pulse_source_snapshot`;
--> statement-breakpoint
DROP TABLE `exception_rule`;
--> statement-breakpoint
DROP TABLE `pulse`;
--> statement-breakpoint
CREATE TABLE `pulse` (
  `id` text PRIMARY KEY NOT NULL,
  `source` text NOT NULL,
  `source_url` text NOT NULL,
  `raw_r2_key` text,
  `published_at` integer NOT NULL,
  `change_kind` text DEFAULT 'deadline_shift' NOT NULL,
  `action_mode` text DEFAULT 'due_date_overlay' NOT NULL,
  `ai_summary` text NOT NULL,
  `verbatim_quote` text NOT NULL,
  `parsed_jurisdiction` text NOT NULL,
  `parsed_counties` text NOT NULL,
  `parsed_forms` text NOT NULL,
  `parsed_entity_types` text NOT NULL,
  `parsed_original_due_date` integer,
  `parsed_new_due_date` integer,
  `parsed_effective_from` integer,
  `parsed_effective_until` integer,
  `affected_rule_ids_json` text DEFAULT '[]' NOT NULL,
  `structured_change_json` text,
  `confidence` real NOT NULL,
  `status` text DEFAULT 'pending_review' NOT NULL,
  `reviewed_by` text,
  `reviewed_at` integer,
  `requires_human_review` integer DEFAULT true NOT NULL,
  `is_sample` integer DEFAULT false NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `pulse` (
  `id`,
  `source`,
  `source_url`,
  `raw_r2_key`,
  `published_at`,
  `change_kind`,
  `action_mode`,
  `ai_summary`,
  `verbatim_quote`,
  `parsed_jurisdiction`,
  `parsed_counties`,
  `parsed_forms`,
  `parsed_entity_types`,
  `parsed_original_due_date`,
  `parsed_new_due_date`,
  `parsed_effective_from`,
  `parsed_effective_until`,
  `affected_rule_ids_json`,
  `structured_change_json`,
  `confidence`,
  `status`,
  `reviewed_by`,
  `reviewed_at`,
  `requires_human_review`,
  `is_sample`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `source`,
  `source_url`,
  `raw_r2_key`,
  `published_at`,
  'deadline_shift',
  'due_date_overlay',
  `ai_summary`,
  `verbatim_quote`,
  `parsed_jurisdiction`,
  `parsed_counties`,
  `parsed_forms`,
  `parsed_entity_types`,
  `parsed_original_due_date`,
  `parsed_new_due_date`,
  `parsed_effective_from`,
  NULL,
  '[]',
  NULL,
  `confidence`,
  `status`,
  `reviewed_by`,
  `reviewed_at`,
  `requires_human_review`,
  `is_sample`,
  `created_at`,
  `updated_at`
FROM `__pulse_0051`;
--> statement-breakpoint
CREATE INDEX `idx_pulse_status_pub` ON `pulse` (`status`, `published_at`);
--> statement-breakpoint
CREATE INDEX `idx_pulse_jurisdiction_pub` ON `pulse` (`parsed_jurisdiction`, `published_at`);
--> statement-breakpoint
CREATE TABLE `pulse_source_snapshot` (
  `id` text PRIMARY KEY NOT NULL,
  `source_id` text NOT NULL,
  `external_id` text NOT NULL,
  `title` text NOT NULL,
  `official_source_url` text NOT NULL,
  `published_at` integer NOT NULL,
  `fetched_at` integer NOT NULL,
  `content_hash` text NOT NULL,
  `raw_r2_key` text NOT NULL,
  `parse_status` text DEFAULT 'pending_extract' NOT NULL,
  `pulse_id` text,
  `ai_output_id` text,
  `failure_reason` text,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`pulse_id`) REFERENCES `pulse`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `pulse_source_snapshot` (
  `id`,
  `source_id`,
  `external_id`,
  `title`,
  `official_source_url`,
  `published_at`,
  `fetched_at`,
  `content_hash`,
  `raw_r2_key`,
  `parse_status`,
  `pulse_id`,
  `ai_output_id`,
  `failure_reason`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `source_id`,
  `external_id`,
  `title`,
  `official_source_url`,
  `published_at`,
  `fetched_at`,
  `content_hash`,
  `raw_r2_key`,
  `parse_status`,
  `pulse_id`,
  `ai_output_id`,
  `failure_reason`,
  `created_at`,
  `updated_at`
FROM `__pulse_source_snapshot_0051`;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_pss_source_external_hash` ON `pulse_source_snapshot` (`source_id`, `external_id`, `content_hash`);
--> statement-breakpoint
CREATE INDEX `idx_pss_status_time` ON `pulse_source_snapshot` (`parse_status`, `created_at`);
--> statement-breakpoint
CREATE INDEX `idx_pss_source_time` ON `pulse_source_snapshot` (`source_id`, `published_at`);
--> statement-breakpoint
CREATE TABLE `pulse_source_signal` (
  `id` text PRIMARY KEY NOT NULL,
  `source_id` text NOT NULL,
  `external_id` text NOT NULL,
  `title` text NOT NULL,
  `official_source_url` text NOT NULL,
  `published_at` integer NOT NULL,
  `fetched_at` integer NOT NULL,
  `content_hash` text NOT NULL,
  `raw_r2_key` text NOT NULL,
  `tier` text NOT NULL,
  `jurisdiction` text NOT NULL,
  `signal_type` text DEFAULT 'anticipated_pulse' NOT NULL,
  `status` text DEFAULT 'open' NOT NULL,
  `linked_pulse_id` text,
  `reviewed_rule_id` text,
  `review_decision_id` text,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`linked_pulse_id`) REFERENCES `pulse`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `pulse_source_signal` (
  `id`,
  `source_id`,
  `external_id`,
  `title`,
  `official_source_url`,
  `published_at`,
  `fetched_at`,
  `content_hash`,
  `raw_r2_key`,
  `tier`,
  `jurisdiction`,
  `signal_type`,
  `status`,
  `linked_pulse_id`,
  `reviewed_rule_id`,
  `review_decision_id`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `source_id`,
  `external_id`,
  `title`,
  `official_source_url`,
  `published_at`,
  `fetched_at`,
  `content_hash`,
  `raw_r2_key`,
  `tier`,
  `jurisdiction`,
  `signal_type`,
  `status`,
  `linked_pulse_id`,
  `reviewed_rule_id`,
  `review_decision_id`,
  `created_at`,
  `updated_at`
FROM `__pulse_source_signal_0051`;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_pulse_signal_source_external_hash` ON `pulse_source_signal` (`source_id`, `external_id`, `content_hash`);
--> statement-breakpoint
CREATE INDEX `idx_pulse_signal_status_time` ON `pulse_source_signal` (`status`, `published_at`);
--> statement-breakpoint
CREATE INDEX `idx_pulse_signal_source_time` ON `pulse_source_signal` (`source_id`, `published_at`);
--> statement-breakpoint
CREATE INDEX `idx_pulse_signal_review_rule` ON `pulse_source_signal` (`reviewed_rule_id`);
--> statement-breakpoint
CREATE INDEX `idx_pulse_signal_review_decision` ON `pulse_source_signal` (`review_decision_id`);
--> statement-breakpoint
CREATE TABLE `pulse_firm_alert` (
  `id` text PRIMARY KEY NOT NULL,
  `pulse_id` text NOT NULL,
  `firm_id` text NOT NULL,
  `status` text DEFAULT 'matched' NOT NULL,
  `matched_count` integer DEFAULT 0 NOT NULL,
  `needs_review_count` integer DEFAULT 0 NOT NULL,
  `dismissed_by` text,
  `dismissed_at` integer,
  `snoozed_until` integer,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`pulse_id`) REFERENCES `pulse`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`dismissed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `pulse_firm_alert` (
  `id`,
  `pulse_id`,
  `firm_id`,
  `status`,
  `matched_count`,
  `needs_review_count`,
  `dismissed_by`,
  `dismissed_at`,
  `snoozed_until`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `pulse_id`,
  `firm_id`,
  `status`,
  `matched_count`,
  `needs_review_count`,
  `dismissed_by`,
  `dismissed_at`,
  `snoozed_until`,
  `created_at`,
  `updated_at`
FROM `__pulse_firm_alert_0051`;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_pulse_firm_alert` ON `pulse_firm_alert` (`firm_id`, `pulse_id`);
--> statement-breakpoint
CREATE INDEX `idx_pfa_firm_status_time` ON `pulse_firm_alert` (`firm_id`, `status`, `updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_pfa_pulse` ON `pulse_firm_alert` (`pulse_id`);
--> statement-breakpoint
CREATE TABLE `pulse_priority_review` (
  `id` text PRIMARY KEY NOT NULL,
  `firm_id` text NOT NULL,
  `alert_id` text NOT NULL,
  `pulse_id` text NOT NULL,
  `status` text DEFAULT 'open' NOT NULL,
  `priority_score` integer DEFAULT 0 NOT NULL,
  `priority_reasons_json` text DEFAULT '[]' NOT NULL,
  `selected_obligation_ids_json` text DEFAULT '[]' NOT NULL,
  `confirmed_obligation_ids_json` text DEFAULT '[]' NOT NULL,
  `excluded_obligation_ids_json` text DEFAULT '[]' NOT NULL,
  `note` text,
  `requested_by` text,
  `reviewed_by` text,
  `reviewed_at` integer,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`alert_id`) REFERENCES `pulse_firm_alert`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`pulse_id`) REFERENCES `pulse`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`requested_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `pulse_priority_review` (
  `id`,
  `firm_id`,
  `alert_id`,
  `pulse_id`,
  `status`,
  `priority_score`,
  `priority_reasons_json`,
  `selected_obligation_ids_json`,
  `confirmed_obligation_ids_json`,
  `excluded_obligation_ids_json`,
  `note`,
  `requested_by`,
  `reviewed_by`,
  `reviewed_at`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `firm_id`,
  `alert_id`,
  `pulse_id`,
  `status`,
  `priority_score`,
  `priority_reasons_json`,
  `selected_obligation_ids_json`,
  `confirmed_obligation_ids_json`,
  `excluded_obligation_ids_json`,
  `note`,
  `requested_by`,
  `reviewed_by`,
  `reviewed_at`,
  `created_at`,
  `updated_at`
FROM `__pulse_priority_review_0051`;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_pulse_priority_review_firm_alert` ON `pulse_priority_review` (`firm_id`, `alert_id`);
--> statement-breakpoint
CREATE INDEX `idx_pulse_priority_review_firm_status_score` ON `pulse_priority_review` (`firm_id`, `status`, `priority_score`);
--> statement-breakpoint
CREATE INDEX `idx_pulse_priority_review_alert` ON `pulse_priority_review` (`alert_id`);
--> statement-breakpoint
CREATE INDEX `idx_pulse_priority_review_pulse` ON `pulse_priority_review` (`pulse_id`);
--> statement-breakpoint
CREATE TABLE `pulse_application` (
  `id` text PRIMARY KEY NOT NULL,
  `pulse_id` text NOT NULL,
  `obligation_instance_id` text NOT NULL,
  `client_id` text NOT NULL,
  `firm_id` text NOT NULL,
  `applied_by` text NOT NULL,
  `applied_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `reverted_by` text,
  `reverted_at` integer,
  `before_due_date` integer NOT NULL,
  `after_due_date` integer NOT NULL,
  FOREIGN KEY (`pulse_id`) REFERENCES `pulse`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`obligation_instance_id`) REFERENCES `obligation_instance`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`applied_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`reverted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `pulse_application` (
  `id`,
  `pulse_id`,
  `obligation_instance_id`,
  `client_id`,
  `firm_id`,
  `applied_by`,
  `applied_at`,
  `reverted_by`,
  `reverted_at`,
  `before_due_date`,
  `after_due_date`
)
SELECT
  `id`,
  `pulse_id`,
  `obligation_instance_id`,
  `client_id`,
  `firm_id`,
  `applied_by`,
  `applied_at`,
  `reverted_by`,
  `reverted_at`,
  `before_due_date`,
  `after_due_date`
FROM `__pulse_application_0051`;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_pulse_application_obligation` ON `pulse_application` (`firm_id`, `pulse_id`, `obligation_instance_id`);
--> statement-breakpoint
CREATE INDEX `idx_pa_firm_pulse` ON `pulse_application` (`firm_id`, `pulse_id`);
--> statement-breakpoint
CREATE INDEX `idx_pa_obligation` ON `pulse_application` (`obligation_instance_id`);
--> statement-breakpoint
CREATE TABLE `exception_rule` (
  `id` text PRIMARY KEY NOT NULL,
  `firm_id` text,
  `source_pulse_id` text,
  `jurisdiction` text NOT NULL,
  `counties` text NOT NULL,
  `affected_forms` text NOT NULL,
  `affected_entity_types` text NOT NULL,
  `override_type` text NOT NULL,
  `override_value_json` text NOT NULL,
  `override_due_date` integer,
  `effective_from` integer,
  `effective_until` integer,
  `status` text DEFAULT 'candidate' NOT NULL,
  `source_url` text,
  `verbatim_quote` text,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`source_pulse_id`) REFERENCES `pulse`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `exception_rule` (
  `id`,
  `firm_id`,
  `source_pulse_id`,
  `jurisdiction`,
  `counties`,
  `affected_forms`,
  `affected_entity_types`,
  `override_type`,
  `override_value_json`,
  `override_due_date`,
  `effective_from`,
  `effective_until`,
  `status`,
  `source_url`,
  `verbatim_quote`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `firm_id`,
  `source_pulse_id`,
  `jurisdiction`,
  `counties`,
  `affected_forms`,
  `affected_entity_types`,
  `override_type`,
  `override_value_json`,
  `override_due_date`,
  `effective_from`,
  `effective_until`,
  `status`,
  `source_url`,
  `verbatim_quote`,
  `created_at`,
  `updated_at`
FROM `__exception_rule_0051`;
--> statement-breakpoint
CREATE INDEX `idx_exc_status_effective` ON `exception_rule` (`status`, `effective_from`, `effective_until`);
--> statement-breakpoint
CREATE INDEX `idx_exc_firm_status` ON `exception_rule` (`firm_id`, `status`, `effective_from`);
--> statement-breakpoint
CREATE INDEX `idx_exc_source_pulse` ON `exception_rule` (`source_pulse_id`);
--> statement-breakpoint
CREATE TABLE `obligation_exception_application` (
  `id` text PRIMARY KEY NOT NULL,
  `firm_id` text NOT NULL,
  `obligation_instance_id` text NOT NULL,
  `exception_rule_id` text NOT NULL,
  `applied_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `applied_by_user_id` text NOT NULL,
  `reverted_at` integer,
  `reverted_by_user_id` text,
  FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`obligation_instance_id`) REFERENCES `obligation_instance`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`exception_rule_id`) REFERENCES `exception_rule`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`applied_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`reverted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `obligation_exception_application` (
  `id`,
  `firm_id`,
  `obligation_instance_id`,
  `exception_rule_id`,
  `applied_at`,
  `applied_by_user_id`,
  `reverted_at`,
  `reverted_by_user_id`
)
SELECT
  `id`,
  `firm_id`,
  `obligation_instance_id`,
  `exception_rule_id`,
  `applied_at`,
  `applied_by_user_id`,
  `reverted_at`,
  `reverted_by_user_id`
FROM `__obligation_exception_application_0051`;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_obligation_exception_application` ON `obligation_exception_application` (`obligation_instance_id`, `exception_rule_id`);
--> statement-breakpoint
CREATE INDEX `idx_oea_firm_obligation_active` ON `obligation_exception_application` (`firm_id`, `obligation_instance_id`, `reverted_at`);
--> statement-breakpoint
CREATE INDEX `idx_oea_exception` ON `obligation_exception_application` (`exception_rule_id`);
--> statement-breakpoint
DROP TABLE `__obligation_exception_application_0051`;
--> statement-breakpoint
DROP TABLE `__pulse_priority_review_0051`;
--> statement-breakpoint
DROP TABLE `__pulse_application_0051`;
--> statement-breakpoint
DROP TABLE `__pulse_firm_alert_0051`;
--> statement-breakpoint
DROP TABLE `__pulse_source_signal_0051`;
--> statement-breakpoint
DROP TABLE `__pulse_source_snapshot_0051`;
--> statement-breakpoint
DROP TABLE `__exception_rule_0051`;
--> statement-breakpoint
DROP TABLE `__pulse_0051`;
--> statement-breakpoint
DROP TABLE IF EXISTS `rule_registry_change_proposal`;
--> statement-breakpoint
DROP TABLE IF EXISTS `rule_registry_reconcile_run`;
