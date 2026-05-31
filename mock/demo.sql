-- DueDateHQ live-demo dataset.
-- Seed with: pnpm db:migrate:local && pnpm db:seed:demo

BEGIN TRANSACTION;

-- Demo users can create throwaway practice records during local QA. Clear any
-- firm owned by a mock user before rebuilding the canonical mock practices.
DELETE FROM client_email_suppression WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM client_readiness_response WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM client_readiness_request WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM calendar_subscription WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM reminder WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM in_app_notification WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM notification_digest_run WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM email_outbox WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM notification_preference WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM opportunity_dismissal WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM dashboard_brief WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM ai_insight_cache WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM llm_log WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM ai_output WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM audit_evidence_package WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM evidence_link WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM audit_event WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM obligation_saved_view WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM obligation_exception_application WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM exception_rule WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM practice_rule_review_task WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM practice_rule WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM rule_review_decision WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM pulse_application WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM pulse_priority_review WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM pulse_firm_alert WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM obligation_readiness_template_item_suppression WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM obligation_readiness_checklist_item WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM obligation_review_note WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM obligation_dependency WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM obligation_instance WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM client_filing_profile WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM client WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM migration_error WHERE batch_id IN (SELECT id FROM migration_batch WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%'));
DELETE FROM migration_normalization WHERE batch_id IN (SELECT id FROM migration_batch WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%'));
DELETE FROM migration_mapping WHERE batch_id IN (SELECT id FROM migration_batch WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%'));
DELETE FROM migration_batch WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM reminder_template WHERE firm_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM subscription WHERE reference_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM invitation WHERE organization_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM member WHERE organization_id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');
DELETE FROM organization WHERE id IN (SELECT id FROM firm_profile WHERE owner_user_id LIKE 'mock_user_%');

DELETE FROM client_email_suppression WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM client_readiness_response WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM client_readiness_request WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM calendar_subscription WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM reminder WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM in_app_notification WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM notification_digest_run WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM email_outbox WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM notification_preference WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM opportunity_dismissal WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM dashboard_brief WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM ai_insight_cache WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM llm_log WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM ai_output WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM audit_evidence_package WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM evidence_link WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM audit_event WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM obligation_saved_view WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM obligation_exception_application WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM exception_rule WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM practice_rule_review_task WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM practice_rule WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM rule_review_decision WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM pulse_application WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM pulse_priority_review WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM pulse_firm_alert WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM pulse_source_snapshot WHERE id LIKE 'mock_%';
DELETE FROM pulse
WHERE id LIKE 'mock_%'
  OR id IN (
    '40000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000003',
    '40000000-0000-4000-8000-000000000004',
    '40000000-0000-4000-8000-000000000005',
    '40000000-0000-4000-8000-000000000006',
    '40000000-0000-4000-8000-000000000007'
  );
DELETE FROM obligation_readiness_template_item_suppression WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM obligation_readiness_checklist_item WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM obligation_review_note WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM obligation_dependency WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM obligation_instance WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM client_filing_profile WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM client WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM migration_error
WHERE batch_id LIKE 'mock_migration_%'
  OR batch_id IN (SELECT id FROM migration_batch WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team'));
DELETE FROM migration_normalization
WHERE batch_id LIKE 'mock_migration_%'
  OR batch_id IN (SELECT id FROM migration_batch WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team'));
DELETE FROM migration_mapping
WHERE batch_id LIKE 'mock_migration_%'
  OR batch_id IN (SELECT id FROM migration_batch WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team'));
DELETE FROM migration_batch WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM subscription WHERE reference_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM invitation WHERE organization_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM member WHERE organization_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM session WHERE user_id IN (
  'mock_user_owner_sarah',
  'mock_user_manager_miguel',
  'mock_user_partner_priya',
  'mock_user_preparer_avery',
  'mock_user_coordinator_jules',
  'mock_user_plan_solo',
  'mock_user_plan_pro',
  'mock_user_plan_pro_preparer',
  'mock_user_plan_team',
  'mock_user_plan_team_manager',
  'mock_user_plan_team_preparer',
  'mock_user_plan_team_coordinator'
);
DELETE FROM account WHERE user_id IN (
  'mock_user_owner_sarah',
  'mock_user_manager_miguel',
  'mock_user_partner_priya',
  'mock_user_preparer_avery',
  'mock_user_coordinator_jules',
  'mock_user_plan_solo',
  'mock_user_plan_pro',
  'mock_user_plan_pro_preparer',
  'mock_user_plan_team',
  'mock_user_plan_team_manager',
  'mock_user_plan_team_preparer',
  'mock_user_plan_team_coordinator'
);
DELETE FROM firm_profile WHERE id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM organization WHERE id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');
DELETE FROM user WHERE id IN (
  'mock_user_owner_sarah',
  'mock_user_manager_miguel',
  'mock_user_partner_priya',
  'mock_user_preparer_avery',
  'mock_user_coordinator_jules',
  'mock_user_plan_solo',
  'mock_user_plan_pro',
  'mock_user_plan_pro_preparer',
  'mock_user_plan_team',
  'mock_user_plan_team_manager',
  'mock_user_plan_team_preparer',
  'mock_user_plan_team_coordinator'
);

INSERT INTO user (id, name, email, email_verified, image, created_at, updated_at)
VALUES
  ('mock_user_owner_sarah', 'Sarah Martinez', 'sarah.demo@duedatehq.test', 1, NULL, CAST(unixepoch('2026-05-01 08:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:00:00') * 1000 AS INTEGER)),
  ('mock_user_manager_miguel', 'Miguel Chen', 'miguel.manager@duedatehq.test', 1, NULL, CAST(unixepoch('2026-05-01 08:01:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:01:00') * 1000 AS INTEGER)),
  ('mock_user_partner_priya', 'Priya Shah', 'priya.partner@duedatehq.test', 1, NULL, CAST(unixepoch('2026-05-01 08:01:30') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:01:30') * 1000 AS INTEGER)),
  ('mock_user_preparer_avery', 'Avery Patel', 'avery.preparer@duedatehq.test', 1, NULL, CAST(unixepoch('2026-05-01 08:02:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:02:00') * 1000 AS INTEGER)),
  ('mock_user_coordinator_jules', 'Jules Rivera', 'jules.coordinator@duedatehq.test', 1, NULL, CAST(unixepoch('2026-05-01 08:03:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:03:00') * 1000 AS INTEGER)),
  ('mock_user_plan_solo', 'Sofia Solo', 'sofia.solo@duedatehq.test', 1, NULL, CAST(unixepoch('2026-05-01 08:04:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:04:00') * 1000 AS INTEGER)),
  ('mock_user_plan_pro', 'Priya Pro', 'priya.pro@duedatehq.test', 1, NULL, CAST(unixepoch('2026-05-01 08:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:05:00') * 1000 AS INTEGER)),
  ('mock_user_plan_team', 'Taylor Team', 'taylor.team@duedatehq.test', 1, NULL, CAST(unixepoch('2026-05-01 08:06:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:06:00') * 1000 AS INTEGER));

INSERT INTO organization (id, name, slug, logo, stripe_customer_id, created_at, metadata)
VALUES
  ('mock_firm_brightline', 'Brightline Demo CPA', 'brightline-demo-cpa', NULL, 'cus_mock_brightline', CAST(unixepoch('2026-05-01 08:05:00') * 1000 AS INTEGER), NULL),
  ('mock_firm_solo', 'Archive Solo Practice', 'archive-solo-practice', NULL, NULL, CAST(unixepoch('2026-05-01 08:06:00') * 1000 AS INTEGER), NULL),
  ('mock_firm_plan_solo', 'Solo Plan Demo CPA', 'solo-plan-demo-cpa', NULL, 'cus_mock_plan_solo', CAST(unixepoch('2026-05-01 08:07:00') * 1000 AS INTEGER), NULL),
  ('mock_firm_plan_pro', 'Pro Plan Demo CPA', 'pro-plan-demo-cpa', NULL, 'cus_mock_plan_pro', CAST(unixepoch('2026-05-01 08:08:00') * 1000 AS INTEGER), NULL),
  ('mock_firm_plan_team', 'Team Plan Demo CPA', 'team-plan-demo-cpa', NULL, 'cus_mock_plan_team', CAST(unixepoch('2026-05-01 08:09:00') * 1000 AS INTEGER), NULL);

INSERT INTO member (id, organization_id, user_id, role, created_at, status)
VALUES
  ('mock_member_owner_sarah', 'mock_firm_brightline', 'mock_user_owner_sarah', 'owner', CAST(unixepoch('2026-05-01 08:10:00') * 1000 AS INTEGER), 'active'),
  ('mock_member_manager_miguel', 'mock_firm_brightline', 'mock_user_manager_miguel', 'manager', CAST(unixepoch('2026-05-01 08:11:00') * 1000 AS INTEGER), 'active'),
  ('mock_member_partner_priya', 'mock_firm_brightline', 'mock_user_partner_priya', 'partner', CAST(unixepoch('2026-05-01 08:11:30') * 1000 AS INTEGER), 'active'),
  ('mock_member_preparer_avery', 'mock_firm_brightline', 'mock_user_preparer_avery', 'preparer', CAST(unixepoch('2026-05-01 08:12:00') * 1000 AS INTEGER), 'active'),
  ('mock_member_coordinator_jules', 'mock_firm_brightline', 'mock_user_coordinator_jules', 'coordinator', CAST(unixepoch('2026-05-01 08:13:00') * 1000 AS INTEGER), 'active'),
  ('mock_member_solo_sarah', 'mock_firm_solo', 'mock_user_owner_sarah', 'owner', CAST(unixepoch('2026-05-01 08:14:00') * 1000 AS INTEGER), 'active'),
  ('mock_member_plan_solo', 'mock_firm_plan_solo', 'mock_user_plan_solo', 'owner', CAST(unixepoch('2026-05-01 08:15:00') * 1000 AS INTEGER), 'active'),
  ('mock_member_plan_pro', 'mock_firm_plan_pro', 'mock_user_plan_pro', 'owner', CAST(unixepoch('2026-05-01 08:16:00') * 1000 AS INTEGER), 'active'),
  ('mock_member_plan_team', 'mock_firm_plan_team', 'mock_user_plan_team', 'owner', CAST(unixepoch('2026-05-01 08:17:00') * 1000 AS INTEGER), 'active');

INSERT INTO firm_profile
  (id, name, plan, seat_limit, timezone, owner_user_id, status, billing_customer_id, billing_subscription_id, coordinator_can_see_dollars, created_at, updated_at, deleted_at)
VALUES
  ('mock_firm_brightline', 'Brightline Demo CPA', 'pro', 5, 'America/Los_Angeles', 'mock_user_owner_sarah', 'active', 'cus_mock_brightline', 'sub_mock_brightline_pro', 0, CAST(unixepoch('2026-05-01 08:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:20:00') * 1000 AS INTEGER), NULL),
  ('mock_firm_solo', 'Archive Solo Practice', 'solo', 1, 'America/New_York', 'mock_user_owner_sarah', 'active', NULL, NULL, 0, CAST(unixepoch('2026-05-01 08:06:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:21:00') * 1000 AS INTEGER), NULL),
  ('mock_firm_plan_solo', 'Solo Plan Demo CPA', 'solo', 1, 'America/New_York', 'mock_user_plan_solo', 'active', 'cus_mock_plan_solo', 'sub_mock_plan_solo', 0, CAST(unixepoch('2026-05-01 08:07:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:22:00') * 1000 AS INTEGER), NULL),
  ('mock_firm_plan_pro', 'Pro Plan Demo CPA', 'pro', 3, 'America/Chicago', 'mock_user_plan_pro', 'active', 'cus_mock_plan_pro', 'sub_mock_plan_pro', 0, CAST(unixepoch('2026-05-01 08:08:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:23:00') * 1000 AS INTEGER), NULL),
  ('mock_firm_plan_team', 'Team Plan Demo CPA', 'team', 10, 'America/Los_Angeles', 'mock_user_plan_team', 'active', 'cus_mock_plan_team', 'sub_mock_plan_team', 1, CAST(unixepoch('2026-05-01 08:09:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:24:00') * 1000 AS INTEGER), NULL);

INSERT INTO invitation (id, organization_id, email, role, status, expires_at, created_at, inviter_id)
VALUES
  ('mock_invitation_pending_team_lead', 'mock_firm_brightline', 'team.lead@duedatehq.test', 'manager', 'pending', CAST(unixepoch('2026-05-08 12:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:05:00') * 1000 AS INTEGER), 'mock_user_owner_sarah'),
  ('mock_invitation_pending_bookkeeper', 'mock_firm_brightline', 'bookkeeper@duedatehq.test', 'coordinator', 'pending', CAST(unixepoch('2026-05-08 12:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:10:00') * 1000 AS INTEGER), 'mock_user_owner_sarah');

INSERT INTO subscription
  (id, plan, reference_id, stripe_customer_id, stripe_subscription_id, status, period_start, period_end, trial_start, trial_end, cancel_at_period_end, cancel_at, canceled_at, ended_at, seats, billing_interval, stripe_schedule_id, created_at, updated_at)
VALUES
  ('mock_subscription_brightline_pro', 'pro', 'mock_firm_brightline', 'cus_mock_brightline', 'sub_mock_brightline_pro', 'active', CAST(unixepoch('2026-05-01 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-06-01 00:00:00') * 1000 AS INTEGER), NULL, NULL, 0, NULL, NULL, NULL, 5, 'month', NULL, CAST(unixepoch('2026-05-01 08:30:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:30:00') * 1000 AS INTEGER)),
  ('mock_subscription_plan_solo', 'solo', 'mock_firm_plan_solo', 'cus_mock_plan_solo', 'sub_mock_plan_solo', 'active', CAST(unixepoch('2026-05-01 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-06-01 00:00:00') * 1000 AS INTEGER), NULL, NULL, 0, NULL, NULL, NULL, 1, 'month', NULL, CAST(unixepoch('2026-05-01 08:31:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:31:00') * 1000 AS INTEGER)),
  ('mock_subscription_plan_pro', 'pro', 'mock_firm_plan_pro', 'cus_mock_plan_pro', 'sub_mock_plan_pro', 'active', CAST(unixepoch('2026-05-01 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-06-01 00:00:00') * 1000 AS INTEGER), NULL, NULL, 0, NULL, NULL, NULL, 3, 'month', NULL, CAST(unixepoch('2026-05-01 08:32:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:32:00') * 1000 AS INTEGER)),
  ('mock_subscription_plan_team', 'team', 'mock_firm_plan_team', 'cus_mock_plan_team', 'sub_mock_plan_team', 'active', CAST(unixepoch('2026-05-01 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-06-01 00:00:00') * 1000 AS INTEGER), NULL, NULL, 0, NULL, NULL, NULL, 10, 'month', NULL, CAST(unixepoch('2026-05-01 08:33:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:33:00') * 1000 AS INTEGER));

INSERT INTO rule_review_decision
  (id, firm_id, rule_id, base_version, status, rule_json, review_note, reviewed_by, reviewed_at, created_at, updated_at)
VALUES
  ('69000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'fed.1120s.return.2026', 1, 'verified', '{"id":"fed.1120s.return.2026","title":"Federal Form 1120-S return for S corporations","jurisdiction":"FED","entityApplicability":["s_corp"],"taxType":"federal_1120s","formName":"Form 1120-S","eventType":"filing","isFiling":true,"isPayment":false,"taxYear":2026,"applicableYear":2027,"ruleTier":"basic","status":"verified","coverageStatus":"full","riskLevel":"med","requiresApplicabilityReview":false,"dueDateLogic":{"kind":"nth_day_after_tax_year_end","monthOffset":3,"day":15,"holidayRollover":"next_business_day"},"extensionPolicy":{"available":true,"formName":"Form 7004","durationMonths":6,"paymentExtended":false,"notes":"Extension applies to filing; any tax due should be paid by the original return due date."},"sourceIds":["fed.irs_pub_509_2026","fed.irs_i1120s_2025","fed.irs_i7004_2025"],"evidence":[{"sourceId":"fed.irs_i1120s_2025","authorityRole":"basis","locator":{"kind":"html","heading":"When To File"},"summary":"Form 1120-S instructions provide the form-specific S corporation filing deadline.","sourceExcerpt":"Due on the 15th day of the 3rd month after tax year end.","retrievedAt":"2026-05-04"}],"defaultTip":"Demo rollover rule for tax year 2026 S corporation returns due in filing year 2027.","quality":{"filingPaymentDistinguished":true,"extensionHandled":true,"calendarFiscalSpecified":true,"holidayRolloverHandled":true,"crossVerified":true,"exceptionChannel":true},"verifiedBy":"practice.template_seed","verifiedAt":"2026-05-04","nextReviewOn":"2026-12-01","version":1}', 'Demo seed for Annual rollover 2026 to 2027 preview.', 'mock_user_manager_miguel', CAST(unixepoch('2026-05-04 10:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 10:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 10:00:00') * 1000 AS INTEGER)),
  ('69000000-0000-4000-8000-000000000002', 'mock_firm_brightline', 'fed.1065.return.2026', 1, 'verified', '{"id":"fed.1065.return.2026","title":"Federal Form 1065 return for partnerships","jurisdiction":"FED","entityApplicability":["partnership","llc"],"taxType":"federal_1065","formName":"Form 1065","eventType":"filing","isFiling":true,"isPayment":false,"taxYear":2026,"applicableYear":2027,"ruleTier":"applicability_review","status":"verified","coverageStatus":"manual","riskLevel":"med","requiresApplicabilityReview":true,"dueDateLogic":{"kind":"nth_day_after_tax_year_end","monthOffset":3,"day":15,"holidayRollover":"next_business_day"},"extensionPolicy":{"available":true,"formName":"Form 7004","durationMonths":6,"paymentExtended":false,"notes":"Form 7004 extends filing time only; payment obligations must be reviewed separately."},"sourceIds":["fed.irs_pub_509_2026","fed.irs_i1065_2025","fed.irs_i7004_2025"],"evidence":[{"sourceId":"fed.irs_i1065_2025","authorityRole":"basis","locator":{"kind":"html","heading":"When To File"},"summary":"Form 1065 instructions provide the form-specific partnership filing deadline.","sourceExcerpt":"Due on the 15th day of the 3rd month after tax year end.","retrievedAt":"2026-05-04"}],"defaultTip":"Demo rollover rule for tax year 2026 partnership returns due in filing year 2027.","quality":{"filingPaymentDistinguished":true,"extensionHandled":true,"calendarFiscalSpecified":true,"holidayRolloverHandled":true,"crossVerified":true,"exceptionChannel":true},"verifiedBy":"practice.template_seed","verifiedAt":"2026-05-04","nextReviewOn":"2026-12-01","version":1}', 'Demo seed for Annual rollover review-state generation.', 'mock_user_manager_miguel', CAST(unixepoch('2026-05-04 10:01:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 10:01:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 10:01:00') * 1000 AS INTEGER)),
  ('69000000-0000-4000-8000-000000000003', 'mock_firm_brightline', 'fed.1041.return.2026', 1, 'verified', '{"id":"fed.1041.return.2026","title":"Federal Form 1041 return for trusts and estates","jurisdiction":"FED","entityApplicability":["trust"],"taxType":"federal_1041","formName":"Form 1041","eventType":"filing","isFiling":true,"isPayment":false,"taxYear":2026,"applicableYear":2027,"ruleTier":"basic","status":"verified","coverageStatus":"full","riskLevel":"med","requiresApplicabilityReview":false,"dueDateLogic":{"kind":"nth_day_after_tax_year_end","monthOffset":4,"day":15,"holidayRollover":"next_business_day"},"extensionPolicy":{"available":true,"formName":"Form 7004","durationMonths":5,"paymentExtended":false,"notes":"Extension applies to filing time only; payment timing should be reviewed separately."},"sourceIds":["fed.irs_pub_509_2026","fed.irs_i7004_2025"],"evidence":[{"sourceId":"fed.irs_pub_509_2026","authorityRole":"basis","locator":{"kind":"html","heading":"Estates and trusts"},"summary":"Publication 509 provides federal filing calendar context for trust and estate returns.","sourceExcerpt":"Trust and estate returns use the 15th day of the 4th month after tax year end.","retrievedAt":"2026-05-04"}],"defaultTip":"Demo rollover rule for tax year 2026 trust returns due in filing year 2027.","quality":{"filingPaymentDistinguished":true,"extensionHandled":true,"calendarFiscalSpecified":true,"holidayRolloverHandled":true,"crossVerified":true,"exceptionChannel":true},"verifiedBy":"practice.template_seed","verifiedAt":"2026-05-04","nextReviewOn":"2026-12-01","version":1}', 'Demo seed for Annual rollover trust coverage.', 'mock_user_manager_miguel', CAST(unixepoch('2026-05-04 10:02:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 10:02:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 10:02:00') * 1000 AS INTEGER));

INSERT INTO practice_rule
  (id, firm_id, rule_id, template_id, template_version, status, rule_json, review_note, reviewed_by, reviewed_at, created_at, updated_at)
SELECT
  CASE rule_id
    WHEN 'fed.1120s.return.2026' THEN '69010000-0000-4000-8000-000000000001'
    WHEN 'fed.1065.return.2026' THEN '69010000-0000-4000-8000-000000000002'
    WHEN 'fed.1041.return.2026' THEN '69010000-0000-4000-8000-000000000003'
    ELSE lower(hex(randomblob(16)))
  END,
  firm_id,
  rule_id,
  NULL,
  base_version,
  CASE status WHEN 'verified' THEN 'active' ELSE 'rejected' END,
  CASE status WHEN 'verified' THEN rule_json ELSE NULL END,
  review_note,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
FROM rule_review_decision
WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');

INSERT INTO practice_rule_review_task
  (id, firm_id, rule_id, template_version, status, reason, review_note, reviewed_by, reviewed_at, created_at, updated_at)
SELECT
  CASE rule_id
    WHEN 'fed.1120s.return.2026' THEN '69020000-0000-4000-8000-000000000001'
    WHEN 'fed.1065.return.2026' THEN '69020000-0000-4000-8000-000000000002'
    WHEN 'fed.1041.return.2026' THEN '69020000-0000-4000-8000-000000000003'
    ELSE lower(hex(randomblob(16)))
  END,
  firm_id,
  rule_id,
  base_version,
  CASE status WHEN 'verified' THEN 'accepted' ELSE 'rejected' END,
  'new_template',
  review_note,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
FROM rule_review_decision
WHERE firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');

INSERT INTO migration_batch
  (id, firm_id, user_id, source, raw_input_r2_key, raw_input_file_name, raw_input_content_type, raw_input_size_bytes, mapping_json, preset_used, row_count, success_count, skipped_count, ai_global_confidence, status, applied_at, revert_expires_at, reverted_at, created_at, updated_at)
VALUES
  ('30000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'mock_user_preparer_avery', 'preset_karbon', 'firm/mock_firm_brightline/migration/30000000-0000-4000-8000-000000000001/karbon-may-import.csv', 'karbon-may-import.csv', 'text/csv', 1884, '{"rawInput":{"kind":"csv","headers":["Client","EIN","State","Entity","Assignee","Tax types"],"rowCount":4,"truncated":false},"mapperFallback":"preset"}', 'karbon', 4, 3, 1, 0.97, 'applied', CAST(unixepoch('2026-05-01 09:20:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 09:20:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-01 09:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:20:00') * 1000 AS INTEGER)),
  ('30000000-0000-4000-8000-000000000002', 'mock_firm_brightline', 'mock_user_manager_miguel', 'preset_taxdome', 'firm/mock_firm_brightline/migration/30000000-0000-4000-8000-000000000002/taxdome-test.csv', 'taxdome-test.csv', 'text/csv', 744, '{"rawInput":{"kind":"csv","headers":["Name","Type","Jurisdiction"],"rowCount":2,"truncated":false},"revertReason":"demo cleanup"}', 'taxdome', 2, 2, 0, 0.94, 'reverted', CAST(unixepoch('2026-04-30 15:30:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 15:30:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 10:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-04-30 15:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 10:00:00') * 1000 AS INTEGER));

INSERT INTO migration_mapping
  (id, batch_id, source_header, target_field, confidence, reasoning, user_overridden, model, prompt_version, created_at)
VALUES
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Client', 'client.name', 0.99, 'Column contains business names.', 0, 'openai/gpt-5-mini', 'mapper@v1', CAST(unixepoch('2026-05-01 09:05:00') * 1000 AS INTEGER)),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'State', 'client.state', 0.98, 'Two-letter jurisdiction values.', 0, 'openai/gpt-5-mini', 'mapper@v1', CAST(unixepoch('2026-05-01 09:05:00') * 1000 AS INTEGER)),
  ('31000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'Entity', 'client.entity_type', 0.96, 'Entity labels map to DueDateHQ taxonomy.', 0, 'openai/gpt-5-mini', 'mapper@v1', CAST(unixepoch('2026-05-01 09:05:00') * 1000 AS INTEGER)),
  ('31000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'Tax types', 'client.tax_types', 0.95, 'Mixed federal and state obligation hints.', 1, 'openai/gpt-5-mini', 'mapper@v1', CAST(unixepoch('2026-05-01 09:06:00') * 1000 AS INTEGER));

INSERT INTO migration_normalization
  (id, batch_id, field, raw_value, normalized_value, confidence, model, prompt_version, reasoning, user_overridden, created_at)
VALUES
  ('32000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'entity_type', 'S Corporation', 's_corp', 0.98, 'openai/gpt-5-mini', 'normalizer-entity@v1', 'Common S corporation synonym.', 0, CAST(unixepoch('2026-05-01 09:08:00') * 1000 AS INTEGER)),
  ('32000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'state', 'Texas', 'TX', 0.99, 'openai/gpt-5-mini', 'normalizer-tax-types@v1', 'State name normalized to postal code.', 0, CAST(unixepoch('2026-05-01 09:08:00') * 1000 AS INTEGER)),
  ('32000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'tax_types', '1065, NY CT-3-S', '["federal_1065","ny_ct3s"]', 0.93, 'openai/gpt-5-mini', 'normalizer-tax-types@v1', 'Tax type dictionary match.', 1, CAST(unixepoch('2026-05-01 09:09:00') * 1000 AS INTEGER));

INSERT INTO migration_error
  (id, batch_id, row_index, raw_row_json, error_code, error_message, created_at)
VALUES
  ('33000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 4, '{"Client":"Draft Riverbend","State":"","Entity":"LLC"}', 'STATE_REQUIRED', 'State is required before default matrix can generate state obligations.', CAST(unixepoch('2026-05-01 09:12:00') * 1000 AS INTEGER));

INSERT INTO client
  (id, firm_id, name, ein, state, county, entity_type, email, notes, assignee_id, assignee_name, importance_weight, late_filing_count_last_12mo, estimated_tax_liability_cents, estimated_tax_liability_source, equity_owner_count, migration_batch_id, created_at, updated_at, deleted_at)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'Arbor & Vale LLC', '12-3456789', 'CA', 'Los Angeles', 'llc', 'finance@arborvale.test', 'High-touch partnership client for Pulse relief demo.', 'mock_user_manager_miguel', 'Miguel Chen', 3, 2, 7800000, 'demo_seed', 3, NULL, CAST(unixepoch('2026-05-01 08:40:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:35:00') * 1000 AS INTEGER), NULL),
  ('10000000-0000-4000-8000-000000000002', 'mock_firm_brightline', 'Bright Studio S-Corp', '21-2222222', 'CA', NULL, 's_corp', 'office@brightstudio.test', 'Missing county intentionally exercises Pulse needs-review flow.', 'mock_user_preparer_avery', 'Avery Patel', 2, 1, 9400000, 'demo_seed', 2, NULL, CAST(unixepoch('2026-05-01 08:41:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:36:00') * 1000 AS INTEGER), NULL),
  ('10000000-0000-4000-8000-000000000003', 'mock_firm_brightline', 'Northstar Dental Group', '98-7654321', 'NY', 'Queens', 's_corp', 'controller@northstardental.test', 'Imported from Karbon.', 'mock_user_preparer_avery', 'Avery Patel', 2, 0, 5500000, 'imported', 4, '30000000-0000-4000-8000-000000000001', CAST(unixepoch('2026-05-01 09:20:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:37:00') * 1000 AS INTEGER), NULL),
  ('10000000-0000-4000-8000-000000000004', 'mock_firm_brightline', 'Copperline Studios Inc.', '45-1111111', 'TX', 'Travis', 'c_corp', 'tax@copperline.test', 'Waiting on client packet.', 'mock_user_preparer_avery', 'Avery Patel', 3, 1, 12600000, 'imported', 8, '30000000-0000-4000-8000-000000000001', CAST(unixepoch('2026-05-01 09:21:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:38:00') * 1000 AS INTEGER), NULL),
  ('10000000-0000-4000-8000-000000000005', 'mock_firm_brightline', 'Cascade Florist', '33-4444444', 'WA', 'King', 'sole_prop', NULL, 'Unassigned owner and missing email exercise workload and client facts.', NULL, NULL, 1, 0, NULL, NULL, NULL, NULL, CAST(unixepoch('2026-05-01 08:44:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:39:00') * 1000 AS INTEGER), NULL),
  ('10000000-0000-4000-8000-000000000006', 'mock_firm_brightline', 'Magnolia Family Trust', '77-5555555', 'FL', 'Miami-Dade', 'trust', 'trustee@magnolia.test', 'Trust and Florida state coverage sample.', 'mock_user_manager_miguel', 'Miguel Chen', 2, 0, 2500000, 'demo_seed', 5, NULL, CAST(unixepoch('2026-05-01 08:45:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER), NULL),
  ('10000000-0000-4000-8000-000000000007', 'mock_firm_brightline', 'Lakeview Medical Partners', '66-8888888', 'MA', 'Suffolk', 'partnership', 'admin@lakeviewmedical.test', 'Large exposure partner return.', 'mock_user_partner_priya', 'Priya Shah', 3, 3, 18500000, 'imported', 11, '30000000-0000-4000-8000-000000000001', CAST(unixepoch('2026-05-01 09:22:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:41:00') * 1000 AS INTEGER), NULL),
  ('10000000-0000-4000-8000-000000000008', 'mock_firm_brightline', 'Orbit Design LLC', '51-7777777', 'CA', 'San Diego', 'llc', 'founder@orbitdesign.test', 'CA FTB overlay already applied.', 'mock_user_partner_priya', 'Priya Shah', 2, 0, 4100000, 'demo_seed', 2, NULL, CAST(unixepoch('2026-05-01 08:48:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:42:00') * 1000 AS INTEGER), NULL),
  ('10000000-0000-4000-8000-000000000009', 'mock_firm_brightline', 'Riverbend Draft Client', NULL, NULL, NULL, 'llc', NULL, 'Incomplete record from skipped import row.', NULL, NULL, 1, 0, NULL, NULL, NULL, '30000000-0000-4000-8000-000000000001', CAST(unixepoch('2026-05-01 09:23:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:43:00') * 1000 AS INTEGER), NULL);

INSERT INTO client_filing_profile
  (id, firm_id, client_id, state, counties_json, tax_types_json, is_primary, source, migration_batch_id, archived_at, created_at, updated_at)
VALUES
  ('15000000-0000-4000-8000-000000000001', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000001', 'CA', '["Los Angeles"]', '["federal_1065","ca_568"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-01 08:40:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:35:00') * 1000 AS INTEGER)),
  ('15000000-0000-4000-8000-000000000002', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000002', 'CA', '[]', '["federal_1120s"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-01 08:41:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:36:00') * 1000 AS INTEGER)),
  ('15000000-0000-4000-8000-000000000003', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000003', 'NY', '["Queens"]', '["federal_1120s","federal_941","ny_ct3s","ny_sales_st100"]', 1, 'imported', '30000000-0000-4000-8000-000000000001', NULL, CAST(unixepoch('2026-05-01 09:20:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:37:00') * 1000 AS INTEGER)),
  ('15000000-0000-4000-8000-000000000004', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000004', 'TX', '["Travis"]', '["tx_franchise_report"]', 1, 'imported', '30000000-0000-4000-8000-000000000001', NULL, CAST(unixepoch('2026-05-01 09:21:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:38:00') * 1000 AS INTEGER)),
  ('15000000-0000-4000-8000-000000000005', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000005', 'WA', '["King"]', '["federal_1040"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-01 08:44:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:39:00') * 1000 AS INTEGER)),
  ('15000000-0000-4000-8000-000000000006', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000006', 'FL', '["Miami-Dade"]', '["federal_1041","fl_corp_income"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-01 08:45:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER)),
  ('15000000-0000-4000-8000-000000000007', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000007', 'MA', '["Suffolk"]', '["federal_1065"]', 1, 'imported', '30000000-0000-4000-8000-000000000001', NULL, CAST(unixepoch('2026-05-01 09:22:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:41:00') * 1000 AS INTEGER)),
  ('15000000-0000-4000-8000-000000000008', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000008', 'CA', '["San Diego"]', '["ca_llc_franchise_min_800"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-01 08:48:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:42:00') * 1000 AS INTEGER));

INSERT INTO obligation_instance
  (id, firm_id, client_id, tax_type, tax_year, base_due_date, current_due_date, status, migration_batch_id, estimated_tax_due_cents, estimated_exposure_cents, exposure_status, penalty_breakdown_json, penalty_formula_version, exposure_calculated_at, created_at, updated_at)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000001', 'federal_1065', 2026, CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), 'pending', NULL, 7800000, 240000, 'ready', '[{"key":"late_filing","label":"Late filing exposure","amountCents":240000,"formula":"$245 x 3 partners x 3 months"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:52:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000002', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000001', 'ca_568', 2026, CAST(unixepoch('2026-05-02 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 00:00:00') * 1000 AS INTEGER), 'in_progress', NULL, 7800000, 90000, 'ready', '[{"key":"ftb_late_payment","label":"CA late payment exposure","amountCents":90000,"formula":"Estimated balance x demo rate"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:53:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000003', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000002', 'federal_1120s', 2026, CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), 'review', NULL, 9400000, 310000, 'ready', '[{"key":"late_filing","label":"S corp shareholder penalty","amountCents":310000,"formula":"Shareholder count x monthly penalty"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:54:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000004', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000003', 'ny_ct3s', 2026, CAST(unixepoch('2026-05-04 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 00:00:00') * 1000 AS INTEGER), 'review', '30000000-0000-4000-8000-000000000001', 5500000, 120000, 'ready', '[{"key":"ny_review","label":"NY review exposure","amountCents":120000,"formula":"Demo estimate from imported liability"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:24:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000005', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000004', 'tx_franchise_report', 2026, CAST(unixepoch('2026-05-05 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-05 00:00:00') * 1000 AS INTEGER), 'waiting_on_client', '30000000-0000-4000-8000-000000000001', 12600000, 185000, 'ready', '[{"key":"tx_franchise","label":"TX franchise report exposure","amountCents":185000,"formula":"Demo state estimate"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:25:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000006', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000005', 'federal_1040', 2026, CAST(unixepoch('2026-04-29 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-04-29 00:00:00') * 1000 AS INTEGER), 'pending', NULL, NULL, NULL, 'needs_input', '[]', NULL, NULL, CAST(unixepoch('2026-05-01 08:56:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:56:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000007', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000006', 'federal_1041', 2026, CAST(unixepoch('2026-05-08 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-08 00:00:00') * 1000 AS INTEGER), 'done', NULL, 2500000, 0, 'ready', '[{"key":"closed","label":"Completed before exposure accrued","amountCents":0,"formula":"Marked done"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:57:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000008', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000006', 'fl_corp_income', 2026, CAST(unixepoch('2026-05-08 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-08 00:00:00') * 1000 AS INTEGER), 'pending', NULL, 2500000, NULL, 'unsupported', '[]', NULL, NULL, CAST(unixepoch('2026-05-01 08:58:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:58:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000009', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000007', 'federal_1065', 2026, CAST(unixepoch('2026-05-01 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 00:00:00') * 1000 AS INTEGER), 'pending', '30000000-0000-4000-8000-000000000001', 18500000, 430000, 'ready', '[{"key":"late_filing","label":"Large partnership late filing exposure","amountCents":430000,"formula":"$245 x 11 partners x 2 months"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:26:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000010', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000008', 'ca_llc_franchise_min_800', 2026, CAST(unixepoch('2026-04-30 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-04-30 00:00:00') * 1000 AS INTEGER), 'in_progress', NULL, 4100000, 75000, 'ready', '[{"key":"ca_llc","label":"CA LLC minimum tax exposure","amountCents":75000,"formula":"Demo overlay adjusted due date"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:59:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000011', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000009', 'federal_1040', 2026, CAST(unixepoch('2026-05-06 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-06 00:00:00') * 1000 AS INTEGER), 'pending', '30000000-0000-4000-8000-000000000001', NULL, NULL, 'needs_input', '[]', NULL, NULL, CAST(unixepoch('2026-05-01 09:27:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:27:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000013', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000002', 'federal_1120s', 2026, CAST(unixepoch('2026-03-16 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-03-16 00:00:00') * 1000 AS INTEGER), 'done', NULL, 9400000, 0, 'ready', '[{"key":"closed","label":"Annual rollover seed","amountCents":0,"formula":"Closed 2026 source-year S corporation return"}]', 'penalty-v1', CAST(unixepoch('2026-05-04 10:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 10:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 10:05:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000014', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000007', 'federal_1065', 2026, CAST(unixepoch('2026-03-16 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-03-16 00:00:00') * 1000 AS INTEGER), 'paid', '30000000-0000-4000-8000-000000000001', 18500000, 0, 'ready', '[{"key":"closed","label":"Annual rollover seed","amountCents":0,"formula":"Closed 2026 source-year partnership return"}]', 'penalty-v1', CAST(unixepoch('2026-05-04 10:06:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 10:06:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 10:06:00') * 1000 AS INTEGER)),
  -- Northstar Dental Group (client 0003) extended to 5 obligations
  -- so the queue can demo same-client grouping. Existing row 0004 is
  -- the NY CT-3S — these add federal income, prior-year federal, Q1
  -- payroll, and Q1 sales tax.
  ('20000000-0000-4000-8000-000000000020', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000003', 'federal_1120s', 2026, CAST(unixepoch('2026-05-11 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-11 00:00:00') * 1000 AS INTEGER), 'in_progress', NULL, 9400000, 260000, 'ready', '[{"key":"late_filing","label":"S corp shareholder penalty","amountCents":260000,"formula":"Shareholder count x monthly penalty"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000021', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000003', 'federal_1120s', 2026, CAST(unixepoch('2026-03-16 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-03-16 00:00:00') * 1000 AS INTEGER), 'done', NULL, 8800000, 0, 'ready', '[{"key":"closed","label":"Prior-year S corp closed","amountCents":0,"formula":"Filed on time"}]', 'penalty-v1', CAST(unixepoch('2026-05-04 10:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 10:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 10:05:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000022', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000003', 'federal_941', 2026, CAST(unixepoch('2026-04-30 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-04-30 00:00:00') * 1000 AS INTEGER), 'waiting_on_client', NULL, 4100000, 41000, 'ready', '[{"key":"941_late_dep","label":"Late deposit exposure","amountCents":41000,"formula":"1% per month on Q1 deposit"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:01:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER)),
  ('20000000-0000-4000-8000-000000000023', 'mock_firm_brightline', '10000000-0000-4000-8000-000000000003', 'ny_sales_st100', 2026, CAST(unixepoch('2026-05-22 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-22 00:00:00') * 1000 AS INTEGER), 'pending', NULL, 1300000, 26000, 'ready', '[{"key":"ny_sales","label":"NY sales tax exposure","amountCents":26000,"formula":"2% per month on net taxable"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:02:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER));

-- Backfill obligation_instance.jurisdiction from tax_type so the
-- Obligations queue State column reads something other than '—'.
-- Federal forms (1040 / 1041 / 1065 / 1120(s) / 941) get 'FED';
-- state-specific tax_types take their two-letter prefix.
UPDATE obligation_instance
SET jurisdiction = CASE
  WHEN substr(tax_type, 1, 8) = 'federal_' THEN 'FED'
  WHEN substr(tax_type, 1, 3) = 'ca_' THEN 'CA'
  WHEN substr(tax_type, 1, 3) = 'ny_' THEN 'NY'
  WHEN substr(tax_type, 1, 3) = 'tx_' THEN 'TX'
  WHEN substr(tax_type, 1, 3) = 'fl_' THEN 'FL'
  WHEN substr(tax_type, 1, 3) = 'co_' THEN 'CO'
  WHEN substr(tax_type, 1, 3) = 'wa_' THEN 'WA'
  WHEN substr(tax_type, 1, 3) = 'ma_' THEN 'MA'
  ELSE jurisdiction
END
WHERE jurisdiction IS NULL
  AND firm_id IN ('mock_firm_brightline', 'mock_firm_solo', 'mock_firm_plan_solo', 'mock_firm_plan_pro', 'mock_firm_plan_team');

-- Seed sub-status fields so the milestone timeline can render the
-- "ACTIVE / Awaiting acceptance" style annotation on demo rows. Each
-- update is keyed to an obligation_instance id we set up earlier:
--   review_stage   → drives the "In review" sub-status (PRD §6.4)
--   prep_stage     → drives the "Waiting" sub-status
--   efile_state    → drives the "Filed" sub-status (accepted / awaiting / rejected)

-- Lakeview Medical Partners federal_1065 (status=pending): mark as
-- ready_for_review so the queue has at least one row with that signal
-- even though status has not flipped yet.
UPDATE obligation_instance
SET review_stage = 'ready_for_review'
WHERE id = '20000000-0000-4000-8000-000000000009';

-- Northstar Dental Group federal_1120s in_progress: review notes open.
UPDATE obligation_instance
SET review_stage = 'notes_open'
WHERE id = '20000000-0000-4000-8000-000000000020';

-- Bright Studio S-Corp federal_1120s (review): in active review.
UPDATE obligation_instance
SET review_stage = 'in_review'
WHERE id = '20000000-0000-4000-8000-000000000003';

-- Magnolia Family Trust federal_1041 (status=done): demo "Accepted by
-- authority" annotation on Filed stage.
UPDATE obligation_instance
SET efile_state = 'accepted',
    efile_accepted_at = CAST(unixepoch('2026-05-12 14:20:00') * 1000 AS INTEGER)
WHERE id = '20000000-0000-4000-8000-000000000007';

-- Bright Studio S-Corp federal_1120s (annual rollover, status=done):
-- demo "Awaiting acceptance" annotation (efile submitted, no ack yet).
UPDATE obligation_instance
SET efile_state = 'submitted',
    efile_submitted_at = CAST(unixepoch('2026-03-15 10:00:00') * 1000 AS INTEGER)
WHERE id = '20000000-0000-4000-8000-000000000013';

-- Copperline Studios TX franchise (status=waiting_on_client): demo
-- "Documents from client" annotation (the default prep_stage).
UPDATE obligation_instance
SET prep_stage = 'waiting_on_client'
WHERE id = '20000000-0000-4000-8000-000000000005';

-- =========================================================================
-- DEMO STATUS SPREAD (2026-05-23)
--
-- Forces each of the 9 brightline demo clients to surface a DIFFERENT
-- obligation status on the /clients list, so the design surfaces (stage
-- card, pipeline strips, sub-status text, status chips) can be evaluated
-- against every state from a single seed.
--
-- The /clients list shows the EARLIEST non-terminal obligation's status as
-- the row's signal. For each client we flip the earliest-non-terminal row
-- to the target status + set the matching sub-status fields so the stage
-- card has something to render. Terminal-status showcases (completed,
-- paid) need every other obligation closed out too, otherwise the
-- earlier non-terminal one steals the row signal.
-- =========================================================================

-- Client 0001 — Arbor & Vale LLC → pending (Not started)
-- The CA 568 (oblig 0002) is the earliest non-terminal. Flip it to
-- pending so the row reads "Not started" cleanly. The federal 1065
-- (oblig 0001) is already pending, so the whole client now sits in
-- the Not started bucket.
UPDATE obligation_instance
SET status = 'pending',
    prep_stage = 'not_started',
    review_stage = 'not_required',
    efile_state = 'not_applicable',
    payment_state = 'not_applicable'
WHERE id = '20000000-0000-4000-8000-000000000002';

-- Client 0002 — Bright Studio S-Corp → waiting_on_client
-- Federal 1120S (oblig 0003) is the earliest non-terminal. Flip from
-- review → waiting_on_client + prep_stage so the sub-status reads
-- "Waiting on client to send docs."
UPDATE obligation_instance
SET status = 'waiting_on_client',
    prep_stage = 'waiting_on_client',
    review_stage = 'not_required',
    efile_state = 'not_applicable',
    payment_state = 'not_applicable'
WHERE id = '20000000-0000-4000-8000-000000000003';

-- Client 0003 — Northstar Dental Group → blocked
-- This client has 5 obligations. The Q1 941 (oblig 0022, due
-- 2026-04-30) is already the earliest non-terminal row, so we just
-- flip it to blocked + point at the upstream Lakeview partnership
-- return (oblig 0009) so the inline BlockerContextCard has a real
-- K-1 dependency story to render.
UPDATE obligation_instance
SET status = 'blocked',
    blocked_by_obligation_instance_id = '20000000-0000-4000-8000-000000000009',
    prep_stage = 'not_started',
    review_stage = 'not_required',
    efile_state = 'not_applicable',
    payment_state = 'not_applicable'
WHERE id = '20000000-0000-4000-8000-000000000022';

-- Client 0004 — Copperline Studios Inc. → review
-- Only one obligation (TX franchise, 0005). Flip to review with
-- reviewStage='in_review' so the In Review pipeline strip lights up
-- mid-flow ("Reviewer checking the return").
UPDATE obligation_instance
SET status = 'review',
    prep_stage = 'prepared',
    review_stage = 'in_review',
    efile_state = 'not_applicable',
    payment_state = 'not_applicable'
WHERE id = '20000000-0000-4000-8000-000000000005';

-- Client 0005 — Cascade Florist → in_progress (drafting)
-- Federal 1040 (oblig 0006) flipped from pending to in_progress with
-- prep_stage='in_prep' so the In Review pipeline shows "Preparer
-- drafting the return" as the current step.
UPDATE obligation_instance
SET status = 'in_progress',
    prep_stage = 'in_prep',
    review_stage = 'not_required',
    efile_state = 'not_applicable',
    payment_state = 'not_applicable'
WHERE id = '20000000-0000-4000-8000-000000000006';

-- Client 0006 — Magnolia Family Trust → done (Filed, awaiting acceptance)
-- Trust currently has 2 obligations: 0007 (already done/accepted) and
-- 0008 (pending FL corp income). Flip 0008 to done + efile submitted
-- (awaiting acceptance) so the next-due signal reads as a fresh Filed
-- row with the e-file pipeline visible.
UPDATE obligation_instance
SET status = 'done',
    efile_state = 'submitted',
    efile_submitted_at = CAST(unixepoch('2026-05-20 14:00:00') * 1000 AS INTEGER),
    efile_accepted_at = NULL,
    prep_stage = 'not_started',
    review_stage = 'not_required',
    payment_state = 'not_applicable'
WHERE id = '20000000-0000-4000-8000-000000000008';

-- Client 0007 — Lakeview Medical Partners → extended
-- Federal 1065 (oblig 0009) flipped to extended with the new internal
-- due date 6 months out. Sets extension_filed_at so the extension
-- timeline + sub-status both render meaningfully.
--
-- 2026-05-24 (critique P0): also set extension_state='filed' so the
-- client-detail "All on track" pill doesn't read this as a statutory
-- late row. The schema default is 'not_started'; without an explicit
-- update, extension_filed_at and extension_state told two different
-- stories about the same row.
UPDATE obligation_instance
SET status = 'extended',
    extension_filed_at = CAST(unixepoch('2026-04-25 11:00:00') * 1000 AS INTEGER),
    extension_state = 'filed',
    current_due_date = CAST(unixepoch('2026-11-15 00:00:00') * 1000 AS INTEGER),
    prep_stage = 'not_started',
    review_stage = 'not_required',
    efile_state = 'not_applicable',
    payment_state = 'not_applicable'
WHERE id = '20000000-0000-4000-8000-000000000009';

-- Client 0008 — Orbit Design LLC → paid (payment confirmed)
-- CA LLC minimum tax (oblig 0010) flipped to paid + payment_state
-- 'confirmed' so the payment pipeline strip ends at "Authority
-- confirmed payment cleared" and the canonical "Close out this
-- payment" button is the wired primary.
UPDATE obligation_instance
SET status = 'paid',
    payment_state = 'confirmed',
    prep_stage = 'not_started',
    review_stage = 'not_required',
    efile_state = 'not_applicable'
WHERE id = '20000000-0000-4000-8000-000000000010';

-- Client 0009 — Riverbend Draft Client → completed
-- Single obligation (federal 1040, oblig 0011). Flip to completed with
-- e-file fully delivered so the Completed stage's key-dates summary
-- (Opened / Filed / Completed / Cycle time) has full audit-derived
-- data to render. Filed two weeks ago, completed today.
UPDATE obligation_instance
SET status = 'completed',
    efile_state = 'final_package_delivered',
    efile_submitted_at = CAST(unixepoch('2026-05-09 09:30:00') * 1000 AS INTEGER),
    efile_accepted_at = CAST(unixepoch('2026-05-12 10:15:00') * 1000 AS INTEGER),
    prep_stage = 'not_started',
    review_stage = 'not_required',
    payment_state = 'not_applicable'
WHERE id = '20000000-0000-4000-8000-000000000011';

-- =========================================================================
-- End demo status spread
-- =========================================================================

WITH inferred_period AS (
  SELECT
    id,
    CASE
      WHEN tax_year_type = 'fiscal'
        AND fiscal_year_end_month IS NOT NULL
        AND fiscal_year_end_day IS NOT NULL
        THEN
          CASE
            WHEN date(
              printf(
                '%04d-%02d-%02d',
                CAST(strftime('%Y', base_due_date / 1000, 'unixepoch') AS integer),
                fiscal_year_end_month,
                fiscal_year_end_day
              )
            ) >= date(base_due_date / 1000, 'unixepoch')
              THEN CAST(strftime('%Y', base_due_date / 1000, 'unixepoch') AS integer) - 1
            ELSE CAST(strftime('%Y', base_due_date / 1000, 'unixepoch') AS integer)
          END
      WHEN tax_type IN (
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
        THEN CAST(strftime('%Y', base_due_date / 1000, 'unixepoch') AS integer) - 1
      ELSE COALESCE(tax_year, CAST(strftime('%Y', base_due_date / 1000, 'unixepoch') AS integer))
    END AS period_year
  FROM obligation_instance
  WHERE tax_year IS NOT NULL
    AND tax_period_start IS NULL
    AND tax_period_end IS NULL
)
UPDATE obligation_instance
SET
  tax_period_start = (
    SELECT
      CASE
        WHEN obligation_instance.tax_year_type = 'fiscal'
          AND obligation_instance.fiscal_year_end_month IS NOT NULL
          AND obligation_instance.fiscal_year_end_day IS NOT NULL
          THEN CAST(unixepoch(date(
            printf(
              '%04d-%02d-%02d',
              inferred_period.period_year,
              obligation_instance.fiscal_year_end_month,
              obligation_instance.fiscal_year_end_day
            ),
            '+1 day',
            '-1 year'
          )) * 1000 AS integer)
        ELSE CAST(unixepoch(printf('%04d-01-01 00:00:00', inferred_period.period_year)) * 1000 AS integer)
      END
    FROM inferred_period
    WHERE inferred_period.id = obligation_instance.id
  ),
  tax_period_end = (
    SELECT
      CASE
        WHEN obligation_instance.tax_year_type = 'fiscal'
          AND obligation_instance.fiscal_year_end_month IS NOT NULL
          AND obligation_instance.fiscal_year_end_day IS NOT NULL
          THEN CAST(unixepoch(printf(
            '%04d-%02d-%02d 00:00:00',
            inferred_period.period_year,
            obligation_instance.fiscal_year_end_month,
            obligation_instance.fiscal_year_end_day
          )) * 1000 AS integer)
        ELSE CAST(unixepoch(printf('%04d-12-31 00:00:00', inferred_period.period_year)) * 1000 AS integer)
      END
    FROM inferred_period
    WHERE inferred_period.id = obligation_instance.id
  ),
  tax_period_kind = CASE
    WHEN tax_year_type = 'fiscal'
      AND fiscal_year_end_month IS NOT NULL
      AND fiscal_year_end_day IS NOT NULL THEN 'fiscal'
    ELSE 'calendar'
  END,
  tax_period_source = CASE
    WHEN tax_period_source = 'unknown' THEN 'migration'
    ELSE tax_period_source
  END,
  tax_period_review_reason = NULL
WHERE id IN (SELECT id FROM inferred_period);

INSERT INTO pulse
  (id, source, source_url, raw_r2_key, published_at, ai_summary, verbatim_quote, parsed_jurisdiction, parsed_counties, parsed_forms, parsed_entity_types, parsed_original_due_date, parsed_new_due_date, parsed_effective_from, confidence, status, reviewed_by, reviewed_at, requires_human_review, is_sample, created_at, updated_at)
VALUES
  ('40000000-0000-4000-8000-000000000001', 'IRS Disaster Relief', 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations', 'mock/pulse/irs-ca-fire-relief.html', CAST(unixepoch('2026-05-01 07:30:00') * 1000 AS INTEGER), 'IRS relief extends selected partnership and S-corp deadlines for Los Angeles County taxpayers.', 'Affected taxpayers in Los Angeles County have until June 16, 2026 to file selected federal business returns.', 'CA', '["Los Angeles"]', '["federal_1065","federal_1120s"]', '["llc","s_corp"]', CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-06-16 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 07:30:00') * 1000 AS INTEGER), 0.94, 'approved', 'mock_user_manager_miguel', CAST(unixepoch('2026-05-01 08:30:00') * 1000 AS INTEGER), 1, 1, CAST(unixepoch('2026-05-01 07:35:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:30:00') * 1000 AS INTEGER)),
  ('40000000-0000-4000-8000-000000000002', 'CA FTB Newsroom', 'https://www.ftb.ca.gov/about-ftb/newsroom/index.html', 'mock/pulse/ca-ftb-llc-payment.html', CAST(unixepoch('2026-04-30 15:00:00') * 1000 AS INTEGER), 'CA FTB extends selected LLC payment deadlines by 30 days for San Diego County.', 'The Franchise Tax Board extends the LLC payment deadline to May 30, 2026 for San Diego County taxpayers.', 'CA', '["San Diego"]', '["ca_llc_franchise_min_800"]', '["llc"]', CAST(unixepoch('2026-04-30 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-30 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-04-30 15:00:00') * 1000 AS INTEGER), 0.82, 'approved', 'mock_user_manager_miguel', CAST(unixepoch('2026-04-30 16:00:00') * 1000 AS INTEGER), 1, 1, CAST(unixepoch('2026-04-30 15:10:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:50:00') * 1000 AS INTEGER)),
  ('40000000-0000-4000-8000-000000000003', 'NY DTF Advisory', 'https://www.tax.ny.gov/pit/file/extension_of_time_to_file.htm', 'mock/pulse/ny-dtf-low-confidence.html', CAST(unixepoch('2026-04-29 14:00:00') * 1000 AS INTEGER), 'NY DTF advisory has low-confidence extracted deadline details for manual review.', 'Some due dates and filing obligations may vary by taxpayer circumstance and form type.', 'NY', '["Queens"]', '["ny_it204"]', '["partnership"]', CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-06-16 00:00:00') * 1000 AS INTEGER), NULL, 0.58, 'approved', 'mock_user_manager_miguel', CAST(unixepoch('2026-04-29 15:00:00') * 1000 AS INTEGER), 1, 1, CAST(unixepoch('2026-04-29 14:10:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:53:00') * 1000 AS INTEGER)),
  ('40000000-0000-4000-8000-000000000004', 'FL DOR Bulletin', 'https://floridarevenue.com/taxes/taxesfees/Pages/corporate.aspx', 'mock/pulse/fl-dor-sub-50-confidence.html', CAST(unixepoch('2026-04-28 13:00:00') * 1000 AS INTEGER), 'FL DOR bulletin has very-low-confidence extracted deadline details for practice review.', 'Corporate income tax filing dates may depend on entity status, fiscal year, and extension election.', 'FL', '[]', '["fl_corp_income"]', '["c_corp"]', CAST(unixepoch('2026-05-12 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-06-01 00:00:00') * 1000 AS INTEGER), NULL, 0.46, 'approved', 'mock_user_manager_miguel', CAST(unixepoch('2026-04-28 14:00:00') * 1000 AS INTEGER), 1, 1, CAST(unixepoch('2026-04-28 13:10:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:54:00') * 1000 AS INTEGER)),
  ('40000000-0000-4000-8000-000000000005', 'Practice Review · Approve Demo', 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations', 'mock/pulse/practice-approve.html', CAST(unixepoch('2026-05-01 10:00:00') * 1000 AS INTEGER), 'Pending practice review sample intended for the Approve action.', 'Affected Los Angeles County business taxpayers may receive an additional filing extension.', 'CA', '["Los Angeles"]', '["federal_1065"]', '["llc"]', CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-06-20 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 10:00:00') * 1000 AS INTEGER), 0.88, 'pending_review', NULL, NULL, 1, 1, CAST(unixepoch('2026-05-01 10:01:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 10:01:00') * 1000 AS INTEGER)),
  ('40000000-0000-4000-8000-000000000006', 'Practice Review · Reject Demo', 'https://dor.wa.gov/taxes-rates/business-occupation-tax', 'mock/pulse/practice-reject.html', CAST(unixepoch('2026-05-01 10:05:00') * 1000 AS INTEGER), 'Pending practice review sample intended for the Reject action.', 'The extracted date appears to describe a filing guide update, not a deadline extension.', 'WA', '[]', '["wa_b_and_o"]', '["c_corp"]', CAST(unixepoch('2026-05-31 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-06-30 00:00:00') * 1000 AS INTEGER), NULL, 0.62, 'pending_review', NULL, NULL, 1, 1, CAST(unixepoch('2026-05-01 10:06:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 10:06:00') * 1000 AS INTEGER)),
  ('40000000-0000-4000-8000-000000000007', 'Practice Review · Quarantine Demo', 'https://comptroller.texas.gov/taxes/franchise/', 'mock/pulse/practice-quarantine.html', CAST(unixepoch('2026-05-01 10:10:00') * 1000 AS INTEGER), 'Pending practice review sample intended for the Quarantine action.', 'The source copy conflicts with the extracted franchise report date and should be isolated.', 'TX', '[]', '["tx_franchise_report"]', '["llc"]', CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-07-15 00:00:00') * 1000 AS INTEGER), NULL, 0.34, 'pending_review', NULL, NULL, 1, 1, CAST(unixepoch('2026-05-01 10:11:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 10:11:00') * 1000 AS INTEGER));

INSERT INTO pulse_firm_alert
  (id, pulse_id, firm_id, status, matched_count, needs_review_count, dismissed_by, dismissed_at, snoozed_until, created_at, updated_at)
VALUES
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'matched', 1, 0, NULL, NULL, NULL, CAST(unixepoch('2026-05-01 08:31:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:51:00') * 1000 AS INTEGER)),
  ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'mock_firm_brightline', 'applied', 0, 0, NULL, NULL, NULL, CAST(unixepoch('2026-04-30 16:01:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:52:00') * 1000 AS INTEGER)),
  ('41000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'mock_firm_brightline', 'matched', 0, 0, NULL, NULL, NULL, CAST(unixepoch('2026-04-29 15:01:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:53:00') * 1000 AS INTEGER)),
  ('41000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 'mock_firm_brightline', 'matched', 0, 0, NULL, NULL, NULL, CAST(unixepoch('2026-04-28 14:01:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:54:00') * 1000 AS INTEGER));

INSERT INTO exception_rule
  (id, firm_id, source_pulse_id, jurisdiction, counties, affected_forms, affected_entity_types, override_type, override_value_json, override_due_date, effective_from, effective_until, status, source_url, verbatim_quote, created_at, updated_at)
VALUES
  ('42000000-0000-4000-8000-000000000001', 'mock_firm_brightline', '40000000-0000-4000-8000-000000000002', 'CA', '["San Diego"]', '["ca_llc_franchise_min_800"]', '["llc"]', 'extend_due_date', '{"originalDueDate":"2026-04-30","newDueDate":"2026-05-30"}', CAST(unixepoch('2026-05-30 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-04-30 15:00:00') * 1000 AS INTEGER), NULL, 'applied', 'https://www.ftb.ca.gov/about-ftb/newsroom/index.html', 'The Franchise Tax Board extends the LLC payment deadline to May 30, 2026 for San Diego County taxpayers.', CAST(unixepoch('2026-05-01 09:30:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:30:00') * 1000 AS INTEGER));

INSERT INTO obligation_exception_application
  (id, firm_id, obligation_instance_id, exception_rule_id, applied_at, applied_by_user_id, reverted_at, reverted_by_user_id)
VALUES
  ('43000000-0000-4000-8000-000000000001', 'mock_firm_brightline', '20000000-0000-4000-8000-000000000010', '42000000-0000-4000-8000-000000000001', CAST(unixepoch('2026-05-01 09:30:00') * 1000 AS INTEGER), 'mock_user_manager_miguel', NULL, NULL);

INSERT INTO pulse_application
  (id, pulse_id, obligation_instance_id, client_id, firm_id, applied_by, applied_at, reverted_by, reverted_at, before_due_date, after_due_date)
VALUES
  ('44000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000008', 'mock_firm_brightline', 'mock_user_manager_miguel', CAST(unixepoch('2026-05-01 09:30:00') * 1000 AS INTEGER), NULL, NULL, CAST(unixepoch('2026-04-30 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-30 00:00:00') * 1000 AS INTEGER));

INSERT INTO pulse_source_state
  (source_id, tier, jurisdiction, enabled, cadence_ms, health_status, last_checked_at, last_success_at, last_change_detected_at, next_check_at, consecutive_failures, last_error, etag, last_modified, created_at, updated_at, monitoring_baseline_at, baseline_mode)
VALUES
  ('irs.disaster', 'T1', 'US', 1, 1800000, 'healthy', CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 07:35:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 10:15:00') * 1000 AS INTEGER), 0, NULL, 'mock-etag-irs-disaster', 'Fri, 01 May 2026 07:35:00 GMT', CAST(unixepoch('2026-05-01 07:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 07:00:00') * 1000 AS INTEGER), 'active'),
  ('ca.ftb.newsroom', 'T1', 'CA', 1, 1800000, 'healthy', CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER), CAST(unixepoch('2026-04-30 15:10:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 10:10:00') * 1000 AS INTEGER), 0, NULL, 'mock-etag-ca-ftb', 'Thu, 30 Apr 2026 15:10:00 GMT', CAST(unixepoch('2026-05-01 07:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 07:00:00') * 1000 AS INTEGER), 'active'),
  ('tx.cpa.rss', 'T1', 'TX', 1, 3600000, 'degraded', CAST(unixepoch('2026-05-01 09:20:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 07:20:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-01 10:20:00') * 1000 AS INTEGER), 1, 'RSS returned 304 after one retry.', NULL, NULL, CAST(unixepoch('2026-05-01 07:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:20:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 07:00:00') * 1000 AS INTEGER), 'active'),
  ('wa.dor.news', 'T1', 'WA', 1, 3600000, 'healthy', CAST(unixepoch('2026-05-01 09:10:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:10:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-01 10:10:00') * 1000 AS INTEGER), 0, NULL, NULL, NULL, CAST(unixepoch('2026-05-01 07:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:10:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 07:00:00') * 1000 AS INTEGER), 'active')
ON CONFLICT(source_id) DO UPDATE SET
  tier = excluded.tier,
  jurisdiction = excluded.jurisdiction,
  enabled = excluded.enabled,
  cadence_ms = excluded.cadence_ms,
  health_status = excluded.health_status,
  last_checked_at = excluded.last_checked_at,
  last_success_at = excluded.last_success_at,
  last_change_detected_at = excluded.last_change_detected_at,
  next_check_at = excluded.next_check_at,
  consecutive_failures = excluded.consecutive_failures,
  last_error = excluded.last_error,
  etag = excluded.etag,
  last_modified = excluded.last_modified,
  updated_at = excluded.updated_at,
  monitoring_baseline_at = excluded.monitoring_baseline_at,
  baseline_mode = excluded.baseline_mode;

INSERT INTO pulse_source_snapshot
  (id, source_id, external_id, title, official_source_url, published_at, fetched_at, content_hash, raw_r2_key, parse_status, pulse_id, ai_output_id, failure_reason, created_at, updated_at)
VALUES
  ('mock_snapshot_irs_ca_fire_relief', 'irs.disaster', 'irs-2026-ca-fire-relief', 'IRS announces CA fire relief', 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations', CAST(unixepoch('2026-05-01 07:30:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 07:35:00') * 1000 AS INTEGER), 'mockhashirsrelief', 'mock/pulse/irs-ca-fire-relief.html', 'extracted', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', NULL, CAST(unixepoch('2026-05-01 07:35:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 07:45:00') * 1000 AS INTEGER)),
  ('mock_snapshot_tx_retry', 'tx.cpa.rss', 'tx-franchise-feed-retry', 'TX Comptroller feed retry', 'https://comptroller.texas.gov/taxes/franchise/', CAST(unixepoch('2026-05-01 06:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:20:00') * 1000 AS INTEGER), 'mockhashtxretry', 'mock/pulse/tx-retry.xml', 'failed', NULL, NULL, 'Temporary upstream 503 after retry budget.', CAST(unixepoch('2026-05-01 09:20:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:20:00') * 1000 AS INTEGER));

INSERT INTO ai_output
  (id, firm_id, user_id, kind, prompt_version, model, input_context_ref, input_hash, output_text, citations_json, guard_result, refusal_code, generated_at, tokens_in, tokens_out, latency_ms, cost_usd)
VALUES
  ('50000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'mock_user_owner_sarah', 'brief', 'dashboard-brief@v1', 'openai/gpt-5-mini', 'dashboard:mock_firm_brightline:2026-05-01', 'mockhash-dashboard-2026-05-01', 'Three deadlines need attention this week. Lakeview has the largest exposure, Arbor is ready for CA work, and Cascade needs liability inputs before exposure can be calculated.', '[{"ref":1,"obligationId":"20000000-0000-4000-8000-000000000009","evidence":{"id":"52000000-0000-4000-8000-000000000006","sourceType":"default_inference_by_entity_state","sourceId":"30000000-0000-4000-8000-000000000001","sourceUrl":null}}]', 'allowed', NULL, CAST(unixepoch('2026-05-01 09:55:00') * 1000 AS INTEGER), 1840, 188, 1180, 0.014),
  ('50000000-0000-4000-8000-000000000002', 'mock_firm_brightline', 'mock_user_manager_miguel', 'pulse_extract', 'pulse-extract@v1', 'openai/gpt-5-mini', 'mock_snapshot_irs_ca_fire_relief', 'mockhash-pulse-extract', 'Extracted jurisdiction, forms, counties, original due date, and new due date from IRS sample announcement.', '[{"sourceUrl":"https://www.irs.gov/newsroom/tax-relief-in-disaster-situations"}]', 'allowed', NULL, CAST(unixepoch('2026-05-01 07:44:00') * 1000 AS INTEGER), 1210, 144, 940, 0.009);

INSERT INTO dashboard_brief
  (id, firm_id, user_id, scope, as_of_date, status, input_hash, ai_output_id, summary_text, top_obligation_ids_json, citations_json, reason, error_code, generated_at, expires_at, created_at, updated_at)
VALUES
  ('51000000-0000-4000-8000-000000000001', 'mock_firm_brightline', NULL, 'firm', '2026-05-01', 'ready', 'mockhash-dashboard-2026-05-01', '50000000-0000-4000-8000-000000000001', 'Three deadlines need attention this week. Lakeview carries the largest exposure, Arbor is ready for CA work, and Cascade needs liability inputs before exposure can be calculated.', '["20000000-0000-4000-8000-000000000009","20000000-0000-4000-8000-000000000002","20000000-0000-4000-8000-000000000005"]', '[{"ref":1,"obligationId":"20000000-0000-4000-8000-000000000009","evidence":{"id":"52000000-0000-4000-8000-000000000006","sourceType":"default_inference_by_entity_state","sourceId":"30000000-0000-4000-8000-000000000001","sourceUrl":null}}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-01 09:55:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 09:55:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:54:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:55:00') * 1000 AS INTEGER)),
  ('51000000-0000-4000-8000-000000000002', 'mock_firm_brightline', NULL, 'firm', '2026-04-30', 'ready', 'mockhash-dashboard-2026-04-30', '50000000-0000-4000-8000-000000000001', 'Three deadlines need attention this week. Lakeview carries the largest exposure, Arbor is ready for CA work, and Cascade needs liability inputs before exposure can be calculated.', '["20000000-0000-4000-8000-000000000009","20000000-0000-4000-8000-000000000002","20000000-0000-4000-8000-000000000005"]', '[{"ref":1,"obligationId":"20000000-0000-4000-8000-000000000009","evidence":{"id":"52000000-0000-4000-8000-000000000006","sourceType":"default_inference_by_entity_state","sourceId":"30000000-0000-4000-8000-000000000001","sourceUrl":null}}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-01 09:55:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 09:55:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:54:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:55:00') * 1000 AS INTEGER));

INSERT INTO evidence_link
  (id, firm_id, obligation_instance_id, ai_output_id, source_type, source_id, source_url, verbatim_quote, raw_value, normalized_value, confidence, model, matrix_version, verified_at, verified_by, applied_at, applied_by)
VALUES
  ('52000000-0000-4000-8000-000000000001', 'mock_firm_brightline', '20000000-0000-4000-8000-000000000001', NULL, 'default_inference_by_entity_state', 'default-matrix-v1', NULL, 'Federal partnership return due date inferred from entity type and tax year.', 'llc / CA / 2026', 'federal_1065 / 2026-05-15', 1.0, NULL, 'default-matrix-v1.0', CAST(unixepoch('2026-05-01 09:00:00') * 1000 AS INTEGER), 'mock_user_preparer_avery', CAST(unixepoch('2026-05-01 09:20:00') * 1000 AS INTEGER), 'mock_user_preparer_avery'),
  ('52000000-0000-4000-8000-000000000002', 'mock_firm_brightline', '20000000-0000-4000-8000-000000000002', NULL, 'verified_rule', 'ca-568-demo-rule', 'https://www.ftb.ca.gov/forms/misc/568.html', 'CA Form 568 due date follows the LLC return calendar in the demo rule pack.', 'ca_568', '2026-05-02', 0.95, NULL, 'rules-mvp', CAST(unixepoch('2026-05-01 09:00:00') * 1000 AS INTEGER), 'mock_user_manager_miguel', CAST(unixepoch('2026-05-01 09:21:00') * 1000 AS INTEGER), 'mock_user_manager_miguel'),
  ('52000000-0000-4000-8000-000000000003', 'mock_firm_brightline', '20000000-0000-4000-8000-000000000003', NULL, 'default_inference_by_entity_state', 'default-matrix-v1', NULL, 'S corp federal return inferred; county missing blocks automatic Pulse apply.', 's_corp / CA / county missing', 'federal_1120s / 2026-05-15', 0.86, NULL, 'default-matrix-v1.0', NULL, NULL, CAST(unixepoch('2026-05-01 09:22:00') * 1000 AS INTEGER), 'mock_user_preparer_avery'),
  ('52000000-0000-4000-8000-000000000004', 'mock_firm_brightline', '20000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000001', 'ai_normalizer', '30000000-0000-4000-8000-000000000001', NULL, 'NY CT-3-S normalized from imported tax type.', 'NY CT-3-S', 'ny_ct3s', 0.93, 'openai/gpt-5-mini', NULL, CAST(unixepoch('2026-05-01 09:09:00') * 1000 AS INTEGER), 'mock_user_preparer_avery', CAST(unixepoch('2026-05-01 09:24:00') * 1000 AS INTEGER), 'mock_user_preparer_avery'),
  ('52000000-0000-4000-8000-000000000005', 'mock_firm_brightline', '20000000-0000-4000-8000-000000000005', NULL, 'ai_mapper', '30000000-0000-4000-8000-000000000001', NULL, 'Tax types column mapped to TX franchise report.', 'TX Franchise', 'tx_franchise_report', 0.95, 'openai/gpt-5-mini', NULL, CAST(unixepoch('2026-05-01 09:07:00') * 1000 AS INTEGER), 'mock_user_preparer_avery', CAST(unixepoch('2026-05-01 09:25:00') * 1000 AS INTEGER), 'mock_user_preparer_avery'),
  ('52000000-0000-4000-8000-000000000006', 'mock_firm_brightline', '20000000-0000-4000-8000-000000000009', NULL, 'default_inference_by_entity_state', '30000000-0000-4000-8000-000000000001', NULL, 'Partnership default matrix generated federal 1065 obligation.', 'partnership / MA / imported', 'federal_1065 / 2026-05-01', 1.0, NULL, 'default-matrix-v1.0', CAST(unixepoch('2026-05-01 09:15:00') * 1000 AS INTEGER), 'mock_user_preparer_avery', CAST(unixepoch('2026-05-01 09:26:00') * 1000 AS INTEGER), 'mock_user_preparer_avery'),
  ('52000000-0000-4000-8000-000000000007', 'mock_firm_brightline', '20000000-0000-4000-8000-000000000010', NULL, 'pulse_apply', '40000000-0000-4000-8000-000000000002', 'https://www.ftb.ca.gov/about-ftb/newsroom/index.html', 'The Franchise Tax Board extends the LLC payment deadline to May 30, 2026 for San Diego County taxpayers.', '2026-04-30', '2026-05-30', 0.92, 'openai/gpt-5-mini', NULL, CAST(unixepoch('2026-05-01 09:30:00') * 1000 AS INTEGER), 'mock_user_manager_miguel', CAST(unixepoch('2026-05-01 09:30:00') * 1000 AS INTEGER), 'mock_user_manager_miguel'),
  ('52000000-0000-4000-8000-000000000008', 'mock_firm_brightline', '20000000-0000-4000-8000-000000000007', NULL, 'user_override', 'mock_user_preparer_avery', NULL, 'Preparer marked the trust return complete after client signoff.', 'review', 'done', 1.0, NULL, NULL, CAST(unixepoch('2026-05-01 09:32:00') * 1000 AS INTEGER), 'mock_user_preparer_avery', CAST(unixepoch('2026-05-01 09:32:00') * 1000 AS INTEGER), 'mock_user_preparer_avery');

INSERT INTO ai_insight_cache
  (id, firm_id, kind, subject_type, subject_id, as_of_date, status, input_hash, ai_output_id, output_json, citations_json, reason, error_code, generated_at, expires_at, created_at, updated_at)
VALUES
  ('70000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'client_risk_summary', 'client', '10000000-0000-4000-8000-000000000001', '2026-05-02', 'ready', 'demo-client-risk-arbor', NULL, '{"sections":[{"key":"risk","label":"Risk","text":"Arbor & Vale has high importance, recent late-filing history, and an open partnership deadline in the near window.","citationRefs":[1,2]},{"key":"drivers","label":"Drivers","text":"Smart Priority is driven by exposure, urgency, client importance, late-filing history, and linked evidence status.","citationRefs":[2]},{"key":"next_step","label":"Next step","text":"Verify the partnership workpaper and client packet before marking the deadline ready for review.","citationRefs":[2]}]}', '[{"ref":1,"obligationId":null,"evidence":null},{"ref":2,"obligationId":"20000000-0000-4000-8000-000000000001","evidence":{"id":"52000000-0000-4000-8000-000000000001","sourceType":"verified_rule","sourceId":"fed.1065.2026","sourceUrl":"https://www.irs.gov/forms-pubs/about-form-1065"}}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-02 08:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 08:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 08:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 08:00:00') * 1000 AS INTEGER)),
  ('70000000-0000-4000-8000-000000000002', 'mock_firm_brightline', 'deadline_tip', 'obligation', '20000000-0000-4000-8000-000000000009', '2026-05-02', 'ready', 'demo-deadline-tip-lakeview', NULL, '{"sections":[{"key":"what","label":"What","text":"Lakeview Medical Partners has a federal partnership deadline in the active Obligations window.","citationRefs":[1]},{"key":"why","label":"Why","text":"The row carries high exposure and late-filing history, so it ranks near the top of Smart Priority.","citationRefs":[1,2]},{"key":"prepare","label":"Prepare","text":"Review the partner count, estimated tax input, and linked rule source before changing readiness.","citationRefs":[2]}]}', '[{"ref":1,"obligationId":"20000000-0000-4000-8000-000000000009","evidence":null},{"ref":2,"obligationId":"20000000-0000-4000-8000-000000000009","evidence":{"id":"52000000-0000-4000-8000-000000000006","sourceType":"penalty_override","sourceId":"10000000-0000-4000-8000-000000000007","sourceUrl":null}}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-02 08:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 08:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 08:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 08:05:00') * 1000 AS INTEGER));

INSERT INTO audit_event
  (id, firm_id, actor_id, entity_type, entity_id, action, before_json, after_json, reason, ip_hash, user_agent_hash, created_at)
VALUES
  ('60000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'mock_user_preparer_avery', 'migration_batch', '30000000-0000-4000-8000-000000000001', 'migration.batch.created', NULL, '{"source":"preset_karbon","rowCount":4}', NULL, 'iphash_demo_1', 'uahash_demo_1', CAST(unixepoch('2026-05-01 09:00:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000000002', 'mock_firm_brightline', 'mock_user_preparer_avery', 'migration_batch', '30000000-0000-4000-8000-000000000001', 'migration.imported', NULL, '{"successCount":3,"skippedCount":1}', NULL, 'iphash_demo_1', 'uahash_demo_1', CAST(unixepoch('2026-05-01 09:20:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000000003', 'mock_firm_brightline', 'mock_user_preparer_avery', 'client_batch', '10000000-0000-4000-8000-000000000003', 'client.batch_created', NULL, '{"count":3}', NULL, 'iphash_demo_1', 'uahash_demo_1', CAST(unixepoch('2026-05-01 09:21:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000000004', 'mock_firm_brightline', 'mock_user_preparer_avery', 'obligation_instance', '20000000-0000-4000-8000-000000000002', 'obligation.status.updated', '{"status":"pending"}', '{"status":"in_progress"}', 'Started CA return prep during demo.', 'iphash_demo_2', 'uahash_demo_2', CAST(unixepoch('2026-05-01 09:28:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000000005', 'mock_firm_brightline', 'mock_user_manager_miguel', 'pulse', '40000000-0000-4000-8000-000000000002', 'pulse.apply', '{"dueDate":"2026-04-30"}', '{"dueDate":"2026-05-30","appliedCount":1}', 'Applied accepted CA FTB overlay.', 'iphash_demo_3', 'uahash_demo_3', CAST(unixepoch('2026-05-01 09:30:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000000006', 'mock_firm_brightline', 'mock_user_owner_sarah', 'client', '10000000-0000-4000-8000-000000000007', 'penalty.override', '{"estimatedTaxLiabilityCents":15000000}', '{"estimatedTaxLiabilityCents":18500000}', 'Updated from partner-provided K-1 workpaper.', 'iphash_demo_4', 'uahash_demo_4', CAST(unixepoch('2026-05-01 09:35:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000000007', 'mock_firm_brightline', 'mock_user_owner_sarah', 'member_invitation', 'mock_invitation_pending_team_lead', 'member.invited', NULL, '{"email":"team.lead@duedatehq.test","role":"manager"}', NULL, 'iphash_demo_4', 'uahash_demo_4', CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000000008', 'mock_firm_brightline', 'mock_user_owner_sarah', 'audit_evidence_package', '61000000-0000-4000-8000-000000000001', 'export.audit_package.ready', NULL, '{"scope":"firm","fileCount":4}', NULL, 'iphash_demo_4', 'uahash_demo_4', CAST(unixepoch('2026-05-01 09:58:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000000009', 'mock_firm_brightline', 'mock_user_coordinator_jules', 'auth', 'mock_user_coordinator_jules', 'auth.denied', NULL, '{"attemptedAction":"billing.update","allowedRoles":["owner"],"actualRole":"coordinator"}', 'Coordinator attempted owner-only billing action in demo.', 'iphash_demo_5', 'uahash_demo_5', CAST(unixepoch('2026-05-01 10:00:00') * 1000 AS INTEGER));

INSERT INTO audit_evidence_package
  (id, firm_id, exported_by_user_id, scope, scope_entity_id, range_start, range_end, file_count, file_manifest_json, sha256_hash, r2_key, status, expires_at, failure_reason, created_at, updated_at)
VALUES
  ('61000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'mock_user_owner_sarah', 'firm', NULL, CAST(unixepoch('2026-04-24 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 10:00:00') * 1000 AS INTEGER), 4, '[{"path":"audit/events.json","bytes":4200},{"path":"evidence/links.json","bytes":3600},{"path":"pulse/applications.json","bytes":2200},{"path":"manifest.json","bytes":900}]', 'mocksha256auditpackage', 'mock/audit/brightline-may-preview.zip', 'ready', CAST(unixepoch('2026-05-08 10:00:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-01 09:57:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:58:00') * 1000 AS INTEGER));

INSERT INTO email_outbox
  (id, firm_id, external_id, type, status, payload_json, created_at, sent_at, failed_at, failure_reason)
VALUES
  ('62000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'mock-email-pulse-digest-2026-05-01', 'pulse_digest', 'sent', '{"subject":"Pulse relief applied","alertId":"41000000-0000-4000-8000-000000000002","recipientCount":3}', CAST(unixepoch('2026-05-01 09:31:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:32:00') * 1000 AS INTEGER), NULL, NULL),
  ('62000000-0000-4000-8000-000000000002', 'mock_firm_brightline', 'mock-email-client-reminder-cascade-2026-05-01', 'client_deadline_reminder', 'pending', '{"clientId":"10000000-0000-4000-8000-000000000005","obligationId":"20000000-0000-4000-8000-000000000006"}', CAST(unixepoch('2026-05-01 09:33:00') * 1000 AS INTEGER), NULL, NULL, NULL);

INSERT INTO in_app_notification
  (id, firm_id, user_id, type, entity_type, entity_id, title, body, href, metadata_json, read_at, created_at)
VALUES
  ('63000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'mock_user_owner_sarah', 'deadline_reminder', 'obligation_instance', '20000000-0000-4000-8000-000000000009', 'Lakeview deadline is due today', 'Federal 1065 is due today and carries the highest exposure in the demo queue.', '/obligations?search=Lakeview', '{"severity":"critical"}', NULL, CAST(unixepoch('2026-05-01 09:50:00') * 1000 AS INTEGER)),
  ('63000000-0000-4000-8000-000000000002', 'mock_firm_brightline', 'mock_user_owner_sarah', 'overdue', 'obligation_instance', '20000000-0000-4000-8000-000000000006', 'Cascade is overdue', 'Add liability inputs or assign an owner before sending the reminder.', '/obligations?search=Cascade', '{"severity":"critical"}', NULL, CAST(unixepoch('2026-05-01 09:49:00') * 1000 AS INTEGER)),
  ('63000000-0000-4000-8000-000000000003', 'mock_firm_brightline', 'mock_user_owner_sarah', 'audit_package_ready', 'audit_evidence_package', '61000000-0000-4000-8000-000000000001', 'Audit package is ready', 'The May preview evidence package is ready for owner review.', '/audit', '{"fileCount":4}', CAST(unixepoch('2026-05-01 10:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:48:00') * 1000 AS INTEGER)),
  ('63000000-0000-4000-8000-000000000004', 'mock_firm_brightline', 'mock_user_preparer_avery', 'client_reminder', 'client', '10000000-0000-4000-8000-000000000005', 'Cascade needs owner assignment', 'This client is unassigned and appears in workload risk.', '/clients?client=10000000-0000-4000-8000-000000000005', '{"assignee":null}', NULL, CAST(unixepoch('2026-05-01 09:47:00') * 1000 AS INTEGER));

INSERT INTO notification_preference
  (id, firm_id, user_id, email_enabled, in_app_enabled, reminders_enabled, pulse_enabled, unassigned_reminders_enabled, created_at, updated_at)
VALUES
  ('64000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'mock_user_owner_sarah', 1, 1, 1, 1, 1, CAST(unixepoch('2026-05-01 08:30:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:30:00') * 1000 AS INTEGER)),
  ('64000000-0000-4000-8000-000000000002', 'mock_firm_brightline', 'mock_user_preparer_avery', 1, 1, 1, 1, 1, CAST(unixepoch('2026-05-01 08:31:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:31:00') * 1000 AS INTEGER));

INSERT INTO reminder
  (id, firm_id, obligation_instance_id, client_id, recipient_kind, recipient_user_id, recipient_email, channel, offset_days, scheduled_for, status, email_outbox_id, notification_id, dedupe_key, sent_at, clicked_at, failure_reason, created_at)
VALUES
  ('65000000-0000-4000-8000-000000000001', 'mock_firm_brightline', '20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000007', 'member', 'mock_user_owner_sarah', NULL, 'in_app', 0, '2026-05-01', 'sent', NULL, '63000000-0000-4000-8000-000000000001', 'mock_firm_brightline:20000000-0000-4000-8000-000000000009:owner:0:in_app', CAST(unixepoch('2026-05-01 09:50:00') * 1000 AS INTEGER), NULL, NULL, CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER)),
  ('65000000-0000-4000-8000-000000000002', 'mock_firm_brightline', '20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000005', 'client', NULL, 'owner@cascadeflorist.test', 'email', 1, '2026-04-28', 'queued', '62000000-0000-4000-8000-000000000002', NULL, 'mock_firm_brightline:20000000-0000-4000-8000-000000000006:client:1:email', NULL, NULL, NULL, CAST(unixepoch('2026-05-01 09:44:00') * 1000 AS INTEGER));

INSERT INTO client_email_suppression
  (id, firm_id, email, token_hash, reason, created_at)
VALUES
  ('66000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'old-contact@cascadeflorist.test', 'mock_token_hash_old_client', 'manual', CAST(unixepoch('2026-05-01 08:35:00') * 1000 AS INTEGER));

INSERT INTO llm_log
  (id, firm_id, user_id, prompt_version, model, input_hash, input_tokens, output_tokens, latency_ms, cost_usd, guard_result, refusal_code, success, error_msg, created_at)
VALUES
  ('67000000-0000-4000-8000-000000000001', 'mock_firm_brightline', 'mock_user_owner_sarah', 'dashboard-brief@v1', 'openai/gpt-5-mini', 'mockhash-dashboard-2026-05-01', 1840, 188, 1180, 0.014, 'allowed', NULL, 1, NULL, CAST(unixepoch('2026-05-01 09:55:00') * 1000 AS INTEGER)),
  ('67000000-0000-4000-8000-000000000002', 'mock_firm_brightline', 'mock_user_manager_miguel', 'pulse-extract@v1', 'openai/gpt-5-mini', 'mockhash-pulse-extract', 1210, 144, 940, 0.009, 'allowed', NULL, 1, NULL, CAST(unixepoch('2026-05-01 07:44:00') * 1000 AS INTEGER));

-- Plan-account demo supplement: gives Sofia Solo, Priya Pro, and Taylor Team
-- non-empty content across the same app surfaces as the primary Brightline demo.

INSERT INTO user (id, name, email, email_verified, image, created_at, updated_at)
VALUES
  ('mock_user_plan_pro_preparer', 'Nora Pro', 'nora.pro@duedatehq.test', 1, NULL, CAST(unixepoch('2026-05-01 08:18:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:18:00') * 1000 AS INTEGER)),
  ('mock_user_plan_team_manager', 'Morgan Team', 'morgan.team@duedatehq.test', 1, NULL, CAST(unixepoch('2026-05-01 08:19:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:19:00') * 1000 AS INTEGER)),
  ('mock_user_plan_team_preparer', 'Casey Team', 'casey.team@duedatehq.test', 1, NULL, CAST(unixepoch('2026-05-01 08:20:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:20:00') * 1000 AS INTEGER)),
  ('mock_user_plan_team_coordinator', 'Jordan Team', 'jordan.team@duedatehq.test', 1, NULL, CAST(unixepoch('2026-05-01 08:21:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:21:00') * 1000 AS INTEGER));

INSERT INTO member (id, organization_id, user_id, role, created_at, status)
VALUES
  ('mock_member_plan_pro_preparer', 'mock_firm_plan_pro', 'mock_user_plan_pro_preparer', 'preparer', CAST(unixepoch('2026-05-01 08:24:00') * 1000 AS INTEGER), 'active'),
  ('mock_member_plan_team_manager', 'mock_firm_plan_team', 'mock_user_plan_team_manager', 'manager', CAST(unixepoch('2026-05-01 08:25:00') * 1000 AS INTEGER), 'active'),
  ('mock_member_plan_team_preparer', 'mock_firm_plan_team', 'mock_user_plan_team_preparer', 'preparer', CAST(unixepoch('2026-05-01 08:26:00') * 1000 AS INTEGER), 'active'),
  ('mock_member_plan_team_coordinator', 'mock_firm_plan_team', 'mock_user_plan_team_coordinator', 'coordinator', CAST(unixepoch('2026-05-01 08:27:00') * 1000 AS INTEGER), 'active');

INSERT INTO invitation (id, organization_id, email, role, status, expires_at, created_at, inviter_id)
VALUES
  ('mock_invitation_plan_pro_bookkeeper', 'mock_firm_plan_pro', 'bookkeeper.pro@duedatehq.test', 'coordinator', 'pending', CAST(unixepoch('2026-05-10 12:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:12:00') * 1000 AS INTEGER), 'mock_user_plan_pro'),
  ('mock_invitation_plan_team_manager', 'mock_firm_plan_team', 'team.manager@duedatehq.test', 'manager', 'pending', CAST(unixepoch('2026-05-10 12:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:13:00') * 1000 AS INTEGER), 'mock_user_plan_team');

INSERT INTO obligation_saved_view
  (id, firm_id, created_by_user_id, name, query_json, column_visibility_json, density, is_pinned, created_at, updated_at)
VALUES
  ('68000000-0000-4000-8000-000000000001', 'mock_firm_plan_solo', 'mock_user_plan_solo', 'This week client blockers', '{"status":["pending","waiting_on_client"],"dueWithinDays":14}', '{"estimatedExposureCents":true,"readiness":true}', 'comfortable', 1, CAST(unixepoch('2026-05-01 09:15:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:15:00') * 1000 AS INTEGER)),
  ('68000000-0000-4000-8000-000000000002', 'mock_firm_plan_pro', 'mock_user_plan_pro', 'Owner review queue', '{"status":["review","waiting_on_client"],"dueWithinDays":30}', '{"clientState":true,"assigneeName":true}', 'compact', 1, CAST(unixepoch('2026-05-01 09:16:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:16:00') * 1000 AS INTEGER)),
  ('68000000-0000-4000-8000-000000000003', 'mock_firm_plan_team', 'mock_user_plan_team', 'Unassigned and high exposure', '{"owner":"unassigned","minExposureCents":100000}', '{"estimatedExposureCents":true,"smartPriority":true}', 'compact', 1, CAST(unixepoch('2026-05-01 09:17:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:17:00') * 1000 AS INTEGER));

INSERT INTO calendar_subscription
  (id, firm_id, scope, subject_user_id, privacy_mode, token_nonce, status, last_accessed_at, revoked_at, created_at, updated_at)
VALUES
  ('68100000-0000-4000-8000-000000000001', 'mock_firm_plan_solo', 'my', 'mock_user_plan_solo', 'redacted', 'mock-calendar-nonce-plan-solo', 'active', CAST(unixepoch('2026-05-02 10:00:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-01 09:18:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 10:00:00') * 1000 AS INTEGER)),
  ('68100000-0000-4000-8000-000000000002', 'mock_firm_plan_pro', 'firm', NULL, 'full', 'mock-calendar-nonce-plan-pro', 'active', CAST(unixepoch('2026-05-02 10:05:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-01 09:19:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 10:05:00') * 1000 AS INTEGER)),
  ('68100000-0000-4000-8000-000000000003', 'mock_firm_plan_team', 'firm', NULL, 'full', 'mock-calendar-nonce-plan-team', 'active', CAST(unixepoch('2026-05-02 10:10:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-01 09:20:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 10:10:00') * 1000 AS INTEGER));

INSERT INTO migration_batch
  (id, firm_id, user_id, source, raw_input_r2_key, raw_input_file_name, raw_input_content_type, raw_input_size_bytes, mapping_json, preset_used, row_count, success_count, skipped_count, ai_global_confidence, status, applied_at, revert_expires_at, reverted_at, created_at, updated_at)
VALUES
  ('34000000-0000-4000-8000-000000000001', 'mock_firm_plan_solo', 'mock_user_plan_solo', 'paste', NULL, NULL, NULL, NULL, '{"rawInput":{"kind":"paste","headers":["Client","State","Entity","Tax types"],"rowCount":3,"truncated":false},"mapperFallback":"manual"}', NULL, 3, 2, 1, 0.91, 'applied', CAST(unixepoch('2026-05-01 09:35:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 09:35:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-01 09:25:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:35:00') * 1000 AS INTEGER)),
  ('35000000-0000-4000-8000-000000000001', 'mock_firm_plan_pro', 'mock_user_plan_pro', 'preset_quickbooks', 'firm/mock_firm_plan_pro/migration/35000000-0000-4000-8000-000000000001/quickbooks-pro.csv', 'quickbooks-pro.csv', 'text/csv', 1330, '{"rawInput":{"kind":"csv","headers":["Customer","Tax form","State","Owner"],"rowCount":4,"truncated":false},"mapperFallback":"preset"}', 'quickbooks', 4, 4, 0, 0.96, 'applied', CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 09:40:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-01 09:30:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER)),
  ('36000000-0000-4000-8000-000000000001', 'mock_firm_plan_team', 'mock_user_plan_team_manager', 'integration_karbon_api', 'firm/mock_firm_plan_team/migration/36000000-0000-4000-8000-000000000001/karbon-team.json', 'karbon-team.json', 'application/json', 2410, '{"rawInput":{"kind":"json","headers":["name","state","entity_type","assignee"],"rowCount":5,"truncated":false},"integration":"karbon"}', 'karbon', 5, 5, 0, 0.98, 'applied', CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 09:45:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-01 09:32:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER));

INSERT INTO migration_mapping
  (id, batch_id, source_header, target_field, confidence, reasoning, user_overridden, model, prompt_version, created_at)
VALUES
  ('34100000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000001', 'Client', 'client.name', 0.94, 'Column contains client display names.', 0, 'openai/gpt-5-mini', 'mapper@v1', CAST(unixepoch('2026-05-01 09:27:00') * 1000 AS INTEGER)),
  ('34100000-0000-4000-8000-000000000002', '34000000-0000-4000-8000-000000000001', 'Tax types', 'client.tax_types', 0.88, 'Mixed free-text tax form labels required review.', 1, 'openai/gpt-5-mini', 'mapper@v1', CAST(unixepoch('2026-05-01 09:28:00') * 1000 AS INTEGER)),
  ('35100000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000001', 'Customer', 'client.name', 0.99, 'QuickBooks customer names map directly to client names.', 0, 'openai/gpt-5-mini', 'mapper@v1', CAST(unixepoch('2026-05-01 09:33:00') * 1000 AS INTEGER)),
  ('35100000-0000-4000-8000-000000000002', '35000000-0000-4000-8000-000000000001', 'Owner', 'client.assignee_name', 0.95, 'Owner initials mapped to seeded preparer names.', 1, 'openai/gpt-5-mini', 'mapper@v1', CAST(unixepoch('2026-05-01 09:34:00') * 1000 AS INTEGER)),
  ('36100000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000001', 'name', 'client.name', 0.99, 'Karbon API payload uses normalized organization names.', 0, 'openai/gpt-5-mini', 'mapper@v1', CAST(unixepoch('2026-05-01 09:36:00') * 1000 AS INTEGER)),
  ('36100000-0000-4000-8000-000000000002', '36000000-0000-4000-8000-000000000001', 'assignee', 'client.assignee_name', 0.97, 'Assignee names match active Team members.', 0, 'openai/gpt-5-mini', 'mapper@v1', CAST(unixepoch('2026-05-01 09:37:00') * 1000 AS INTEGER));

INSERT INTO migration_normalization
  (id, batch_id, field, raw_value, normalized_value, confidence, model, prompt_version, reasoning, user_overridden, created_at)
VALUES
  ('34200000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000001', 'entity_type', 'Partnership', 'partnership', 0.98, 'openai/gpt-5-mini', 'normalizer-entity@v1', 'Direct entity taxonomy match.', 0, CAST(unixepoch('2026-05-01 09:29:00') * 1000 AS INTEGER)),
  ('35200000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000001', 'state', 'Texas', 'TX', 0.99, 'openai/gpt-5-mini', 'normalizer-tax-types@v1', 'State name normalized to postal code.', 0, CAST(unixepoch('2026-05-01 09:35:00') * 1000 AS INTEGER)),
  ('36200000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000001', 'tax_types', '1065, CA 568', '["federal_1065","ca_568"]', 0.96, 'openai/gpt-5-mini', 'normalizer-tax-types@v1', 'Karbon service tags mapped to supported tax types.', 0, CAST(unixepoch('2026-05-01 09:38:00') * 1000 AS INTEGER));

INSERT INTO migration_error
  (id, batch_id, row_index, raw_row_json, error_code, error_message, created_at)
VALUES
  ('34300000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000001', 3, '{"Client":"Draft Solo Prospect","State":"","Entity":"Individual"}', 'STATE_REQUIRED', 'State is required before the default matrix can generate obligations.', CAST(unixepoch('2026-05-01 09:31:00') * 1000 AS INTEGER));

INSERT INTO client
  (id, firm_id, name, ein, state, county, entity_type, email, notes, assignee_id, assignee_name, importance_weight, late_filing_count_last_12mo, estimated_tax_liability_cents, estimated_tax_liability_source, equity_owner_count, migration_batch_id, created_at, updated_at, deleted_at)
VALUES
  ('11000000-0000-4000-8000-000000000001', 'mock_firm_plan_solo', 'Maple Advisory Partners', '11-1000001', 'NY', 'Queens', 'partnership', 'tax@mapleadvisory.test', 'Solo-plan imported partnership with a NY deadline and Pulse match.', 'mock_user_plan_solo', 'Sofia Solo', 3, 1, 6100000, 'imported', 4, '34000000-0000-4000-8000-000000000001', CAST(unixepoch('2026-05-01 09:35:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:42:00') * 1000 AS INTEGER), NULL),
  ('11000000-0000-4000-8000-000000000002', 'mock_firm_plan_solo', 'Cedar Ridge Therapy PC', '11-1000002', 'CA', 'Alameda', 's_corp', 'admin@cedarridge.test', 'Manual solo client waiting for owner review.', 'mock_user_plan_solo', 'Sofia Solo', 2, 0, 4200000, 'demo_seed', 2, NULL, CAST(unixepoch('2026-05-01 09:36:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:43:00') * 1000 AS INTEGER), NULL),
  ('11000000-0000-4000-8000-000000000003', 'mock_firm_plan_solo', 'North Loop Freelancer', '11-1000003', 'TX', 'Travis', 'individual', 'owner@northloop.test', 'Client readiness request sample for the Solo account.', NULL, NULL, 1, 0, NULL, NULL, NULL, NULL, CAST(unixepoch('2026-05-01 09:37:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:44:00') * 1000 AS INTEGER), NULL),
  ('12000000-0000-4000-8000-000000000001', 'mock_firm_plan_pro', 'Beacon Robotics Inc.', '12-2000001', 'TX', 'Travis', 'c_corp', 'tax@beaconrobotics.test', 'High exposure Pro-plan client waiting on a state workpaper.', 'mock_user_plan_pro', 'Priya Pro', 3, 2, 16200000, 'imported', 6, '35000000-0000-4000-8000-000000000001', CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER), NULL),
  ('12000000-0000-4000-8000-000000000002', 'mock_firm_plan_pro', 'Willow Family Office LLC', '12-2000002', 'CA', 'Los Angeles', 'llc', 'controller@willowfamily.test', 'Los Angeles LLC for IRS disaster Pulse matching.', 'mock_user_plan_pro_preparer', 'Nora Pro', 3, 1, 7800000, 'imported', 5, '35000000-0000-4000-8000-000000000001', CAST(unixepoch('2026-05-01 09:41:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:47:00') * 1000 AS INTEGER), NULL),
  ('12000000-0000-4000-8000-000000000003', 'mock_firm_plan_pro', 'Harborview Partners', '12-2000003', 'NY', 'Queens', 'partnership', 'admin@harborview.test', 'Unassigned Pro Obligations row for owner triage.', NULL, NULL, 2, 1, 9900000, 'demo_seed', 7, NULL, CAST(unixepoch('2026-05-01 09:42:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:48:00') * 1000 AS INTEGER), NULL),
  ('12000000-0000-4000-8000-000000000004', 'mock_firm_plan_pro', 'Quartz Medical PLLC', '12-2000004', 'FL', 'Orange', 's_corp', 'admin@quartzmedical.test', 'Unsupported exposure sample for Pro filters.', 'mock_user_plan_pro_preparer', 'Nora Pro', 2, 0, 4200000, 'imported', 3, '35000000-0000-4000-8000-000000000001', CAST(unixepoch('2026-05-01 09:43:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:49:00') * 1000 AS INTEGER), NULL),
  ('13000000-0000-4000-8000-000000000001', 'mock_firm_plan_team', 'Redwood SaaS LLC', '13-3000001', 'CA', 'Los Angeles', 'llc', 'finance@redwoodsaas.test', 'Team-plan Los Angeles client for Pulse and capacity testing.', 'mock_user_plan_team_manager', 'Morgan Team', 3, 2, 24500000, 'imported', 8, '36000000-0000-4000-8000-000000000001', CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:51:00') * 1000 AS INTEGER), NULL),
  ('13000000-0000-4000-8000-000000000002', 'mock_firm_plan_team', 'Alpine Dental Partners', '13-3000002', 'CO', 'Denver', 'partnership', 'admin@alpinedental.test', 'Waiting on partner confirmations.', 'mock_user_plan_team_preparer', 'Casey Team', 3, 1, 13500000, 'imported', 9, '36000000-0000-4000-8000-000000000001', CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:52:00') * 1000 AS INTEGER), NULL),
  ('13000000-0000-4000-8000-000000000003', 'mock_firm_plan_team', 'Blue Harbor S-Corp', '13-3000003', 'NY', 'Kings', 's_corp', 'tax@blueharbor.test', 'Coordinator-owned review sample.', 'mock_user_plan_team_coordinator', 'Jordan Team', 2, 0, 8400000, 'imported', 4, '36000000-0000-4000-8000-000000000001', CAST(unixepoch('2026-05-01 09:47:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:53:00') * 1000 AS INTEGER), NULL),
  ('13000000-0000-4000-8000-000000000004', 'mock_firm_plan_team', 'Summit Events LLC', '13-3000004', 'TX', 'Dallas', 'llc', 'owner@summitevents.test', 'Unassigned team queue row with missing exposure input.', NULL, NULL, 2, 1, NULL, NULL, 3, NULL, CAST(unixepoch('2026-05-01 09:48:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:54:00') * 1000 AS INTEGER), NULL),
  ('13000000-0000-4000-8000-000000000005', 'mock_firm_plan_team', 'Pacific Trust', '13-3000005', 'FL', 'Miami-Dade', 'trust', 'trustee@pacifictrust.test', 'Completed trust return for done-state testing.', 'mock_user_plan_team_manager', 'Morgan Team', 1, 0, 2600000, 'demo_seed', 5, NULL, CAST(unixepoch('2026-05-01 09:49:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:55:00') * 1000 AS INTEGER), NULL);

INSERT INTO client_filing_profile
  (id, firm_id, client_id, state, counties_json, tax_types_json, is_primary, source, migration_batch_id, archived_at, created_at, updated_at)
VALUES
  ('15100000-0000-4000-8000-000000000001', 'mock_firm_plan_solo', '11000000-0000-4000-8000-000000000001', 'NY', '["Queens"]', '["federal_1065","ny_it204"]', 1, 'imported', '34000000-0000-4000-8000-000000000001', NULL, CAST(unixepoch('2026-05-01 09:35:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:42:00') * 1000 AS INTEGER)),
  ('15100000-0000-4000-8000-000000000002', 'mock_firm_plan_solo', '11000000-0000-4000-8000-000000000002', 'CA', '["Alameda"]', '["federal_1120s"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-01 09:36:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:43:00') * 1000 AS INTEGER)),
  ('15100000-0000-4000-8000-000000000003', 'mock_firm_plan_solo', '11000000-0000-4000-8000-000000000003', 'TX', '["Travis"]', '["federal_1040"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-01 09:37:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:44:00') * 1000 AS INTEGER)),
  ('15200000-0000-4000-8000-000000000001', 'mock_firm_plan_pro', '12000000-0000-4000-8000-000000000001', 'TX', '["Travis"]', '["federal_1120","tx_franchise_report"]', 1, 'imported', '35000000-0000-4000-8000-000000000001', NULL, CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER)),
  ('15200000-0000-4000-8000-000000000002', 'mock_firm_plan_pro', '12000000-0000-4000-8000-000000000002', 'CA', '["Los Angeles"]', '["federal_1065","ca_568"]', 1, 'imported', '35000000-0000-4000-8000-000000000001', NULL, CAST(unixepoch('2026-05-01 09:41:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:47:00') * 1000 AS INTEGER)),
  ('15200000-0000-4000-8000-000000000003', 'mock_firm_plan_pro', '12000000-0000-4000-8000-000000000003', 'NY', '["Queens"]', '["federal_1065"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-01 09:42:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:48:00') * 1000 AS INTEGER)),
  ('15200000-0000-4000-8000-000000000004', 'mock_firm_plan_pro', '12000000-0000-4000-8000-000000000004', 'FL', '["Orange"]', '["fl_corp_income"]', 1, 'imported', '35000000-0000-4000-8000-000000000001', NULL, CAST(unixepoch('2026-05-01 09:43:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:49:00') * 1000 AS INTEGER)),
  ('15300000-0000-4000-8000-000000000001', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000001', 'CA', '["Los Angeles"]', '["federal_1065","ca_568"]', 1, 'imported', '36000000-0000-4000-8000-000000000001', NULL, CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:51:00') * 1000 AS INTEGER)),
  ('15300000-0000-4000-8000-000000000002', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000002', 'CO', '["Denver"]', '["federal_1065","co_partnership"]', 1, 'imported', '36000000-0000-4000-8000-000000000001', NULL, CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:52:00') * 1000 AS INTEGER)),
  ('15300000-0000-4000-8000-000000000003', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000003', 'NY', '["Kings"]', '["federal_1120s"]', 1, 'imported', '36000000-0000-4000-8000-000000000001', NULL, CAST(unixepoch('2026-05-01 09:47:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:53:00') * 1000 AS INTEGER)),
  ('15300000-0000-4000-8000-000000000004', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000004', 'TX', '["Dallas"]', '["federal_1065","tx_franchise_report"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-01 09:48:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:54:00') * 1000 AS INTEGER)),
  ('15300000-0000-4000-8000-000000000005', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000005', 'FL', '["Miami-Dade"]', '["federal_1041"]', 1, 'demo_seed', NULL, NULL, CAST(unixepoch('2026-05-01 09:49:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:55:00') * 1000 AS INTEGER));

INSERT INTO obligation_instance
  (id, firm_id, client_id, tax_type, tax_year, base_due_date, current_due_date, status, extension_decision, migration_batch_id, estimated_tax_due_cents, estimated_exposure_cents, exposure_status, penalty_breakdown_json, penalty_formula_version, exposure_calculated_at, created_at, updated_at)
VALUES
  ('21000000-0000-4000-8000-000000000001', 'mock_firm_plan_solo', '11000000-0000-4000-8000-000000000001', 'ny_it204', 2026, CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), 'pending', 'not_considered', '34000000-0000-4000-8000-000000000001', 6100000, 145000, 'ready', '[{"key":"ny_partnership","label":"NY partnership exposure","amountCents":145000,"formula":"Demo estimate from imported liability"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:50:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:36:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:50:00') * 1000 AS INTEGER)),
  ('21000000-0000-4000-8000-000000000002', 'mock_firm_plan_solo', '11000000-0000-4000-8000-000000000001', 'federal_1065', 2026, CAST(unixepoch('2026-05-08 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-08 00:00:00') * 1000 AS INTEGER), 'in_progress', 'not_considered', '34000000-0000-4000-8000-000000000001', 6100000, 210000, 'ready', '[{"key":"late_filing","label":"Federal partnership exposure","amountCents":210000,"formula":"$245 x 4 partners x demo months"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:51:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:37:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:51:00') * 1000 AS INTEGER)),
  ('21000000-0000-4000-8000-000000000003', 'mock_firm_plan_solo', '11000000-0000-4000-8000-000000000002', 'federal_1120s', 2026, CAST(unixepoch('2026-05-06 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-06 00:00:00') * 1000 AS INTEGER), 'review', 'not_considered', NULL, 4200000, 150000, 'ready', '[{"key":"shareholder_penalty","label":"S corp shareholder exposure","amountCents":150000,"formula":"Shareholder count x demo rate"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:52:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:38:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:52:00') * 1000 AS INTEGER)),
  ('21000000-0000-4000-8000-000000000004', 'mock_firm_plan_solo', '11000000-0000-4000-8000-000000000003', 'federal_1040', 2026, CAST(unixepoch('2026-04-30 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-04-30 00:00:00') * 1000 AS INTEGER), 'waiting_on_client', 'not_considered', NULL, NULL, NULL, 'needs_input', '[]', NULL, NULL, CAST(unixepoch('2026-05-01 09:39:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:39:00') * 1000 AS INTEGER)),
  ('22000000-0000-4000-8000-000000000001', 'mock_firm_plan_pro', '12000000-0000-4000-8000-000000000001', 'tx_franchise_report', 2026, CAST(unixepoch('2026-05-05 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-05 00:00:00') * 1000 AS INTEGER), 'waiting_on_client', 'not_considered', '35000000-0000-4000-8000-000000000001', 16200000, 260000, 'ready', '[{"key":"tx_franchise","label":"TX franchise exposure","amountCents":260000,"formula":"Demo state estimate"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:53:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:41:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:53:00') * 1000 AS INTEGER)),
  ('22000000-0000-4000-8000-000000000002', 'mock_firm_plan_pro', '12000000-0000-4000-8000-000000000001', 'federal_1120', 2026, CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), 'pending', 'not_considered', '35000000-0000-4000-8000-000000000001', 16200000, 390000, 'ready', '[{"key":"corp_late_filing","label":"Federal corporate exposure","amountCents":390000,"formula":"Demo exposure from liability"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:53:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:42:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:53:00') * 1000 AS INTEGER)),
  ('22000000-0000-4000-8000-000000000003', 'mock_firm_plan_pro', '12000000-0000-4000-8000-000000000002', 'federal_1065', 2026, CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), 'pending', 'not_considered', '35000000-0000-4000-8000-000000000001', 7800000, 180000, 'ready', '[{"key":"late_filing","label":"Federal partnership exposure","amountCents":180000,"formula":"$245 x 5 partners x demo months"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:54:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:43:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:54:00') * 1000 AS INTEGER)),
  ('22000000-0000-4000-8000-000000000004', 'mock_firm_plan_pro', '12000000-0000-4000-8000-000000000002', 'ca_568', 2026, CAST(unixepoch('2026-05-04 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 00:00:00') * 1000 AS INTEGER), 'in_progress', 'not_considered', '35000000-0000-4000-8000-000000000001', 7800000, 90000, 'ready', '[{"key":"ca_568","label":"CA LLC exposure","amountCents":90000,"formula":"Demo state estimate"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:54:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:44:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:54:00') * 1000 AS INTEGER)),
  ('22000000-0000-4000-8000-000000000005', 'mock_firm_plan_pro', '12000000-0000-4000-8000-000000000003', 'federal_1065', 2026, CAST(unixepoch('2026-05-03 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 00:00:00') * 1000 AS INTEGER), 'review', 'not_considered', NULL, 9900000, 320000, 'ready', '[{"key":"late_filing","label":"Partnership same-day exposure","amountCents":320000,"formula":"$245 x 7 partners x demo months"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:55:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:55:00') * 1000 AS INTEGER)),
  ('22000000-0000-4000-8000-000000000006', 'mock_firm_plan_pro', '12000000-0000-4000-8000-000000000004', 'fl_corp_income', 2026, CAST(unixepoch('2026-05-06 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-06 00:00:00') * 1000 AS INTEGER), 'pending', 'not_considered', '35000000-0000-4000-8000-000000000001', 4200000, NULL, 'unsupported', '[]', NULL, NULL, CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:46:00') * 1000 AS INTEGER)),
  ('23000000-0000-4000-8000-000000000001', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000001', 'federal_1065', 2026, CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-15 00:00:00') * 1000 AS INTEGER), 'pending', 'not_considered', '36000000-0000-4000-8000-000000000001', 24500000, 520000, 'ready', '[{"key":"late_filing","label":"Large LLC partnership exposure","amountCents":520000,"formula":"$245 x 8 partners x demo months"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:56:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:47:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:56:00') * 1000 AS INTEGER)),
  ('23000000-0000-4000-8000-000000000002', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000001', 'ca_568', 2026, CAST(unixepoch('2026-05-07 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-07 00:00:00') * 1000 AS INTEGER), 'in_progress', 'not_considered', '36000000-0000-4000-8000-000000000001', 24500000, 130000, 'ready', '[{"key":"ca_568","label":"CA LLC exposure","amountCents":130000,"formula":"Demo state estimate"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:56:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:48:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:56:00') * 1000 AS INTEGER)),
  ('23000000-0000-4000-8000-000000000003', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000002', 'federal_1065', 2026, CAST(unixepoch('2026-05-02 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-02 00:00:00') * 1000 AS INTEGER), 'waiting_on_client', 'not_considered', '36000000-0000-4000-8000-000000000001', 13500000, 280000, 'ready', '[{"key":"late_filing","label":"Partner return exposure","amountCents":280000,"formula":"$245 x 9 partners x demo months"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:57:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:49:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:57:00') * 1000 AS INTEGER)),
  ('23000000-0000-4000-8000-000000000004', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000002', 'co_partnership', 2026, CAST(unixepoch('2026-05-20 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-20 00:00:00') * 1000 AS INTEGER), 'pending', 'not_considered', '36000000-0000-4000-8000-000000000001', 13500000, NULL, 'unsupported', '[]', NULL, NULL, CAST(unixepoch('2026-05-01 09:50:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:50:00') * 1000 AS INTEGER)),
  ('23000000-0000-4000-8000-000000000005', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000003', 'federal_1120s', 2026, CAST(unixepoch('2026-05-06 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-06 00:00:00') * 1000 AS INTEGER), 'review', 'not_considered', '36000000-0000-4000-8000-000000000001', 8400000, 190000, 'ready', '[{"key":"shareholder_penalty","label":"S corp shareholder exposure","amountCents":190000,"formula":"Shareholder count x demo rate"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:57:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:51:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:57:00') * 1000 AS INTEGER)),
  ('23000000-0000-4000-8000-000000000006', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000004', 'tx_franchise_report', 2026, CAST(unixepoch('2026-05-03 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 00:00:00') * 1000 AS INTEGER), 'pending', 'not_considered', NULL, NULL, NULL, 'needs_input', '[]', NULL, NULL, CAST(unixepoch('2026-05-01 09:52:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:52:00') * 1000 AS INTEGER)),
  ('23000000-0000-4000-8000-000000000007', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000005', 'federal_1041', 2026, CAST(unixepoch('2026-05-09 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-09 00:00:00') * 1000 AS INTEGER), 'done', 'not_considered', NULL, 2600000, 0, 'ready', '[{"key":"closed","label":"Completed before exposure accrued","amountCents":0,"formula":"Marked done"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:57:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:53:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:57:00') * 1000 AS INTEGER)),
  ('23000000-0000-4000-8000-000000000008', 'mock_firm_plan_team', '13000000-0000-4000-8000-000000000004', 'federal_1065', 2026, CAST(unixepoch('2026-05-30 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-30 00:00:00') * 1000 AS INTEGER), 'pending', 'not_considered', NULL, NULL, 110000, 'ready', '[{"key":"late_filing","label":"Longer horizon partnership exposure","amountCents":110000,"formula":"Demo estimate"}]', 'penalty-v1', CAST(unixepoch('2026-05-01 09:58:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:54:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:58:00') * 1000 AS INTEGER));

INSERT INTO pulse_firm_alert
  (id, pulse_id, firm_id, status, matched_count, needs_review_count, dismissed_by, dismissed_at, snoozed_until, created_at, updated_at)
VALUES
  ('41000000-0000-4000-8000-000000001001', '40000000-0000-4000-8000-000000000003', 'mock_firm_plan_solo', 'matched', 1, 0, NULL, NULL, NULL, CAST(unixepoch('2026-05-01 09:58:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:58:00') * 1000 AS INTEGER)),
  ('41000000-0000-4000-8000-000000002001', '40000000-0000-4000-8000-000000000001', 'mock_firm_plan_pro', 'matched', 1, 0, NULL, NULL, NULL, CAST(unixepoch('2026-05-01 09:59:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 09:59:00') * 1000 AS INTEGER)),
  ('41000000-0000-4000-8000-000000003001', '40000000-0000-4000-8000-000000000001', 'mock_firm_plan_team', 'matched', 1, 0, NULL, NULL, NULL, CAST(unixepoch('2026-05-01 10:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 10:00:00') * 1000 AS INTEGER));

INSERT INTO ai_output
  (id, firm_id, user_id, kind, prompt_version, model, input_context_ref, input_hash, output_text, citations_json, guard_result, refusal_code, generated_at, tokens_in, tokens_out, latency_ms, cost_usd)
VALUES
  ('50000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', 'mock_user_plan_solo', 'brief', 'dashboard-brief@v1', 'openai/gpt-5-mini', 'dashboard:mock_firm_plan_solo:2026-05-03', 'mockhash-plan-solo-dashboard-2026-05-03', 'Three Solo deadlines need attention: Maple has a NY partnership Pulse match, Cedar is in review, and North Loop needs client input before exposure can be calculated.', '[{"ref":1,"obligationId":"21000000-0000-4000-8000-000000000001","evidence":{"id":"52000000-0000-4000-8000-000000001001","sourceType":"verified_rule","sourceId":"ny-it204-demo-rule","sourceUrl":"https://www.tax.ny.gov/"}}]', 'allowed', NULL, CAST(unixepoch('2026-05-03 09:00:00') * 1000 AS INTEGER), 990, 126, 870, 0.006),
  ('50000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', 'mock_user_plan_pro', 'brief', 'dashboard-brief@v1', 'openai/gpt-5-mini', 'dashboard:mock_firm_plan_pro:2026-05-03', 'mockhash-plan-pro-dashboard-2026-05-03', 'Priya has six Pro obligations open. Harborview is due today, Beacon is waiting on a Texas workpaper, and Willow is eligible for the IRS Los Angeles Pulse review.', '[{"ref":1,"obligationId":"22000000-0000-4000-8000-000000000005","evidence":{"id":"52000000-0000-4000-8000-000000002001","sourceType":"ai_mapper","sourceId":"35000000-0000-4000-8000-000000000001","sourceUrl":null}}]', 'allowed', NULL, CAST(unixepoch('2026-05-03 09:05:00') * 1000 AS INTEGER), 1240, 148, 910, 0.008),
  ('50000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', 'mock_user_plan_team', 'brief', 'dashboard-brief@v1', 'openai/gpt-5-mini', 'dashboard:mock_firm_plan_team:2026-05-03', 'mockhash-plan-team-dashboard-2026-05-03', 'Taylor has a full Team workload: Alpine is overdue and waiting on client input, Summit is unassigned with missing exposure input, and Redwood is the largest Pulse-eligible deadline.', '[{"ref":1,"obligationId":"23000000-0000-4000-8000-000000000001","evidence":{"id":"52000000-0000-4000-8000-000000003001","sourceType":"default_inference_by_entity_state","sourceId":"default-matrix-v1","sourceUrl":null}}]', 'allowed', NULL, CAST(unixepoch('2026-05-03 09:10:00') * 1000 AS INTEGER), 1510, 172, 1030, 0.011);

INSERT INTO dashboard_brief
  (id, firm_id, user_id, scope, as_of_date, status, input_hash, ai_output_id, summary_text, top_obligation_ids_json, citations_json, reason, error_code, generated_at, expires_at, created_at, updated_at)
VALUES
  ('51000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', NULL, 'firm', '2026-05-03', 'ready', 'mockhash-plan-solo-dashboard-2026-05-03', '50000000-0000-4000-8000-000000001001', 'Three Solo deadlines need attention: Maple has a NY partnership Pulse match, Cedar is in review, and North Loop needs client input before exposure can be calculated.', '["21000000-0000-4000-8000-000000000001","21000000-0000-4000-8000-000000000003","21000000-0000-4000-8000-000000000004"]', '[{"ref":1,"obligationId":"21000000-0000-4000-8000-000000000001","evidence":{"id":"52000000-0000-4000-8000-000000001001","sourceType":"verified_rule","sourceId":"ny-it204-demo-rule","sourceUrl":"https://www.tax.ny.gov/"}}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-03 09:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 09:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 08:59:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:00:00') * 1000 AS INTEGER)),
  ('51000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', NULL, 'firm', '2026-05-03', 'ready', 'mockhash-plan-pro-dashboard-2026-05-03', '50000000-0000-4000-8000-000000002001', 'Priya has six Pro obligations open. Harborview is due today, Beacon is waiting on a Texas workpaper, and Willow is eligible for the IRS Los Angeles Pulse review.', '["22000000-0000-4000-8000-000000000005","22000000-0000-4000-8000-000000000001","22000000-0000-4000-8000-000000000003"]', '[{"ref":1,"obligationId":"22000000-0000-4000-8000-000000000005","evidence":{"id":"52000000-0000-4000-8000-000000002001","sourceType":"ai_mapper","sourceId":"35000000-0000-4000-8000-000000000001","sourceUrl":null}}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-03 09:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 09:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:04:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:05:00') * 1000 AS INTEGER)),
  ('51000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', NULL, 'firm', '2026-05-03', 'ready', 'mockhash-plan-team-dashboard-2026-05-03', '50000000-0000-4000-8000-000000003001', 'Taylor has a full Team workload: Alpine is overdue and waiting on client input, Summit is unassigned with missing exposure input, and Redwood is the largest Pulse-eligible deadline.', '["23000000-0000-4000-8000-000000000003","23000000-0000-4000-8000-000000000006","23000000-0000-4000-8000-000000000001"]', '[{"ref":1,"obligationId":"23000000-0000-4000-8000-000000000001","evidence":{"id":"52000000-0000-4000-8000-000000003001","sourceType":"default_inference_by_entity_state","sourceId":"default-matrix-v1","sourceUrl":null}}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-03 09:10:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 09:10:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:09:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:10:00') * 1000 AS INTEGER));

INSERT INTO evidence_link
  (id, firm_id, obligation_instance_id, ai_output_id, source_type, source_id, source_url, verbatim_quote, raw_value, normalized_value, confidence, model, matrix_version, verified_at, verified_by, applied_at, applied_by)
VALUES
  ('52000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', '21000000-0000-4000-8000-000000000001', NULL, 'verified_rule', 'ny-it204-demo-rule', 'https://www.tax.ny.gov/', 'NY partnership return deadline follows the demo rule pack.', 'ny_it204 / 2026', 'ny_it204 / 2026-05-15', 0.93, NULL, 'rules-mvp', CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER), 'mock_user_plan_solo', CAST(unixepoch('2026-05-01 09:42:00') * 1000 AS INTEGER), 'mock_user_plan_solo'),
  ('52000000-0000-4000-8000-000000001002', 'mock_firm_plan_solo', '21000000-0000-4000-8000-000000000004', NULL, 'user_override', 'mock_user_plan_solo', NULL, 'Client asked for help collecting organizer documents.', 'pending', 'waiting_on_client', 1.0, NULL, NULL, CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), 'mock_user_plan_solo', CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), 'mock_user_plan_solo'),
  ('52000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', '22000000-0000-4000-8000-000000000001', NULL, 'ai_mapper', '35000000-0000-4000-8000-000000000001', NULL, 'QuickBooks tax form column mapped to TX franchise report.', 'Texas Franchise', 'tx_franchise_report', 0.96, 'openai/gpt-5-mini', NULL, CAST(unixepoch('2026-05-01 09:37:00') * 1000 AS INTEGER), 'mock_user_plan_pro', CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER), 'mock_user_plan_pro'),
  ('52000000-0000-4000-8000-000000002002', 'mock_firm_plan_pro', '22000000-0000-4000-8000-000000000003', NULL, 'default_inference_by_entity_state', 'default-matrix-v1', NULL, 'Federal partnership due date inferred from LLC entity and tax year.', 'llc / CA / 2026', 'federal_1065 / 2026-05-15', 1.0, NULL, 'default-matrix-v1.0', CAST(unixepoch('2026-05-01 09:41:00') * 1000 AS INTEGER), 'mock_user_plan_pro_preparer', CAST(unixepoch('2026-05-01 09:43:00') * 1000 AS INTEGER), 'mock_user_plan_pro_preparer'),
  ('52000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', '23000000-0000-4000-8000-000000000001', NULL, 'default_inference_by_entity_state', 'default-matrix-v1', NULL, 'Federal partnership due date inferred from LLC entity and tax year.', 'llc / CA / 2026', 'federal_1065 / 2026-05-15', 1.0, NULL, 'default-matrix-v1.0', CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER), 'mock_user_plan_team_manager', CAST(unixepoch('2026-05-01 09:47:00') * 1000 AS INTEGER), 'mock_user_plan_team_manager'),
  ('52000000-0000-4000-8000-000000003002', 'mock_firm_plan_team', '23000000-0000-4000-8000-000000000006', NULL, 'user_override', 'mock_user_plan_team', NULL, 'Owner flagged this unassigned Texas deadline for exposure input.', 'unassigned', 'needs_input', 1.0, NULL, NULL, CAST(unixepoch('2026-05-01 09:50:00') * 1000 AS INTEGER), 'mock_user_plan_team', CAST(unixepoch('2026-05-01 09:52:00') * 1000 AS INTEGER), 'mock_user_plan_team');

INSERT INTO ai_insight_cache
  (id, firm_id, kind, subject_type, subject_id, as_of_date, status, input_hash, ai_output_id, output_json, citations_json, reason, error_code, generated_at, expires_at, created_at, updated_at)
VALUES
  ('70000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', 'client_risk_summary', 'client', '11000000-0000-4000-8000-000000000001', '2026-05-03', 'ready', 'demo-plan-solo-client-maple', NULL, '{"sections":[{"key":"risk","label":"Risk","text":"Maple has a NY partnership deadline, imported liability, and recent late-filing history.","citationRefs":[1]},{"key":"next_step","label":"Next step","text":"Review the NY source and decide whether the Pulse alert should stay matched.","citationRefs":[1]}]}', '[{"ref":1,"obligationId":"21000000-0000-4000-8000-000000000001","evidence":{"id":"52000000-0000-4000-8000-000000001001","sourceType":"verified_rule","sourceId":"ny-it204-demo-rule","sourceUrl":"https://www.tax.ny.gov/"}}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-03 09:15:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 09:15:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:15:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:15:00') * 1000 AS INTEGER)),
  ('70000000-0000-4000-8000-000000001002', 'mock_firm_plan_solo', 'deadline_tip', 'obligation', '21000000-0000-4000-8000-000000000004', '2026-05-03', 'ready', 'demo-plan-solo-deadline-north-loop', NULL, '{"sections":[{"key":"what","label":"What","text":"North Loop is overdue and still waiting on client readiness input.","citationRefs":[1]},{"key":"prepare","label":"Prepare","text":"Use the readiness request and organizer checklist before changing status.","citationRefs":[1]}]}', '[{"ref":1,"obligationId":"21000000-0000-4000-8000-000000000004","evidence":{"id":"52000000-0000-4000-8000-000000001002","sourceType":"user_override","sourceId":"mock_user_plan_solo","sourceUrl":null}}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-03 09:16:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 09:16:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:16:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:16:00') * 1000 AS INTEGER)),
  ('70000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', 'client_risk_summary', 'client', '12000000-0000-4000-8000-000000000001', '2026-05-03', 'ready', 'demo-plan-pro-client-beacon', NULL, '{"sections":[{"key":"risk","label":"Risk","text":"Beacon carries the highest Pro exposure and is waiting on the Texas franchise workpaper.","citationRefs":[1]},{"key":"next_step","label":"Next step","text":"Follow up with the client before moving the deadline out of waiting.","citationRefs":[1]}]}', '[{"ref":1,"obligationId":"22000000-0000-4000-8000-000000000001","evidence":{"id":"52000000-0000-4000-8000-000000002001","sourceType":"ai_mapper","sourceId":"35000000-0000-4000-8000-000000000001","sourceUrl":null}}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-03 09:20:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 09:20:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:20:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:20:00') * 1000 AS INTEGER)),
  ('70000000-0000-4000-8000-000000002002', 'mock_firm_plan_pro', 'deadline_tip', 'obligation', '22000000-0000-4000-8000-000000000005', '2026-05-03', 'ready', 'demo-plan-pro-deadline-harborview', NULL, '{"sections":[{"key":"what","label":"What","text":"Harborview is due today and unassigned, so it should stay high in Priya Pro triage.","citationRefs":[1]},{"key":"prepare","label":"Prepare","text":"Assign an owner and verify partnership owner count before filing.","citationRefs":[1]}]}', '[{"ref":1,"obligationId":"22000000-0000-4000-8000-000000000005","evidence":null}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-03 09:21:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 09:21:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:21:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:21:00') * 1000 AS INTEGER)),
  ('70000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', 'client_risk_summary', 'client', '13000000-0000-4000-8000-000000000001', '2026-05-03', 'ready', 'demo-plan-team-client-redwood', NULL, '{"sections":[{"key":"risk","label":"Risk","text":"Redwood is the largest Team exposure and matches the IRS Los Angeles Pulse alert.","citationRefs":[1]},{"key":"next_step","label":"Next step","text":"Owner or manager should review Pulse eligibility before applying relief.","citationRefs":[1]}]}', '[{"ref":1,"obligationId":"23000000-0000-4000-8000-000000000001","evidence":{"id":"52000000-0000-4000-8000-000000003001","sourceType":"default_inference_by_entity_state","sourceId":"default-matrix-v1","sourceUrl":null}}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-03 09:25:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 09:25:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:25:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:25:00') * 1000 AS INTEGER)),
  ('70000000-0000-4000-8000-000000003002', 'mock_firm_plan_team', 'deadline_tip', 'obligation', '23000000-0000-4000-8000-000000000006', '2026-05-03', 'ready', 'demo-plan-team-deadline-summit', NULL, '{"sections":[{"key":"what","label":"What","text":"Summit is due today, unassigned, and missing exposure input.","citationRefs":[1]},{"key":"prepare","label":"Prepare","text":"Assign an owner before sending the reminder so Team workload pressure resolves cleanly.","citationRefs":[1]}]}', '[{"ref":1,"obligationId":"23000000-0000-4000-8000-000000000006","evidence":{"id":"52000000-0000-4000-8000-000000003002","sourceType":"user_override","sourceId":"mock_user_plan_team","sourceUrl":null}}]', 'demo_seed', NULL, CAST(unixepoch('2026-05-03 09:26:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-04 09:26:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:26:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:26:00') * 1000 AS INTEGER));

INSERT INTO audit_evidence_package
  (id, firm_id, exported_by_user_id, scope, scope_entity_id, range_start, range_end, file_count, file_manifest_json, sha256_hash, r2_key, status, expires_at, failure_reason, created_at, updated_at)
VALUES
  ('61000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', 'mock_user_plan_solo', 'firm', NULL, CAST(unixepoch('2026-05-01 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 10:00:00') * 1000 AS INTEGER), 3, '[{"path":"audit/events.json","bytes":1320},{"path":"evidence/links.json","bytes":980},{"path":"manifest.json","bytes":420}]', 'mocksha256plansolo', 'mock/audit/plan-solo-preview.zip', 'ready', CAST(unixepoch('2026-05-10 10:00:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-03 09:30:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:31:00') * 1000 AS INTEGER)),
  ('61000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', 'mock_user_plan_pro', 'firm', NULL, CAST(unixepoch('2026-05-01 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 10:00:00') * 1000 AS INTEGER), 4, '[{"path":"audit/events.json","bytes":2100},{"path":"evidence/links.json","bytes":1400},{"path":"migration/batches.json","bytes":900},{"path":"manifest.json","bytes":460}]', 'mocksha256planpro', 'mock/audit/plan-pro-preview.zip', 'ready', CAST(unixepoch('2026-05-10 10:00:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-03 09:32:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:33:00') * 1000 AS INTEGER)),
  ('61000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', 'mock_user_plan_team', 'firm', NULL, CAST(unixepoch('2026-05-01 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 10:00:00') * 1000 AS INTEGER), 5, '[{"path":"audit/events.json","bytes":2600},{"path":"evidence/links.json","bytes":1800},{"path":"pulse/applications.json","bytes":700},{"path":"workload/owners.json","bytes":640},{"path":"manifest.json","bytes":500}]', 'mocksha256planteam', 'mock/audit/plan-team-preview.zip', 'ready', CAST(unixepoch('2026-05-10 10:00:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-03 09:34:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:35:00') * 1000 AS INTEGER));

INSERT INTO audit_event
  (id, firm_id, actor_id, entity_type, entity_id, action, before_json, after_json, reason, ip_hash, user_agent_hash, created_at)
VALUES
  ('60000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', 'mock_user_plan_solo', 'migration_batch', '34000000-0000-4000-8000-000000000001', 'migration.imported', NULL, '{"successCount":2,"skippedCount":1}', 'Seeded Solo plan client import.', 'iphash_plan_solo', 'uahash_plan_solo', CAST(unixepoch('2026-05-01 09:35:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000001002', 'mock_firm_plan_solo', 'mock_user_plan_solo', 'obligation_instance', '21000000-0000-4000-8000-000000000003', 'obligation.readiness.updated', '{"readiness":"ready"}', '{"readiness":"needs_review"}', 'Owner requested review before filing.', 'iphash_plan_solo', 'uahash_plan_solo', CAST(unixepoch('2026-05-01 09:52:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000001003', 'mock_firm_plan_solo', 'mock_user_plan_solo', 'audit_evidence_package', '61000000-0000-4000-8000-000000001001', 'export.audit_package.ready', NULL, '{"scope":"firm","fileCount":3}', NULL, 'iphash_plan_solo', 'uahash_plan_solo', CAST(unixepoch('2026-05-03 09:31:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', 'mock_user_plan_pro', 'migration_batch', '35000000-0000-4000-8000-000000000001', 'migration.imported', NULL, '{"successCount":4,"skippedCount":0}', 'Seeded Pro plan QuickBooks import.', 'iphash_plan_pro', 'uahash_plan_pro', CAST(unixepoch('2026-05-01 09:40:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000002002', 'mock_firm_plan_pro', 'mock_user_plan_pro_preparer', 'obligation_instance', '22000000-0000-4000-8000-000000000001', 'obligation.status.updated', '{"status":"pending"}', '{"status":"waiting_on_client"}', 'Waiting on Texas franchise workpaper.', 'iphash_plan_pro', 'uahash_plan_pro', CAST(unixepoch('2026-05-01 09:55:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000002003', 'mock_firm_plan_pro', 'mock_user_plan_pro', 'member_invitation', 'mock_invitation_plan_pro_bookkeeper', 'member.invited', NULL, '{"email":"bookkeeper.pro@duedatehq.test","role":"coordinator"}', NULL, 'iphash_plan_pro', 'uahash_plan_pro', CAST(unixepoch('2026-05-01 09:56:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', 'mock_user_plan_team_manager', 'migration_batch', '36000000-0000-4000-8000-000000000001', 'migration.imported', NULL, '{"successCount":5,"skippedCount":0}', 'Seeded Team plan integration import.', 'iphash_plan_team', 'uahash_plan_team', CAST(unixepoch('2026-05-01 09:45:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000003002', 'mock_firm_plan_team', 'mock_user_plan_team', 'client', '13000000-0000-4000-8000-000000000004', 'penalty.override', '{"estimatedTaxLiabilityCents":null}', '{"estimatedTaxLiabilityCents":null,"needsInput":true}', 'Owner flagged missing exposure input for team triage.', 'iphash_plan_team', 'uahash_plan_team', CAST(unixepoch('2026-05-01 09:52:00') * 1000 AS INTEGER)),
  ('60000000-0000-4000-8000-000000003003', 'mock_firm_plan_team', 'mock_user_plan_team', 'audit_evidence_package', '61000000-0000-4000-8000-000000003001', 'export.audit_package.ready', NULL, '{"scope":"firm","fileCount":5}', NULL, 'iphash_plan_team', 'uahash_plan_team', CAST(unixepoch('2026-05-03 09:35:00') * 1000 AS INTEGER));

INSERT INTO email_outbox
  (id, firm_id, external_id, type, status, payload_json, created_at, sent_at, failed_at, failure_reason)
VALUES
  ('62000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', 'mock-email-plan-solo-readiness-2026-05-03', 'readiness_request', 'sent', '{"requestId":"69000000-0000-4000-8000-000000001001","clientId":"11000000-0000-4000-8000-000000000003"}', CAST(unixepoch('2026-05-03 09:36:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:37:00') * 1000 AS INTEGER), NULL, NULL),
  ('62000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', 'mock-email-plan-pro-client-reminder-2026-05-03', 'client_deadline_reminder', 'pending', '{"clientId":"12000000-0000-4000-8000-000000000001","obligationId":"22000000-0000-4000-8000-000000000001"}', CAST(unixepoch('2026-05-03 09:38:00') * 1000 AS INTEGER), NULL, NULL, NULL),
  ('62000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', 'mock-email-plan-team-audit-package-2026-05-03', 'audit_evidence_package_ready', 'sent', '{"packageId":"61000000-0000-4000-8000-000000003001","fileCount":5}', CAST(unixepoch('2026-05-03 09:39:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:40:00') * 1000 AS INTEGER), NULL, NULL);

INSERT INTO in_app_notification
  (id, firm_id, user_id, type, entity_type, entity_id, title, body, href, metadata_json, read_at, created_at)
VALUES
  ('63000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', 'mock_user_plan_solo', 'deadline_reminder', 'obligation_instance', '21000000-0000-4000-8000-000000000004', 'North Loop is overdue', 'Client readiness input is still missing for the Solo demo queue.', '/obligations?search=North%20Loop', '{"severity":"critical"}', NULL, CAST(unixepoch('2026-05-03 09:41:00') * 1000 AS INTEGER)),
  ('63000000-0000-4000-8000-000000001002', 'mock_firm_plan_solo', 'mock_user_plan_solo', 'pulse_alert', 'pulse_firm_alert', '41000000-0000-4000-8000-000000001001', 'NY Pulse match is available', 'Maple Advisory Partners matches the seeded NY DTF advisory.', '/alerts', '{"matchedCount":1}', NULL, CAST(unixepoch('2026-05-03 09:40:00') * 1000 AS INTEGER)),
  ('63000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', 'mock_user_plan_pro', 'deadline_reminder', 'obligation_instance', '22000000-0000-4000-8000-000000000005', 'Harborview is due today', 'Assign an owner before closing the Pro review queue.', '/obligations?search=Harborview', '{"severity":"critical"}', NULL, CAST(unixepoch('2026-05-03 09:43:00') * 1000 AS INTEGER)),
  ('63000000-0000-4000-8000-000000002002', 'mock_firm_plan_pro', 'mock_user_plan_pro', 'pulse_alert', 'pulse_firm_alert', '41000000-0000-4000-8000-000000002001', 'Willow is Pulse eligible', 'IRS disaster relief matches Willow Family Office in Los Angeles County.', '/alerts', '{"matchedCount":1}', CAST(unixepoch('2026-05-03 10:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:42:00') * 1000 AS INTEGER)),
  ('63000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', 'mock_user_plan_team', 'overdue', 'obligation_instance', '23000000-0000-4000-8000-000000000003', 'Alpine is overdue', 'Casey is waiting on partner confirmations for the Team workload.', '/obligations?search=Alpine', '{"severity":"critical"}', NULL, CAST(unixepoch('2026-05-03 09:45:00') * 1000 AS INTEGER)),
  ('63000000-0000-4000-8000-000000003002', 'mock_firm_plan_team', 'mock_user_plan_team', 'audit_package_ready', 'audit_evidence_package', '61000000-0000-4000-8000-000000003001', 'Team audit package is ready', 'The Team plan preview evidence package is ready for review.', '/audit', '{"fileCount":5}', NULL, CAST(unixepoch('2026-05-03 09:44:00') * 1000 AS INTEGER));

INSERT INTO notification_preference
  (id, firm_id, user_id, email_enabled, in_app_enabled, reminders_enabled, pulse_enabled, unassigned_reminders_enabled, created_at, updated_at)
VALUES
  ('64000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', 'mock_user_plan_solo', 1, 1, 1, 1, 1, CAST(unixepoch('2026-05-01 08:40:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:40:00') * 1000 AS INTEGER)),
  ('64000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', 'mock_user_plan_pro', 1, 1, 1, 1, 1, CAST(unixepoch('2026-05-01 08:41:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:41:00') * 1000 AS INTEGER)),
  ('64000000-0000-4000-8000-000000002002', 'mock_firm_plan_pro', 'mock_user_plan_pro_preparer', 1, 1, 1, 1, 1, CAST(unixepoch('2026-05-01 08:42:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:42:00') * 1000 AS INTEGER)),
  ('64000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', 'mock_user_plan_team', 1, 1, 1, 1, 1, CAST(unixepoch('2026-05-01 08:43:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:43:00') * 1000 AS INTEGER)),
  ('64000000-0000-4000-8000-000000003002', 'mock_firm_plan_team', 'mock_user_plan_team_manager', 1, 1, 1, 1, 1, CAST(unixepoch('2026-05-01 08:44:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-01 08:44:00') * 1000 AS INTEGER));

INSERT INTO reminder
  (id, firm_id, obligation_instance_id, client_id, recipient_kind, recipient_user_id, recipient_email, channel, offset_days, scheduled_for, status, email_outbox_id, notification_id, dedupe_key, sent_at, clicked_at, failure_reason, created_at)
VALUES
  ('65000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', '21000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000003', 'member', 'mock_user_plan_solo', NULL, 'in_app', 0, '2026-05-03', 'sent', NULL, '63000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo:21000000-0000-4000-8000-000000000004:owner:0:in_app', CAST(unixepoch('2026-05-03 09:41:00') * 1000 AS INTEGER), NULL, NULL, CAST(unixepoch('2026-05-03 09:35:00') * 1000 AS INTEGER)),
  ('65000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', '22000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'client', NULL, 'tax@beaconrobotics.test', 'email', 2, '2026-05-03', 'queued', '62000000-0000-4000-8000-000000002001', NULL, 'mock_firm_plan_pro:22000000-0000-4000-8000-000000000001:client:2:email', NULL, NULL, NULL, CAST(unixepoch('2026-05-03 09:36:00') * 1000 AS INTEGER)),
  ('65000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', '23000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000002', 'member', 'mock_user_plan_team', NULL, 'in_app', 1, '2026-05-01', 'sent', NULL, '63000000-0000-4000-8000-000000003001', 'mock_firm_plan_team:23000000-0000-4000-8000-000000000003:owner:1:in_app', CAST(unixepoch('2026-05-03 09:45:00') * 1000 AS INTEGER), NULL, NULL, CAST(unixepoch('2026-05-03 09:37:00') * 1000 AS INTEGER));

INSERT INTO client_readiness_request
  (id, firm_id, obligation_instance_id, client_id, created_by_user_id, recipient_email, token_hash, status, checklist_json, expires_at, sent_at, first_opened_at, last_responded_at, created_at, updated_at)
VALUES
  ('69000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', '21000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000003', 'mock_user_plan_solo', 'owner@northloop.test', 'mock_readiness_hash_plan_solo_1', 'responded', '[{"id":"organizer","label":"Organizer complete","description":"Confirm organizer packet is complete.","reason":"Needed before filing.","sourceHint":"Client portal"},{"id":"signature","label":"Signature authorization","description":"Confirm e-signature authorization.","reason":"Required for filing.","sourceHint":"Readiness portal"}]', CAST(unixepoch('2026-05-10 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:36:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:50:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 10:05:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:36:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 10:05:00') * 1000 AS INTEGER)),
  ('69000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', '22000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'mock_user_plan_pro', 'tax@beaconrobotics.test', 'mock_readiness_hash_plan_pro_1', 'opened', '[{"id":"workpaper","label":"Texas franchise workpaper","description":"Upload the final apportionment workpaper.","reason":"Required to finish exposure review.","sourceHint":"Client email"},{"id":"payment","label":"Payment authorization","description":"Confirm payment approval.","reason":"Needed before filing.","sourceHint":"Client portal"}]', CAST(unixepoch('2026-05-10 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:38:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:55:00') * 1000 AS INTEGER), NULL, CAST(unixepoch('2026-05-03 09:38:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:55:00') * 1000 AS INTEGER)),
  ('69000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', '23000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000002', 'mock_user_plan_team_manager', 'admin@alpinedental.test', 'mock_readiness_hash_plan_team_1', 'responded', '[{"id":"k1","label":"Partner confirmations","description":"Confirm all partner K-1 packets are received.","reason":"Needed before review.","sourceHint":"Karbon task"},{"id":"review","label":"Manager review","description":"Confirm manager review is complete.","reason":"Required before filing.","sourceHint":"Workpaper binder"}]', CAST(unixepoch('2026-05-10 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:39:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:51:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 10:08:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 09:39:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 10:08:00') * 1000 AS INTEGER));

INSERT INTO client_readiness_response
  (id, firm_id, request_id, obligation_instance_id, item_id, status, note, eta_date, created_at)
VALUES
  ('69100000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', '69000000-0000-4000-8000-000000001001', '21000000-0000-4000-8000-000000000004', 'organizer', 'need_help', 'Need Sofia to confirm two missing income lines.', CAST(unixepoch('2026-05-05 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 10:05:00') * 1000 AS INTEGER)),
  ('69100000-0000-4000-8000-000000001002', 'mock_firm_plan_solo', '69000000-0000-4000-8000-000000001001', '21000000-0000-4000-8000-000000000004', 'signature', 'ready', NULL, NULL, CAST(unixepoch('2026-05-03 10:06:00') * 1000 AS INTEGER)),
  ('69100000-0000-4000-8000-000000003001', 'mock_firm_plan_team', '69000000-0000-4000-8000-000000003001', '23000000-0000-4000-8000-000000000003', 'k1', 'not_yet', 'Two partner confirmations are still pending.', CAST(unixepoch('2026-05-04 00:00:00') * 1000 AS INTEGER), CAST(unixepoch('2026-05-03 10:08:00') * 1000 AS INTEGER)),
  ('69100000-0000-4000-8000-000000003002', 'mock_firm_plan_team', '69000000-0000-4000-8000-000000003001', '23000000-0000-4000-8000-000000000003', 'review', 'ready', 'Manager review completed after client call.', NULL, CAST(unixepoch('2026-05-03 10:09:00') * 1000 AS INTEGER));

INSERT INTO client_email_suppression
  (id, firm_id, email, token_hash, reason, created_at)
VALUES
  ('66000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', 'former-contact@mapleadvisory.test', 'mock_token_hash_plan_solo_old_client', 'manual', CAST(unixepoch('2026-05-01 09:00:00') * 1000 AS INTEGER)),
  ('66000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', 'old-tax@beaconrobotics.test', 'mock_token_hash_plan_pro_old_client', 'bounce', CAST(unixepoch('2026-05-01 09:01:00') * 1000 AS INTEGER)),
  ('66000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', 'legacy@alpinedental.test', 'mock_token_hash_plan_team_old_client', 'unsubscribe', CAST(unixepoch('2026-05-01 09:02:00') * 1000 AS INTEGER));

INSERT INTO llm_log
  (id, firm_id, user_id, prompt_version, model, input_hash, input_tokens, output_tokens, latency_ms, cost_usd, guard_result, refusal_code, success, error_msg, created_at)
VALUES
  ('67000000-0000-4000-8000-000000001001', 'mock_firm_plan_solo', 'mock_user_plan_solo', 'dashboard-brief@v1', 'openai/gpt-5-mini', 'mockhash-plan-solo-dashboard-2026-05-03', 990, 126, 870, 0.006, 'allowed', NULL, 1, NULL, CAST(unixepoch('2026-05-03 09:00:00') * 1000 AS INTEGER)),
  ('67000000-0000-4000-8000-000000002001', 'mock_firm_plan_pro', 'mock_user_plan_pro', 'dashboard-brief@v1', 'openai/gpt-5-mini', 'mockhash-plan-pro-dashboard-2026-05-03', 1240, 148, 910, 0.008, 'allowed', NULL, 1, NULL, CAST(unixepoch('2026-05-03 09:05:00') * 1000 AS INTEGER)),
  ('67000000-0000-4000-8000-000000003001', 'mock_firm_plan_team', 'mock_user_plan_team', 'dashboard-brief@v1', 'openai/gpt-5-mini', 'mockhash-plan-team-dashboard-2026-05-03', 1510, 172, 1030, 0.011, 'allowed', NULL, 1, NULL, CAST(unixepoch('2026-05-03 09:10:00') * 1000 AS INTEGER));

-- K-1 dependency demo (PDF anti-pattern #4): Lakeview Medical Partners'
-- federal 1120-S waits on Brightline's federal 1065 K-1. When the
-- parent (#001) reaches `completed`, the child auto-unblocks.
UPDATE obligation_instance
SET
  status = 'blocked',
  blocked_by_obligation_instance_id = '20000000-0000-4000-8000-000000000001'
WHERE id = '20000000-0000-4000-8000-000000000020';

-- Rejection demo (PDF anti-pattern #3, Filed != Done): Brightline trust
-- 1041 was e-filed, the IRS rejected. Status unwinds to `review` with
-- an efile_rejected_at stamp so the Rejected chip renders.
UPDATE obligation_instance
SET
  status = 'review',
  efile_rejected_at = CAST(unixepoch('2026-05-10 14:23:00') * 1000 AS INTEGER),
  efile_accepted_at = NULL
WHERE id = '20000000-0000-4000-8000-000000000007';

-- Tie state-specific obligations to explicit filing profiles. Federal
-- obligations intentionally keep NULL so Add deadline can still treat
-- Federal as the default, non-profile jurisdiction.
UPDATE obligation_instance
SET client_filing_profile_id = CASE id
  WHEN '20000000-0000-4000-8000-000000000002' THEN '15000000-0000-4000-8000-000000000001'
  WHEN '20000000-0000-4000-8000-000000000004' THEN '15000000-0000-4000-8000-000000000003'
  WHEN '20000000-0000-4000-8000-000000000005' THEN '15000000-0000-4000-8000-000000000004'
  WHEN '20000000-0000-4000-8000-000000000008' THEN '15000000-0000-4000-8000-000000000006'
  WHEN '20000000-0000-4000-8000-000000000010' THEN '15000000-0000-4000-8000-000000000008'
  WHEN '20000000-0000-4000-8000-000000000023' THEN '15000000-0000-4000-8000-000000000003'
  WHEN '21000000-0000-4000-8000-000000000001' THEN '15100000-0000-4000-8000-000000000001'
  WHEN '22000000-0000-4000-8000-000000000001' THEN '15200000-0000-4000-8000-000000000001'
  WHEN '22000000-0000-4000-8000-000000000004' THEN '15200000-0000-4000-8000-000000000002'
  WHEN '22000000-0000-4000-8000-000000000006' THEN '15200000-0000-4000-8000-000000000004'
  WHEN '23000000-0000-4000-8000-000000000002' THEN '15300000-0000-4000-8000-000000000001'
  WHEN '23000000-0000-4000-8000-000000000004' THEN '15300000-0000-4000-8000-000000000002'
  WHEN '23000000-0000-4000-8000-000000000006' THEN '15300000-0000-4000-8000-000000000004'
  ELSE client_filing_profile_id
END
WHERE id IN (
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000005',
  '20000000-0000-4000-8000-000000000008',
  '20000000-0000-4000-8000-000000000010',
  '20000000-0000-4000-8000-000000000023',
  '21000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000004',
  '22000000-0000-4000-8000-000000000006',
  '23000000-0000-4000-8000-000000000002',
  '23000000-0000-4000-8000-000000000004',
  '23000000-0000-4000-8000-000000000006'
);

COMMIT;
