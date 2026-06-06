-- Retire the Opportunities feature.
--
-- Opportunities were computed (never stored); `opportunity_dismissal` (added in
-- 0053) was the side-channel that shadowed user-driven dismiss/snooze on those
-- computed rows. With the feature retired end-to-end — the firm-wide
-- /opportunities route, the client-detail Opportunities tab, and the
-- clients-list count column are all gone — nothing reads or writes this table.
-- Drop it; SQLite removes its indexes (uq_opportunity_dismissal_key,
-- idx_opportunity_dismissal_firm_active) along with the table.
DROP TABLE IF EXISTS `opportunity_dismissal`;
