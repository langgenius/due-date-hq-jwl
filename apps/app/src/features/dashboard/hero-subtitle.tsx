import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'

import { usePulseListAlertsQueryOptions } from '@/features/pulse/api'

// localStorage key for the "last time this user opened the dashboard"
// timestamp. Per-installation, not per-user — using `email` or `id` as a
// suffix would require a render-blocking session read on every visit.
// The harm of collisions on a shared laptop is minor (the delta count
// would be slightly off), and the upside is a snappy first paint.
const LAST_VISIT_KEY = 'duedatehq:dashboard:lastVisit'

// Treat anything older than 8h as "since yesterday." Shorter than that
// and we say "since you last looked." This matches the morning-glance
// vs. mid-day-check mental model — Sarah opens at 8am, then again at
// 2pm; only the 8am visit should hear about overnight changes.
const RECENT_THRESHOLD_MS = 8 * 60 * 60 * 1000

/**
 * `DashboardHeroSubtitle` — small "as of X · N new since Y" line that
 * sits under the "Today" hero.
 *
 * Sarah-at-8am persona (per docs/Design/ux-audit-2026-05-21.md P1)
 * needs to know what changed overnight without scanning every section.
 * This subtitle delivers a one-glance delta:
 *
 *   - First visit ever / no Pulse alerts → quiet "As of 9:42am"
 *   - Returning the same hour → "As of 9:42am · 2 Pulse alerts open"
 *   - Returning after >8h with new alerts → "As of 9:42am · 2 new
 *     Pulse alerts since yesterday"
 *
 * On mount we read the previous visit timestamp, then synchronously
 * write the new one so the next reload reflects this session. The
 * snapshot taken at mount is what feeds the delta — never recomputed,
 * so navigating away and back doesn't reset the count mid-session.
 */
export function DashboardHeroSubtitle() {
  const { t } = useLingui()
  const alertsQuery = useQuery(usePulseListAlertsQueryOptions(50))
  // Snapshot the "previous visit" timestamp on mount and write the new
  // one immediately. Without the snapshot, the delta would zero out as
  // soon as the localStorage write lands.
  const [snapshot] = useState<{ now: number; previous: number | null }>(() => {
    const now = Date.now()
    let previous: number | null = null
    try {
      const stored = window.localStorage.getItem(LAST_VISIT_KEY)
      if (stored) {
        const parsed = Number.parseInt(stored, 10)
        if (Number.isFinite(parsed) && parsed > 0) previous = parsed
      }
    } catch {
      // localStorage can throw on quota / private-mode. Treat as
      // first-visit silently.
    }
    return { now, previous }
  })

  // Write the new visit timestamp after first paint. Avoids running
  // during the render cycle and avoids racing the snapshot above.
  useEffect(() => {
    try {
      window.localStorage.setItem(LAST_VISIT_KEY, String(snapshot.now))
    } catch {
      // Same swallow as above — non-critical.
    }
  }, [snapshot.now])

  const alerts = alertsQuery.data?.alerts ?? []
  const openAlerts = alerts.filter((alert) => alert.status === 'matched')
  const newSinceLastVisit = useMemo(() => {
    const previous = snapshot.previous
    if (previous === null) return 0
    return openAlerts.filter((alert) => {
      const publishedAt = Date.parse(alert.publishedAt)
      return Number.isFinite(publishedAt) && publishedAt > previous
    }).length
  }, [openAlerts, snapshot.previous])

  const asOfTime = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(snapshot.now)),
    [snapshot.now],
  )

  const sinceLabel = useMemo(() => {
    if (snapshot.previous === null) return null
    const elapsedMs = snapshot.now - snapshot.previous
    return elapsedMs > RECENT_THRESHOLD_MS ? t`since yesterday` : t`since you last looked`
  }, [snapshot.now, snapshot.previous, t])

  return (
    <p className="text-[13px] leading-5 text-text-tertiary">
      <Trans>As of {asOfTime}</Trans>
      {newSinceLastVisit > 0 && sinceLabel ? (
        <>
          {' · '}
          <span className="text-text-secondary">
            <Plural
              value={newSinceLastVisit}
              one={`# new Pulse alert ${sinceLabel}`}
              other={`# new Pulse alerts ${sinceLabel}`}
            />
          </span>
        </>
      ) : openAlerts.length > 0 ? (
        <>
          {' · '}
          <span className="text-text-secondary">
            <Plural
              value={openAlerts.length}
              one="# Pulse alert open"
              other="# Pulse alerts open"
            />
          </span>
        </>
      ) : null}
    </p>
  )
}
