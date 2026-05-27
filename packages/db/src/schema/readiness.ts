import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { client } from './clients'
import { firmProfile } from './firm'
import { obligationInstance } from './obligations'

export const READINESS_REQUEST_STATUSES = [
  'sent',
  'opened',
  'responded',
  'revoked',
  'expired',
] as const
export type ReadinessRequestStatus = (typeof READINESS_REQUEST_STATUSES)[number]

export const READINESS_RESPONSE_STATUSES = ['ready', 'not_yet', 'need_help'] as const
export type ReadinessResponseStatus = (typeof READINESS_RESPONSE_STATUSES)[number]

export const READINESS_DOCUMENT_CHECKLIST_ITEM_SOURCES = ['template', 'custom'] as const
export type ReadinessDocumentChecklistItemSource =
  (typeof READINESS_DOCUMENT_CHECKLIST_ITEM_SOURCES)[number]

// 2026-05-27 (audit drain — η — F-008 / F-022 / F-039): `origin` is the
// AI provenance axis. `source` answers "did this item come from a catalog
// template or did a CPA add it custom" — orthogonal to "did an AI or a
// human produce the actual value?". A custom item can still be 'ai' if a
// Brief / Pulse path materialised it via inference; a template item can
// become 'manual' if the CPA renames the label. The marker DROPS on edit
// (set origin='manual' + bump user_edited_at) per the F-022 convention.
export const READINESS_DOCUMENT_CHECKLIST_ITEM_ORIGINS = ['ai', 'manual'] as const
export type ReadinessDocumentChecklistItemOrigin =
  (typeof READINESS_DOCUMENT_CHECKLIST_ITEM_ORIGINS)[number]

export const READINESS_DOCUMENT_CHECKLIST_ITEM_STATUSES = [
  'missing',
  'received',
  'needs_review',
] as const
export type ReadinessDocumentChecklistItemStatus =
  (typeof READINESS_DOCUMENT_CHECKLIST_ITEM_STATUSES)[number]

export interface ReadinessChecklistItemRow {
  id: string
  label: string
  description: string | null
  reason: string | null
  sourceHint: string | null
}

export const obligationReadinessChecklistItem = sqliteTable(
  'obligation_readiness_checklist_item',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    obligationInstanceId: text('obligation_instance_id')
      .notNull()
      .references(() => obligationInstance.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    description: text('description'),
    templateKey: text('template_key'),
    templateVersion: integer('template_version'),
    source: text('source', { enum: READINESS_DOCUMENT_CHECKLIST_ITEM_SOURCES })
      .notNull()
      .default('template'),
    // AI-provenance axis (η pass — see ORIGINS comment above). Defaults
    // to 'manual' so the back-compat path for every historical row is
    // the SAFE assumption: pre-migration items are human-authored.
    origin: text('origin', { enum: READINESS_DOCUMENT_CHECKLIST_ITEM_ORIGINS })
      .notNull()
      .default('manual'),
    aiGeneratedAt: integer('ai_generated_at', { mode: 'timestamp_ms' }),
    userEditedAt: integer('user_edited_at', { mode: 'timestamp_ms' }),
    status: text('status', { enum: READINESS_DOCUMENT_CHECKLIST_ITEM_STATUSES })
      .notNull()
      .default('missing'),
    sortOrder: integer('sort_order').notNull().default(0),
    note: text('note'),
    receivedAt: integer('received_at', { mode: 'timestamp_ms' }),
    receivedByUserId: text('received_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('idx_readiness_doc_item_obligation').on(table.firmId, table.obligationInstanceId),
    index('idx_readiness_doc_item_status').on(table.firmId, table.status),
  ],
)

export const obligationReadinessTemplateItemSuppression = sqliteTable(
  'obligation_readiness_template_item_suppression',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    obligationInstanceId: text('obligation_instance_id')
      .notNull()
      .references(() => obligationInstance.id, { onDelete: 'cascade' }),
    templateKey: text('template_key').notNull(),
    templateVersion: integer('template_version').notNull(),
    suppressedByUserId: text('suppressed_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_readiness_template_suppression_item').on(
      table.firmId,
      table.obligationInstanceId,
      table.templateKey,
    ),
    index('idx_readiness_template_suppression_obligation').on(
      table.firmId,
      table.obligationInstanceId,
    ),
  ],
)

