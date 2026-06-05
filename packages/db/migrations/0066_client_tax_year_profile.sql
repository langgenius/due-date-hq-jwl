-- Per-(client, tax year) entity classification override.
--
-- The scalar `client.entity_type` / `tax_classification` stay the current /
-- default pointer; a row here overrides classification for a specific tax year,
-- so a reclassification keeps an accurate historical record and per-year
-- obligation generation can resolve the right classification per year.
--
-- No backfill: absence of a row for a year means "use the scalar", which is
-- exactly today's behavior, so an empty table is already correct.
CREATE TABLE `client_tax_year_profile` (
  `id` text PRIMARY KEY NOT NULL,
  `firm_id` text NOT NULL,
  `client_id` text NOT NULL,
  `tax_year` integer NOT NULL,
  `entity_type` text NOT NULL,
  `tax_classification` text,
  `source` text DEFAULT 'manual' NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`firm_id`) REFERENCES `firm_profile`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_ctyp_client_tax_year` ON `client_tax_year_profile` (`client_id`,`tax_year`);
--> statement-breakpoint
CREATE INDEX `idx_ctyp_firm_client_year` ON `client_tax_year_profile` (`firm_id`,`client_id`,`tax_year`);
