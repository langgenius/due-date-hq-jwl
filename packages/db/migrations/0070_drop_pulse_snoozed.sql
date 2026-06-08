-- Retire the alert "snoozed" state end-to-end.
--
-- Snooze was a temporary hide (status='snoozed' + snoozed_until, auto-returning
-- to the active queue once the timestamp passed). The feature is removed — the
-- only alert decisions are now apply / review / dismiss — so any still-snoozed
-- firm alert is reactivated back to 'matched' (the active state it would have
-- returned to on expiry), and the supporting snoozed_until column is dropped.
UPDATE `pulse_firm_alert` SET `status` = 'matched', `snoozed_until` = NULL WHERE `status` = 'snoozed';
--> statement-breakpoint
ALTER TABLE `pulse_firm_alert` DROP COLUMN `snoozed_until`;
