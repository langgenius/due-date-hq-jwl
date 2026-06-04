import type { PulseAlertPublic } from '@duedatehq/contracts'

const REVERT_WINDOW_MS = 24 * 60 * 60 * 1000

// Lightweight model for the 24h undo window. Mirrors the server-side
// `REVERT_WINDOW_MS` constant in `packages/db/src/repo/pulse.ts` so the UI can
// show a reasonable "X hours left" hint without a server round trip.
//
// The alert payload only exposes `publishedAt` + counts; the authoritative
// `revertExpiresAt` ships in the apply mutation response. We keep both code
// paths here so banner rows (which only have the alert) can show a coarse hint
// and the apply toast can pass an exact timestamp.

export function revertExpiresAt(appliedAtIso: string): Date {
  return new Date(new Date(appliedAtIso).getTime() + REVERT_WINDOW_MS)
}

export function isWithinRevertWindow(expiresAt: Date | string, now: Date = new Date()): boolean {
  const target = expiresAt instanceof Date ? expiresAt : new Date(expiresAt)
  return target.getTime() > now.getTime()
}

export function isAlertRevertable(alert: PulseAlertPublic): boolean {
  if (alert.sourceStatus === 'source_revoked') return false
  return alert.status === 'applied' || alert.status === 'partially_applied'
}
