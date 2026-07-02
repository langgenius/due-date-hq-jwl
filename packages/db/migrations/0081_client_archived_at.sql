-- Client archive lifecycle (UX-flow remediation 2026-07-02, W3-C).
--
-- `archived_at` is a REVERSIBLE lifecycle marker, deliberately separate from
-- `deleted_at`: deleted rows are promised to the PRD §8.1 purge path (30d
-- grace then hard-delete cascade), while archived rows are kept indefinitely
-- and restorable from the /clients Archived view. Mirrors the
-- client_filing_profile.archived_at precedent. NULL = active. Existing rows
-- backfill to NULL (active) implicitly.
ALTER TABLE `client` ADD `archived_at` integer;
