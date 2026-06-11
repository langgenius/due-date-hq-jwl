import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements } from 'better-auth/plugins/organization/access'

/**
 * Access control statement for the Firm organization.
 *
 * IMPORTANT: the statement MUST include Better Auth's organization-plugin
 * internal resources (`organization` / `member` / `invitation` / `team` /
 * `ac`). The plugin calls `ctx.hasPermission` against these names from its
 * own endpoints — e.g. `organization.update`, `organization.inviteMember`,
 * `organization.removeMember`. If we only declared our business-domain
 * resources, a future `organization.update` call would return 403 even for
 * owners because their role never mentions `organization` at all.
 *
 * We therefore spread `defaultStatements` first, then extend
 * `member` with our P1-specific actions (invite/suspend/remove/change_role)
 * by merging on top of the default member actions (create/update/delete),
 * and finally add our business-domain resources. The role definitions below
 * grant access per the PRD §3.6.3 RBAC matrix.
 */
export const statement = {
  // Better Auth native resources (organization/member/invitation/team/ac).
  // Must be present or the plugin's internal hasPermission calls fail closed.
  ...defaultStatements,
  // Extend Better Auth's `member` with our lifecycle actions. Keep the
  // default create/update/delete so the plugin's own endpoints keep working.
  member: [...defaultStatements.member, 'invite', 'suspend', 'remove', 'change_role'],
  // Business-domain resources (checked by our own procedures + UI affordance).
  client: ['create', 'read', 'update', 'delete'],
  obligation: ['read', 'update:status', 'update:assignee'],
  pulse: ['read', 'approve', 'batch_apply', 'revert'],
  migration: ['run', 'revert'],
  rule: ['read', 'report_issue'],
  billing: ['read', 'update'],
  audit: ['read', 'export'],
  dollars: ['read'],
} as const

export const accessControl = createAccessControl(statement)

/**
 * Roles per PRD §3.6.3. Owner gets the full surface (including Better
 * Auth's org/member/invitation/team/ac actions); the other roles are
 * aspirational P1 definitions — RBAC enforcement itself is P1, but the
 * statement shape has to be correct now so org.update etc. work for Owner
 * once we wire Settings writes.
 */
export const roles = {
  owner: accessControl.newRole({
    // Full business + plugin surface.
    organization: ['update', 'delete'],
    member: ['create', 'update', 'delete', 'invite', 'suspend', 'remove', 'change_role'],
    invitation: ['create', 'cancel'],
    team: ['create', 'update', 'delete'],
    ac: ['create', 'read', 'update', 'delete'],
    client: ['create', 'read', 'update', 'delete'],
    obligation: ['read', 'update:status', 'update:assignee'],
    pulse: ['read', 'approve', 'batch_apply', 'revert'],
    migration: ['run', 'revert'],
    rule: ['read', 'report_issue'],
    billing: ['read', 'update'],
    audit: ['read', 'export'],
    dollars: ['read'],
  }),

  partner: accessControl.newRole({
    // Business reviewer role: operational control without account-owner
    // organization or billing management powers.
    client: ['create', 'read', 'update'],
    obligation: ['read', 'update:status', 'update:assignee'],
    pulse: ['read', 'approve', 'batch_apply', 'revert'],
    migration: ['run', 'revert'],
    rule: ['read', 'report_issue'],
    audit: ['read'],
    dollars: ['read'],
  }),

  manager: accessControl.newRole({
    // Member administration is Owner-only in Members v1. Managers keep
    // business-domain permissions but no organization-plugin member surface.
    // Business surface (PRD §3.6.3 column). Role hierarchy invariant
    // (Owner > Partner >= Manager): manager must never hold a grant partner
    // lacks — billing and audit.export are Owner-only.
    client: ['create', 'read', 'update'],
    obligation: ['read', 'update:status', 'update:assignee'],
    pulse: ['read', 'approve', 'batch_apply', 'revert'],
    migration: ['run', 'revert'],
    rule: ['read', 'report_issue'],
    audit: ['read'],
    dollars: ['read'],
  }),

  preparer: accessControl.newRole({
    client: ['create', 'read', 'update'],
    obligation: ['read', 'update:status', 'update:assignee'],
    pulse: ['read'],
    migration: ['run'],
    rule: ['read', 'report_issue'],
    audit: ['read'],
    dollars: ['read'],
  }),

  coordinator: accessControl.newRole({
    client: ['read'],
    obligation: ['read'],
    pulse: ['read'],
    rule: ['read', 'report_issue'],
    // Coordinator deliberately lacks `dollars:read` — PRD §3.6 RBAC matrix
    // hides commercial-sensitive $ values from this role by default.
  }),
} as const

export type Role = 'owner' | 'partner' | 'manager' | 'preparer' | 'coordinator'
