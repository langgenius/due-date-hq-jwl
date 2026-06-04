import { eq, lte } from 'drizzle-orm'
import type { Db } from '../client'
import { mutationLock } from '../schema/mutation-lock'

export function makeMutationLockRepo(db: Db) {
  return {
    // Atomic acquire via a single conditional upsert: insert the lock, or take
    // it over only if the existing row has already expired. SQLite evaluates
    // the `ON CONFLICT ... DO UPDATE ... WHERE` and `RETURNING` as one
    // statement, so two racing callers can never both win — exactly one gets a
    // returned row. Returns true iff this caller now holds the lock.
    //   - no existing row        -> INSERT runs            -> 1 row  -> true
    //   - existing row, expired  -> DO UPDATE runs (WHERE) -> 1 row  -> true (takeover)
    //   - existing row, live     -> DO UPDATE skipped       -> 0 rows -> false
    async tryAcquire(key: string, ttlMs: number, now: Date = new Date()): Promise<boolean> {
      const expiresAt = new Date(now.getTime() + ttlMs)
      const rows = await db
        .insert(mutationLock)
        .values({ key, acquiredAt: now, expiresAt })
        .onConflictDoUpdate({
          target: mutationLock.key,
          set: { acquiredAt: now, expiresAt },
          setWhere: lte(mutationLock.expiresAt, now),
        })
        .returning({ key: mutationLock.key })
      return rows.length > 0
    },

    async release(key: string): Promise<void> {
      await db.delete(mutationLock).where(eq(mutationLock.key, key))
    },
  }
}
