UPDATE `practice_rule_review_task`
SET
  `status` = 'open',
  `reason` = 'new_template',
  `review_note` = NULL,
  `reviewed_by` = NULL,
  `reviewed_at` = NULL,
  `updated_at` = cast(unixepoch('subsecond') * 1000 as integer)
WHERE EXISTS (
  SELECT 1
  FROM `practice_rule`
  WHERE
    `practice_rule`.`firm_id` = `practice_rule_review_task`.`firm_id`
    AND `practice_rule`.`rule_id` = `practice_rule_review_task`.`rule_id`
    AND `practice_rule`.`template_version` = `practice_rule_review_task`.`template_version`
    AND `practice_rule`.`status` = 'active'
    AND json_extract(`practice_rule`.`rule_json`, '$.dueDateLogic.kind') = 'source_defined_calendar'
);
--> statement-breakpoint

INSERT OR IGNORE INTO `practice_rule_review_task` (
  `id`,
  `firm_id`,
  `rule_id`,
  `template_version`,
  `status`,
  `reason`,
  `created_at`,
  `updated_at`
)
SELECT
  lower(hex(randomblob(16))),
  `firm_id`,
  `rule_id`,
  `template_version`,
  'open',
  'new_template',
  `created_at`,
  cast(unixepoch('subsecond') * 1000 as integer)
FROM `practice_rule`
WHERE
  `status` = 'active'
  AND json_extract(`rule_json`, '$.dueDateLogic.kind') = 'source_defined_calendar';
--> statement-breakpoint

UPDATE `practice_rule`
SET
  `status` = 'pending_review',
  `rule_json` = json_set(`rule_json`, '$.status', 'pending_review'),
  `review_note` = NULL,
  `reviewed_by` = NULL,
  `reviewed_at` = NULL,
  `updated_at` = cast(unixepoch('subsecond') * 1000 as integer)
WHERE
  `status` = 'active'
  AND json_extract(`rule_json`, '$.dueDateLogic.kind') = 'source_defined_calendar';
