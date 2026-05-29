ALTER TABLE firm_profile ADD COLUMN monitoring_start_date text;

UPDATE firm_profile
SET monitoring_start_date = date(created_at / 1000, 'unixepoch')
WHERE monitoring_start_date IS NULL;
