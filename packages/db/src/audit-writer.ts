import type { Db } from './client'
import { auditEvent, type NewAuditEvent } from './schema/audit'

/**
 * Audit writer — append-only. INSERT-only by construction (docs/dev-file/06 §6.1,
 * docs/dev-file/03-Data-Model.md §2.5):
 *
 *   - No `update(...)` / `delete(...)` methods.
 *   - Every row gets a server-generated `id` + server clock `createdAt`
 *     (ignores any caller-supplied values for those fields).
 *
 * D1 bound-param budget = 100 (docs/dev-file/03 §3 + d1-drizzle-schema skill).
 * `auditEvent` inserts 15 columns → 15 × n ≤ 100 → n ≤ 6 per batch.
 * (2026-05-27 — η pass — bumped from 12 to 15 when actorType /
 * previousActorType / aiEventMetadataJson landed.)
 */

import type { AuditActorType } from './schema/audit'

export type { AuditActorType }

// F-037 — surfaced in the audit drawer as a disclosure section. The schema
// is intentionally permissive (every field optional) so we can grow the
// disclosure surface without bumping a contract version; the renderer in
// `apps/app/src/features/audit/audit-event-drawer.tsx` defends against
// missing fields.
export interface AiEventMetadata {
  model?: string
  promptVersion?: string
  inputTokens?: number
  outputTokens?: number
  latencyMs?: number
  guardStatus?: 'passed' | 'flagged' | 'blocked' | 'skipped'
  confidence?: number
  aiOutputId?: string
}

export interface AuditEventInput {
  firmId: string
  actorId: string | null
  // η pass — F-035. Default 'user' at the writer level matches the
  // schema default; callers that don't pass actorType keep the existing
  // semantics (human-driven write).
  actorType?: AuditActorType
  previousActorType?: AuditActorType | null
  aiEventMetadata?: AiEventMetadata | null
  entityType: string
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  reason?: string
  ipHash?: string
  userAgentHash?: string
}

const COLS_PER_AUDIT_ROW = 15
const AUDIT_BATCH_SIZE = Math.floor(100 / COLS_PER_AUDIT_ROW) // = 6

function toRow(input: AuditEventInput): NewAuditEvent {
  return {
    id: crypto.randomUUID(),
    firmId: input.firmId,
    actorId: input.actorId,
    actorType: input.actorType ?? 'user',
    previousActorType: input.previousActorType ?? null,
    aiEventMetadataJson: input.aiEventMetadata ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    beforeJson: input.before ?? null,
    afterJson: input.after ?? null,
    reason: input.reason ?? null,
    ipHash: input.ipHash ?? null,
    userAgentHash: input.userAgentHash ?? null,
  }
}

export function createAuditWriter(db: Db) {
  return {
    async write(event: AuditEventInput): Promise<{ id: string }> {
      const row = toRow(event)
      await db.insert(auditEvent).values(row)
      return { id: row.id }
    },

    /**
     * Write many audit rows in D1-safe batches. Each batch is a single
     * INSERT statement with multi-row VALUES; Drizzle + D1 preserve row
     * order per statement.
     */
    async writeBatch(events: AuditEventInput[]): Promise<{ ids: string[] }> {
      if (events.length === 0) return { ids: [] }
      const rows = events.map(toRow)
      const writes = []
      for (let i = 0; i < rows.length; i += AUDIT_BATCH_SIZE) {
        writes.push(db.insert(auditEvent).values(rows.slice(i, i + AUDIT_BATCH_SIZE)))
      }
      await Promise.all(writes)
      return { ids: rows.map((r) => r.id) }
    },
  }
}

export type AuditWriter = ReturnType<typeof createAuditWriter>
