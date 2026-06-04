// 2026-05-27 (audit-drain X1, D17): "Changes since last visit" surface.
//
// Mission (from φ's journey-audit J5 — "returned from vacation"): a
// CPA who walked away on Friday afternoon and lands back on Tuesday
// morning has no surface that says "here's what shifted while you
// were away." The queue doesn't differentiate "old" vs "since you
// last looked"; the audit log shows everything across the practice
// but isn't framed as a personal welcome-back read.
//
// MVP scope (this drain): a small section that sits between the
// PageHeader and the Alerts/Actions sections on /today. Pulls
// practice-wide audit events since the user's last dashboard visit,
// trims to the 5–10 highest-signal rows, and gives a "hide for this
// session" affordance so power users who don't want it can collapse
// it. The section is intentionally calm — soft border, no tint, no
// destructive coloring — because most "changes" are routine, not
// alarms.
//
// Why localStorage instead of a server-side `lastDashboardVisitAt`:
// no such field exists on the user model today (checked
// `apps/app/src/lib/use-current-user-name.ts` + the protected loader,
// and grepped the contracts package). Adding the field would be an
// ω-territory contract change. The localStorage fallback ships the
// surface now; the upgrade path is documented inline. Cross-device
// users will see the timer reset per-device — acceptable for an MVP
// "welcome back" view; not acceptable long-term.

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ChevronDownIcon, ChevronUpIcon, ClockIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { AuditEventPublic } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'
import { formatRelativeTime } from '@/lib/utils'
import { useAuditActionLabels, useAuditEntityTypeLabels } from '@/features/audit/audit-log-labels'
import {
  formatAuditActionLabel,
  formatAuditEntityTypeLabel,
  getAuditEntityDisplay,
} from '@/features/audit/audit-log-model'

// localStorage key namespace. Bumped if the data model ever changes
// (e.g. we move to a server-side timestamp and want to migrate).
const LAST_SEEN_STORAGE_KEY = 'duedatehq.dashboard.lastSeenAt.v1'
const COLLAPSED_STORAGE_KEY = 'duedatehq.dashboard.changesSince.collapsed.v1'

// 24h ceiling for "first visit ever" — we don't want to dump every
// event since the dawn of time on a brand-new account. If the user
// has no stored lastSeenAt, fall back to 24h.
const FIRST_VISIT_FALLBACK_MS = 24 * 60 * 60 * 1000

// How many events we render at most. Tuned to 8 — high enough to
// feel like a real summary, low enough to stay above-the-fold.
const MAX_VISIBLE_EVENTS = 8

// High-signal audit actions for the "welcome back" view. Filtering
// down to status changes, new alerts, member churn, and rule changes
// keeps the section focused on "what changed that affects my work
// today," not chatty ingest/ai-guard noise.
const HIGH_SIGNAL_ACTIONS = new Set<string>([
  'obligation.status.updated',
  'obligation.due_date.updated',
  'obligation.extension.decided',
  'obligation.input.requested',
  'obligation.readiness.updated',
  'client.created',
  'client.deleted',
  'client.assignee.updated',
  'pulse.apply',
  'pulse.approve',
  'pulse.review.requested',
  'pulse.reject',
  'member.invited',
  'member.accepted',
  'member.removed',
  'member.role.updated',
  'rules.accepted',
  'rules.rejected',
  'rules.created',
])

/**
 * Read the last-seen timestamp from localStorage. Returns null when
 * storage is unavailable (SSR, sandboxed iframe) or the value is
 * malformed.
 */
function readLastSeen(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_STORAGE_KEY)
    if (!raw) return null
    const date = new Date(raw)
    if (!Number.isFinite(date.getTime())) return null
    return raw
  } catch {
    return null
  }
}

