import { describe, expect, it } from 'vitest'
import { setupI18n } from '@lingui/core'
import type { MemberInvitationPublic, MemberPublic } from '@duedatehq/contracts'

import {
  formatInvitationDate,
  formatMemberDate,
  invitationDescription,
  inviterName,
  isManagedRole,
  isRoleDowngrade,
  MANAGED_ROLES,
  roleDowngradeImpact,
  roleLabel,
} from './member-model'

// `msg`-keyed lookups need an i18n instance — when no catalog is
// loaded the default backend returns the message id (the English
// source string), which is exactly what the assertions below need.
const i18n = setupI18n({ locale: 'en', messages: { en: {} } })

const member = {
  id: 'member_1',
  userId: 'user_1',
  name: 'Sarah Chen',
  email: 'sarah@example.com',
  image: null,
  role: 'owner',
  status: 'active',
  isCurrentUser: true,
  createdAt: '2026-04-01T12:00:00.000Z',
} satisfies MemberPublic

const invitation = {
  id: 'invite_1',
  email: 'teammate@example.com',
  role: 'manager',
  status: 'pending',
  inviterId: 'user_1',
  createdAt: '2026-04-02T12:00:00.000Z',
  expiresAt: '2026-04-09T12:00:00.000Z',
} satisfies MemberInvitationPublic

describe('member model', () => {
  it('keeps managed roles distinct from owner', () => {
    expect(MANAGED_ROLES).toEqual(['partner', 'manager', 'preparer', 'coordinator'])
    expect(isManagedRole('partner')).toBe(true)
    expect(isManagedRole('manager')).toBe(true)
    expect(isManagedRole('owner')).toBe(false)
    expect(roleLabel('owner')).toBe('Owner')
    expect(roleLabel('partner')).toBe('Partner')
    expect(roleLabel('coordinator')).toBe('Coordinator')
  })

  it('derives invitation copy and inviter names', () => {
    expect(invitationDescription(invitation)).toBe('Magic-link delivered · awaiting accept')
    expect(invitationDescription({ ...invitation, status: 'expired' })).toBe(
      'Link expired · ask Owner to resend',
    )
    expect(inviterName([member], 'user_1')).toBe('Sarah Chen')
    expect(inviterName([member], 'user_2')).toBe('user_2')
  })

  it('formats member and invitation dates for the members surface', () => {
    expect(formatMemberDate('2026-04-01T12:00:00.000Z', 'America/Los_Angeles')).toMatch(
      /^2026-04-01 05:00:00 (PDT|GMT-7)$/,
    )
    expect(formatInvitationDate('2026-04-09T12:00:00.000Z', 'America/New_York')).toMatch(
      /^2026-04-09 08:00:00 (EDT|GMT-4)$/,
    )
  })

  it('flags downgrades but not upgrades or sideways moves', () => {
    expect(isRoleDowngrade('partner', 'coordinator')).toBe(true)
    expect(isRoleDowngrade('manager', 'preparer')).toBe(true)
    expect(isRoleDowngrade('owner', 'partner')).toBe(true)
    expect(isRoleDowngrade('preparer', 'manager')).toBe(false)
    expect(isRoleDowngrade('coordinator', 'partner')).toBe(false)
    expect(isRoleDowngrade('manager', 'manager')).toBe(false)
  })

  it('describes downgrade impact based on the privilege gap crossed', () => {
    expect(roleDowngradeImpact('partner', 'coordinator', i18n)).toEqual({
      removes: 'Member admin, billing access, and review sign-off',
      keeps: 'Client assignments and existing work',
    })
    expect(roleDowngradeImpact('partner', 'manager', i18n)).toEqual({
      removes: 'Member admin and billing access',
      keeps: 'Review sign-off and client assignments',
    })
    expect(roleDowngradeImpact('manager', 'preparer', i18n)).toEqual({
      removes: 'Review sign-off authority',
      keeps: 'Client assignments and existing work',
    })
    expect(roleDowngradeImpact('preparer', 'coordinator', i18n)).toEqual({
      removes: 'Access to elevated workflow scopes',
      keeps: 'Day-to-day client work',
    })
  })
})
