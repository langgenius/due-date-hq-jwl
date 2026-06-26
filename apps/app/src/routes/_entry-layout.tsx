import { Outlet, useLocation } from 'react-router'
import { Trans } from '@lingui/react/macro'

import { BrandMark } from '@/components/primitives/brand-mark'
import { BrandLogotype } from '@/components/primitives/brand-wordmark'
import { LocaleSwitcher } from '@/components/primitives/locale-switcher'

// React Router v7 pathless layout route shared by every "entry" surface — the
// pages users see between landing on the app and reaching the dashboard shell.
// Today that means `/login`, `/two-factor`, `/accept-invite`, `/onboarding`,
// `/migration/new`, and public readiness links. Each child owns the loader
// that decides whether the current session state may see that surface.
// Future entries (magic link landing, SSO consent, email verification)
// belong here too — sign-in is link-only, so there is no password-reset
// surface to plan for.
//
// We deliberately don't call this "_auth-layout" — `/onboarding` runs *after*
// authentication and only blocks until the user provisions a practice, so an
// "auth" framing would be misleading. The shared chrome justification is
// visual + semantic: header + footer carry no user metadata, no nav, no practice
// switcher; both surfaces are single-column, decoration-free, and meant to
// finish quickly so the user can leave them.
//
// Each child route runs its own loader independently — `EntryShell` itself has
// no loader, so the differing session-state gates of `/login` vs `/onboarding`
// stay isolated. See `apps/app/src/router.tsx`.
export function EntryShell() {
  const location = useLocation()
  const isMigrationActivation = location.pathname === '/migration/new'
  const isReadinessPortal = location.pathname.startsWith('/readiness/')

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-subtle text-text-primary">
      {/* Skip-to-content anchor for every entry-shell surface (login, OTP,
          accept-invite, onboarding, 2FA, migration, readiness portal) so
          keyboard users don't have to tab through brand mark + locale switcher
          on every entry beat. Hidden anchor that appears on focus and sends
          keyboard users straight to the main content. */}
      <a
        href="#entry-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-divider-regular focus:bg-background-default focus:px-3 focus:py-1.5 focus:text-sm focus:text-text-primary focus:shadow-overlay"
      >
        <Trans>Skip to content</Trans>
      </a>
      <EntryShellHeader />
      <main
        id="entry-main"
        className={
          isMigrationActivation
            ? 'flex min-h-0 flex-1 flex-col items-center justify-start overflow-y-auto px-6 py-6 lg:px-10'
            : isReadinessPortal
              ? 'flex min-h-0 flex-1 flex-col items-stretch justify-start overflow-y-auto'
              : 'flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12 lg:px-10'
        }
      >
        <Outlet />
      </main>
      {isMigrationActivation ? null : <EntryShellFooter />}
    </div>
  )
}

function EntryShellHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-divider-subtle px-6 lg:px-10">
      <div className="flex items-center gap-2 text-description">
        <span className="inline-flex shrink-0 items-center gap-2">
          <BrandMark frame className="size-5" />
          <BrandLogotype className="h-3.5 w-auto text-text-primary dark:text-brand-ivory" />
        </span>
        <span aria-hidden className="text-text-muted">
          /
        </span>
        <span className="text-text-secondary">
          <Trans>For US CPA practices</Trans>
        </span>
      </div>
      <LocaleSwitcher variant="ghost" />
    </header>
  )
}

function EntryShellFooter() {
  return (
    <footer className="flex h-12 shrink-0 items-center justify-between border-t border-divider-subtle px-6 text-xs font-medium text-text-tertiary lg:px-10">
      <span className="tabular-nums">
        <Trans>© {new Date().getFullYear()} DueDateHQ Inc.</Trans>
      </span>
      {/* The "All systems operational" pill is a real anchor to the public
          status page so users seeing an outage can verify or get details —
          opens in a new tab so the entry surface (often mid-login) isn't
          lost. */}
      <a
        href="https://status.duedatehq.com"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1.5 rounded-sm hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-status-done" />
        <Trans>All systems operational</Trans>
      </a>
    </footer>
  )
}
