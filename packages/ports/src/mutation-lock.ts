// Short-lived advisory lock used to serialize concurrent mutations on the same
// resource. `tryAcquire` is atomic and returns false when the lock is already
// held by a live (non-expired) holder.
export interface MutationLockRepo {
  tryAcquire(key: string, ttlMs: number, now?: Date): Promise<boolean>
  release(key: string): Promise<void>
}
