import { Outlet, useNavigation } from 'react-router'

import { cn } from '@duedatehq/ui/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarSeparator,
} from '@duedatehq/ui/components/ui/sidebar'
import type { ThemePreference } from '@duedatehq/ui/theme'
import { FirmSwitcherTrigger, NavGroups } from './app-shell-nav'
import { PulseNotificationsBell } from './pulse-notifications-bell'
import { UserMenuTrigger } from './app-shell-user-menu'
import type { FirmPublic } from '@duedatehq/contracts'
import type { AuthUser } from '@/lib/auth'

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
}

export function AppShell(props: AppShellProps) {
  return (
    <SidebarProvider>
      {/*
        Layout invariant: the outer flex row is exactly viewport-height and
        clips overflow, so the sidebar stays pinned while only `<main>` (the
        route's content) scrolls. Setting `h-svh` on the row + `overflow-hidden`
        is the simplest path that doesn't require `position: sticky` games on
        the sidebar.
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
          {/* Account controls relocated from the removed route header
            strip — notifications bell + user menu (account, sign out)
            sit at the sidebar bottom alongside Settings, which is
            where personal-account controls belong. */}
          <div className="flex items-center gap-3 border-t border-divider-regular px-2 py-2">
            <PulseNotificationsBell />
            <UserMenuTrigger
              user={props.user}
              firm={props.firm}
              themePreference={props.themePreference}
              switchThemePreference={props.switchThemePreference}
            />
          </div>
        </Sidebar>
        <SidebarInset className="bg-background-default">
          {/* Route header strip removed — page title was redundant
            with the sidebar selection state, and notifications + user
            menu now live in the sidebar footer (alongside Settings)
            where account-level controls belong.
            bg-background-default makes the inset white (Notion/Linear
            pattern: gray rail, white work surface). */}
          <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            {/* Bumped from 1080px → 2xl (1536px) so wide table surfaces
              like Coverage's 52×11 matrix fit without clipping.
              Prose-heavy pages still get the page's own internal
              padding; only the outer cap moved. */}
            <div className="mx-auto w-full max-w-screen-2xl">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
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
