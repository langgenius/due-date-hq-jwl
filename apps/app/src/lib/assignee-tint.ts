/**
 * Shared assignee-avatar palette + hash. Used by every owner/assignee
 * avatar across the app (/clients directory column, /deadlines Owner
 * column, the client-detail header pill) so the same person reads with
 * the same tint everywhere.
 *
 * Extracted 2026-05-26 (Yuqi cross-table drift #10 — "Owner/Assignee
 * avatar size + initials hash consistency"). Before this module, the
 * tint table lived inside `ClientFactsWorkspace.tsx` and was only
 * applied on the /clients surface — /deadlines `AssigneeAvatar` fell
 * back to a single `bg-background-subtle` neutral, so "AR" and "KP"
 * looked identical on the deadlines queue. Now both surfaces share
 * the hash + palette.
 */

// Six muted background+text pairings. Picked to feel like assignee
// avatars (low chroma, distinguishable) without competing with the
// status / readiness palette which carries semantic meaning.
export const ASSIGNEE_TINTS = [
  'bg-state-base-hover-alt text-text-secondary',
  'bg-state-warning-hover text-text-primary',
  'bg-state-success-hover text-text-primary',
  'bg-state-destructive-hover text-text-primary',
  'bg-state-accent-hover-alt text-text-accent',
  'bg-background-subtle text-text-tertiary',
] as const

/**
 * FNV-1a-ish hash. Pure, stable per input — same name always lands in
 * the same bucket so the same person looks the same across the app.
 */
function hashStringToBucket(value: string, buckets: number): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = (hash * 16777619) >>> 0
  }
  return hash % buckets
}

/**
 * Returns the tailwind class string for the given assignee's avatar
 * background + text color. Stable across calls — same name → same
 * pairing.
 */
export function getAssigneeTint(name: string): string {
  // Bucket result is always in `[0, ASSIGNEE_TINTS.length)`, so the
  // lookup can't be undefined — coalesce keeps `noUncheckedIndexedAccess`
  // happy without an `!` non-null assertion.
  return ASSIGNEE_TINTS[hashStringToBucket(name, ASSIGNEE_TINTS.length)] ?? ASSIGNEE_TINTS[0]
}
