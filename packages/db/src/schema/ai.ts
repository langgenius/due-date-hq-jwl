import { relations, sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { firmProfile } from './firm'

export const aiOutput = sqliteTable(
  'ai_output',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id').references(() => firmProfile.id, { onDelete: 'restrict' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    kind: text('kind', {
      enum: [
        'brief',
        'tip',
        'summary',
        'ask_answer',
        'pulse_extract',
        'rule_concrete_draft',
        'migration_map',
        'migration_normalize',
        'readiness_checklist',
      ],
    }).notNull(),
    promptVersion: text('prompt_version').notNull(),
    model: text('model'),
    inputContextRef: text('input_context_ref'),
    inputHash: text('input_hash').notNull(),
    outputText: text('output_text'),
    citationsJson: text('citations_json', { mode: 'json' }).$type<unknown>(),
    guardResult: text('guard_result').notNull(),
    refusalCode: text('refusal_code'),
    generatedAt: integer('generated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    latencyMs: integer('latency_ms').notNull().default(0),
    costUsd: real('cost_usd'),
  },
  (table) => [
    index('idx_ai_output_firm_time').on(table.firmId, table.generatedAt),
    index('idx_ai_output_context').on(table.kind, table.inputContextRef),
  ],
)

export const llmLog = sqliteTable(
  'llm_log',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id').references(() => firmProfile.id, { onDelete: 'restrict' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    promptVersion: text('prompt_version').notNull(),
    model: text('model'),
    inputHash: text('input_hash').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    latencyMs: integer('latency_ms').notNull().default(0),
    costUsd: real('cost_usd'),
    guardResult: text('guard_result').notNull(),
    refusalCode: text('refusal_code'),
    success: integer('success', { mode: 'boolean' }).notNull(),
    errorMsg: text('error_msg'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index('idx_llm_log_firm_time').on(table.firmId, table.createdAt),
    index('idx_llm_log_prompt_time').on(table.promptVersion, table.createdAt),
  ],
)

export const aiOutputRelations = relations(aiOutput, ({ one }) => ({
  firm: one(firmProfile, {
    fields: [aiOutput.firmId],
    references: [firmProfile.id],
  }),
  user: one(user, {
    fields: [aiOutput.userId],
    references: [user.id],
  }),
}))

export const llmLogRelations = relations(llmLog, ({ one }) => ({
  firm: one(firmProfile, {
    fields: [llmLog.firmId],
    references: [firmProfile.id],
  }),
  user: one(user, {
    fields: [llmLog.userId],
    references: [user.id],
  }),
}))

export type AiOutput = typeof aiOutput.$inferSelect
export type NewAiOutput = typeof aiOutput.$inferInsert
export type LlmLog = typeof llmLog.$inferSelect
export type NewLlmLog = typeof llmLog.$inferInsert
