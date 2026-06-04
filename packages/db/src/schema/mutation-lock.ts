import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Short-lived advisory lock backed by D1, so concurrent mutations on the same
// resource serialize atomically. Replaces the non-atomic KV get-then-put that
// guarded Pulse apply/revert (KV had a TOCTOU window between the read and the
// write). Rows are ephemeral: `tryAcquire` takes over any lock whose
// `expires_at` has already passed, so a Worker that dies mid-mutation can never
// deadlock the key.
export const mutationLock = sqliteTable('mutation_lock', {
  key: text('key').primaryKey(),
  acquiredAt: integer('acquired_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
})
