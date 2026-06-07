import type { ReactNode } from 'react'
import { ArrowRightIcon, CheckCircle2Icon } from 'lucide-react'
import { Link } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'

import brandMark from '@duedatehq/ui/assets/brand/brand-favicon.svg?url'
import { Button } from '@duedatehq/ui/components/ui/button'

/**
 * SplashRoute — the net-new post-login welcome screen (Pencil node
 * `QGZta`). A centered, single-column "you just signed in" surface that
 * recaps what changed while the CPA was away before dropping them into
 * the Today workbench.
 *
 * Anatomy (top → bottom, centered in a 720px column):
 *   • Brand lockup — the dark rounded mark + "DueDateHQ" wordmark.
 *   • Greeting — a big "Welcome back, {name}" H1 + the current date.
 *   • "While you were away" card — a success-eyebrow + a stacked list of
 *     check-marked recap lines (synced deadlines, new alerts, reminders
 *     sent, migration imports).
 *   • Warning strip — an amber "N deadlines due this week" nudge.
 *   • Primary CTA — "Open your dashboard" → `/today`.
 *   • Ghost links — quiet "Quick tour" / "What's new" secondary links.
 *   • Footer — a quiet last-sign-in stamp pinned to the bottom.
 *
 * The Pencil "Verdant" canvas hexes are intentionally mapped onto the
 * existing semantic token system — no new theme colors:
 *   - card surface → `bg-background-default` + `border-divider-regular`
 *   - success tones → `text-text-success` / `bg-state-success-hover`
 *   - warning strip → `bg-state-warning-hover` / `text-text-warning`
 *   - accent CTA → the canonical primary `<Button>`
 *
 * TODO(wire): this route renders standalone today. Triggering it as the
 * real first-of-the-day landing surface needs server/session signals we
 * don't have yet — `lastDashboardVisitAt` / last-sign-in IP on the user
 * model + a "while you were away" aggregate (synced count, new alert
 * count, reminders sent, migration imports since last visit). Until that
 * contract lands, the recap figures below are static fallbacks and the
 * post-login redirect in `router.tsx` still goes straight to `/`. See
 * the TODO(data) markers on each recap line.
 */
export function SplashRoute() {
  const { t } = useLingui()

  // TODO(data): all recap figures are static placeholders. They should
  // come from a "since last visit" aggregate keyed off the user's
  // lastDashboardVisitAt (no such contract today).
  const recapLines: ReactNode[] = [
    <Trans key="synced">12 deadlines synced from the IRS calendar</Trans>,
    <Trans key="alerts">3 new alerts (1 high-impact — CA FTB franchise extension)</Trans>,
    <Trans key="reminders">Reminders went out to 8 clients</Trans>,
    <Trans key="migration">Migration import completed (28 clients added)</Trans>,
  ]

  return (
    <div className="flex min-h-screen w-full flex-col bg-background-section">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 md:px-20 md:py-32">
        <div className="flex w-full max-w-[720px] flex-col items-center gap-8">
          {/* Brand lockup */}
          <div className="flex items-center gap-2.5">
            <img
              src={brandMark}
              alt=""
              aria-hidden
              width={24}
              height={24}
              className="size-6 rounded-md"
            />
            <span className="text-sm font-semibold tracking-tight text-text-primary">
              DueDateHQ
            </span>
          </div>

          {/* Greeting */}
          <div className="flex w-full flex-col items-center gap-2.5">
            <h1 className="text-center text-[clamp(2rem,5vw,2.75rem)] font-semibold leading-[1.1] tracking-tight text-text-primary">
              {/* TODO(data): first name comes from the session user; the
                  splash route is standalone so it can't read the
                  PROTECTED_ROUTE_ID loader yet. Static fallback shown. */}
              <Trans>Welcome back, Jules</Trans>
            </h1>
            <p className="text-center text-base font-medium text-text-tertiary">
              {/* TODO(data): the date should be "today" from the same
                  server clock the dashboard uses. */}
              <Trans>Tuesday · March 11, 2026</Trans>
            </p>
          </div>

          {/* "While you were away" recap card */}
          <section
            aria-label={t`While you were away`}
            className="flex w-full flex-col gap-3.5 rounded-2xl border border-divider-regular bg-background-default px-7 py-6"
          >
            <div className="flex items-center gap-2">
              <span aria-hidden className="block size-1.5 rounded-full bg-state-success-solid" />
              <span className="text-[11px] font-bold tracking-eyebrow text-text-muted uppercase">
                <Trans>While you were away · since Fri 6:14 PM</Trans>
              </span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {recapLines.map((line, index) => (
                <li
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className="flex items-center gap-2.5 text-sm font-medium text-text-primary"
                >
                  <CheckCircle2Icon className="size-4 shrink-0 text-text-success" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Warning strip */}
          <div className="flex w-full items-center gap-2.5 rounded-[10px] bg-state-warning-hover px-3.5 py-2.5">
            <span aria-hidden className="block size-2 rounded-full bg-state-warning-solid" />
            <span className="text-sm font-semibold text-text-warning">
              {/* TODO(data): "3" should be the real count of deadlines due
                  in the next 7 days for this firm. */}
              <Trans>You have 3 deadlines due this week</Trans>
            </span>
          </div>

          {/* Primary CTA */}
          <Button size="lg" className="h-12 w-full max-w-[260px]" render={<Link to="/today" />}>
            <Trans>Open your dashboard</Trans>
            <ArrowRightIcon data-icon="inline-end" />
          </Button>

          {/* Ghost links */}
          <div className="flex items-center gap-2.5 text-xs font-medium text-text-tertiary">
            <button
              type="button"
              className="rounded-sm outline-none transition-colors hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <Trans>Quick tour (90 sec)</Trans>
            </button>
            <span aria-hidden className="block size-[3px] rounded-full bg-text-muted" />
            <button
              type="button"
              className="rounded-sm outline-none transition-colors hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <Trans>What&apos;s new in 6.7</Trans>
            </button>
          </div>
        </div>
      </main>

      {/* Footer — quiet last-sign-in stamp */}
      <footer className="px-4 pb-6 text-center md:pb-10">
        {/* TODO(data): last sign-in time + IP come from the session /
            audit log; static fallback shown. */}
        <p className="text-[11px] font-medium text-text-muted">
          <Trans>Last sign-in: 2 days ago from 192.168.0.42</Trans>
        </p>
      </footer>
    </div>
  )
}
