import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { firmProfile } from './firm'

/**
 * client — the CPA firm's tenant-scoped customer record.
 *
 * Layering (docs/dev-file/03-Data-Model.md §2.2):
 *   - Demo Sprint subset only. Coordinator-visible billing mirrors are
 *     deliberately deferred — D1 ALTER TABLE is cheap.
 *   - `firm_id` FK goes to `firm_profile.id` (which === organization.id ===
 *     firmId). Scoped repo factory (`scoped.ts`) is the only way procedures
 *     reach this table.
 *
 * entity_type enum (docs/adr/0011-migration-copilot-demo-sprint-scope.md FU-1):
 *   Expanded from 7 to 8 items to match AI Field Mapper target schema
 *   (`individual` added). See docs/product-design/migration-copilot/04-ai-prompts.md §2.2.
 *
 * `migration_batch_id` is nullable because clients can be created manually
 * (outside of Migration). When non-null, the 24h revert path deletes every
 * client and obligation sharing that batch id in one D1 batch transaction.
 * The schema-level FK is declared from migration.ts to avoid a circular
 * module reference; see docs/dev-file/03-Data-Model.md §2.4.
 */
export const client = sqliteTable(
  'client',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    // EIN regex `^\d{2}-\d{7}$` is enforced in the mapper guard
    // (packages/ai/src/guard.ts) and contract Zod (clients.ts); stored raw so
    // we can diff imported vs normalized values in Evidence drawer.
    ein: text('ein'),
    // 2-letter US state code after Normalizer output. Raw lowercase / full
    // state names are normalized upstream; this column holds the canonical
    // uppercase 2-char code.
    state: text('state'),
    county: text('county'),

    // 8-item enum. Order matches product-design/migration-copilot/04-ai-prompts.md §2.2.
    entityType: text('entity_type', {
      enum: ['llc', 's_corp', 'partnership', 'c_corp', 'sole_prop', 'trust', 'individual', 'other'],
    }).notNull(),
    legalEntity: text('legal_entity', {
      enum: [
        'individual',
        'sole_proprietorship',
        'single_member_llc',
        'multi_member_llc',
        'partnership',
        'corporation',
        'trust',
        'estate',
        'nonprofit',
        'foreign_entity',
        'other',
      ],
    }),
    taxClassification: text('tax_classification', {
      enum: [
        'individual',
        'disregarded_entity',
        'partnership',
        's_corp',
        'c_corp',
        'trust',
        'estate',
        'nonprofit',
        'foreign_reporting_company',
        'unknown',
      ],
    }).default('unknown'),
    taxYearType: text('tax_year_type', { enum: ['calendar', 'fiscal'] })
      .notNull()
      .default('calendar'),
    fiscalYearEndMonth: integer('fiscal_year_end_month'),
    fiscalYearEndDay: integer('fiscal_year_end_day'),
    externalClientId: text('external_client_id'),
    addressLine1: text('address_line_1'),
    city: text('city'),
    postalCode: text('postal_code'),
    primaryPhone: text('primary_phone'),
    sourceStatus: text('source_status'),
    ownerCount: integer('owner_count'),
    hasForeignAccounts: integer('has_foreign_accounts', { mode: 'boolean' })
      .notNull()
      .default(false),
    hasPayroll: integer('has_payroll', { mode: 'boolean' }).notNull().default(false),
    hasSalesTax: integer('has_sales_tax', { mode: 'boolean' }).notNull().default(false),
    has1099Vendors: integer('has_1099_vendors', { mode: 'boolean' }).notNull().default(false),
    hasK1Activity: integer('has_k1_activity', { mode: 'boolean' }).notNull().default(false),
    primaryContactName: text('primary_contact_name'),
    primaryContactEmail: text('primary_contact_email'),

    email: text('email'),
    notes: text('notes'),
    // Team member binding stores auth user.id. `assignee_name` remains a
    // denormalized display/import label so Obligations and migration rows keep
    // working when historical free-text assignments have no member match.
    assigneeId: text('assignee_id'),
    assigneeName: text('assignee_name'),

    // Smart Priority inputs. Defaults preserve existing tenant behavior while
    // letting firms explicitly mark high-touch clients and recent late filers.
    importanceWeight: integer('importance_weight').notNull().default(2),
    lateFilingCountLast12mo: integer('late_filing_count_last_12mo').notNull().default(0),

    // Penalty/exposure inputs. Values come from explicit user input, fixture
    // seed, or migration mapping only; AI never invents dollar amounts.
    estimatedTaxLiabilityCents: integer('estimated_tax_liability_cents'),
    estimatedTaxLiabilitySource: text('estimated_tax_liability_source', {
      enum: ['manual', 'imported', 'demo_seed'],
    }),
    equityOwnerCount: integer('equity_owner_count'),

    // NULL for manually-created clients. Non-null rows participate in the
    // Migration batch revert (24h full revert) / single-client undo (7d).
    migrationBatchId: text('migration_batch_id'),

    // Labeled onboarding sample/demo data ("Load sample data"). Excluded from
    // clientLimit counting and removed in one click (cascades to obligations /
    // filing profiles). Distinct from migrationBatchId (real imported clients).
    isSample: integer('is_sample', { mode: 'boolean' }).notNull().default(false),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    // Soft-delete per PRD §8.1; 30d grace then Cron hard-delete cascades
    // to obligation_instance.
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    // Dashboard / Clients page primary listing by firm, newest first.
    index('idx_client_firm_time').on(table.firmId, table.createdAt),
    // Obligations filters by entity_type within firm.
    index('idx_client_firm_entity').on(table.firmId, table.entityType),
    // Obligations P0 filters: state → county drilldown and assignee ownership.
    index('idx_client_firm_state_county').on(table.firmId, table.state, table.county),
    index('idx_client_firm_assignee_id').on(table.firmId, table.assigneeId),
    index('idx_client_firm_assignee').on(table.firmId, table.assigneeName),
    index('idx_client_firm_external_client').on(table.firmId, table.externalClientId),
    // Dashboard / Obligations penalty input triage.
    index('idx_client_firm_penalty_inputs').on(
      table.firmId,
      table.estimatedTaxLiabilityCents,
      table.equityOwnerCount,
    ),
    // 24h revert path: DELETE FROM client WHERE migration_batch_id = ?
    index('idx_client_batch').on(table.migrationBatchId),
  ],
)

