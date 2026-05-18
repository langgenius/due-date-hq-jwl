import { Link, Outlet, useNavigation } from 'react-router'
import { useLingui } from '@lingui/react/macro'
import { BellIcon, CreditCardIcon, PanelLeftIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@duedatehq/ui/components/ui/sidebar'
import type { ThemePreference } from '@duedatehq/ui/theme'
import { FirmSwitcherTrigger, NavGroups } from './app-shell-nav'
import { UserMenuTrigger } from './app-shell-user-menu'
import type { FirmPublic } from '@duedatehq/contracts'
import { isFirmOwner, paidPlanActive } from '@/features/billing/model'
import type { AuthUser } from '@/lib/auth'
import {
  COMMAND_PALETTE_HOTKEY,
  formatCompactShortcutForDisplay,
} from '@/components/patterns/keyboard-shell/display'

/**
 * AppShell — layout-level shell shared by every protected layout.
 *
 * Composes self-built sidebar primitives from `@duedatehq/ui` (intentionally
 * NOT shadcn `Sidebar`; see `docs/dev-log/2026-04-27-app-shell-sidebar.md`)
 * plus the existing dropdown / sheet / theme primitives.
 *
 * Performance contract (vercel-react-best-practices):
 *  - rerender-no-inline-components: every helper component is module-level.
 *  - rerender-derived-state-no-effect: active-nav state is derived from URL
 *    via react-router `<NavLink>` — no React state, no effect.
 *  - rerender-functional-setstate: mobile sheet uses `setOpen(o => !o)`.
 *  - rerender-memo-with-default-value: `useNavItems` memoises the array so
 *    AppShell re-renders don't break referential equality of children.
 *  - bundle-analyzable-paths: no barrel; primitives imported by exact path.
 *  - advanced-init-once: `SidebarProvider` value/toggle are memoised inside.
 */

type RouteSummary = {
  eyebrow: string
  title: string
}

export type AppShellProps = {
  user: AuthUser
  firm: FirmPublic
  firms: FirmPublic[]
  route: RouteSummary
  themePreference: ThemePreference
  switchThemePreference: (next: ThemePreference) => void
  unreadNotificationCount?: number
}

export function AppShell(props: AppShellProps) {
  return (
    <SidebarProvider>
      {/*
        Layout invariant: the outer flex row is exactly viewport-height and
        clips overflow, so the sidebar stays pinned while only `<main>` (the
        route's content) scrolls. Setting `h-svh` on the row + `overflow-hidden`
        is the simplest path that doesn't require `position: sticky` games on
        the sidebar — and it keeps the bottom CTA / user row always visible.
      */}
      <div className="relative isolate flex h-svh w-full overflow-hidden bg-background-body text-text-primary">
        <PendingBar />
        <Sidebar>
          <FirmSwitcherTrigger firm={props.firm} firms={props.firms} />
          {/*
            Sibling 1px rib — identical technique to the rib below the route
            header (see SidebarInset), so both ribs sit at exactly y =
            header_h. No `border-b` mixing.
          */}
          <SidebarSeparator />
          <SidebarContent>
            <NavGroups firm={props.firm} />
          </SidebarContent>
          <SidebarFooter>
            <PlanStatusLink firm={props.firm} />
            <SidebarSeparator />
            <UserMenuTrigger
              user={props.user}
              themePreference={props.themePreference}
              switchThemePreference={props.switchThemePreference}
            />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <RouteHeader
            title={props.route.title}
            unreadNotificationCount={props.unreadNotificationCount ?? 0}
          />
          {/*
            The sibling 1px hairline (instead of `border-b` on `<header>`)
            puts the route-header rib at the same Y as the sidebar's
            Practice switcher hairline (both at `h_header + 0`), avoiding the
            1px collinearity drift caused by mixing `strokeAlign:'INSIDE'`
            with sibling rectangles.
          */}
          <div className="h-px shrink-0 bg-divider-regular" aria-hidden />
          <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-[1080px]">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

function PlanStatusLink({ firm }: { firm: FirmPublic }) {
  const { t } = useLingui()
  const owner = isFirmOwner(firm)
  const paid = paidPlanActive(firm)
  const plan =
    firm.plan === 'firm'
      ? t`Enterprise`
      : firm.plan === 'team'
        ? t`Team`
        : firm.plan === 'pro'
          ? t`Pro`
          : t`Solo`
  const seats = firm.seatLimit === 1 ? t`${firm.seatLimit} seat` : t`${firm.seatLimit} seats`
  const action = owner ? (paid ? t`Manage` : t`Upgrade`) : t`View`

  return (
    <div className="px-2 py-1.5">
      <Link
        to="/billing"
        aria-label={t`Open billing for ${plan} plan`}
        className={cn(
          'group/plan flex h-12 w-full touch-manipulation items-center gap-2.5 rounded-md border border-divider-regular bg-background-section px-3 outline-none transition-colors',
          'hover:border-divider-deep hover:bg-background-default-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-md border',
            paid
              ? 'border-brand-primary bg-brand-primary text-text-inverted'
              : 'border-state-accent-active bg-state-accent-hover-alt text-text-accent',
          )}
        >
          <CreditCardIcon className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-text-primary">{plan}</span>
          <span className="truncate font-mono text-xs tabular-nums text-text-muted">{seats}</span>
        </span>
        <span className="shrink-0 rounded-sm border border-divider-regular bg-background-default px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums text-text-secondary group-hover/plan:text-text-primary">
          {action}
        </span>
      </Link>
    </div>
  )
}

// -----------------------------------------------------------------------------
// PendingBar — 2px route-loading indicator (reads navigation.state)
// -----------------------------------------------------------------------------

function PendingBar() {
  const navigation = useNavigation()
  const isPending = navigation.state !== 'idle'

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 bg-divider-subtle')}
    >
      <div
        className={cn(
          // Animate transform only (compositor-friendly) and disable the
          // animation under prefers-reduced-motion.
          'h-full origin-left bg-state-accent-solid transition-transform duration-300 ease-out motion-reduce:transition-none',
          isPending ? 'scale-x-100' : 'scale-x-0',
        )}
      />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Route header — eyebrow + title (left) + AppShell-owned utility (right)
// -----------------------------------------------------------------------------

const KBD_CMDK = formatCompactShortcutForDisplay(COMMAND_PALETTE_HOTKEY)

function RouteHeader({
  title,
  unreadNotificationCount,
}: {
  title: string
  unreadNotificationCount: number
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 bg-background-default px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger>
          <PanelLeftIcon className="size-4" aria-hidden />
        </SidebarTrigger>
        <span className="truncate text-sm font-semibold text-text-primary">{title}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/*
          Mirrors Figma 159:2 exactly: 28×22 frame, no border, fill
          `surface/subtle`, text style `Numeric / Small` (Geist Mono Medium
          11/16) at `text/muted`. The narrow-no-break-space (`\u202f`) keeps
          modifier+key glued without a visible spacing gap.
        */}
        <kbd className="hidden h-[22px] items-center rounded-sm bg-background-subtle px-1.5 font-mono text-xs font-medium tabular-nums text-text-muted md:inline-flex">
          {KBD_CMDK}
        </kbd>
        <NotificationsBell unreadCount={unreadNotificationCount} />
      </div>
    </header>
  )
}

function NotificationsBell({ unreadCount }: { unreadCount: number }) {
  const { t } = useLingui()
  const hasUnread = unreadCount > 0
  return (
    <Link
      to="/notifications"
      aria-label={hasUnread ? t`Notifications, ${unreadCount} unread` : t`Notifications`}
      className={cn(
        'relative inline-flex size-7 cursor-pointer touch-manipulation items-center justify-center rounded-md border border-divider-regular bg-background-default text-text-secondary outline-none transition-colors',
        'hover:bg-background-default-hover hover:text-text-primary',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
      )}
    >
      <BellIcon className="size-4" aria-hidden />
      {hasUnread ? (
        <span
          aria-hidden
          className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-state-destructive-solid"
        />
      ) : null}
    </Link>
  )
}
