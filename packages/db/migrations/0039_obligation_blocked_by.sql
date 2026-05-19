-- Lifecycle v2 slice 2b: add blocked_by_obligation_instance_id column.
-- Records which obligation is blocking this one when status='blocked'.
-- See docs/Design/obligation-lifecycle-design-brief.md.
ALTER TABLE `obligation_instance` ADD `blocked_by_obligation_instance_id` text;
