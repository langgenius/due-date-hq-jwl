ALTER TABLE `client` ADD `external_client_id` text;--> statement-breakpoint
ALTER TABLE `client` ADD `address_line_1` text;--> statement-breakpoint
ALTER TABLE `client` ADD `city` text;--> statement-breakpoint
ALTER TABLE `client` ADD `postal_code` text;--> statement-breakpoint
ALTER TABLE `client` ADD `primary_phone` text;--> statement-breakpoint
ALTER TABLE `client` ADD `source_status` text;--> statement-breakpoint
CREATE INDEX `idx_client_firm_external_client` ON `client` (`firm_id`,`external_client_id`);
