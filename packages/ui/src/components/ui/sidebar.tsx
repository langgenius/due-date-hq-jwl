'use client'

import * as React from 'react'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { PanelLeftIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'
import { useIsMobile } from '@duedatehq/ui/hooks/use-mobile'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'

/**
 * AppShell sidebar primitives — hand-rolled (NOT shadcn `Sidebar`).
 *
 * Why: DESIGN.md §5.4 fixes the desktop sidebar at 220px (no collapse), and
 * `⌘K` / `⌘⇧O` already own the keyboard vocabulary, so shadcn's three
 * collapse modes / rail / cookie state / `Cmd+B` shortcut / floating-inset
 * variants are all dead code for us. See
 * `docs/dev-log/2026-04-27-app-shell-sidebar.md` for the full decision matrix.
 *
 * 2026-05-25 (Yuqi Today #3 — DEFERRED): Yuqi asked for a desktop
 * collapse state. That overturns DESIGN.md §5.4 and needs a real
 * design decision before implementation:
 *   - Collapsed width? (Spec it: icon-only 56px? popout-on-hover?)
 *   - Persistence layer (localStorage vs. user setting in DB)?
 *   - How do badge counts render in collapsed mode (Alerts 3, etc.)?
 *   - Trigger location (top-of-rail rail handle? topbar button?)?
 * Not a one-off CSS fix — handled as its own design-track task.
 *
 * Surface:
 *  - <Sidebar>                         — desktop <aside> (220px) / mobile <Sheet>
 *  - <SidebarHeader / Content / Footer>— three semantic slots
 *  - <SidebarSeparator>                — full-width hairline (border/default)
 *  - <SidebarGroup / GroupLabel / GroupContent>
 *  - <SidebarMenu / MenuItem>
 *  - <SidebarMenuButton>               — cva variants + `render` prop, accepts
 *                                        a NavLink (or any element) as the
 *                                        underlying tag
 *  - <SidebarMenuBadge>                — mono tabular-nums counter pill
 *  - <SidebarTrigger>                  — mobile-only toggle (md:hidden)
 *  - <SidebarProvider> / useSidebar()  — mobile sheet open state
 *
 * The selected-nav style is **bg-only, zero accent** to keep DESIGN §1.2
 * "color only serves risk" globally enforceable. There is intentionally NO
 * `accent` variant on `SidebarMenuButton`.
 */

const SIDEBAR_WIDTH = '13.75rem' // 220px — DESIGN §Layout regions
const SIDEBAR_WIDTH_COLLAPSED = '3.5rem' // 56px — icons-only rail
const SIDEBAR_WIDTH_MOBILE = '17.5rem' // 280px — Sheet drawer is slightly wider

type SidebarContextValue = {
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  toggleSidebar: () => void
  isMobile: boolean
  /**
   * 2026-05-25 (Yuqi sidebar collapse): desktop collapse state.
   * When true, the rail narrows to 56px and shows only icons +
   * badge dots. Mobile mode ignores this (the Sheet drawer is
   * always full-width).
   *
   * 2026-05-26 (Yuqi sidebar mechanism): `collapsed` is the
   * EFFECTIVE state, computed as `userCollapsed || autoCollapsed`.
   * Surfaces with a wide right detail panel (e.g. /deadlines'
   * obligation drawer) call `setAutoCollapsed(true)` on mount so
   * the rail temporarily narrows to give the panel room; on
   * unmount they restore `false` and the user's session state
   * takes over again. The user's manual toggle still works
   * during an auto-collapse — clicking expand sets BOTH
   * `userCollapsed` and `autoCollapsed` to false so the user
   * override wins for the rest of that panel session.
   *
   * 2026-05-26 (Yuqi default-expanded rule): `userCollapsed` is
   * SESSION-ONLY — never written to localStorage. Every page
   * reload returns to the default expanded state. Predictable
   * baseline for new users and reloads alike; the collapse icon
   * still works to narrow the rail mid-session, just doesn't
   * outlive the session.
   */
  collapsed: boolean
  toggleCollapsed: () => void
  /**
   * Programmatic, transient collapse. NOT persisted. Use this
   * from a route effect when the page opens a wide right panel
   * that would otherwise compete with the sidebar for width.
   * The user can still manually expand while auto-collapsed —
   * their expansion wins for the rest of the panel session.
   */
  setAutoCollapsed: (next: boolean) => void
  /**
   * 2026-05-26 (Yuqi sixty-ninth pass): call from sidebar nav
   * item clicks. Treats this navigation as a "show me where I
   * am" intent and absorbs the NEXT auto-collapse request from
   * the destination route. The next time a wide panel opens
   * (e.g. the user clicks a row in the queue), auto-collapse
   * resumes as normal. This way a sidebar click never lands the
   * user on a page with the sidebar already gone, even if that
   * page deep-links into a row.
   */
  notifySidebarNavigation: () => void
  /**
   * 2026-05-26 (Yuqi sidebar mental-model pass — immediate collapse):
   * hover state lives in the provider so `toggleCollapsed` can reset
   * it atomically when the user explicitly collapses. Without this,
   * clicking the collapse icon while the cursor is inside the
   * sidebar leaves the hover-peek overlay expanded — the user has
   * to physically move their cursor out before the sidebar visibly
   * shrinks. Explicit user intent should beat passive hover.
   */
  hovered: boolean
  setHovered: (next: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar(): SidebarContextValue {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) {
    throw new Error('useSidebar must be used within a <SidebarProvider>.')
  }
  return ctx
}

/**
 * 2026-05-26 (Yuqi sidebar mental-model pass): non-throwing variant
 * for components that may render outside a SidebarProvider. Returns
 * `null` instead of throwing when no provider is in scope. Used by
 * surfaces like `PulseDetailDrawer` that mount both inside the
 * AppShell tree (sidebar context available) AND as off-route
 * fallbacks via `PulseDrawerProvider` in `routes/_layout.tsx`
 * (outside SidebarProvider). The drawer-pressure auto-collapse fires
 * for the in-shell case and silently no-ops for the off-route case.
 *
 * Prefer `useSidebar` when you KNOW the consumer is inside the
 * provider — the explicit throw catches mounting mistakes earlier.
 */
export function useOptionalSidebar(): SidebarContextValue | null {
  return React.useContext(SidebarContext)
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  // 2026-05-26 (Yuqi: default expanded on every reload — no
  // persistence): the sidebar always starts expanded on page load.
  // `userCollapsed` is session-only — when the user clicks the
  // collapse icon during a session, it flips locally, but the next
  // reload returns to expanded. No localStorage write, no reads on
  // mount. Predictable: "every fresh page = expanded sidebar."
  const [userCollapsed, setUserCollapsed] = React.useState(false)
  // `autoCollapsed` is transient programmatic collapse driven by
  // route surfaces with a wide right panel. NEVER persisted —
  // closing the panel restores the user's preference.
  const [autoCollapsed, setAutoCollapsedState] = React.useState(false)
  // 2026-05-26 (Yuqi sidebar mental-model pass — immediate collapse):
  // `hovered` lives in the provider so `toggleCollapsed` can reset
  // it synchronously when the user explicitly collapses, beating the
  // passive hover-peek. Sidebar's onMouseEnter/Leave still drive it
  // via `setHovered` exposed through context.
  const [hovered, setHovered] = React.useState(false)
  // 2026-05-26 (Yuqi sixty-ninth pass): one-shot absorber for
  // auto-collapse requests that arrive immediately after a
  // sidebar nav click. Ref (not state) because we don't want a
  // re-render when it flips, and the route effect's
  // `setAutoCollapsed(true)` call would otherwise race with a
  // state update from the click handler.
  const blockNextAutoCollapseRef = React.useRef(false)
  const visibleOpenMobile = isMobile ? openMobile : false

  if (!isMobile && openMobile) {
    setOpenMobile(false)
  }

  // `setOpenMobile` is stable because it comes from useState; passing a
  // functional updater means callers don't need to subscribe to `openMobile`
  // to flip it (vercel-react-best-practices: rerender-functional-setstate).
  const toggleSidebar = React.useCallback(() => {
    setOpenMobile((prev) => !prev)
  }, [])

  // Effective collapsed state: either source can flip it on.
  const collapsed = userCollapsed || autoCollapsed

  const toggleCollapsed = React.useCallback(() => {
    // The user's intent is to flip the EFFECTIVE state. If we're
    // currently collapsed (whether the user set it OR auto did),
    // clicking expand should expand — set BOTH flags to false so
    // auto doesn't immediately re-collapse. Session-only state;
    // no localStorage write — next page load returns to expanded.
    setUserCollapsed((prevUserCollapsed) => {
      const prevEffective = prevUserCollapsed || autoCollapsed
      return !prevEffective
    })
    // If the user is overriding an auto-collapse, clear the auto
    // flag so it doesn't immediately reapply on the next render.
    if (autoCollapsed) setAutoCollapsedState(false)
    // 2026-05-26 (Yuqi sidebar mental-model pass — immediate
    // collapse): explicit user toggle beats passive hover-peek.
    // Without this reset, clicking the collapse icon while the
    // cursor is inside the sidebar leaves the overlay expanded
    // (because `targetCollapsed = collapsed && !hovered` keeps it
    // false). User has to move their cursor out before the
    // sidebar visibly shrinks — feels broken. The reset makes the
    // sidebar collapse the moment they click; if they move the
    // cursor out and back in, hover-peek activates normally on
    // the next mouseenter.
    setHovered(false)
  }, [autoCollapsed])

  const setAutoCollapsed = React.useCallback((next: boolean) => {
    // 2026-05-26 (Yuqi sixty-ninth pass): if the user just clicked
    // a sidebar nav link, absorb the FIRST `setAutoCollapsed(true)`
    // that arrives from the destination route. Releases the
    // one-shot block on either consumption or an explicit
    // `setAutoCollapsed(false)` (route unmount / panel close) so
    // future panel opens during this same route work normally.
    if (next && blockNextAutoCollapseRef.current) {
      blockNextAutoCollapseRef.current = false
      return
    }
    if (!next) {
      // An explicit "panel just closed" call clears any pending
      // block too — we don't want a stale block hanging around.
      blockNextAutoCollapseRef.current = false
    }
    setAutoCollapsedState(next)
  }, [])

  const notifySidebarNavigation = React.useCallback(() => {
    // 2026-05-26 (Yuqi sidebar mental-model pass — nav click expands):
    // every nav click lands the user on a new page with the sidebar
    // FULLY expanded, regardless of prior collapse choice. Clicking
    // a nav item is treated as "show me where I am, full context."
    //
    // Reset all three sources:
    //   • userCollapsed = false — even if the user manually
    //     collapsed earlier in the session, the nav click overrides
    //     that intent. Their next collapse click can return to
    //     collapsed.
    //   • autoCollapsed = false — clear any standing drawer-driven
    //     collapse so the destination page lands expanded.
    //   • hovered = false — drop any active hover-peek state so
    //     the new page isn't rendered with an overlay shadow.
    //
    // The one-shot ref absorbs the FIRST `setAutoCollapsed(true)`
    // from the destination route's mount effect (e.g. /deadlines'
    // panel mount). Without that block, the route would
    // immediately re-collapse after this expand.
    setUserCollapsed(false)
    setAutoCollapsedState(false)
    setHovered(false)
    blockNextAutoCollapseRef.current = true
  }, [])

  // Memoise the value so non-Provider subscribers don't re-render on every
  // tree update (advanced-init-once).
  const value = React.useMemo<SidebarContextValue>(
    () => ({
      openMobile: visibleOpenMobile,
      setOpenMobile,
      toggleSidebar,
      isMobile,
      collapsed,
      toggleCollapsed,
      setAutoCollapsed,
      notifySidebarNavigation,
      hovered,
      setHovered,
    }),
    [
      visibleOpenMobile,
      toggleSidebar,
      isMobile,
      collapsed,
      toggleCollapsed,
      setAutoCollapsed,
      notifySidebarNavigation,
      hovered,
    ],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function Sidebar({ className, children, ...props }: React.ComponentProps<'aside'>) {
  const { isMobile, openMobile, setOpenMobile, collapsed, hovered, setHovered } = useSidebar()

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          data-slot="sidebar"
          data-mobile="true"
          side="left"
          className="flex flex-col bg-components-panel-bg p-0 [&>button]:hidden"
          style={
            {
              '--sidebar-width-mobile': SIDEBAR_WIDTH_MOBILE,
              width: SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Primary navigation</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  // 2026-05-25 (Yuqi sidebar collapse): `data-collapsed` flips the
  // descendant tree to icons-only mode via CSS group selectors —
  // labels hide, group labels hide, badges shrink to dots. The
  // `style` width animates between 220px and 56px for a smooth
  // transition that doesn't reflow the rest of the page.
  // 2026-05-26 (Yuqi sidebar hover-expand): when the sidebar is
  // collapsed AND the user hovers over it, temporarily expand to
  // full width so they can read labels without explicitly
  // un-collapsing. Same VSCode / Notion / Linear pattern. The
  // hover state is local-only; the persisted `collapsed` state
  // is untouched, so leaving the sidebar collapses it back. The
  // CSS group selectors key off `data-collapsed`, which is set
  // to the *effective* collapsed state (collapsed && !hovered)
  // so labels animate in/out cleanly with the width.
  // 2026-05-26 (Yuqi sidebar hover-expand follow-up): split
  // FOOTPRINT (the flex-layout slot) from VISUAL (the painted
  // chrome) so hover doesn't reflow the page.
  //   • Outer <aside>: `position: relative`, width follows
  //     `collapsed` only (220px / 56px) — never includes hover.
  //     Layout is stable, page content never shifts on hover.
  //   • Inner overlay <div>: `position: absolute; inset-y-0;
  //     left-0`, width follows the EFFECTIVE collapsed state
  //     (so hover widens it to 220px). When hovered while
  //     collapsed, the extra 164px overflows the 56px aside
  //     footprint and floats on top of the inset — the page
  //     content stays put underneath. Adds `shadow-md` when
  //     the overlay is wider than the footprint to read as a
  //     floating panel above the inset.
  //   • `data-collapsed` tracks the VISUAL state because the
  //     descendant CSS (label hide/show, badge dot vs digits,
  //     centered icon button, etc.) follows what the user sees,
  //     not the persisted state.
  // `hovered` + `setHovered` come from useSidebar() (provider) above,
  // so that toggleCollapsed can atomically reset hover when the user
  // explicitly collapses via icon / ⌘B.
  const targetCollapsed = collapsed && !hovered
  // 2026-05-26 (Yuqi sidebar transition smoothness — v2):
  //
  // Previous implementation delayed the `data-collapsed` flip by 300ms
  // on expand to prevent content (e.g. the collapse toggle) from
  // overflowing the rail during the width animation. That worked for
  // the overflow case but created a worse visual: icons sat
  // visibly "centered in the wide sidebar with no animation" for
  // 300ms before snapping to their final left-aligned positions —
  // looked like the animation had stopped mid-flight.
  //
  // New approach: flip `data-collapsed` IMMEDIATELY (in sync with
  // the width transition start). The `overflow-hidden` on the inner
  // overlay (line below) clips any momentary content overflow during
  // the 300ms width grow, so the original "leak" concern is still
  // covered. The icon position transitions cleanly because the label
  // span has its own coordinated `transition-[opacity,max-width]`
  // (see `sidebarMenuButtonVariants` below) at 240ms with the same
  // ease curve — labels fade in as the sidebar widens, icons
  // settle into their left-aligned positions, all in one motion.
  const overlayActive = collapsed && hovered
  return (
    <aside
      data-slot="sidebar"
      data-mobile="false"
      data-collapsed={targetCollapsed ? 'true' : 'false'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group/sidebar relative hidden h-svh shrink-0 transition-[width] duration-300 ease-apple motion-reduce:transition-none md:block',
        className,
      )}
      style={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      {...props}
    >
      {/* 2026-05-26 (Yuqi sidebar smoothness pass): both the
          footprint <aside> and the visual overlay <div> transition
          width at 300ms with Apple's "swiftOut" curve
          (cubic-bezier(0.32, 0.72, 0, 1)) — slightly slower than
          the prior 200ms ease-out and with much more pronounced
          deceleration. The label spans (in sidebarMenuButtonVariants)
          use the same curve + duration so icon-staying-put +
          label-fade-out read as one coordinated motion, not as
          two separate animations stepping on each other. */}
      {/* 2026-05-26 (Yuqi sixty-ninth pass follow-up — firm switcher
          bug context): the hover-overlay was carrying a soft drop-
          shadow on its right edge to suggest "this is lifted above
          the page." But against an inset page background that
          shadow + the white panel bg made the whole sidebar (and
          everything inside it, including the firm-switcher trigger)
          read as a floating card detached from the rail's natural
          column. Dropped the shadow; the 1px right border alone is
          enough delimiter, and the rail now reads as the same
          surface in both collapsed and hover-expanded states. */}
      {/* 2026-05-26 (Yuqi sidebar transition bug): `overflow-hidden`
          ensures the painted sidebar boundary is inviolable. The
          collapse-toggle in the firm-switcher row used to leak past
          the right edge mid-transition (when the row flipped to
          horizontal layout instantly via `data-collapsed`, but the
          width was still animating 56→220 over 300ms). With the
          clip, any momentary overflow is hidden inside the sidebar
          rather than spilling into the page content area. */}
      <div
        className="absolute inset-y-0 left-0 z-30 flex flex-col overflow-hidden border-r border-divider-regular bg-components-panel-bg transition-[width] duration-300 ease-apple motion-reduce:transition-none"
        style={{ width: targetCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      >
        {children}
      </div>
    </aside>
  )
}

export function SidebarInset({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn('flex min-w-0 flex-1 flex-col', className)}
      {...props}
    />
  )
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn('flex shrink-0 flex-col', className)}
      {...props}
    />
  )
}

export function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    // 2026-05-25 (Yuqi Today #2): pt-4 (16px) instead of py-2 (8px)
    // for the top edge. The previous 8px gap between the firm
    // switcher header and the first nav group felt cramped — the
    // switcher and the first item read as one block when they're
    // semantically separate (workspace identity vs. navigation).
    // Extra breathing room above lets the eye land on "Today" as
    // the real start of the nav rail.
    // 2026-05-25 (Yuqi sidebar collapse): in collapsed mode the
    // horizontal padding tightens (px-1.5) so icons sit centered
    // in the 56px rail.
    <div
      data-slot="sidebar-content"
      className={cn(
        // 2026-05-28 (Yuqi sidebar polish — divider symmetry): in
        // collapsed mode the SidebarGroupLabel becomes a 28px wide
        // hairline divider (see SidebarGroupLabel below), so the
        // parent gap between groups stacks on top of the label's
        // own `my-N` margin — the icon visually closer to one
        // divider than the other ("Rule library" sat 24px from the
        // top divider and 8px from the bottom). Drop parent gap to
        // 0 in collapsed mode so the icon-to-divider distance comes
        // SOLELY from the label's symmetric `my-3` (see below).
        // 2026-05-29 (Yuqi sidebar expanded polish): expanded
        // inter-group gap stepped `gap-4` → `gap-3` (12px). Matches
        // the app-wide canonical section gap codified in the gap
        // consistency sweep (PR #44) — the sidebar now reads on the
        // same rhythm as the body's section headers. Tighter groups
        // also let the visible eyebrow text-headers carry their own
        // breathing room instead of leaning on a bigger outer gap.
        'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pt-4 pb-2',
        'group-data-[collapsed=true]/sidebar:px-1.5 group-data-[collapsed=true]/sidebar:gap-0',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn('flex shrink-0 flex-col', className)}
      {...props}
    />
  )
}

export function SidebarSeparator({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & { variant?: 'default' | 'subtle' }) {
  return (
    <div
      data-slot="sidebar-separator"
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        'h-px shrink-0',
        variant === 'subtle' ? 'bg-divider-subtle' : 'bg-divider-regular',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn('flex w-full min-w-0 flex-col', className)}
      {...props}
    />
  )
}

export function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  // 2026-05-25 (Yuqi sidebar collapse): group labels (e.g. "Operations",
  // "Practice") hide entirely in collapsed mode — the icons themselves
  // are the grouping affordance at 56px width.
  // 2026-05-25 (Yuqi sidebar collapse v3): "hide entirely" left all
  // icons running together in one column with no visual grouping at
  // all — looked weird without the labels carrying the separator
  // role. In collapsed mode the label slot now renders as a 1px
  // hairline divider (same `bg-divider-subtle` tone as the top rib
  // under the firm switcher). Text content + padding are hidden via
  // an aria-hidden inner wrapper so screen readers don't announce
  // empty group labels.
  return (
    <div
      data-slot="sidebar-group-label"
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        'flex h-7 shrink-0 items-center px-3 text-xs font-medium uppercase tracking-eyebrow text-text-tertiary',
        // 2026-05-26 (Yuqi collapsed-rail overflow fix): in collapsed
        // mode the row was `h-px` + `overflow: visible` + text content
        // ("RULE", "CLIENTS") still inside. The 11px uppercase glyphs
        // ignored the 1px container and spilled above the hairline,
        // making the group labels visible in the icons-only rail.
        // `overflow-hidden` clips the text to the 1px row so only the
        // `bg-divider-subtle` strip reads; `text-transparent` belt-
        // and-suspenders the case where sub-pixel rendering leaves
        // half-pixel slivers. `[&>*]:hidden` still catches element
        // children (kept for symmetry; current call sites pass text
        // nodes only).
        // 2026-05-26 (Yuqi Figma collapsed-rail pass): hairline gets
        // `mx-auto` + fixed `w-7` (28px) instead of spanning the full
        // 43px row width. Matches the Figma reference where the
        // group separator is a short centered stroke under the
        // icon column, not a divider that touches the panel edges.
        // `divider-subtle` → `divider-deep` so the 28px line still
        // reads at 1px tall.
        // 2026-05-28 (Yuqi sidebar polish — divider symmetry):
        // bumped `my-2` → `my-3` so each hairline divider sits
        // 12px from the icon above AND 12px from the icon below
        // (parent `gap-0` in collapsed mode — see SidebarContent).
        // Net: icons between two dividers are mathematically
        // centered between them, not visually drifted toward the
        // top one as they were before.
        'group-data-[collapsed=true]/sidebar:my-3 group-data-[collapsed=true]/sidebar:h-px group-data-[collapsed=true]/sidebar:w-7 group-data-[collapsed=true]/sidebar:mx-auto group-data-[collapsed=true]/sidebar:px-0 group-data-[collapsed=true]/sidebar:overflow-hidden group-data-[collapsed=true]/sidebar:bg-divider-deep group-data-[collapsed=true]/sidebar:text-transparent',
        'group-data-[collapsed=true]/sidebar:[&>*]:hidden',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-content" className={cn('w-full', className)} {...props} />
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  // 2026-05-26 (Yuqi sidebar smoothness pass): in collapsed mode
  // bump menu-item gap from gap-0.5 (2px) → gap-1 (4px). At 32×32
  // icon tiles, 2px between tiles felt cramped — the rail read as
  // one continuous strip of color. 4px gives each icon a beat of
  // breathing room without losing the sense of grouping.
  // 2026-05-26 (Yuqi sidebar fix — "height of each item/frame/div
  // do not equal expand and collpasd"): dropped the collapsed gap-1
  // override. The 2px gap differential against expanded (gap-0.5)
  // accumulated across 5-6 nav items into a 10-12px vertical drift
  // — collapsed nav section ended ~12px taller than expanded, so
  // anything below (group separators, footer) sat at different y
  // positions in the two modes. One gap value (gap-0.5) in both
  // modes keeps the row rhythm identical; the rail still reads as
  // grouped icons because the 32×32 tile boundaries + 2px gap is
  // exactly what Linear / Notion use.
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn('flex w-full min-w-0 flex-col gap-0.5', className)}
      {...props}
    />
  )
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  )
}

const sidebarMenuButtonVariants = cva(
  cn(
    // 2026-05-28 (Yuqi sidebar expanded polish — "look nice both
    // when expanded and collapsed"): menu item text scaled
    // text-base (16px) → text-sm (14px). At text-base the items
    // read as hero-rank — they sat at the same scale as the
    // firm-switcher header above (which IS meant to anchor the
    // rail). Stepping items to text-sm restores the 3-tier rail
    // hierarchy: firm name `text-base font-medium` (top anchor) →
    // menu items `text-sm font-normal` (quiet nav) → group label
    // eyebrows `text-xs uppercase` (faint section markers). Matches
    // Linear / Notion / Cloudflare sidebar density. Item height
    // stays h-8 (32px); icon size unchanged at size-4 (16px).
    'group/menu-button peer/menu-button relative flex h-8 w-full cursor-pointer touch-manipulation items-center gap-2.5 overflow-hidden rounded-md px-3 text-left text-sm font-normal text-text-secondary outline-none transition-colors',
    // Hover uses a neutral surface token; selected state below uses the
    // explicit accent tint so route wayfinding stays distinct from row hover.
    'hover:bg-background-default-hover hover:text-text-primary',
    'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
    'disabled:pointer-events-none disabled:opacity-50',
    'aria-disabled:pointer-events-none aria-disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-text-tertiary",
    // Active state has two valid sources: (1) react-router's NavLink renders
    // `aria-current="page"` automatically, and (2) any consumer that passes
    // `isActive` to SidebarMenuButton sets `data-active="true"`. Either flips
    // the visual; we never store a redundant React state copy.
    //
    // Background uses `accent-tint` (the DESIGN.md wayfinding token,
    // `#eff4ff` light / 14 % Dify blue dark) — calm enough to honor "color only
    // serves risk" while still visibly identifying the active route. No 2 px
    // accent border, no `accent-text` label color.
    "data-[active=true]:bg-accent-tint data-[active=true]:text-text-accent [&[data-active=true]_svg:not([class*='text-'])]:text-text-accent",
    "aria-[current=page]:bg-accent-tint aria-[current=page]:text-text-accent [&[aria-current=page]_svg:not([class*='text-'])]:text-text-accent",
    // 2026-05-26 (Yuqi sidebar status surface — bold pass):
    // active-route marker in collapsed mode. A 3px-wide accent
    // bar at the LEFT EDGE of the active tile signals "you are
    // here" without needing labels. Combines with the bg-accent-tint
    // tile so the active route reads both as a color-tinted square
    // AND as the column's anchored marker, similar to Linear's
    // active-route indicator. Only applies in collapsed mode; the
    // expanded mode's full bg-tint already does the wayfinding job.
    "group-data-[collapsed=true]/sidebar:data-[active=true]:before:absolute group-data-[collapsed=true]/sidebar:data-[active=true]:before:left-0 group-data-[collapsed=true]/sidebar:data-[active=true]:before:top-1/2 group-data-[collapsed=true]/sidebar:data-[active=true]:before:h-4 group-data-[collapsed=true]/sidebar:data-[active=true]:before:w-[3px] group-data-[collapsed=true]/sidebar:data-[active=true]:before:-translate-y-1/2 group-data-[collapsed=true]/sidebar:data-[active=true]:before:rounded-r-full group-data-[collapsed=true]/sidebar:data-[active=true]:before:bg-state-accent-solid group-data-[collapsed=true]/sidebar:data-[active=true]:before:content-['']",
    "group-data-[collapsed=true]/sidebar:aria-[current=page]:before:absolute group-data-[collapsed=true]/sidebar:aria-[current=page]:before:left-0 group-data-[collapsed=true]/sidebar:aria-[current=page]:before:top-1/2 group-data-[collapsed=true]/sidebar:aria-[current=page]:before:h-4 group-data-[collapsed=true]/sidebar:aria-[current=page]:before:w-[3px] group-data-[collapsed=true]/sidebar:aria-[current=page]:before:-translate-y-1/2 group-data-[collapsed=true]/sidebar:aria-[current=page]:before:rounded-r-full group-data-[collapsed=true]/sidebar:aria-[current=page]:before:bg-state-accent-solid group-data-[collapsed=true]/sidebar:aria-[current=page]:before:content-['']",
    '[&>span:nth-child(2)]:flex-1 [&>span:nth-child(2)]:truncate',
    // 2026-05-26 (Yuqi sidebar smoothness pass): label span now
    // animates rather than hard-hides. Expanded → collapsed
    // transitions opacity (1 → 0) and max-width (full → 0) at
    // 240ms with the same Apple swiftOut curve the outer aside
    // uses, so the rail-width-shrink and label-fade-out feel
    // like one coordinated motion. (Was 150ms ease-out — too
    // fast against the 300ms aside transition, labels popped
    // before the rail finished moving.)
    '[&>span:nth-child(2)]:transition-[opacity,max-width] [&>span:nth-child(2)]:duration-240 [&>span:nth-child(2)]:ease-apple',
    // 2026-05-25 (Yuqi sidebar collapse): collapsed-mode tweaks —
    // center the icon at 56px width, drop the horizontal padding,
    // and hide the label span. The consumer's NavLink passes a
    // `title` attribute as the native hover tooltip.
    // 2026-05-25 (Yuqi rail alignment v2): in collapsed mode the
    // button shrinks to a centered 32×32 square (size-8 mx-auto).
    // Previously it kept w-full + h-8, so the bg-accent-tint
    // active state stretched the full 44px row width while
    // sibling icons (bell, toggle, footer items) were 32×32 —
    // the active row read as a stretched pill out of family
    // with everything else. Now active + hover both render as
    // a 32×32 tinted tile, matching the rest of the rail.
    // 2026-05-26 (Yuqi vertical-center fix): added `gap-0` in
    // collapsed mode. The base button has `gap-2.5` (10px) between
    // its flex children (icon + label span). In collapsed mode the
    // label shrinks to max-w-0 / opacity-0 but is still a flex
    // child, so the 10px gap stayed reserved between icon and
    // (zero-width) label. With `justify-center`, the 16px icon
    // ended up at x=3 instead of x=8 inside the 32px tile —
    // visibly off-center to the left. `gap-0` collapses the
    // reserved spacer so the icon centers properly.
    // 2026-05-26 (Yuqi sidebar fix — "icon position do not match"):
    // collapsed-mode button gets `overflow-visible` so the badge pill
    // can overhang the top-right corner via `-top-0.5 -right-0.5`.
    // With the previous `overflow-hidden` inherited from the base
    // chain, the badge was forced INSIDE the button (top-0 right-0)
    // and overlapped the centered icon — visual shift left.
    'group-data-[collapsed=true]/sidebar:size-8 group-data-[collapsed=true]/sidebar:w-8 group-data-[collapsed=true]/sidebar:mx-auto group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:gap-0 group-data-[collapsed=true]/sidebar:px-0 group-data-[collapsed=true]/sidebar:overflow-visible',
    // 2026-05-26 (Yuqi sidebar smoothness pass): collapsed-mode
    // label hide swapped from `hidden` → opacity-0 + max-w-0 +
    // overflow-hidden so the label animates out (per the
    // `transition-[opacity,max-width]` rule above) instead of
    // disappearing instantly. `pointer-events-none` keeps the
    // collapsed label from intercepting clicks during the fade.
    'group-data-[collapsed=true]/sidebar:[&>span:nth-child(2)]:max-w-0 group-data-[collapsed=true]/sidebar:[&>span:nth-child(2)]:opacity-0 group-data-[collapsed=true]/sidebar:[&>span:nth-child(2)]:pointer-events-none group-data-[collapsed=true]/sidebar:[&>span:nth-child(2)]:overflow-hidden',
  ),
  {
    variants: {
      // Intentionally no "accent" variant: selected-state uses bg-only (DESIGN
      // §4.9 + §1.2). If you find yourself wanting accent here, the answer is
      // probably to use a CTA button outside the menu instead.
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export { sidebarMenuButtonVariants }

type SidebarMenuButtonOwnProps = {
  isActive?: boolean
} & VariantProps<typeof sidebarMenuButtonVariants>

export function SidebarMenuButton({
  render,
  isActive = false,
  variant = 'default',
  className,
  ...props
}: useRender.ComponentProps<'button'> & SidebarMenuButtonOwnProps) {
  return useRender({
    defaultTagName: 'button',
    props: {
      ...props,
      'data-slot': 'sidebar-menu-button',
      'data-active': isActive ? 'true' : undefined,
      className: cn(sidebarMenuButtonVariants({ variant }), className),
    },
    render,
  })
}

/**
 * Two tones for sidebar count badges:
 *  - `urgent` (default for back-compat): saturated warning pill — use
 *    for counts that mean "look at this" (Alerts, Rule library
 *    review backlog).
 *  - `inventory`: framed neutral pill — use for counts that are
 *    reference facts (Clients, Deadlines). CPA shouldn't read these
 *    as "do something."
 *
 * 2026-05-25 (Yuqi Today #18): both tones now share the SAME pill
 * shape (height, radius, border) so the right edge of the sidebar
 * reads as one consistent column. Yuqi flagged that "the number in
 * Deadlines isn't aligned with Alerts. it is not framed" — the
 * inventory tone used to render as a bare mono number with no
 * border, sitting visually higher and at a different x-position
 * than the framed urgent pill above. Now: same chip outline,
 * different fills (warning-hover for urgent, subtle for inventory).
 * Semantics still distinguish ("look here" vs "reference fact") via
 * fill saturation, not via wildly different shapes.
 */
export function SidebarMenuBadge({
  className,
  tone = 'urgent',
  ...props
}: React.ComponentProps<'span'> & { tone?: 'urgent' | 'inventory' }) {
  // 2026-05-25 (Yuqi sidebar badge alignment follow-up): all badges
  // now share `min-w-[32px]` with `justify-end` so single-digit (3,
  // 5), double-digit (10) and triple-digit (456) counts all occupy
  // the same footprint, with digits right-aligned inside. The right
  // edges already aligned via `ml-auto`; the new fixed min-width
  // makes the LEFT edges align too, so the rail reads as one tidy
  // column of right-justified numbers rather than a ragged-left
  // stack. 32px holds up through 3 digits with px-1 internal
  // padding; 4-digit counts (unrealistic in this app) would still
  // expand gracefully.
  // 2026-05-25 (Yuqi sidebar collapse): in collapsed mode the full
  // count pill doesn't fit (it would push past the 56px rail) AND
  // the count digits are unreadable at icon scale. Switched to a
  // 6×6 absolutely-positioned dot in the top-right corner of the
  // menu button — same tone, no digit. Sufficient to signal "there
  // are items here" while the user is in icons-only mode; the
  // exact count returns when they expand the rail. The
  // `group-data-[collapsed=true]/sidebar:` selectors flip these
  // styles via the data attribute on the root <aside>.
  // 2026-05-26 (Yuqi /rules/pulse #3): badge frame dropped — both
  // tones used to render as outlined pills with bg fill + border.
  // Yuqi flagged "the number still in a frame that is hugging the
  // text. just left aligned." Now both tones render as plain
  // tabular-nums text in the tone color, sitting inline next to
  // the label (ml-1 gap) rather than pushed to the row's right
  // edge with ml-auto. Reads as "Alerts 3" inline — same density
  // as Linear / Notion sidebar counts.
  // Collapsed-mode dot indicator preserved unchanged (item still
  // visible at icon scale).
  // 2026-05-26 (Yuqi collapsed-rail overflow fix): both tones lock to
  // a fixed `size-1.5` (6×6) circle in collapsed mode. The previous
  // `min-w-1.5` only set the minimum, so multi-digit counts like
  // "456" (rule library pending review) ballooned the dot to ~20px
  // wide because `text-transparent` colors glyphs but doesn't drop
  // them from layout. `w-1.5 overflow-hidden` clamps the dot to 6px
  // and clips any character width the text contributes.
  // 2026-05-26 (Yuqi: clients don't need alert dot): inventory-tone
  // badges (Deadlines "10", Clients "9") hide entirely in collapsed
  // mode. They're reference counts ("here's how many you have"),
  // not actionable signals — putting a gray dot in the rail next
  // to those icons looked like an alert but wasn't one. Urgent-tone
  // badges (Alerts "3", Rule library "456") keep their red dot in
  // collapsed because they actually warrant attention. Expanded
  // mode still shows the inline gray count text.
  // 2026-05-26 (Yuqi sidebar status surface — bold pass): collapsed
  // rail becomes a status surface, not just a nav rail. Both tones
  // now render their COUNT (not a dot) in collapsed mode as a small
  // pill at the icon's top-right. The visual language separates
  // urgent from inventory clearly:
  //   • Urgent (red filled pill, white text, subtle pulse) — Alerts,
  //     Rule library pending review. Calls for action.
  //   • Inventory (neutral filled pill, secondary text, no pulse) —
  //     Deadlines, Clients. Reference counts only. The numeric
  //     framing (not a colored dot) makes it read as "count"
  //     instead of "alert" — addresses Yuqi's earlier concern
  //     that gray dots looked like alerts.
  // The badge sits at -top-1/-right-1 so it overlaps the icon's
  // corner slightly and reads as floating above it. A 2px border in
  // the panel-bg color creates visual separation from the icon edge
  // so it never blurs into the icon glyph. Numbers >99 still fit
  // (up to 3 digits) at 10px font; 4-digit counts get clipped.
  // 2026-05-26 (Yuqi follow-up — "alert数字形式 apply 到 expanded
  // default"): expanded mode adopts the collapsed pill chrome so both
  // states share one badge shape. Then "这里不要被切掉" (don't clip)
  // — but my first fix positioned the badge at `top-0 right-0` inside
  // an `overflow-hidden` button, which avoided clipping AT THE COST OF
  // overlapping the centered icon (badge spans 16-32 / 0-16, icon spans
  // 8-24 / 8-24 — overlap from x=16-24, y=8-16). The icon read as
  // shifted left because the badge weighted the right side.
  //
  // 2026-05-26 (Yuqi sidebar feedback — "icon position do not match"):
  // restored the canonical floating-pill pattern:
  //   • Collapsed: smaller pill (h-3.5 min-w-3.5 px-0.5 text-[9px])
  //     so it fits in the top-right CORNER without intruding on the
  //     icon's centered footprint. Positioned at `-top-0.5 -right-0.5`
  //     so it overhangs by 2px each direction. The SidebarMenuButton's
  //     collapsed-mode override (further below) sets `overflow-visible`
  //     in collapsed so the overhang renders cleanly. 2px panel-bg
  //     border separates pill from icon edge.
  //   • Expanded: standard inline pill (h-4 min-w-4) flush to the
  //     row's right edge via `ml-auto`. Same chrome as collapsed, just
  //     full-size and aligned.
  const pillBaseExpanded =
    'pointer-events-none inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 font-mono text-[10px] font-semibold tabular-nums leading-none'
  const expandedPos = 'ml-auto'
  // 2026-05-27 (Yuqi feedback "just a red dot is enough"): collapsed
  // mode reverts to a bare dot indicator — no digit, no border. The
  // count was hard to read at 14×14 and the user just needs to know
  // "there's something here" while in icon-only mode. Expanded mode
  // still shows the full count inline.
  // `[&>*]:hidden` hides the digit text in collapsed mode; the dot
  // itself comes from a 8×8 destructive-solid circle positioned at
  // the icon's top-right.
  const collapsedPos =
    'group-data-[collapsed=true]/sidebar:absolute group-data-[collapsed=true]/sidebar:top-0 group-data-[collapsed=true]/sidebar:right-0 group-data-[collapsed=true]/sidebar:ml-0 group-data-[collapsed=true]/sidebar:h-2 group-data-[collapsed=true]/sidebar:min-w-2 group-data-[collapsed=true]/sidebar:w-2 group-data-[collapsed=true]/sidebar:px-0 group-data-[collapsed=true]/sidebar:text-[0px] group-data-[collapsed=true]/sidebar:overflow-hidden'
  if (tone === 'inventory') {
    return (
      <span
        data-slot="sidebar-menu-badge"
        data-tone="inventory"
        className={cn(
          pillBaseExpanded,
          expandedPos,
          'bg-background-subtle text-text-secondary',
          collapsedPos,
          className,
        )}
        {...props}
      />
    )
  }
  return (
    <span
      data-slot="sidebar-menu-badge"
      data-tone="urgent"
      className={cn(
        pillBaseExpanded,
        expandedPos,
        'bg-state-destructive-solid text-text-inverted',
        collapsedPos,
        // 2026-05-27 (Yuqi feedback "remove the shining effect"): the
        // collapsed-mode animate-pulse was making the digit pulse in
        // and out of opacity, which Yuqi flagged as hard-to-read.
        // Calm red pill stands on its own as a "fresh / needs
        // attention" signal — the destructive solid tone is already
        // loud enough.
        className,
      )}
      {...props}
    />
  )
}

export type SidebarTriggerProps = useRender.ComponentProps<'button'> &
  React.ComponentProps<'button'>

export function SidebarTrigger({
  render,
  onClick,
  className,
  children,
  ...props
}: SidebarTriggerProps) {
  const { toggleSidebar } = useSidebar()

  // Wrap the consumer's onClick so external handlers still fire while we
  // also flip the mobile sheet open/closed.
  const handleClick = React.useCallback<NonNullable<React.ComponentProps<'button'>['onClick']>>(
    (event) => {
      onClick?.(event)
      toggleSidebar()
    },
    [onClick, toggleSidebar],
  )

  return useRender({
    defaultTagName: 'button',
    props: {
      ...props,
      'data-slot': 'sidebar-trigger',
      type: 'button',
      'aria-label': 'Toggle navigation',
      onClick: handleClick,
      className: cn(
        'inline-flex size-7 cursor-pointer touch-manipulation items-center justify-center rounded-md border border-divider-regular bg-background-default text-text-secondary outline-none transition-colors',
        'hover:bg-background-default-hover hover:text-text-primary',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        'md:hidden',
        className,
      ),
      children,
    },
    render,
  })
}

/**
 * 2026-05-25 (Yuqi sidebar collapse): desktop-only toggle that
 * flips between full-width (220px) and icons-only (56px). Hidden
 * below `md` since mobile uses the `SidebarTrigger` Sheet flow.
 *
 * Originally rendered as a full-width row above the user menu —
 * Yuqi flagged that as a lonely centered chevron orphaned between
 * the footer nav divider and the user row. Now sized as a compact
 * 24px square icon button so it can sit inline with the firm
 * switcher in the top header row (right side of the row when
 * expanded; stacked vertically with switcher + bell when
 * collapsed).
 *
 * Icons follow the standard "panel" metaphor: `PanelLeftIcon`
 * when the sidebar is expanded (visual: the left panel is
 * highlighted → click to push it back), `PanelRightIcon` when
 * collapsed (visual: the right side is full → click to bring
 * the left panel back).
 */
export function SidebarCollapseToggle({ className }: { className?: string }) {
  const { collapsed, toggleCollapsed } = useSidebar()
  // 2026-05-26 (Yuqi: no collapse icon when collapsed): collapse-only
  // affordance — visible ONLY when the sidebar is expanded. When the
  // sidebar is in any collapsed state (persistent OR drawer-pressure
  // OR hover-peek — `collapsed` from context is the effective
  // userCollapsed||autoCollapsed), the icon hides entirely. The
  // expand path is: hover-peek (transient label preview), ⌘B
  // (keyboard), or clicking any nav item (always lands on expanded
  // sidebar per `notifySidebarNavigation`).
  if (collapsed) return null
  return (
    <button
      type="button"
      onClick={toggleCollapsed}
      aria-label="Collapse sidebar"
      aria-expanded
      title="Collapse sidebar"
      className={cn(
        'hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-tertiary outline-none transition-colors',
        'hover:bg-background-default-hover hover:text-text-secondary',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        'md:inline-flex',
        className,
      )}
    >
      <PanelLeftIcon className="size-4" aria-hidden />
    </button>
  )
}
