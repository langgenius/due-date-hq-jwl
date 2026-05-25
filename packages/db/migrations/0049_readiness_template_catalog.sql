ALTER TABLE `obligation_readiness_checklist_item`
  ADD `template_key` text;

ALTER TABLE `obligation_readiness_checklist_item`
  ADD `template_version` integer;

CREATE TABLE `obligation_readiness_template_item_suppression` (
  `id` text PRIMARY KEY NOT NULL,
  `firm_id` text NOT NULL,
  `obligation_instance_id` text NOT NULL,
  `template_key` text NOT NULL,
  `template_version` integer NOT NULL,
  `suppressed_by_user_id` text,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`obligation_instance_id`) REFERENCES `obligation_instance`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`suppressed_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE UNIQUE INDEX `uq_readiness_template_suppression_item`
  ON `obligation_readiness_template_item_suppression` (
    `firm_id`,
    `obligation_instance_id`,
    `template_key`
  );

CREATE INDEX `idx_readiness_template_suppression_obligation`
  ON `obligation_readiness_template_item_suppression` (`firm_id`, `obligation_instance_id`);
