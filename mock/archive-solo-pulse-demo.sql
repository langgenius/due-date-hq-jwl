-- Archive Solo Practice Pulse demo supplement.
-- Seed with:
--   pnpm --dir apps/server exec wrangler d1 execute DB --local --config wrangler.toml --file ../../mock/archive-solo-pulse-demo.sql

BEGIN TRANSACTION;

DELETE FROM in_app_notification
WHERE firm_id = 'mock_firm_solo'
  AND entity_id IN (
    '46000000-0000-4000-8000-000000000101',
    '46000000-0000-4000-8000-000000000102',
    '46000000-0000-4000-8000-000000000103',
    '46000000-0000-4000-8000-000000000104',
    '24000000-0000-4000-8000-000000000101',
    '24000000-0000-4000-8000-000000000102',
    '24000000-0000-4000-8000-000000000103',
    '24000000-0000-4000-8000-000000000104',
    '24000000-0000-4000-8000-000000000105'
  );

DELETE FROM email_outbox
WHERE firm_id = 'mock_firm_solo'
  AND (
    payload_json LIKE '%46000000-0000-4000-8000-000000000101%'
    OR payload_json LIKE '%46000000-0000-4000-8000-000000000102%'
    OR payload_json LIKE '%46000000-0000-4000-8000-000000000103%'
    OR payload_json LIKE '%46000000-0000-4000-8000-000000000104%'
  );

DELETE FROM audit_event
WHERE firm_id = 'mock_firm_solo'
  AND (
    entity_id IN (
      '14000000-0000-4000-8000-000000000101',
      '14000000-0000-4000-8000-000000000102',
      '14000000-0000-4000-8000-000000000103',
      '14000000-0000-4000-8000-000000000104',
      '14000000-0000-4000-8000-000000000105',
      '24000000-0000-4000-8000-000000000101',
      '24000000-0000-4000-8000-000000000102',
      '24000000-0000-4000-8000-000000000103',
      '24000000-0000-4000-8000-000000000104',
      '24000000-0000-4000-8000-000000000105',
      '45000000-0000-4000-8000-000000000101',
      '45000000-0000-4000-8000-000000000102',
      '45000000-0000-4000-8000-000000000103',
      '45000000-0000-4000-8000-000000000104',
      '46000000-0000-4000-8000-000000000101',
      '46000000-0000-4000-8000-000000000102',
      '46000000-0000-4000-8000-000000000103',
      '46000000-0000-4000-8000-000000000104'
    )
    OR entity_id IN (
      SELECT id
      FROM pulse_application
      WHERE firm_id = 'mock_firm_solo'
        AND pulse_id IN (
          '45000000-0000-4000-8000-000000000101',
          '45000000-0000-4000-8000-000000000102',
          '45000000-0000-4000-8000-000000000103',
          '45000000-0000-4000-8000-000000000104'
        )
    )
  );

DELETE FROM evidence_link
WHERE firm_id = 'mock_firm_solo'
  AND (
    obligation_instance_id IN (
      '24000000-0000-4000-8000-000000000101',
      '24000000-0000-4000-8000-000000000102',
      '24000000-0000-4000-8000-000000000103',
      '24000000-0000-4000-8000-000000000104',
      '24000000-0000-4000-8000-000000000105'
    )
    OR source_id IN (
      '45000000-0000-4000-8000-000000000101',
      '45000000-0000-4000-8000-000000000102',
      '45000000-0000-4000-8000-000000000103',
      '45000000-0000-4000-8000-000000000104'
    )
  );

DELETE FROM obligation_exception_application
WHERE firm_id = 'mock_firm_solo'
  AND exception_rule_id IN (
    SELECT id
    FROM exception_rule
    WHERE firm_id = 'mock_firm_solo'
      AND source_pulse_id IN (
        '45000000-0000-4000-8000-000000000101',
        '45000000-0000-4000-8000-000000000102',
        '45000000-0000-4000-8000-000000000103',
        '45000000-0000-4000-8000-000000000104'
      )
  );

