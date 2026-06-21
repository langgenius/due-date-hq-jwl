-- Pinned-items affordance (/today "Pinned" section).
--
-- `is_pinned` lets a CPA manually star a deadline so it surfaces in the
-- dashboard's Pinned section regardless of due window or assignee. Existing
-- rows backfill to 0 (unpinned) via the column default. It is a
-- personal-workspace marker — NOT part of the obligation's regulatory state —
-- so it carries no FK and never participates in generation dedup.
ALTER TABLE `obligation_instance` ADD `is_pinned` integer DEFAULT 0 NOT NULL;
