-- rule_catalog_release — one row per filing-year cohort the platform ships.
-- The row's existence (unique filing_year) is the idempotency key the
-- catalog-sync job uses to detect a brand-new annual cohort exactly once, and
-- it drives the in-app "new catalog" banner. Platform-global: no firm scope,
-- no review deadline — surfacing the release is a pure system signal.
CREATE TABLE `rule_catalog_release` (
	`id` text PRIMARY KEY NOT NULL,
	`filing_year` integer NOT NULL,
	`new_rule_count` integer DEFAULT 0 NOT NULL,
	`changed_rule_count` integer DEFAULT 0 NOT NULL,
	`released_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_rule_catalog_release_filing_year` ON `rule_catalog_release` (`filing_year`);
