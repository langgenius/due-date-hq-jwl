import { useMemo } from 'react'

import { usePracticeTimezone } from '@/features/firm/practice-timezone'

// Canonical "as of" date hook for client surfaces (ClientDetailDrawer,
// ClientPeekHoverCard, ClientSummaryStrip). Calling `Date.now()` directly
// drifts from the firm's clock when the practice operates in a different
// timezone (Pacific firm, East-Coast server, etc.) — the "Xd late" reading
// could flip a day either direction depending on the server's wall clock.
//
// The hook mirrors the server's `dateInTimezone` (see
// `apps/server/src/procedures/dashboard/index.ts`): take today's
// wall-clock date AT THE FIRM'S TIMEZONE and return an ISO date
// string (YYYY-MM-DD). Surfaces use this string as the "as of" anchor
// for all day-math against `currentDueDate`. Returns `null` only if
// the consumer explicitly passes a falsy override; callers should
// always render with a Date.now() fallback if `null` slips through.
//
// Why this lives in `features/firm/` and not `features/clients/`:
// the helper is timezone-coupled, not client-coupled. Future surfaces
// (workload, calendar, etc.) can adopt this same hook to stay in
// sync with the firm's clock.

function todayInTimezone(timezone: string, now: Date = new Date()): string {
  // en-CA renders YYYY-MM-DD by default — same shape as the server
  // helper. Using formatToParts is overkill for our needs; `en-CA`
  // is the established convention across this codebase
  // (see apps/server/src/procedures/dashboard/index.ts).
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function useFirmAsOfDate(): string {
  const timezone = usePracticeTimezone()
  return useMemo(() => todayInTimezone(timezone), [timezone])
}

// Test-friendly variant. Internal to this module today; exported in
// case a future deterministic test wants to swap "now."
export { todayInTimezone }
