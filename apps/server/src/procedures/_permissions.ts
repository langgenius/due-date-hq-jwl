import { ORPCError } from '@orpc/server'
import {
  requiredRolesForFirmPermission,
  type FirmPermission,
  type FirmRole,
} from '@duedatehq/core/permissions'
import { ErrorCodes } from '@duedatehq/contracts'
import type { ContextVars } from '../env'
import { requireTenant, type RpcContext } from './_context'

export interface CurrentFirmOwnerContext {
  members: NonNullable<ContextVars['members']>
  tenant: NonNullable<ContextVars['tenantContext']>
  userId: string
}

export const CLIENT_WRITE_ROLES = requiredRolesForFirmPermission('client.write')
export const MIGRATION_RUN_ROLES = requiredRolesForFirmPermission('migration.run')
export const MIGRATION_REVERT_ROLES = requiredRolesForFirmPermission('migration.revert')
export const OBLIGATION_STATUS_WRITE_ROLES = requiredRolesForFirmPermission(
  'obligation.status.update',
)

export type Permission = FirmPermission

async function writeDeniedAudit(
  ctx: RpcContext,
  input: {
    action: string
    allowedRoles: readonly FirmRole[]
    actualRole?: FirmRole | null
    reason: string
  },
) {
  try {
    const { scoped, userId } = requireTenant(ctx)
    await scoped.audit.write({
      actorId: userId,
      entityType: 'auth',
      entityId: userId,
      action: 'auth.denied',
      after: {
        attemptedAction: input.action,
        allowedRoles: input.allowedRoles,
        actualRole: input.actualRole ?? null,
      },
      reason: input.reason,
    })
  } catch {
    // Permission checks must fail closed even if audit logging is unavailable.
  }
}

export async function requireCurrentFirmRole(
  ctx: RpcContext,
  allowedRoles: readonly FirmRole[],
): Promise<CurrentFirmOwnerContext> {
  const { tenant, userId } = requireTenant(ctx)
  // Public read-only demo: block every write (these helpers gate all mutations).
  if (tenant.isReadOnlyDemo) {
    throw new ORPCError('FORBIDDEN', { message: ErrorCodes.DEMO_READ_ONLY })
  }
  const { members } = ctx.vars
  if (!members) {
    throw new Error('Member access middleware did not run before this procedure.')
  }

  const actor = await members.findMembership(tenant.firmId, userId)
  if (!actor || actor.status !== 'active' || !allowedRoles.includes(actor.role)) {
    await writeDeniedAudit(ctx, {
      action: 'role.check',
      allowedRoles,
      actualRole: actor?.role ?? null,
      reason: !actor ? 'missing_membership' : actor.status !== 'active' ? actor.status : 'role',
    })
    throw new ORPCError('FORBIDDEN', { message: ErrorCodes.MEMBER_FORBIDDEN })
  }

  return { members, tenant, userId }
}

export async function requireCurrentFirmOwner(ctx: RpcContext): Promise<CurrentFirmOwnerContext> {
  return requireCurrentFirmRole(ctx, ['owner'])
}

export async function requirePermission(
  ctx: RpcContext,
  permission: Permission,
): Promise<CurrentFirmOwnerContext> {
  const allowedRoles = requiredRolesForFirmPermission(permission)
  const { tenant, userId } = requireTenant(ctx)
  // Public read-only demo: block every write (these helpers gate all mutations).
  if (tenant.isReadOnlyDemo) {
    throw new ORPCError('FORBIDDEN', { message: ErrorCodes.DEMO_READ_ONLY })
  }
  const { members } = ctx.vars
  if (!members) {
    throw new Error('Member access middleware did not run before this procedure.')
  }
  const actor = await members.findMembership(tenant.firmId, userId)
  if (!actor || actor.status !== 'active' || !allowedRoles.includes(actor.role)) {
    await writeDeniedAudit(ctx, {
      action: permission,
      allowedRoles,
      actualRole: actor?.role ?? null,
      reason: !actor ? 'missing_membership' : actor.status !== 'active' ? actor.status : 'role',
    })
    throw new ORPCError('FORBIDDEN', { message: ErrorCodes.MEMBER_FORBIDDEN })
  }
  return { members, tenant, userId }
}