DELETE FROM exception_rule
WHERE firm_id = 'mock_firm_solo'
  AND source_pulse_id IN (
    '45000000-0000-4000-8000-000000000101',
    '45000000-0000-4000-8000-000000000102',
    '45000000-0000-4000-8000-000000000103',
    '45000000-0000-4000-8000-000000000104'
  );

DELETE FROM pulse_application
WHERE firm_id = 'mock_firm_solo'
  AND pulse_id IN (
    '45000000-0000-4000-8000-000000000101',
    '45000000-0000-4000-8000-000000000102',
    '45000000-0000-4000-8000-000000000103',
    '45000000-0000-4000-8000-000000000104'
  );

DELETE FROM pulse_priority_review
WHERE firm_id = 'mock_firm_solo'
  AND alert_id IN (
    '46000000-0000-4000-8000-000000000101',
    '46000000-0000-4000-8000-000000000102',
    '46000000-0000-4000-8000-000000000103',
    '46000000-0000-4000-8000-000000000104'
  );

DELETE FROM pulse_firm_alert
WHERE firm_id = 'mock_firm_solo'
  AND id IN (
    '46000000-0000-4000-8000-000000000101',
    '46000000-0000-4000-8000-000000000102',
    '46000000-0000-4000-8000-000000000103',
    '46000000-0000-4000-8000-000000000104'
  );

DELETE FROM pulse
WHERE id IN (
  '45000000-0000-4000-8000-000000000101',
  '45000000-0000-4000-8000-000000000102',
  '45000000-0000-4000-8000-000000000103',
  '45000000-0000-4000-8000-000000000104'
);

DELETE FROM obligation_instance
WHERE firm_id = 'mock_firm_solo'
  AND id IN (
    '24000000-0000-4000-8000-000000000101',
    '24000000-0000-4000-8000-000000000102',
    '24000000-0000-4000-8000-000000000103',
    '24000000-0000-4000-8000-000000000104',
    '24000000-0000-4000-8000-000000000105'
  );

DELETE FROM client_filing_profile
WHERE firm_id = 'mock_firm_solo'
  AND id IN (
    '15000000-0000-4000-8000-000000000101',
    '15000000-0000-4000-8000-000000000102',
    '15000000-0000-4000-8000-000000000103',
    '15000000-0000-4000-8000-000000000104',
    '15000000-0000-4000-8000-000000000105'
  );

DELETE FROM client
WHERE firm_id = 'mock_firm_solo'
  AND id IN (
    '14000000-0000-4000-8000-000000000101',
    '14000000-0000-4000-8000-000000000102',
    '14000000-0000-4000-8000-000000000103',
    '14000000-0000-4000-8000-000000000104',
    '14000000-0000-4000-8000-000000000105'
  );

INSERT INTO client
  (id, firm_id, name, ein, state, county, entity_type, email, notes, assignee_name, importance_weight, late_filing_count_last_12mo, estimated_tax_liability_cents, estimated_tax_liability_source, equity_owner_count, migration_batch_id, created_at, updated_at, deleted_at)
