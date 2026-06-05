-- Soft-archive (supersede) for rule-backed obligations.
--
-- When a client's tax classification changes, the rule-backed obligation set is
-- recomputed: obligations that no longer apply (e.g. the old 1120 after a C->S
-- election) are SUPERSEDED rather than hard-deleted, so per-obligation workflow
-- state (status, prep/review, e-file, extension, review notes) and the audit
-- trail are preserved and the change stays reversible.
--
-- `superseded_at` NULL = active. Active obligation reads AND the generation
-- dedup feed filter on `superseded_at IS NULL`. `superseded_by_audit_id` is a
-- SOFT pointer (no FK) to the `client.obligations.reclassified` audit event:
-- obligation_instance must not depend on audit_event, which already references
-- obligation_instance (a hard FK would create an import/foreign-key cycle).
ALTER TABLE `obligation_instance` ADD `superseded_at` integer;
--> statement-breakpoint
ALTER TABLE `obligation_instance` ADD `superseded_reason` text;
--> statement-breakpoint
ALTER TABLE `obligation_instance` ADD `superseded_by_audit_id` text;
--> statement-breakpoint
-- Recreate the generated-obligation dedup index so a superseded row no longer
-- occupies the unique slot — a later re-add with the same
-- (firm, client, jurisdiction, rule, tax_year, rule_period) key must be allowed.
DROP INDEX IF EXISTS `uq_oi_generated_rule_period`;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_oi_generated_rule_period` ON `obligation_instance` (
  `firm_id`,
  `client_id`,
  `jurisdiction`,
  `rule_id`,
  `tax_year`,
  `rule_period`
)
WHERE
  `rule_id` IS NOT NULL
  AND `tax_year` IS NOT NULL
  AND `rule_period` IS NOT NULL
  AND `superseded_at` IS NULL;
