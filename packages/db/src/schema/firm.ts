import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { organization, user } from './auth'

/**
 * firm_profile — the SaaS business tenant table.
 *
 * Layering (docs/adr/0010-firm-profile-vs-organization.md, docs/dev-file/03 §2.1):
 *   - identity layer:    organization / member / invitation       (Better Auth managed)
 *   - business tenant:   firm_profile                              (this table)
 *   - business data:     clients / obligations / pulse / ...       (firm_id FK)
 *
 * Key invariant: `firmId == organization.id == firm_profile.id`.
 * The PK reuses organization.id so every existing reference (`firmId`,
 * `scoped(db, firmId)`, `session.activeOrganizationId`) keeps the same value.
 *
 * Write path: `apps/server/src/auth.ts` registers an
 * `organizationHooks.afterCreateOrganization` that INSERTs one row per new org.
 * Self-healing read path: `apps/server/src/middleware/tenant.ts` lazy-creates
 * a row if it finds an organization without one (hook failure / migration
 * orphan). See docs/dev-log/2026-04-24-first-login-practice-onboarding.md.
 *
 * YAGNI columns deliberately deferred (D1 ALTER TABLE is cheap):
 *   - defaultAssigneeUserId                       → P1 (PRD §3.6.8)
 */
export const firmProfile = sqliteTable('firm_profile', {
  // PK reuses organization.id so firmId semantics never change across layers.
  id: text('id')
    .primaryKey()
    .references(() => organization.id, { onDelete: 'cascade' }),

  // Mirrors organization.name on creation; can drift later if we ever split
  // legal vs display names. Kept here so business reads don't need to JOIN.
  name: text('name').notNull(),

  // Pricing tier — drives membershipLimit / billing later. Default 'solo'
  // matches PRD §3.6.1 (Solo plan as P0 default).
  plan: text('plan', { enum: ['solo', 'pro', 'team', 'firm'] })
    .notNull()
    .default('solo'),

  // Cached seat ceiling derived from plan. Authoritative quota check still
  // happens at write time (membership / invitation) — this is the cached value
  // for UI affordance ("Upgrade plan to add more seats").
  seatLimit: integer('seat_limit').notNull().default(1),

  // Default tz is a P0 ICP assumption (PRD §2.1: US CPA). P1 onboarding
  // should let the user pick. Decision recorded in dev-log.
  timezone: text('timezone').notNull().default('America/New_York'),

  // Firm target-date policy. UI-facing current_due_date is derived as
  // base_due_date minus this many calendar days for newly generated
  // obligations and when the practice profile policy changes.
  internalDeadlineOffsetDays: integer('internal_deadline_offset_days').notNull().default(14),

  // onDelete:'restrict' — deleting a user must first transfer ownership (or
  // soft-delete the firm). Application layer (P1 owner transfer flow)
  // enforces this; D1 catches programmer errors.
  ownerUserId: text('owner_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'restrict' }),

  // Business-side state gate. PRD §3.6.8 plan-downgrade flow flips this to
  // 'suspended'; tenantMiddleware refuses non-active firms with TENANT_SUSPENDED.
  status: text('status', { enum: ['active', 'suspended', 'deleted'] })
    .notNull()
    .default('active'),

  // Business-side cache of the active Stripe relationship. The Better Auth
  // `subscription` table remains the source of truth; these columns keep the
  // tenant context cheap and make plan gates independent from Stripe reads.
  billingCustomerId: text('billing_customer_id'),
  billingSubscriptionId: text('billing_subscription_id'),

  // RBAC P1: Coordinator does not see dollar/exposure values unless Owner
  // explicitly flips this firm-level setting.
  coordinatorCanSeeDollars: integer('coordinator_can_see_dollars', { mode: 'boolean' })
    .notNull()
    .default(false),
  smartPriorityProfileJson: text('smart_priority_profile_json'),

  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),

  // Soft delete window — PRD §3.6.8 has 30d grace period. NULL while active.
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
})

export type FirmProfile = typeof firmProfile.$inferSelect
export type NewFirmProfile = typeof firmProfile.$inferInsert
