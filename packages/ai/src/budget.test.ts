import { describe, expect, it } from 'vitest'
import { aiBudgetLimit, consumeAiBudget, type AiBudgetKv } from './budget'

function memoryKv(): AiBudgetKv {
  const store = new Map<string, string>()
  return {
    async get(key) {
      return store.get(key) ?? null
    },
    async put(key, value) {
      store.set(key, value)
    },
  }
}

describe('aiBudgetLimit', () => {
  it('scales the migration bucket to ~2x the plan client limit', () => {
    expect(aiBudgetLimit({ plan: 'free', taskKind: 'migration' })).toBe(20)
    expect(aiBudgetLimit({ plan: 'solo', taskKind: 'migration' })).toBe(200)
    expect(aiBudgetLimit({ plan: 'pro', taskKind: 'migration' })).toBe(600)
    expect(aiBudgetLimit({ plan: 'team', taskKind: 'migration' })).toBe(2000)
  })

  it('gives the custom firm plan an unlimited migration bucket', () => {
    expect(aiBudgetLimit({ plan: 'firm', taskKind: 'migration' })).toBe(Number.POSITIVE_INFINITY)
  })

  it('uses a flat interactive daily ceiling for non-migration tasks', () => {
    expect(aiBudgetLimit({ plan: 'free', taskKind: 'brief' })).toBe(30)
    expect(aiBudgetLimit({ plan: 'solo', taskKind: 'insight' })).toBe(100)
    expect(aiBudgetLimit({ plan: 'pro', taskKind: 'readiness' })).toBe(100)
    expect(aiBudgetLimit({ plan: 'team', taskKind: 'pulse' })).toBe(100)
    expect(aiBudgetLimit({ plan: 'firm', taskKind: 'brief' })).toBe(500)
  })

  it('defaults to the pro plan when plan is omitted', () => {
    expect(aiBudgetLimit({ taskKind: 'brief' })).toBe(100)
    expect(aiBudgetLimit({ taskKind: 'migration' })).toBe(600)
  })
})

describe('consumeAiBudget', () => {
  function fakeKv(): AiBudgetKv & { store: Map<string, string> } {
    const store = new Map<string, string>()
    return {
      store,
      async get(key) {
        return store.get(key) ?? null
      },
      async put(key, value) {
        store.set(key, value)
      },
    }
  }

  it('keys the interactive bucket per day and the migration bucket per month', async () => {
    const kv = fakeKv()
    const now = new Date('2026-06-09T12:00:00.000Z')
    await consumeAiBudget({ kv, firmId: 'firm_1', plan: 'pro', taskKind: 'brief', now })
    await consumeAiBudget({ kv, firmId: 'firm_1', plan: 'pro', taskKind: 'migration', now })
    expect([...kv.store.keys()]).toEqual([
      'ai-budget:firm_1:2026-06-09:brief',
      'ai-budget:firm_1:2026-06:migration',
    ])
  })

  it('blocks once the bucket is exhausted and reports the limit', async () => {
    const kv = fakeKv()
    const now = new Date('2026-06-09T12:00:00.000Z')
    // free interactive ceiling is 30 — pre-fill it so the next consume is blocked.
    kv.store.set('ai-budget:firm_2:2026-06-09:brief', '30')
    const result = await consumeAiBudget({
      kv,
      firmId: 'firm_2',
      plan: 'free',
      taskKind: 'brief',
      now,
    })
    expect(result.allowed).toBe(false)
    expect(result.limit).toBe(30)
  })

  it('never blocks the unlimited firm migration bucket', async () => {
    const kv = fakeKv()
    const result = await consumeAiBudget({
      kv,
      firmId: 'firm_3',
      plan: 'firm',
      taskKind: 'migration',
    })
    expect(result.allowed).toBe(true)
    expect(result.key).toBeNull()
    expect(kv.store.size).toBe(0)
  })
})

describe('consumeAiBudget — system (no-firmId) ceiling', () => {
  const now = new Date('2026-06-09T00:00:00.000Z')

  it('fails open for system calls when no KV is available', async () => {
    const result = await consumeAiBudget({ taskKind: 'pulse', now })
    expect(result.allowed).toBe(true)
    expect(result.key).toBeNull()
  })

  it('enforces one shared global ceiling across system task kinds', async () => {
    const kv = memoryKv()
    const systemDailyLimit = 2
    expect((await consumeAiBudget({ taskKind: 'pulse', kv, now, systemDailyLimit })).allowed).toBe(
      true,
    )
    // A different system task kind draws from the same global bucket.
    expect(
      (await consumeAiBudget({ taskKind: 'insight', kv, now, systemDailyLimit })).allowed,
    ).toBe(true)
    const blocked = await consumeAiBudget({ taskKind: 'pulse', kv, now, systemDailyLimit })
    expect(blocked.allowed).toBe(false)
    expect(blocked.used).toBe(2)
    expect(blocked.limit).toBe(2)
  })

  it('keys system usage separately so it never consumes a firm bucket', async () => {
    const kv = memoryKv()
    await consumeAiBudget({ taskKind: 'pulse', kv, now, systemDailyLimit: 5 })
    const firm = await consumeAiBudget({
      taskKind: 'brief',
      kv,
      now,
      firmId: 'firm_1',
      plan: 'pro',
    })
    expect(firm.allowed).toBe(true)
    expect(firm.used).toBe(1)
  })
})
