INSERT OR IGNORE INTO pulse_source_snapshot (
  id,
  source_id,
  external_id,
  title,
  official_source_url,
  published_at,
  fetched_at,
  content_hash,
  raw_r2_key,
  parse_status,
  pulse_id,
  ai_output_id,
  failure_reason,
  created_at,
  updated_at
)
SELECT
  id,
  source_id,
  external_id,
  title,
  official_source_url,
  published_at,
  fetched_at,
  content_hash,
  raw_r2_key,
  CASE
    WHEN linked_pulse_id IS NOT NULL THEN 'extracted'
    WHEN status = 'dismissed' THEN 'ignored'
    ELSE 'pending_extract'
  END,
  linked_pulse_id,
  NULL,
  CASE
    WHEN status = 'dismissed' THEN 'Migrated from dismissed legacy source event.'
    ELSE NULL
  END,
  created_at,
  updated_at
FROM pulse_source_signal;

DROP INDEX IF EXISTS idx_pulse_signal_review_decision;
DROP INDEX IF EXISTS idx_pulse_signal_review_rule;
DROP INDEX IF EXISTS idx_pulse_signal_source_time;
DROP INDEX IF EXISTS idx_pulse_signal_status_time;
DROP INDEX IF EXISTS uq_pulse_signal_source_external_hash;
DROP TABLE IF EXISTS pulse_source_signal;

ALTER TABLE rule_concrete_draft DROP COLUMN source_signal_id;
