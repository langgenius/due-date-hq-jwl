import { type ReactNode, useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowRightIcon, CircleCheckIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Plural, Trans, useLingui } from '@lingui/react/macro'

import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'
import { orpc } from '@/lib/rpc'
import { formatRelativeTime } from '@/lib/utils'
import { AuthBrandAnchor } from '@/features/auth/auth-chrome'

/**
 * SplashRoute — the post-login "welcome back" surface (Pencil node `QGZta`),
 * reached via the once-a-day welcome gate on the dashboard index
 * (`welcomeGateLoader` in router.tsx). It recaps firm activity since the user's
 * last dashboard visit, then drops them into the Today workbench.
 *
 * Data comes from `dashboard.welcomeRecap` (read-only). "Open your dashboard"
 * stamps the visit (`recordDashboardVisit`) so the gate won't re-trigger today,
 * then navigates to /today.
 */
export function SplashRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()

  const recapQuery = useQuery(orpc.dashboard.welcomeRecap.queryOptions({ staleTime: 0 }))
  const recordVisit = useMutation(orpc.dashboard.recordDashboardVisit.mutationOptions())

  // Forward-looking nudge (onboarding gap #4): the recap looks backward, but a
  // returning user who never finished setup needs a NEXT step. A cheap probe
  // (limit:1, shared cache key with /today) — when the firm still has no
  // clients, the splash points forward; the "Go to Today" button then lands on
  // the /today get-started hero that owns the actual import action.
  const clientsProbeQuery = useQuery(orpc.clients.listByFirm.queryOptions({ input: { limit: 1 } }))
  const needsClients = !clientsProbeQuery.isLoading && (clientsProbeQuery.data?.length ?? 0) === 0

  const data = recapQuery.data

  function openDashboard() {
    recordVisit.mutate(undefined, {
      onSettled: () => navigate('/today', { replace: true }),
    })
  }

  // Real recap lines — only render the activity that actually happened.
  const recapLines = useMemo<ReactNode[]>(() => {
    if (!data) return []
    const lines: ReactNode[] = []
    if (data.deadlinesSyncedCount > 0) {
      lines.push(
        <Plural
          key="synced"
          value={data.deadlinesSyncedCount}
          one="# deadline synced from your rules"
          other="# deadlines synced from your rules"
        />,
      )
    }
    if (data.newAlertCount > 0) {
      lines.push(
        <Plural
          key="alerts"
          value={data.newAlertCount}
          one="# new regulatory alert"
          other="# new regulatory alerts"
        />,
      )
    }
    if (data.remindersSentCount > 0) {
      lines.push(
        <Plural
          key="reminders"
          value={data.remindersSentCount}
          one="Reminder went out to # client"
          other="Reminders went out to # clients"
        />,
      )
    }
    if (data.clientsImportedCount > 0) {
      lines.push(
        <Plural
          key="clients"
          value={data.clientsImportedCount}
          one="# new client added"
          other="# new clients added"
        />,
      )
    }
    return lines
  }, [data])

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    [],
  )

  // Time-of-day greeting from the real client clock — not fiction.
  // Brackets: morning < 12, afternoon < 18, evening ≥ 18.
  const timeOfDayGreeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }, [])

  return (
    <div className="flex h-dvh w-full flex-col bg-background-subtle dark:bg-background-section">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 md:px-20 md:py-32">
        <div className="flex w-full max-w-[720px] flex-col items-center gap-8">
          {/* Brand lockup — frameless bars mark + serif wordmark (no navy square here). */}
          <AuthBrandAnchor tagline={false} frame={false} markClassName="h-5" animated />

          {/* Greeting */}
          <div className="flex w-full flex-col items-center gap-2.5">
            <h1 className="text-center text-[clamp(2rem,5vw,2.75rem)] font-semibold leading-[1.1] tracking-tight text-text-primary">
              {recapQuery.isLoading ? (
                // Reserve the name with an inline skeleton so it doesn't pop in
                // ~half a second after the greeting — keeps the load in sync
                // with the recap skeletons below instead of staggering. Uses an
                // inline <span> (not the block <Skeleton> div) so it's valid
                // phrasing content inside the <h1>.
                <span className="inline-flex items-baseline gap-2">
                  {timeOfDayGreeting === 'morning' ? (
                    <Trans>Good morning,</Trans>
                  ) : timeOfDayGreeting === 'afternoon' ? (
                    <Trans>Good afternoon,</Trans>
                  ) : (
                    <Trans>Good evening,</Trans>
                  )}
                  <span
                    aria-hidden
                    className="inline-block h-[0.7em] w-44 animate-pulse rounded-md bg-state-base-hover-alt align-middle"
                  />
                </span>
              ) : data?.userName ? (
                timeOfDayGreeting === 'morning' ? (
                  <Trans>Good morning, {data.userName}</Trans>
                ) : timeOfDayGreeting === 'afternoon' ? (
                  <Trans>Good afternoon, {data.userName}</Trans>
                ) : (
                  <Trans>Good evening, {data.userName}</Trans>
                )
              ) : timeOfDayGreeting === 'morning' ? (
                <Trans>Good morning</Trans>
              ) : timeOfDayGreeting === 'afternoon' ? (
                <Trans>Good afternoon</Trans>
              ) : (
                <Trans>Good evening</Trans>
              )}
            </h1>
            <p className="text-center text-[16px] font-normal text-text-tertiary">{todayLabel}</p>
          </div>

          {/* "While you were away" recap card */}
          <section
            aria-label={t`While you were away`}
            className="flex w-full flex-col gap-3.5 rounded-xl border border-divider-subtle bg-background-default px-7 py-6"
          >
            <div className="flex items-center gap-2">
              <span aria-hidden className="block size-1.5 rounded-full bg-state-success-solid" />
              <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
                {data?.sinceLastVisit ? (
                  <Trans>
                    While you were away · since {formatRelativeTime(data.sinceLastVisit)}
                  </Trans>
                ) : (
                  <Trans>While you were away</Trans>
                )}
              </CapsFieldLabel>
            </div>
            {recapQuery.isLoading ? (
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ) : recapLines.length > 0 ? (
              <motion.ul
                className="flex flex-col gap-2.5"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              >
                {recapLines.map((line, index) => (
                  <motion.li
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    variants={{
                      hidden: { opacity: 0, x: -8 },
                      show: { opacity: 1, x: 0 },
                    }}
                    transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
                    className="flex items-center gap-2.5 text-sm font-medium text-text-primary"
                  >
                    <CircleCheckIcon className="size-4 shrink-0 text-text-success" aria-hidden />
                    <span>{line}</span>
                  </motion.li>
                ))}
              </motion.ul>
            ) : (
              <p className="text-sm font-medium text-text-tertiary">
                <Trans>No activity since your last visit.</Trans>
              </p>
            )}
          </section>

          {/* Warning strip — real due-this-week count (only when > 0) */}
          {data && data.dueThisWeekCount > 0 ? (
            <div className="flex w-full items-center gap-2.5 rounded-lg bg-state-warning-hover px-3.5 py-2.5">
              <span aria-hidden className="block size-2 rounded-full bg-state-warning-solid" />
              {/* 2026-06-16 (audit): was font-semibold + warning color = the
                  banned red+bold double-highlight. The peach chip bg + dot
                  already carry the signal; text drops to 500 per canon
                  ("urgency gets color/size, never red+bold"). */}
              <span className="text-sm font-medium text-text-warning">
                <Plural
                  value={data.dueThisWeekCount}
                  one="You have # deadline due this week"
                  other="You have # deadlines due this week"
                />
              </span>
            </div>
          ) : null}

          {/* Forward-looking next step (only when setup is unfinished — no
              clients yet). Accent strip, mirrors the warning strip's shape. The
              action itself lives on /today (the get-started hero), reached via
              the button below — splash just points there. */}
          {needsClients ? (
            <div className="flex w-full items-center gap-2.5 rounded-lg bg-state-accent-hover px-3.5 py-2.5">
              <span aria-hidden className="block size-2 rounded-full bg-state-accent-solid" />
              <span className="text-sm font-medium text-text-accent">
                <Trans>Next: import your clients to start tracking deadlines</Trans>
              </span>
            </div>
          ) : null}

          {/* Primary CTA */}
          <Button
            size="lg"
            className="w-full max-w-[260px]"
            onClick={openDashboard}
            disabled={recordVisit.isPending}
          >
            <Trans>Go to Today</Trans>
            <ArrowRightIcon data-icon="inline-end" />
          </Button>

          {/* Ghost links removed 2026-06-11 (copy audit S4 — no fiction):
              "Quick tour" and "What's new" were wired to nothing. Restore
              only when real destinations exist. */}
        </div>
      </main>

      {/* Footer — last sign-in stamp from the session */}
      <footer className="px-4 pb-6 text-center md:pb-10">
        {data?.lastSignInAt ? (
          <p className="text-[11px] font-medium text-text-tertiary">
            {data.lastSignInIp ? (
              <Trans>
                Last sign-in: {formatRelativeTime(data.lastSignInAt)} from {data.lastSignInIp}
              </Trans>
            ) : (
              <Trans>Last sign-in: {formatRelativeTime(data.lastSignInAt)}</Trans>
            )}
          </p>
        ) : null}
      </footer>
    </div>
  )
}
