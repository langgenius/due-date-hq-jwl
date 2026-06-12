import { describe, expect, it, vi } from 'vitest'
import type { Db } from '@duedatehq/db'
import { createAuthSessionsRepo } from './auth-sessions'

function makeFakeDb(): {
  db: Db
  deleteSpy: ReturnType<typeof vi.fn>
  whereSpy: ReturnType<typeof vi.fn>
} {
  const whereSpy = vi.fn(async () => undefined)
  const deleteSpy = vi.fn(() => ({ where: whereSpy }))
  const db = { delete: deleteSpy } as unknown as Db
  return { db, deleteSpy, whereSpy }
}

describe('createAuthSessionsRepo', () => {
  it('deletes stale unverified two-factor setup rows for a user', async () => {
    const { db, deleteSpy, whereSpy } = makeFakeDb()

    await createAuthSessionsRepo(db).deleteUnverifiedTwoFactorSetups('user_1')

    expect(deleteSpy).toHaveBeenCalledTimes(1)
    expect(whereSpy).toHaveBeenCalledTimes(1)
  })
})
