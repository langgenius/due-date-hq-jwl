CREATE TABLE `opportunity_dismissal` (
  `id` text PRIMARY KEY NOT NULL,
  `firm_id` text NOT NULL,
  `opportunity_key` text NOT NULL,
  `kind` text NOT NULL,
  `snooze_until` integer,
  `reason` text,
  `created_by_user_id` text NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX `uq_opportunity_dismissal_key`
  ON `opportunity_dismissal` (`firm_id`, `opportunity_key`);

CREATE INDEX `idx_opportunity_dismissal_firm_active`
  ON `opportunity_dismissal` (`firm_id`, `snooze_until`);
