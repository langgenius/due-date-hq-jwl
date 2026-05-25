import { describe, expect, it } from 'vitest'
import {
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

  it('lets managers read billing and apply operational recovery actions', () => {
    expect(hasFirmPermission({ role: 'manager', permission: 'billing.read' })).toBe(true)
    expect(hasFirmPermission({ role: 'manager', permission: 'pulse.apply' })).toBe(true)
    expect(hasFirmPermission({ role: 'manager', permission: 'pulse.revert' })).toBe(true)
    expect(hasFirmPermission({ role: 'manager', permission: 'migration.revert' })).toBe(true)
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
    expect(requiredRolesForFirmPermission('billing.read')).toEqual(['owner', 'manager'])
    expect(requiredRolesForFirmPermission('audit.read')).toEqual([
      'owner',
      'partner',
      'manager',
      'preparer',
    ])
  })
})
