'use client'

import * as React from 'react'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

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

// 2026-06-09 (Yuqi "copy exactly the measurements from pencil" —
// duedatehq_work.pen §SidebarColumn / §Sidebar). Every metric below is
// taken verbatim from the Pencil frames so expanded (Rwh3C) and
// collapsed (xiZyr) share ONE padding system:
//   • SidebarColumn padding 12 → the card floats 12px inside its
//     footprint on every side (gutter). 12 left + 12 right = 1.5rem,
//     subtracted from the footprint to size the card.
//   • Sidebar card: padding 12, gap 8 (see the panel className below).
//   • Expanded column width 280; collapsed column 88 (logo 32 + card
//     padding 12·2 + gutter 12·2 = 88). Both reduce to `width − 24px`
//     card. Symmetric 12/12 item padding then centers the 16px icon in
//     the collapsed card with NO per-mode re-centering — the source of
//     the old expand/collapse padding jump.
const SIDEBAR_WIDTH = '16.5rem' // 264px — Pencil SidebarColumn (expanded), trimmed a touch
const SIDEBAR_WIDTH_COLLAPSED = '5.5rem' // 88px — Pencil SidebarColumn (collapsed)
const SIDEBAR_WIDTH_MOBILE = '17.5rem' // 280px — Sheet drawer matches expanded
// Gutter inset of the floating card from its footprint, summed across
// both sides (12px left + 12px right). Kept in sync with `inset-y-3
// left-3` on the panel below.
const SIDEBAR_CARD_INSET = '1.5rem'

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
   * 2026-06-09 (Yuqi "only Today defaults expanded"): the per-page
   * default. Call from the app shell on every navigation — `false`
   * for Today (`/`), `true` for every other route. Clears any manual
   * override so each page starts from its route default.
   */
  setRouteCollapsed: (next: boolean) => void
  /**
   * Call from sidebar nav item clicks. Drops any manual collapse
   * override + hover so the destination lands at its route default.
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

export function SidebarProvider({
  children,
  initialRouteCollapsed = false,
}: {
  children: React.ReactNode
  initialRouteCollapsed?: boolean
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  // 2026-06-09 (Yuqi "only Today defaults expanded; every other page
  // defaults collapsed"): the rail's default is ROUTE-driven.
  // `routeCollapsed` is set by the app shell on every navigation —
  // false on `/` (Today), true everywhere else. Seeded from the
  // initial path so a non-Today reload lands collapsed with no
  // expand→collapse flash. Session-only; never persisted.
  const [routeCollapsed, setRouteCollapsedState] = React.useState(initialRouteCollapsed)
  // `manualOverride` is the user's explicit toggle for the CURRENT
  // page: true = forced collapsed, false = forced expanded, null = no
  // override (route default applies). Cleared on every navigation so
  // each page starts from its route default.
  const [manualOverride, setManualOverride] = React.useState<boolean | null>(null)
  // `autoCollapsed` is transient programmatic collapse driven by
  // route surfaces with a wide right panel. With the route default
  // now collapsing every non-Today page, this mostly matters on
  // Today (no panel there) — kept so existing panel callers work.
  const [autoCollapsed, setAutoCollapsedState] = React.useState(false)
  // 2026-05-26 (Yuqi sidebar mental-model pass — immediate collapse):
  // `hovered` lives in the provider so `toggleCollapsed` can reset
  // it synchronously when the user explicitly collapses, beating the
  // passive hover-peek. Sidebar's onMouseEnter/Leave still drive it
  // via `setHovered` exposed through context.
  const [hovered, setHovered] = React.useState(false)
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

  // Effective collapsed state: an explicit manual override wins for
  // the current page; otherwise the route default OR a panel
  // auto-collapse.
  const collapsed = manualOverride !== null ? manualOverride : routeCollapsed || autoCollapsed

  const toggleCollapsed = React.useCallback(() => {
    // Flip the EFFECTIVE state and pin it as a manual override for
    // this page. The override is cleared on the next navigation
    // (setRouteCollapsed), so it never leaks across pages.
    setManualOverride(!collapsed)
    // 2026-05-26 (Yuqi): explicit user toggle beats passive
    // hover-peek — reset hover so the rail visibly shrinks the moment
    // they click (targetCollapsed = collapsed && !hovered).
    setHovered(false)
  }, [collapsed])

  const setAutoCollapsed = React.useCallback((next: boolean) => {
    setAutoCollapsedState(next)
  }, [])

  const setRouteCollapsed = React.useCallback((next: boolean) => {
    // Called by the app shell on every navigation. Sets the page's
    // default (Today expanded, everything else collapsed) and clears
    // any manual override so the new page starts from its default.
    setRouteCollapsedState(next)
    setManualOverride(null)
  }, [])

  const notifySidebarNavigation = React.useCallback(() => {
    // A sidebar nav click drops any manual override + hover so the
    // destination lands at its route default (the route effect sets
    // routeCollapsed for the new path). No force-expand — clicking
    // "Deadlines" lands collapsed because Deadlines isn't Today.
    setManualOverride(null)
    setHovered(false)
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
      setRouteCollapsed,
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
      setRouteCollapsed,
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
          className="flex flex-col bg-background-canvas-warm p-0 [&>button]:hidden"
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
        'group/sidebar relative hidden h-svh shrink-0 transition-[width] duration-[360ms] ease-apple motion-reduce:transition-none md:block',
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
      {/* 2026-06-09 (Yuqi "where is the float?" — white floating card):
          the rail is a white card lifted off the warm body.
            • `inset-y-2 left-2` floats it 8px off the top, bottom and
              left of its footprint; the width subtracts
              SIDEBAR_CARD_INSET (16px) so an equal 8px gutter sits on
              the right. The warm body (bg-background-body) shows in the
              gutters, so the white card reads as detached from the
              canvas with the white work surface beyond.
            • Fill is the `--background-sidebar-card` token (#f6f8fa light
              / #242426 dark) — a cool very-light gray, so the white work
              surface beyond reads as the brighter plane.
            • 2026-06-09 (Yuqi "it smudged into the background"): the
              near-white card was disappearing into the white work surface
              (especially when peeked OVER content). Now `rounded-xl` (12px)
              + a hairline `border-divider-regular` + real elevation: a soft
              shadow when docked, and a prominent floating shadow when the
              collapsed rail peeks over content (`overlayActive`). The
              border crisps the edge; the shadow lifts the panel.
            • `p-3` (Pencil Sidebar padding 12) + `gap-2` (Pencil gap 8)
              are the ONLY owners of the card's inner spacing. Every
              section below sits flush (no horizontal padding of its
              own); the nav/search items add their own 12px item padding,
              so glyphs land at 24px and the brand/avatar at 16px — the
              exact Pencil insets, identical in both modes.
          The hover-expand overlay still works: when collapsed + hovered,
          `targetCollapsed` is false so the card widens to the expanded
          measure and overflows the narrow footprint, floating above the
          inset. */}
      <div
        className={cn(
          // 2026-06-09 (Yuqi "精致" / refinement): finer 1.5px icon
          // strokes across every rail glyph (Lucide defaults to 2px,
          // which reads heavy) — a more delicate, elegant icon set.
          'absolute inset-y-3 left-3 z-30 flex flex-col gap-1 overflow-hidden rounded-xl bg-background-sidebar-card p-2.5 [&_svg]:[stroke-width:1.5] transition-[width,box-shadow] duration-[360ms] ease-apple motion-reduce:transition-none',
          // No hard border ("no board"). Separation comes from a soft
          // 1px ring-shadow (defines every edge subtly, no hard line)
          // plus a blur lift — gentle when docked, prominent when the
          // collapsed rail peeks OVER content so it reads as floating.
          overlayActive
            ? 'shadow-[0_0_0_1px_rgb(16_24_40_/_0.05),0_16px_36px_-6px_rgb(16_24_40_/_0.18)]'
            : 'shadow-[0_0_0_1px_rgb(16_24_40_/_0.04),0_4px_12px_-2px_rgb(16_24_40_/_0.10)]',
        )}
        style={{
          width: `calc(${targetCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH} - ${SIDEBAR_CARD_INSET})`,
        }}
      >
        {children}
      </div>
      {/* 2026-06-09 (Yuqi "collapse icon = triangle arrow outside the
          sidebar"): the collapse/expand handle lives on the aside's
          right edge, OUTSIDE the painted card, as a sibling of the panel
          so the card's `overflow-hidden` doesn't clip it. */}
      <SidebarCollapseToggle />
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
        // 2026-06-09 (Yuqi "unify expanded/collapsed padding"): the
        // scroll region carries NO horizontal padding of its own — the
        // card panel's `p-3` owns the 12px card padding in both modes.
        // `gap-1` (4px) matches Pencil Frame18's inter-item gap; the
        // muted footer group pushes to the bottom via its own `mt-auto`.
        // No `group-data-[collapsed]` overrides: padding is identical
        // expanded and collapsed.
        'flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  // 2026-06-01: bake the canonical footer chrome (top divider, 8px
  // padding, collapsed-mode centering) into the primitive so consumers
  // stop hand-rolling the same div + border-t + px-2 py-2 recipe in
  // app-shell. Semantic recovery — call sites can now use
  // <SidebarFooter> instead of an ad-hoc <div>.
  return (
    <div
      data-slot="sidebar-footer"
      className={cn(
        // 2026-06-09 (Yuqi delicacy pass): the footer-zone hairline now
        // lives above the Audit/Settings group (see NavGroupSection
        // `muted`), so the user chip drops its own divider to avoid a
        // double line — just `pt-2` of breathing room below Settings.
        'flex shrink-0 flex-col pt-2',
        className,
      )}
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
        // 2026-06-09 (Yuqi sidebar parity — §RuleLabel / §ClientsLabel):
        // height 30, padding [14,12,4,12] → pt-3.5 pb-1 px-3, text 10px /
        // 600 / 1.2px tracking, #676f83 (text-tertiary).
        'flex h-7 shrink-0 items-center px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary',
        // Collapsed: the frame KEEPS its 30px height + padding (no
        // height collapse → no layout jump). The text is hidden and a
        // centered 19×1.5px hairline (#CCCCCC → divider-deep) is drawn
        // via ::before, matching Pencil §xiZyr's collapsed label.
        'group-data-[collapsed=true]/sidebar:relative group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:overflow-hidden group-data-[collapsed=true]/sidebar:text-transparent',
        "group-data-[collapsed=true]/sidebar:before:absolute group-data-[collapsed=true]/sidebar:before:left-1/2 group-data-[collapsed=true]/sidebar:before:top-1/2 group-data-[collapsed=true]/sidebar:before:h-[1.5px] group-data-[collapsed=true]/sidebar:before:w-[19px] group-data-[collapsed=true]/sidebar:before:-translate-x-1/2 group-data-[collapsed=true]/sidebar:before:-translate-y-1/2 group-data-[collapsed=true]/sidebar:before:rounded-full group-data-[collapsed=true]/sidebar:before:bg-divider-deep group-data-[collapsed=true]/sidebar:before:content-['']",
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
      // 2026-06-09 (Yuqi sidebar parity — Pencil §Frame18 gap 2): a 2px
      // gap between nav rows (gap-0.5). Same in both modes.
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
    // 2026-06-08 (Yuqi product-wide unification — "1px or 2px bigger text
    // for the menu item"): nav label text-sm (14px) → text-[15px]. Item
    // height stays h-8 (32px); icon stays size-4 (16px). Restores a touch
    // more presence to the nav without returning to the text-base (16px)
    // that previously competed with the firm-switcher anchor.
    // 2026-06-09 (Yuqi): height 36 (h-9 — "hover padding smaller", a
    // more compact tile now that rows sit flush at gap-0), gap 12
    // (gap-3 — "icon与text之间的gap稍微大一点"), px-3, rounded-lg. Label
    // text-[15px]. Identical in both modes — collapsed re-centering is
    // gone (see below).
    'group/menu-button peer/menu-button relative flex h-8 w-full cursor-pointer touch-manipulation items-center gap-2.5 overflow-hidden rounded-lg px-[11px] text-left text-[15px] font-normal text-text-secondary outline-none transition-colors',
    // 2026-06-09 (Yuqi "icons should be vertically center aligned" in the
    // collapsed rail): center the lone icon on the rail's centerline.
    // Drop the icon↔label gap and justify-center so the glyph isn't left-
    // aligned at the item padding (which left it ~3px off-center).
    'group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:gap-0',
    // Hover uses the sidebar-row token (~10 units darker than the
    // #f6f8fa card) so the wash reads as a quiet step on the card;
    // selected state below uses the explicit accent tint so route
    // wayfinding stays distinct from row hover.
    "hover:bg-background-sidebar-hover hover:text-text-primary hover:[&_svg:not([class*='text-'])]:text-text-secondary",
    'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
    'disabled:pointer-events-none disabled:opacity-50',
    'aria-disabled:pointer-events-none aria-disabled:opacity-50',
    // 2026-06-09 (Yuqi delicacy pass): a refined two-tone hierarchy —
    // inactive icons sit a step QUIETER than their labels (icon
    // text-tertiary #676f83 vs label text-secondary #354052). On row
    // hover both lift together (label → text-primary, icon →
    // text-secondary) — a delicate brighten, eased via [&_svg]
    // transition-colors. Active state overrides to accent below.
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:transition-colors [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-text-tertiary",
    // Active state has two valid sources: (1) react-router's NavLink renders
    // `aria-current="page"` automatically, and (2) any consumer that passes
    // `isActive` to SidebarMenuButton sets `data-active="true"`. Either flips
    // the visual; we never store a redundant React state copy.
    //
    // Background uses `accent-tint` (the DESIGN.md wayfinding token,
    // `#eff4ff` light / 14 % Dify blue dark) — calm enough to honor "color only
    // serves risk" while still visibly identifying the active route. No 2 px
    // accent border, no `accent-text` label color.
    // 2026-06-09 (Yuqi "selected": light accent bg + semibold accent
    // label + accent icon). The active row now also bumps to
    // `font-semibold` so the selected destination reads with extra
    // weight, not just color — matching the reference.
    "data-[active=true]:bg-accent-tint data-[active=true]:font-semibold data-[active=true]:text-text-accent [&[data-active=true]_svg:not([class*='text-'])]:text-text-accent",
    "aria-[current=page]:bg-accent-tint aria-[current=page]:font-semibold aria-[current=page]:text-text-accent [&[aria-current=page]_svg:not([class*='text-'])]:text-text-accent",
    // 2026-06-09 (Yuqi "copy exactly from pencil"): no collapsed
    // left-bar marker. Pencil's collapsed NavToday keeps the SAME full
    // `#eff4ff` tinted tile as expanded (just narrower) — the active
    // state is already carried by `bg-accent-tint` in both modes, so the
    // separate 3px rail bar is dropped.
    '[&>span:nth-child(2)]:flex-1 [&>span:nth-child(2)]:truncate',
    // 2026-05-26 (Yuqi sidebar smoothness pass): label span now
    // animates rather than hard-hides. Expanded → collapsed
    // transitions opacity (1 → 0) and max-width (full → 0) at
    // 240ms with the same Apple swiftOut curve the outer aside
    // uses, so the rail-width-shrink and label-fade-out feel
    // like one coordinated motion. (Was 150ms ease-out — too
    // fast against the 300ms aside transition, labels popped
    // before the rail finished moving.)
    '[&>span:nth-child(2)]:transition-[opacity,max-width] [&>span:nth-child(2)]:duration-[360ms] [&>span:nth-child(2)]:ease-apple',
    // 2026-06-09 (Yuqi "unify expanded/collapsed padding" + "copy
    // exactly from pencil"): the button KEEPS its full metrics in
    // collapsed mode — same h-10, same px-3, same gap-2.5. It is no
    // longer shrunk to a centered 32×32 tile. Because the card is
    // exactly icon + symmetric 12/12 item padding + 12/12 card padding
    // wide when collapsed (Pencil §xiZyr), the left-aligned 16px icon
    // lands dead-center automatically — no mx-auto / justify-center /
    // gap-0 / px-0 gymnastics, and therefore no padding jump on toggle.
    // Only the label hides: it fades to max-w-0 / opacity-0 (animated
    // via the rule above) so the row visibly narrows with the rail.
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
    'pointer-events-none inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 font-mono text-[11px] font-medium tabular-nums leading-none'
  const expandedPos = 'ml-auto'
  // 2026-05-27 (Yuqi feedback "just a red dot is enough"): collapsed
  // mode reverts to a bare dot indicator — no digit, no border. The
  // count was hard to read at 14×14 and the user just needs to know
  // "there's something here" while in icon-only mode. Expanded mode
  // still shows the full count inline.
  // `[&>*]:hidden` hides the digit text in collapsed mode; the dot
  // itself comes from a 8×8 destructive-solid circle positioned at
  // the icon's top-right.
  // 2026-06-09 (Yuqi "copy exactly from pencil"): Pencil's collapsed
  // rail (§xiZyr) shows NO badges — just the icon. With the unified
  // full-width row (no 32×32 tile), a corner dot would float at the
  // row's right edge far from the centered icon, so the badge is simply
  // hidden when collapsed. The count returns inline when expanded.
  const collapsedPos = 'group-data-[collapsed=true]/sidebar:hidden'
  if (tone === 'inventory') {
    return (
      <span
        data-slot="sidebar-menu-badge"
        data-tone="inventory"
        className={cn(
          pillBaseExpanded,
          expandedPos,
          // 2026-06-09 (Yuqi delicacy pass): reference counts are bare
          // tabular numbers (no pill) in the muted tone (#98a2b2) — the
          // quietest layer, reading as delicate metadata beside the label.
          'text-text-muted',
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
        // 2026-06-09 (Yuqi "red alert number bubble only becomes red when
        // active selected"): the urgent badge is a neutral gray pill by
        // default and only flips to the red solid when its nav row is the
        // active route. `group/menu-button` lives on the SidebarMenuButton
        // ancestor, so the badge reads the row's active state (NavLink's
        // aria-current OR the data-active prop).
        // Default: a bare tertiary number (no pill), a touch more present
        // than the muted inventory counts since alerts warrant attention.
        // When its row is the active route it becomes the red solid pill
        // (the rounded-full + px-1 come from pillBaseExpanded).
        'text-text-tertiary',
        'group-data-[active=true]/menu-button:bg-state-destructive-solid group-data-[active=true]/menu-button:text-text-inverted',
        'group-aria-[current=page]/menu-button:bg-state-destructive-solid group-aria-[current=page]/menu-button:text-text-inverted',
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
        'inline-flex size-7 cursor-pointer touch-manipulation items-center justify-center rounded-lg border border-divider-regular bg-background-default text-text-secondary outline-none transition-colors',
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
 * 2026-06-09 (Yuqi "collapse icon = a triangle arrow OUTSIDE the
 * sidebar"): the toggle is now an edge HANDLE, not a header button.
 * It's a small round arrow that floats on the sidebar's right edge
 * (straddling the seam between the rail and the work surface),
 * vertically centered, and is hover-revealed (`group-hover/sidebar`)
 * so it stays out of the way until you reach for it. Mounted by the
 * `Sidebar` desktop branch as a sibling of the painted card (NOT in
 * the header), which is why the firm box can span the full width.
 *
 * Direction follows state: a left chevron when expanded (push the
 * rail closed) and a right chevron when collapsed (pull it back
 * open) — so it doubles as the expand affordance too.
 */
export function SidebarCollapseToggle({ className }: { className?: string }) {
  const { collapsed, hovered, toggleCollapsed } = useSidebar()
  const Icon = collapsed ? ChevronRightIcon : ChevronLeftIcon
  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  // 2026-06-09 (Yuqi "the arrow does not move when it expanded"): the
  // handle must track the CARD's *visible* right edge, which follows
  // hover-peek (`targetCollapsed = collapsed && !hovered`) — NOT the
  // aside footprint, which stays at the collapsed width during peek.
  // Positioned via an explicit `left` at the card edge (total width −
  // 12px right gutter) so the circle's center lands on that edge
  // (half-overlap) and slides out with the card when the collapsed
  // rail peeks open, instead of stranding mid-rail. Transitions in
  // lockstep with the card (300ms ease-apple).
  const targetCollapsed = collapsed && !hovered
  return (
    <button
      type="button"
      onClick={toggleCollapsed}
      aria-label={label}
      aria-expanded={!collapsed}
      title={label}
      style={{
        left: `calc(${targetCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH} - 12px)`,
      }}
      className={cn(
        // No border, no shadow — just the white fill — so it reads as a
        // quiet handle, not a floating control. `opacity-0` by default;
        // 2026-06-09 (Yuqi "only hover onto the sidebar shows the little
        // arrow"): revealed ONLY while the sidebar is hovered — NOT on
        // focus-within (which lingered visible after a nav click left
        // focus on the link). Keyboard `focus-visible` on the handle
        // itself still reveals it so a focused control is never hidden.
        'absolute top-1/2 z-40 hidden size-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-background-default text-text-tertiary opacity-0 outline-none transition-[left,opacity,background-color,color] duration-[360ms] ease-apple motion-reduce:transition-none',
        'hover:bg-background-default-hover hover:text-text-secondary',
        'focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        'group-hover/sidebar:opacity-100',
        'md:inline-flex',
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
    </button>
  )
}
