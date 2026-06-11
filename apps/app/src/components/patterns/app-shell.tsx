import { Outlet, useNavigation, useNavigate, useLocation } from 'react-router'
import { useCallback, useEffect, useState } from 'react'
import { Trans } from '@lingui/react/macro'

import { cn } from '@duedatehq/ui/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from '@duedatehq/ui/components/ui/sidebar'
import type { ThemePreference } from '@duedatehq/ui/theme'
import { FirmIdentityHeader, NavGroups, SidebarQuickFind } from './app-shell-nav'
import { SIDEBAR_TOGGLE_HOTKEY } from './keyboard-shell/display'
import { useAppHotkey, useKeyboardShortcutsBlocked } from './keyboard-shell/hooks'
import { UserMenuTrigger, isReadOnlyDemoUser } from './app-shell-user-menu'
import type { FirmPublic } from '@duedatehq/contracts'
import { signOut, type AuthUser } from '@/lib/auth'

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
  route: RouteSummary
  themePreference: ThemePreference
  switchThemePreference: (next: ThemePreference) => void
}

// Public read-only demo banner: shown for `public_demo_*` visitors. The CTA
// ends the demo session and routes to /login so they can create a real account.
function DemoSignupBanner() {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const handleSignUp = useCallback(() => {
    if (leaving) return
    setLeaving(true)
    void (async () => {
      try {
        await signOut()
      } finally {
        await navigate('/login', { replace: true })
      }
    })()
  }, [leaving, navigate])
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-divider-regular bg-state-accent-hover px-4 py-2 text-center text-sm text-text-accent">
      <span className="font-medium">
        <Trans>You're exploring a live, read-only demo.</Trans>
      </span>
      <button
        type="button"
        onClick={handleSignUp}
        disabled={leaving}
        className="font-semibold underline underline-offset-2 outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:opacity-60"
      >
        <Trans>Sign up to manage your own deadlines</Trans>
      </button>
    </div>
  )
}

