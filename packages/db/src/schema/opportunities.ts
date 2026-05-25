import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { firmProfile } from './firm'

// 2026-05-24 (critique P2): Opportunities are *computed* from current
// client+obligation state, not stored. That makes "Dismiss" tricky —
// without persistence the row reappears on the next list call.
//
// This table is the side-channel: one row per (firmId,
// opportunityKey) shadowing whatever the computed result would have
// produced. `kind='dismissed'` hides forever; `kind='snoozed'` hides
// until `snoozeUntil` falls in the past. The `list` handler does a
// LEFT JOIN here, filters out matches still in scope, and either
// returns the shadowed row in a future read or lets it through once
// the snooze elapses.
//
// `opportunityKey` is the deterministic computed `id`
// (`retention_check_in:client:<id>` etc.) — no FK because the
// opportunity entity doesn't exist as a row. The unique index on
// (firmId, opportunityKey) is the dedupe boundary; subsequent
// dismiss/snooze for the same key UPSERTs.
export const OPPORTUNITY_DISMISSAL_KINDS = ['dismissed', 'snoozed'] as const
export type OpportunityDismissalKind = (typeof OPPORTUNITY_DISMISSAL_KINDS)[number]

export const opportunityDismissal = sqliteTable(
  'opportunity_dismissal',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    opportunityKey: text('opportunity_key').notNull(),
    kind: text('kind', { enum: OPPORTUNITY_DISMISSAL_KINDS }).notNull(),
    snoozeUntil: integer('snooze_until', { mode: 'timestamp_ms' }),
    reason: text('reason'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_opportunity_dismissal_key').on(table.firmId, table.opportunityKey),
    index('idx_opportunity_dismissal_firm_active').on(table.firmId, table.snoozeUntil),
  ],
)
