-- Tag snapshots with how they entered the system (NULL for web fetches,
-- 'inbound_email' for the GovDelivery email worker). Email attribution is
-- spoofable in ways a web fetch of the same sourceId is not, so extract.ts
-- quarantines email-sourced pulses regardless of model confidence.
ALTER TABLE pulse_source_snapshot ADD COLUMN ingest_method TEXT;