function writeLastSeen(iso: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LAST_SEEN_STORAGE_KEY, iso)
  } catch {
    // localStorage can throw in private mode / over-quota — silent
    // failure is fine. The next visit will re-fall-back to 24h.
  }
}

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (collapsed) window.localStorage.setItem(COLLAPSED_STORAGE_KEY, '1')
    else window.localStorage.removeItem(COLLAPSED_STORAGE_KEY)
  } catch {
    // Same silent-failure rationale as writeLastSeen.
  }
}

/**
 * Map an audit event onto the surface it belongs to. Falls back to
 * the audit log itself when the entity type doesn't have a dedicated
 * landing surface. Keeping this map small and explicit on purpose —
 * the dashboard "changes" rows should always land somewhere
 * meaningful, never a 404.
 */
function entityHref(event: AuditEventPublic): string {
  switch (event.entityType) {
    case 'obligation':
    case 'obligation_instance':
    case 'obligation_batch':
      return `/deadlines/${event.entityId}`
    case 'client':
    case 'client_batch':
      return `/clients/${event.entityId}`
    case 'pulse_alert':
    case 'pulse_application':
    case 'pulse_firm_alert':
      return '/alerts'
    case 'member':
    case 'member_invitation':
      return '/settings/team'
    case 'obligation_rule':
    case 'rule_source':
      return '/rules/library'
    default:
      return `/audit?event=${event.entityId}`
  }
}

