-- 0076: Daily Brief "Yesterday" recap anchor.
-- user_dashboard_visit.last_visit_at is re-stamped on the first dashboard
-- view of each day, which destroys the very timestamp the recap window
-- needs ("since your previous visit"). previous_visit_at preserves the
-- prior earlier-day visit across the daily rollover stamp.
ALTER TABLE user_dashboard_visit ADD COLUMN previous_visit_at integer;
