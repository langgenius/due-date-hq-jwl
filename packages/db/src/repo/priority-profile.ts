import {
  SMART_PRIORITY_DEFAULT_PROFILE,
  migrateSmartPriorityProfile,
  type SmartPriorityProfile,
} from '@duedatehq/core/priority'

export function toSmartPriorityProfile(value: unknown): SmartPriorityProfile {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return migrateSmartPriorityProfile(parsed) ?? SMART_PRIORITY_DEFAULT_PROFILE
    } catch {
      return SMART_PRIORITY_DEFAULT_PROFILE
    }
  }
  return migrateSmartPriorityProfile(value) ?? SMART_PRIORITY_DEFAULT_PROFILE
}

export function fromSmartPriorityProfile(profile: SmartPriorityProfile): string {
  return JSON.stringify(profile)
}
