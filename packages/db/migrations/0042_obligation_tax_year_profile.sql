ALTER TABLE `obligation_instance` ADD `tax_year_type` text DEFAULT 'calendar' NOT NULL;
--> statement-breakpoint
ALTER TABLE `obligation_instance` ADD `fiscal_year_end_month` integer;
--> statement-breakpoint
ALTER TABLE `obligation_instance` ADD `fiscal_year_end_day` integer;
--> statement-breakpoint
UPDATE `obligation_instance`
SET
  `tax_year_type` = CASE
    WHEN (
      SELECT `tax_year_type`
      FROM `client`
      WHERE `client`.`id` = `obligation_instance`.`client_id`
    ) = 'fiscal' THEN 'fiscal'
    WHEN `tax_period_kind` = 'fiscal' THEN 'fiscal'
    ELSE 'calendar'
  END,
  `fiscal_year_end_month` = CASE
    WHEN (
      SELECT `tax_year_type`
      FROM `client`
      WHERE `client`.`id` = `obligation_instance`.`client_id`
    ) = 'fiscal' THEN (
      SELECT `fiscal_year_end_month`
      FROM `client`
      WHERE `client`.`id` = `obligation_instance`.`client_id`
    )
    WHEN `tax_period_kind` = 'fiscal' AND `tax_period_end` IS NOT NULL THEN CAST(strftime('%m', `tax_period_end` / 1000, 'unixepoch') AS integer)
    ELSE NULL
  END,
  `fiscal_year_end_day` = CASE
    WHEN (
      SELECT `tax_year_type`
      FROM `client`
      WHERE `client`.`id` = `obligation_instance`.`client_id`
    ) = 'fiscal' THEN (
      SELECT `fiscal_year_end_day`
      FROM `client`
      WHERE `client`.`id` = `obligation_instance`.`client_id`
    )
    WHEN `tax_period_kind` = 'fiscal' AND `tax_period_end` IS NOT NULL THEN CAST(strftime('%d', `tax_period_end` / 1000, 'unixepoch') AS integer)
    ELSE NULL
  END;
