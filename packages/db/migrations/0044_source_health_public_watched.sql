UPDATE `pulse_source_state`
SET `health_status` = 'healthy'
WHERE `enabled` = 1
  AND `health_status` IN ('degraded', 'failing');