export const CLIENT_FILING_PROFILE_SOURCES = [
  'manual',
  'imported',
  'demo_seed',
  'backfill',
] as const
export type ClientFilingProfileSource = (typeof CLIENT_FILING_PROFILE_SOURCES)[number]

export const clientFilingProfile = sqliteTable(
  'client_filing_profile',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    state: text('state').notNull(),
    countiesJson: text('counties_json', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    taxTypesJson: text('tax_types_json', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
    source: text('source', { enum: CLIENT_FILING_PROFILE_SOURCES }).notNull().default('manual'),
    migrationBatchId: text('migration_batch_id'),
    archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('idx_cfp_firm_client').on(table.firmId, table.clientId),
    index('idx_cfp_firm_state').on(table.firmId, table.state),
    index('idx_cfp_batch').on(table.migrationBatchId),
    uniqueIndex('uq_cfp_client_state_active')
      .on(table.clientId, table.state)
      .where(sql`archived_at is null`),
    uniqueIndex('uq_cfp_client_primary_active')
      .on(table.clientId)
      .where(sql`is_primary = 1 and archived_at is null`),
  ],
)

export const clientRelations = relations(client, ({ one, many }) => ({
  firm: one(firmProfile, {
    fields: [client.firmId],
    references: [firmProfile.id],
  }),
  filingProfiles: many(clientFilingProfile),
}))

export const clientFilingProfileRelations = relations(clientFilingProfile, ({ one }) => ({
  firm: one(firmProfile, {
    fields: [clientFilingProfile.firmId],
    references: [firmProfile.id],
  }),
  client: one(client, {
    fields: [clientFilingProfile.clientId],
    references: [client.id],
  }),
}))

export type Client = typeof client.$inferSelect
export type NewClient = typeof client.$inferInsert
export type ClientFilingProfile = typeof clientFilingProfile.$inferSelect
export type NewClientFilingProfile = typeof clientFilingProfile.$inferInsert

// Exported for the AI Field Mapper contract + runtime guard. Keep this in sync
// with `ClientEntityType` in packages/contracts/src/clients.ts and the Zod
// enum in packages/ai/src/prompts/field-mapper.md.
export const CLIENT_ENTITY_TYPES = [
  'llc',
  's_corp',
  'partnership',
  'c_corp',
  'sole_prop',
  'trust',
  'individual',
  'other',
] as const
export type ClientEntityType = (typeof CLIENT_ENTITY_TYPES)[number]

export const CLIENT_LEGAL_ENTITIES = [
  'individual',
  'sole_proprietorship',
  'single_member_llc',
  'multi_member_llc',
  'partnership',
  'corporation',
  'trust',
  'estate',
  'nonprofit',
  'foreign_entity',
  'other',
] as const
export type ClientLegalEntity = (typeof CLIENT_LEGAL_ENTITIES)[number]

export const CLIENT_TAX_CLASSIFICATIONS = [
  'individual',
  'disregarded_entity',
  'partnership',
  's_corp',
  'c_corp',
  'trust',
  'estate',
  'nonprofit',
  'foreign_reporting_company',
  'unknown',
] as const
export type ClientTaxClassification = (typeof CLIENT_TAX_CLASSIFICATIONS)[number]

export const ESTIMATED_TAX_LIABILITY_SOURCES = ['manual', 'imported', 'demo_seed'] as const
export type EstimatedTaxLiabilitySource = (typeof ESTIMATED_TAX_LIABILITY_SOURCES)[number]