export const clientReadinessRequest = sqliteTable(
  'client_readiness_request',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    obligationInstanceId: text('obligation_instance_id')
      .notNull()
      .references(() => obligationInstance.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    recipientEmail: text('recipient_email'),
    tokenHash: text('token_hash').notNull(),
    status: text('status', { enum: READINESS_REQUEST_STATUSES }).notNull().default('sent'),
    checklistJson: text('checklist_json', { mode: 'json' })
      .$type<ReadinessChecklistItemRow[]>()
      .notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
    firstOpenedAt: integer('first_opened_at', { mode: 'timestamp_ms' }),
    lastRespondedAt: integer('last_responded_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_readiness_request_token_hash').on(table.tokenHash),
    index('idx_readiness_request_firm_obligation').on(table.firmId, table.obligationInstanceId),
    index('idx_readiness_request_status_expiry').on(table.status, table.expiresAt),
  ],
)

export const clientReadinessResponse = sqliteTable(
  'client_readiness_response',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    requestId: text('request_id')
      .notNull()
      .references(() => clientReadinessRequest.id, { onDelete: 'cascade' }),
    obligationInstanceId: text('obligation_instance_id')
      .notNull()
      .references(() => obligationInstance.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull(),
    status: text('status', { enum: READINESS_RESPONSE_STATUSES }).notNull(),
    note: text('note'),
    etaDate: integer('eta_date', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index('idx_readiness_response_request').on(table.requestId),
    index('idx_readiness_response_obligation').on(table.firmId, table.obligationInstanceId),
  ],
)

export const clientReadinessRequestRelations = relations(
  clientReadinessRequest,
  ({ one, many }) => ({
    firm: one(firmProfile, {
      fields: [clientReadinessRequest.firmId],
      references: [firmProfile.id],
    }),
    client: one(client, {
      fields: [clientReadinessRequest.clientId],
      references: [client.id],
    }),
    obligation: one(obligationInstance, {
      fields: [clientReadinessRequest.obligationInstanceId],
      references: [obligationInstance.id],
    }),
    creator: one(user, {
      fields: [clientReadinessRequest.createdByUserId],
      references: [user.id],
    }),
    responses: many(clientReadinessResponse),
  }),
)

export const obligationReadinessChecklistItemRelations = relations(
  obligationReadinessChecklistItem,
  ({ one }) => ({
    firm: one(firmProfile, {
      fields: [obligationReadinessChecklistItem.firmId],
      references: [firmProfile.id],
    }),
    obligation: one(obligationInstance, {
      fields: [obligationReadinessChecklistItem.obligationInstanceId],
      references: [obligationInstance.id],
    }),
    creator: one(user, {
      fields: [obligationReadinessChecklistItem.createdByUserId],
      references: [user.id],
    }),
    receiver: one(user, {
      fields: [obligationReadinessChecklistItem.receivedByUserId],
      references: [user.id],
    }),
  }),
)

export const obligationReadinessTemplateItemSuppressionRelations = relations(
  obligationReadinessTemplateItemSuppression,
  ({ one }) => ({
    firm: one(firmProfile, {
      fields: [obligationReadinessTemplateItemSuppression.firmId],
      references: [firmProfile.id],
    }),
    obligation: one(obligationInstance, {
      fields: [obligationReadinessTemplateItemSuppression.obligationInstanceId],
      references: [obligationInstance.id],
    }),
    suppressor: one(user, {
      fields: [obligationReadinessTemplateItemSuppression.suppressedByUserId],
      references: [user.id],
    }),
  }),
)

export const clientReadinessResponseRelations = relations(clientReadinessResponse, ({ one }) => ({
  request: one(clientReadinessRequest, {
    fields: [clientReadinessResponse.requestId],
    references: [clientReadinessRequest.id],
  }),
  obligation: one(obligationInstance, {
    fields: [clientReadinessResponse.obligationInstanceId],
    references: [obligationInstance.id],
  }),
}))

export type ObligationReadinessChecklistItem = typeof obligationReadinessChecklistItem.$inferSelect
export type NewObligationReadinessChecklistItem =
  typeof obligationReadinessChecklistItem.$inferInsert
export type ObligationReadinessTemplateItemSuppression =
  typeof obligationReadinessTemplateItemSuppression.$inferSelect
export type NewObligationReadinessTemplateItemSuppression =
  typeof obligationReadinessTemplateItemSuppression.$inferInsert
export type ClientReadinessRequest = typeof clientReadinessRequest.$inferSelect
export type NewClientReadinessRequest = typeof clientReadinessRequest.$inferInsert
export type ClientReadinessResponse = typeof clientReadinessResponse.$inferSelect
export type NewClientReadinessResponse = typeof clientReadinessResponse.$inferInsert
