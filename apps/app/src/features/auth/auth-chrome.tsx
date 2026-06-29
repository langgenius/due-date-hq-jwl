import { Fragment, type ComponentType, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Trans } from '@lingui/react/macro'
import { GlobeIcon, LockIcon, MailCheckIcon, ShieldIcon } from 'lucide-react'

import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'
import { BrandWordmark } from '@/components/primitives/brand-wordmark'

// Shared chrome for the full-bleed auth surfaces (login, 2FA, accept-invite),
// matching the Pencil auth cluster (pW6pK / uu9SI / e3FyUB): a brand anchor,
// an "all systems normal" status pill, the divider-separated trust line, and
// the page footer. Colors map to semantic tokens, not raw canvas hex.
//
// 2026-06-09 (Yuqi — auth flow polish): extracted so each screen composes the
// same chrome instead of re-inlining it. /login keeps its own copy for now
// (its structure is locked); the others share this.

// Brand anchor — the framed BrandWordmark lockup (navy app-icon tile + ivory
// bars + "DueDateHQ") + an optional hairline + "for CPA firms". The tile gives
// the mark identity (a bare bars mark reads as a hamburger icon) and makes the
// tilted bar read as intentional. `tagline={false}` drops the divider + tagline
// for compact lockups (e.g. the /login sign-in card).
export function AuthBrandAnchor({
  className,
  tagline = true,
  markClassName,
  animated = false,
}: {
  className?: string
  tagline?: boolean
  /** @deprecated The lockup is the framed BrandWordmark now. Ignored. */
  frame?: boolean
  /** Override the lockup height, e.g. `h-6` for a small /login lockup. */
  markClassName?: string
  /**
   * Opt-in: settle the lockup in with a calm fade + scale on mount (splash /
   * login entrances). Off by default so the always-present chrome surfaces
   * (2FA / accept-invite headers) keep their instant render. Reduced-motion is
   * handled globally via the root <MotionConfig reducedMotion="user">.
   */
  animated?: boolean
}) {
  // The framed lockup (option A) — navy tile + "DueDateHQ", via brand tokens.
  // Default kept small; callers can size down further (e.g. /login `h-6`).
  const lockup = <BrandWordmark className={cn('h-7', markClassName)} />
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {animated ? (
        <motion.span
          className="inline-flex"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
        >
          {lockup}
        </motion.span>
      ) : (
        lockup
      )}
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

// Page footer — the single shared footer for every auth surface (login, the
// centered onboarding/2FA shell, etc.) so the design stays aligned in one place.
// `showTrust` folds the reassurance line into the footer band (one bordered
// region) instead of a separate row floating above it: copyright + legal on the
// left, version + region pill on the right.
export function AuthFooter({ showTrust = false }: { showTrust?: boolean }) {
  return (
    <footer className="flex flex-col gap-2.5 border-t border-divider-subtle px-6 py-3 text-[11px] font-medium text-text-tertiary lg:px-10">
      {/* Left-aligned + no divider so it reads as a quiet footer line, not a
          full-width banded stripe above the legal row. */}
      {showTrust ? <AuthTrustLine className="justify-start text-left" /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
      <header className="flex shrink-0 items-center gap-2.5 px-6 py-4 lg:px-10">
        <AuthBrandAnchor markClassName="h-6" />
        <span className="flex-1" />
        <AuthStatusPill />
      </header>
      {/* Scroll-center: `m-auto` on the inner block centers content while there's
          room, but collapses to the top when the form is taller than the viewport
          — unlike `items-center`, which clips the top above an unreachable scroll
          origin (the page title would vanish on short viewports). */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4">
        <div className="m-auto flex w-full flex-col items-center">{children}</div>
      </main>
      {/* Trust line now lives inside the footer band (one region, not two). */}
      <AuthFooter showTrust />
    </div>
  )
}

// Canonical entry H1 for auth/entry surfaces (two-factor, error, etc.).
// Text-3xl, semibold (titles-only per canon), tight leading and tracking.
// Pass `as="h2"` for nested headings in the same auth shell.
export function AuthHeading({
  children,
  className,
  as: Tag = 'h1',
}: {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2'
}) {
  return (
    <Tag
      className={cn(
        'text-3xl font-semibold leading-[1.15] tracking-[-0.6px] text-text-primary',
        className,
      )}
    >
      {children}
    </Tag>
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
