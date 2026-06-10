import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { aiOutput } from './ai'
import { user } from './auth'
import { firmProfile } from './firm'

export const DASHBOARD_BRIEF_SCOPES = ['firm', 'me'] as const
export type DashboardBriefScope = (typeof DASHBOARD_BRIEF_SCOPES)[number]

export const DASHBOARD_BRIEF_STATUSES = ['pending', 'ready', 'failed', 'stale'] as const
export type DashboardBriefStatus = (typeof DASHBOARD_BRIEF_STATUSES)[number]

export const dashboardBrief = sqliteTable(
  'dashboard_brief',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    scope: text('scope', { enum: DASHBOARD_BRIEF_SCOPES }).notNull().default('firm'),
    asOfDate: text('as_of_date').notNull(),
    status: text('status', { enum: DASHBOARD_BRIEF_STATUSES }).notNull().default('pending'),
    inputHash: text('input_hash').notNull(),
    aiOutputId: text('ai_output_id').references(() => aiOutput.id, { onDelete: 'set null' }),
    summaryText: text('summary_text'),
    topObligationIdsJson: text('top_obligation_ids_json', { mode: 'json' }).$type<string[]>(),
    citationsJson: text('citations_json', { mode: 'json' }).$type<unknown>(),
    reason: text('reason').notNull(),
    errorCode: text('error_code'),
    generatedAt: integer('generated_at', { mode: 'timestamp_ms' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('idx_dashboard_brief_firm_scope_time').on(
      table.firmId,
      table.scope,
      table.asOfDate,
      table.updatedAt,
    ),
    uniqueIndex('uq_dashboard_brief_ready_hash')
      .on(table.firmId, table.scope, table.asOfDate, table.inputHash)
      .where(sql`status in ('ready', 'pending')`),
  ],
)

export const dashboardBriefRelations = relations(dashboardBrief, ({ one }) => ({
  firm: one(firmProfile, {
    fields: [dashboardBrief.firmId],
    references: [firmProfile.id],
  }),
  user: one(user, {
    fields: [dashboardBrief.userId],
    references: [user.id],
  }),
  aiOutput: one(aiOutput, {
    fields: [dashboardBrief.aiOutputId],
    references: [aiOutput.id],
  }),
}))

export type DashboardBrief = typeof dashboardBrief.$inferSelect
export type NewDashboardBrief = typeof dashboardBrief.$inferInsert

// 2026-06-07 (Pencil QGZta /splash): per-user-per-firm "last opened the
// dashboard" stamp. Drives the once-a-day post-login welcome trigger and the
// "while you were away" recap window. App-owned (the better-auth `user` table
// is never hand-migrated), keyed by (user, firm) so the recap is firm-scoped.
export const userDashboardVisit = sqliteTable(
  'user_dashboard_visit',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    lastVisitAt: integer('last_visit_at', { mode: 'timestamp_ms' }).notNull(),
    // 2026-06-10 (Daily Brief "Yesterday" row): the most recent visit from
    // an EARLIER calendar day, preserved when the daily rollover re-stamps
    // last_visit_at. The recap window's anchor — "since your last visit"
    // must survive today's own stamp (migration 0076).
    previousVisitAt: integer('previous_visit_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex('uq_user_dashboard_visit').on(table.userId, table.firmId)],
)

export type UserDashboardVisit = typeof userDashboardVisit.$inferSelect
export type NewUserDashboardVisit = typeof userDashboardVisit.$inferInsert
