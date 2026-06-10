-- Rebuild notification_preference to the drizzle-schema shape.
--
-- Staging's table was created on 2026-04-30 by a since-rewritten 0014
-- (old shape: pulse_email_cadence / deadline_email_30|7|1_days / quiet_hours_*;
-- the original file never landed in git). The rewritten 0014's
-- CREATE TABLE IF NOT EXISTS then silently no-opped on 2026-05-01, leaving the
-- live table missing email_enabled / reminders_enabled / pulse_enabled /
-- unassigned_reminders_enabled / created_at while 0037's ALTERs still landed —
-- so every preference read (morning digests, reminder dispatch, notification
-- settings) failed with "no such column". Fresh databases were unaffected,
-- which is why no test ever caught it.
--
-- The table holds zero rows on staging and preference rows are recreated on
-- demand (select-then-upsert in repo/notifications.ts), so a drop+recreate
-- loses nothing. Deliberately NOT "IF NOT EXISTS": if this table ever drifts
-- again the migration should fail loudly, not mask it.
DROP TABLE IF EXISTS `notification_preference`;
--> statement-breakpoint
CREATE TABLE `notification_preference` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`user_id` text NOT NULL,
	`email_enabled` integer DEFAULT true NOT NULL,
	`in_app_enabled` integer DEFAULT true NOT NULL,
	`reminders_enabled` integer DEFAULT true NOT NULL,
	`pulse_enabled` integer DEFAULT true NOT NULL,
	`unassigned_reminders_enabled` integer DEFAULT true NOT NULL,
	`morning_digest_enabled` integer DEFAULT true NOT NULL,
	`morning_digest_hour` integer DEFAULT 7 NOT NULL,
	`morning_digest_days_json` text DEFAULT '["mon","tue","wed","thu","fri"]' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_notification_preference_firm_user` ON `notification_preference` (`firm_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_notification_preference_user` ON `notification_preference` (`user_id`);
