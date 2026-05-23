import { relations, sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { firmProfile } from './firm'

/**
 * migration_* tables — the 4 Demo Sprint tables backing Migration Copilot.
 *
 * Contract + UX authority:
 *   - docs/product-design/migration-copilot/01-mvp-and-journeys.md §4
 *     (end-to-end timeline + audit/evidence write sites)
 *   - docs/product-design/migration-copilot/02-ux-4step-wizard.md
 *     (4-step wizard state machine per batch)
 *   - docs/dev-file/03-Data-Model.md §2.4 (table contracts)
 *   - docs/dev-file/09-Demo-Sprint-Module-Playbook.md §6 (Contract surface)
 *   - docs/adr/0011-migration-copilot-demo-sprint-scope.md Decision I
 *
 * Concurrency invariant (PRD §3.6.6): at most 1 draft batch per firm.
 * Enforced by `uq_mb_firm_draft` below, a partial unique index using
 * SQLite's `WHERE` clause so non-draft rows are allowed to coexist.
 *
 * Revert semantics:
 *   - 24h full revert → deletes every client/obligation sharing batch_id
 *     via `idx_client_batch` + `idx_oi_batch` (schema/clients.ts, schema/obligations.ts).
 *   - `revert_expires_at` = `applied_at + 24h`; UI toast + email link use
 *     the server-returned ISO-8601 value (docs/product-design/migration-copilot/09-design-system-deltas.md §4.5).
 */
export const migrationBatch = sqliteTable(
  'migration_batch',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'restrict' }),
    // Import actor. `user.id` not `member.id` because session actor is always
    // a user; RBAC is enforced by the caller.
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),

    // How the CSV arrived. `preset_*` variants carry the Preset Profile
    // label for confidence boost in the mapper (docs/product-design/migration-copilot/04-ai-prompts.md §2.1).
    source: text('source', {
      enum: [
        'paste',
        'csv',
        'xlsx',
        'preset_taxdome',
        'preset_drake',
        'preset_karbon',
        'preset_quickbooks',
        'preset_file_in_time',
        'preset_cch_axcess',
        'preset_cch_prosystem_fx',
        'preset_lacerte',
        'preset_proseries',
        'preset_ultratax_cs',
        'preset_proconnect_tax',
      ],
    }).notNull(),

    // R2 key for the raw upload (for 90-day retention per PRD §8 / docs/dev-file/03 §6).
    // Nullable: 'paste' source writes inline raw_input_json into mappingJson
    // payload + skips R2.
    rawInputR2Key: text('raw_input_r2_key'),
    rawInputFileName: text('raw_input_file_name'),
    rawInputContentType: text('raw_input_content_type'),
    rawInputSizeBytes: integer('raw_input_size_bytes'),

    // Mapper + Normalizer JSON payloads. Structure matches the contracts in
    // packages/contracts/src/migration.ts (MappingRow[] + NormalizationRow[]).
    mappingJson: text('mapping_json', { mode: 'json' }).$type<unknown>(),
    presetUsed: text('preset_used'),

    rowCount: integer('row_count').notNull().default(0),
    successCount: integer('success_count').notNull().default(0),
    skippedCount: integer('skipped_count').notNull().default(0),

    // Average Mapping Confidence across all non-IGNORE columns for this batch.
    // Stored 0-1 real; UI renders as integer percent. T-S2-01 threshold 0.95
    // (docs/product-design/migration-copilot/10-conflict-resolutions.md §3).
    aiGlobalConfidence: real('ai_global_confidence'),

    status: text('status', {
      enum: ['draft', 'mapping', 'reviewing', 'applied', 'reverted', 'failed'],
    })
      .notNull()
      .default('draft'),

    appliedAt: integer('applied_at', { mode: 'timestamp_ms' }),
    // = applied_at + 24h. Owner/Manager 24h revert button disables past this
    // timestamp; server is the clock source (no client-side countdown).
    revertExpiresAt: integer('revert_expires_at', { mode: 'timestamp_ms' }),
    revertedAt: integer('reverted_at', { mode: 'timestamp_ms' }),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // PRD §3.6.6 concurrency invariant: at most 1 draft per firm. Partial
    // unique index — non-draft statuses (applied, reverted, failed) are
    // freely coexistent with any new draft.
    uniqueIndex('uq_mb_firm_draft')
      .on(table.firmId)
      .where(sql`status = 'draft'`),
    // Clients > Import history listing.
    index('idx_mb_firm_time').on(table.firmId, table.createdAt),
    // 24h revert actor lookup.
    index('idx_mb_firm_status').on(table.firmId, table.status),
  ],
)

