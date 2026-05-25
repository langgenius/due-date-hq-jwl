WITH inferred_period AS (
  SELECT
    `id`,
    CASE
      WHEN `tax_year_type` = 'fiscal'
        AND `fiscal_year_end_month` IS NOT NULL
        AND `fiscal_year_end_day` IS NOT NULL
        THEN
          CASE
            WHEN date(
              printf(
                '%04d-%02d-%02d',
                CAST(strftime('%Y', `base_due_date` / 1000, 'unixepoch') AS integer),
                `fiscal_year_end_month`,
                `fiscal_year_end_day`
              )
            ) >= date(`base_due_date` / 1000, 'unixepoch')
              THEN CAST(strftime('%Y', `base_due_date` / 1000, 'unixepoch') AS integer) - 1
            ELSE CAST(strftime('%Y', `base_due_date` / 1000, 'unixepoch') AS integer)
          END
      WHEN `tax_type` IN (
        'federal_1040',
        'federal_1041',
        'federal_1065',
        'federal_1120',
        'federal_1120s',
        'ny_ct3s',
        'ny_it204',
        'ca_100',
        'ca_100s',
        'ca_568',
        'fl_corp_income',
        'co_partnership'
      )
        THEN CAST(strftime('%Y', `base_due_date` / 1000, 'unixepoch') AS integer) - 1
      ELSE COALESCE(`tax_year`, CAST(strftime('%Y', `base_due_date` / 1000, 'unixepoch') AS integer))
    END AS `period_year`
  FROM `obligation_instance`
  WHERE `tax_year` IS NOT NULL
    AND `tax_period_start` IS NULL
    AND `tax_period_end` IS NULL
)
UPDATE `obligation_instance`
SET
  `tax_period_start` = (
    SELECT
      CASE
        WHEN `obligation_instance`.`tax_year_type` = 'fiscal'
          AND `obligation_instance`.`fiscal_year_end_month` IS NOT NULL
          AND `obligation_instance`.`fiscal_year_end_day` IS NOT NULL
          THEN CAST(unixepoch(date(
            printf(
              '%04d-%02d-%02d',
              `inferred_period`.`period_year`,
              `obligation_instance`.`fiscal_year_end_month`,
              `obligation_instance`.`fiscal_year_end_day`
            ),
            '+1 day',
            '-1 year'
          )) * 1000 AS integer)
        ELSE CAST(unixepoch(printf('%04d-01-01 00:00:00', `inferred_period`.`period_year`)) * 1000 AS integer)
      END
    FROM `inferred_period`
    WHERE `inferred_period`.`id` = `obligation_instance`.`id`
  ),
  `tax_period_end` = (
    SELECT
      CASE
        WHEN `obligation_instance`.`tax_year_type` = 'fiscal'
          AND `obligation_instance`.`fiscal_year_end_month` IS NOT NULL
          AND `obligation_instance`.`fiscal_year_end_day` IS NOT NULL
          THEN CAST(unixepoch(printf(
            '%04d-%02d-%02d 00:00:00',
            `inferred_period`.`period_year`,
            `obligation_instance`.`fiscal_year_end_month`,
            `obligation_instance`.`fiscal_year_end_day`
          )) * 1000 AS integer)
        ELSE CAST(unixepoch(printf('%04d-12-31 00:00:00', `inferred_period`.`period_year`)) * 1000 AS integer)
      END
    FROM `inferred_period`
    WHERE `inferred_period`.`id` = `obligation_instance`.`id`
  ),
  `tax_period_kind` = CASE
    WHEN `tax_year_type` = 'fiscal'
      AND `fiscal_year_end_month` IS NOT NULL
      AND `fiscal_year_end_day` IS NOT NULL THEN 'fiscal'
    ELSE 'calendar'
  END,
  `tax_period_source` = CASE
    WHEN `tax_period_source` = 'unknown' THEN 'migration'
    ELSE `tax_period_source`
  END,
  `tax_period_review_reason` = NULL
WHERE `id` IN (SELECT `id` FROM `inferred_period`);
