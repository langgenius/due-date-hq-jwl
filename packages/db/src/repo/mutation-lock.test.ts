/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Drizzle chain doubles only implement the query-builder methods the
 * mutation-lock repo calls (insert/values/onConflictDoUpdate/returning, delete/where).
 */
import { describe, expect, it, vi } from 'vitest'
import type { Db } from '../client'
import { makeMutationLockRepo } from './mutation-lock'

function fakeDb(returningRows: unknown[]) {
  const returning = vi.fn(async () => returningRows)
  const onConflictDoUpdate = vi.fn(() => ({ returning }))
  const values = vi.fn(() => ({ onConflictDoUpdate }))
  const insert = vi.fn(() => ({ values }))
  const where = vi.fn(async () => undefined)
  const del = vi.fn(() => ({ where }))
  const db = { insert, delete: del } as unknown as Db
  return { db, insert, values, onConflictDoUpdate, returning, del, where }
}

describe('makeMutationLockRepo', () => {
  it('acquires the lock when the conditional upsert returns a row', async () => {
    const { db, values, onConflictDoUpdate } = fakeDb([{ key: 'k' }])
    const now = new Date('2026-05-01T00:00:00.000Z')

    const acquired = await makeMutationLockRepo(db).tryAcquire('pulse:lock:firm:alert', 60_000, now)

    expect(acquired).toBe(true)
    expect(values).toHaveBeenCalledWith({
      key: 'pulse:lock:firm:alert',
      acquiredAt: now,
      expiresAt: new Date('2026-05-01T00:01:00.000Z'),
    })
    // Takeover is gated on expiry (setWhere), not an unconditional overwrite.
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: { acquiredAt: now, expiresAt: new Date('2026-05-01T00:01:00.000Z') },
        setWhere: expect.anything(),
      }),
    )
  })

  it('fails to acquire when a live lock leaves the upsert returning empty', async () => {
    const { db } = fakeDb([])

    const acquired = await makeMutationLockRepo(db).tryAcquire('k', 60_000, new Date())

    expect(acquired).toBe(false)
  })

  it('releases by deleting the key', async () => {
    const { db, del, where } = fakeDb([])

    await makeMutationLockRepo(db).release('pulse:lock:firm:alert')

    expect(del).toHaveBeenCalledTimes(1)
    expect(where).toHaveBeenCalledTimes(1)
  })
})
