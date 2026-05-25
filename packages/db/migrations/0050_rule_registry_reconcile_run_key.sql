DROP INDEX `uq_rule_registry_reconcile_run_week`;
--> statement-breakpoint
ALTER TABLE `rule_registry_reconcile_run` RENAME COLUMN `week_key` TO `run_key`;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_rule_registry_reconcile_run_key` ON `rule_registry_reconcile_run` (`run_key`);
