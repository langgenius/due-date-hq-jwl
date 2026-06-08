-- Per-deadline ownership + snooze (Pencil HuYeb /deadlines detail).
--
-- `assignee_id` is the obligation-level assignee. It OVERRIDES the client-level
-- assignee (client.assignee_id) so a single return can be handed to one
-- preparer without reassigning the whole client. NULL = inherit the client
-- default. References user(id); ON DELETE SET NULL so removing a teammate
-- drops their assignments back to the client default rather than orphaning rows.
--
-- `snoozed_until` defers a deadline from the default queue view and the
-- needs-attention strip until the chosen instant passes. NULL = not snoozed.
ALTER TABLE `obligation_instance` ADD `assignee_id` text REFERENCES user(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `obligation_instance` ADD `snoozed_until` integer;
