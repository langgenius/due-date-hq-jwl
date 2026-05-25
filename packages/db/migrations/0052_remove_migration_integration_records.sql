UPDATE `migration_batch`
SET `source` = 'csv'
WHERE `source` IN (
  'integration_taxdome_zapier',
  'integration_karbon_api',
  'integration_soraban_api',
  'integration_safesend_api',
  'integration_proconnect_export'
);
--> statement-breakpoint
DROP TABLE IF EXISTS `external_reference`;
--> statement-breakpoint
DROP TABLE IF EXISTS `migration_staging_row`;