function ChangesSinceLastSection() {
  const { t } = useLingui()
  const actionLabels = useAuditActionLabels()
  const entityTypeLabels = useAuditEntityTypeLabels()

  // `lastSeenAt` is initialized at mount-time and frozen for the
  // life of the visit. We re-stamp it on unmount (see effect below)
  // so the NEXT visit reads "since the last time the dashboard was
  // open," not "since the current page render."
  const [lastSeenAt] = useState<string>(() => {
    const stored = readLastSeen()
    if (stored) return stored
    return new Date(Date.now() - FIRST_VISIT_FALLBACK_MS).toISOString()
  })

  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed())

  // Stamp "lastSeenAt = now" on unmount so a CPA who navigates away
  // and comes back tomorrow sees changes since today, not since some
  // earlier visit. We do this on cleanup, not on mount, so the
  // in-memory `lastSeenAt` for THIS render stays accurate.
  useEffect(() => {
    return () => {
      writeLastSeen(new Date().toISOString())
    }
  }, [])

  // Pull events since lastSeenAt. The audit.list contract doesn't
  // accept a `since` filter today, so we use the broadest available
  // range ("7d") and client-side-filter to events after lastSeenAt.
  // For users coming back after >7d this will under-report — that's
  // an acceptable MVP trade-off (long absences read as "lots
  // changed, check the audit log").
  //
  // Upgrade path: add a `since` parameter to AuditListInputSchema
  // (ω-territory) and replace the client-side filter below with a
  // server-side bound. That also fixes the under-report on long
  // absences and removes the 7d ceiling.
  const auditQuery = useQuery(
    orpc.audit.list.queryOptions({
      input: {
        range: '7d',
        limit: 50,
      },
    }),
  )

  const visibleEvents = useMemo(() => {
    const all = auditQuery.data?.events ?? []
    const lastSeenMs = new Date(lastSeenAt).getTime()
    return all
      .filter((event) => HIGH_SIGNAL_ACTIONS.has(event.action))
      .filter((event) => new Date(event.createdAt).getTime() > lastSeenMs)
      .slice(0, MAX_VISIBLE_EVENTS)
  }, [auditQuery.data, lastSeenAt])

  const totalCount = visibleEvents.length

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      writeCollapsed(next)
      return next
    })
  }, [])

  // Skip the section entirely while the query is in-flight on a
  // first paint — the empty / loading shimmer would just claim
  // vertical real estate above the most-urgent rows. Once we have
  // data, the section is either populated (events found) or shows
  // the calm empty-state line. We DO render a slim loading
  // placeholder so the section's vertical reservation is stable
  // between mounts (no layout shift when the query lands).
  if (auditQuery.isLoading) {
    return (
      <section aria-label={t`Changes since last visit`} className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-prose" />
      </section>
    )
  }

  // 2026-05-27 (X1 D17): suppress the section entirely on errors —
  // a "couldn't load changes" panel above the Actions row is
  // strictly worse than just hiding the read-back. The audit log
  // page is the canonical surface for failures.
  if (auditQuery.isError) return null

  return (
    <section
      aria-label={t`Changes since last visit`}
      // 2026-05-27 (X1 D17): visually quiet by design. Uses the
      // page's neutral surface tone (no destructive tint) so it
      // reads as informational, not as another alert zone. Same
      // rounded-xl/p-3 rhythm as the Alerts section keeps the
      // page's vertical cadence consistent.
      className="flex flex-col gap-2 rounded-xl bg-background-section p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-text-secondary">
          <ClockIcon className="size-3.5 text-text-tertiary" aria-hidden />
          <Trans>Changes since your last visit</Trans>
          {totalCount > 0 && !collapsed ? (
            <span className="text-xs font-normal tabular-nums text-text-tertiary">
              {totalCount}
            </span>
          ) : null}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          className="h-auto gap-1 px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary"
          aria-expanded={!collapsed}
          aria-controls="changes-since-last-list"
        >
          {collapsed ? (
            <>
              <Trans>Show</Trans>
              <ChevronDownIcon className="size-3" />
            </>
          ) : (
            <>
              <Trans>Hide</Trans>
              <ChevronUpIcon className="size-3" />
            </>
          )}
        </Button>
      </div>

      {collapsed ? null : totalCount === 0 ? (
        <p className="text-xs text-text-tertiary">
          <Trans>Nothing's changed since {formatRelativeTime(lastSeenAt)}.</Trans>
        </p>
      ) : (
        <ul id="changes-since-last-list" className="flex flex-col divide-y divide-divider-subtle">
          {visibleEvents.map((event) => (
            <ChangeRow
              key={event.id}
              event={event}
              actionLabel={formatAuditActionLabel(event.action, actionLabels)}
              entityTypeLabel={formatAuditEntityTypeLabel(event.entityType, entityTypeLabels)}
            />
          ))}
          {/* When the count maxed out the visible window, give a
              link out so users with a backlog can read the full
              list in /audit. Hidden under the cap to avoid
              "view more" clutter when the section is already
              showing everything. */}
          {auditQuery.data && (auditQuery.data.events.length ?? 0) > MAX_VISIBLE_EVENTS ? (
            <li className="pt-2">
              {/* 2026-05-31 (Yuqi DS-first revision): hand-rolled
                  muted-underline link replaced with the canonical
                  `<TextLink>` primitive. `hover:underline` is kept
                  as a className addition because the muted variant
                  intentionally has no underline-on-hover — same
                  affordance the original site carried. */}
              <TextLink
                variant="muted"
                size="default"
                className="underline-offset-2 hover:underline"
                render={<Link to="/audit" />}
              >
                <Plural
                  value={(auditQuery.data.events.length ?? 0) - MAX_VISIBLE_EVENTS}
                  one="# more in the audit log"
                  other="# more in the audit log"
                />
              </TextLink>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  )
}

function ChangeRow({
  event,
  actionLabel,
  entityTypeLabel,
}: {
  event: AuditEventPublic
  actionLabel: string
  entityTypeLabel: string
}) {
  const display = getAuditEntityDisplay(event, entityTypeLabel)
  return (
    <li className="py-1.5">
      <Link
        to={entityHref(event)}
        className={cn(
          'flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-sm px-1 py-0.5 text-xs',
          'text-text-secondary hover:bg-state-base-hover hover:text-text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        )}
      >
        <span className="font-medium text-text-primary">{actionLabel}</span>
        <span className="truncate text-text-secondary">{display.primary}</span>
        <span className="ml-auto shrink-0 tabular-nums text-text-tertiary">
          {formatRelativeTime(event.createdAt)}
        </span>
      </Link>
    </li>
  )
}

export { ChangesSinceLastSection }
