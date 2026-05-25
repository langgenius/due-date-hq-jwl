import { Outlet, useNavigation } from 'react-router'

import { cn } from '@duedatehq/ui/lib/utils'
import {
  Sidebar,
  SidebarCollapseToggle,
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
          {/* 2026-05-25 (Yuqi Today #28): notifications bell moved
              from the sidebar BOTTOM to the firm-switcher row at the
              top.
              2026-05-25 (Yuqi sidebar collapse): when the sidebar
              is collapsed (data-collapsed=true on the aside),
              the firm switcher + bell stack vertically so the
              bell remains reachable inside the 56px rail. Firm
              switcher trigger itself hides its label + chevron
              via its own data-aware styling — only the avatar
              tile renders.
              2026-05-25 (Yuqi sidebar collapse v2): collapse
              toggle moved here from the lonely centered row above
              the user menu. Lives at the right edge of the header
              row when expanded; stacks below the bell when
              collapsed. Top-of-sidebar placement matches the
              VSCode / Notion / Linear convention. */}
          <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsed=true]/sidebar:flex-col group-data-[collapsed=true]/sidebar:items-stretch group-data-[collapsed=true]/sidebar:gap-1 group-data-[collapsed=true]/sidebar:px-1.5">
            <div className="min-w-0 flex-1 group-data-[collapsed=true]/sidebar:flex group-data-[collapsed=true]/sidebar:justify-center">
              <FirmSwitcherTrigger firm={props.firm} firms={props.firms} />
            </div>
            <PulseNotificationsBell />
            <SidebarCollapseToggle className="group-data-[collapsed=true]/sidebar:mx-auto" />
          </div>
          {/*
            Sibling 1px rib — identical technique to the rib below the route
            header (see SidebarInset), so both ribs sit at exactly y =
            header_h. No `border-b` mixing.
          */}
          <SidebarSeparator />
          <SidebarContent>
            <NavGroups firm={props.firm} />
          </SidebarContent>
          {/* User menu stays at sidebar bottom — that's where
              account-level controls (Settings, account, sign out)
              belong per the Linear/Notion pattern. The bell moved
              up; this row simplifies to just the user menu now.
              2026-05-25 (Yuqi sidebar collapse v2): collapse
              toggle moved out of this row — it was rendering
              as a lonely centered chevron orphaned between the
              footer nav divider and the user. Now lives in the
              top firm-switcher row (right side). */}
          <div className="border-t border-divider-regular px-2 py-2">
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
            {/* Outer cap = 1280px per 2026-05-21 design call.
              Dashboard ("Today") narrows itself to 1100px via its
              own inner container — that's the reading-column page.
              Every other route (Obligations queue, Clients, Rules,
              Settings) lands at 1280px, which fits the queue's
              column set without horizontal scroll while still
              keeping content off the far edges of 27"+ monitors.

              2026-05-25 (sticky-header bug fix): added `h-full` and
              `flex flex-col` so the max-width wrapper propagates
              `<main>`'s definite height down to RulesPageShell
              (and any other route shell using `h-full`). Without
              it, `h-full` on the shell resolved against an
              auto-height parent and the inner overflow-y-auto
              never established a real scroll container — sticky
              elements like the rule library's TableHeader fell
              back to the document scroll context and never pinned. */}
            <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col">
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
