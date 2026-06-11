-- How a firm got its alert row: 'live' = approval-time fan-out or the daily
-- still-open sweep (counts as "new" on splash/daily-brief), 'catchup' = the
-- onboarding catch-up over the already-in-effect landscape (state, not news —
-- excluded from new-alert counters, rendered in the pinned "Already in effect"
-- band). First-writer-wins: the value is set on INSERT and never rewritten by
-- a later refresh of the same (firm, pulse) row.
ALTER TABLE pulse_firm_alert ADD COLUMN origin TEXT NOT NULL DEFAULT 'live';
