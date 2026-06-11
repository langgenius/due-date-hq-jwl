export const FIRM_ROLES = ['owner', 'partner', 'manager', 'preparer', 'coordinator'] as const

export type FirmRole = (typeof FIRM_ROLES)[number]

export type FirmPermission =
  | 'audit.export'
  | 'audit.read'
  | 'billing.read'
  | 'billing.update'
  | 'client.write'
  | 'dollars.read'
  | 'firm.calendar.manage'
  | 'firm.delete'
  | 'firm.priority.update'
  | 'firm.update'
  | 'member.manage'
  | 'migration.revert'
  | 'migration.run'
  | 'obligation.status.update'
  | 'pulse.apply'
  | 'pulse.revert'

export interface FirmPermissionCheck {
  role: FirmRole | null | undefined
  permission: FirmPermission
  coordinatorCanSeeDollars?: boolean | undefined
}

export const FIRM_PERMISSION_ROLES = {
  'audit.export': ['owner'],
  'audit.read': ['owner', 'partner', 'manager', 'preparer'],
  'billing.read': ['owner'],
  'billing.update': ['owner'],
  'client.write': ['owner', 'partner', 'manager', 'preparer'],
  'dollars.read': ['owner', 'partner', 'manager', 'preparer'],
  'firm.calendar.manage': ['owner', 'partner', 'manager'],
  'firm.delete': ['owner'],
  'firm.priority.update': ['owner'],
  'firm.update': ['owner'],
  'member.manage': ['owner'],
  'migration.revert': ['owner', 'partner', 'manager'],
  'migration.run': ['owner', 'partner', 'manager', 'preparer'],
  'obligation.status.update': ['owner', 'partner', 'manager', 'preparer'],
  'pulse.apply': ['owner', 'partner', 'manager'],
  'pulse.revert': ['owner', 'partner', 'manager'],
} as const satisfies Record<FirmPermission, readonly FirmRole[]>

export function isFirmRole(value: unknown): value is FirmRole {
  return (
    value === 'owner' ||
    value === 'partner' ||
    value === 'manager' ||
    value === 'preparer' ||
    value === 'coordinator'
  )
}

export function requiredRolesForFirmPermission(permission: FirmPermission): readonly FirmRole[] {
  return FIRM_PERMISSION_ROLES[permission]
}

export function hasFirmPermission(input: FirmPermissionCheck): boolean {
  if (!isFirmRole(input.role)) return false
  if (input.permission === 'dollars.read' && input.role === 'coordinator') {
    return input.coordinatorCanSeeDollars === true
  }
  return requiredRolesForFirmPermission(input.permission).includes(input.role)
}