/**
 * migration_mapping — per-column AI Field Mapper output (one row per source
 * column). `user_overridden` marks columns the user edited in Step 2 review.
 */
export const migrationMapping = sqliteTable(
  'migration_mapping',
  {
    id: text('id').primaryKey(),
    batchId: text('batch_id')
      .notNull()
      .references(() => migrationBatch.id, { onDelete: 'cascade' }),
    sourceHeader: text('source_header').notNull(),
    targetField: text('target_field').notNull(),
    confidence: real('confidence'),
    reasoning: text('reasoning'),
    userOverridden: integer('user_overridden', { mode: 'boolean' }).notNull().default(false),
    model: text('model'),
    promptVersion: text('prompt_version'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index('idx_mm_batch').on(table.batchId)],
)

/**
 * migration_normalization — per-cell Normalizer output for fields whose raw
 * value required reshaping (entity_type / state / tax_types). Persisted so
 * Evidence drawer can show the raw → normalized transition.
 */
export const migrationNormalization = sqliteTable(
  'migration_normalization',
  {
    id: text('id').primaryKey(),
    batchId: text('batch_id')
      .notNull()
      .references(() => migrationBatch.id, { onDelete: 'cascade' }),
    field: text('field').notNull(),
    rawValue: text('raw_value').notNull(),
    normalizedValue: text('normalized_value'),
    confidence: real('confidence'),
    model: text('model'),
    promptVersion: text('prompt_version'),
    reasoning: text('reasoning'),
    userOverridden: integer('user_overridden', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index('idx_mn_batch').on(table.batchId)],
)

/**
 * migration_error — per-row parse/validation error (bad rows do not block
 * good rows per PRD §0.3 铁律 2). Surfaced in Step 1 Intake non-blocking
 * warning strip with `[Skip] / [Fix]` actions.
 */
export const migrationError = sqliteTable(
  'migration_error',
  {
    id: text('id').primaryKey(),
    batchId: text('batch_id')
      .notNull()
      .references(() => migrationBatch.id, { onDelete: 'cascade' }),
    rowIndex: integer('row_index').notNull(),
    rawRowJson: text('raw_row_json', { mode: 'json' }).$type<unknown>(),
    errorCode: text('error_code').notNull(),
    errorMessage: text('error_message').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index('idx_me_batch').on(table.batchId)],
)

export const migrationBatchRelations = relations(migrationBatch, ({ many, one }) => ({
  mappings: many(migrationMapping),
  normalizations: many(migrationNormalization),
  errors: many(migrationError),
  firm: one(firmProfile, {
    fields: [migrationBatch.firmId],
    references: [firmProfile.id],
  }),
  user: one(user, {
    fields: [migrationBatch.userId],
    references: [user.id],
  }),
}))

export const migrationMappingRelations = relations(migrationMapping, ({ one }) => ({
  batch: one(migrationBatch, {
    fields: [migrationMapping.batchId],
    references: [migrationBatch.id],
  }),
}))

export const migrationNormalizationRelations = relations(migrationNormalization, ({ one }) => ({
  batch: one(migrationBatch, {
    fields: [migrationNormalization.batchId],
    references: [migrationBatch.id],
  }),
}))

export const migrationErrorRelations = relations(migrationError, ({ one }) => ({
  batch: one(migrationBatch, {
    fields: [migrationError.batchId],
    references: [migrationBatch.id],
  }),
}))

export type MigrationBatch = typeof migrationBatch.$inferSelect
export type NewMigrationBatch = typeof migrationBatch.$inferInsert
export type MigrationMapping = typeof migrationMapping.$inferSelect
export type NewMigrationMapping = typeof migrationMapping.$inferInsert
export type MigrationNormalization = typeof migrationNormalization.$inferSelect
export type NewMigrationNormalization = typeof migrationNormalization.$inferInsert
export type MigrationError = typeof migrationError.$inferSelect
export type NewMigrationError = typeof migrationError.$inferInsert

export const MIGRATION_BATCH_STATUSES = [
  'draft',
  'mapping',
  'reviewing',
  'applied',
  'reverted',
  'failed',
] as const
export type MigrationBatchStatus = (typeof MIGRATION_BATCH_STATUSES)[number]

export const MIGRATION_SOURCES = [
  'paste',
  'csv',
  'xlsx',
  'preset_taxdome',
  'preset_drake',
  'preset_karbon',
  'preset_quickbooks',
  'preset_file_in_time',
  'preset_cch_axcess',
  'preset_cch_prosystem_fx',
  'preset_lacerte',
  'preset_proseries',
  'preset_ultratax_cs',
  'preset_proconnect_tax',
] as const
export type MigrationSource = (typeof MIGRATION_SOURCES)[number]