VALUES
  ('14000000-0000-4000-8000-000000000101', 'mock_firm_solo', 'Aspen Solo LLC', '14-1000101', 'CA', 'Los Angeles', 'llc', 'tax@aspensolo.test', 'Archive Solo Pulse demo client: high-confidence CA relief match.', 'Sarah Martinez', 3, 2, 8800000, 'demo_seed', 3, NULL, CAST(unixepoch('2026-05-07 08:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:00:00') * 1000 AS INTEGER), NULL),
  ('14000000-0000-4000-8000-000000000102', 'mock_firm_solo', 'Harbor Solo S-Corp', '14-1000102', 'CA', NULL, 's_corp', 'office@harborsolo.test', 'County intentionally missing so the CA Pulse shows a needs-review client.', 'Sarah Martinez', 2, 1, 5100000, 'demo_seed', 2, NULL, CAST(unixepoch('2026-05-07 08:01:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:01:00') * 1000 AS INTEGER), NULL),
  ('14000000-0000-4000-8000-000000000103', 'mock_firm_solo', 'Queens Corner Partners', '14-1000103', 'NY', 'Queens', 'partnership', 'admin@queenscorner.test', 'Archive Solo Pulse demo client: medium-confidence NY partnership match.', 'Sarah Martinez', 3, 1, 7300000, 'demo_seed', 4, NULL, CAST(unixepoch('2026-05-07 08:02:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:02:00') * 1000 AS INTEGER), NULL),
  ('14000000-0000-4000-8000-000000000104', 'mock_firm_solo', 'Travis Maker LLC', '14-1000104', 'TX', 'Travis', 'llc', 'owner@travismaker.test', 'Archive Solo Pulse demo client: low-confidence TX franchise match.', 'Sarah Martinez', 2, 0, 12600000, 'demo_seed', 5, NULL, CAST(unixepoch('2026-05-07 08:03:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:03:00') * 1000 AS INTEGER), NULL),
  ('14000000-0000-4000-8000-000000000105', 'mock_firm_solo', 'Orange Grove Manufacturing Inc.', '14-1000105', 'FL', 'Orange', 'c_corp', 'tax@orangegrovemfg.test', 'Archive Solo Pulse demo client: very-low-confidence FL corporate income match.', 'Sarah Martinez', 2, 0, 9400000, 'demo_seed', 6, NULL, CAST(unixepoch('2026-05-07 08:04:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:04:00') * 1000 AS INTEGER), NULL);

INSERT INTO client_filing_profile
  (id, firm_id, client_id, state, counties_json, tax_types_json, is_primary, source, migration_batch_id, archived_at, created_at, updated_at)
VALUES
  ('15000000-0000-4000-8000-000000000101', 'mock_firm_solo', '14000000-0000-4000-8000-000000000101', 'CA', '["Los Angeles"]', '["federal_1065"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-07 08:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:05:00') * 1000 AS INTEGER)),
  ('15000000-0000-4000-8000-000000000102', 'mock_firm_solo', '14000000-0000-4000-8000-000000000102', 'CA', '[]', '["federal_1120s"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-07 08:06:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:06:00') * 1000 AS INTEGER)),
  ('15000000-0000-4000-8000-000000000103', 'mock_firm_solo', '14000000-0000-4000-8000-000000000103', 'NY', '["Queens"]', '["ny_it204"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-07 08:07:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:07:00') * 1000 AS INTEGER)),
  ('15000000-0000-4000-8000-000000000104', 'mock_firm_solo', '14000000-0000-4000-8000-000000000104', 'TX', '["Travis"]', '["tx_franchise_report"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-07 08:08:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:08:00') * 1000 AS INTEGER)),
  ('15000000-0000-4000-8000-000000000105', 'mock_firm_solo', '14000000-0000-4000-8000-000000000105', 'FL', '["Orange"]', '["fl_corp_income"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-07 08:09:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:09:00') * 1000 AS INTEGER));

INSERT INTO obligation_instance
  (id, firm_id, client_id, client_filing_profile_id, tax_type, tax_year, rule_id, rule_version, rule_period, generation_source, jurisdiction, base_due_date, current_due_date, status, extension_decision, migration_batch_id, estimated_tax_due_cents, estimated_exposure_cents, exposure_status, penalty_breakdown_json, penalty_formula_version, exposure_calculated_at, created_at, updated_at)
