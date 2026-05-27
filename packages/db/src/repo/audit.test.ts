import { describe, expect, it, vi } from 'vitest'
import type { Db } from '../client'
import { makeAuditRepo, normalizeAuditSearch, type AuditListRow } from './audit'

function createFakeDb(rows: AuditListRow[]) {
  const limit = vi.fn(async (_n: number) => rows)
  const orderBy = vi.fn(() => ({ limit }))
  const where = vi.fn(() => ({ orderBy }))
  const leftJoin = vi.fn(() => ({ where }))
  const from = vi.fn(() => ({ leftJoin }))
  const select = vi.fn(() => ({ from }))
  const insertValues = vi.fn(async () => undefined)
  const insert = vi.fn(() => ({ values: insertValues }))

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- focused Drizzle test double.
    db: { select, insert } as unknown as Db,
    select,
    where,
    orderBy,
    limit,
  }
}

function makeRow(over: Partial<AuditListRow> = {}): AuditListRow {
  return {
    id: over.id ?? '11111111-1111-4111-8111-111111111111',
    firmId: over.firmId ?? 'firm_a',
    actorId: over.actorId ?? 'user_1',
    actorLabel: over.actorLabel ?? 'Alex Chen',
    // η pass: AI-provenance columns default to user / null in fixtures.
    actorType: over.actorType ?? 'user',
    previousActorType: over.previousActorType ?? null,
    aiEventMetadataJson: over.aiEventMetadataJson ?? null,
    entityType: over.entityType ?? 'obligation',
    entityId: over.entityId ?? '22222222-2222-4222-8222-222222222222',
    action: over.action ?? 'obligation.status.updated',
    beforeJson: over.beforeJson ?? { status: 'pending' },
    afterJson: over.afterJson ?? { status: 'done' },
    reason: over.reason ?? null,
    ipHash: over.ipHash ?? null,
    userAgentHash: over.userAgentHash ?? null,
    createdAt: over.createdAt ?? new Date('2026-04-28T00:00:00.000Z'),
  }
}

describe('makeAuditRepo.list', () => {
  it('normalizes audit search before building a LIKE query', () => {
    expect(normalizeAuditSearch('  Obligation%%% Status;;;Updated  ')).toBe(
      'obligation status updated',
    )
    expect(normalizeAuditSearch('%_audit\\event_'.repeat(8))?.length).toBeLessThanOrEqual(80)
    expect(normalizeAuditSearch(';;;')).toBeNull()
  })

  it('returns rows with no nextCursor when limit is not exceeded', async () => {
    const fake = createFakeDb([makeRow({ id: 'a' }), makeRow({ id: 'b' })])
    const repo = makeAuditRepo(fake.db, 'firm_a')

    const result = await repo.list({ limit: 50, range: 'all' })

    expect(result.rows).toHaveLength(2)
    expect(result.nextCursor).toBeNull()
    expect(fake.limit).toHaveBeenCalledWith(51)
    expect(fake.where).toHaveBeenCalledTimes(1)
  })

  it('emits nextCursor when more rows exist', async () => {
    const rows: AuditListRow[] = []
    for (let i = 0; i < 6; i += 1) {
      rows.push(
        makeRow({
          id: `0000000${i}-0000-4000-8000-000000000000`,
          createdAt: new Date(`2026-04-28T00:00:0${i}.000Z`),
        }),
      )
    }
    const fake = createFakeDb(rows)
    const repo = makeAuditRepo(fake.db, 'firm_a')

    const result = await repo.list({ limit: 5, range: 'all' })

    expect(result.rows).toHaveLength(5)
    expect(result.nextCursor).not.toBeNull()
  })

  it('clamps limit between 1 and 100', async () => {
    const fake = createFakeDb([])
    const repo = makeAuditRepo(fake.db, 'firm_a')

    await repo.list({ limit: 9999 })
    expect(fake.limit).toHaveBeenLastCalledWith(101)

    await repo.list({ limit: 0 })
    expect(fake.limit).toHaveBeenLastCalledWith(2)
  })

  it('decodes invalid cursor gracefully', async () => {
    const fake = createFakeDb([])
    const repo = makeAuditRepo(fake.db, 'firm_a')

    await expect(repo.list({ cursor: '!!!not-base64!!!', range: 'all' })).resolves.toEqual({
      rows: [],
      nextCursor: null,
    })
  })

  it('keeps the existing listByFirm compatibility wrapper', async () => {
    const fake = createFakeDb([makeRow({ action: 'client.created' })])
    const repo = makeAuditRepo(fake.db, 'firm_a')

    const rows = await repo.listByFirm({ action: 'client.created', limit: 10 })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.action).toBe('client.created')
  })
})
