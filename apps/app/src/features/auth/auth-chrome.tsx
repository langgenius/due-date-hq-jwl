import { Fragment, type ComponentType, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Trans } from '@lingui/react/macro'
import { GlobeIcon, LockIcon, MailCheckIcon, ShieldIcon } from 'lucide-react'

import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'
import { BrandMark } from '@/components/primitives/brand-mark'

// Shared chrome for the full-bleed auth surfaces (login, 2FA, accept-invite),
// matching the Pencil auth cluster (pW6pK / uu9SI / e3FyUB): a brand anchor,
// an "all systems normal" status pill, the divider-separated trust line, and
// the page footer. Colors map to semantic tokens, not raw canvas hex.
//
// 2026-06-09 (Yuqi — auth flow polish): extracted so each screen composes the
// same chrome instead of re-inlining it. /login keeps its own copy for now
// (its structure is locked); the others share this.

// Brand anchor — 28px bars mark + serif wordmark + (optional) hairline +
// "for CPA firms". The wordmark is the brand serif (DueDate) with HQ as a quiet
// sans tag, so it reads "DueDate, the HQ" rather than one undifferentiated word.
// `tagline={false}` drops the divider + tagline for compact lockups (e.g. the
// /login sign-in card). `frame={false}` drops the navy square so only the bars
// show (used on /splash).
export function AuthBrandAnchor({
  className,
  tagline = true,
  frame = true,
  markClassName,
  animated = false,
}: {
  className?: string
  tagline?: boolean
  frame?: boolean
  /** Override the mark size, e.g. `h-5` for a smaller splash lockup. */
  markClassName?: string
  /**
   * Opt-in: settle the mark in with a calm fade + scale on mount (splash /
   * login entrances). Off by default so the always-present chrome surfaces
   * (2FA / accept-invite headers) keep their instant render. Reduced-motion is
   * handled globally via the root <MotionConfig reducedMotion="user">.
   */
  animated?: boolean
}) {
  const mark = <BrandMark frame={frame} {...(markClassName ? { className: markClassName } : {})} />
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {animated ? (
        <motion.span
          className="inline-flex"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
        >
          {mark}
        </motion.span>
      ) : (
        mark
      )}
      <span className="flex items-baseline gap-1 leading-none">
        <span className="font-serif text-[17px] font-medium tracking-[-0.1px] text-text-primary">
          DueDate
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
          HQ
        </span>
      </span>
      {tagline ? (
        <>
          <span aria-hidden className="h-3.5 w-px bg-divider-regular" />
          <span className="text-base font-medium italic tracking-[-0.1px] text-text-tertiary">
            <Trans>for CPA firms</Trans>
          </span>
        </>
      ) : null}
    </div>
  )
}

// "All systems normal" status pill (links to the public status page).
// Badge primitive — the same outline-chip-plus-dot family as every other
// state pill (members, sources, temporary rules); the render prop keeps
// it a real link to the status page.
export function AuthStatusPill() {
  return (
    <Badge
      variant="outline"
      className="bg-background-default text-text-secondary transition-colors hover:border-divider-regular"
      render={<a href="https://status.duedatehq.com" target="_blank" rel="noreferrer noopener" />}
    >
      <BadgeStatusDot tone="success" className="size-1.5" />
      <Trans>All systems normal</Trans>
    </Badge>
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
        // oxlint-disable-next-line no-array-index-key -- fixed-order TRUST_ITEMS, separator pattern
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
        <span className="font-mono text-[10px] text-text-tertiary">v2.18.4</span>
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
    <div className="flex h-dvh flex-col overflow-hidden bg-background-subtle text-text-primary dark:bg-bg-canvas">
      <header className="flex shrink-0 items-center gap-2.5 px-6 py-6 lg:px-10">
        <AuthBrandAnchor />
        <span className="flex-1" />
        <AuthStatusPill />
      </header>
      {/* Scroll-center: `m-auto` on the inner block centers content while there's
          room, but collapses to the top when the form is taller than the viewport
          — unlike `items-center`, which clips the top above an unreachable scroll
          origin (the page title would vanish on short viewports). */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-8">
        <div className="m-auto flex w-full flex-col items-center">{children}</div>
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
