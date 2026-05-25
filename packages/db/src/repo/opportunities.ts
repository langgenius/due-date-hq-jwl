import { and, eq, gt, or } from 'drizzle-orm'
import type { Db } from '../client'
import { user } from '../schema/auth'
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

export type OpportunityDismissalRowDetailed = OpportunityDismissalRow & {
  createdByName: string | null
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

  // 2026-05-24 (critique /polish — un-dismiss): same active set as
  // listActive but LEFT JOIN'd with `user` so the UI can render
  // "Dismissed by Sarah" without a second round-trip.
  async function listActiveDetailed(now: Date): Promise<OpportunityDismissalRowDetailed[]> {
    const rows = await db
      .select({
        id: opportunityDismissal.id,
        firmId: opportunityDismissal.firmId,
        opportunityKey: opportunityDismissal.opportunityKey,
        kind: opportunityDismissal.kind,
        snoozeUntil: opportunityDismissal.snoozeUntil,
        reason: opportunityDismissal.reason,
        createdByUserId: opportunityDismissal.createdByUserId,
        createdAt: opportunityDismissal.createdAt,
        createdByName: user.name,
      })
      .from(opportunityDismissal)
      .leftJoin(user, eq(user.id, opportunityDismissal.createdByUserId))
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
    return rows.map((row) => ({
      id: row.id,
      firmId: row.firmId,
      opportunityKey: row.opportunityKey,
      kind: row.kind,
      snoozeUntil: row.snoozeUntil,
      reason: row.reason,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
      createdByName: row.createdByName ?? null,
    }))
  }

  // 2026-05-24 (critique /polish — un-dismiss): undo by deletion.
  // The audit trail is the historical record; the table row only
  // needs to exist while it's shadowing a computed opportunity.
  // Returns true when a row was removed (signal to UI that
  // something actually happened); false when no row matched
  // (idempotent — restore-on-already-restored is fine).
  async function deleteByKey(opportunityKey: string): Promise<boolean> {
    const result = await db
      .delete(opportunityDismissal)
      .where(
        and(
          eq(opportunityDismissal.firmId, firmId),
          eq(opportunityDismissal.opportunityKey, opportunityKey),
        ),
      )
      .returning({ id: opportunityDismissal.id })
    return result.length > 0
  }

  return { listActive, listActiveDetailed, upsert, delete: deleteByKey }
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