VALUES
  ('24000000-0000-4000-8000-000000000101', 'mock_firm_solo', '14000000-0000-4000-8000-000000000101', '15000000-0000-4000-8000-000000000101', 'federal_1065', 2026, NULL, NULL, NULL, 'manual', 'CA', CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), 'pending', 'not_considered', NULL, 8800000, 260000, 'ready', '[{"key":"late_filing","label":"Partnership late filing exposure","amountCents":260000,"formula":"Demo Pulse exposure"}]', 'penalty-v1', CAST(unixepoch('2026-05-07 08:10:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:10:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:10:00') * 1000 AS INTEGER)),
  ('24000000-0000-4000-8000-000000000102', 'mock_firm_solo', '14000000-0000-4000-8000-000000000102', '15000000-0000-4000-8000-000000000102', 'federal_1120s', 2026, NULL, NULL, NULL, 'manual', 'CA', CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), 'review', 'not_considered', NULL, 5100000, 150000, 'ready', '[{"key":"shareholder_penalty","label":"S-corp shareholder exposure","amountCents":150000,"formula":"Demo Pulse exposure"}]', 'penalty-v1', CAST(unixepoch('2026-05-07 08:11:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:11:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:11:00') * 1000 AS INTEGER)),
  ('24000000-0000-4000-8000-000000000103', 'mock_firm_solo', '14000000-0000-4000-8000-000000000103', '15000000-0000-4000-8000-000000000103', 'ny_it204', 2026, NULL, NULL, NULL, 'manual', 'NY', CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), 'pending', 'not_considered', NULL, 7300000, 180000, 'ready', '[{"key":"ny_partnership","label":"NY partnership exposure","amountCents":180000,"formula":"Demo Pulse exposure"}]', 'penalty-v1', CAST(unixepoch('2026-05-07 08:12:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:12:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:12:00') * 1000 AS INTEGER)),
  ('24000000-0000-4000-8000-000000000104', 'mock_firm_solo', '14000000-0000-4000-8000-000000000104', '15000000-0000-4000-8000-000000000104', 'tx_franchise_report', 2026, NULL, NULL, NULL, 'manual', 'TX', CAST(unixepoch('2026-05-05 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-05 00:00:00') * 1000 AS INTEGER), 'waiting_on_client', 'not_considered', NULL, 12600000, 240000, 'ready', '[{"key":"tx_franchise","label":"TX franchise exposure","amountCents":240000,"formula":"Demo Pulse exposure"}]', 'penalty-v1', CAST(unixepoch('2026-05-07 08:13:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:13:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:13:00') * 1000 AS INTEGER)),
  ('24000000-0000-4000-8000-000000000105', 'mock_firm_solo', '14000000-0000-4000-8000-000000000105', '15000000-0000-4000-8000-000000000105', 'fl_corp_income', 2026, NULL, NULL, NULL, 'manual', 'FL', CAST(unixepoch('2026-05-12 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-12 00:00:00') * 1000 AS INTEGER), 'pending', 'not_considered', NULL, 9400000, 190000, 'ready', '[{"key":"fl_corp","label":"FL corporate income exposure","amountCents":190000,"formula":"Demo Pulse exposure"}]', 'penalty-v1', CAST(unixepoch('2026-05-07 08:14:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:14:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:14:00') * 1000 AS INTEGER));

INSERT INTO pulse
  (id, source, source_url, raw_r2_key, published_at, ai_summary, verbatim_quote, parsed_jurisdiction, parsed_counties, parsed_forms, parsed_entity_types, parsed_original_due_date, parsed_new_due_date, parsed_effective_from, confidence, status, reviewed_by, reviewed_at, requires_human_review, is_sample, created_at, updated_at)
