-- Publish the acquisition URL as the first X reply while preserving the main
-- Post ID separately for safe two-step recovery and reconciliation.
ALTER TABLE `social_alert_post` ADD `x_reply_post_id` text;
--> statement-breakpoint
ALTER TABLE `social_publish_run` ADD `x_reply_post_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_social_alert_post_channel_x_reply` ON `social_alert_post` (`channel`,`x_reply_post_id`);