export function AppShell(props: AppShellProps) {
  // Seed the rail's
  // initial collapse from the landing path so a non-Today reload lands
  // collapsed with no expand→collapse flash. SidebarRouteSync keeps it
  // updated on every subsequent navigation.
  const { pathname } = useLocation()
  return (
    <SidebarProvider initialRouteCollapsed={pathname !== '/'}>
      <SidebarKeyboardBindings />
      <SidebarRouteSync />
      {/*
        Layout invariant: the outer flex row is exactly viewport-height and
        clips overflow, so the sidebar stays pinned while only `<main>` (the
        route's content) scrolls. Setting `h-svh` on the row + `overflow-hidden`
        is the simplest path that doesn't require `position: sticky` games on
        the sidebar.
      */}
      {/* The shell canvas is white — it shows in
          the gutters around the floating sidebar and behind the white
          work surface. The sidebar card carries a slight warm-gray fill
          instead (see `Sidebar` in sidebar.tsx) so it reads as lifted
          off the white. */}
      <div className="relative isolate flex h-svh w-full overflow-hidden bg-background-inset text-text-primary">
        <PendingBar />
        <Sidebar>
          {/* The notifications bell lives outside the sidebar
              entirely and floats at the top-right
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
          {/* Collapsed mode centers the 32×32 firm-switcher avatar in
              the 56px rail; expanded mode lets it take its natural width
              starting from the left edge of the px-2 padding.
              Expanded section is 72px tall (8px py + 56px button + 8px
              py). Without an override, collapsed would shrink to 48px
              (8 + 32 + 8) and the rib separator would pull up by 24px,
              making the workspace identity feel smaller when collapsed.
              `min-h-[72px]` + `items-center` keeps the 32×32 tile
              centered inside a 72px section so the rib lands at the same
              y position in both modes. */}
          {/* The SidebarCollapseToggle sits in the header row beside
              the firm identity when expanded; stacks below the monogram
              when collapsed (the column is 56px wide, can't fit two
              size-8 buttons side-by-side). The toggle button's absolute
              position must not shift between modes: it's always size-8,
              always inside the header row, always at the right edge in
              expanded mode + centered below the monogram in collapsed
              mode. */}
          {/* Both modes lock to a `h-[72px]` header section. Letting
              expanded rely on natural content height (py-2 + h-14
              FirmSwitcher = 72px) while collapsed used `min-h-[72px]`
              hit the same target on different mechanisms, so any small
              tweak to padding/content drifted them apart. Hard-coding
              `h-[72px]` makes both modes pin to the exact same height
              regardless of inner content size. */}
          {/* The EXPANDED workspace-identity section pins to 52px so its
              bottom seam lines up with the 52px content header bar across
              pages. COLLAPSED keeps
              72px — that mode stacks the 32px monogram + 32px collapse toggle
              vertically (8px gap = 72px), which can't compress into 52px. */}
          {/* The brand row carries no per-mode height of its own — the
              card panel's `p-3` owns the card padding, and the firm
              switcher's own h-14 sets the height. The collapse toggle
              hides itself when collapsed, so the row is just the firm
              identity in that mode. Identical metrics both ways → no jump.
              `pt-3` adds 12px above the brand on top of the panel's own
              12px, so the company tile sits ~24px down from the card's
              top edge with clear breathing room. `pb-3` adds 12px below
              the brand row too, separating the company identity from the
              Quick find row beneath it.
              The firm box spans the full header width — the collapse
              control is not here. It floats as an edge-handle arrow
              OUTSIDE the card, mounted by the Sidebar primitive itself
              (see SidebarCollapseToggle).
              The header is a static workspace identity — no dropdown, no
              switching, no Add-practice entry. */}
          <div className="flex items-center pt-3 pb-3">
            <FirmIdentityHeader firm={props.firm} />
          </div>
          {/* There's no 1px rib under the firm switcher — the Pencil
              design has no divider here. A "Quick find…" search
              affordance sits
              between the firm identity and the nav, opening the global
              ⌘K command palette. The card's padding + the search box's
              own surface carry the separation the rib used to provide. */}
          {/* pb-2 (Yuqi "some bottom padding"): the search needs air beneath
              it before the nav starts, so it doesn't sit flush against the
              first group. */}
          <div className="pb-2">
            <SidebarQuickFind />
          </div>
          <SidebarContent>
            <NavGroups firm={props.firm} />
          </SidebarContent>
          {/* The footer trigger shares the same rail centerline as
              header and nav. There is no visible collapse toggle here:
                • Hover-expand handles the "let me peek at the labels"
                  case — no explicit click needed.
                • The keyboard shortcut (SIDEBAR_TOGGLE_HOTKEY in
                  SidebarKeyboardBindings) handles the "I want it
                  permanently collapsed" case for power users.
                • A visible toggle button would be clutter — one more
                  icon in a rail that should read as identity → nav →
                  footer-actions → avatar.
              The footer is a single row: just the user avatar / menu,
              anchored at the bottom of the rail. The Audit log +
              Settings items live inside SidebarContent's footer group
              (see NavGroups), NOT here — they're nav destinations, not
              chrome.
              SidebarFooter bakes in the border-t, px-2 py-2, and the
              collapsed-mode centering rules. */}
          <SidebarFooter>
            <UserMenuTrigger
              user={props.user}
              firm={props.firm}
              themePreference={props.themePreference}
              switchThemePreference={props.switchThemePreference}
            />
          </SidebarFooter>
        </Sidebar>
        {/* SidebarInset bg is wired to the canonical
            `--background-inset` token (#f4f4f4 in light mode).
            Change the token in
            packages/ui/src/styles/tokens/semantic-light.css to
            retone the entire product's work surface — no need to
            touch consumer code. */}
        <SidebarInset className="relative bg-background-inset">
          {isReadOnlyDemoUser(props.user) ? <DemoSignupBanner /> : null}
          {/* The notifications bell is NOT a floating top-right chip —
              that read as orphaned chrome with no neighbour and no
              navigation context. It lives in the sidebar footer
              alongside Audit log + Settings so it sits in the
              navigation family. See app-shell-nav.tsx. */}
          {/* Route header strip removed — page title was redundant
            with the sidebar selection state, and the user menu
            lives in the sidebar footer where account-level
            controls belong. The notifications bell lives in the
            sidebar footer (see app-shell-nav.tsx).
            bg-background-default makes the inset white (Notion/Linear
            pattern: gray rail, white work surface). */}
          <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            {/* `h-full` + `flex flex-col` propagate `<main>`'s definite
              height down to RulesPageShell (and any other route shell
              using `h-full`). Without it, `h-full` on the shell resolves
              against an auto-height parent and the inner overflow-y-auto
              never establishes a real scroll container — sticky elements
              like the rule library's TableHeader fall back to the
              document scroll context and never pin.

              No shell-level width cap: reading-column routes (Today,
              Audit, Members, Opportunities) keep their own
              `mx-auto max-w-page-wide` (1100px) and stay centered.
              Data-dense routes (Deadlines, Clients detail) fill the full
              viewport so 60/40 drawer/table ratios actually fill 100% of
              the available space. */}
            <div className="flex h-full w-full flex-col">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

// Drives the rail's per-page default from the route. Today (`/`)
// expands; every other path collapses. The user's
// manual toggle still wins for the current page (it's cleared on the
// next navigation). Lives inside SidebarProvider so it can reach the
// context; renders nothing.
function SidebarRouteSync() {
  const { pathname } = useLocation()
  const { setRouteCollapsed } = useSidebar()
  useEffect(() => {
    setRouteCollapsed(pathname !== '/')
  }, [pathname, setRouteCollapsed])
  return null
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
          'h-full origin-left bg-state-accent-solid transition-transform duration-300 ease-apple motion-reduce:transition-none',
          isPending ? 'scale-x-100' : 'scale-x-0',
        )}
      />
    </div>
  )
}
