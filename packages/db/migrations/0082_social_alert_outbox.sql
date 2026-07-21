-- Global social Alert outbox and one-slot-per-ET-day publishing ledger.
-- Public copy is frozen on social_alert_post; tenant impact remains in
-- pulse_firm_alert and is materialized only after authenticated ref resolution.
CREATE TABLE `social_alert_post` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text DEFAULT 'x' NOT NULL,
	`pulse_id` text NOT NULL,
	`ref_token` text NOT NULL,
	`post_text` text NOT NULL,
	`target_url` text NOT NULL,
	`teaser` text NOT NULL,
	`agency` text NOT NULL,
	`jurisdiction` text NOT NULL,
	`change_kind` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`ready_at` integer,
	`approved_by` text,
	`approved_at` integer,
	`x_post_id` text,
	`published_at` integer,
	`cancelled_at` integer,
	`cancellation_reason` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`pulse_id`) REFERENCES `pulse`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `ck_social_alert_post_channel` CHECK (`channel` in ('x')),
	CONSTRAINT `ck_social_alert_post_status` CHECK (`status` in ('draft', 'ready', 'scheduled', 'published', 'unknown', 'cancelled')),
	CONSTRAINT `ck_social_alert_post_priority` CHECK (`priority` in ('normal', 'urgent')),
	CONSTRAINT `ck_social_alert_post_ref_token` CHECK (length(`ref_token`) between 16 and 128 and `ref_token` not glob '*[^A-Za-z0-9_-]*'),
	CONSTRAINT `ck_social_alert_post_copy` CHECK (length(trim(`post_text`)) > 0),
	CONSTRAINT `ck_social_alert_post_target_url` CHECK (length(trim(`target_url`)) > 0),
	CONSTRAINT `ck_social_alert_post_ready_at` CHECK (`status` not in ('ready', 'scheduled') or `ready_at` is not null),
	CONSTRAINT `ck_social_alert_post_published_fields` CHECK (`status` <> 'published' or (`x_post_id` is not null and `published_at` is not null)),
	CONSTRAINT `ck_social_alert_post_cancelled_at` CHECK (`status` <> 'cancelled' or `cancelled_at` is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_social_alert_post_channel_pulse` ON `social_alert_post` (`channel`,`pulse_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_social_alert_post_ref_token` ON `social_alert_post` (`ref_token`);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_social_alert_post_channel_x_post` ON `social_alert_post` (`channel`,`x_post_id`);
--> statement-breakpoint
CREATE INDEX `idx_social_alert_post_backlog` ON `social_alert_post` (`channel`,`status`,`priority`,`ready_at`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_social_alert_post_pulse` ON `social_alert_post` (`pulse_id`);
--> statement-breakpoint
CREATE TABLE `social_publish_run` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text DEFAULT 'x' NOT NULL,
	`local_date` text NOT NULL,
	`post_id` text NOT NULL,
	`status` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_attempt_at` integer,
	`lease_expires_at` integer,
	`response_http_status` integer,
	`failure_reason` text,
	`x_post_id` text,
	`queued_at` integer,
	`sending_at` integer,
	`published_at` integer,
	`failed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `social_alert_post`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT `ck_social_publish_run_channel` CHECK (`channel` in ('x')),
	CONSTRAINT `ck_social_publish_run_status` CHECK (`status` in ('draft_only', 'queued', 'sending', 'published', 'failed', 'unknown')),
	CONSTRAINT `ck_social_publish_run_local_date` CHECK (length(`local_date`) = 10 and `local_date` glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT `ck_social_publish_run_attempt_count` CHECK (`attempt_count` >= 0),
	CONSTRAINT `ck_social_publish_run_queued_at` CHECK (`status` <> 'queued' or `queued_at` is not null),
	CONSTRAINT `ck_social_publish_run_sending_fields` CHECK (`status` <> 'sending' or (`sending_at` is not null and `lease_expires_at` is not null)),
	CONSTRAINT `ck_social_publish_run_published_fields` CHECK (`status` <> 'published' or (`x_post_id` is not null and `published_at` is not null)),
	CONSTRAINT `ck_social_publish_run_failed_at` CHECK (`status` <> 'failed' or `failed_at` is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_social_publish_run_channel_date` ON `social_publish_run` (`channel`,`local_date`);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_social_publish_run_live_post` ON `social_publish_run` (`post_id`) WHERE `status` in ('queued', 'sending', 'published', 'unknown');
--> statement-breakpoint
CREATE INDEX `idx_social_publish_run_status_time` ON `social_publish_run` (`status`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_social_publish_run_post` ON `social_publish_run` (`post_id`,`created_at`);
