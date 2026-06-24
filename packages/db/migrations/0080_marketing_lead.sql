CREATE TABLE `marketing_lead` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`firm` text,
	`focus` text,
	`tools` text,
	`pain` text,
	`source` text,
	`locale` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_marketing_lead_created_at` ON `marketing_lead` (`created_at`);
