import { and, desc, eq, gte, inArray, like, lt, not, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { createAuditWriter, type AuditEventInput } from '../audit-writer'
import type { Db } from '../client'
import {
  AUDIT_ACTOR_TYPES,
  auditEvent,
  auditEvidencePackage,
  type AuditActorType,
  type AuditEvent,
  type AuditEvidencePackage,
} from '../schema/audit'
import { user } from '../schema/auth'

type AuditActionCategory =
  | 'client'
  | 'obligation'
  | 'migration'
  | 'rules'
  | 'auth'
  | 'team'
  | 'pulse'
  | 'opportunity'
  | 'export'
  | 'ai'
  | 'system'

export interface AuditListInput {
  search?: string
  category?: AuditActionCategory
  action?: string
  actorId?: string
  // F-035: filter by AI provenance. 'ai_any' is the convenience bucket for
  // the audit drawer's segmented control — "show me anything an AI touched"
  // — and expands server-side to ('ai', 'ai_assisted').
  actorType?: AuditActorType | 'ai_any'
  entityType?: string
  entityId?: string
  range?: '24h' | '7d' | '30d' | 'all'
  cursor?: string | null
  limit?: number
}

export interface AuditListRow extends AuditEvent {
  actorLabel: string | null
}

// η pass — F-035: filter by actorType so the audit drawer can render the
// "AI actions" segmented control without paginating through every event.
// Added to `AuditListInput` below.

export interface AuditListResult {
  rows: AuditListRow[]
  nextCursor: string | null
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_SEARCH_LENGTH = 80
const LIKE_WILDCARD_RE = /[\\%_]/g
const UNSAFE_SEARCH_CHARS_RE = /[^\p{L}\p{N}\s&'.:_-]+/gu

const CATEGORY_PREFIXES: Record<Exclude<AuditActionCategory, 'system'>, readonly string[]> = {
  client: ['client.'],
  obligation: ['obligation.'],
  migration: ['migration.'],
  rules: ['rule.', 'rules.'],
  auth: ['auth.'],
  team: ['team.', 'member.', 'firm.owner.'],
  pulse: ['pulse.'],
  // 2026-05-24 (re-critique): `opportunity.*` events (dismiss /
  // snooze / restore) used to fall through into the "system" bucket
  // when a reviewer filtered by category — visible in the log itself
  // but invisible to the filter. Now they have their own first-class
  // category alongside `pulse`.
  opportunity: ['opportunity.'],
  export: ['export.', 'ics.'],
  ai: ['ai.', 'ask.', 'onboarding.agent.'],
}

const ALL_KNOWN_PREFIXES = Object.values(CATEGORY_PREFIXES).flat()

export function normalizeAuditSearch(search: string | undefined): string | null {
  const normalized = (search ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(UNSAFE_SEARCH_CHARS_RE, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_SEARCH_LENGTH)
    .trim()

  return normalized.length > 0 ? normalized : null
}

function escapeLikePattern(value: string): string {
  return value.replace(LIKE_WILDCARD_RE, '\\$&')
}

function encodeCursor(row: { createdAt: Date; id: string }): string {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`, 'utf8').toString('base64url')
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const [iso, id] = raw.split('|')
    if (!iso || !id) return null
    const createdAt = new Date(iso)
    if (Number.isNaN(createdAt.getTime())) return null
    return { createdAt, id }
  } catch {
    return null
  }
}

function rangeStart(range: AuditListInput['range'], now = new Date()): Date | null {
  if (!range || range === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  if (range === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return null
}

function categoryFilter(category: AuditActionCategory): SQL | null {
  if (category === 'system') {
    return and(...ALL_KNOWN_PREFIXES.map((prefix) => not(like(auditEvent.action, `${prefix}%`))))!
  }

  const prefixes = CATEGORY_PREFIXES[category]
  return or(...prefixes.map((prefix) => like(auditEvent.action, `${prefix}%`))) ?? null
}

export function makeAuditRepo(db: Db, firmId: string) {
  const writer = createAuditWriter(db)

  return {
    firmId,

    async write(event: Omit<AuditEventInput, 'firmId'>): Promise<{ id: string }> {
      return writer.write({ ...event, firmId })
    },

    async writeBatch(events: Array<Omit<AuditEventInput, 'firmId'>>): Promise<{ ids: string[] }> {
      return writer.writeBatch(events.map((event) => ({ ...event, firmId })))
    },

    async listByFirm(
      opts: { action?: string; actorId?: string; limit?: number } = {},
    ): Promise<AuditEvent[]> {
      const result = await this.list({ ...opts, range: 'all' })
      return result.rows
    },

    async list(input: AuditListInput = {}): Promise<AuditListResult> {
      const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
      const filters: SQL[] = [eq(auditEvent.firmId, firmId)]

      const start = rangeStart(input.range)
      if (start) filters.push(gte(auditEvent.createdAt, start))
      if (input.action) filters.push(eq(auditEvent.action, input.action))
      if (input.actorId) filters.push(eq(auditEvent.actorId, input.actorId))
      if (input.actorType) {
        if (input.actorType === 'ai_any') {
          filters.push(inArray(auditEvent.actorType, ['ai', 'ai_assisted'] as const))
        } else if (AUDIT_ACTOR_TYPES.includes(input.actorType)) {
          filters.push(eq(auditEvent.actorType, input.actorType))
        }
      }
      if (input.entityType) filters.push(eq(auditEvent.entityType, input.entityType))
      if (input.entityId) filters.push(eq(auditEvent.entityId, input.entityId))
      if (input.category) {
        const filter = categoryFilter(input.category)
        if (filter) filters.push(filter)
      }

      const search = normalizeAuditSearch(input.search)
      if (search) {
        const needle = `%${escapeLikePattern(search)}%`
        filters.push(
          or(
            sql`lower(${auditEvent.action}) like ${needle} escape '\\'`,
            sql`lower(${auditEvent.entityType}) like ${needle} escape '\\'`,
            sql`lower(${auditEvent.entityId}) like ${needle} escape '\\'`,
            sql`lower(${auditEvent.reason}) like ${needle} escape '\\'`,
          )!,
        )
      }

      if (input.cursor) {
        const decoded = decodeCursor(input.cursor)
        if (decoded) {
          filters.push(
            or(
              lt(auditEvent.createdAt, decoded.createdAt),
              and(eq(auditEvent.createdAt, decoded.createdAt), lt(auditEvent.id, decoded.id)),
            )!,
          )
        }
      }

      const rawRows = await db
        .select({
          id: auditEvent.id,
          firmId: auditEvent.firmId,
          actorId: auditEvent.actorId,
          actorLabel: user.name,
          // η pass — F-035 / F-037: expose the new columns so the UI can
          // render AI provenance + the optional metadata disclosure.
          actorType: auditEvent.actorType,
          previousActorType: auditEvent.previousActorType,
          aiEventMetadataJson: auditEvent.aiEventMetadataJson,
          entityType: auditEvent.entityType,
          entityId: auditEvent.entityId,
          action: auditEvent.action,
          beforeJson: auditEvent.beforeJson,
          afterJson: auditEvent.afterJson,
          reason: auditEvent.reason,
          ipHash: auditEvent.ipHash,
          userAgentHash: auditEvent.userAgentHash,
          createdAt: auditEvent.createdAt,
        })
        .from(auditEvent)
        .leftJoin(user, eq(auditEvent.actorId, user.id))
        .where(and(...filters))
        .orderBy(desc(auditEvent.createdAt), desc(auditEvent.id))
        .limit(limit + 1)

      const hasMore = rawRows.length > limit
      const rows = hasMore ? rawRows.slice(0, limit) : rawRows
      const lastRow = rows[rows.length - 1]

      return {
        rows,
        nextCursor: hasMore && lastRow ? encodeCursor(lastRow) : null,
      }
    },

    async createEvidencePackage(input: {
      exportedByUserId: string
      scope: AuditEvidencePackage['scope']
      scopeEntityId?: string | null
      rangeStart?: Date | null
      rangeEnd?: Date | null
      expiresAt: Date
    }): Promise<{ id: string }> {
      const id = crypto.randomUUID()
      await db.insert(auditEvidencePackage).values({
        id,
        firmId,
        exportedByUserId: input.exportedByUserId,
        scope: input.scope,
        scopeEntityId: input.scopeEntityId ?? null,
        rangeStart: input.rangeStart ?? null,
        rangeEnd: input.rangeEnd ?? null,
        expiresAt: input.expiresAt,
      })
      return { id }
    },

    async getEvidencePackage(id: string): Promise<AuditEvidencePackage | undefined> {
      const [row] = await db
        .select()
        .from(auditEvidencePackage)
        .where(and(eq(auditEvidencePackage.firmId, firmId), eq(auditEvidencePackage.id, id)))
        .limit(1)
      return row
    },

    async listEvidencePackages(opts: { limit?: number } = {}): Promise<AuditEvidencePackage[]> {
      const q = db
        .select()
        .from(auditEvidencePackage)
        .where(eq(auditEvidencePackage.firmId, firmId))
        .orderBy(desc(auditEvidencePackage.createdAt))
      return opts.limit ? await q.limit(opts.limit) : await q
    },

    async markEvidencePackageRunning(id: string): Promise<void> {
      await db
        .update(auditEvidencePackage)
        .set({ status: 'running', updatedAt: new Date() })
        .where(and(eq(auditEvidencePackage.firmId, firmId), eq(auditEvidencePackage.id, id)))
    },

    async completeEvidencePackage(input: {
      packageId: string
      fileCount: number
      fileManifestJson: unknown
      sha256Hash: string
      r2Key: string
      expiresAt: Date
    }): Promise<void> {
      await db
        .update(auditEvidencePackage)
        .set({
          status: 'ready',
          fileCount: input.fileCount,
          fileManifestJson: input.fileManifestJson,
          sha256Hash: input.sha256Hash,
          r2Key: input.r2Key,
          expiresAt: input.expiresAt,
          failureReason: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(auditEvidencePackage.firmId, firmId),
            eq(auditEvidencePackage.id, input.packageId),
          ),
        )
    },

    async failEvidencePackage(id: string, failureReason: string): Promise<void> {
      await db
        .update(auditEvidencePackage)
        .set({ status: 'failed', failureReason, updatedAt: new Date() })
        .where(and(eq(auditEvidencePackage.firmId, firmId), eq(auditEvidencePackage.id, id)))
    },
  }
}

export type AuditRepo = ReturnType<typeof makeAuditRepo>
