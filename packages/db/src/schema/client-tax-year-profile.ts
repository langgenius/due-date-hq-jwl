import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { client, CLIENT_ENTITY_TYPES, CLIENT_TAX_CLASSIFICATIONS } from './clients'
import { firmProfile } from './firm'

export const CLIENT_TAX_YEAR_PROFILE_SOURCES = ['manual', 'reclassification', 'backfill'] as const
export type ClientTaxYearProfileSource = (typeof CLIENT_TAX_YEAR_PROFILE_SOURCES)[number]

/**
 * client_tax_year_profile — per-(client, tax year) entity classification.
 *
 * The scalar `client.entity_type` / `tax_classification` stay the current /
 * default pointer (used as fallback). A row here OVERRIDES the classification
 * for a specific tax year, so a reclassification (e.g. C corp through 2024,
 * S corp from 2025) keeps an accurate historical record and lets per-year
 * obligation generation resolve the right classification for each year.
 *
 * Absence of a row for a year means "use the scalar" — so an EMPTY table is
 * exactly today's behavior, which is why no backfill is required.
 */
export const clientTaxYearProfile = sqliteTable(
  'client_tax_year_profile',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    taxYear: integer('tax_year').notNull(),
    entityType: text('entity_type', { enum: CLIENT_ENTITY_TYPES }).notNull(),
    taxClassification: text('tax_classification', { enum: CLIENT_TAX_CLASSIFICATIONS }),
    source: text('source', { enum: CLIENT_TAX_YEAR_PROFILE_SOURCES }).notNull().default('manual'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_ctyp_client_tax_year').on(table.clientId, table.taxYear),
    index('idx_ctyp_firm_client_year').on(table.firmId, table.clientId, table.taxYear),
  ],
)

export const clientTaxYearProfileRelations = relations(clientTaxYearProfile, ({ one }) => ({
  client: one(client, {
    fields: [clientTaxYearProfile.clientId],
    references: [client.id],
  }),
}))

export type ClientTaxYearProfile = typeof clientTaxYearProfile.$inferSelect
export type NewClientTaxYearProfile = typeof clientTaxYearProfile.$inferInsert
