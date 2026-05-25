CREATE TABLE IF NOT EXISTS `rule_concrete_draft` (
  `ai_output_id` text PRIMARY KEY NOT NULL,
  `firm_id` text,
  `user_id` text,
  `input_context_ref` text NOT NULL,
  `input_hash` text NOT NULL,
  `prompt_version` text NOT NULL,
  `model` text,
  `rule_id` text NOT NULL,
  `rule_version` integer NOT NULL,
  `source_id` text NOT NULL,
  `source_signal_id` text,
  `source_snapshot_id` text,
  `source_url` text NOT NULL,
  `source_fetched_at` integer,
  `source_published_at` integer,
  `source_excerpt` text NOT NULL,
  `source_text` text,
  `output_text` text NOT NULL,
  `citations_json` text,
  `generated_at` integer NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`ai_output_id`) REFERENCES `ai_output`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_rule_concrete_draft_firm_context` ON `rule_concrete_draft` (`firm_id`, `input_context_ref`, `generated_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_rule_concrete_draft_context` ON `rule_concrete_draft` (`input_context_ref`, `generated_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_rule_concrete_draft_rule_source` ON `rule_concrete_draft` (`rule_id`, `rule_version`, `source_id`);
