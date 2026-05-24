import { and, eq, gt, or } from 'drizzle-orm'
import type { Db } from '../client'
import { opportunityDismissal, type OpportunityDismissalKind } from '../schema/opportunities'

export type OpportunityDismissalRow = {
  id: string
  firmId: string
  opportunityKey: string
  kind: OpportunityDismissalKind
  snoozeUntil: Date | null
  reason: string | null
  createdByUserId: string
  createdAt: Date
}

// 2026-05-24 (critique P2): the active set is the rows that should
// currently shadow a computed opportunity:
//   - kind='dismissed' — always active
//   - kind='snoozed'   — active while snoozeUntil > now
// Expired snoozes stay in the table for audit; the LIST handler just
// doesn't filter on them, so the opportunity reappears. A 'snoozed'
// row with null snoozeUntil would be a data anomaly (the contract
// layer requires snoozeUntil on snooze input); the AND below
// excludes it from "active" so the opportunity is visible until
// somebody dismisses it properly.
export function makeOpportunityDismissalsRepo(db: Db, firmId: string) {
  async function listActive(now: Date): Promise<OpportunityDismissalRow[]> {
    const rows = await db
      .select()
      .from(opportunityDismissal)
      .where(
        and(
          eq(opportunityDismissal.firmId, firmId),
          or(
            eq(opportunityDismissal.kind, 'dismissed'),
            and(
              eq(opportunityDismissal.kind, 'snoozed'),
              gt(opportunityDismissal.snoozeUntil, now),
            ),
          ),
        ),
      )
    return rows.map(toRow)
  }

  async function upsert(input: {
    opportunityKey: string
    kind: OpportunityDismissalKind
    snoozeUntil: Date | null
    reason: string | null
    createdByUserId: string
  }): Promise<OpportunityDismissalRow> {
    const id = crypto.randomUUID()
    const now = new Date()
    // SQLite UPSERT on (firmId, opportunityKey).
    await db
      .insert(opportunityDismissal)
      .values({
        id,
        firmId,
        opportunityKey: input.opportunityKey,
        kind: input.kind,
        snoozeUntil: input.snoozeUntil,
        reason: input.reason,
        createdByUserId: input.createdByUserId,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [opportunityDismissal.firmId, opportunityDismissal.opportunityKey],
        set: {
          kind: input.kind,
          snoozeUntil: input.snoozeUntil,
          reason: input.reason,
          createdByUserId: input.createdByUserId,
          createdAt: now,
        },
      })
    const [row] = await db
      .select()
      .from(opportunityDismissal)
      .where(
        and(
          eq(opportunityDismissal.firmId, firmId),
          eq(opportunityDismissal.opportunityKey, input.opportunityKey),
        ),
      )
      .limit(1)
    if (!row) throw new Error('Failed to read upserted opportunity dismissal')
    return toRow(row)
  }

  return { listActive, upsert }
}

function toRow(row: typeof opportunityDismissal.$inferSelect): OpportunityDismissalRow {
  return {
    id: row.id,
    firmId: row.firmId,
    opportunityKey: row.opportunityKey,
    kind: row.kind,
    snoozeUntil: row.snoozeUntil,
    reason: row.reason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
  }
}

export type OpportunityDismissalsRepo = ReturnType<typeof makeOpportunityDismissalsRepo>
