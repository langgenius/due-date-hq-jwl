-- 0059 added `monitoring_baseline_at` / `baseline_mode` with a default of
-- 'establish_on_first_seen'. SQLite backfills existing rows with that default,
-- so every source that was ALREADY being monitored before this feature shipped
-- would be treated as brand-new and have its next changed scan suppressed as a
-- "historical baseline" (ingest.ts `sourceNeedsMonitoringBaseline`). That would
-- silently drop one round of real alerts for live sources (e.g. irs.disaster,
-- ca.ftb.*) right after deploy.
--
-- A source that has already had a successful (or even attempted) check is, by
-- definition, past its cold-start window: its history is whatever we have
-- already ingested. Mark those rows `active` with a concrete baseline timestamp
-- so they go straight to normal change detection. Rows that have never been
-- checked keep `establish_on_first_seen` and will baseline on their first scan.
UPDATE `pulse_source_state`
SET `monitoring_baseline_at` = COALESCE(`last_success_at`, `last_checked_at`, `updated_at`),
    `baseline_mode` = 'active'
WHERE `monitoring_baseline_at` IS NULL
  AND (`last_success_at` IS NOT NULL OR `last_checked_at` IS NOT NULL);
