ALTER TABLE `obligation_instance` ADD `tax_period_start` integer;
--> statement-breakpoint
ALTER TABLE `obligation_instance` ADD `tax_period_end` integer;
--> statement-breakpoint
ALTER TABLE `obligation_instance` ADD `tax_period_kind` text DEFAULT 'unknown' NOT NULL;
--> statement-breakpoint
ALTER TABLE `obligation_instance` ADD `tax_period_source` text DEFAULT 'unknown' NOT NULL;
--> statement-breakpoint
ALTER TABLE `obligation_instance` ADD `tax_period_review_reason` text;
