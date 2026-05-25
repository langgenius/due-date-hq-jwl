import { describe, expect, it } from 'vitest'
import { createDb } from './client'
import { scoped } from './scoped'

const testD1: D1Database = {
  prepare(_query) {
    throw new Error('test D1 prepare not implemented')
  },
  batch: async <T = unknown>(_statements: D1PreparedStatement[]): Promise<D1Result<T>[]> => [],
  exec: async (_query) => ({ count: 0, duration: 0 }),
  withSession(_constraintOrBookmark) {
    throw new Error('test D1 session not implemented')
  },
  dump: async () => new ArrayBuffer(0),
}

const testDb = createDb(testD1)

describe('@duedatehq/db', () => {
  it('carries firmId through the scoped repo boundary', () => {
    const repo = scoped(testDb, 'firm_123')

    expect(repo.firmId).toBe('firm_123')
  })

  it('wires concrete migration copilot and pulse repos', () => {
    const repo = scoped(testDb, 'firm_123')

    expect(typeof repo.ai.findSuccessfulRun).toBe('function')
    expect(typeof repo.calendar.listForUser).toBe('function')
    expect(typeof repo.clients.create).toBe('function')
    expect(typeof repo.clients.findManyByIds).toBe('function')
    expect(typeof repo.obligations.createBatch).toBe('function')
    expect(typeof repo.obligations.findById).toBe('function')
    expect(typeof repo.obligations.findManyByIds).toBe('function')
    expect(typeof repo.obligations.updateStatusMany).toBe('function')
    expect(typeof repo.obligationQueue.list).toBe('function')
    expect(typeof repo.obligationQueue.facets).toBe('function')
    expect(typeof repo.obligationQueue.listSavedViews).toBe('function')
    expect(typeof repo.obligationQueue.createSavedView).toBe('function')
    expect(typeof repo.dashboard.load).toBe('function')
    expect(typeof repo.dashboard.createBriefPending).toBe('function')
    expect(typeof repo.pulse.listAlerts).toBe('function')
    expect(typeof repo.pulse.getDetail).toBe('function')
    expect(typeof repo.pulse.apply).toBe('function')
    expect(typeof repo.ruleConcreteDrafts?.upsert).toBe('function')
    expect(typeof repo.migration.createBatch).toBe('function')
    expect(typeof repo.audit.write).toBe('function')
    expect(typeof repo.audit.list).toBe('function')
    expect(typeof repo.evidence.write).toBe('function')
  })
})
