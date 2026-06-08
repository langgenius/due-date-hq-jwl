CREATE TABLE `pulse_alert_note` (
	`id` text PRIMARY KEY NOT NULL,
	`firm_id` text NOT NULL,
	`alert_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`parent_note_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`alert_id`) REFERENCES `pulse_firm_alert`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_pulse_alert_note_firm_alert_time` ON `pulse_alert_note` (`firm_id`,`alert_id`,`created_at`);
