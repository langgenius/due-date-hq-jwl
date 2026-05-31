ALTER TABLE `pulse_source_state`
ADD `monitoring_baseline_at` integer;

ALTER TABLE `pulse_source_state`
ADD `baseline_mode` text NOT NULL DEFAULT 'establish_on_first_seen';
