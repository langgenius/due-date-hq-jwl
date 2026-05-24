import type { MemberInvitationPublic, MemberManagedRole, MemberPublic } from '@duedatehq/contracts'
import { formatDateTimeWithTimezone } from '@/lib/utils'

export const MANAGED_ROLES = [
  'partner',
  'manager',
  'preparer',
  'coordinator',
] as const satisfies readonly MemberManagedRole[]

export function isManagedRole(value: unknown): value is MemberManagedRole {
  return (
    value === 'partner' || value === 'manager' || value === 'preparer' || value === 'coordinator'
  )
}

export function roleLabel(role: MemberPublic['role'] | MemberManagedRole): string {
  if (role === 'owner') return 'Owner'
  if (role === 'partner') return 'Partner'
  if (role === 'manager') return 'Manager'
  if (role === 'preparer') return 'Preparer'
  return 'Coordinator'
}

// 2026-05-24 (critique /polish): privilege rank used to decide
// whether a role change is a *downgrade*. Downgrades silently strip
// access (sign-off, member admin, billing) and deserve a confirm
// step; upgrades + sideways moves apply directly.
//
// Owner sits at 100 because the role control here never targets it
// (owner-only moves happen elsewhere). Coordinator is the floor.
const ROLE_PRIVILEGE_RANK: Record<MemberPublic['role'], number> = {
  owner: 100,
  partner: 80,
  manager: 60,
  preparer: 40,
  coordinator: 20,
}

export function isRoleDowngrade(from: MemberPublic['role'], to: MemberManagedRole): boolean {
  return ROLE_PRIVILEGE_RANK[to] < ROLE_PRIVILEGE_RANK[from]
}

// Per-target downgrade explainer. Caller pairs this with a
// DestructiveChangePreview so the confirm dialog reads as concrete
// "X loses Y" rather than a generic "are you sure".
export function roleDowngradeImpact(
  from: MemberPublic['role'],
  to: MemberManagedRole,
): { removes: string; keeps: string } {
  const losesSignOff = ROLE_PRIVILEGE_RANK[from] >= 60 && ROLE_PRIVILEGE_RANK[to] < 60
  const losesMemberAdmin = ROLE_PRIVILEGE_RANK[from] >= 80 && ROLE_PRIVILEGE_RANK[to] < 80
  const losesPartial = !losesSignOff && !losesMemberAdmin
  if (losesMemberAdmin && losesSignOff) {
    return {
      removes: 'Member admin, billing access, and review sign-off',
      keeps: 'Client assignments and existing work',
    }
  }
  if (losesMemberAdmin) {
    return {
      removes: 'Member admin and billing access',
      keeps: 'Review sign-off and client assignments',
    }
  }
  if (losesSignOff) {
    return {
      removes: 'Review sign-off authority',
      keeps: 'Client assignments and existing work',
    }
  }
  if (losesPartial) {
    return {
      removes: 'Access to elevated workflow scopes',
      keeps: 'Day-to-day client work',
    }
  }
  // Defensive fallback — never expected to render since callers
  // only invoke this when `isRoleDowngrade` returned true.
  return { removes: 'Elevated access', keeps: 'Existing client work' }
}

export function invitationDescription(invitation: MemberInvitationPublic): string {
  if (invitation.status === 'expired') return 'Link expired · ask Owner to resend'
  return 'Magic-link delivered · awaiting accept'
}

export function inviterName(members: MemberPublic[], inviterId: string): string {
  return members.find((member) => member.userId === inviterId)?.name ?? inviterId
}

export function formatMemberDate(value: string, timeZone: string): string {
  return formatDateTimeWithTimezone(value, timeZone)
}

export function formatInvitationDate(value: string, timeZone: string): string {
  return formatDateTimeWithTimezone(value, timeZone)
}
