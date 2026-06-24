import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Marketing questionnaire lead capture ("3 months of Team free").
 *
 * Rows are written by the PUBLIC, rate-limited `/api/leads` endpoint — there is
 * no firm/user FK because the submitter is an anonymous marketing-site visitor,
 * not an authenticated tenant. `ip_address` / `user_agent` are best-effort abuse
 * signals captured from the request, never shown back to the visitor.
 */
export const marketingLead = sqliteTable(
  'marketing_lead',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    firm: text('firm'),
    focus: text('focus'),
    tools: text('tools', { mode: 'json' }).$type<string[]>(),
    pain: text('pain'),
    source: text('source'),
    locale: text('locale'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [index('idx_marketing_lead_created_at').on(t.createdAt)],
)

export type MarketingLead = typeof marketingLead.$inferSelect
export type NewMarketingLead = typeof marketingLead.$inferInsert
