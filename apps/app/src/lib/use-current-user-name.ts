import { useRouteLoaderData } from 'react-router'

/** Route id used by the protected layout loader (mirrors router.tsx). */
const PROTECTED_ROUTE_ID = 'protected'

/**
 * Read the current user's display name from the protected layout
 * loader. Returns the trimmed name or null if the loader hasn't
 * resolved yet (mounted outside the protected tree, or during the
 * brief window before the first paint).
 *
 * Used by surfaces that need to label a row "yours" — Obligations
 * queue, Dashboard tiles. Comparing by name is fragile (display names
 * collide, can change), but `assigneeName` is the only field exposed
 * on the queue rows today. When the contract grows to expose the
 * assignee user id, switch this lookup over.
 */
export function useCurrentUserName(): string | null {
  const data = useRouteLoaderData(PROTECTED_ROUTE_ID)
  const name = data?.user?.name
  if (!name) return null
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Current auth user id from the same protected-layout loader. Prefer this
 * over `useCurrentUserName` for "is this row mine?" checks whenever the
 * row carries an assignee user id (display names collide and change) —
 * the Today actions table does since the 2026-06-10 scope work.
 */
export function useCurrentUserId(): string | null {
  const data = useRouteLoaderData(PROTECTED_ROUTE_ID)
  const id = data?.user?.id
  return typeof id === 'string' && id.length > 0 ? id : null
}
