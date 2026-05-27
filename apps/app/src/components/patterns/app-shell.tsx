import { Outlet, useNavigation } from 'react-router'

import { cn } from '@duedatehq/ui/lib/utils'
import {
  Sidebar,
  SidebarCollapseToggle,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarSeparator,
  useSidebar,
} from '@duedatehq/ui/components/ui/sidebar'
import type { ThemePreference } from '@duedatehq/ui/theme'
import { FirmSwitcherTrigger, NavGroups } from './app-shell-nav'
import { SIDEBAR_TOGGLE_HOTKEY } from './keyboard-shell/display'
import { useAppHotkey, useKeyboardShortcutsBlocked } from './keyboard-shell/hooks'
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

type AppShellProps = {
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
      <SidebarKeyboardBindings />
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
          {/* 2026-05-26 (Yuqi sidebar reorg — bell moves out):
              the notifications bell has been lifted out of the
              sidebar entirely and now floats at the top-right
              corner of `SidebarInset` (see below). The benefit:
              the sidebar's top section is identical in both
              expanded and collapsed modes — JUST the firm
              switcher. No more vertical-stacking in collapsed
              mode, no more "where did my bell go" cognitive
              load when toggling. The rail now reads as one
              clean column top-to-bottom regardless of width.
              Reference: Linear / Notion / Vercel all keep
              notifications in the topbar area, never inside
              the nav rail. */}
          {/* 2026-05-25 (Yuqi rail alignment fix): collapsed mode
              centers the 32×32 firm-switcher avatar in the 56px
              rail; expanded mode lets it take its natural width
              starting from the left edge of the px-2 padding.
              2026-05-26 (Yuqi collapsed section height): expanded
              section is 72px tall (8px py + 56px button + 8px
              py). Without an override, collapsed shrank to 48px
              (8 + 32 + 8) and the rib separator pulled up by
              24px, making the workspace identity feel smaller
              when collapsed. `min-h-[72px]` + `items-center`
              keeps the 32×32 tile centered inside a 72px section
              so the rib lands at the same y position in both
              modes. */}
          {/* 2026-05-26 (Yuqi seventy-third pass — mount the
              dead SidebarCollapseToggle): the toggle component was
              exported but never rendered. Now sits in the header
              row beside the firm identity when expanded; stacks
              below the monogram when collapsed (the column is
              56px wide, can't fit two size-8 buttons side-by-
              side). Yuqi: "the absolute position of the icon of
              collapsed or expanded, should not change" — the
              toggle button is always size-8, always inside the
              header row, always at the right edge in expanded
              mode + centered below the monogram in collapsed
              mode. */}
          {/* 2026-05-26 (Yuqi sidebar fix — height parity): both modes
              now lock to a `h-[72px]` header section. Previously
              expanded relied on natural content height (py-2 + h-14
              FirmSwitcher = 72px) and collapsed used `min-h-[72px]` —
              same target but on different mechanisms, so any small
              tweak to padding/content drifted them apart. Hard-coding
              `h-[72px]` makes both modes pin to the exact same height
              regardless of inner content size. */}
          <div className="flex h-[72px] flex-col justify-center gap-1 px-2 py-2 group-data-[collapsed=true]/sidebar:items-center group-data-[collapsed=true]/sidebar:gap-2 group-data-[collapsed=true]/sidebar:px-0">
            <div className="flex w-full items-center gap-1 group-data-[collapsed=true]/sidebar:w-auto group-data-[collapsed=true]/sidebar:flex-col group-data-[collapsed=true]/sidebar:gap-2">
              <FirmSwitcherTrigger firm={props.firm} firms={props.firms} />
              <SidebarCollapseToggle />
            </div>
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
          {/* 2026-05-26 (Yuqi sidebar reorg — screenshot match):
              the footer is now TWO rows.
                • Row 1: collapse toggle. Sits above the avatar so
                  the toggle's "panel" affordance reads next to
                  the rail's bottom edge — the spot the user
                  associates with rail-handle interactions
                  (Figma sidebars, Linear, the reference
                  screenshot all put the toggle here).
                • Row 2: user avatar — identity anchor at the
                  very bottom of the rail.
              Both rows share the same border-top divider as a
              footer group so the visual separation between nav
              and footer reads as one block, not two stacked
              sections. */}
          {/* 2026-05-25 (Yuqi rail alignment fix): footer trigger
              shares the same rail centerline as header and nav. */}
          {/* 2026-05-26 (Yuqi sidebar reference-screenshot match):
              collapse toggle removed from the visible UI per the
              Frame 137 / Frame 134 reference. Rationale:
                • Hover-expand handles the "let me peek at the
                  labels" case — no explicit click needed.
                • Keyboard shortcut (SIDEBAR_TOGGLE_HOTKEY in
                  SidebarKeyboardBindings, currently `Cmd+B`-ish)
                  handles the "I want it permanently collapsed"
                  case for power users.
                • The visible toggle button was clutter — one more
                  icon in a rail that should read as identity →
                  nav → footer-actions → avatar, end of story.
              Footer simplified to a single row: just the user
              avatar / menu, anchored at the bottom of the rail.
              The Audit log + Settings items live inside
              SidebarContent's footer group (see NavGroups), NOT
              here — they're nav destinations, not chrome. */}
          <div className="flex border-t border-divider-regular px-2 py-2 group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0">
            <UserMenuTrigger
              user={props.user}
              firm={props.firm}
              themePreference={props.themePreference}
              switchThemePreference={props.switchThemePreference}
            />
          </div>
        </Sidebar>
        {/* 2026-05-26 (Yuqi twenty-first pass): SidebarInset bg
            wired to the canonical `--background-inset` token
            (#f4f4f4 in light mode). Change the token in
            packages/ui/src/styles/tokens/semantic-light.css to
            retone the entire product's work surface — no need to
            touch consumer code. */}
        <SidebarInset className="relative bg-background-inset">
          {/* 2026-05-26 (Yuqi sidebar reorg — bell moves out):
              notifications bell now floats at the top-right
              corner of the work surface, absolutely positioned
              against `SidebarInset` (which is `relative`). z-30
              keeps it above route content; `pointer-events-none`
              on the wrapper + `pointer-events-auto` on the
              inner div is unnecessary since the bell is small
              (32×32) and pages route around it via their own
              top-right padding. Page headers with their own
              top-right actions (e.g. /rules/pulse "Alert
              history" button) sit BELOW this bell in the page
              layout's natural padding, not collision-positioned
              against it. */}
          <div className="absolute right-3 top-3 z-30 md:right-4 md:top-4">
            <PulseNotificationsBell />
          </div>
          {/* Route header strip removed — page title was redundant
            with the sidebar selection state, and the user menu
            lives in the sidebar footer where account-level
            controls belong. The notifications bell floats at
            the top-right corner of this inset (above).
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
            <div className="mx-auto flex h-full w-full max-w-page-expanded flex-col">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

function SidebarKeyboardBindings() {
  const { isMobile, toggleCollapsed } = useSidebar()
  const shortcutsBlocked = useKeyboardShortcutsBlocked()

  useAppHotkey(SIDEBAR_TOGGLE_HOTKEY, () => toggleCollapsed(), {
    enabled: !isMobile && !shortcutsBlocked,
    requireReset: true,
    meta: {
      id: 'sidebar.toggle',
      name: 'Toggle sidebar',
      description: 'Collapse or expand the navigation rail.',
      category: 'global',
      scope: 'global',
    },
  })

  return null
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
