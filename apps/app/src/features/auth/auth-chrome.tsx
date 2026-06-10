import { Fragment, type ComponentType, type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { GlobeIcon, LockIcon, MailCheckIcon, ShieldIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

// Shared chrome for the full-bleed auth surfaces (login, 2FA, accept-invite),
// matching the Pencil auth cluster (pW6pK / uu9SI / e3FyUB): a brand anchor,
// an "all systems normal" status pill, the divider-separated trust line, and
// the page footer. Colors map to semantic tokens, not raw canvas hex.
//
// 2026-06-09 (Yuqi — auth flow polish): extracted so each screen composes the
// same chrome instead of re-inlining it. /login keeps its own copy for now
// (its structure is locked); the others share this.

// Brand anchor — 28px dark mark + wordmark + hairline + "for CPA firms".
export function AuthBrandAnchor({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-text-primary text-sm font-bold tracking-[-0.2px] text-text-primary-on-surface">
        D
      </span>
      <span className="text-[16px] font-semibold tracking-[-0.2px] text-text-primary">
        DueDateHQ
      </span>
      <span aria-hidden className="h-3.5 w-px bg-divider-regular" />
      <span className="text-base font-medium italic tracking-[-0.1px] text-text-tertiary">
        <Trans>for CPA firms</Trans>
      </span>
    </div>
  )
}

// "All systems normal" status pill (links to the public status page).
export function AuthStatusPill() {
  return (
    <a
      href="https://status.duedatehq.com"
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1.5 rounded-full border border-divider-subtle bg-background-default px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-divider-regular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-state-success-solid" />
      <Trans>All systems normal</Trans>
    </a>
  )
}

const TRUST_ITEMS: { Icon: ComponentType<{ className?: string }>; label: ReactNode }[] = [
  { Icon: LockIcon, label: <Trans>No password, no token to lose</Trans> },
  { Icon: MailCheckIcon, label: <Trans>One-time sign-in links expire in 10 minutes</Trans> },
  { Icon: ShieldIcon, label: <Trans>Your client data never leaves your jurisdiction</Trans> },
]

// The three-item, divider-separated trust line.
export function AuthTrustLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-center',
        className,
      )}
    >
      {TRUST_ITEMS.map((item, i) => (
        <Fragment key={i}>
          {i > 0 ? <span aria-hidden className="h-2.5 w-px bg-divider-subtle" /> : null}
          <span className="flex items-center gap-1.5 text-[11px] font-medium italic text-text-tertiary">
            <item.Icon className="size-[11px] shrink-0 text-text-muted" />
            {item.label}
          </span>
        </Fragment>
      ))}
    </div>
  )
}

// Page footer — copyright + legal on the left, version + region pill on right.
export function AuthFooter() {
  return (
    <footer className="flex flex-col gap-3 border-t border-divider-subtle px-6 py-3.5 text-[11px] font-medium text-text-tertiary sm:flex-row sm:items-center lg:px-10">
      <div className="flex flex-wrap items-center gap-2.5">
        <span>© {new Date().getFullYear()} DueDateHQ</span>
        {[
          { label: 'Terms', href: '/terms' },
          { label: 'Privacy', href: '/privacy' },
          { label: 'Security', href: '/security' },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-2.5">
            <span aria-hidden className="text-text-muted">
              ·
            </span>
            <a
              href={item.href}
              className="transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              {item.label}
            </a>
          </span>
        ))}
      </div>
      <span className="hidden flex-1 sm:block" />
      <div className="flex items-center gap-3.5">
        <span className="font-mono text-[10px] text-text-muted">v2.18.4 · build 9c3a1f</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-divider-subtle bg-background-default px-2.5 py-1">
          <GlobeIcon className="size-3 text-text-tertiary" aria-hidden />
          <span className="text-text-secondary">US East</span>
        </span>
      </div>
    </footer>
  )
}

// Full-bleed, one-screen auth shell for the CENTERED surfaces (2FA,
// accept-invite): brand bar on top, centered content, trust line + footer
// pinned below. Locked to the viewport (no page scroll); content scrolls
// internally only if a viewport is too short.
export function CenteredAuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg-canvas text-text-primary">
      <header className="flex shrink-0 items-center gap-2.5 px-6 py-6 lg:px-10">
        <AuthBrandAnchor />
        <span className="flex-1" />
        <AuthStatusPill />
      </header>
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-4">
        {children}
      </main>
      <AuthTrustLine className="shrink-0 px-6 pb-4 pt-2 lg:px-10" />
      <AuthFooter />
    </div>
  )
}

// White centered card used inside CenteredAuthScreen — rounded-20, 520px wide.
export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex w-full max-w-[520px] flex-col gap-7 rounded-xl border border-divider-subtle bg-background-default px-8 py-10 lg:px-16 lg:py-14',
        className,
      )}
    >
      {children}
    </div>
  )
}
