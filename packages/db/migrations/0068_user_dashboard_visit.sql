-- Per-user-per-firm "last opened the dashboard" stamp (Pencil QGZta /splash).
-- Drives the once-a-day post-login welcome trigger + the "while you were away"
-- recap window. App-owned (the better-auth `user` table is never hand-migrated).
CREATE TABLE `user_dashboard_visit` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `firm_id` text NOT NULL,
  `last_visit_at` integer NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_dashboard_visit` ON `user_dashboard_visit` (`user_id`,`firm_id`);
