/**
 * Client cycle list — preserves the **last-known filtered list order**
 * from `/clients` across the route boundary to `/clients/[id]` so the
 * detail page can offer prev/next navigation through the same subset.
 *
 * The list is written by the `/clients` route on every filteredClients
 * change and read by the detail page. Storage is `sessionStorage` so
 * the list dies with the tab — opening a deep link in a new tab gives
 * no cycle (and the arrows hide).
 *
 * Implementation notes:
 *  - Stored as a JSON array of client IDs (strings). Bounded at 500
 *    entries (the same cap as `clients.listByFirm`).
 *  - Read is safe-by-default: returns `[]` on a bad parse rather than
 *    throwing. The detail page's UI hides arrows when the cycle is
 *    empty or the current client isn't in it.
 *  - We deliberately don't track the filter URL alongside the IDs —
 *    if the user changes filters on the list and comes back, the new
 *    order overwrites the old one. Simpler than tracking sources.
 */

const STORAGE_KEY = 'clientCycleList:v1'
const MAX_ENTRIES = 500

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    // SafariPrivateBrowsing / sandbox: sessionStorage access throws.
    return null
  }
}

export function writeClientCycleList(clientIds: readonly string[]): void {
  const storage = getStorage()
  if (!storage) return
  const trimmed = clientIds.slice(0, MAX_ENTRIES)
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Quota or serialization error — silent fail; cycle isn't critical.
  }
}

export function readClientCycleList(): string[] {
  const storage = getStorage()
  if (!storage) return []
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

type ClientCycleNeighbors = {
  prev: string | null
  next: string | null
  position: number
  total: number
}

/**
 * Resolve the neighbors of `currentClientId` in the persisted cycle.
 * Returns `prev`/`next` as null when the client is at an edge or not
 * present in the list at all (e.g. arrived via deep link).
 */
export function neighborsInClientCycle(
  list: readonly string[],
  currentClientId: string,
): ClientCycleNeighbors {
  const index = list.indexOf(currentClientId)
  if (index === -1) {
    return { prev: null, next: null, position: 0, total: list.length }
  }
  return {
    prev: index > 0 ? (list[index - 1] ?? null) : null,
    next: index < list.length - 1 ? (list[index + 1] ?? null) : null,
    position: index + 1,
    total: list.length,
  }
}