VALUES
  ('45000000-0000-4000-8000-000000000101', 'IRS Disaster Relief', 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations', 'mock/pulse/archive-solo-ca-relief.html', CAST(unixepoch('2026-05-07 08:20:00') * 1000 AS INTEGER), 'CA relief extends selected partnership and S-corp deadlines for Los Angeles County taxpayers.', 'Affected Los Angeles County business taxpayers have until June 16, 2026 to file selected federal business returns.', 'CA', '["Los Angeles"]', '["federal_1065","federal_1120s"]', '["llc","s_corp"]', CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-06-16 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:20:00') * 1000 AS INTEGER), 0.96, 'approved', 'mock_user_owner_sarah', CAST(unixepoch('2026-05-07 08:30:00') * 1000 AS INTEGER), 1, 1, CAST(unixepoch('2026-05-07 08:21:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:31:00') * 1000 AS INTEGER)),
  ('45000000-0000-4000-8000-000000000102', 'NY DTF Advisory', 'https://www.tax.ny.gov/bus/partnerships/', 'mock/pulse/archive-solo-ny-it204.html', CAST(unixepoch('2026-05-07 08:15:00') * 1000 AS INTEGER), 'NY DTF advisory extends selected IT-204 partnership deadlines for Queens County.', 'Partnership filers in Queens County may use June 17, 2026 for the affected IT-204 filing deadline.', 'NY', '["Queens"]', '["ny_it204"]', '["partnership"]', CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-06-17 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:15:00') * 1000 AS INTEGER), 0.82, 'approved', 'mock_user_owner_sarah', CAST(unixepoch('2026-05-07 08:25:00') * 1000 AS INTEGER), 1, 1, CAST(unixepoch('2026-05-07 08:16:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:26:00') * 1000 AS INTEGER)),
  ('45000000-0000-4000-8000-000000000103', 'TX Comptroller Notice', 'https://comptroller.texas.gov/taxes/franchise/', 'mock/pulse/archive-solo-tx-franchise.html', CAST(unixepoch('2026-05-07 08:10:00') * 1000 AS INTEGER), 'TX Comptroller notice appears to extend franchise report dates for Travis County LLCs.', 'The affected franchise report date is listed as July 15, 2026, but the source language should be reviewed before applying.', 'TX', '["Travis"]', '["tx_franchise_report"]', '["llc"]', CAST(unixepoch('2026-05-05 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-07-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:10:00') * 1000 AS INTEGER), 0.63, 'approved', 'mock_user_owner_sarah', CAST(unixepoch('2026-05-07 08:20:00') * 1000 AS INTEGER), 1, 1, CAST(unixepoch('2026-05-07 08:11:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:21:00') * 1000 AS INTEGER)),
  ('45000000-0000-4000-8000-000000000104', 'FL DOR Bulletin', 'https://floridarevenue.com/taxes/taxesfees/Pages/corporate.aspx', 'mock/pulse/archive-solo-fl-corp.html', CAST(unixepoch('2026-05-07 08:05:00') * 1000 AS INTEGER), 'Very-low-confidence FL DOR bulletin extracts a corporate income deadline extension.', 'Corporate income tax dates may vary by fiscal year, extension election, and taxpayer status; verify the Orange County applicability before applying.', 'FL', '[]', '["fl_corp_income"]', '["c_corp"]', CAST(unixepoch('2026-05-12 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-06-01 00:00:00') * 1000 AS INTEGER), NULL, 0.46, 'approved', 'mock_user_owner_sarah', CAST(unixepoch('2026-05-07 08:15:00') * 1000 AS INTEGER), 1, 1, CAST(unixepoch('2026-05-07 08:06:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:16:00') * 1000 AS INTEGER));

INSERT INTO pulse_firm_alert
  (id, pulse_id, firm_id, status, matched_count, needs_review_count, dismissed_by, dismissed_at, created_at, updated_at)
VALUES
  ('46000000-0000-4000-8000-000000000101', '45000000-0000-4000-8000-000000000101', 'mock_firm_solo', 'matched', 1, 1, NULL, NULL, CAST(unixepoch('2026-05-07 08:32:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:32:00') * 1000 AS INTEGER)),
  ('46000000-0000-4000-8000-000000000102', '45000000-0000-4000-8000-000000000102', 'mock_firm_solo', 'matched', 1, 0, NULL, NULL, CAST(unixepoch('2026-05-07 08:27:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:27:00') * 1000 AS INTEGER)),
  ('46000000-0000-4000-8000-000000000103', '45000000-0000-4000-8000-000000000103', 'mock_firm_solo', 'matched', 1, 0, NULL, NULL, CAST(unixepoch('2026-05-07 08:22:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:22:00') * 1000 AS INTEGER)),
  ('46000000-0000-4000-8000-000000000104', '45000000-0000-4000-8000-000000000104', 'mock_firm_solo', 'matched', 1, 0, NULL, NULL, CAST(unixepoch('2026-05-07 08:17:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 08:17:00') * 1000 AS INTEGER));

COMMIT;
