CREATE TABLE `obligation_readiness_checklist_item` (
  `id` text PRIMARY KEY NOT NULL,
  `firm_id` text NOT NULL,
  `obligation_instance_id` text NOT NULL,
  `label` text NOT NULL,
  `description` text,
  `source` text DEFAULT 'template' NOT NULL,
  `status` text DEFAULT 'missing' NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `note` text,
  `received_at` integer,
  `received_by_user_id` text,
  `created_by_user_id` text NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`obligation_instance_id`) REFERENCES `obligation_instance`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`received_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);

CREATE INDEX `idx_readiness_doc_item_obligation`
  ON `obligation_readiness_checklist_item` (`firm_id`, `obligation_instance_id`);

CREATE INDEX `idx_readiness_doc_item_status`
  ON `obligation_readiness_checklist_item` (`firm_id`, `status`);
