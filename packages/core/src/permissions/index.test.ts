import { describe, expect, it } from 'vitest'
import {
  FIRM_PERMISSION_ROLES,
  hasFirmPermission,
  isFirmRole,
  requiredRolesForFirmPermission,
  type FirmPermission,
  type FirmRole,
} from './index'

function matrix(permission: FirmPermission) {
  return {
    owner: hasFirmPermission({ role: 'owner', permission }),
    partner: hasFirmPermission({ role: 'partner', permission }),
    manager: hasFirmPermission({ role: 'manager', permission }),
    preparer: hasFirmPermission({ role: 'preparer', permission }),
    coordinator: hasFirmPermission({ role: 'coordinator', permission }),
  } satisfies Record<FirmRole, boolean>
}

describe('firm permissions', () => {
  it('narrows known firm roles', () => {
    expect(isFirmRole('owner')).toBe(true)
    expect(isFirmRole('partner')).toBe(true)
    expect(isFirmRole('manager')).toBe(true)
    expect(isFirmRole('member')).toBe(false)
    expect(isFirmRole(null)).toBe(false)
  })

  it('keeps owner-only account and firm management permissions tight', () => {
    expect(matrix('member.manage')).toEqual({
      owner: true,
      partner: false,
      manager: false,
      preparer: false,
      coordinator: false,
    })
    expect(matrix('billing.update')).toEqual({
      owner: true,
      partner: false,
      manager: false,
      preparer: false,
      coordinator: false,
    })
    expect(matrix('firm.priority.update')).toEqual({
      owner: true,
      partner: false,
      manager: false,
      preparer: false,
      coordinator: false,
    })
  })

  it('lets managers apply operational recovery actions without billing access', () => {
    expect(hasFirmPermission({ role: 'manager', permission: 'billing.read' })).toBe(false)
    expect(hasFirmPermission({ role: 'manager', permission: 'pulse.apply' })).toBe(true)
    expect(hasFirmPermission({ role: 'manager', permission: 'pulse.revert' })).toBe(true)
    expect(hasFirmPermission({ role: 'manager', permission: 'migration.revert' })).toBe(true)
  })

  // Role hierarchy invariant (Owner > Partner >= Manager > Preparer >
  // Coordinator): once a role is denied, every role below it must be denied
  // too. billing.read regressed this way once (owner+manager, no partner) —
  // lock the monotonic shape for every permission.
  it('keeps every permission upward-closed along the role hierarchy', () => {
    const order: readonly FirmRole[] = ['owner', 'partner', 'manager', 'preparer', 'coordinator']
    for (const permission of Object.keys(FIRM_PERMISSION_ROLES) as FirmPermission[]) {
      const granted = order.map((role) => requiredRolesForFirmPermission(permission).includes(role))
      const firstDenied = granted.indexOf(false)
      if (firstDenied === -1) continue
      expect
        .soft(granted.slice(firstDenied).some(Boolean), `${permission} skips a higher role`)
        .toBe(false)
    }
  })

  it('lets partners control workflow without account-owner billing powers', () => {
    expect(hasFirmPermission({ role: 'partner', permission: 'audit.read' })).toBe(true)
    expect(hasFirmPermission({ role: 'partner', permission: 'client.write' })).toBe(true)
    expect(hasFirmPermission({ role: 'partner', permission: 'obligation.status.update' })).toBe(
      true,
    )
    expect(hasFirmPermission({ role: 'partner', permission: 'pulse.apply' })).toBe(true)
    expect(hasFirmPermission({ role: 'partner', permission: 'billing.read' })).toBe(false)
    expect(hasFirmPermission({ role: 'partner', permission: 'member.manage' })).toBe(false)
  })

  it('keeps preparers on read/import/status work without account powers', () => {
    expect(hasFirmPermission({ role: 'preparer', permission: 'audit.read' })).toBe(true)
    expect(hasFirmPermission({ role: 'preparer', permission: 'migration.run' })).toBe(true)
    expect(hasFirmPermission({ role: 'preparer', permission: 'client.write' })).toBe(true)
    expect(hasFirmPermission({ role: 'preparer', permission: 'billing.read' })).toBe(false)
    expect(hasFirmPermission({ role: 'preparer', permission: 'pulse.apply' })).toBe(false)
  })

  it('keeps coordinators read-only and hides deadline readiness by default', () => {
    expect(hasFirmPermission({ role: 'coordinator', permission: 'client.write' })).toBe(false)
    expect(hasFirmPermission({ role: 'coordinator', permission: 'audit.read' })).toBe(false)
    expect(hasFirmPermission({ role: 'coordinator', permission: 'dollars.read' })).toBe(false)
    expect(
      hasFirmPermission({
        role: 'coordinator',
        permission: 'dollars.read',
        coordinatorCanSeeDollars: true,
      }),
    ).toBe(true)
  })

  it('exposes stable role requirements for UI copy and server guards', () => {
    expect(requiredRolesForFirmPermission('member.manage')).toEqual(['owner'])
    expect(requiredRolesForFirmPermission('billing.read')).toEqual(['owner'])
    expect(requiredRolesForFirmPermission('audit.read')).toEqual([
      'owner',
      'partner',
      'manager',
      'preparer',
    ])
  })
})
