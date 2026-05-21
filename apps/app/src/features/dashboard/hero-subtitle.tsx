import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRightIcon, InfoIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@duedatehq/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'

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
 * `DashboardHeroDetail` — the hover-reveal companion to the "Today"
 * H1 plus a Review button. Replaces the always-visible delta subtitle.
 *
 * Sarah-at-8am persona (per docs/Design/ux-audit-2026-05-21.md P1):
 * the dashboard hero says "Today, May 21" big and clean. Hovering it
 * (or focusing the trigger icon) opens a popover with the "what
 * changed since I last looked" breakdown. The Review button gives
 * a one-click jump into the Inbox where the new items live.
 *
 * Layout:
 *
 *   [Today, May 21]  [ⓘ]  [Review →]
 *                    ↑    ↑
 *                    │    primary action — opens /notifications
 *                    hover trigger — popover with delta details
 */
export function DashboardHeroDetail() {
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

  const lastVisitLabel = useMemo(() => {
    if (snapshot.previous === null) return t`First time today`
    const elapsedMs = snapshot.now - snapshot.previous
    if (elapsedMs > RECENT_THRESHOLD_MS) {
      const date = new Date(snapshot.previous)
      const formatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
      return t`Last opened ${formatter.format(date)}`
    }
    const minutes = Math.max(1, Math.round(elapsedMs / 60_000))
    return t`Last opened ${minutes} min ago`
  }, [snapshot.now, snapshot.previous, t])

  const reviewCount = newSinceLastVisit > 0 ? newSinceLastVisit : openAlerts.length

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger
          openOnHover
          delay={120}
          closeDelay={120}
          render={
            <button
              type="button"
              aria-label={t`Show today's details`}
              className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-text-tertiary outline-none hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            />
          }
        >
          <InfoIcon className="size-3.5" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 gap-2 p-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] font-medium tracking-[0.08em] text-text-tertiary uppercase">
              <Trans>As of {asOfTime}</Trans>
            </span>
            <span className="text-xs text-text-tertiary">{lastVisitLabel}</span>
          </div>
          <dl className="grid gap-1.5 text-sm">
            {newSinceLastVisit > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">
                  <Trans>New Pulse alerts</Trans>
                </dt>
                <dd className="font-mono tabular-nums text-text-primary">+{newSinceLastVisit}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">
                <Trans>Pulse alerts open</Trans>
              </dt>
              <dd className="font-mono tabular-nums text-text-primary">{openAlerts.length}</dd>
            </div>
          </dl>
          {openAlerts.length === 0 && newSinceLastVisit === 0 ? (
            <p className="text-xs text-text-tertiary">
              <Trans>Nothing urgent. Quiet morning.</Trans>
            </p>
          ) : null}
        </PopoverContent>
      </Popover>
      <Button variant="outline" size="sm" render={<Link to="/notifications" />}>
        <Trans>Review</Trans>
        {reviewCount > 0 ? (
          <span className="font-mono tabular-nums text-text-tertiary">
            <Plural value={reviewCount} one="# alert" other="# alerts" />
          </span>
        ) : null}
        <ArrowUpRightIcon data-icon="inline-end" />
      </Button>
    </div>
  )
}

/**
 * Kept as `DashboardHeroSubtitle` alias for backward-compatible imports
 * while the dashboard route migrates to the renamed `DashboardHeroDetail`.
 * Safe to delete after the route is updated.
 */
export const DashboardHeroSubtitle = DashboardHeroDetail
