-- ETA AI-provenance pass (F-008 / F-022 / F-023 / F-035 / F-036 / F-037 / F-039).
--
-- The goal is to give every checklist item AND every audit event a clear
-- "did a human or an AI produce this?" answer that survives backfill, exports,
-- and forensic review. The schema migration is the load-bearing piece; the
-- UI surfacing in `apps/app/src/features/readiness/**` and
-- `apps/app/src/features/audit/**` reads these columns.
--
-- D1 / SQLite (3.35+) applies ALTER TABLE ... ADD COLUMN DEFAULT 'literal'
-- without rewriting existing rows — the default is stored as table metadata
-- and synthesised at read-time until a row is rewritten. That makes this
-- migration safe on a 50M-row `obligation_readiness_checklist_item` table:
-- no long lock, no per-row write. The same applies to `audit_event`.
--
-- All defaults are deliberately conservative ('manual', 'user') so the
-- backfill of historical rows is the safe, NOT-AI assumption — if anything
-- the analyst sees a historical AI write as 'manual' and goes hunting; the
-- inverse (mis-labelling a human write as AI) would be far more damaging
-- to trust.

ALTER TABLE `obligation_readiness_checklist_item` ADD `origin` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `obligation_readiness_checklist_item` ADD `ai_generated_at` integer;--> statement-breakpoint
ALTER TABLE `obligation_readiness_checklist_item` ADD `user_edited_at` integer;--> statement-breakpoint

ALTER TABLE `audit_event` ADD `actor_type` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_event` ADD `previous_actor_type` text;--> statement-breakpoint
ALTER TABLE `audit_event` ADD `ai_event_metadata_json` text;--> statement-breakpoint

-- `actor_type` is the highest-cardinality net-new filter consumers will hit
-- on the audit drawer ("Show me AI actions in the last 24h"). The existing
-- `idx_audit_firm_action_time` index handles the action-prefix query path;
-- this is the secondary index for the actor-type filter.
CREATE INDEX `idx_audit_firm_actor_type_time` ON `audit_event` (`firm_id`,`actor_type`,`created_at`);--> statement-breakpoint

-- The readiness checklist provenance filter ("which items in this checklist
-- still have an AI marker") is per-obligation, so we can ride the existing
-- `idx_readiness_doc_item_obligation` index for the common path. A dedicated
-- partial-index on `origin = 'ai'` is the long-term win once we have hundreds
-- of thousands of AI rows per firm; defer that to a follow-up if usage demands.
